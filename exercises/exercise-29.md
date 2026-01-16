# 課題29: 物流企業のイベント駆動配送管理

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | マイクロサービス・API |
| 処理形態 | イベント駆動アーキテクチャ |
| 使用するIaCツール | AWS CDK (TypeScript) |
| 想定所要時間 | 5-6時間 |

---

## 2. シナリオ

### 企業プロフィール
**QuickDeliver株式会社**は、EC事業者向けの配送代行サービスを提供する物流企業です。日次配送件数は1万件を超え、荷主、倉庫、配送ドライバー、エンドユーザーなど多くのステークホルダーと連携しています。

### 現状の課題
配送状況の通知システムが各所に分散し、リアルタイム性と一貫性に問題があります：

1. **通知の遅延**：配送状況の更新がバッチ処理のため、30分〜1時間遅れる
2. **通知漏れ**：システム間連携の不整合で、通知が届かないケースが発生
3. **拡張性の低さ**：新しい通知チャネル（LINE、アプリプッシュ）の追加が困難
4. **トレーサビリティ不足**：配送の状態遷移履歴が追跡しにくい

### 数値で見る問題
- 通知遅延：平均 **45分**
- 通知漏れ率：**2%**（月200件）
- 顧客問い合わせ：月 **500件**（「荷物はどこ？」）
- 新チャネル追加：**3ヶ月**かかる

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 通知遅延 | 45分 | 1分以内 |
| 通知漏れ率 | 2% | 0.1%以下 |
| 顧客問い合わせ | 500件/月 | 100件/月 |
| 新チャネル追加 | 3ヶ月 | 1週間 |

---

## 3. 学習目標

### 主要な学習成果
1. EventBridgeを使ったイベント駆動アーキテクチャの構築
2. Fan-outパターンによる複数通知チャネルへの配信
3. DynamoDB Streamsによるイベント発行
4. デッドレターキューによるエラーハンドリング

### 習得するスキル
- EventBridge Rules / Event Bus の設計
- Lambda と SQS / SNS の連携
- イベントスキーマの設計
- 冪等性の実装

---

## 4. 使用するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| EventBridge | イベントバス・ルーティング | 高 |
| Lambda | イベント処理 | 高 |
| SQS | メッセージキューイング | 高 |
| SNS | Fan-out配信 | 高 |
| DynamoDB | 配送データ・イベント履歴 | 高 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| API Gateway | 外部システム連携API |
| SES | メール通知 |
| CloudWatch | ログ・メトリクス・アラーム |
| X-Ray | 分散トレーシング |
| Step Functions | 複雑なワークフロー |

---

## 5. 前提条件

### 必要な知識
- イベント駆動アーキテクチャの基本概念
- AWS Lambda の基本操作
- TypeScript の基礎

### 事前準備
1. AWSアカウント
2. AWS CLI v2
3. Node.js 18.x
4. AWS CDK CLI

---

## 6. アーキテクチャ概要

### システム構成図
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Event Sources                                      │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   WMS       │  │   TMS       │  │  Driver     │  │  External   │        │
│  │ (Warehouse) │  │ (Transport) │  │   App       │  │   API       │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway                                        │
│                    POST /events/delivery-status                              │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Lambda: EventIngestion                               │
│                   (Validation, Enrichment, Publish)                          │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Amazon EventBridge                                   │
│                        (Custom Event Bus)                                    │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Event: DeliveryStatusChanged                      │   │
│   │   {                                                                  │   │
│   │     "source": "quickdeliver.delivery",                              │   │
│   │     "detail-type": "DeliveryStatusChanged",                         │   │
│   │     "detail": {                                                      │   │
│   │       "deliveryId": "DEL-001",                                      │   │
│   │       "status": "OUT_FOR_DELIVERY",                                 │   │
│   │       "timestamp": "2024-01-15T10:30:00Z"                           │   │
│   │     }                                                                │   │
│   │   }                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Rules:                                                                     │
│   ├── Rule: NotifyCustomer (status = OUT_FOR_DELIVERY, DELIVERED)           │
│   ├── Rule: NotifyShipper (status = *)                                      │
│   ├── Rule: UpdateDashboard (status = *)                                    │
│   └── Rule: Archive (status = *)                                            │
└────────┬──────────────────┬──────────────────┬──────────────────┬───────────┘
         │                  │                  │                  │
         ▼                  ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    SNS      │    │    SQS      │    │  Lambda:    │    │   S3        │
│ (Customer)  │    │ (Shipper)   │    │ Dashboard   │    │ (Archive)   │
└──────┬──────┘    └──────┬──────┘    └─────────────┘    └─────────────┘
       │                  │
       ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Notification Handlers                                 │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Lambda:    │  │  Lambda:    │  │  Lambda:    │  │  Lambda:    │        │
│  │ EmailNotify │  │ SMSNotify   │  │ PushNotify  │  │ WebhookCall │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         ▼                ▼                ▼                ▼                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    SES      │  │    SNS      │  │   Pinpoint  │  │  External   │        │
│  │   (Email)   │  │   (SMS)     │  │   (Push)    │  │   System    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### イベントフロー
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Delivery Status Flow                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ORDER_RECEIVED                                                              │
│       │                                                                      │
│       ▼                                                                      │
│  PROCESSING ──────────────────────────────────────────┐                     │
│       │                                               │                     │
│       ▼                                               ▼                     │
│  PICKED_UP ─────────────────┐                    CANCELLED                  │
│       │                     │                                               │
│       ▼                     ▼                                               │
│  IN_TRANSIT          RETURNED_TO_SENDER                                     │
│       │                                                                      │
│       ▼                                                                      │
│  OUT_FOR_DELIVERY ──────────┐                                               │
│       │                     │                                               │
│       ▼                     ▼                                               │
│  DELIVERED           DELIVERY_FAILED ───▶ RESCHEDULED                       │
│                                                 │                           │
│                                                 ▼                           │
│                                          OUT_FOR_DELIVERY                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. ハンズオン手順

### Phase 1: CDKプロジェクトのセットアップ（30分）

#### Step 1-1: プロジェクト初期化

```bash
mkdir quickdeliver-events && cd quickdeliver-events
cdk init app --language typescript

# 依存パッケージインストール
npm install @aws-cdk/aws-events @aws-cdk/aws-events-targets \
  @aws-cdk/aws-lambda-nodejs @aws-cdk/aws-sqs @aws-cdk/aws-sns \
  @aws-cdk/aws-dynamodb esbuild
```

#### Step 1-2: ディレクトリ構造

```
quickdeliver-events/
├── bin/
│   └── app.ts
├── lib/
│   ├── stacks/
│   │   ├── event-bus-stack.ts
│   │   ├── delivery-stack.ts
│   │   └── notification-stack.ts
│   └── constructs/
│       ├── delivery-events.ts
│       └── notification-handler.ts
├── src/
│   └── handlers/
│       ├── event-ingestion/
│       ├── email-notification/
│       ├── sms-notification/
│       └── webhook-caller/
└── test/
```

### Phase 2: EventBridge Event Bus の構築（60分）

#### Step 2-1: イベントバススタック

```typescript
// lib/stacks/event-bus-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export interface EventBusStackProps extends cdk.StackProps {
  environment: string;
}

export class EventBusStack extends cdk.Stack {
  public readonly eventBus: events.EventBus;
  public readonly deliveryTable: dynamodb.Table;
  public readonly eventHistoryTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: EventBusStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // Custom Event Bus
    this.eventBus = new events.EventBus(this, 'DeliveryEventBus', {
      eventBusName: `quickdeliver-delivery-${environment}`,
    });

    // Archive for event replay
    new events.Archive(this, 'DeliveryEventArchive', {
      archiveName: `quickdeliver-delivery-archive-${environment}`,
      sourceEventBus: this.eventBus,
      eventPattern: {
        source: [{ prefix: 'quickdeliver' }],
      },
      retention: cdk.Duration.days(90),
    });

    // DynamoDB: Delivery Table
    this.deliveryTable = new dynamodb.Table(this, 'DeliveryTable', {
      tableName: `quickdeliver-deliveries-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // GSI: By Status
    this.deliveryTable.addGlobalSecondaryIndex({
      indexName: 'gsi-status',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // DynamoDB: Event History Table
    this.eventHistoryTable = new dynamodb.Table(this, 'EventHistoryTable', {
      tableName: `quickdeliver-event-history-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Event Ingestion Lambda
    const eventIngestionFn = new lambdaNodejs.NodejsFunction(this, 'EventIngestionFn', {
      functionName: `quickdeliver-event-ingestion-${environment}`,
      entry: 'src/handlers/event-ingestion/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        DELIVERY_TABLE: this.deliveryTable.tableName,
        EVENT_HISTORY_TABLE: this.eventHistoryTable.tableName,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    this.eventBus.grantPutEventsTo(eventIngestionFn);
    this.deliveryTable.grantReadWriteData(eventIngestionFn);
    this.eventHistoryTable.grantWriteData(eventIngestionFn);

    // API Gateway
    const api = new apigateway.RestApi(this, 'EventApi', {
      restApiName: `quickdeliver-events-api-${environment}`,
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
      },
    });

    const eventsResource = api.root.addResource('events');
    const deliveryStatusResource = eventsResource.addResource('delivery-status');

    deliveryStatusResource.addMethod('POST',
      new apigateway.LambdaIntegration(eventIngestionFn)
    );

    // Outputs
    new cdk.CfnOutput(this, 'EventBusArn', {
      value: this.eventBus.eventBusArn,
      exportName: `${environment}-DeliveryEventBusArn`,
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      exportName: `${environment}-EventApiEndpoint`,
    });
  }
}
```

#### Step 2-2: Event Ingestion Lambda

```typescript
// src/handlers/event-ingestion/index.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const eventBridge = new EventBridgeClient({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;
const DELIVERY_TABLE = process.env.DELIVERY_TABLE!;
const EVENT_HISTORY_TABLE = process.env.EVENT_HISTORY_TABLE!;

interface DeliveryStatusEvent {
  deliveryId: string;
  status: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  metadata?: Record<string, any>;
}

const VALID_STATUSES = [
  'ORDER_RECEIVED',
  'PROCESSING',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'RESCHEDULED',
  'RETURNED_TO_SENDER',
  'CANCELLED',
];

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse and validate request
    const body: DeliveryStatusEvent = JSON.parse(event.body || '{}');

    const validationError = validateEvent(body);
    if (validationError) {
      return errorResponse(400, validationError);
    }

    // Generate event ID for idempotency
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();

    // Get current delivery data for enrichment
    const currentDelivery = await getCurrentDelivery(body.deliveryId);

    // Update delivery status in DynamoDB
    await updateDeliveryStatus(body, timestamp);

    // Record event in history
    await recordEventHistory(eventId, body, timestamp);

    // Publish to EventBridge
    await publishEvent(eventId, body, currentDelivery, timestamp);

    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Event accepted',
        eventId,
        deliveryId: body.deliveryId,
        status: body.status,
      }),
    };
  } catch (error) {
    console.error('Error processing event:', error);
    return errorResponse(500, 'Internal server error');
  }
}

function validateEvent(event: DeliveryStatusEvent): string | null {
  if (!event.deliveryId) {
    return 'deliveryId is required';
  }
  if (!event.status) {
    return 'status is required';
  }
  if (!VALID_STATUSES.includes(event.status)) {
    return `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (!event.timestamp) {
    return 'timestamp is required';
  }
  return null;
}

async function getCurrentDelivery(deliveryId: string) {
  const result = await docClient.send(new GetCommand({
    TableName: DELIVERY_TABLE,
    Key: {
      pk: `DELIVERY#${deliveryId}`,
      sk: 'METADATA',
    },
  }));
  return result.Item;
}

async function updateDeliveryStatus(event: DeliveryStatusEvent, timestamp: string) {
  await docClient.send(new UpdateCommand({
    TableName: DELIVERY_TABLE,
    Key: {
      pk: `DELIVERY#${event.deliveryId}`,
      sk: 'METADATA',
    },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, #location = :location',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#location': 'location',
    },
    ExpressionAttributeValues: {
      ':status': event.status,
      ':updatedAt': timestamp,
      ':location': event.location || null,
    },
  }));
}

async function recordEventHistory(eventId: string, event: DeliveryStatusEvent, timestamp: string) {
  const ttl = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60); // 90 days

  await docClient.send(new PutCommand({
    TableName: EVENT_HISTORY_TABLE,
    Item: {
      pk: `DELIVERY#${event.deliveryId}`,
      sk: `EVENT#${timestamp}#${eventId}`,
      eventId,
      deliveryId: event.deliveryId,
      status: event.status,
      timestamp: event.timestamp,
      location: event.location,
      metadata: event.metadata,
      createdAt: timestamp,
      ttl,
    },
  }));
}

async function publishEvent(
  eventId: string,
  event: DeliveryStatusEvent,
  currentDelivery: any,
  timestamp: string
) {
  const eventDetail = {
    eventId,
    deliveryId: event.deliveryId,
    previousStatus: currentDelivery?.status || null,
    currentStatus: event.status,
    timestamp: event.timestamp,
    location: event.location,
    metadata: event.metadata,
    customer: currentDelivery?.customer || null,
    shipper: currentDelivery?.shipper || null,
  };

  await eventBridge.send(new PutEventsCommand({
    Entries: [{
      EventBusName: EVENT_BUS_NAME,
      Source: 'quickdeliver.delivery',
      DetailType: 'DeliveryStatusChanged',
      Detail: JSON.stringify(eventDetail),
      Time: new Date(timestamp),
    }],
  }));
}

function errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message }),
  };
}
```

### Phase 3: 通知ハンドラーの実装（60分）

#### Step 3-1: 通知スタック

```typescript
// lib/stacks/notification-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface NotificationStackProps extends cdk.StackProps {
  environment: string;
  eventBus: events.IEventBus;
}

export class NotificationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NotificationStackProps) {
    super(scope, id, props);

    const { environment, eventBus } = props;

    // Customer Notification SNS Topic (Fan-out)
    const customerNotificationTopic = new sns.Topic(this, 'CustomerNotificationTopic', {
      topicName: `quickdeliver-customer-notification-${environment}`,
    });

    // Dead Letter Queues
    const emailDlq = new sqs.Queue(this, 'EmailDlq', {
      queueName: `quickdeliver-email-dlq-${environment}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    const smsDlq = new sqs.Queue(this, 'SmsDlq', {
      queueName: `quickdeliver-sms-dlq-${environment}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Email Queue
    const emailQueue = new sqs.Queue(this, 'EmailQueue', {
      queueName: `quickdeliver-email-${environment}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: emailDlq,
        maxReceiveCount: 3,
      },
    });

    // SMS Queue
    const smsQueue = new sqs.Queue(this, 'SmsQueue', {
      queueName: `quickdeliver-sms-${environment}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: smsDlq,
        maxReceiveCount: 3,
      },
    });

    // Subscribe queues to SNS topic
    customerNotificationTopic.addSubscription(
      new subscriptions.SqsSubscription(emailQueue, {
        filterPolicy: {
          notificationType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['email', 'all'],
          }),
        },
      })
    );

    customerNotificationTopic.addSubscription(
      new subscriptions.SqsSubscription(smsQueue, {
        filterPolicy: {
          notificationType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['sms', 'all'],
          }),
        },
      })
    );

    // Email Notification Lambda
    const emailNotificationFn = new lambdaNodejs.NodejsFunction(this, 'EmailNotificationFn', {
      functionName: `quickdeliver-email-notification-${environment}`,
      entry: 'src/handlers/email-notification/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        ENVIRONMENT: environment,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant SES permissions
    emailNotificationFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendTemplatedEmail'],
      resources: ['*'],
    }));

    // SQS -> Lambda trigger
    emailNotificationFn.addEventSource(
      new cdk.aws_lambda_event_sources.SqsEventSource(emailQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      })
    );

    // SMS Notification Lambda
    const smsNotificationFn = new lambdaNodejs.NodejsFunction(this, 'SmsNotificationFn', {
      functionName: `quickdeliver-sms-notification-${environment}`,
      entry: 'src/handlers/sms-notification/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        ENVIRONMENT: environment,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant SNS SMS permissions
    smsNotificationFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Publish'],
      resources: ['*'],
    }));

    smsNotificationFn.addEventSource(
      new cdk.aws_lambda_event_sources.SqsEventSource(smsQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      })
    );

    // EventBridge Rule: Customer Notification
    // OUT_FOR_DELIVERY, DELIVERED のときのみ顧客に通知
    new events.Rule(this, 'CustomerNotificationRule', {
      ruleName: `quickdeliver-customer-notification-${environment}`,
      eventBus,
      eventPattern: {
        source: ['quickdeliver.delivery'],
        detailType: ['DeliveryStatusChanged'],
        detail: {
          currentStatus: ['OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED'],
        },
      },
      targets: [new targets.SnsTopic(customerNotificationTopic, {
        message: events.RuleTargetInput.fromEventPath('$.detail'),
      })],
    });

    // Shipper Notification Queue
    const shipperQueue = new sqs.Queue(this, 'ShipperQueue', {
      queueName: `quickdeliver-shipper-${environment}`,
      visibilityTimeout: cdk.Duration.seconds(60),
    });

    // EventBridge Rule: Shipper Notification (all status changes)
    new events.Rule(this, 'ShipperNotificationRule', {
      ruleName: `quickdeliver-shipper-notification-${environment}`,
      eventBus,
      eventPattern: {
        source: ['quickdeliver.delivery'],
        detailType: ['DeliveryStatusChanged'],
      },
      targets: [new targets.SqsQueue(shipperQueue)],
    });

    // Webhook Caller Lambda
    const webhookCallerFn = new lambdaNodejs.NodejsFunction(this, 'WebhookCallerFn', {
      functionName: `quickdeliver-webhook-caller-${environment}`,
      entry: 'src/handlers/webhook-caller/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        ENVIRONMENT: environment,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    webhookCallerFn.addEventSource(
      new cdk.aws_lambda_event_sources.SqsEventSource(shipperQueue, {
        batchSize: 5,
        reportBatchItemFailures: true,
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'CustomerTopicArn', {
      value: customerNotificationTopic.topicArn,
    });
  }
}
```

#### Step 3-2: Email通知Lambda

```typescript
// src/handlers/email-notification/index.ts
import { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { SESClient, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({});
const SOURCE_EMAIL = process.env.SOURCE_EMAIL || 'noreply@quickdeliver.example.com';

interface DeliveryEvent {
  eventId: string;
  deliveryId: string;
  previousStatus: string | null;
  currentStatus: string;
  timestamp: string;
  customer: {
    email: string;
    name: string;
  } | null;
}

const STATUS_TEMPLATES: Record<string, { subject: string; template: string }> = {
  OUT_FOR_DELIVERY: {
    subject: '【QuickDeliver】お届けに向かっています',
    template: 'DeliveryOutForDelivery',
  },
  DELIVERED: {
    subject: '【QuickDeliver】お届け完了しました',
    template: 'DeliveryCompleted',
  },
  DELIVERY_FAILED: {
    subject: '【QuickDeliver】お届けできませんでした',
    template: 'DeliveryFailed',
  },
};

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      const snsMessage = JSON.parse(record.body);
      const deliveryEvent: DeliveryEvent = JSON.parse(snsMessage.Message);

      await sendEmail(deliveryEvent);
      console.log(`Email sent for delivery ${deliveryEvent.deliveryId}`);
    } catch (error) {
      console.error(`Failed to process message ${record.messageId}:`, error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}

async function sendEmail(event: DeliveryEvent): Promise<void> {
  if (!event.customer?.email) {
    console.log(`No customer email for delivery ${event.deliveryId}`);
    return;
  }

  const template = STATUS_TEMPLATES[event.currentStatus];
  if (!template) {
    console.log(`No template for status ${event.currentStatus}`);
    return;
  }

  // 冪等性チェック（実運用ではDynamoDBなどで管理）
  const idempotencyKey = `${event.deliveryId}-${event.currentStatus}-${event.eventId}`;
  console.log(`Processing email with idempotency key: ${idempotencyKey}`);

  await ses.send(new SendTemplatedEmailCommand({
    Source: SOURCE_EMAIL,
    Destination: {
      ToAddresses: [event.customer.email],
    },
    Template: template.template,
    TemplateData: JSON.stringify({
      customerName: event.customer.name,
      deliveryId: event.deliveryId,
      status: event.currentStatus,
      timestamp: new Date(event.timestamp).toLocaleString('ja-JP'),
    }),
  }));
}
```

### Phase 4: イベント履歴とトレーサビリティ（40分）

#### Step 4-1: イベント履歴クエリAPI

```typescript
// src/handlers/event-history/index.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const EVENT_HISTORY_TABLE = process.env.EVENT_HISTORY_TABLE!;

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const deliveryId = event.pathParameters?.deliveryId;

  if (!deliveryId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'deliveryId is required' }),
    };
  }

  try {
    const result = await docClient.send(new QueryCommand({
      TableName: EVENT_HISTORY_TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `DELIVERY#${deliveryId}`,
      },
      ScanIndexForward: true, // 時系列順
    }));

    const events = result.Items?.map(item => ({
      eventId: item.eventId,
      status: item.status,
      timestamp: item.timestamp,
      location: item.location,
      createdAt: item.createdAt,
    })) || [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveryId,
        eventCount: events.length,
        events,
      }),
    };
  } catch (error) {
    console.error('Error fetching event history:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
```

---

## 8. トラブルシューティング課題

### Challenge 1: イベントの重複処理
**状況**: 同じ配送ステータス更新が複数回処理されている

**調査ポイント**:
1. Lambda の冪等性実装を確認
2. SQS のVisibility Timeoutを確認
3. DynamoDB の条件付き書き込みを確認

### Challenge 2: 通知の順序保証
**状況**: OUT_FOR_DELIVERY より先に DELIVERED の通知が届く

**調査ポイント**:
1. SQS FIFO キューの利用を検討
2. イベントにシーケンス番号を付与
3. 消費側での順序制御

### Challenge 3: 外部Webhookのタイムアウト
**状況**: 荷主のWebhookが応答しない場合にLambdaがタイムアウト

**調査ポイント**:
1. Webhook呼び出しのタイムアウト設定
2. 非同期呼び出しへの変更
3. Circuit Breakerパターンの導入

---

## 9. 設計考慮ポイント

### ディスカッション1: イベントスキーマの設計
**テーマ**: スキーマバージョニングと互換性

| 戦略 | メリット | デメリット |
|------|----------|------------|
| バージョン埋め込み | 明示的 | スキーマ増加 |
| 後方互換性維持 | シンプル | 制約が多い |
| イベントストア | 完全な履歴 | 複雑性増加 |

### ディスカッション2: At-least-once vs Exactly-once
**テーマ**: メッセージ配信保証

**考慮点**:
- SQS標準キューは At-least-once
- 冪等性の実装が必須
- FIFO キューでの重複排除

### ディスカッション3: Fan-outパターン
**テーマ**: SNS vs EventBridge

| 観点 | SNS | EventBridge |
|------|-----|-------------|
| フィルタリング | シンプル | 高度 |
| ターゲット数 | 多い | 5ルール/バス |
| スキーマレジストリ | なし | あり |

---

## 10. 発展課題

### Advanced 1: Event Replay 機能
**課題**: EventBridge Archive を使って、特定期間のイベントを再処理

### Advanced 2: CQRS + Event Sourcing
**課題**: イベントストアを構築し、配送状態を完全に再構築可能に

### Advanced 3: Step Functions Saga
**課題**: 複雑な配送ワークフロー（ピックアップ→配送→返品）をStep Functionsで実装

---

## 11. コスト見積もり

### 月額コスト概算

| サービス | 使用量 | 月額コスト |
|----------|--------|------------|
| EventBridge | 100万イベント | $1 |
| Lambda | 100万回 × 1秒 × 256MB | $2 |
| SQS | 100万メッセージ | $0.40 |
| SNS | 100万通知 | $0.50 |
| DynamoDB | 10GB + 100万WCU/RCU | $30 |
| SES | 10万通 | $1 |
| CloudWatch | ログ10GB | $5 |

**合計**: 約 **$40/月**（約6,000円）

---

## 12. 学習のポイント

### 重要な概念の整理

1. **イベント駆動アーキテクチャ**
   - 疎結合で拡張性が高い
   - 新しい消費者を簡単に追加
   - 障害の分離

2. **冪等性**
   - 同じイベントを複数回処理しても結果が同じ
   - DynamoDBの条件付き書き込み活用
   - イベントIDでの重複チェック

3. **Fan-outパターン**
   - 1つのイベントを複数の消費者に配信
   - SNS + SQSの組み合わせ
   - フィルタリングによる効率化

### GCPとの比較

| 概念 | AWS | GCP |
|------|-----|-----|
| イベントバス | EventBridge | Eventarc |
| メッセージング | SNS/SQS | Pub/Sub |
| サーバーレス関数 | Lambda | Cloud Functions |
| NoSQL DB | DynamoDB | Firestore |
| メール送信 | SES | SendGrid等 |

### 次のステップ
1. リアルタイムダッシュボードの構築
2. 機械学習による配送時間予測
3. 異常検知アラートの実装
