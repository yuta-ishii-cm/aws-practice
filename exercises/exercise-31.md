# 課題31: ニュースメディアのCMS基盤

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | コンテナ |
| 処理形態 | コンテナベースCMS |
| 使用するIaCツール | Terraform |
| 想定所要時間 | 5-6時間 |

---

## 2. シナリオ

### 企業プロフィール
**NewsDaily株式会社**は、政治・経済・スポーツなど幅広いジャンルのニュースを配信するオンラインメディアです。月間PVは1,000万を超え、速報ニュース配信時には瞬間的に10倍以上のアクセスが発生します。

### 現状の課題
オンプレミスのCMSサーバーでは、急激なトラフィック増加に対応できていません：

1. **スパイク対応の遅れ**：速報時にサーバーがダウンし、機会損失が発生
2. **コンテンツ配信の遅延**：画像・動画が重く、ページ読み込みが遅い
3. **可用性の問題**：単一障害点があり、メンテナンス時にサービス停止
4. **運用負荷**：サーバーの手動管理に工数を取られている

### 数値で見る問題
- 速報時のダウン回数：月 **3回**
- ページ読み込み時間：平均 **4秒**
- 可用性（SLA）：**99.0%**（目標99.9%）
- サーバー管理工数：月 **40時間**

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| スパイク時ダウン | 3回/月 | 0回 |
| ページ読み込み時間 | 4秒 | 1秒以下 |
| 可用性 | 99.0% | 99.9% |
| 運用工数 | 40時間/月 | 10時間/月 |

---

## 3. 学習目標

### 主要な学習成果
1. ECS Fargateによるコンテナベースアプリケーションの構築
2. CloudFrontとS3を組み合わせたコンテンツ配信最適化
3. Aurora Serverlessによるスケーラブルなデータベース構築
4. Application Auto Scalingによる自動スケーリング

### 習得するスキル
- ECS タスク定義とサービス設計
- CloudFront Cache Policy の設定
- S3 への静的アセット保存
- Auto Scaling ポリシーの設計

---

## 4. 使用するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| ECS Fargate | CMS アプリケーション実行 | 高 |
| Aurora Serverless v2 | コンテンツデータベース | 高 |
| CloudFront | CDN・コンテンツ配信 | 高 |
| S3 | 画像・動画ストレージ | 高 |
| ALB | ロードバランシング | 高 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| ElastiCache (Redis) | セッション・キャッシュ |
| ECR | コンテナイメージ保存 |
| CloudWatch | ログ・メトリクス |
| WAF | セキュリティ |
| Route 53 | DNS管理 |

---

## 5. 前提条件

### 必要な知識
- Dockerの基本操作
- HTTPの基本（キャッシュ、ヘッダー）
- CDNの概念

### 事前準備
1. AWSアカウント
2. AWS CLI v2
3. Docker Desktop
4. Terraform CLI

---

## 6. アーキテクチャ概要

### システム構成図
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Users (Readers)                                 │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Route 53                                        │
│                         news.newsdaily.example.com                          │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CloudFront                                      │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Behaviors:                                                          │   │
│   │  /static/*  → S3 Origin (Cache 1 year)                              │   │
│   │  /images/*  → S3 Origin (Cache 1 day)                               │   │
│   │  /api/*     → ALB Origin (No Cache)                                 │   │
│   │  Default    → ALB Origin (Cache 5 min, if-none-match)               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────┐                           ┌─────────────────┐        │
│   │    WAF          │                           │  Cache Policy   │        │
│   │  (Rate Limit,   │                           │  (TTL, Headers) │        │
│   │   XSS, SQLi)    │                           │                 │        │
│   └─────────────────┘                           └─────────────────┘        │
└────────────────────────────────────┬────────────────────┬───────────────────┘
                                     │                    │
                 ┌───────────────────┘                    └───────────────────┐
                 ▼                                                            ▼
┌────────────────────────────────────────┐          ┌─────────────────────────┐
│                 ALB                     │          │          S3             │
│       (Application Load Balancer)       │          │    (Static Assets)      │
└────────────────────┬───────────────────┘          │                         │
                     │                               │  /static/css/*.css      │
                     ▼                               │  /static/js/*.js        │
┌─────────────────────────────────────────────────┐ │  /images/articles/*     │
│                 ECS Cluster                      │ │  /images/thumbnails/*   │
│                                                  │ └─────────────────────────┘
│  ┌────────────────────────────────────────────┐ │
│  │            ECS Service                      │ │
│  │     (Auto Scaling: 2-20 tasks)              │ │
│  │                                             │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐      │ │
│  │  │ Task 1  │ │ Task 2  │ │ Task N  │ ...  │ │
│  │  │ (CMS)   │ │ (CMS)   │ │ (CMS)   │      │ │
│  │  └─────────┘ └─────────┘ └─────────┘      │ │
│  │                                             │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌─────────────────┐           ┌─────────────────┐
│   ElastiCache   │           │     Aurora      │
│    (Redis)      │           │  Serverless v2  │
│  Session/Cache  │           │   (PostgreSQL)  │
└─────────────────┘           └─────────────────┘
```

### キャッシュ戦略
| パス | キャッシュTTL | 説明 |
|------|-------------|------|
| /static/* | 1年 | バージョン付きの静的ファイル |
| /images/* | 1日 | 記事画像 |
| /api/* | なし | APIエンドポイント |
| /articles/* | 5分 | 記事ページ（ETag使用） |
| / | 1分 | トップページ |

---

## 7. ハンズオン手順

### Phase 1: コンテナ基盤の構築（60分）

#### Step 1-1: ECR リポジトリとECS クラスター

```hcl
# terraform/modules/ecs-cluster/main.tf
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ECR Repository
resource "aws_ecr_repository" "cms" {
  name                 = "${var.project_name}/cms"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_lifecycle_policy" "cms" {
  repository = aws_ecr_repository.cms.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  tags = {
    Name = "${local.name_prefix}-cluster"
  }
}

resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/ecs/${local.name_prefix}/exec"
  retention_in_days = 7
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 2  # 最低2タスクはFARGATEで
  }

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 3  # 残りはSPOTを優先
  }
}

output "cluster_id" {
  value = aws_ecs_cluster.main.id
}

output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.cms.repository_url
}
```

#### Step 1-2: CMS サービスのタスク定義

```hcl
# terraform/modules/cms-service/main.tf
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

variable "alb_target_group_arn" {
  type = string
}

variable "alb_security_group_id" {
  type = string
}

variable "ecr_repository_url" {
  type = string
}

variable "db_host" {
  type = string
}

variable "db_secret_arn" {
  type = string
}

variable "redis_host" {
  type = string
}

variable "s3_bucket_name" {
  type = string
}

variable "min_capacity" {
  type    = number
  default = 2
}

variable "max_capacity" {
  type    = number
  default = 20
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# Security Group
resource "aws_security_group" "cms" {
  name        = "${local.name_prefix}-cms-sg"
  description = "Security group for CMS service"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-cms-sg"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "cms" {
  name              = "/ecs/${local.name_prefix}/cms"
  retention_in_days = 30
}

# Task Execution Role
resource "aws_iam_role" "task_execution" {
  name = "${local.name_prefix}-cms-task-execution"

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

resource "aws_iam_role_policy" "task_execution_secrets" {
  name = "secrets-access"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = var.db_secret_arn
    }]
  })
}

# Task Role
resource "aws_iam_role" "task" {
  name = "${local.name_prefix}-cms-task"

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

resource "aws_iam_role_policy" "task_s3" {
  name = "s3-access"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        "arn:aws:s3:::${var.s3_bucket_name}",
        "arn:aws:s3:::${var.s3_bucket_name}/*"
      ]
    }]
  })
}

# Task Definition
resource "aws_ecs_task_definition" "cms" {
  family                   = "${local.name_prefix}-cms"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "cms"
      image     = "${var.ecr_repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3000" },
        { name = "DB_HOST", value = var.db_host },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_NAME", value = "newsdaily" },
        { name = "REDIS_HOST", value = var.redis_host },
        { name = "REDIS_PORT", value = "6379" },
        { name = "S3_BUCKET", value = var.s3_bucket_name },
        { name = "AWS_REGION", value = data.aws_region.current.name },
      ]

      secrets = [
        {
          name      = "DB_USER"
          valueFrom = "${var.db_secret_arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${var.db_secret_arn}:password::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.cms.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "cms"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${local.name_prefix}-cms"
  }
}

# ECS Service
resource "aws_ecs_service" "cms" {
  name            = "${local.name_prefix}-cms"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.cms.arn
  desired_count   = var.min_capacity

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 2
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 3
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.cms.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "cms"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Name = "${local.name_prefix}-cms"
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "cms" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${split("/", var.cluster_id)[1]}/${aws_ecs_service.cms.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale on CPU
resource "aws_appautoscaling_policy" "cms_cpu" {
  name               = "${local.name_prefix}-cms-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.cms.resource_id
  scalable_dimension = aws_appautoscaling_target.cms.scalable_dimension
  service_namespace  = aws_appautoscaling_target.cms.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70
    scale_in_cooldown  = 60
    scale_out_cooldown = 30
  }
}

# Scale on Request Count
resource "aws_appautoscaling_policy" "cms_requests" {
  name               = "${local.name_prefix}-cms-requests"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.cms.resource_id
  scalable_dimension = aws_appautoscaling_target.cms.scalable_dimension
  service_namespace  = aws_appautoscaling_target.cms.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${split("/", var.alb_target_group_arn)[1]}/${split("/", var.alb_target_group_arn)[2]}/${split("/", var.alb_target_group_arn)[3]}"
    }
    target_value       = 1000  # 1タスクあたり1000リクエスト/分
    scale_in_cooldown  = 60
    scale_out_cooldown = 30
  }
}

data "aws_region" "current" {}

output "service_name" {
  value = aws_ecs_service.cms.name
}

output "security_group_id" {
  value = aws_security_group.cms.id
}
```

### Phase 2: CloudFront CDN の設定（60分）

#### Step 2-1: S3 バケットとCloudFront

```hcl
# terraform/modules/cdn/main.tf
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "alb_dns_name" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "certificate_arn" {
  type = string
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  s3_origin_id  = "S3-${local.name_prefix}-assets"
  alb_origin_id = "ALB-${local.name_prefix}"
}

# S3 Bucket for static assets
resource "aws_s3_bucket" "assets" {
  bucket = "${local.name_prefix}-assets"
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront OAC for S3
resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${local.name_prefix}-s3-oac"
  description                       = "OAC for S3 assets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipal"
      Effect    = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.assets.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
        }
      }
    }]
  })
}

# Cache Policies
resource "aws_cloudfront_cache_policy" "static" {
  name        = "${local.name_prefix}-static-cache"
  comment     = "Cache policy for static assets"
  default_ttl = 86400     # 1 day
  max_ttl     = 31536000  # 1 year
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

resource "aws_cloudfront_cache_policy" "dynamic" {
  name        = "${local.name_prefix}-dynamic-cache"
  comment     = "Cache policy for dynamic content"
  default_ttl = 300   # 5 minutes
  max_ttl     = 3600  # 1 hour
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "whitelist"
      cookies {
        items = ["session_id"]
      }
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept-Language", "Accept-Encoding"]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# Origin Request Policy
resource "aws_cloudfront_origin_request_policy" "alb" {
  name    = "${local.name_prefix}-alb-origin"
  comment = "Origin request policy for ALB"

  cookies_config {
    cookie_behavior = "all"
  }
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Host", "Accept", "Accept-Language", "Accept-Encoding", "X-Forwarded-For"]
    }
  }
  query_strings_config {
    query_string_behavior = "all"
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name_prefix} distribution"
  default_root_object = ""
  price_class         = "PriceClass_200"

  aliases = [var.domain_name]

  # S3 Origin (Static Assets)
  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  # ALB Origin (Dynamic Content)
  origin {
    domain_name = var.alb_dns_name
    origin_id   = local.alb_origin_id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior (ALB)
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = local.alb_origin_id

    cache_policy_id          = aws_cloudfront_cache_policy.dynamic.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.alb.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # Static assets behavior
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = local.s3_origin_id

    cache_policy_id = aws_cloudfront_cache_policy.static.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # Images behavior
  ordered_cache_behavior {
    path_pattern     = "/images/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = local.s3_origin_id

    cache_policy_id = aws_cloudfront_cache_policy.static.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # API behavior (no cache)
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.alb_origin_id

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled
    origin_request_policy_id = aws_cloudfront_origin_request_policy.alb.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${local.name_prefix}-cdn"
  }
}

output "distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.assets.id
}
```

### Phase 3: CMSアプリケーションの実装（60分）

#### Step 3-1: Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

#### Step 3-2: Express アプリケーション

```typescript
// src/server.ts
import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import compression from 'compression';
import helmet from 'helmet';

const app = express();

// Middleware
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,  // CDN対応のため
}));
app.use(express.json());
app.use(express.static('public'));

// View engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Database
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
});

// Redis
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

// S3
const s3 = new S3Client({ region: process.env.AWS_REGION });
const S3_BUCKET = process.env.S3_BUCKET!;

// Cache TTL (seconds)
const CACHE_TTL = {
  article: 300,      // 5 minutes
  articleList: 60,   // 1 minute
  category: 3600,    // 1 hour
};

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    res.json({ status: 'healthy' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy' });
  }
});

// Top page
app.get('/', async (req, res) => {
  try {
    const cacheKey = 'page:top';
    const cached = await redis.get(cacheKey);

    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.render('index', JSON.parse(cached));
    }

    // Get latest articles
    const articlesResult = await pool.query(`
      SELECT a.id, a.title, a.slug, a.excerpt, a.thumbnail_url,
             a.published_at, c.name as category_name, c.slug as category_slug
      FROM articles a
      JOIN categories c ON a.category_id = c.id
      WHERE a.status = 'published'
      ORDER BY a.published_at DESC
      LIMIT 20
    `);

    const data = {
      articles: articlesResult.rows,
      title: 'NewsDaily - ホーム',
    };

    await redis.set(cacheKey, JSON.stringify(data), 'EX', CACHE_TTL.articleList);
    res.set('X-Cache', 'MISS');
    res.render('index', data);
  } catch (error) {
    console.error('Error rendering top page:', error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

// Article page
app.get('/articles/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const cacheKey = `article:${slug}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const data = JSON.parse(cached);
      res.set('X-Cache', 'HIT');
      res.set('ETag', data.etag);
      res.set('Cache-Control', 'public, max-age=300');

      // ETag check
      if (req.headers['if-none-match'] === data.etag) {
        return res.status(304).end();
      }

      return res.render('article', data);
    }

    const result = await pool.query(`
      SELECT a.id, a.title, a.slug, a.content, a.excerpt,
             a.thumbnail_url, a.published_at, a.updated_at,
             c.name as category_name, c.slug as category_slug,
             u.name as author_name
      FROM articles a
      JOIN categories c ON a.category_id = c.id
      JOIN users u ON a.author_id = u.id
      WHERE a.slug = $1 AND a.status = 'published'
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).render('404');
    }

    const article = result.rows[0];
    const etag = `"${article.id}-${new Date(article.updated_at).getTime()}"`;

    const data = {
      article,
      title: `${article.title} - NewsDaily`,
      etag,
    };

    await redis.set(cacheKey, JSON.stringify(data), 'EX', CACHE_TTL.article);
    res.set('X-Cache', 'MISS');
    res.set('ETag', etag);
    res.set('Cache-Control', 'public, max-age=300');

    // ETag check
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.render('article', data);
  } catch (error) {
    console.error('Error rendering article:', error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

// API: Upload image
app.post('/api/images/upload', async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType are required' });
    }

    const key = `images/articles/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    res.json({
      uploadUrl: presignedUrl,
      imageUrl: `https://${process.env.CDN_DOMAIN}/images/articles/${key.split('/').pop()}`,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cache invalidation (called when article is updated)
app.post('/api/cache/invalidate', async (req, res) => {
  const { type, slug } = req.body;

  try {
    if (type === 'article' && slug) {
      await redis.del(`article:${slug}`);
      await redis.del('page:top');
    } else if (type === 'all') {
      const keys = await redis.keys('article:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      await redis.del('page:top');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CMS server listening on port ${PORT}`);
});
```

---

## 8. トラブルシューティング課題

### Challenge 1: CloudFront でキャッシュが効かない
**状況**: 記事ページが毎回オリジンに到達している

**調査ポイント**:
1. Cache-Control ヘッダーの確認
2. Cookie の影響確認
3. CloudFront Cache Policy の設定確認

### Challenge 2: ECS タスクが頻繁に再起動
**状況**: ヘルスチェックに失敗してタスクが再起動

**調査ポイント**:
1. ヘルスチェックの設定（interval, timeout）
2. アプリケーションの起動時間
3. メモリ使用量の確認

### Challenge 3: 速報時のスケールアウトが間に合わない
**状況**: トラフィック急増時にスケールアウトが遅い

**調査ポイント**:
1. スケーリングポリシーのクールダウン設定
2. 予測スケーリングの導入検討
3. Scheduled Scaling の活用

---

## 9. 設計考慮ポイント

### ディスカッション1: CDN キャッシュ戦略
**テーマ**: キャッシュTTLの最適化

| コンテンツ | 推奨TTL | 理由 |
|-----------|---------|------|
| 静的アセット | 1年 | バージョン管理で無効化 |
| 画像 | 1日-1週間 | 更新頻度が低い |
| 記事ページ | 5-15分 | リアルタイム性とのバランス |
| トップページ | 1-5分 | 新着記事の反映 |

### ディスカッション2: FARGATE vs FARGATE_SPOT
**テーマ**: コスト最適化とリスク

| 観点 | FARGATE | FARGATE_SPOT |
|------|---------|--------------|
| コスト | 100% | 約30%OFF |
| 可用性 | 高 | 中断リスクあり |
| ユースケース | 常時必要なタスク | スケールアウト分 |

### ディスカッション3: キャッシュ無効化戦略
**テーマ**: コンテンツ更新時の反映

**選択肢**:
1. TTL ベース（シンプルだが遅延あり）
2. 明示的な無効化（即時だが複雑）
3. バージョン付きURL（キャッシュ永続化）

---

## 10. 発展課題

### Advanced 1: Lambda@Edge による動的コンテンツ
**課題**: エッジでのA/Bテストやパーソナライゼーション実装

### Advanced 2: 予測スケーリング
**課題**: CloudWatch の予測スケーリングを有効化し、計画的なイベントに対応

### Advanced 3: マルチリージョン展開
**課題**: 災害対策として別リージョンにスタンバイ環境を構築

---

## 11. コスト見積もり

### 月額コスト概算

| サービス | 構成 | 月額コスト |
|----------|------|------------|
| ECS Fargate | 0.5vCPU/1GB × 2-20タスク | $70-350 |
| Aurora Serverless v2 | 2-8 ACU | $170-700 |
| CloudFront | 10TB転送 + 1億リクエスト | $150 |
| S3 | 100GB | $2 |
| ElastiCache | cache.t3.medium | $50 |
| ALB | 1 | $16 |
| NAT Gateway | 1 | $32 |

**合計**: 約 **$490-1,300/月**（約74,000-195,000円）

---

## 12. 学習のポイント

### 重要な概念の整理

1. **CDN キャッシング**
   - エッジロケーションでのコンテンツ配信
   - Cache-Control ヘッダーの重要性
   - ETag による条件付きリクエスト

2. **コンテナオーケストレーション**
   - タスク定義とサービス
   - Auto Scaling ポリシー
   - ヘルスチェックとローリングアップデート

3. **サーバーレスデータベース**
   - Aurora Serverless の自動スケーリング
   - ACU（Aurora Capacity Units）
   - 一時停止機能（開発環境向け）

### GCPとの比較

| 概念 | AWS | GCP |
|------|-----|-----|
| CDN | CloudFront | Cloud CDN |
| コンテナ実行 | ECS Fargate | Cloud Run |
| オブジェクトストレージ | S3 | Cloud Storage |
| サーバーレスDB | Aurora Serverless | Cloud SQL |
| キャッシュ | ElastiCache | Memorystore |

### 次のステップ
1. WAF ルールの高度な設定
2. リアルタイムログ分析（Kinesis + Athena）
3. 画像最適化（Lambda@Edge）
