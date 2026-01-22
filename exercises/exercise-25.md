# 課題25: DynamoDB実践設計 - シングルテーブル設計とGSI最適化

**難易度: 🟡 中級**

---

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | データベース / NoSQL設計 |
| 処理タイプ | リアルタイム |
| 使用IaC | CloudFormation |
| 想定所要時間 | 5-6時間 |

---

## シナリオ

### 企業プロファイル: 〇〇株式会社

```
┌─────────────────────────────────────────────────────────────────┐
│                    〇〇株式会社                                   │
│                  総合ECプラットフォーム                           │
├─────────────────────────────────────────────────────────────────┤
│  設立: 2018年    従業員: 120名    本社: 東京                     │
│  事業: BtoC総合EC（家電・ファッション・食品・日用品）             │
│  年商: 50億円    月間PV: 500万    会員数: 80万人                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【現在のデータ規模】                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   商品数     │ │   注文数     │ │  ユーザー数   │            │
│  │  10万 SKU   │ │  10万件/月  │ │   80万人     │            │
│  │ (4カテゴリ) │ │ (ピーク3倍) │ │ (MAU 20万)  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│  【現在の課題】                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  MySQL (RDS r5.xlarge)                                      ││
│  │  ・応答時間: 平均500ms（ピーク時2秒超）                     ││
│  │  ・スケーリング: 垂直スケール限界                           ││
│  │  ・コスト: 月額30万円（読み取りリプリカ含む）               ││
│  │  ・JOIN多用でクエリ複雑化                                   ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【移行目標】                                                    │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  DynamoDB (On-Demand + DAX)                                 ││
│  │  ・応答時間: 50ms以下（ピーク時も安定）                     ││
│  │  ・スケーリング: 自動水平スケール                           ││
│  │  ・コスト: 月額15万円（50%削減目標）                        ││
│  │  ・シングルテーブル設計でシンプル化                         ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 現在のRDBスキーマ（移行元）

```
┌─────────────────────────────────────────────────────────────────┐
│                    現在のMySQL スキーマ                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   users     │     │   orders    │     │ order_items │       │
│  ├─────────────┤     ├─────────────┤     ├─────────────┤       │
│  │ user_id PK  │◄────│ user_id FK  │     │ order_id FK │───────│
│  │ email       │     │ order_id PK │◄────│ product_id  │       │
│  │ name        │     │ status      │     │ quantity    │       │
│  │ created_at  │     │ total       │     │ price       │       │
│  │ tier        │     │ created_at  │     │ item_id PK  │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                                       │                │
│         │            ┌─────────────┐            │                │
│         │            │  products   │            │                │
│         │            ├─────────────┤            │                │
│         └───────────►│ product_id  │◄───────────┘                │
│   (お気に入り)       │ name        │                             │
│                      │ category    │                             │
│                      │ price       │                             │
│                      │ stock       │                             │
│                      │ created_at  │                             │
│                      └─────────────┘                             │
│                                                                  │
│  【問題となるクエリ例】                                          │
│  ・ユーザーの注文履歴 + 商品詳細: 3テーブルJOIN                  │
│  ・カテゴリ別売上ランキング: 集計 + ソート                       │
│  ・在庫アラート: フルテーブルスキャン                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ビジネス要件と KPI

```
┌─────────────────────────────────────────────────────────────────┐
│                    移行プロジェクト KPI                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【パフォーマンス目標】                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  指標              │ 現状        │ 目標        │ 改善率    ││
│  ├────────────────────┼─────────────┼─────────────┼───────────┤│
│  │  商品詳細取得      │ 150ms       │ < 10ms      │ 93%↓     ││
│  │  注文履歴取得      │ 500ms       │ < 50ms      │ 90%↓     ││
│  │  カート操作        │ 200ms       │ < 20ms      │ 90%↓     ││
│  │  検索・一覧        │ 800ms       │ < 100ms     │ 87%↓     ││
│  │  ピーク時P99       │ 3000ms      │ < 200ms     │ 93%↓     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【コスト目標】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目              │ 現状        │ 目標        │ 削減額    ││
│  ├────────────────────┼─────────────┼─────────────┼───────────┤│
│  │  データベース      │ ¥300,000    │ ¥150,000    │ ¥150,000  ││
│  │  キャッシュ        │ ¥50,000     │ DAX込み     │ ¥50,000   ││
│  │  運用工数          │ 20h/月      │ 5h/月       │ 15h削減   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【アクセスパターン分析】                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  パターン                  │ 頻度/日    │ 優先度          ││
│  ├────────────────────────────┼────────────┼─────────────────┤│
│  │  商品詳細を商品IDで取得    │ 500,000    │ ★★★★★          ││
│  │  ユーザーの注文履歴取得    │ 100,000    │ ★★★★★          ││
│  │  注文の詳細取得            │ 50,000     │ ★★★★☆          ││
│  │  カテゴリ別商品一覧        │ 200,000    │ ★★★★★          ││
│  │  ユーザー情報取得          │ 300,000    │ ★★★★★          ││
│  │  在庫数確認・更新          │ 100,000    │ ★★★★☆          ││
│  │  売上ランキング            │ 10,000     │ ★★★☆☆          ││
│  │  商品検索（名前）          │ 80,000     │ ★★★☆☆          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 達成目標

### 習得スキル

```
┌─────────────────────────────────────────────────────────────────┐
│                       学習目標マップ                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【主要スキル】                                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  1. DynamoDB シングルテーブル設計                           ││
│  │     ├── アクセスパターン分析手法                            ││
│  │     ├── PK/SK設計パターン                                   ││
│  │     ├── エンティティの多重化                                ││
│  │     └── Overloaded GSI設計                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  2. GSI（グローバルセカンダリインデックス）最適化           ││
│  │     ├── GSI Overloading                                     ││
│  │     ├── Sparse Index                                        ││
│  │     ├── GSI射影の最適化                                     ││
│  │     └── GSIとLSIの使い分け                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  3. DynamoDB パフォーマンス最適化                           ││
│  │     ├── DAX（DynamoDB Accelerator）                         ││
│  │     ├── パーティション設計                                  ││
│  │     ├── ホットパーティション対策                            ││
│  │     └── バッチ操作の活用                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  4. CloudFormationによるDynamoDB構築                        ││
│  │     ├── テーブル・GSI定義                                   ││
│  │     ├── Auto Scaling設定                                    ││
│  │     ├── ストリーム・TTL設定                                 ││
│  │     └── バックアップ・PITR設定                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【副次スキル】                                                  │
│  ・RDBからNoSQLへの思考転換                                      │
│  ・データ移行戦略（DMS活用）                                     │
│  ・コスト最適化（On-Demand vs Provisioned）                      │
│  ・監視・アラート設計                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### GCPとの対応関係

| AWS サービス | GCP 対応サービス | 主な違い |
|-------------|-----------------|---------|
| DynamoDB | Cloud Bigtable / Firestore | DynamoDBはフルマネージド、Bigtableは大規模分析向け |
| DynamoDB Streams | Firestore Listeners | イベント駆動アーキテクチャ |
| DAX | Memorystore | DAXはDynamoDB専用、透過的キャッシュ |
| DynamoDB Global Tables | Firestore Multi-region | グローバルレプリケーション |

---

## 学習するAWSサービス

```
┌─────────────────────────────────────────────────────────────────┐
│                    使用AWSサービス一覧                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【コアサービス】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  サービス          │ 用途                    │ 重要度      ││
│  ├────────────────────┼─────────────────────────┼─────────────┤│
│  │  DynamoDB          │ メインデータベース      │ ★★★★★      ││
│  │  DAX               │ インメモリキャッシュ    │ ★★★★☆      ││
│  │  DynamoDB Streams  │ 変更データキャプチャ    │ ★★★★☆      ││
│  │  CloudFormation    │ インフラ定義            │ ★★★★★      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【支援サービス】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  サービス          │ 用途                    │ 重要度      ││
│  ├────────────────────┼─────────────────────────┼─────────────┤│
│  │  Lambda            │ ストリーム処理          │ ★★★☆☆      ││
│  │  CloudWatch        │ 監視・アラート          │ ★★★★☆      ││
│  │  DMS               │ データ移行              │ ★★★☆☆      ││
│  │  S3                │ バックアップ保存        │ ★★★☆☆      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 前提条件

### 必要な環境

```bash
# AWS CLI バージョン確認
aws --version
# aws-cli/2.x.x 以上

# Python環境（boto3用）
python3 --version
# Python 3.9以上

# Node.js（Lambda関数用）
node --version
# v18.x 以上

# NoSQL Workbench（推奨）
# https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html
```

### AWS環境の準備

```bash
# 環境変数設定
export AWS_REGION=ap-northeast-1
export PROJECT_NAME=megamart
export ENVIRONMENT=dev

# 作業ディレクトリ作成
mkdir -p ~/megamart-dynamodb/{cfn,scripts,data,lambda}
cd ~/megamart-dynamodb
```

### IAMポリシー（必要な権限）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:*",
        "dax:*",
        "application-autoscaling:*",
        "cloudwatch:*",
        "lambda:*",
        "iam:PassRole",
        "iam:CreateServiceLinkedRole",
        "cloudformation:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## トラブルシューティング課題

### 課題1: ホットパーティション問題

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング課題 1                        │
│                ホットパーティション問題                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  セール開始後、特定商品のアクセスが集中し、                      │
│  スロットリングエラーが大量発生している。                        │
│                                                                  │
│  【エラーログ】                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  "1つのテーブルで全エンティティを管理"                      ││
│  │  "アクセスパターンに基づいてキーを設計"                     ││
│  │  "JOINをプリコンピュートで置き換え"                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【テーブル構造】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Table: megamart-main                                       ││
│  │  ├── Partition Key (PK): String                             ││
│  │  ├── Sort Key (SK): String                                  ││
│  │  ├── GSI1PK / GSI1SK: Overloaded GSI                        ││
│  │  ├── GSI2PK / GSI2SK: Category Index                        ││
│  │  └── GSI3PK / GSI3SK: Status Index                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【エンティティとキー設計】                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Entity    │ PK              │ SK                    │ GSI1 │ │
│  ├───────────┼─────────────────┼───────────────────────┼──────┤ │
│  │ User      │ USER#<userId>   │ PROFILE               │ EMAIL│ │
│  │ Product   │ PROD#<prodId>   │ INFO                  │ CAT  │ │
│  │ Order     │ USER#<userId>   │ ORDER#<orderId>       │ DATE │ │
│  │ OrderItem │ ORDER#<orderId> │ ITEM#<itemId>         │ -    │ │
│  │ Cart      │ USER#<userId>   │ CART#<prodId>         │ -    │ │
│  │ Inventory │ PROD#<prodId>   │ INVENTORY             │ LOW  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### アクセスパターンとキー設計

```
┌─────────────────────────────────────────────────────────────────┐
│                   アクセスパターン詳細設計                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【パターン1】ユーザー情報取得                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Query: PK = "USER#123" AND SK = "PROFILE"                  ││
│  │  Response time: < 5ms (GetItem)                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【パターン2】ユーザーの全注文履歴                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Query: PK = "USER#123" AND SK begins_with "ORDER#"         ││
│  │  Sort: SK DESC (新しい順)                                   ││
│  │  Response time: < 20ms                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【パターン3】注文詳細（アイテム含む）                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Query: PK = "ORDER#456" AND SK begins_with "ITEM#"         ││
│  │  + GetItem: PK = "ORDER#456" SK = "INFO"                    ││
│  │  Response time: < 15ms (BatchGetItem)                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【パターン4】カテゴリ別商品一覧                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  GSI2 Query: GSI2PK = "CAT#Electronics" AND GSI2SK < price  ││
│  │  Sort: Price ASC/DESC                                       ││
│  │  Response time: < 30ms                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【パターン5】ステータス別注文（管理画面）                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  GSI3 Query: GSI3PK = "STATUS#PENDING"                      ││
│  │  Sparse Index: statusがPENDINGの注文のみ                    ││
│  │  Response time: < 25ms                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【パターン6】低在庫アラート                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  GSI1 Query: GSI1PK = "LOW_STOCK" AND GSI1SK < threshold    ││
│  │  Sparse Index: 在庫が閾値以下のみ                           ││
│  │  Response time: < 20ms                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 全体アーキテクチャ

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group api_layer(server)[API Layer] in aws
    group data_layer(database)[Data Layer] in aws
    group stream_layer(server)[Stream Processing] in aws

    service client(internet)[Client Web/App]

    service apigw(server)[API Gateway] in api_layer
    service lambda(server)[Lambda Functions] in api_layer

    service dax(database)[DAX Cluster Cache] in data_layer
    service dynamodb(database)[DynamoDB Table] in data_layer
    service streams(database)[DynamoDB Streams] in data_layer

    service stream_proc(server)[Stream Processor Lambda] in stream_layer
    service agg_lambda(server)[Aggregation Lambda] in stream_layer
    service opensearch(database)[OpenSearch] in stream_layer
    service s3backup(disk)[S3 Backup PITR] in stream_layer

    client:R --> L:apigw
    apigw:B --> T:lambda
    lambda:B --> T:dax
    lambda:B --> T:dynamodb
    dynamodb:B --> T:streams
    streams:B --> T:stream_proc
    stream_proc:R --> L:agg_lambda
    stream_proc:R --> L:opensearch
    stream_proc:R --> L:s3backup
```

---

## トラブルシューティング課題

### 課題1: ホットパーティション問題

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-1                      │
│                ホットパーティション問題                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  セール開始後、特定商品のアクセスが集中し、                      │
│  スロットリングエラーが大量発生している。                        │
│                                                                  │
│  【エラーログ】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ProvisionedThroughputExceededException:                    ││
│  │  The level of configured provisioned throughput for the     ││
│  │  table was exceeded.                                        ││
│  │                                                              ││
│  │  Error Count: 500/min                                       ││
│  │  Affected Keys: PROD#P0001, PROD#P0002, PROD#P0003          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. 原因を特定してください                                       │
│  2. 短期的な対処を実施してください                               │
│  3. 長期的な改善策を提案してください                             │
│                                                                  │
│  【ヒント】                                                      │
│  - CloudWatchメトリクス: ConsumedReadCapacityUnits              │
│  - Contributor Insights                                         │
│  - Write Sharding パターン                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**解決策例**

```python
# 1. 原因調査スクリプト
import boto3

cloudwatch = boto3.client('cloudwatch')

# Contributor Insights を有効化して確認
dynamodb = boto3.client('dynamodb')
dynamodb.update_contributor_insights(
    TableName='megamart-main-dev',
    ContributorInsightsAction='ENABLE'
)

# ホットキーを特定
response = dynamodb.describe_contributor_insights(
    TableName='megamart-main-dev'
)

# 2. 短期対処: On-Demandモードへ切り替え（または容量増加）
dynamodb.update_table(
    TableName='megamart-main-dev',
    BillingMode='PAY_PER_REQUEST'
)

# 3. 長期対策: Write Shardingパターン実装
import random

def get_sharded_pk(product_id: str, shard_count: int = 10) -> str:
    """商品IDにシャードサフィックスを追加"""
    shard = random.randint(0, shard_count - 1)
    return f'PROD#{product_id}#SHARD{shard}'

def get_product_with_sharding(product_id: str, shard_count: int = 10):
    """全シャードから商品情報を取得"""
    table = boto3.resource('dynamodb').Table('megamart-main-dev')

    # 全シャードに対してBatchGetItem
    keys = [
        {'PK': f'PROD#{product_id}#SHARD{i}', 'SK': 'VIEW_COUNT'}
        for i in range(shard_count)
    ]

    response = table.meta.client.batch_get_item(
        RequestItems={
            'megamart-main-dev': {
                'Keys': keys
            }
        }
    )

    # 集計
    total_views = sum(
        item.get('viewCount', 0)
        for item in response['Responses'].get('megamart-main-dev', [])
    )
    return total_views
```

### 演習8-2: GSIのスロットリング

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-2                      │
│                  GSIスロットリング                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  カテゴリ別商品一覧（GSI2）へのクエリが遅延している。            │
│  メインテーブルは正常だが、GSIのみスロットリング発生。           │
│                                                                  │
│  【CloudWatchメトリクス】                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Table ConsumedRCU: 1000 (正常)                             ││
│  │  GSI2 ConsumedRCU: 5000 (限界超過)                          ││
│  │  GSI2 ThrottledRequests: 200/min                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. GSIスロットリングの原因を説明してください                    │
│  2. Projectionの最適化を検討してください                         │
│  3. クエリパターンの見直しを提案してください                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**解決策例**

```python
# 1. GSIの現状確認
import boto3

dynamodb = boto3.client('dynamodb')

response = dynamodb.describe_table(TableName='megamart-main-dev')
for gsi in response['Table']['GlobalSecondaryIndexes']:
    if gsi['IndexName'] == 'GSI2':
        print(f"Projection Type: {gsi['Projection']['ProjectionType']}")
        print(f"Non-Key Attributes: {gsi['Projection'].get('NonKeyAttributes', [])}")

# 2. Projectionの最適化 - KEYS_ONLYまたは必要最小限のINCLUDE
# 現在のPROJECT ALLを変更する場合、GSIの再作成が必要

# CloudFormation更新例
"""
GlobalSecondaryIndexes:
  - IndexName: GSI2
    KeySchema:
      - AttributeName: GSI2PK
        KeyType: HASH
      - AttributeName: GSI2SK
        KeyType: RANGE
    Projection:
      ProjectionType: INCLUDE
      NonKeyAttributes:
        - name      # 商品名のみ
        - price     # 価格のみ
        # imageUrl, description などは除外
"""

# 3. クエリパターン最適化 - ページネーション
def get_products_paginated(category: str, page_size: int = 20,
                           last_key: dict = None):
    """ページネーション対応のカテゴリ検索"""
    table = boto3.resource('dynamodb').Table('megamart-main-dev')

    query_params = {
        'IndexName': 'GSI2',
        'KeyConditionExpression': 'GSI2PK = :cat',
        'ExpressionAttributeValues': {':cat': f'CAT#{category}'},
        'Limit': page_size,
        'ProjectionExpression': 'productId, #name, price',  # 必要な属性のみ
        'ExpressionAttributeNames': {'#name': 'name'}
    }

    if last_key:
        query_params['ExclusiveStartKey'] = last_key

    response = table.query(**query_params)

    return {
        'items': response['Items'],
        'lastKey': response.get('LastEvaluatedKey'),
        'hasMore': 'LastEvaluatedKey' in response
    }
```

### 演習8-3: トランザクション競合

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-3                      │
│                 トランザクション競合                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  人気商品の注文処理で、在庫更新のトランザクションが              │
│  頻繁にキャンセルされている。                                    │
│                                                                  │
│  【エラーログ】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  TransactionCanceledException:                               ││
│  │  Transaction cancelled, please refer to the cancellation    ││
│  │  reasons for specific reasons.                               ││
│  │                                                              ││
│  │  CancellationReasons:                                        ││
│  │  - Code: TransactionConflict                                 ││
│  │    Item: PROD#P0001/INVENTORY                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. トランザクション競合の原因を説明してください                 │
│  2. リトライ戦略を実装してください                               │
│  3. 楽観的ロックパターンを検討してください                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**解決策例**

```python
import boto3
import time
import random
from botocore.exceptions import ClientError

class TransactionHelper:
    """トランザクション競合対策ヘルパー"""

    def __init__(self, table_name: str):
        self.client = boto3.client('dynamodb')
        self.table_name = table_name

    def execute_with_retry(self, transact_items: list,
                           max_retries: int = 5,
                           base_delay: float = 0.1) -> dict:
        """指数バックオフ付きリトライ"""
        for attempt in range(max_retries):
            try:
                response = self.client.transact_write_items(
                    TransactItems=transact_items
                )
                return response
            except ClientError as e:
                error_code = e.response['Error']['Code']

                if error_code == 'TransactionCanceledException':
                    reasons = e.response.get('CancellationReasons', [])

                    # 競合以外のエラーは再スロー
                    if not any(r.get('Code') == 'TransactionConflict' for r in reasons):
                        raise

                    # 最後の試行なら例外をスロー
                    if attempt == max_retries - 1:
                        raise

                    # 指数バックオフ + ジッター
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.1)
                    print(f"Transaction conflict, retrying in {delay:.3f}s...")
                    time.sleep(delay)
                else:
                    raise

    def update_with_optimistic_lock(self, pk: str, sk: str,
                                     update_expr: str,
                                     expr_values: dict) -> dict:
        """楽観的ロック（バージョン番号）パターン"""
        table = boto3.resource('dynamodb').Table(self.table_name)

        # 現在のバージョンを取得
        current = table.get_item(Key={'PK': pk, 'SK': sk})
        current_version = current.get('Item', {}).get('version', 0)

        # バージョンチェック付き更新
        try:
            response = table.update_item(
                Key={'PK': pk, 'SK': sk},
                UpdateExpression=update_expr + ', version = :new_version',
                ConditionExpression='version = :current_version',
                ExpressionAttributeValues={
                    **expr_values,
                    ':current_version': current_version,
                    ':new_version': current_version + 1
                },
                ReturnValues='ALL_NEW'
            )
            return response['Attributes']
        except ClientError as e:
            if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                raise ValueError("Optimistic lock failed - item was modified")
            raise

# 使用例
helper = TransactionHelper('megamart-main-dev')

# 在庫更新をリトライ付きで実行
transact_items = [
    {
        'Update': {
            'TableName': 'megamart-main-dev',
            'Key': {
                'PK': {'S': 'PROD#P0001'},
                'SK': {'S': 'INVENTORY'}
            },
            'UpdateExpression': 'SET stock = stock - :qty',
            'ConditionExpression': 'stock >= :qty',
            'ExpressionAttributeValues': {
                ':qty': {'N': '1'}
            }
        }
    }
]

result = helper.execute_with_retry(transact_items)
```

---

## 設計課題

### 設計課題9-1: マルチテナント対応設計

```
┌─────────────────────────────────────────────────────────────────┐
│                      設計課題 9-1                                │
│                 マルチテナント対応設計                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【課題】                                                        │
│  MegaMartがマーケットプレイス機能を追加し、                      │
│  複数の出店者（テナント）をサポートする必要がある。              │
│                                                                  │
│  【要件】                                                        │
│  ・各テナントは自分のデータのみアクセス可能                      │
│  ・テナント間でデータは完全に分離                                │
│  ・テナントごとの利用量を把握したい                              │
│  ・テナント数は最大1000社を想定                                  │
│                                                                  │
│  【成果物】                                                      │
│  1. テナント分離のキー設計                                       │
│  2. アクセス制御の実装方針                                       │
│  3. 利用量計測の仕組み                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**設計例**

```
┌─────────────────────────────────────────────────────────────────┐
│                マルチテナント設計パターン                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【パターン1: テナントプレフィックス方式】                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  PK                        │ SK                             ││
│  ├────────────────────────────┼────────────────────────────────┤│
│  │  TENANT#T001#PROD#P0001    │ INFO                           ││
│  │  TENANT#T001#USER#U0001    │ PROFILE                        ││
│  │  TENANT#T001#USER#U0001    │ ORDER#O0001                    ││
│  │  TENANT#T002#PROD#P0001    │ INFO                           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  利点: シンプル、完全分離                                        │
│  欠点: クロステナントクエリ不可                                  │
│                                                                  │
│  【パターン2: テナント専用GSI方式】                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  PK              │ SK            │ tenantId │ GSI1PK        ││
│  ├──────────────────┼───────────────┼──────────┼───────────────┤│
│  │  PROD#P0001      │ INFO          │ T001     │ T001#PROD     ││
│  │  USER#U0001      │ PROFILE       │ T001     │ T001#USER     ││
│  │  USER#U0002      │ PROFILE       │ T002     │ T002#USER     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  利点: 柔軟なクエリ、プラットフォーム管理機能可能               │
│  欠点: アクセス制御をアプリで実装必要                           │
│                                                                  │
│  【アクセス制御実装】                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  class TenantAwareDB:                                       ││
│  │      def __init__(self, tenant_id: str):                    ││
│  │          self.tenant_id = tenant_id                         ││
│  │                                                              ││
│  │      def get_item(self, pk, sk):                            ││
│  │          # テナントプレフィックスを自動付与                 ││
│  │          prefixed_pk = f"TENANT#{self.tenant_id}#{pk}"      ││
│  │          return self.table.get_item(Key={...})              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【利用量計測】                                                  │
│  ・DynamoDB Streams → Lambda → 集計テーブル                     │
│  ・CloudWatch メトリクスフィルター（tenantIdディメンション）    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 設計課題9-2: 検索機能の拡張

```
┌─────────────────────────────────────────────────────────────────┐
│                      設計課題 9-2                                │
│                   検索機能の拡張                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【課題】                                                        │
│  商品の全文検索、ファセット検索、あいまい検索を実現したい。      │
│  DynamoDB単体では実現困難な検索要件への対応が必要。              │
│                                                                  │
│  【要件】                                                        │
│  ・商品名、説明文での全文検索                                    │
│  ・価格帯、カテゴリ、評価でのファセット検索                      │
│  ・タイプミスを許容するあいまい検索                              │
│  ・検索結果のランキング（人気順、関連度順）                      │
│                                                                  │
│  【成果物】                                                      │
│  1. OpenSearch連携アーキテクチャ                                 │
│  2. データ同期パイプライン設計                                   │
│  3. 検索APIの設計                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 発展課題

### 発展課題10-1: グローバルテーブル設計

```
┌─────────────────────────────────────────────────────────────────┐
│                      発展課題 10-1                               │
│                グローバルテーブル設計                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【シナリオ】                                                    │
│  MegaMartがアジア太平洋地域（日本、シンガポール、シドニー）に    │
│  展開することになった。各リージョンでの低レイテンシアクセスと    │
│  データ整合性を両立する設計が必要。                              │
│                                                                  │
│  【技術要件】                                                    │
│  ・各リージョンで50ms以下の応答時間                              │
│  ・リージョン障害時の自動フェイルオーバー                        │
│  ・在庫データの整合性保証                                        │
│  ・コスト効率の良い設計                                          │
│                                                                  │
│  【成果物】                                                      │
│  1. グローバルテーブルのCloudFormation                           │
│  2. コンフリクト解決戦略                                         │
│  3. リージョン間レプリケーション監視                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 発展課題10-2: コスト最適化分析

```
┌─────────────────────────────────────────────────────────────────┐
│                      発展課題 10-2                               │
│                   コスト最適化分析                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【シナリオ】                                                    │
│  現在On-Demandモードで運用しているが、月額コストが予想を超えた。 │
│  Provisionedモード + Auto Scalingへの移行を検討中。              │
│                                                                  │
│  【現状データ】                                                  │
│  ・月間読み取りリクエスト: 1億回                                 │
│  ・月間書き込みリクエスト: 2000万回                              │
│  ・ピーク時間帯: 12:00-14:00, 20:00-23:00                        │
│  ・ピーク時は平常時の3倍のトラフィック                           │
│  ・現在のコスト: 月額約20万円                                    │
│                                                                  │
│  【成果物】                                                      │
│  1. コスト分析レポート                                           │
│  2. 最適な課金モードの提案                                       │
│  3. Reserved Capacityの検討                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 学習のポイント

### 学習チェックリスト

```
┌─────────────────────────────────────────────────────────────────┐
│                     学習チェックリスト                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【基礎知識】                                                    │
│  □ DynamoDBのキー設計原則を説明できる                           │
│  □ シングルテーブル設計のメリット・デメリットを理解した         │
│  □ GSI/LSIの使い分けを説明できる                                │
│  □ パーティションの概念を理解した                               │
│                                                                  │
│  【実践スキル】                                                  │
│  □ アクセスパターン分析からキー設計ができる                     │
│  □ CloudFormationでDynamoDBを構築できる                         │
│  □ boto3でCRUD操作を実装できる                                  │
│  □ トランザクションを適切に使用できる                           │
│                                                                  │
│  【最適化】                                                      │
│  □ DAXの導入判断と設定ができる                                  │
│  □ ホットパーティション対策を説明できる                         │
│  □ GSI射影の最適化ができる                                      │
│  □ コスト最適化の観点で設計できる                               │
│                                                                  │
│  【運用】                                                        │
│  □ DynamoDB Streamsを活用できる                                 │
│  □ CloudWatchで監視設定ができる                                 │
│  □ バックアップ・リストア手順を理解した                         │
│  □ トラブルシューティングの手順を確立した                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### RDBとDynamoDBの思考転換

```
┌─────────────────────────────────────────────────────────────────┐
│                RDB → DynamoDB 思考転換ガイド                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【RDB的思考】              【DynamoDB的思考】                   │
│  ────────────────────────────────────────────────────           │
│  エンティティごとに        → 1つのテーブルに                    │
│  テーブルを作成              全エンティティを格納                │
│                                                                  │
│  正規化して冗長性排除      → 非正規化してアクセス最適化          │
│                                                                  │
│  JOINで関連データ取得      → 事前計算・重複保存                  │
│                                                                  │
│  スキーマ先行設計          → アクセスパターン先行設計            │
│                                                                  │
│  インデックス後付け        → GSI/LSI事前設計必須                 │
│                                                                  │
│  トランザクション多用      → トランザクション最小限              │
│                              （単一アイテム操作推奨）            │
│                                                                  │
│  SQLで柔軟なクエリ         → 限定されたクエリパターン            │
│                              （Query/Scan/GetItem）              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 想定コストと削減方法

### 想定コスト（月額）

```
┌─────────────────────────────────────────────────────────────────┐
│                      コスト見積もり                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【On-Demandモード（開発環境）】                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                    │ 数量            │ 月額（USD）    ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  読み取りリクエスト      │ 100万回         │ $0.25          ││
│  │  書き込みリクエスト      │ 50万回          │ $0.63          ││
│  │  ストレージ              │ 1GB             │ $0.25          ││
│  │  DynamoDB Streams        │ 100万回         │ $0.02          ││
│  │  バックアップ            │ 1GB             │ $0.10          ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $1.25       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【本番環境想定（On-Demand）】                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                    │ 数量            │ 月額（USD）    ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  読み取りリクエスト      │ 1億回           │ $25.00         ││
│  │  書き込みリクエスト      │ 2000万回        │ $25.00         ││
│  │  ストレージ              │ 50GB            │ $12.50         ││
│  │  GSI（3個）              │ 各50GB          │ $37.50         ││
│  │  DynamoDB Streams        │ 2000万回        │ $0.40          ││
│  │  DAX（2ノード t3.small） │ 730時間×2       │ $58.40         ││
│  │  バックアップ（PITR）    │ 100GB           │ $20.00         ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $180        ││
│  │                          │                 │ (約 ¥27,000)   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【コスト削減のポイント】                                        │
│  ・Reserved Capacity: 年間契約で最大76%削減                      │
│  ・TTLによる自動削除: 不要データの自動クリーンアップ             │
│  ・GSI射影最適化: KEYS_ONLYまたは必要最小限のINCLUDE            │
│  ・適切なDAXサイズ選定: キャッシュヒット率の監視                 │
│                                                                  │
│  【無料利用枠（AWS Free Tier）】                                 │
│  ・25GBストレージ                                                │
│  ・25 WCU / 25 RCU（Provisioned）                                │
│  ・2億リクエスト/月（DynamoDB Streams）                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## リソースのクリーンアップ

```bash
# 1. CloudFormationスタック削除
aws cloudformation delete-stack --stack-name megamart-monitoring-dev
aws cloudformation delete-stack --stack-name megamart-stream-processor-dev
aws cloudformation delete-stack --stack-name megamart-dax-dev
aws cloudformation delete-stack --stack-name megamart-dynamodb-dev

# 2. 削除完了を待機
aws cloudformation wait stack-delete-complete --stack-name megamart-dynamodb-dev

# 3. 作業ディレクトリのクリーンアップ
rm -rf ~/megamart-dynamodb

echo "Cleanup completed!"
```

---

**次の課題**: [課題34: PayEasy Step Functionsワークフロー](exercise-34.md)

**前の課題**: [課題32: TaskFlow マルチリージョン構成](exercise-32.md)
