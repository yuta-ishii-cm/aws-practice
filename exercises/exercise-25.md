# 課題25: TechCorp - IAM Identity Center (AWS SSO) 構築

## 1. 概要

ITコンサルティング会社「TechCorp株式会社」の従業員向けシングルサインオン（SSO）基盤を AWS IAM Identity Center で構築します。複数AWSアカウントへのアクセス管理、外部IdP連携、権限セットの設計を通じて、エンタープライズ向けアイデンティティ管理を学びます。

### 企業プロファイル

| 項目 | 内容 |
|------|------|
| 企業名 | TechCorp株式会社 |
| 業種 | ITコンサルティング |
| 従業員数 | 500名 |
| AWSアカウント数 | 15アカウント（開発/本番/共有サービス等） |
| 部門数 | 6部門（開発、インフラ、セキュリティ、営業、管理、経営） |
| 課題 | 複数アカウントへのアクセス管理の複雑化、セキュリティ強化 |

### 達成目標（white hat KPI）

| KPI | 目標値 | 測定方法 |
|-----|--------|----------|
| SSO認証成功率 | 99.9% | CloudWatch メトリクス |
| アクセス権プロビジョニング | < 5分 | 権限変更の反映時間 |
| セキュリティコンプライアンス | 100% | MFA必須、監査ログ完全性 |
| 運用負荷削減 | 80%削減 | アカウント管理作業時間 |

---

## 2. アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    TechCorp IAM Identity Center アーキテクチャ                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  External Identity Provider (Optional)                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │  Azure AD / Okta / Google Workspace                                          │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │  │
│  │  │  SAML 2.0 / SCIM                                                        │ │  │
│  │  │  - ユーザー同期                                                          │ │  │
│  │  │  - グループ同期                                                          │ │  │
│  │  │  - 属性マッピング                                                        │ │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                               │
│                                    ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                        AWS IAM Identity Center                               │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │  │
│  │  │  Identity Store (Users & Groups)                                        │ │  │
│  │  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │ │  │
│  │  │  │ 開発部門       │  │ インフラ部門  │  │ セキュリティ部門│               │ │  │
│  │  │  │ (80 users)    │  │ (40 users)    │  │ (20 users)    │               │ │  │
│  │  │  └───────────────┘  └───────────────┘  └───────────────┘               │ │  │
│  │  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │ │  │
│  │  │  │ 営業部門       │  │ 管理部門      │  │ 経営層        │               │ │  │
│  │  │  │ (200 users)   │  │ (100 users)   │  │ (60 users)    │               │ │  │
│  │  │  └───────────────┘  └───────────────┘  └───────────────┘               │ │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                              │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │  │
│  │  │  Permission Sets                                                        │ │  │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │  │
│  │  │  │ AdministratorPS │  │ DeveloperPS     │  │ ReadOnlyPS              │ │ │  │
│  │  │  │ (Full Admin)    │  │ (Dev Resources) │  │ (View Only)             │ │ │  │
│  │  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │  │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │  │
│  │  │  │ SecurityAuditPS │  │ NetworkAdminPS  │  │ BillingViewerPS         │ │ │  │
│  │  │  │ (Security Audit)│  │ (VPC/Network)   │  │ (Cost Explorer)         │ │ │  │
│  │  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                               │
│                                    ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                        AWS Organizations                                     │  │
│  │                                                                              │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │  │
│  │  │                         Management Account                              │ │  │
│  │  │                    (techcorp-management)                                │ │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │  │
│  │                                    │                                         │  │
│  │           ┌────────────────────────┼────────────────────────┐               │  │
│  │           │                        │                        │               │  │
│  │           ▼                        ▼                        ▼               │  │
│  │  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │  │
│  │  │   Security OU   │     │  Workloads OU   │     │  Sandbox OU     │       │  │
│  │  │                 │     │                 │     │                 │       │  │
│  │  │ ┌─────────────┐ │     │ ┌─────────────┐ │     │ ┌─────────────┐ │       │  │
│  │  │ │ Security    │ │     │ │ Production  │ │     │ │ Sandbox-Dev │ │       │  │
│  │  │ │ Account     │ │     │ │ Account     │ │     │ │ Account     │ │       │  │
│  │  │ └─────────────┘ │     │ └─────────────┘ │     │ └─────────────┘ │       │  │
│  │  │ ┌─────────────┐ │     │ ┌─────────────┐ │     │ ┌─────────────┐ │       │  │
│  │  │ │ Log Archive │ │     │ │ Staging     │ │     │ │ Sandbox-QA  │ │       │  │
│  │  │ │ Account     │ │     │ │ Account     │ │     │ │ Account     │ │       │  │
│  │  │ └─────────────┘ │     │ └─────────────┘ │     │ └─────────────┘ │       │  │
│  │  └─────────────────┘     │ ┌─────────────┐ │     └─────────────────┘       │  │
│  │                          │ │ Development │ │                               │  │
│  │                          │ │ Account     │ │                               │  │
│  │                          │ └─────────────┘ │                               │  │
│  │                          └─────────────────┘                               │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                        Access Portal                                         │  │
│  │  https://techcorp.awsapps.com/start                                         │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │  │
│  │  │  Available Accounts & Roles                                             │ │  │
│  │  │  ┌─────────────────────────────────────────────────────────────────┐   │ │  │
│  │  │  │ Production Account                                              │   │ │  │
│  │  │  │  - DeveloperAccess (8h session)                                │   │ │  │
│  │  │  │  - ReadOnly (8h session)                                       │   │ │  │
│  │  │  ├─────────────────────────────────────────────────────────────────┤   │ │  │
│  │  │  │ Development Account                                             │   │ │  │
│  │  │  │  - AdministratorAccess (8h session)                            │   │ │  │
│  │  │  │  - DeveloperAccess (8h session)                                │   │ │  │
│  │  │  ├─────────────────────────────────────────────────────────────────┤   │ │  │
│  │  │  │ Sandbox Account                                                 │   │ │  │
│  │  │  │  - AdministratorAccess (4h session)                            │   │ │  │
│  │  │  └─────────────────────────────────────────────────────────────────┘   │ │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### アクセス管理マトリクス

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          Access Management Matrix                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  部門 / アカウント      │ Production │ Staging │ Development │ Sandbox │ Security  │
│  ─────────────────────┼────────────┼─────────┼─────────────┼─────────┼──────────  │
│  開発部門              │ Developer  │ Admin   │ Admin       │ Admin   │ -         │
│                       │ ReadOnly   │         │             │         │           │
│  ─────────────────────┼────────────┼─────────┼─────────────┼─────────┼──────────  │
│  インフラ部門          │ Admin      │ Admin   │ Admin       │ Admin   │ ReadOnly  │
│                       │ Network    │ Network │ Network     │         │           │
│  ─────────────────────┼────────────┼─────────┼─────────────┼─────────┼──────────  │
│  セキュリティ部門      │ SecAudit   │ SecAudit│ SecAudit    │ SecAudit│ Admin     │
│                       │ ReadOnly   │ ReadOnly│ ReadOnly    │ ReadOnly│           │
│  ─────────────────────┼────────────┼─────────┼─────────────┼─────────┼──────────  │
│  営業部門              │ -          │ -       │ -           │ -       │ -         │
│  ─────────────────────┼────────────┼─────────┼─────────────┼─────────┼──────────  │
│  管理部門              │ Billing    │ Billing │ -           │ -       │ -         │
│                       │ ReadOnly   │         │             │         │           │
│  ─────────────────────┼────────────┼─────────┼─────────────┼─────────┼──────────  │
│  経営層                │ ReadOnly   │ ReadOnly│ ReadOnly    │ -       │ ReadOnly  │
│                       │ Billing    │         │             │         │           │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 前提知識

### 3.1 IAM Identity Center の概念

GCPでのアイデンティティ管理経験がある方向けの比較：

| 観点 | GCP | AWS |
|------|-----|-----|
| SSO基盤 | Cloud Identity | IAM Identity Center |
| IdP連携 | Cloud Identity + SAML | Identity Center + SAML/SCIM |
| 権限管理 | IAM Roles | Permission Sets |
| ディレクトリ | Cloud Identity Directory | Identity Center Directory |
| マルチプロジェクト | Project IAM Bindings | Account Assignments |

### 3.2 IAM Identity Center の主要概念

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    IAM Identity Center Core Concepts                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Identity Source（アイデンティティソース）                                │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │ │
│  │  │ Identity Center │  │ Active Directory│  │ External IdP        │   │ │
│  │  │ Directory       │  │ Connector       │  │ (Okta, Azure AD)    │   │ │
│  │  │ (Built-in)      │  │                 │  │                     │   │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │ │
│  │  本課題では Built-in Directory を使用                                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  2. Permission Set（権限セット）                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  - AWSアカウントで使用する権限の集合                                    │ │
│  │  - AWS管理ポリシー or カスタムポリシーを含む                            │ │
│  │  - セッション時間を設定可能（1時間〜12時間）                            │ │
│  │  - 割り当て時にIAMロールとして自動作成される                            │ │
│  │                                                                        │ │
│  │  例: DeveloperPermissionSet                                            │ │
│  │      ├── AWS管理ポリシー: PowerUserAccess                              │ │
│  │      ├── カスタムポリシー: DenyIAMChanges                              │ │
│  │      └── セッション時間: 8時間                                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  3. Account Assignment（アカウント割り当て）                                │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  User/Group + Permission Set + AWS Account の組み合わせ                │ │
│  │                                                                        │ │
│  │  例: Developers Group + DeveloperPS + Development Account             │ │
│  │       → 開発グループのメンバーが開発アカウントにDeveloper権限でアクセス │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  4. Access Portal（アクセスポータル）                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  - ユーザーがSSOでログインするWebポータル                               │ │
│  │  - 割り当てられたアカウント・ロールの一覧表示                           │ │
│  │  - マネジメントコンソール or CLI認証情報の取得                          │ │
│  │  - URL例: https://d-1234567890.awsapps.com/start                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 構築手順

### 4.1 前提条件の確認

```bash
# AWS CLIのバージョン確認（2.x以上推奨）
aws --version

# Organizations が有効化されていることを確認
aws organizations describe-organization

# 管理アカウントで実行していることを確認
aws sts get-caller-identity
```

### 4.2 Terraform プロジェクト構成

```
techcorp-identity-center/
├── main.tf
├── variables.tf
├── outputs.tf
├── terraform.tfvars
├── modules/
│   ├── identity-center/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── users.tf
│   │   ├── groups.tf
│   │   ├── permission-sets.tf
│   │   └── assignments.tf
│   └── organizations/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── data/
    ├── users.csv
    └── groups.json
```

### 4.3 Organizations 構成（参考）

```hcl
# modules/organizations/main.tf
# 注意: Organizations は既に構成済みと想定
# ここでは参照のみ行う

data "aws_organizations_organization" "current" {}

data "aws_organizations_organizational_units" "root" {
  parent_id = data.aws_organizations_organization.current.roots[0].id
}

# OUの作成（必要に応じて）
resource "aws_organizations_organizational_unit" "security" {
  name      = "Security"
  parent_id = data.aws_organizations_organization.current.roots[0].id
}

resource "aws_organizations_organizational_unit" "workloads" {
  name      = "Workloads"
  parent_id = data.aws_organizations_organization.current.roots[0].id
}

resource "aws_organizations_organizational_unit" "sandbox" {
  name      = "Sandbox"
  parent_id = data.aws_organizations_organization.current.roots[0].id
}

output "ou_ids" {
  value = {
    security  = aws_organizations_organizational_unit.security.id
    workloads = aws_organizations_organizational_unit.workloads.id
    sandbox   = aws_organizations_organizational_unit.sandbox.id
  }
}
```

### 4.4 IAM Identity Center 有効化

```hcl
# modules/identity-center/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# IAM Identity Center インスタンスの取得
# Identity Center は Organizations 管理アカウントで自動的に有効化される
data "aws_ssoadmin_instances" "main" {}

locals {
  identity_store_id = tolist(data.aws_ssoadmin_instances.main.identity_store_ids)[0]
  instance_arn      = tolist(data.aws_ssoadmin_instances.main.arns)[0]
}

# Organizations のアカウント情報
data "aws_organizations_organization" "current" {}

# メンバーアカウントの取得
data "aws_organizations_accounts" "all" {}

locals {
  # アカウントを名前でマッピング
  accounts_by_name = {
    for account in data.aws_organizations_accounts.all.accounts :
    account.name => account.id
  }
}
```

### 4.5 ユーザーとグループの作成

```hcl
# modules/identity-center/groups.tf
# グループの定義
variable "groups" {
  description = "Identity Center groups"
  type = map(object({
    display_name = string
    description  = string
  }))
  default = {
    developers = {
      display_name = "Developers"
      description  = "開発部門のエンジニア"
    }
    infrastructure = {
      display_name = "Infrastructure"
      description  = "インフラ部門のエンジニア"
    }
    security = {
      display_name = "Security"
      description  = "セキュリティ部門"
    }
    managers = {
      display_name = "Managers"
      description  = "部門マネージャー"
    }
    executives = {
      display_name = "Executives"
      description  = "経営層"
    }
    finance = {
      display_name = "Finance"
      description  = "管理部門（財務・経理）"
    }
  }
}

# グループの作成
resource "aws_identitystore_group" "groups" {
  for_each = var.groups

  identity_store_id = local.identity_store_id
  display_name      = each.value.display_name
  description       = each.value.description
}
```

```hcl
# modules/identity-center/users.tf
# ユーザーの定義（実際の運用ではCSVやJSONから読み込み）
variable "users" {
  description = "Identity Center users"
  type = map(object({
    display_name = string
    email        = string
    first_name   = string
    last_name    = string
    groups       = list(string)
  }))
  default = {
    "tanaka.taro" = {
      display_name = "田中 太郎"
      email        = "tanaka.taro@techcorp.example.com"
      first_name   = "太郎"
      last_name    = "田中"
      groups       = ["developers"]
    }
    "suzuki.hanako" = {
      display_name = "鈴木 花子"
      email        = "suzuki.hanako@techcorp.example.com"
      first_name   = "花子"
      last_name    = "鈴木"
      groups       = ["infrastructure", "managers"]
    }
    "yamamoto.ichiro" = {
      display_name = "山本 一郎"
      email        = "yamamoto.ichiro@techcorp.example.com"
      first_name   = "一郎"
      last_name    = "山本"
      groups       = ["security"]
    }
    "sato.yuki" = {
      display_name = "佐藤 雪"
      email        = "sato.yuki@techcorp.example.com"
      first_name   = "雪"
      last_name    = "佐藤"
      groups       = ["executives", "finance"]
    }
  }
}

# ユーザーの作成
resource "aws_identitystore_user" "users" {
  for_each = var.users

  identity_store_id = local.identity_store_id
  user_name         = each.key
  display_name      = each.value.display_name

  name {
    given_name  = each.value.first_name
    family_name = each.value.last_name
  }

  emails {
    value   = each.value.email
    primary = true
  }
}

# グループメンバーシップの設定
resource "aws_identitystore_group_membership" "memberships" {
  for_each = {
    for pair in flatten([
      for user_key, user in var.users : [
        for group in user.groups : {
          user_key  = user_key
          group_key = group
        }
      ]
    ]) : "${pair.user_key}-${pair.group_key}" => pair
  }

  identity_store_id = local.identity_store_id
  group_id          = aws_identitystore_group.groups[each.value.group_key].group_id
  member_id         = aws_identitystore_user.users[each.value.user_key].user_id
}
```

### 4.6 Permission Sets の作成

```hcl
# modules/identity-center/permission-sets.tf

# Administrator Permission Set
resource "aws_ssoadmin_permission_set" "administrator" {
  name             = "AdministratorAccess"
  description      = "Full administrative access to AWS services"
  instance_arn     = local.instance_arn
  session_duration = "PT8H" # 8時間

  tags = {
    Environment = "all"
    ManagedBy   = "terraform"
  }
}

resource "aws_ssoadmin_managed_policy_attachment" "administrator_policy" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.administrator.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Developer Permission Set
resource "aws_ssoadmin_permission_set" "developer" {
  name             = "DeveloperAccess"
  description      = "Developer access with restricted IAM permissions"
  instance_arn     = local.instance_arn
  session_duration = "PT8H"

  tags = {
    Environment = "all"
    ManagedBy   = "terraform"
  }
}

resource "aws_ssoadmin_managed_policy_attachment" "developer_poweruser" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

# Developer用のカスタムポリシー（IAM変更禁止）
resource "aws_ssoadmin_permission_set_inline_policy" "developer_deny_iam" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn

  inline_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyIAMChanges"
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:DeleteUser",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:AttachUserPolicy",
          "iam:AttachRolePolicy",
          "iam:PutUserPolicy",
          "iam:PutRolePolicy",
          "organizations:*",
          "account:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# ReadOnly Permission Set
resource "aws_ssoadmin_permission_set" "readonly" {
  name             = "ReadOnlyAccess"
  description      = "Read-only access to AWS services"
  instance_arn     = local.instance_arn
  session_duration = "PT8H"

  tags = {
    Environment = "all"
    ManagedBy   = "terraform"
  }
}

resource "aws_ssoadmin_managed_policy_attachment" "readonly_policy" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.readonly.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# Security Auditor Permission Set
resource "aws_ssoadmin_permission_set" "security_auditor" {
  name             = "SecurityAuditor"
  description      = "Security audit access for compliance reviews"
  instance_arn     = local.instance_arn
  session_duration = "PT4H"

  tags = {
    Environment = "all"
    ManagedBy   = "terraform"
  }
}

resource "aws_ssoadmin_managed_policy_attachment" "security_auditor_policy" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.security_auditor.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/SecurityAudit"
}

resource "aws_ssoadmin_managed_policy_attachment" "security_auditor_config" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.security_auditor.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AWS_ConfigUserAccess"
}

# Network Administrator Permission Set
resource "aws_ssoadmin_permission_set" "network_admin" {
  name             = "NetworkAdministrator"
  description      = "Network and VPC administration"
  instance_arn     = local.instance_arn
  session_duration = "PT8H"

  tags = {
    Environment = "all"
    ManagedBy   = "terraform"
  }
}

resource "aws_ssoadmin_managed_policy_attachment" "network_admin_policy" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.network_admin.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/job-function/NetworkAdministrator"
}

# Billing Viewer Permission Set
resource "aws_ssoadmin_permission_set" "billing_viewer" {
  name             = "BillingViewer"
  description      = "Access to billing and cost management"
  instance_arn     = local.instance_arn
  session_duration = "PT4H"

  tags = {
    Environment = "all"
    ManagedBy   = "terraform"
  }
}

resource "aws_ssoadmin_managed_policy_attachment" "billing_viewer_policy" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.billing_viewer.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/job-function/Billing"
}

resource "aws_ssoadmin_managed_policy_attachment" "billing_ce_policy" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.billing_viewer.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AWSBillingConductorReadOnlyAccess"
}

# Sandbox Admin Permission Set（短いセッション時間）
resource "aws_ssoadmin_permission_set" "sandbox_admin" {
  name             = "SandboxAdmin"
  description      = "Administrator access for sandbox environment"
  instance_arn     = local.instance_arn
  session_duration = "PT4H" # サンドボックスは4時間に制限

  tags = {
    Environment = "sandbox"
    ManagedBy   = "terraform"
  }
}

resource "aws_ssoadmin_managed_policy_attachment" "sandbox_admin_policy" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.sandbox_admin.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Sandbox用のコスト制限ポリシー
resource "aws_ssoadmin_permission_set_inline_policy" "sandbox_cost_limit" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.sandbox_admin.arn

  inline_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyExpensiveResources"
        Effect = "Deny"
        Action = [
          "ec2:RunInstances"
        ]
        Resource = "arn:aws:ec2:*:*:instance/*"
        Condition = {
          "ForAnyValue:StringNotLike" = {
            "ec2:InstanceType" = [
              "t3.micro",
              "t3.small",
              "t3.medium",
              "t3a.micro",
              "t3a.small",
              "t3a.medium"
            ]
          }
        }
      },
      {
        Sid    = "DenyRDSLargeInstances"
        Effect = "Deny"
        Action = [
          "rds:CreateDBInstance"
        ]
        Resource = "*"
        Condition = {
          "ForAnyValue:StringNotLike" = {
            "rds:DatabaseClass" = [
              "db.t3.micro",
              "db.t3.small"
            ]
          }
        }
      }
    ]
  })
}
```

### 4.7 アカウント割り当て

```hcl
# modules/identity-center/assignments.tf

# アカウント割り当ての定義
variable "account_assignments" {
  description = "Account assignments configuration"
  type = list(object({
    account_name       = string
    principal_type     = string # USER or GROUP
    principal_name     = string
    permission_set_key = string
  }))
  default = [
    # 開発部門の割り当て
    {
      account_name       = "development"
      principal_type     = "GROUP"
      principal_name     = "developers"
      permission_set_key = "administrator"
    },
    {
      account_name       = "staging"
      principal_type     = "GROUP"
      principal_name     = "developers"
      permission_set_key = "administrator"
    },
    {
      account_name       = "production"
      principal_type     = "GROUP"
      principal_name     = "developers"
      permission_set_key = "developer"
    },
    {
      account_name       = "production"
      principal_type     = "GROUP"
      principal_name     = "developers"
      permission_set_key = "readonly"
    },
    # インフラ部門の割り当て
    {
      account_name       = "development"
      principal_type     = "GROUP"
      principal_name     = "infrastructure"
      permission_set_key = "administrator"
    },
    {
      account_name       = "staging"
      principal_type     = "GROUP"
      principal_name     = "infrastructure"
      permission_set_key = "administrator"
    },
    {
      account_name       = "production"
      principal_type     = "GROUP"
      principal_name     = "infrastructure"
      permission_set_key = "administrator"
    },
    {
      account_name       = "production"
      principal_type     = "GROUP"
      principal_name     = "infrastructure"
      permission_set_key = "network_admin"
    },
    # セキュリティ部門の割り当て
    {
      account_name       = "security"
      principal_type     = "GROUP"
      principal_name     = "security"
      permission_set_key = "administrator"
    },
    {
      account_name       = "production"
      principal_type     = "GROUP"
      principal_name     = "security"
      permission_set_key = "security_auditor"
    },
    {
      account_name       = "development"
      principal_type     = "GROUP"
      principal_name     = "security"
      permission_set_key = "security_auditor"
    },
    # 管理部門の割り当て
    {
      account_name       = "production"
      principal_type     = "GROUP"
      principal_name     = "finance"
      permission_set_key = "billing_viewer"
    },
    # 経営層の割り当て
    {
      account_name       = "production"
      principal_type     = "GROUP"
      principal_name     = "executives"
      permission_set_key = "readonly"
    },
    {
      account_name       = "production"
      principal_type     = "GROUP"
      principal_name     = "executives"
      permission_set_key = "billing_viewer"
    },
    # サンドボックスの割り当て
    {
      account_name       = "sandbox"
      principal_type     = "GROUP"
      principal_name     = "developers"
      permission_set_key = "sandbox_admin"
    },
    {
      account_name       = "sandbox"
      principal_type     = "GROUP"
      principal_name     = "infrastructure"
      permission_set_key = "sandbox_admin"
    }
  ]
}

# Permission Set のマッピング
locals {
  permission_sets = {
    administrator    = aws_ssoadmin_permission_set.administrator.arn
    developer        = aws_ssoadmin_permission_set.developer.arn
    readonly         = aws_ssoadmin_permission_set.readonly.arn
    security_auditor = aws_ssoadmin_permission_set.security_auditor.arn
    network_admin    = aws_ssoadmin_permission_set.network_admin.arn
    billing_viewer   = aws_ssoadmin_permission_set.billing_viewer.arn
    sandbox_admin    = aws_ssoadmin_permission_set.sandbox_admin.arn
  }

  # アカウント名からIDへのマッピング（実際のアカウントIDに置き換え）
  account_ids = {
    development = "111111111111"
    staging     = "222222222222"
    production  = "333333333333"
    security    = "444444444444"
    sandbox     = "555555555555"
  }
}

# アカウント割り当ての作成
resource "aws_ssoadmin_account_assignment" "assignments" {
  for_each = {
    for idx, assignment in var.account_assignments :
    "${assignment.account_name}-${assignment.principal_name}-${assignment.permission_set_key}" => assignment
  }

  instance_arn       = local.instance_arn
  permission_set_arn = local.permission_sets[each.value.permission_set_key]
  target_id          = local.account_ids[each.value.account_name]
  target_type        = "AWS_ACCOUNT"

  principal_type = each.value.principal_type
  principal_id = each.value.principal_type == "GROUP" ? (
    aws_identitystore_group.groups[each.value.principal_name].group_id
  ) : (
    aws_identitystore_user.users[each.value.principal_name].user_id
  )
}
```

### 4.8 MFA設定

```hcl
# modules/identity-center/mfa.tf

# MFA設定（Identity Center のコンソールから設定が必要な項目もある）
# Terraform では現在限定的なサポートのため、CLI/コンソールでの設定も組み合わせる

# MFA設定を確認するためのスクリプト
resource "local_file" "mfa_setup_script" {
  filename = "${path.module}/scripts/configure-mfa.sh"
  content  = <<-EOF
    #!/bin/bash
    # IAM Identity Center MFA設定スクリプト

    echo "=== IAM Identity Center MFA Configuration ==="
    echo ""
    echo "以下の設定をAWSコンソールで行ってください："
    echo ""
    echo "1. IAM Identity Center → 設定 → 認証"
    echo "2. MFA設定:"
    echo "   - MFAを要求: 毎回のサインイン時"
    echo "   - MFAタイプ: 認証アプリケーション（TOTP）"
    echo "   - ユーザーがMFAデバイスを登録できるようにする: 有効"
    echo ""
    echo "3. セッション設定:"
    echo "   - セッションの長さ: 8時間"
    echo ""
    echo "=== 設定完了後、以下のコマンドで確認 ==="
    echo "aws sso-admin describe-instance-access-control-attribute-configuration \\"
    echo "  --instance-arn ${local.instance_arn}"
  EOF
}
```

### 4.9 ABAC（属性ベースアクセス制御）設定

```hcl
# modules/identity-center/abac.tf

# ABAC用の属性設定
resource "aws_ssoadmin_instance_access_control_attributes" "abac" {
  instance_arn = local.instance_arn

  attribute {
    key = "Department"
    value {
      source = ["$${path:enterprise.department}"]
    }
  }

  attribute {
    key = "CostCenter"
    value {
      source = ["$${path:enterprise.costCenter}"]
    }
  }

  attribute {
    key = "Project"
    value {
      source = ["$${path:enterprise.division}"]
    }
  }
}

# ABAC対応 Permission Set の例
resource "aws_ssoadmin_permission_set" "abac_developer" {
  name             = "ABACDeveloperAccess"
  description      = "Developer access with ABAC for resource tagging"
  instance_arn     = local.instance_arn
  session_duration = "PT8H"
}

resource "aws_ssoadmin_permission_set_inline_policy" "abac_developer_policy" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.abac_developer.arn

  inline_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEC2WithMatchingTags"
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:RebootInstances",
          "ec2:TerminateInstances"
        ]
        Resource = "*"
        Condition = {
          "StringEquals" = {
            "ec2:ResourceTag/Department" = "$${aws:PrincipalTag/Department}"
          }
        }
      },
      {
        Sid    = "AllowEC2DescribeAll"
        Effect = "Allow"
        Action = [
          "ec2:Describe*"
        ]
        Resource = "*"
      },
      {
        Sid    = "RequireTagOnCreate"
        Effect = "Allow"
        Action = [
          "ec2:RunInstances",
          "ec2:CreateVolume",
          "ec2:CreateSnapshot"
        ]
        Resource = "*"
        Condition = {
          "StringEquals" = {
            "aws:RequestTag/Department" = "$${aws:PrincipalTag/Department}"
          }
        }
      }
    ]
  })
}
```

### 4.10 メインモジュール

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
    bucket         = "techcorp-terraform-state"
    key            = "identity-center/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TechCorp-IdentityCenter"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

module "identity_center" {
  source = "./modules/identity-center"

  # 変数は modules/identity-center/variables.tf で定義
}

# Outputs
output "access_portal_url" {
  description = "IAM Identity Center Access Portal URL"
  value       = "https://${data.aws_ssoadmin_instances.main.identity_store_ids[0]}.awsapps.com/start"
}

output "permission_sets" {
  description = "Created permission sets"
  value = {
    administrator    = module.identity_center.permission_set_arns.administrator
    developer        = module.identity_center.permission_set_arns.developer
    readonly         = module.identity_center.permission_set_arns.readonly
    security_auditor = module.identity_center.permission_set_arns.security_auditor
  }
}
```

---

## 5. 動作確認手順

### 5.1 デプロイ

```bash
# ディレクトリへ移動
cd techcorp-identity-center

# 初期化
terraform init

# プラン確認
terraform plan -out=tfplan

# 適用
terraform apply tfplan

# 出力値の確認
terraform output
```

### 5.2 アクセスポータルへのログイン

```bash
# アクセスポータルのURLを取得
ACCESS_PORTAL_URL=$(terraform output -raw access_portal_url)
echo "Access Portal: $ACCESS_PORTAL_URL"

# ブラウザでアクセスポータルを開く
open $ACCESS_PORTAL_URL
```

### 5.3 AWS CLI での SSO 設定

```bash
# AWS CLI の SSO 設定
aws configure sso
# SSO session name: techcorp
# SSO start URL: https://d-xxxxxxxxxx.awsapps.com/start
# SSO region: ap-northeast-1
# SSO registration scopes: sso:account:access

# プロファイルの確認
aws configure list-profiles

# SSO ログイン
aws sso login --profile techcorp-dev-admin

# 認証情報の確認
aws sts get-caller-identity --profile techcorp-dev-admin
```

### 5.4 権限テスト

```bash
# 開発アカウントでの権限テスト（開発者）
aws s3 ls --profile techcorp-dev-developer
aws ec2 describe-instances --profile techcorp-dev-developer

# 本番アカウントでの権限テスト（開発者 - 制限あり）
aws iam create-user --user-name test-user --profile techcorp-prod-developer
# → AccessDenied エラーが期待される

# セキュリティ監査権限のテスト
aws securityhub get-findings --profile techcorp-prod-security-auditor
aws config describe-compliance-by-config-rule --profile techcorp-prod-security-auditor
```

---

## 6. 課題

### 6.1 ハンズオン課題

#### 課題1: 緊急アクセス用 Break Glass アカウント（難易度：初級）

**目標**: 緊急時用の高権限アカウントを設定する

**要件**:
- 緊急時のみ使用する管理者アカウント
- 使用時にアラート通知
- 使用履歴の完全な監査ログ

**実装ポイント**:
```hcl
# Break Glass用のPermission Set
resource "aws_ssoadmin_permission_set" "break_glass" {
  name             = "BreakGlassAccess"
  description      = "Emergency access - use only in critical situations"
  instance_arn     = local.instance_arn
  session_duration = "PT1H" # 緊急アクセスは1時間に制限
}

# 使用時のCloudWatch Alarm設定
# ...
```

---

#### 課題2: 外部IdP（Okta）との連携（難易度：中級）

**目標**: OktaをIdentity Providerとして設定し、SCIM自動同期を構成する

**要件**:
- SAML 2.0による認証連携
- SCIMによるユーザー・グループの自動プロビジョニング
- 属性マッピングの設定

**設定手順の概要**:
1. Okta側でAWS IAM Identity Centerアプリケーションを追加
2. SAMLメタデータの交換
3. SCIM APIトークンの発行
4. 属性マッピングの設定

---

#### 課題3: 一時的アクセス権限の付与（難易度：中級〜上級）

**目標**: 限定的な期間だけ追加権限を付与する仕組みを作る

**要件**:
- 申請・承認ワークフロー
- 自動的な権限の付与・削除
- 監査証跡の記録

**実装アプローチ**:
```
┌─────────────────────────────────────────────────────────────────┐
│              Temporary Access Workflow                          │
│                                                                 │
│  1. 申請  →  2. 承認  →  3. 権限付与  →  4. 自動削除           │
│     │           │            │              │                   │
│     ▼           ▼            ▼              ▼                   │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐         │
│  │API GW   │ │Step     │ │Lambda    │ │EventBridge   │         │
│  │+ Lambda │ │Functions│ │+ SSO API │ │Scheduled     │         │
│  └─────────┘ └─────────┘ └──────────┘ └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6.2 トラブルシューティング課題

#### 問題1: Permission Set が反映されない

**症状**: Permission Setを更新したが、ユーザーの権限に反映されない

**調査のヒント**:
1. Permission Setのプロビジョニング状態を確認
2. アカウント割り当ての状態を確認
3. IAMロールの更新状態を確認

<details>
<summary>原因と解決策</summary>

**原因**: Permission Setの変更後、アカウントへの再プロビジョニングが必要

```bash
# Permission Setのプロビジョニング状態確認
aws sso-admin list-permission-sets-provisioned-to-account \
  --instance-arn $INSTANCE_ARN \
  --account-id $ACCOUNT_ID

# 手動でプロビジョニング実行
aws sso-admin provision-permission-set \
  --instance-arn $INSTANCE_ARN \
  --permission-set-arn $PERMISSION_SET_ARN \
  --target-type ALL_PROVISIONED_ACCOUNTS

# プロビジョニングステータスの確認
aws sso-admin describe-permission-set-provisioning-status \
  --instance-arn $INSTANCE_ARN \
  --provision-request-id $REQUEST_ID
```

**Terraformでの対策**:
```hcl
# プロビジョニングのトリガー（null_resource使用）
resource "null_resource" "provision_permission_set" {
  triggers = {
    permission_set_arn = aws_ssoadmin_permission_set.developer.arn
    inline_policy      = md5(aws_ssoadmin_permission_set_inline_policy.developer_deny_iam.inline_policy)
  }

  provisioner "local-exec" {
    command = <<-EOF
      aws sso-admin provision-permission-set \
        --instance-arn ${local.instance_arn} \
        --permission-set-arn ${aws_ssoadmin_permission_set.developer.arn} \
        --target-type ALL_PROVISIONED_ACCOUNTS
    EOF
  }
}
```
</details>

---

#### 問題2: SSOログインでエラーが発生

**症状**: アクセスポータルでログイン後、「An error occurred」と表示される

**調査のヒント**:
1. CloudTrail でSSO関連イベントを確認
2. ブラウザのCookieとキャッシュをクリア
3. セッション設定を確認

<details>
<summary>原因と解決策</summary>

**原因1**: MFAデバイスの時刻ずれ
```bash
# TOTPは30秒の時刻ウィンドウを使用
# デバイスの時刻同期を確認
```

**原因2**: セッションタイムアウト
```bash
# セッション設定の確認
aws sso-admin describe-permission-set \
  --instance-arn $INSTANCE_ARN \
  --permission-set-arn $PERMISSION_SET_ARN \
  --query 'PermissionSet.SessionDuration'
```

**原因3**: ブラウザのサードパーティCookie設定
- シークレットモードでテスト
- awsapps.comドメインのCookieを許可
</details>

---

#### 問題3: SCIMプロビジョニングが失敗

**症状**: 外部IdPからのユーザー同期が完了しない

**調査のヒント**:
1. SCIM APIのエラーログを確認
2. 属性マッピングを確認
3. ネットワーク設定を確認

<details>
<summary>原因と解決策</summary>

**原因1**: SCIM APIトークンの有効期限切れ
```bash
# 新しいトークンを生成
# IAM Identity Center コンソール → 設定 → プロビジョニング → トークンを再生成
```

**原因2**: 必須属性の欠落
```json
// SCIM リクエストに必要な属性
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "user@example.com",
  "name": {
    "givenName": "First",
    "familyName": "Last"
  },
  "emails": [{
    "value": "user@example.com",
    "primary": true
  }],
  "displayName": "First Last",
  "active": true
}
```

**原因3**: IdP側のエラー
- Okta/Azure AD のプロビジョニングログを確認
- リトライ設定を調整
</details>

---

### 6.3 設計課題

#### 課題: ゼロトラストアーキテクチャへの拡張

**シナリオ**: 経営層から「ゼロトラストセキュリティモデルに移行したい」という要望がありました。

**検討事項**:
1. デバイス信頼の検証（AWS Verified Access との連携）
2. 継続的な認証（セッション中の再認証）
3. コンテキストベースのアクセス制御
4. マイクロセグメンテーション

**設計案を作成してください**:

```
┌─────────────────────────────────────────────────────────────────┐
│                Zero Trust Architecture Design                    │
│                                                                 │
│  [ここに設計図を作成]                                            │
│                                                                 │
│  考慮点：                                                        │
│  - 「Never trust, always verify」の原則                          │
│  - デバイスポスチャの評価                                        │
│  - 最小権限の原則の徹底                                          │
│  - リアルタイムのリスク評価                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 学習リソース

### 公式ドキュメント
- [IAM Identity Center User Guide](https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html)
- [IAM Identity Center API Reference](https://docs.aws.amazon.com/singlesignon/latest/APIReference/welcome.html)
- [AWS Organizations User Guide](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html)
- [Terraform AWS SSO Admin Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_permission_set)

### ベストプラクティス
- [AWS Security Best Practices for IAM Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/security-best-practices.html)
- [Multi-Account Strategy](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html)

---

## 8. 解答例

### 課題1: Break Glass アカウント

```hcl
# break-glass.tf

# Break Glass グループ
resource "aws_identitystore_group" "break_glass" {
  identity_store_id = local.identity_store_id
  display_name      = "BreakGlass-Admins"
  description       = "Emergency access administrators - use only in critical situations"
}

# Break Glass Permission Set
resource "aws_ssoadmin_permission_set" "break_glass" {
  name             = "BreakGlassAccess"
  description      = "EMERGENCY USE ONLY - Full administrative access for critical incidents"
  instance_arn     = local.instance_arn
  session_duration = "PT1H"

  tags = {
    Purpose     = "emergency-access"
    ManagedBy   = "terraform"
    AlertOnUse  = "true"
  }
}

resource "aws_ssoadmin_managed_policy_attachment" "break_glass_admin" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.break_glass.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Break Glassの使用を検知するCloudWatch Alarm
resource "aws_cloudwatch_log_metric_filter" "break_glass_usage" {
  name           = "BreakGlassUsageFilter"
  pattern        = "{ ($.eventName = AssumeRole) && ($.requestParameters.roleSessionName = \"*BreakGlass*\") }"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name      = "BreakGlassUsageCount"
    namespace = "Security/BreakGlass"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "break_glass_alert" {
  alarm_name          = "BreakGlassAccessUsed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BreakGlassUsageCount"
  namespace           = "Security/BreakGlass"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "CRITICAL: Break Glass access has been used"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.security_alerts.arn]
  ok_actions    = [aws_sns_topic.security_alerts.arn]
}

# SNS Topic for security alerts
resource "aws_sns_topic" "security_alerts" {
  name = "security-break-glass-alerts"
}

resource "aws_sns_topic_subscription" "security_email" {
  topic_arn = aws_sns_topic.security_alerts.arn
  protocol  = "email"
  endpoint  = "security-team@techcorp.example.com"
}

# 使用記録用のDynamoDBテーブル
resource "aws_dynamodb_table" "break_glass_log" {
  name         = "break-glass-usage-log"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "sessionId"
  range_key    = "timestamp"

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Purpose = "break-glass-audit"
  }
}
```

### 課題3: 一時的アクセス権限の付与

```hcl
# temporary-access.tf

# 一時アクセス申請用API Gateway
resource "aws_apigatewayv2_api" "temp_access" {
  name          = "temporary-access-api"
  protocol_type = "HTTP"
}

# Step Functions ワークフロー定義
resource "aws_sfn_state_machine" "temp_access_workflow" {
  name     = "temporary-access-workflow"
  role_arn = aws_iam_role.sfn_role.arn

  definition = jsonencode({
    Comment = "Temporary access request workflow"
    StartAt = "ValidateRequest"
    States = {
      ValidateRequest = {
        Type     = "Task"
        Resource = aws_lambda_function.validate_request.arn
        Next     = "NotifyApprover"
        Catch = [{
          ErrorEquals = ["ValidationError"]
          Next        = "RequestDenied"
        }]
      }
      NotifyApprover = {
        Type     = "Task"
        Resource = "arn:aws:states:::sns:publish.waitForTaskToken"
        Parameters = {
          TopicArn = aws_sns_topic.approval_requests.arn
          Message = {
            "taskToken.$"  = "$$.Task.Token"
            "requestId.$"  = "$.requestId"
            "requester.$"  = "$.requester"
            "reason.$"     = "$.reason"
            "duration.$"   = "$.duration"
            "permissions.$" = "$.permissions"
          }
        }
        Next           = "CheckApproval"
        TimeoutSeconds = 86400 # 24時間で自動拒否
        Catch = [{
          ErrorEquals = ["States.Timeout"]
          Next        = "RequestExpired"
        }]
      }
      CheckApproval = {
        Type = "Choice"
        Choices = [{
          Variable      = "$.approved"
          BooleanEquals = true
          Next          = "GrantAccess"
        }]
        Default = "RequestDenied"
      }
      GrantAccess = {
        Type     = "Task"
        Resource = aws_lambda_function.grant_access.arn
        Next     = "WaitForExpiry"
      }
      WaitForExpiry = {
        Type           = "Wait"
        TimestampPath = "$.expiryTime"
        Next           = "RevokeAccess"
      }
      RevokeAccess = {
        Type     = "Task"
        Resource = aws_lambda_function.revoke_access.arn
        End      = true
      }
      RequestDenied = {
        Type     = "Task"
        Resource = aws_lambda_function.notify_denial.arn
        End      = true
      }
      RequestExpired = {
        Type     = "Task"
        Resource = aws_lambda_function.notify_expiry.arn
        End      = true
      }
    }
  })
}

# 権限付与Lambda
resource "aws_lambda_function" "grant_access" {
  filename         = "${path.module}/lambda/grant-access.zip"
  function_name    = "temp-access-grant"
  role             = aws_iam_role.lambda_temp_access.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 60

  environment {
    variables = {
      INSTANCE_ARN       = local.instance_arn
      IDENTITY_STORE_ID  = local.identity_store_id
    }
  }
}

# Lambda実装例（JavaScript）
# lambda/grant-access/index.js
/*
const { SSOAdminClient, CreateAccountAssignmentCommand } = require("@aws-sdk/client-sso-admin");

exports.handler = async (event) => {
  const client = new SSOAdminClient({});

  const { userId, accountId, permissionSetArn, duration } = event;

  // アカウント割り当ての作成
  await client.send(new CreateAccountAssignmentCommand({
    InstanceArn: process.env.INSTANCE_ARN,
    TargetId: accountId,
    TargetType: "AWS_ACCOUNT",
    PermissionSetArn: permissionSetArn,
    PrincipalType: "USER",
    PrincipalId: userId,
  }));

  // 有効期限の計算
  const expiryTime = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();

  return {
    ...event,
    expiryTime,
    status: "granted"
  };
};
*/
```

---

## 9. 追加学習

### IAM Identity Center の高度な機能

1. **カスタムSAMLアプリケーション**
   - 非AWSアプリケーションへのSSO
   - カスタム属性マッピング

2. **AWS Verified Access との連携**
   - デバイス信頼の検証
   - ゼロトラストネットワークアクセス

3. **Service Catalog との統合**
   - セルフサービスポータル
   - 承認済みリソースのプロビジョニング

### 次のステップ
- 課題38-39で学んだCognito認証との使い分けを理解
- マルチリージョン展開の検討
- AWS Control Tower との統合

---

## 10. 参考情報

### GCPとの比較まとめ

| 機能 | GCP | AWS |
|------|-----|-----|
| 企業SSO | Cloud Identity | IAM Identity Center |
| マルチプロジェクトアクセス | Organization IAM | Account Assignments |
| 権限テンプレート | Custom Roles | Permission Sets |
| IdP連携 | Cloud Identity SAML | Identity Center SAML/SCIM |
| ディレクトリ同期 | GCDS | AD Connector / SCIM |
| 監査ログ | Cloud Audit Logs | CloudTrail |

### セキュリティチェックリスト

- [ ] MFAが全ユーザーで必須化されている
- [ ] Permission Setで最小権限の原則が適用されている
- [ ] セッション時間が適切に設定されている（本番は短く）
- [ ] Break Glassアカウントが設定され、監視されている
- [ ] CloudTrailで全SSOイベントが記録されている
- [ ] 定期的なアクセス権レビューが実施されている
- [ ] 退職者のアクセス無効化プロセスが確立されている

---

## 11. FAQ

**Q: IAM Identity CenterとCognitoの使い分けは？**

A:
- **IAM Identity Center**: 従業員がAWSリソースにアクセスする場合（内部向け）
- **Cognito**: アプリケーションのエンドユーザー認証（外部向け）

両者は異なるユースケースのため、同じ組織で両方使用することが一般的です。

**Q: Identity CenterのIdentity Storeと外部IdPどちらを使うべき？**

A:
- **Identity Store（ビルトイン）**: 小規模組織、AWSのみの環境
- **外部IdP**: 既存の企業ディレクトリ（AD/Okta/Azure AD）がある場合

既存のIdPがある場合は、SCIMで同期することで一元管理できます。

**Q: Permission SetはどのAWSアカウントに作成される？**

A: Permission Set自体はIAM Identity Center（管理アカウント）に存在しますが、アカウント割り当て時に各メンバーアカウントにIAMロールが自動作成されます。

**Q: セッション時間の推奨値は？**

A:
- 本番環境: 1-4時間
- 開発環境: 8時間
- サンドボックス: 4時間
- Break Glass: 1時間

---

## 12. 振り返りチェックリスト

以下の項目を確認して、学習内容の定着度を確認してください：

- [ ] IAM Identity Centerの基本概念（Identity Source, Permission Set, Account Assignment）を説明できる
- [ ] Terraformでユーザー・グループを作成できる
- [ ] 適切なPermission Setを設計・作成できる
- [ ] アカウント割り当てを設定できる
- [ ] ABAC（属性ベースアクセス制御）の設定ができる
- [ ] 外部IdP連携の概念を理解している
- [ ] Break Glassアカウントの設計ができる
- [ ] 一時的アクセス権限の付与フローを設計できる
- [ ] トラブルシューティングの基本手順を理解している
