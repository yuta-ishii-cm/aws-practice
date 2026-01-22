# 課題3: 予約システムの死活監視 - APIエラーを見逃さない監視基盤

**難易度: 🟢 初級**

---

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級 |
| カテゴリ | 監視 / オブザーバビリティ |
| 処理タイプ | リアルタイム |
| 使用IaC | CloudFormation |
| 想定所要時間 | 3〜4時間 |

---

## 学習するAWSサービス

この演習では以下のAWSサービスを実践的に学習します。

### メインサービス

| サービス | 役割 | 学習ポイント |
|----------|------|-------------|
| **Amazon CloudWatch Alarms** | メトリクス監視・アラート | アラーム作成、閾値設定、評価期間 |
| **Amazon CloudWatch Metrics** | パフォーマンスデータ収集 | 標準メトリクス、カスタムメトリクス |
| **Amazon SNS** | アラート通知 | トピック作成、サブスクリプション、メール/Slack通知 |

### 補助サービス

| サービス | 役割 |
|----------|------|
| **Amazon CloudWatch Logs** | ログ監視 |
| **Amazon CloudWatch Dashboard** | 可視化 |
| **AWS Chatbot** | Slack連携（オプション） |

---

## 最終構成図

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group api(server)[API Layer] in aws
    group monitoring(server)[Monitoring Layer] in aws
    group notification(server)[Notification] in aws

    service user(internet)[予約ユーザー]
    service apigw(server)[API Gateway 予約API] in api
    service lambda(server)[Lambda 予約処理] in api
    service cw_metrics(server)[CloudWatch Metrics] in monitoring
    service cw_alarms(server)[CloudWatch Alarms] in monitoring
    service cw_dashboard(server)[CloudWatch Dashboard] in monitoring
    service sns(server)[SNS アラート通知] in notification
    service email(internet)[メール通知]
    service slack(internet)[Slack通知]

    user:R --> L:apigw
    apigw:B --> T:lambda
    apigw:R --> L:cw_metrics
    lambda:R --> L:cw_metrics
    cw_metrics:B --> T:cw_alarms
    cw_metrics:B --> T:cw_dashboard
    cw_alarms:R --> L:sns
    sns:R --> L:email
    sns:R --> L:slack
```

### 監視対象メトリクス

| メトリクス | 説明 | 閾値例 |
|------------|------|--------|
| API Gateway 5XXError | サーバーエラー数 | 5分間で5回以上 |
| API Gateway 4XXError | クライアントエラー数 | 5分間で50回以上 |
| API Gateway Latency | 応答時間 | p99が3秒以上 |
| Lambda Errors | Lambda実行エラー | 5分間で3回以上 |
| Lambda Duration | Lambda実行時間 | 平均5秒以上 |

---

## シナリオ

### 企業プロフィール

**〇〇株式会社**は、美容室・サロン向けの予約管理SaaSを提供しています。顧客のサロンがこのシステムで予約を受け付けており、システム障害は直接的な売上損失につながります。

| 項目 | 内容 |
|------|------|
| 業種 | SaaS / 予約管理 |
| 従業員数 | 15名（エンジニア5名） |
| 導入サロン数 | 200店舗 |
| 月間予約件数 | 10万件 |
| API呼び出し | 50万回/月 |

### 現状の課題

先月、予約APIが2時間ダウンしていることに気づかず、顧客のサロンから「予約が取れない」とクレームが殺到してから初めて障害を認識しました。エンジニアは開発に集中しており、本番環境の監視が手薄になっています。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| 障害検知までの時間 | 2時間（顧客連絡） | 5分以内 |
| 監視カバー率 | 0%（監視なし） | 100% |
| 夜間対応 | 対応なし | アラート通知 |

### 解決したいこと

1. APIのエラー率が上がったらすぐに通知が欲しい
2. レスポンス時間が遅くなったら気づきたい
3. 夜間・休日でもアラートを受け取りたい
4. 現状をダッシュボードで可視化したい

### 成功指標（KPI）

| KPI | 現状 | 目標 |
|-----|------|------|
| 障害検知時間 | 2時間 | 5分以内 |
| アラート通知 | なし | 24時間365日 |
| ダッシュボード | なし | リアルタイム可視化 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **CloudWatch Alarmsの設計と実装**
   - メトリクスの選択
   - 閾値と評価期間の設定
   - アラーム状態（OK, ALARM, INSUFFICIENT_DATA）の理解

2. **CloudWatch Metricsの活用**
   - API Gateway/Lambdaの標準メトリクス
   - メトリクスの統計（Average, Sum, Maximum, p99）
   - 期間とデータポイント

3. **SNSによる通知設計**
   - トピックとサブスクリプション
   - メール通知の設定
   - Slack連携（AWS Chatbot）

4. **CloudWatch Dashboardの作成**
   - ウィジェットの配置
   - メトリクスのグラフ化
   - 複数メトリクスの統合表示

### 実務で活かせる知識

- 監視設計の基本（何を、どう監視するか）
- アラート疲れを防ぐ閾値設定
- インシデント対応フローの構築

---

## 前提条件

### 必要な事前知識

- API Gateway、Lambdaの基本的な理解
- AWSコンソールの基本操作

### 準備するもの

1. **AWSアカウント**
   - CloudWatch、SNSの利用権限

2. **監視対象のAPI**
   - 既存のAPI Gateway + Lambda構成
   - または課題41で作成したランチガチャAPIを使用

3. **通知先**
   - メールアドレス（SNS通知用）
   - Slackワークスペース（オプション）

### 必要なIAM権限

以下の権限が必要です（事前に確認してください）：

```
- cloudwatch:*
- sns:*
- logs:*
- chatbot:* (Slack連携する場合)
```

---

## 監視設計のベストプラクティス

### アラート設計の原則

| 原則 | 説明 | 例 |
|------|------|-----|
| **アクション可能** | アラートを受けたら何かできる | エラー率上昇 → 調査開始 |
| **ノイズを避ける** | 誤検知を減らす | 短期間の一時的スパイクは無視 |
| **段階的** | 重大度に応じた通知 | Warning → メール、Critical → 電話 |

### 監視の4ゴールデンシグナル

| シグナル | 説明 | API Gatewayでの指標 |
|----------|------|---------------------|
| **レイテンシ** | リクエストの応答時間 | Latency (p50, p99) |
| **トラフィック** | リクエスト量 | Count |
| **エラー** | 失敗したリクエストの割合 | 5XXError, 4XXError |
| **飽和度** | リソースの使用率 | Lambda ConcurrentExecutions |

---

## トラブルシューティング課題

### 問題1: アラームが「INSUFFICIENT_DATA」のまま

**症状:**
```
アラームを作成したが、状態が INSUFFICIENT_DATA から変わらない
```

**ヒント:**
1. メトリクスにデータが存在するか確認
2. 期間とデータポイントの設定を確認
3. APIへのリクエストがあるか確認

<details>
<summary>解決方法を見る</summary>

1. メトリクスにデータがあるか確認：
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 5XXError \
  --dimensions Name=ApiName,Value=your-api-name \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum
```

2. データがない場合は、APIにリクエストを送信してメトリクスを生成。

3. 「データ不足時の処理」を「見つかりませんでした - 見つかりませんを良好として処理」に設定。

</details>

### 問題2: SNS通知が届かない

**症状:**
```
アラームがALARM状態になったのに、メール通知が届かない
```

**ヒント:**
1. SNSサブスクリプションが確認済みか確認
2. メールの迷惑メールフォルダを確認
3. アラームのアクションにSNSトピックが設定されているか確認

<details>
<summary>解決方法を見る</summary>

1. サブスクリプションのステータスを確認：
```bash
aws sns list-subscriptions-by-topic --topic-arn your-topic-arn
```

ステータスが `PendingConfirmation` の場合、確認メールのリンクをクリックする必要があります。

2. アラームのアクションを確認：
```bash
aws cloudwatch describe-alarms --alarm-names your-alarm-name
```

`AlarmActions` に SNS トピック ARN が含まれているか確認。

</details>

### 問題3: アラートが頻発する（アラート疲れ）

**症状:**
```
小さな変動でもアラートが発報され、重要なアラートを見逃しそう
```

**ヒント:**
1. 閾値が適切か見直す
2. 評価期間を長くする
3. データポイント数を増やす

<details>
<summary>解決方法を見る</summary>

例: 「5分間のうち3データポイント以上で閾値を超えた場合」にアラート：

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "API-5XX-Error-Alert" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 5 \
  --datapoints-to-alarm 3 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions your-sns-topic-arn
```

</details>

---

## 設計の考察ポイント

### 1. 閾値の決め方

**考えてみよう:**
- エラー率の閾値を何%に設定する？
- 「正常」の基準をどうやって決める？

**アプローチ:**
- まずは監視だけ始めて、ベースラインを把握する
- 過去1週間のデータを見て、通常時の値を確認
- 通常時の2〜3倍を閾値に設定するのが目安

### 2. アラームのアクション

**考えてみよう:**
- Warning と Critical で通知先を変えるべき？
- 深夜のアラートはどうする？

**代替案:**
- Warning: メール/Slack → 翌営業日対応
- Critical: PagerDuty → 即時対応（オンコール）

---

## 発展課題

### 1. Slack連携（AWS Chatbot）
- AWS Chatbotを設定してSlackチャンネルに通知
- アラート内容をSlackで確認できるようにする

### 2. 異常検知（Anomaly Detection）
- CloudWatch Anomaly Detectionを使用
- 機械学習ベースで「いつもと違う」を検出

### 3. 複合アラーム
- 複数の条件を組み合わせたアラーム
- 例: エラー率上昇 AND レイテンシ上昇 → アラート

### 4. ダッシュボードの充実
- ビジネスメトリクスの追加（予約件数など）
- 週次/月次のレポート自動生成

---

## 想定コストと削減方法

### 月額概算コスト

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| CloudWatch Alarms | 5アラーム | $0.50 |
| CloudWatch Metrics | 標準メトリクス | 無料 |
| CloudWatch Dashboard | 1ダッシュボード | $3.00 |
| SNS | 100通知/月 | 無料枠内 |
| CloudWatch Logs | 1GB | $0.50 |
| **合計** | | **約$4（約600円）** |

### コスト削減のポイント

1. **標準メトリクスの活用**
   - API Gateway、Lambdaの標準メトリクスは無料
   - カスタムメトリクスは有料（$0.30/メトリクス/月）

2. **ダッシュボードの統合**
   - 複数のダッシュボードを1つに統合
   - 3ダッシュボードまで無料

---

## クリーンアップチェックリスト

演習終了後、以下のリソースを削除してください：

```bash
# CloudWatch Alarmsの削除
aws cloudwatch delete-alarms --alarm-names "API-5XX-Error-Alert" "API-Latency-Alert" "Lambda-Error-Alert"

# SNSトピックの削除
aws sns delete-topic --topic-arn your-topic-arn

# CloudWatch Dashboardの削除
aws cloudwatch delete-dashboards --dashboard-names "ReservationAPI-Dashboard"
```

- [ ] CloudWatch Alarms
- [ ] SNSトピック・サブスクリプション
- [ ] CloudWatch Dashboard
- [ ] AWS Chatbot設定（Slack連携した場合）

---

## 学習のポイント

### 1. 監視は「後から」ではなく「最初から」
本番環境にデプロイしたら、監視もセットで構築する。障害が起きてから慌てて設定するのでは遅い。

### 2. 4ゴールデンシグナルを意識
レイテンシ、トラフィック、エラー、飽和度。この4つを監視すれば、大抵の問題は検知できる。

### 3. アラート疲れを防ぐ
「本当に対応が必要な時だけ通知」が理想。閾値と評価期間を適切に設定し、ノイズを減らす。

---

## 次のステップ

この演習を終えたら、以下の演習に挑戦してみましょう：

- [課題44: AWSコスト異常アラート](exercise-44.md) - AWS Budgetsによるコスト監視
- [課題14: 配車サービスの統合監視基盤](exercise-14.md) - より本格的な監視基盤（マイクロサービス対応）
