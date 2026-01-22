# 課題12: ゲーム会社のマルチ環境管理

**難易度: 🟢 初級〜中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | IaC・DevOps |
| 処理タイプ | バッチ |
| 使用IaC | CDK |
| 想定所要時間 | 5-6時間 |

---

## 2. シナリオ

### 企業プロフィール
**GameStudio株式会社**は、モバイルゲームを開発・運営する企業です。主力タイトルは DAU（Daily Active Users）30万人を誇り、継続的なアップデートでユーザーを獲得しています。

### 現状の課題
急成長に伴い、インフラ管理が追いついていません：

1. **環境間の差異**：dev/stg/prodで設定が微妙に異なり、本番リリース時にトラブル発生
2. **手動デプロイのリスク**：本番環境へのデプロイは手動で実施、ヒューマンエラーのリスク
3. **インフラ変更の追跡困難**：誰がいつ何を変更したか分からない
4. **スケーリング対応の遅れ**：イベント時の負荷対応が後手に回る

### 数値で見る問題
- 環境差異によるリリース失敗：月 **3件**
- 手動デプロイ時間：1回あたり **2時間**
- 本番インシデント（設定ミス起因）：四半期 **5件**
- イベント時の緊急スケーリング対応：月 **4回**（各30分）

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 環境差異起因のリリース失敗 | 3件/月 | 0件/月 |
| デプロイ時間 | 2時間 | 15分 |
| 設定ミス起因のインシデント | 5件/四半期 | 1件以下/四半期 |
| スケーリング対応時間 | 30分 | 自動化 |

---

## 3. 学習目標

### 主要な学習成果
1. AWS CDKによる型安全なインフラ定義の習得
2. CodePipelineを使った自動デプロイパイプラインの構築
3. 環境別パラメータ管理とStage分離の実践
4. Application Auto Scalingの設定方法

### 習得するスキル
- CDK Constructsの設計と実装
- cdk diff / cdk deploy の活用
- CodePipelineのステージ構成
- 承認フロー付きデプロイの実装
- Parameter Store / Secrets Manager連携

---

## 4. 使用するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| AWS CDK | インフラのコード化 | 高 |
| CodePipeline | CI/CDパイプライン | 高 |
| CodeBuild | ビルド・テスト実行 | 高 |
| ECS Fargate | ゲームAPIサーバー実行 | 高 |
| Aurora Serverless v2 | ゲームデータベース | 高 |
| ElastiCache (Redis) | セッション・キャッシュ | 中 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| ECR | コンテナイメージ保存 |
| ALB | ロードバランシング |
| CloudWatch | ログ・メトリクス・アラーム |
| SNS | デプロイ通知 |
| SSM Parameter Store | 環境別パラメータ管理 |
| Secrets Manager | DB認証情報管理 |

---

## 5. 前提条件

### 必要な知識
- TypeScriptの基本文法
- AWSの基本サービス理解（VPC、ECS、RDS）
- Dockerの基本操作

### 事前準備
1. AWSアカウント
2. Node.js v18以上
3. AWS CLI v2
4. Docker Desktop
5. VS Code + AWS Toolkit拡張機能

### 環境要件
```bash
# CDKインストール
npm install -g aws-cdk

# バージョン確認
cdk --version  # 2.x 以上
```

---

## 6. アーキテクチャ概要

### システム構成図

```mermaid
architecture-beta
    group pipeline(cloud)[CodePipeline]
    group dev_env(cloud)[Development]
    group stg_env(cloud)[Staging]
    group prod_env(cloud)[Production]

    service source(server)[Source GitHub] in pipeline
    service build(server)[Build CodeBuild] in pipeline
    service dev_deploy(server)[Dev Deploy] in pipeline
    service stg_deploy(server)[Stg Deploy Manual Approve] in pipeline
    service prod_deploy(server)[Prod Deploy Manual Approve] in pipeline

    service dev_alb(server)[ALB] in dev_env
    service dev_ecs(server)[ECS Fargate 1 task] in dev_env
    service dev_aurora(database)[Aurora Serverless 0.5 ACU] in dev_env
    service dev_redis(database)[ElastiCache Redis] in dev_env

    service stg_alb(server)[ALB] in stg_env
    service stg_ecs(server)[ECS Fargate 2 tasks] in stg_env
    service stg_aurora(database)[Aurora Serverless 1 ACU] in stg_env
    service stg_redis(database)[ElastiCache Redis] in stg_env

    service prod_alb(server)[ALB] in prod_env
    service prod_ecs(server)[ECS Fargate 4-20 tasks] in prod_env
    service prod_aurora(database)[Aurora Serverless 2-16 ACU] in prod_env
    service prod_redis(database)[ElastiCache Redis] in prod_env

    source:R --> L:build
    build:R --> L:dev_deploy
    dev_deploy:R --> L:stg_deploy
    stg_deploy:R --> L:prod_deploy

    dev_deploy:B --> T:dev_alb
    dev_alb:B --> T:dev_ecs
    dev_ecs:B --> T:dev_aurora
    dev_ecs:B --> T:dev_redis

    stg_deploy:B --> T:stg_alb
    stg_alb:B --> T:stg_ecs
    stg_ecs:B --> T:stg_aurora
    stg_ecs:B --> T:stg_redis

    prod_deploy:B --> T:prod_alb
    prod_alb:B --> T:prod_ecs
    prod_ecs:B --> T:prod_aurora
    prod_ecs:B --> T:prod_redis
```

### 環境別構成

| 項目 | Development | Staging | Production |
|------|-------------|---------|------------|
| ECS タスク数 | 1 | 2 | 4-20 (Auto Scaling) |
| Aurora ACU | 0.5 | 1 | 2-16 (Auto Scaling) |
| Redis ノード | cache.t3.micro | cache.t3.small | cache.r6g.large |
| デプロイ承認 | 不要 | 必要 | 必要（2名） |

---

## 8. トラブルシューティング課題

### Challenge 1: CDK Diffが予期せぬ変更を検出
**状況**: リソースを変更していないのに、cdk diffで大量の変更が表示される

```
[-] AWS::ECS::Service GameApiService/Service
[+] AWS::ECS::Service GameApiService/Service

Resources
[~] AWS::ECS::Service GameApiService/Service ...
 └─ [~] TaskDefinition
     └─ [~] .Fn::Join:
         └─ @@ -1,6 +1,6 @@
```

**調査ポイント**:
1. CDK/AWS SDK のバージョン差異
2. Context値の違い（cdk.context.json）
3. Logical IDの変更

**解決手順**:
```bash
# contextをリセット
rm cdk.context.json
cdk synth

# バージョンを固定
npm install aws-cdk-lib@2.100.0 --save-exact
```

### Challenge 2: ECS タスクがヘルスチェックに失敗
**状況**: デプロイ後、タスクが起動するが即座に停止する

**調査ポイント**:
1. CloudWatch Logsでアプリケーションログを確認
2. ターゲットグループのヘルスチェック設定
3. セキュリティグループのルール

**解決コマンド例**:
```bash
# タスクの停止理由を確認
aws ecs describe-tasks --cluster gamestudio-dev \
  --tasks $(aws ecs list-tasks --cluster gamestudio-dev --desired-status STOPPED --query 'taskArns[0]' --output text) \
  --query 'tasks[0].stoppedReason'
```

### Challenge 3: Aurora Serverless v2のスケーリングが間に合わない
**状況**: 急激な負荷増加時にデータベース接続エラーが発生

**調査ポイント**:
1. ACUの最小/最大設定を確認
2. CloudWatchでACU使用率を監視
3. スケーリング速度の限界を理解

---

## 9. 設計考慮ポイント

### ディスカッション1: CDK vs Terraform
**テーマ**: IaCツールの選定基準

| 観点 | CDK | Terraform |
|------|-----|-----------|
| 学習コスト | プログラミング経験者なら低い | HCL学習が必要 |
| 型安全性 | TypeScriptで高い | terraform validate依存 |
| マルチクラウド | AWS特化 | 対応 |
| 抽象化レベル | 高い（Constructs） | 低い（宣言的） |
| チーム規模 | 小〜中規模向け | 大規模向け |

### ディスカッション2: 環境分離戦略
**テーマ**: 同一アカウント内分離 vs アカウント分離

**選択肢**:
1. **同一アカウント・VPC分離**: シンプルだがセキュリティ境界が弱い
2. **同一アカウント・名前空間分離**: タグとIAMで分離
3. **マルチアカウント**: 最も安全だが運用複雑

### ディスカッション3: ブルーグリーン vs ローリングアップデート
**テーマ**: ECSのデプロイ戦略

| 戦略 | メリット | デメリット |
|------|----------|------------|
| ローリング | リソース効率が良い | ロールバックに時間がかかる |
| ブルーグリーン | 即座にロールバック可能 | 一時的に2倍のリソースが必要 |

---

## 10. 発展課題

### Advanced 1: カナリアデプロイの実装
**課題**: 新バージョンを10%のトラフィックに限定してデプロイし、問題なければ100%に展開

### Advanced 2: Feature Flag連携
**課題**: AWS AppConfig と連携して、デプロイとリリースを分離

### Advanced 3: DR環境の自動構築
**課題**: 別リージョンにDR環境をCDKで自動構築し、定期的にフェイルオーバーテストを実行

---

## 11. コスト見積もり

### 月額コスト概算

| 環境 | サービス | 構成 | 月額コスト |
|------|----------|------|------------|
| **Dev** | ECS Fargate | 0.25 vCPU / 0.5GB × 1 | $9 |
| | Aurora Serverless v2 | 0.5 ACU | $43 |
| | ElastiCache | cache.t3.micro | $12 |
| | NAT Gateway | 1 × 730h | $32 |
| | ALB | 1 | $16 |
| | **小計** | | **$112** |
| **Stg** | ECS Fargate | 0.5 vCPU / 1GB × 2 | $36 |
| | Aurora Serverless v2 | 1 ACU | $86 |
| | ElastiCache | cache.t3.small | $24 |
| | NAT Gateway | 1 × 730h | $32 |
| | ALB | 1 | $16 |
| | **小計** | | **$194** |
| **Prod** | ECS Fargate | 1 vCPU / 2GB × 4-20 | $144-720 |
| | Aurora Serverless v2 | 2-16 ACU | $173-1,382 |
| | ElastiCache | cache.r6g.large × 2 | $219 |
| | NAT Gateway | 3 × 730h | $97 |
| | ALB | 1 | $16 |
| | **小計** | | **$649-2,434** |
| **Pipeline** | CodePipeline | 1 | $1 |
| | CodeBuild | ビルド時間依存 | $10 |
| | ECR | イメージ保存 | $5 |
| | **小計** | | **$16** |

**合計**: 約 **$971-2,756/月**（約145,000-413,000円）

### コスト削減のヒント

1. **Dev/Stg環境の夜間停止**: スケジュールベースでタスク数を0に
2. **Aurora Auto Pause**: 開発環境でアイドル時に自動停止（Serverless v1のみ）
3. **Savings Plans**: Fargateの長期コミットメント割引

---

## 12. 学習のポイント

### 重要な概念の整理

1. **CDK Constructs**
   - L1: CloudFormation直接マッピング（Cfn*）
   - L2: 高レベル抽象化（便利なデフォルト付き）
   - L3: パターン（複数リソースの組み合わせ）

2. **環境分離のベストプラクティス**
   - 設定は外部化（環境変数、Parameter Store）
   - 同じコードベースから全環境をデプロイ
   - 差異は設定ファイルで吸収

3. **CI/CDパイプライン設計**
   - 自動テストをゲートに
   - 本番前の承認フロー
   - ロールバック手段の確保

### GCPとの比較

| 概念 | AWS | GCP |
|------|-----|-----|
| IaC (コード型) | CDK | Pulumi / CDK for Terraform |
| CI/CD | CodePipeline | Cloud Build / Cloud Deploy |
| コンテナ実行 | ECS Fargate | Cloud Run |
| マネージドDB | Aurora Serverless | Cloud SQL / AlloyDB |
| キャッシュ | ElastiCache | Memorystore |

### 次のステップ
1. カナリアデプロイの実装
2. 負荷テスト自動化の追加
3. マルチリージョン展開
