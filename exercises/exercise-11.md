# 課題11: HomeMatch株式会社の物件画像自動分析システム構築

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | AI / 画像分析 / 不動産テック |
| 処理タイプ | バッチ / イベント駆動 |
| 使用IaC | Terraform |
| 所要時間 | 5〜7時間 |

---

## シナリオ

### 企業プロフィール

**HomeMatch株式会社**は、AIを活用した不動産マッチングプラットフォームを運営する不動産テック企業です。

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

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| 自動処理率 | 0% | 85%以上 | 2ヶ月後 |
| タグ付け精度 | 75% | 90%以上 | 1ヶ月後 |
| 処理スタッフ工数 | 10名フルタイム | 3名（監視・例外対応） | 3ヶ月後 |
| 掲載リードタイム | 48時間 | 4時間以内 | 2ヶ月後 |
| 不適切画像検出率 | 95% | 99.5%以上 | 1ヶ月後 |
| 月間コスト | 400万円（人件費） | 150万円（AWS+人件費） | 3ヶ月後 |

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

## 使用するAWSサービス

### メインサービス

| サービス | 役割 | 選定理由 |
|----------|------|----------|
| Amazon S3 | 画像保存（入力/出力） | スケーラブル、イベント通知対応 |
| Amazon Rekognition | ラベル検出・不適切コンテンツ検出 | 事前学習済み、日本語対応 |
| Amazon Bedrock | Claude 3による詳細分析 | マルチモーダル、日本語の説明生成 |
| AWS Lambda | 画像処理ロジック | イベント駆動、並列実行 |
| Amazon DynamoDB | 処理結果・メタデータ保存 | 高スループット、柔軟なスキーマ |
| Amazon SQS | 処理キュー | 大量リクエストのバッファリング |

### 補助サービス

| サービス | 役割 |
|----------|------|
| Amazon CloudFront | 承認済み画像の配信 |
| Amazon SNS | 処理完了通知・エラー通知 |
| Amazon CloudWatch | ログ・メトリクス・アラート |
| AWS Step Functions | ワークフロー管理（オプション） |

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

## アーキテクチャ概要

### システム全体構成

```
[不動産会社] → [S3: 入力バケット]
                    ↓ (S3イベント)
              [SQS: 処理キュー]
                    ↓
              [Lambda: image-processor]
                    ├── [Rekognition: ラベル検出]
                    ├── [Rekognition: 不適切コンテンツ検出]
                    └── [Bedrock Claude 3: 詳細分析]
                    ↓
              [DynamoDB: 処理結果保存]
                    ↓
              ┌─────┴─────┐
              ↓           ↓
    [S3: 承認済み]  [S3: 要確認/却下]
              ↓
    [CloudFront: CDN配信]
```

### 処理フロー

1. 不動産会社がS3の入力バケットに画像をアップロード
2. S3イベントがSQSキューにメッセージを送信
3. LambdaがSQSからメッセージを取得して処理開始
4. Rekognitionでラベル検出・不適切コンテンツチェック
5. Bedrockで詳細な部屋の説明を生成
6. 処理結果をDynamoDBに保存
7. 品質基準を満たす画像は承認済みバケットに移動
8. 問題のある画像は要確認バケットに移動してSNS通知

---

## ハンズオン手順

### フェーズ1: Terraform基盤構築（1.5時間）

#### Step 1-1: プロジェクト構造作成

```bash
# ディレクトリ構造
homematch-image-analyzer/
├── main.tf
├── variables.tf
├── outputs.tf
├── terraform.tfvars
├── modules/
│   ├── s3/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── lambda/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── dynamodb/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── sqs/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── lambda_code/
    └── image_processor/
        └── lambda_function.py
```

#### Step 1-2: メインTerraformファイル

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "HomeMatch-ImageAnalyzer"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ランダムサフィックス（バケット名用）
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3モジュール
module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
  suffix       = random_string.suffix.result
}

# SQSモジュール
module "sqs" {
  source = "./modules/sqs"

  project_name = var.project_name
  environment  = var.environment
}

# DynamoDBモジュール
module "dynamodb" {
  source = "./modules/dynamodb"

  project_name = var.project_name
  environment  = var.environment
}

# Lambdaモジュール
module "lambda" {
  source = "./modules/lambda"

  project_name          = var.project_name
  environment           = var.environment
  input_bucket_arn      = module.s3.input_bucket_arn
  input_bucket_name     = module.s3.input_bucket_name
  approved_bucket_name  = module.s3.approved_bucket_name
  review_bucket_name    = module.s3.review_bucket_name
  dynamodb_table_arn    = module.dynamodb.table_arn
  dynamodb_table_name   = module.dynamodb.table_name
  sqs_queue_arn         = module.sqs.queue_arn
  sqs_queue_url         = module.sqs.queue_url
}

# S3 → SQS イベント通知設定
resource "aws_s3_bucket_notification" "input_bucket_notification" {
  bucket = module.s3.input_bucket_name

  queue {
    queue_arn     = module.sqs.queue_arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "uploads/"
    filter_suffix = ".jpg"
  }

  queue {
    queue_arn     = module.sqs.queue_arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "uploads/"
    filter_suffix = ".png"
  }

  depends_on = [module.sqs]
}
```

#### Step 1-3: 変数定義

```hcl
# variables.tf
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "homematch"
}

variable "environment" {
  description = "Environment (dev/stg/prod)"
  type        = string
  default     = "dev"
}

variable "bedrock_model_id" {
  description = "Bedrock model ID for image analysis"
  type        = string
  default     = "anthropic.claude-3-sonnet-20240229-v1:0"
}
```

```hcl
# terraform.tfvars
aws_region   = "ap-northeast-1"
project_name = "homematch"
environment  = "dev"
```

#### Step 1-4: S3モジュール

```hcl
# modules/s3/main.tf
resource "aws_s3_bucket" "input" {
  bucket = "${var.project_name}-input-${var.environment}-${var.suffix}"
}

resource "aws_s3_bucket" "approved" {
  bucket = "${var.project_name}-approved-${var.environment}-${var.suffix}"
}

resource "aws_s3_bucket" "review" {
  bucket = "${var.project_name}-review-${var.environment}-${var.suffix}"
}

# バケットポリシー（入力バケット）
resource "aws_s3_bucket_policy" "input_policy" {
  bucket = aws_s3_bucket.input.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSQSNotification"
        Effect    = "Allow"
        Principal = { Service = "s3.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.input.arn}/*"
      }
    ]
  })
}

# ライフサイクルルール（コスト最適化）
resource "aws_s3_bucket_lifecycle_configuration" "input_lifecycle" {
  bucket = aws_s3_bucket.input.id

  rule {
    id     = "delete-processed-images"
    status = "Enabled"

    filter {
      prefix = "processed/"
    }

    expiration {
      days = 7
    }
  }
}

# 暗号化設定
resource "aws_s3_bucket_server_side_encryption_configuration" "input_encryption" {
  bucket = aws_s3_bucket.input.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

```hcl
# modules/s3/variables.tf
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "suffix" {
  type = string
}
```

```hcl
# modules/s3/outputs.tf
output "input_bucket_arn" {
  value = aws_s3_bucket.input.arn
}

output "input_bucket_name" {
  value = aws_s3_bucket.input.id
}

output "approved_bucket_name" {
  value = aws_s3_bucket.approved.id
}

output "review_bucket_name" {
  value = aws_s3_bucket.review.id
}
```

#### Step 1-5: SQSモジュール

```hcl
# modules/sqs/main.tf
resource "aws_sqs_queue" "image_processing" {
  name                       = "${var.project_name}-image-processing-${var.environment}"
  visibility_timeout_seconds = 300  # Lambda timeout + バッファ
  message_retention_seconds  = 86400  # 1日
  receive_wait_time_seconds  = 20  # ロングポーリング

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

# デッドレターキュー
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.project_name}-image-processing-dlq-${var.environment}"
  message_retention_seconds = 1209600  # 14日
}

# S3からのメッセージ送信を許可
resource "aws_sqs_queue_policy" "allow_s3" {
  queue_url = aws_sqs_queue.image_processing.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowS3Notification"
        Effect    = "Allow"
        Principal = { Service = "s3.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.image_processing.arn
      }
    ]
  })
}
```

```hcl
# modules/sqs/outputs.tf
output "queue_arn" {
  value = aws_sqs_queue.image_processing.arn
}

output "queue_url" {
  value = aws_sqs_queue.image_processing.url
}

output "dlq_arn" {
  value = aws_sqs_queue.dlq.arn
}
```

### フェーズ2: Lambda関数実装（2時間）

#### Step 2-1: Lambdaモジュール

```hcl
# modules/lambda/main.tf
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# IAMロール
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-image-processor-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAMポリシー
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-image-processor-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${var.input_bucket_arn}/*",
          "arn:aws:s3:::${var.approved_bucket_name}/*",
          "arn:aws:s3:::${var.review_bucket_name}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "rekognition:DetectLabels",
          "rekognition:DetectModerationLabels"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = var.dynamodb_table_arn
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = var.sqs_queue_arn
      }
    ]
  })
}

# Lambda関数
resource "aws_lambda_function" "image_processor" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_name}-image-processor-${var.environment}"
  role             = aws_iam_role.lambda_role.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 120
  memory_size      = 512
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      APPROVED_BUCKET  = var.approved_bucket_name
      REVIEW_BUCKET    = var.review_bucket_name
      DYNAMODB_TABLE   = var.dynamodb_table_name
      BEDROCK_MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0"
    }
  }
}

# Lambdaコードのzip化
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/lambda_code/image_processor"
  output_path = "${path.root}/lambda_code/image_processor.zip"
}

# SQSトリガー
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = var.sqs_queue_arn
  function_name    = aws_lambda_function.image_processor.arn
  batch_size       = 5
}
```

#### Step 2-2: Lambda関数コード

```python
# lambda_code/image_processor/lambda_function.py
import json
import boto3
import base64
import os
from urllib.parse import unquote_plus
from datetime import datetime
from decimal import Decimal

# クライアント初期化
s3 = boto3.client('s3')
rekognition = boto3.client('rekognition')
bedrock_runtime = boto3.client('bedrock-runtime', region_name='ap-northeast-1')
dynamodb = boto3.resource('dynamodb')

# 環境変数
APPROVED_BUCKET = os.environ['APPROVED_BUCKET']
REVIEW_BUCKET = os.environ['REVIEW_BUCKET']
DYNAMODB_TABLE = os.environ['DYNAMODB_TABLE']
BEDROCK_MODEL_ID = os.environ['BEDROCK_MODEL_ID']

# DynamoDBテーブル
table = dynamodb.Table(DYNAMODB_TABLE)

# 部屋タイプのマッピング
ROOM_TYPE_MAPPING = {
    'Living Room': 'リビング',
    'Bedroom': '寝室',
    'Kitchen': 'キッチン',
    'Bathroom': 'バスルーム',
    'Dining Room': 'ダイニング',
    'Office': '書斎',
    'Balcony': 'バルコニー',
    'Entrance': '玄関',
    'Closet': '収納',
}

# 設備のマッピング
EQUIPMENT_MAPPING = {
    'Air Conditioner': 'エアコン',
    'Refrigerator': '冷蔵庫',
    'Washing Machine': '洗濯機',
    'Microwave': '電子レンジ',
    'Television': 'テレビ',
    'Sofa': 'ソファ',
    'Bed': 'ベッド',
    'Table': 'テーブル',
    'Chair': '椅子',
    'Bathtub': '浴槽',
    'Toilet': 'トイレ',
    'Sink': '洗面台',
}

def detect_labels(bucket: str, key: str) -> dict:
    """Rekognitionでラベル検出"""
    response = rekognition.detect_labels(
        Image={'S3Object': {'Bucket': bucket, 'Name': key}},
        MaxLabels=20,
        MinConfidence=70
    )
    return response['Labels']

def detect_moderation(bucket: str, key: str) -> dict:
    """不適切コンテンツ検出"""
    response = rekognition.detect_moderation_labels(
        Image={'S3Object': {'Bucket': bucket, 'Name': key}},
        MinConfidence=60
    )
    return response['ModerationLabels']

def analyze_with_bedrock(bucket: str, key: str) -> str:
    """Bedrockで詳細な部屋説明を生成"""
    # S3から画像取得
    response = s3.get_object(Bucket=bucket, Key=key)
    image_bytes = response['Body'].read()
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')

    # 画像形式判定
    content_type = response.get('ContentType', 'image/jpeg')
    media_type = 'image/jpeg' if 'jpeg' in content_type or 'jpg' in content_type else 'image/png'

    # プロンプト
    prompt = """この物件画像を分析して、以下の情報をJSON形式で返してください。

1. room_type: 部屋の種類（リビング、寝室、キッチン、バスルーム、玄関、バルコニー等）
2. features: 特徴リスト（日当たり良好、広々、モダン、収納豊富等）
3. equipment: 確認できる設備リスト
4. condition: 部屋の状態（良好、普通、要確認）
5. description: 不動産サイト向けの魅力的な説明文（50文字以内）

JSON形式のみで回答してください。"""

    # Bedrock呼び出し
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    })

    response = bedrock_runtime.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        body=body
    )

    response_body = json.loads(response['body'].read())
    return response_body['content'][0]['text']

def process_labels(labels: list) -> dict:
    """ラベルを処理してタグに変換"""
    room_type = None
    equipment = []
    features = []

    for label in labels:
        name = label['Name']
        confidence = label['Confidence']

        # 部屋タイプ判定
        if name in ROOM_TYPE_MAPPING:
            if room_type is None or confidence > 85:
                room_type = ROOM_TYPE_MAPPING[name]

        # 設備判定
        if name in EQUIPMENT_MAPPING:
            equipment.append(EQUIPMENT_MAPPING[name])

        # 特徴判定
        if name == 'Window' and confidence > 80:
            features.append('採光良好')
        if name == 'Plant' and confidence > 70:
            features.append('観葉植物あり')
        if name == 'Wood' and confidence > 70:
            features.append('木目調')

    return {
        'room_type': room_type or '不明',
        'equipment': list(set(equipment)),
        'features': list(set(features))
    }

def check_quality(labels: list) -> dict:
    """画像品質チェック"""
    issues = []

    # ラベルの信頼度チェック
    high_confidence_labels = [l for l in labels if l['Confidence'] > 80]
    if len(high_confidence_labels) < 3:
        issues.append('画像が不鮮明または内容が不明確')

    # 部屋関連のラベルがあるか
    room_related = ['Room', 'Interior', 'Furniture', 'Home', 'House']
    has_room_label = any(l['Name'] in room_related for l in labels)
    if not has_room_label:
        issues.append('物件画像として不適切な可能性')

    return {
        'is_valid': len(issues) == 0,
        'issues': issues
    }

def save_to_dynamodb(image_id: str, data: dict):
    """処理結果をDynamoDBに保存"""
    item = {
        'image_id': image_id,
        'processed_at': datetime.utcnow().isoformat(),
        'status': data['status'],
        'room_type': data.get('room_type', 'unknown'),
        'equipment': data.get('equipment', []),
        'features': data.get('features', []),
        'description': data.get('description', ''),
        'quality_issues': data.get('quality_issues', []),
        'moderation_flags': data.get('moderation_flags', []),
        'destination_bucket': data.get('destination_bucket', ''),
        'destination_key': data.get('destination_key', '')
    }

    table.put_item(Item=item)

def lambda_handler(event, context):
    """メインハンドラー"""
    results = []

    for record in event['Records']:
        try:
            # SQSメッセージからS3イベント情報を取得
            body = json.loads(record['body'])
            s3_event = body['Records'][0]
            bucket = s3_event['s3']['bucket']['name']
            key = unquote_plus(s3_event['s3']['object']['key'])

            print(f"Processing: s3://{bucket}/{key}")

            # 1. ラベル検出
            labels = detect_labels(bucket, key)
            print(f"Detected {len(labels)} labels")

            # 2. 不適切コンテンツチェック
            moderation = detect_moderation(bucket, key)
            has_moderation_issues = len(moderation) > 0
            print(f"Moderation issues: {has_moderation_issues}")

            # 3. ラベル処理
            label_result = process_labels(labels)

            # 4. 品質チェック
            quality_result = check_quality(labels)

            # 5. Bedrockで詳細分析（品質OKの場合のみ）
            bedrock_result = {}
            if quality_result['is_valid'] and not has_moderation_issues:
                try:
                    bedrock_response = analyze_with_bedrock(bucket, key)
                    # JSON部分を抽出
                    if '{' in bedrock_response and '}' in bedrock_response:
                        json_start = bedrock_response.find('{')
                        json_end = bedrock_response.rfind('}') + 1
                        bedrock_result = json.loads(bedrock_response[json_start:json_end])
                except Exception as e:
                    print(f"Bedrock analysis error: {e}")

            # 6. 結果統合
            image_id = key.split('/')[-1].replace('.jpg', '').replace('.png', '')

            # ステータス判定
            if has_moderation_issues:
                status = 'rejected'
                destination_bucket = REVIEW_BUCKET
            elif not quality_result['is_valid']:
                status = 'review'
                destination_bucket = REVIEW_BUCKET
            else:
                status = 'approved'
                destination_bucket = APPROVED_BUCKET

            destination_key = f"images/{datetime.utcnow().strftime('%Y/%m/%d')}/{image_id}.jpg"

            # 7. 画像を移動
            s3.copy_object(
                Bucket=destination_bucket,
                Key=destination_key,
                CopySource={'Bucket': bucket, 'Key': key}
            )

            # 8. 結果をDynamoDBに保存
            result_data = {
                'status': status,
                'room_type': bedrock_result.get('room_type') or label_result['room_type'],
                'equipment': bedrock_result.get('equipment') or label_result['equipment'],
                'features': bedrock_result.get('features') or label_result['features'],
                'description': bedrock_result.get('description', ''),
                'quality_issues': quality_result['issues'],
                'moderation_flags': [m['Name'] for m in moderation],
                'destination_bucket': destination_bucket,
                'destination_key': destination_key
            }

            save_to_dynamodb(image_id, result_data)

            results.append({
                'image_id': image_id,
                'status': status,
                'room_type': result_data['room_type']
            })

            print(f"Processed {image_id}: {status}")

        except Exception as e:
            print(f"Error processing record: {e}")
            results.append({'error': str(e)})

    return {
        'statusCode': 200,
        'body': json.dumps(results, ensure_ascii=False)
    }
```

### フェーズ3: DynamoDBモジュールとデプロイ（1時間）

#### Step 3-1: DynamoDBモジュール

```hcl
# modules/dynamodb/main.tf
resource "aws_dynamodb_table" "image_metadata" {
  name         = "${var.project_name}-image-metadata-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "image_id"

  attribute {
    name = "image_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "room_type"
    type = "S"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "room_type-index"
    hash_key        = "room_type"
    projection_type = "ALL"
  }

  tags = {
    Name = "${var.project_name}-image-metadata"
  }
}
```

```hcl
# modules/dynamodb/outputs.tf
output "table_arn" {
  value = aws_dynamodb_table.image_metadata.arn
}

output "table_name" {
  value = aws_dynamodb_table.image_metadata.name
}
```

#### Step 3-2: Terraformデプロイ

```bash
# 初期化
terraform init

# プラン確認
terraform plan

# デプロイ
terraform apply -auto-approve

# 出力確認
terraform output
```

### フェーズ4: テストと監視設定（1時間）

#### Step 4-1: テスト画像アップロード

```bash
# テスト画像をS3にアップロード
aws s3 cp sample-room.jpg s3://$(terraform output -raw input_bucket_name)/uploads/test-001.jpg

# 処理結果確認（30秒後）
aws dynamodb get-item \
  --table-name $(terraform output -raw dynamodb_table_name) \
  --key '{"image_id": {"S": "test-001"}}'
```

#### Step 4-2: CloudWatch監視設定

```hcl
# monitoring.tf をmain.tfに追加
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-image-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda error rate exceeded"

  dimensions = {
    FunctionName = module.lambda.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "sqs_dlq" {
  alarm_name          = "${var.project_name}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "Messages in DLQ"

  dimensions = {
    QueueName = module.sqs.dlq_name
  }
}
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
