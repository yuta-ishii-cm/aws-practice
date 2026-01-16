# 課題17: モバイルアプリのリアルタイム分析基盤構築

## 1. 課題の分類

| 項目 | 内容 |
|------|------|
| **カテゴリ** | データ基盤 |
| **難易度** | 中級（Level 3） |
| **所要時間** | 5-6時間 |
| **前提スキル** | Python基礎、ストリーミング概念、JSON |
| **関連キーワード** | Kinesis, Lambda, OpenSearch, リアルタイム分析, ストリーム処理 |

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

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Mobile Apps / Web                                  │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │   iOS App    │  │ Android App  │  │   Web App    │                      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
│         │                 │                 │                               │
│         └─────────────────┼─────────────────┘                               │
│                           │                                                  │
│                           ▼                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    API Gateway (REST API)                          │    │
│  │                    POST /events                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                           │                                                  │
└───────────────────────────┼──────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Amazon Kinesis Data Streams                               │
│                                                                              │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │  connectnow-events-stream (4 shards)                            │     │
│    │                                                                  │     │
│    │   Shard-0    Shard-1    Shard-2    Shard-3                      │     │
│    │   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐                        │     │
│    │   │█████│   │█████│   │█████│   │█████│                        │     │
│    │   │█████│   │█████│   │█████│   │█████│                        │     │
│    │   └─────┘   └─────┘   └─────┘   └─────┘                        │     │
│    │                                                                  │     │
│    │   Partition Key: user_id (均等分散)                             │     │
│    │   Retention: 24 hours                                           │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────┬────────────────────────────────────┘
                                          │
          ┌───────────────────────────────┼───────────────────────────────┐
          │                               │                               │
          ▼                               ▼                               ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│  Lambda Function │          │  Kinesis Data    │          │  Kinesis Data    │
│  (Real-time      │          │  Analytics       │          │  Firehose        │
│   Processing)    │          │  (Stream SQL)    │          │  (S3 Archive)    │
│                  │          │                  │          │                  │
│  ┌────────────┐  │          │  ┌────────────┐  │          │  Buffer: 5MB     │
│  │ Transform  │  │          │  │  Windowed  │  │          │  Interval: 300s  │
│  │ Aggregate  │  │          │  │ Aggregation│  │          │                  │
│  │ Alert      │  │          │  │            │  │          │  Format: Parquet │
│  └────────────┘  │          │  └────────────┘  │          │  Compression:    │
│                  │          │                  │          │  Snappy          │
└────────┬─────────┘          └────────┬─────────┘          └────────┬─────────┘
         │                             │                             │
         │                             │                             │
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│  Kinesis Data    │          │  DynamoDB        │          │  Amazon S3       │
│  Firehose        │          │  (Real-time KPIs)│          │  (Data Lake)     │
│  (OpenSearch)    │          │                  │          │                  │
│                  │          │  ┌────────────┐  │          │  └── raw/        │
│  Buffer: 1MB     │          │  │ DAU        │  │          │     └── events/  │
│  Interval: 60s   │          │  │ Sessions   │  │          │        └── 2024/ │
└────────┬─────────┘          │  │ Events/min │  │          │           └── 01/│
         │                    │  └────────────┘  │          │              └──▶│
         │                    └──────────────────┘          └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Amazon OpenSearch Service                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Domain: connectnow-analytics                                        │   │
│  │  Nodes: 3 × r6g.large.search (Multi-AZ)                             │   │
│  │                                                                      │   │
│  │  Indices:                                                            │   │
│  │  ├── events-2024.01.15 (日次インデックス)                           │   │
│  │  ├── events-2024.01.14                                              │   │
│  │  └── ...                                                             │   │
│  │                                                                      │   │
│  │  Index Lifecycle: 7日後にdelete                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  OpenSearch Dashboards                                               │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │ Real-time   │  │   User      │  │   Error     │                  │   │
│  │  │ Metrics     │  │   Journey   │  │   Tracking  │                  │   │
│  │  │ Dashboard   │  │   Analysis  │  │   Dashboard │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────┬──────────────────────────────────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                              ▼                         ▼
                    ┌──────────────────┐     ┌──────────────────┐
                    │   CloudWatch     │     │      SNS         │
                    │   Alarms         │     │   Notifications  │
                    │                  │     │                  │
                    │  • Error Rate    │     │  → Slack         │
                    │  • Latency       │     │  → PagerDuty     │
                    │  • DAU Drop      │     │  → Email         │
                    └──────────────────┘     └──────────────────┘
```

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

## 7. ハンズオン手順

### Step 1: Kinesis Data Streams作成

```bash
# ストリーム作成
aws kinesis create-stream \
    --stream-name connectnow-events \
    --shard-count 4 \
    --stream-mode-details StreamMode=PROVISIONED

# ストリーム状態確認
aws kinesis describe-stream-summary --stream-name connectnow-events

# オンデマンドモードに変更（自動スケーリング）
aws kinesis update-stream-mode \
    --stream-arn arn:aws:kinesis:ap-northeast-1:${AWS_ACCOUNT_ID}:stream/connectnow-events \
    --stream-mode-details StreamMode=ON_DEMAND
```

```bash
# 拡張モニタリング有効化
aws kinesis enable-enhanced-monitoring \
    --stream-name connectnow-events \
    --shard-level-metrics IncomingBytes IncomingRecords OutgoingBytes OutgoingRecords WriteProvisionedThroughputExceeded ReadProvisionedThroughputExceeded IteratorAgeMilliseconds
```

### Step 2: API Gateway + Lambda (イベント受信)

```python
# lambda_event_producer.py
# API Gatewayから呼び出されるLambda関数

import json
import boto3
import uuid
from datetime import datetime

kinesis = boto3.client('kinesis')
STREAM_NAME = 'connectnow-events'

def lambda_handler(event, context):
    """イベントを受信してKinesisに送信"""
    try:
        # リクエストボディをパース
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})

        # バッチイベントかシングルイベントか判定
        events = body.get('events', [body])

        records = []
        for evt in events:
            # イベントID追加
            if 'event_id' not in evt:
                evt['event_id'] = str(uuid.uuid4())

            # タイムスタンプ追加
            if 'timestamp' not in evt:
                evt['timestamp'] = datetime.utcnow().isoformat() + 'Z'

            # サーバーサイド情報追加
            evt['server_timestamp'] = datetime.utcnow().isoformat() + 'Z'
            evt['source_ip'] = event.get('requestContext', {}).get('identity', {}).get('sourceIp')

            records.append({
                'Data': json.dumps(evt).encode('utf-8'),
                'PartitionKey': evt.get('user_id', str(uuid.uuid4()))  # user_idで分散
            })

        # Kinesisに送信（バッチ）
        if records:
            response = kinesis.put_records(
                StreamName=STREAM_NAME,
                Records=records
            )

            failed_count = response.get('FailedRecordCount', 0)
            if failed_count > 0:
                print(f"Failed to put {failed_count} records")
                # リトライロジック（実際のプロダクションでは実装）

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Events received',
                'count': len(records)
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

```yaml
# template.yaml (SAM)
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: ConnectNow Event Ingestion API

Globals:
  Function:
    Timeout: 10
    Runtime: python3.11
    MemorySize: 256

Resources:
  EventIngestionApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Cors:
        AllowMethods: "'POST,OPTIONS'"
        AllowHeaders: "'Content-Type,X-Api-Key'"
        AllowOrigin: "'*'"

  EventProducerFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: connectnow-event-producer
      CodeUri: ./lambda_event_producer/
      Handler: lambda_event_producer.lambda_handler
      Events:
        PostEvents:
          Type: Api
          Properties:
            RestApiId: !Ref EventIngestionApi
            Path: /events
            Method: POST
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - kinesis:PutRecord
                - kinesis:PutRecords
              Resource: !Sub arn:aws:kinesis:${AWS::Region}:${AWS::AccountId}:stream/connectnow-events

Outputs:
  ApiEndpoint:
    Description: API Gateway endpoint
    Value: !Sub https://${EventIngestionApi}.execute-api.${AWS::Region}.amazonaws.com/prod/events
```

### Step 3: OpenSearch Service構築

```bash
# OpenSearchドメイン作成
aws opensearch create-domain \
    --domain-name connectnow-analytics \
    --engine-version OpenSearch_2.11 \
    --cluster-config '{
        "InstanceType": "r6g.large.search",
        "InstanceCount": 3,
        "DedicatedMasterEnabled": true,
        "DedicatedMasterType": "r6g.large.search",
        "DedicatedMasterCount": 3,
        "ZoneAwarenessEnabled": true,
        "ZoneAwarenessConfig": {
            "AvailabilityZoneCount": 3
        }
    }' \
    --ebs-options '{
        "EBSEnabled": true,
        "VolumeType": "gp3",
        "VolumeSize": 100,
        "Iops": 3000,
        "Throughput": 125
    }' \
    --access-policies '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "*"
                },
                "Action": "es:*",
                "Resource": "arn:aws:es:ap-northeast-1:'${AWS_ACCOUNT_ID}':domain/connectnow-analytics/*",
                "Condition": {
                    "IpAddress": {
                        "aws:SourceIp": ["YOUR_IP/32"]
                    }
                }
            }
        ]
    }' \
    --encryption-at-rest-options Enabled=true \
    --node-to-node-encryption-options Enabled=true \
    --domain-endpoint-options '{
        "EnforceHTTPS": true,
        "TLSSecurityPolicy": "Policy-Min-TLS-1-2-2019-07"
    }'
```

```bash
# インデックステンプレート作成
cat > index-template.json << 'EOF'
{
  "index_patterns": ["events-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.refresh_interval": "5s"
    },
    "mappings": {
      "properties": {
        "event_id": { "type": "keyword" },
        "event_type": { "type": "keyword" },
        "timestamp": { "type": "date" },
        "server_timestamp": { "type": "date" },
        "user_id": { "type": "keyword" },
        "session_id": { "type": "keyword" },
        "device": {
          "properties": {
            "type": { "type": "keyword" },
            "os_version": { "type": "keyword" },
            "app_version": { "type": "keyword" },
            "device_model": { "type": "keyword" }
          }
        },
        "location": {
          "type": "geo_point"
        },
        "properties": {
          "type": "object",
          "dynamic": true
        },
        "source_ip": { "type": "ip" }
      }
    }
  }
}
EOF

# OpenSearchにテンプレート登録
OPENSEARCH_ENDPOINT=$(aws opensearch describe-domain --domain-name connectnow-analytics --query 'DomainStatus.Endpoint' --output text)

curl -XPUT "https://${OPENSEARCH_ENDPOINT}/_index_template/events-template" \
    -H "Content-Type: application/json" \
    -d @index-template.json
```

### Step 4: Kinesis Firehose (OpenSearch配信)

```bash
# Firehose用IAMロール作成
cat > firehose-role-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "firehose.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

aws iam create-role \
    --role-name ConnectNowFirehoseRole \
    --assume-role-policy-document file://firehose-role-policy.json

# ポリシーアタッチ
cat > firehose-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "es:DescribeDomain",
                "es:DescribeDomains",
                "es:DescribeDomainConfig",
                "es:ESHttpPost",
                "es:ESHttpPut"
            ],
            "Resource": [
                "arn:aws:es:ap-northeast-1:*:domain/connectnow-analytics",
                "arn:aws:es:ap-northeast-1:*:domain/connectnow-analytics/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:AbortMultipartUpload",
                "s3:GetBucketLocation",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:ListBucketMultipartUploads",
                "s3:PutObject"
            ],
            "Resource": [
                "arn:aws:s3:::connectnow-firehose-backup-*",
                "arn:aws:s3:::connectnow-firehose-backup-*/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "kinesis:DescribeStream",
                "kinesis:GetShardIterator",
                "kinesis:GetRecords",
                "kinesis:ListShards"
            ],
            "Resource": "arn:aws:kinesis:ap-northeast-1:*:stream/connectnow-events"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:PutLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF

aws iam put-role-policy \
    --role-name ConnectNowFirehoseRole \
    --policy-name FirehosePolicy \
    --policy-document file://firehose-policy.json
```

```bash
# バックアップ用S3バケット作成
aws s3 mb s3://connectnow-firehose-backup-${AWS_ACCOUNT_ID}

# Firehose配信ストリーム作成（OpenSearch宛）
aws firehose create-delivery-stream \
    --delivery-stream-name connectnow-to-opensearch \
    --delivery-stream-type KinesisStreamAsSource \
    --kinesis-stream-source-configuration '{
        "KinesisStreamARN": "arn:aws:kinesis:ap-northeast-1:'${AWS_ACCOUNT_ID}':stream/connectnow-events",
        "RoleARN": "arn:aws:iam::'${AWS_ACCOUNT_ID}':role/ConnectNowFirehoseRole"
    }' \
    --amazon-opensearch-destination-configuration '{
        "RoleARN": "arn:aws:iam::'${AWS_ACCOUNT_ID}':role/ConnectNowFirehoseRole",
        "DomainARN": "arn:aws:es:ap-northeast-1:'${AWS_ACCOUNT_ID}':domain/connectnow-analytics",
        "IndexName": "events",
        "IndexRotationPeriod": "OneDay",
        "BufferingHints": {
            "IntervalInSeconds": 60,
            "SizeInMBs": 1
        },
        "RetryOptions": {
            "DurationInSeconds": 300
        },
        "S3BackupMode": "FailedDocumentsOnly",
        "S3Configuration": {
            "RoleARN": "arn:aws:iam::'${AWS_ACCOUNT_ID}':role/ConnectNowFirehoseRole",
            "BucketARN": "arn:aws:s3:::connectnow-firehose-backup-'${AWS_ACCOUNT_ID}'",
            "Prefix": "failed/",
            "BufferingHints": {
                "SizeInMBs": 5,
                "IntervalInSeconds": 300
            },
            "CompressionFormat": "GZIP"
        },
        "CloudWatchLoggingOptions": {
            "Enabled": true,
            "LogGroupName": "/aws/firehose/connectnow-to-opensearch",
            "LogStreamName": "DestinationDelivery"
        }
    }'
```

### Step 5: Lambda（リアルタイム処理）

```python
# lambda_stream_processor.py
# Kinesisストリームからのリアルタイム処理

import json
import boto3
import base64
from datetime import datetime
from decimal import Decimal
import os

dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')
cloudwatch = boto3.client('cloudwatch')

METRICS_TABLE = os.environ.get('METRICS_TABLE', 'connectnow-realtime-metrics')
ALERT_TOPIC_ARN = os.environ.get('ALERT_TOPIC_ARN')

# エラー検知のしきい値
ERROR_THRESHOLD = 100  # 1分間に100件以上のエラー
CRASH_THRESHOLD = 50   # 1分間に50件以上のクラッシュ

def lambda_handler(event, context):
    """Kinesisストリームからイベントを処理"""

    processed_count = 0
    error_count = 0
    crash_count = 0
    event_types = {}

    for record in event['Records']:
        try:
            # Base64デコード
            payload = base64.b64decode(record['kinesis']['data'])
            event_data = json.loads(payload)

            # イベント処理
            process_event(event_data)

            # カウント集計
            event_type = event_data.get('event_type', 'unknown')
            event_types[event_type] = event_types.get(event_type, 0) + 1

            if event_type == 'error':
                error_count += 1
            elif event_type == 'app_crash':
                crash_count += 1

            processed_count += 1

        except Exception as e:
            print(f"Error processing record: {str(e)}")

    # リアルタイムメトリクス更新
    update_realtime_metrics(event_types)

    # CloudWatchメトリクス送信
    put_custom_metrics(event_types, processed_count)

    # 異常検知
    if error_count >= ERROR_THRESHOLD:
        send_alert(f"High error rate detected: {error_count} errors in batch")

    if crash_count >= CRASH_THRESHOLD:
        send_alert(f"High crash rate detected: {crash_count} crashes in batch")

    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': processed_count,
            'event_types': event_types
        })
    }


def process_event(event_data):
    """個別イベントの処理"""
    event_type = event_data.get('event_type')

    # イベントタイプ別の処理
    if event_type == 'session_start':
        # セッション開始処理
        update_active_users(event_data['user_id'], 'add')

    elif event_type == 'session_end':
        # セッション終了処理
        update_active_users(event_data['user_id'], 'remove')

    elif event_type == 'purchase':
        # 購入イベント処理
        update_revenue_metrics(event_data)

    elif event_type == 'app_crash':
        # クラッシュ情報の詳細記録
        log_crash_details(event_data)


def update_realtime_metrics(event_types):
    """DynamoDBのリアルタイムメトリクス更新"""
    table = dynamodb.Table(METRICS_TABLE)
    timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M')

    for event_type, count in event_types.items():
        try:
            table.update_item(
                Key={
                    'metric_key': f"event_count#{event_type}",
                    'timestamp': timestamp
                },
                UpdateExpression='ADD event_count :count',
                ExpressionAttributeValues={
                    ':count': count
                }
            )
        except Exception as e:
            print(f"Error updating metrics: {str(e)}")


def update_active_users(user_id, action):
    """アクティブユーザーカウンター更新"""
    table = dynamodb.Table(METRICS_TABLE)
    today = datetime.utcnow().strftime('%Y-%m-%d')

    if action == 'add':
        table.update_item(
            Key={
                'metric_key': f"dau#{today}",
                'timestamp': today
            },
            UpdateExpression='ADD user_ids :user_id',
            ExpressionAttributeValues={
                ':user_id': {user_id}
            }
        )


def update_revenue_metrics(event_data):
    """売上メトリクス更新"""
    table = dynamodb.Table(METRICS_TABLE)
    today = datetime.utcnow().strftime('%Y-%m-%d')
    amount = Decimal(str(event_data.get('properties', {}).get('amount', 0)))

    table.update_item(
        Key={
            'metric_key': f"revenue#{today}",
            'timestamp': today
        },
        UpdateExpression='ADD total_amount :amount, transaction_count :one',
        ExpressionAttributeValues={
            ':amount': amount,
            ':one': 1
        }
    )


def log_crash_details(event_data):
    """クラッシュ詳細ログ"""
    print(json.dumps({
        'crash_event': True,
        'user_id': event_data.get('user_id'),
        'device': event_data.get('device'),
        'properties': event_data.get('properties'),
        'timestamp': event_data.get('timestamp')
    }))


def put_custom_metrics(event_types, total_count):
    """CloudWatchカスタムメトリクス送信"""
    metrics = []

    for event_type, count in event_types.items():
        metrics.append({
            'MetricName': 'EventCount',
            'Dimensions': [
                {'Name': 'EventType', 'Value': event_type}
            ],
            'Value': count,
            'Unit': 'Count'
        })

    metrics.append({
        'MetricName': 'TotalEventsProcessed',
        'Value': total_count,
        'Unit': 'Count'
    })

    cloudwatch.put_metric_data(
        Namespace='ConnectNow/Events',
        MetricData=metrics
    )


def send_alert(message):
    """アラート送信"""
    if ALERT_TOPIC_ARN:
        sns.publish(
            TopicArn=ALERT_TOPIC_ARN,
            Subject='ConnectNow Alert',
            Message=message
        )
    print(f"ALERT: {message}")
```

```bash
# DynamoDBテーブル作成
aws dynamodb create-table \
    --table-name connectnow-realtime-metrics \
    --attribute-definitions \
        AttributeName=metric_key,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
    --key-schema \
        AttributeName=metric_key,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

# Lambda関数デプロイ
zip lambda_stream_processor.zip lambda_stream_processor.py

aws lambda create-function \
    --function-name connectnow-stream-processor \
    --runtime python3.11 \
    --role arn:aws:iam::${AWS_ACCOUNT_ID}:role/LambdaKinesisRole \
    --handler lambda_stream_processor.lambda_handler \
    --zip-file fileb://lambda_stream_processor.zip \
    --timeout 60 \
    --memory-size 512 \
    --environment "Variables={METRICS_TABLE=connectnow-realtime-metrics,ALERT_TOPIC_ARN=arn:aws:sns:ap-northeast-1:${AWS_ACCOUNT_ID}:connectnow-alerts}"

# Kinesisイベントソースマッピング
aws lambda create-event-source-mapping \
    --function-name connectnow-stream-processor \
    --event-source-arn arn:aws:kinesis:ap-northeast-1:${AWS_ACCOUNT_ID}:stream/connectnow-events \
    --batch-size 100 \
    --starting-position LATEST \
    --parallelization-factor 2
```

### Step 6: Kinesis Data Analytics（ストリームSQL）

```sql
-- Kinesis Data Analytics SQL Application
-- 1分間のウィンドウ集計

-- 入力ストリーム定義
CREATE OR REPLACE STREAM "SOURCE_SQL_STREAM" (
    "event_id" VARCHAR(64),
    "event_type" VARCHAR(32),
    "timestamp" TIMESTAMP,
    "user_id" VARCHAR(64),
    "session_id" VARCHAR(64),
    "device_type" VARCHAR(16),
    "app_version" VARCHAR(16)
);

CREATE OR REPLACE PUMP "STREAM_PUMP" AS
    INSERT INTO "SOURCE_SQL_STREAM"
    SELECT STREAM
        "event_id",
        "event_type",
        TO_TIMESTAMP("timestamp") AS "timestamp",
        "user_id",
        "session_id",
        "device"."type" AS "device_type",
        "device"."app_version" AS "app_version"
    FROM "SOURCE_SQL_STREAM_001";

-- 1分間のイベントカウント集計
CREATE OR REPLACE STREAM "EVENT_COUNT_STREAM" (
    "window_start" TIMESTAMP,
    "event_type" VARCHAR(32),
    "event_count" INTEGER,
    "unique_users" INTEGER
);

CREATE OR REPLACE PUMP "EVENT_COUNT_PUMP" AS
    INSERT INTO "EVENT_COUNT_STREAM"
    SELECT STREAM
        FLOOR("SOURCE_SQL_STREAM".ROWTIME TO MINUTE) AS "window_start",
        "event_type",
        COUNT(*) AS "event_count",
        COUNT(DISTINCT "user_id") AS "unique_users"
    FROM "SOURCE_SQL_STREAM"
    GROUP BY
        FLOOR("SOURCE_SQL_STREAM".ROWTIME TO MINUTE),
        "event_type";

-- デバイス別集計
CREATE OR REPLACE STREAM "DEVICE_STATS_STREAM" (
    "window_start" TIMESTAMP,
    "device_type" VARCHAR(16),
    "app_version" VARCHAR(16),
    "event_count" INTEGER,
    "unique_sessions" INTEGER
);

CREATE OR REPLACE PUMP "DEVICE_STATS_PUMP" AS
    INSERT INTO "DEVICE_STATS_STREAM"
    SELECT STREAM
        FLOOR("SOURCE_SQL_STREAM".ROWTIME TO MINUTE) AS "window_start",
        "device_type",
        "app_version",
        COUNT(*) AS "event_count",
        COUNT(DISTINCT "session_id") AS "unique_sessions"
    FROM "SOURCE_SQL_STREAM"
    GROUP BY
        FLOOR("SOURCE_SQL_STREAM".ROWTIME TO MINUTE),
        "device_type",
        "app_version";

-- エラー率計算（異常検知用）
CREATE OR REPLACE STREAM "ERROR_RATE_STREAM" (
    "window_start" TIMESTAMP,
    "total_events" INTEGER,
    "error_events" INTEGER,
    "error_rate" DOUBLE
);

CREATE OR REPLACE PUMP "ERROR_RATE_PUMP" AS
    INSERT INTO "ERROR_RATE_STREAM"
    SELECT STREAM
        FLOOR("SOURCE_SQL_STREAM".ROWTIME TO MINUTE) AS "window_start",
        COUNT(*) AS "total_events",
        SUM(CASE WHEN "event_type" IN ('error', 'app_crash') THEN 1 ELSE 0 END) AS "error_events",
        (CAST(SUM(CASE WHEN "event_type" IN ('error', 'app_crash') THEN 1 ELSE 0 END) AS DOUBLE)
         / CAST(COUNT(*) AS DOUBLE)) * 100 AS "error_rate"
    FROM "SOURCE_SQL_STREAM"
    GROUP BY
        FLOOR("SOURCE_SQL_STREAM".ROWTIME TO MINUTE);

-- 異常検知アラート（エラー率5%超過）
CREATE OR REPLACE STREAM "ALERT_STREAM" (
    "alert_time" TIMESTAMP,
    "alert_type" VARCHAR(32),
    "message" VARCHAR(256),
    "error_rate" DOUBLE
);

CREATE OR REPLACE PUMP "ALERT_PUMP" AS
    INSERT INTO "ALERT_STREAM"
    SELECT STREAM
        "window_start" AS "alert_time",
        'HIGH_ERROR_RATE' AS "alert_type",
        'Error rate exceeded 5%' AS "message",
        "error_rate"
    FROM "ERROR_RATE_STREAM"
    WHERE "error_rate" > 5.0;
```

### Step 7: OpenSearch Dashboards設定

```json
// ダッシュボード用クエリ例

// 1. リアルタイムイベントカウント（過去1時間）
{
  "query": {
    "range": {
      "timestamp": {
        "gte": "now-1h",
        "lte": "now"
      }
    }
  },
  "aggs": {
    "events_over_time": {
      "date_histogram": {
        "field": "timestamp",
        "fixed_interval": "1m"
      },
      "aggs": {
        "by_type": {
          "terms": {
            "field": "event_type"
          }
        }
      }
    }
  }
}

// 2. デバイス別アクティブユーザー
{
  "query": {
    "range": {
      "timestamp": {
        "gte": "now-24h"
      }
    }
  },
  "aggs": {
    "by_device": {
      "terms": {
        "field": "device.type"
      },
      "aggs": {
        "unique_users": {
          "cardinality": {
            "field": "user_id"
          }
        }
      }
    }
  }
}

// 3. エラー分析
{
  "query": {
    "bool": {
      "must": [
        {
          "terms": {
            "event_type": ["error", "app_crash"]
          }
        },
        {
          "range": {
            "timestamp": {
              "gte": "now-1h"
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "by_device_model": {
      "terms": {
        "field": "device.device_model"
      }
    },
    "by_app_version": {
      "terms": {
        "field": "device.app_version"
      }
    }
  }
}

// 4. 地域別アクティビティ（位置情報）
{
  "query": {
    "range": {
      "timestamp": {
        "gte": "now-1h"
      }
    }
  },
  "aggs": {
    "map_data": {
      "geohash_grid": {
        "field": "location",
        "precision": 5
      }
    }
  }
}
```

### Step 8: アラート設定

```bash
# SNSトピック作成
aws sns create-topic --name connectnow-alerts
aws sns subscribe \
    --topic-arn arn:aws:sns:ap-northeast-1:${AWS_ACCOUNT_ID}:connectnow-alerts \
    --protocol email \
    --notification-endpoint your-email@example.com

# CloudWatchアラーム設定
# エラー率アラーム
aws cloudwatch put-metric-alarm \
    --alarm-name connectnow-high-error-rate \
    --alarm-description "High error rate detected" \
    --metric-name EventCount \
    --namespace ConnectNow/Events \
    --statistic Sum \
    --period 60 \
    --threshold 100 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=EventType,Value=error \
    --evaluation-periods 3 \
    --alarm-actions arn:aws:sns:ap-northeast-1:${AWS_ACCOUNT_ID}:connectnow-alerts

# Iterator Age アラーム（処理遅延検知）
aws cloudwatch put-metric-alarm \
    --alarm-name connectnow-kinesis-lag \
    --alarm-description "Kinesis processing lag detected" \
    --metric-name GetRecords.IteratorAgeMilliseconds \
    --namespace AWS/Kinesis \
    --statistic Maximum \
    --period 60 \
    --threshold 60000 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=StreamName,Value=connectnow-events \
    --evaluation-periods 3 \
    --alarm-actions arn:aws:sns:ap-northeast-1:${AWS_ACCOUNT_ID}:connectnow-alerts
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
