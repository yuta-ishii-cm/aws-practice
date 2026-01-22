# 課題31: モバイルアプリのリアルタイム分析基盤構築

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | データ基盤 |
| 処理タイプ | ストリーミング |
| 使用IaC | CloudFormation |
| 想定所要時間 | 5-6時間 |

---

## 2. シナリオ

### 企業プロファイル

| 項目 | 内容 |
|------|------|
| **企業名** | ConnectNow株式会社 |
| **業種** | ソーシャルアプリ（位置情報共有SNS） |
| **従業員数** | 120名（エンジニア40名） |
| **DAU** | 50万人 |
| **月間イベント数** | 10億イベント |
| **ピーク時スループット** | 10,000イベント/秒 |

### 現状の課題

```
ConnectNow株式会社は急成長する位置情報共有SNSを運営しています。
リアルタイムデータ分析において以下の課題を抱えています：

1. 分析の遅延
   - バッチ処理で翌日にならないとデータが見られない
   - 異常検知が手遅れになることがある
   - キャンペーン効果をリアルタイムで把握できない

2. ユーザー体験の最適化困難
   - アプリクラッシュの検知が遅い
   - ユーザー離脱ポイントが特定できない
   - A/Bテストの結果確認に時間がかかる

3. 運用負荷
   - ログ検索に時間がかかる
   - 障害時の原因特定が困難
   - カスタムダッシュボード作成に工数がかかる

4. スケーラビリティの限界
   - ピーク時にログ取りこぼしが発生
   - イベント種類の追加が困難
   - ストレージコストが増大
```

### ビジネス目標

| KPI | 現状 | 目標 |
|-----|------|------|
| データ反映遅延 | 24時間 | 1分以内 |
| 異常検知時間 | 数時間後 | 1分以内 |
| ログ検索時間 | 10分以上 | 10秒以内 |
| ピーク対応 | 5,000イベント/秒 | 50,000イベント/秒 |
| 運用工数 | 月40時間 | 月10時間 |

---

## 3. 達成目標（ゴール）

### 主要な学習成果

```
この課題を完了すると、以下ができるようになります：

1. Amazon Kinesisによるストリーム処理
   - Kinesis Data Streamsでのリアルタイムデータ取り込み
   - Kinesis Data Firehoseでのデータ配信
   - シャード管理とスケーリング

2. AWS Lambdaによるストリーム処理
   - Kinesisトリガーでのリアルタイム処理
   - データ変換と集計
   - エラーハンドリングとリトライ

3. Amazon OpenSearch Serviceによる検索・可視化
   - リアルタイムダッシュボード構築
   - ログ検索とフィルタリング
   - アラート設定

4. リアルタイム分析パイプライン
   - イベント駆動アーキテクチャ
   - 異常検知の自動化
   - メトリクス集計
```

### 合格基準

| 項目 | 基準 |
|------|------|
| データ取り込み | Kinesisで1万イベント/秒を処理できること |
| リアルタイム性 | イベント発生から1分以内にダッシュボードに反映 |
| 検索 | OpenSearchで10秒以内にログ検索できること |
| アラート | 異常パターン検知時に自動通知されること |
| 可視化 | リアルタイムダッシュボードが動作すること |

---

## 4. 使用するAWSサービス

### コア技術スタック

```yaml
データ取り込み:
  - Amazon Kinesis Data Streams: リアルタイムストリーミング
  - Amazon Kinesis Data Firehose: S3/OpenSearchへの配信
  - Amazon Kinesis Data Analytics: ストリームSQL処理

処理・変換:
  - AWS Lambda: イベント駆動処理
  - Amazon EventBridge: イベントルーティング

検索・可視化:
  - Amazon OpenSearch Service: ログ検索・ダッシュボード
  - Amazon CloudWatch: メトリクス・アラーム

ストレージ:
  - Amazon S3: 長期保存
  - Amazon DynamoDB: リアルタイム集計結果

通知:
  - Amazon SNS: アラート通知
  - AWS Chatbot: Slack連携
```

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| ストリーミング取り込み | Kinesis Data Streams | Pub/Sub |
| ストリーム処理 | Kinesis Data Analytics | Dataflow |
| 配信 | Kinesis Firehose | Pub/Sub → BigQuery |
| ログ検索 | OpenSearch | Cloud Logging |
| ダッシュボード | OpenSearch Dashboards | Looker Studio |

---

## 5. 前提条件

### 技術要件

```bash
# 必要なCLIツール
aws --version          # 2.x
python --version       # 3.9+
jq --version           # 1.6+

# AWS設定
aws configure
export AWS_REGION=ap-northeast-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

### 事前準備

```bash
# イベントスキーマ定義
# ConnectNowアプリから送信されるイベント

{
  "event_id": "uuid",
  "event_type": "page_view | button_click | location_share | message_send | ...",
  "timestamp": "2024-01-15T10:30:00Z",
  "user_id": "user_xxx",
  "session_id": "session_xxx",
  "device": {
    "type": "ios | android",
    "os_version": "17.0",
    "app_version": "3.2.1",
    "device_model": "iPhone 15"
  },
  "location": {
    "latitude": 35.6812,
    "longitude": 139.7671,
    "accuracy": 10.5
  },
  "properties": {
    "page_name": "home",
    "button_id": "share_location",
    ...
  }
}
```

---

## 6. アーキテクチャ図

### 全体構成

```mermaid
architecture-beta
    group clients(cloud)[Mobile Apps / Web]
    group aws(cloud)[AWS Cloud]
    group streaming(server)[Streaming Layer] in aws
    group processing(server)[Processing Layer] in aws
    group storage(database)[Storage Layer] in aws
    group monitoring(server)[Monitoring] in aws

    service ios(internet)[iOS App] in clients
    service android(internet)[Android App] in clients
    service web(internet)[Web App] in clients

    service apigw(server)[API Gateway POST /events] in aws
    service kinesis(server)[Kinesis Data Streams 4 shards] in streaming

    service lambda_rt(server)[Lambda Real-time Processing] in processing
    service kda(server)[Kinesis Data Analytics] in processing
    service firehose_s3(server)[Firehose S3 Archive] in processing

    service firehose_os(server)[Firehose OpenSearch] in storage
    service dynamodb(database)[DynamoDB Real-time KPIs] in storage
    service s3(disk)[S3 Data Lake] in storage
    service opensearch(database)[OpenSearch Service] in storage

    service cloudwatch(server)[CloudWatch Alarms] in monitoring
    service sns(server)[SNS Notifications] in monitoring

    ios:B --> T:apigw
    android:B --> T:apigw
    web:B --> T:apigw
    apigw:B --> T:kinesis
    kinesis:B --> T:lambda_rt
    kinesis:B --> T:kda
    kinesis:B --> T:firehose_s3
    lambda_rt:B --> T:firehose_os
    kda:B --> T:dynamodb
    firehose_s3:B --> T:s3
    firehose_os:B --> T:opensearch
    opensearch:R --> L:cloudwatch
    opensearch:R --> L:sns
```

**Kinesis Data Streams 設定:**
- Stream: connectnow-events-stream (4 shards)
- Partition Key: user_id (均等分散)
- Retention: 24 hours

**OpenSearch Service 設定:**
- Domain: connectnow-analytics
- Nodes: 3 × r6g.large.search (Multi-AZ)
- Index Lifecycle: 7日後にdelete

**OpenSearch Dashboards:**
- Real-time Metrics Dashboard
- User Journey Analysis
- Error Tracking Dashboard

### データフロー

```
1. イベント送信（ミリ秒）
   Mobile App → API Gateway → Lambda → Kinesis Data Streams

2. リアルタイム処理（秒単位）
   Kinesis → Lambda → OpenSearch/DynamoDB
   - イベント変換・エンリッチメント
   - リアルタイムカウンター更新
   - 異常検知

3. 集計処理（分単位）
   Kinesis → Kinesis Data Analytics
   - 1分間のウィンドウ集計
   - DAU/MAU計算
   - ファネル分析

4. アーカイブ（5分単位）
   Kinesis → Firehose → S3
   - Parquet形式で保存
   - パーティショニング
   - 長期保存
```

---

## 8. トラブルシューティングチャレンジ

### Challenge 1: Kinesisのスループット制限エラー

```
問題:
ピーク時にProvisionedThroughputExceededExceptionが頻発。
イベントの取りこぼしが発生している。

エラーログ:
ProvisionedThroughputExceededException: Rate exceeded for shard shardId-000000000001

メトリクス:
- WriteProvisionedThroughputExceeded: 100+/分
- IncomingRecords: 15,000/秒
- シャード数: 4

調査項目:
1. シャードあたりのスループット
2. パーティションキーの分散
3. スケーリング設定
```

<details>
<summary>解決のヒント</summary>

```bash
# 1. シャードあたりの制限確認
# 書き込み: 1MB/秒 または 1,000レコード/秒
# 読み取り: 2MB/秒 または 5回/秒

# 2. パーティションキーの分散状況確認
aws kinesis describe-stream --stream-name connectnow-events \
    --query "StreamDescription.Shards[*].HashKeyRange"

# 3. シャード数を増やす（Provisionedモードの場合）
aws kinesis update-shard-count \
    --stream-name connectnow-events \
    --target-shard-count 8 \
    --scaling-type UNIFORM_SCALING

# 4. On-Demandモードに変更（推奨）
aws kinesis update-stream-mode \
    --stream-arn arn:aws:kinesis:ap-northeast-1:xxx:stream/connectnow-events \
    --stream-mode-details StreamMode=ON_DEMAND

# 5. プロデューサー側でリトライ実装
# Exponential backoff + jitterを使用

# 6. パーティションキーの改善
# user_idだけでなく、ランダムサフィックスを追加
partition_key = f"{user_id}-{random.randint(0, 9)}"
```
</details>

### Challenge 2: OpenSearchへの配信遅延

```
問題:
Firehoseからの配信が遅延し、ダッシュボードに5分以上遅れてデータが反映される。

CloudWatch メトリクス:
- DeliveryToOpenSearch.Success: 低下
- DeliveryToOpenSearch.DataFreshness: 300秒以上

OpenSearchログ:
- BulkRejected エラー多発

調査項目:
1. OpenSearchのインデックス設定
2. Firehoseのバッファ設定
3. OpenSearchのリソース状況
```

<details>
<summary>解決のヒント</summary>

```bash
# 1. OpenSearchクラスターのメトリクス確認
aws cloudwatch get-metric-data \
    --metric-data-queries '[
        {"Id":"cpu","MetricStat":{"Metric":{"Namespace":"AWS/ES","MetricName":"CPUUtilization","Dimensions":[{"Name":"DomainName","Value":"connectnow-analytics"}]},"Period":300,"Stat":"Average"}},
        {"Id":"jvm","MetricStat":{"Metric":{"Namespace":"AWS/ES","MetricName":"JVMMemoryPressure","Dimensions":[{"Name":"DomainName","Value":"connectnow-analytics"}]},"Period":300,"Stat":"Average"}}
    ]' \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ)

# 2. インデックス設定の最適化
curl -XPUT "https://${OPENSEARCH_ENDPOINT}/events-*/_settings" \
    -H "Content-Type: application/json" \
    -d '{
        "index": {
            "refresh_interval": "30s",
            "number_of_replicas": 0
        }
    }'

# 3. Firehoseバッファ設定の調整
aws firehose update-destination \
    --delivery-stream-name connectnow-to-opensearch \
    --current-delivery-stream-version-id xxx \
    --destination-id xxx \
    --amazon-opensearch-destination-update '{
        "BufferingHints": {
            "IntervalInSeconds": 60,
            "SizeInMBs": 5
        }
    }'

# 4. OpenSearchのスケールアップ
aws opensearch update-domain-config \
    --domain-name connectnow-analytics \
    --cluster-config '{
        "InstanceType": "r6g.xlarge.search",
        "InstanceCount": 5
    }'
```
</details>

### Challenge 3: Lambda関数のコンカレンシー制限

```
問題:
Kinesisからのイベント処理Lambdaがスロットリングされている。
IteratorAgeが増加し続けている。

CloudWatch メトリクス:
- Throttles: 1000+/分
- ConcurrentExecutions: 1000（アカウント制限）
- IteratorAgeMilliseconds: 増加中

調査項目:
1. Lambda関数の実行時間
2. コンカレンシー設定
3. バッチサイズ
```

<details>
<summary>解決のヒント</summary>

```bash
# 1. 現在のコンカレンシー状況確認
aws lambda get-account-settings

# 2. 予約済みコンカレンシーを設定
aws lambda put-function-concurrency \
    --function-name connectnow-stream-processor \
    --reserved-concurrent-executions 500

# 3. イベントソースマッピングの最適化
aws lambda update-event-source-mapping \
    --uuid xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
    --batch-size 500 \
    --parallelization-factor 10 \
    --maximum-batching-window-in-seconds 5

# 4. Lambda関数の最適化
# - メモリ増加で実行時間短縮
aws lambda update-function-configuration \
    --function-name connectnow-stream-processor \
    --memory-size 1024 \
    --timeout 300

# 5. コンカレンシー上限緩和申請
# AWS サポートに上限緩和リクエスト

# 6. 複数のコンシューマーに分散
# Kinesis Enhanced Fan-Out を使用
aws kinesis register-stream-consumer \
    --stream-arn arn:aws:kinesis:...:stream/connectnow-events \
    --consumer-name processor-1
```
</details>

---

## 9. 設計考慮ポイント

### ストリーミングアーキテクチャの選択

```yaml
Kinesis Data Streams:
  特徴:
    - リアルタイム（ミリ秒レイテンシ）
    - 順序保証（シャード内）
    - 複数コンシューマー対応
  ユースケース:
    - リアルタイム処理
    - 複雑なルーティング
    - カスタム処理ロジック

Kinesis Data Firehose:
  特徴:
    - フルマネージド配信
    - バッファリングで最適化
    - 変換処理統合
  ユースケース:
    - S3/OpenSearch/Redshiftへの配信
    - シンプルなETL
    - 運用負荷軽減優先

Amazon MSK (Kafka):
  特徴:
    - オープンソース互換
    - より高いスループット
    - 柔軟なパーティショニング
  ユースケース:
    - 既存Kafkaからの移行
    - 複雑なイベント処理
    - マルチリージョン

選択指針:
- 小〜中規模、AWS統合重視 → Kinesis
- 大規模、Kafka経験あり → MSK
- 配信のみ、運用軽減 → Firehose直接
```

### スケーリング戦略

```
Kinesis Data Streams:
┌─────────────────────────────────────────────────────┐
│ Provisioned Mode:                                   │
│   - シャード数を手動管理                           │
│   - 1シャード = 1MB/s書込, 2MB/s読込              │
│   - コスト予測が容易                               │
│                                                     │
│ On-Demand Mode:                                     │
│   - 自動スケーリング（4MB/sまで対応）             │
│   - 使用量ベース課金                               │
│   - 予測困難なワークロードに最適                   │
└─────────────────────────────────────────────────────┘

Lambda コンシューマー:
┌─────────────────────────────────────────────────────┐
│ パラメータチューニング:                            │
│   - BatchSize: 100-10000（大きいほど効率的）       │
│   - ParallelizationFactor: 1-10（シャードあたり）  │
│   - MaximumBatchingWindowInSeconds: 0-300秒        │
│                                                     │
│ Enhanced Fan-Out:                                   │
│   - 専用スループット（2MB/s/コンシューマー）       │
│   - Push型配信（低レイテンシ）                     │
│   - コンシューマー数に依存しないスケール           │
└─────────────────────────────────────────────────────┘
```

---

## 10. 発展課題

### 上級チャレンジ1: リアルタイム異常検知 ML

```python
# Amazon Kinesis Data Analytics + Random Cut Forest
# 異常検知のためのSQL

-- 入力ストリームの集計
CREATE OR REPLACE STREAM "AGGREGATED_STREAM" (
    "timestamp" TIMESTAMP,
    "event_count" INTEGER,
    "error_count" INTEGER,
    "unique_users" INTEGER
);

CREATE OR REPLACE PUMP "AGGREGATE_PUMP" AS
    INSERT INTO "AGGREGATED_STREAM"
    SELECT STREAM
        FLOOR(ROWTIME TO MINUTE),
        COUNT(*),
        SUM(CASE WHEN "event_type" = 'error' THEN 1 ELSE 0 END),
        COUNT(DISTINCT "user_id")
    FROM "SOURCE_SQL_STREAM"
    GROUP BY FLOOR(ROWTIME TO MINUTE);

-- Random Cut Forest による異常検知
CREATE OR REPLACE STREAM "ANOMALY_STREAM" (
    "timestamp" TIMESTAMP,
    "event_count" INTEGER,
    "error_count" INTEGER,
    "anomaly_score" DOUBLE
);

CREATE OR REPLACE PUMP "ANOMALY_PUMP" AS
    INSERT INTO "ANOMALY_STREAM"
    SELECT STREAM
        "timestamp",
        "event_count",
        "error_count",
        ANOMALY_SCORE
    FROM TABLE(
        RANDOM_CUT_FOREST(
            CURSOR(SELECT STREAM * FROM "AGGREGATED_STREAM"),
            100,  -- numberOfTrees
            256,  -- subSampleSize
            100000,  -- timeDecay
            1  -- shingleSize
        )
    )
    WHERE ANOMALY_SCORE > 2.0;  -- 異常スコアしきい値
```

### 上級チャレンジ2: リアルタイムレコメンデーション

```python
# Lambda + DynamoDB でリアルタイムレコメンデーション

import boto3
from collections import Counter

dynamodb = boto3.resource('dynamodb')
user_events_table = dynamodb.Table('user-recent-events')
recommendations_table = dynamodb.Table('user-recommendations')

def process_event_for_recommendation(event_data):
    """イベントに基づいてリアルタイムレコメンデーションを更新"""
    user_id = event_data['user_id']
    event_type = event_data['event_type']

    if event_type == 'content_view':
        content_id = event_data['properties']['content_id']
        content_category = event_data['properties']['category']

        # 最近のビュー履歴を更新
        user_events_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET recent_views = list_append(if_not_exists(recent_views, :empty), :content)',
            ExpressionAttributeValues={
                ':content': [{'content_id': content_id, 'category': content_category}],
                ':empty': []
            }
        )

        # カテゴリ別興味スコアを更新
        user_events_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='ADD category_scores.#cat :inc',
            ExpressionAttributeNames={'#cat': content_category},
            ExpressionAttributeValues={':inc': 1}
        )

        # リアルタイムレコメンデーション生成
        generate_recommendations(user_id)


def generate_recommendations(user_id):
    """ユーザーの行動履歴に基づいてレコメンデーションを生成"""
    # ユーザーの興味カテゴリを取得
    response = user_events_table.get_item(Key={'user_id': user_id})
    user_data = response.get('Item', {})
    category_scores = user_data.get('category_scores', {})

    if not category_scores:
        return

    # 上位カテゴリを特定
    top_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)[:3]

    # 各カテゴリの人気コンテンツを取得（別テーブルから）
    recommendations = []
    for category, score in top_categories:
        popular_content = get_popular_content(category)
        recommendations.extend(popular_content[:5])

    # レコメンデーションを保存
    recommendations_table.put_item(
        Item={
            'user_id': user_id,
            'recommendations': recommendations[:10],
            'updated_at': datetime.utcnow().isoformat()
        }
    )
```

### 上級チャレンジ3: マルチリージョンストリーミング

```yaml
# グローバル配信アーキテクチャ

Region: ap-northeast-1 (Tokyo)
  Kinesis Stream: connectnow-events-tokyo
  Consumers:
    - OpenSearch (Tokyo)
    - S3 Archive
    - Cross-Region Replication → us-east-1

Region: us-east-1 (Virginia)
  Kinesis Stream: connectnow-events-virginia
  Consumers:
    - OpenSearch (Virginia)
    - Aggregated Stream → Tokyo (メトリクス統合)

# Lambda クロスリージョンレプリケーション
def replicate_to_region(event, target_region, target_stream):
    kinesis = boto3.client('kinesis', region_name=target_region)

    records = []
    for record in event['Records']:
        records.append({
            'Data': base64.b64decode(record['kinesis']['data']),
            'PartitionKey': record['kinesis']['partitionKey']
        })

    kinesis.put_records(StreamName=target_stream, Records=records)
```

---

## 11. コスト見積もり

### 月額コスト概算

| サービス | スペック | 月額コスト |
|----------|----------|------------|
| Kinesis Data Streams | On-Demand 10M records/day | $35 |
| Kinesis Firehose | 1TB配信/月 | $35 |
| Lambda | 100M invocations | $20 |
| OpenSearch | 3 × r6g.large + 100GB | $450 |
| DynamoDB | 10M writes/month | $15 |
| CloudWatch | ログ10GB + メトリクス | $30 |
| S3 | 500GB アーカイブ | $12 |
| **合計** | | **約 $597/月** |

### スケール時の見積もり

```
DAU 500万人（10倍）の場合:

- Kinesis: 約 $350/月（On-Demand自動スケール）
- Lambda: 約 $200/月
- OpenSearch: 約 $1,200/月（スケールアップ必要）
- DynamoDB: 約 $150/月
- その他: 約 $100/月

合計: 約 $2,000/月
```

---

## 12. 学習のポイント

### 今回学んだこと

```
1. Kinesisストリーミング
   □ Data Streamsでのリアルタイムデータ取り込み
   □ シャード管理とスケーリング
   □ Firehoseでの自動配信

2. Lambda ストリーム処理
   □ Kinesisトリガーの設定
   □ バッチ処理とエラーハンドリング
   □ DynamoDBとの連携

3. OpenSearch Service
   □ インデックス設計とマッピング
   □ ダッシュボード作成
   □ アラート設定

4. リアルタイム分析パターン
   □ ウィンドウ集計
   □ 異常検知
   □ イベント駆動アーキテクチャ
```

### GCPとの比較まとめ

| 観点 | AWS (Kinesis + OpenSearch) | GCP (Pub/Sub + BigQuery) |
|------|---------------------------|--------------------------|
| リアルタイム性 | ミリ秒〜秒 | 秒〜分 |
| クエリ | OpenSearch (Elasticsearch) | BigQuery SQL |
| 可視化 | OpenSearch Dashboards | Looker Studio |
| 運用複雑さ | 中〜高 | 低〜中 |
| コスト | 使用量ベース | ストレージ+クエリ |

### 次のステップ

```
1. 発展学習:
   - Amazon MSK でのKafka運用
   - Amazon Managed Grafana での可視化
   - AWS Glue Streaming ETL

2. 実務応用:
   - A/Bテスト分析基盤
   - カスタマージャーニー分析
   - 不正検知システム

3. 認定資格:
   - AWS Certified Data Analytics - Specialty
   - AWS Certified Solutions Architect - Professional
```
