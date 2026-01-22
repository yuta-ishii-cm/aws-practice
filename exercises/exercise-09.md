# 課題9: ECレビュー分析・インサイト抽出システム構築 - AI活用のテキスト分析

**難易度: 🟡 中級**

---

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | AI / データ分析 / EC |
| 処理タイプ | バッチ / ストリーム |
| 使用IaC | CloudFormation |
| 所要時間 | 6〜7時間 |

---

## 学習するAWSサービス

この演習では以下のAWSサービスを実践的に学習します。

### メインサービス

| サービス | 役割 | 学習ポイント |
|----------|------|-------------|
| **Amazon Comprehend** | 感情分析・エンティティ抽出 | リアルタイム分析、バッチ処理 |
| **Amazon Bedrock** | インサイト生成・サマリー作成 | 高度な日本語理解、レポート生成 |
| **Amazon Kinesis Data Firehose** | ストリーム取り込み | S3自動配信、Lambda変換 |
| **Amazon Athena** | SQLクエリ分析 | サーバーレス分析、Glue連携 |
| **Amazon QuickSight** | ダッシュボード | 可視化、SPICE、共有 |

### 補助サービス

| サービス | 役割 |
|----------|------|
| **AWS Lambda** | リアルタイム処理 |
| **Amazon DynamoDB** | リアルタイムデータ保存 |
| **Amazon S3** | データレイク |
| **Amazon SNS** | ネガティブレビューアラート |
| **AWS Glue** | データカタログ |
| **Amazon CloudWatch** | 監視・ログ |

---

## 最終構成図

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group ingest(server)[Ingestion Layer] in aws
    group realtime(server)[Realtime Processing] in aws
    group datalake(disk)[Data Lake] in aws
    group analytics(server)[Analytics Layer] in aws
    group notification(server)[Notification] in aws

    service ecsite(internet)[ECサイト]
    service apigw(server)[API Gateway] in ingest
    service firehose(server)[Kinesis Firehose] in ingest
    service lambda_analyze(server)[Lambda 感情分析] in realtime
    service comprehend(server)[Comprehend] in realtime
    service dynamodb(database)[DynamoDB] in realtime
    service s3(disk)[S3 Data Lake] in datalake
    service glue(server)[Glue Crawler] in datalake
    service athena(server)[Athena] in analytics
    service quicksight(server)[QuickSight] in analytics
    service bedrock(server)[Bedrock] in analytics
    service sns(server)[SNS Alert] in notification
    service slack(internet)[Slack]

    ecsite:R --> L:apigw
    apigw:B --> T:firehose
    firehose:B --> T:lambda_analyze
    lambda_analyze:R --> L:comprehend
    comprehend:B --> T:sns
    lambda_analyze:R --> L:dynamodb
    firehose:R --> L:s3
    s3:B --> T:glue
    glue:R --> L:athena
    athena:R --> L:quicksight
    athena:B --> T:bedrock
    sns:R --> L:slack
```

### データフロー

| フロー | 処理内容 |
|--------|----------|
| リアルタイム | レビュー投稿 → Firehose → Lambda（Comprehend）→ ネガティブ検出アラート |
| バッチ | S3 → Athena → QuickSight（日次更新） |
| インサイト生成 | EventBridge → Lambda（Bedrock）→ 週次レポート |

---

## シナリオ

### 企業プロフィール

**〇〇株式会社**は、20〜30代女性をターゲットにしたアパレル・コスメのECプラットフォームを運営しています。

| 項目 | 内容 |
|------|------|
| 業種 | EC（アパレル・コスメ） |
| 設立 | 2018年 |
| 従業員数 | 120名（うちMD15名、CS20名） |
| 月間アクティブユーザー | 80万人 |
| 取扱商品数 | 3万点 |
| 取扱ブランド | 500ブランド |
| 月間レビュー投稿数 | 10万件 |
| 月商 | 15億円 |
| 平均購入単価 | 8,000円 |

### 現状の課題

月間10万件のレビューが投稿されていますが、手動でのレビュー分析に限界があり、商品改善やトレンド把握に活かしきれていません。また、ネガティブレビューへの対応が遅れ、顧客満足度に影響を与えています。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| レビュー分析担当 | 3名（MDチーム兼任） | 1名（監視のみ） |
| 分析対象レビュー | 月1,000件（全体の1%） | 全件（10万件） |
| ネガティブレビュー検出 | 翌日以降 | リアルタイム |
| トレンドレポート作成 | 月1回（手作業5日） | 週1回（自動） |
| 商品改善フィードバック | 四半期ごと | 週次 |
| レビュー起因の返品率 | 8% | 5%以下 |

### レビューの内訳分析（過去3ヶ月平均）

| レビュー評価 | 割合 | 月間件数 |
|--------------|------|----------|
| ★5（非常に満足） | 35% | 35,000件 |
| ★4（満足） | 30% | 30,000件 |
| ★3（普通） | 20% | 20,000件 |
| ★2（不満） | 10% | 10,000件 |
| ★1（非常に不満） | 5% | 5,000件 |

**ネガティブレビュー（★1-2）: 月15,000件**
→ これらの早期検出と対応が急務

### 解決したいこと

1. 全レビューの自動感情分析（ポジティブ/ネガティブ/ニュートラル）
2. ネガティブレビューのリアルタイム検出とアラート
3. レビューからの商品改善点・品質課題の自動抽出
4. カテゴリ/ブランド別のトレンド分析ダッシュボード
5. 競合商品との比較インサイト生成

### 成功指標（KPI）

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| レビュー分析カバー率 | 1% | 100% | 1ヶ月後 |
| ネガティブ検出時間 | 24時間以上 | 5分以内 | 1ヶ月後 |
| 感情分析精度 | - | 90%以上 | 2ヶ月後 |
| レビュー起因返品率 | 8% | 5%以下 | 6ヶ月後 |
| 分析工数 | 3名×20% | 1名×10% | 3ヶ月後 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **Amazon Comprehendの実践活用**
   - 感情分析（Sentiment Analysis）
   - エンティティ認識
   - キーフレーズ抽出
   - カスタム分類器

2. **Amazon Bedrockによる高度な分析**
   - レビューからのインサイト抽出
   - 商品改善提案の生成
   - トレンドサマリー作成

3. **データパイプラインの構築**
   - Kinesis Data Firehoseによるストリーム処理
   - Lambda + DynamoDBによるリアルタイム処理
   - S3 + Athenaによるバッチ分析

4. **Amazon QuickSightによる可視化**
   - ダッシュボード構築
   - 自動更新設定
   - 埋め込みダッシュボード

### 実務で活かせる知識

- テキスト分析システムの設計パターン
- ストリーム処理 vs バッチ処理の使い分け
- BIダッシュボードの設計

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| NLP | Amazon Comprehend | Natural Language API |
| 生成AI | Bedrock | Vertex AI |
| ストリーム処理 | Kinesis | Pub/Sub + Dataflow |
| BI | QuickSight | Looker / Data Studio |
| データウェアハウス | Athena / Redshift | BigQuery |

---

## 前提条件

### 必要な事前知識

- AWSの基本操作（S3, Lambda, DynamoDB）
- SQLの基礎
- JSONの読み書き
- BIダッシュボードの基本概念

### 準備するもの

1. **AWSアカウント**
   - Bedrock有効化（Claude 3 Haiku/Sonnet）
   - QuickSight有効化（Enterprise版推奨）
   - 適切なIAM権限

2. **開発環境**
   - AWS CLI v2
   - Python 3.9以上

3. **テストデータ**
   - サンプルレビューデータ（JSON形式）

---

## トラブルシューティング課題

### 問題1: Comprehendで言語エラー

**症状:**
```
An error occurred (UnsupportedLanguageException):
Comprehend does not support the language of the input text
```

**ヒント:**
1. 入力テキストの言語を確認
2. 空文字やノイズのみのテキストでないか
3. 言語コードが正しいか（ja）

**解決方法:**
```python
def analyze_sentiment_safe(text: str) -> dict:
    # テキストの前処理
    text = text.strip()
    if len(text) < 10:
        return {'sentiment': 'NEUTRAL', 'scores': {...}}

    # 日本語かどうか簡易チェック
    import re
    if not re.search(r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]', text):
        # 日本語が含まれない場合は英語として処理
        language_code = 'en'
    else:
        language_code = 'ja'

    response = comprehend.detect_sentiment(
        Text=text[:5000],
        LanguageCode=language_code
    )
    return {...}
```

### 問題2: Firehoseのデータ形式エラー

**症状:**
```
Lambda transformation failed
S3に保存されるデータが空または不正
```

**ヒント:**
1. Lambda戻り値の形式を確認
2. Base64エンコード/デコードを確認
3. recordIdが正しく返されているか

**解決方法:**
```python
# 正しい戻り値形式
output_records.append({
    'recordId': record['recordId'],  # 必須: 元のrecordIdを返す
    'result': 'Ok',  # Ok, Dropped, ProcessingFailed のいずれか
    'data': base64.b64encode(
        (json.dumps(data) + '\n').encode('utf-8')
    ).decode('utf-8')  # 必ず改行を追加
})
```

### 問題3: QuickSightでデータが表示されない

**症状:**
```
データセットの更新が反映されない
SPICEのデータが古い
```

**ヒント:**
1. SPICEの更新スケジュールを確認
2. Athenaテーブルのパーティションを確認
3. データソースの権限を確認

**解決方法:**
```bash
# Glue Crawlerを再実行してパーティション更新
aws glue start-crawler --name stylemarket-reviews-crawler

# QuickSightでSPICE更新
# コンソール → データセット → 今すぐ更新
```

---

## 設計の考察ポイント

### 1. リアルタイム処理とバッチ処理の使い分け

**考察ポイント:**
- ネガティブレビュー検出はなぜリアルタイムが必要か
- インサイト生成はなぜバッチで十分か
- コストとレイテンシーのトレードオフ

### 2. Comprehend vs Bedrock の使い分け

**考察ポイント:**
- Comprehend: 感情分析、エンティティ抽出（高速・低コスト）
- Bedrock: 複雑な解釈、レポート生成（高精度・高コスト）
- 組み合わせることで最適化

### 3. データレイクアーキテクチャ

**考察ポイント:**
- S3 + Athena + Glue の組み合わせ
- パーティショニング戦略（年/月/日）
- 圧縮形式の選択（GZIP vs Parquet）

### 4. アラートの閾値設計

**考察ポイント:**
- 誤検知を防ぐ閾値の設定
- 評価（★）と感情スコアの組み合わせ
- アラート疲れを防ぐ工夫

### 5. ダッシュボードの運用

**考察ポイント:**
- 更新頻度とSPICEコスト
- 直接クエリ vs SPICE
- 権限管理とアクセス制御

---

## 発展課題（オプション）

### 1. カスタム分類器の構築
- レビューの自動カテゴリ分類
- 商品不良/配送問題/価格等の自動タグ付け
- Comprehend Custom Classificationの活用

### 2. 競合分析の追加
- 外部レビューサイトのスクレイピング
- 競合商品との比較分析
- 市場トレンドレポート

### 3. レコメンデーション連携
- レビューに基づく商品レコメンド
- Personalize との統合
- パーソナライズされた商品提案

### 4. リアルタイムダッシュボード
- Kinesis Data Analytics
- リアルタイム集計
- CloudWatch Dashboards連携

### 5. 多言語対応
- 海外ユーザーレビューの分析
- 言語自動検出
- 言語別感情分析

---

## 想定コストと削減方法

### 月額概算コスト（月間10万件レビュー処理想定）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| Amazon Comprehend | 10万件 × $0.0001/unit | $100 |
| Amazon Bedrock | 4回/月 × Sonnet | $5 |
| Kinesis Firehose | 10万件 × 5KB | $3 |
| AWS Lambda | 10万回 × 5秒 | $5 |
| Amazon S3 | 50GB + リクエスト | $2 |
| Amazon Athena | 100GB/月スキャン | $5 |
| Amazon DynamoDB | オンデマンド | $10 |
| Amazon QuickSight | 1ユーザー | $24 |
| AWS Glue | Crawler実行 | $1 |
| CloudWatch | ログ・メトリクス | $5 |
| **合計** | | **約$160（約24,000円）** |

### コスト削減のポイント

1. **Comprehendのバッチ処理**
   - リアルタイム不要なレビューはバッチで処理
   - StartSentimentDetectionJobの活用
   - → 最大50%削減

2. **S3のパーティショニング最適化**
   - Athenaのスキャン量削減
   - Parquet形式への変換

3. **QuickSightのライセンス**
   - Reader（閲覧のみ）: $5/月
   - 必要なユーザーのみAuthor

4. **DynamoDB TTLの活用**
   - 古いデータの自動削除
   - S3へのアーカイブ

### リソース削除手順

```bash
# S3バケット
aws s3 rm s3://stylemarket-reviews-${ACCOUNT_ID} --recursive
aws s3 rb s3://stylemarket-reviews-${ACCOUNT_ID}

# DynamoDB
aws dynamodb delete-table --table-name stylemarket-reviews-realtime

# Kinesis Firehose
aws firehose delete-delivery-stream --delivery-stream-name stylemarket-reviews-stream-dev

# SNS
aws sns delete-topic --topic-arn arn:aws:sns:${AWS_REGION}:${ACCOUNT_ID}:stylemarket-negative-review-alert

# Glue
aws glue delete-crawler --name stylemarket-reviews-crawler
aws glue delete-database --name stylemarket_reviews

# EventBridge
aws events remove-targets --rule stylemarket-weekly-insight --ids 1
aws events delete-rule --name stylemarket-weekly-insight

# Lambda
aws lambda delete-function --function-name stylemarket-review-analyzer
aws lambda delete-function --function-name stylemarket-insight-generator

# QuickSight（コンソールから）
# 分析、データセット、データソースを順に削除

# CloudFormation
aws cloudformation delete-stack --stack-name stylemarket-firehose
```

---

## 学習のポイント

### 1. ストリーム処理 vs バッチ処理の設計判断
リアルタイム性が必要な処理（ネガティブ検出アラート）とバッチで十分な処理（週次レポート）を明確に分け、適切なアーキテクチャを選択する。

### 2. Amazon Comprehendの活用パターン
感情分析、エンティティ抽出、キーフレーズ抽出など、NLPタスクに特化したサービスを理解し、適切に組み合わせる。

### 3. データレイクの基本設計
S3 + Glue + Athena の組み合わせは、AWSデータ分析の基本パターン。パーティショニング、圧縮形式、データカタログの概念を習得する。

### 4. BIダッシュボードの設計
QuickSightによる可視化を通じて、ビジネスユーザーにインサイトを届ける方法を学ぶ。SPICE vs 直接クエリのトレードオフを理解する。

### 5. AIとルールベースの組み合わせ
感情分析（AI）と評価スコア（ルール）を組み合わせることで、より正確な判定を実現する。単一の手法に依存しない設計を心がける。
