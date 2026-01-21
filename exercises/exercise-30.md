# 課題30: ShopNow Chaos Engineering - AWS FIS による耐障害性検証

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | 信頼性エンジニアリング / カオスエンジニアリング |
| 処理タイプ | バッチ |
| 使用IaC | Terraform |
| 想定所要時間 | 5-6時間 |

---

## 2. ビジネスシナリオ

### 企業プロファイル: ShopNow株式会社

```
┌─────────────────────────────────────────────────────────────────┐
│                     ShopNow株式会社                              │
│                    大規模ECプラットフォーム                      │
├─────────────────────────────────────────────────────────────────┤
│  設立: 2015年    従業員: 500名    本社: 東京                     │
│  事業: BtoC総合EC（年間取扱高1000億円）                         │
│  月間PV: 5億    会員数: 1500万人    DAU: 200万人                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【システム規模】                                                │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │    ┌─────────────────────────────────────────────────────┐  ││
│  │    │  API Gateway + Lambda + ECS Fargate (300+ tasks)    │  ││
│  │    │  Aurora MySQL (Multi-AZ) + ElastiCache (6 nodes)   │  ││
│  │    │  OpenSearch (6 nodes) + S3 + CloudFront             │  ││
│  │    │  3 AZ構成、マイクロサービス50+                       │  ││
│  │    └─────────────────────────────────────────────────────┘  ││
│  │                                                              ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【過去のインシデント】                                          │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  2023/01: AZ障害でDB failover遅延 → 2時間のダウンタイム    ││
│  │  2023/06: キャッシュノード障害 → 30分の性能劣化            ││
│  │  2023/09: デプロイ時のメモリリーク → 段階的サービス停止    ││
│  │  2023/11: 外部API障害の伝播 → 決済システム全停止           ││
│  │                                                              ││
│  │  年間損失: 推定5000万円（売上機会損失 + 対応工数）          ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【目指す姿】                                                    │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  "Chaos Engineering" による継続的な耐障害性検証             ││
│  │                                                              ││
│  │  ・計画的な障害注入による弱点の発見                        ││
│  │  ・自動回復メカニズムの検証                                ││
│  │  ・GameDay演習による運用チームの訓練                       ││
│  │  ・SLO/SLI に基づく信頼性の定量化                          ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### カオスエンジニアリングの原則

```
┌─────────────────────────────────────────────────────────────────┐
│                カオスエンジニアリング原則                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【5つの原則】                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  1. 定常状態の仮説を立てる                                  ││
│  │     └─ "システムは正常な状態でどう振る舞うか"              ││
│  │                                                              ││
│  │  2. 実世界のイベントを模倣する                              ││
│  │     └─ サーバー停止、ネットワーク遅延、依存サービス障害    ││
│  │                                                              ││
│  │  3. 本番環境で実験する                                      ││
│  │     └─ 可能な限り本番に近い環境で                          ││
│  │                                                              ││
│  │  4. 継続的に自動化する                                      ││
│  │     └─ CI/CDパイプラインに組み込む                         ││
│  │                                                              ││
│  │  5. 影響範囲を最小化する                                    ││
│  │     └─ 段階的に、すぐ中止できるように                      ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【実験の流れ】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐     ││
│  │  │仮説  │──►│実験  │──►│注入  │──►│観察  │──►│分析  │     ││
│  │  │定義  │   │設計  │   │実行  │   │監視  │   │改善  │     ││
│  │  └──────┘   └──────┘   └──────┘   └──────┘   └──────┘     ││
│  │                                                              ││
│  │  例）"ECSタスクが50%停止しても、レスポンスタイムは         ││
│  │      2秒以内を維持し、エラー率は1%未満である"               ││
│  │                                                              ││
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
│  【信頼性目標（SLO）】                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  指標              │ 現状        │ 目標        │ SLO       ││
│  ├────────────────────┼─────────────┼─────────────┼───────────┤│
│  │  可用性            │ 99.5%       │ 99.95%      │ 99.9%     ││
│  │  P99レイテンシ     │ 3秒         │ 1秒         │ < 2秒     ││
│  │  エラー率          │ 2%          │ 0.1%        │ < 0.5%    ││
│  │  MTTR（復旧時間）  │ 60分        │ 10分        │ < 15分    ││
│  │  MTTD（検知時間）  │ 15分        │ 2分         │ < 5分     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【カオス実験目標】                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                  │ 目標                                ││
│  ├────────────────────────┼─────────────────────────────────────┤│
│  │  月間実験回数          │ 20回以上                            ││
│  │  発見した脆弱性        │ 毎月3件以上                         ││
│  │  改善実施率            │ 90%以上                             ││
│  │  GameDay頻度           │ 四半期ごと                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【検証対象の障害パターン】                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  カテゴリ          │ 障害パターン                          ││
│  ├────────────────────┼───────────────────────────────────────┤│
│  │  インスタンス      │ EC2/ECS停止、CPU高負荷、メモリ枯渇    ││
│  │  ネットワーク      │ 遅延注入、パケットロス、DNS障害        ││
│  │  データベース      │ フェイルオーバー、接続数枯渇           ││
│  │  キャッシュ        │ ノード障害、キャッシュクリア           ││
│  │  外部依存          │ API遅延、タイムアウト、503エラー       ││
│  │  AZ障害            │ 単一AZ完全停止                         ││
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
│  │  1. AWS Fault Injection Simulator (FIS)                     ││
│  │     ├── 実験テンプレート設計                                ││
│  │     ├── アクション（障害注入）の種類                        ││
│  │     ├── ターゲット選択（タグ、ARN、フィルタ）              ││
│  │     └── 停止条件（Stop Conditions）                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  2. 障害シナリオ設計                                        ││
│  │     ├── EC2/ECS障害シナリオ                                 ││
│  │     ├── RDS/Aurora障害シナリオ                              ││
│  │     ├── ネットワーク障害シナリオ                            ││
│  │     └── AZ障害シナリオ                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  3. 定常状態の定義と監視                                    ││
│  │     ├── SLI/SLO設計                                         ││
│  │     ├── CloudWatch Synthetics                               ││
│  │     ├── CloudWatch Alarms                                   ││
│  │     └── ダッシュボード設計                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  4. Terraformによる実装                                     ││
│  │     ├── FIS実験テンプレート                                 ││
│  │     ├── IAMロール設計                                       ││
│  │     ├── 監視リソース                                        ││
│  │     └── モジュール化                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【副次スキル】                                                  │
│  ・信頼性エンジニアリングの原則                                  │
│  ・GameDay企画・運営                                             │
│  ・インシデント対応改善                                          │
│  ・ポストモーテム文化                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### GCPとの対応関係

| AWS サービス | GCP 対応サービス | 主な違い |
|-------------|-----------------|---------|
| AWS FIS | なし（OSS: Chaos Monkey等） | FISはAWSマネージド |
| CloudWatch Synthetics | Cloud Monitoring Uptime | 外形監視 |
| CloudWatch Alarms | Cloud Alerting | アラート |
| X-Ray | Cloud Trace | 分散トレーシング |

---

## 4. 使用するAWSサービス

```
┌─────────────────────────────────────────────────────────────────┐
│                    使用AWSサービス一覧                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【コアサービス】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  サービス          │ 用途                    │ 重要度      ││
│  ├────────────────────┼─────────────────────────┼─────────────┤│
│  │  FIS               │ 障害注入実験            │ ★★★★★      ││
│  │  CloudWatch        │ 監視・アラート          │ ★★★★★      ││
│  │  Systems Manager   │ EC2/ECS操作             │ ★★★★☆      ││
│  │  EventBridge       │ 実験スケジューリング    │ ★★★☆☆      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【対象サービス（障害注入先）】                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  サービス          │ 障害パターン            │ 重要度      ││
│  ├────────────────────┼─────────────────────────┼─────────────┤│
│  │  EC2               │ 停止、CPU負荷、メモリ   │ ★★★★☆      ││
│  │  ECS               │ タスク停止              │ ★★★★★      ││
│  │  RDS/Aurora        │ フェイルオーバー        │ ★★★★★      ││
│  │  ElastiCache       │ ノードリブート          │ ★★★★☆      ││
│  │  VPC               │ ネットワーク遅延        │ ★★★☆☆      ││
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

# jq（JSON処理用）
jq --version
```

### AWS環境の準備

```bash
# 環境変数設定
export AWS_REGION=ap-northeast-1
export PROJECT_NAME=shopnow
export ENVIRONMENT=chaos

# 作業ディレクトリ作成
mkdir -p ~/shopnow-chaos/{terraform,experiments,scripts,dashboards}
cd ~/shopnow-chaos/terraform
```

### 実験対象環境の前提

```
この課題では、以下のような環境が既に存在することを前提とします：
- ECS Fargateクラスター（複数タスク）
- Aurora MySQLクラスター（Multi-AZ）
- ElastiCacheクラスター
- ALB + ターゲットグループ
- CloudWatch監視設定

※実際の環境がない場合は、簡易的なサンプル環境を構築します
```

---

## 6. アーキテクチャ設計

### カオスエンジニアリング基盤

```
┌─────────────────────────────────────────────────────────────────┐
│              ShopNow カオスエンジニアリング基盤                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Control Plane                            ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │ EventBridge │  │   AWS FIS   │  │ CloudWatch  │         ││
│  │  │ (Scheduler) │─►│ (Conductor) │─►│  (Monitor)  │         ││
│  │  └─────────────┘  └──────┬──────┘  └──────┬──────┘         ││
│  │                          │                 │                 ││
│  │                   ┌──────▼──────┐         │                 ││
│  │                   │  IAM Role   │         │                 ││
│  │                   │  (FIS用)    │         │                 ││
│  │                   └──────┬──────┘         │                 ││
│  └──────────────────────────┼────────────────┼─────────────────┘│
│                             │                │                   │
│  ┌──────────────────────────┼────────────────┼─────────────────┐│
│  │                    Data Plane              │                 ││
│  │                          │                │                 ││
│  │    ┌─────────────────────┼────────────────┼───────────────┐ ││
│  │    │                     ▼                ▼               │ ││
│  │    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │ ││
│  │    │  │   ECS   │  │  Aurora │  │  Cache  │  │   EC2   │ │ ││
│  │    │  │ Fargate │  │  MySQL  │  │  Redis  │  │  Fleet  │ │ ││
│  │    │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘ │ ││
│  │    │       │            │            │            │       │ ││
│  │    │  ┌────▼────────────▼────────────▼────────────▼────┐ │ ││
│  │    │  │              VPC (3 AZ)                        │ │ ││
│  │    │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │ │ ││
│  │    │  │  │   AZ-a   │ │   AZ-c   │ │   AZ-d   │       │ │ ││
│  │    │  │  └──────────┘ └──────────┘ └──────────┘       │ │ ││
│  │    │  └────────────────────────────────────────────────┘ │ ││
│  │    └─────────────────────────────────────────────────────┘ ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【実験パターン】                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. ECS Task停止     → Auto Recovery検証                  │  │
│  │  2. Aurora Failover  → DB切り替え時間検証                 │  │
│  │  3. Cache Node障害   → Fallback動作検証                   │  │
│  │  4. Network遅延      → タイムアウト設定検証               │  │
│  │  5. AZ障害           → マルチAZ回復力検証                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### FIS実験テンプレート構造

```
┌─────────────────────────────────────────────────────────────────┐
│                 FIS 実験テンプレート構造                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Experiment Template                                        ││
│  │  ├── Description: 実験の説明                                ││
│  │  ├── StopConditions: 緊急停止条件                           ││
│  │  │   └── CloudWatch Alarm ARN                               ││
│  │  ├── Targets: 障害注入対象                                  ││
│  │  │   ├── ResourceType: aws:ecs:task / aws:ec2:instance     ││
│  │  │   ├── ResourceTags: {"Environment": "chaos"}            ││
│  │  │   ├── Filters: タスク数、インスタンス状態等              ││
│  │  │   └── SelectionMode: COUNT(n) / PERCENT(p)              ││
│  │  ├── Actions: 障害注入アクション                            ││
│  │  │   ├── ActionId: aws:ecs:stop-task                        ││
│  │  │   ├── Parameters: 停止タスク数等                         ││
│  │  │   ├── Targets: 対象リソース参照                          ││
│  │  │   ├── StartAfter: 前のアクション依存                     ││
│  │  │   └── Duration: 実行時間                                 ││
│  │  └── RoleArn: FIS実行用IAMロール                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【アクション種類】                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  カテゴリ        │ アクション                                ││
│  ├──────────────────┼──────────────────────────────────────────┤│
│  │  EC2             │ aws:ec2:stop-instances                   ││
│  │                  │ aws:ec2:terminate-instances              ││
│  │  ECS             │ aws:ecs:stop-task                        ││
│  │                  │ aws:ecs:drain-container-instances        ││
│  │  RDS             │ aws:rds:failover-db-cluster              ││
│  │                  │ aws:rds:reboot-db-instances              ││
│  │  Network         │ aws:network:route-table-disrupt          ││
│  │                  │ aws:network:transit-gateway-disrupt      ││
│  │  SSM             │ aws:ssm:send-command (CPU負荷等)         ││
│  │  ElastiCache     │ aws:elasticache:reboot-cache-cluster     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. ハンズオン手順

### Phase 1: 基盤インフラ構築（Terraform）

#### 1.1 プロジェクト構造

```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── providers.tf
├── modules/
│   ├── fis-experiments/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── ecs-experiment.tf
│   │   ├── rds-experiment.tf
│   │   ├── network-experiment.tf
│   │   └── az-experiment.tf
│   ├── monitoring/
│   │   ├── main.tf
│   │   ├── alarms.tf
│   │   ├── dashboard.tf
│   │   └── synthetics.tf
│   └── sample-workload/        # 実験対象の簡易環境
│       ├── main.tf
│       ├── ecs.tf
│       ├── rds.tf
│       └── networking.tf
└── environments/
    └── chaos/
        └── terraform.tfvars
```

#### 1.2 メイン設定

```hcl
# providers.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "shopnow-terraform-state"
    key            = "chaos-engineering/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ShopNow"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Purpose     = "ChaosEngineering"
    }
  }
}
```

```hcl
# variables.tf
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "chaos"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "shopnow"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_sample_workload" {
  description = "Create sample workload for experiments"
  type        = bool
  default     = true
}

variable "experiment_stop_alarm_threshold" {
  description = "Error rate threshold to stop experiments"
  type        = number
  default     = 5  # 5% error rate
}
```

```hcl
# main.tf
locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    ChaosExperiment = "enabled"
  }
}

# サンプルワークロード（オプション）
module "sample_workload" {
  count  = var.enable_sample_workload ? 1 : 0
  source = "./modules/sample-workload"

  name_prefix = local.name_prefix
  vpc_cidr    = var.vpc_cidr
  environment = var.environment
}

# 監視設定
module "monitoring" {
  source = "./modules/monitoring"

  name_prefix               = local.name_prefix
  environment               = var.environment
  ecs_cluster_name          = var.enable_sample_workload ? module.sample_workload[0].ecs_cluster_name : var.existing_ecs_cluster
  alb_arn_suffix            = var.enable_sample_workload ? module.sample_workload[0].alb_arn_suffix : var.existing_alb_arn_suffix
  error_rate_threshold      = var.experiment_stop_alarm_threshold
  api_endpoint              = var.enable_sample_workload ? module.sample_workload[0].api_endpoint : var.existing_api_endpoint
}

# FIS実験
module "fis_experiments" {
  source = "./modules/fis-experiments"

  name_prefix           = local.name_prefix
  environment           = var.environment
  ecs_cluster_name      = var.enable_sample_workload ? module.sample_workload[0].ecs_cluster_name : var.existing_ecs_cluster
  ecs_service_name      = var.enable_sample_workload ? module.sample_workload[0].ecs_service_name : var.existing_ecs_service
  rds_cluster_id        = var.enable_sample_workload ? module.sample_workload[0].rds_cluster_id : var.existing_rds_cluster
  stop_condition_alarm  = module.monitoring.stop_condition_alarm_arn
  vpc_id                = var.enable_sample_workload ? module.sample_workload[0].vpc_id : var.existing_vpc_id
  subnet_ids            = var.enable_sample_workload ? module.sample_workload[0].private_subnet_ids : var.existing_subnet_ids
}
```

### Phase 2: FIS実験テンプレート実装

#### 2.1 FISモジュールのメイン設定

```hcl
# modules/fis-experiments/main.tf
#============================================
# FIS用IAMロール
#============================================
resource "aws_iam_role" "fis_role" {
  name = "${var.name_prefix}-fis-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "fis.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "fis_policy" {
  name = "${var.name_prefix}-fis-policy"
  role = aws_iam_role.fis_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ECS操作権限
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeClusters",
          "ecs:ListTasks",
          "ecs:DescribeTasks",
          "ecs:StopTask",
          "ecs:ListContainerInstances",
          "ecs:DescribeContainerInstances",
          "ecs:UpdateContainerInstancesState"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/ChaosExperiment" = "enabled"
          }
        }
      },
      # RDS操作権限
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBClusters",
          "rds:DescribeDBInstances",
          "rds:FailoverDBCluster",
          "rds:RebootDBInstance"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/ChaosExperiment" = "enabled"
          }
        }
      },
      # EC2操作権限
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:StopInstances",
          "ec2:StartInstances",
          "ec2:TerminateInstances"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/ChaosExperiment" = "enabled"
          }
        }
      },
      # SSM操作権限（CPU負荷等）
      {
        Effect = "Allow"
        Action = [
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
          "ssm:ListCommands",
          "ssm:CancelCommand"
        ]
        Resource = "*"
      },
      # ネットワーク操作権限
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkAcl*",
          "ec2:DeleteNetworkAcl*",
          "ec2:DescribeNetworkAcls",
          "ec2:ReplaceNetworkAclAssociation",
          "ec2:ReplaceNetworkAclEntry"
        ]
        Resource = "*"
      },
      # CloudWatch操作（Stop Condition用）
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:DescribeAlarms"
        ]
        Resource = "*"
      },
      # ログ記録
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:DescribeLogGroups",
          "logs:DescribeResourcePolicies",
          "logs:PutResourcePolicy"
        ]
        Resource = "*"
      }
    ]
  })
}

#============================================
# FISログ設定
#============================================
resource "aws_cloudwatch_log_group" "fis_logs" {
  name              = "/aws/fis/${var.name_prefix}"
  retention_in_days = 30
}
```

#### 2.2 ECS障害実験

```hcl
# modules/fis-experiments/ecs-experiment.tf
#============================================
# 実験1: ECSタスク停止（30%）
#============================================
resource "aws_fis_experiment_template" "ecs_task_stop_30" {
  description = "Stop 30% of ECS tasks to test auto-recovery"
  role_arn    = aws_iam_role.fis_role.arn

  # 停止条件：エラー率が閾値を超えたら即座に停止
  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_condition_alarm
  }

  # ターゲット：ECSタスク
  target {
    name           = "ecs-tasks"
    resource_type  = "aws:ecs:task"
    selection_mode = "PERCENT(30)"

    resource_tag {
      key   = "ChaosExperiment"
      value = "enabled"
    }

    filter {
      path   = "State.Name"
      values = ["RUNNING"]
    }
  }

  # アクション：タスク停止
  action {
    name        = "stop-ecs-tasks"
    action_id   = "aws:ecs:stop-task"
    description = "Stop 30% of running ECS tasks"

    target {
      key   = "Tasks"
      value = "ecs-tasks"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis_logs.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "${var.name_prefix}-ecs-task-stop-30"
    Experiment = "ecs-resilience"
    Severity   = "medium"
  }
}

#============================================
# 実験2: ECSタスク停止（50%）- より厳しいテスト
#============================================
resource "aws_fis_experiment_template" "ecs_task_stop_50" {
  description = "Stop 50% of ECS tasks - aggressive resilience test"
  role_arn    = aws_iam_role.fis_role.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_condition_alarm
  }

  target {
    name           = "ecs-tasks"
    resource_type  = "aws:ecs:task"
    selection_mode = "PERCENT(50)"

    resource_tag {
      key   = "ChaosExperiment"
      value = "enabled"
    }

    filter {
      path   = "State.Name"
      values = ["RUNNING"]
    }
  }

  action {
    name        = "stop-half-ecs-tasks"
    action_id   = "aws:ecs:stop-task"
    description = "Stop 50% of running ECS tasks"

    target {
      key   = "Tasks"
      value = "ecs-tasks"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis_logs.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "${var.name_prefix}-ecs-task-stop-50"
    Experiment = "ecs-resilience"
    Severity   = "high"
  }
}

#============================================
# 実験3: ECSタスクCPU負荷
#============================================
resource "aws_fis_experiment_template" "ecs_cpu_stress" {
  description = "Inject CPU stress into ECS tasks"
  role_arn    = aws_iam_role.fis_role.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_condition_alarm
  }

  target {
    name           = "ecs-tasks"
    resource_type  = "aws:ecs:task"
    selection_mode = "PERCENT(30)"

    resource_tag {
      key   = "ChaosExperiment"
      value = "enabled"
    }
  }

  action {
    name        = "cpu-stress"
    action_id   = "aws:ecs:task-cpu-stress"
    description = "Inject 80% CPU stress for 5 minutes"

    parameter {
      key   = "duration"
      value = "PT5M"
    }

    parameter {
      key   = "percent"
      value = "80"
    }

    target {
      key   = "Tasks"
      value = "ecs-tasks"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis_logs.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "${var.name_prefix}-ecs-cpu-stress"
    Experiment = "ecs-performance"
    Severity   = "medium"
  }
}
```

#### 2.3 RDS/Aurora障害実験

```hcl
# modules/fis-experiments/rds-experiment.tf
#============================================
# 実験4: Aurora Failover
#============================================
resource "aws_fis_experiment_template" "aurora_failover" {
  description = "Force Aurora cluster failover to test DB resilience"
  role_arn    = aws_iam_role.fis_role.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_condition_alarm
  }

  target {
    name           = "aurora-cluster"
    resource_type  = "aws:rds:cluster"
    selection_mode = "ALL"

    resource_arns = [
      "arn:aws:rds:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:cluster:${var.rds_cluster_id}"
    ]
  }

  action {
    name        = "failover-aurora"
    action_id   = "aws:rds:failover-db-cluster"
    description = "Trigger Aurora failover"

    target {
      key   = "Clusters"
      value = "aurora-cluster"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis_logs.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "${var.name_prefix}-aurora-failover"
    Experiment = "database-resilience"
    Severity   = "high"
  }
}

#============================================
# 実験5: RDSリードレプリカリブート
#============================================
resource "aws_fis_experiment_template" "rds_reader_reboot" {
  description = "Reboot Aurora reader instance"
  role_arn    = aws_iam_role.fis_role.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_condition_alarm
  }

  target {
    name           = "rds-readers"
    resource_type  = "aws:rds:db"
    selection_mode = "COUNT(1)"

    resource_tag {
      key   = "ChaosExperiment"
      value = "enabled"
    }

    resource_tag {
      key   = "Role"
      value = "reader"
    }
  }

  action {
    name        = "reboot-reader"
    action_id   = "aws:rds:reboot-db-instances"
    description = "Reboot one reader instance"

    parameter {
      key   = "forceFailover"
      value = "false"
    }

    target {
      key   = "DBInstances"
      value = "rds-readers"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis_logs.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "${var.name_prefix}-rds-reader-reboot"
    Experiment = "database-resilience"
    Severity   = "medium"
  }
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}
```

#### 2.4 ネットワーク障害実験

```hcl
# modules/fis-experiments/network-experiment.tf
#============================================
# 実験6: ネットワーク遅延注入
#============================================
resource "aws_fis_experiment_template" "network_latency" {
  description = "Inject network latency between services"
  role_arn    = aws_iam_role.fis_role.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_condition_alarm
  }

  target {
    name           = "ec2-instances"
    resource_type  = "aws:ec2:instance"
    selection_mode = "PERCENT(50)"

    resource_tag {
      key   = "ChaosExperiment"
      value = "enabled"
    }

    filter {
      path   = "State.Name"
      values = ["running"]
    }
  }

  # SSM Documentを使用してネットワーク遅延を注入
  action {
    name        = "inject-latency"
    action_id   = "aws:ssm:send-command"
    description = "Add 200ms network latency"

    parameter {
      key   = "documentArn"
      value = "arn:aws:ssm:${data.aws_region.current.name}::document/AWSFIS-Run-Network-Latency"
    }

    parameter {
      key   = "documentParameters"
      value = jsonencode({
        DurationSeconds = "300"
        DelayMilliseconds = "200"
        Interface = "eth0"
      })
    }

    parameter {
      key   = "duration"
      value = "PT5M"
    }

    target {
      key   = "Instances"
      value = "ec2-instances"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis_logs.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "${var.name_prefix}-network-latency"
    Experiment = "network-resilience"
    Severity   = "medium"
  }
}

#============================================
# 実験7: パケットロス注入
#============================================
resource "aws_fis_experiment_template" "packet_loss" {
  description = "Inject packet loss to test retry logic"
  role_arn    = aws_iam_role.fis_role.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_condition_alarm
  }

  target {
    name           = "ec2-instances"
    resource_type  = "aws:ec2:instance"
    selection_mode = "PERCENT(30)"

    resource_tag {
      key   = "ChaosExperiment"
      value = "enabled"
    }
  }

  action {
    name        = "inject-packet-loss"
    action_id   = "aws:ssm:send-command"
    description = "Add 10% packet loss"

    parameter {
      key   = "documentArn"
      value = "arn:aws:ssm:${data.aws_region.current.name}::document/AWSFIS-Run-Network-Packet-Loss"
    }

    parameter {
      key   = "documentParameters"
      value = jsonencode({
        DurationSeconds = "180"
        LossPercent = "10"
        Interface = "eth0"
      })
    }

    parameter {
      key   = "duration"
      value = "PT3M"
    }

    target {
      key   = "Instances"
      value = "ec2-instances"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis_logs.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "${var.name_prefix}-packet-loss"
    Experiment = "network-resilience"
    Severity   = "medium"
  }
}
```

#### 2.5 AZ障害実験

```hcl
# modules/fis-experiments/az-experiment.tf
#============================================
# 実験8: 単一AZ障害シミュレーション
#============================================
resource "aws_fis_experiment_template" "az_failure" {
  description = "Simulate single AZ failure"
  role_arn    = aws_iam_role.fis_role.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_condition_alarm
  }

  # AZ-aのサブネットをターゲット
  target {
    name           = "az-a-subnets"
    resource_type  = "aws:ec2:subnet"
    selection_mode = "ALL"

    resource_tag {
      key   = "ChaosExperiment"
      value = "enabled"
    }

    resource_tag {
      key   = "AvailabilityZone"
      value = "${data.aws_region.current.name}a"
    }
  }

  # アクション1: ネットワークACLでトラフィックをブロック
  action {
    name        = "disrupt-az-a-network"
    action_id   = "aws:network:disrupt-connectivity"
    description = "Block all traffic to/from AZ-a subnets"

    parameter {
      key   = "duration"
      value = "PT10M"
    }

    parameter {
      key   = "scope"
      value = "all"
    }

    target {
      key   = "Subnets"
      value = "az-a-subnets"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis_logs.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "${var.name_prefix}-az-failure"
    Experiment = "az-resilience"
    Severity   = "critical"
  }
}

#============================================
# 実験9: 複合障害（ECS + RDS同時）
#============================================
resource "aws_fis_experiment_template" "combined_failure" {
  description = "Combined ECS task stop and RDS failover"
  role_arn    = aws_iam_role.fis_role.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_condition_alarm
  }

  # ターゲット1: ECSタスク
  target {
    name           = "ecs-tasks"
    resource_type  = "aws:ecs:task"
    selection_mode = "PERCENT(30)"

    resource_tag {
      key   = "ChaosExperiment"
      value = "enabled"
    }
  }

  # ターゲット2: Auroraクラスター
  target {
    name           = "aurora-cluster"
    resource_type  = "aws:rds:cluster"
    selection_mode = "ALL"

    resource_arns = [
      "arn:aws:rds:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:cluster:${var.rds_cluster_id}"
    ]
  }

  # アクション1: ECSタスク停止（先に実行）
  action {
    name        = "stop-ecs-tasks"
    action_id   = "aws:ecs:stop-task"
    description = "Stop 30% of ECS tasks"

    target {
      key   = "Tasks"
      value = "ecs-tasks"
    }
  }

  # アクション2: Auroraフェイルオーバー（ECS停止後に実行）
  action {
    name        = "failover-aurora"
    action_id   = "aws:rds:failover-db-cluster"
    description = "Trigger Aurora failover"
    start_after = ["stop-ecs-tasks"]

    target {
      key   = "Clusters"
      value = "aurora-cluster"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis_logs.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "${var.name_prefix}-combined-failure"
    Experiment = "combined-resilience"
    Severity   = "critical"
  }
}
```

### Phase 3: 監視設定

```hcl
# modules/monitoring/alarms.tf
#============================================
# 実験停止条件用アラーム
#============================================
resource "aws_cloudwatch_metric_alarm" "stop_condition_alarm" {
  alarm_name          = "${var.name_prefix}-fis-stop-condition"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = var.error_rate_threshold

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_description = "Stop FIS experiment if error rate exceeds threshold"

  # このアラームは通知不要（FISの停止トリガーのみ）
  actions_enabled = false
}

#============================================
# レイテンシ監視アラーム
#============================================
resource "aws_cloudwatch_metric_alarm" "high_latency" {
  alarm_name          = "${var.name_prefix}-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 2  # 2秒

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_description = "P99 latency exceeds 2 seconds"
  alarm_actions     = [aws_sns_topic.alerts.arn]
  ok_actions        = [aws_sns_topic.alerts.arn]
}

#============================================
# ECSタスク数監視
#============================================
resource "aws_cloudwatch_metric_alarm" "ecs_task_count" {
  alarm_name          = "${var.name_prefix}-ecs-task-count"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 2  # 最小タスク数

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  alarm_description = "ECS running task count below minimum"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}

#============================================
# SNSトピック
#============================================
resource "aws_sns_topic" "alerts" {
  name = "${var.name_prefix}-chaos-alerts"
}
```

```hcl
# modules/monitoring/synthetics.tf
#============================================
# CloudWatch Synthetics Canary（外形監視）
#============================================
resource "aws_synthetics_canary" "api_health" {
  name                 = "${var.name_prefix}-api-health"
  artifact_s3_location = "s3://${aws_s3_bucket.synthetics.id}/canary/${var.name_prefix}-api-health/"
  execution_role_arn   = aws_iam_role.synthetics_role.arn
  handler              = "apiCanaryBlueprint.handler"
  runtime_version      = "syn-nodejs-puppeteer-6.2"
  start_canary         = true

  schedule {
    expression = "rate(1 minute)"
  }

  run_config {
    timeout_in_seconds = 60
    memory_in_mb       = 960
    active_tracing     = true
  }

  code {
    handler = "apiCanaryBlueprint.handler"
    s3_bucket = aws_s3_bucket.synthetics.id
    s3_key    = aws_s3_object.canary_script.key
  }

  tags = {
    Name = "${var.name_prefix}-api-health"
  }
}

resource "aws_s3_bucket" "synthetics" {
  bucket = "${var.name_prefix}-synthetics-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_object" "canary_script" {
  bucket = aws_s3_bucket.synthetics.id
  key    = "canary/apiCanaryBlueprint.zip"
  source = "${path.module}/scripts/canary.zip"
  etag   = filemd5("${path.module}/scripts/canary.zip")
}

resource "aws_iam_role" "synthetics_role" {
  name = "${var.name_prefix}-synthetics-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "synthetics_policy" {
  role       = aws_iam_role.synthetics_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchSyntheticsFullAccess"
}
```

```hcl
# modules/monitoring/dashboard.tf
#============================================
# カオスエンジニアリングダッシュボード
#============================================
resource "aws_cloudwatch_dashboard" "chaos_dashboard" {
  dashboard_name = "${var.name_prefix}-chaos-engineering"

  dashboard_body = jsonencode({
    widgets = [
      # 実験ステータス
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# Chaos Engineering Dashboard - ${var.name_prefix}"
        }
      },
      # エラー率
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title   = "Error Rate (5XX)"
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", var.alb_arn_suffix],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          period = 60
          stat   = "Sum"
        }
      },
      # レイテンシ
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title   = "Response Time"
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { stat = "p50", label = "p50" }],
            ["...", { stat = "p99", label = "p99" }],
            ["...", { stat = "Maximum", label = "Max" }]
          ]
          period = 60
        }
      },
      # ECSタスク数
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title   = "ECS Task Count"
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          metrics = [
            ["ECS/ContainerInsights", "RunningTaskCount", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name],
            [".", "DesiredTaskCount", ".", ".", ".", "."]
          ]
          period = 60
        }
      },
      # リクエスト数
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 12
        height = 6
        properties = {
          title   = "Request Count"
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix]
          ]
          period = 60
          stat   = "Sum"
        }
      },
      # Synthetics成功率
      {
        type   = "metric"
        x      = 12
        y      = 7
        width  = 12
        height = 6
        properties = {
          title   = "Synthetics Canary Success Rate"
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          metrics = [
            ["CloudWatchSynthetics", "SuccessPercent", "CanaryName", "${var.name_prefix}-api-health"]
          ]
          period = 60
          stat   = "Average"
        }
      }
    ]
  })
}
```

### Phase 4: 実験実行スクリプト

```bash
# scripts/run-experiment.sh
#!/bin/bash
set -e

# 使用方法
usage() {
  echo "Usage: $0 <experiment-name> [--dry-run]"
  echo ""
  echo "Available experiments:"
  echo "  ecs-task-stop-30    - Stop 30% of ECS tasks"
  echo "  ecs-task-stop-50    - Stop 50% of ECS tasks"
  echo "  ecs-cpu-stress      - Inject CPU stress"
  echo "  aurora-failover     - Force Aurora failover"
  echo "  network-latency     - Inject network latency"
  echo "  packet-loss         - Inject packet loss"
  echo "  az-failure          - Simulate AZ failure"
  echo "  combined-failure    - Combined ECS + RDS failure"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

EXPERIMENT_NAME=$1
DRY_RUN=${2:-""}
NAME_PREFIX="shopnow-chaos"

# 実験テンプレートIDを取得
get_template_id() {
  local name=$1
  aws fis list-experiment-templates \
    --query "experimentTemplates[?tags.Name=='${NAME_PREFIX}-${name}'].id | [0]" \
    --output text
}

TEMPLATE_ID=$(get_template_id "$EXPERIMENT_NAME")

if [ "$TEMPLATE_ID" == "None" ] || [ -z "$TEMPLATE_ID" ]; then
  echo "Error: Experiment template '${EXPERIMENT_NAME}' not found"
  exit 1
fi

echo "=========================================="
echo "  Chaos Experiment: ${EXPERIMENT_NAME}"
echo "  Template ID: ${TEMPLATE_ID}"
echo "=========================================="

# テンプレート詳細を表示
echo ""
echo "Template details:"
aws fis get-experiment-template --id "$TEMPLATE_ID" \
  --query '{Description: description, Targets: targets, Actions: actions}' \
  --output yaml

if [ "$DRY_RUN" == "--dry-run" ]; then
  echo ""
  echo "[DRY RUN] Would start experiment with template: ${TEMPLATE_ID}"
  exit 0
fi

# 確認
echo ""
read -p "Start this experiment? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# 実験開始
echo ""
echo "Starting experiment..."
EXPERIMENT_ID=$(aws fis start-experiment \
  --experiment-template-id "$TEMPLATE_ID" \
  --query 'experiment.id' \
  --output text)

echo "Experiment started: ${EXPERIMENT_ID}"
echo ""

# 実験状態を監視
echo "Monitoring experiment status..."
while true; do
  STATUS=$(aws fis get-experiment \
    --id "$EXPERIMENT_ID" \
    --query 'experiment.state.status' \
    --output text)

  echo "  Status: ${STATUS}"

  if [ "$STATUS" == "completed" ] || [ "$STATUS" == "stopped" ] || [ "$STATUS" == "failed" ]; then
    break
  fi

  sleep 10
done

# 結果表示
echo ""
echo "=========================================="
echo "  Experiment Result"
echo "=========================================="
aws fis get-experiment --id "$EXPERIMENT_ID" \
  --query '{
    Status: experiment.state.status,
    Reason: experiment.state.reason,
    StartTime: experiment.startTime,
    EndTime: experiment.endTime,
    Actions: experiment.actions
  }' \
  --output yaml
```

```bash
# scripts/analyze-experiment.sh
#!/bin/bash
set -e

# 使用方法
if [ $# -lt 1 ]; then
  echo "Usage: $0 <experiment-id>"
  exit 1
fi

EXPERIMENT_ID=$1

echo "=========================================="
echo "  Experiment Analysis: ${EXPERIMENT_ID}"
echo "=========================================="

# 実験情報取得
EXPERIMENT=$(aws fis get-experiment --id "$EXPERIMENT_ID")

START_TIME=$(echo "$EXPERIMENT" | jq -r '.experiment.startTime')
END_TIME=$(echo "$EXPERIMENT" | jq -r '.experiment.endTime')

echo ""
echo "Duration: ${START_TIME} - ${END_TIME}"

# CloudWatch Logs Insights でエラーを検索
echo ""
echo "Searching for errors during experiment..."

LOG_GROUP="/aws/fis/shopnow-chaos"
QUERY='fields @timestamp, @message
| filter @message like /error|exception|fail/i
| sort @timestamp desc
| limit 50'

QUERY_ID=$(aws logs start-query \
  --log-group-name "$LOG_GROUP" \
  --start-time "$(date -d "$START_TIME" +%s)" \
  --end-time "$(date -d "$END_TIME" +%s)" \
  --query-string "$QUERY" \
  --output text)

sleep 5

aws logs get-query-results --query-id "$QUERY_ID" \
  --query 'results[*]' \
  --output table

# メトリクス分析
echo ""
echo "Key Metrics during experiment:"
echo ""

# エラー率
echo "5XX Errors:"
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --period 60 \
  --statistics Sum \
  --dimensions Name=LoadBalancer,Value=app/shopnow-chaos-alb/xxxxx \
  --query 'Datapoints[*].[Timestamp,Sum]' \
  --output table

# レイテンシ
echo ""
echo "Response Time (p99):"
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --period 60 \
  --extended-statistics p99 \
  --dimensions Name=LoadBalancer,Value=app/shopnow-chaos-alb/xxxxx \
  --query 'Datapoints[*].[Timestamp,ExtendedStatistics.p99]' \
  --output table
```

---

## 8. トラブルシューティング演習

### 演習8-1: 実験が予期せず停止

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-1                      │
│                実験が予期せず停止                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  ECSタスク停止実験を開始したところ、すぐに実験が                 │
│  「stopped」状態になり、障害注入が完了していない。               │
│                                                                  │
│  【エラーログ】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Experiment stopped: Stop condition triggered                ││
│  │  Alarm: shopnow-chaos-fis-stop-condition                     ││
│  │  State: ALARM                                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. Stop Conditionが発動した原因を調査してください               │
│  2. 適切なStop Condition閾値を検討してください                   │
│  3. 既存のエラーと実験由来のエラーを区別する方法を提案           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**解決策例**

```bash
# 1. Stop Conditionアラームの状態履歴を確認
aws cloudwatch describe-alarm-history \
  --alarm-name "shopnow-chaos-fis-stop-condition" \
  --start-date $(date -d "1 hour ago" --iso-8601=seconds) \
  --query 'AlarmHistoryItems[*].[Timestamp,HistorySummary]' \
  --output table

# 2. 実験前のベースラインエラー率を確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --start-time $(date -d "1 hour ago" --iso-8601=seconds) \
  --end-time $(date --iso-8601=seconds) \
  --period 60 \
  --statistics Sum \
  --dimensions Name=LoadBalancer,Value=app/shopnow-chaos-alb/xxxxx

# 3. 改善案: Anomaly Detection ベースのStop Condition
```

```hcl
# 異常検知ベースのStop Condition
resource "aws_cloudwatch_metric_alarm" "stop_condition_anomaly" {
  alarm_name          = "${var.name_prefix}-fis-stop-condition-anomaly"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 2
  threshold_metric_id = "ad1"

  metric_query {
    id          = "m1"
    return_data = true
    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  metric_query {
    id          = "ad1"
    expression  = "ANOMALY_DETECTION_BAND(m1, 2)"
    label       = "ErrorRateAnomalyBand"
    return_data = true
  }

  alarm_description = "Stop FIS if error rate shows anomalous increase"
  actions_enabled   = false
}
```

### 演習8-2: 自動回復が機能しない

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-2                      │
│               自動回復が機能しない                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  ECSタスクを30%停止した後、新しいタスクが                        │
│  起動せず、サービスが縮退したままになっている。                  │
│                                                                  │
│  【観測されている状態】                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Desired tasks: 10                                          ││
│  │  Running tasks: 7                                           ││
│  │  Pending tasks: 3 (30分以上)                                ││
│  │                                                              ││
│  │  Recent events:                                             ││
│  │  - service shopnow unable to place task                     ││
│  │  - Reason: no container instance met all requirements       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. 新しいタスクが起動しない原因を特定してください               │
│  2. ECSサービスの設定を改善してください                          │
│  3. 自動回復を検証する手順を策定してください                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 演習8-3: フェイルオーバー時間の超過

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-3                      │
│              DBフェイルオーバー時間超過                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  Aurora Failover実験を実施したところ、フェイルオーバー自体は     │
│  成功したが、アプリケーションの復旧に5分以上かかった。           │
│  SLO目標は30秒以内。                                             │
│                                                                  │
│  【観測されたタイムライン】                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  T+0s:    Failover開始                                      ││
│  │  T+15s:   新Writer昇格完了                                  ││
│  │  T+30s:   DNSエンドポイント更新                             ││
│  │  T+180s:  アプリケーション接続再開始                        ││
│  │  T+300s:  全コネクション復旧                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. アプリケーション復旧に時間がかかった原因を特定               │
│  2. 接続プール設定の改善案を提案                                 │
│  3. より迅速な復旧を実現する方法を検討                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 設計課題

### 設計課題9-1: GameDay計画書の作成

```
┌─────────────────────────────────────────────────────────────────┐
│                      設計課題 9-1                                │
│                 GameDay計画書の作成                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【課題】                                                        │
│  ShopNowの運用チーム向けに、四半期ごとに実施する                 │
│  GameDay（障害対応訓練）の計画書を作成してください。             │
│                                                                  │
│  【含めるべき内容】                                              │
│  ・目的と学習目標                                                │
│  ・参加者と役割（司会、オブザーバー、対応者）                    │
│  ・シナリオ（3段階の障害エスカレーション）                       │
│  ・タイムライン（準備→実施→振り返り）                            │
│  ・成功基準（MTTR、コミュニケーション、手順遵守）                │
│  ・安全措置（中止条件、ロールバック手順）                        │
│                                                                  │
│  【成果物】                                                      │
│  1. GameDay計画書（Markdownドキュメント）                        │
│  2. 障害シナリオシート（3シナリオ）                              │
│  3. 振り返りテンプレート                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 設計課題9-2: SLO/SLIダッシュボード設計

```
┌─────────────────────────────────────────────────────────────────┐
│                      設計課題 9-2                                │
│              SLO/SLIダッシュボード設計                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【課題】                                                        │
│  カオス実験の効果を定量的に測定するための                        │
│  SLO/SLIダッシュボードを設計してください。                       │
│                                                                  │
│  【要件】                                                        │
│  ・可用性SLI（99.9%目標）のリアルタイム表示                      │
│  ・レイテンシSLI（p99 < 2秒）のヒストグラム                      │
│  ・エラーバジェット残量の可視化                                  │
│  ・過去30日間のSLO達成状況                                       │
│  ・カオス実験実施履歴との相関                                    │
│                                                                  │
│  【成果物】                                                      │
│  1. SLO/SLI定義書                                                │
│  2. CloudWatchダッシュボードのTerraformコード                    │
│  3. エラーバジェット計算ロジック                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. 発展課題

### 発展課題10-1: CI/CDパイプラインへの統合

```
┌─────────────────────────────────────────────────────────────────┐
│                      発展課題 10-1                               │
│             CI/CDパイプラインへの統合                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【シナリオ】                                                    │
│  デプロイパイプラインにカオス実験を組み込み、                    │
│  本番デプロイ前に自動で耐障害性テストを実施したい。              │
│                                                                  │
│  【技術要件】                                                    │
│  ・CodePipeline/GitHub Actionsとの統合                          │
│  ・ステージング環境での自動実験実行                              │
│  ・実験結果による承認ゲート                                      │
│  ・失敗時の自動ロールバック                                      │
│                                                                  │
│  【成果物】                                                      │
│  1. パイプライン設計図                                           │
│  2. GitHub Actions ワークフローYAML                              │
│  3. 結果判定ロジック                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 発展課題10-2: マルチリージョン障害訓練

```
┌─────────────────────────────────────────────────────────────────┐
│                      発展課題 10-2                               │
│              マルチリージョン障害訓練                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【シナリオ】                                                    │
│  ShopNowがマルチリージョン構成に拡大した場合の                   │
│  リージョン障害訓練を設計してください。                          │
│                                                                  │
│  【技術要件】                                                    │
│  ・東京リージョン完全停止のシミュレーション                      │
│  ・Route 53フェイルオーバーの検証                                │
│  ・データレプリケーション整合性の確認                            │
│  ・復旧手順の自動化                                              │
│                                                                  │
│  【成果物】                                                      │
│  1. マルチリージョン障害対応手順書                               │
│  2. リージョンフェイルオーバー実験テンプレート                   │
│  3. RPO/RTO検証レポートテンプレート                              │
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
│  【カオスエンジニアリング基礎】                                  │
│  □ カオスエンジニアリングの5原則を説明できる                    │
│  □ 定常状態の仮説を立てることができる                           │
│  □ 実験の影響範囲を制御する方法を理解した                       │
│  □ GameDayの企画・運営ができる                                  │
│                                                                  │
│  【AWS FIS】                                                     │
│  □ 実験テンプレートを設計・作成できる                           │
│  □ 適切なStop Conditionを設定できる                             │
│  □ 各種アクション（EC2, ECS, RDS等）を使い分けられる            │
│  □ TerraformでFISリソースを管理できる                           │
│                                                                  │
│  【監視と分析】                                                  │
│  □ SLO/SLIを定義できる                                          │
│  □ CloudWatch Syntheticsで外形監視を設定できる                  │
│  □ 実験結果を分析し、改善点を特定できる                         │
│  □ ダッシュボードで可視化できる                                 │
│                                                                  │
│  【運用】                                                        │
│  □ 安全に本番環境で実験を実施できる                             │
│  □ インシデント対応手順を改善できる                             │
│  □ ポストモーテムを作成できる                                   │
│  □ 継続的な改善サイクルを回せる                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### カオスエンジニアリング成熟度モデル

```
┌─────────────────────────────────────────────────────────────────┐
│               カオスエンジニアリング成熟度モデル                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Level 1: 初期段階                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ・手動での障害テスト                                       ││
│  │  ・開発環境のみ                                             ││
│  │  ・ドキュメント化されていない                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                     ↓                                            │
│  Level 2: 管理段階                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ・FISによる自動化された実験                                ││
│  │  ・ステージング環境での定期実行                             ││
│  │  ・実験結果のドキュメント化                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                     ↓                                            │
│  Level 3: 定義段階  ← 本課題の目標                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ・本番環境での安全な実験                                   ││
│  │  ・SLO/SLIに基づく評価                                      ││
│  │  ・GameDayの定期開催                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                     ↓                                            │
│  Level 4: 最適化段階                                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ・CI/CDパイプラインへの統合                                ││
│  │  ・継続的な実験と改善                                       ││
│  │  ・組織全体への展開                                         ││
│  └─────────────────────────────────────────────────────────────┘│
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
│  【FIS実験コスト】                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                    │ 数量            │ 月額（USD）    ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  FIS実験（アクション分） │ 100アクション   │ $10            ││
│  │  CloudWatch Logs         │ 5GB             │ $2.50          ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $12.50      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【監視コスト】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                    │ 数量            │ 月額（USD）    ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  CloudWatch Alarms       │ 10アラーム      │ $1.00          ││
│  │  CloudWatch Dashboards   │ 3ダッシュボード │ $9.00          ││
│  │  CloudWatch Synthetics   │ 1 canary/1min   │ $7.92          ││
│  │  CloudWatch Metrics      │ カスタム10個    │ $3.00          ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $20.92      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【サンプルワークロード（オプション）】                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                    │ 数量            │ 月額（USD）    ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  ECS Fargate             │ 2 vCPU × 3タスク│ $88            ││
│  │  Aurora Serverless v2    │ 最小ACU         │ $43            ││
│  │  ALB                     │ 1 ALB           │ $22            ││
│  │  NAT Gateway             │ 1 NAT           │ $32            ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $185        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【総計】                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  FIS + 監視のみ:         約 $33/月 (約 ¥5,000)              ││
│  │  サンプル環境込み:       約 $218/月 (約 ¥33,000)            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ※ FISの料金はアクション分単位で課金                            │
│  ※ 本番環境への適用時は追加コストなし                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## リソースのクリーンアップ

```bash
# Terraformリソース削除
cd ~/shopnow-chaos/terraform
terraform destroy -auto-approve

# 確認
aws fis list-experiment-templates \
  --query "experimentTemplates[?contains(tags.Name, 'shopnow-chaos')]"

# S3バケット（Syntheticsアーティファクト）の手動削除が必要な場合
aws s3 rb s3://shopnow-chaos-synthetics-$(aws sts get-caller-identity --query Account --output text) --force

echo "Cleanup completed!"
```

---

**次の課題**: [課題36: SmartRetail SageMakerモデル基盤](exercise-36.md)

**前の課題**: [課題34: PayEasy Step Functionsワークフロー](exercise-34.md)
