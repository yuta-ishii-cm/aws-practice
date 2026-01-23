# 課題30: DynamoDB実践設計 - シングルテーブル設計とGSI最適化

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | データベース / NoSQL設計 |
| 処理タイプ | リアルタイム |
| 使用IaC | CloudFormation |
| 想定所要時間 | 5-6時間 |

---

## 2. ビジネスシナリオ

### 企業プロファイル: 〇〇株式会社

| 項目 | 内容 |
|------|------|
| **企業名** | 〇〇株式会社 |
| **業種** | 総合ECプラットフォーム |
| **設立** | 2018年 |
| **従業員数** | 120名 |
| **本社** | 東京 |
| **事業** | BtoC総合EC（家電・ファッション・食品・日用品） |
| **年商** | 50億円 |
| **月間PV** | 500万 |
| **会員数** | 80万人 |

#### 現在のデータ規模

| 項目 | 数量 |
|------|------|
| 商品数 | 10万 SKU（4カテゴリ） |
| 注文数 | 10万件/月（ピーク3倍） |
| ユーザー数 | 80万人（MAU 20万） |

#### 現在の課題（MySQL / RDS r5.xlarge）

- 応答時間: 平均500ms（ピーク時2秒超）
- スケーリング: 垂直スケール限界
- コスト: 月額30万円（読み取りリプリカ含む）
- JOIN多用でクエリ複雑化

#### 移行目標（DynamoDB / On-Demand + DAX）

- 応答時間: 50ms以下（ピーク時も安定）
- スケーリング: 自動水平スケール
- コスト: 月額15万円（50%削減目標）
- シングルテーブル設計でシンプル化

### 現在のRDBスキーマ（移行元）

| テーブル | カラム | 説明 |
|----------|--------|------|
| **users** | user_id (PK), email, name, created_at, tier | ユーザー情報 |
| **orders** | order_id (PK), user_id (FK), status, total, created_at | 注文情報 |
| **order_items** | item_id (PK), order_id (FK), product_id (FK), quantity, price | 注文明細 |
| **products** | product_id (PK), name, category, price, stock, created_at | 商品情報 |

**問題となるクエリ例:**
- ユーザーの注文履歴 + 商品詳細: 3テーブルJOIN
- カテゴリ別売上ランキング: 集計 + ソート
- 在庫アラート: フルテーブルスキャン

### ビジネス要件と KPI

#### パフォーマンス目標

| 指標 | 現状 | 目標 | 改善率 |
|------|------|------|--------|
| 商品詳細取得 | 150ms | < 10ms | 93%↓ |
| 注文履歴取得 | 500ms | < 50ms | 90%↓ |
| カート操作 | 200ms | < 20ms | 90%↓ |
| 検索・一覧 | 800ms | < 100ms | 87%↓ |
| ピーク時P99 | 3000ms | < 200ms | 93%↓ |

#### コスト目標

| 項目 | 現状 | 目標 | 削減額 |
|------|------|------|--------|
| データベース | ¥300,000 | ¥150,000 | ¥150,000 |
| キャッシュ | ¥50,000 | DAX込み | ¥50,000 |
| 運用工数 | 20h/月 | 5h/月 | 15h削減 |

#### アクセスパターン分析

| パターン | 頻度/日 | 優先度 |
|----------|---------|--------|
| 商品詳細を商品IDで取得 | 500,000 | ★★★★★ |
| ユーザーの注文履歴取得 | 100,000 | ★★★★★ |
| 注文の詳細取得 | 50,000 | ★★★★☆ |
| カテゴリ別商品一覧 | 200,000 | ★★★★★ |
| ユーザー情報取得 | 300,000 | ★★★★★ |
| 在庫数確認・更新 | 100,000 | ★★★★☆ |
| 売上ランキング | 10,000 | ★★★☆☆ |
| 商品検索（名前） | 80,000 | ★★★☆☆ |

---

## 3. 学習目標

### 習得スキル

#### 主要スキル

**1. DynamoDB シングルテーブル設計**
- アクセスパターン分析手法
- PK/SK設計パターン
- エンティティの多重化
- Overloaded GSI設計

**2. GSI（グローバルセカンダリインデックス）最適化**
- GSI Overloading
- Sparse Index
- GSI射影の最適化
- GSIとLSIの使い分け

**3. DynamoDB パフォーマンス最適化**
- DAX（DynamoDB Accelerator）
- パーティション設計
- ホットパーティション対策
- バッチ操作の活用

**4. CloudFormationによるDynamoDB構築**
- テーブル・GSI定義
- Auto Scaling設定
- ストリーム・TTL設定
- バックアップ・PITR設定

#### 副次スキル

- RDBからNoSQLへの思考転換
- データ移行戦略（DMS活用）
- コスト最適化（On-Demand vs Provisioned）
- 監視・アラート設計

---

## 4. 使用するAWSサービス

### コアサービス

| サービス | 用途 | 重要度 |
|----------|------|--------|
| DynamoDB | メインデータベース | ★★★★★ |
| DAX | インメモリキャッシュ | ★★★★☆ |
| DynamoDB Streams | 変更データキャプチャ | ★★★★☆ |
| CloudFormation | インフラ定義 | ★★★★★ |

### 支援サービス

| サービス | 用途 | 重要度 |
|----------|------|--------|
| Lambda | ストリーム処理 | ★★★☆☆ |
| CloudWatch | 監視・アラート | ★★★★☆ |
| DMS | データ移行 | ★★★☆☆ |
| S3 | バックアップ保存 | ★★★☆☆ |

---

## 5. 前提条件

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
export PROJECT_NAME=ec-app
export ENVIRONMENT=dev

# 作業ディレクトリ作成
mkdir -p ~/ec-app-dynamodb/{cfn,scripts,data,lambda}
cd ~/ec-app-dynamodb
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

## 6. アーキテクチャ設計

### シングルテーブル設計の原則

- 1つのテーブルで全エンティティを管理
- アクセスパターンに基づいてキーを設計
- JOINをプリコンピュートで置き換え

### テーブル構造

**Table: ec-app-main**
- Partition Key (PK): String
- Sort Key (SK): String
- GSI1PK / GSI1SK: Overloaded GSI
- GSI2PK / GSI2SK: Category Index
- GSI3PK / GSI3SK: Status Index

### エンティティとキー設計

| Entity | PK | SK | GSI1 |
|--------|-----|-----|------|
| User | USER#\<userId\> | PROFILE | EMAIL |
| Product | PROD#\<prodId\> | INFO | CAT |
| Order | USER#\<userId\> | ORDER#\<orderId\> | DATE |
| OrderItem | ORDER#\<orderId\> | ITEM#\<itemId\> | - |
| Cart | USER#\<userId\> | CART#\<prodId\> | - |
| Inventory | PROD#\<prodId\> | INVENTORY | LOW |

### アクセスパターンとキー設計

| パターン | クエリ | 応答時間 |
|----------|--------|----------|
| ユーザー情報取得 | PK = "USER#123" AND SK = "PROFILE" | < 5ms |
| ユーザーの全注文履歴 | PK = "USER#123" AND SK begins_with "ORDER#" | < 20ms |
| 注文詳細（アイテム含む） | PK = "ORDER#456" AND SK begins_with "ITEM#" | < 15ms |
| カテゴリ別商品一覧 | GSI2: GSI2PK = "CAT#Electronics" | < 30ms |
| ステータス別注文 | GSI3: GSI3PK = "STATUS#PENDING" | < 25ms |
| 低在庫アラート | GSI1: GSI1PK = "LOW_STOCK" | < 20ms |

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

| コンポーネント | 役割 |
|----------------|------|
| **Client** | Web/Appクライアント |
| **API Gateway** | APIエンドポイント |
| **Lambda Functions** | ビジネスロジック実行 |
| **DAX Cluster** | DynamoDB用インメモリキャッシュ |
| **DynamoDB Table** | メインデータストア |
| **DynamoDB Streams** | 変更データキャプチャ |
| **Stream Processor** | ストリーム処理Lambda |
| **Aggregation Lambda** | 集計処理 |
| **OpenSearch** | 全文検索・分析 |
| **S3 Backup** | PITR（Point-in-Time Recovery）バックアップ |

---

## 7. トラブルシューティング演習

### 演習7-1: ホットパーティション問題

**状況:**
セール開始後、特定商品のアクセスが集中し、スロットリングエラーが大量発生している。

**エラーログ:**
```
ProvisionedThroughputExceededException:
The level of configured provisioned throughput for the table was exceeded.

Error Count: 500/min
Affected Keys: PROD#P0001, PROD#P0002, PROD#P0003
```

**課題:**
1. 原因を特定してください
2. 短期的な対処を実施してください
3. 長期的な改善策を提案してください

**ヒント:**
- CloudWatchメトリクス: ConsumedReadCapacityUnits
- Contributor Insights
- Write Sharding パターン

**解決策例**

```python
# 1. 原因調査スクリプト
import boto3

cloudwatch = boto3.client('cloudwatch')

# Contributor Insights を有効化して確認
dynamodb = boto3.client('dynamodb')
dynamodb.update_contributor_insights(
    TableName='ec-app-main-dev',
    ContributorInsightsAction='ENABLE'
)

# ホットキーを特定
response = dynamodb.describe_contributor_insights(
    TableName='ec-app-main-dev'
)

# 2. 短期対処: On-Demandモードへ切り替え（または容量増加）
dynamodb.update_table(
    TableName='ec-app-main-dev',
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
    table = boto3.resource('dynamodb').Table('ec-app-main-dev')

    # 全シャードに対してBatchGetItem
    keys = [
        {'PK': f'PROD#{product_id}#SHARD{i}', 'SK': 'VIEW_COUNT'}
        for i in range(shard_count)
    ]

    response = table.meta.client.batch_get_item(
        RequestItems={
            'ec-app-main-dev': {
                'Keys': keys
            }
        }
    )

    # 集計
    total_views = sum(
        item.get('viewCount', 0)
        for item in response['Responses'].get('ec-app-main-dev', [])
    )
    return total_views
```

### 演習7-2: GSIのスロットリング

**状況:**
カテゴリ別商品一覧（GSI2）へのクエリが遅延している。メインテーブルは正常だが、GSIのみスロットリング発生。

**CloudWatchメトリクス:**
| メトリクス | 値 |
|------------|-----|
| Table ConsumedRCU | 1000 (正常) |
| GSI2 ConsumedRCU | 5000 (限界超過) |
| GSI2 ThrottledRequests | 200/min |

**課題:**
1. GSIスロットリングの原因を説明してください
2. Projectionの最適化を検討してください
3. クエリパターンの見直しを提案してください

**解決策例**

```python
# 1. GSIの現状確認
import boto3

dynamodb = boto3.client('dynamodb')

response = dynamodb.describe_table(TableName='ec-app-main-dev')
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
    table = boto3.resource('dynamodb').Table('ec-app-main-dev')

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

### 演習7-3: トランザクション競合

**状況:**
人気商品の注文処理で、在庫更新のトランザクションが頻繁にキャンセルされている。

**エラーログ:**
```
TransactionCanceledException:
Transaction cancelled, please refer to the cancellation reasons for specific reasons.

CancellationReasons:
- Code: TransactionConflict
  Item: PROD#P0001/INVENTORY
```

**課題:**
1. トランザクション競合の原因を説明してください
2. リトライ戦略を実装してください
3. 楽観的ロックパターンを検討してください

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
helper = TransactionHelper('ec-app-main-dev')

# 在庫更新をリトライ付きで実行
transact_items = [
    {
        'Update': {
            'TableName': 'ec-app-main-dev',
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

## 8. 設計課題

### 設計課題8-1: マルチテナント対応設計

**課題:**
ECプラットフォームがマーケットプレイス機能を追加し、複数の出店者（テナント）をサポートする必要がある。

**要件:**
- 各テナントは自分のデータのみアクセス可能
- テナント間でデータは完全に分離
- テナントごとの利用量を把握したい
- テナント数は最大1000社を想定

**成果物:**
1. テナント分離のキー設計
2. アクセス制御の実装方針
3. 利用量計測の仕組み

**設計パターン例:**

#### パターン1: テナントプレフィックス方式

| PK | SK |
|-----|-----|
| TENANT#T001#PROD#P0001 | INFO |
| TENANT#T001#USER#U0001 | PROFILE |
| TENANT#T001#USER#U0001 | ORDER#O0001 |
| TENANT#T002#PROD#P0001 | INFO |

- 利点: シンプル、完全分離
- 欠点: クロステナントクエリ不可

#### パターン2: テナント専用GSI方式

| PK | SK | tenantId | GSI1PK |
|-----|-----|----------|--------|
| PROD#P0001 | INFO | T001 | T001#PROD |
| USER#U0001 | PROFILE | T001 | T001#USER |
| USER#U0002 | PROFILE | T002 | T002#USER |

- 利点: 柔軟なクエリ、プラットフォーム管理機能可能
- 欠点: アクセス制御をアプリで実装必要

**利用量計測:**
- DynamoDB Streams → Lambda → 集計テーブル
- CloudWatch メトリクスフィルター（tenantIdディメンション）

### 設計課題8-2: 検索機能の拡張

**課題:**
商品の全文検索、ファセット検索、あいまい検索を実現したい。DynamoDB単体では実現困難な検索要件への対応が必要。

**要件:**
- 商品名、説明文での全文検索
- 価格帯、カテゴリ、評価でのファセット検索
- タイプミスを許容するあいまい検索
- 検索結果のランキング（人気順、関連度順）

**成果物:**
1. OpenSearch連携アーキテクチャ
2. データ同期パイプライン設計
3. 検索APIの設計

---

## 9. 発展課題

### 発展課題9-1: グローバルテーブル設計

**シナリオ:**
ECプラットフォームがアジア太平洋地域（日本、シンガポール、シドニー）に展開することになった。各リージョンでの低レイテンシアクセスとデータ整合性を両立する設計が必要。

**技術要件:**
- 各リージョンで50ms以下の応答時間
- リージョン障害時の自動フェイルオーバー
- 在庫データの整合性保証
- コスト効率の良い設計

**成果物:**
1. グローバルテーブルのCloudFormation
2. コンフリクト解決戦略
3. リージョン間レプリケーション監視

### 発展課題9-2: コスト最適化分析

**シナリオ:**
現在On-Demandモードで運用しているが、月額コストが予想を超えた。Provisionedモード + Auto Scalingへの移行を検討中。

**現状データ:**
- 月間読み取りリクエスト: 1億回
- 月間書き込みリクエスト: 2000万回
- ピーク時間帯: 12:00-14:00, 20:00-23:00
- ピーク時は平常時の3倍のトラフィック
- 現在のコスト: 月額約20万円

**成果物:**
1. コスト分析レポート
2. 最適な課金モードの提案
3. Reserved Capacityの検討

---

## 10. 学習のまとめ

### 学習チェックリスト

#### 基礎知識
- [ ] DynamoDBのキー設計原則を説明できる
- [ ] シングルテーブル設計のメリット・デメリットを理解した
- [ ] GSI/LSIの使い分けを説明できる
- [ ] パーティションの概念を理解した

#### 実践スキル
- [ ] アクセスパターン分析からキー設計ができる
- [ ] CloudFormationでDynamoDBを構築できる
- [ ] boto3でCRUD操作を実装できる
- [ ] トランザクションを適切に使用できる

#### 最適化
- [ ] DAXの導入判断と設定ができる
- [ ] ホットパーティション対策を説明できる
- [ ] GSI射影の最適化ができる
- [ ] コスト最適化の観点で設計できる

#### 運用
- [ ] DynamoDB Streamsを活用できる
- [ ] CloudWatchで監視設定ができる
- [ ] バックアップ・リストア手順を理解した
- [ ] トラブルシューティングの手順を確立した

### RDBとDynamoDBの思考転換

| RDB的思考 | DynamoDB的思考 |
|-----------|----------------|
| エンティティごとにテーブルを作成 | 1つのテーブルに全エンティティを格納 |
| 正規化して冗長性排除 | 非正規化してアクセス最適化 |
| JOINで関連データ取得 | 事前計算・重複保存 |
| スキーマ先行設計 | アクセスパターン先行設計 |
| インデックス後付け | GSI/LSI事前設計必須 |
| トランザクション多用 | トランザクション最小限（単一アイテム操作推奨） |
| SQLで柔軟なクエリ | 限定されたクエリパターン（Query/Scan/GetItem） |

---

## 11. コスト見積もり

### 想定コスト（月額）

#### On-Demandモード（開発環境）

| 項目 | 数量 | 月額（USD） |
|------|------|-------------|
| 読み取りリクエスト | 100万回 | $0.25 |
| 書き込みリクエスト | 50万回 | $0.63 |
| ストレージ | 1GB | $0.25 |
| DynamoDB Streams | 100万回 | $0.02 |
| バックアップ | 1GB | $0.10 |
| **小計** | | **約 $1.25** |

#### 本番環境想定（On-Demand）

| 項目 | 数量 | 月額（USD） |
|------|------|-------------|
| 読み取りリクエスト | 1億回 | $25.00 |
| 書き込みリクエスト | 2000万回 | $25.00 |
| ストレージ | 50GB | $12.50 |
| GSI（3個） | 各50GB | $37.50 |
| DynamoDB Streams | 2000万回 | $0.40 |
| DAX（2ノード t3.small） | 730時間×2 | $58.40 |
| バックアップ（PITR） | 100GB | $20.00 |
| **小計** | | **約 $180（約 ¥27,000）** |

#### コスト削減のポイント
- Reserved Capacity: 年間契約で最大76%削減
- TTLによる自動削除: 不要データの自動クリーンアップ
- GSI射影最適化: KEYS_ONLYまたは必要最小限のINCLUDE
- 適切なDAXサイズ選定: キャッシュヒット率の監視

#### 無料利用枠（AWS Free Tier）
- 25GBストレージ
- 25 WCU / 25 RCU（Provisioned）
- 2億リクエスト/月（DynamoDB Streams）

---

## リソースのクリーンアップ

```bash
# 1. CloudFormationスタック削除
aws cloudformation delete-stack --stack-name ec-app-monitoring-dev
aws cloudformation delete-stack --stack-name ec-app-stream-processor-dev
aws cloudformation delete-stack --stack-name ec-app-dax-dev
aws cloudformation delete-stack --stack-name ec-app-dynamodb-dev

# 2. 削除完了を待機
aws cloudformation wait stack-delete-complete --stack-name ec-app-dynamodb-dev

# 3. 作業ディレクトリのクリーンアップ
rm -rf ~/ec-app-dynamodb

echo "Cleanup completed!"
```

---

**次の課題**: [課題31](exercise-31.md)

**前の課題**: [課題29](exercise-29.md)
