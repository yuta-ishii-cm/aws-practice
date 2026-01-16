# 課題2: ヘルスケアアプリのマイクロサービス化

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | マイクロサービス・API |
| 処理形態 | モノリス分割・コンテナ化 |
| 使用するIaCツール | Terraform |
| 想定所要時間 | 6-7時間 |

---

## 2. シナリオ

### 企業プロフィール
**HealthTrack株式会社**は、健康管理アプリを提供するヘルスケアスタートアップです。ユーザー数は20万人を超え、日々の活動量、食事記録、睡眠データを管理するサービスを展開しています。

### 現状の課題
サービス開始から3年が経過し、モノリシックなアーキテクチャの限界に直面しています：

1. **デプロイの複雑化**：全機能が1つのアプリケーションに集約され、小さな変更でも全体のデプロイが必要
2. **スケーリングの非効率**：特定機能（活動量記録）に負荷が集中しても、全体をスケール
3. **技術的負債の蓄積**：PHP製のモノリスに新機能追加が困難
4. **チーム間の競合**：5チームが1つのコードベースを共有し、マージコンフリクトが多発

### 数値で見る問題
- デプロイ頻度：月 **2回**（リスクが高く慎重になる）
- デプロイ所要時間：**4時間**
- インシデント発生率：デプロイごとに **30%**
- 機能追加のリードタイム：**3ヶ月**

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| デプロイ頻度 | 2回/月 | 週1回以上/サービス |
| デプロイ時間 | 4時間 | 30分/サービス |
| インシデント発生率 | 30%/デプロイ | 5%以下 |
| 機能追加リードタイム | 3ヶ月 | 2週間 |

---

## 3. 学習目標

### 主要な学習成果
1. モノリスからマイクロサービスへの段階的移行手法
2. ECS Fargateによるコンテナ基盤の構築
3. ALBを使ったパスベースルーティング
4. サービス間通信パターンの理解

### 習得するスキル
- Strangler Fig パターンによる移行
- Docker マルチステージビルド
- ECS サービスディスカバリ
- ALB ターゲットグループの管理

---

## 4. 使用するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| ECS Fargate | マイクロサービス実行 | 高 |
| ALB | ルーティング・ロードバランシング | 高 |
| RDS (Aurora) | データベース | 高 |
| ElastiCache (Redis) | キャッシュ・セッション | 中 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| ECR | コンテナイメージ保存 |
| Cloud Map | サービスディスカバリ |
| Secrets Manager | 認証情報管理 |
| CloudWatch | ログ・メトリクス |
| X-Ray | 分散トレーシング |

---

## 5. 前提条件

### 必要な知識
- コンテナとDockerの基本
- REST API設計の基礎
- データベース設計の基礎

### 事前準備
1. AWSアカウント
2. AWS CLI v2
3. Docker Desktop
4. Terraform CLI

---

## 6. アーキテクチャ概要

### 現状（モノリス）
```
┌─────────────────────────────────────────────────────────────────┐
│                       EC2 (Monolith)                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    PHP Application                         │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │  │
│  │  │ User    │ │Activity │ │ Meal    │ │ Sleep   │ ...     │  │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │         │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘         │  │
│  │       └──────────┬┴──────────┬┴──────────┘               │  │
│  │                  ▼           ▼                            │  │
│  │         ┌────────────────────────────────┐                │  │
│  │         │      Shared Database           │                │  │
│  │         │         (MySQL)                │                │  │
│  │         └────────────────────────────────┘                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 目標（マイクロサービス）
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Application Load Balancer                         │
│                                                                          │
│   /users/*        /activities/*      /meals/*        /sleep/*           │
│       │                 │                │               │               │
└───────┼─────────────────┼────────────────┼───────────────┼───────────────┘
        │                 │                │               │
        ▼                 ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           ECS Cluster                                    │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │User Service │  │Activity Svc │  │ Meal Service│  │Sleep Service│    │
│  │ (Node.js)   │  │  (Go)       │  │  (Python)   │  │  (Node.js)  │    │
│  │ 2 tasks     │  │ 4 tasks     │  │ 2 tasks     │  │ 2 tasks     │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
└─────────┼────────────────┼────────────────┼────────────────┼────────────┘
          │                │                │                │
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Data Layer                                        │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Aurora     │  │  Aurora     │  │  Aurora     │  │  Aurora     │    │
│  │  (Users)    │  │ (Activities)│  │  (Meals)    │  │  (Sleep)    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     ElastiCache (Redis)                          │    │
│  │                  (Session & Cache - Shared)                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 移行計画（5フェーズ）
| フェーズ | 内容 | 期間目安 |
|----------|------|----------|
| 1 | インフラ基盤構築（VPC、ECS、ALB） | - |
| 2 | User Service 抽出・移行 | - |
| 3 | Activity Service 抽出・移行 | - |
| 4 | Meal / Sleep Service 移行 | - |
| 5 | モノリス廃止・最終検証 | - |

---

## 7. ハンズオン手順

### Phase 1: インフラ基盤構築（60分）

#### Step 1-1: Terraformプロジェクト構造

```
healthtrack-infra/
├── terraform/
│   ├── modules/
│   │   ├── vpc/
│   │   ├── ecs-cluster/
│   │   ├── alb/
│   │   ├── ecs-service/
│   │   ├── aurora/
│   │   └── elasticache/
│   └── environments/
│       ├── dev/
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       └── prod/
├── services/
│   ├── user-service/
│   ├── activity-service/
│   ├── meal-service/
│   └── sleep-service/
└── docs/
```

#### Step 1-2: VPCモジュール

```hcl
# terraform/modules/vpc/main.tf
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "azs" {
  type    = list(string)
  default = ["ap-northeast-1a", "ap-northeast-1c"]
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count = length(var.azs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-${var.azs[count.index]}"
  }
}

# Private Subnets (App)
resource "aws_subnet" "private_app" {
  count = length(var.azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.azs[count.index]

  tags = {
    Name = "${local.name_prefix}-private-app-${var.azs[count.index]}"
  }
}

# Private Subnets (DB)
resource "aws_subnet" "private_db" {
  count = length(var.azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = var.azs[count.index]

  tags = {
    Name = "${local.name_prefix}-private-db-${var.azs[count.index]}"
  }
}

# NAT Gateway
resource "aws_eip" "nat" {
  count  = 1
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-nat-eip"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${local.name_prefix}-nat"
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
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "${local.name_prefix}-private-rt"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count = length(var.azs)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_app" {
  count = length(var.azs)

  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private.id
}

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
```

#### Step 1-3: ALB モジュール（パスベースルーティング）

```hcl
# terraform/modules/alb/main.tf
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-alb-sg"
  }
}

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "prod"

  tags = {
    Name = "${local.name_prefix}-alb"
  }
}

# デフォルトターゲットグループ（モノリス用）
resource "aws_lb_target_group" "monolith" {
  name        = "${local.name_prefix}-monolith-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }

  tags = {
    Name = "${local.name_prefix}-monolith-tg"
  }
}

# HTTPリスナー（HTTPS リダイレクト用）
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS リスナー（デフォルトはモノリスへ）
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.monolith.arn
  }
}

output "alb_arn" {
  value = aws_lb.main.arn
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "https_listener_arn" {
  value = aws_lb_listener.https.arn
}

output "security_group_id" {
  value = aws_security_group.alb.id
}
```

### Phase 2: User Service の抽出・移行（90分）

#### Step 2-1: User Service の Dockerfile

```dockerfile
# services/user-service/Dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# セキュリティ：非rootユーザーで実行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

#### Step 2-2: User Service の実装

```typescript
// services/user-service/src/main.ts
import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    res.json({ status: 'healthy', service: 'user-service' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Get user by ID
app.get('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // キャッシュをチェック
    const cached = await redis.get(`user:${userId}`);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // DBから取得
    const result = await pool.query(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // キャッシュに保存（5分）
    await redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 300);

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user
app.post('/api/users', async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, name, created_at`,
      [userId, email, name, hashedPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
app.put('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const { name } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, name, updated_at`,
      [name, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // キャッシュを削除
    await redis.del(`user:${userId}`);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's profile summary (for other services)
app.get('/api/users/:userId/profile', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, name FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcrypt');
  return bcrypt.hash(password, 10);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`User service listening on port ${PORT}`);
});
```

#### Step 2-3: ECS Service モジュール

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

variable "alb_security_group_id" {
  type = string
}

variable "https_listener_arn" {
  type = string
}

variable "path_pattern" {
  type        = string
  description = "URL path pattern for routing (e.g., /api/users/*)"
}

variable "priority" {
  type        = number
  description = "Listener rule priority"
}

variable "ecr_repository_url" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "container_port" {
  type    = number
  default = 3000
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
    from_port       = var.container_port
    to_port         = var.container_port
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
    Name = "${local.name_prefix}-sg"
  }
}

# Target Group
resource "aws_lb_target_group" "service" {
  name        = substr("${local.name_prefix}-tg", 0, 32)
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name = "${local.name_prefix}-tg"
  }
}

# Listener Rule
resource "aws_lb_listener_rule" "service" {
  listener_arn = var.https_listener_arn
  priority     = var.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service.arn
  }

  condition {
    path_pattern {
      values = [var.path_pattern]
    }
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "service" {
  name              = "/ecs/${var.project_name}/${var.environment}/${var.service_name}"
  retention_in_days = 30

  tags = {
    Name = "${local.name_prefix}-logs"
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
        for key, value in var.environment_variables : {
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
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${var.container_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${local.name_prefix}-task"
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

  load_balancer {
    target_group_arn = aws_lb_target_group.service.arn
    container_name   = var.service_name
    container_port   = var.container_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition]
  }

  tags = {
    Name = local.name_prefix
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "service" {
  max_capacity       = var.desired_count * 4
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

resource "aws_iam_role_policy" "task_execution_secrets" {
  name = "secrets-access"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/${var.environment}/*"
    }]
  })
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

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

output "service_name" {
  value = aws_ecs_service.service.name
}

output "security_group_id" {
  value = aws_security_group.service.id
}

output "target_group_arn" {
  value = aws_lb_target_group.service.arn
}
```

### Phase 3: サービス間通信の実装（40分）

#### Step 3-1: Service Discovery の設定

```hcl
# terraform/modules/service-discovery/main.tf
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.environment}.${var.project_name}.local"
  description = "Service discovery namespace for ${var.project_name}"
  vpc         = var.vpc_id
}

output "namespace_id" {
  value = aws_service_discovery_private_dns_namespace.main.id
}

output "namespace_name" {
  value = aws_service_discovery_private_dns_namespace.main.name
}
```

#### Step 3-2: サービス間呼び出しクライアント

```typescript
// services/activity-service/src/clients/userServiceClient.ts
import axios, { AxiosInstance } from 'axios';

export class UserServiceClient {
  private client: AxiosInstance;

  constructor() {
    const baseURL = process.env.USER_SERVICE_URL || 'http://user-service.dev.healthtrack.local:3000';

    this.client = axios.create({
      baseURL,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // リトライロジック
    this.client.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config;
        if (!config || !config.retry) {
          config.retry = 0;
        }

        if (config.retry >= 3) {
          return Promise.reject(error);
        }

        config.retry += 1;
        await new Promise(resolve => setTimeout(resolve, 1000 * config.retry));
        return this.client.request(config);
      }
    );
  }

  async getUserProfile(userId: string): Promise<{ id: string; name: string }> {
    const response = await this.client.get(`/api/users/${userId}/profile`);
    return response.data;
  }

  async validateUser(userId: string): Promise<boolean> {
    try {
      await this.client.get(`/api/users/${userId}`);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }
}
```

---

## 8. トラブルシューティング課題

### Challenge 1: サービス間通信のタイムアウト
**状況**: Activity Service から User Service への呼び出しがタイムアウト

**調査ポイント**:
1. Security Group のルールを確認
2. Service Discovery の名前解決を確認
3. ターゲットのヘルスチェック状態を確認

### Challenge 2: データ整合性の問題
**状況**: User Service でユーザーを削除したが、Activity Service に古いデータが残っている

**調査ポイント**:
1. キャッシュの TTL を確認
2. イベント駆動の同期を検討
3. Saga パターンの導入を検討

### Challenge 3: デプロイ順序の依存関係
**状況**: User Service の API 変更により、Activity Service が動作しなくなった

**調査ポイント**:
1. API のバージョニング戦略を確認
2. 後方互換性の維持
3. Consumer-Driven Contract Testing の導入

---

## 9. 設計考慮ポイント

### ディスカッション1: データ分割戦略
**テーマ**: 共有DBからサービス別DBへの移行

| パターン | メリット | デメリット |
|----------|----------|------------|
| Shared Database | シンプル、トランザクション | 結合度が高い |
| Database per Service | 独立性高い | 分散トランザクション |
| Shared Schema | 移行が容易 | 中途半端 |

### ディスカッション2: 同期 vs 非同期通信
**テーマ**: サービス間通信パターンの選択

| パターン | ユースケース |
|----------|-------------|
| REST (同期) | 即座の応答が必要 |
| gRPC (同期) | 高パフォーマンス要件 |
| Event (非同期) | 疎結合、耐障害性重視 |

### ディスカッション3: Strangler Fig パターン
**テーマ**: 段階的移行の進め方

**ステップ**:
1. ファサードの導入（ALB ルーティング）
2. 機能単位での切り出し
3. データ移行
4. 旧機能の廃止

---

## 10. 発展課題

### Advanced 1: サービスメッシュの導入
**課題**: AWS App Mesh を導入し、サービス間通信の可観測性とトラフィック制御を向上

### Advanced 2: イベント駆動アーキテクチャ
**課題**: Amazon EventBridge を使って、サービス間をイベント駆動で疎結合に

### Advanced 3: CQRS パターン
**課題**: 読み取りと書き込みを分離し、読み取り専用のビューを作成

---

## 11. コスト見積もり

### 月額コスト概算

| サービス | 構成 | 月額コスト |
|----------|------|------------|
| ECS Fargate | 0.5vCPU / 1GB × 10タスク | $180 |
| ALB | 1 | $16 |
| Aurora Serverless v2 | 4 ACU | $345 |
| ElastiCache | cache.t3.small | $24 |
| NAT Gateway | 1 | $32 |
| ECR | 10GB | $1 |
| CloudWatch | ログ・メトリクス | $20 |

**合計**: 約 **$618/月**（約93,000円）

---

## 12. 学習のポイント

### 重要な概念の整理

1. **Strangler Fig パターン**
   - 段階的にモノリスを置き換え
   - リスクを最小化しながら移行
   - ファサード（ALB）でルーティング制御

2. **サービス境界の設計**
   - ドメイン駆動設計（DDD）の境界付けられたコンテキスト
   - データの所有権を明確に
   - API契約の重要性

3. **分散システムの課題**
   - ネットワーク障害への対応
   - 結果整合性の受け入れ
   - 分散トランザクションの回避

### GCPとの比較

| 概念 | AWS | GCP |
|------|-----|-----|
| コンテナ実行 | ECS Fargate | Cloud Run |
| ロードバランサー | ALB | Cloud Load Balancing |
| サービスディスカバリ | Cloud Map | Service Directory |
| マネージドDB | Aurora | Cloud SQL / AlloyDB |
| キャッシュ | ElastiCache | Memorystore |

### 次のステップ
1. 残りのサービス（Meal, Sleep）の移行
2. CI/CD パイプラインの構築
3. 可観測性の強化（X-Ray, CloudWatch）
