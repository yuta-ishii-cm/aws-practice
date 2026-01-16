# 課題26: 広告テック企業のマイクロサービスCI/CD

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | IaC・DevOps |
| 処理形態 | マイクロサービスCI/CD |
| 使用するIaCツール | Terraform + CodePipeline |
| 想定所要時間 | 6-7時間 |

---

## 2. シナリオ

### 企業プロフィール
**AdOptimizer株式会社**は、プログラマティック広告配信プラットフォームを提供するアドテック企業です。10個のマイクロサービスで構成されるシステムを運用しており、毎秒数万リクエストを処理しています。

### 現状の課題
マイクロサービス化は完了したものの、デプロイとテストの運用が追いついていません：

1. **デプロイの複雑化**：10サービスの依存関係管理が困難
2. **統合テストの不足**：サービス間連携のテストが手動
3. **環境の再現性**：開発環境と本番環境の差異で障害発生
4. **リリースサイクルの遅延**：全サービスの足並みを揃えるのに時間がかかる

### 数値で見る問題
- サービスあたりのデプロイ時間：**45分**
- 統合テスト実行時間：**3時間**（手動）
- 環境差異による障害：月 **5件**
- リリースサイクル：**2週間**（目標：毎日）

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 個別サービスデプロイ時間 | 45分 | 10分 |
| 統合テスト実行時間 | 3時間 | 30分（自動） |
| 環境差異障害 | 5件/月 | 0件/月 |
| リリース頻度 | 2週間 | 毎日可能 |

---

## 3. 学習目標

### 主要な学習成果
1. マイクロサービスごとの独立したCI/CDパイプラインの構築
2. サービス間依存関係を考慮した統合テストの自動化
3. ECRを使ったコンテナイメージ管理とタグ戦略
4. GitOpsパターンの基礎理解

### 習得するスキル
- CodePipeline + CodeBuildによるマルチサービスCI/CD
- ECRイメージスキャンとセキュリティ対策
- サービスメッシュ（App Mesh）でのトラフィック制御
- Contract Testing（Pact等）の概念

---

## 4. 使用するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| CodePipeline | CI/CDパイプライン | 高 |
| CodeBuild | ビルド・テスト実行 | 高 |
| ECR | コンテナイメージ保存 | 高 |
| ECS Fargate | マイクロサービス実行 | 高 |
| App Mesh | サービスメッシュ | 中 |
| ALB | API Gateway / ロードバランサー | 高 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| CloudWatch | ログ・メトリクス |
| X-Ray | 分散トレーシング |
| Secrets Manager | シークレット管理 |
| SNS | 通知 |
| S3 | アーティファクト保存 |
| DynamoDB | サービス設定管理 |

---

## 5. 前提条件

### 必要な知識
- マイクロサービスアーキテクチャの基本概念
- Dockerの基本操作
- CI/CDの基本概念
- RESTful APIの設計

### 事前準備
1. AWSアカウント
2. GitHubアカウントとCodeStar Connection設定済み
3. AWS CLI v2
4. Docker Desktop
5. Terraform CLI

### 環境要件
```bash
terraform --version  # 1.5以上
docker --version
aws --version
```

---

## 6. アーキテクチャ概要

### システム構成図
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GitHub Organization                             │
│                                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ ad-bidder    │ │ ad-server    │ │ user-service │ │ reporting    │  ...  │
│  │   repo       │ │   repo       │ │   repo       │ │   repo       │       │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘       │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CodePipeline (per service)                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Pipeline: ad-bidder                                                  │   │
│  │ Source → Build → Unit Test → Push ECR → Deploy Dev →                │   │
│  │          Integration Test → Deploy Stg → Approval → Deploy Prod     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Pipeline: ad-server (same structure)                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   ...                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ECR Repositories                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ ad-bidder  │ │ ad-server  │ │user-service│ │ reporting  │  ...         │
│  │ :latest    │ │ :latest    │ │ :latest    │ │ :latest    │               │
│  │ :v1.2.3    │ │ :v2.0.1    │ │ :v1.0.5    │ │ :v3.1.0    │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ECS Cluster (per env)                             │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │                         AWS App Mesh                                    ││
│  │  ┌─────────────────────────────────────────────────────────────────┐  ││
│  │  │                    Virtual Gateway (ALB)                         │  ││
│  │  └───────────────────────────┬─────────────────────────────────────┘  ││
│  │                              │                                         ││
│  │    ┌─────────────────────────┼─────────────────────────┐              ││
│  │    ▼                         ▼                         ▼              ││
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐            ││
│  │  │ ad-bidder    │───▶│ user-service │    │ ad-server    │            ││
│  │  │ (Virtual     │    │ (Virtual     │◀───│ (Virtual     │            ││
│  │  │  Service)    │    │  Service)    │    │  Service)    │            ││
│  │  └──────────────┘    └──────┬───────┘    └──────────────┘            ││
│  │                             │                                         ││
│  │                             ▼                                         ││
│  │                    ┌──────────────┐                                   ││
│  │                    │ reporting    │                                   ││
│  │                    │ (Virtual     │                                   ││
│  │                    │  Service)    │                                   ││
│  │                    └──────────────┘                                   ││
│  └────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### サービス一覧
| サービス名 | 役割 | 依存サービス |
|-----------|------|-------------|
| ad-bidder | 入札エンジン | user-service, ad-inventory |
| ad-server | 広告配信 | ad-bidder, creative-service |
| user-service | ユーザー管理 | なし |
| creative-service | クリエイティブ管理 | なし |
| ad-inventory | 広告枠管理 | なし |
| reporting | レポーティング | ad-server, user-service |
| campaign-service | キャンペーン管理 | user-service |
| billing-service | 課金管理 | campaign-service, reporting |
| notification-service | 通知 | user-service |
| analytics-service | 分析 | reporting |

---

## 7. ハンズオン手順

### Phase 1: 基盤インフラのTerraform化（60分）

#### Step 1-1: ディレクトリ構造

```
adoptimizer-infra/
├── terraform/
│   ├── modules/
│   │   ├── ecr/
│   │   ├── ecs-cluster/
│   │   ├── ecs-service/
│   │   ├── codepipeline/
│   │   └── app-mesh/
│   ├── environments/
│   │   ├── dev/
│   │   ├── stg/
│   │   └── prod/
│   └── shared/
│       └── ecr.tf
├── services/
│   ├── ad-bidder/
│   ├── ad-server/
│   └── ... (各サービスのソースコード)
└── tests/
    └── integration/
```

#### Step 1-2: ECRモジュール

```hcl
# terraform/modules/ecr/main.tf
variable "services" {
  type        = list(string)
  description = "List of microservice names"
}

variable "project_name" {
  type = string
}

resource "aws_ecr_repository" "services" {
  for_each = toset(var.services)

  name                 = "${var.project_name}/${each.value}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Service = each.value
  }
}

# ライフサイクルポリシー
resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = toset(var.services)
  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 5 dev images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["dev-"]
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

output "repository_urls" {
  value = {
    for name, repo in aws_ecr_repository.services :
    name => repo.repository_url
  }
}
```

#### Step 1-3: ECSサービスモジュール

```hcl
# terraform/modules/ecs-service/main.tf
variable "service_name" {
  type = string
}

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "cluster_id" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "container_port" {
  type    = number
  default = 8080
}

variable "cpu" {
  type    = number
  default = 256
}

variable "memory" {
  type    = number
  default = 512
}

variable "desired_count" {
  type    = number
  default = 2
}

variable "ecr_repository_url" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "target_group_arn" {
  type    = string
  default = ""
}

variable "app_mesh_virtual_node_name" {
  type    = string
  default = ""
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "secrets" {
  type    = map(string)
  default = {}
}

locals {
  name_prefix = "${var.project_name}-${var.environment}-${var.service_name}"
}

# Security Group
resource "aws_security_group" "service" {
  name        = "${local.name_prefix}-sg"
  description = "Security group for ${var.service_name}"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = var.container_port
    to_port     = var.container_port
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${local.name_prefix}-sg"
    Service = var.service_name
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "service" {
  name              = "/ecs/${var.project_name}/${var.environment}/${var.service_name}"
  retention_in_days = var.environment == "prod" ? 90 : 14

  tags = {
    Service = var.service_name
  }
}

# Task Definition
resource "aws_ecs_task_definition" "service" {
  family                   = local.name_prefix
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = var.service_name
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        for key, value in merge(var.environment_variables, {
          SERVICE_NAME = var.service_name
          ENVIRONMENT  = var.environment
        }) : {
          name  = key
          value = value
        }
      ]

      secrets = [
        for key, arn in var.secrets : {
          name      = key
          valueFrom = arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.service.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = var.service_name
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.container_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    },
    # Envoy Sidecar (App Mesh)
    var.app_mesh_virtual_node_name != "" ? {
      name      = "envoy"
      image     = "840364872350.dkr.ecr.ap-northeast-1.amazonaws.com/aws-appmesh-envoy:v1.27.0.0-prod"
      essential = true
      user      = "1337"

      environment = [
        {
          name  = "APPMESH_RESOURCE_ARN"
          value = var.app_mesh_virtual_node_name
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -s http://localhost:9901/server_info | grep state | grep -q LIVE"]
        interval    = 5
        timeout     = 2
        retries     = 3
        startPeriod = 10
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.service.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "envoy"
        }
      }
    } : null
  ])

  dynamic "proxy_configuration" {
    for_each = var.app_mesh_virtual_node_name != "" ? [1] : []
    content {
      type           = "APPMESH"
      container_name = "envoy"
      properties = {
        AppPorts         = tostring(var.container_port)
        EgressIgnoredIPs = "169.254.170.2,169.254.169.254"
        IgnoredUID       = "1337"
        ProxyEgressPort  = 15001
        ProxyIngressPort = 15000
      }
    }
  }

  tags = {
    Service = var.service_name
  }
}

# ECS Service
resource "aws_ecs_service" "service" {
  name            = local.name_prefix
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.service.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = var.target_group_arn != "" ? [1] : []
    content {
      target_group_arn = var.target_group_arn
      container_name   = var.service_name
      container_port   = var.container_port
    }
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Service = var.service_name
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "service" {
  max_capacity       = var.desired_count * 5
  min_capacity       = var.desired_count
  resource_id        = "service/${split("/", var.cluster_id)[1]}/${aws_ecs_service.service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${local.name_prefix}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.service.resource_id
  scalable_dimension = aws_appautoscaling_target.service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}

# IAM Roles
resource "aws_iam_role" "task_execution" {
  name = "${local.name_prefix}-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name = "${local.name_prefix}-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "task_xray" {
  name = "xray-access"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ]
      Resource = "*"
    }]
  })
}

data "aws_region" "current" {}

output "service_name" {
  value = aws_ecs_service.service.name
}

output "security_group_id" {
  value = aws_security_group.service.id
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.service.arn
}
```

### Phase 2: CodePipelineモジュール（60分）

#### Step 2-1: サービス別パイプラインモジュール

```hcl
# terraform/modules/codepipeline/main.tf
variable "service_name" {
  type = string
}

variable "project_name" {
  type = string
}

variable "repository_owner" {
  type = string
}

variable "repository_name" {
  type = string
}

variable "branch" {
  type    = string
  default = "main"
}

variable "codestar_connection_arn" {
  type = string
}

variable "ecr_repository_url" {
  type = string
}

variable "ecs_cluster_name" {
  type = string
}

variable "ecs_service_name_dev" {
  type = string
}

variable "ecs_service_name_stg" {
  type = string
}

variable "ecs_service_name_prod" {
  type = string
}

variable "notification_topic_arn" {
  type = string
}

variable "integration_test_commands" {
  type    = list(string)
  default = ["echo 'No integration tests configured'"]
}

locals {
  name_prefix = "${var.project_name}-${var.service_name}"
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Artifact Bucket
resource "aws_s3_bucket" "artifacts" {
  bucket = "${local.name_prefix}-artifacts-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

# CodeBuild - Build & Unit Test
resource "aws_codebuild_project" "build" {
  name         = "${local.name_prefix}-build"
  description  = "Build and unit test for ${var.service_name}"
  service_role = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = true
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ECR_REPO_URL"
      value = var.ecr_repository_url
    }

    environment_variable {
      name  = "SERVICE_NAME"
      value = var.service_name
    }

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = <<-EOF
      version: 0.2
      phases:
        pre_build:
          commands:
            - echo Logging in to Amazon ECR...
            - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
            - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
            - IMAGE_TAG=$${COMMIT_HASH:-latest}
        build:
          commands:
            - echo Build started on `date`
            - echo Running unit tests...
            - npm ci
            - npm run test:unit
            - echo Building the Docker image...
            - docker build -t $ECR_REPO_URL:$IMAGE_TAG .
            - docker tag $ECR_REPO_URL:$IMAGE_TAG $ECR_REPO_URL:latest
        post_build:
          commands:
            - echo Build completed on `date`
            - echo Pushing the Docker image...
            - docker push $ECR_REPO_URL:$IMAGE_TAG
            - docker push $ECR_REPO_URL:latest
            - printf '{"ImageURI":"%s"}' $ECR_REPO_URL:$IMAGE_TAG > imageDetail.json
            - echo "IMAGE_TAG=$IMAGE_TAG" > build_info.txt
      artifacts:
        files:
          - imageDetail.json
          - build_info.txt
          - appspec.yaml
          - taskdef.json
      reports:
        unit-tests:
          files:
            - 'test-results/*.xml'
          file-format: JUNITXML
    EOF
  }

  cache {
    type  = "LOCAL"
    modes = ["LOCAL_DOCKER_LAYER_CACHE", "LOCAL_SOURCE_CACHE"]
  }

  tags = {
    Service = var.service_name
  }
}

# CodeBuild - Integration Test
resource "aws_codebuild_project" "integration_test" {
  name         = "${local.name_prefix}-integration-test"
  description  = "Integration tests for ${var.service_name}"
  service_role = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = false
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "SERVICE_NAME"
      value = var.service_name
    }

    environment_variable {
      name  = "TEST_ENVIRONMENT"
      value = "dev"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = <<-EOF
      version: 0.2
      phases:
        install:
          commands:
            - npm ci
        build:
          commands:
            - echo Running integration tests for $SERVICE_NAME
            ${join("\n            ", [for cmd in var.integration_test_commands : "- ${cmd}"])}
      reports:
        integration-tests:
          files:
            - 'test-results/integration/*.xml'
          file-format: JUNITXML
    EOF
  }

  tags = {
    Service = var.service_name
  }
}

# CodeBuild - Deploy
resource "aws_codebuild_project" "deploy" {
  for_each = toset(["dev", "stg", "prod"])

  name         = "${local.name_prefix}-deploy-${each.key}"
  description  = "Deploy ${var.service_name} to ${each.key}"
  service_role = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = false
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ECS_CLUSTER"
      value = var.ecs_cluster_name
    }

    environment_variable {
      name  = "ECS_SERVICE"
      value = each.key == "dev" ? var.ecs_service_name_dev : each.key == "stg" ? var.ecs_service_name_stg : var.ecs_service_name_prod
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = each.key
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = <<-EOF
      version: 0.2
      phases:
        build:
          commands:
            - echo Deploying to $ENVIRONMENT environment
            - source build_info.txt
            - |
              aws ecs update-service \
                --cluster $ECS_CLUSTER \
                --service $ECS_SERVICE \
                --force-new-deployment
            - echo Waiting for deployment to stabilize...
            - |
              aws ecs wait services-stable \
                --cluster $ECS_CLUSTER \
                --services $ECS_SERVICE
            - echo Deployment completed
    EOF
  }

  tags = {
    Service     = var.service_name
    Environment = each.key
  }
}

# CodePipeline
resource "aws_codepipeline" "pipeline" {
  name     = local.name_prefix
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  # Source Stage
  stage {
    name = "Source"

    action {
      name             = "GitHub_Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = var.codestar_connection_arn
        FullRepositoryId = "${var.repository_owner}/${var.repository_name}"
        BranchName       = var.branch
      }
    }
  }

  # Build Stage
  stage {
    name = "Build"

    action {
      name             = "Build_and_Test"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.build.name
      }
    }
  }

  # Deploy Dev
  stage {
    name = "Deploy_Dev"

    action {
      name            = "Deploy_to_Dev"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ProjectName = aws_codebuild_project.deploy["dev"].name
      }
    }
  }

  # Integration Test
  stage {
    name = "Integration_Test"

    action {
      name            = "Run_Integration_Tests"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["source_output"]
      version         = "1"

      configuration = {
        ProjectName = aws_codebuild_project.integration_test.name
      }
    }
  }

  # Deploy Staging
  stage {
    name = "Deploy_Staging"

    action {
      name            = "Deploy_to_Staging"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ProjectName = aws_codebuild_project.deploy["stg"].name
      }
    }
  }

  # Production Approval
  stage {
    name = "Production_Approval"

    action {
      name     = "Approval"
      category = "Approval"
      owner    = "AWS"
      provider = "Manual"
      version  = "1"

      configuration = {
        NotificationArn = var.notification_topic_arn
        CustomData      = "Approve deployment of ${var.service_name} to production?"
      }
    }
  }

  # Deploy Production
  stage {
    name = "Deploy_Production"

    action {
      name            = "Deploy_to_Production"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ProjectName = aws_codebuild_project.deploy["prod"].name
      }
    }
  }

  tags = {
    Service = var.service_name
  }
}

# IAM Roles
resource "aws_iam_role" "codebuild" {
  name = "${local.name_prefix}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "codebuild.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "codebuild" {
  name = "codebuild-policy"
  role = aws_iam_role.codebuild.id

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
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.artifacts.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "codebuild:BatchGetBuilds",
          "codebuild:StartBuild",
          "codebuild:BatchPutTestCases",
          "codebuild:CreateReportGroup",
          "codebuild:CreateReport",
          "codebuild:UpdateReport"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "codepipeline" {
  name = "${local.name_prefix}-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "codepipeline.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "codepipeline" {
  name = "codepipeline-policy"
  role = aws_iam_role.codepipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:GetBucketVersioning"
        ]
        Resource = [
          aws_s3_bucket.artifacts.arn,
          "${aws_s3_bucket.artifacts.arn}/*"
        ]
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
          "codebuild:BatchGetBuilds",
          "codebuild:StartBuild"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.notification_topic_arn
      }
    ]
  })
}

# CloudWatch Event for Pipeline notifications
resource "aws_cloudwatch_event_rule" "pipeline_status" {
  name        = "${local.name_prefix}-pipeline-status"
  description = "Capture pipeline state changes"

  event_pattern = jsonencode({
    source      = ["aws.codepipeline"]
    detail-type = ["CodePipeline Pipeline Execution State Change"]
    detail = {
      pipeline = [aws_codepipeline.pipeline.name]
      state    = ["FAILED", "SUCCEEDED"]
    }
  })
}

resource "aws_cloudwatch_event_target" "pipeline_notification" {
  rule      = aws_cloudwatch_event_rule.pipeline_status.name
  target_id = "send-to-sns"
  arn       = var.notification_topic_arn

  input_transformer {
    input_paths = {
      pipeline = "$.detail.pipeline"
      state    = "$.detail.state"
    }
    input_template = "\"Pipeline <pipeline> is in state <state>\""
  }
}

output "pipeline_name" {
  value = aws_codepipeline.pipeline.name
}

output "pipeline_arn" {
  value = aws_codepipeline.pipeline.arn
}
```

### Phase 3: 統合テスト環境の構築（60分）

#### Step 3-1: Contract Testing（Pact）の導入

```javascript
// services/ad-bidder/tests/contracts/userService.pact.js
const { Pact } = require('@pact-foundation/pact');
const { like, eachLike } = require('@pact-foundation/pact').Matchers;
const path = require('path');
const UserServiceClient = require('../../src/clients/userServiceClient');

describe('User Service Contract', () => {
  const provider = new Pact({
    consumer: 'ad-bidder',
    provider: 'user-service',
    port: 1234,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'INFO',
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('get user by ID', () => {
    beforeEach(() => {
      return provider.addInteraction({
        state: 'a user with ID 123 exists',
        uponReceiving: 'a request for user 123',
        withRequest: {
          method: 'GET',
          path: '/api/v1/users/123',
          headers: {
            Accept: 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            id: like('123'),
            name: like('Test User'),
            email: like('test@example.com'),
            segments: eachLike({
              id: like('seg-001'),
              name: like('High Value'),
            }),
          },
        },
      });
    });

    it('returns user data', async () => {
      const client = new UserServiceClient(`http://localhost:${provider.opts.port}`);
      const user = await client.getUser('123');

      expect(user.id).toBe('123');
      expect(user.segments).toBeInstanceOf(Array);
    });
  });

  describe('user not found', () => {
    beforeEach(() => {
      return provider.addInteraction({
        state: 'user 999 does not exist',
        uponReceiving: 'a request for non-existent user 999',
        withRequest: {
          method: 'GET',
          path: '/api/v1/users/999',
          headers: {
            Accept: 'application/json',
          },
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'User not found',
            code: 'USER_NOT_FOUND',
          },
        },
      });
    });

    it('throws error for non-existent user', async () => {
      const client = new UserServiceClient(`http://localhost:${provider.opts.port}`);

      await expect(client.getUser('999')).rejects.toThrow('User not found');
    });
  });
});
```

#### Step 3-2: E2E統合テスト

```javascript
// tests/integration/ad-flow.test.js
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

describe('Ad Bidding Flow Integration Tests', () => {
  let testUserId;
  let testCampaignId;

  beforeAll(async () => {
    // Setup test data
    const userResponse = await axios.post(`${BASE_URL}/api/v1/users`, {
      name: 'Integration Test User',
      email: `test-${Date.now()}@example.com`,
    });
    testUserId = userResponse.data.id;

    const campaignResponse = await axios.post(`${BASE_URL}/api/v1/campaigns`, {
      name: 'Test Campaign',
      budget: 10000,
      userId: testUserId,
    });
    testCampaignId = campaignResponse.data.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testCampaignId) {
      await axios.delete(`${BASE_URL}/api/v1/campaigns/${testCampaignId}`);
    }
    if (testUserId) {
      await axios.delete(`${BASE_URL}/api/v1/users/${testUserId}`);
    }
  });

  describe('Bid Request Flow', () => {
    it('should process bid request and return valid response', async () => {
      const bidRequest = {
        id: `bid-${Date.now()}`,
        imp: [{
          id: 'imp-1',
          banner: {
            w: 300,
            h: 250,
          },
        }],
        site: {
          domain: 'example.com',
          page: 'https://example.com/article',
        },
        user: {
          id: testUserId,
        },
      };

      const response = await axios.post(`${BASE_URL}/api/v1/bid`, bidRequest);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('seatbid');
      expect(response.data.seatbid[0]).toHaveProperty('bid');
    });

    it('should return no-bid for blocked domain', async () => {
      const bidRequest = {
        id: `bid-${Date.now()}`,
        imp: [{
          id: 'imp-1',
          banner: { w: 300, h: 250 },
        }],
        site: {
          domain: 'blocked-domain.com',
          page: 'https://blocked-domain.com/page',
        },
        user: { id: testUserId },
      };

      const response = await axios.post(`${BASE_URL}/api/v1/bid`, bidRequest);

      expect(response.status).toBe(204); // No Content (no-bid)
    });
  });

  describe('Service Health Checks', () => {
    const services = [
      { name: 'ad-bidder', port: 8081 },
      { name: 'ad-server', port: 8082 },
      { name: 'user-service', port: 8083 },
      { name: 'reporting', port: 8084 },
    ];

    services.forEach(({ name, port }) => {
      it(`${name} should be healthy`, async () => {
        const response = await axios.get(`http://localhost:${port}/health`);

        expect(response.status).toBe(200);
        expect(response.data.status).toBe('healthy');
      });
    });
  });

  describe('Cross-Service Data Consistency', () => {
    it('should maintain consistent user data across services', async () => {
      // Update user in user-service
      await axios.patch(`${BASE_URL}/api/v1/users/${testUserId}`, {
        segments: ['high-value', 'frequent-buyer'],
      });

      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify ad-bidder sees updated segments
      const bidRequest = {
        id: `bid-${Date.now()}`,
        imp: [{ id: 'imp-1', banner: { w: 300, h: 250 } }],
        site: { domain: 'example.com' },
        user: { id: testUserId },
      };

      const response = await axios.post(`${BASE_URL}/api/v1/bid`, bidRequest);

      // Should get higher bid for high-value segment
      expect(response.data.seatbid[0].bid[0].price).toBeGreaterThan(1.0);
    });
  });
});
```

### Phase 4: 監視とアラート設定（30分）

#### Step 4-1: サービス別ダッシュボード

```hcl
# terraform/modules/monitoring/main.tf
variable "service_name" {
  type = string
}

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "alarm_topic_arn" {
  type = string
}

locals {
  name_prefix = "${var.project_name}-${var.environment}-${var.service_name}"
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "service" {
  dashboard_name = local.name_prefix

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Request Count"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ECS", "RequestCount", "ServiceName", local.name_prefix]
          ]
          region = data.aws_region.current.name
          period = 60
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Response Time (p99)"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ECS", "TargetResponseTime", "ServiceName", local.name_prefix, { stat = "p99" }]
          ]
          region = data.aws_region.current.name
          period = 60
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "CPU Utilization"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", local.name_prefix]
          ]
          region = data.aws_region.current.name
          period = 60
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "Memory Utilization"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ServiceName", local.name_prefix]
          ]
          region = data.aws_region.current.name
          period = 60
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "Error Rate"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ECS", "HTTPCode_Target_5XX_Count", "ServiceName", local.name_prefix]
          ]
          region = data.aws_region.current.name
          period = 60
        }
      }
    ]
  })
}

# Alarms
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${local.name_prefix}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU utilization exceeds 80% for ${var.service_name}"

  dimensions = {
    ServiceName = local.name_prefix
    ClusterName = "${var.project_name}-${var.environment}"
  }

  alarm_actions = [var.alarm_topic_arn]
  ok_actions    = [var.alarm_topic_arn]
}

resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${local.name_prefix}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "5XX error count exceeds 10 for ${var.service_name}"

  alarm_actions = [var.alarm_topic_arn]
  ok_actions    = [var.alarm_topic_arn]
}

data "aws_region" "current" {}
```

---

## 8. トラブルシューティング課題

### Challenge 1: パイプラインの連鎖失敗
**状況**: ad-serverのデプロイが失敗し、依存するreportingサービスのパイプラインも停止

**調査ポイント**:
1. 各パイプラインのステージ状態を確認
2. サービス依存関係マトリクスを確認
3. ロールバック対象の特定

**解決コマンド**:
```bash
# 全パイプラインの状態を確認
for pipeline in ad-bidder ad-server user-service reporting; do
  echo "=== $pipeline ==="
  aws codepipeline get-pipeline-state --name adoptimizer-$pipeline \
    --query 'stageStates[*].[stageName,latestExecution.status]' \
    --output table
done
```

### Challenge 2: イメージスキャンでCritical脆弱性検出
**状況**: ECRのイメージスキャンでCritical脆弱性が見つかり、デプロイがブロック

**調査ポイント**:
1. 脆弱性の詳細を確認
2. 影響を受けるベースイメージを特定
3. 一時的な除外か、即座の修正が必要か判断

### Challenge 3: 統合テストのフレーキーテスト
**状況**: 統合テストが時々失敗し、パイプラインが不安定

**調査ポイント**:
1. テストログで失敗パターンを分析
2. 競合状態やタイムアウトの有無を確認
3. テストデータの分離状況を確認

---

## 9. 設計考慮ポイント

### ディスカッション1: モノレポ vs マルチレポ
**テーマ**: マイクロサービスのリポジトリ戦略

| 戦略 | メリット | デメリット |
|------|----------|------------|
| モノレポ | 依存関係管理が容易、アトミックな変更 | ビルド時間増加、権限管理が複雑 |
| マルチレポ | チーム独立性高い、ビルド高速 | 依存関係の同期が困難 |
| ハイブリッド | バランスが取れる | 複雑性増加 |

### ディスカッション2: テスト戦略
**テーマ**: テストピラミッドのバランス

```
        /\
       /  \  E2E Tests (少量・遅い)
      /----\
     /      \  Integration Tests
    /--------\
   /          \  Unit Tests (大量・高速)
  --------------
```

### ディスカッション3: サービス間通信
**テーマ**: 同期 vs 非同期通信

| パターン | ユースケース | 考慮点 |
|----------|------------|--------|
| REST/gRPC | 即座の応答が必要 | タイムアウト、サーキットブレーカー |
| イベント駆動 | 疎結合、耐障害性 | 結果整合性、デバッグの複雑さ |

---

## 10. 発展課題

### Advanced 1: GitOpsの導入
**課題**: ArgoCD または Flux を使って、Git をソースオブトゥルースとした宣言的デプロイを実装

### Advanced 2: カオスエンジニアリング
**課題**: AWS Fault Injection Simulator を使って、サービス障害時の振る舞いをテスト

### Advanced 3: 動的環境（Preview Environment）
**課題**: PRごとに一時的な環境を自動作成し、レビュー後に削除

---

## 11. コスト見積もり

### 月額コスト概算（10サービス × 3環境）

| 環境 | サービス | 構成 | 月額コスト |
|------|----------|------|------------|
| **Dev** | ECS Fargate | 0.25 vCPU / 0.5GB × 10サービス × 1タスク | $90 |
| | ALB | 1 | $16 |
| | NAT Gateway | 1 | $32 |
| | **小計** | | **$138** |
| **Stg** | ECS Fargate | 0.25 vCPU / 0.5GB × 10サービス × 2タスク | $180 |
| | ALB | 1 | $16 |
| | NAT Gateway | 1 | $32 |
| | **小計** | | **$228** |
| **Prod** | ECS Fargate | 0.5 vCPU / 1GB × 10サービス × 4タスク | $720 |
| | ALB | 1 | $16 |
| | NAT Gateway | 2 | $65 |
| | App Mesh | 10 Virtual Nodes | $50 |
| | **小計** | | **$851** |
| **CI/CD** | CodePipeline | 10 pipelines | $10 |
| | CodeBuild | 月1000分想定 | $50 |
| | ECR | 10GB | $1 |
| | S3 (Artifacts) | 50GB | $1 |
| | **小計** | | **$62** |

**合計**: 約 **$1,279/月**（約192,000円）

### コスト削減のヒント

1. **開発環境の自動停止**: 夜間・休日はタスク数を0に
2. **スポットインスタンス**: CodeBuildでスポット利用
3. **ビルドキャッシュ**: Docker layer cacheで時間短縮

---

## 12. 学習のポイント

### 重要な概念の整理

1. **独立デプロイ可能性**
   - 各サービスが独立してデプロイ可能
   - 後方互換性のあるAPI設計が重要
   - Contract Testingで依存関係を検証

2. **パイプラインの独立性**
   - サービスごとに独立したパイプライン
   - 共通モジュールは別途管理
   - 環境ごとのゲート（承認）

3. **イメージタグ戦略**
   - Semantic Versioning（v1.2.3）
   - Git Commit Hash（abc1234）
   - 環境タグ（dev-latest, prod-latest）

### GCPとの比較

| 概念 | AWS | GCP |
|------|-----|-----|
| CI/CD | CodePipeline + CodeBuild | Cloud Build |
| コンテナレジストリ | ECR | Artifact Registry |
| コンテナ実行 | ECS Fargate | Cloud Run / GKE |
| サービスメッシュ | App Mesh | Anthos Service Mesh |
| 分散トレーシング | X-Ray | Cloud Trace |

### 次のステップ
1. Feature Flags（AWS AppConfig）の導入
2. サービスメッシュでの高度なトラフィック制御
3. Observabilityプラットフォームの統合
