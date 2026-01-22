# 課題32: 小売業のデータウェアハウス構築

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

```mermaid
architecture-beta
    group datasources(cloud)[Data Sources]
    group aws(cloud)[AWS Cloud]
    group datalake(disk)[Data Lake] in aws
    group etl(server)[ETL Layer] in aws
    group dwh(database)[Data Warehouse] in aws
    group bi(server)[BI Layer] in aws

    service pos(server)[店舗POS システム] in datasources
    service inventory_sys(server)[在庫管理 システム] in datasources
    service customer_sys(server)[顧客管理 システム] in datasources
    service external(server)[外部データ 天気・競合] in datasources

    service s3_raw(disk)[S3 Data Lake Raw Zone] in datalake
    service glue_catalog(database)[Glue Data Catalog] in etl
    service glue_etl(server)[Glue ETL] in etl

    service redshift(database)[Redshift Serverless] in dwh
    service staging(database)[Schema: staging] in dwh
    service intermediate(database)[Schema: intermediate] in dwh
    service marts(database)[Schema: marts] in dwh

    service quicksight(server)[Amazon QuickSight] in bi

    pos:B --> T:s3_raw
    inventory_sys:B --> T:s3_raw
    customer_sys:B --> T:s3_raw
    external:B --> T:s3_raw
    s3_raw:R --> L:glue_etl
    glue_etl:R --> L:glue_catalog
    glue_catalog:B --> T:redshift
    staging:B --> T:intermediate
    intermediate:B --> T:marts
    marts:B --> T:quicksight
```

**Redshift Serverless 設定:**
- Workgroup: shopsmart-analytics
- Namespace: shopsmart-dwh
- Base Capacity: 32 RPU

**dbt Schema 構成:**
- **staging**: stg_pos_transactions, stg_inventory, stg_customers
- **intermediate**: int_daily_sales, int_product_performance, int_customer_segments
- **marts**: Dimension Tables (dim_date, dim_store, dim_product, dim_customer, dim_time) + Fact Tables (fct_sales, fct_inventory, fct_customer_activity)

**QuickSight Dashboards:**
- 売上概要 / 店舗別分析 / 商品分析 / 在庫分析 / 顧客分析 / トレンド

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
