# 課題34: SaaS企業のマルチテナント基盤構築

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | コンテナ |
| 処理タイプ | リアルタイム |
| 使用IaC | Terraform |
| 想定所要時間 | 6-8時間 |

---

## 2. シナリオ

### 企業プロファイル

| 項目 | 内容 |
|------|------|
| **企業名** | TaskFlow株式会社 |
| **業種** | プロジェクト管理SaaS |
| **従業員数** | 80名（エンジニア35名） |
| **テナント数** | 500社（月額利用料ベースで収益化） |
| **月間リクエスト** | 5000万リクエスト |
| **データ量** | テナント平均5GB、合計2.5TB |

### 現状の課題

```
TaskFlow株式会社は急成長するプロジェクト管理SaaSを提供しています。
現在は全テナントが同一のEC2インスタンス群で稼働していますが、
以下の課題が顕在化しています：

1. テナント間のリソース競合
   - 大規模テナントが他テナントの性能に影響
   - ピーク時に応答時間が5秒以上に悪化

2. セキュリティ懸念
   - テナント間のデータ分離が不十分
   - コンプライアンス要件（ISO27001）対応の必要性

3. 運用効率の低下
   - テナントごとのカスタマイズ要求への対応困難
   - スケーリングが粗粒度で非効率

4. データベース接続管理
   - コネクションプール枯渇が頻発
   - フェイルオーバー時の接続切れ
```

### ビジネス目標

| KPI | 現状 | 目標 |
|-----|------|------|
| P99レイテンシ | 5秒 | 500ms以下 |
| テナント分離レベル | なし | Namespace + ネットワークポリシー |
| DB接続効率 | 直接接続（コネクション枯渇） | RDS Proxy経由（プーリング） |
| デプロイ頻度 | 週1回 | 1日複数回（テナント単位） |
| リソース効率 | 平均CPU使用率30% | 平均60%以上 |

---

## 3. 達成目標（ゴール）

### 主要な学習成果

```
この課題を完了すると、以下ができるようになります：

1. EKS基盤の構築とマルチテナント設計
   - Namespaceによるテナント分離
   - ResourceQuotaとLimitRangeの適用
   - NetworkPolicyによるネットワーク分離

2. Istioによるサービスメッシュの実装
   - トラフィック管理とルーティング
   - 相互TLS（mTLS）による通信暗号化
   - テナントごとのレート制限

3. RDS Proxyによるデータベース接続最適化
   - コネクションプーリング
   - IAM認証の統合
   - フェイルオーバー時の接続維持

4. 可観測性の確立
   - テナント別のメトリクス収集
   - 分散トレーシング（Jaeger）
   - Kialiによるサービスメッシュ可視化
```

### 合格基準

| 項目 | 基準 |
|------|------|
| テナント分離 | NetworkPolicyでテナント間通信がブロックされること |
| mTLS | すべてのサービス間通信がmTLS化されること |
| DB接続 | RDS Proxy経由で接続プーリングが機能すること |
| レート制限 | テナントごとのAPI制限が正しく適用されること |
| 監視 | テナント別のダッシュボードが作成されること |

---

## 4. 使用するAWSサービス

### コア技術スタック

```yaml
Kubernetes基盤:
  - Amazon EKS: Kubernetes クラスター
  - Amazon ECR: コンテナイメージレジストリ
  - AWS Load Balancer Controller: ALB/NLB 統合

サービスメッシュ:
  - Istio: サービスメッシュ制御
  - Envoy: データプレーン
  - Kiali: サービスメッシュ可視化
  - Jaeger: 分散トレーシング

データベース:
  - Amazon RDS (PostgreSQL): マルチテナントDB
  - Amazon RDS Proxy: 接続プーリング
  - AWS Secrets Manager: 認証情報管理

セキュリティ:
  - AWS IAM: 認証・認可
  - Amazon VPC: ネットワーク分離
  - AWS WAF: Webアプリケーション保護
  - AWS Certificate Manager: TLS証明書

監視・運用:
  - Amazon CloudWatch: ログ・メトリクス
  - Container Insights: コンテナ監視
  - Prometheus: メトリクス収集
  - Grafana: ダッシュボード
```

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| Kubernetesマネージド | EKS | GKE |
| サービスメッシュ | Istio on EKS / App Mesh | Anthos Service Mesh |
| DBプロキシ | RDS Proxy | Cloud SQL Proxy |
| コンテナレジストリ | ECR | Artifact Registry |
| ロードバランサ統合 | ALB Ingress Controller | GKE Ingress |

---

## 5. 前提条件

### 技術要件

```bash
# 必要なCLIツール
aws --version          # 2.x
kubectl version        # 1.28+
eksctl version         # 0.160+
istioctl version       # 1.20+
helm version           # 3.12+

# AWS設定
aws configure
export AWS_REGION=ap-northeast-1
export CLUSTER_NAME=taskflow-eks
```

### 事前準備

```bash
# 1. VPC CIDR設計
# - VPC: 10.0.0.0/16
# - Public Subnets: 10.0.0.0/20, 10.0.16.0/20, 10.0.32.0/20
# - Private Subnets: 10.0.128.0/20, 10.0.144.0/20, 10.0.160.0/20
# - DB Subnets: 10.0.200.0/24, 10.0.201.0/24, 10.0.202.0/24

# 2. ECRリポジトリ作成
aws ecr create-repository --repository-name taskflow/api-gateway
aws ecr create-repository --repository-name taskflow/project-service
aws ecr create-repository --repository-name taskflow/user-service
aws ecr create-repository --repository-name taskflow/task-service
```

---

## 6. アーキテクチャ図

### 全体構成

```mermaid
architecture-beta
    group internet(cloud)[Internet]
    group edge(server)[Edge Layer]
    group eks(cloud)[EKS Cluster]
    group mesh(server)[Istio Service Mesh mTLS] in eks
    group tenant_a(server)[Namespace: tenant-enterprise-a] in mesh
    group tenant_b(server)[Namespace: tenant-standard-b] in mesh
    group shared(server)[Namespace: shared-services] in mesh
    group monitoring(server)[Namespace: monitoring] in eks
    group data(database)[Data Layer]

    service user(internet)[User] in internet
    service waf(server)[AWS WAF Rate Limiting] in edge
    service alb(server)[Application Load Balancer] in edge

    service istio_ingress(server)[Istio Ingress Gateway] in eks

    service project_a(server)[Project Service Envoy] in tenant_a
    service task_a(server)[Task Service Envoy] in tenant_a
    service user_a(server)[User Service Envoy] in tenant_a

    service project_b(server)[Project Service] in tenant_b
    service task_b(server)[Task Service] in tenant_b
    service user_b(server)[User Service] in tenant_b

    service auth_svc(server)[Auth Service] in shared
    service billing_svc(server)[Billing Service] in shared
    service notif_svc(server)[Notification Service] in shared

    service prometheus(server)[Prometheus] in monitoring
    service grafana(server)[Grafana] in monitoring
    service kiali(server)[Kiali] in monitoring
    service jaeger(server)[Jaeger] in monitoring

    service rds_proxy(database)[RDS Proxy Connection Pool] in data
    service rds(database)[RDS PostgreSQL Multi-AZ] in data

    user:B --> T:waf
    waf:B --> T:alb
    alb:B --> T:istio_ingress
    istio_ingress:B --> T:project_a
    istio_ingress:B --> T:project_b
    project_a:B --> T:rds_proxy
    project_b:B --> T:rds_proxy
    rds_proxy:B --> T:rds
```

**Tenant Isolation:**
- Namespace: 論理的分離
- NetworkPolicy: deny-all + allow-same-tenant
- ResourceQuota: Enterprise (CPU 4, Memory 8Gi), Standard (CPU 2, Memory 4Gi)
- mTLS: 通信暗号化
- PostgreSQL Schema: tenant_a, tenant_b, shared (Row Level Security)

### データフロー

```
1. リクエストフロー
   Internet → WAF → ALB → Istio Ingress Gateway
   → VirtualService (ルーティング) → Tenant Namespace
   → Envoy Sidecar (mTLS) → Application Pod

2. データベースアクセス
   Application Pod → RDS Proxy (IAM認証)
   → コネクションプール → PostgreSQL
   → テナント別スキーマ (Row Level Security)

3. テナント間分離
   - Namespace: 論理的分離
   - NetworkPolicy: ネットワーク分離
   - ResourceQuota: リソース分離
   - mTLS: 通信暗号化
   - RLS: データ分離
```

---

## 8. トラブルシューティングチャレンジ

### Challenge 1: テナント間通信が発生している

```
問題:
あるテナントのPodから別テナントのサービスにリクエストが到達している。
NetworkPolicyが正しく機能していないようだ。

ログ:
kubectl logs -n tenant-acme-corp deploy/project-service
[ERROR] Unexpected response from tenant-small-biz namespace

調査項目:
1. NetworkPolicyの適用状態
2. Istio Sidecarの状態
3. DNS解決の挙動
```

<details>
<summary>解決のヒント</summary>

```bash
# 1. NetworkPolicy確認
kubectl get networkpolicy -n tenant-acme-corp
kubectl describe networkpolicy default-deny-all -n tenant-acme-corp

# 2. ポリシー適用テスト
kubectl run test-pod --image=busybox -n tenant-acme-corp --rm -it -- \
  wget -qO- http://task-service.tenant-small-biz.svc.cluster.local/health

# 3. Istio設定確認
istioctl analyze -n tenant-acme-corp
kubectl get peerauthentication -A

# 4. 根本原因: NetworkPolicyはIstioのmTLSをバイパスする可能性
# 解決: AuthorizationPolicyを追加
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-other-tenants
  namespace: tenant-acme-corp
spec:
  action: DENY
  rules:
    - from:
        - source:
            notNamespaces:
              - tenant-acme-corp
              - istio-system
              - shared-services
```
</details>

### Challenge 2: RDS Proxy接続エラー

```
問題:
アプリケーションからRDS Proxyへの接続が断続的に失敗する。
IAM認証を使用しているが、認証エラーが発生。

エラーログ:
FATAL: PAM authentication failed for user "project_service"
Connection timed out after 30000ms

環境:
- EKS 1.28
- RDS Proxy (PostgreSQL)
- IRSA設定済み
```

<details>
<summary>解決のヒント</summary>

```bash
# 1. ServiceAccountのIAMロール確認
kubectl describe sa project-service-sa -n tenant-acme-corp
# Annotationsにeks.amazonaws.com/role-arnがあるか

# 2. Pod内でIAM認証テスト
kubectl exec -it deploy/project-service -n tenant-acme-corp -- bash
aws sts get-caller-identity
# 期待するロールが返されるか確認

# 3. RDS Proxy IAMポリシー確認
aws rds describe-db-proxy --db-proxy-name taskflow-proxy

# 4. 接続トークン生成テスト
aws rds generate-db-auth-token \
  --hostname taskflow-proxy.proxy-xxx.ap-northeast-1.rds.amazonaws.com \
  --port 5432 \
  --username project_service

# 5. 根本原因の可能性
# - OIDC Providerの信頼関係設定ミス
# - rds-db:connect権限のリソースARN形式が不正
# - Proxyユーザー名とDBユーザー名の不一致

# 修正例: IAMポリシーのリソースARN
{
  "Effect": "Allow",
  "Action": "rds-db:connect",
  "Resource": "arn:aws:rds-db:ap-northeast-1:ACCOUNT:dbuser:PROXY_RESOURCE_ID/project_service"
}
# PROXY_RESOURCE_IDはaws rds describe-db-proxiesで確認
```
</details>

### Challenge 3: Istio Ingress Gatewayのレイテンシ増加

```
問題:
特定の時間帯にIstio Ingress Gatewayのレイテンシが急増。
P99が2秒を超えることがある。

メトリクス:
- Envoy upstream_rq_time: 50ms (正常)
- Istio gateway total_time: 2000ms+ (異常)
- Pod CPU/Memory: 正常範囲

影響:
- 全テナントで応答遅延
- タイムアウトエラー発生
```

<details>
<summary>解決のヒント</summary>

```bash
# 1. Ingress Gateway Pod状態確認
kubectl get pods -n istio-system -l istio=ingressgateway
kubectl top pods -n istio-system

# 2. Envoyスタッツ確認
kubectl exec -it deploy/istio-ingressgateway -n istio-system -- \
  curl localhost:15000/stats | grep -E "(cx_active|rq_pending)"

# 3. HPA状態確認
kubectl get hpa -n istio-system

# 4. コネクションプール設定確認
istioctl proxy-config cluster deploy/istio-ingressgateway -n istio-system

# 5. 根本原因: Connection Pool枯渇
# 解決: DestinationRuleでコネクションプール調整

apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: gateway-pool-settings
  namespace: istio-system
spec:
  host: "*.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
        connectTimeout: 10s
      http:
        http1MaxPendingRequests: 500
        http2MaxRequests: 2000
        maxRequestsPerConnection: 100
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s

# 6. HPAのスケール設定強化
kubectl patch hpa istio-ingressgateway -n istio-system --type='merge' -p '
{
  "spec": {
    "minReplicas": 3,
    "maxReplicas": 15,
    "metrics": [
      {
        "type": "Resource",
        "resource": {
          "name": "cpu",
          "target": {
            "type": "Utilization",
            "averageUtilization": 60
          }
        }
      }
    ]
  }
}'
```
</details>

---

## 9. 設計考慮ポイント

### マルチテナント分離戦略

```yaml
分離レベルの選択肢:

1. Namespace分離（本課題で採用）:
   メリット:
     - 論理的分離でコスト効率が良い
     - Kubernetes標準機能で実現可能
     - テナント追加が容易
   デメリット:
     - 完全な分離ではない
     - ノイジーネイバー問題のリスク

   適用ケース:
     - 信頼できるテナント（B2B SaaS）
     - コスト重視の中小規模テナント

2. Cluster分離:
   メリット:
     - 完全なリソース分離
     - コンプライアンス要件に対応
   デメリット:
     - 運用コスト高
     - クラスター間連携が複雑

   適用ケース:
     - 金融・医療などの規制業種
     - 大規模エンタープライズテナント

3. ハイブリッド分離:
   メリット:
     - テナントTierに応じた柔軟な対応
     - コストとセキュリティのバランス
   デメリット:
     - 設計・運用の複雑さ

   適用ケース:
     - 多様なテナント要件（本課題）
```

### データベース分離パターン

```
1. スキーマ分離（本課題で採用）:
   ┌─────────────────────────────────────┐
   │         PostgreSQL Instance         │
   │  ┌─────────┐ ┌─────────┐ ┌───────┐ │
   │  │tenant_a │ │tenant_b │ │shared │ │
   │  │ schema  │ │ schema  │ │schema │ │
   │  └─────────┘ └─────────┘ └───────┘ │
   └─────────────────────────────────────┘

   利点: コスト効率、運用シンプル
   欠点: 同一インスタンスのリソース共有

2. データベース分離:
   ┌─────────────┐ ┌─────────────┐
   │ tenant_a_db │ │ tenant_b_db │
   │  Instance   │ │  Instance   │
   └─────────────┘ └─────────────┘

   利点: リソース分離、パフォーマンス保証
   欠点: コスト高、運用複雑

3. Row Level Security (RLS):
   すべてのテーブルにtenant_idカラム
   ポリシーでアクセス制御

   利点: 既存アプリからの移行容易
   欠点: クエリパフォーマンス影響
```

### RDS Proxyの設計考慮

```
接続管理戦略:

1. コネクションプールサイジング:
   max_connections = (テナント数 × サービス数 × レプリカ数) × 0.5

   例: 500テナント × 3サービス × 2レプリカ = 3000
   → RDS Proxyのmax_connections: 1500程度

2. IAM認証 vs パスワード認証:
   IAM認証:
     - セキュリティ高（Secrets不要）
     - 15分のトークン有効期限
     - 接続確立時のオーバーヘッド

   パスワード認証:
     - 実装シンプル
     - Secrets管理必要
     - 接続確立が高速

3. フェイルオーバー考慮:
   - RDS Proxyは自動的に新Primaryを検出
   - アプリ側での再接続処理は不要
   - ただし進行中のトランザクションは失敗
```

---

## 10. 発展課題

### 上級チャレンジ1: カナリアデプロイメント

```yaml
# canary-deployment.yaml
# テナントごとにカナリアリリースを実装

apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: project-service-canary
  namespace: tenant-acme-corp
spec:
  hosts:
    - project-service
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: project-service
            subset: canary
    - route:
        - destination:
            host: project-service
            subset: stable
          weight: 90
        - destination:
            host: project-service
            subset: canary
          weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: project-service-versions
  namespace: tenant-acme-corp
spec:
  host: project-service
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2

# Flagger（Canary自動化）
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: project-service
  namespace: tenant-acme-corp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: project-service
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

### 上級チャレンジ2: テナントオンボーディング自動化

```python
# tenant_provisioner.py
import boto3
import kubernetes
from kubernetes import client, config

class TenantProvisioner:
    def __init__(self):
        config.load_incluster_config()
        self.k8s_core = client.CoreV1Api()
        self.k8s_custom = client.CustomObjectsApi()
        self.rds = boto3.client('rds')
        self.secretsmanager = boto3.client('secretsmanager')

    def provision_tenant(self, tenant_id: str, tier: str, config: dict):
        """新規テナントのプロビジョニング"""

        # 1. Namespace作成
        self._create_namespace(tenant_id, tier)

        # 2. ResourceQuota/LimitRange設定
        self._apply_resource_limits(tenant_id, tier)

        # 3. NetworkPolicy設定
        self._apply_network_policies(tenant_id)

        # 4. DBスキーマ作成
        self._create_db_schema(tenant_id)

        # 5. IAMロール作成
        self._create_iam_role(tenant_id)

        # 6. Istio設定
        self._configure_istio(tenant_id, tier)

        # 7. 初期アプリケーションデプロイ
        self._deploy_services(tenant_id, tier)

        # 8. 監視設定
        self._setup_monitoring(tenant_id)

        return {
            "tenant_id": tenant_id,
            "namespace": f"tenant-{tenant_id}",
            "status": "provisioned",
            "endpoints": self._get_endpoints(tenant_id)
        }

    def _create_namespace(self, tenant_id: str, tier: str):
        namespace = client.V1Namespace(
            metadata=client.V1ObjectMeta(
                name=f"tenant-{tenant_id}",
                labels={
                    "istio-injection": "enabled",
                    "tenant-id": tenant_id,
                    "tier": tier
                }
            )
        )
        self.k8s_core.create_namespace(namespace)

    def _apply_resource_limits(self, tenant_id: str, tier: str):
        quotas = {
            "enterprise": {"cpu": "16", "memory": "32Gi", "pods": "100"},
            "standard": {"cpu": "4", "memory": "8Gi", "pods": "25"},
            "starter": {"cpu": "1", "memory": "2Gi", "pods": "10"}
        }

        quota = client.V1ResourceQuota(
            metadata=client.V1ObjectMeta(name="tenant-quota"),
            spec=client.V1ResourceQuotaSpec(
                hard={
                    "requests.cpu": quotas[tier]["cpu"],
                    "requests.memory": quotas[tier]["memory"],
                    "pods": quotas[tier]["pods"]
                }
            )
        )
        self.k8s_core.create_namespaced_resource_quota(
            f"tenant-{tenant_id}", quota
        )

    def _create_db_schema(self, tenant_id: str):
        # RDS接続してスキーマ作成
        import psycopg2

        conn = psycopg2.connect(
            host="taskflow-proxy.proxy-xxx.rds.amazonaws.com",
            database="taskflow",
            user="admin",
            password=self._get_db_password()
        )

        with conn.cursor() as cur:
            schema_name = f"tenant_{tenant_id.replace('-', '_')}"
            cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")

            # テナント用ユーザー作成
            cur.execute(f"""
                CREATE USER {schema_name}_user WITH PASSWORD %s;
                GRANT USAGE ON SCHEMA {schema_name} TO {schema_name}_user;
                GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA {schema_name}
                    TO {schema_name}_user;
                ALTER DEFAULT PRIVILEGES IN SCHEMA {schema_name}
                    GRANT ALL ON TABLES TO {schema_name}_user;
            """, (self._generate_password(),))

            conn.commit()

# Lambda関数としてデプロイ
def lambda_handler(event, context):
    provisioner = TenantProvisioner()

    action = event.get('action')
    tenant_id = event.get('tenant_id')
    tier = event.get('tier', 'standard')
    config = event.get('config', {})

    if action == 'provision':
        return provisioner.provision_tenant(tenant_id, tier, config)
    elif action == 'deprovision':
        return provisioner.deprovision_tenant(tenant_id)
    else:
        return {"error": "Unknown action"}
```

### 上級チャレンジ3: マルチリージョン展開

```yaml
# グローバルサービスメッシュ構成

# 東京リージョン
Region: ap-northeast-1
  EKS Cluster: taskflow-eks-tokyo
  RDS: Primary (Multi-AZ)
  Route53: Failover Primary

# バージニアリージョン
Region: us-east-1
  EKS Cluster: taskflow-eks-virginia
  RDS: Read Replica (Cross-Region)
  Route53: Failover Secondary

# Istioマルチクラスター設定
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: taskflow-mesh
      multiCluster:
        clusterName: tokyo
      network: network-tokyo

  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"

# クロスクラスタサービスディスカバリ
---
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: project-service-virginia
spec:
  hosts:
    - project-service.tenant-acme-corp.global
  location: MESH_INTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
  resolution: DNS
  endpoints:
    - address: project-service.tenant-acme-corp.svc.cluster.local
      locality: us-east-1/us-east-1a
      labels:
        cluster: virginia
```

---

## 11. コスト見積もり

### 月額コスト概算（500テナント規模）

| サービス | スペック | 月額コスト |
|----------|----------|------------|
| EKS クラスター | 1クラスター | $73 |
| EC2 (System Nodes) | m6i.large × 2 | $200 |
| EC2 (Enterprise Nodes) | m6i.xlarge × 5 | $750 |
| EC2 (Standard Nodes) | m6i.large × 10 | $1,000 |
| RDS PostgreSQL | db.r6g.large Multi-AZ | $400 |
| RDS Proxy | 2 vCPU | $73 |
| ALB | 1 ALB + LCU | $50 |
| NAT Gateway | 3 AZ × データ転送 | $150 |
| CloudWatch | ログ・メトリクス | $200 |
| ECR | イメージストレージ | $30 |
| Secrets Manager | 50シークレット | $20 |
| **合計** | | **約 $2,946/月** |

### テナント単価

```
月額コスト: $2,946
テナント数: 500
1テナントあたり: 約 $5.89/月

料金プラン例:
- Starter:  $29/月 （粗利: 80%+）
- Standard: $99/月 （粗利: 90%+）
- Enterprise: $499/月 （粗利: 95%+）
```

### コスト最適化ポイント

```
1. Spot Instances活用:
   - Standard Nodeグループの50%をSpotに
   - 想定削減: $300/月

2. Reserved Instances:
   - System/Enterprise Nodesを1年RI
   - 想定削減: $400/月

3. Cluster Autoscaler最適化:
   - 夜間/週末のスケールダウン
   - 想定削減: $200/月

4. 監視コスト最適化:
   - メトリクス保持期間短縮
   - 低頻度テナントのサンプリング
   - 想定削減: $50/月

最適化後合計: 約 $1,996/月 (32%削減)
```

---

## 12. 学習のポイント

### 今回学んだこと

```
1. EKSマルチテナント設計
   □ Namespaceによる論理分離
   □ ResourceQuota/LimitRangeでのリソース制御
   □ NetworkPolicyでのネットワーク分離
   □ ノードグループによるワークロード分離

2. Istioサービスメッシュ
   □ VirtualService/DestinationRuleによるトラフィック制御
   □ mTLSによる通信暗号化
   □ AuthorizationPolicyによるアクセス制御
   □ EnvoyFilterによるカスタムレート制限

3. RDS Proxy活用
   □ コネクションプーリングの効果
   □ IAM認証の統合
   □ フェイルオーバー時の接続維持
   □ マルチテナントでの接続効率化

4. 可観測性
   □ テナント別メトリクス収集
   □ 分散トレーシング（Jaeger）
   □ サービスメッシュ可視化（Kiali）
   □ テナント別アラート設定
```

### GCPとの比較まとめ

| 観点 | AWS (EKS + Istio) | GCP (GKE + ASM) |
|------|-------------------|-----------------|
| マネージドサービスメッシュ | 自己管理Istio | Anthos Service Mesh（マネージド） |
| DBプロキシ | RDS Proxy | Cloud SQL Proxy |
| 設定複雑さ | 高（自由度も高い） | 中（統合度高い） |
| コスト | 若干安い | 若干高い |
| 学習曲線 | 急 | 緩やか |

### 次のステップ

```
1. 本番運用に向けて:
   - DR構成（マルチリージョン）
   - バックアップ・リストア自動化
   - コスト配分タグによる請求分離

2. 発展学習:
   - Crossplane によるマルチクラウド管理
   - OPA/Gatekeeper によるポリシー管理
   - ArgoCD によるGitOps導入

3. 認定資格:
   - AWS Certified Solutions Architect - Professional
   - CKA (Certified Kubernetes Administrator)
   - CKS (Certified Kubernetes Security Specialist)
```
