# 課題44: 小売チェーンの在庫管理API

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | マイクロサービス・API |
| 処理タイプ | リアルタイム |
| 使用IaC | Terraform |
| 想定所要時間 | 6-7時間 |

---

## 2. シナリオ

### 企業プロフィール
**〇〇株式会社**は、全国200店舗を展開する小売チェーンです。各店舗の在庫をリアルタイムで把握し、オムニチャネル（店舗・EC・アプリ）で在庫情報を一元管理したいと考えています。

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

## 3. 達成目標

### 技術的な学習ポイント
1. AWS App Meshによるサービスメッシュの構築
2. サービス間通信の可観測性向上（トレーシング、メトリクス）
3. サーキットブレーカーとリトライポリシーの実装
4. Aurora PostgreSQLによる在庫データの一貫性管理

### 実務で活かせる知識
- App Mesh Virtual Service / Virtual Node の設計
- Envoy プロキシの基本設定
- X-Ray による分散トレーシング
- CloudWatch Container Insights の活用

---

## 4. 学習するAWSサービス

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

```mermaid
architecture-beta
    group clients(internet)[Clients]
    service pos(server)[Store POS] in clients
    service ec(internet)[EC Site] in clients
    service app(server)[Mobile App] in clients
    service admin(server)[Admin Console] in clients

    group aws(cloud)[AWS Cloud]

    group alb_layer(server)[Load Balancer] in aws
    service alb(internet)[ALB Virtual Gateway] in alb_layer

    group app_mesh(server)[AWS App Mesh] in aws
    service api_gw(server)[API Gateway Envoy] in app_mesh
    service inventory(server)[Inventory Svc CircuitBreaker] in app_mesh
    service store(server)[Store Svc Retry] in app_mesh
    service product(server)[Product Svc Envoy] in app_mesh

    group data_layer(database)[Data Layer] in aws
    service rds_proxy1(server)[RDS Proxy] in data_layer
    service rds_proxy2(server)[RDS Proxy] in data_layer
    service elasticache(database)[ElastiCache Redis] in data_layer
    service aurora(database)[Aurora PostgreSQL Multi-AZ] in data_layer

    pos:B --> T:alb
    ec:B --> T:alb
    app:B --> T:alb
    admin:B --> T:alb
    alb:B --> T:api_gw
    api_gw:B --> T:inventory
    api_gw:B --> T:store
    api_gw:B --> T:product
    inventory:R --> L:store
    inventory:B --> T:rds_proxy1
    store:B --> T:rds_proxy2
    product:B --> T:elasticache
    rds_proxy1:B --> T:aurora
    rds_proxy2:B --> T:aurora
```

| コンポーネント | 役割 |
|----------------|------|
| **Store POS** | 店舗POSシステム（在庫更新ソース） |
| **EC Site** | ECサイト（在庫照会・注文） |
| **Mobile App** | モバイルアプリ |
| **Admin Console** | 管理画面 |
| **ALB Virtual Gateway** | App Mesh Virtual Gateway統合ALB |
| **API Gateway Envoy** | APIルーティング・認証（Envoyサイドカー） |
| **Inventory Svc** | 在庫管理サービス（サーキットブレーカー付き） |
| **Store Svc** | 店舗情報サービス（リトライポリシー付き） |
| **Product Svc** | 商品マスタサービス |
| **RDS Proxy** | DBコネクションプーリング |
| **ElastiCache Redis** | 商品情報キャッシュ |
| **Aurora PostgreSQL** | 在庫データベース（Writer + 2 Readers） |

### サービス一覧
| サービス | 役割 | エンドポイント |
|----------|------|---------------|
| api-gateway | ルーティング・認証 | /api/* |
| inventory-service | 在庫管理 | /api/inventory/* |
| store-service | 店舗情報管理 | /api/stores/* |
| product-service | 商品マスタ管理 | /api/products/* |

---

## 7. トラブルシューティング課題

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

## 8. 設計考慮ポイント

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

## 9. 発展課題

### Advanced 1: カナリアリリース
**課題**: App Meshのトラフィック分割機能を使って、新バージョンに10%のトラフィックを流す

### Advanced 2: GraphQL Federation
**課題**: 複数のマイクロサービスのAPIをGraphQLで統合

### Advanced 3: CQRS + Event Sourcing
**課題**: 在庫変更をイベントとして記録し、読み取り専用ビューを構築

---

## 10. コスト見積もり

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

## 11. 学習のポイント

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

### 次のステップ
1. mTLSによるサービス間認証
2. トラフィックシフトによるカナリアデプロイ
3. カオスエンジニアリングの導入
