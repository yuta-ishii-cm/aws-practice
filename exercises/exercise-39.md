# 課題39: 小売チェーンの在庫管理API

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | マイクロサービス・API |
| 処理形態 | サービスメッシュ・可観測性 |
| 使用するIaCツール | Terraform |
| 想定所要時間 | 6-7時間 |

---

## 2. シナリオ

### 企業プロフィール
**RetailMax株式会社**は、全国200店舗を展開する小売チェーンです。各店舗の在庫をリアルタイムで把握し、オムニチャネル（店舗・EC・アプリ）で在庫情報を一元管理したいと考えています。

### 現状の課題
在庫管理システムが分散し、リアルタイムの在庫把握ができていません：

1. **在庫情報の不整合**：店舗POSとECの在庫が一致せず、欠品や過剰在庫が発生
2. **サービス間通信の不透明さ**：マイクロサービス化したが、障害時の原因特定が困難
3. **レイテンシの問題**：在庫確認APIが遅く、顧客体験を損なっている
4. **トラフィック制御の欠如**：特定サービスの障害が全体に波及

### 数値で見る問題
- 在庫不整合による機会損失：月 **500万円**
- 在庫確認API応答時間：平均 **2秒**（ピーク時 5秒）
- 障害原因特定時間：平均 **3時間**
- 障害の波及（カスケード障害）：四半期 **4回**

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 在庫不整合率 | 5% | 0.5%以下 |
| API応答時間 | 2秒 | 200ms |
| 障害原因特定時間 | 3時間 | 15分 |
| カスケード障害 | 4回/四半期 | 0回 |

---

## 3. 学習目標

### 主要な学習成果
1. AWS App Meshによるサービスメッシュの構築
2. サービス間通信の可観測性向上（トレーシング、メトリクス）
3. サーキットブレーカーとリトライポリシーの実装
4. Aurora PostgreSQLによる在庫データの一貫性管理

### 習得するスキル
- App Mesh Virtual Service / Virtual Node の設計
- Envoy プロキシの基本設定
- X-Ray による分散トレーシング
- CloudWatch Container Insights の活用

---

## 4. 使用するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| App Mesh | サービスメッシュ | 高 |
| ECS Fargate | マイクロサービス実行 | 高 |
| Aurora PostgreSQL | 在庫データベース | 高 |
| RDS Proxy | DBコネクション管理 | 高 |
| ALB | API Gateway | 高 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| X-Ray | 分散トレーシング |
| CloudWatch | ログ・メトリクス |
| ElastiCache | キャッシュ |
| Secrets Manager | 認証情報管理 |

---

## 5. 前提条件

### 必要な知識
- マイクロサービスアーキテクチャの基本
- コンテナとECSの基礎
- データベースの基本

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
│                              Clients                                         │
│                                                                              │
│    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐             │
│    │  店舗   │     │   EC    │     │  アプリ  │     │  管理   │             │
│    │  POS    │     │ サイト  │     │         │     │ 画面    │             │
│    └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘             │
└─────────┼───────────────┼───────────────┼───────────────┼───────────────────┘
          │               │               │               │
          └───────────────┴───────────────┴───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Application Load Balancer                                │
│                        (Virtual Gateway)                                     │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                              AWS App Mesh                                    │
│                                   │                                          │
│    ┌──────────────────────────────┼──────────────────────────────────┐      │
│    │                              ▼                                   │      │
│    │                    ┌─────────────────┐                          │      │
│    │                    │   API Gateway   │                          │      │
│    │                    │    Service      │                          │      │
│    │                    │   (Envoy)       │                          │      │
│    │                    └────────┬────────┘                          │      │
│    │                             │                                   │      │
│    │         ┌───────────────────┼───────────────────┐              │      │
│    │         │                   │                   │              │      │
│    │         ▼                   ▼                   ▼              │      │
│    │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │      │
│    │  │  Inventory  │    │    Store    │    │   Product   │        │      │
│    │  │   Service   │───▶│   Service   │    │   Service   │        │      │
│    │  │   (Envoy)   │    │   (Envoy)   │    │   (Envoy)   │        │      │
│    │  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │      │
│    │         │                  │                  │                │      │
│    │         │   Circuit        │   Retry          │                │      │
│    │         │   Breaker        │   Policy         │                │      │
│    └─────────┼──────────────────┼──────────────────┼────────────────┘      │
│              │                  │                  │                        │
└──────────────┼──────────────────┼──────────────────┼────────────────────────┘
               │                  │                  │
               ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Data Layer                                        │
│                                                                              │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │   RDS Proxy     │  │   RDS Proxy     │  │  ElastiCache    │            │
│   └────────┬────────┘  └────────┬────────┘  │    (Redis)      │            │
│            │                    │           └─────────────────┘            │
│            ▼                    ▼                                           │
│   ┌─────────────────────────────────────────────────┐                      │
│   │              Aurora PostgreSQL                   │                      │
│   │    (Writer + 2 Readers, Multi-AZ)               │                      │
│   └─────────────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### サービス一覧
| サービス | 役割 | エンドポイント |
|----------|------|---------------|
| api-gateway | ルーティング・認証 | /api/* |
| inventory-service | 在庫管理 | /api/inventory/* |
| store-service | 店舗情報管理 | /api/stores/* |
| product-service | 商品マスタ管理 | /api/products/* |

---

## 7. ハンズオン手順

### Phase 1: インフラ基盤構築（60分）

#### Step 1-1: App Mesh の設定

```hcl
# terraform/modules/app-mesh/main.tf
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

locals {
  mesh_name = "${var.project_name}-${var.environment}"
}

# App Mesh
resource "aws_appmesh_mesh" "main" {
  name = local.mesh_name

  spec {
    egress_filter {
      type = "DROP_ALL"  # 明示的に許可したサービスのみ通信可能
    }
  }

  tags = {
    Name        = local.mesh_name
    Environment = var.environment
  }
}

# Virtual Gateway (for ALB integration)
resource "aws_appmesh_virtual_gateway" "main" {
  name      = "${local.mesh_name}-gateway"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    listener {
      port_mapping {
        port     = 8080
        protocol = "http"
      }

      health_check {
        port                = 8080
        protocol            = "http"
        path                = "/health"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 30000
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }
}

output "mesh_name" {
  value = aws_appmesh_mesh.main.name
}

output "mesh_arn" {
  value = aws_appmesh_mesh.main.arn
}

output "virtual_gateway_name" {
  value = aws_appmesh_virtual_gateway.main.name
}
```

#### Step 1-2: Virtual Service / Virtual Node の定義

```hcl
# terraform/modules/app-mesh-service/main.tf
variable "mesh_name" {
  type = string
}

variable "service_name" {
  type = string
}

variable "namespace" {
  type = string
}

variable "port" {
  type    = number
  default = 8080
}

variable "health_check_path" {
  type    = string
  default = "/health"
}

variable "backends" {
  type    = list(string)
  default = []
  description = "List of backend virtual services this service can communicate with"
}

variable "timeout_seconds" {
  type    = number
  default = 30
}

variable "retry_attempts" {
  type    = number
  default = 3
}

variable "circuit_breaker_threshold" {
  type    = number
  default = 5
  description = "Number of consecutive failures before circuit opens"
}

locals {
  virtual_service_name = "${var.service_name}.${var.namespace}"
}

# Virtual Service
resource "aws_appmesh_virtual_service" "service" {
  name      = local.virtual_service_name
  mesh_name = var.mesh_name

  spec {
    provider {
      virtual_node {
        virtual_node_name = aws_appmesh_virtual_node.service.name
      }
    }
  }
}

# Virtual Node
resource "aws_appmesh_virtual_node" "service" {
  name      = "${var.service_name}-node"
  mesh_name = var.mesh_name

  spec {
    # Backend Services
    dynamic "backend" {
      for_each = var.backends
      content {
        virtual_service {
          virtual_service_name = "${backend.value}.${var.namespace}"
        }
      }
    }

    listener {
      port_mapping {
        port     = var.port
        protocol = "http"
      }

      health_check {
        port                = var.port
        protocol            = "http"
        path                = var.health_check_path
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 30000
      }

      # Connection Pool
      connection_pool {
        http {
          max_connections      = 100
          max_pending_requests = 100
        }
      }

      # Timeout
      timeout {
        http {
          idle {
            unit  = "s"
            value = 60
          }
          per_request {
            unit  = "s"
            value = var.timeout_seconds
          }
        }
      }

      # Outlier Detection (Circuit Breaker)
      outlier_detection {
        base_ejection_duration {
          unit  = "s"
          value = 30
        }
        interval {
          unit  = "s"
          value = 10
        }
        max_ejection_percent = 50
        max_server_errors    = var.circuit_breaker_threshold
      }
    }

    # Service Discovery
    service_discovery {
      aws_cloud_map {
        namespace_name = var.namespace
        service_name   = var.service_name
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }
}

# Virtual Router (for traffic splitting - optional)
resource "aws_appmesh_virtual_router" "service" {
  name      = "${var.service_name}-router"
  mesh_name = var.mesh_name

  spec {
    listener {
      port_mapping {
        port     = var.port
        protocol = "http"
      }
    }
  }
}

# Route with Retry Policy
resource "aws_appmesh_route" "service" {
  name                = "${var.service_name}-route"
  mesh_name           = var.mesh_name
  virtual_router_name = aws_appmesh_virtual_router.service.name

  spec {
    http_route {
      match {
        prefix = "/"
      }

      action {
        weighted_target {
          virtual_node = aws_appmesh_virtual_node.service.name
          weight       = 100
        }
      }

      retry_policy {
        http_retry_events = ["server-error", "gateway-error"]
        max_retries       = var.retry_attempts

        per_retry_timeout {
          unit  = "s"
          value = 5
        }
      }

      timeout {
        idle {
          unit  = "s"
          value = 60
        }
        per_request {
          unit  = "s"
          value = var.timeout_seconds
        }
      }
    }
  }
}

output "virtual_service_name" {
  value = aws_appmesh_virtual_service.service.name
}

output "virtual_node_name" {
  value = aws_appmesh_virtual_node.service.name
}
```

### Phase 2: 在庫サービスの実装（90分）

#### Step 2-1: 在庫サービスのAPI

```typescript
// services/inventory-service/src/index.ts
import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';

const app = express();
app.use(express.json());

// Database connection via RDS Proxy
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10, // RDS Proxyがコネクションプーリングを行うため少なめに
  connectionTimeoutMillis: 5000,
});

// Redis for caching
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const CACHE_TTL = 60; // 1 minute

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy' });
  }
});

// Get inventory by store and product
app.get('/api/inventory/:storeId/:productId', async (req, res) => {
  const { storeId, productId } = req.params;
  const cacheKey = `inventory:${storeId}:${productId}`;

  try {
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({
        ...JSON.parse(cached),
        cached: true,
      });
    }

    // Query database
    const result = await pool.query(
      `SELECT store_id, product_id, quantity, reserved_quantity,
              available_quantity, updated_at
       FROM inventory
       WHERE store_id = $1 AND product_id = $2`,
      [storeId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    const inventory = result.rows[0];

    // Cache result
    await redis.set(cacheKey, JSON.stringify(inventory), 'EX', CACHE_TTL);

    res.json({ ...inventory, cached: false });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory by product across all stores
app.get('/api/inventory/product/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    const result = await pool.query(
      `SELECT i.store_id, s.store_name, i.product_id, i.quantity,
              i.reserved_quantity, i.available_quantity, i.updated_at
       FROM inventory i
       JOIN stores s ON i.store_id = s.store_id
       WHERE i.product_id = $1
       ORDER BY i.available_quantity DESC`,
      [productId]
    );

    res.json({
      productId,
      totalAvailable: result.rows.reduce((sum, row) => sum + row.available_quantity, 0),
      stores: result.rows,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inventory (with optimistic locking)
app.put('/api/inventory/:storeId/:productId', async (req, res) => {
  const { storeId, productId } = req.params;
  const { quantity, version } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check current version
    const currentResult = await client.query(
      `SELECT version FROM inventory WHERE store_id = $1 AND product_id = $2 FOR UPDATE`,
      [storeId, productId]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Inventory not found' });
    }

    if (currentResult.rows[0].version !== version) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Conflict: inventory was modified by another request',
        currentVersion: currentResult.rows[0].version,
      });
    }

    // Update
    const updateResult = await client.query(
      `UPDATE inventory
       SET quantity = $1, available_quantity = $1 - reserved_quantity,
           version = version + 1, updated_at = NOW()
       WHERE store_id = $2 AND product_id = $3
       RETURNING *`,
      [quantity, storeId, productId]
    );

    await client.query('COMMIT');

    // Invalidate cache
    const cacheKey = `inventory:${storeId}:${productId}`;
    await redis.del(cacheKey);

    res.json(updateResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Reserve inventory (for order processing)
app.post('/api/inventory/:storeId/:productId/reserve', async (req, res) => {
  const { storeId, productId } = req.params;
  const { quantity, orderId } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check available quantity
    const result = await client.query(
      `SELECT available_quantity FROM inventory
       WHERE store_id = $1 AND product_id = $2 FOR UPDATE`,
      [storeId, productId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Inventory not found' });
    }

    if (result.rows[0].available_quantity < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient inventory',
        available: result.rows[0].available_quantity,
        requested: quantity,
      });
    }

    // Reserve
    await client.query(
      `UPDATE inventory
       SET reserved_quantity = reserved_quantity + $1,
           available_quantity = available_quantity - $1,
           updated_at = NOW()
       WHERE store_id = $2 AND product_id = $3`,
      [quantity, storeId, productId]
    );

    // Record reservation
    await client.query(
      `INSERT INTO inventory_reservations (order_id, store_id, product_id, quantity, status, created_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())`,
      [orderId, storeId, productId, quantity]
    );

    await client.query('COMMIT');

    // Invalidate cache
    const cacheKey = `inventory:${storeId}:${productId}`;
    await redis.del(cacheKey);

    res.json({
      success: true,
      orderId,
      reserved: quantity,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reserving inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Inventory service listening on port ${PORT}`);
});
```

#### Step 2-2: RDS Proxy の設定

```hcl
# terraform/modules/rds-proxy/main.tf
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "db_cluster_identifier" {
  type = string
}

variable "db_secret_arn" {
  type = string
}

variable "allowed_security_group_ids" {
  type = list(string)
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_security_group" "proxy" {
  name        = "${local.name_prefix}-rds-proxy-sg"
  description = "Security group for RDS Proxy"
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
    Name = "${local.name_prefix}-rds-proxy-sg"
  }
}

resource "aws_db_proxy" "main" {
  name                   = "${local.name_prefix}-proxy"
  debug_logging          = var.environment != "prod"
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.proxy.arn
  vpc_security_group_ids = [aws_security_group.proxy.id]
  vpc_subnet_ids         = var.private_subnet_ids

  auth {
    auth_scheme               = "SECRETS"
    iam_auth                  = "DISABLED"
    secret_arn                = var.db_secret_arn
  }

  tags = {
    Name = "${local.name_prefix}-proxy"
  }
}

resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    connection_borrow_timeout    = 120
    max_connections_percent      = 100
    max_idle_connections_percent = 50
  }
}

resource "aws_db_proxy_target" "main" {
  db_proxy_name          = aws_db_proxy.main.name
  target_group_name      = aws_db_proxy_default_target_group.main.name
  db_cluster_identifier  = var.db_cluster_identifier
}

resource "aws_iam_role" "proxy" {
  name = "${local.name_prefix}-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "rds.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "proxy" {
  name = "secrets-access"
  role = aws_iam_role.proxy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = var.db_secret_arn
    }]
  })
}

output "proxy_endpoint" {
  value = aws_db_proxy.main.endpoint
}

output "proxy_arn" {
  value = aws_db_proxy.main.arn
}
```

### Phase 3: 可観測性の設定（60分）

#### Step 3-1: X-Ray 分散トレーシング

```hcl
# terraform/modules/observability/main.tf
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "service_names" {
  type = list(string)
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# X-Ray Group (for filtering traces)
resource "aws_xray_group" "services" {
  for_each = toset(var.service_names)

  group_name        = "${local.name_prefix}-${each.value}"
  filter_expression = "service(\"${each.value}\")"
}

# X-Ray Sampling Rule (reduce costs while maintaining visibility)
resource "aws_xray_sampling_rule" "default" {
  rule_name      = "${local.name_prefix}-default"
  priority       = 1000
  version        = 1
  reservoir_size = 5
  fixed_rate     = 0.05  # Sample 5% of requests
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"
}

# High priority sampling for errors
resource "aws_xray_sampling_rule" "errors" {
  rule_name      = "${local.name_prefix}-errors"
  priority       = 100
  version        = 1
  reservoir_size = 10
  fixed_rate     = 1.0  # Sample 100% of errors
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  attributes = {
    "http.status_code" = "5*"
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = local.name_prefix

  dashboard_body = jsonencode({
    widgets = concat(
      # Service Health Row
      [for i, service in var.service_names : {
        type   = "metric"
        x      = (i % 4) * 6
        y      = floor(i / 4) * 6
        width  = 6
        height = 6
        properties = {
          title   = "${service} - Requests & Errors"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ECS", "RequestCount", "ServiceName", "${local.name_prefix}-${service}"],
            ["AWS/ECS", "HTTPCode_Target_5XX_Count", "ServiceName", "${local.name_prefix}-${service}"]
          ]
          region = data.aws_region.current.name
          period = 60
        }
      }],
      # Latency Row
      [for i, service in var.service_names : {
        type   = "metric"
        x      = (i % 4) * 6
        y      = 6 + floor(i / 4) * 6
        width  = 6
        height = 6
        properties = {
          title   = "${service} - Latency"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ECS", "TargetResponseTime", "ServiceName", "${local.name_prefix}-${service}", { stat = "p50" }],
            ["AWS/ECS", "TargetResponseTime", "ServiceName", "${local.name_prefix}-${service}", { stat = "p99" }]
          ]
          region = data.aws_region.current.name
          period = 60
        }
      }],
      # Database Row
      [{
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "Aurora - Connections & CPU"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBClusterIdentifier", "${local.name_prefix}-aurora"],
            ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", "${local.name_prefix}-aurora"]
          ]
          region = data.aws_region.current.name
          period = 60
        }
      }],
      # Cache Row
      [{
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "ElastiCache - Hit Rate"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ElastiCache", "CacheHitRate", "CacheClusterId", "${local.name_prefix}-redis"]
          ]
          region = data.aws_region.current.name
          period = 60
        }
      }]
    )
  })
}

data "aws_region" "current" {}
```

---

## 8. トラブルシューティング課題

### Challenge 1: Envoy Sidecar が起動しない
**状況**: ECSタスクでメインコンテナは起動するが、Envoyが起動しない

**調査ポイント**:
1. IAMロールに `appmesh:StreamAggregatedResources` 権限があるか
2. Virtual Nodeの設定が正しいか
3. CloudWatch Logsでエラーを確認

### Challenge 2: サービス間通信がタイムアウト
**状況**: inventory-service から store-service への呼び出しがタイムアウト

**調査ポイント**:
1. X-Ray でボトルネックを特定
2. Security Groupのルールを確認
3. Virtual Nodeのbackend設定を確認

### Challenge 3: データベースコネクション枯渇
**状況**: RDS Proxyのコネクション数が上限に達する

**調査ポイント**:
1. RDS Proxyのmax_connections_percentを確認
2. アプリケーションのコネクションプールサイズを確認
3. コネクションリークがないか確認

---

## 9. 設計考慮ポイント

### ディスカッション1: サービスメッシュの採用判断
**テーマ**: App Mesh vs Istio vs 自前実装

| 観点 | App Mesh | Istio | 自前 |
|------|----------|-------|------|
| 運用負荷 | 低（マネージド） | 高 | 中 |
| 機能 | 基本的 | 豊富 | 要件次第 |
| AWSとの統合 | 完璧 | 追加設定必要 | - |
| ベンダーロックイン | 高 | 低 | なし |

### ディスカッション2: 在庫整合性のトレードオフ
**テーマ**: 強い整合性 vs 結果整合性

| パターン | メリット | デメリット |
|----------|----------|------------|
| 強い整合性 | 正確 | パフォーマンス低下 |
| 結果整合性 | 高速 | 一時的な不整合 |
| Saga パターン | 柔軟 | 実装複雑 |

### ディスカッション3: キャッシュ戦略
**テーマ**: Cache-Aside vs Write-Through vs Write-Behind

---

## 10. 発展課題

### Advanced 1: カナリアリリース
**課題**: App Meshのトラフィック分割機能を使って、新バージョンに10%のトラフィックを流す

### Advanced 2: GraphQL Federation
**課題**: 複数のマイクロサービスのAPIをGraphQLで統合

### Advanced 3: CQRS + Event Sourcing
**課題**: 在庫変更をイベントとして記録し、読み取り専用ビューを構築

---

## 11. コスト見積もり

### 月額コスト概算

| サービス | 構成 | 月額コスト |
|----------|------|------------|
| ECS Fargate | 4サービス × 2タスク × 0.5vCPU/1GB | $144 |
| ALB | 1 | $16 |
| Aurora PostgreSQL | db.r6g.large (Multi-AZ) | $350 |
| RDS Proxy | 2 ACU | $22 |
| ElastiCache | cache.r6g.large | $110 |
| NAT Gateway | 2 | $65 |
| App Mesh | 4 Virtual Nodes | $40 |
| X-Ray | 100万トレース | $5 |

**合計**: 約 **$752/月**（約113,000円）

---

## 12. 学習のポイント

### 重要な概念の整理

1. **サービスメッシュ**
   - サービス間通信をインフラ層で管理
   - サイドカーパターン（Envoy）
   - 可観測性、セキュリティ、トラフィック制御

2. **サーキットブレーカー**
   - 連続した障害を検出して回路を開く
   - 障害の波及を防止
   - 自動復旧（Half-Open状態）

3. **RDS Proxy**
   - コネクションプーリング
   - フェイルオーバーの高速化
   - IAM認証対応

### GCPとの比較

| 概念 | AWS | GCP |
|------|-----|-----|
| サービスメッシュ | App Mesh | Anthos Service Mesh / Traffic Director |
| コンテナ実行 | ECS Fargate | Cloud Run / GKE |
| DB接続管理 | RDS Proxy | Cloud SQL Auth Proxy |
| 分散トレーシング | X-Ray | Cloud Trace |
| マネージドDB | Aurora | Cloud SQL / AlloyDB |

### 次のステップ
1. mTLSによるサービス間認証
2. トラフィックシフトによるカナリアデプロイ
3. カオスエンジニアリングの導入
