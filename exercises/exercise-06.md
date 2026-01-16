# 課題6: EC企業のデータレイク構築

## 1. 課題の分類

| 項目 | 内容 |
|------|------|
| **カテゴリ** | データ基盤 |
| **難易度** | 初級〜中級（Level 2-3） |
| **所要時間** | 5-6時間 |
| **前提スキル** | SQL基礎、データ分析の概念 |
| **関連キーワード** | S3, Glue, Athena, QuickSight, データレイク, ETL |

---

## 2. シナリオ

### 企業プロファイル

| 項目 | 内容 |
|------|------|
| **企業名** | MegaMart株式会社 |
| **業種** | 総合EC（家電・日用品・ファッション） |
| **従業員数** | 500名（データチーム10名） |
| **月間購買件数** | 100万件 |
| **SKU数** | 10万点 |
| **月間PV** | 5000万PV |

### 現状の課題

```
MegaMart株式会社は急成長する総合ECサイトを運営しています。
データ活用において以下の課題を抱えています：

1. データサイロ化
   - 購買データはRDS (MySQL)
   - アクセスログはElasticsearch
   - 商品データはDynamoDB
   - それぞれ別々に分析、統合できない

2. 分析の遅延
   - 月次レポート作成に3日かかる
   - アドホック分析の依頼対応に1週間
   - リアルタイムな意思決定ができない

3. コスト非効率
   - 分析用に本番DBのレプリカを使用
   - 高額なBIツールのライセンス費用
   - データエンジニアの工数が分析に消費

4. スケーラビリティの限界
   - データ量増加でクエリが遅くなっている
   - 過去データの保持コストが増大
   - 新しい分析要件への対応が困難
```

### ビジネス目標

| KPI | 現状 | 目標 |
|-----|------|------|
| 月次レポート作成時間 | 3日 | 自動化（0日） |
| アドホック分析対応 | 1週間 | 1時間以内（セルフサービス） |
| データ統合率 | 0%（サイロ化） | 100% |
| 過去データ保持期間 | 1年 | 5年以上 |
| 分析コスト | 月100万円 | 月30万円 |

---

## 3. 達成目標（ゴール）

### 主要な学習成果

```
この課題を完了すると、以下ができるようになります：

1. S3ベースのデータレイク構築
   - Raw/Processed/Curatedの3層アーキテクチャ
   - パーティショニングによる効率化
   - ライフサイクル管理でコスト最適化

2. AWS Glueによるデータ統合
   - クローラーによるスキーマ自動検出
   - ETLジョブでのデータ変換
   - Data Catalogによるメタデータ管理

3. Amazon Athenaによるクエリ分析
   - サーバーレスでのSQLクエリ
   - パーティションプルーニング
   - クエリ結果のキャッシング

4. Amazon QuickSightによるBI
   - ダッシュボード作成
   - SPICE によるパフォーマンス最適化
   - セルフサービス分析の実現
```

### 合格基準

| 項目 | 基準 |
|------|------|
| データレイク | S3に3層構造でデータが格納されていること |
| ETL | Glueジョブで日次データ処理が自動化されていること |
| クエリ | Athenaで主要な分析クエリが実行できること |
| ダッシュボード | QuickSightで売上ダッシュボードが作成されていること |
| コスト | スキャン量の最適化が実装されていること |

---

## 4. 使用するAWSサービス

### コア技術スタック

```yaml
ストレージ:
  - Amazon S3: データレイクストレージ
  - S3 Glacier: 長期アーカイブ

データ処理:
  - AWS Glue: ETL、データカタログ
  - AWS Glue DataBrew: データ準備（ノーコード）
  - Amazon EMR: 大規模データ処理（オプション）

クエリエンジン:
  - Amazon Athena: サーバーレスSQL
  - Amazon Redshift Spectrum: DWH連携（オプション）

可視化:
  - Amazon QuickSight: BIダッシュボード

オーケストレーション:
  - AWS Step Functions: ワークフロー管理
  - Amazon EventBridge: スケジュール実行

セキュリティ:
  - AWS Lake Formation: データレイクガバナンス
  - AWS IAM: アクセス制御
  - AWS KMS: 暗号化
```

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| オブジェクトストレージ | S3 | Cloud Storage |
| データカタログ | Glue Data Catalog | Data Catalog |
| ETL | Glue | Dataflow / Dataproc |
| サーバーレスクエリ | Athena | BigQuery |
| BI | QuickSight | Looker |

---

## 5. 前提条件

### 技術要件

```bash
# 必要なCLIツール
aws --version          # 2.x
python --version       # 3.9+

# AWS設定
aws configure
export AWS_REGION=ap-northeast-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export DATALAKE_BUCKET=megamart-datalake-${AWS_ACCOUNT_ID}
```

### 事前準備

```bash
# サンプルデータの概要
# 以下のデータソースを想定:

1. 購買データ (orders.csv)
   - order_id, customer_id, order_date, total_amount, status

2. 注文明細 (order_items.csv)
   - order_item_id, order_id, product_id, quantity, unit_price

3. 商品マスタ (products.csv)
   - product_id, product_name, category, subcategory, brand, price

4. 顧客データ (customers.csv)
   - customer_id, name, email, prefecture, city, registration_date

5. アクセスログ (access_logs.json)
   - timestamp, user_id, page_url, action, device, session_id
```

---

## 6. アーキテクチャ図

### 全体構成

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Data Sources                                      │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   RDS MySQL  │  │  DynamoDB    │  │ CloudWatch   │  │   外部API    │   │
│  │  (購買データ) │  │ (商品マスタ)  │  │    Logs      │  │  (広告データ) │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │            │
└─────────┼─────────────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Data Ingestion Layer                                 │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    AWS Glue / DMS / Kinesis Firehose                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
└──────────────────────────────────────┼───────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Amazon S3 Data Lake                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           Raw Zone                                   │   │
│  │  s3://megamart-datalake/raw/                                        │   │
│  │  ├── orders/year=2024/month=01/day=15/orders.csv                   │   │
│  │  ├── products/products.json                                         │   │
│  │  ├── customers/customers.csv                                        │   │
│  │  └── access_logs/year=2024/month=01/day=15/*.json                  │   │
│  │                                                                      │   │
│  │  特徴: ソースデータそのまま、変換なし                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      │ AWS Glue ETL                          │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Processed Zone                               │   │
│  │  s3://megamart-datalake/processed/                                  │   │
│  │  ├── orders/year=2024/month=01/day=15/*.parquet                    │   │
│  │  ├── products/*.parquet                                             │   │
│  │  ├── customers/*.parquet                                            │   │
│  │  └── access_logs/year=2024/month=01/day=15/*.parquet               │   │
│  │                                                                      │   │
│  │  特徴: Parquet形式、パーティション済み、クレンジング済み            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      │ AWS Glue ETL (集計・結合)             │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Curated Zone                                │   │
│  │  s3://megamart-datalake/curated/                                    │   │
│  │  ├── daily_sales/year=2024/month=01/day=15/*.parquet               │   │
│  │  ├── customer_segments/*.parquet                                    │   │
│  │  ├── product_performance/*.parquet                                  │   │
│  │  └── marketing_attribution/*.parquet                                │   │
│  │                                                                      │   │
│  │  特徴: ビジネス指標、集計済み、分析向け最適化                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Glue Data       │      │  Amazon Athena   │      │    QuickSight    │
│  Catalog         │      │                  │      │                  │
│  ┌────────────┐  │      │  ┌────────────┐  │      │  ┌────────────┐  │
│  │ Databases  │  │      │  │   SQL      │  │      │  │ Dashboard  │  │
│  │ - raw      │  │◀────▶│  │  Queries   │  │◀────▶│  │            │  │
│  │ - processed│  │      │  └────────────┘  │      │  │ ┌────────┐ │  │
│  │ - curated  │  │      │                  │      │  │ │ Chart  │ │  │
│  └────────────┘  │      │  Workgroups:     │      │  │ └────────┘ │  │
│                  │      │  - analysts      │      │  │ ┌────────┐ │  │
│  Tables:         │      │  - data-science  │      │  │ │ KPI    │ │  │
│  - orders        │      │  - marketing     │      │  │ └────────┘ │  │
│  - products      │      │                  │      │  └────────────┘  │
│  - customers     │      │  Query Results   │      │                  │
│  - access_logs   │      │  └─▶ S3 output   │      │  SPICE Dataset   │
│                  │      │                  │      │  (in-memory)     │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### データフロー

```
1. データ取り込み（日次）
   RDS → DMS → S3 Raw Zone
   DynamoDB → Glue → S3 Raw Zone
   CloudWatch Logs → Firehose → S3 Raw Zone

2. データ処理（日次 AM 6:00）
   Raw Zone → Glue ETL → Processed Zone
   - CSV/JSON → Parquet変換
   - パーティショニング
   - データ品質チェック

3. データ集計（日次 AM 7:00）
   Processed Zone → Glue ETL → Curated Zone
   - 日次売上集計
   - 顧客セグメント更新
   - KPI算出

4. 分析・可視化（随時）
   Athena: アドホッククエリ
   QuickSight: ダッシュボード自動更新
```

---

## 7. ハンズオン手順

### Step 1: S3データレイク構築

```bash
# データレイクバケット作成
aws s3 mb s3://${DATALAKE_BUCKET} --region ap-northeast-1

# バケットポリシー設定
cat > bucket-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyUnencryptedUploads",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*",
            "Condition": {
                "StringNotEquals": {
                    "s3:x-amz-server-side-encryption": "AES256"
                }
            }
        }
    ]
}
EOF

sed -i "s/\${BUCKET_NAME}/${DATALAKE_BUCKET}/g" bucket-policy.json
aws s3api put-bucket-policy --bucket ${DATALAKE_BUCKET} --policy file://bucket-policy.json

# バージョニング有効化
aws s3api put-bucket-versioning \
    --bucket ${DATALAKE_BUCKET} \
    --versioning-configuration Status=Enabled

# ライフサイクルポリシー設定
cat > lifecycle-policy.json << 'EOF'
{
    "Rules": [
        {
            "ID": "RawToGlacierAfter90Days",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "raw/"
            },
            "Transitions": [
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                }
            ]
        },
        {
            "ID": "ProcessedToIA",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "processed/"
            },
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                }
            ]
        },
        {
            "ID": "DeleteOldVersions",
            "Status": "Enabled",
            "Filter": {
                "Prefix": ""
            },
            "NoncurrentVersionExpiration": {
                "NoncurrentDays": 30
            }
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket ${DATALAKE_BUCKET} \
    --lifecycle-configuration file://lifecycle-policy.json

# フォルダ構造作成
aws s3api put-object --bucket ${DATALAKE_BUCKET} --key raw/
aws s3api put-object --bucket ${DATALAKE_BUCKET} --key processed/
aws s3api put-object --bucket ${DATALAKE_BUCKET} --key curated/
aws s3api put-object --bucket ${DATALAKE_BUCKET} --key athena-results/
```

### Step 2: サンプルデータ生成・アップロード

```python
# generate_sample_data.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import random

np.random.seed(42)

# 商品マスタ生成
def generate_products(n=1000):
    categories = ['Electronics', 'Fashion', 'Home', 'Food', 'Beauty']
    subcategories = {
        'Electronics': ['Smartphone', 'Laptop', 'Tablet', 'Accessories'],
        'Fashion': ['Mens', 'Womens', 'Kids', 'Shoes'],
        'Home': ['Furniture', 'Kitchen', 'Bedding', 'Decor'],
        'Food': ['Snacks', 'Beverages', 'Groceries', 'Organic'],
        'Beauty': ['Skincare', 'Makeup', 'Haircare', 'Fragrance']
    }
    brands = ['BrandA', 'BrandB', 'BrandC', 'BrandD', 'BrandE']

    products = []
    for i in range(1, n + 1):
        category = random.choice(categories)
        products.append({
            'product_id': f'P{i:06d}',
            'product_name': f'Product {i}',
            'category': category,
            'subcategory': random.choice(subcategories[category]),
            'brand': random.choice(brands),
            'price': round(random.uniform(100, 50000), 0),
            'cost': round(random.uniform(50, 25000), 0),
            'stock_quantity': random.randint(0, 1000),
            'created_at': (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat()
        })
    return pd.DataFrame(products)

# 顧客マスタ生成
def generate_customers(n=10000):
    prefectures = ['東京都', '大阪府', '愛知県', '神奈川県', '埼玉県', '千葉県', '福岡県', '北海道']
    segments = ['Gold', 'Silver', 'Bronze', 'New']

    customers = []
    for i in range(1, n + 1):
        reg_date = datetime.now() - timedelta(days=random.randint(1, 730))
        customers.append({
            'customer_id': f'C{i:08d}',
            'name': f'Customer {i}',
            'email': f'customer{i}@example.com',
            'prefecture': random.choice(prefectures),
            'age_group': random.choice(['20s', '30s', '40s', '50s', '60+']),
            'gender': random.choice(['M', 'F']),
            'segment': random.choice(segments),
            'registration_date': reg_date.strftime('%Y-%m-%d'),
            'lifetime_value': round(random.uniform(0, 500000), 0)
        })
    return pd.DataFrame(customers)

# 注文データ生成
def generate_orders(customers_df, products_df, n=100000, start_date='2024-01-01', end_date='2024-01-31'):
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    date_range = (end - start).days

    orders = []
    order_items = []

    for i in range(1, n + 1):
        order_date = start + timedelta(days=random.randint(0, date_range))
        customer = customers_df.sample(1).iloc[0]
        num_items = random.randint(1, 5)

        order_id = f'O{i:010d}'
        total_amount = 0

        for j in range(num_items):
            product = products_df.sample(1).iloc[0]
            quantity = random.randint(1, 3)
            unit_price = product['price']
            item_total = unit_price * quantity
            total_amount += item_total

            order_items.append({
                'order_item_id': f'OI{i:010d}{j:02d}',
                'order_id': order_id,
                'product_id': product['product_id'],
                'quantity': quantity,
                'unit_price': unit_price,
                'item_total': item_total
            })

        orders.append({
            'order_id': order_id,
            'customer_id': customer['customer_id'],
            'order_date': order_date.strftime('%Y-%m-%d'),
            'order_timestamp': order_date.strftime('%Y-%m-%d %H:%M:%S'),
            'total_amount': total_amount,
            'status': random.choices(['completed', 'shipped', 'pending', 'cancelled'],
                                    weights=[0.7, 0.15, 0.1, 0.05])[0],
            'payment_method': random.choice(['credit_card', 'convenience', 'bank_transfer']),
            'shipping_prefecture': customer['prefecture']
        })

    return pd.DataFrame(orders), pd.DataFrame(order_items)

# アクセスログ生成
def generate_access_logs(customers_df, products_df, n=500000, date='2024-01-15'):
    base_date = datetime.strptime(date, '%Y-%m-%d')
    actions = ['view', 'add_to_cart', 'purchase', 'search', 'click_ad']
    devices = ['mobile', 'desktop', 'tablet']
    pages = ['/home', '/category', '/product', '/cart', '/checkout', '/search']

    logs = []
    for i in range(n):
        timestamp = base_date + timedelta(
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59)
        )

        customer = customers_df.sample(1).iloc[0] if random.random() > 0.3 else None
        product = products_df.sample(1).iloc[0] if random.random() > 0.5 else None

        logs.append({
            'timestamp': timestamp.isoformat(),
            'user_id': customer['customer_id'] if customer is not None else None,
            'session_id': f'S{random.randint(1, 100000):010d}',
            'page_url': random.choice(pages),
            'product_id': product['product_id'] if product is not None else None,
            'action': random.choice(actions),
            'device': random.choice(devices),
            'referrer': random.choice(['google', 'direct', 'facebook', 'instagram', 'email']),
            'duration_seconds': random.randint(1, 300)
        })

    return logs

# データ生成実行
if __name__ == '__main__':
    print("Generating products...")
    products_df = generate_products(1000)
    products_df.to_csv('products.csv', index=False)
    products_df.to_json('products.json', orient='records', lines=True)

    print("Generating customers...")
    customers_df = generate_customers(10000)
    customers_df.to_csv('customers.csv', index=False)

    print("Generating orders...")
    orders_df, order_items_df = generate_orders(customers_df, products_df, 100000)
    orders_df.to_csv('orders.csv', index=False)
    order_items_df.to_csv('order_items.csv', index=False)

    print("Generating access logs...")
    access_logs = generate_access_logs(customers_df, products_df, 500000)
    with open('access_logs.json', 'w') as f:
        for log in access_logs:
            f.write(json.dumps(log) + '\n')

    print("Done!")
```

```bash
# データ生成
python generate_sample_data.py

# S3にアップロード
aws s3 cp products.csv s3://${DATALAKE_BUCKET}/raw/products/products.csv
aws s3 cp customers.csv s3://${DATALAKE_BUCKET}/raw/customers/customers.csv
aws s3 cp orders.csv s3://${DATALAKE_BUCKET}/raw/orders/year=2024/month=01/orders.csv
aws s3 cp order_items.csv s3://${DATALAKE_BUCKET}/raw/order_items/year=2024/month=01/order_items.csv
aws s3 cp access_logs.json s3://${DATALAKE_BUCKET}/raw/access_logs/year=2024/month=01/day=15/access_logs.json
```

### Step 3: Glue Data Catalog設定

```bash
# Glueデータベース作成
aws glue create-database \
    --database-input '{
        "Name": "megamart_raw",
        "Description": "Raw data zone for MegaMart"
    }'

aws glue create-database \
    --database-input '{
        "Name": "megamart_processed",
        "Description": "Processed data zone for MegaMart"
    }'

aws glue create-database \
    --database-input '{
        "Name": "megamart_curated",
        "Description": "Curated data zone for MegaMart"
    }'

# Glue IAMロール作成
cat > glue-role-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "glue.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

aws iam create-role \
    --role-name MegaMartGlueRole \
    --assume-role-policy-document file://glue-role-policy.json

aws iam attach-role-policy \
    --role-name MegaMartGlueRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole

aws iam attach-role-policy \
    --role-name MegaMartGlueRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

```bash
# Glueクローラー作成
cat > crawler-config.json << 'EOF'
{
    "Name": "megamart-raw-crawler",
    "Role": "arn:aws:iam::ACCOUNT_ID:role/MegaMartGlueRole",
    "DatabaseName": "megamart_raw",
    "Targets": {
        "S3Targets": [
            {
                "Path": "s3://BUCKET_NAME/raw/products/"
            },
            {
                "Path": "s3://BUCKET_NAME/raw/customers/"
            },
            {
                "Path": "s3://BUCKET_NAME/raw/orders/"
            },
            {
                "Path": "s3://BUCKET_NAME/raw/order_items/"
            },
            {
                "Path": "s3://BUCKET_NAME/raw/access_logs/"
            }
        ]
    },
    "SchemaChangePolicy": {
        "UpdateBehavior": "UPDATE_IN_DATABASE",
        "DeleteBehavior": "LOG"
    },
    "RecrawlPolicy": {
        "RecrawlBehavior": "CRAWL_NEW_FOLDERS_ONLY"
    },
    "Configuration": "{\"Version\":1.0,\"Grouping\":{\"TableGroupingPolicy\":\"CombineCompatibleSchemas\"}}"
}
EOF

sed -i "s/ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" crawler-config.json
sed -i "s/BUCKET_NAME/${DATALAKE_BUCKET}/g" crawler-config.json

aws glue create-crawler --cli-input-json file://crawler-config.json

# クローラー実行
aws glue start-crawler --name megamart-raw-crawler

# 実行状態確認
aws glue get-crawler --name megamart-raw-crawler --query "Crawler.State"
```

### Step 4: Glue ETLジョブ作成

```python
# glue_etl_orders.py
# Glue ETLスクリプト: 注文データの処理

import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql.functions import col, to_date, year, month, dayofmonth, sum as spark_sum

# パラメータ取得
args = getResolvedOptions(sys.argv, ['JOB_NAME', 'source_bucket', 'target_bucket'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

source_bucket = args['source_bucket']
target_bucket = args['target_bucket']

# 注文データの読み込み
orders_dyf = glueContext.create_dynamic_frame.from_catalog(
    database="megamart_raw",
    table_name="orders"
)

order_items_dyf = glueContext.create_dynamic_frame.from_catalog(
    database="megamart_raw",
    table_name="order_items"
)

# DataFrameに変換して処理
orders_df = orders_dyf.toDF()
order_items_df = order_items_dyf.toDF()

# データクレンジング
orders_cleaned = orders_df \
    .dropna(subset=['order_id', 'customer_id', 'order_date']) \
    .filter(col('status') != 'cancelled') \
    .withColumn('order_date_parsed', to_date(col('order_date'), 'yyyy-MM-dd')) \
    .withColumn('year', year(col('order_date_parsed'))) \
    .withColumn('month', month(col('order_date_parsed'))) \
    .withColumn('day', dayofmonth(col('order_date_parsed')))

order_items_cleaned = order_items_df \
    .dropna(subset=['order_item_id', 'order_id', 'product_id'])

# 注文と明細を結合
orders_with_items = orders_cleaned.join(
    order_items_cleaned,
    on='order_id',
    how='left'
)

# DynamicFrameに戻す
orders_processed_dyf = DynamicFrame.fromDF(orders_cleaned, glueContext, "orders_processed")
order_items_processed_dyf = DynamicFrame.fromDF(order_items_cleaned, glueContext, "order_items_processed")

# Parquet形式で書き出し（パーティション付き）
glueContext.write_dynamic_frame.from_options(
    frame=orders_processed_dyf,
    connection_type="s3",
    connection_options={
        "path": f"s3://{target_bucket}/processed/orders/",
        "partitionKeys": ["year", "month"]
    },
    format="parquet",
    format_options={"compression": "snappy"}
)

glueContext.write_dynamic_frame.from_options(
    frame=order_items_processed_dyf,
    connection_type="s3",
    connection_options={
        "path": f"s3://{target_bucket}/processed/order_items/"
    },
    format="parquet",
    format_options={"compression": "snappy"}
)

job.commit()
```

```python
# glue_etl_daily_sales.py
# Glue ETLスクリプト: 日次売上集計（Curated Zone）

import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql.functions import col, sum as spark_sum, count, avg, max as spark_max

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'target_bucket', 'process_date'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

target_bucket = args['target_bucket']
process_date = args['process_date']  # YYYY-MM-DD形式

# Processedゾーンからデータ読み込み
orders_df = spark.read.parquet(f"s3://{target_bucket}/processed/orders/")
order_items_df = spark.read.parquet(f"s3://{target_bucket}/processed/order_items/")
products_df = spark.read.parquet(f"s3://{target_bucket}/processed/products/")
customers_df = spark.read.parquet(f"s3://{target_bucket}/processed/customers/")

# 日次売上サマリー
daily_sales = orders_df \
    .filter(col('order_date') == process_date) \
    .join(order_items_df, 'order_id') \
    .join(products_df, 'product_id') \
    .groupBy('order_date', 'category', 'subcategory') \
    .agg(
        spark_sum('item_total').alias('total_sales'),
        count('order_id').alias('order_count'),
        spark_sum('quantity').alias('total_quantity'),
        avg('item_total').alias('avg_order_value')
    )

# カテゴリ別売上ランキング
category_ranking = orders_df \
    .filter(col('order_date') == process_date) \
    .join(order_items_df, 'order_id') \
    .join(products_df, 'product_id') \
    .groupBy('category') \
    .agg(
        spark_sum('item_total').alias('category_sales')
    ) \
    .orderBy(col('category_sales').desc())

# 顧客セグメント別売上
segment_sales = orders_df \
    .filter(col('order_date') == process_date) \
    .join(customers_df, 'customer_id') \
    .groupBy('segment', 'order_date') \
    .agg(
        spark_sum('total_amount').alias('segment_total'),
        count('order_id').alias('segment_orders'),
        avg('total_amount').alias('segment_avg')
    )

# 結果を書き出し
daily_sales.write \
    .mode('overwrite') \
    .partitionBy('order_date') \
    .parquet(f"s3://{target_bucket}/curated/daily_sales/")

category_ranking.write \
    .mode('overwrite') \
    .parquet(f"s3://{target_bucket}/curated/category_ranking/date={process_date}/")

segment_sales.write \
    .mode('overwrite') \
    .partitionBy('order_date') \
    .parquet(f"s3://{target_bucket}/curated/segment_sales/")

job.commit()
```

```bash
# ETLジョブ作成
aws glue create-job \
    --name megamart-orders-etl \
    --role arn:aws:iam::${AWS_ACCOUNT_ID}:role/MegaMartGlueRole \
    --command '{
        "Name": "glueetl",
        "ScriptLocation": "s3://'${DATALAKE_BUCKET}'/scripts/glue_etl_orders.py",
        "PythonVersion": "3"
    }' \
    --default-arguments '{
        "--source_bucket": "'${DATALAKE_BUCKET}'",
        "--target_bucket": "'${DATALAKE_BUCKET}'",
        "--job-language": "python",
        "--enable-metrics": "true",
        "--enable-continuous-cloudwatch-log": "true"
    }' \
    --glue-version "4.0" \
    --number-of-workers 2 \
    --worker-type G.1X

# スクリプトをS3にアップロード
aws s3 cp glue_etl_orders.py s3://${DATALAKE_BUCKET}/scripts/
aws s3 cp glue_etl_daily_sales.py s3://${DATALAKE_BUCKET}/scripts/
```

### Step 5: Athenaクエリ設定

```bash
# Athena Workgroup作成
aws athena create-work-group \
    --name megamart-analysts \
    --configuration '{
        "ResultConfiguration": {
            "OutputLocation": "s3://'${DATALAKE_BUCKET}'/athena-results/"
        },
        "EnforceWorkGroupConfiguration": true,
        "PublishCloudWatchMetricsEnabled": true,
        "BytesScannedCutoffPerQuery": 10737418240
    }' \
    --description "Workgroup for MegaMart analysts"
```

```sql
-- Athenaでテーブル定義（Processed Zone）
-- processed_orders テーブル
CREATE EXTERNAL TABLE IF NOT EXISTS megamart_processed.orders (
    order_id STRING,
    customer_id STRING,
    order_date STRING,
    order_timestamp STRING,
    total_amount DOUBLE,
    status STRING,
    payment_method STRING,
    shipping_prefecture STRING,
    order_date_parsed DATE,
    day INT
)
PARTITIONED BY (year INT, month INT)
STORED AS PARQUET
LOCATION 's3://megamart-datalake-ACCOUNT_ID/processed/orders/'
TBLPROPERTIES ('parquet.compression'='SNAPPY');

-- パーティション追加
MSCK REPAIR TABLE megamart_processed.orders;

-- processed_order_items テーブル
CREATE EXTERNAL TABLE IF NOT EXISTS megamart_processed.order_items (
    order_item_id STRING,
    order_id STRING,
    product_id STRING,
    quantity INT,
    unit_price DOUBLE,
    item_total DOUBLE
)
STORED AS PARQUET
LOCATION 's3://megamart-datalake-ACCOUNT_ID/processed/order_items/'
TBLPROPERTIES ('parquet.compression'='SNAPPY');

-- processed_products テーブル
CREATE EXTERNAL TABLE IF NOT EXISTS megamart_processed.products (
    product_id STRING,
    product_name STRING,
    category STRING,
    subcategory STRING,
    brand STRING,
    price DOUBLE,
    cost DOUBLE,
    stock_quantity INT,
    created_at STRING
)
STORED AS PARQUET
LOCATION 's3://megamart-datalake-ACCOUNT_ID/processed/products/';

-- processed_customers テーブル
CREATE EXTERNAL TABLE IF NOT EXISTS megamart_processed.customers (
    customer_id STRING,
    name STRING,
    email STRING,
    prefecture STRING,
    age_group STRING,
    gender STRING,
    segment STRING,
    registration_date STRING,
    lifetime_value DOUBLE
)
STORED AS PARQUET
LOCATION 's3://megamart-datalake-ACCOUNT_ID/processed/customers/';
```

```sql
-- 分析クエリ例

-- 1. 日別売上推移
SELECT
    order_date,
    COUNT(DISTINCT order_id) as order_count,
    SUM(total_amount) as total_sales,
    AVG(total_amount) as avg_order_value
FROM megamart_processed.orders
WHERE year = 2024 AND month = 1
GROUP BY order_date
ORDER BY order_date;

-- 2. カテゴリ別売上TOP10
SELECT
    p.category,
    p.subcategory,
    SUM(oi.item_total) as total_sales,
    COUNT(DISTINCT o.order_id) as order_count,
    SUM(oi.quantity) as total_quantity
FROM megamart_processed.orders o
JOIN megamart_processed.order_items oi ON o.order_id = oi.order_id
JOIN megamart_processed.products p ON oi.product_id = p.product_id
WHERE o.year = 2024 AND o.month = 1
GROUP BY p.category, p.subcategory
ORDER BY total_sales DESC
LIMIT 10;

-- 3. 顧客セグメント分析
SELECT
    c.segment,
    COUNT(DISTINCT c.customer_id) as customer_count,
    COUNT(DISTINCT o.order_id) as order_count,
    SUM(o.total_amount) as total_sales,
    AVG(o.total_amount) as avg_order_value,
    SUM(o.total_amount) / COUNT(DISTINCT c.customer_id) as sales_per_customer
FROM megamart_processed.customers c
LEFT JOIN megamart_processed.orders o ON c.customer_id = o.customer_id
GROUP BY c.segment
ORDER BY total_sales DESC;

-- 4. 都道府県別売上マップ用データ
SELECT
    shipping_prefecture as prefecture,
    COUNT(DISTINCT order_id) as order_count,
    SUM(total_amount) as total_sales,
    AVG(total_amount) as avg_order_value
FROM megamart_processed.orders
WHERE year = 2024 AND month = 1
GROUP BY shipping_prefecture
ORDER BY total_sales DESC;

-- 5. 商品パフォーマンス分析
SELECT
    p.product_id,
    p.product_name,
    p.category,
    p.brand,
    SUM(oi.quantity) as total_sold,
    SUM(oi.item_total) as total_revenue,
    SUM(oi.item_total) - (SUM(oi.quantity) * p.cost) as gross_profit,
    (SUM(oi.item_total) - (SUM(oi.quantity) * p.cost)) / SUM(oi.item_total) * 100 as profit_margin
FROM megamart_processed.products p
JOIN megamart_processed.order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.product_name, p.category, p.brand, p.cost
ORDER BY total_revenue DESC
LIMIT 20;

-- 6. 時間帯別売上分析
SELECT
    HOUR(from_iso8601_timestamp(order_timestamp)) as hour,
    COUNT(DISTINCT order_id) as order_count,
    SUM(total_amount) as total_sales
FROM megamart_processed.orders
WHERE year = 2024 AND month = 1
GROUP BY HOUR(from_iso8601_timestamp(order_timestamp))
ORDER BY hour;
```

### Step 6: QuickSightダッシュボード作成

```bash
# QuickSight データソース作成
aws quicksight create-data-source \
    --aws-account-id ${AWS_ACCOUNT_ID} \
    --data-source-id megamart-athena-source \
    --name "MegaMart Athena" \
    --type ATHENA \
    --data-source-parameters '{
        "AthenaParameters": {
            "WorkGroup": "megamart-analysts"
        }
    }' \
    --permissions '[
        {
            "Principal": "arn:aws:quicksight:'${AWS_REGION}':'${AWS_ACCOUNT_ID}':user/default/admin",
            "Actions": [
                "quicksight:DescribeDataSource",
                "quicksight:DescribeDataSourcePermissions",
                "quicksight:PassDataSource",
                "quicksight:UpdateDataSource",
                "quicksight:DeleteDataSource",
                "quicksight:UpdateDataSourcePermissions"
            ]
        }
    ]'
```

```json
// QuickSight データセット定義 (daily_sales_dataset.json)
{
    "AwsAccountId": "ACCOUNT_ID",
    "DataSetId": "megamart-daily-sales",
    "Name": "MegaMart Daily Sales",
    "PhysicalTableMap": {
        "daily-sales-physical": {
            "CustomSql": {
                "DataSourceArn": "arn:aws:quicksight:ap-northeast-1:ACCOUNT_ID:datasource/megamart-athena-source",
                "Name": "DailySalesQuery",
                "SqlQuery": "SELECT o.order_date, p.category, p.subcategory, c.segment, c.prefecture, SUM(oi.item_total) as total_sales, COUNT(DISTINCT o.order_id) as order_count, SUM(oi.quantity) as total_quantity FROM megamart_processed.orders o JOIN megamart_processed.order_items oi ON o.order_id = oi.order_id JOIN megamart_processed.products p ON oi.product_id = p.product_id JOIN megamart_processed.customers c ON o.customer_id = c.customer_id WHERE o.year = 2024 GROUP BY o.order_date, p.category, p.subcategory, c.segment, c.prefecture",
                "Columns": [
                    {"Name": "order_date", "Type": "STRING"},
                    {"Name": "category", "Type": "STRING"},
                    {"Name": "subcategory", "Type": "STRING"},
                    {"Name": "segment", "Type": "STRING"},
                    {"Name": "prefecture", "Type": "STRING"},
                    {"Name": "total_sales", "Type": "DECIMAL"},
                    {"Name": "order_count", "Type": "INTEGER"},
                    {"Name": "total_quantity", "Type": "INTEGER"}
                ]
            }
        }
    },
    "LogicalTableMap": {
        "daily-sales-logical": {
            "Alias": "DailySales",
            "Source": {
                "PhysicalTableId": "daily-sales-physical"
            },
            "DataTransforms": [
                {
                    "CastColumnTypeOperation": {
                        "ColumnName": "order_date",
                        "NewColumnType": "DATETIME",
                        "Format": "yyyy-MM-dd"
                    }
                }
            ]
        }
    },
    "ImportMode": "SPICE"
}
```

```bash
# データセット作成
sed -i "s/ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" daily_sales_dataset.json
aws quicksight create-data-set --cli-input-json file://daily_sales_dataset.json
```

### Step 7: ETLパイプラインの自動化

```yaml
# step-functions-etl.yaml
# Step Functionsでのワークフロー定義

Comment: "MegaMart Daily ETL Pipeline"
StartAt: StartCrawler
States:
  StartCrawler:
    Type: Task
    Resource: arn:aws:states:::glue:startCrawler.sync
    Parameters:
      Name: megamart-raw-crawler
    Next: ProcessOrders

  ProcessOrders:
    Type: Task
    Resource: arn:aws:states:::glue:startJobRun.sync
    Parameters:
      JobName: megamart-orders-etl
      Arguments:
        "--source_bucket.$": "$.source_bucket"
        "--target_bucket.$": "$.target_bucket"
    Next: ProcessProducts
    Catch:
      - ErrorEquals: ["States.ALL"]
        Next: NotifyFailure

  ProcessProducts:
    Type: Task
    Resource: arn:aws:states:::glue:startJobRun.sync
    Parameters:
      JobName: megamart-products-etl
    Next: ProcessCustomers
    Catch:
      - ErrorEquals: ["States.ALL"]
        Next: NotifyFailure

  ProcessCustomers:
    Type: Task
    Resource: arn:aws:states:::glue:startJobRun.sync
    Parameters:
      JobName: megamart-customers-etl
    Next: UpdateCuratedZone
    Catch:
      - ErrorEquals: ["States.ALL"]
        Next: NotifyFailure

  UpdateCuratedZone:
    Type: Task
    Resource: arn:aws:states:::glue:startJobRun.sync
    Parameters:
      JobName: megamart-daily-sales-etl
      Arguments:
        "--process_date.$": "$.process_date"
    Next: RefreshQuickSight
    Catch:
      - ErrorEquals: ["States.ALL"]
        Next: NotifyFailure

  RefreshQuickSight:
    Type: Task
    Resource: arn:aws:states:::aws-sdk:quicksight:createIngestion
    Parameters:
      AwsAccountId.$: "$.account_id"
      DataSetId: megamart-daily-sales
      IngestionId.$: "States.Format('ingestion-{}', $$.Execution.Name)"
    Next: NotifySuccess
    Catch:
      - ErrorEquals: ["States.ALL"]
        Next: NotifyFailure

  NotifySuccess:
    Type: Task
    Resource: arn:aws:states:::sns:publish
    Parameters:
      TopicArn: arn:aws:sns:ap-northeast-1:ACCOUNT_ID:megamart-etl-notifications
      Message: "ETL Pipeline completed successfully"
    End: true

  NotifyFailure:
    Type: Task
    Resource: arn:aws:states:::sns:publish
    Parameters:
      TopicArn: arn:aws:sns:ap-northeast-1:ACCOUNT_ID:megamart-etl-notifications
      Message.$: "States.Format('ETL Pipeline failed: {}', $.Error)"
    End: true
```

```bash
# EventBridgeでスケジュール設定
aws events put-rule \
    --name megamart-daily-etl \
    --schedule-expression "cron(0 6 * * ? *)" \
    --description "Daily ETL at 6:00 AM JST"

aws events put-targets \
    --rule megamart-daily-etl \
    --targets '[{
        "Id": "1",
        "Arn": "arn:aws:states:ap-northeast-1:'${AWS_ACCOUNT_ID}':stateMachine:megamart-etl-pipeline",
        "RoleArn": "arn:aws:iam::'${AWS_ACCOUNT_ID}':role/EventBridgeStepFunctionsRole",
        "Input": "{\"source_bucket\": \"'${DATALAKE_BUCKET}'\", \"target_bucket\": \"'${DATALAKE_BUCKET}'\", \"process_date\": \"<aws.scheduler.scheduled-time>\", \"account_id\": \"'${AWS_ACCOUNT_ID}'\"}"
    }]'
```

---

## 8. トラブルシューティングチャレンジ

### Challenge 1: Athenaクエリが遅い

```
問題:
カテゴリ別売上クエリの実行に5分以上かかる。
データスキャン量も10GB以上になっている。

クエリ:
SELECT category, SUM(total_amount)
FROM megamart_processed.orders o
JOIN megamart_processed.order_items oi ON o.order_id = oi.order_id
JOIN megamart_processed.products p ON oi.product_id = p.product_id
WHERE order_date BETWEEN '2024-01-01' AND '2024-01-31'
GROUP BY category

調査項目:
1. パーティションの活用状況
2. ファイルフォーマットとサイズ
3. JOIN最適化
```

<details>
<summary>解決のヒント</summary>

```sql
-- 1. パーティションフィルタを使用
SELECT category, SUM(total_amount)
FROM megamart_processed.orders o
JOIN megamart_processed.order_items oi ON o.order_id = oi.order_id
JOIN megamart_processed.products p ON oi.product_id = p.product_id
WHERE o.year = 2024 AND o.month = 1  -- パーティションキーを使用
GROUP BY category;

-- 2. EXPLAIN で実行計画確認
EXPLAIN
SELECT category, SUM(total_amount)
FROM megamart_processed.orders ...;

-- 3. パーティション状態確認
SHOW PARTITIONS megamart_processed.orders;

-- 4. テーブル統計情報更新
ANALYZE TABLE megamart_processed.orders COMPUTE STATISTICS;

-- 5. Curatedゾーンの事前集計テーブルを使用
-- 日次バッチで集計済みデータを参照
SELECT category, SUM(total_sales)
FROM megamart_curated.daily_sales
WHERE order_date BETWEEN '2024-01-01' AND '2024-01-31'
GROUP BY category;

-- パフォーマンス比較:
-- Before: スキャン10GB、5分
-- After: スキャン100MB、5秒
```
</details>

### Challenge 2: Glue ETLジョブがOOM（メモリ不足）で失敗

```
問題:
日次ETLジョブが大量データ処理時にメモリ不足で失敗する。

エラーログ:
Container killed by YARN for exceeding memory limits.
10.0 GB of 10 GB physical memory used.

データ量:
- 入力: 500万レコード
- 処理後: 1億レコード（JOIN後）

調査項目:
1. Spark設定
2. データ処理パターン
3. ワーカー設定
```

<details>
<summary>解決のヒント</summary>

```python
# 1. ブロードキャスト結合の活用（小さいテーブル）
from pyspark.sql.functions import broadcast

# 商品マスタは小さいのでブロードキャスト
orders_with_products = orders_df.join(
    broadcast(products_df),  # 小さいテーブルをブロードキャスト
    'product_id'
)

# 2. データのパーティショニング
orders_df = orders_df.repartition(100, 'order_date')

# 3. キャッシュの適切な使用
products_df.cache()  # 複数回使うテーブルのみキャッシュ

# 4. 不要なカラムを早期に除外
orders_df = orders_df.select('order_id', 'customer_id', 'order_date', 'total_amount')

# 5. Glueジョブ設定の調整
# --conf spark.sql.shuffle.partitions=200
# --conf spark.sql.autoBroadcastJoinThreshold=52428800

# 6. ワーカー数とタイプの変更
aws glue update-job \
    --job-name megamart-orders-etl \
    --job-update '{
        "NumberOfWorkers": 10,
        "WorkerType": "G.2X"
    }'
```
</details>

### Challenge 3: QuickSight SPICEデータセットの更新エラー

```
問題:
SPICEへのデータインポートが失敗する。
QuickSightダッシュボードが古いデータのまま。

エラー:
SPICE ingestion failed: Source data exceeds SPICE limits

状況:
- データセットサイズ: 50GB
- SPICE容量: 10GB
- 更新頻度: 日次

調査項目:
1. SPICEの制限
2. データ量の最適化
3. 代替アプローチ
```

<details>
<summary>解決のヒント</summary>

```sql
-- 1. データ量を削減（直近データのみ）
-- データセットのクエリを修正
SELECT ...
FROM megamart_curated.daily_sales
WHERE order_date >= date_add('day', -90, current_date)  -- 直近90日のみ

-- 2. 集計レベルを上げる
-- 詳細データではなく日次/週次集計を使用
SELECT
    date_trunc('week', order_date) as week,
    category,
    SUM(total_sales) as weekly_sales
FROM megamart_curated.daily_sales
GROUP BY date_trunc('week', order_date), category

-- 3. Direct Queryモードに切り替え（SPICEを使わない）
aws quicksight update-data-set \
    --aws-account-id ${AWS_ACCOUNT_ID} \
    --data-set-id megamart-daily-sales \
    --import-mode DIRECT_QUERY

-- 4. SPICE容量の追加購入
-- QuickSightコンソールから追加購入（$0.25/GB/月）

-- 5. データセットの分割
-- カテゴリ別に複数のデータセットを作成
-- ダッシュボードでパラメータによる切り替え
```
</details>

---

## 9. 設計考慮ポイント

### データレイクアーキテクチャ

```yaml
3層アーキテクチャの設計原則:

Raw Zone:
  目的: ソースデータの忠実な保存
  形式: CSV, JSON, Avro（ソース形式そのまま）
  保持期間: 長期（Glacierへアーカイブ）
  アクセス: ETLジョブのみ
  注意点:
    - スキーマ変更に対応できるよう柔軟に
    - データリネージのためにメタデータ保持

Processed Zone:
  目的: 分析用に最適化されたデータ
  形式: Parquet（カラムナー形式）
  保持期間: 中期（1-2年）
  アクセス: データエンジニア、アナリスト
  最適化:
    - パーティショニング（日付、カテゴリ等）
    - 適切なファイルサイズ（128MB-1GB）
    - Snappy圧縮

Curated Zone:
  目的: ビジネス指標、集計データ
  形式: Parquet
  保持期間: 長期
  アクセス: 全ユーザー（セルフサービス）
  特徴:
    - ビジネス用語でのカラム名
    - 事前計算されたKPI
    - ドキュメント化されたスキーマ
```

### コスト最適化戦略

```
1. ストレージ階層化:
   - 頻繁アクセス: S3 Standard
   - 低頻度アクセス: S3 Standard-IA
   - アーカイブ: S3 Glacier

2. Athenaクエリ最適化:
   - パーティショニング: 最大90%のコスト削減
   - Parquet形式: 最大80%のコスト削減
   - 結果キャッシュ: 同一クエリの再実行を防止

3. Glueジョブ最適化:
   - Spot Instances: 最大70%のコスト削減
   - 適切なワーカー数: 過剰プロビジョニング防止
   - ジョブブックマーク: 増分処理

4. QuickSight最適化:
   - SPICEの適切なサイジング
   - ユーザーライセンスの管理
   - セッション容量の活用
```

---

## 10. 発展課題

### 上級チャレンジ1: リアルタイムデータ取り込み

```yaml
# Kinesis Firehoseでリアルタイムログ取り込み

KinesisFirehose:
  DeliveryStreamName: megamart-access-logs
  S3DestinationConfiguration:
    BucketARN: arn:aws:s3:::megamart-datalake-xxx
    Prefix: raw/access_logs/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/
    ErrorOutputPrefix: errors/
    BufferingHints:
      SizeInMBs: 128
      IntervalInSeconds: 300
    CompressionFormat: GZIP
    DataFormatConversionConfiguration:
      Enabled: true
      InputFormatConfiguration:
        Deserializer:
          JsonSerDe: {}
      OutputFormatConfiguration:
        Serializer:
          ParquetSerDe:
            Compression: SNAPPY
      SchemaConfiguration:
        DatabaseName: megamart_raw
        TableName: access_logs
        RoleARN: arn:aws:iam::xxx:role/FirehoseRole
```

### 上級チャレンジ2: Lake Formation によるガバナンス

```bash
# Lake Formationでデータアクセス制御

# データレイク管理者の設定
aws lakeformation put-data-lake-settings \
    --data-lake-settings '{
        "DataLakeAdmins": [
            {"DataLakePrincipalIdentifier": "arn:aws:iam::xxx:user/datalake-admin"}
        ]
    }'

# テーブルレベルの権限付与
aws lakeformation grant-permissions \
    --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::xxx:role/AnalystRole"}' \
    --resource '{
        "Table": {
            "DatabaseName": "megamart_curated",
            "Name": "daily_sales"
        }
    }' \
    --permissions SELECT

# カラムレベルの権限付与（PII保護）
aws lakeformation grant-permissions \
    --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::xxx:role/MarketingRole"}' \
    --resource '{
        "TableWithColumns": {
            "DatabaseName": "megamart_processed",
            "Name": "customers",
            "ColumnNames": ["customer_id", "segment", "prefecture"]
        }
    }' \
    --permissions SELECT
# email, name などのPIIカラムは除外
```

### 上級チャレンジ3: データ品質チェックの自動化

```python
# Glue Data Quality ルール定義

from awsgluedq.transforms import EvaluateDataQuality

# 品質ルールセット
rules = """
Rules = [
    ColumnValues "order_id" Uniqueness > 0.99,
    ColumnValues "customer_id" IsComplete,
    ColumnValues "total_amount" > 0,
    ColumnValues "order_date" matches "\\d{4}-\\d{2}-\\d{2}",
    RowCount > 1000,
    ColumnValues "status" in ["completed", "shipped", "pending", "cancelled"]
]
"""

# 品質チェック実行
quality_result = EvaluateDataQuality.apply(
    frame=orders_dyf,
    ruleset=rules,
    publishing_options={
        "dataQualityEvaluationContext": "orders_quality_check",
        "enableDataQualityCloudWatchMetrics": True,
        "enableDataQualityResultsPublishing": True
    }
)

# 結果に基づいてアクション
if quality_result['Outcome'] == 'Failed':
    # アラート送信、処理停止など
    raise Exception(f"Data quality check failed: {quality_result['FailedRules']}")
```

---

## 11. コスト見積もり

### 月額コスト概算

| サービス | 使用量 | 月額コスト |
|----------|--------|------------|
| S3 Standard | 500GB | $12 |
| S3 Standard-IA | 1TB | $12 |
| S3 Glacier | 2TB | $8 |
| Glue Crawler | 10時間/月 | $4 |
| Glue ETL | 100 DPU時間/月 | $44 |
| Athena | 1TB スキャン/月 | $5 |
| QuickSight | 5 Author + 20 Reader | $165 |
| Data Transfer | 100GB | $9 |
| **合計** | | **約 $259/月** |

### 従来構成との比較

```
従来構成（RDSレプリカ + 商用BI）:
- RDS レプリカ: $200/月
- BIツールライセンス: $500/月
- データエンジニア工数: $800/月相当
- 合計: 約 $1,500/月

データレイク構成:
- 合計: 約 $259/月

コスト削減: 83% (月額 $1,241 削減)
```

---

## 12. 学習のポイント

### 今回学んだこと

```
1. S3データレイク設計
   □ 3層アーキテクチャ（Raw/Processed/Curated）
   □ パーティショニング戦略
   □ ライフサイクル管理

2. AWS Glue活用
   □ クローラーによるスキーマ検出
   □ ETLジョブでのデータ変換
   □ Data Catalogによるメタデータ管理

3. Amazon Athena
   □ サーバーレスSQLクエリ
   □ パーティションプルーニング
   □ コスト最適化（スキャン量削減）

4. Amazon QuickSight
   □ SPICE によるパフォーマンス向上
   □ ダッシュボード作成
   □ セルフサービスBI
```

### GCPとの比較まとめ

| 観点 | AWS | GCP |
|------|-----|-----|
| サーバーレスクエリ | Athena（S3直接） | BigQuery（ストレージ統合） |
| ETL | Glue（Spark） | Dataflow（Apache Beam） |
| 価格モデル | スキャン量課金 | スキャン量 or 定額 |
| 使いやすさ | 複数サービス組合せ | BigQuery一体型 |

### 次のステップ

```
1. 発展学習:
   - Amazon Redshift でのDWH構築
   - Amazon EMR での大規模処理
   - AWS Lake Formation でのガバナンス

2. 実務応用:
   - リアルタイムダッシュボード構築
   - 機械学習パイプライン連携
   - データメッシュアーキテクチャ

3. 認定資格:
   - AWS Certified Data Analytics - Specialty
   - AWS Certified Solutions Architect - Professional
```
