# 課題1: FinanceFlow株式会社の月次レポート自動生成システム構築

**難易度: 🟢 初級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級 |
| カテゴリ | バッチ処理 / SaaS / 定期実行 |
| 処理タイプ | バッチ / スケジュール |
| 使用IaC | CloudFormation |
| 所要時間 | 4〜5時間 |

---

## シナリオ

### 企業プロフィール

**FinanceFlow株式会社**は、中小企業向けのクラウド会計・経費精算SaaSを提供しています。

| 項目 | 内容 |
|------|------|
| 業種 | SaaS（会計・経費精算） |
| 設立 | 2017年 |
| 従業員数 | 60名 |
| 契約企業数 | 5,000社 |
| 月間処理件数 | 500万件（仕訳・経費） |
| 月商 | 1.2億円 |
| 平均契約単価 | 24,000円/月 |
| データ量 | 月次約100GB増加 |

### 現状の課題

毎月初に全契約企業（5,000社）に対して前月の月次レポート（損益計算書、貸借対照表、経費分析）を生成・配信していますが、処理に時間がかかり、月初の業務負荷が高くなっています。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| レポート生成対象 | 5,000社 | 変わらず |
| 月次処理時間 | 48時間 | 6時間以内 |
| 経理チーム作業 | 20時間/月 | 2時間/月 |
| 配信完了日 | 毎月5日 | 毎月2日 |
| 生成エラー率 | 3% | 0.5%以下 |
| 再生成依頼 | 50件/月 | 10件/月以下 |

### 現状のレポート生成フロー

```
毎月1日:
1. バッチサーバーでスクリプト実行開始
2. PostgreSQLから企業ごとにデータ抽出
3. Pythonでレポート計算・PDF生成
4. S3にアップロード
5. メール配信

問題点:
- 単一サーバーで逐次処理
- エラー時の再実行が困難
- 進捗把握ができない
- サーバーリソースがボトルネック
```

### 生成するレポート種類

| レポート | 内容 | ファイル形式 |
|----------|------|--------------|
| 月次損益計算書 | 売上、費用、利益 | PDF + Excel |
| 月次貸借対照表 | 資産、負債、純資産 | PDF + Excel |
| 経費分析レポート | カテゴリ別経費推移 | PDF |
| キャッシュフロー概要 | 入出金サマリー | PDF |
| 経費精算一覧 | 当月の経費明細 | Excel |

### 解決したいこと

1. 5,000社のレポートを6時間以内に生成
2. 並列処理による高速化
3. 進捗監視とエラーハンドリング
4. 自動リトライ・再生成機能
5. 配信スケジュールの柔軟な管理

### 成功指標（KPI）

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| 処理時間 | 48時間 | 6時間以内 | 1ヶ月後 |
| エラー率 | 3% | 0.5%以下 | 1ヶ月後 |
| 自動化率 | 60% | 95%以上 | 2ヶ月後 |
| 経理工数 | 20時間/月 | 2時間/月 | 2ヶ月後 |
| 配信完了 | 5日 | 2日 | 1ヶ月後 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **Amazon EventBridge Schedulerの実践活用**
   - cron式によるスケジュール設定
   - タイムゾーン対応
   - 柔軟なスケジュール管理

2. **AWS Step Functionsによる並列処理**
   - Map stateによる並列実行
   - エラーハンドリング・リトライ
   - 進捗監視

3. **AWS Lambdaの大規模並列処理**
   - 同時実行制限の理解
   - メモリ・タイムアウト最適化
   - レイヤーの活用

4. **Amazon SESによるメール配信**
   - テンプレートメール
   - バルク送信
   - バウンス処理

### 実務で活かせる知識

- 定期バッチ処理の設計パターン
- 大量データの並列処理アーキテクチャ
- SaaS向けマルチテナント処理

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| スケジューラー | EventBridge Scheduler | Cloud Scheduler |
| ワークフロー | Step Functions | Cloud Workflows |
| サーバーレス関数 | Lambda | Cloud Functions |
| メール配信 | SES | - (SendGridなど外部) |

---

## 使用するAWSサービス

### メインサービス

| サービス | 役割 | 選定理由 |
|----------|------|----------|
| Amazon EventBridge Scheduler | 月次スケジュール実行 | 柔軟なスケジュール設定 |
| AWS Step Functions | ワークフローオーケストレーション | 並列処理、進捗管理 |
| AWS Lambda | レポート生成処理 | サーバーレス並列実行 |
| Amazon S3 | レポートファイル保存 | 大容量、配信連携 |
| Amazon SES | メール配信 | 大量送信対応 |

### 補助サービス

| サービス | 役割 |
|----------|------|
| Amazon DynamoDB | ジョブ状態管理、企業マスタ |
| Amazon SNS | 完了・エラー通知 |
| Amazon CloudWatch | 監視・ログ・アラート |
| AWS Secrets Manager | DB接続情報管理 |

---

## 前提条件

### 必要な事前知識

- AWSの基本操作（S3, Lambda）
- Pythonの基礎
- cron式の基本

### 準備するもの

1. **AWSアカウント**
   - SES本番アクセス（サンドボックス解除推奨）
   - 適切なIAM権限

2. **開発環境**
   - AWS CLI v2
   - Python 3.9以上
   - pip（reportlab, openpyxl等）

3. **テストデータ**
   - サンプル企業データ（10社程度）

---

## アーキテクチャ概要

### システム全体構成

```
[EventBridge Scheduler]
    ↓ 毎月1日 AM 1:00 JST
[Step Functions: MonthlyReportWorkflow]
    │
    ├─[Lambda: FetchCompanies]
    │     └── DynamoDB: 企業一覧取得
    │
    ├─[Map State: 並列レポート生成]
    │     └── [Lambda: GenerateReport] × 5000社
    │           ├── データ取得（RDS/DynamoDB）
    │           ├── レポート計算
    │           ├── PDF/Excel生成
    │           └── S3保存
    │
    ├─[Lambda: SendEmails]
    │     └── SES: メール配信
    │
    └─[Lambda: NotifyCompletion]
          └── SNS: 完了通知

[DynamoDB: ジョブ状態管理]
[CloudWatch: 監視・アラート]
```

### 処理フロー

1. **トリガー**: EventBridge Schedulerが毎月1日AM1時に起動
2. **企業取得**: DynamoDBから処理対象企業一覧を取得
3. **並列生成**: Step Functions Map stateで最大100並列でレポート生成
4. **保存**: 生成したPDF/ExcelをS3に保存
5. **配信**: SESで各企業担当者にメール送信
6. **通知**: 処理完了を管理者に通知

---

## トラブルシューティング課題

### 問題1: Map stateがタイムアウト

**症状:**
```
Step Functions実行が5分以上かかり、タイムアウト
大量の企業を処理できない
```

**ヒント:**
1. MaxConcurrencyの設定を確認
2. Lambda個別のタイムアウトを確認
3. DynamoDB/S3のスループットを確認

**解決方法:**
```json
// Map stateの設定調整
{
  "Type": "Map",
  "MaxConcurrency": 50,  // 100から減らす
  "ItemsPath": "$.companies",
  // Express Workflowの場合は5分制限
  // Standard Workflowは1年まで可能
}
```

### 問題2: SESでメール送信エラー

**症状:**
```
MessageRejected: Email address is not verified
サンドボックス環境での制限
```

**ヒント:**
1. SESのサンドボックス状態を確認
2. 送信先メールアドレスの検証状態を確認
3. 本番アクセスリクエストを申請

**解決方法:**
```bash
# メールアドレス検証（サンドボックス環境）
aws ses verify-email-identity --email-address test@example.com --region ${AWS_REGION}

# 本番アクセス申請（コンソールから）
# SES → Account dashboard → Request production access
```

### 問題3: Lambda同時実行制限に到達

**症状:**
```
TooManyRequestsException: Rate Exceeded
一部のレポート生成がスキップされる
```

**ヒント:**
1. Lambda同時実行数制限（デフォルト1000）を確認
2. Reserved Concurrencyの設定を確認
3. MaxConcurrencyの調整

**解決方法:**
```bash
# アカウントレベルの同時実行制限確認
aws lambda get-account-settings --region ${AWS_REGION}

# 関数レベルのReserved Concurrency設定
aws lambda put-function-concurrency \
  --function-name financeflow-generate-report \
  --reserved-concurrent-executions 200 \
  --region ${AWS_REGION}
```

---

## 設計の考察ポイント

### 1. EventBridge Scheduler vs CloudWatch Events

**考察ポイント:**
- Scheduler: タイムゾーン対応、より柔軟なスケジュール
- CloudWatch Events: 従来の方法、広く使われている
- 2023年以降は Scheduler 推奨

### 2. 並列度の最適化

**考察ポイント:**
- Lambda同時実行制限とのバランス
- DynamoDB/S3のスループット
- コストとスピードのトレードオフ

### 3. エラーハンドリング戦略

**考察ポイント:**
- 個別失敗 vs 全体失敗
- リトライ回数と間隔
- 手動再実行の仕組み

### 4. メール配信の信頼性

**考察ポイント:**
- SESのバウンス処理
- 配信レート制限
- 代替手段（SendGrid等）

### 5. レポートの保存期間

**考察ポイント:**
- S3ライフサイクルポリシー
- コンプライアンス要件
- コスト最適化

---

## 発展課題（オプション）

### 1. レポートのカスタマイズ
- プラン別レポート内容
- 企業ごとのテンプレート
- ロゴ・ブランディング対応

### 2. オンデマンド再生成
- 特定企業のみ再生成
- APIエンドポイント追加
- ダッシュボード連携

### 3. マルチ言語対応
- 英語レポート生成
- 多通貨対応
- タイムゾーン別配信

### 4. 分析機能追加
- AIによる異常検知
- 前月比較・トレンド分析
- 経営アドバイス生成（Bedrock）

### 5. 配信チャネル拡大
- Slack通知
- モバイルプッシュ
- ダッシュボード表示

---

## 想定コストと削減方法

### 月額概算コスト（月間5,000社処理想定）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| AWS Lambda | 5,000回 × 30秒 × 512MB | $3 |
| Step Functions | 5,000遷移 × 7ステート | $0.15 |
| EventBridge Scheduler | 1スケジュール | 無料 |
| Amazon S3 | 5GB（レポート）+ リクエスト | $0.50 |
| Amazon SES | 5,000通 | $0.50 |
| Amazon DynamoDB | オンデマンド | $2 |
| Amazon SNS | 通知 | $0.01 |
| CloudWatch | ログ | $3 |
| **合計** | | **約$9（約1,400円）** |

### コスト削減のポイント

1. **Lambda最適化**
   - メモリサイズの最適化（256MB検討）
   - ARM64アーキテクチャ使用
   - → 最大20%削減

2. **S3ライフサイクル**
   - 古いレポートの自動削除/アーカイブ
   - Intelligent-Tiering

3. **Express Workflow検討**
   - 処理時間5分以内の場合
   - → Step Functions コスト90%削減

4. **SESの最適化**
   - バウンス管理による無駄削減
   - 配信レピュテーション維持

### リソース削除手順

```bash
# EventBridge Scheduler
aws scheduler delete-schedule --name financeflow-monthly-report-schedule --region ${AWS_REGION}

# Step Functions
aws stepfunctions delete-state-machine \
  --state-machine-arn arn:aws:states:${AWS_REGION}:${ACCOUNT_ID}:stateMachine:financeflow-monthly-report

# Lambda
aws lambda delete-function --function-name financeflow-fetch-companies
aws lambda delete-function --function-name financeflow-generate-report
aws lambda delete-function --function-name financeflow-send-emails
aws lambda delete-function --function-name financeflow-notify-completion

# DynamoDB
aws dynamodb delete-table --table-name financeflow-companies
aws dynamodb delete-table --table-name financeflow-report-jobs

# S3
aws s3 rm s3://financeflow-reports-${ACCOUNT_ID} --recursive
aws s3 rb s3://financeflow-reports-${ACCOUNT_ID}

# SNS
aws sns delete-topic --topic-arn arn:aws:sns:${AWS_REGION}:${ACCOUNT_ID}:financeflow-report-notifications

# IAM
aws iam delete-role-policy --role-name FinanceFlowSchedulerRole --policy-name StepFunctionsExecution
aws iam delete-role --role-name FinanceFlowSchedulerRole
```

---

## 学習のポイント

### 1. EventBridge Schedulerの活用
cron式による定期実行をサーバーレスで実現。CloudWatch Eventsより柔軟で、タイムゾーン対応も標準でサポート。

### 2. Step Functions Map stateによる並列処理
大量データを効率的に並列処理する方法。MaxConcurrencyでLambda同時実行数を制御し、リソース制限内で最大効率を実現。

### 3. エラーハンドリングとリトライ
Step Functionsの Retry / Catch 機能で、自動リトライと失敗時のフォールバックを実装。個別失敗が全体に影響しない設計。

### 4. SaaSのマルチテナント処理パターン
数千社のデータを効率的に処理するアーキテクチャ。テナント分離、並列処理、進捗管理の実践的なパターン。

### 5. PDFレポート生成のサーバーレス化
Lambda Layerを活用してPDF生成ライブラリを組み込み、サーバーレスでドキュメント生成を実現。
