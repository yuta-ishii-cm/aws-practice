# 課題37: CreditAI MLOpsパイプライン - モデル開発から本番運用までの自動化

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | MLOps / 機械学習パイプライン |
| 処理タイプ | バッチ |
| 使用IaC | Terraform |
| 想定所要時間 | 6-8時間 |

---

## 2. ビジネスシナリオ

### 企業プロファイル: CreditAI株式会社

```
┌─────────────────────────────────────────────────────────────────┐
│                     CreditAI株式会社                             │
│                    与信審査AIプラットフォーム                    │
├─────────────────────────────────────────────────────────────────┤
│  設立: 2020年    従業員: 50名    本社: 東京                      │
│  事業: 金融機関向け与信審査AI SaaS                              │
│  顧客: 銀行・クレジットカード会社30社                           │
│  年間審査件数: 500万件    API呼び出し: 1日20万件                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【現在のML開発プロセス】                                        │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │   Data Scientist                 ML Engineer                ││
│  │   ┌─────────────┐               ┌─────────────┐            ││
│  │   │ Jupyter     │   手動で      │ 本番環境    │            ││
│  │   │ Notebook    │───引き渡し───►│ デプロイ    │            ││
│  │   │ でモデル開発│               │             │            ││
│  │   └─────────────┘               └─────────────┘            ││
│  │                                                              ││
│  │   【問題点】                                                 ││
│  │   ・開発から本番デプロイまで2週間                           ││
│  │   ・手動作業によるミス発生                                  ││
│  │   ・モデルのバージョン管理が不十分                          ││
│  │   ・再現性の欠如（どの学習データで訓練したか不明）          ││
│  │   ・モデル監視が手動                                        ││
│  │   ・規制対応（説明可能性）の工数大                          ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【目指す姿】                                                    │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                    MLOps パイプライン                        ││
│  │                                                              ││
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐    ││
│  │  │Data │─►│Train│─►│Eval │─►│Reg  │─►│Deploy│─►│Monit│    ││
│  │  │Prep │  │     │  │     │  │ister│  │     │  │or   │    ││
│  │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘    ││
│  │     │         │         │         │         │       │      ││
│  │     └─────────┴─────────┴─────────┴─────────┴───────┘      ││
│  │                         自動化                               ││
│  │                                                              ││
│  │  ・コードプッシュから本番デプロイまで4時間                  ││
│  │  ・完全自動化されたパイプライン                             ││
│  │  ・全モデルのバージョン管理と追跡                           ││
│  │  ・自動モデル監視とドリフト検出                             ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 規制要件

```
┌─────────────────────────────────────────────────────────────────┐
│                    金融規制対応要件                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【モデルガバナンス要件】                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  1. モデルの追跡可能性（Traceability）                       ││
│  │     ・どのデータで学習したか                                ││
│  │     ・どのハイパーパラメータを使用したか                    ││
│  │     ・いつ、誰が承認したか                                  ││
│  │                                                              ││
│  │  2. 説明可能性（Explainability）                            ││
│  │     ・審査結果の理由を説明できること                        ││
│  │     ・SHAP値やFeature Importanceの記録                      ││
│  │                                                              ││
│  │  3. 公平性（Fairness）                                      ││
│  │     ・差別的バイアスがないことの検証                        ││
│  │     ・定期的な公平性監査                                    ││
│  │                                                              ││
│  │  4. 監査証跡（Audit Trail）                                 ││
│  │     ・全ての判断の記録                                      ││
│  │     ・7年間の保存義務                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ビジネス要件と KPI

```
┌─────────────────────────────────────────────────────────────────┐
│                    プロジェクト KPI                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【開発効率目標】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  指標              │ 現状        │ 目標        │ 改善      ││
│  ├────────────────────┼─────────────┼─────────────┼───────────┤│
│  │  デプロイリード    │ 2週間       │ 4時間       │ 98%↓     ││
│  │  タイム            │             │             │           ││
│  │  デプロイ頻度      │ 月1回       │ 週2回       │ 8倍↑     ││
│  │  手動作業時間      │ 40時間/回   │ 2時間/回    │ 95%↓     ││
│  │  ロールバック時間  │ 4時間       │ 15分        │ 94%↓     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【品質目標】                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  指標              │ 現状        │ 目標        │ 基準      ││
│  ├────────────────────┼─────────────┼─────────────┼───────────┤│
│  │  モデル精度(AUC)   │ 0.82        │ > 0.85      │ 本番必須  ││
│  │  推論レイテンシ    │ 500ms       │ < 200ms     │ P99       ││
│  │  エンドポイント    │ 99.5%       │ 99.95%      │ SLO       ││
│  │  可用性            │             │             │           ││
│  │  ドリフト検出時間  │ 7日         │ < 1日       │ 自動      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 学習目標

### 習得スキル

```
┌─────────────────────────────────────────────────────────────────┐
│                       学習目標マップ                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【主要スキル】                                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  1. SageMaker Pipelines                                     ││
│  │     ├── パイプライン定義（Python SDK）                      ││
│  │     ├── ステップの種類と使い分け                            ││
│  │     ├── 条件分岐とパラメータ化                              ││
│  │     └── パイプラインの実行と監視                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  2. モデルレジストリとバージョン管理                        ││
│  │     ├── Model Package Group                                 ││
│  │     ├── モデルの承認ワークフロー                            ││
│  │     ├── メタデータ管理                                      ││
│  │     └── リネージュ追跡                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  3. モデル監視                                              ││
│  │     ├── SageMaker Model Monitor                             ││
│  │     ├── データ品質監視                                      ││
│  │     ├── モデル品質監視                                      ││
│  │     └── バイアスドリフト検出                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  4. CI/CD for ML                                            ││
│  │     ├── CodePipeline / CodeBuild                            ││
│  │     ├── GitOps ワークフロー                                 ││
│  │     ├── 自動テスト戦略                                      ││
│  │     └── ブルー/グリーンデプロイ                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【副次スキル】                                                  │
│  ・Terraform によるMLOps基盤構築                                 │
│  ・EventBridge によるイベント駆動                               │
│  ・説明可能AI（SageMaker Clarify）                              │
│  ・コスト最適化                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### GCPとの対応関係

| AWS サービス | GCP 対応サービス | 主な違い |
|-------------|-----------------|---------|
| SageMaker Pipelines | Vertex AI Pipelines | Kubeflow ベース |
| Model Registry | Vertex AI Model Registry | モデル管理 |
| Model Monitor | Vertex AI Model Monitoring | ドリフト検出 |
| SageMaker Clarify | Vertex Explainable AI | 説明可能性 |

---

## 4. 使用するAWSサービス

```
┌─────────────────────────────────────────────────────────────────┐
│                    使用AWSサービス一覧                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【MLOpsコア】                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  サービス              │ 用途                  │ 重要度    ││
│  ├────────────────────────┼───────────────────────┼───────────┤│
│  │  SageMaker Pipelines   │ MLパイプライン        │ ★★★★★    ││
│  │  SageMaker Model Reg.  │ モデル管理            │ ★★★★★    ││
│  │  SageMaker Model Mon.  │ モデル監視            │ ★★★★☆    ││
│  │  SageMaker Clarify     │ 説明可能性・公平性    │ ★★★★☆    ││
│  │  SageMaker Experiments │ 実験管理              │ ★★★☆☆    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【CI/CD】                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  サービス              │ 用途                  │ 重要度    ││
│  ├────────────────────────┼───────────────────────┼───────────┤│
│  │  CodeCommit / GitHub   │ ソースコード管理      │ ★★★★☆    ││
│  │  CodePipeline          │ CI/CDオーケストレーション│ ★★★★★ ││
│  │  CodeBuild             │ ビルド・テスト        │ ★★★★☆    ││
│  │  EventBridge           │ イベント駆動          │ ★★★☆☆    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【インフラ】                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Terraform             │ IaC                   │ ★★★★★    ││
│  │  S3                    │ データ・アーティファクト│ ★★★★★   ││
│  │  IAM                   │ アクセス制御          │ ★★★★☆    ││
│  │  CloudWatch            │ ログ・監視            │ ★★★★☆    ││
│  │  SNS                   │ 通知                  │ ★★★☆☆    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 前提条件と事前準備

### 必要な環境

```bash
# Terraform バージョン確認
terraform --version
# Terraform v1.5.0 以上

# AWS CLI バージョン確認
aws --version
# aws-cli/2.x.x 以上

# Python環境
python3 --version
# Python 3.9以上

# 必要なPythonパッケージ
pip install sagemaker boto3 pandas scikit-learn
```

### AWS環境の準備

```bash
# 環境変数設定
export AWS_REGION=ap-northeast-1
export PROJECT_NAME=creditai
export ENVIRONMENT=dev

# 作業ディレクトリ作成
mkdir -p ~/creditai-mlops/{terraform,pipelines,scripts,tests}
cd ~/creditai-mlops
```

---

## 6. アーキテクチャ設計

### MLOpsパイプライン全体像

```
┌─────────────────────────────────────────────────────────────────┐
│              CreditAI MLOps パイプライン                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Source & Build                           ││
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   ││
│  │  │   GitHub    │────►│ CodeBuild   │────►│  S3 Artifact│   ││
│  │  │  (Code)     │     │ (Lint/Test) │     │  (Package)  │   ││
│  │  └─────────────┘     └─────────────┘     └──────┬──────┘   ││
│  └─────────────────────────────────────────────────┼───────────┘│
│                                                    │             │
│  ┌─────────────────────────────────────────────────┼───────────┐│
│  │                SageMaker Pipelines              │           ││
│  │                                                 ▼           ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │                                                         │││
│  │  │  ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐        │││
│  │  │  │ Data  │──►│ Train │──►│ Eval  │──►│Clarify│        │││
│  │  │  │ Prep  │   │       │   │       │   │(Bias) │        │││
│  │  │  └───────┘   └───────┘   └───────┘   └───┬───┘        │││
│  │  │                                          │             │││
│  │  │                    ┌─────────────────────┘             │││
│  │  │                    │                                   │││
│  │  │                    ▼                                   │││
│  │  │  ┌─────────────────────────────────────────────────┐   │││
│  │  │  │  Condition: AUC > 0.85 AND Bias Check Pass     │   │││
│  │  │  └──────────────────┬──────────────────────────────┘   │││
│  │  │                     │                                  │││
│  │  │          ┌──────────┴──────────┐                       │││
│  │  │          │                     │                       │││
│  │  │          ▼                     ▼                       │││
│  │  │  ┌─────────────┐       ┌─────────────┐                │││
│  │  │  │  Register   │       │   Fail      │                │││
│  │  │  │  Model      │       │   Pipeline  │                │││
│  │  │  └──────┬──────┘       └─────────────┘                │││
│  │  │         │                                              │││
│  │  └─────────┼──────────────────────────────────────────────┘││
│  └────────────┼────────────────────────────────────────────────┘│
│               │                                                  │
│  ┌────────────┼────────────────────────────────────────────────┐│
│  │            ▼              Deployment                        ││
│  │  ┌─────────────────┐                                        ││
│  │  │  Model Registry │                                        ││
│  │  │  (Pending       │                                        ││
│  │  │   Approval)     │                                        ││
│  │  └────────┬────────┘                                        ││
│  │           │                                                  ││
│  │           ▼                                                  ││
│  │  ┌─────────────────┐     ┌─────────────────┐                ││
│  │  │  Manual/Auto    │────►│  Deploy to      │                ││
│  │  │  Approval       │     │  Staging        │                ││
│  │  └─────────────────┘     └────────┬────────┘                ││
│  │                                   │                          ││
│  │                                   ▼                          ││
│  │                          ┌─────────────────┐                ││
│  │                          │  Integration    │                ││
│  │                          │  Test           │                ││
│  │                          └────────┬────────┘                ││
│  │                                   │                          ││
│  │                                   ▼                          ││
│  │                          ┌─────────────────┐                ││
│  │                          │  Deploy to      │                ││
│  │                          │  Production     │                ││
│  │                          │  (Blue/Green)   │                ││
│  │                          └────────┬────────┘                ││
│  └───────────────────────────────────┼──────────────────────────┘│
│                                      │                           │
│  ┌───────────────────────────────────┼──────────────────────────┐│
│  │                      Monitoring   │                          ││
│  │                                   ▼                          ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │              SageMaker Model Monitor                    │││
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │││
│  │  │  │ Data     │  │ Model    │  │  Bias    │              │││
│  │  │  │ Quality  │  │ Quality  │  │  Drift   │              │││
│  │  │  └────┬─────┘  └────┬─────┘  └────┬─────┘              │││
│  │  │       └──────────────┼──────────────┘                   │││
│  │  │                      ▼                                  │││
│  │  │              ┌─────────────┐                            │││
│  │  │              │  CloudWatch │                            │││
│  │  │              │  Alarm      │──►  SNS/PagerDuty         │││
│  │  │              └─────────────┘                            │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. ハンズオン手順

### Phase 1: Terraformによる基盤構築

#### 1.1 プロジェクト構造

```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── providers.tf
├── modules/
│   ├── sagemaker/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── iam.tf
│   │   └── model-registry.tf
│   ├── cicd/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── codepipeline.tf
│   │   └── codebuild.tf
│   ├── monitoring/
│   │   ├── main.tf
│   │   ├── alarms.tf
│   │   └── dashboard.tf
│   └── networking/
│       └── main.tf
└── environments/
    ├── dev/
    │   └── terraform.tfvars
    └── prod/
        └── terraform.tfvars
```

#### 1.2 SageMaker基盤モジュール

```hcl
# modules/sagemaker/main.tf
#============================================
# S3 Buckets
#============================================
resource "aws_s3_bucket" "ml_data" {
  bucket = "${var.project_name}-ml-data-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Purpose = "MLData"
  }
}

resource "aws_s3_bucket_versioning" "ml_data" {
  bucket = aws_s3_bucket.ml_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ml_data" {
  bucket = aws_s3_bucket.ml_data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket" "ml_artifacts" {
  bucket = "${var.project_name}-ml-artifacts-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Purpose = "MLArtifacts"
  }
}

resource "aws_s3_bucket_versioning" "ml_artifacts" {
  bucket = aws_s3_bucket.ml_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

#============================================
# SageMaker Domain
#============================================
resource "aws_sagemaker_domain" "main" {
  domain_name             = "${var.project_name}-domain-${var.environment}"
  auth_mode               = "IAM"
  vpc_id                  = var.vpc_id
  subnet_ids              = var.subnet_ids
  app_network_access_type = "VpcOnly"

  default_user_settings {
    execution_role  = aws_iam_role.sagemaker_execution.arn
    security_groups = [var.security_group_id]
  }

  tags = {
    Environment = var.environment
  }
}

#============================================
# Model Package Group (Model Registry)
#============================================
resource "aws_sagemaker_model_package_group" "credit_scoring" {
  model_package_group_name        = "${var.project_name}-credit-scoring-${var.environment}"
  model_package_group_description = "Credit scoring models for CreditAI"

  tags = {
    UseCase     = "CreditScoring"
    Environment = var.environment
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
```

```hcl
# modules/sagemaker/iam.tf
#============================================
# SageMaker Execution Role
#============================================
resource "aws_iam_role" "sagemaker_execution" {
  name = "${var.project_name}-sagemaker-execution-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "sagemaker_full_access" {
  role       = aws_iam_role.sagemaker_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

resource "aws_iam_role_policy" "sagemaker_s3_access" {
  name = "${var.project_name}-sagemaker-s3-${var.environment}"
  role = aws_iam_role.sagemaker_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.ml_data.arn,
          "${aws_s3_bucket.ml_data.arn}/*",
          aws_s3_bucket.ml_artifacts.arn,
          "${aws_s3_bucket.ml_artifacts.arn}/*"
        ]
      }
    ]
  })
}

#============================================
# Pipeline Execution Role
#============================================
resource "aws_iam_role" "pipeline_execution" {
  name = "${var.project_name}-pipeline-execution-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "pipeline_execution_policy" {
  name = "${var.project_name}-pipeline-policy-${var.environment}"
  role = aws_iam_role.pipeline_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sagemaker:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:*"
        ]
        Resource = [
          aws_s3_bucket.ml_data.arn,
          "${aws_s3_bucket.ml_data.arn}/*",
          aws_s3_bucket.ml_artifacts.arn,
          "${aws_s3_bucket.ml_artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/sagemaker/*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = aws_iam_role.sagemaker_execution.arn
      }
    ]
  })
}
```

#### 1.3 CI/CDモジュール

```hcl
# modules/cicd/codepipeline.tf
#============================================
# CodePipeline for ML
#============================================
resource "aws_codepipeline" "ml_pipeline" {
  name     = "${var.project_name}-ml-pipeline-${var.environment}"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = var.artifact_bucket
    type     = "S3"
  }

  # Source Stage
  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = var.codestar_connection_arn
        FullRepositoryId = var.repository_name
        BranchName       = var.branch_name
      }
    }
  }

  # Build Stage (Lint & Unit Test)
  stage {
    name = "Build"

    action {
      name             = "BuildAndTest"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.ml_build.name
      }
    }
  }

  # Train Stage (SageMaker Pipeline)
  stage {
    name = "Train"

    action {
      name            = "TriggerSageMakerPipeline"
      category        = "Invoke"
      owner           = "AWS"
      provider        = "Lambda"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        FunctionName = aws_lambda_function.trigger_pipeline.function_name
      }
    }
  }

  # Manual Approval
  stage {
    name = "Approval"

    action {
      name     = "ManualApproval"
      category = "Approval"
      owner    = "AWS"
      provider = "Manual"
      version  = "1"

      configuration = {
        NotificationArn = var.approval_sns_topic_arn
        CustomData      = "Please review the model metrics and approve for deployment"
      }
    }
  }

  # Deploy to Staging
  stage {
    name = "DeployStaging"

    action {
      name            = "DeployToStaging"
      category        = "Invoke"
      owner           = "AWS"
      provider        = "Lambda"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        FunctionName   = aws_lambda_function.deploy_model.function_name
        UserParameters = jsonencode({ environment = "staging" })
      }
    }
  }

  # Integration Test
  stage {
    name = "IntegrationTest"

    action {
      name            = "IntegrationTest"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.integration_test.name
      }
    }
  }

  # Deploy to Production (Blue/Green)
  stage {
    name = "DeployProduction"

    action {
      name            = "DeployToProduction"
      category        = "Invoke"
      owner           = "AWS"
      provider        = "Lambda"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        FunctionName   = aws_lambda_function.deploy_model.function_name
        UserParameters = jsonencode({ environment = "production" })
      }
    }
  }

  tags = {
    Environment = var.environment
  }
}

#============================================
# IAM Role for CodePipeline
#============================================
resource "aws_iam_role" "codepipeline_role" {
  name = "${var.project_name}-codepipeline-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codepipeline.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "codepipeline_policy" {
  name = "${var.project_name}-codepipeline-policy-${var.environment}"
  role = aws_iam_role.codepipeline_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:GetObjectVersion",
          "s3:GetBucketVersioning"
        ]
        Resource = [
          "arn:aws:s3:::${var.artifact_bucket}",
          "arn:aws:s3:::${var.artifact_bucket}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "codebuild:BatchGetBuilds",
          "codebuild:StartBuild"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "codestar-connections:UseConnection"
        ]
        Resource = var.codestar_connection_arn
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.approval_sns_topic_arn
      }
    ]
  })
}
```

```hcl
# modules/cicd/codebuild.tf
#============================================
# CodeBuild for ML Build & Test
#============================================
resource "aws_codebuild_project" "ml_build" {
  name          = "${var.project_name}-ml-build-${var.environment}"
  description   = "Build and test ML code"
  build_timeout = 30
  service_role  = aws_iam_role.codebuild_role.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:4.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }

    environment_variable {
      name  = "DATA_BUCKET"
      value = var.data_bucket
    }

    environment_variable {
      name  = "ARTIFACT_BUCKET"
      value = var.artifact_bucket
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = <<-EOF
      version: 0.2
      phases:
        install:
          runtime-versions:
            python: 3.9
          commands:
            - pip install -r requirements.txt
            - pip install pytest flake8 black mypy
        pre_build:
          commands:
            - echo "Running code quality checks..."
            - flake8 pipelines/ --max-line-length=120
            - black --check pipelines/
            - mypy pipelines/ --ignore-missing-imports
        build:
          commands:
            - echo "Running unit tests..."
            - pytest tests/unit/ -v --junitxml=reports/unit-tests.xml
            - echo "Packaging pipeline code..."
            - zip -r pipeline-code.zip pipelines/ scripts/
        post_build:
          commands:
            - echo "Build completed"
      reports:
        UnitTests:
          files:
            - reports/unit-tests.xml
          file-format: JUNITXML
      artifacts:
        files:
          - pipeline-code.zip
          - pipelines/**/*
          - scripts/**/*
    EOF
  }

  tags = {
    Environment = var.environment
  }
}

#============================================
# CodeBuild for Integration Tests
#============================================
resource "aws_codebuild_project" "integration_test" {
  name          = "${var.project_name}-integration-test-${var.environment}"
  description   = "Integration tests for ML endpoint"
  build_timeout = 30
  service_role  = aws_iam_role.codebuild_role.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:4.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }

    environment_variable {
      name  = "STAGING_ENDPOINT"
      value = "${var.project_name}-staging-endpoint"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = <<-EOF
      version: 0.2
      phases:
        install:
          runtime-versions:
            python: 3.9
          commands:
            - pip install boto3 pandas pytest requests
        build:
          commands:
            - echo "Running integration tests..."
            - pytest tests/integration/ -v --junitxml=reports/integration-tests.xml
            - echo "Running load tests..."
            - python tests/load/load_test.py
      reports:
        IntegrationTests:
          files:
            - reports/integration-tests.xml
          file-format: JUNITXML
    EOF
  }

  tags = {
    Environment = var.environment
  }
}

#============================================
# IAM Role for CodeBuild
#============================================
resource "aws_iam_role" "codebuild_role" {
  name = "${var.project_name}-codebuild-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "codebuild_policy" {
  name = "${var.project_name}-codebuild-policy-${var.environment}"
  role = aws_iam_role.codebuild_role.id

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
          "s3:PutObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.artifact_bucket}/*",
          "arn:aws:s3:::${var.data_bucket}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sagemaker:InvokeEndpoint"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "codebuild:CreateReportGroup",
          "codebuild:CreateReport",
          "codebuild:UpdateReport",
          "codebuild:BatchPutTestCases"
        ]
        Resource = "*"
      }
    ]
  })
}
```

### Phase 2: SageMaker Pipelineの実装

```python
# pipelines/credit_scoring_pipeline.py
"""
与信スコアリングモデルのSageMaker Pipeline定義
"""
import sagemaker
from sagemaker.workflow.pipeline import Pipeline
from sagemaker.workflow.steps import (
    ProcessingStep,
    TrainingStep,
    CreateModelStep,
    RegisterModel,
    ConditionStep,
)
from sagemaker.workflow.conditions import ConditionGreaterThanOrEqualTo
from sagemaker.workflow.condition_step import ConditionStep
from sagemaker.workflow.functions import JsonGet
from sagemaker.workflow.properties import PropertyFile
from sagemaker.workflow.parameters import ParameterString, ParameterFloat
from sagemaker.processing import ScriptProcessor
from sagemaker.estimator import Estimator
from sagemaker.inputs import TrainingInput
from sagemaker.model_metrics import MetricsSource, ModelMetrics
from sagemaker import image_uris
import os

def create_pipeline(
    pipeline_name: str,
    role: str,
    data_bucket: str,
    artifact_bucket: str,
    model_package_group_name: str,
    region: str
):
    """SageMaker Pipelineを作成"""

    session = sagemaker.Session()

    # パイプラインパラメータ
    input_data_uri = ParameterString(
        name="InputDataUri",
        default_value=f"s3://{data_bucket}/raw/credit_data/"
    )

    auc_threshold = ParameterFloat(
        name="AUCThreshold",
        default_value=0.85
    )

    instance_type = ParameterString(
        name="TrainingInstanceType",
        default_value="ml.m5.xlarge"
    )

    #==========================================
    # Step 1: Data Processing
    #==========================================
    sklearn_processor = ScriptProcessor(
        image_uri=image_uris.retrieve(
            framework="sklearn",
            region=region,
            version="1.2-1"
        ),
        role=role,
        instance_count=1,
        instance_type="ml.m5.large",
        command=["python3"],
        base_job_name=f"{pipeline_name}-preprocessing"
    )

    processing_step = ProcessingStep(
        name="PreprocessData",
        processor=sklearn_processor,
        inputs=[
            sagemaker.processing.ProcessingInput(
                source=input_data_uri,
                destination="/opt/ml/processing/input"
            )
        ],
        outputs=[
            sagemaker.processing.ProcessingOutput(
                output_name="train",
                source="/opt/ml/processing/output/train",
                destination=f"s3://{artifact_bucket}/processing/train"
            ),
            sagemaker.processing.ProcessingOutput(
                output_name="validation",
                source="/opt/ml/processing/output/validation",
                destination=f"s3://{artifact_bucket}/processing/validation"
            ),
            sagemaker.processing.ProcessingOutput(
                output_name="test",
                source="/opt/ml/processing/output/test",
                destination=f"s3://{artifact_bucket}/processing/test"
            )
        ],
        code="scripts/preprocessing.py"
    )

    #==========================================
    # Step 2: Model Training
    #==========================================
    xgboost_image = image_uris.retrieve(
        framework="xgboost",
        region=region,
        version="1.7-1"
    )

    xgb_estimator = Estimator(
        image_uri=xgboost_image,
        role=role,
        instance_count=1,
        instance_type=instance_type,
        output_path=f"s3://{artifact_bucket}/training",
        base_job_name=f"{pipeline_name}-training",
        hyperparameters={
            "objective": "binary:logistic",
            "eval_metric": "auc",
            "num_round": 200,
            "max_depth": 6,
            "eta": 0.1,
            "subsample": 0.8,
            "colsample_bytree": 0.8
        }
    )

    training_step = TrainingStep(
        name="TrainModel",
        estimator=xgb_estimator,
        inputs={
            "train": TrainingInput(
                s3_data=processing_step.properties.ProcessingOutputConfig.Outputs[
                    "train"
                ].S3Output.S3Uri,
                content_type="text/csv"
            ),
            "validation": TrainingInput(
                s3_data=processing_step.properties.ProcessingOutputConfig.Outputs[
                    "validation"
                ].S3Output.S3Uri,
                content_type="text/csv"
            )
        }
    )

    #==========================================
    # Step 3: Model Evaluation
    #==========================================
    evaluation_report = PropertyFile(
        name="EvaluationReport",
        output_name="evaluation",
        path="evaluation.json"
    )

    evaluation_processor = ScriptProcessor(
        image_uri=image_uris.retrieve(
            framework="sklearn",
            region=region,
            version="1.2-1"
        ),
        role=role,
        instance_count=1,
        instance_type="ml.m5.large",
        command=["python3"],
        base_job_name=f"{pipeline_name}-evaluation"
    )

    evaluation_step = ProcessingStep(
        name="EvaluateModel",
        processor=evaluation_processor,
        inputs=[
            sagemaker.processing.ProcessingInput(
                source=training_step.properties.ModelArtifacts.S3ModelArtifacts,
                destination="/opt/ml/processing/model"
            ),
            sagemaker.processing.ProcessingInput(
                source=processing_step.properties.ProcessingOutputConfig.Outputs[
                    "test"
                ].S3Output.S3Uri,
                destination="/opt/ml/processing/test"
            )
        ],
        outputs=[
            sagemaker.processing.ProcessingOutput(
                output_name="evaluation",
                source="/opt/ml/processing/evaluation",
                destination=f"s3://{artifact_bucket}/evaluation"
            )
        ],
        code="scripts/evaluation.py",
        property_files=[evaluation_report]
    )

    #==========================================
    # Step 4: Clarify Bias Check
    #==========================================
    clarify_processor = sagemaker.clarify.SageMakerClarifyProcessor(
        role=role,
        instance_count=1,
        instance_type="ml.m5.xlarge",
        sagemaker_session=session
    )

    bias_report = PropertyFile(
        name="BiasReport",
        output_name="bias_analysis",
        path="analysis.json"
    )

    # Clarifyの設定（簡略化）
    clarify_step = ProcessingStep(
        name="ClarifyBiasCheck",
        processor=evaluation_processor,  # 実際はClarify Processor
        inputs=[
            sagemaker.processing.ProcessingInput(
                source=training_step.properties.ModelArtifacts.S3ModelArtifacts,
                destination="/opt/ml/processing/model"
            ),
            sagemaker.processing.ProcessingInput(
                source=processing_step.properties.ProcessingOutputConfig.Outputs[
                    "test"
                ].S3Output.S3Uri,
                destination="/opt/ml/processing/test"
            )
        ],
        outputs=[
            sagemaker.processing.ProcessingOutput(
                output_name="bias_analysis",
                source="/opt/ml/processing/clarify",
                destination=f"s3://{artifact_bucket}/clarify"
            )
        ],
        code="scripts/bias_check.py",
        property_files=[bias_report]
    )

    #==========================================
    # Step 5: Condition Check
    #==========================================
    auc_condition = ConditionGreaterThanOrEqualTo(
        left=JsonGet(
            step_name=evaluation_step.name,
            property_file=evaluation_report,
            json_path="metrics.auc"
        ),
        right=auc_threshold
    )

    #==========================================
    # Step 6: Register Model (if condition passes)
    #==========================================
    model_metrics = ModelMetrics(
        model_statistics=MetricsSource(
            s3_uri=f"s3://{artifact_bucket}/evaluation/evaluation.json",
            content_type="application/json"
        ),
        bias=MetricsSource(
            s3_uri=f"s3://{artifact_bucket}/clarify/analysis.json",
            content_type="application/json"
        )
    )

    register_step = RegisterModel(
        name="RegisterModel",
        estimator=xgb_estimator,
        model_data=training_step.properties.ModelArtifacts.S3ModelArtifacts,
        content_types=["text/csv"],
        response_types=["text/csv"],
        inference_instances=["ml.t2.medium", "ml.m5.large"],
        transform_instances=["ml.m5.xlarge"],
        model_package_group_name=model_package_group_name,
        approval_status="PendingManualApproval",
        model_metrics=model_metrics
    )

    #==========================================
    # Step 7: Condition Branch
    #==========================================
    condition_step = ConditionStep(
        name="CheckModelQuality",
        conditions=[auc_condition],
        if_steps=[register_step],
        else_steps=[]  # パイプライン失敗
    )

    #==========================================
    # Pipeline Definition
    #==========================================
    pipeline = Pipeline(
        name=pipeline_name,
        parameters=[
            input_data_uri,
            auc_threshold,
            instance_type
        ],
        steps=[
            processing_step,
            training_step,
            evaluation_step,
            clarify_step,
            condition_step
        ],
        sagemaker_session=session
    )

    return pipeline


if __name__ == "__main__":
    import boto3

    region = os.environ.get("AWS_REGION", "ap-northeast-1")
    environment = os.environ.get("ENVIRONMENT", "dev")
    account_id = boto3.client("sts").get_caller_identity()["Account"]

    role = f"arn:aws:iam::{account_id}:role/creditai-pipeline-execution-{environment}"
    data_bucket = f"creditai-ml-data-{environment}-{account_id}"
    artifact_bucket = f"creditai-ml-artifacts-{environment}-{account_id}"
    model_package_group = f"creditai-credit-scoring-{environment}"

    pipeline = create_pipeline(
        pipeline_name=f"creditai-credit-scoring-{environment}",
        role=role,
        data_bucket=data_bucket,
        artifact_bucket=artifact_bucket,
        model_package_group_name=model_package_group,
        region=region
    )

    # パイプラインをUpsert
    pipeline.upsert(role_arn=role)
    print(f"Pipeline created/updated: {pipeline.name}")
```

### Phase 3: Model Monitor設定

```hcl
# modules/monitoring/model_monitor.tf
#============================================
# Model Monitor - Data Quality
#============================================
resource "aws_sagemaker_data_quality_job_definition" "credit_scoring" {
  name     = "${var.project_name}-data-quality-${var.environment}"
  role_arn = var.sagemaker_execution_role_arn

  data_quality_app_specification {
    image_uri = "156813124566.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/sagemaker-model-monitor-analyzer"
  }

  data_quality_job_input {
    endpoint_input {
      endpoint_name          = var.endpoint_name
      local_path             = "/opt/ml/processing/input/endpoint"
      s3_data_distribution_type = "FullyReplicated"
      s3_input_mode          = "File"
    }
  }

  data_quality_job_output_config {
    monitoring_outputs {
      s3_output {
        s3_uri         = "s3://${var.artifact_bucket}/monitoring/data-quality"
        local_path     = "/opt/ml/processing/output"
        s3_upload_mode = "EndOfJob"
      }
    }
  }

  job_resources {
    cluster_config {
      instance_count    = 1
      instance_type     = "ml.m5.xlarge"
      volume_size_in_gb = 50
    }
  }

  data_quality_baseline_config {
    constraints_resource {
      s3_uri = "s3://${var.artifact_bucket}/baseline/constraints.json"
    }
    statistics_resource {
      s3_uri = "s3://${var.artifact_bucket}/baseline/statistics.json"
    }
  }

  stopping_condition {
    max_runtime_in_seconds = 1800
  }

  tags = {
    Environment = var.environment
  }
}

#============================================
# Model Monitor Schedule
#============================================
resource "aws_sagemaker_monitoring_schedule" "data_quality" {
  name = "${var.project_name}-data-quality-schedule-${var.environment}"

  monitoring_schedule_config {
    monitoring_job_definition_name = aws_sagemaker_data_quality_job_definition.credit_scoring.name
    monitoring_type                = "DataQuality"

    schedule_config {
      schedule_expression = "cron(0 * ? * * *)"  # 毎時
    }
  }

  tags = {
    Environment = var.environment
  }
}

data "aws_region" "current" {}
```

```hcl
# modules/monitoring/alarms.tf
#============================================
# CloudWatch Alarms for Model Monitoring
#============================================

# データドリフトアラーム
resource "aws_cloudwatch_metric_alarm" "data_drift" {
  alarm_name          = "${var.project_name}-data-drift-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DataQualityViolations"
  namespace           = "aws/sagemaker/Endpoints/data-metrics"
  period              = 3600
  statistic           = "Maximum"
  threshold           = 0

  dimensions = {
    EndpointName = var.endpoint_name
  }

  alarm_description = "Data drift detected in model input"
  alarm_actions     = [var.alert_sns_topic_arn]
  ok_actions        = [var.alert_sns_topic_arn]

  tags = {
    Environment = var.environment
  }
}

# 推論レイテンシアラーム
resource "aws_cloudwatch_metric_alarm" "inference_latency" {
  alarm_name          = "${var.project_name}-inference-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ModelLatency"
  namespace           = "AWS/SageMaker"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 200  # 200ms

  dimensions = {
    EndpointName = var.endpoint_name
    VariantName  = "AllTraffic"
  }

  alarm_description = "P99 inference latency exceeds threshold"
  alarm_actions     = [var.alert_sns_topic_arn]

  tags = {
    Environment = var.environment
  }
}

# 推論エラーアラーム
resource "aws_cloudwatch_metric_alarm" "inference_errors" {
  alarm_name          = "${var.project_name}-inference-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 1

  metric_query {
    id          = "error_rate"
    expression  = "errors / invocations * 100"
    label       = "Error Rate"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Invocation5XXErrors"
      namespace   = "AWS/SageMaker"
      period      = 300
      stat        = "Sum"
      dimensions = {
        EndpointName = var.endpoint_name
        VariantName  = "AllTraffic"
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/SageMaker"
      period      = 300
      stat        = "Sum"
      dimensions = {
        EndpointName = var.endpoint_name
        VariantName  = "AllTraffic"
      }
    }
  }

  alarm_description = "Inference error rate exceeds 1%"
  alarm_actions     = [var.alert_sns_topic_arn]

  tags = {
    Environment = var.environment
  }
}
```

---

## 8. トラブルシューティング演習

### 演習8-1: パイプライン失敗

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-1                      │
│                  パイプライン失敗                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  SageMaker Pipelineの実行が「TrainModel」ステップで              │
│  失敗している。                                                  │
│                                                                  │
│  【エラーログ】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ClientError: Data download failed for channel 'train'.     ││
│  │  Please ensure that the role has s3:GetObject permission    ││
│  │  for the following resources:                               ││
│  │  s3://creditai-ml-artifacts-dev-xxx/processing/train/       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. エラーの原因を特定してください                               │
│  2. IAMポリシーを修正してください                                │
│  3. パイプラインを再実行して成功を確認してください               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 演習8-2: モデルドリフト検出

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-2                      │
│                  モデルドリフト検出                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  Model Monitorからデータドリフトアラートが発生した。             │
│  推論精度の低下が懸念される。                                    │
│                                                                  │
│  【モニタリングレポート】                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Feature: annual_income                                     ││
│  │  Baseline mean: 450,000                                     ││
│  │  Current mean: 520,000                                      ││
│  │  Drift score: 0.35 (threshold: 0.2)                         ││
│  │                                                              ││
│  │  Feature: employment_years                                  ││
│  │  Baseline distribution: Normal                              ││
│  │  Current distribution: Bimodal                              ││
│  │  Drift score: 0.42 (threshold: 0.2)                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. ドリフトの原因を分析してください                             │
│  2. 対応方針（再学習 or モデル調整）を決定してください           │
│  3. 自動再学習トリガーの設計を検討してください                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 設計課題

### 設計課題9-1: Feature Store統合

```
┌─────────────────────────────────────────────────────────────────┐
│                      設計課題 9-1                                │
│                 Feature Store統合                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【課題】                                                        │
│  SageMaker Feature Storeを導入し、特徴量の                       │
│  管理と再利用を効率化してください。                              │
│                                                                  │
│  【要件】                                                        │
│  ・オンラインストア（推論時のリアルタイム取得）                  │
│  ・オフラインストア（学習時のバッチ取得）                        │
│  ・特徴量のバージョン管理とリネージュ                            │
│  ・複数モデル間での特徴量共有                                    │
│                                                                  │
│  【成果物】                                                      │
│  1. Feature Group設計                                            │
│  2. 特徴量取り込みパイプライン                                   │
│  3. Terraformテンプレート                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. 発展課題

### 発展課題10-1: マルチモデルA/Bテスト

```
┌─────────────────────────────────────────────────────────────────┐
│                      発展課題 10-1                               │
│               マルチモデルA/Bテスト                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【シナリオ】                                                    │
│  新しいアルゴリズム（LightGBM）のモデルを                        │
│  本番環境で段階的に検証したい。                                  │
│                                                                  │
│  【技術要件】                                                    │
│  ・トラフィックの10%を新モデルに振り分け                        │
│  ・リアルタイムの精度比較                                        │
│  ・統計的有意性の自動判定                                        │
│  ・勝者モデルへの自動切り替え                                    │
│                                                                  │
│  【成果物】                                                      │
│  1. A/Bテストアーキテクチャ                                      │
│  2. Production Variantの設定                                     │
│  3. 自動判定Lambdaの実装                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. 学習のまとめ

### 学習チェックリスト

```
┌─────────────────────────────────────────────────────────────────┐
│                     学習チェックリスト                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【SageMaker Pipelines】                                         │
│  □ パイプラインをPython SDKで定義できる                         │
│  □ 各種ステップ（Processing, Training等）を使い分けられる       │
│  □ 条件分岐とパラメータ化ができる                               │
│  □ パイプラインのデバッグができる                               │
│                                                                  │
│  【Model Registry】                                              │
│  □ Model Package Groupを作成できる                              │
│  □ モデルのバージョン管理ができる                               │
│  □ 承認ワークフローを設定できる                                 │
│  □ モデルメタデータを管理できる                                 │
│                                                                  │
│  【Model Monitor】                                               │
│  □ Data Quality監視を設定できる                                 │
│  □ Model Quality監視を設定できる                                │
│  □ ベースラインを作成できる                                     │
│  □ アラートを設定できる                                         │
│                                                                  │
│  【CI/CD】                                                       │
│  □ CodePipelineでMLパイプラインを統合できる                     │
│  □ 自動テスト戦略を設計できる                                   │
│  □ Blue/Greenデプロイを実装できる                               │
│  □ ロールバック戦略を設計できる                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. コスト見積もり

### 想定コスト（月額）

```
┌─────────────────────────────────────────────────────────────────┐
│                      コスト見積もり                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【開発環境】                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                    │ 数量            │ 月額（USD）    ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  SageMaker Pipelines     │ 10実行/月       │ $5             ││
│  │  Training Jobs           │ 20時間/月       │ $5             ││
│  │  Processing Jobs         │ 10時間/月       │ $2             ││
│  │  CodePipeline            │ 1パイプライン   │ $1             ││
│  │  CodeBuild               │ 100分/月        │ $0.50          ││
│  │  S3 Storage              │ 50GB            │ $1.15          ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $15         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【本番環境想定】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                    │ 数量            │ 月額（USD）    ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  Endpoint (ml.m5.large)  │ 2台 × 24h       │ $210           ││
│  │  Model Monitor           │ 720時間         │ $72            ││
│  │  SageMaker Pipelines     │ 8実行/月        │ $40            ││
│  │  Training Jobs (週次)    │ 16時間/月       │ $4             ││
│  │  CodePipeline            │ 1パイプライン   │ $1             ││
│  │  S3 Storage              │ 500GB           │ $11.50         ││
│  │  CloudWatch              │ ログ・メトリクス│ $20            ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $359        ││
│  │                          │                 │ (約 ¥54,000)   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## リソースのクリーンアップ

```bash
# Terraformリソース削除
cd ~/creditai-mlops/terraform
terraform destroy -auto-approve

# SageMakerリソースの手動削除（エンドポイント等）
aws sagemaker delete-endpoint --endpoint-name creditai-production-endpoint
aws sagemaker delete-endpoint-config --endpoint-config-name creditai-endpoint-config-dev

# S3バケット削除
aws s3 rb s3://creditai-ml-data-dev-${ACCOUNT_ID} --force
aws s3 rb s3://creditai-ml-artifacts-dev-${ACCOUNT_ID} --force

echo "Cleanup completed!"
```

---

**次の課題**: [課題38: MedConnect Cognito認証基盤](exercise-38.md)

**前の課題**: [課題36: SmartRetail SageMakerモデル基盤](exercise-36.md)
