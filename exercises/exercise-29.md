# 課題29: AgriTech株式会社のセンサーデータ集計・異常検知レポート自動生成システム構築

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | バッチ処理 / データ基盤 / IoT / 農業テック |
| 処理タイプ | バッチ / ETL |
| 使用IaC | Terraform |
| 所要時間 | 7〜9時間 |

---

## シナリオ

### 企業プロフィール

**AgriTech株式会社**は、スマート農業ソリューションを提供するアグリテックスタートアップです。

| 項目 | 内容 |
|------|------|
| 業種 | アグリテック（スマート農業） |
| 設立 | 2018年 |
| 従業員数 | 45名 |
| 契約農家数 | 500件 |
| センサー設置箇所 | 全国1,000箇所 |
| 監視対象作物 | 米、野菜、果樹 |
| 日次データ量 | 約10GB |
| 年間売上 | 5億円 |
| サービス内容 | 環境監視、生育予測、収穫時期最適化 |

### 現状の課題

全国1,000箇所に設置したセンサーから毎日大量のデータが送られてきますが、データの集計・分析が追いつかず、異常検知が遅れたり、農家への有益なレポートを提供できていません。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| 日次データ量 | 10GB | 変わらず |
| センサーポイント | 1,000箇所 | 拡大予定（2,000箇所） |
| データ収集間隔 | 5分 | 変わらず |
| 日次レコード数 | 約1,000万件 | - |
| データ分析担当 | 3名 | 1名（監視のみ） |
| 異常検知遅延 | 6時間以上 | 1時間以内 |
| 日次レポート配信 | 手動（翌日夕方） | 自動（翌日朝9時） |

### センサーデータの内訳

| センサー種別 | 測定項目 | 収集頻度 | 異常検知対象 |
|--------------|----------|----------|--------------|
| 気象センサー | 気温、湿度、降水量、日照 | 5分 | 霜・高温警報 |
| 土壌センサー | 土壌水分、pH、EC（電気伝導度） | 10分 | 乾燥・過湿 |
| 環境センサー | CO2濃度、風速 | 15分 | 換気異常 |
| 生育モニター | 葉色、茎径 | 1時間 | 生育不良 |

### 解決したいこと

1. 日次10GBのセンサーデータを効率的にETL処理
2. 異常値の自動検知とアラート通知
3. 農家ごとの日次レポート自動生成
4. 過去データとの比較分析（前年同期比等）
5. スケーラブルなデータ基盤の構築

### 成功指標（KPI）

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| ETL処理時間 | 6時間 | 1時間以内 | 1ヶ月後 |
| 異常検知遅延 | 6時間 | 1時間以内 | 1ヶ月後 |
| レポート配信 | 翌日夕方 | 翌日朝9時 | 1ヶ月後 |
| データ分析工数 | 3名×8時間/日 | 1名×2時間/日 | 2ヶ月後 |
| スケーラビリティ | 1,000箇所 | 5,000箇所対応可 | 3ヶ月後 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **AWS Step Functionsによる複雑なワークフロー**
   - 並列処理（Parallel/Map state）
   - 条件分岐（Choice state）
   - エラーハンドリング

2. **AWS Glueによるデータ処理**
   - Glue Jobの作成と実行
   - データカタログの活用
   - パーティショニング戦略

3. **Amazon Athenaによるサーバーレス分析**
   - SQLクエリ最適化
   - パーティション pruning
   - CTAS（Create Table As Select）

4. **データレイクアーキテクチャ**
   - Raw/Processed/Curated 層
   - Parquet形式への変換
   - データライフサイクル管理

### 実務で活かせる知識

- 大規模データのETLパイプライン設計
- 時系列データの分析パターン
- IoTデータ基盤の構築

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| ETL | Glue | Dataflow / Dataproc |
| データウェアハウス | Athena / Redshift | BigQuery |
| データカタログ | Glue Data Catalog | Data Catalog |
| ワークフロー | Step Functions | Cloud Workflows / Composer |
| ストレージ | S3 | Cloud Storage |

---

## 使用するAWSサービス

### メインサービス

| サービス | 役割 | 選定理由 |
|----------|------|----------|
| AWS Step Functions | ワークフローオーケストレーション | 複雑なETL制御 |
| AWS Glue | データ変換・ETL | サーバーレスETL |
| Amazon Athena | SQLクエリ分析 | サーバーレス分析 |
| Amazon S3 | データレイク | 大容量、低コスト |
| AWS Lambda | 軽量処理・通知 | イベント駆動 |

### 補助サービス

| サービス | 役割 |
|----------|------|
| Amazon SNS | 異常アラート通知 |
| Amazon SES | レポートメール配信 |
| Amazon CloudWatch | 監視・ログ |
| Amazon EventBridge | スケジュール実行 |
| AWS Glue Data Catalog | メタデータ管理 |

---

## 前提条件

### 必要な事前知識

- AWSの基本操作（S3, Lambda）
- SQLの基礎〜中級
- Pythonの基礎
- ETLの基本概念

### 準備するもの

1. **AWSアカウント**
   - Glue, Athenaへのアクセス権限
   - 適切なIAM権限

2. **開発環境**
   - Terraform v1.5以上
   - AWS CLI v2
   - Python 3.9以上

3. **テストデータ**
   - サンプルセンサーデータ（CSV/JSON）

---

## アーキテクチャ概要

### システム全体構成

```mermaid
flowchart TB
    subgraph DataIngestion["データ収集"]
        IoTSensor["IoTセンサー"]
        IoTCore["IoT Core"]
        S3Raw["S3: Raw Data"]
    end

    EventBridge["EventBridge<br/>（毎日 AM 1:00）"]

    subgraph StepFunctions["Step Functions: DailyETLWorkflow"]
        Step1["[1] Glue Job: データ変換<br/>Raw → Processed (Parquet変換)"]
        Step2["[2] Athena: 異常検知クエリ<br/>閾値超過データ抽出"]
        Step3["[3] Lambda: 異常アラート送信<br/>SNS経由で農家に通知"]
        Step4["[4] Athena: 日次集計クエリ<br/>センサーごとの統計"]
        Step5["[5] Lambda: レポート生成<br/>S3にレポート出力"]
        Step6["[6] Lambda: レポート配信<br/>SES経由でメール送信"]
    end

    subgraph DataLakeStructure["データレイク構成"]
        Raw["Raw:<br/>s3://bucket/raw/year=YYYY/month=MM/day=DD/"]
        Processed["Processed:<br/>s3://bucket/processed/year=YYYY/month=MM/day=DD/"]
        Curated["Curated:<br/>s3://bucket/curated/daily_stats/"]
        Reports["Reports:<br/>s3://bucket/reports/YYYY-MM-DD/"]
    end

    IoTSensor --> IoTCore
    IoTCore --> S3Raw
    S3Raw --> EventBridge
    EventBridge --> StepFunctions
    Step1 --> Step2
    Step2 --> Step3
    Step3 --> Step4
    Step4 --> Step5
    Step5 --> Step6

    Step1 -.-> Processed
    Step4 -.-> Curated
    Step5 -.-> Reports
```

### 処理フロー

1. **データ収集**: IoT Coreからのデータが5分間隔でS3 Rawに蓄積
2. **ETL起動**: EventBridgeが毎日AM1時にStep Functionsを起動
3. **データ変換**: GlueがRaw（JSON）→ Processed（Parquet）に変換
4. **異常検知**: Athenaで閾値超過データを抽出
5. **アラート**: 異常データがあれば農家にSNS通知
6. **集計**: Athenaで日次統計を計算
7. **レポート生成**: Lambdaでレポート作成
8. **配信**: SESで農家にメール送信

---

## トラブルシューティング課題

### 問題1: Glue Jobが失敗

**症状:**
```
An error occurred while calling o87.pyWriteDynamicFrame
OutOfMemoryError: Java heap space
```

**ヒント:**
1. ワーカー数・タイプを確認
2. データ量に対して適切か
3. パーティションの絞り込みができているか

**解決方法:**
```hcl
# ワーカー増強
resource "aws_glue_job" "transform_sensor_data" {
  # ...
  number_of_workers = 5   # 2から5に
  worker_type       = "G.2X"  # G.1XからG.2Xに
}
```

### 問題2: Athenaクエリが遅い

**症状:**
```
クエリに5分以上かかる
スキャンデータ量が大きい
```

**ヒント:**
1. パーティション指定ができているか確認
2. Parquet形式になっているか確認
3. 必要なカラムのみSELECTしているか

**解決方法:**
```sql
-- パーティションを明示的に指定
WHERE year = '2024' AND month = '01' AND day = '15'

-- 必要なカラムのみ選択
SELECT sensor_id, temperature, humidity
FROM processed_sensor_data
-- SELECT * は避ける
```

### 問題3: Step Functionsがタイムアウト

**症状:**
```
States.Timeout エラー
Glue Jobの完了を待てない
```

**ヒント:**
1. Glue Job実行時間を確認
2. Step Functions Standardのタイムアウト設定
3. 同期呼び出し（.sync）を確認

**解決方法:**
```json
// タイムアウト延長
{
  "Type": "Task",
  "Resource": "arn:aws:states:::glue:startJobRun.sync",
  "TimeoutSeconds": 3600,  // 1時間に設定
  // ...
}
```

---

## 設計の考察ポイント

### 1. データレイクのレイヤー設計

**考察ポイント:**
- Raw → Processed → Curated の3層構造
- 各層の目的と保持期間
- 形式の選択（JSON → Parquet）

### 2. パーティショニング戦略

**考察ポイント:**
- 年/月/日 でのパーティショニング
- クエリパターンとの整合性
- パーティション数の管理

### 3. ETLツールの選択

**考察ポイント:**
- Glue vs Lambda vs EMR
- データ量とコストのバランス
- 開発生産性

### 4. リアルタイム vs バッチ

**考察ポイント:**
- 異常検知をリアルタイムにする必要性
- Kinesis + Lambda の検討
- コストと緊急性のトレードオフ

### 5. コスト最適化

**考察ポイント:**
- S3ライフサイクルポリシー
- Glue DPU の最適化
- Athena のスキャン量削減

---

## 発展課題（オプション）

### 1. リアルタイム異常検知
- Kinesis Data Streams + Lambda
- 5分以内の検知
- 即時アラート

### 2. 機械学習による予測
- SageMaker連携
- 収穫時期予測
- 病害予測

### 3. ダッシュボード構築
- QuickSight連携
- リアルタイムモニタリング
- 農家向けポータル

### 4. データ品質管理
- Glue Data Quality
- 自動データ検証
- 品質スコアリング

### 5. マルチリージョン対応
- 災害対策
- S3レプリケーション
- グローバル展開

---

## 想定コストと削減方法

### 月額概算コスト（日次10GB処理想定）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| AWS Glue | 2 DPU × 30分 × 30日 | $13 |
| Amazon Athena | 300GB/月スキャン | $15 |
| Amazon S3 | 300GB（Raw+Processed）| $7 |
| AWS Lambda | 処理関数実行 | $5 |
| Step Functions | 30ワークフロー | $0.75 |
| Amazon SNS | 通知 | $1 |
| Amazon SES | メール配信 | $1 |
| CloudWatch | ログ | $5 |
| **合計** | | **約$48（約7,200円）** |

### コスト削減のポイント

1. **Athena最適化**
   - Parquet + Snappy圧縮
   - パーティション pruning
   - → スキャン量70%削減

2. **S3ライフサイクル**
   - Raw: 30日後Glacier
   - Processed: 90日後IA
   - → ストレージコスト50%削減

3. **Glue Job最適化**
   - Auto Scaling
   - ジョブブックマーク（増分処理）
   - → 処理時間50%削減

4. **スポットインスタンス**
   - Glue Flex実行
   - → Glueコスト30%削減

### リソース削除手順

```bash
# Step Functions
aws stepfunctions delete-state-machine --state-machine-arn arn:aws:states:...

# Glue
aws glue delete-job --job-name agritech-transform-sensor-data
aws glue delete-table --database-name agritech_sensor_data --name raw_sensor_data
aws glue delete-table --database-name agritech_sensor_data --name processed_sensor_data
aws glue delete-database --name agritech_sensor_data

# Lambda
aws lambda delete-function --function-name agritech-anomaly-alert
aws lambda delete-function --function-name agritech-generate-report
aws lambda delete-function --function-name agritech-send-report

# S3（データ削除後）
aws s3 rm s3://agritech-data-lake-dev-${ACCOUNT_ID} --recursive
aws s3 rb s3://agritech-data-lake-dev-${ACCOUNT_ID}

# SNS/SES
aws sns delete-topic --topic-arn arn:aws:sns:...

# Terraform
terraform destroy -auto-approve
```

---

## 学習のポイント

### 1. データレイクアーキテクチャの基本
Raw → Processed → Curated の3層構造で、データの鮮度・品質・用途に応じた管理を行う。各層で適切な形式（JSON, Parquet）を選択。

### 2. Glueによるサーバーレス ETL
Apache Spark ベースの ETL をサーバーレスで実行。データカタログによるメタデータ管理、ジョブブックマークによる増分処理が特徴。

### 3. Athenaによるサーバーレス分析
S3上のデータに直接SQLを実行。Parquet形式とパーティショニングによりスキャン量を削減し、コストと性能を最適化。

### 4. Step Functionsによる複雑なワークフロー
Parallel state で並列処理、Choice state で条件分岐を実装。Glueの同期呼び出し（.sync）でジョブ完了を待機。

### 5. IoT/農業データの特性理解
時系列データの特性、異常値の定義、季節変動を考慮した分析が重要。ドメイン知識とデータエンジニアリングの両方が必要。
