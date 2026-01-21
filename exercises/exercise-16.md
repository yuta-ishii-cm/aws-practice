# 課題16: DynamoDB実践設計 - シングルテーブル設計とGSI最適化

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

## 7. ハンズオン手順

### Phase 1: CloudFormationによるDynamoDBテーブル作成

#### 1.1 メインテーブルの定義

```yaml
# cfn/dynamodb-table.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'MegaMart DynamoDB Single Table Design'

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, stg, prod]

  TableName:
    Type: String
    Default: megamart-main

  BillingMode:
    Type: String
    Default: PAY_PER_REQUEST
    AllowedValues: [PAY_PER_REQUEST, PROVISIONED]

  # Provisioned mode用パラメータ
  ReadCapacityUnits:
    Type: Number
    Default: 5
    MinValue: 1

  WriteCapacityUnits:
    Type: Number
    Default: 5
    MinValue: 1

Conditions:
  IsProvisioned: !Equals [!Ref BillingMode, PROVISIONED]
  IsProd: !Equals [!Ref Environment, prod]

Resources:
  #============================================
  # メインテーブル
  #============================================
  MegaMartTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub '${TableName}-${Environment}'

      # キー定義
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE

      # 属性定義（キーとGSIで使用する属性のみ）
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
        - AttributeName: GSI2PK
          AttributeType: S
        - AttributeName: GSI2SK
          AttributeType: N
        - AttributeName: GSI3PK
          AttributeType: S
        - AttributeName: GSI3SK
          AttributeType: S

      # 課金モード
      BillingMode: !Ref BillingMode

      # Provisioned時のキャパシティ（条件付き）
      ProvisionedThroughput: !If
        - IsProvisioned
        - ReadCapacityUnits: !Ref ReadCapacityUnits
          WriteCapacityUnits: !Ref WriteCapacityUnits
        - !Ref AWS::NoValue

      # グローバルセカンダリインデックス
      GlobalSecondaryIndexes:
        #------------------------------------------
        # GSI1: Email検索、日付ソート用（Overloaded）
        #------------------------------------------
        - IndexName: GSI1
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
          ProvisionedThroughput: !If
            - IsProvisioned
            - ReadCapacityUnits: !Ref ReadCapacityUnits
              WriteCapacityUnits: !Ref WriteCapacityUnits
            - !Ref AWS::NoValue

        #------------------------------------------
        # GSI2: カテゴリ別商品検索（価格ソート）
        #------------------------------------------
        - IndexName: GSI2
          KeySchema:
            - AttributeName: GSI2PK
              KeyType: HASH
            - AttributeName: GSI2SK
              KeyType: RANGE
          Projection:
            ProjectionType: INCLUDE
            NonKeyAttributes:
              - name
              - price
              - imageUrl
              - stock
          ProvisionedThroughput: !If
            - IsProvisioned
            - ReadCapacityUnits: !Ref ReadCapacityUnits
              WriteCapacityUnits: !Ref WriteCapacityUnits
            - !Ref AWS::NoValue

        #------------------------------------------
        # GSI3: ステータス別検索（Sparse Index）
        #------------------------------------------
        - IndexName: GSI3
          KeySchema:
            - AttributeName: GSI3PK
              KeyType: HASH
            - AttributeName: GSI3SK
              KeyType: RANGE
          Projection:
            ProjectionType: KEYS_ONLY
          ProvisionedThroughput: !If
            - IsProvisioned
            - ReadCapacityUnits: 1
              WriteCapacityUnits: 1
            - !Ref AWS::NoValue

      # DynamoDB Streams有効化
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES

      # TTL設定（カートアイテム等の自動削除用）
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true

      # Point-in-Time Recovery
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: !If [IsProd, true, false]

      # 暗号化
      SSESpecification:
        SSEEnabled: true
        SSEType: KMS

      # タグ
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Project
          Value: MegaMart
        - Key: CostCenter
          Value: EC-Platform

  #============================================
  # Auto Scaling（Provisionedモード時のみ）
  #============================================
  TableReadScalingTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Condition: IsProvisioned
    Properties:
      MaxCapacity: 1000
      MinCapacity: 5
      ResourceId: !Sub 'table/${MegaMartTable}'
      RoleARN: !GetAtt AutoScalingRole.Arn
      ScalableDimension: dynamodb:table:ReadCapacityUnits
      ServiceNamespace: dynamodb

  TableWriteScalingTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Condition: IsProvisioned
    Properties:
      MaxCapacity: 1000
      MinCapacity: 5
      ResourceId: !Sub 'table/${MegaMartTable}'
      RoleARN: !GetAtt AutoScalingRole.Arn
      ScalableDimension: dynamodb:table:WriteCapacityUnits
      ServiceNamespace: dynamodb

  TableReadScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Condition: IsProvisioned
    Properties:
      PolicyName: TableReadAutoScaling
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref TableReadScalingTarget
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 70.0
        PredefinedMetricSpecification:
          PredefinedMetricType: DynamoDBReadCapacityUtilization
        ScaleInCooldown: 60
        ScaleOutCooldown: 60

  TableWriteScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Condition: IsProvisioned
    Properties:
      PolicyName: TableWriteAutoScaling
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref TableWriteScalingTarget
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 70.0
        PredefinedMetricSpecification:
          PredefinedMetricType: DynamoDBWriteCapacityUtilization
        ScaleInCooldown: 60
        ScaleOutCooldown: 60

  AutoScalingRole:
    Type: AWS::IAM::Role
    Condition: IsProvisioned
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: application-autoscaling.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonDynamoDBAutoscalingServiceRolePolicy

Outputs:
  TableName:
    Description: DynamoDB Table Name
    Value: !Ref MegaMartTable
    Export:
      Name: !Sub '${AWS::StackName}-TableName'

  TableArn:
    Description: DynamoDB Table ARN
    Value: !GetAtt MegaMartTable.Arn
    Export:
      Name: !Sub '${AWS::StackName}-TableArn'

  StreamArn:
    Description: DynamoDB Stream ARN
    Value: !GetAtt MegaMartTable.StreamArn
    Export:
      Name: !Sub '${AWS::StackName}-StreamArn'
```

#### 1.2 スタックのデプロイ

```bash
# 開発環境（On-Demandモード）
aws cloudformation deploy \
  --template-file cfn/dynamodb-table.yaml \
  --stack-name megamart-dynamodb-dev \
  --parameter-overrides \
    Environment=dev \
    BillingMode=PAY_PER_REQUEST \
  --capabilities CAPABILITY_IAM

# テーブル作成確認
aws dynamodb describe-table \
  --table-name megamart-main-dev \
  --query 'Table.{Name:TableName,Status:TableStatus,GSIs:GlobalSecondaryIndexes[*].IndexName}'
```

### Phase 2: データモデル実装とサンプルデータ投入

#### 2.1 Pythonデータアクセスレイヤー

```python
# scripts/dynamodb_client.py
import boto3
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal
import json
from datetime import datetime, timedelta
import uuid
from typing import Optional, List, Dict, Any

class MegaMartDB:
    """MegaMart DynamoDB シングルテーブルクライアント"""

    def __init__(self, table_name: str = 'megamart-main-dev'):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
        self.client = boto3.client('dynamodb')

    #==========================================
    # ユーザー操作
    #==========================================
    def create_user(self, user_id: str, email: str, name: str, tier: str = 'STANDARD') -> Dict:
        """ユーザー作成"""
        item = {
            'PK': f'USER#{user_id}',
            'SK': 'PROFILE',
            'GSI1PK': f'EMAIL#{email}',
            'GSI1SK': f'USER#{user_id}',
            'entityType': 'USER',
            'userId': user_id,
            'email': email,
            'name': name,
            'tier': tier,
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        self.table.put_item(Item=item)
        return item

    def get_user(self, user_id: str) -> Optional[Dict]:
        """ユーザー取得（PK直接アクセス）"""
        response = self.table.get_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': 'PROFILE'
            }
        )
        return response.get('Item')

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """メールでユーザー検索（GSI1使用）"""
        response = self.table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1PK').eq(f'EMAIL#{email}')
        )
        items = response.get('Items', [])
        return items[0] if items else None

    #==========================================
    # 商品操作
    #==========================================
    def create_product(self, product_id: str, name: str, category: str,
                       price: Decimal, stock: int, description: str = '',
                       image_url: str = '') -> Dict:
        """商品作成"""
        item = {
            'PK': f'PROD#{product_id}',
            'SK': 'INFO',
            'GSI2PK': f'CAT#{category}',
            'GSI2SK': int(price),  # 価格でソート用
            'entityType': 'PRODUCT',
            'productId': product_id,
            'name': name,
            'category': category,
            'price': price,
            'stock': stock,
            'description': description,
            'imageUrl': image_url,
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }

        # 低在庫の場合、Sparse Index用属性を追加
        if stock < 10:
            item['GSI1PK'] = 'LOW_STOCK'
            item['GSI1SK'] = f'{stock:05d}#{product_id}'

        self.table.put_item(Item=item)

        # 在庫情報も別アイテムとして保存（トランザクション用）
        inventory_item = {
            'PK': f'PROD#{product_id}',
            'SK': 'INVENTORY',
            'entityType': 'INVENTORY',
            'productId': product_id,
            'stock': stock,
            'reservedStock': 0,
            'updatedAt': datetime.utcnow().isoformat()
        }
        self.table.put_item(Item=inventory_item)

        return item

    def get_product(self, product_id: str) -> Optional[Dict]:
        """商品取得"""
        response = self.table.get_item(
            Key={
                'PK': f'PROD#{product_id}',
                'SK': 'INFO'
            }
        )
        return response.get('Item')

    def get_products_by_category(self, category: str,
                                  max_price: Optional[int] = None,
                                  limit: int = 20) -> List[Dict]:
        """カテゴリ別商品取得（GSI2使用、価格順）"""
        key_condition = Key('GSI2PK').eq(f'CAT#{category}')
        if max_price:
            key_condition = key_condition & Key('GSI2SK').lte(max_price)

        response = self.table.query(
            IndexName='GSI2',
            KeyConditionExpression=key_condition,
            Limit=limit
        )
        return response.get('Items', [])

    def get_low_stock_products(self, threshold: int = 10) -> List[Dict]:
        """低在庫商品取得（Sparse Index使用）"""
        response = self.table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1PK').eq('LOW_STOCK')
        )
        return response.get('Items', [])

    def update_stock(self, product_id: str, quantity_change: int) -> Dict:
        """在庫更新（条件付き更新）"""
        try:
            response = self.table.update_item(
                Key={
                    'PK': f'PROD#{product_id}',
                    'SK': 'INVENTORY'
                },
                UpdateExpression='SET stock = stock + :change, updatedAt = :now',
                ConditionExpression='stock + :change >= :zero',
                ExpressionAttributeValues={
                    ':change': quantity_change,
                    ':zero': 0,
                    ':now': datetime.utcnow().isoformat()
                },
                ReturnValues='ALL_NEW'
            )
            return response['Attributes']
        except self.client.exceptions.ConditionalCheckFailedException:
            raise ValueError(f'Insufficient stock for product {product_id}')

    #==========================================
    # 注文操作
    #==========================================
    def create_order(self, user_id: str, items: List[Dict],
                     shipping_address: Dict) -> Dict:
        """注文作成（トランザクション使用）"""
        order_id = str(uuid.uuid4())[:8].upper()
        order_date = datetime.utcnow().isoformat()

        # 合計金額計算
        total = sum(Decimal(str(item['price'])) * item['quantity'] for item in items)

        # トランザクション用のアイテム準備
        transact_items = []

        # 注文メインアイテム
        order_item = {
            'PK': f'USER#{user_id}',
            'SK': f'ORDER#{order_id}',
            'GSI1PK': f'ORDER#{order_id}',
            'GSI1SK': order_date,
            'GSI3PK': 'STATUS#PENDING',
            'GSI3SK': order_date,
            'entityType': 'ORDER',
            'orderId': order_id,
            'userId': user_id,
            'status': 'PENDING',
            'total': total,
            'itemCount': len(items),
            'shippingAddress': shipping_address,
            'createdAt': order_date,
            'updatedAt': order_date
        }
        transact_items.append({
            'Put': {
                'TableName': self.table.name,
                'Item': self._serialize_item(order_item)
            }
        })

        # 注文アイテム
        for idx, item in enumerate(items):
            order_item_record = {
                'PK': f'ORDER#{order_id}',
                'SK': f'ITEM#{idx:04d}',
                'entityType': 'ORDER_ITEM',
                'orderId': order_id,
                'productId': item['productId'],
                'productName': item['name'],
                'quantity': item['quantity'],
                'price': Decimal(str(item['price'])),
                'subtotal': Decimal(str(item['price'])) * item['quantity']
            }
            transact_items.append({
                'Put': {
                    'TableName': self.table.name,
                    'Item': self._serialize_item(order_item_record)
                }
            })

            # 在庫減少
            transact_items.append({
                'Update': {
                    'TableName': self.table.name,
                    'Key': {
                        'PK': {'S': f'PROD#{item["productId"]}'},
                        'SK': {'S': 'INVENTORY'}
                    },
                    'UpdateExpression': 'SET stock = stock - :qty, updatedAt = :now',
                    'ConditionExpression': 'stock >= :qty',
                    'ExpressionAttributeValues': {
                        ':qty': {'N': str(item['quantity'])},
                        ':now': {'S': datetime.utcnow().isoformat()}
                    }
                }
            })

        # トランザクション実行
        self.client.transact_write_items(TransactItems=transact_items)

        return order_item

    def get_user_orders(self, user_id: str, limit: int = 20) -> List[Dict]:
        """ユーザーの注文履歴取得"""
        response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'USER#{user_id}') &
                                   Key('SK').begins_with('ORDER#'),
            ScanIndexForward=False,  # 新しい順
            Limit=limit
        )
        return response.get('Items', [])

    def get_order_with_items(self, order_id: str) -> Dict:
        """注文詳細とアイテム一括取得"""
        # 注文アイテムを取得
        response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'ORDER#{order_id}')
        )
        items = response.get('Items', [])

        # 注文情報をGSI1から取得
        order_response = self.table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1PK').eq(f'ORDER#{order_id}')
        )
        order_info = order_response.get('Items', [{}])[0]

        return {
            'order': order_info,
            'items': items
        }

    def update_order_status(self, user_id: str, order_id: str,
                            new_status: str) -> Dict:
        """注文ステータス更新"""
        old_status = self.table.get_item(
            Key={'PK': f'USER#{user_id}', 'SK': f'ORDER#{order_id}'}
        ).get('Item', {}).get('status')

        update_expr = 'SET #status = :status, updatedAt = :now'
        expr_values = {
            ':status': new_status,
            ':now': datetime.utcnow().isoformat()
        }

        # Sparse Index更新
        if new_status in ['PENDING', 'PROCESSING', 'SHIPPED']:
            update_expr += ', GSI3PK = :gsi3pk, GSI3SK = :gsi3sk'
            expr_values[':gsi3pk'] = f'STATUS#{new_status}'
            expr_values[':gsi3sk'] = datetime.utcnow().isoformat()
        else:
            # 完了・キャンセルはGSI3から削除（REMOVE）
            update_expr += ' REMOVE GSI3PK, GSI3SK'

        response = self.table.update_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': f'ORDER#{order_id}'
            },
            UpdateExpression=update_expr,
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        return response['Attributes']

    def get_orders_by_status(self, status: str, limit: int = 50) -> List[Dict]:
        """ステータス別注文取得（Sparse Index）"""
        response = self.table.query(
            IndexName='GSI3',
            KeyConditionExpression=Key('GSI3PK').eq(f'STATUS#{status}'),
            Limit=limit
        )
        return response.get('Items', [])

    #==========================================
    # カート操作
    #==========================================
    def add_to_cart(self, user_id: str, product_id: str,
                    quantity: int, product_info: Dict) -> Dict:
        """カートに追加（TTL付き）"""
        ttl = int((datetime.utcnow() + timedelta(days=7)).timestamp())

        item = {
            'PK': f'USER#{user_id}',
            'SK': f'CART#{product_id}',
            'entityType': 'CART_ITEM',
            'userId': user_id,
            'productId': product_id,
            'productName': product_info.get('name'),
            'price': product_info.get('price'),
            'quantity': quantity,
            'imageUrl': product_info.get('imageUrl', ''),
            'ttl': ttl,
            'addedAt': datetime.utcnow().isoformat()
        }

        self.table.put_item(Item=item)
        return item

    def get_cart(self, user_id: str) -> List[Dict]:
        """カート内容取得"""
        response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'USER#{user_id}') &
                                   Key('SK').begins_with('CART#')
        )
        return response.get('Items', [])

    def clear_cart(self, user_id: str) -> None:
        """カートクリア"""
        cart_items = self.get_cart(user_id)
        with self.table.batch_writer() as batch:
            for item in cart_items:
                batch.delete_item(
                    Key={'PK': item['PK'], 'SK': item['SK']}
                )

    #==========================================
    # ヘルパーメソッド
    #==========================================
    def _serialize_item(self, item: Dict) -> Dict:
        """アイテムをDynamoDB低レベルAPI形式に変換"""
        serialized = {}
        for key, value in item.items():
            if isinstance(value, str):
                serialized[key] = {'S': value}
            elif isinstance(value, (int, float, Decimal)):
                serialized[key] = {'N': str(value)}
            elif isinstance(value, dict):
                serialized[key] = {'M': self._serialize_item(value)}
            elif isinstance(value, list):
                serialized[key] = {'L': [self._serialize_value(v) for v in value]}
            elif isinstance(value, bool):
                serialized[key] = {'BOOL': value}
        return serialized

    def _serialize_value(self, value) -> Dict:
        """単一値をシリアライズ"""
        if isinstance(value, str):
            return {'S': value}
        elif isinstance(value, (int, float, Decimal)):
            return {'N': str(value)}
        elif isinstance(value, dict):
            return {'M': self._serialize_item(value)}
        return {'S': str(value)}
```

#### 2.2 サンプルデータ投入スクリプト

```python
# scripts/seed_data.py
from dynamodb_client import MegaMartDB
from decimal import Decimal
import random

def seed_data():
    db = MegaMartDB()

    # カテゴリ定義
    categories = ['Electronics', 'Fashion', 'Food', 'Home']

    # ユーザー作成
    print("Creating users...")
    users = []
    for i in range(1, 11):
        user = db.create_user(
            user_id=f'U{i:04d}',
            email=f'user{i}@example.com',
            name=f'テストユーザー{i}',
            tier=random.choice(['STANDARD', 'PREMIUM', 'VIP'])
        )
        users.append(user)
        print(f"  Created user: {user['userId']}")

    # 商品作成
    print("\nCreating products...")
    products = []
    product_templates = [
        ('Electronics', ['スマートフォン', 'ノートPC', 'タブレット', 'イヤホン', 'スマートウォッチ']),
        ('Fashion', ['Tシャツ', 'ジーンズ', 'スニーカー', 'ジャケット', 'バッグ']),
        ('Food', ['コーヒー豆', 'チョコレート', 'オリーブオイル', '紅茶', 'ナッツ']),
        ('Home', ['クッション', 'ランプ', '収納ボックス', 'タオルセット', '食器セット'])
    ]

    product_id = 1
    for category, names in product_templates:
        for name in names:
            price = random.randint(500, 50000)
            stock = random.randint(0, 100)  # 0在庫もあり得る

            product = db.create_product(
                product_id=f'P{product_id:04d}',
                name=f'{name} - モデル{random.randint(1,5)}',
                category=category,
                price=Decimal(str(price)),
                stock=stock,
                description=f'{category}カテゴリの{name}です。',
                image_url=f'https://example.com/images/p{product_id:04d}.jpg'
            )
            products.append(product)
            print(f"  Created product: {product['name']} (stock: {stock})")
            product_id += 1

    # 注文作成
    print("\nCreating orders...")
    for user in users[:5]:  # 最初の5ユーザーに注文を作成
        for _ in range(random.randint(1, 3)):
            # ランダムに商品を選択
            order_items = []
            selected_products = random.sample(products, random.randint(1, 3))

            for prod in selected_products:
                order_items.append({
                    'productId': prod['productId'],
                    'name': prod['name'],
                    'price': float(prod['price']),
                    'quantity': random.randint(1, 2)
                })

            shipping = {
                'postalCode': f'{random.randint(100, 999)}-{random.randint(1000, 9999)}',
                'prefecture': '東京都',
                'city': '渋谷区',
                'address': f'テスト町{random.randint(1, 10)}-{random.randint(1, 20)}'
            }

            try:
                order = db.create_order(
                    user_id=user['userId'],
                    items=order_items,
                    shipping_address=shipping
                )
                print(f"  Created order: {order['orderId']} for {user['userId']}")
            except Exception as e:
                print(f"  Failed to create order: {e}")

    # カートに商品追加
    print("\nAdding items to cart...")
    for user in users[5:8]:  # 3ユーザーにカートアイテム追加
        for prod in random.sample(products, 2):
            db.add_to_cart(
                user_id=user['userId'],
                product_id=prod['productId'],
                quantity=random.randint(1, 3),
                product_info={
                    'name': prod['name'],
                    'price': prod['price'],
                    'imageUrl': prod.get('imageUrl', '')
                }
            )
            print(f"  Added to cart: {prod['name']} for {user['userId']}")

    print("\nSeed data complete!")

if __name__ == '__main__':
    seed_data()
```

### Phase 3: DAXクラスターの構築

#### 3.1 DAX CloudFormationテンプレート

```yaml
# cfn/dax-cluster.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'MegaMart DAX Cluster'

Parameters:
  Environment:
    Type: String
    Default: dev

  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: VPC ID for DAX cluster

  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
    Description: Subnet IDs for DAX cluster (at least 2)

  NodeType:
    Type: String
    Default: dax.t3.small
    AllowedValues:
      - dax.t3.small
      - dax.t3.medium
      - dax.r5.large

  NodeCount:
    Type: Number
    Default: 2
    MinValue: 1
    MaxValue: 10

  TableName:
    Type: String
    Description: DynamoDB table name to cache

Resources:
  #============================================
  # DAX用セキュリティグループ
  #============================================
  DAXSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for DAX cluster
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 8111
          ToPort: 8111
          CidrIp: 10.0.0.0/8  # VPC内からのアクセスのみ
      Tags:
        - Key: Name
          Value: !Sub 'megamart-dax-sg-${Environment}'

  #============================================
  # DAX用サブネットグループ
  #============================================
  DAXSubnetGroup:
    Type: AWS::DAX::SubnetGroup
    Properties:
      SubnetGroupName: !Sub 'megamart-dax-subnet-${Environment}'
      Description: Subnet group for DAX cluster
      SubnetIds: !Ref SubnetIds

  #============================================
  # DAX用IAMロール
  #============================================
  DAXRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'megamart-dax-role-${Environment}'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: dax.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: DAXDynamoDBAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:DescribeTable
                  - dynamodb:PutItem
                  - dynamodb:GetItem
                  - dynamodb:UpdateItem
                  - dynamodb:DeleteItem
                  - dynamodb:Query
                  - dynamodb:Scan
                  - dynamodb:BatchGetItem
                  - dynamodb:BatchWriteItem
                  - dynamodb:ConditionCheckItem
                Resource:
                  - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${TableName}'
                  - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${TableName}/index/*'

  #============================================
  # DAXパラメータグループ
  #============================================
  DAXParameterGroup:
    Type: AWS::DAX::ParameterGroup
    Properties:
      ParameterGroupName: !Sub 'megamart-dax-params-${Environment}'
      Description: Parameter group for MegaMart DAX
      ParameterNameValues:
        query-ttl-millis: '300000'      # クエリキャッシュTTL: 5分
        record-ttl-millis: '300000'     # アイテムキャッシュTTL: 5分

  #============================================
  # DAXクラスター
  #============================================
  DAXCluster:
    Type: AWS::DAX::Cluster
    Properties:
      ClusterName: !Sub 'megamart-dax-${Environment}'
      Description: DAX cluster for MegaMart DynamoDB caching
      IAMRoleARN: !GetAtt DAXRole.Arn
      NodeType: !Ref NodeType
      ReplicationFactor: !Ref NodeCount
      SubnetGroupName: !Ref DAXSubnetGroup
      SecurityGroupIds:
        - !Ref DAXSecurityGroup
      ParameterGroupName: !Ref DAXParameterGroup
      SSESpecification:
        SSEEnabled: true
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Project
          Value: MegaMart

Outputs:
  DAXClusterEndpoint:
    Description: DAX Cluster Endpoint
    Value: !GetAtt DAXCluster.ClusterDiscoveryEndpoint
    Export:
      Name: !Sub '${AWS::StackName}-DAXEndpoint'

  DAXClusterArn:
    Description: DAX Cluster ARN
    Value: !GetAtt DAXCluster.Arn
    Export:
      Name: !Sub '${AWS::StackName}-DAXArn'
```

#### 3.2 DAXを使用したクライアント

```python
# scripts/dynamodb_dax_client.py
import amazondax
import boto3
from boto3.dynamodb.conditions import Key
from typing import Optional, Dict, List

class MegaMartDAXClient:
    """DAX経由でDynamoDBにアクセスするクライアント"""

    def __init__(self, dax_endpoint: str, table_name: str = 'megamart-main-dev'):
        # DAXクライアント（読み取り用）
        self.dax = amazondax.AmazonDaxClient.resource(endpoint_url=dax_endpoint)
        self.dax_table = self.dax.Table(table_name)

        # 直接DynamoDBクライアント（書き込み用 - オプション）
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)

    def get_product(self, product_id: str) -> Optional[Dict]:
        """商品取得（DAXキャッシュ経由）"""
        # DAX経由で取得 - キャッシュヒット時は1ms以下
        response = self.dax_table.get_item(
            Key={
                'PK': f'PROD#{product_id}',
                'SK': 'INFO'
            }
        )
        return response.get('Item')

    def get_products_by_category(self, category: str, limit: int = 20) -> List[Dict]:
        """カテゴリ別商品取得（DAXキャッシュ経由）"""
        response = self.dax_table.query(
            IndexName='GSI2',
            KeyConditionExpression=Key('GSI2PK').eq(f'CAT#{category}'),
            Limit=limit
        )
        return response.get('Items', [])

    def get_user_orders(self, user_id: str) -> List[Dict]:
        """ユーザー注文履歴（DAXキャッシュ経由）"""
        response = self.dax_table.query(
            KeyConditionExpression=Key('PK').eq(f'USER#{user_id}') &
                                   Key('SK').begins_with('ORDER#'),
            ScanIndexForward=False
        )
        return response.get('Items', [])

# 使用例
if __name__ == '__main__':
    # DAXエンドポイントは実際のものに置き換え
    dax_endpoint = 'daxs://megamart-dax-dev.xxxxx.dax-clusters.ap-northeast-1.amazonaws.com'

    client = MegaMartDAXClient(dax_endpoint)

    # 商品取得（初回はDynamoDBアクセス、2回目以降はキャッシュ）
    import time

    product_id = 'P0001'

    # 1回目（キャッシュミス）
    start = time.time()
    product = client.get_product(product_id)
    print(f"First call: {(time.time() - start) * 1000:.2f}ms")

    # 2回目（キャッシュヒット）
    start = time.time()
    product = client.get_product(product_id)
    print(f"Second call (cached): {(time.time() - start) * 1000:.2f}ms")
```

### Phase 4: DynamoDB Streamsとイベント処理

#### 4.1 Stream処理Lambda

```yaml
# cfn/stream-processor.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'DynamoDB Stream Processor for MegaMart'

Parameters:
  Environment:
    Type: String
    Default: dev

  TableStreamArn:
    Type: String
    Description: DynamoDB Stream ARN

Resources:
  #============================================
  # Lambda実行ロール
  #============================================
  StreamProcessorRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'megamart-stream-processor-role-${Environment}'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: DynamoDBStreamAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:GetRecords
                  - dynamodb:GetShardIterator
                  - dynamodb:DescribeStream
                  - dynamodb:ListStreams
                Resource: !Ref TableStreamArn
              - Effect: Allow
                Action:
                  - dynamodb:PutItem
                  - dynamodb:UpdateItem
                Resource: !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/megamart-aggregates-${Environment}'

  #============================================
  # 集計用テーブル
  #============================================
  AggregatesTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub 'megamart-aggregates-${Environment}'
      BillingMode: PAY_PER_REQUEST
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S

  #============================================
  # Stream処理Lambda
  #============================================
  StreamProcessorFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'megamart-stream-processor-${Environment}'
      Runtime: python3.11
      Handler: index.handler
      Role: !GetAtt StreamProcessorRole.Arn
      Timeout: 60
      MemorySize: 256
      Environment:
        Variables:
          AGGREGATES_TABLE: !Ref AggregatesTable
          ENVIRONMENT: !Ref Environment
      Code:
        ZipFile: |
          import boto3
          import os
          from decimal import Decimal
          from datetime import datetime

          dynamodb = boto3.resource('dynamodb')
          aggregates_table = dynamodb.Table(os.environ['AGGREGATES_TABLE'])

          def handler(event, context):
              for record in event['Records']:
                  if record['eventName'] in ['INSERT', 'MODIFY']:
                      new_image = record['dynamodb'].get('NewImage', {})
                      entity_type = new_image.get('entityType', {}).get('S', '')

                      if entity_type == 'ORDER':
                          process_order(new_image, record['eventName'])
                      elif entity_type == 'PRODUCT':
                          process_product(new_image)

              return {'statusCode': 200}

          def process_order(order, event_type):
              """注文の集計処理"""
              if event_type != 'INSERT':
                  return

              order_date = order.get('createdAt', {}).get('S', '')[:10]  # YYYY-MM-DD
              total = Decimal(order.get('total', {}).get('N', '0'))

              # 日次売上集計
              aggregates_table.update_item(
                  Key={
                      'PK': 'DAILY_SALES',
                      'SK': order_date
                  },
                  UpdateExpression='ADD orderCount :one, totalSales :total',
                  ExpressionAttributeValues={
                      ':one': 1,
                      ':total': total
                  }
              )

              # 月次売上集計
              month = order_date[:7]  # YYYY-MM
              aggregates_table.update_item(
                  Key={
                      'PK': 'MONTHLY_SALES',
                      'SK': month
                  },
                  UpdateExpression='ADD orderCount :one, totalSales :total',
                  ExpressionAttributeValues={
                      ':one': 1,
                      ':total': total
                  }
              )

          def process_product(product):
              """商品の在庫監視"""
              stock = int(product.get('stock', {}).get('N', '0'))
              product_id = product.get('productId', {}).get('S', '')

              if stock < 10:
                  # 低在庫アラート用のレコード作成
                  aggregates_table.put_item(
                      Item={
                          'PK': 'LOW_STOCK_ALERT',
                          'SK': product_id,
                          'stock': stock,
                          'alertedAt': datetime.utcnow().isoformat()
                      }
                  )

  #============================================
  # Stream イベントソースマッピング
  #============================================
  StreamEventSourceMapping:
    Type: AWS::Lambda::EventSourceMapping
    Properties:
      EventSourceArn: !Ref TableStreamArn
      FunctionName: !Ref StreamProcessorFunction
      StartingPosition: LATEST
      BatchSize: 100
      MaximumBatchingWindowInSeconds: 5
      FilterCriteria:
        Filters:
          - Pattern: '{"dynamodb":{"NewImage":{"entityType":{"S":["ORDER","PRODUCT"]}}}}'

Outputs:
  AggregatesTableName:
    Description: Aggregates Table Name
    Value: !Ref AggregatesTable
```

### Phase 5: 監視とアラート設定

```yaml
# cfn/monitoring.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'MegaMart DynamoDB Monitoring'

Parameters:
  Environment:
    Type: String
    Default: dev

  TableName:
    Type: String

  AlertEmail:
    Type: String
    Default: ops@megamart.example.com

Resources:
  #============================================
  # SNSトピック
  #============================================
  AlertTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub 'megamart-dynamodb-alerts-${Environment}'
      Subscription:
        - Protocol: email
          Endpoint: !Ref AlertEmail

  #============================================
  # CloudWatchダッシュボード
  #============================================
  DynamoDBDashboard:
    Type: AWS::CloudWatch::Dashboard
    Properties:
      DashboardName: !Sub 'MegaMart-DynamoDB-${Environment}'
      DashboardBody: !Sub |
        {
          "widgets": [
            {
              "type": "metric",
              "properties": {
                "title": "Read/Write Capacity",
                "metrics": [
                  ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "${TableName}"],
                  [".", "ConsumedWriteCapacityUnits", ".", "."]
                ],
                "period": 60,
                "stat": "Sum",
                "region": "${AWS::Region}"
              }
            },
            {
              "type": "metric",
              "properties": {
                "title": "Latency",
                "metrics": [
                  ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", "${TableName}", "Operation", "GetItem"],
                  ["...", "Query"],
                  ["...", "PutItem"]
                ],
                "period": 60,
                "stat": "Average",
                "region": "${AWS::Region}"
              }
            },
            {
              "type": "metric",
              "properties": {
                "title": "Throttled Requests",
                "metrics": [
                  ["AWS/DynamoDB", "ThrottledRequests", "TableName", "${TableName}"]
                ],
                "period": 60,
                "stat": "Sum",
                "region": "${AWS::Region}"
              }
            },
            {
              "type": "metric",
              "properties": {
                "title": "System Errors",
                "metrics": [
                  ["AWS/DynamoDB", "SystemErrors", "TableName", "${TableName}"]
                ],
                "period": 60,
                "stat": "Sum",
                "region": "${AWS::Region}"
              }
            }
          ]
        }

  #============================================
  # アラーム
  #============================================
  ThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'megamart-dynamodb-throttle-${Environment}'
      AlarmDescription: DynamoDB throttling detected
      MetricName: ThrottledRequests
      Namespace: AWS/DynamoDB
      Dimensions:
        - Name: TableName
          Value: !Ref TableName
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref AlertTopic

  LatencyAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'megamart-dynamodb-latency-${Environment}'
      AlarmDescription: DynamoDB latency too high
      MetricName: SuccessfulRequestLatency
      Namespace: AWS/DynamoDB
      Dimensions:
        - Name: TableName
          Value: !Ref TableName
        - Name: Operation
          Value: Query
      Statistic: p99
      Period: 300
      EvaluationPeriods: 3
      Threshold: 100  # 100ms
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref AlertTopic

  SystemErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'megamart-dynamodb-errors-${Environment}'
      AlarmDescription: DynamoDB system errors detected
      MetricName: SystemErrors
      Namespace: AWS/DynamoDB
      Dimensions:
        - Name: TableName
          Value: !Ref TableName
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      AlarmActions:
        - !Ref AlertTopic
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
