# 課題8: スタートアップのAWS基盤設計（Organizations + Landing Zone）

**難易度: 🟢 初級〜中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| **カテゴリ** | マルチアカウント戦略・ガバナンス |
| **難易度** | 初級〜中級（Beginner to Intermediate） |
| **所要時間** | 5-6時間 |
| **使用IaC** | Terraform |
| **前提スキル** | AWS基礎、Terraform基礎 |
| **関連AWS認定** | Solutions Architect Associate、DevOps Engineer |

---

## 2. ビジネスシナリオ

### 企業プロファイル
- **企業名**: DevBoost株式会社
- **業種**: SaaSスタートアップ（開発者向け生産性ツール）
- **規模**: 従業員15名（今後1年で50名予定）、エンジニア8名
- **フェーズ**: シリーズA調達完了、急成長期
- **現状インフラ**: 単一AWSアカウントで全環境を運用

### 現状の課題
DevBoost株式会社は、単一のAWSアカウントで本番・開発・検証環境を運用しています。
急成長に伴い、以下の問題が深刻化しています：

```
現状の問題点:
┌─────────────────────────────────────────────────────────────────┐
│                   現行システム構成（単一アカウント）             │
├─────────────────────────────────────────────────────────────────┤
│ 1. セキュリティリスク                                           │
│    - 本番環境に全員がアクセス可能                               │
│    - IAMポリシーが複雑化、管理不能                              │
│    - 機密データへのアクセス制御が不十分                          │
│                                                                  │
│ 2. コスト管理の困難                                             │
│    - 環境別・チーム別のコストが把握できない                      │
│    - 開発者が本番リソースを誤って変更                            │
│    - リソースの野放し状態                                       │
│                                                                  │
│ 3. 運用効率の低下                                               │
│    - 新環境構築に30分以上                                       │
│    - 設定ミスによるインシデント頻発                              │
│    - チーム間の依存関係で開発停滞                                │
│                                                                  │
│ 4. コンプライアンス不備                                         │
│    - 監査証跡が整備されていない                                  │
│    - セキュリティ基準の統一管理ができない                        │
│    - 顧客からのSOC2要求に対応困難                               │
└─────────────────────────────────────────────────────────────────┘
```

### ビジネス要件
```
機能要件:
- マルチアカウント環境の構築（本番/ステージング/開発/共有）
- セキュリティベースラインの自動適用
- 新アカウント作成の自動化（5分以内）
- 統合ログ・監査基盤

非機能要件:
- 環境構築時間：30分 → 5分
- セキュリティインシデント：0件/月
- コンプライアンススコア：95%以上
- 運用工数：週10時間 → 週2時間
```

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 新環境構築時間 | 30分 | 5分 |
| セキュリティインシデント | 月2-3件 | 0件 |
| コスト可視性 | 0%（不明） | 100% |
| IAMポリシー数 | 150+ | 20以下 |
| コンプライアンススコア | 40% | 95% |

---

## 3. 学習目標

### 本課題で習得するスキル

```
1. AWS Organizations（理解度：詳細）
   - OU（組織単位）設計
   - SCP（サービスコントロールポリシー）
   - 一括請求とコスト配分

2. Landing Zone設計（理解度：実装）
   - Control Tower の概念理解
   - Account Factory パターン
   - ベースラインセキュリティ

3. Terraform によるIaC（理解度：実装）
   - マルチアカウントプロビジョニング
   - モジュール設計
   - State管理（S3 + DynamoDB）

4. セキュリティガバナンス（理解度：基礎）
   - GuardDuty / Security Hub 統合
   - CloudTrail 組織トレイル
   - Config 集約
```

### GCPエンジニア向け補足
```
GCP → AWS マッピング:
- Resource Manager → AWS Organizations
- Folders → Organizational Units (OU)
- Organization Policies → Service Control Policies (SCP)
- Cloud Identity → IAM Identity Center
- Security Command Center → Security Hub

主な違い:
1. AWS Organizations: アカウント単位での分離が基本
   （GCPはプロジェクト単位）

2. SCP: 明示的な許可ではなく、最大権限の境界を設定
   （Organization Policies に近いが、IAMとの組み合わせが必要）

3. Landing Zone: AWS独自の概念
   （GCPではCloud Foundation Toolkitが近い）
```

---

## 4. 使用するAWSサービス

### メインサービス
| サービス | 役割 | 使用機能 |
|----------|------|----------|
| **AWS Organizations** | アカウント管理 | OU、SCP、一括請求 |
| **AWS IAM Identity Center** | ID管理 | SSO、権限セット |
| **AWS CloudTrail** | 監査ログ | 組織トレイル |
| **AWS Config** | 構成管理 | アグリゲーター |

### サポートサービス
| サービス | 用途 |
|----------|------|
| **Amazon S3** | Terraform State、ログ保存 |
| **Amazon DynamoDB** | Terraform State Lock |
| **AWS Security Hub** | セキュリティ統合 |
| **Amazon GuardDuty** | 脅威検知 |
| **AWS Budgets** | コスト管理 |
| **Amazon SNS** | 通知 |

### アーキテクチャ図
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              DevBoost AWS Organizations                                  │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         Management Account (Root)                                │   │
│  │                                                                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │   │
│  │  │  Organizations  │  │  IAM Identity   │  │   Billing &     │                  │   │
│  │  │  Management     │  │    Center       │  │   Cost Mgmt     │                  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │   │
│  │                                                                                   │   │
│  │  SCP: DenyRootUser, RequireIMDSv2, DenyLeaveOrg                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                              │
│                    ┌─────────────────────┼─────────────────────┐                       │
│                    │                     │                     │                       │
│                    ▼                     ▼                     ▼                       │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │   Security OU       │  │   Infrastructure OU │  │   Workloads OU      │           │
│  │                     │  │                     │  │                     │           │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │           │
│  │  │    Log        │  │  │  │   Network     │  │  │  │  Production   │  │           │
│  │  │   Account     │  │  │  │   Account     │  │  │  │   OU          │  │           │
│  │  │               │  │  │  │               │  │  │  │ ┌───────────┐ │  │           │
│  │  │ - CloudTrail  │  │  │  │ - Transit GW  │  │  │  │ │Production │ │  │           │
│  │  │ - Config Agg  │  │  │  │ - VPN/DX      │  │  │  │ │ Account   │ │  │           │
│  │  │ - S3 Logs     │  │  │  │ - DNS (R53)   │  │  │  │ └───────────┘ │  │           │
│  │  └───────────────┘  │  │  └───────────────┘  │  │  │               │  │           │
│  │                     │  │                     │  │  │  ┌───────────┐ │  │           │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │  │ │ Staging   │ │  │           │
│  │  │   Security    │  │  │  │   Shared      │  │  │  │ │ Account   │ │  │           │
│  │  │   Account     │  │  │  │   Services    │  │  │  │ └───────────┘ │  │           │
│  │  │               │  │  │  │               │  │  │  └───────────────┘  │           │
│  │  │ - GuardDuty   │  │  │  │ - ECR         │  │  │                     │           │
│  │  │ - Sec Hub     │  │  │  │ - CI/CD       │  │  │  ┌───────────────┐  │           │
│  │  │ - Detective   │  │  │  │ - Artifacts   │  │  │  │  Development  │  │           │
│  │  └───────────────┘  │  │  └───────────────┘  │  │  │   OU          │  │           │
│  │                     │  │                     │  │  │ ┌───────────┐ │  │           │
│  │  SCP: Restrict      │  │  SCP: Network      │  │  │ │   Dev     │ │  │           │
│  │       Regions       │  │       Admin Only   │  │  │ │ Account   │ │  │           │
│  └─────────────────────┘  └─────────────────────┘  │  │ └───────────┘ │  │           │
│                                                    │  │               │  │           │
│                                                    │  │ SCP: Budget   │  │           │
│                                                    │  │      Limit    │  │           │
│                                                    │  └───────────────┘  │           │
│                                                    │                     │           │
│                                                    │  ┌───────────────┐  │           │
│                                                    │  │   Sandbox OU  │  │           │
│                                                    │  │ ┌───────────┐ │  │           │
│                                                    │  │ │ Sandbox   │ │  │           │
│                                                    │  │ │ Account   │ │  │           │
│                                                    │  │ └───────────┘ │  │           │
│                                                    │  │               │  │           │
│                                                    │  │ SCP: Strict   │  │           │
│                                                    │  │      Budget   │  │           │
│                                                    │  └───────────────┘  │           │
│                                                    └─────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 前提条件と事前準備

### 必要な環境
```bash
# Terraform
terraform --version  # 1.5以上

# AWS CLI v2
aws --version  # 2.x以上

# Git
git --version

# jq（JSON処理）
jq --version
```

### AWSアカウント要件
```
- AWS Organizations が有効化可能なアカウント
- 管理者権限を持つIAMユーザーまたはロール
- 請求情報へのアクセス権限
- 新規アカウント作成権限
```

### 事前準備スクリプト
```bash
#!/bin/bash
# setup-landing-zone.sh

# 変数設定
PROJECT_NAME="devboost"
REGION="ap-northeast-1"

# ディレクトリ構造の作成
mkdir -p ${PROJECT_NAME}-landing-zone/{modules,environments,policies}
cd ${PROJECT_NAME}-landing-zone

# ディレクトリ構造
cat << 'EOF'
devboost-landing-zone/
├── main.tf
├── variables.tf
├── outputs.tf
├── providers.tf
├── backend.tf
├── modules/
│   ├── organization/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── account/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── scp/
│   │   ├── main.tf
│   │   └── policies/
│   │       ├── deny-root.json
│   │       ├── require-imdsv2.json
│   │       └── region-restriction.json
│   ├── security-baseline/
│   │   ├── main.tf
│   │   ├── guardduty.tf
│   │   ├── securityhub.tf
│   │   └── config.tf
│   └── logging/
│       ├── main.tf
│       ├── cloudtrail.tf
│       └── s3.tf
├── environments/
│   ├── production/
│   ├── staging/
│   └── development/
└── policies/
    └── scp/
EOF

# AWS Organizations の状態確認
echo "=== Checking AWS Organizations Status ==="
aws organizations describe-organization 2>/dev/null || echo "Organizations not enabled yet"

# 現在の認証情報確認
echo "=== Current AWS Identity ==="
aws sts get-caller-identity
```

---

## 6. アーキテクチャ設計

### OU（組織単位）設計
```yaml
# ou-design.yaml
organizational_units:
  root:
    name: "Root"
    scps:
      - DenyLeaveOrganization
      - RequireIMDSv2

  security:
    name: "Security"
    purpose: "セキュリティ・監査機能の集約"
    scps:
      - DenyAllExceptSecurityServices
    accounts:
      - name: "log-archive"
        email: "aws-log@devboost.example.com"
        purpose: "CloudTrail, Config, VPCフローログの集約"
      - name: "security-tooling"
        email: "aws-security@devboost.example.com"
        purpose: "GuardDuty, Security Hub, Detective"

  infrastructure:
    name: "Infrastructure"
    purpose: "共有インフラストラクチャ"
    scps:
      - NetworkAdminOnly
    accounts:
      - name: "network"
        email: "aws-network@devboost.example.com"
        purpose: "Transit Gateway, VPN, Direct Connect"
      - name: "shared-services"
        email: "aws-shared@devboost.example.com"
        purpose: "ECR, CI/CD, 共有ツール"

  workloads:
    name: "Workloads"
    children:
      production:
        name: "Production"
        scps:
          - DenyDestructiveActions
          - RequireTagging
        accounts:
          - name: "production"
            email: "aws-prod@devboost.example.com"

      non_production:
        name: "Non-Production"
        scps:
          - BudgetLimit
        accounts:
          - name: "staging"
            email: "aws-staging@devboost.example.com"
          - name: "development"
            email: "aws-dev@devboost.example.com"

      sandbox:
        name: "Sandbox"
        scps:
          - StrictBudgetLimit
          - LimitedServices
        accounts:
          - name: "sandbox"
            email: "aws-sandbox@devboost.example.com"
```

### SCP設計
```yaml
# scp-design.yaml
service_control_policies:
  # 全組織に適用
  DenyLeaveOrganization:
    description: "組織からの離脱を禁止"
    effect: "DENY"
    actions:
      - "organizations:LeaveOrganization"

  RequireIMDSv2:
    description: "EC2でIMDSv2を必須化"
    effect: "DENY"
    actions:
      - "ec2:RunInstances"
    conditions:
      StringNotEquals:
        "ec2:MetadataHttpTokens": "required"

  # 本番環境用
  DenyDestructiveActions:
    description: "破壊的操作の禁止"
    effect: "DENY"
    actions:
      - "ec2:TerminateInstances"
      - "rds:DeleteDBInstance"
      - "s3:DeleteBucket"
    conditions:
      StringNotLike:
        "aws:PrincipalArn": "arn:aws:iam::*:role/Admin*"

  # 開発環境用
  BudgetLimit:
    description: "高額サービスの制限"
    effect: "DENY"
    actions:
      - "ec2:RunInstances"
    conditions:
      ForAnyValue:StringLike:
        "ec2:InstanceType":
          - "*.metal"
          - "*.24xlarge"
          - "*.16xlarge"
          - "p*.*"
          - "g*.*"

  # リージョン制限
  RegionRestriction:
    description: "許可リージョンの制限"
    effect: "DENY"
    not_actions:
      - "iam:*"
      - "organizations:*"
      - "support:*"
      - "budgets:*"
    conditions:
      StringNotEquals:
        "aws:RequestedRegion":
          - "ap-northeast-1"
          - "us-east-1"  # グローバルサービス用
```

---

## 7. ハンズオン手順

### Step 1: Terraform State バックエンド構築

```hcl
# backend-setup/main.tf
# State 管理用の S3 バケットと DynamoDB テーブルを作成

provider "aws" {
  region = "ap-northeast-1"
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "devboost-terraform-state-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "Terraform State"
    Environment = "management"
    ManagedBy   = "terraform"
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
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.terraform_state.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "devboost-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "Terraform State Lock"
    Environment = "management"
    ManagedBy   = "terraform"
  }
}

resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "terraform-state-key"
  }
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}

data "aws_caller_identity" "current" {}

output "state_bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.terraform_locks.name
}
```

### Step 2: Organizations モジュール

```hcl
# modules/organization/main.tf

# AWS Organizations の有効化
resource "aws_organizations_organization" "org" {
  aws_service_access_principals = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
    "guardduty.amazonaws.com",
    "securityhub.amazonaws.com",
    "sso.amazonaws.com",
    "tagpolicies.tag.amazonaws.com",
    "config-multiaccountsetup.amazonaws.com",
  ]

  feature_set = "ALL"

  enabled_policy_types = [
    "SERVICE_CONTROL_POLICY",
    "TAG_POLICY",
  ]
}

# OU の作成
resource "aws_organizations_organizational_unit" "security" {
  name      = "Security"
  parent_id = aws_organizations_organization.org.roots[0].id
}

resource "aws_organizations_organizational_unit" "infrastructure" {
  name      = "Infrastructure"
  parent_id = aws_organizations_organization.org.roots[0].id
}

resource "aws_organizations_organizational_unit" "workloads" {
  name      = "Workloads"
  parent_id = aws_organizations_organization.org.roots[0].id
}

resource "aws_organizations_organizational_unit" "production" {
  name      = "Production"
  parent_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_organizational_unit" "non_production" {
  name      = "Non-Production"
  parent_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_organizational_unit" "sandbox" {
  name      = "Sandbox"
  parent_id = aws_organizations_organizational_unit.workloads.id
}
```

```hcl
# modules/organization/variables.tf

variable "organization_name" {
  description = "Organization name prefix"
  type        = string
  default     = "devboost"
}

variable "aws_service_access_principals" {
  description = "AWS service principals to enable"
  type        = list(string)
  default = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
    "guardduty.amazonaws.com",
    "securityhub.amazonaws.com",
    "sso.amazonaws.com",
  ]
}
```

```hcl
# modules/organization/outputs.tf

output "organization_id" {
  value = aws_organizations_organization.org.id
}

output "organization_root_id" {
  value = aws_organizations_organization.org.roots[0].id
}

output "security_ou_id" {
  value = aws_organizations_organizational_unit.security.id
}

output "infrastructure_ou_id" {
  value = aws_organizations_organizational_unit.infrastructure.id
}

output "workloads_ou_id" {
  value = aws_organizations_organizational_unit.workloads.id
}

output "production_ou_id" {
  value = aws_organizations_organizational_unit.production.id
}

output "non_production_ou_id" {
  value = aws_organizations_organizational_unit.non_production.id
}

output "sandbox_ou_id" {
  value = aws_organizations_organizational_unit.sandbox.id
}
```

### Step 3: アカウント作成モジュール

```hcl
# modules/account/main.tf

resource "aws_organizations_account" "account" {
  name                       = var.account_name
  email                      = var.account_email
  role_name                  = var.admin_role_name
  parent_id                  = var.parent_ou_id
  iam_user_access_to_billing = var.billing_access ? "ALLOW" : "DENY"

  tags = merge(
    {
      Name        = var.account_name
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags
  )

  lifecycle {
    ignore_changes = [role_name]
  }
}

# アカウント作成後のベースライン設定
resource "null_resource" "account_baseline" {
  depends_on = [aws_organizations_account.account]

  provisioner "local-exec" {
    command = <<-EOT
      echo "Account ${var.account_name} created with ID: ${aws_organizations_account.account.id}"
      echo "Waiting for account to be ready..."
      sleep 60
    EOT
  }
}

# IAM Identity Center での権限セット割り当て（オプション）
resource "aws_ssoadmin_account_assignment" "admin" {
  count = var.assign_admin_permission_set ? 1 : 0

  instance_arn       = var.sso_instance_arn
  permission_set_arn = var.admin_permission_set_arn

  principal_id   = var.admin_group_id
  principal_type = "GROUP"

  target_id   = aws_organizations_account.account.id
  target_type = "AWS_ACCOUNT"
}
```

```hcl
# modules/account/variables.tf

variable "account_name" {
  description = "Name of the AWS account"
  type        = string
}

variable "account_email" {
  description = "Email for the AWS account"
  type        = string
}

variable "parent_ou_id" {
  description = "Parent OU ID"
  type        = string
}

variable "admin_role_name" {
  description = "Admin role name for cross-account access"
  type        = string
  default     = "OrganizationAccountAccessRole"
}

variable "environment" {
  description = "Environment tag"
  type        = string
}

variable "billing_access" {
  description = "Allow IAM users to access billing"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}

variable "assign_admin_permission_set" {
  description = "Assign admin permission set via IAM Identity Center"
  type        = bool
  default     = false
}

variable "sso_instance_arn" {
  description = "IAM Identity Center instance ARN"
  type        = string
  default     = ""
}

variable "admin_permission_set_arn" {
  description = "Admin permission set ARN"
  type        = string
  default     = ""
}

variable "admin_group_id" {
  description = "Admin group ID in IAM Identity Center"
  type        = string
  default     = ""
}
```

### Step 4: SCP モジュール

```hcl
# modules/scp/main.tf

# 組織離脱禁止
resource "aws_organizations_policy" "deny_leave_org" {
  name        = "DenyLeaveOrganization"
  description = "Prevent accounts from leaving the organization"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyLeaveOrg"
        Effect    = "Deny"
        Action    = "organizations:LeaveOrganization"
        Resource  = "*"
      }
    ]
  })
}

# IMDSv2 必須化
resource "aws_organizations_policy" "require_imdsv2" {
  name        = "RequireIMDSv2"
  description = "Require IMDSv2 for all EC2 instances"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "RequireIMDSv2"
        Effect    = "Deny"
        Action    = "ec2:RunInstances"
        Resource  = "arn:aws:ec2:*:*:instance/*"
        Condition = {
          StringNotEquals = {
            "ec2:MetadataHttpTokens" = "required"
          }
        }
      }
    ]
  })
}

# リージョン制限
resource "aws_organizations_policy" "region_restriction" {
  name        = "RegionRestriction"
  description = "Restrict AWS regions"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyOtherRegions"
        Effect    = "Deny"
        NotAction = [
          "a]m:*",
          "cloudfront:*",
          "iam:*",
          "organizations:*",
          "route53:*",
          "support:*",
          "waf:*",
          "wafv2:*",
          "budgets:*",
          "ce:*"
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = var.allowed_regions
          }
        }
      }
    ]
  })
}

# 本番環境用: 破壊的操作禁止
resource "aws_organizations_policy" "deny_destructive_actions" {
  name        = "DenyDestructiveActions"
  description = "Prevent destructive actions in production"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyTerminateInstances"
        Effect = "Deny"
        Action = [
          "ec2:TerminateInstances",
          "rds:DeleteDBInstance",
          "rds:DeleteDBCluster"
        ]
        Resource = "*"
        Condition = {
          StringNotLike = {
            "aws:PrincipalArn" = [
              "arn:aws:iam::*:role/Admin*",
              "arn:aws:iam::*:role/OrganizationAccountAccessRole"
            ]
          }
        }
      }
    ]
  })
}

# 開発環境用: 高額インスタンス制限
resource "aws_organizations_policy" "budget_limit" {
  name        = "BudgetLimit"
  description = "Limit expensive instance types"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyExpensiveInstances"
        Effect = "Deny"
        Action = "ec2:RunInstances"
        Resource = "arn:aws:ec2:*:*:instance/*"
        Condition = {
          "ForAnyValue:StringLike" = {
            "ec2:InstanceType" = [
              "*.metal",
              "*.24xlarge",
              "*.16xlarge",
              "*.12xlarge",
              "p*.*",
              "g*.*",
              "trn*.*",
              "inf*.*"
            ]
          }
        }
      }
    ]
  })
}

# SCPのアタッチ
resource "aws_organizations_policy_attachment" "deny_leave_org_root" {
  policy_id = aws_organizations_policy.deny_leave_org.id
  target_id = var.root_id
}

resource "aws_organizations_policy_attachment" "require_imdsv2_root" {
  policy_id = aws_organizations_policy.require_imdsv2.id
  target_id = var.root_id
}

resource "aws_organizations_policy_attachment" "region_restriction_root" {
  policy_id = aws_organizations_policy.region_restriction.id
  target_id = var.root_id
}

resource "aws_organizations_policy_attachment" "deny_destructive_production" {
  policy_id = aws_organizations_policy.deny_destructive_actions.id
  target_id = var.production_ou_id
}

resource "aws_organizations_policy_attachment" "budget_limit_non_prod" {
  policy_id = aws_organizations_policy.budget_limit.id
  target_id = var.non_production_ou_id
}

resource "aws_organizations_policy_attachment" "budget_limit_sandbox" {
  policy_id = aws_organizations_policy.budget_limit.id
  target_id = var.sandbox_ou_id
}
```

### Step 5: セキュリティベースラインモジュール

```hcl
# modules/security-baseline/main.tf

# GuardDuty の組織有効化
resource "aws_guardduty_organization_admin_account" "admin" {
  admin_account_id = var.security_account_id
}

resource "aws_guardduty_detector" "primary" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  finding_publishing_frequency = "FIFTEEN_MINUTES"

  tags = {
    Name = "GuardDuty-Primary"
  }
}

# Security Hub の組織有効化
resource "aws_securityhub_organization_admin_account" "admin" {
  admin_account_id = var.security_account_id
}

resource "aws_securityhub_account" "main" {}

resource "aws_securityhub_standards_subscription" "aws_foundational" {
  depends_on    = [aws_securityhub_account.main]
  standards_arn = "arn:aws:securityhub:${var.region}::standards/aws-foundational-security-best-practices/v/1.0.0"
}

resource "aws_securityhub_standards_subscription" "cis" {
  depends_on    = [aws_securityhub_account.main]
  standards_arn = "arn:aws:securityhub:${var.region}::standards/cis-aws-foundations-benchmark/v/1.4.0"
}

# AWS Config の組織設定
resource "aws_config_configuration_aggregator" "organization" {
  name = "organization-aggregator"

  organization_aggregation_source {
    all_regions = true
    role_arn    = aws_iam_role.config_aggregator.arn
  }

  depends_on = [aws_iam_role_policy_attachment.config_aggregator]
}

resource "aws_iam_role" "config_aggregator" {
  name = "AWSConfigOrganizationAggregatorRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "config_aggregator" {
  role       = aws_iam_role.config_aggregator.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSConfigRoleForOrganizations"
}
```

### Step 6: 組織 CloudTrail

```hcl
# modules/logging/cloudtrail.tf

# CloudTrail ログ用 S3 バケット
resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket = "${var.organization_name}-cloudtrail-logs-${var.log_account_id}"

  tags = {
    Name = "CloudTrail Organization Logs"
  }
}

resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_logs.arn
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "arn:aws:cloudtrail:${var.region}:${var.management_account_id}:trail/${var.trail_name}"
          }
        }
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_logs.arn}/AWSLogs/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"  = "bucket-owner-full-control"
            "AWS:SourceArn" = "arn:aws:cloudtrail:${var.region}:${var.management_account_id}:trail/${var.trail_name}"
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_versioning" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.cloudtrail.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    id     = "archive-old-logs"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555  # 7年保持
    }
  }
}

# KMS キー
resource "aws_kms_key" "cloudtrail" {
  description             = "KMS key for CloudTrail logs"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.management_account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudTrail to encrypt logs"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action = [
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "arn:aws:cloudtrail:${var.region}:${var.management_account_id}:trail/${var.trail_name}"
          }
          StringLike = {
            "kms:EncryptionContext:aws:cloudtrail:arn" = "arn:aws:cloudtrail:*:${var.management_account_id}:trail/*"
          }
        }
      }
    ]
  })
}

# 組織 CloudTrail
resource "aws_cloudtrail" "organization" {
  name                          = var.trail_name
  s3_bucket_name                = aws_s3_bucket.cloudtrail_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  is_organization_trail         = true
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.cloudtrail.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3"]
    }
  }

  tags = {
    Name = "Organization Trail"
  }
}
```

### Step 7: メイン構成ファイル

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

  backend "s3" {
    bucket         = "devboost-terraform-state-ACCOUNT_ID"
    key            = "landing-zone/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "devboost-terraform-locks"
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "DevBoost-LandingZone"
      ManagedBy   = "Terraform"
      Environment = "management"
    }
  }
}

# Organizations モジュール
module "organization" {
  source = "./modules/organization"

  organization_name = var.organization_name
}

# SCP モジュール
module "scp" {
  source = "./modules/scp"

  root_id           = module.organization.organization_root_id
  production_ou_id  = module.organization.production_ou_id
  non_production_ou_id = module.organization.non_production_ou_id
  sandbox_ou_id     = module.organization.sandbox_ou_id
  allowed_regions   = var.allowed_regions

  depends_on = [module.organization]
}

# Log Archive アカウント
module "log_archive_account" {
  source = "./modules/account"

  account_name = "log-archive"
  account_email = var.log_archive_email
  parent_ou_id = module.organization.security_ou_id
  environment  = "security"

  depends_on = [module.organization]
}

# Security アカウント
module "security_account" {
  source = "./modules/account"

  account_name = "security-tooling"
  account_email = var.security_email
  parent_ou_id = module.organization.security_ou_id
  environment  = "security"

  depends_on = [module.organization]
}

# Network アカウント
module "network_account" {
  source = "./modules/account"

  account_name = "network"
  account_email = var.network_email
  parent_ou_id = module.organization.infrastructure_ou_id
  environment  = "infrastructure"

  depends_on = [module.organization]
}

# Shared Services アカウント
module "shared_services_account" {
  source = "./modules/account"

  account_name = "shared-services"
  account_email = var.shared_services_email
  parent_ou_id = module.organization.infrastructure_ou_id
  environment  = "infrastructure"

  depends_on = [module.organization]
}

# Production アカウント
module "production_account" {
  source = "./modules/account"

  account_name = "production"
  account_email = var.production_email
  parent_ou_id = module.organization.production_ou_id
  environment  = "production"

  depends_on = [module.organization]
}

# Staging アカウント
module "staging_account" {
  source = "./modules/account"

  account_name = "staging"
  account_email = var.staging_email
  parent_ou_id = module.organization.non_production_ou_id
  environment  = "staging"

  depends_on = [module.organization]
}

# Development アカウント
module "development_account" {
  source = "./modules/account"

  account_name = "development"
  account_email = var.development_email
  parent_ou_id = module.organization.non_production_ou_id
  environment  = "development"

  depends_on = [module.organization]
}

# Sandbox アカウント
module "sandbox_account" {
  source = "./modules/account"

  account_name = "sandbox"
  account_email = var.sandbox_email
  parent_ou_id = module.organization.sandbox_ou_id
  environment  = "sandbox"

  depends_on = [module.organization]
}

# セキュリティベースライン
module "security_baseline" {
  source = "./modules/security-baseline"

  security_account_id = module.security_account.account_id
  region              = var.region

  depends_on = [
    module.security_account,
    module.scp
  ]
}

# 組織ログ
module "logging" {
  source = "./modules/logging"

  organization_name     = var.organization_name
  trail_name            = "devboost-organization-trail"
  log_account_id        = module.log_archive_account.account_id
  management_account_id = data.aws_caller_identity.current.account_id
  region                = var.region

  depends_on = [module.log_archive_account]
}

data "aws_caller_identity" "current" {}
```

```hcl
# variables.tf

variable "organization_name" {
  description = "Organization name"
  type        = string
  default     = "devboost"
}

variable "region" {
  description = "Primary AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "allowed_regions" {
  description = "Allowed AWS regions"
  type        = list(string)
  default     = ["ap-northeast-1", "us-east-1"]
}

# アカウントメールアドレス
variable "log_archive_email" {
  description = "Email for log archive account"
  type        = string
}

variable "security_email" {
  description = "Email for security account"
  type        = string
}

variable "network_email" {
  description = "Email for network account"
  type        = string
}

variable "shared_services_email" {
  description = "Email for shared services account"
  type        = string
}

variable "production_email" {
  description = "Email for production account"
  type        = string
}

variable "staging_email" {
  description = "Email for staging account"
  type        = string
}

variable "development_email" {
  description = "Email for development account"
  type        = string
}

variable "sandbox_email" {
  description = "Email for sandbox account"
  type        = string
}
```

---

## 8. トラブルシューティング課題

### 課題1: アカウント作成が失敗する

**症状**:
```
Error: error creating Organizations Account: ConstraintViolationException:
You have exceeded the allowed number of AWS accounts.
```

**調査コマンド**:
```bash
# アカウント制限の確認
aws organizations describe-organization

# 既存アカウント数の確認
aws organizations list-accounts --query 'Accounts[*].[Id,Name,Status]' --output table

# Service Quotas の確認
aws service-quotas get-service-quota \
    --service-code organizations \
    --quota-code L-29A0C5DF
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: Organizations のデフォルトアカウント制限（10）に達している

**解決手順**:
```bash
# 1. Service Quotas でクォータ引き上げリクエスト
aws service-quotas request-service-quota-increase \
    --service-code organizations \
    --quota-code L-29A0C5DF \
    --desired-value 50

# 2. または、AWS サポートケースを作成
# - カテゴリ: Service Limit Increase
# - サービス: AWS Organizations
# - 理由: ビジネス要件を記載

# 3. 待機中の対応策
# - 不要なアカウントのクローズ検討
# - アカウント統合の検討
```

**追加確認事項**:
- 閉鎖中のアカウントも制限にカウントされる（90日間）
- アカウントメールの重複確認
</details>

### 課題2: SCP が意図通りに機能しない

**症状**:
```
SCP でリージョン制限を設定したが、制限されているはずのリージョンで
リソースが作成できてしまう。
```

**調査手順**:
```bash
# SCP のアタッチ状態確認
aws organizations list-policies-for-target \
    --target-id ou-xxxx-xxxxxxxx \
    --filter SERVICE_CONTROL_POLICY

# SCP の内容確認
aws organizations describe-policy --policy-id p-xxxxxxxx

# 対象アカウントの有効なポリシー確認
aws organizations describe-effective-policy \
    --target-id 123456789012 \
    --policy-type SERVICE_CONTROL_POLICY
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: SCP の条件や NotAction の設定が不適切

**解決手順**:
```hcl
# 1. NotAction の使用に注意
# NotAction で指定したサービスは SCP の制限を受けない
# グローバルサービスを適切に除外する

resource "aws_organizations_policy" "region_restriction_fixed" {
  name = "RegionRestrictionFixed"
  type = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyOtherRegions"
        Effect    = "Deny"
        NotAction = [
          # グローバルサービスのみを除外
          "iam:*",
          "organizations:*",
          "route53:*",
          "cloudfront:*",
          "waf:*",
          "wafv2:*",
          "globalaccelerator:*",
          "support:*",
          "budgets:*",
          "ce:*",
          "s3:GetBucketLocation",  # S3 は特定のアクションのみ除外
          "s3:ListAllMyBuckets"
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = ["ap-northeast-1", "us-east-1"]
          }
        }
      }
    ]
  })
}

# 2. SCP が OU に正しくアタッチされているか確認
# 3. OU の階層構造を確認（親 OU の SCP も影響）
# 4. マネジメントアカウントは SCP の対象外であることに注意
```

**テスト方法**:
```bash
# 制限されるべきリージョンでテスト
aws ec2 describe-vpcs --region eu-west-1
# Access Denied が返ることを確認
```
</details>

### 課題3: クロスアカウントアクセスが機能しない

**症状**:
```
Terraform で別アカウントにリソースを作成しようとすると
Access Denied エラーが発生する。
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: AssumeRole の設定が不完全

**解決手順**:
```hcl
# 1. Terraform provider でロールを指定
provider "aws" {
  alias  = "production"
  region = "ap-northeast-1"

  assume_role {
    role_arn     = "arn:aws:iam::PRODUCTION_ACCOUNT_ID:role/OrganizationAccountAccessRole"
    session_name = "TerraformSession"
  }
}

# 2. Organizations 作成時のデフォルトロールを確認
# アカウント作成時に OrganizationAccountAccessRole が自動作成される

# 3. 信頼ポリシーの確認（対象アカウントで）
aws iam get-role --role-name OrganizationAccountAccessRole

# 4. 必要に応じて信頼ポリシーを更新
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::MANAGEMENT_ACCOUNT_ID:root"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```
</details>

---

## 9. 設計課題

### 設計課題: 50名規模への成長対応

**シナリオ**:
DevBoost社は1年後に従業員50名（エンジニア20名）への成長を計画しています。
現在の Landing Zone 設計を拡張し、以下の要件に対応してください。

**要件**:
```
1. チーム構成（想定）
   - プラットフォームチーム: 5名
   - プロダクトチームA: 5名
   - プロダクトチームB: 5名
   - データチーム: 3名
   - SRE: 2名

2. アクセス要件
   - チームごとに専用の開発アカウント
   - 本番環境は SRE + プラットフォームのみ
   - データチームは分析環境のみ

3. セキュリティ要件
   - SOC2 Type II 準拠準備
   - 監査ログの13ヶ月保持
   - PII データの暗号化必須

4. コスト要件
   - チーム別コスト可視化
   - 開発環境の予算制限（チームあたり月10万円）
```

**設計すべき項目**:
- 拡張OU構造
- IAM Identity Center の権限セット設計
- 追加SCP
- コスト配分戦略

<details>
<summary>設計例を見る</summary>

### 拡張 OU 構造

```
Root
├── Security OU
│   ├── Log Archive Account
│   └── Security Tooling Account
│
├── Infrastructure OU
│   ├── Network Account
│   └── Shared Services Account
│
├── Workloads OU
│   ├── Production OU
│   │   └── Production Account
│   │
│   ├── Pre-Production OU
│   │   ├── Staging Account
│   │   └── QA Account
│   │
│   ├── Development OU
│   │   ├── Platform-Dev Account
│   │   ├── ProductA-Dev Account
│   │   ├── ProductB-Dev Account
│   │   └── Data-Dev Account
│   │
│   └── Sandbox OU
│       └── Sandbox Account
│
└── Analytics OU (New)
    ├── Data Lake Account
    └── BI Account
```

### IAM Identity Center 権限セット設計

```yaml
permission_sets:
  # 管理者用
  AdministratorAccess:
    managed_policies:
      - arn:aws:iam::aws:policy/AdministratorAccess
    session_duration: 4h
    assignment:
      - group: SRE
        accounts: [All]
      - group: PlatformTeam
        accounts: [Infrastructure, Development OUs]

  # 開発者用
  DeveloperAccess:
    managed_policies:
      - arn:aws:iam::aws:policy/PowerUserAccess
    inline_policy: |
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Deny",
            "Action": [
              "iam:CreateUser",
              "iam:CreateAccessKey",
              "organizations:*"
            ],
            "Resource": "*"
          }
        ]
      }
    session_duration: 8h
    assignment:
      - group: ProductTeamA
        accounts: [ProductA-Dev]
      - group: ProductTeamB
        accounts: [ProductB-Dev]

  # 読み取り専用
  ViewOnlyAccess:
    managed_policies:
      - arn:aws:iam::aws:policy/ViewOnlyAccess
    session_duration: 8h
    assignment:
      - group: AllDevelopers
        accounts: [Production]

  # データ分析用
  DataAnalystAccess:
    managed_policies:
      - arn:aws:iam::aws:policy/AmazonAthenaFullAccess
      - arn:aws:iam::aws:policy/AmazonRedshiftReadOnlyAccess
    inline_policy: |
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "s3:GetObject",
              "s3:ListBucket"
            ],
            "Resource": [
              "arn:aws:s3:::*-data-lake-*",
              "arn:aws:s3:::*-data-lake-*/*"
            ]
          }
        ]
      }
    assignment:
      - group: DataTeam
        accounts: [Data Lake, BI]
```

### コスト配分戦略

```yaml
cost_allocation:
  # 必須タグ
  mandatory_tags:
    - Team
    - Environment
    - CostCenter
    - Project

  # Budget 設定
  budgets:
    - name: ProductA-Dev-Monthly
      amount: 100000  # 10万円
      filter:
        account: ProductA-Dev
      alerts:
        - threshold: 80
          action: notify
        - threshold: 100
          action: [notify, restrict_expensive_services]

    - name: ProductB-Dev-Monthly
      amount: 100000
      filter:
        account: ProductB-Dev
      alerts:
        - threshold: 80
          action: notify
        - threshold: 100
          action: [notify, restrict_expensive_services]

  # Cost Categories
  cost_categories:
    - name: Team
      rules:
        - value: Platform
          match: Account IN [Platform-Dev, Shared-Services, Network]
        - value: ProductA
          match: Account IN [ProductA-Dev] OR Tag:Team = ProductA
        - value: ProductB
          match: Account IN [ProductB-Dev] OR Tag:Team = ProductB
        - value: Data
          match: Account IN [Data-Dev, Data-Lake, BI]
```

</details>

---

## 10. 発展課題

### 発展課題1: Control Tower の導入（難易度：中級）

**課題内容**:
現在の Terraform ベースの Landing Zone を AWS Control Tower に移行し、
ガードレールと Account Factory を活用してください。

**要件**:
- 既存アカウントの Control Tower への登録
- カスタムガードレールの作成
- Account Factory Customization (AFC) の設定

### 発展課題2: GitOps によるアカウント管理（難易度：上級）

**課題内容**:
新規アカウント作成をGitOps で管理し、PR ベースの承認フローを実装してください。

**要件**:
- GitHub/GitLab リポジトリでアカウント定義を管理
- PR 作成 → レビュー → マージで自動プロビジョニング
- Terraform Cloud / Atlantis の活用

### 発展課題3: FinOps 基盤の構築（難易度：中級）

**課題内容**:
組織全体のコスト可視化と最適化を自動化する FinOps 基盤を構築してください。

**要件**:
- Cost and Usage Report の設定と分析
- 異常コスト検知の自動化
- 月次コストレポートの自動配信

---

## 11. 振り返りと次のステップ

### 学習のまとめ

```
本課題で学んだこと:
□ AWS Organizations によるマルチアカウント管理
□ OU 設計とベストプラクティス
□ SCP による権限境界の設定
□ IAM Identity Center による統合 ID 管理
□ Terraform でのマルチアカウントプロビジョニング
□ 組織レベルのセキュリティ・監査基盤

GCP との主な違い:
- アカウント vs プロジェクトの粒度の違い
- SCP は Organization Policy より IAM 統合が深い
- Control Tower という Landing Zone ソリューション
```

### GCP経験者向けポイント

| 観点 | GCP | AWS | 移行時の注意 |
|------|-----|-----|-------------|
| 階層構造 | Folders | Organizational Units | OU は移動可能だが制限あり |
| ポリシー | Organization Policies | SCP | SCP は許可ではなく境界を設定 |
| ID 管理 | Cloud Identity | IAM Identity Center | SCIM 連携の設定が異なる |
| 請求 | Billing Account | 一括請求 | 支払いアカウントは1つ |
| ログ集約 | Log Router | CloudTrail 組織トレイル | 設定方法が異なる |

### 推奨される次のステップ

```
1. AWS Certified Solutions Architect Associate
   - Organizations の詳細理解

2. Control Tower の学習
   - マネージドな Landing Zone

3. 実環境での適用
   - 段階的な移行計画の策定
   - チームへの教育

4. 関連課題への挑戦
   - 課題32: マルチリージョン構成
   - 課題40: IAM Identity Center 統合
```

---

## 12. 推定コストと注意事項

### 本課題の推定コスト

| サービス | 使用量 | 推定コスト（演習時） |
|----------|--------|---------------------|
| Organizations | 管理機能 | 無料 |
| CloudTrail | 組織トレイル | $2-5/月 |
| Config | ルール評価 | $2-5/月 |
| S3 | ログ保存 | $1-2/月 |
| IAM Identity Center | ユーザー管理 | 無料 |
| **合計** | | **$5-15/月** |

### 注意事項

```
⚠️ Organizations の有効化
- 一度有効化すると、完全な無効化は困難
- 既存のアカウント構造に影響

⚠️ アカウント作成
- アカウント作成には一意のメールアドレスが必要
- 作成後のメールアドレス変更は不可
- アカウントのクローズには90日の待機期間

⚠️ SCP の適用
- マネジメントアカウントには SCP が適用されない
- SCP は許可を与えない（IAM との AND 条件）
- テスト環境で十分な検証後に適用

⚠️ 本番環境への適用
- 段階的に適用（Sandbox → Dev → Staging → Prod）
- ロールバック計画を準備
- チームへの事前周知
```

---

**課題作成日**: 2024年1月
**最終更新日**: 2024年1月
**作成者**: AWS学習プログラム
