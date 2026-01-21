# 課題18: 小売業のデータウェアハウス構築

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | データ基盤 |
| 処理タイプ | バッチ |
| 使用IaC | CloudFormation |
| 想定所要時間 | 6-7時間 |

---

## 2. シナリオ

### 企業プロファイル

| 項目 | 内容 |
|------|------|
| **企業名** | ShopSmart株式会社 |
| **業種** | 小売チェーン（総合スーパー） |
| **従業員数** | 3,000名（本部100名、店舗2,900名） |
| **店舗数** | 全国150店舗 |
| **月間売上** | 50億円 |
| **日次トランザクション** | 300万件 |
| **SKU数** | 5万点 |

### 現状の課題

```
ShopSmart株式会社は全国展開する総合スーパーチェーンです。
データ活用において以下の課題を抱えています：

1. データの分散
   - 各店舗のPOSデータが店舗サーバーに分散
   - 本部への日次連携に遅延が発生
   - 在庫データと売上データの不整合

2. レポート作成の非効率
   - Excelベースの手作業レポート
   - 月次決算に1週間かかる
   - 経営層への報告が遅い

3. 分析の限界
   - 店舗横断の分析ができない
   - 顧客購買行動の把握が困難
   - 需要予測ができない

4. データ品質の問題
   - 店舗ごとのデータ形式が異なる
   - マスタデータの不整合
   - 欠損データの把握が困難
```

### ビジネス目標

| KPI | 現状 | 目標 |
|-----|------|------|
| データ反映時間 | 翌日午後 | 当日午前6時 |
| 月次決算レポート | 1週間 | 翌営業日 |
| 分析対応時間 | 2-3日 | 1時間以内（セルフサービス） |
| データ品質スコア | 不明 | 95%以上 |
| 分析カバレッジ | 売上のみ | 売上・在庫・顧客・トレンド |

---

## 3. 達成目標（ゴール）

### 主要な学習成果

```
この課題を完了すると、以下ができるようになります：

1. Amazon Redshiftによるデータウェアハウス構築
   - Redshift Serverlessの設定と運用
   - スタースキーマのデータモデリング
   - クエリパフォーマンス最適化

2. AWS Glueによるデータパイプライン
   - ETLジョブの設計と実装
   - Data Catalogによるメタデータ管理
   - 増分ロードの実装

3. dbtによるデータ変換
   - dbtプロジェクトの構築
   - モデルの階層化（staging/intermediate/marts）
   - テストとドキュメント生成

4. 経営ダッシュボードの構築
   - QuickSightでのBI構築
   - KPIダッシュボードの設計
   - セルフサービス分析の実現
```

### 合格基準

| 項目 | 基準 |
|------|------|
| DWH構築 | Redshiftにスタースキーマでテーブルが構築されていること |
| ETL | Glueで日次データパイプラインが動作すること |
| dbt | dbtモデルでマートテーブルが生成されること |
| ダッシュボード | QuickSightで経営ダッシュボードが表示されること |
| パフォーマンス | 主要クエリが30秒以内に完了すること |

---

## 4. 使用するAWSサービス

### コア技術スタック

```yaml
データウェアハウス:
  - Amazon Redshift Serverless: サーバーレスDWH
  - Amazon Redshift Spectrum: S3データ直接クエリ

データ統合:
  - AWS Glue: ETL、データカタログ
  - AWS Glue DataBrew: データプロファイリング
  - Amazon S3: データレイク

データ変換:
  - dbt (data build tool): SQL変換、テスト、ドキュメント
  - dbt Cloud / dbt Core: 実行環境

可視化:
  - Amazon QuickSight: BIダッシュボード
  - Amazon Athena: アドホッククエリ

オーケストレーション:
  - AWS Step Functions: ワークフロー管理
  - Amazon EventBridge: スケジュール実行
  - Amazon MWAA (Airflow): 複雑なワークフロー（オプション）

監視:
  - Amazon CloudWatch: メトリクス・ログ
  - AWS Glue Data Quality: データ品質監視
```

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| DWH | Redshift | BigQuery |
| ETL | Glue | Dataflow / Dataproc |
| 変換ツール | dbt (両対応) | dbt (両対応) |
| BI | QuickSight | Looker |
| スキーマ管理 | Glue Data Catalog | Data Catalog |

---

## 5. 前提条件

### 技術要件

```bash
# 必要なCLIツール
aws --version          # 2.x
python --version       # 3.9+
dbt --version          # 1.7+
psql --version         # 14+

# AWS設定
aws configure
export AWS_REGION=ap-northeast-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

### 事前準備

```bash
# dbtのインストール
pip install dbt-redshift

# プロジェクト構造
shopsmart-dwh/
├── dbt_project/
│   ├── dbt_project.yml
│   ├── profiles.yml
│   ├── models/
│   │   ├── staging/
│   │   ├── intermediate/
│   │   └── marts/
│   ├── tests/
│   ├── macros/
│   └── seeds/
├── glue_jobs/
│   ├── extract_pos_data.py
│   └── load_to_redshift.py
├── terraform/
│   └── main.tf
└── dashboards/
    └── quicksight/
```

---

## 6. アーキテクチャ図

### 全体構成

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Data Sources                                      │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  店舗POS     │  │  在庫管理    │  │  顧客管理    │  │  外部データ   │   │
│  │  システム    │  │  システム    │  │  システム    │  │  (天気・競合) │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │            │
└─────────┼─────────────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Amazon S3                                       │
│                           (Data Lake - Raw Zone)                             │
│                                                                              │
│  s3://shopsmart-datalake/                                                   │
│  ├── raw/                                                                    │
│  │   ├── pos_transactions/dt=2024-01-15/*.parquet                          │
│  │   ├── inventory/dt=2024-01-15/*.parquet                                 │
│  │   ├── customers/full/*.parquet                                          │
│  │   ├── products/full/*.parquet                                           │
│  │   └── stores/full/*.parquet                                             │
│  └── processed/                                                              │
│      └── ...                                                                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ AWS Glue ETL
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AWS Glue Data Catalog                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Databases:                                                          │   │
│  │  ├── shopsmart_raw        (Raw層テーブル)                           │   │
│  │  ├── shopsmart_staging    (Staging層テーブル)                       │   │
│  │  └── shopsmart_marts      (Mart層テーブル - External)               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Amazon Redshift Serverless                             │
│                                                                              │
│  Workgroup: shopsmart-analytics                                             │
│  Namespace: shopsmart-dwh                                                    │
│  Base Capacity: 32 RPU                                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Schema: staging                               │   │
│  │  (dbt staging models - Source System Mirroring)                     │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │ stg_pos_    │  │ stg_        │  │ stg_        │                 │   │
│  │  │ transactions│  │ inventory   │  │ customers   │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│                                       │ dbt transformation                   │
│                                       ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Schema: intermediate                            │   │
│  │  (dbt intermediate models - Business Logic)                         │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │ int_daily_  │  │ int_product_│  │ int_customer│                 │   │
│  │  │ sales       │  │ performance │  │ _segments   │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│                                       │ dbt transformation                   │
│                                       ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Schema: marts                                │   │
│  │  (dbt mart models - Star Schema for Analytics)                      │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Dimension Tables                          │   │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │   │   │
│  │  │  │dim_date │ │dim_store│ │dim_     │ │dim_     │ │dim_   │ │   │   │
│  │  │  │         │ │         │ │product  │ │customer │ │time   │ │   │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────┘ │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                      Fact Tables                             │   │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │   │
│  │  │  │ fct_sales   │  │ fct_        │  │ fct_        │         │   │   │
│  │  │  │             │  │ inventory   │  │ customer_   │         │   │   │
│  │  │  │             │  │             │  │ activity    │         │   │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Amazon QuickSight                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     経営ダッシュボード                               │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │ 売上概要    │  │ 店舗別分析  │  │ 商品分析    │                 │   │
│  │  │ Dashboard   │  │ Dashboard   │  │ Dashboard   │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │ 在庫分析    │  │ 顧客分析    │  │ トレンド    │                 │   │
│  │  │ Dashboard   │  │ Dashboard   │  │ Dashboard   │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### データパイプラインフロー

```
1. データ抽出（毎日 AM 2:00）
   店舗POS → S3 Raw Zone (Parquet形式)

2. Glue ETL（AM 3:00）
   S3 Raw → クレンジング → S3 Processed

3. Redshift ロード（AM 4:00）
   S3 Processed → Redshift Staging Tables

4. dbt 変換（AM 5:00）
   Staging → Intermediate → Marts
   + テスト実行
   + ドキュメント生成

5. QuickSight 更新（AM 6:00）
   SPICE データセットリフレッシュ
```

---

## 7. ハンズオン手順

### Step 1: Redshift Serverless構築

```bash
# Namespace作成
aws redshift-serverless create-namespace \
    --namespace-name shopsmart-dwh \
    --admin-username admin \
    --admin-user-password "${REDSHIFT_PASSWORD}" \
    --db-name shopsmart \
    --default-iam-role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/RedshiftServerlessRole

# Workgroup作成
aws redshift-serverless create-workgroup \
    --workgroup-name shopsmart-analytics \
    --namespace-name shopsmart-dwh \
    --base-capacity 32 \
    --publicly-accessible \
    --subnet-ids subnet-xxx subnet-yyy subnet-zzz \
    --security-group-ids sg-xxx

# エンドポイント取得
REDSHIFT_ENDPOINT=$(aws redshift-serverless get-workgroup \
    --workgroup-name shopsmart-analytics \
    --query "workgroup.endpoint.address" \
    --output text)
```

```sql
-- Redshiftスキーマ作成
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS intermediate;
CREATE SCHEMA IF NOT EXISTS marts;

-- 外部スキーマ（S3直接クエリ用）
CREATE EXTERNAL SCHEMA IF NOT EXISTS raw_data
FROM DATA CATALOG
DATABASE 'shopsmart_raw'
IAM_ROLE 'arn:aws:iam::xxx:role/RedshiftSpectrumRole'
CREATE EXTERNAL DATABASE IF NOT EXISTS;
```

### Step 2: サンプルデータ準備

```python
# generate_retail_data.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import pyarrow as pa
import pyarrow.parquet as pq

np.random.seed(42)

# 店舗マスタ
def generate_stores(n=150):
    regions = ['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州']
    store_types = ['大型店', '標準店', '小型店']

    stores = []
    for i in range(1, n + 1):
        region = random.choice(regions)
        stores.append({
            'store_id': f'S{i:04d}',
            'store_name': f'ShopSmart {region}{i}号店',
            'region': region,
            'prefecture': f'{region}県',
            'store_type': random.choice(store_types),
            'floor_area': random.randint(500, 5000),
            'opening_date': (datetime.now() - timedelta(days=random.randint(365, 7300))).strftime('%Y-%m-%d'),
            'latitude': round(random.uniform(31, 45), 4),
            'longitude': round(random.uniform(130, 145), 4)
        })
    return pd.DataFrame(stores)

# 商品マスタ
def generate_products(n=50000):
    categories = {
        '食品': ['生鮮食品', '加工食品', '飲料', '菓子', '冷凍食品'],
        '日用品': ['洗剤', '衛生用品', 'ペット用品', '文具'],
        '衣料': ['メンズ', 'レディース', 'キッズ', '肌着'],
        '家電': ['調理家電', '生活家電', 'AV機器'],
        'その他': ['園芸', 'DIY', 'カー用品']
    }

    products = []
    for i in range(1, n + 1):
        category = random.choice(list(categories.keys()))
        subcategory = random.choice(categories[category])

        base_price = random.uniform(100, 10000)
        products.append({
            'product_id': f'P{i:06d}',
            'product_name': f'{subcategory}商品{i}',
            'category': category,
            'subcategory': subcategory,
            'brand': f'Brand{random.randint(1, 100)}',
            'unit_price': round(base_price, 0),
            'cost_price': round(base_price * random.uniform(0.5, 0.8), 0),
            'tax_rate': 0.10 if category == '食品' else 0.08,
            'is_perishable': category == '食品' and subcategory == '生鮮食品',
            'created_at': (datetime.now() - timedelta(days=random.randint(1, 1000))).strftime('%Y-%m-%d')
        })
    return pd.DataFrame(products)

# 顧客マスタ
def generate_customers(n=500000):
    segments = ['プレミアム', 'レギュラー', 'ライト', '新規']
    age_groups = ['10代', '20代', '30代', '40代', '50代', '60代以上']

    customers = []
    for i in range(1, n + 1):
        reg_date = datetime.now() - timedelta(days=random.randint(1, 1825))
        customers.append({
            'customer_id': f'C{i:08d}',
            'membership_type': random.choices(segments, weights=[0.1, 0.3, 0.4, 0.2])[0],
            'age_group': random.choice(age_groups),
            'gender': random.choice(['M', 'F']),
            'home_store_id': f'S{random.randint(1, 150):04d}',
            'registration_date': reg_date.strftime('%Y-%m-%d'),
            'total_purchases': random.randint(0, 500),
            'total_amount': round(random.uniform(0, 500000), 0)
        })
    return pd.DataFrame(customers)

# POSトランザクション
def generate_transactions(stores_df, products_df, customers_df, date, n_per_store=2000):
    transactions = []
    transaction_items = []

    for _, store in stores_df.iterrows():
        n_trans = int(n_per_store * random.uniform(0.8, 1.2))

        for t in range(n_trans):
            trans_id = f"T{store['store_id']}{date.strftime('%Y%m%d')}{t:06d}"
            customer = customers_df.sample(1).iloc[0] if random.random() > 0.3 else None

            # 時間帯分布（ピークは10-12時、17-19時）
            hour = np.random.choice(
                range(9, 22),
                p=[0.02, 0.08, 0.12, 0.10, 0.08, 0.06, 0.05, 0.05, 0.12, 0.15, 0.10, 0.05, 0.02]
            )
            trans_time = date.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))

            n_items = np.random.choice([1, 2, 3, 4, 5, 6, 7, 8], p=[0.15, 0.25, 0.25, 0.15, 0.10, 0.05, 0.03, 0.02])
            items = products_df.sample(n_items)

            total_amount = 0
            total_quantity = 0

            for _, item in items.iterrows():
                quantity = random.randint(1, 3)
                item_total = item['unit_price'] * quantity
                tax = item_total * item['tax_rate']

                transaction_items.append({
                    'transaction_id': trans_id,
                    'product_id': item['product_id'],
                    'quantity': quantity,
                    'unit_price': item['unit_price'],
                    'discount_amount': round(item_total * random.uniform(0, 0.1), 0) if random.random() > 0.8 else 0,
                    'tax_amount': round(tax, 0),
                    'line_total': round(item_total + tax, 0)
                })
                total_amount += item_total + tax
                total_quantity += quantity

            transactions.append({
                'transaction_id': trans_id,
                'store_id': store['store_id'],
                'customer_id': customer['customer_id'] if customer is not None else None,
                'transaction_datetime': trans_time.isoformat(),
                'transaction_date': date.strftime('%Y-%m-%d'),
                'total_items': total_quantity,
                'subtotal': round(total_amount * 0.9, 0),
                'tax_total': round(total_amount * 0.1, 0),
                'total_amount': round(total_amount, 0),
                'payment_method': random.choice(['現金', 'クレジット', '電子マネー', 'QRコード']),
                'pos_terminal_id': f"POS{random.randint(1, 10):02d}"
            })

    return pd.DataFrame(transactions), pd.DataFrame(transaction_items)

# データ生成実行
if __name__ == '__main__':
    print("Generating master data...")
    stores_df = generate_stores(150)
    products_df = generate_products(50000)
    customers_df = generate_customers(500000)

    stores_df.to_parquet('stores.parquet', index=False)
    products_df.to_parquet('products.parquet', index=False)
    customers_df.to_parquet('customers.parquet', index=False)

    print("Generating transaction data...")
    for day_offset in range(30):
        date = datetime(2024, 1, 1) + timedelta(days=day_offset)
        trans_df, items_df = generate_transactions(stores_df, products_df, customers_df, date)

        trans_df.to_parquet(f'transactions_{date.strftime("%Y%m%d")}.parquet', index=False)
        items_df.to_parquet(f'transaction_items_{date.strftime("%Y%m%d")}.parquet', index=False)

        print(f"  Generated {len(trans_df)} transactions for {date.strftime('%Y-%m-%d')}")

    print("Done!")
```

```bash
# データ生成
python generate_retail_data.py

# S3にアップロード
aws s3 cp stores.parquet s3://shopsmart-datalake/raw/stores/
aws s3 cp products.parquet s3://shopsmart-datalake/raw/products/
aws s3 cp customers.parquet s3://shopsmart-datalake/raw/customers/

for f in transactions_*.parquet; do
    date=$(echo $f | grep -oP '\d{8}')
    aws s3 cp $f s3://shopsmart-datalake/raw/pos_transactions/dt=${date:0:4}-${date:4:2}-${date:6:2}/
done
```

### Step 3: dbtプロジェクト構築

```yaml
# dbt_project.yml
name: 'shopsmart_dwh'
version: '1.0.0'
config-version: 2

profile: 'shopsmart_redshift'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

target-path: "target"
clean-targets:
  - "target"
  - "dbt_packages"

vars:
  start_date: '2024-01-01'

models:
  shopsmart_dwh:
    staging:
      +schema: staging
      +materialized: view
    intermediate:
      +schema: intermediate
      +materialized: table
    marts:
      +schema: marts
      +materialized: table
      dimensions:
        +materialized: table
      facts:
        +materialized: incremental
        +incremental_strategy: append
```

```yaml
# profiles.yml
shopsmart_redshift:
  target: dev
  outputs:
    dev:
      type: redshift
      host: "{{ env_var('REDSHIFT_HOST') }}"
      user: "{{ env_var('REDSHIFT_USER') }}"
      password: "{{ env_var('REDSHIFT_PASSWORD') }}"
      port: 5439
      dbname: shopsmart
      schema: public
      threads: 4
      keepalives_idle: 240
      connect_timeout: 10
      sslmode: require

    prod:
      type: redshift
      host: "{{ env_var('REDSHIFT_HOST') }}"
      user: "{{ env_var('REDSHIFT_USER') }}"
      password: "{{ env_var('REDSHIFT_PASSWORD') }}"
      port: 5439
      dbname: shopsmart
      schema: public
      threads: 8
      keepalives_idle: 240
```

```sql
-- models/staging/stg_pos_transactions.sql
{{ config(materialized='view') }}

with source as (
    select * from {{ source('raw', 'pos_transactions') }}
),

renamed as (
    select
        transaction_id,
        store_id,
        customer_id,
        cast(transaction_datetime as timestamp) as transaction_datetime,
        cast(transaction_date as date) as transaction_date,
        total_items,
        subtotal,
        tax_total,
        total_amount,
        payment_method,
        pos_terminal_id,
        current_timestamp as loaded_at
    from source
)

select * from renamed
```

```sql
-- models/staging/stg_stores.sql
{{ config(materialized='view') }}

with source as (
    select * from {{ source('raw', 'stores') }}
),

renamed as (
    select
        store_id,
        store_name,
        region,
        prefecture,
        store_type,
        floor_area,
        cast(opening_date as date) as opening_date,
        latitude,
        longitude,
        current_timestamp as loaded_at
    from source
)

select * from renamed
```

```sql
-- models/staging/stg_products.sql
{{ config(materialized='view') }}

with source as (
    select * from {{ source('raw', 'products') }}
),

renamed as (
    select
        product_id,
        product_name,
        category,
        subcategory,
        brand,
        unit_price,
        cost_price,
        tax_rate,
        is_perishable,
        cast(created_at as date) as created_at,
        current_timestamp as loaded_at
    from source
)

select * from renamed
```

```sql
-- models/intermediate/int_daily_store_sales.sql
{{ config(materialized='table') }}

with transactions as (
    select * from {{ ref('stg_pos_transactions') }}
),

stores as (
    select * from {{ ref('stg_stores') }}
),

daily_sales as (
    select
        t.transaction_date,
        t.store_id,
        s.store_name,
        s.region,
        s.store_type,
        count(distinct t.transaction_id) as transaction_count,
        count(distinct t.customer_id) as unique_customers,
        sum(t.total_items) as total_items_sold,
        sum(t.subtotal) as gross_sales,
        sum(t.tax_total) as tax_collected,
        sum(t.total_amount) as net_sales,
        avg(t.total_amount) as avg_transaction_value
    from transactions t
    left join stores s on t.store_id = s.store_id
    group by 1, 2, 3, 4, 5
)

select * from daily_sales
```

```sql
-- models/intermediate/int_product_performance.sql
{{ config(materialized='table') }}

with transaction_items as (
    select * from {{ ref('stg_transaction_items') }}
),

products as (
    select * from {{ ref('stg_products') }}
),

transactions as (
    select * from {{ ref('stg_pos_transactions') }}
),

product_sales as (
    select
        t.transaction_date,
        ti.product_id,
        p.product_name,
        p.category,
        p.subcategory,
        p.brand,
        sum(ti.quantity) as units_sold,
        sum(ti.line_total) as total_revenue,
        sum(ti.quantity * p.cost_price) as total_cost,
        sum(ti.line_total) - sum(ti.quantity * p.cost_price) as gross_profit,
        count(distinct t.transaction_id) as transaction_count,
        count(distinct t.store_id) as stores_sold
    from transaction_items ti
    join transactions t on ti.transaction_id = t.transaction_id
    join products p on ti.product_id = p.product_id
    group by 1, 2, 3, 4, 5, 6
)

select
    *,
    case when total_revenue > 0 then gross_profit / total_revenue else 0 end as profit_margin
from product_sales
```

```sql
-- models/marts/dimensions/dim_date.sql
{{ config(materialized='table') }}

with date_spine as (
    {{ dbt_utils.date_spine(
        datepart="day",
        start_date="cast('2020-01-01' as date)",
        end_date="cast('2025-12-31' as date)"
    ) }}
),

dates as (
    select
        cast(date_day as date) as date_key,
        extract(year from date_day) as year,
        extract(quarter from date_day) as quarter,
        extract(month from date_day) as month,
        extract(week from date_day) as week_of_year,
        extract(day from date_day) as day_of_month,
        extract(dow from date_day) as day_of_week,
        to_char(date_day, 'YYYY-MM') as year_month,
        to_char(date_day, 'YYYY-Q') || 'Q' as year_quarter,
        case when extract(dow from date_day) in (0, 6) then true else false end as is_weekend,
        case
            when to_char(date_day, 'MM-DD') in ('01-01', '01-02', '01-03', '02-11', '02-23', '03-20', '04-29', '05-03', '05-04', '05-05', '07-20', '08-11', '09-16', '09-23', '10-14', '11-03', '11-23')
            then true else false
        end as is_holiday
    from date_spine
)

select * from dates
```

```sql
-- models/marts/dimensions/dim_store.sql
{{ config(materialized='table') }}

with stores as (
    select * from {{ ref('stg_stores') }}
),

store_metrics as (
    select
        store_id,
        min(transaction_date) as first_sale_date,
        max(transaction_date) as last_sale_date,
        count(distinct transaction_date) as active_days
    from {{ ref('stg_pos_transactions') }}
    group by 1
)

select
    s.store_id as store_key,
    s.store_id,
    s.store_name,
    s.region,
    s.prefecture,
    s.store_type,
    s.floor_area,
    s.opening_date,
    s.latitude,
    s.longitude,
    coalesce(m.first_sale_date, s.opening_date) as first_sale_date,
    m.last_sale_date,
    m.active_days,
    case
        when s.floor_area >= 3000 then 'Large'
        when s.floor_area >= 1500 then 'Medium'
        else 'Small'
    end as size_category
from stores s
left join store_metrics m on s.store_id = m.store_id
```

```sql
-- models/marts/facts/fct_sales.sql
{{ config(
    materialized='incremental',
    unique_key='transaction_id',
    incremental_strategy='append'
) }}

with transactions as (
    select * from {{ ref('stg_pos_transactions') }}
    {% if is_incremental() %}
    where transaction_date > (select max(transaction_date) from {{ this }})
    {% endif %}
),

transaction_items as (
    select * from {{ ref('stg_transaction_items') }}
),

items_agg as (
    select
        transaction_id,
        count(*) as line_count,
        sum(quantity) as total_quantity,
        sum(discount_amount) as total_discount
    from transaction_items
    group by 1
)

select
    t.transaction_id,
    t.transaction_date as date_key,
    t.store_id as store_key,
    coalesce(t.customer_id, 'ANONYMOUS') as customer_key,
    t.transaction_datetime,
    t.payment_method,
    t.pos_terminal_id,
    i.line_count,
    i.total_quantity,
    t.subtotal as gross_amount,
    i.total_discount as discount_amount,
    t.tax_total as tax_amount,
    t.total_amount as net_amount,
    t.loaded_at
from transactions t
left join items_agg i on t.transaction_id = i.transaction_id
```

```yaml
-- models/staging/sources.yml
version: 2

sources:
  - name: raw
    database: shopsmart
    schema: raw_data
    tables:
      - name: pos_transactions
        description: "POS取引データ"
        columns:
          - name: transaction_id
            description: "取引ID"
            tests:
              - unique
              - not_null

      - name: stores
        description: "店舗マスタ"
        columns:
          - name: store_id
            tests:
              - unique
              - not_null

      - name: products
        description: "商品マスタ"
        columns:
          - name: product_id
            tests:
              - unique
              - not_null

      - name: customers
        description: "顧客マスタ"
```

```yaml
-- models/marts/schema.yml
version: 2

models:
  - name: fct_sales
    description: "売上ファクトテーブル"
    columns:
      - name: transaction_id
        description: "取引ID（主キー）"
        tests:
          - unique
          - not_null

      - name: date_key
        description: "日付キー"
        tests:
          - not_null
          - relationships:
              to: ref('dim_date')
              field: date_key

      - name: store_key
        description: "店舗キー"
        tests:
          - not_null
          - relationships:
              to: ref('dim_store')
              field: store_key

      - name: net_amount
        description: "純売上金額"
        tests:
          - not_null

  - name: dim_store
    description: "店舗ディメンション"
    columns:
      - name: store_key
        tests:
          - unique
          - not_null

  - name: dim_date
    description: "日付ディメンション"
    columns:
      - name: date_key
        tests:
          - unique
          - not_null
```

### Step 4: dbt実行

```bash
# dbtプロジェクトの依存関係インストール
cd dbt_project
dbt deps

# 接続テスト
dbt debug

# モデル実行
dbt run

# テスト実行
dbt test

# ドキュメント生成
dbt docs generate
dbt docs serve

# 本番実行（フルリフレッシュ）
dbt run --full-refresh

# 増分実行
dbt run --select fct_sales
```

### Step 5: Glue ETLジョブ

```python
# glue_jobs/daily_pos_etl.py
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql.functions import col, current_timestamp

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'source_path', 'target_path', 'process_date'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

source_path = args['source_path']
target_path = args['target_path']
process_date = args['process_date']

# POSデータ読み込み
pos_df = spark.read.parquet(f"{source_path}/pos_transactions/dt={process_date}/")

# データクレンジング
pos_cleaned = pos_df \
    .dropna(subset=['transaction_id', 'store_id', 'total_amount']) \
    .filter(col('total_amount') > 0) \
    .withColumn('etl_timestamp', current_timestamp())

# 重複チェック
duplicate_count = pos_cleaned.groupBy('transaction_id').count().filter(col('count') > 1).count()
if duplicate_count > 0:
    print(f"Warning: {duplicate_count} duplicate transaction_ids found")
    pos_cleaned = pos_cleaned.dropDuplicates(['transaction_id'])

# Redshiftに書き込み
pos_cleaned.write \
    .format("io.github.spark_redshift_community.spark.redshift") \
    .option("url", f"jdbc:redshift://{args['redshift_host']}:5439/shopsmart?user={args['redshift_user']}&password={args['redshift_password']}") \
    .option("dbtable", "staging.stg_pos_transactions_load") \
    .option("tempdir", f"s3://shopsmart-temp/{process_date}/") \
    .option("aws_iam_role", args['iam_role']) \
    .mode("overwrite") \
    .save()

# データ品質メトリクス出力
print(f"Processed {pos_cleaned.count()} records for {process_date}")

job.commit()
```

### Step 6: Step Functionsワークフロー

```json
{
  "Comment": "ShopSmart Daily DWH Pipeline",
  "StartAt": "ExtractPOSData",
  "States": {
    "ExtractPOSData": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": {
        "JobName": "shopsmart-extract-pos",
        "Arguments": {
          "--process_date.$": "$.process_date"
        }
      },
      "Next": "RunGlueCrawler",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "Next": "NotifyFailure"
      }]
    },
    "RunGlueCrawler": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startCrawler.sync",
      "Parameters": {
        "Name": "shopsmart-raw-crawler"
      },
      "Next": "LoadToRedshift"
    },
    "LoadToRedshift": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": {
        "JobName": "shopsmart-load-redshift"
      },
      "Next": "RunDbtModels"
    },
    "RunDbtModels": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:invoke",
      "Parameters": {
        "FunctionName": "shopsmart-dbt-runner",
        "Payload": {
          "command": "dbt run --select staging+ intermediate+ marts+"
        }
      },
      "Next": "RunDbtTests"
    },
    "RunDbtTests": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:invoke",
      "Parameters": {
        "FunctionName": "shopsmart-dbt-runner",
        "Payload": {
          "command": "dbt test"
        }
      },
      "Next": "RefreshQuickSight"
    },
    "RefreshQuickSight": {
      "Type": "Task",
      "Resource": "arn:aws:states:::aws-sdk:quicksight:createIngestion",
      "Parameters": {
        "AwsAccountId.$": "$.account_id",
        "DataSetId": "shopsmart-sales-dataset",
        "IngestionId.$": "States.Format('ingestion-{}', $$.Execution.Name)"
      },
      "Next": "NotifySuccess"
    },
    "NotifySuccess": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:ap-northeast-1:xxx:shopsmart-dwh-notifications",
        "Message": "Daily DWH pipeline completed successfully"
      },
      "End": true
    },
    "NotifyFailure": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:ap-northeast-1:xxx:shopsmart-dwh-notifications",
        "Message.$": "States.Format('DWH pipeline failed: {}', $.Error)"
      },
      "End": true
    }
  }
}
```

### Step 7: 分析クエリ例

```sql
-- 1. 日別売上サマリー
SELECT
    d.year_month,
    d.day_of_week,
    CASE d.day_of_week
        WHEN 0 THEN '日'
        WHEN 1 THEN '月'
        WHEN 2 THEN '火'
        WHEN 3 THEN '水'
        WHEN 4 THEN '木'
        WHEN 5 THEN '金'
        WHEN 6 THEN '土'
    END as day_name,
    COUNT(DISTINCT f.transaction_id) as transactions,
    SUM(f.net_amount) as total_sales,
    AVG(f.net_amount) as avg_transaction
FROM marts.fct_sales f
JOIN marts.dim_date d ON f.date_key = d.date_key
WHERE d.year = 2024
GROUP BY 1, 2, 3
ORDER BY 1, 2;

-- 2. 店舗別パフォーマンス
SELECT
    s.region,
    s.store_type,
    s.store_name,
    COUNT(DISTINCT f.transaction_id) as transactions,
    SUM(f.net_amount) as total_sales,
    SUM(f.net_amount) / s.floor_area as sales_per_sqm,
    AVG(f.net_amount) as avg_basket
FROM marts.fct_sales f
JOIN marts.dim_store s ON f.store_key = s.store_key
JOIN marts.dim_date d ON f.date_key = d.date_key
WHERE d.year_month = '2024-01'
GROUP BY 1, 2, 3, s.floor_area
ORDER BY total_sales DESC;

-- 3. 商品カテゴリ別ABC分析
WITH category_sales AS (
    SELECT
        p.category,
        SUM(pp.total_revenue) as revenue
    FROM intermediate.int_product_performance pp
    JOIN staging.stg_products p ON pp.product_id = p.product_id
    GROUP BY 1
),
ranked AS (
    SELECT
        category,
        revenue,
        SUM(revenue) OVER (ORDER BY revenue DESC) as cumulative_revenue,
        SUM(revenue) OVER () as total_revenue
    FROM category_sales
)
SELECT
    category,
    revenue,
    ROUND(revenue / total_revenue * 100, 2) as pct_of_total,
    ROUND(cumulative_revenue / total_revenue * 100, 2) as cumulative_pct,
    CASE
        WHEN cumulative_revenue / total_revenue <= 0.7 THEN 'A'
        WHEN cumulative_revenue / total_revenue <= 0.9 THEN 'B'
        ELSE 'C'
    END as abc_rank
FROM ranked
ORDER BY revenue DESC;

-- 4. 時間帯別売上分析
SELECT
    EXTRACT(HOUR FROM transaction_datetime) as hour,
    d.day_of_week,
    COUNT(*) as transactions,
    SUM(net_amount) as total_sales,
    AVG(net_amount) as avg_transaction
FROM marts.fct_sales f
JOIN marts.dim_date d ON f.date_key = d.date_key
WHERE d.year = 2024 AND d.month = 1
GROUP BY 1, 2
ORDER BY 2, 1;

-- 5. 顧客セグメント分析
SELECT
    c.membership_type,
    c.age_group,
    COUNT(DISTINCT f.customer_key) as customers,
    COUNT(f.transaction_id) as transactions,
    SUM(f.net_amount) as total_sales,
    AVG(f.net_amount) as avg_transaction,
    SUM(f.net_amount) / COUNT(DISTINCT f.customer_key) as sales_per_customer
FROM marts.fct_sales f
JOIN staging.stg_customers c ON f.customer_key = c.customer_id
JOIN marts.dim_date d ON f.date_key = d.date_key
WHERE d.year_month = '2024-01'
    AND f.customer_key != 'ANONYMOUS'
GROUP BY 1, 2
ORDER BY total_sales DESC;
```

---

## 8. トラブルシューティングチャレンジ

### Challenge 1: Redshiftクエリが遅い

```
問題:
店舗別売上レポートクエリが5分以上かかる。

クエリ:
SELECT s.store_name, SUM(f.net_amount)
FROM marts.fct_sales f
JOIN marts.dim_store s ON f.store_key = s.store_key
WHERE f.date_key BETWEEN '2024-01-01' AND '2024-01-31'
GROUP BY 1;

EXPLAIN結果:
- Seq Scan on fct_sales (rows=50,000,000)
- 大量のディスクI/O

調査項目:
1. テーブル設計（DISTKEY, SORTKEY）
2. 統計情報
3. クエリプラン
```

<details>
<summary>解決のヒント</summary>

```sql
-- 1. テーブル設計の確認
SELECT "table", diststyle, sortkey1
FROM svv_table_info
WHERE schema = 'marts';

-- 2. DISTKEY/SORTKEYの最適化
ALTER TABLE marts.fct_sales
ALTER DISTSTYLE KEY DISTKEY (store_key);

ALTER TABLE marts.fct_sales
ALTER SORTKEY (date_key, store_key);

-- 3. 統計情報更新
ANALYZE marts.fct_sales;

-- 4. テーブル最適化（VACUUM）
VACUUM FULL marts.fct_sales;

-- 5. クエリの書き換え（日付フィルタを先に）
WITH filtered_sales AS (
    SELECT store_key, net_amount
    FROM marts.fct_sales
    WHERE date_key >= '2024-01-01' AND date_key < '2024-02-01'
)
SELECT s.store_name, SUM(fs.net_amount)
FROM filtered_sales fs
JOIN marts.dim_store s ON fs.store_key = s.store_key
GROUP BY 1;

-- 6. マテリアライズドビューの活用
CREATE MATERIALIZED VIEW mv_monthly_store_sales AS
SELECT
    date_trunc('month', date_key) as month,
    store_key,
    SUM(net_amount) as total_sales
FROM marts.fct_sales
GROUP BY 1, 2;
```
</details>

### Challenge 2: dbtモデルのテストが失敗する

```
問題:
fct_salesのstore_key参照整合性テストが失敗する。
一部のトランザクションのstore_keyがdim_storeに存在しない。

エラー:
Failure in test relationships_fct_sales_store_key__store_key__ref_dim_store_
Got 1523 results, configured to fail if != 0

調査項目:
1. ソースデータの確認
2. ETL処理の確認
3. マスタデータの整合性
```

<details>
<summary>解決のヒント</summary>

```sql
-- 1. 問題のあるレコードを特定
SELECT DISTINCT f.store_key
FROM marts.fct_sales f
LEFT JOIN marts.dim_store s ON f.store_key = s.store_key
WHERE s.store_key IS NULL;

-- 2. ソースデータを確認
SELECT DISTINCT store_id
FROM staging.stg_pos_transactions
WHERE store_id NOT IN (SELECT store_id FROM staging.stg_stores);

-- 3. dbtテストを条件付きに変更（schema.yml）
- name: store_key
  tests:
    - relationships:
        to: ref('dim_store')
        field: store_key
        config:
          where: "store_key != 'UNKNOWN'"

-- 4. 不明な店舗を扱うサロゲートキー追加
-- dim_store.sql に追加
UNION ALL
SELECT
    'UNKNOWN' as store_key,
    'UNKNOWN' as store_id,
    'Unknown Store' as store_name,
    'Unknown' as region,
    ...

-- 5. fct_sales.sql でCOALESCE
SELECT
    ...
    COALESCE(t.store_id, 'UNKNOWN') as store_key,
    ...
```
</details>

### Challenge 3: 日次パイプラインがタイムアウト

```
問題:
Glue ETLジョブがタイムアウトし、dbt実行まで到達しない。
朝6時のダッシュボード更新に間に合わない。

ログ:
- Glue job duration: 4時間（タイムアウト）
- S3へのParquet書き込みで停滞

データ量:
- 日次トランザクション: 300万件
- ファイルサイズ: 5GB

調査項目:
1. Glueジョブの設定
2. Spark設定
3. パーティショニング
```

<details>
<summary>解決のヒント</summary>

```python
# 1. Glueジョブのワーカー数を増やす
aws glue update-job \
    --job-name shopsmart-extract-pos \
    --job-update '{
        "NumberOfWorkers": 20,
        "WorkerType": "G.2X"
    }'

# 2. Sparkパーティション最適化
# glue_jobs/daily_pos_etl.py
spark.conf.set("spark.sql.shuffle.partitions", "200")
spark.conf.set("spark.default.parallelism", "200")

# 3. 書き込み時のパーティション数を制御
pos_cleaned.repartition(100).write \
    .format("parquet") \
    .mode("overwrite") \
    .save(output_path)

# 4. Glueブックマークで増分処理
# すでにロード済みのデータをスキップ

# 5. COPY コマンドに変更（Glue → S3 → COPY）
# Redshiftへの直接書き込みより高速

COPY staging.stg_pos_transactions
FROM 's3://shopsmart-datalake/processed/pos/'
IAM_ROLE 'arn:aws:iam::xxx:role/RedshiftCopyRole'
FORMAT AS PARQUET;

# 6. 並列処理を分割
# 店舗グループごとに並列実行
```
</details>

---

## 9. 設計考慮ポイント

### データモデリング戦略

```yaml
スタースキーマ vs スノーフレークスキーマ:

スタースキーマ（本課題で採用）:
  特徴:
    - ファクトテーブルを中心にディメンションが直接結合
    - JOINが少なくクエリがシンプル
    - Redshiftに最適（カラムナーストレージ）
  適用ケース:
    - 定型レポート
    - BI ダッシュボード
    - アドホック分析

スノーフレークスキーマ:
  特徴:
    - ディメンションが正規化
    - ストレージ効率が良い
    - 更新が容易
  適用ケース:
    - マスタデータの頻繁な更新
    - 複雑な階層構造

SCD (Slowly Changing Dimensions):
  Type 1: 上書き更新
  Type 2: 履歴保持（有効期間管理）
  Type 3: 限定的な履歴（現在値 + 前回値）
```

### Redshift最適化

```sql
-- テーブル設計のベストプラクティス

-- ファクトテーブル
CREATE TABLE marts.fct_sales (
    transaction_id VARCHAR(32) NOT NULL ENCODE zstd,
    date_key DATE NOT NULL ENCODE az64,
    store_key VARCHAR(10) NOT NULL ENCODE zstd,
    customer_key VARCHAR(12) NOT NULL ENCODE zstd,
    net_amount DECIMAL(12,2) NOT NULL ENCODE az64,
    ...
)
DISTSTYLE KEY
DISTKEY (store_key)  -- 頻繁にJOINするキー
SORTKEY (date_key, store_key);  -- 範囲クエリ用

-- ディメンションテーブル
CREATE TABLE marts.dim_store (
    store_key VARCHAR(10) NOT NULL,
    ...
)
DISTSTYLE ALL;  -- 小さいテーブルは全ノードに配布

-- エンコーディング自動選択
ANALYZE COMPRESSION marts.fct_sales;
```

---

## 10. 発展課題

### 上級チャレンジ1: 需要予測モデル統合

```python
# Amazon SageMaker + Redshift ML

# Redshiftから直接機械学習モデルを呼び出し
CREATE MODEL demand_forecast_model
FROM (
    SELECT
        store_id,
        product_id,
        transaction_date,
        SUM(quantity) as daily_sales,
        AVG(SUM(quantity)) OVER (
            PARTITION BY store_id, product_id
            ORDER BY transaction_date
            ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
        ) as rolling_avg_7d
    FROM staging.stg_transaction_items ti
    JOIN staging.stg_pos_transactions t ON ti.transaction_id = t.transaction_id
    GROUP BY 1, 2, 3
)
TARGET daily_sales
FUNCTION predict_demand
IAM_ROLE 'arn:aws:iam::xxx:role/RedshiftMLRole'
SETTINGS (
    S3_BUCKET 'shopsmart-ml-artifacts',
    MAX_RUNTIME 3600
);

-- 予測実行
SELECT
    store_id,
    product_id,
    predict_demand(rolling_avg_7d) as predicted_demand
FROM ...;
```

### 上級チャレンジ2: リアルタイムダッシュボード

```yaml
# Redshift Streaming Ingestion

-- Kinesis からのリアルタイム取り込み
CREATE EXTERNAL SCHEMA kinesis_schema
FROM KINESIS
IAM_ROLE 'arn:aws:iam::xxx:role/RedshiftKinesisRole';

CREATE MATERIALIZED VIEW mv_realtime_sales
AUTO REFRESH YES AS
SELECT
    ApproximateArrivalTimestamp as event_time,
    json_extract_path_text(kinesis_data, 'store_id') as store_id,
    json_extract_path_text(kinesis_data, 'total_amount')::decimal as amount
FROM kinesis_schema.pos_stream
WHERE is_valid_json(kinesis_data);

-- 5分間隔で自動リフレッシュ
ALTER MATERIALIZED VIEW mv_realtime_sales
AUTO REFRESH YES
INTERVAL 5 MINUTES;
```

### 上級チャレンジ3: データメッシュアーキテクチャ

```yaml
# ドメイン別データプロダクト

Domains:
  - Sales Domain:
      Owner: 営業本部
      Data Products:
        - fct_sales (Platinum)
        - dim_store (Gold)
        - daily_sales_summary (Silver)
      SLA: 99.9%
      Freshness: 6時間以内

  - Inventory Domain:
      Owner: 物流部門
      Data Products:
        - fct_inventory
        - dim_product
        - stock_alerts
      SLA: 99.5%
      Freshness: 1時間以内

  - Customer Domain:
      Owner: マーケティング部
      Data Products:
        - dim_customer
        - customer_segments
        - purchase_history
      SLA: 99.0%
      Freshness: 24時間以内

Data Contracts:
  - Schema versioning
  - Quality SLAs
  - Access policies
```

---

## 11. コスト見積もり

### 月額コスト概算

| サービス | スペック | 月額コスト |
|----------|----------|------------|
| Redshift Serverless | 32 RPU × 200時間/月 | $960 |
| S3 | 1TB (データレイク) | $24 |
| Glue ETL | 100 DPU時間/月 | $44 |
| Glue Data Catalog | 100万オブジェクト | $1 |
| QuickSight | 5 Author + 50 Reader | $275 |
| Step Functions | 10,000実行/月 | $3 |
| CloudWatch | ログ・メトリクス | $20 |
| **合計** | | **約 $1,327/月** |

### コスト最適化

```
1. Redshift Serverless の使用量最適化:
   - 営業時間のみ高RPU
   - 夜間・週末は最小RPU
   - 想定削減: 30%

2. クエリ最適化:
   - マテリアライズドビュー活用
   - 適切なDISTKEY/SORTKEY
   - キャッシュ活用

3. ストレージ最適化:
   - S3 ライフサイクル
   - 不要データのアーカイブ
   - Parquet圧縮
```

---

## 12. 学習のポイント

### 今回学んだこと

```
1. Redshift Serverless
   □ ワークグループとネームスペースの設定
   □ RPUベースの課金モデル
   □ 外部スキーマ（Spectrum）の活用

2. dbt (data build tool)
   □ staging/intermediate/martsの階層化
   □ テストとドキュメント生成
   □ 増分処理の実装

3. データモデリング
   □ スタースキーマの設計
   □ ディメンションとファクトの分離
   □ SCD（緩やかに変化するディメンション）

4. データパイプライン
   □ Glue ETLでのデータ統合
   □ Step Functionsでのオーケストレーション
   □ データ品質管理
```

### GCPとの比較まとめ

| 観点 | AWS (Redshift + dbt) | GCP (BigQuery + dbt) |
|------|---------------------|---------------------|
| 課金モデル | RPU時間課金 | スキャン量課金 |
| パフォーマンス | 専用リソース | 自動スケール |
| ETL | Glue | Dataflow |
| 運用複雑さ | 中 | 低 |
| カスタマイズ性 | 高 | 中 |

### 次のステップ

```
1. 発展学習:
   - Amazon Redshift RA3 インスタンス
   - Redshift ML での機械学習
   - AWS Data Exchange

2. 実務応用:
   - 経営ダッシュボードの高度化
   - 需要予測との連携
   - リアルタイムデータ統合

3. 認定資格:
   - AWS Certified Data Analytics - Specialty
   - dbt Certification
```
