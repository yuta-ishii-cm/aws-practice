# 課題34: Fintech企業のゼロダウンタイムデプロイ

**難易度: 🟡 中級**

---

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | IaC・DevOps |
| 処理タイプ | 非同期 |
| 使用IaC | CloudFormation |
| 想定所要時間 | 5-6時間 |

---

## シナリオ

### 企業プロフィール
**〇〇株式会社**は、中小企業向けの決済代行サービスを提供するFintech企業です。月間取引件数は100万件を超え、24時間365日の安定稼働が求められています。

### 現状の課題
サービスの成長に伴い、リリース頻度を上げたいが、ダウンタイムが許容されない状況です：

1. **メンテナンス時間の確保困難**：深夜帯でも取引があり、停止できる時間帯がない
2. **リリース失敗時のリスク**：ロールバックに時間がかかり、障害が長期化
3. **データベースマイグレーション**：スキーマ変更を伴うリリースが特に危険
4. **テスト不足**：本番環境でしか発覚しない問題が多い

### 数値で見る問題
- 計画メンテナンス時間：月 **4時間**（深夜リリース）
- 直近1年のリリース失敗：**8件**
- 平均ロールバック時間：**45分**
- リリース起因の障害損失：年間約 **2,000万円**

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| デプロイ時ダウンタイム | 30分/回 | 0分 |
| ロールバック時間 | 45分 | 5分以内 |
| リリース失敗率 | 8件/年 | 2件以下/年 |
| リリース頻度 | 月2回 | 週1回以上 |

---

## 学習目標

### 主要な学習成果
1. CodeDeployによるブルーグリーンデプロイの実装
2. ALBのターゲットグループ切り替えによる無停止リリース
3. Lambda Hooksを使ったデプロイ検証の自動化
4. データベースマイグレーションのベストプラクティス

### 習得するスキル
- CodeDeploy Blue/Green Deployment設定
- ALB Listener Rules の動的切り替え
- AppSpec.yml の記述方法
- カナリアリリースの設計
- 本番トラフィックを使った検証

---

## 使用するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| CodeDeploy | ブルーグリーンデプロイ制御 | 高 |
| ECS Fargate | アプリケーション実行環境 | 高 |
| ALB | トラフィック制御・切り替え | 高 |
| Lambda | デプロイHooks実行 | 高 |
| RDS (Aurora) | 決済データベース | 高 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| CodePipeline | CI/CDパイプライン |
| CloudWatch | メトリクス監視・アラーム |
| X-Ray | 分散トレーシング |
| Secrets Manager | DB認証情報管理 |
| SNS | デプロイ通知 |

---

## 前提条件

### 必要な知識
- ECSの基本概念（タスク定義、サービス）
- ALBの仕組み（ターゲットグループ、リスナー）
- Lambdaの基本的な使い方
- データベースマイグレーションの概念

### 事前準備
1. AWSアカウント
2. AWS CLI v2
3. Docker Desktop
4. 決済APIのサンプルアプリケーション

### 環境要件
```bash
# 必要なツール
aws --version  # 2.x
docker --version
```

---

## アーキテクチャ概要

### システム構成図（ブルーグリーン構成）

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group cicd(server)[CI/CD] in aws
    service codepipeline(server)[CodePipeline Source Build Deploy] in cicd

    group alb_layer(server)[Application Load Balancer] in aws
    service prod_listener(internet)[Production Listener 443] in alb_layer
    service test_listener(internet)[Test Listener 8443] in alb_layer
    service blue_tg(server)[Blue Target Group Active] in alb_layer
    service green_tg(server)[Green Target Group Standby] in alb_layer

    group ecs_cluster(server)[ECS Cluster] in aws
    service blue_env(server)[Blue Environment v1.0 Tasks] in ecs_cluster
    service green_env(server)[Green Environment v1.1 Tasks] in ecs_cluster

    group database(database)[Database Layer] in aws
    service aurora(database)[Aurora PostgreSQL Primary Read/Write] in database

    codepipeline:B --> T:prod_listener
    prod_listener:B --> T:blue_tg
    test_listener:B --> T:green_tg
    blue_tg:B --> T:blue_env
    green_tg:B --> T:green_env
    blue_env:B --> T:aurora
    green_env:B --> T:aurora
```

| コンポーネント | 役割 |
|----------------|------|
| **CodePipeline** | CI/CDパイプライン |
| **Production Listener** | 本番トラフィック（443） |
| **Test Listener** | テストトラフィック（8443） |
| **Blue Target Group** | アクティブ環境 |
| **Green Target Group** | スタンバイ環境 |
| **Blue/Green Environment** | ECSタスク群 |
| **Aurora PostgreSQL** | データベース |

### デプロイフロー

```mermaid
architecture-beta
    group deploy_flow(server)[Blue/Green Deployment Flow]

    service step1(server)[1. BeforeInstall Hook Lambda Pre-deployment checks] in deploy_flow
    service step2(server)[2. Install New tasks in Green TG] in deploy_flow
    service step3(server)[3. AfterInstall Hook Lambda Smoke tests] in deploy_flow
    service step4(server)[4. AllowTestTraffic Test listener routes to Green] in deploy_flow
    service step5(server)[5. AfterAllowTestTraffic Hook Lambda Integration tests] in deploy_flow
    service step6(server)[6. BeforeAllowTraffic Hook Lambda Final validation] in deploy_flow
    service step7(server)[7. AllowTraffic Production listener switches] in deploy_flow
    service step8(server)[8. AfterAllowTraffic Hook Lambda Post-deployment validation] in deploy_flow

    step1:B --> T:step2
    step2:B --> T:step3
    step3:B --> T:step4
    step4:B --> T:step5
    step5:B --> T:step6
    step6:B --> T:step7
    step7:B --> T:step8
```

---

## トラブルシューティング課題

### Challenge 1: デプロイが "In Progress" のまま止まる
**状況**: CodeDeployのステータスがAfterInstallで停止し、進まない

**調査ポイント**:
1. Lambda Hookのログを確認
2. ECSタスクのヘルスチェック状態を確認
3. ターゲットグループのヘルス状態を確認

**解決コマンド**:
```bash
# Lambda Hookのログ確認
aws logs tail /aws/lambda/payeasy-prod-after-install --follow

# ECSタスクの状態確認
aws ecs describe-tasks \
  --cluster payeasy-prod \
  --tasks $(aws ecs list-tasks --cluster payeasy-prod --query 'taskArns' --output text)

# ターゲットグループのヘルス確認
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:ap-northeast-1:ACCOUNT:targetgroup/payeasy-prod-green-tg/xxx
```

### Challenge 2: 自動ロールバックが発生
**状況**: デプロイ完了後、CloudWatch Alarmがトリガーされて自動ロールバック

**調査ポイント**:
1. どのアラームがトリガーされたか確認
2. メトリクスの推移を確認
3. アプリケーションログでエラーを特定

### Challenge 3: DBマイグレーション後の不整合
**状況**: 新バージョンと旧バージョンで異なるスキーマを参照してエラー

**調査ポイント**:
1. マイグレーションが後方互換性を保っているか確認
2. 両バージョンのSQLクエリを確認
3. トランザクション分離レベルを確認

---

## 設計考慮ポイント

### ディスカッション1: デプロイ戦略の選択
**テーマ**: Linear vs Canary vs All-at-once

| 戦略 | 特徴 | ユースケース |
|------|------|-------------|
| Linear10PercentEvery1Minutes | 均等に段階的切り替え | 標準的なリリース |
| Canary10Percent5Minutes | 最初に少量、問題なければ残り全部 | リスクの高いリリース |
| AllAtOnce | 即座に全切り替え | ホットフィックス |

### ディスカッション2: ロールバック戦略
**テーマ**: 自動 vs 手動ロールバック

**考慮点**:
1. **自動ロールバック**: アラーム連動で即座に戻せるが、誤検知のリスク
2. **手動ロールバック**: 判断に時間がかかるが、慎重な対応が可能
3. **ハイブリッド**: 重大なメトリクスのみ自動、その他は手動

### ディスカッション3: データベーススキーマ変更
**テーマ**: オンラインスキーママイグレーション

**パターン**:
1. **Expand and Contract**: 新旧両対応→旧削除
2. **Ghost Tables**: シャドーテーブルでの段階的移行
3. **Feature Flags**: 新スキーマの段階的有効化

---

## 発展課題

### Advanced 1: カナリアリリースの実装
**課題**: ALB Weighted Target Groupsを使って、5%のトラフィックを新バージョンに流し、問題なければ徐々に増加

### Advanced 2: Feature Flagsとの連携
**課題**: AWS AppConfigと連携して、デプロイとリリースを分離。デプロイ後にFeature Flagで機能を段階的に有効化

### Advanced 3: Chaos Engineering
**課題**: AWS Fault Injection Simulatorを使って、デプロイ中の障害シナリオをテスト

---

## コスト見積もり

### 月額コスト概算

| サービス | リソース | 月額コスト |
|----------|----------|------------|
| ECS Fargate (Blue) | 0.5 vCPU / 1GB × 2タスク | $29 |
| ECS Fargate (Green) | デプロイ時のみ | $5（概算） |
| ALB | 1 | $16 |
| NAT Gateway | 1 | $32 |
| Aurora PostgreSQL | db.r6g.large (Multi-AZ) | $350 |
| CodeDeploy | 無料 | $0 |
| Lambda (Hooks) | 月100回デプロイ想定 | $1 |
| CloudWatch | ログ・メトリクス | $15 |
| X-Ray | トレース | $5 |

**合計**: 約 **$453/月**（約68,000円）

### コスト削減のヒント

1. **デプロイ時間の短縮**: Green環境の稼働時間を最小化
2. **開発環境の簡素化**: dev/stgはSingle-AZで運用
3. **Savings Plans**: Fargateの長期コミット割引

---

## 学習のポイント

### 重要な概念の整理

1. **Blue/Green Deployment**
   - 2つの同一環境を維持
   - トラフィック切り替えで無停止リリース
   - 即座のロールバックが可能

2. **CodeDeploy Lifecycle Hooks**
   - 各フェーズでカスタムロジックを実行
   - テスト、検証、通知などを自動化
   - 失敗時は自動でデプロイ停止

3. **後方互換性のあるマイグレーション**
   - 新旧バージョンが共存できる設計
   - カラム追加はNULL許容で
   - 削除は全環境更新後に別リリースで

### 次のステップ
1. Progressive Deliveryの実装（Argo Rollouts等）
2. サービスメッシュでのトラフィック制御
3. GitOpsワークフローの導入
