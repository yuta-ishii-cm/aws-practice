# 課題10: 〇〇株式会社の物件画像自動分析システム構築

**難易度: 🟡 中級**

---

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | AI / 画像分析 / 不動産テック |
| 処理タイプ | バッチ / イベント駆動 |
| 使用IaC | Terraform |
| 所要時間 | 5〜7時間 |

---

## 学習するAWSサービス

この演習では以下のAWSサービスを実践的に学習します。

### メインサービス

| サービス | 役割 | 学習ポイント |
|----------|------|-------------|
| **Amazon S3** | 画像保存（入力/出力） | イベント通知、ライフサイクル |
| **Amazon Rekognition** | ラベル検出・不適切コンテンツ検出 | DetectLabels、DetectModerationLabels |
| **Amazon Bedrock** | Claude 3による詳細分析 | マルチモーダル、日本語説明生成 |
| **AWS Lambda** | 画像処理ロジック | イベント駆動、並列実行 |
| **Amazon DynamoDB** | 処理結果・メタデータ保存 | 高スループット、GSI設計 |
| **Amazon SQS** | 処理キュー | 大量リクエストのバッファリング、DLQ |

### 補助サービス

| サービス | 役割 |
|----------|------|
| **Amazon CloudFront** | 承認済み画像の配信 |
| **Amazon SNS** | 処理完了通知・エラー通知 |
| **Amazon CloudWatch** | ログ・メトリクス・アラート |
| **AWS IAM** | サービス間の権限管理 |

---

## 最終構成図

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group ingest(server)[Ingestion Layer] in aws
    group processing(server)[Processing Layer] in aws
    group ai(server)[AI Layer] in aws
    group storage(server)[Storage Layer] in aws
    group notification(server)[Notification] in aws

    service partner(internet)[Partner]
    service s3_input(logos:aws-s3)[S3 Input] in ingest
    service sqs(logos:aws-sqs)[SQS Queue] in ingest
    service dlq(logos:aws-sqs)[SQS DLQ] in ingest
    service lambda(logos:aws-lambda)[Lambda] in processing
    service rekognition(server)[Rekognition] in ai
    service bedrock(server)[Bedrock] in ai
    service dynamodb(logos:aws-dynamodb)[DynamoDB] in storage
    service s3_approved(logos:aws-s3)[S3 Approved] in storage
    service s3_review(logos:aws-s3)[S3 Review] in storage
    service cloudfront(logos:aws-cloudfront)[CloudFront] in storage
    service sns(logos:aws-sns)[SNS] in notification
    service staff(internet)[Staff]

    partner:R --> L:s3_input
    s3_input:B --> T:sqs
    sqs:R --> L:lambda
    sqs:B --> T:dlq
    lambda:R --> L:rekognition
    lambda:R --> L:bedrock
    lambda:B --> T:dynamodb
    lambda:R --> L:s3_approved
    lambda:R --> L:s3_review
    s3_approved:B --> T:cloudfront
    lambda:B --> T:sns
    sns:R --> L:staff
```

| コンポーネント | 役割 |
|----------------|------|
| **Partner** | 不動産会社（画像アップロード元） |
| **S3 Input** | 入力バケット（画像受信） |
| **SQS Queue** | 処理キュー |
| **SQS DLQ** | デッドレターキュー（エラー処理） |
| **Lambda** | 画像処理ロジック |
| **Rekognition** | 画像品質・不適切コンテンツチェック |
| **Bedrock** | 部屋タイプ・設備のタグ生成（Claude 3） |
| **DynamoDB** | 画像メタデータ保存 |
| **S3 Approved** | 承認済み画像の保存 |
| **S3 Review** | 要確認画像の保存 |
| **CloudFront** | 承認済み画像の配信 |
| **SNS** | 通知配信 |
| **Staff** | 運営スタッフ（通知受信） |

### 処理フロー

| ステップ | 説明 |
|----------|------|
| 1. アップロード | 不動産会社がS3入力バケットに画像をアップロード |
| 2. キューイング | S3イベント → SQSに処理リクエストを追加 |
| 3. 処理 | Lambda がRekognitionで品質・不適切チェック |
| 4. 分析 | Bedrockで部屋タイプ・設備の詳細タグ生成 |
| 5. 保存 | DynamoDBにメタデータ、S3に振り分け保存 |
| 6. 通知 | 要確認画像があればSNSで通知 |

---

## シナリオ

### 企業プロフィール

**〇〇株式会社**は、AIを活用した不動産マッチングプラットフォームを運営する不動産テック企業です。

| 項目 | 内容 |
|------|------|
| 業種 | 不動産テック（PropTech） |
| 設立 | 2019年 |
| 従業員数 | 80名（うち画像チェック担当10名） |
| 月間訪問者数 | 50万人 |
| 掲載物件数 | 5万件 |
| 提携不動産会社 | 300社 |
| 月商 | 8,000万円 |

### 現状の課題

提携不動産会社から日次で約1万枚の物件画像がアップロードされますが、品質チェックとタグ付け作業を10名のスタッフが手作業で行っており、業務が逼迫しています。また、タグ付けの品質にばらつきがあり、ユーザーの検索精度に影響を与えています。

### 数値で示された問題

| 指標 | 現状 | 業界平均 |
|------|------|----------|
| 画像処理スタッフ | 10名 | - |
| 1人あたり処理枚数 | 1,000枚/日 | - |
| 画像処理人件費 | 月400万円 | - |
| 平均処理時間 | 24秒/枚 | - |
| タグ付け精度 | 75%（人によりばらつき） | 90% |
| 掲載までのリードタイム | 48時間 | 12時間 |
| 不適切画像の見落とし率 | 5% | 1%未満 |

### 画像処理の現状フロー

```
1. 不動産会社がS3に画像アップロード
2. スタッフがS3から画像をダウンロード
3. 目視で品質チェック（解像度、明るさ、ブレ）
4. 手動でタグ付け（部屋タイプ、設備、特徴）
5. 不適切画像は差し戻し
6. 承認済み画像をCDNに公開
```

### 解決したいこと

1. 画像品質チェックの自動化（解像度、明るさ、ブレ、不適切コンテンツ検出）
2. AIによる自動タグ付け（部屋タイプ、設備、特徴の認識）
3. 処理スタッフの業務時間70%削減
4. タグ付け精度を90%以上に向上
5. 掲載リードタイムを48時間から4時間に短縮

### 成功指標（KPI）

| KPI | 現状 | 目標 |
|-----|------|------|
| 自動処理率 | 0% | 85%以上 |
| タグ付け精度 | 75% | 90%以上 |
| 処理スタッフ工数 | 10名フルタイム | 3名（監視・例外対応） |
| 掲載リードタイム | 48時間 | 4時間以内 |
| 不適切画像検出率 | 95% | 99.5%以上 |
| 月間コスト | 400万円（人件費） | 150万円（AWS+人件費） |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **Amazon Rekognitionの実践活用**
   - ラベル検出（DetectLabels）
   - 不適切コンテンツ検出（DetectModerationLabels）
   - 画像品質分析（顔検出APIの品質スコア活用）

2. **S3イベント駆動アーキテクチャ**
   - S3イベント通知とLambdaトリガー
   - 大量画像の並列処理パターン

3. **Amazon Bedrockによる高度な画像分析**
   - Claude 3のマルチモーダル機能（画像入力）
   - 日本語での詳細な物件説明生成

4. **Terraformによるインフラ構築**
   - モジュール化されたTerraform構成
   - 環境変数管理とワークスペース

### 実務で活かせる知識

- 画像処理パイプラインの設計パターン
- AI/MLサービスの組み合わせ方
- 大量データ処理のスケーリング戦略

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| 画像認識 | Amazon Rekognition | Cloud Vision AI |
| 生成AI（マルチモーダル） | Bedrock (Claude 3) | Vertex AI (Gemini) |
| オブジェクトストレージ | S3 | Cloud Storage |
| サーバーレス関数 | Lambda | Cloud Functions |

---

## 前提条件

### 必要な事前知識

- AWSマネジメントコンソールの基本操作
- Terraform基礎（HCL構文、state管理）
- Python 3.9以上の基礎
- 画像処理の基本概念

### 準備するもの

1. **AWSアカウント**
   - Bedrockのモデルアクセス有効化（Claude 3 Sonnet）
   - Rekognitionへのアクセス権限

2. **開発環境**
   - Terraform v1.5以上
   - AWS CLI v2（設定済み）
   - Python 3.9以上
   - jq（JSON処理用）

3. **テストデータ**
   - サンプル物件画像（10-20枚）
   - 不適切画像サンプル（テスト用）

### Terraform初期設定

```bash
# Terraformインストール確認
terraform version

# AWS認証情報確認
aws sts get-caller-identity

# 作業ディレクトリ作成
mkdir -p homematch-image-analyzer/{modules,environments}
cd homematch-image-analyzer
```

---

## トラブルシューティング課題

### 問題1: Lambda実行時にタイムアウト

**症状:**
```
Task timed out after 120.00 seconds
CloudWatch Logsで処理が途中で終了している
```

**ヒント:**
1. Bedrockの呼び出しに時間がかかっていないか確認
2. 画像サイズが大きすぎないか確認
3. S3からの画像ダウンロード時間を確認

**解決方法:**
```hcl
# Lambda設定の調整
resource "aws_lambda_function" "image_processor" {
  # ...
  timeout     = 180  # タイムアウトを延長
  memory_size = 1024  # メモリを増やして処理速度向上
}
```

また、画像サイズの制限を追加：
```python
# Lambda関数内で画像サイズチェック
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

response = s3.head_object(Bucket=bucket, Key=key)
if response['ContentLength'] > MAX_IMAGE_SIZE:
    raise ValueError(f"Image too large: {response['ContentLength']} bytes")
```

### 問題2: Rekognitionでエラー「InvalidS3ObjectException」

**症状:**
```
botocore.exceptions.ClientError: An error occurred (InvalidS3ObjectException)
when calling the DetectLabels operation: Unable to get object metadata from S3
```

**ヒント:**
1. S3バケット名とキーが正しいか確認
2. Lambda実行ロールにS3読み取り権限があるか確認
3. リージョンが一致しているか確認

**解決方法:**
```hcl
# IAMポリシーにs3:GetObjectが含まれているか確認
{
  Effect = "Allow"
  Action = [
    "s3:GetObject",
    "s3:HeadObject"  # これも追加
  ]
  Resource = "${var.input_bucket_arn}/*"
}
```

### 問題3: SQSメッセージが処理されずDLQに溜まる

**症状:**
```
DLQにメッセージが溜まり続ける
メインキューは空
Lambda呼び出し回数は0
```

**ヒント:**
1. SQS → Lambdaのイベントソースマッピングを確認
2. Lambdaの実行ロールにSQS権限があるか確認
3. SQSキューポリシーを確認

**解決方法:**
```bash
# イベントソースマッピング確認
aws lambda list-event-source-mappings --function-name homematch-image-processor-dev

# 無効になっている場合は有効化
aws lambda update-event-source-mapping \
  --uuid <mapping-uuid> \
  --enabled
```

---

## 設計の考察ポイント

### 1. なぜSQSを間に挟んだのか？S3→Lambda直接でも良いのでは？

**考察ポイント:**
- S3直接トリガーの同時実行制限
- リトライ戦略の柔軟性
- デッドレターキューによる失敗管理
- バッチ処理による効率化

### 2. RekognitionとBedrockの両方を使う理由は？

**考察ポイント:**
- Rekognitionの高速・低コストなラベル検出
- Bedrockの詳細な日本語説明生成
- コストと精度のトレードオフ
- 代替案：Bedrock単独（コスト増）

### 3. 画像の保存先を分けた設計の意図は？

**考察ポイント:**
- 承認/却下フローの実装
- 運用担当者のワークフロー
- ライフサイクルポリシーの差別化
- アクセス権限の分離

### 4. DynamoDBのGSI設計は適切か？

**考察ポイント:**
- status-indexの用途（承認待ち一覧）
- room_type-indexの用途（部屋タイプ別検索）
- クエリパターンとの整合性
- GSI追加コストの検討

### 5. コールドスタート対策は必要か？

**考察ポイント:**
- 画像処理は非同期のため許容可能
- 大量アップロード時のスパイク
- Provisioned Concurrencyの費用対効果

---

## 発展課題（オプション）

### 1. 顔検出による個人情報保護
- Rekognition DetectFacesで顔を検出
- 顔部分に自動モザイク処理
- プライバシー保護の自動化

### 2. 画像のリサイズ・最適化
- Lambda Layerにsharpを追加
- 複数サイズ（サムネイル、中、大）を生成
- WebP形式への変換で容量削減

### 3. バッチ処理モードの追加
- Step Functionsでオーケストレーション
- 大量インポート時の一括処理
- 進捗レポート機能

### 4. 類似画像検出
- Rekognition CompareFacesの応用
- 重複画像の自動検出
- 不正利用（他物件画像の流用）防止

### 5. ダッシュボード構築
- QuickSightとの連携
- 日次処理統計
- エラー傾向分析

---

## 想定コストと削減方法

### 月額概算コスト（日次1万枚処理想定）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| Amazon Rekognition | DetectLabels: 30万枚 × $0.001 | $300 |
| Amazon Rekognition | DetectModeration: 30万枚 × $0.001 | $300 |
| Amazon Bedrock | 30万リクエスト × $0.003/1K入力トークン | $150 |
| AWS Lambda | 30万回 × 30秒 × 512MB | $40 |
| Amazon S3 | 500GB保存 + リクエスト | $15 |
| Amazon SQS | 60万メッセージ | $0.30 |
| Amazon DynamoDB | オンデマンド、30万書き込み | $40 |
| CloudWatch | ログ・メトリクス | $10 |
| **合計** | | **約$855（約128,000円）** |

### コスト削減のポイント

1. **段階的な処理フロー**
   - まずRekognitionで高速チェック
   - 問題なければBedrockで詳細分析
   - 問題画像はBedrock呼び出しスキップ
   - → 最大30%削減

2. **Rekognition Custom Labels検討**
   - 物件特化のモデルを作成
   - 精度向上とコスト削減の両立

3. **S3 Intelligent-Tiering**
   - アクセス頻度に応じた自動階層化
   - → ストレージコスト30%削減

4. **Lambda ARM64アーキテクチャ**
   - Graviton2プロセッサ使用
   - → Lambda コスト20%削減

### リソース削除手順

```bash
# Terraform経由で全削除
terraform destroy -auto-approve

# S3バケットが残る場合（中身がある場合）
aws s3 rm s3://homematch-input-dev-xxxx --recursive
aws s3 rm s3://homematch-approved-dev-xxxx --recursive
aws s3 rm s3://homematch-review-dev-xxxx --recursive

# 再度destroy
terraform destroy -auto-approve
```

---

## 学習のポイント

### 1. イベント駆動アーキテクチャの理解
S3イベント → SQS → Lambda のパターンは、大量データ処理の基本形。SQSによるバッファリングで、Lambda同時実行数制限やスパイク対策ができる。

### 2. Terraformのモジュール化
再利用可能なモジュールに分割することで、複数環境への展開や保守性が向上する。outputを活用したモジュール間連携を習得する。

### 3. AI/MLサービスの組み合わせ
単一サービスで全てを解決しようとせず、Rekognition（高速・低コスト）とBedrock（高精度・日本語）を使い分けることで、コストと品質のバランスを取る。

### 4. デッドレターキュー（DLQ）の重要性
処理失敗時のリカバリーパスを最初から設計に含める。DLQに溜まったメッセージは、原因調査後に再処理できる。

### 5. Infrastructure as Codeの実践
コンソールでの手作業ではなく、Terraformで全リソースを管理することで、環境の再現性・変更履歴の追跡・レビュープロセスが可能になる。
