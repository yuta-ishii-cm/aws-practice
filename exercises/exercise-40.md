# 課題40: 統合課題 - AWSアーキテクチャ総合演習

**難易度: 🔴 上級**

---

## 1. 概要

この課題は、これまでの学習内容を統合した総合演習です。2つの独立したシナリオから1つを選択して取り組んでください。

| 課題 | 企業 | 難易度 | 所要時間 | 主要技術領域 |
|------|------|--------|----------|-------------|
| **30-A** | QuickEats | 中級〜上級 | 8-10時間 | 全領域統合（既存システム刷新） |
| **30-B** | LearnAI | 初級〜中級 | 6-8時間 | MVP構築（ゼロからの設計） |

---

# 課題30-A: QuickEats フードデリバリープラットフォーム刷新

## 1. 課題分類

| 項目 | 内容 |
|------|------|
| **カテゴリ** | 統合課題（アーキテクチャ刷新） |
| **難易度** | 中級〜上級（Intermediate to Advanced） |
| **所要時間** | 8-10時間 |
| **前提スキル** | 課題1-29の内容理解 |
| **カバー範囲** | コンピュート、データベース、ネットワーク、セキュリティ、監視、コスト最適化 |

---

## 2. ビジネスシナリオ

### 企業プロファイル
- **企業名**: QuickEats株式会社
- **業種**: フードデリバリープラットフォーム
- **規模**: 従業員500名、エンジニア80名
- **事業規模**: 月間注文300万件、登録店舗5万店、配達員10万人
- **現状インフラ**: オンプレミス + 一部AWS（移行途中）

### 現状の課題
QuickEats は急成長により、既存のオンプレミスインフラが限界に達しています。
全面的なAWS移行と同時に、アーキテクチャの刷新が求められています。

```
現状の問題点:
┌─────────────────────────────────────────────────────────────────┐
│                      現行システム構成                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. モノリシックアプリケーション                                  │
│    - 単一のPHPアプリケーション（Laravel）                        │
│    - 変更のたびに全体リリースが必要                              │
│    - スケーリングが困難                                         │
│                                                                  │
│ 2. データベースのボトルネック                                    │
│    - 単一のMySQL（オンプレ）                                     │
│    - 読み取り/書き込みが競合                                     │
│    - バックアップ・リカバリが手動                                │
│                                                                  │
│ 3. 監視・運用の属人化                                           │
│    - Zabbixベースの簡易監視                                      │
│    - 障害対応が夜間対応者依存                                    │
│    - ログ分析ができていない                                      │
│                                                                  │
│ 4. セキュリティの懸念                                           │
│    - 決済情報の取り扱いに不安                                    │
│    - DDoS対策が不十分                                           │
│    - 監査ログが整備されていない                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ビジネス要件
```
機能要件:
- マイクロサービスアーキテクチャへの移行
- リアルタイム位置追跡（配達員）
- プッシュ通知システム
- レコメンデーションエンジン
- 管理ダッシュボード

非機能要件:
- 99.99% の可用性
- ピーク時100万リクエスト/分の処理能力
- 注文処理レイテンシ < 200ms
- PCI DSS 準拠（決済処理）
- 月額インフラコスト < 2,000万円
```

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| システム可用性 | 99.5% | 99.99% |
| 平均注文処理時間 | 3秒 | 200ms |
| デプロイ頻度 | 月1回 | 日10回以上 |
| 障害検知時間 | 30分 | 1分 |
| インフラコスト | 2,500万円 | 2,000万円 |

---

## 3. アーキテクチャ要件

### ターゲットアーキテクチャ
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           QuickEats AWS Architecture                                     │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              Edge Layer                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │   │
│  │  │  Route 53   │  │ CloudFront  │  │   AWS WAF   │  │   Shield    │            │   │
│  │  │  (DNS +     │  │  (CDN +     │  │  (Web App   │  │  Advanced   │            │   │
│  │  │  Failover)  │  │  Static)    │  │  Firewall)  │  │  (DDoS)     │            │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┘            │   │
│  └─────────┼────────────────┼────────────────┼──────────────────────────────────────┘   │
│            │                │                │                                           │
│  ┌─────────┼────────────────┼────────────────┼──────────────────────────────────────┐   │
│  │         │     API Gateway Layer           │                                       │   │
│  │         │    ┌────────────────────────────┴───────┐                               │   │
│  │         │    │        Amazon API Gateway           │                               │   │
│  │         │    │   (REST API + WebSocket API)       │                               │   │
│  │         │    └────────────────────────────────────┘                               │   │
│  └─────────┼─────────────────────────────────────────────────────────────────────────┘   │
│            │                                                                             │
│  ┌─────────┼─────────────────────────────────────────────────────────────────────────┐   │
│  │         │              Compute Layer (EKS)                                        │   │
│  │         │                                                                          │   │
│  │  ┌──────┴──────────────────────────────────────────────────────────────────────┐  │   │
│  │  │                         Amazon EKS Cluster                                   │  │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │  │   │
│  │  │  │  User   │ │  Order  │ │Restaurant│ │Delivery │ │ Payment │ │Notifica-│  │  │   │
│  │  │  │ Service │ │ Service │ │ Service │ │ Service │ │ Service │ │  tion   │  │  │   │
│  │  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │  │   │
│  │  │       │           │           │           │           │           │        │  │   │
│  │  │       └───────────┴───────────┴─────┬─────┴───────────┴───────────┘        │  │   │
│  │  │                                     │                                       │  │   │
│  │  │                         ┌───────────┴───────────┐                          │  │   │
│  │  │                         │   Service Mesh        │                          │  │   │
│  │  │                         │   (App Mesh/Istio)    │                          │  │   │
│  │  │                         └───────────────────────┘                          │  │   │
│  │  └─────────────────────────────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              Data Layer                                            │   │
│  │                                                                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ Aurora      │  │ DynamoDB    │  │ ElastiCache │  │   Amazon    │              │   │
│  │  │ PostgreSQL  │  │ (Orders,    │  │   (Redis)   │  │ OpenSearch  │              │   │
│  │  │ (Users,     │  │  Sessions)  │  │  (Cache)    │  │ (Search)    │              │   │
│  │  │ Restaurants)│  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  │  └─────────────┘                                                                  │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           Event/Streaming Layer                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │   Amazon    │  │   Amazon    │  │    AWS      │  │   Amazon    │              │   │
│  │  │    SQS      │  │   Kinesis   │  │   Lambda    │  │    SNS      │              │   │
│  │  │  (Queue)    │  │ (Location)  │  │ (Processor) │  │   (Pub)     │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           Observability Layer                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ CloudWatch  │  │   X-Ray     │  │   Managed   │  │   Managed   │              │   │
│  │  │ Container   │  │ Distributed │  │ Prometheus  │  │  Grafana    │              │   │
│  │  │  Insights   │  │  Tracing    │  │   (AMP)     │  │   (AMG)     │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 実装タスク

### タスク一覧

```
Phase 1: 基盤構築（目安: 2-3時間）
├── Task 1-1: VPC・ネットワーク設計と構築
├── Task 1-2: EKS クラスター構築
├── Task 1-3: CI/CD パイプライン構築
└── Task 1-4: セキュリティ基盤（WAF, Secrets Manager）

Phase 2: データ層構築（目安: 2時間）
├── Task 2-1: Aurora PostgreSQL クラスター構築
├── Task 2-2: DynamoDB テーブル設計・構築
├── Task 2-3: ElastiCache Redis クラスター構築
└── Task 2-4: データ移行計画の策定

Phase 3: アプリケーション層構築（目安: 2-3時間）
├── Task 3-1: マイクロサービス設計
├── Task 3-2: API Gateway 設定
├── Task 3-3: 位置情報ストリーミング（Kinesis）
└── Task 3-4: 通知システム（SNS + Lambda）

Phase 4: 監視・運用基盤（目安: 1-2時間）
├── Task 4-1: CloudWatch Container Insights 設定
├── Task 4-2: X-Ray 分散トレーシング
├── Task 4-3: SLI/SLO ダッシュボード構築
└── Task 4-4: アラート・インシデント対応フロー

Phase 5: 最適化・完成（目安: 1時間）
├── Task 5-1: コスト最適化レビュー
├── Task 5-2: セキュリティレビュー
└── Task 5-3: 負荷テスト・パフォーマンスチューニング
```

---

## 5. 詳細タスク

### Task 1-1: VPC・ネットワーク設計

**要件**:
- マルチAZ構成（3AZ）
- Public/Private/Isolated サブネット
- NAT Gateway（コスト最適化考慮）
- VPC Endpoints（S3, ECR, DynamoDB等）

**設計課題**:
```
以下の要件を満たすVPCを設計してください:

1. CIDR 設計
   - VPC: 10.0.0.0/16
   - 将来の拡張を考慮
   - EKS Pod 用のセカンダリCIDR考慮

2. サブネット設計
   - Public: ALB, NAT Gateway
   - Private: EKS ノード, RDS, ElastiCache
   - Isolated: 管理用バスチョン（オプション）

3. 接続設計
   - オンプレミスとの VPN 接続（移行期間）
   - インターネット接続（NAT）
   - AWS サービスへの PrivateLink

出力物:
- VPC アーキテクチャ図
- CIDR 割り当て表
- CloudFormation/Terraform テンプレート
```

### Task 2-1: Aurora PostgreSQL 設計

**要件**:
```yaml
database_requirements:
  engine: Aurora PostgreSQL 15
  cluster_mode: Multi-AZ
  instance_class: db.r6g.large (最小構成)
  storage: Auto-scaling (10GB - 128TB)

  read_replicas:
    count: 2
    purpose:
      - 読み取りワークロード分散
      - レポーティング用

  backup:
    retention: 35 days
    cross_region: true (DR用)

  security:
    encryption: KMS CMK
    ssl: required
    iam_auth: enabled

  performance:
    connection_pooling: RDS Proxy
    max_connections: 5000
```

**実装課題**:
```python
# 以下の機能を持つ Aurora クラスターを構築してください

# 1. Writer インスタンス + 2 Reader インスタンス
# 2. 自動フェイルオーバー設定
# 3. RDS Proxy 経由の接続
# 4. CloudWatch アラーム設定
# 5. 自動スナップショット + クロスリージョンコピー

# 出力物:
# - CloudFormation テンプレート
# - 接続テスト用スクリプト
# - 監視ダッシュボード設定
```

### Task 3-1: マイクロサービス設計

**サービス分割**:
```yaml
microservices:
  user-service:
    responsibility: ユーザー認証・プロファイル管理
    database: Aurora PostgreSQL
    apis:
      - POST /users/register
      - POST /users/login
      - GET /users/{id}
      - PUT /users/{id}

  order-service:
    responsibility: 注文管理・状態遷移
    database: DynamoDB
    apis:
      - POST /orders
      - GET /orders/{id}
      - PUT /orders/{id}/status
      - GET /orders/user/{userId}
    events:
      publishes:
        - OrderCreated
        - OrderStatusChanged
      subscribes:
        - PaymentCompleted
        - DeliveryCompleted

  restaurant-service:
    responsibility: 店舗・メニュー管理
    database: Aurora PostgreSQL
    cache: ElastiCache
    apis:
      - GET /restaurants
      - GET /restaurants/{id}
      - GET /restaurants/{id}/menu
      - POST /restaurants/{id}/orders

  delivery-service:
    responsibility: 配達員管理・位置追跡
    database: DynamoDB
    streaming: Kinesis
    apis:
      - POST /deliveries/{id}/location
      - GET /deliveries/{id}/track
      - PUT /deliveries/{id}/status
    websocket:
      - /ws/track/{orderId}

  payment-service:
    responsibility: 決済処理
    database: Aurora PostgreSQL (PCI DSS対応)
    apis:
      - POST /payments
      - GET /payments/{id}
      - POST /payments/{id}/refund
    integration:
      - Stripe API
      - Secrets Manager (APIキー管理)

  notification-service:
    responsibility: プッシュ通知・メール
    infrastructure: Lambda + SNS
    apis:
      - POST /notifications/push
      - POST /notifications/email
      - POST /notifications/sms
```

### Task 3-3: 位置情報ストリーミング設計

**要件**:
```yaml
location_tracking:
  input:
    source: 配達員モバイルアプリ
    frequency: 5秒ごと
    data_points: 10万人同時

  processing:
    stream: Kinesis Data Streams
    shards: 10 (auto-scaling)
    retention: 24 hours

    lambda_processor:
      - バッチサイズ: 100レコード
      - 同時実行数: 100
      - 処理内容:
        - ジオフェンス判定
        - ETA 計算
        - 異常検知（速度違反等）

  storage:
    hot: DynamoDB (最新位置)
    warm: S3 (履歴データ)

  output:
    - WebSocket (リアルタイム配信)
    - SNS (ステータス通知)
```

**実装例**:
```python
# lambda/location_processor.py
import json
import boto3
from datetime import datetime
import math

dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')

LOCATION_TABLE = 'delivery-locations'
GEOFENCE_RADIUS_KM = 0.5  # 500m

def lambda_handler(event, context):
    """
    Kinesis から配達員の位置情報を処理
    """
    processed_records = []

    for record in event['Records']:
        # Kinesis レコードのデコード
        payload = json.loads(
            base64.b64decode(record['kinesis']['data']).decode('utf-8')
        )

        delivery_id = payload['delivery_id']
        lat = payload['latitude']
        lng = payload['longitude']
        timestamp = payload['timestamp']

        # 1. 最新位置を DynamoDB に保存
        update_current_location(delivery_id, lat, lng, timestamp)

        # 2. ジオフェンス判定（目的地到着）
        order = get_order_by_delivery(delivery_id)
        if order and check_geofence(lat, lng, order['destination'], GEOFENCE_RADIUS_KM):
            notify_arrival(delivery_id, order)

        # 3. ETA 計算・更新
        eta = calculate_eta(lat, lng, order['destination'])
        update_eta(delivery_id, eta)

        processed_records.append(delivery_id)

    return {
        'statusCode': 200,
        'body': f'Processed {len(processed_records)} records'
    }

def check_geofence(lat1, lng1, destination, radius_km):
    """
    ジオフェンス判定（ハーバーサイン公式）
    """
    lat2, lng2 = destination['lat'], destination['lng']

    R = 6371  # 地球の半径 (km)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = (math.sin(dlat/2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng/2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c

    return distance <= radius_km

def notify_arrival(delivery_id, order):
    """
    到着通知の送信
    """
    sns.publish(
        TopicArn=os.environ['NOTIFICATION_TOPIC'],
        Message=json.dumps({
            'type': 'DELIVERY_ARRIVAL',
            'delivery_id': delivery_id,
            'order_id': order['order_id'],
            'user_id': order['user_id']
        }),
        MessageAttributes={
            'event_type': {'DataType': 'String', 'StringValue': 'DELIVERY_ARRIVAL'}
        }
    )
```

---

## 6. 評価基準

### 技術的評価項目

| カテゴリ | 評価項目 | 配点 |
|----------|----------|------|
| **アーキテクチャ** | マイクロサービス設計の適切さ | 20点 |
| **可用性** | Multi-AZ、自動フェイルオーバー | 15点 |
| **セキュリティ** | PCI DSS考慮、WAF、暗号化 | 15点 |
| **スケーラビリティ** | 自動スケーリング設計 | 15点 |
| **監視・運用** | SLI/SLO、アラート、ログ | 15点 |
| **コスト最適化** | 予算内での設計、Savings Plans考慮 | 10点 |
| **IaC** | CloudFormation/Terraform品質 | 10点 |

### 合格基準
- 総合点 70点以上
- 各カテゴリで最低50%以上

---

## 7. 参考コスト見積もり

```
月額コスト見積もり（本番環境）:

┌──────────────────────────────────────────────────────────┐
│ サービス                     │ 構成          │ 月額コスト │
├──────────────────────────────────────────────────────────┤
│ EKS                          │ 3ノード(m5.xlarge)│ $500    │
│ Aurora PostgreSQL            │ Writer+2Reader │ $1,200   │
│ DynamoDB                     │ オンデマンド   │ $800     │
│ ElastiCache Redis            │ 3ノード       │ $400     │
│ Kinesis Data Streams         │ 10シャード    │ $300     │
│ API Gateway                  │ 100M req      │ $350     │
│ CloudFront                   │ 10TB転送      │ $850     │
│ Lambda                       │ 50M実行       │ $200     │
│ その他（VPC, Route53等）     │              │ $400     │
├──────────────────────────────────────────────────────────┤
│ 合計                                        │ $5,000   │
│ Savings Plans適用後（-30%）                 │ $3,500   │
│ 日本円換算（150円/USD）                    │ 約52万円 │
└──────────────────────────────────────────────────────────┘

※ 本番規模（300万注文/月）の最小構成見積もり
※ ピーク対応・DR構成を含めると約2倍
```

---

# 課題30-B: LearnAI EdTechスタートアップMVP構築

## 1. 課題分類

| 項目 | 内容 |
|------|------|
| **カテゴリ** | 統合課題（MVP構築） |
| **難易度** | 初級〜中級（Beginner to Intermediate） |
| **所要時間** | 6-8時間 |
| **前提スキル** | AWS基礎、Web開発基礎 |
| **カバー範囲** | サーバーレス、データベース、認証、CDN、監視 |

---

## 2. ビジネスシナリオ

### 企業プロファイル
- **企業名**: LearnAI株式会社
- **業種**: EdTech（AI学習プラットフォーム）
- **規模**: 創業メンバー5名（エンジニア3名）
- **フェーズ**: シード期、MVP構築中
- **資金**: シード調達 5,000万円

### プロダクト概要
```
LearnAI は、AI を活用した個人最適化学習プラットフォームです。

主要機能:
1. AI による学習コンテンツ推薦
2. 進捗トラッキングと分析
3. オンラインクイズ・テスト
4. 学習コミュニティ（Q&A）
5. 講師向け管理画面

ターゲットユーザー:
- プログラミング学習者（初心者〜中級者）
- 初期目標: 1,000 ユーザー、100 講座
```

### MVP 要件
```
機能要件（MVP スコープ）:
- ユーザー認証（サインアップ/ログイン）
- 講座一覧・詳細表示
- 動画視聴
- クイズ機能
- 進捗管理

非機能要件:
- 初期ユーザー: 1,000人
- 同時接続: 100人
- 動画ストレージ: 1TB
- 月額インフラコスト: < 5万円
- 開発期間: 1ヶ月（MVP）
```

### 成功指標（KPI）
| 指標 | MVP目標 |
|------|---------|
| 月間アクティブユーザー | 500人 |
| 講座完了率 | 30% |
| 平均セッション時間 | 20分 |
| システム稼働率 | 99.5% |
| 月額インフラコスト | < 5万円 |

---

## 3. アーキテクチャ設計

### MVP アーキテクチャ
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            LearnAI MVP Architecture                                      │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              Frontend (React/Next.js)                            │   │
│  │                                                                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │   │
│  │  │   CloudFront    │  │      S3         │  │    Route 53     │                  │   │
│  │  │   (CDN)         │◄─┤  (Static Site)  │  │   (DNS)         │                  │   │
│  │  └────────┬────────┘  └─────────────────┘  └─────────────────┘                  │   │
│  │           │                                                                       │   │
│  └───────────┼───────────────────────────────────────────────────────────────────────┘   │
│              │                                                                           │
│              ▼                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              Backend (Serverless)                                │   │
│  │                                                                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │   │
│  │  │  API Gateway    │  │   Lambda        │  │   Cognito       │                  │   │
│  │  │  (REST API)     │─▶│  (Functions)    │  │  (Auth)         │                  │   │
│  │  └─────────────────┘  └────────┬────────┘  └─────────────────┘                  │   │
│  │                                │                                                  │   │
│  └────────────────────────────────┼──────────────────────────────────────────────────┘   │
│                                   │                                                      │
│  ┌────────────────────────────────┼──────────────────────────────────────────────────┐   │
│  │                     Data Layer │                                                   │   │
│  │                                ▼                                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │   │
│  │  │   DynamoDB      │  │      S3         │  │   OpenSearch    │                   │   │
│  │  │ (Users, Courses │  │   (Videos,      │  │  Serverless     │                   │   │
│  │  │  Progress)      │  │   Assets)       │  │  (Search)       │                   │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              AI/ML Layer                                           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                                        │   │
│  │  │  Amazon Bedrock │  │   Personalize   │                                        │   │
│  │  │  (Content Gen)  │  │  (Recommend)    │                                        │   │
│  │  └─────────────────┘  └─────────────────┘                                        │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              Monitoring                                            │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │   │
│  │  │   CloudWatch    │  │    X-Ray        │  │   Budgets       │                   │   │
│  │  │   (Metrics/Logs)│  │   (Tracing)     │  │   (Cost)        │                   │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 実装タスク

### タスク一覧

```
Phase 1: 認証基盤（目安: 1-2時間）
├── Task 1-1: Cognito User Pool 設定
├── Task 1-2: ソーシャルログイン（Google）
└── Task 1-3: 認証フローのテスト

Phase 2: API 基盤（目安: 2時間）
├── Task 2-1: API Gateway + Lambda セットアップ
├── Task 2-2: DynamoDB テーブル設計
├── Task 2-3: CRUD API 実装
└── Task 2-4: Cognito 認証統合

Phase 3: コンテンツ管理（目安: 1-2時間）
├── Task 3-1: S3 動画ストレージ設定
├── Task 3-2: CloudFront 配信設定
├── Task 3-3: 署名付き URL 実装
└── Task 3-4: 動画アップロード API

Phase 4: フロントエンド（目安: 1-2時間）
├── Task 4-1: Next.js プロジェクトセットアップ
├── Task 4-2: Amplify Hosting デプロイ
├── Task 4-3: 認証 UI 実装
└── Task 4-4: 講座一覧・詳細ページ

Phase 5: 監視・コスト管理（目安: 1時間）
├── Task 5-1: CloudWatch ダッシュボード
├── Task 5-2: アラート設定
└── Task 5-3: Budget 設定
```

---

## 5. 詳細タスク

### Task 1-1: Cognito User Pool 設定

**要件**:
```yaml
cognito_config:
  user_pool:
    name: learnai-users
    sign_in_aliases:
      - email
    password_policy:
      minimum_length: 8
      require_lowercase: true
      require_numbers: true
      require_symbols: false
    mfa:
      enabled: optional
      methods: [TOTP]
    verification:
      email: required
      phone: optional

  app_client:
    name: learnai-web
    auth_flows:
      - USER_SRP_AUTH
      - REFRESH_TOKEN_AUTH
    oauth:
      flows: [code]
      scopes: [openid, email, profile]
      callback_urls:
        - http://localhost:3000/callback
        - https://app.learnai.example.com/callback

  hosted_ui:
    domain_prefix: learnai-auth
    custom_domain: auth.learnai.example.com (optional)

  triggers:
    pre_sign_up: lambda (custom validation)
    post_confirmation: lambda (create user record)
```

**実装スクリプト**:
```bash
#!/bin/bash
# setup-cognito.sh

# User Pool の作成
USER_POOL_ID=$(aws cognito-idp create-user-pool \
    --pool-name "learnai-users" \
    --auto-verified-attributes email \
    --username-attributes email \
    --policies '{
        "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireLowercase": true,
            "RequireNumbers": true,
            "RequireSymbols": false,
            "RequireUppercase": true
        }
    }' \
    --schema '[
        {
            "Name": "email",
            "AttributeDataType": "String",
            "Required": true,
            "Mutable": true
        },
        {
            "Name": "name",
            "AttributeDataType": "String",
            "Required": false,
            "Mutable": true
        }
    ]' \
    --query 'UserPool.Id' \
    --output text)

echo "User Pool ID: $USER_POOL_ID"

# App Client の作成
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id $USER_POOL_ID \
    --client-name "learnai-web" \
    --generate-secret false \
    --explicit-auth-flows \
        ALLOW_USER_SRP_AUTH \
        ALLOW_REFRESH_TOKEN_AUTH \
    --supported-identity-providers COGNITO \
    --callback-urls '["http://localhost:3000/callback"]' \
    --logout-urls '["http://localhost:3000"]' \
    --allowed-o-auth-flows code \
    --allowed-o-auth-scopes openid email profile \
    --allowed-o-auth-flows-user-pool-client true \
    --query 'UserPoolClient.ClientId' \
    --output text)

echo "Client ID: $CLIENT_ID"
```

### Task 2-2: DynamoDB テーブル設計

**スキーマ設計**:
```yaml
dynamodb_tables:
  # ユーザーテーブル
  Users:
    partition_key: userId (S)
    attributes:
      - email
      - name
      - profileImage
      - createdAt
      - updatedAt
    gsi:
      - name: email-index
        partition_key: email (S)

  # 講座テーブル
  Courses:
    partition_key: courseId (S)
    attributes:
      - title
      - description
      - instructorId
      - thumbnailUrl
      - category
      - level  # beginner, intermediate, advanced
      - price
      - lessons  # List of lesson objects
      - createdAt
      - publishedAt
    gsi:
      - name: category-index
        partition_key: category (S)
        sort_key: createdAt (S)

  # 進捗テーブル
  Progress:
    partition_key: userId (S)
    sort_key: courseId (S)
    attributes:
      - completedLessons  # Set of lessonIds
      - currentLesson
      - quizScores  # Map of quizId -> score
      - startedAt
      - lastAccessedAt
      - completedAt
    gsi:
      - name: course-progress-index
        partition_key: courseId (S)
        sort_key: userId (S)

  # クイズ結果テーブル
  QuizResults:
    partition_key: pk (S)  # USER#{userId}
    sort_key: sk (S)       # QUIZ#{quizId}#ATTEMPT#{timestamp}
    attributes:
      - courseId
      - lessonId
      - score
      - answers  # Map
      - submittedAt
```

**実装例**:
```python
# lambda/courses/get_courses.py
import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Courses')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    """
    講座一覧の取得
    """
    query_params = event.get('queryStringParameters') or {}
    category = query_params.get('category')
    limit = int(query_params.get('limit', 20))

    try:
        if category:
            # カテゴリでフィルター
            response = table.query(
                IndexName='category-index',
                KeyConditionExpression='category = :cat',
                ExpressionAttributeValues={':cat': category},
                Limit=limit,
                ScanIndexForward=False  # 新しい順
            )
        else:
            # 全件取得（ページネーション考慮）
            response = table.scan(Limit=limit)

        courses = response.get('Items', [])

        # 公開済みのみ返却
        published_courses = [
            c for c in courses
            if c.get('publishedAt')
        ]

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'courses': published_courses,
                'count': len(published_courses)
            }, cls=DecimalEncoder)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

### Task 3-3: 署名付きURL実装

**要件**:
```yaml
video_delivery:
  storage: S3
  distribution: CloudFront
  security:
    - Signed URLs (時間制限付き)
    - Origin Access Control
  url_expiry: 3600  # 1時間
```

**実装例**:
```python
# lambda/videos/get_video_url.py
import json
import boto3
import os
from datetime import datetime, timedelta
from botocore.signers import CloudFrontSigner
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
import rsa

CLOUDFRONT_KEY_PAIR_ID = os.environ['CLOUDFRONT_KEY_PAIR_ID']
CLOUDFRONT_DOMAIN = os.environ['CLOUDFRONT_DOMAIN']
PRIVATE_KEY_SECRET_NAME = os.environ['PRIVATE_KEY_SECRET_NAME']

secrets_client = boto3.client('secretsmanager')

def get_private_key():
    """Secrets Manager から CloudFront 署名用秘密鍵を取得"""
    response = secrets_client.get_secret_value(SecretId=PRIVATE_KEY_SECRET_NAME)
    return response['SecretString']

def rsa_signer(message):
    """RSA 署名関数"""
    private_key = get_private_key()
    key = rsa.PrivateKey.load_pkcs1(private_key.encode('utf8'))
    return rsa.sign(message, key, 'SHA-1')

def lambda_handler(event, context):
    """
    動画視聴用の署名付き URL を生成
    """
    # 認証されたユーザーIDを取得
    user_id = event['requestContext']['authorizer']['claims']['sub']

    # パスパラメータからビデオキーを取得
    path_params = event.get('pathParameters', {})
    video_key = path_params.get('videoKey')

    if not video_key:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'videoKey is required'})
        }

    # 視聴権限の確認（DynamoDB で進捗確認）
    # ... 省略 ...

    # 署名付き URL の生成
    url = f"https://{CLOUDFRONT_DOMAIN}/videos/{video_key}"
    expire_date = datetime.utcnow() + timedelta(hours=1)

    cloudfront_signer = CloudFrontSigner(CLOUDFRONT_KEY_PAIR_ID, rsa_signer)
    signed_url = cloudfront_signer.generate_presigned_url(
        url,
        date_less_than=expire_date
    )

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'url': signed_url,
            'expiresAt': expire_date.isoformat()
        })
    }
```

### Task 4-2: Amplify Hosting デプロイ

**設定例**:
```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*

  customHeaders:
    - pattern: '**/*'
      headers:
        - key: 'Strict-Transport-Security'
          value: 'max-age=31536000; includeSubDomains'
        - key: 'X-Content-Type-Options'
          value: 'nosniff'
        - key: 'X-Frame-Options'
          value: 'DENY'
```

**デプロイスクリプト**:
```bash
#!/bin/bash
# deploy-amplify.sh

APP_NAME="learnai-frontend"
REGION="ap-northeast-1"
REPO_URL="https://github.com/learnai/frontend"
BRANCH="main"

# Amplify App の作成
APP_ID=$(aws amplify create-app \
    --name $APP_NAME \
    --repository $REPO_URL \
    --platform WEB_COMPUTE \
    --environment-variables '{
        "NEXT_PUBLIC_API_URL": "https://api.learnai.example.com",
        "NEXT_PUBLIC_COGNITO_USER_POOL_ID": "ap-northeast-1_xxxxx",
        "NEXT_PUBLIC_COGNITO_CLIENT_ID": "xxxxx"
    }' \
    --query 'app.appId' \
    --output text \
    --region $REGION)

echo "Amplify App ID: $APP_ID"

# ブランチの接続
aws amplify create-branch \
    --app-id $APP_ID \
    --branch-name $BRANCH \
    --framework "Next.js - SSR" \
    --region $REGION

# ビルドの開始
aws amplify start-job \
    --app-id $APP_ID \
    --branch-name $BRANCH \
    --job-type RELEASE \
    --region $REGION

echo "Deployment started. Check Amplify Console for status."
```

---

## 6. 評価基準

### MVP 評価項目

| カテゴリ | 評価項目 | 配点 |
|----------|----------|------|
| **機能完成度** | 必須機能の実装 | 30点 |
| **アーキテクチャ** | サーバーレス設計の適切さ | 20点 |
| **セキュリティ** | 認証・認可、データ保護 | 15点 |
| **スケーラビリティ** | 将来の成長対応 | 10点 |
| **コスト効率** | 予算内での設計 | 15点 |
| **コード品質** | 可読性、テスト | 10点 |

### 合格基準
- 総合点 60点以上
- 必須機能が全て動作すること

---

## 7. 参考コスト見積もり

```
MVP 月額コスト見積もり（1,000ユーザー）:

┌──────────────────────────────────────────────────────────┐
│ サービス                     │ 構成          │ 月額コスト │
├──────────────────────────────────────────────────────────┤
│ Cognito                      │ 1,000 MAU     │ 無料      │
│ API Gateway                  │ 1M リクエスト │ $3.50     │
│ Lambda                       │ 1M 実行       │ $0.20     │
│ DynamoDB                     │ オンデマンド  │ $5-10     │
│ S3                           │ 1TB          │ $23       │
│ CloudFront                   │ 100GB転送    │ $8.50     │
│ Amplify Hosting              │ ビルド+ホスト│ $5        │
│ CloudWatch                   │ 基本監視     │ $3        │
├──────────────────────────────────────────────────────────┤
│ 合計                                        │ ~$50      │
│ 日本円換算（150円/USD）                    │ 約7,500円 │
└──────────────────────────────────────────────────────────┘

※ AWS 無料利用枠を活用した場合、さらに削減可能
※ Bedrock/Personalize は使用量に応じて追加コスト発生
```

---

## 8. 共通の発展課題

### 発展課題1: CI/CD パイプライン構築（両課題共通）

**課題内容**:
GitHub Actions または CodePipeline を使用して、
完全自動化された CI/CD パイプラインを構築してください。

**要件**:
- 自動テスト（単体テスト、統合テスト）
- セキュリティスキャン（SAST、依存関係チェック）
- Blue/Green または Canary デプロイ
- 自動ロールバック機能

### 発展課題2: 災害復旧（DR）設計（30-A向け）

**課題内容**:
マルチリージョン DR アーキテクチャを設計・実装してください。

**要件**:
- RPO: 1時間、RTO: 4時間
- 東京 → 大阪のフェイルオーバー
- データ同期の自動化
- 定期的な DR 訓練計画

### 発展課題3: AI 機能の実装（30-B向け）

**課題内容**:
Amazon Bedrock を使用して、以下の AI 機能を実装してください。

**要件**:
- 学習コンテンツの自動生成
- クイズ問題の自動生成
- 学習者の質問への自動回答（RAG）
- 学習進捗に基づくアドバイス生成

---

## 9. 提出物

### 30-A（QuickEats）の提出物
```
1. アーキテクチャドキュメント
   - 全体アーキテクチャ図
   - データフロー図
   - ネットワーク設計図

2. Infrastructure as Code
   - CloudFormation または Terraform テンプレート
   - 全リソースの定義

3. アプリケーションコード
   - マイクロサービス実装（少なくとも2サービス）
   - API 定義（OpenAPI）

4. 監視・運用設計
   - SLI/SLO 定義
   - ダッシュボード設定
   - ランブック（基本的な障害対応手順）

5. コスト見積もり
   - 詳細なコスト内訳
   - 最適化提案
```

### 30-B（LearnAI）の提出物
```
1. アーキテクチャドキュメント
   - システム構成図
   - API 設計

2. Infrastructure as Code
   - SAM または CDK テンプレート

3. 動作するアプリケーション
   - フロントエンド（デプロイ済み URL）
   - バックエンド API

4. テストドキュメント
   - テスト計画
   - テスト結果

5. コスト管理
   - Budget 設定
   - コスト予測
```

---

## 10. 振り返りチェックリスト

### 学習確認項目

```
課題30を通じて習得したスキル:

□ コンピュート
  □ EKS / ECS でのコンテナ運用
  □ Lambda サーバーレスアーキテクチャ
  □ 適切なコンピュートサービスの選択

□ データベース
  □ Aurora / RDS の設計・運用
  □ DynamoDB のスキーマ設計
  □ ElastiCache の活用

□ ネットワーク
  □ VPC 設計（マルチ AZ）
  □ PrivateLink / VPC Endpoints
  □ CDN / エッジサービス

□ セキュリティ
  □ IAM 設計
  □ 暗号化（保存時・転送時）
  □ WAF / Shield
  □ Secrets Manager / KMS

□ 監視・運用
  □ CloudWatch メトリクス・ログ
  □ X-Ray 分散トレーシング
  □ SLI/SLO 設計

□ コスト最適化
  □ コスト見積もり
  □ Savings Plans / Reserved Instances
  □ Budget 管理

□ DevOps
  □ CI/CD パイプライン
  □ Infrastructure as Code
  □ Blue/Green デプロイ
```

---

**課題作成日**: 2024年1月
**最終更新日**: 2024年1月
**作成者**: AWS学習プログラム
