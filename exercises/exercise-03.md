# 課題3: スタートアップの開発環境自動構築

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | IaC・DevOps |
| 処理形態 | 自動化・プロビジョニング |
| 使用するIaCツール | Terraform + GitHub Actions |
| 想定所要時間 | 4-5時間 |

---

## 2. シナリオ

### 企業プロフィール
**〇〇株式会社**は、B2B SaaSプロダクトを開発するスタートアップです。現在エンジニアは15名で、毎月2-3名のペースで採用を進めています。

### 現状の課題
新規エンジニアのオンボーディング時、開発環境の構築に多大な時間がかかっています：

1. **環境構築の属人化**：手順書はあるが、個人のローカル環境差異で動作しないことが多い
2. **AWS権限設定の煩雑さ**：IAMユーザー作成、ポリシー設定を手動で実施
3. **開発用AWSリソースの管理不全**：個人の検証環境が乱立し、コスト管理が困難
4. **セキュリティリスク**：認証情報の共有や、過剰な権限付与が発生

### 数値で見る問題
- 新規エンジニアの環境構築時間：平均 **30分**（目標：5分）
- 環境構築での質問対応：月 **20時間**（シニアエンジニアの工数）
- 未使用の検証リソース：月額 **$500** の無駄なコスト
- セキュリティインシデント（権限関連）：四半期 **3件**

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 環境構築時間 | 30分 | 5分以内 |
| 質問対応工数 | 20時間/月 | 5時間/月 |
| 無駄な検証リソースコスト | $500/月 | $100/月 |
| 権限関連インシデント | 3件/四半期 | 0件/四半期 |

---

## 3. 達成目標

### 主要な学習成果
1. Terraformによるマルチ環境インフラ管理の基礎を習得
2. GitHub Actionsを使ったインフラCI/CDパイプラインの構築
3. AWS IAM Identity Center（旧SSO）によるアクセス管理の理解
4. Terraform Stateの安全な管理方法の習得

### 習得するスキル
- Terraform modules による再利用可能なコード設計
- GitHub Actions workflow の作成と管理
- tfenv / terraform workspace の使い分け
- Pre-commit hooks による IaC コード品質管理
- OIDC を使った GitHub Actions ↔ AWS 認証

---

## 4. 学習するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| IAM Identity Center | エンジニアのAWSアクセス管理 | 高 |
| S3 | Terraform State 保存 | 高 |
| DynamoDB | Terraform State Lock | 高 |
| VPC | 開発環境ネットワーク | 高 |
| EC2 | 開発用踏み台サーバー | 中 |
| RDS | 開発用データベース | 中 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| CloudWatch | リソース監視・アラート |
| SNS | 通知配信 |
| Secrets Manager | 認証情報管理 |
| CloudTrail | 操作ログ記録 |

---

## 5. 最終構成図

### システム構成図
```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub                                    │
│  ┌─────────────┐    ┌─────────────────────────────────────┐    │
│  │  Terraform  │    │         GitHub Actions               │    │
│  │    Repo     │───▶│  ┌─────┐  ┌──────┐  ┌───────────┐  │    │
│  │             │    │  │Plan │─▶│Review│─▶│Apply/     │  │    │
│  └─────────────┘    │  └─────┘  └──────┘  │Destroy    │  │    │
│                     └─────────────────────┴─────┬─────┴───┘    │
└─────────────────────────────────────────────────┼───────────────┘
                                                  │ OIDC
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          AWS                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Management Account                      │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐   │  │
│  │  │ IAM Identity    │  │  S3 (Terraform State)       │   │  │
│  │  │ Center          │  │  DynamoDB (State Lock)      │   │  │
│  │  └────────┬────────┘  └─────────────────────────────┘   │  │
│  └───────────┼──────────────────────────────────────────────┘  │
│              │ Assume Role                                      │
│              ▼                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Development Account                           │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │                    VPC                                │ │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │ │  │
│  │  │  │ Public      │  │ Private     │  │ Private    │  │ │  │
│  │  │  │ Subnet      │  │ Subnet(App) │  │ Subnet(DB) │  │ │  │
│  │  │  │ ┌─────────┐ │  │             │  │ ┌────────┐ │  │ │  │
│  │  │  │ │Bastion  │ │  │             │  │ │  RDS   │ │  │ │  │
│  │  │  │ │ (EC2)   │ │  │             │  │ │        │ │  │ │  │
│  │  │  │ └─────────┘ │  │             │  │ └────────┘ │  │ │  │
│  │  │  └─────────────┘  └─────────────┘  └────────────┘  │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### データフロー
1. エンジニアがTerraformコードをGitHubにPush
2. GitHub ActionsでPRにterraform planの結果をコメント
3. レビュー後、mainマージでterraform applyを自動実行
4. 開発者はIAM Identity Center経由で各環境にアクセス

---

## 6. 前提条件

### 必要な知識
- AWSの基本的なサービス理解（VPC、EC2、IAM）
- Gitの基本操作（clone, commit, push, PR）
- 基本的なLinuxコマンド

### 事前準備
1. AWSアカウント（Organizations設定済みが望ましい）
2. GitHubアカウント
3. Terraform CLI（v1.5以上）のローカルインストール
4. AWS CLI v2 のインストールと設定

### 環境要件
- macOS / Linux / WSL2
- VS Code + Terraform 拡張機能推奨

---

## 6. アーキテクチャ概要

### システム構成図
```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub                                    │
│  ┌─────────────┐    ┌─────────────────────────────────────┐    │
│  │  Terraform  │    │         GitHub Actions               │    │
│  │    Repo     │───▶│  ┌─────┐  ┌──────┐  ┌───────────┐  │    │
│  │             │    │  │Plan │─▶│Review│─▶│Apply/     │  │    │
│  └─────────────┘    │  └─────┘  └──────┘  │Destroy    │  │    │
│                     └─────────────────────┴─────┬─────┴───┘    │
└─────────────────────────────────────────────────┼───────────────┘
                                                  │ OIDC
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          AWS                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Management Account                      │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐   │  │
│  │  │ IAM Identity    │  │  S3 (Terraform State)       │   │  │
│  │  │ Center          │  │  DynamoDB (State Lock)      │   │  │
│  │  └────────┬────────┘  └─────────────────────────────┘   │  │
│  └───────────┼──────────────────────────────────────────────┘  │
│              │ Assume Role                                      │
│              ▼                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Development Account                           │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │                    VPC                                │ │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │ │  │
│  │  │  │ Public      │  │ Private     │  │ Private    │  │ │  │
│  │  │  │ Subnet      │  │ Subnet(App) │  │ Subnet(DB) │  │ │  │
│  │  │  │ ┌─────────┐ │  │             │  │ ┌────────┐ │  │ │  │
│  │  │  │ │Bastion  │ │  │             │  │ │  RDS   │ │  │ │  │
│  │  │  │ │ (EC2)   │ │  │             │  │ │        │ │  │ │  │
│  │  │  │ └─────────┘ │  │             │  │ └────────┘ │  │ │  │
│  │  │  └─────────────┘  └─────────────┘  └────────────┘  │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### データフロー
1. エンジニアがTerraformコードをGitHubにPush
2. GitHub ActionsでPRにterraform planの結果をコメント
3. レビュー後、mainマージでterraform applyを自動実行
4. 開発者はIAM Identity Center経由で各環境にアクセス

---

## 7. ハンズオン手順

### Phase 1: Terraform Backend 環境の構築（40分）

#### Step 1-1: Stateファイル管理用リソースの作成

最初に、Terraform Stateを管理するためのS3バケットとDynamoDBテーブルを作成します。

```bash
# 作業ディレクトリ作成
mkdir -p devboost-infra/{bootstrap,modules,environments}
cd devboost-infra

# Bootstrap用ディレクトリ
cd bootstrap
```

```hcl
# bootstrap/main.tf
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
  region = "ap-northeast-1"

  default_tags {
    tags = {
      Project     = "DevBoost"
      Environment = "management"
      ManagedBy   = "terraform"
    }
  }
}

# アカウントID取得
data "aws_caller_identity" "current" {}

# リージョン取得
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
}

# Terraform State用S3バケット
resource "aws_s3_bucket" "terraform_state" {
  bucket = "devboost-terraform-state-${local.account_id}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# State Lock用DynamoDBテーブル
resource "aws_dynamodb_table" "terraform_lock" {
  name         = "devboost-terraform-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# 出力
output "state_bucket_name" {
  value       = aws_s3_bucket.terraform_state.id
  description = "Terraform State S3 Bucket Name"
}

output "lock_table_name" {
  value       = aws_dynamodb_table.terraform_lock.id
  description = "Terraform Lock DynamoDB Table Name"
}

output "account_id" {
  value       = local.account_id
  description = "AWS Account ID"
}
```

```bash
# 初期化と適用
terraform init
terraform plan
terraform apply
```

#### Step 1-2: GitHub Actions用OIDC Provider設定

```hcl
# bootstrap/github_oidc.tf

# GitHub OIDC Provider
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# GitHub Actions用IAMロール
resource "aws_iam_role" "github_actions" {
  name = "devboost-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # 自分のGitHubリポジトリに変更
            "token.actions.githubusercontent.com:sub" = "repo:YOUR_ORG/devboost-infra:*"
          }
        }
      }
    ]
  })
}

# Terraform実行に必要な権限
resource "aws_iam_role_policy" "github_actions_terraform" {
  name = "terraform-execution"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TerraformStateAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
      },
      {
        Sid    = "TerraformLockAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = aws_dynamodb_table.terraform_lock.arn
      },
      {
        Sid    = "TerraformResourceManagement"
        Effect = "Allow"
        Action = [
          "ec2:*",
          "rds:*",
          "iam:*",
          "s3:*",
          "dynamodb:*",
          "secretsmanager:*",
          "cloudwatch:*",
          "sns:*",
          "logs:*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = "ap-northeast-1"
          }
        }
      }
    ]
  })
}

output "github_actions_role_arn" {
  value       = aws_iam_role.github_actions.arn
  description = "GitHub Actions IAM Role ARN"
}
```

### Phase 2: Terraform Modules の作成（60分）

#### Step 2-1: VPCモジュール

```hcl
# modules/vpc/main.tf
variable "project_name" {
  type        = string
  description = "Project name for resource naming"
}

variable "environment" {
  type        = string
  description = "Environment name (dev/stg/prod)"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones"
  default     = ["ap-northeast-1a", "ap-northeast-1c"]
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  public_subnets = [
    for i, az in var.availability_zones :
    cidrsubnet(var.vpc_cidr, 8, i)
  ]

  private_app_subnets = [
    for i, az in var.availability_zones :
    cidrsubnet(var.vpc_cidr, 8, i + 10)
  ]

  private_db_subnets = [
    for i, az in var.availability_zones :
    cidrsubnet(var.vpc_cidr, 8, i + 20)
  ]
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnets[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-${var.availability_zones[count.index]}"
    Type = "public"
  }
}

# Private App Subnets
resource "aws_subnet" "private_app" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_app_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${local.name_prefix}-private-app-${var.availability_zones[count.index]}"
    Type = "private-app"
  }
}

# Private DB Subnets
resource "aws_subnet" "private_db" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_db_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${local.name_prefix}-private-db-${var.availability_zones[count.index]}"
    Type = "private-db"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  count  = length(var.availability_zones)
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-nat-eip-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateway
resource "aws_nat_gateway" "main" {
  count = length(var.availability_zones)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${local.name_prefix}-nat-${var.availability_zones[count.index]}"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "${local.name_prefix}-private-rt-${var.availability_zones[count.index]}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count = length(var.availability_zones)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_app" {
  count = length(var.availability_zones)

  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_route_table_association" "private_db" {
  count = length(var.availability_zones)

  subnet_id      = aws_subnet.private_db[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Outputs
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_app_subnet_ids" {
  value = aws_subnet.private_app[*].id
}

output "private_db_subnet_ids" {
  value = aws_subnet.private_db[*].id
}

output "vpc_cidr" {
  value = aws_vpc.main.cidr_block
}
```

#### Step 2-2: Bastionモジュール

```hcl
# modules/bastion/main.tf
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed for SSH access"
  default     = []
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# 最新のAmazon Linux 2023 AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group
resource "aws_security_group" "bastion" {
  name        = "${local.name_prefix}-bastion-sg"
  description = "Security group for bastion host"
  vpc_id      = var.vpc_id

  # Session Manager経由のアクセスのみ許可（SSHポート不要）
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-bastion-sg"
  }
}

# IAM Role for SSM
resource "aws_iam_role" "bastion" {
  name = "${local.name_prefix}-bastion-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "bastion_ssm" {
  role       = aws_iam_role.bastion.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "bastion" {
  name = "${local.name_prefix}-bastion-profile"
  role = aws_iam_role.bastion.name
}

# EC2 Instance
resource "aws_instance" "bastion" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.bastion.id]
  iam_instance_profile   = aws_iam_instance_profile.bastion.name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  metadata_options {
    http_tokens                 = "required" # IMDSv2を強制
    http_put_response_hop_limit = 1
  }

  user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y postgresql15 mysql
  EOF

  tags = {
    Name = "${local.name_prefix}-bastion"
  }
}

output "instance_id" {
  value = aws_instance.bastion.id
}

output "security_group_id" {
  value = aws_security_group.bastion.id
}
```

#### Step 2-3: RDSモジュール

```hcl
# modules/rds/main.tf
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "allowed_security_group_ids" {
  type = list(string)
}

variable "engine" {
  type    = string
  default = "postgres"
}

variable "engine_version" {
  type    = string
  default = "15.4"
}

variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "database_name" {
  type    = string
  default = "devboost"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${local.name_prefix}-db-subnet-group"
  }
}

# Security Group
resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "Security group for RDS"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.allowed_security_group_ids
    content {
      from_port       = 5432
      to_port         = 5432
      protocol        = "tcp"
      security_groups = [ingress.value]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-rds-sg"
  }
}

# Secrets Manager for DB credentials
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${local.name_prefix}-db-credentials"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "dbadmin"
    password = random_password.db_password.result
    engine   = var.engine
    host     = aws_db_instance.main.endpoint
    port     = 5432
    dbname   = var.database_name
  })
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-db"

  engine               = var.engine
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  max_allocated_storage = var.allocated_storage * 2

  db_name  = var.database_name
  username = "dbadmin"
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  storage_encrypted = true
  multi_az          = var.environment == "prod" ? true : false

  backup_retention_period = var.environment == "prod" ? 7 : 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${local.name_prefix}-final-snapshot" : null
  deletion_protection       = var.environment == "prod"

  performance_insights_enabled = var.environment == "prod"

  tags = {
    Name = "${local.name_prefix}-db"
  }
}

output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "secret_arn" {
  value = aws_secretsmanager_secret.db_credentials.arn
}

output "security_group_id" {
  value = aws_security_group.rds.id
}
```

### Phase 3: 環境構築（60分）

#### Step 3-1: 開発環境の定義

```hcl
# environments/dev/main.tf
terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "devboost-terraform-state-ACCOUNT_ID" # 自分のアカウントIDに変更
    key            = "environments/dev/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "devboost-terraform-lock"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"

  default_tags {
    tags = {
      Project     = "DevBoost"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  project_name = "devboost"
  environment  = "dev"
}

# VPC
module "vpc" {
  source = "../../modules/vpc"

  project_name = local.project_name
  environment  = local.environment
  vpc_cidr     = "10.0.0.0/16"
}

# Bastion
module "bastion" {
  source = "../../modules/bastion"

  project_name = local.project_name
  environment  = local.environment
  vpc_id       = module.vpc.vpc_id
  subnet_id    = module.vpc.public_subnet_ids[0]
}

# RDS
module "rds" {
  source = "../../modules/rds"

  project_name               = local.project_name
  environment                = local.environment
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.private_db_subnet_ids
  allowed_security_group_ids = [module.bastion.security_group_id]
  instance_class             = "db.t3.micro"
}

# Outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "bastion_instance_id" {
  value = module.bastion.instance_id
}

output "rds_endpoint" {
  value     = module.rds.endpoint
  sensitive = true
}

output "db_secret_arn" {
  value = module.rds.secret_arn
}
```

### Phase 4: GitHub Actions CI/CD構築（60分）

#### Step 4-1: Workflow定義

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  push:
    branches:
      - main
    paths:
      - 'environments/**'
      - 'modules/**'
  pull_request:
    branches:
      - main
    paths:
      - 'environments/**'
      - 'modules/**'

permissions:
  id-token: write
  contents: read
  pull-requests: write

env:
  TF_VERSION: "1.5.7"
  AWS_REGION: "ap-northeast-1"

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      environments: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4

      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            dev:
              - 'environments/dev/**'
              - 'modules/**'
            stg:
              - 'environments/stg/**'
              - 'modules/**'
            prod:
              - 'environments/prod/**'
              - 'modules/**'

  terraform-plan:
    needs: detect-changes
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: ${{ fromJson(needs.detect-changes.outputs.environments) }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Terraform Format Check
        id: fmt
        run: terraform fmt -check -recursive
        continue-on-error: true

      - name: Terraform Init
        id: init
        working-directory: environments/${{ matrix.environment }}
        run: terraform init

      - name: Terraform Validate
        id: validate
        working-directory: environments/${{ matrix.environment }}
        run: terraform validate -no-color

      - name: Terraform Plan
        id: plan
        working-directory: environments/${{ matrix.environment }}
        run: terraform plan -no-color -out=tfplan
        continue-on-error: true

      - name: Generate Plan Summary
        id: plan-summary
        working-directory: environments/${{ matrix.environment }}
        run: |
          terraform show -no-color tfplan > plan.txt
          echo "## Terraform Plan - ${{ matrix.environment }}" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          cat plan.txt >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('environments/${{ matrix.environment }}/plan.txt', 'utf8');
            const output = `## Terraform Plan - \`${{ matrix.environment }}\`

            #### Format Check 🖌 \`${{ steps.fmt.outcome }}\`
            #### Initialization ⚙️ \`${{ steps.init.outcome }}\`
            #### Validation 🤖 \`${{ steps.validate.outcome }}\`
            #### Plan 📖 \`${{ steps.plan.outcome }}\`

            <details><summary>Show Plan</summary>

            \`\`\`terraform
            ${plan.substring(0, 60000)}
            \`\`\`

            </details>

            *Pushed by: @${{ github.actor }}, Action: \`${{ github.event_name }}\`*`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

  terraform-apply:
    needs: detect-changes
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: ${{ fromJson(needs.detect-changes.outputs.environments) }}
      max-parallel: 1
    environment: ${{ matrix.environment }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Terraform Init
        working-directory: environments/${{ matrix.environment }}
        run: terraform init

      - name: Terraform Apply
        working-directory: environments/${{ matrix.environment }}
        run: terraform apply -auto-approve
```

#### Step 4-2: Pre-commit設定

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.5
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_tflint
        args:
          - --args=--config=__GIT_WORKING_DIR__/.tflint.hcl
      - id: terraform_docs
        args:
          - --args=--config=.terraform-docs.yml
      - id: terraform_checkov
        args:
          - --args=--quiet
          - --args=--skip-check CKV_AWS_144  # S3 cross-region replication

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
```

```hcl
# .tflint.hcl
config {
  module = true
}

plugin "aws" {
  enabled = true
  version = "0.27.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

rule "terraform_naming_convention" {
  enabled = true
}

rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}
```

### Phase 5: 新規エンジニア向けセットアップ（40分）

#### Step 5-1: セットアップスクリプト

```bash
#!/bin/bash
# scripts/setup-dev-env.sh

set -e

echo "=== DevBoost 開発環境セットアップ ==="

# 色付け
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 がインストールされています"
        return 0
    else
        echo -e "${RED}✗${NC} $1 がインストールされていません"
        return 1
    fi
}

# 1. 前提ツールのチェック
echo ""
echo "1. 前提ツールのチェック..."
MISSING_TOOLS=()

check_command "aws" || MISSING_TOOLS+=("aws-cli")
check_command "terraform" || MISSING_TOOLS+=("terraform")
check_command "git" || MISSING_TOOLS+=("git")

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    echo ""
    echo "以下のツールをインストールしてください:"
    for tool in "${MISSING_TOOLS[@]}"; do
        echo "  - $tool"
    done
    exit 1
fi

# 2. AWS認証確認
echo ""
echo "2. AWS認証の確認..."
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✓${NC} AWS認証済み (Account: $ACCOUNT_ID)"
else
    echo -e "${RED}✗${NC} AWS認証が必要です"
    echo "aws sso login --profile devboost-dev を実行してください"
    exit 1
fi

# 3. Terraformバージョン確認
echo ""
echo "3. Terraformバージョンの確認..."
TF_VERSION=$(terraform version -json | jq -r '.terraform_version')
REQUIRED_VERSION="1.5.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$TF_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo -e "${GREEN}✓${NC} Terraform $TF_VERSION (>= $REQUIRED_VERSION)"
else
    echo -e "${RED}✗${NC} Terraform $REQUIRED_VERSION 以上が必要です (現在: $TF_VERSION)"
    exit 1
fi

# 4. Pre-commit hookのセットアップ
echo ""
echo "4. Pre-commit hookのセットアップ..."
if command -v pre-commit &> /dev/null; then
    pre-commit install
    echo -e "${GREEN}✓${NC} Pre-commit hookをインストールしました"
else
    echo "pre-commit がインストールされていません"
    echo "pip install pre-commit を実行してからもう一度試してください"
fi

# 5. Session Managerプラグインの確認
echo ""
echo "5. Session Manager プラグインの確認..."
if command -v session-manager-plugin &> /dev/null; then
    echo -e "${GREEN}✓${NC} Session Manager plugin がインストールされています"
else
    echo -e "${RED}✗${NC} Session Manager plugin がインストールされていません"
    echo "https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
fi

# 6. Bastion接続テスト
echo ""
echo "6. Bastion接続テスト..."
BASTION_INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=devboost-dev-bastion" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text 2>/dev/null)

if [ "$BASTION_INSTANCE_ID" != "None" ] && [ -n "$BASTION_INSTANCE_ID" ]; then
    echo -e "${GREEN}✓${NC} Bastion (Instance ID: $BASTION_INSTANCE_ID)"
    echo "  接続コマンド: aws ssm start-session --target $BASTION_INSTANCE_ID"
else
    echo "Bastion インスタンスが見つからないか、停止中です"
fi

echo ""
echo "=== セットアップ完了 ==="
echo ""
echo "次のステップ:"
echo "1. cd environments/dev && terraform init"
echo "2. terraform plan で変更を確認"
echo "3. PRを作成してレビューを依頼"
```

---

## 8. トラブルシューティング課題

### Challenge 1: State Lock問題
**状況**: terraform applyを実行中に別のエンジニアが同じ環境でapplyを実行しようとしてエラーが発生

```
Error: Error acquiring the state lock
Lock Info:
  ID:        xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  Path:      devboost-terraform-state-XXXXX/environments/dev/terraform.tfstate
  Operation: OperationTypeApply
  Who:       user@ip-xxx-xxx-xxx-xxx
  Created:   2024-01-15 10:30:00.000000000 +0000 UTC
```

**調査ポイント**:
1. DynamoDBのLockテーブルを確認
2. 実行中のGitHub Actionsを確認
3. 必要に応じて強制解除

**解決手順の例**:
```bash
# 注意: 他のapplyが本当に実行されていないことを確認してから実行
terraform force-unlock LOCK_ID
```

### Challenge 2: OIDC認証エラー
**状況**: GitHub Actionsでterraform planが失敗

```
Error: Could not assume role with OIDC:
Not authorized to perform sts:AssumeRoleWithWebIdentity
```

**調査ポイント**:
1. IAMロールの信頼ポリシーを確認
2. GitHubリポジトリ名が正しいか確認
3. OIDCプロバイダーの設定を確認

### Challenge 3: モジュール変更の影響範囲
**状況**: VPCモジュールを変更したら、予期せず複数の環境に影響が出た

**調査ポイント**:
1. terraform planで全環境の変更を確認
2. モジュールのバージョニング戦略を検討
3. 破壊的変更のハンドリング方法

---

## 9. 設計考慮ポイント

### ディスカッション1: State管理戦略
**テーマ**: 単一State vs 環境別State vs サービス別State

| 戦略 | メリット | デメリット |
|------|----------|------------|
| 単一State | シンプル、依存関係の管理が容易 | スケールしにくい、ロック競合 |
| 環境別State | 環境の独立性、並列実行可能 | 環境間の依存管理が複雑 |
| サービス別State | マイクロサービス向け、チーム独立 | 依存関係の管理が複雑 |

**考慮すべき点**:
- チーム規模と成長見込み
- 環境間の依存関係
- デプロイ頻度

### ディスカッション2: モジュールバージョニング
**テーマ**: モジュールの変更をどう管理するか

**選択肢**:
1. Git tags でバージョニング
2. Terraform Registry（private）の活用
3. monorepo での相対パス参照

### ディスカッション3: 秘密情報の管理
**テーマ**: データベースパスワード等の管理方法

**選択肢と比較**:
| 方法 | セキュリティ | 運用負荷 | コスト |
|------|-------------|---------|--------|
| Secrets Manager | 高 | 低 | $0.40/secret/month |
| SSM Parameter Store | 中 | 低 | 無料（Standard） |
| HashiCorp Vault | 最高 | 高 | 要インフラ |

---

## 10. 発展課題

### Advanced 1: Terraform Cloud/Enterprise移行
**課題**: 現在のS3バックエンドをTerraform Cloudに移行し、以下を実現
- チーム向けのState管理UI
- Cost Estimation機能
- Policy as Code (Sentinel)

### Advanced 2: Atlantis導入
**課題**: GitHub Actionsの代わりにAtlantisを導入
- PRコメントでのterraform plan/apply
- 承認フローの実装
- ロック管理の可視化

### Advanced 3: 複数AWSアカウント対応
**課題**: AWS Organizationsを使った本格的なマルチアカウント構成
- Control Tower の活用
- Account Factory for Terraform (AFT)
- 共有サービスVPCの設計

---

## 11. コスト見積もり

### 月額コスト概算（開発環境1つの場合）

| サービス | リソース | 月額コスト |
|----------|----------|------------|
| EC2 (Bastion) | t3.micro × 1 | $7.59 |
| RDS | db.t3.micro (Single-AZ) | $12.41 |
| NAT Gateway | 2 AZ | $64.80 |
| S3 | State保存 | $0.50 |
| DynamoDB | Lock用（オンデマンド） | $0.10 |
| Secrets Manager | 1 シークレット | $0.40 |

**合計**: 約 **$86/月**（約13,000円）

### コスト削減のヒント

1. **NAT Gateway削減**: 開発環境では1 AZのみにする
   - 削減額: $32.40/月

2. **Bastion停止スケジュール**: 夜間・休日は自動停止
   - 削減額: 約$5/月

3. **RDS停止**: 未使用時の自動停止
   ```hcl
   # 開発環境のみ
   resource "aws_rds_event_subscription" "auto_stop" {
     # 実装は発展課題
   }
   ```

---

## 12. 学習のポイント

### 重要な概念の整理

1. **Terraform State**
   - リソースの現在の状態を追跡
   - チームでの共有にはリモートバックエンド必須
   - Lockによる同時実行制御

2. **GitHub Actions OIDC**
   - 長期的な認証情報を保存しない
   - 一時的な認証トークンを使用
   - リポジトリ単位でのアクセス制御

3. **モジュール設計**
   - 再利用性を考慮した入出力設計
   - 環境差異は変数で吸収
   - デフォルト値の活用

### GCPとの比較

| 概念 | AWS | GCP |
|------|-----|-----|
| IaC State保存 | S3 + DynamoDB | GCS |
| CI/CD | GitHub Actions | Cloud Build |
| シークレット管理 | Secrets Manager | Secret Manager |
| SSO | IAM Identity Center | Cloud Identity |
| 踏み台アクセス | SSM Session Manager | IAP Tunnel |

### 次のステップ
1. 複数環境（stg/prod）の追加
2. アプリケーションデプロイパイプラインの構築
3. モニタリング・アラートの設定
4. コスト管理の自動化
