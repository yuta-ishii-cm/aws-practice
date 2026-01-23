# 課題41: グローバル展開のマルチリージョン構成

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | グローバルアーキテクチャ・マルチリージョン |
| 処理タイプ | リアルタイム |
| 使用IaC | CDK |
| 想定所要時間 | 6-7時間 |

---

## 2. ビジネスシナリオ

### 企業プロファイル
- **企業名**: 〇〇株式会社
- **業種**: プロジェクト管理SaaS
- **規模**: 従業員100名、エンジニア30名
- **現状**: 日本国内ユーザー5万人、海外展開開始
- **展開計画**: 米国・欧州市場への進出

### 現状の課題
〇〇株式会社は日本市場で成功を収め、米国・欧州への展開を計画しています。
しかし、現在の東京リージョン単一構成では以下の問題があります：

| 課題カテゴリ | 問題点 |
|-------------|--------|
| **レイテンシ問題** | 米国からのアクセス: 200-300ms、欧州からのアクセス: 250-350ms、リアルタイム協調編集に支障 |
| **データレジデンシー要件** | GDPR（EU）: EUユーザーのデータはEU内保存必須、州法（米国）: 一部州でデータローカライゼーション要求、契約要件: 大企業顧客からリージョン指定要求 |
| **可用性リスク** | 東京リージョン障害時に全世界でサービス停止、RPO/RTO が顧客SLA要件を満たさない、DR サイトが未整備 |
| **スケーラビリティ** | 単一リージョンでのキャパシティ制限、ピーク時のリソース競合 |

### ビジネス要件
```
機能要件:
- 日本・米国・欧州の3リージョン展開
- リージョン間のデータ同期
- ユーザーの地理的位置に基づくルーティング
- グローバルセッション管理

非機能要件:
- 各地域からのレイテンシ: 100ms以下
- 可用性: 99.99%（グローバル）
- RPO: 5分、RTO: 15分
- GDPR/データレジデンシー準拠
```

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 米国レイテンシ | 250ms | 50ms |
| 欧州レイテンシ | 300ms | 50ms |
| グローバル可用性 | 99.9% | 99.99% |
| RPO | 24時間 | 5分 |
| RTO | 4時間 | 15分 |

---

## 3. 達成目標

### 技術的な学習ポイント

1. **マルチリージョン設計**
   - Active-Active / Active-Passive 構成
   - グローバルロードバランシング
   - データレプリケーション戦略

2. **グローバルサービス活用**
   - Route 53 ジオロケーション/レイテンシールーティング
   - CloudFront グローバル配信
   - Global Accelerator
   - DynamoDB Global Tables

3. **データレジデンシー対応**
   - リージョン別データ分離
   - GDPR 準拠アーキテクチャ
   - データ主権の考慮

4. **AWS CDK**
   - マルチリージョンスタック
   - クロスリージョン参照
   - 環境別デプロイ

### 実務で活かせる知識

- グローバル展開時のアーキテクチャ設計判断
- データレジデンシー要件への対応パターン
- マルチリージョン構成のコスト最適化

---

## 4. 学習するAWSサービス

### メインサービス
| サービス | 役割 | 使用機能 |
|----------|------|----------|
| **Amazon Route 53** | DNSルーティング | ジオロケーション、レイテンシー、ヘルスチェック |
| **Amazon CloudFront** | CDN・エッジ配信 | グローバル配信、Lambda@Edge |
| **AWS Global Accelerator** | グローバルネットワーク | 静的IP、最適ルーティング |
| **Amazon DynamoDB** | グローバルデータベース | Global Tables |

### サポートサービス
| サービス | 用途 |
|----------|------|
| **Amazon Aurora** | リージョナルRDB（Global Database） |
| **Amazon ElastiCache** | リージョナルキャッシュ（Global Datastore） |
| **AWS Certificate Manager** | SSL/TLS証明書 |
| **Amazon S3** | 静的アセット（Cross-Region Replication） |
| **AWS Lambda** | エッジ処理（Lambda@Edge） |

### アーキテクチャ図

```mermaid
architecture-beta
    group global(cloud)[TaskFlow Global Architecture]

    group tokyo(cloud)[ap-northeast-1 Tokyo] in global
    group virginia(cloud)[us-east-1 Virginia] in global
    group ireland(cloud)[eu-west-1 Ireland] in global
    group global_data(database)[Global Data Layer] in global

    service route53(server)[Route 53 Geo/Latency] in global

    service cf_tokyo(logos:aws-cloudfront)[CloudFront] in tokyo
    service alb_tokyo(server)[ALB] in tokyo
    service ecs_tokyo(logos:aws-ecs)[ECS Fargate] in tokyo
    service aurora_tokyo(database)[Aurora Primary] in tokyo
    service cache_tokyo(database)[ElastiCache] in tokyo

    service cf_virginia(logos:aws-cloudfront)[CloudFront] in virginia
    service alb_virginia(server)[ALB] in virginia
    service ecs_virginia(logos:aws-ecs)[ECS Fargate] in virginia
    service aurora_virginia(database)[Aurora Replica] in virginia
    service cache_virginia(database)[ElastiCache] in virginia

    service cf_ireland(logos:aws-cloudfront)[CloudFront] in ireland
    service alb_ireland(server)[ALB] in ireland
    service ecs_ireland(logos:aws-ecs)[ECS Fargate] in ireland
    service aurora_ireland(database)[Aurora Replica] in ireland
    service cache_ireland(database)[ElastiCache] in ireland

    service dynamodb_global(logos:aws-dynamodb)[DynamoDB Global Tables] in global_data

    route53:B --> T:cf_tokyo
    route53:B --> T:cf_virginia
    route53:B --> T:cf_ireland
    cf_tokyo:B --> T:alb_tokyo
    cf_virginia:B --> T:alb_virginia
    cf_ireland:B --> T:alb_ireland
    alb_tokyo:B --> T:ecs_tokyo
    alb_virginia:B --> T:ecs_virginia
    alb_ireland:B --> T:ecs_ireland
    ecs_tokyo:B --> T:aurora_tokyo
    ecs_virginia:B --> T:aurora_virginia
    ecs_ireland:B --> T:aurora_ireland
    aurora_tokyo:R --> L:aurora_virginia
    aurora_virginia:R --> L:aurora_ireland
```

| コンポーネント | 役割 |
|----------------|------|
| **Route 53 Geo/Latency** | ジオロケーション/レイテンシベースのDNSルーティング |
| **CloudFront** | 各リージョンのCDN・エッジ配信 |
| **ALB** | リージョン内ロードバランシング |
| **ECS Fargate** | API/Webアプリケーション実行 |
| **Aurora Primary** | 東京リージョンのプライマリDB |
| **Aurora Replica** | 米国/欧州リージョンのリードレプリカ |
| **ElastiCache** | リージョナルキャッシュ（Global Datastore） |
| **DynamoDB Global Tables** | マルチリージョン同期データ（セッション等） |

---

## 5. 前提条件と事前準備

### 必要な環境
```bash
# Node.js 18以上
node --version

# AWS CDK
npm install -g aws-cdk
cdk --version  # 2.x

# AWS CLI v2
aws --version

# TypeScript
npm install -g typescript
tsc --version

# Docker（コンテナビルド用）
docker --version
```

### AWSアカウント要件
```
- 3リージョンでのリソース作成権限
- Route 53 ホストゾーン管理権限
- ACM 証明書作成権限
- Global Accelerator 作成権限
```

### 事前準備スクリプト
```bash
#!/bin/bash
# setup-multi-region.sh

# プロジェクト作成
mkdir taskflow-global && cd taskflow-global

# CDK プロジェクト初期化
cdk init app --language typescript

# 必要なパッケージのインストール
npm install @aws-cdk/aws-route53 @aws-cdk/aws-route53-targets \
    @aws-cdk/aws-cloudfront @aws-cdk/aws-cloudfront-origins \
    @aws-cdk/aws-globalaccelerator @aws-cdk/aws-globalaccelerator-endpoints \
    @aws-cdk/aws-dynamodb @aws-cdk/aws-elasticache \
    @aws-cdk/aws-ecs @aws-cdk/aws-ecs-patterns \
    @aws-cdk/aws-certificatemanager @aws-cdk/aws-ec2

# ディレクトリ構造
cat << 'EOF'
taskflow-global/
├── bin/
│   └── taskflow-global.ts
├── lib/
│   ├── stacks/
│   │   ├── global-stack.ts
│   │   ├── regional-stack.ts
│   │   └── database-stack.ts
│   ├── constructs/
│   │   ├── vpc-construct.ts
│   │   ├── ecs-construct.ts
│   │   └── database-construct.ts
│   └── config/
│       └── regions.ts
├── test/
├── cdk.json
├── package.json
└── tsconfig.json
EOF

# Bootstrap 全リージョン
cdk bootstrap aws://ACCOUNT_ID/ap-northeast-1
cdk bootstrap aws://ACCOUNT_ID/us-east-1
cdk bootstrap aws://ACCOUNT_ID/eu-west-1
```

---

## 6. アーキテクチャ設計

### ルーティング戦略
```yaml
# routing-strategy.yaml
routing:
  primary:
    type: geolocation
    rules:
      - geo: JP
        region: ap-northeast-1
      - geo: US
        region: us-east-1
      - geo: EU
        region: eu-west-1
      - geo: default
        type: latency_based
        regions:
          - ap-northeast-1
          - us-east-1
          - eu-west-1

  failover:
    type: health_check_based
    health_check_interval: 30s
    failure_threshold: 3
    failover_order:
      ap-northeast-1:
        primary: ap-northeast-1
        secondary: us-east-1
      us-east-1:
        primary: us-east-1
        secondary: eu-west-1
      eu-west-1:
        primary: eu-west-1
        secondary: us-east-1

  global_accelerator:
    enabled: true
    endpoint_groups:
      - region: ap-northeast-1
        weight: 100
        health_check_path: /health
      - region: us-east-1
        weight: 100
        health_check_path: /health
      - region: eu-west-1
        weight: 100
        health_check_path: /health
```

### データレプリケーション戦略
```yaml
# data-replication-strategy.yaml
databases:
  aurora_global:
    primary_region: ap-northeast-1
    replica_regions:
      - us-east-1
      - eu-west-1
    replication_lag_target: 1s
    failover:
      automatic: false  # 手動フェイルオーバー推奨
      rpo: 1s
      rto: 1m

  dynamodb_global_tables:
    tables:
      - name: sessions
        regions: [ap-northeast-1, us-east-1, eu-west-1]
        consistency: eventual  # リージョン間は結果整合性
      - name: user_preferences
        regions: [ap-northeast-1, us-east-1, eu-west-1]
        consistency: eventual

  elasticache_global:
    primary_region: ap-northeast-1
    replica_regions:
      - us-east-1
      - eu-west-1
    replication: async
    failover: automatic

  s3_replication:
    rules:
      - source: taskflow-assets-ap-northeast-1
        destinations:
          - taskflow-assets-us-east-1
          - taskflow-assets-eu-west-1
        filter: "*"
        replication_time: 15m

data_residency:
  eu_users:
    storage_region: eu-west-1
    allowed_regions: [eu-west-1]
    gdpr_compliance: true
  us_users:
    storage_region: us-east-1
    allowed_regions: [us-east-1, ap-northeast-1]
  jp_users:
    storage_region: ap-northeast-1
    allowed_regions: [ap-northeast-1]
```

---

## 7. トラブルシューティング課題

### 課題1: リージョン間レプリケーション遅延

**症状**:
```
東京で更新したデータが米国で参照できない。
DynamoDB Global Tables のレプリケーションに遅延が発生している。
```

**調査コマンド**:
```bash
# レプリケーション遅延の確認
aws cloudwatch get-metric-statistics \
    --namespace AWS/DynamoDB \
    --metric-name ReplicationLatency \
    --dimensions Name=TableName,Value=taskflow-sessions \
                 Name=ReceivingRegion,Value=us-east-1 \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --period 60 \
    --statistics Average Maximum

# テーブルの状態確認
aws dynamodb describe-table --table-name taskflow-sessions --region ap-northeast-1
aws dynamodb describe-table --table-name taskflow-sessions --region us-east-1
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: 複数の原因が考えられる

**パターン1: 書き込みスループットの不足**
```bash
# 書き込みキャパシティの確認
aws dynamodb describe-table --table-name taskflow-sessions \
    --query 'Table.ProvisionedThroughput'

# オンデマンドに変更
aws dynamodb update-table \
    --table-name taskflow-sessions \
    --billing-mode PAY_PER_REQUEST
```

**パターン2: 大量書き込みによるバースト**
```typescript
// アプリケーション側での対策
// 書き込みの分散とバッチ処理

import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

async function batchWriteWithRetry(items: any[], maxRetries = 3) {
  const client = new DynamoDBClient({});
  let unprocessedItems = items;
  let retries = 0;

  while (unprocessedItems.length > 0 && retries < maxRetries) {
    const result = await client.send(new BatchWriteItemCommand({
      RequestItems: {
        'taskflow-sessions': unprocessedItems.map(item => ({
          PutRequest: { Item: item }
        }))
      }
    }));

    unprocessedItems = result.UnprocessedItems?.['taskflow-sessions'] || [];

    if (unprocessedItems.length > 0) {
      // 指数バックオフ
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, retries) * 100)
      );
      retries++;
    }
  }
}
```

**パターン3: ネットワーク問題**
```bash
# リージョン間の接続確認
# VPC ピアリングやTransit Gatewayの状態確認
aws ec2 describe-vpc-peering-connections
aws ec2 describe-transit-gateway-attachments
```
</details>

### 課題2: フェイルオーバーが機能しない

**症状**:
```
東京リージョンのALBがダウンしているのに、
Route 53 がトラフィックを他のリージョンに振り分けない。
```

**調査手順**:
```bash
# ヘルスチェックの状態確認
aws route53 list-health-checks
aws route53 get-health-check-status --health-check-id HC_ID

# DNS レコードの確認
aws route53 list-resource-record-sets \
    --hosted-zone-id ZONE_ID \
    --query "ResourceRecordSets[?Name=='api.taskflow.example.com.']"
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: ヘルスチェックの設定不備

**解決手順**:
```typescript
// CDK でのヘルスチェック設定
import * as route53 from 'aws-cdk-lib/aws-route53';

// ヘルスチェックの作成
const healthCheck = new route53.CfnHealthCheck(this, 'AlbHealthCheck', {
  healthCheckConfig: {
    type: 'HTTPS',
    fullyQualifiedDomainName: albDnsName,
    port: 443,
    resourcePath: '/health',
    requestInterval: 10,  // 10秒間隔
    failureThreshold: 2,  // 2回失敗でUnhealthy
    enableSni: true,
  },
  healthCheckTags: [{
    key: 'Name',
    value: `taskflow-${region}-health`,
  }],
});

// フェイルオーバーレコードの設定
new route53.CfnRecordSet(this, 'ApiRecordFailover', {
  hostedZoneId: hostedZone.hostedZoneId,
  name: `api.${DOMAIN_NAME}`,
  type: 'A',
  setIdentifier: `failover-${region}`,
  failover: isPrimary ? 'PRIMARY' : 'SECONDARY',
  healthCheckId: healthCheck.attrHealthCheckId,
  aliasTarget: {
    dnsName: albDnsName,
    hostedZoneId: albHostedZoneId,
    evaluateTargetHealth: true,
  },
});
```

**追加確認事項**:
- ヘルスチェックの `evaluateTargetHealth` が true か
- ALB のターゲットグループのヘルスチェックが正常か
- セキュリティグループで Route 53 ヘルスチェッカーからのアクセスを許可しているか
</details>

### 課題3: GDPR データレジデンシー違反

**症状**:
```
EU ユーザーのデータが US リージョンに保存されてしまう。
GDPR 違反の可能性がある。
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: アプリケーション側でのリージョン判定・ルーティングが不適切

**解決策**:
```typescript
// Lambda@Edge でのリージョン判定強化
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const countryCode = headers['cloudfront-viewer-country']?.[0]?.value;

  // EU 諸国のリスト（GDPR 対象）
  const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB' // UK は Brexit 後も GDPR 類似法
  ];

  if (EU_COUNTRIES.includes(countryCode)) {
    // EU ユーザーは必ず EU リージョンへ
    request.headers['x-data-residency'] = [{ value: 'eu-west-1' }];
    request.headers['x-gdpr-required'] = [{ value: 'true' }];

    // EU 以外のオリジンへのリクエストをブロック
    const targetOrigin = request.origin?.custom?.domainName || '';
    if (!targetOrigin.includes('eu-west-1') && !targetOrigin.includes('api-eu')) {
      return {
        status: '403',
        statusDescription: 'Forbidden',
        body: JSON.stringify({
          error: 'Data residency violation',
          message: 'EU user data must be processed in EU region'
        }),
        headers: {
          'content-type': [{ value: 'application/json' }]
        }
      };
    }
  }

  return request;
};

// アプリケーション側での追加チェック
class DataResidencyMiddleware {
  async handle(req: Request, res: Response, next: NextFunction) {
    const dataResidency = req.headers['x-data-residency'];
    const currentRegion = process.env.AWS_REGION;

    if (dataResidency && dataResidency !== currentRegion) {
      // 正しいリージョンへリダイレクト
      const correctEndpoint = REGION_ENDPOINTS[dataResidency];
      return res.redirect(307, `https://${correctEndpoint}${req.originalUrl}`);
    }

    next();
  }
}
```

**DynamoDB でのデータ分離**:
```typescript
// EU ユーザー専用テーブルを EU リージョンのみに作成
const euUserDataTable = new dynamodb.Table(this, 'EUUserData', {
  tableName: 'taskflow-eu-user-data',
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  // レプリケーションなし（EU リージョンのみ）
  // replicationRegions: [], // 意図的に空
  encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
  encryptionKey: euKmsKey,
});
```
</details>

---

## 8. 設計課題

### 設計課題: Active-Active から Active-Passive への切り替え戦略

**シナリオ**:
〇〇株式会社はコスト削減のため、一部の時間帯で Active-Passive 構成に切り替えることを検討しています。以下の要件を満たす設計を行ってください。

**要件**:
```
1. 通常時（日本時間 8:00-22:00）
   - Active-Active（全リージョン稼働）
   - ジオロケーションルーティング

2. 夜間（日本時間 22:00-8:00）
   - Active-Passive（東京のみ稼働）
   - 米国・欧州はスタンバイ
   - コスト50%削減目標

3. 切り替え要件
   - 自動切り替え（EventBridge Scheduler）
   - 切り替え時間: 5分以内
   - データ整合性の維持

4. 緊急時
   - 手動で即座にActive-Active復帰可能
   - 復帰時間: 2分以内
```

<details>
<summary>設計例を見る</summary>

### Active-Active ↔ Active-Passive 切り替えアーキテクチャ

```typescript
// lib/constructs/traffic-scheduler.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class TrafficSchedulerConstruct extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // トラフィック制御 Lambda
    const trafficController = new lambda.Function(this, 'TrafficController', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import boto3
import json
import os

route53 = boto3.client('route53')
ecs = boto3.client('ecs')
autoscaling = boto3.client('application-autoscaling')

HOSTED_ZONE_ID = os.environ['HOSTED_ZONE_ID']
DOMAIN_NAME = os.environ['DOMAIN_NAME']

REGIONS = {
    'ap-northeast-1': {'cluster': 'taskflow-ap-northeast-1', 'service': 'api'},
    'us-east-1': {'cluster': 'taskflow-us-east-1', 'service': 'api'},
    'eu-west-1': {'cluster': 'taskflow-eu-west-1', 'service': 'api'},
}

def handler(event, context):
    mode = event.get('mode', 'active-active')

    if mode == 'active-passive':
        return switch_to_active_passive()
    elif mode == 'active-active':
        return switch_to_active_active()
    elif mode == 'emergency-active':
        return emergency_activate_all()

def switch_to_active_passive():
    """夜間モード: 東京のみ Active"""

    # 1. Route 53 を東京のみに変更
    route53.change_resource_record_sets(
        HostedZoneId=HOSTED_ZONE_ID,
        ChangeBatch={
            'Changes': [
                {
                    'Action': 'UPSERT',
                    'ResourceRecordSet': {
                        'Name': f'api.{DOMAIN_NAME}',
                        'Type': 'A',
                        'AliasTarget': {
                            'HostedZoneId': 'Z14GRHDCWA56QT',
                            'DNSName': 'taskflow-alb-ap-northeast-1.example.com',
                            'EvaluateTargetHealth': True
                        }
                    }
                }
            ]
        }
    )

    # 2. 米国・欧州の ECS タスク数を最小に
    for region in ['us-east-1', 'eu-west-1']:
        regional_ecs = boto3.client('ecs', region_name=region)
        regional_ecs.update_service(
            cluster=REGIONS[region]['cluster'],
            service=REGIONS[region]['service'],
            desiredCount=0  # タスクを0に
        )

    return {'status': 'switched to active-passive'}

def switch_to_active_active():
    """通常モード: 全リージョン Active"""

    # 1. 米国・欧州の ECS タスクを起動
    for region in ['us-east-1', 'eu-west-1']:
        regional_ecs = boto3.client('ecs', region_name=region)
        regional_ecs.update_service(
            cluster=REGIONS[region]['cluster'],
            service=REGIONS[region]['service'],
            desiredCount=2  # 通常のタスク数
        )

    # 2. タスクの起動を待機
    import time
    time.sleep(120)  # 2分待機

    # 3. Route 53 をジオロケーションルーティングに変更
    # (省略: 複数レコードの設定)

    return {'status': 'switched to active-active'}

def emergency_activate_all():
    """緊急時: 即座に全リージョン Active"""

    # 並列でタスク起動
    import concurrent.futures

    def activate_region(region):
        regional_ecs = boto3.client('ecs', region_name=region)
        regional_ecs.update_service(
            cluster=REGIONS[region]['cluster'],
            service=REGIONS[region]['service'],
            desiredCount=3,  # 緊急時は多めに
            forceNewDeployment=True
        )

    with concurrent.futures.ThreadPoolExecutor() as executor:
        executor.map(activate_region, ['us-east-1', 'eu-west-1'])

    return {'status': 'emergency activation initiated'}
      `),
      environment: {
        HOSTED_ZONE_ID: 'Z1234567890',
        DOMAIN_NAME: 'taskflow.example.com',
      },
      timeout: cdk.Duration.minutes(5),
    });

    // IAM 権限
    trafficController.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'route53:ChangeResourceRecordSets',
        'ecs:UpdateService',
        'ecs:DescribeServices',
      ],
      resources: ['*'],
    }));

    // スケジュール: 夜間モードへ（日本時間 22:00 = UTC 13:00）
    new events.Rule(this, 'NightModeRule', {
      schedule: events.Schedule.cron({ hour: '13', minute: '0' }),
      targets: [new targets.LambdaFunction(trafficController, {
        event: events.RuleTargetInput.fromObject({ mode: 'active-passive' }),
      })],
    });

    // スケジュール: 通常モードへ（日本時間 8:00 = UTC 23:00前日）
    new events.Rule(this, 'DayModeRule', {
      schedule: events.Schedule.cron({ hour: '23', minute: '0' }),
      targets: [new targets.LambdaFunction(trafficController, {
        event: events.RuleTargetInput.fromObject({ mode: 'active-active' }),
      })],
    });
  }
}
```

### コスト削減効果

| 項目 | Active-Active | Active-Passive | 削減率 |
|------|--------------|----------------|--------|
| ECS Fargate | $3,000/月 | $1,500/月 | 50% |
| ALB | $600/月 | $300/月 | 50% |
| NAT Gateway | $300/月 | $150/月 | 50% |
| **合計** | $3,900/月 | $1,950/月 | **50%** |

※ 夜間（8時間）のみ Active-Passive の場合の概算

</details>

---

## 9. 発展課題

### 発展課題1: Global Accelerator の導入（難易度：中級）

**課題内容**:
Route 53 のジオロケーションルーティングに加えて、
AWS Global Accelerator を導入し、より高速で安定した接続を実現してください。

### 発展課題2: マルチリージョン CI/CD（難易度：上級）

**課題内容**:
3リージョン同時デプロイの CI/CD パイプラインを構築してください。

**要件**:
- Blue/Green デプロイ
- リージョン間のカナリアリリース
- 自動ロールバック

### 発展課題3: Chaos Engineering（難易度：上級）

**課題内容**:
AWS Fault Injection Simulator を使用して、
リージョン障害シナリオのテストを実施してください。

---

## 10. 学習のポイント

### 学習のまとめ

本課題で学んだこと:
- マルチリージョンアーキテクチャの設計パターン
- Route 53 のルーティングポリシー
- DynamoDB Global Tables
- Aurora Global Database
- データレジデンシー・GDPR 対応
- AWS CDK でのマルチリージョンデプロイ

---

## 11. 推定コストと注意事項

### 本課題の推定コスト（3リージョン構成）

| サービス | 構成 | 月額コスト |
|----------|------|-----------|
| Route 53 | ホストゾーン + クエリ | $50 |
| CloudFront | 100GB転送 | $100 |
| ALB (x3) | 各リージョン | $100 |
| ECS Fargate (x3) | 各2タスク | $300 |
| Aurora Global | Primary + 2 Replica | $600 |
| DynamoDB Global | 3リージョン | $100 |
| **合計** | | **$1,250/月** |

### 注意事項

```
⚠️ データ転送コスト
- リージョン間のデータ転送は課金対象
- レプリケーション量を監視

⚠️ Global Tables の制限
- 書き込み競合は Last Writer Wins
- 同一アイテムの同時更新に注意

⚠️ Aurora Global Database
- フェイルオーバーは手動推奨
- 昇格後のリージョン再構成が必要
```

---

**課題作成日**: 2024年1月
**最終更新日**: 2024年1月
**作成者**: AWS学習プログラム
