# 課題20: 金融系SaaSのセキュア基盤構築

**難易度: 🟢 初級〜中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | セキュリティ |
| 処理タイプ | リアルタイム |
| 使用IaC | CloudFormation |
| 想定所要時間 | 5-6時間 |

---

## 2. シナリオ

### 企業プロファイル

| 項目 | 内容 |
|------|------|
| **企業名** | InvestPro株式会社 |
| **業種** | 投資管理SaaS |
| **従業員数** | 60名（エンジニア20名） |
| **顧客数** | 機関投資家・資産運用会社100社 |
| **管理資産額** | 10兆円相当のデータ管理 |
| **規制要件** | 金融庁ガイドライン、FISC安全対策基準 |

### 現状の課題

```
InvestPro株式会社は機関投資家向けの投資管理SaaSを提供しています。
金融庁の監督指針対応において以下の課題を抱えています：

1. ネットワークセキュリティの不備
   - パブリックサブネットにアプリケーションが配置
   - インターネット経由でのAWSサービスアクセス
   - セグメンテーションが不十分

2. 認証情報管理の問題
   - データベースパスワードが環境変数にハードコード
   - APIキーがソースコードに含まれている
   - シークレットのローテーションが手動

3. アクセス制御の課題
   - IPアドレス制限が不完全
   - WAFが未導入
   - 監査ログが不十分

4. コンプライアンス対応
   - 金融庁ガイドラインへの対応が不完全
   - セキュリティ監査で指摘事項あり
   - 顧客からのセキュリティ質問への回答に時間がかかる
```

### ビジネス目標

| KPI | 現状 | 目標 |
|-----|------|------|
| セキュリティ監査スコア | 60点 | 90点以上 |
| 金融庁ガイドライン準拠率 | 70% | 100% |
| シークレットローテーション | 手動（年1回） | 自動（90日ごと） |
| インシデント検知時間 | 数時間 | 5分以内 |
| セキュリティ質問対応 | 3日 | 即日 |

---

## 3. 達成目標（ゴール）

### 主要な学習成果

```
この課題を完了すると、以下ができるようになります：

1. セキュアなVPC設計
   - マルチAZ構成とサブネット分離
   - VPCエンドポイントによるプライベートアクセス
   - ネットワークACLとセキュリティグループの多層防御

2. AWS PrivateLinkの活用
   - VPCエンドポイントサービスの構築
   - Interface/Gateway Endpoint の使い分け
   - プライベートなサービス連携

3. AWS WAFによるWebアプリケーション保護
   - マネージドルールの適用
   - カスタムルールの作成
   - レート制限とIP制限

4. AWS Secrets Managerによる認証情報管理
   - シークレットの安全な保存
   - 自動ローテーションの設定
   - アプリケーション統合
```

### 合格基準

| 項目 | 基準 |
|------|------|
| VPC設計 | プライベートサブネットにアプリが配置されていること |
| PrivateLink | AWSサービスへのアクセスがVPCエンドポイント経由であること |
| WAF | 主要な攻撃パターンがブロックされること |
| Secrets | DBパスワードがSecrets Managerで管理されていること |
| 監査 | CloudTrailで全アクションが記録されていること |

---

## 4. 使用するAWSサービス

### コア技術スタック

```yaml
ネットワーク:
  - Amazon VPC: 仮想ネットワーク
  - VPC Endpoints: プライベートサービスアクセス
  - AWS PrivateLink: サービス間プライベート接続
  - AWS Transit Gateway: VPC間接続（オプション）
  - Network Firewall: 高度なトラフィック制御（オプション）

Webアプリケーション保護:
  - AWS WAF: Webアプリケーションファイアウォール
  - AWS Shield: DDoS保護
  - Amazon CloudFront: CDN + WAF統合

認証情報管理:
  - AWS Secrets Manager: シークレット管理・ローテーション
  - AWS Systems Manager Parameter Store: 設定パラメータ
  - AWS KMS: 暗号化キー管理

アクセス制御:
  - AWS IAM: 認証・認可
  - IAM Identity Center: SSO
  - AWS Organizations: マルチアカウント管理

監視・監査:
  - AWS CloudTrail: API監査ログ
  - Amazon GuardDuty: 脅威検知
  - AWS Config: 構成管理
  - AWS Security Hub: セキュリティ統合ダッシュボード
```

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| プライベート接続 | PrivateLink | Private Service Connect |
| WAF | AWS WAF | Cloud Armor |
| シークレット管理 | Secrets Manager | Secret Manager |
| 脅威検知 | GuardDuty | Security Command Center |
| 構成監査 | Config | Security Health Analytics |

---

## 5. 前提条件

### 技術要件

```bash
# 必要なCLIツール
aws --version          # 2.x
terraform --version    # 1.5+

# AWS設定
aws configure
export AWS_REGION=ap-northeast-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

### 事前準備

```bash
# プロジェクト構造
investpro-secure-infra/
├── terraform/
│   ├── main.tf
│   ├── vpc.tf
│   ├── endpoints.tf
│   ├── waf.tf
│   ├── secrets.tf
│   ├── security_groups.tf
│   ├── iam.tf
│   └── variables.tf
├── policies/
│   ├── waf-rules.json
│   └── iam-policies/
└── docs/
    └── security-architecture.md
```

---

## 6. アーキテクチャ図

### 全体構成

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Internet                                        │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                            ┌─────────▼─────────┐
                            │   AWS Shield      │
                            │   (DDoS Protection)│
                            └─────────┬─────────┘
                                      │
                            ┌─────────▼─────────┐
                            │   Amazon          │
                            │   CloudFront      │
                            │   + AWS WAF       │
                            │                   │
                            │  ┌─────────────┐  │
                            │  │ WAF Rules:  │  │
                            │  │ • SQL Inj   │  │
                            │  │ • XSS       │  │
                            │  │ • Rate Limit│  │
                            │  │ • IP Block  │  │
                            │  │ • Geo Block │  │
                            │  └─────────────┘  │
                            └─────────┬─────────┘
                                      │ HTTPS Only
                                      │
┌─────────────────────────────────────┼───────────────────────────────────────┐
│                                 VPC │ (10.0.0.0/16)                         │
│                                     │                                        │
│  ┌──────────────────────────────────┼───────────────────────────────────┐   │
│  │              Public Subnets      │                                    │   │
│  │              (10.0.0.0/24, 10.0.1.0/24)                              │   │
│  │                                  │                                    │   │
│  │        ┌─────────────────────────▼─────────────────────────┐        │   │
│  │        │            Application Load Balancer               │        │   │
│  │        │            (Internal: No)                          │        │   │
│  │        │                                                    │        │   │
│  │        │  ┌─────────────────────────────────────────────┐  │        │   │
│  │        │  │ Security Group: alb-sg                       │  │        │   │
│  │        │  │ Inbound: 443 from CloudFront IPs only       │  │        │   │
│  │        │  └─────────────────────────────────────────────┘  │        │   │
│  │        └────────────────────────┬──────────────────────────┘        │   │
│  │                                 │                                    │   │
│  │        NAT Gateway              │              NAT Gateway           │   │
│  │        (AZ-a)                   │              (AZ-c)               │   │
│  └─────────────────────────────────┼────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┼────────────────────────────────────┐   │
│  │              Private Subnets (Application)                           │   │
│  │              (10.0.10.0/24, 10.0.11.0/24)                           │   │
│  │                                 │                                    │   │
│  │        ┌────────────────────────▼────────────────────────┐          │   │
│  │        │              ECS Fargate Tasks                   │          │   │
│  │        │  ┌─────────────────────────────────────────────┐│          │   │
│  │        │  │ Security Group: app-sg                      ││          │   │
│  │        │  │ Inbound: 8080 from alb-sg only             ││          │   │
│  │        │  │ Outbound: 443 to VPC Endpoints only        ││          │   │
│  │        │  └─────────────────────────────────────────────┘│          │   │
│  │        │                                                  │          │   │
│  │        │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │          │   │
│  │        │  │ API      │  │ Portfolio│  │ Report   │      │          │   │
│  │        │  │ Service  │  │ Service  │  │ Service  │      │          │   │
│  │        │  └──────────┘  └──────────┘  └──────────┘      │          │   │
│  │        └──────────────────────┬───────────────────────────┘          │   │
│  │                               │                                      │   │
│  └───────────────────────────────┼──────────────────────────────────────┘   │
│                                  │                                          │
│  ┌───────────────────────────────┼──────────────────────────────────────┐   │
│  │              Private Subnets (Data)                                  │   │
│  │              (10.0.20.0/24, 10.0.21.0/24)                           │   │
│  │                               │                                      │   │
│  │        ┌──────────────────────▼──────────────────────┐              │   │
│  │        │              Amazon RDS (PostgreSQL)         │              │   │
│  │        │              Multi-AZ                        │              │   │
│  │        │  ┌─────────────────────────────────────────┐│              │   │
│  │        │  │ Security Group: db-sg                   ││              │   │
│  │        │  │ Inbound: 5432 from app-sg only         ││              │   │
│  │        │  │ Encrypted: KMS Customer Managed Key    ││              │   │
│  │        │  └─────────────────────────────────────────┘│              │   │
│  │        └─────────────────────────────────────────────┘              │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    VPC Endpoints (Interface)                          │   │
│  │                                                                       │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │   │ ECR API     │  │ ECR DKR     │  │ Secrets     │  │ CloudWatch│  │   │
│  │   │ Endpoint    │  │ Endpoint    │  │ Manager     │  │ Logs      │  │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │   │
│  │                                                                       │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │   │ KMS         │  │ SSM         │  │ STS         │  │ S3        │  │   │
│  │   │ Endpoint    │  │ Endpoint    │  │ Endpoint    │  │ Gateway   │  │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │   │
│  │                                                                       │   │
│  │   Security Group: vpce-sg                                            │   │
│  │   Inbound: 443 from VPC CIDR (10.0.0.0/16)                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────────────┐
                    │         Secrets Manager              │
                    │                                      │
                    │  ┌────────────────────────────────┐ │
                    │  │ investpro/db/credentials       │ │
                    │  │ investpro/api/keys             │ │
                    │  │ investpro/external/tokens      │ │
                    │  │                                │ │
                    │  │ Rotation: 90 days              │ │
                    │  │ Encryption: KMS CMK            │ │
                    │  └────────────────────────────────┘ │
                    └──────────────────────────────────────┘
```

### セキュリティレイヤー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Defense in Depth                                     │
│                                                                              │
│  Layer 1: Edge Protection                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ • AWS Shield (Standard/Advanced) - DDoS Protection                     │ │
│  │ • CloudFront - Geographic Restrictions                                 │ │
│  │ • AWS WAF - Application Layer Protection                               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│  Layer 2: Network Security                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ • VPC - Network Isolation                                              │ │
│  │ • Subnets - Tier Separation (Public/Private/Data)                      │ │
│  │ • Network ACLs - Stateless Packet Filtering                            │ │
│  │ • Security Groups - Stateful Instance-level Firewall                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│  Layer 3: Access Control                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ • IAM Roles/Policies - Least Privilege                                 │ │
│  │ • VPC Endpoints - Private AWS Service Access                           │ │
│  │ • Secrets Manager - Credential Management                              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│  Layer 4: Data Protection                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ • KMS - Encryption at Rest                                             │ │
│  │ • TLS 1.2+ - Encryption in Transit                                     │ │
│  │ • S3 Bucket Policies - Data Access Control                             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│  Layer 5: Monitoring & Response                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ • CloudTrail - API Logging                                             │ │
│  │ • GuardDuty - Threat Detection                                         │ │
│  │ • Security Hub - Centralized Security View                             │ │
│  │ • Config - Compliance Monitoring                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. ハンズオン手順

### Step 1: VPCとサブネット構築

```hcl
# terraform/vpc.tf

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "investpro-vpc"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "investpro-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = false  # パブリックIPは付与しない

  tags = {
    Name = "investpro-public-${count.index + 1}"
    Tier = "public"
  }
}

# Private Subnets (Application)
resource "aws_subnet" "private_app" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "investpro-private-app-${count.index + 1}"
    Tier = "application"
  }
}

# Private Subnets (Data)
resource "aws_subnet" "private_data" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 20}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "investpro-private-data-${count.index + 1}"
    Tier = "data"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"

  tags = {
    Name = "investpro-nat-eip-${count.index + 1}"
  }
}

# NAT Gateway (Multi-AZ)
resource "aws_nat_gateway" "main" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "investpro-nat-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "investpro-public-rt"
  }
}

resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "investpro-private-rt-${count.index + 1}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_app" {
  count          = 2
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_route_table_association" "private_data" {
  count          = 2
  subnet_id      = aws_subnet.private_data[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.vpc_flow_logs.arn
  iam_role_arn             = aws_iam_role.vpc_flow_logs.arn
  max_aggregation_interval = 60

  tags = {
    Name = "investpro-vpc-flow-logs"
  }
}

resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/investpro-flow-logs"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.logs.arn
}
```

### Step 2: セキュリティグループ設計

```hcl
# terraform/security_groups.tf

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "investpro-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  # CloudFrontからのみ許可（マネージドプレフィックスリスト使用）
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
    description     = "HTTPS from CloudFront only"
  }

  egress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "To application tier"
  }

  tags = {
    Name = "investpro-alb-sg"
  }
}

# Application Security Group
resource "aws_security_group" "app" {
  name        = "investpro-app-sg"
  description = "Security group for application tier"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "From ALB only"
  }

  # VPC Endpointsへのアクセスのみ許可
  egress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.vpce.id]
    description     = "To VPC Endpoints"
  }

  # DBへのアクセス
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.db.id]
    description     = "To RDS"
  }

  tags = {
    Name = "investpro-app-sg"
  }
}

# Database Security Group
resource "aws_security_group" "db" {
  name        = "investpro-db-sg"
  description = "Security group for RDS"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "From application tier only"
  }

  # Egress: なし（DBからの外部通信は不要）

  tags = {
    Name = "investpro-db-sg"
  }
}

# VPC Endpoint Security Group
resource "aws_security_group" "vpce" {
  name        = "investpro-vpce-sg"
  description = "Security group for VPC Endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "HTTPS from VPC"
  }

  tags = {
    Name = "investpro-vpce-sg"
  }
}

# Network ACL for Data Tier (追加の防御層)
resource "aws_network_acl" "data" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private_data[*].id

  # PostgreSQL from Application Subnet only
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.10.0/23"  # Application subnets
    from_port  = 5432
    to_port    = 5432
  }

  # Ephemeral ports for responses
  ingress {
    protocol   = "tcp"
    rule_no    = 200
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 1024
    to_port    = 65535
  }

  # Deny all other inbound
  ingress {
    protocol   = -1
    rule_no    = 999
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  # Allow responses to Application tier
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.10.0/23"
    from_port  = 1024
    to_port    = 65535
  }

  # Deny all other outbound
  egress {
    protocol   = -1
    rule_no    = 999
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = {
    Name = "investpro-data-nacl"
  }
}
```

### Step 3: VPCエンドポイント設定

```hcl
# terraform/endpoints.tf

# S3 Gateway Endpoint
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowS3Access"
        Effect    = "Allow"
        Principal = "*"
        Action    = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource  = [
          "arn:aws:s3:::investpro-*",
          "arn:aws:s3:::investpro-*/*"
        ]
      }
    ]
  })

  tags = {
    Name = "investpro-s3-endpoint"
  }
}

# Interface Endpoints
locals {
  interface_endpoints = [
    "ecr.api",
    "ecr.dkr",
    "secretsmanager",
    "logs",
    "kms",
    "ssm",
    "sts",
    "monitoring"
  ]
}

resource "aws_vpc_endpoint" "interface" {
  for_each = toset(local.interface_endpoints)

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_app[*].id
  security_group_ids  = [aws_security_group.vpce.id]
  private_dns_enabled = true

  tags = {
    Name = "investpro-${replace(each.key, ".", "-")}-endpoint"
  }
}

# VPC Endpoint Policy for Secrets Manager (厳格なアクセス制御)
resource "aws_vpc_endpoint_policy" "secretsmanager" {
  vpc_endpoint_id = aws_vpc_endpoint.interface["secretsmanager"].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowInvestProSecrets"
        Effect    = "Allow"
        Principal = "*"
        Action    = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource  = "arn:aws:secretsmanager:${var.region}:${var.account_id}:secret:investpro/*"
        Condition = {
          StringEquals = {
            "aws:PrincipalAccount" = var.account_id
          }
        }
      }
    ]
  })
}
```

### Step 4: AWS WAF設定

```hcl
# terraform/waf.tf

# WAF Web ACL
resource "aws_wafv2_web_acl" "main" {
  name        = "investpro-web-acl"
  description = "WAF rules for InvestPro"
  scope       = "CLOUDFRONT"  # CloudFront用

  default_action {
    allow {}
  }

  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rate Limiting Rule
  rule {
    name     = "RateLimitRule"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000  # 5分間で2000リクエスト
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }

  # Geo Restriction (日本以外をブロック)
  rule {
    name     = "GeoRestriction"
    priority = 5

    action {
      block {}
    }

    statement {
      not_statement {
        statement {
          geo_match_statement {
            country_codes = ["JP"]
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoRestrictionMetric"
      sampled_requests_enabled   = true
    }
  }

  # IP Block List
  rule {
    name     = "IPBlockList"
    priority = 6

    action {
      block {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.block_list.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "IPBlockListMetric"
      sampled_requests_enabled   = true
    }
  }

  # Custom Rule: Block sensitive paths
  rule {
    name     = "BlockSensitivePaths"
    priority = 7

    action {
      block {}
    }

    statement {
      or_statement {
        statement {
          byte_match_statement {
            search_string         = "/admin"
            positional_constraint = "STARTS_WITH"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
        statement {
          byte_match_statement {
            search_string         = "/.env"
            positional_constraint = "CONTAINS"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BlockSensitivePathsMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "investpro-web-acl"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "investpro-waf"
  }
}

# IP Block List
resource "aws_wafv2_ip_set" "block_list" {
  name               = "investpro-ip-block-list"
  description        = "Blocked IP addresses"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = []  # 動的に追加

  tags = {
    Name = "investpro-ip-block-list"
  }
}

# WAF Logging
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs.arn]
  resource_arn            = aws_wafv2_web_acl.main.arn

  logging_filter {
    default_behavior = "KEEP"

    filter {
      behavior = "KEEP"

      condition {
        action_condition {
          action = "BLOCK"
        }
      }

      requirement = "MEETS_ANY"
    }
  }
}

resource "aws_cloudwatch_log_group" "waf_logs" {
  name              = "aws-waf-logs-investpro"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.logs.arn
}
```

### Step 5: Secrets Manager設定

```hcl
# terraform/secrets.tf

# KMS Key for Secrets
resource "aws_kms_key" "secrets" {
  description             = "KMS key for Secrets Manager"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Secrets Manager"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "investpro-secrets-kms"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/investpro-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# Database Credentials Secret
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "investpro/db/credentials"
  description = "PostgreSQL database credentials"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = {
    Name = "investpro-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "app_user"
    password = random_password.db_password.result
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = "investpro"
  })
}

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Automatic Rotation
resource "aws_secretsmanager_secret_rotation" "db_credentials" {
  secret_id           = aws_secretsmanager_secret.db_credentials.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 90
  }
}

# Rotation Lambda Function
resource "aws_lambda_function" "secret_rotation" {
  function_name = "investpro-secret-rotation"
  role          = aws_iam_role.secret_rotation.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = 30

  filename         = data.archive_file.secret_rotation.output_path
  source_code_hash = data.archive_file.secret_rotation.output_base64sha256

  vpc_config {
    subnet_ids         = aws_subnet.private_app[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.region}.amazonaws.com"
    }
  }

  tags = {
    Name = "investpro-secret-rotation"
  }
}

# Lambda Rotation Code
data "archive_file" "secret_rotation" {
  type        = "zip"
  output_path = "${path.module}/secret_rotation.zip"

  source {
    content = <<-EOF
import boto3
import json
import string
import secrets

def lambda_handler(event, context):
    arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']

    service_client = boto3.client('secretsmanager')

    if step == "createSecret":
        create_secret(service_client, arn, token)
    elif step == "setSecret":
        set_secret(service_client, arn, token)
    elif step == "testSecret":
        test_secret(service_client, arn, token)
    elif step == "finishSecret":
        finish_secret(service_client, arn, token)

def create_secret(service_client, arn, token):
    current_dict = get_secret_dict(service_client, arn, "AWSCURRENT")

    # Generate new password
    alphabet = string.ascii_letters + string.digits + "!#$%&*()-_=+[]{}<>:?"
    new_password = ''.join(secrets.choice(alphabet) for i in range(32))

    current_dict['password'] = new_password

    service_client.put_secret_value(
        SecretId=arn,
        ClientRequestToken=token,
        SecretString=json.dumps(current_dict),
        VersionStages=['AWSPENDING']
    )

def set_secret(service_client, arn, token):
    pending_dict = get_secret_dict(service_client, arn, "AWSPENDING", token)

    # Update database password
    import psycopg2
    conn = psycopg2.connect(
        host=pending_dict['host'],
        database=pending_dict['dbname'],
        user='admin',  # Master user
        password=get_master_password()
    )
    with conn.cursor() as cur:
        cur.execute(f"ALTER USER {pending_dict['username']} WITH PASSWORD %s",
                   (pending_dict['password'],))
    conn.commit()
    conn.close()

def test_secret(service_client, arn, token):
    pending_dict = get_secret_dict(service_client, arn, "AWSPENDING", token)

    import psycopg2
    conn = psycopg2.connect(
        host=pending_dict['host'],
        database=pending_dict['dbname'],
        user=pending_dict['username'],
        password=pending_dict['password']
    )
    conn.close()

def finish_secret(service_client, arn, token):
    metadata = service_client.describe_secret(SecretId=arn)

    for version in metadata['VersionIdsToStages']:
        if "AWSCURRENT" in metadata['VersionIdsToStages'][version]:
            if version == token:
                return

            service_client.update_secret_version_stage(
                SecretId=arn,
                VersionStage="AWSCURRENT",
                MoveToVersionId=token,
                RemoveFromVersionId=version
            )
            break

def get_secret_dict(service_client, arn, stage, token=None):
    if token:
        secret = service_client.get_secret_value(
            SecretId=arn, VersionId=token, VersionStage=stage
        )
    else:
        secret = service_client.get_secret_value(
            SecretId=arn, VersionStage=stage
        )
    return json.loads(secret['SecretString'])
EOF
    filename = "lambda_function.py"
  }
}

# API Keys Secret
resource "aws_secretsmanager_secret" "api_keys" {
  name        = "investpro/api/keys"
  description = "External API keys"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = {
    Name = "investpro-api-keys"
  }
}
```

### Step 6: アプリケーションでのSecrets取得

```python
# app/config.py
import boto3
import json
from functools import lru_cache

class SecretsManager:
    def __init__(self, region_name='ap-northeast-1'):
        self.client = boto3.client(
            service_name='secretsmanager',
            region_name=region_name
        )

    @lru_cache(maxsize=10)
    def get_secret(self, secret_name: str) -> dict:
        """
        Secrets Managerからシークレットを取得
        結果はキャッシュされる
        """
        try:
            response = self.client.get_secret_value(SecretId=secret_name)
            return json.loads(response['SecretString'])
        except Exception as e:
            print(f"Error retrieving secret {secret_name}: {e}")
            raise

    def get_db_credentials(self) -> dict:
        """データベース認証情報を取得"""
        return self.get_secret('investpro/db/credentials')

    def get_api_keys(self) -> dict:
        """APIキーを取得"""
        return self.get_secret('investpro/api/keys')


# 使用例
secrets = SecretsManager()

# データベース接続
db_creds = secrets.get_db_credentials()
DATABASE_URL = f"postgresql://{db_creds['username']}:{db_creds['password']}@{db_creds['host']}:{db_creds['port']}/{db_creds['dbname']}"
```

```python
# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import secrets

def get_database_engine():
    """
    Secrets Managerから認証情報を取得してDBエンジンを作成
    """
    creds = secrets.get_db_credentials()

    connection_string = (
        f"postgresql://{creds['username']}:{creds['password']}"
        f"@{creds['host']}:{creds['port']}/{creds['dbname']}"
        "?sslmode=require"
    )

    engine = create_engine(
        connection_string,
        pool_pre_ping=True,  # 接続の有効性をチェック
        pool_recycle=3600,   # 1時間でコネクションをリサイクル
        pool_size=10,
        max_overflow=20
    )

    return engine

engine = get_database_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

### Step 7: 監査ログ設定

```hcl
# terraform/audit.tf

# CloudTrail
resource "aws_cloudtrail" "main" {
  name                          = "investpro-audit-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  s3_key_prefix                 = "cloudtrail"
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true
  kms_key_id                    = aws_kms_key.cloudtrail.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::investpro-data/"]
    }
  }

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail.arn

  tags = {
    Name = "investpro-cloudtrail"
  }
}

# CloudTrail S3 Bucket
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "investpro-cloudtrail-${var.account_id}"

  tags = {
    Name = "investpro-cloudtrail"
  }
}

resource "aws_s3_bucket_versioning" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.cloudtrail.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# AWS Config
resource "aws_config_configuration_recorder" "main" {
  name     = "investpro-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "investpro-config-channel"
  s3_bucket_name = aws_s3_bucket.config.id

  depends_on = [aws_config_configuration_recorder.main]
}

# Config Rules (コンプライアンスチェック)
resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "rds_encryption" {
  name = "rds-storage-encrypted"

  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "s3_bucket_ssl" {
  name = "s3-bucket-ssl-requests-only"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SSL_REQUESTS_ONLY"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# GuardDuty
resource "aws_guardduty_detector" "main" {
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
  }

  tags = {
    Name = "investpro-guardduty"
  }
}

# Security Hub
resource "aws_securityhub_account" "main" {}

resource "aws_securityhub_standards_subscription" "aws_foundational" {
  standards_arn = "arn:aws:securityhub:${var.region}::standards/aws-foundational-security-best-practices/v/1.0.0"

  depends_on = [aws_securityhub_account.main]
}

resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0"

  depends_on = [aws_securityhub_account.main]
}
```

---

## 8. トラブルシューティングチャレンジ

### Challenge 1: VPCエンドポイント経由でSecrets Managerにアクセスできない

```
問題:
ECSタスクからSecrets Managerへのアクセスがタイムアウトする。
VPCエンドポイントを設定したはずだが機能しない。

エラーログ:
botocore.exceptions.ConnectTimeoutError:
Connect timeout on endpoint URL: "https://secretsmanager.ap-northeast-1.amazonaws.com"

調査項目:
1. VPCエンドポイントの設定
2. セキュリティグループ
3. DNS設定
```

<details>
<summary>解決のヒント</summary>

```bash
# 1. VPCエンドポイントの状態確認
aws ec2 describe-vpc-endpoints \
    --filters "Name=service-name,Values=com.amazonaws.ap-northeast-1.secretsmanager" \
    --query "VpcEndpoints[*].{ID:VpcEndpointId,State:State,DNS:DnsEntries}"

# 2. Private DNSが有効か確認
# private_dns_enabled = true である必要がある

# 3. セキュリティグループ確認
aws ec2 describe-security-groups \
    --group-ids sg-vpce-xxx \
    --query "SecurityGroups[0].IpPermissions"

# Inbound: 443 from VPC CIDR が必要

# 4. ECSタスクのセキュリティグループ確認
# Outbound: 443 to VPCE Security Group が必要

# 5. ルートテーブル確認（S3エンドポイントがGateway型の場合）
aws ec2 describe-route-tables \
    --route-table-ids rtb-xxx

# 6. DNS解決テスト（ECSタスク内から）
nslookup secretsmanager.ap-northeast-1.amazonaws.com
# VPCエンドポイントのプライベートIPが返されるべき

# 解決策:
# - private_dns_enabled = true を設定
# - セキュリティグループでHTTPS許可
# - サブネットにVPCエンドポイントを配置
```
</details>

### Challenge 2: WAFでブロックされるべきリクエストが通過する

```
問題:
SQLインジェクション攻撃がWAFをバイパスしてアプリケーションに到達している。

ログ:
WAF: ALLOW
Application: SQL Injection detected in parameter 'search'

攻撃例:
/api/search?q=1%27%20OR%20%271%27%3D%271

調査項目:
1. WAFルールの設定
2. ルールの優先順位
3. エンコーディング
```

<details>
<summary>解決のヒント</summary>

```bash
# 1. WAFルールのテスト
aws wafv2 get-sampled-requests \
    --web-acl-arn arn:aws:wafv2:...:webacl/investpro-web-acl \
    --rule-metric-name AWSManagedRulesSQLiRuleSetMetric \
    --scope CLOUDFRONT \
    --time-window StartTime=...,EndTime=... \
    --max-items 100

# 2. SQLiルールがCOUNTモードになっていないか確認
# override_action { count {} } ではなく none {} である必要

# 3. Text Transformationの追加
# URL_DECODEを追加してエンコードされた攻撃を検知

# terraform/waf.tf に追加
rule {
  name     = "CustomSQLiRule"
  priority = 2

  action {
    block {}
  }

  statement {
    sqli_match_statement {
      field_to_match {
        query_string {}
      }
      text_transformation {
        priority = 0
        type     = "URL_DECODE"
      }
      text_transformation {
        priority = 1
        type     = "HTML_ENTITY_DECODE"
      }
      text_transformation {
        priority = 2
        type     = "LOWERCASE"
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "CustomSQLiRuleMetric"
    sampled_requests_enabled   = true
  }
}

# 4. CloudFront経由でのみアクセス可能にする
# ALBのセキュリティグループでCloudFront IPsのみ許可
```
</details>

### Challenge 3: シークレットローテーション後にアプリケーションが接続エラー

```
問題:
Secrets Managerの自動ローテーション実行後、
アプリケーションがデータベースに接続できなくなった。

エラー:
psycopg2.OperationalError: FATAL: password authentication failed for user "app_user"

調査項目:
1. ローテーションLambdaの実行ログ
2. シークレットのバージョン
3. アプリケーションのキャッシュ
```

<details>
<summary>解決のヒント</summary>

```bash
# 1. シークレットのバージョン確認
aws secretsmanager list-secret-version-ids \
    --secret-id investpro/db/credentials

# AWSCURRENT と AWSPREVIOUS を確認

# 2. ローテーションLambdaのログ確認
aws logs get-log-events \
    --log-group-name /aws/lambda/investpro-secret-rotation \
    --log-stream-name $(aws logs describe-log-streams \
        --log-group-name /aws/lambda/investpro-secret-rotation \
        --order-by LastEventTime --descending \
        --query "logStreams[0].logStreamName" --output text)

# 3. 実際のシークレット値確認
aws secretsmanager get-secret-value \
    --secret-id investpro/db/credentials \
    --query SecretString --output text | jq .

# 4. データベースでパスワード確認（手動テスト）
psql -h xxx.rds.amazonaws.com -U app_user -d investpro

# 5. アプリケーションのキャッシュクリア
# @lru_cache を使用している場合、キャッシュをクリア

# 解決策:
# a) アプリケーションでシークレットのキャッシュTTLを設定
# b) ローテーション時のエラーハンドリング改善
# c) データベース接続のリトライロジック追加

# キャッシュTTL付きの実装例
from cachetools import TTLCache

class SecretsManager:
    def __init__(self):
        self.cache = TTLCache(maxsize=10, ttl=300)  # 5分キャッシュ

    def get_secret(self, secret_name):
        if secret_name in self.cache:
            return self.cache[secret_name]

        secret = self._fetch_secret(secret_name)
        self.cache[secret_name] = secret
        return secret
```
</details>

---

## 9. 設計考慮ポイント

### 金融庁ガイドライン対応マッピング

```yaml
金融機関のシステムリスク管理基準:

1. アクセス管理:
   対応: IAM, VPC Security Groups, WAF IP制限
   証跡: CloudTrail, VPC Flow Logs

2. ネットワーク管理:
   対応: VPC分離, PrivateLink, Network ACL
   証跡: VPC Flow Logs, Config

3. 暗号化:
   対応: KMS (AES-256), TLS 1.2+, RDS暗号化
   証跡: KMS監査ログ, Config Rules

4. 監査ログ:
   対応: CloudTrail, CloudWatch Logs
   保持: 7年以上

5. 脆弱性管理:
   対応: WAF, GuardDuty, Security Hub
   対応: ECRスキャン, Inspector

6. インシデント対応:
   対応: GuardDuty, Security Hub, SNS通知
   手順: ランブック自動化
```

### コスト vs セキュリティのトレードオフ

```
High Security (本課題構成):
┌─────────────────────────────────────────┐
│ • Multi-AZ NAT Gateway: $90/月         │
│ • VPC Endpoints (8個): $80/月          │
│ • WAF: $10/月 + $0.60/100万リクエスト  │
│ • GuardDuty: $4/月〜                   │
│ • CloudTrail: $2/月〜                  │
│                                         │
│ セキュリティレベル: ★★★★★            │
│ 月額追加コスト: 約$190                  │
└─────────────────────────────────────────┘

Medium Security (代替構成):
┌─────────────────────────────────────────┐
│ • Single NAT Gateway: $45/月           │
│ • 主要VPC Endpoints (3個): $30/月      │
│ • WAF: $10/月                          │
│                                         │
│ セキュリティレベル: ★★★☆☆            │
│ 月額追加コスト: 約$85                   │
└─────────────────────────────────────────┘

金融系では High Security が必須
```

---

## 10. 発展課題

### 上級チャレンジ1: ゼロトラストアーキテクチャ

```yaml
# AWS Verified Access による実装

ゼロトラスト原則:
  - Never trust, always verify
  - Assume breach
  - Verify explicitly

実装コンポーネント:
  - AWS Verified Access: アプリケーションアクセス制御
  - IAM Identity Center: 統合認証
  - Device Trust: デバイス検証
  - Continuous Verification: 継続的な認証

# Verified Access Trust Provider
resource "aws_verifiedaccess_trust_provider" "oidc" {
  policy_reference_name = "investpro-idp"
  trust_provider_type   = "user"

  oidc_options {
    authorization_endpoint = "https://idp.investpro.example/authorize"
    client_id              = var.oidc_client_id
    client_secret          = var.oidc_client_secret
    issuer                 = "https://idp.investpro.example"
    token_endpoint         = "https://idp.investpro.example/token"
    user_info_endpoint     = "https://idp.investpro.example/userinfo"
    scope                  = "openid profile email"
  }
}
```

### 上級チャレンジ2: SOC2/SOC3レポート対応

```yaml
# AWS Artifact + 自社監査証跡

SOC2 Type II 対応項目:

Security:
  - 実装: WAF, Security Groups, KMS
  - 証跡: CloudTrail, Config

Availability:
  - 実装: Multi-AZ, Auto Scaling
  - 証跡: CloudWatch, Health Dashboard

Processing Integrity:
  - 実装: Lambda検証, データ整合性チェック
  - 証跡: アプリケーションログ

Confidentiality:
  - 実装: 暗号化, VPC分離, IAM
  - 証跡: KMS監査ログ, Access Analyzer

Privacy:
  - 実装: データ分類, アクセス制御
  - 証跡: Macie, IAM Access Analyzer
```

### 上級チャレンジ3: セキュリティ自動修復

```python
# Lambda: GuardDuty検知時の自動対応

import boto3
import json

def lambda_handler(event, context):
    """
    GuardDuty検知イベントに対する自動対応
    """
    finding = event['detail']
    finding_type = finding['type']
    severity = finding['severity']

    # 重大度に応じた対応
    if severity >= 7:
        # 高重大度: 即座にブロック
        handle_high_severity(finding)
    elif severity >= 4:
        # 中重大度: アラート + 調査開始
        handle_medium_severity(finding)
    else:
        # 低重大度: ログ記録のみ
        log_finding(finding)


def handle_high_severity(finding):
    """高重大度の検知への対応"""
    ec2 = boto3.client('ec2')
    wafv2 = boto3.client('wafv2')

    finding_type = finding['type']

    if 'UnauthorizedAccess' in finding_type:
        # 不正アクセス: IPをWAFでブロック
        source_ip = finding['service']['action']['networkConnectionAction']['remoteIpDetails']['ipAddressV4']
        block_ip_in_waf(wafv2, source_ip)

    elif 'CryptoCurrency' in finding_type:
        # マイニング検知: インスタンス隔離
        instance_id = finding['resource']['instanceDetails']['instanceId']
        isolate_instance(ec2, instance_id)

    # SNS通知
    notify_security_team(finding)


def block_ip_in_waf(client, ip_address):
    """WAFのIPブロックリストにIPを追加"""
    client.update_ip_set(
        Name='investpro-ip-block-list',
        Scope='CLOUDFRONT',
        Id='xxx',
        Addresses=[f"{ip_address}/32"],
        LockToken='xxx'
    )


def isolate_instance(client, instance_id):
    """インスタンスを隔離用セキュリティグループに変更"""
    # 全トラフィックを拒否するSGに変更
    client.modify_instance_attribute(
        InstanceId=instance_id,
        Groups=['sg-isolation']
    )
```

---

## 11. コスト見積もり

### 月額コスト概算

| サービス | スペック | 月額コスト |
|----------|----------|------------|
| NAT Gateway | 2 × Multi-AZ | $90 |
| VPC Endpoints | 8 Interface Endpoints | $80 |
| WAF | Web ACL + ルール | $15 |
| Secrets Manager | 5 シークレット | $2 |
| KMS | 3 CMK | $3 |
| CloudTrail | Multi-region | $2 |
| GuardDuty | 基本 | $5 |
| Config | 基本 | $3 |
| CloudWatch Logs | 10GB | $5 |
| **合計** | | **約 $205/月** |

### ROI分析

```
セキュリティ投資対効果:

コスト:
- 月額インフラ追加費用: $205
- 年間: $2,460

リスク軽減効果:
- データ漏洩時の想定被害: 1億円〜
- セキュリティインシデントによる信用失墜: 計り知れない
- 金融庁による行政処分リスク: 事業継続に影響

ROI:
- セキュリティ投資は保険として考える
- 金融業界では必須投資
- 顧客獲得時のセキュリティ質問対応が容易に
```

---

## 12. 学習のポイント

### 今回学んだこと

```
1. セキュアなVPC設計
   □ サブネット分離（Public/Private/Data）
   □ セキュリティグループの多層防御
   □ Network ACLによる追加防御

2. VPCエンドポイント
   □ Interface vs Gateway Endpoint
   □ PrivateLink によるプライベート接続
   □ エンドポイントポリシー

3. AWS WAF
   □ マネージドルールの活用
   □ カスタムルールの作成
   □ レート制限とIP制限

4. Secrets Manager
   □ シークレットの安全な保存
   □ 自動ローテーション
   □ アプリケーション統合

5. 監査とコンプライアンス
   □ CloudTrail
   □ AWS Config
   □ Security Hub
```

### GCPとの比較まとめ

| 観点 | AWS | GCP |
|------|-----|-----|
| プライベート接続 | PrivateLink | Private Service Connect |
| WAF | AWS WAF (マネージドルール豊富) | Cloud Armor |
| シークレット管理 | Secrets Manager | Secret Manager |
| 監査 | CloudTrail + Config | Cloud Audit Logs |
| 統合ダッシュボード | Security Hub | Security Command Center |

### 次のステップ

```
1. 発展学習:
   - AWS Network Firewall
   - AWS Verified Access
   - AWS Macie (データ分類)

2. 認定対応:
   - FISC安全対策基準
   - PCI DSS
   - ISO 27001

3. 認定資格:
   - AWS Certified Security - Specialty
   - AWS Certified Solutions Architect - Professional
```
