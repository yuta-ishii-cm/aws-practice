# 課題27: 旅行予約サイトのサーバーレスAPI基盤

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級 |
| カテゴリ | マイクロサービス・API |
| 処理形態 | サーバーレスAPI |
| 使用するIaCツール | SAM (Serverless Application Model) |
| 想定所要時間 | 4-5時間 |

---

## 2. シナリオ

### 企業プロフィール
**TravelHub株式会社**は、ホテルと航空券を組み合わせたパッケージ旅行の予約サービスを提供しています。日次約10万リクエストを処理し、ゴールデンウィークや年末年始にはピーク時5倍のトラフィックが発生します。

### 現状の課題
既存のモノリシックなAPIサーバーでは、ピーク時の対応に問題が発生しています：

1. **スケーリングの遅延**：EC2のオートスケーリングに5-10分かかる
2. **コスト非効率**：通常時もピーク対応用のキャパシティを維持
3. **検索のレイテンシ**：複数の外部APIを順次呼び出しており、応答が遅い
4. **キャッシュ効率の悪さ**：同一検索が繰り返されているが、毎回外部APIを叩いている

### 数値で見る問題
- 通常時リクエスト数：**10万件/日**（平均 1.2 req/sec）
- ピーク時リクエスト数：**50万件/日**（平均 6 req/sec、瞬間最大 50 req/sec）
- 検索API応答時間：**平均 3秒**（外部API呼び出し含む）
- インフラコスト：**月額 $3,000**（常時稼働EC2）
- ピーク時のエラー率：**5%**

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 検索API応答時間 | 3秒 | 1秒以内 |
| ピーク時エラー率 | 5% | 0.1%以下 |
| インフラコスト | $3,000/月 | $1,000/月 |
| スケーリング時間 | 5-10分 | 即時 |

---

## 3. 学習目標

### 主要な学習成果
1. API GatewayとLambdaによるサーバーレスAPI構築
2. DynamoDBを使った高速な検索結果キャッシュ
3. 非同期処理による外部API呼び出しの並列化
4. SAMを使ったサーバーレスアプリケーションのIaC

### 習得するスキル
- API Gateway REST APIの設計とセットアップ
- Lambda関数の最適化（コールドスタート対策、メモリ設定）
- DynamoDB の設計パターン（GSI、TTL）
- SAM テンプレートの記述方法

---

## 4. 使用するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| API Gateway | REST API エンドポイント | 高 |
| Lambda | ビジネスロジック実行 | 高 |
| DynamoDB | 検索結果キャッシュ、予約データ | 高 |
| ElastiCache (Redis) | セッション管理 | 中 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| CloudWatch | ログ・メトリクス |
| X-Ray | 分散トレーシング |
| Secrets Manager | API キー管理 |
| WAF | API 保護 |
| CloudFront | API キャッシング |

---

## 5. 前提条件

### 必要な知識
- REST APIの基本概念
- Python または Node.js の基礎
- DynamoDBの基本操作

### 事前準備
1. AWSアカウント
2. AWS CLI v2
3. AWS SAM CLI
4. Python 3.11 または Node.js 18.x

### 環境要件
```bash
# SAM CLIインストール
pip install aws-sam-cli

# バージョン確認
sam --version  # 1.90.0以上
```

---

## 6. アーキテクチャ概要

### システム構成図
```
                    ┌─────────────────────────────────────────────────────────┐
                    │                      CloudFront                          │
                    │              (API Caching & WAF)                         │
                    └────────────────────────┬────────────────────────────────┘
                                             │
                                             ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │                    API Gateway                           │
                    │                                                          │
                    │  /hotels/search    /flights/search    /bookings         │
                    │  /hotels/{id}      /flights/{id}      /bookings/{id}    │
                    └──────────┬─────────────────┬──────────────┬─────────────┘
                               │                 │              │
           ┌───────────────────┼─────────────────┼──────────────┼───────────────┐
           │                   │                 │              │               │
           ▼                   ▼                 ▼              ▼               │
    ┌─────────────┐    ┌─────────────┐  ┌─────────────┐ ┌─────────────┐       │
    │   Lambda    │    │   Lambda    │  │   Lambda    │ │   Lambda    │       │
    │HotelSearch  │    │FlightSearch │  │CreateBooking│ │ GetBooking  │       │
    └──────┬──────┘    └──────┬──────┘  └──────┬──────┘ └──────┬──────┘       │
           │                  │                │               │               │
           │    ┌─────────────┴────────────────┴───────────────┤               │
           │    │                                              │               │
           ▼    ▼                                              ▼               │
    ┌─────────────────┐                                ┌─────────────┐         │
    │   DynamoDB      │                                │  DynamoDB   │         │
    │  SearchCache    │                                │  Bookings   │         │
    │  (TTL: 5min)    │                                │             │         │
    └────────┬────────┘                                └─────────────┘         │
             │                                                                  │
             │ Cache Miss                                                       │
             ▼                                                                  │
    ┌─────────────────────────────────────────┐                                │
    │            External APIs                 │                                │
    │  ┌──────────────┐  ┌──────────────┐    │                                │
    │  │ Hotel API    │  │ Airline API  │    │                                │
    │  │ (Partner)    │  │ (Partner)    │    │                                │
    │  └──────────────┘  └──────────────┘    │                                │
    └─────────────────────────────────────────┘                                │
                                                                               │
    ┌──────────────────────────────────────────────────────────────────────────┘
    │
    │  Async Processing (Booking Confirmation)
    ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                           SQS Queue                                      │
    │                    (BookingConfirmation)                                │
    └───────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │        Lambda           │
                    │   ProcessConfirmation   │
                    └───────────────┬─────────┘
                                    │
                                    ▼
                           ┌───────────────┐
                           │     SES       │
                           │ (Email Send)  │
                           └───────────────┘
```

### API エンドポイント設計

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /hotels/search | ホテル検索 |
| GET | /hotels/{hotelId} | ホテル詳細取得 |
| GET | /flights/search | フライト検索 |
| GET | /flights/{flightId} | フライト詳細取得 |
| POST | /bookings | 予約作成 |
| GET | /bookings/{bookingId} | 予約詳細取得 |
| DELETE | /bookings/{bookingId} | 予約キャンセル |

---

## 7. ハンズオン手順

### Phase 1: SAMプロジェクトの初期化（30分）

#### Step 1-1: プロジェクト構造

```bash
mkdir travelhub-api && cd travelhub-api

# ディレクトリ構造
travelhub-api/
├── template.yaml           # SAMテンプレート
├── samconfig.toml          # SAM設定
├── src/
│   ├── handlers/
│   │   ├── hotels/
│   │   │   ├── search.py
│   │   │   └── detail.py
│   │   ├── flights/
│   │   │   ├── search.py
│   │   │   └── detail.py
│   │   └── bookings/
│   │       ├── create.py
│   │       ├── get.py
│   │       └── cancel.py
│   ├── services/
│   │   ├── cache_service.py
│   │   ├── hotel_api.py
│   │   └── flight_api.py
│   └── utils/
│       ├── response.py
│       └── validators.py
├── tests/
│   ├── unit/
│   └── integration/
└── requirements.txt
```

#### Step 1-2: SAMテンプレート

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: TravelHub Serverless API

Globals:
  Function:
    Timeout: 30
    Runtime: python3.11
    MemorySize: 256
    Tracing: Active
    Environment:
      Variables:
        LOG_LEVEL: INFO
        SEARCH_CACHE_TABLE: !Ref SearchCacheTable
        BOOKINGS_TABLE: !Ref BookingsTable
        POWERTOOLS_SERVICE_NAME: travelhub-api

  Api:
    TracingEnabled: true
    Cors:
      AllowOrigin: "'*'"
      AllowHeaders: "'Content-Type,Authorization'"
      AllowMethods: "'GET,POST,DELETE,OPTIONS'"

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues:
      - dev
      - stg
      - prod

Resources:
  # API Gateway
  TravelHubApi:
    Type: AWS::Serverless::Api
    Properties:
      Name: !Sub travelhub-api-${Environment}
      StageName: !Ref Environment
      EndpointConfiguration:
        Type: REGIONAL
      MethodSettings:
        - ResourcePath: '/*'
          HttpMethod: '*'
          ThrottlingBurstLimit: 1000
          ThrottlingRateLimit: 500

  # DynamoDB Tables
  SearchCacheTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub travelhub-search-cache-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: pk
          AttributeType: S
        - AttributeName: sk
          AttributeType: S
      KeySchema:
        - AttributeName: pk
          KeyType: HASH
        - AttributeName: sk
          KeyType: RANGE
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true
      Tags:
        - Key: Environment
          Value: !Ref Environment

  BookingsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub travelhub-bookings-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: pk
          AttributeType: S
        - AttributeName: sk
          AttributeType: S
        - AttributeName: gsi1pk
          AttributeType: S
        - AttributeName: gsi1sk
          AttributeType: S
      KeySchema:
        - AttributeName: pk
          KeyType: HASH
        - AttributeName: sk
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: gsi1
          KeySchema:
            - AttributeName: gsi1pk
              KeyType: HASH
            - AttributeName: gsi1sk
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES
      Tags:
        - Key: Environment
          Value: !Ref Environment

  # Lambda Functions - Hotels
  HotelSearchFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub travelhub-hotel-search-${Environment}
      Handler: src/handlers/hotels/search.handler
      Description: Search hotels
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref SearchCacheTable
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource: !Sub arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:travelhub/${Environment}/*
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref TravelHubApi
            Path: /hotels/search
            Method: GET

  HotelDetailFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub travelhub-hotel-detail-${Environment}
      Handler: src/handlers/hotels/detail.handler
      Description: Get hotel details
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref SearchCacheTable
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref TravelHubApi
            Path: /hotels/{hotelId}
            Method: GET

  # Lambda Functions - Flights
  FlightSearchFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub travelhub-flight-search-${Environment}
      Handler: src/handlers/flights/search.handler
      Description: Search flights
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref SearchCacheTable
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref TravelHubApi
            Path: /flights/search
            Method: GET

  FlightDetailFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub travelhub-flight-detail-${Environment}
      Handler: src/handlers/flights/detail.handler
      Description: Get flight details
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref SearchCacheTable
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref TravelHubApi
            Path: /flights/{flightId}
            Method: GET

  # Lambda Functions - Bookings
  CreateBookingFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub travelhub-create-booking-${Environment}
      Handler: src/handlers/bookings/create.handler
      Description: Create a booking
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref BookingsTable
        - SQSSendMessagePolicy:
            QueueName: !GetAtt BookingConfirmationQueue.QueueName
      Environment:
        Variables:
          CONFIRMATION_QUEUE_URL: !Ref BookingConfirmationQueue
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref TravelHubApi
            Path: /bookings
            Method: POST

  GetBookingFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub travelhub-get-booking-${Environment}
      Handler: src/handlers/bookings/get.handler
      Description: Get booking details
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref BookingsTable
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref TravelHubApi
            Path: /bookings/{bookingId}
            Method: GET

  CancelBookingFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub travelhub-cancel-booking-${Environment}
      Handler: src/handlers/bookings/cancel.handler
      Description: Cancel a booking
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref BookingsTable
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref TravelHubApi
            Path: /bookings/{bookingId}
            Method: DELETE

  # Async Processing
  BookingConfirmationQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub travelhub-booking-confirmation-${Environment}
      VisibilityTimeout: 60
      MessageRetentionPeriod: 86400
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt BookingDLQ.Arn
        maxReceiveCount: 3

  BookingDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub travelhub-booking-dlq-${Environment}
      MessageRetentionPeriod: 1209600

  ProcessConfirmationFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub travelhub-process-confirmation-${Environment}
      Handler: src/handlers/bookings/confirmation.handler
      Description: Process booking confirmation
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref BookingsTable
        - SESCrudPolicy:
            IdentityName: '*'
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt BookingConfirmationQueue.Arn
            BatchSize: 10

Outputs:
  ApiEndpoint:
    Description: API Gateway endpoint URL
    Value: !Sub https://${TravelHubApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}

  SearchCacheTableName:
    Description: Search Cache DynamoDB Table
    Value: !Ref SearchCacheTable

  BookingsTableName:
    Description: Bookings DynamoDB Table
    Value: !Ref BookingsTable
```

### Phase 2: Lambda関数の実装（60分）

#### Step 2-1: ホテル検索関数

```python
# src/handlers/hotels/search.py
import json
import hashlib
import os
import time
from datetime import datetime, timedelta
import boto3
from botocore.exceptions import ClientError
import asyncio
import aiohttp
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.metrics import MetricUnit

logger = Logger()
tracer = Tracer()
metrics = Metrics()

dynamodb = boto3.resource('dynamodb')
cache_table = dynamodb.Table(os.environ['SEARCH_CACHE_TABLE'])
secrets_client = boto3.client('secretsmanager')

CACHE_TTL_SECONDS = 300  # 5分

@logger.inject_lambda_context
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def handler(event: dict, context: LambdaContext) -> dict:
    """ホテル検索ハンドラー"""
    try:
        # クエリパラメータの取得
        params = event.get('queryStringParameters') or {}
        destination = params.get('destination')
        check_in = params.get('checkIn')
        check_out = params.get('checkOut')
        guests = params.get('guests', '2')

        # バリデーション
        if not all([destination, check_in, check_out]):
            return _error_response(400, 'Missing required parameters: destination, checkIn, checkOut')

        # キャッシュキーの生成
        cache_key = _generate_cache_key(destination, check_in, check_out, guests)

        # キャッシュをチェック
        cached_result = _get_from_cache(cache_key)
        if cached_result:
            metrics.add_metric(name="CacheHit", unit=MetricUnit.Count, value=1)
            logger.info("Cache hit", extra={"cache_key": cache_key})
            return _success_response(cached_result)

        metrics.add_metric(name="CacheMiss", unit=MetricUnit.Count, value=1)

        # 外部APIを呼び出し（並列実行）
        hotels = asyncio.get_event_loop().run_until_complete(
            _search_hotels_parallel(destination, check_in, check_out, guests)
        )

        # キャッシュに保存
        _save_to_cache(cache_key, hotels)

        metrics.add_metric(name="SearchSuccess", unit=MetricUnit.Count, value=1)

        return _success_response({
            'hotels': hotels,
            'total': len(hotels),
            'cached': False
        })

    except Exception as e:
        logger.exception("Search failed")
        metrics.add_metric(name="SearchError", unit=MetricUnit.Count, value=1)
        return _error_response(500, str(e))


def _generate_cache_key(destination: str, check_in: str, check_out: str, guests: str) -> str:
    """キャッシュキーを生成"""
    raw_key = f"{destination}:{check_in}:{check_out}:{guests}"
    return hashlib.sha256(raw_key.encode()).hexdigest()[:16]


@tracer.capture_method
def _get_from_cache(cache_key: str) -> dict | None:
    """キャッシュから取得"""
    try:
        response = cache_table.get_item(
            Key={
                'pk': f'HOTEL_SEARCH#{cache_key}',
                'sk': 'RESULT'
            }
        )
        item = response.get('Item')
        if item and item.get('ttl', 0) > int(time.time()):
            return item.get('data')
        return None
    except ClientError as e:
        logger.warning(f"Cache read error: {e}")
        return None


@tracer.capture_method
def _save_to_cache(cache_key: str, data: list) -> None:
    """キャッシュに保存"""
    try:
        cache_table.put_item(
            Item={
                'pk': f'HOTEL_SEARCH#{cache_key}',
                'sk': 'RESULT',
                'data': {
                    'hotels': data,
                    'total': len(data),
                    'cached': True,
                    'cachedAt': datetime.utcnow().isoformat()
                },
                'ttl': int(time.time()) + CACHE_TTL_SECONDS
            }
        )
    except ClientError as e:
        logger.warning(f"Cache write error: {e}")


async def _search_hotels_parallel(destination: str, check_in: str, check_out: str, guests: str) -> list:
    """複数のホテルAPIを並列で検索"""
    async with aiohttp.ClientSession() as session:
        # 複数のパートナーAPIを並列呼び出し
        tasks = [
            _call_partner_api(session, 'partner_a', destination, check_in, check_out, guests),
            _call_partner_api(session, 'partner_b', destination, check_in, check_out, guests),
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 結果をマージ
        hotels = []
        for result in results:
            if isinstance(result, list):
                hotels.extend(result)
            elif isinstance(result, Exception):
                logger.warning(f"Partner API error: {result}")

        # 価格でソート
        hotels.sort(key=lambda x: x.get('price', float('inf')))

        return hotels


async def _call_partner_api(session: aiohttp.ClientSession, partner: str, destination: str,
                            check_in: str, check_out: str, guests: str) -> list:
    """パートナーAPIを呼び出し"""
    # 実際の実装では、Secrets Managerから認証情報を取得
    # ここではモックデータを返す
    await asyncio.sleep(0.5)  # API呼び出しをシミュレート

    return [
        {
            'id': f'{partner}-hotel-001',
            'name': f'Sample Hotel ({partner})',
            'destination': destination,
            'price': 15000 + hash(partner) % 5000,
            'rating': 4.2,
            'amenities': ['WiFi', 'Breakfast', 'Pool'],
            'partner': partner
        }
    ]


def _success_response(data: dict) -> dict:
    """成功レスポンスを生成"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data, ensure_ascii=False, default=str)
    }


def _error_response(status_code: int, message: str) -> dict:
    """エラーレスポンスを生成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': message}, ensure_ascii=False)
    }
```

#### Step 2-2: 予約作成関数

```python
# src/handlers/bookings/create.py
import json
import os
import uuid
from datetime import datetime
import boto3
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.validation import validate
from aws_lambda_powertools.utilities.validation.exceptions import SchemaValidationError
from aws_lambda_powertools.metrics import MetricUnit

logger = Logger()
tracer = Tracer()
metrics = Metrics()

dynamodb = boto3.resource('dynamodb')
bookings_table = dynamodb.Table(os.environ['BOOKINGS_TABLE'])
sqs = boto3.client('sqs')
CONFIRMATION_QUEUE_URL = os.environ['CONFIRMATION_QUEUE_URL']

# バリデーションスキーマ
BOOKING_SCHEMA = {
    "type": "object",
    "required": ["userId", "hotelId", "checkIn", "checkOut", "guests", "totalPrice"],
    "properties": {
        "userId": {"type": "string", "minLength": 1},
        "hotelId": {"type": "string", "minLength": 1},
        "flightId": {"type": "string"},
        "checkIn": {"type": "string", "format": "date"},
        "checkOut": {"type": "string", "format": "date"},
        "guests": {"type": "integer", "minimum": 1, "maximum": 10},
        "totalPrice": {"type": "number", "minimum": 0},
        "contactEmail": {"type": "string", "format": "email"},
        "contactPhone": {"type": "string"},
        "specialRequests": {"type": "string"}
    }
}


@logger.inject_lambda_context
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def handler(event: dict, context: LambdaContext) -> dict:
    """予約作成ハンドラー"""
    try:
        # リクエストボディのパース
        body = json.loads(event.get('body', '{}'))

        # バリデーション
        try:
            validate(event=body, schema=BOOKING_SCHEMA)
        except SchemaValidationError as e:
            return _error_response(400, f'Validation error: {str(e)}')

        # 予約IDの生成
        booking_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()

        # 予約データの作成
        booking = {
            'pk': f"BOOKING#{booking_id}",
            'sk': 'METADATA',
            'gsi1pk': f"USER#{body['userId']}",
            'gsi1sk': f"BOOKING#{timestamp}",
            'bookingId': booking_id,
            'userId': body['userId'],
            'hotelId': body['hotelId'],
            'flightId': body.get('flightId'),
            'checkIn': body['checkIn'],
            'checkOut': body['checkOut'],
            'guests': body['guests'],
            'totalPrice': body['totalPrice'],
            'contactEmail': body.get('contactEmail'),
            'contactPhone': body.get('contactPhone'),
            'specialRequests': body.get('specialRequests'),
            'status': 'PENDING',
            'createdAt': timestamp,
            'updatedAt': timestamp
        }

        # DynamoDBに保存
        _save_booking(booking)

        # 確認メール送信をキューに投入
        _queue_confirmation(booking)

        metrics.add_metric(name="BookingCreated", unit=MetricUnit.Count, value=1)
        metrics.add_metric(name="BookingValue", unit=MetricUnit.Count, value=int(body['totalPrice']))

        logger.info("Booking created", extra={"booking_id": booking_id, "user_id": body['userId']})

        return _success_response({
            'bookingId': booking_id,
            'status': 'PENDING',
            'message': 'Booking created successfully. Confirmation email will be sent shortly.'
        }, status_code=201)

    except json.JSONDecodeError:
        return _error_response(400, 'Invalid JSON in request body')
    except Exception as e:
        logger.exception("Booking creation failed")
        metrics.add_metric(name="BookingError", unit=MetricUnit.Count, value=1)
        return _error_response(500, str(e))


@tracer.capture_method
def _save_booking(booking: dict) -> None:
    """予約をDynamoDBに保存"""
    try:
        bookings_table.put_item(
            Item=booking,
            ConditionExpression='attribute_not_exists(pk)'
        )
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            raise ValueError('Booking already exists')
        raise


@tracer.capture_method
def _queue_confirmation(booking: dict) -> None:
    """確認メール送信をキューに投入"""
    message = {
        'bookingId': booking['bookingId'],
        'userId': booking['userId'],
        'email': booking.get('contactEmail'),
        'hotelId': booking['hotelId'],
        'checkIn': booking['checkIn'],
        'checkOut': booking['checkOut'],
        'totalPrice': booking['totalPrice']
    }

    sqs.send_message(
        QueueUrl=CONFIRMATION_QUEUE_URL,
        MessageBody=json.dumps(message),
        MessageGroupId=booking['userId'] if '.fifo' in CONFIRMATION_QUEUE_URL else None
    )


def _success_response(data: dict, status_code: int = 200) -> dict:
    """成功レスポンスを生成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data, ensure_ascii=False)
    }


def _error_response(status_code: int, message: str) -> dict:
    """エラーレスポンスを生成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': message}, ensure_ascii=False)
    }
```

### Phase 3: キャッシュ戦略の実装（40分）

#### Step 3-1: キャッシュサービス

```python
# src/services/cache_service.py
import hashlib
import json
import time
from typing import Any, Optional
import boto3
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger

logger = Logger()


class CacheService:
    """DynamoDBベースのキャッシュサービス"""

    def __init__(self, table_name: str, default_ttl: int = 300):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
        self.default_ttl = default_ttl

    def generate_key(self, prefix: str, *args: str) -> str:
        """キャッシュキーを生成"""
        raw_key = ':'.join(str(arg) for arg in args)
        hash_key = hashlib.sha256(raw_key.encode()).hexdigest()[:16]
        return f"{prefix}#{hash_key}"

    def get(self, pk: str, sk: str = 'RESULT') -> Optional[Any]:
        """キャッシュから取得"""
        try:
            response = self.table.get_item(
                Key={'pk': pk, 'sk': sk},
                ConsistentRead=False
            )
            item = response.get('Item')

            if item is None:
                return None

            # TTLチェック
            if item.get('ttl', 0) <= int(time.time()):
                logger.debug("Cache expired", extra={"pk": pk})
                return None

            return item.get('data')

        except ClientError as e:
            logger.warning(f"Cache get error: {e}")
            return None

    def set(self, pk: str, data: Any, ttl: Optional[int] = None, sk: str = 'RESULT') -> bool:
        """キャッシュに保存"""
        try:
            ttl_value = ttl or self.default_ttl
            self.table.put_item(
                Item={
                    'pk': pk,
                    'sk': sk,
                    'data': data,
                    'ttl': int(time.time()) + ttl_value,
                    'createdAt': int(time.time())
                }
            )
            return True
        except ClientError as e:
            logger.warning(f"Cache set error: {e}")
            return False

    def delete(self, pk: str, sk: str = 'RESULT') -> bool:
        """キャッシュから削除"""
        try:
            self.table.delete_item(
                Key={'pk': pk, 'sk': sk}
            )
            return True
        except ClientError as e:
            logger.warning(f"Cache delete error: {e}")
            return False

    def get_or_set(self, pk: str, fetch_func: callable, ttl: Optional[int] = None) -> Any:
        """キャッシュから取得、なければ関数を実行して保存"""
        # まずキャッシュを確認
        cached = self.get(pk)
        if cached is not None:
            return cached

        # キャッシュミス：データを取得
        data = fetch_func()

        # キャッシュに保存
        self.set(pk, data, ttl)

        return data
```

### Phase 4: API Gateway設定とセキュリティ（40分）

#### Step 4-1: API Gatewayの追加設定

```yaml
# template.yaml に追加

Resources:
  # ... 既存のリソース ...

  # API Usage Plan
  ApiUsagePlan:
    Type: AWS::ApiGateway::UsagePlan
    Properties:
      UsagePlanName: !Sub travelhub-usage-plan-${Environment}
      Description: Usage plan for TravelHub API
      ApiStages:
        - ApiId: !Ref TravelHubApi
          Stage: !Ref Environment
      Throttle:
        BurstLimit: 1000
        RateLimit: 500
      Quota:
        Limit: 100000
        Period: DAY

  # API Key
  ApiKey:
    Type: AWS::ApiGateway::ApiKey
    Properties:
      Name: !Sub travelhub-api-key-${Environment}
      Description: API Key for TravelHub
      Enabled: true
      StageKeys:
        - RestApiId: !Ref TravelHubApi
          StageName: !Ref Environment

  # API Key to Usage Plan
  ApiKeyUsagePlan:
    Type: AWS::ApiGateway::UsagePlanKey
    Properties:
      KeyId: !Ref ApiKey
      KeyType: API_KEY
      UsagePlanId: !Ref ApiUsagePlan

  # WAF WebACL
  ApiWafWebAcl:
    Type: AWS::WAFv2::WebACL
    Properties:
      Name: !Sub travelhub-api-waf-${Environment}
      Scope: REGIONAL
      DefaultAction:
        Allow: {}
      VisibilityConfig:
        SampledRequestsEnabled: true
        CloudWatchMetricsEnabled: true
        MetricName: !Sub travelhub-api-waf-${Environment}
      Rules:
        - Name: RateLimitRule
          Priority: 1
          Action:
            Block: {}
          Statement:
            RateBasedStatement:
              Limit: 2000
              AggregateKeyType: IP
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: RateLimitRule
        - Name: AWSManagedRulesCommonRuleSet
          Priority: 2
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesCommonRuleSet
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: AWSManagedRulesCommonRuleSet
        - Name: AWSManagedRulesKnownBadInputsRuleSet
          Priority: 3
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesKnownBadInputsRuleSet
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: AWSManagedRulesKnownBadInputsRuleSet

  # WAF Association
  ApiWafAssociation:
    Type: AWS::WAFv2::WebACLAssociation
    Properties:
      ResourceArn: !Sub arn:aws:apigateway:${AWS::Region}::/restapis/${TravelHubApi}/stages/${Environment}
      WebACLArn: !GetAtt ApiWafWebAcl.Arn

  # CloudWatch Alarms
  ApiLatencyAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub travelhub-api-latency-${Environment}
      AlarmDescription: API Gateway latency alarm
      MetricName: Latency
      Namespace: AWS/ApiGateway
      Dimensions:
        - Name: ApiName
          Value: !Sub travelhub-api-${Environment}
      Statistic: p99
      Period: 60
      EvaluationPeriods: 3
      Threshold: 3000
      ComparisonOperator: GreaterThanThreshold

  Api5xxErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub travelhub-api-5xx-${Environment}
      AlarmDescription: API Gateway 5XX errors alarm
      MetricName: 5XXError
      Namespace: AWS/ApiGateway
      Dimensions:
        - Name: ApiName
          Value: !Sub travelhub-api-${Environment}
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
```

### Phase 5: デプロイとテスト（30分）

#### Step 5-1: SAM CLI でのデプロイ

```bash
# ビルド
sam build

# ローカルでの動作確認
sam local start-api

# デプロイ（初回）
sam deploy --guided

# デプロイ（2回目以降）
sam deploy

# スタックの削除
sam delete
```

#### Step 5-2: APIテスト

```bash
# API エンドポイントを取得
API_URL=$(aws cloudformation describe-stacks \
  --stack-name travelhub-api \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

# ホテル検索
curl -X GET "${API_URL}/hotels/search?destination=Tokyo&checkIn=2024-03-01&checkOut=2024-03-03&guests=2"

# 予約作成
curl -X POST "${API_URL}/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "hotelId": "hotel-001",
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-03",
    "guests": 2,
    "totalPrice": 30000,
    "contactEmail": "test@example.com"
  }'

# 予約詳細取得
curl -X GET "${API_URL}/bookings/BOOKING_ID"
```

---

## 8. トラブルシューティング課題

### Challenge 1: Lambda コールドスタートが遅い
**状況**: 初回リクエストで3秒以上のレイテンシが発生

**調査ポイント**:
1. CloudWatch Logs で Init Duration を確認
2. Lambda のメモリサイズを確認
3. 依存パッケージのサイズを確認

**解決策**:
```yaml
# Provisioned Concurrency の設定
HotelSearchFunction:
  Type: AWS::Serverless::Function
  Properties:
    # ... 既存の設定 ...
    ProvisionedConcurrencyConfig:
      ProvisionedConcurrentExecutions: 5
```

### Challenge 2: DynamoDB の読み取り容量超過
**状況**: ピーク時に `ProvisionedThroughputExceededException` が発生

**調査ポイント**:
1. CloudWatch で ConsumedReadCapacityUnits を確認
2. ホットパーティションの有無を確認
3. キャッシュヒット率を確認

### Challenge 3: 外部API呼び出しタイムアウト
**状況**: パートナーAPIの応答が遅く、Lambdaがタイムアウト

**調査ポイント**:
1. X-Ray でボトルネックを特定
2. 各外部APIの応答時間を確認
3. 並列呼び出しが正しく動作しているか確認

---

## 9. 設計考慮ポイント

### ディスカッション1: キャッシュ戦略
**テーマ**: TTL設定とキャッシュ無効化

| パターン | メリット | デメリット |
|----------|----------|------------|
| 短いTTL（1-5分） | 鮮度が高い | キャッシュヒット率低下 |
| 長いTTL（30分以上） | ヒット率向上 | 古いデータを返すリスク |
| 明示的無効化 | 精度が高い | 実装が複雑 |

### ディスカッション2: API Gateway vs ALB + Lambda
**テーマ**: エントリーポイントの選択

| 観点 | API Gateway | ALB + Lambda |
|------|-------------|--------------|
| コスト（高トラフィック） | 高い | 安い |
| 機能 | 豊富（認証、スロットリング等） | 基本的 |
| WebSocket | 対応 | 非対応 |

### ディスカッション3: 同期 vs 非同期処理
**テーマ**: 予約確定処理のパターン

**選択肢**:
1. **完全同期**: 予約→決済→確認メールを1リクエストで
2. **部分非同期**: 予約→決済は同期、確認メールは非同期
3. **Saga パターン**: 全処理を非同期で、補償トランザクション

---

## 10. 発展課題

### Advanced 1: GraphQL API への移行
**課題**: AppSync を使って GraphQL API を構築し、クライアントが必要なデータのみを取得

### Advanced 2: リアルタイム価格更新
**課題**: WebSocket API と DynamoDB Streams を使って、価格変動をリアルタイムにクライアントへプッシュ

### Advanced 3: マルチリージョン対応
**課題**: Route 53 ヘルスチェックと DynamoDB Global Tables を使った災害対策

---

## 11. コスト見積もり

### 月額コスト概算

| サービス | 使用量 | 月額コスト |
|----------|--------|------------|
| API Gateway | 300万リクエスト | $10.50 |
| Lambda | 300万リクエスト × 500ms × 256MB | $6.25 |
| DynamoDB (SearchCache) | 10GB + 300万WCU + 300万RCU | $50 |
| DynamoDB (Bookings) | 5GB + 10万WCU + 50万RCU | $15 |
| SQS | 50万メッセージ | $0.20 |
| CloudWatch Logs | 10GB | $5 |
| X-Ray | 100万トレース | $5 |
| WAF | 1 WebACL + 300万リクエスト | $8 |

**合計**: 約 **$100/月**（約15,000円）

**従来構成との比較**: $3,000 → $100（約97%削減）

### コスト削減のヒント

1. **Provisioned Concurrencyの最適化**: 本当に必要な時間帯のみ設定
2. **DynamoDB On-demand**: 予測可能なトラフィックならProvisioned Mode
3. **Lambda メモリ最適化**: Power Tuning で最適なメモリサイズを特定

---

## 12. 学習のポイント

### 重要な概念の整理

1. **サーバーレスの特性**
   - 自動スケーリング
   - 従量課金
   - コールドスタート

2. **DynamoDBキャッシュパターン**
   - TTLによる自動削除
   - 一貫性のトレードオフ
   - パーティションキー設計

3. **非同期処理のメリット**
   - レスポンス時間の短縮
   - 障害の分離
   - リトライの容易さ

### GCPとの比較

| 概念 | AWS | GCP |
|------|-----|-----|
| API Gateway | API Gateway | Cloud Endpoints / API Gateway |
| サーバーレス関数 | Lambda | Cloud Functions |
| NoSQL DB | DynamoDB | Firestore / Bigtable |
| メッセージキュー | SQS | Cloud Tasks / Pub/Sub |
| WAF | WAF | Cloud Armor |

### 次のステップ
1. 認証・認可の追加（Cognito）
2. キャッシュ層の追加（CloudFront、ElastiCache）
3. CI/CD パイプラインの構築
