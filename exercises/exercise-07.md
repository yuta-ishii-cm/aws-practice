# 課題7: 配車サービスの統合監視基盤構築

## 1. 課題分類

| 項目 | 内容 |
|------|------|
| **カテゴリ** | オブザーバビリティ・監視 |
| **難易度** | 初級〜中級（Beginner to Intermediate） |
| **所要時間** | 4-5時間 |
| **前提スキル** | AWS基礎、Linux基礎、Docker基礎 |
| **関連AWS認定** | AWS Certified DevOps Engineer、Solutions Architect Associate |

---

## 2. ビジネスシナリオ

### 企業プロファイル
- **企業名**: RideShare株式会社
- **業種**: モビリティ・配車サービス
- **規模**: 従業員200名、エンジニア40名
- **サービス規模**: 月間配車100万件、15個のマイクロサービス
- **現状インフラ**: AWS上でEKS + マイクロサービスアーキテクチャ

### 現状の課題
RideShare株式会社は、急成長する配車サービスを15個のマイクロサービスで構成しています。しかし、システムの複雑化に伴い、以下の問題が深刻化しています：

1. **障害検知の遅延**
   - ユーザーからの問い合わせで障害に気づくことが多い
   - どのサービスが原因か特定に時間がかかる
   - 夜間・休日の検知が特に遅い

2. **トラブルシュートの困難さ**
   - 分散トレーシングがなく、リクエストの流れが追えない
   - ログが各サービスに分散し、相関分析ができない
   - パフォーマンス問題のボトルネック特定が困難

3. **監視の属人化**
   - 各チームが独自の監視ツールを使用
   - アラートルールが統一されていない
   - SLI/SLO が定義されていない

### ビジネス要件
```
機能要件:
- 全マイクロサービスのメトリクス統合監視
- 分散トレーシングによるリクエスト追跡
- 統合ログ管理と検索
- SLI/SLO ダッシュボードの構築

非機能要件:
- 障害検知から通知まで1分以内
- メトリクス保持期間：15ヶ月
- ログ検索レスポンス：5秒以内
- ダッシュボードリフレッシュ：10秒間隔
```

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 平均検知時間（MTTD） | 30分 | 1分 |
| 平均復旧時間（MTTR） | 2時間 | 15分 |
| 障害原因特定時間 | 45分 | 5分 |
| SLO 達成率 | 測定なし | 99.9% |
| アラート精度（真陽性率） | 40% | 90% |

---

## 3. 学習目標

### 本課題で習得するスキル

```
1. メトリクス監視（理解度：詳細）
   - CloudWatch メトリクス・アラーム設定
   - Amazon Managed Prometheus（AMP）
   - カスタムメトリクスの設計

2. 分散トレーシング（理解度：実装）
   - AWS X-Ray によるトレース収集
   - サービスマップの活用
   - パフォーマンス分析

3. 統合ダッシュボード（理解度：実装）
   - Amazon Managed Grafana（AMG）
   - CloudWatch ダッシュボード
   - SLI/SLO 可視化

4. ログ管理（理解度：基礎）
   - CloudWatch Logs Insights
   - ログの構造化と相関付け
```

### GCPエンジニア向け補足
```
GCP → AWS マッピング:
- Cloud Monitoring → CloudWatch
- Cloud Trace → X-Ray
- Cloud Logging → CloudWatch Logs
- Google Cloud Managed Prometheus → Amazon Managed Prometheus
- (Grafana Cloud) → Amazon Managed Grafana

主な違い:
1. CloudWatch: メトリクス・ログ・トレースの統合サービス
   （GCPは3つの別サービス）

2. X-Ray: AWS サービスとの深い統合
   （Lambda, API Gateway, ECS などの自動計装）

3. AMP/AMG: オープンソース互換のマネージドサービス
   （既存の Prometheus/Grafana 資産を活用可能）

4. Container Insights: EKS/ECS の包括的な監視
   （GKE のモニタリングに相当）
```

---

## 4. 使用するAWSサービス

### メインサービス
| サービス | 役割 | 使用機能 |
|----------|------|----------|
| **Amazon CloudWatch** | メトリクス・ログ監視 | Metrics, Alarms, Logs Insights, Container Insights |
| **AWS X-Ray** | 分散トレーシング | トレース収集、サービスマップ、分析 |
| **Amazon Managed Grafana** | ダッシュボード | 可視化、アラート、データソース統合 |
| **Amazon Managed Prometheus** | メトリクス収集 | Prometheus互換メトリクス |

### サポートサービス
| サービス | 用途 |
|----------|------|
| **Amazon EKS** | マイクロサービス実行基盤 |
| **AWS Distro for OpenTelemetry** | テレメトリ収集 |
| **Amazon SNS** | アラート通知 |
| **AWS Lambda** | アラートアクション |
| **Amazon S3** | ログアーカイブ |

### アーキテクチャ図
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RideShare 統合監視基盤                              │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         Amazon EKS Cluster                               │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │   │
│  │  │  Rider    │ │  Driver   │ │  Matching │ │  Payment  │ │  Pricing  │ │   │
│  │  │  Service  │ │  Service  │ │  Service  │ │  Service  │ │  Service  │ │   │
│  │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ │   │
│  │        │             │             │             │             │       │   │
│  │        └─────────────┴──────┬──────┴─────────────┴─────────────┘       │   │
│  │                             │                                           │   │
│  │  ┌──────────────────────────┴──────────────────────────┐               │   │
│  │  │            AWS Distro for OpenTelemetry             │               │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │               │   │
│  │  │  │   Traces    │ │   Metrics   │ │    Logs     │   │               │   │
│  │  │  │  Collector  │ │  Collector  │ │  Collector  │   │               │   │
│  │  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │               │   │
│  │  └─────────┼───────────────┼───────────────┼──────────┘               │   │
│  └────────────┼───────────────┼───────────────┼──────────────────────────┘   │
│               │               │               │                               │
│               ▼               ▼               ▼                               │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                    │
│  │   AWS X-Ray    │ │    Amazon      │ │   CloudWatch   │                    │
│  │                │ │    Managed     │ │     Logs       │                    │
│  │  ┌──────────┐  │ │   Prometheus   │ │                │                    │
│  │  │ Service  │  │ │                │ │  ┌──────────┐  │                    │
│  │  │   Map    │  │ │  ┌──────────┐  │ │  │  Logs    │  │                    │
│  │  └──────────┘  │ │  │ Time     │  │ │  │ Insights │  │                    │
│  │  ┌──────────┐  │ │  │ Series   │  │ │  └──────────┘  │                    │
│  │  │ Traces   │  │ │  │   DB     │  │ │                │                    │
│  │  └──────────┘  │ │  └──────────┘  │ │                │                    │
│  └───────┬────────┘ └───────┬────────┘ └───────┬────────┘                    │
│          │                  │                  │                              │
│          └──────────────────┼──────────────────┘                              │
│                             │                                                 │
│                             ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                    Amazon Managed Grafana                             │    │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐            │    │
│  │  │  SLI/SLO       │ │  Service       │ │  Infrastructure│            │    │
│  │  │  Dashboard     │ │  Health        │ │  Dashboard     │            │    │
│  │  └────────────────┘ └────────────────┘ └────────────────┘            │    │
│  │  ┌────────────────────────────────────────────────────────┐          │    │
│  │  │                    Alert Rules                          │          │    │
│  │  │  P99 Latency > 500ms → PagerDuty                       │          │    │
│  │  │  Error Rate > 1% → Slack #incidents                    │          │    │
│  │  └────────────────────────────────────────────────────────┘          │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                             │                                                 │
│                             ▼                                                 │
│            ┌────────────────────────────────────┐                            │
│            │           Notifications            │                            │
│            │  ┌─────────┐  ┌─────────┐  ┌─────┐│                            │
│            │  │PagerDuty│  │  Slack  │  │Email││                            │
│            │  └─────────┘  └─────────┘  └─────┘│                            │
│            └────────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 前提条件と事前準備

### 必要な環境
```bash
# AWS CLI v2
aws --version  # 2.x以上

# kubectl
kubectl version --client

# Helm
helm version  # 3.x以上

# eksctl
eksctl version

# jq
jq --version
```

### AWSアカウント要件
```
- EKS クラスターが作成済み、または作成可能
- IAM 権限：EKS管理、CloudWatch管理、Prometheus管理、Grafana管理
- SSO/IAM Identity Center（Grafana認証用、オプション）
```

### 事前準備スクリプト
```bash
#!/bin/bash
# setup-observability-baseline.sh

# 変数設定
CLUSTER_NAME="rideshare-cluster"
REGION="ap-northeast-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ディレクトリ構造の作成
mkdir -p rideshare-observability/{kubernetes,grafana,alerting,sample-app}
cd rideshare-observability

# EKS クラスターの確認（存在しない場合は作成）
echo "=== Checking EKS Cluster ==="
if ! eksctl get cluster --name $CLUSTER_NAME --region $REGION 2>/dev/null; then
    echo "Creating EKS cluster..."
    cat > cluster-config.yaml << EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: ${CLUSTER_NAME}
  region: ${REGION}

managedNodeGroups:
  - name: ng-1
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 5
    iam:
      withAddonPolicies:
        cloudWatch: true
        xRay: true

cloudWatch:
  clusterLogging:
    enableTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"]

iam:
  withOIDC: true
EOF
    eksctl create cluster -f cluster-config.yaml
fi

# kubeconfig の更新
aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION

# 現在のコンテキスト確認
kubectl config current-context
kubectl get nodes
```

---

## 6. アーキテクチャ設計

### 監視設計（Three Pillars of Observability）
```yaml
# observability-design.yaml
observability:
  metrics:
    sources:
      - cloudwatch_container_insights  # インフラメトリクス
      - prometheus_scraping            # アプリケーションメトリクス
      - custom_metrics                 # ビジネスメトリクス
    storage:
      - amazon_managed_prometheus      # 長期保存（13ヶ月）
      - cloudwatch_metrics             # AWS統合メトリクス
    key_metrics:
      # RED メトリクス（サービス）
      - request_rate          # リクエストレート
      - error_rate            # エラー率
      - duration              # レイテンシ
      # USE メトリクス（リソース）
      - utilization           # CPU/Memory使用率
      - saturation            # キュー長/スレッドプール
      - errors                # リソースエラー

  traces:
    collector: aws_xray
    sampling:
      default: 0.05           # 5% サンプリング
      errors: 1.0             # エラーは100%収集
      slow_requests: 1.0      # 遅いリクエストは100%収集
    correlation:
      - trace_id → logs
      - trace_id → metrics

  logs:
    collector: fluent_bit
    storage: cloudwatch_logs
    structure:
      format: json
      fields:
        - timestamp
        - level
        - service
        - trace_id
        - span_id
        - message
        - metadata
    retention:
      hot: 7_days
      warm: 30_days
      cold: 365_days
```

### SLI/SLO 定義
```yaml
# sli-slo-definitions.yaml
services:
  rider_service:
    slis:
      availability:
        description: "サービスが正常にリクエストを処理できる割合"
        metric: "sum(rate(http_requests_total{status!~'5..'}[5m])) / sum(rate(http_requests_total[5m]))"
        unit: percentage
      latency:
        description: "リクエストのP99レイテンシ"
        metric: "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))"
        unit: seconds
      error_rate:
        description: "エラーリクエストの割合"
        metric: "sum(rate(http_requests_total{status=~'5..'}[5m])) / sum(rate(http_requests_total[5m]))"
        unit: percentage
    slos:
      availability:
        target: 99.9%
        window: 30d
        budget: 43.2min  # 月間ダウンタイム許容
      latency_p99:
        target: 500ms
        window: 30d
      error_rate:
        target: 0.1%
        window: 30d

  matching_service:
    slis:
      availability:
        metric: "..."
      latency:
        metric: "..."
      match_success_rate:
        description: "配車マッチング成功率"
        metric: "sum(rate(matching_success_total[5m])) / sum(rate(matching_attempts_total[5m]))"
    slos:
      availability:
        target: 99.95%
      latency_p99:
        target: 200ms
      match_success_rate:
        target: 95%
```

---

## 7. ハンズオン手順

### Step 1: CloudWatch Container Insights の有効化

```bash
#!/bin/bash
# step1-enable-container-insights.sh

CLUSTER_NAME="rideshare-cluster"
REGION="ap-northeast-1"

# Container Insights アドオンのインストール
echo "=== Installing CloudWatch Container Insights ==="

# Fluent Bit DaemonSet のデプロイ
FluentBitHttpPort='2020'
FluentBitReadFromHead='Off'
FluentBitReadFromTail='On'

kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluent-bit-quickstart.yaml

# CloudWatch Agent のインストール
cat > cwagent-configmap.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: cwagentconfig
  namespace: amazon-cloudwatch
data:
  cwagentconfig.json: |
    {
      "logs": {
        "metrics_collected": {
          "kubernetes": {
            "cluster_name": "rideshare-cluster",
            "metrics_collection_interval": 60
          }
        },
        "force_flush_interval": 5
      },
      "metrics": {
        "metrics_collected": {
          "kubernetes": {
            "cluster_name": "rideshare-cluster",
            "metrics_collection_interval": 60,
            "enhanced_container_insights": true
          }
        }
      }
    }
EOF

kubectl apply -f cwagent-configmap.yaml

# 確認
kubectl get pods -n amazon-cloudwatch
```

### Step 2: AWS X-Ray の設定

```bash
#!/bin/bash
# step2-setup-xray.sh

# X-Ray DaemonSet のデプロイ
cat > xray-daemonset.yaml << 'EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: xray-daemon
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/xray-daemon-role
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: xray-daemon
  namespace: default
spec:
  selector:
    matchLabels:
      app: xray-daemon
  template:
    metadata:
      labels:
        app: xray-daemon
    spec:
      serviceAccountName: xray-daemon
      containers:
      - name: xray-daemon
        image: public.ecr.aws/xray/aws-xray-daemon:latest
        ports:
        - containerPort: 2000
          protocol: UDP
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        env:
        - name: AWS_REGION
          value: ap-northeast-1
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
---
apiVersion: v1
kind: Service
metadata:
  name: xray-service
  namespace: default
spec:
  selector:
    app: xray-daemon
  ports:
  - port: 2000
    protocol: UDP
    targetPort: 2000
  type: ClusterIP
EOF

# IAM ロールの作成（IRSA）
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_PROVIDER=$(aws eks describe-cluster --name rideshare-cluster --query "cluster.identity.oidc.issuer" --output text | sed 's|https://||')

cat > xray-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:default:xray-daemon"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
    --role-name xray-daemon-role \
    --assume-role-policy-document file://xray-trust-policy.json

aws iam attach-role-policy \
    --role-name xray-daemon-role \
    --policy-arn arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess

# Account ID を置換してデプロイ
sed "s/ACCOUNT_ID/${ACCOUNT_ID}/g" xray-daemonset.yaml | kubectl apply -f -

echo "X-Ray DaemonSet deployed"
kubectl get pods -l app=xray-daemon
```

### Step 3: サンプルマイクロサービスのデプロイ

```python
# sample-app/rider_service.py
"""
RideShare Rider Service - X-Ray/OpenTelemetry 計装済み
"""
from flask import Flask, request, jsonify
import boto3
from aws_xray_sdk.core import xray_recorder, patch_all
from aws_xray_sdk.ext.flask.middleware import XRayMiddleware
import logging
import json
import time
import random
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# X-Ray の設定
xray_recorder.configure(service='rider-service')
patch_all()

app = Flask(__name__)
XRayMiddleware(app, xray_recorder)

# Prometheus メトリクス
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)
RIDE_REQUESTS = Counter(
    'ride_requests_total',
    'Total ride requests',
    ['status']
)

# 構造化ログの設定
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'service': 'rider-service',
            'message': record.getMessage(),
            'trace_id': getattr(record, 'trace_id', None),
            'span_id': getattr(record, 'span_id', None),
        }
        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_record)

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger = logging.getLogger('rider-service')
logger.addHandler(handler)
logger.setLevel(logging.INFO)

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    # メトリクスの記録
    latency = time.time() - request.start_time
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.endpoint or 'unknown',
        status=response.status_code
    ).inc()
    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=request.endpoint or 'unknown'
    ).observe(latency)

    # トレースID をログに含める
    segment = xray_recorder.current_segment()
    if segment:
        logger.info(
            f"Request completed",
            extra={
                'trace_id': segment.trace_id,
                'status_code': response.status_code,
                'latency_ms': latency * 1000
            }
        )

    return response

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

@app.route('/metrics')
def metrics():
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

@app.route('/api/v1/rides', methods=['POST'])
def request_ride():
    """配車リクエストの受付"""
    data = request.json

    # 入力検証
    if not data or 'pickup' not in data or 'dropoff' not in data:
        RIDE_REQUESTS.labels(status='invalid_request').inc()
        return jsonify({'error': 'Invalid request'}), 400

    # サブセグメントでデータベース操作を追跡
    with xray_recorder.in_subsegment('validate_rider') as subsegment:
        rider_id = data.get('rider_id')
        subsegment.put_annotation('rider_id', rider_id)
        # バリデーション処理（シミュレート）
        time.sleep(random.uniform(0.01, 0.05))

    # マッチングサービスの呼び出し
    with xray_recorder.in_subsegment('call_matching_service') as subsegment:
        try:
            # 実際にはHTTP呼び出し
            match_result = call_matching_service(data['pickup'], data['dropoff'])
            subsegment.put_metadata('match_result', match_result)
        except Exception as e:
            subsegment.add_exception(e)
            RIDE_REQUESTS.labels(status='matching_failed').inc()
            return jsonify({'error': 'Matching failed'}), 503

    RIDE_REQUESTS.labels(status='success').inc()

    return jsonify({
        'ride_id': f"ride_{int(time.time())}",
        'status': 'matched',
        'driver': match_result.get('driver'),
        'eta': match_result.get('eta')
    })

@app.route('/api/v1/rides/<ride_id>', methods=['GET'])
def get_ride_status(ride_id):
    """配車ステータスの取得"""
    with xray_recorder.in_subsegment('get_ride_status') as subsegment:
        subsegment.put_annotation('ride_id', ride_id)
        # データベース検索（シミュレート）
        time.sleep(random.uniform(0.01, 0.03))

    return jsonify({
        'ride_id': ride_id,
        'status': 'in_progress',
        'driver': {
            'name': 'Test Driver',
            'rating': 4.8
        },
        'eta_minutes': random.randint(3, 15)
    })

def call_matching_service(pickup, dropoff):
    """マッチングサービスの呼び出し（シミュレート）"""
    # 実際には内部HTTPリクエスト
    time.sleep(random.uniform(0.05, 0.2))

    # 10% の確率でエラー
    if random.random() < 0.1:
        raise Exception("Matching service unavailable")

    return {
        'driver': {
            'id': 'driver_123',
            'name': 'Test Driver',
            'rating': 4.8
        },
        'eta': random.randint(3, 10)
    }

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

```yaml
# kubernetes/rider-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rider-service
  labels:
    app: rider-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rider-service
  template:
    metadata:
      labels:
        app: rider-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: rider-service
      containers:
      - name: rider-service
        image: rideshare/rider-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: AWS_XRAY_DAEMON_ADDRESS
          value: "xray-service.default:2000"
        - name: AWS_REGION
          value: "ap-northeast-1"
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: rider-service
spec:
  selector:
    app: rider-service
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

### Step 4: Amazon Managed Prometheus のセットアップ

```bash
#!/bin/bash
# step4-setup-amp.sh

CLUSTER_NAME="rideshare-cluster"
REGION="ap-northeast-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# AMP ワークスペースの作成
echo "=== Creating AMP Workspace ==="
WORKSPACE_ID=$(aws amp create-workspace \
    --alias rideshare-metrics \
    --query 'workspaceId' \
    --output text \
    --region $REGION)

echo "Workspace ID: $WORKSPACE_ID"

# ワークスペースのエンドポイント取得
WORKSPACE_ENDPOINT=$(aws amp describe-workspace \
    --workspace-id $WORKSPACE_ID \
    --query 'workspace.prometheusEndpoint' \
    --output text \
    --region $REGION)

echo "Workspace Endpoint: $WORKSPACE_ENDPOINT"

# IRSA 用の IAM ロール作成
OIDC_PROVIDER=$(aws eks describe-cluster \
    --name $CLUSTER_NAME \
    --query "cluster.identity.oidc.issuer" \
    --output text | sed 's|https://||')

cat > amp-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:prometheus:prometheus-server"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
    --role-name amp-prometheus-role \
    --assume-role-policy-document file://amp-trust-policy.json

aws iam attach-role-policy \
    --role-name amp-prometheus-role \
    --policy-arn arn:aws:iam::aws:policy/AmazonPrometheusRemoteWriteAccess

# Prometheus のインストール（Helm）
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Prometheus の values ファイル作成
cat > prometheus-values.yaml << EOF
serviceAccounts:
  server:
    name: prometheus-server
    annotations:
      eks.amazonaws.com/role-arn: arn:aws:iam::${ACCOUNT_ID}:role/amp-prometheus-role

server:
  remoteWrite:
    - url: ${WORKSPACE_ENDPOINT}api/v1/remote_write
      sigv4:
        region: ${REGION}
      queue_config:
        max_samples_per_send: 1000
        max_shards: 200
        capacity: 2500

  persistentVolume:
    enabled: true
    size: 50Gi

  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

alertmanager:
  enabled: false  # Grafana のアラートを使用

nodeExporter:
  enabled: true

kubeStateMetrics:
  enabled: true
EOF

# namespace 作成と Prometheus インストール
kubectl create namespace prometheus
helm install prometheus prometheus-community/prometheus \
    --namespace prometheus \
    -f prometheus-values.yaml

echo "Prometheus installed and configured to write to AMP"
kubectl get pods -n prometheus
```

### Step 5: Amazon Managed Grafana のセットアップ

```bash
#!/bin/bash
# step5-setup-amg.sh

REGION="ap-northeast-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# AMG ワークスペースの作成
echo "=== Creating AMG Workspace ==="

# SSO が有効な場合
WORKSPACE_ID=$(aws grafana create-workspace \
    --account-access-type CURRENT_ACCOUNT \
    --authentication-providers AWS_SSO \
    --permission-type SERVICE_MANAGED \
    --workspace-name rideshare-dashboard \
    --workspace-description "RideShare observability dashboard" \
    --workspace-data-sources CLOUDWATCH PROMETHEUS XRAY \
    --query 'workspace.id' \
    --output text \
    --region $REGION)

# SSO が無効な場合は SAML を使用
# aws grafana create-workspace \
#     --authentication-providers SAML \
#     ...

echo "AMG Workspace ID: $WORKSPACE_ID"

# ワークスペースの準備完了を待機
echo "Waiting for workspace to be ready..."
aws grafana wait workspace-active \
    --workspace-id $WORKSPACE_ID \
    --region $REGION

# ワークスペースの詳細取得
WORKSPACE_ENDPOINT=$(aws grafana describe-workspace \
    --workspace-id $WORKSPACE_ID \
    --query 'workspace.endpoint' \
    --output text \
    --region $REGION)

echo "Grafana Endpoint: https://${WORKSPACE_ENDPOINT}"

# データソースの設定用 IAM ロール作成
cat > grafana-datasource-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudwatch:DescribeAlarmsForMetric",
                "cloudwatch:DescribeAlarmHistory",
                "cloudwatch:DescribeAlarms",
                "cloudwatch:ListMetrics",
                "cloudwatch:GetMetricStatistics",
                "cloudwatch:GetMetricData",
                "logs:DescribeLogGroups",
                "logs:GetLogGroupFields",
                "logs:StartQuery",
                "logs:StopQuery",
                "logs:GetQueryResults",
                "logs:GetLogEvents"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "aps:QueryMetrics",
                "aps:GetLabels",
                "aps:GetSeries",
                "aps:GetMetricMetadata"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "xray:BatchGetTraces",
                "xray:GetTraceSummaries",
                "xray:GetServiceGraph",
                "xray:GetTraceGraph",
                "xray:GetGroups",
                "xray:GetInsightSummaries"
            ],
            "Resource": "*"
        }
    ]
}
EOF

aws iam create-policy \
    --policy-name GrafanaDataSourcePolicy \
    --policy-document file://grafana-datasource-policy.json

# Grafana ワークスペースにデータソースロールを関連付け
aws grafana update-workspace \
    --workspace-id $WORKSPACE_ID \
    --workspace-role-arn arn:aws:iam::${ACCOUNT_ID}:role/GrafanaWorkspaceRole \
    --region $REGION

echo "AMG Workspace configured"
echo "Access Grafana at: https://${WORKSPACE_ENDPOINT}"
```

### Step 6: Grafana ダッシュボードの作成

```json
{
  "dashboard": {
    "title": "RideShare Service Health",
    "tags": ["rideshare", "sli", "slo"],
    "timezone": "Asia/Tokyo",
    "refresh": "10s",
    "panels": [
      {
        "title": "Service Availability (SLI)",
        "type": "gauge",
        "gridPos": { "h": 8, "w": 6, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status!~'5..'}[5m])) / sum(rate(http_requests_total[5m])) * 100",
            "legendFormat": "Availability %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": null },
                { "color": "orange", "value": 99 },
                { "color": "green", "value": 99.9 }
              ]
            },
            "min": 95,
            "max": 100,
            "unit": "percent"
          }
        }
      },
      {
        "title": "P99 Latency (SLI)",
        "type": "gauge",
        "gridPos": { "h": 8, "w": 6, "x": 6, "y": 0 },
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000",
            "legendFormat": "P99 Latency (ms)"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "orange", "value": 300 },
                { "color": "red", "value": 500 }
              ]
            },
            "min": 0,
            "max": 1000,
            "unit": "ms"
          }
        }
      },
      {
        "title": "Error Budget Remaining",
        "type": "gauge",
        "gridPos": { "h": 8, "w": 6, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "(1 - ((1 - (sum(rate(http_requests_total{status!~'5..'}[30d])) / sum(rate(http_requests_total[30d])))) / (1 - 0.999))) * 100",
            "legendFormat": "Error Budget %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": null },
                { "color": "orange", "value": 25 },
                { "color": "green", "value": 50 }
              ]
            },
            "min": 0,
            "max": 100,
            "unit": "percent"
          }
        }
      },
      {
        "title": "Request Rate by Service",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[1m])) by (service)",
            "legendFormat": "{{service}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps"
          }
        }
      },
      {
        "title": "Error Rate by Service",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~'5..'}[1m])) by (service) / sum(rate(http_requests_total[1m])) by (service) * 100",
            "legendFormat": "{{service}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "orange", "value": 0.5 },
                { "color": "red", "value": 1 }
              ]
            }
          }
        }
      },
      {
        "title": "Latency Distribution",
        "type": "heatmap",
        "gridPos": { "h": 8, "w": 24, "x": 0, "y": 16 },
        "targets": [
          {
            "expr": "sum(rate(http_request_duration_seconds_bucket[1m])) by (le)",
            "format": "heatmap"
          }
        ]
      },
      {
        "title": "Active Rides",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 18, "y": 0 },
        "targets": [
          {
            "expr": "sum(ride_active_total)",
            "legendFormat": "Active Rides"
          }
        ]
      }
    ]
  }
}
```

### Step 7: アラートルールの設定

```yaml
# alerting/alert-rules.yaml
apiVersion: 1
groups:
  - name: rideshare-slo-alerts
    folder: SLO Alerts
    interval: 1m
    rules:
      - uid: availability-slo-breach
        title: "Availability SLO Breach"
        condition: C
        data:
          - refId: A
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: prometheus
            model:
              expr: |
                sum(rate(http_requests_total{status!~'5..'}[5m]))
                / sum(rate(http_requests_total[5m])) * 100
              intervalMs: 1000
              maxDataPoints: 43200
          - refId: B
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: __expr__
            model:
              conditions:
                - evaluator:
                    params: [99.9]
                    type: lt
                  operator:
                    type: and
                  query:
                    params: [A]
                  reducer:
                    type: last
              refId: B
              type: classic_conditions
        for: 2m
        annotations:
          summary: "Service availability dropped below SLO target"
          description: "Current availability: {{ $values.A }}%, Target: 99.9%"
        labels:
          severity: critical
          service: all

      - uid: latency-slo-breach
        title: "P99 Latency SLO Breach"
        condition: C
        data:
          - refId: A
            datasourceUid: prometheus
            model:
              expr: |
                histogram_quantile(0.99,
                  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
                ) * 1000
          - refId: B
            datasourceUid: __expr__
            model:
              conditions:
                - evaluator:
                    params: [500]
                    type: gt
                  operator:
                    type: and
                  query:
                    params: [A]
                  reducer:
                    type: last
              type: classic_conditions
        for: 5m
        annotations:
          summary: "P99 latency exceeded SLO target"
          description: "Current P99: {{ $values.A }}ms, Target: 500ms"
        labels:
          severity: warning
          service: all

      - uid: error-budget-burn-rate
        title: "Error Budget Burn Rate High"
        condition: C
        data:
          - refId: A
            datasourceUid: prometheus
            model:
              expr: |
                (
                  sum(rate(http_requests_total{status=~'5..'}[1h]))
                  / sum(rate(http_requests_total[1h]))
                ) / 0.001 * 720
          - refId: B
            datasourceUid: __expr__
            model:
              conditions:
                - evaluator:
                    params: [14.4]
                    type: gt
                  operator:
                    type: and
                  query:
                    params: [A]
                  reducer:
                    type: last
              type: classic_conditions
        for: 5m
        annotations:
          summary: "Error budget burning too fast"
          description: |
            Burn rate: {{ $values.A }}x
            At this rate, error budget will be exhausted in {{ printf "%.1f" (div 720 $values.A) }} hours
        labels:
          severity: warning
          service: all

  - name: rideshare-infrastructure-alerts
    folder: Infrastructure Alerts
    interval: 1m
    rules:
      - uid: pod-restart-loop
        title: "Pod Restart Loop Detected"
        condition: C
        data:
          - refId: A
            datasourceUid: prometheus
            model:
              expr: |
                increase(kube_pod_container_status_restarts_total[15m]) > 3
        for: 5m
        annotations:
          summary: "Pod is in restart loop"
          description: "Pod {{ $labels.pod }} has restarted {{ $values.A }} times in 15 minutes"
        labels:
          severity: warning

      - uid: high-memory-usage
        title: "High Memory Usage"
        condition: C
        data:
          - refId: A
            datasourceUid: prometheus
            model:
              expr: |
                (container_memory_usage_bytes / container_spec_memory_limit_bytes) * 100 > 85
        for: 10m
        annotations:
          summary: "Container memory usage is high"
          description: "Container {{ $labels.container }} memory usage: {{ $values.A }}%"
        labels:
          severity: warning
```

```yaml
# alerting/notification-policies.yaml
apiVersion: 1
policies:
  - orgId: 1
    receiver: default-receiver
    group_by:
      - alertname
      - severity
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
    routes:
      - receiver: pagerduty-critical
        matchers:
          - severity = critical
        continue: true
      - receiver: slack-warnings
        matchers:
          - severity = warning
        continue: true
      - receiver: slack-incidents
        matchers:
          - alertname =~ ".*SLO.*"

contactPoints:
  - orgId: 1
    name: pagerduty-critical
    receivers:
      - uid: pagerduty
        type: pagerduty
        settings:
          integrationKey: "${PAGERDUTY_INTEGRATION_KEY}"
          severity: critical
          class: infrastructure

  - orgId: 1
    name: slack-warnings
    receivers:
      - uid: slack-warnings
        type: slack
        settings:
          url: "${SLACK_WEBHOOK_URL}"
          recipient: "#alerts-warning"
          title: |
            {{ if eq .Status "firing" }}:warning: ALERT{{ else }}:white_check_mark: RESOLVED{{ end }}
          text: |
            {{ range .Alerts }}
            *{{ .Labels.alertname }}*
            {{ .Annotations.summary }}
            {{ .Annotations.description }}
            {{ end }}

  - orgId: 1
    name: slack-incidents
    receivers:
      - uid: slack-incidents
        type: slack
        settings:
          url: "${SLACK_WEBHOOK_URL}"
          recipient: "#incidents"
          title: |
            {{ if eq .Status "firing" }}:rotating_light: SLO BREACH{{ else }}:white_check_mark: SLO RECOVERED{{ end }}
```

### Step 8: CloudWatch Logs Insights クエリ

```sql
-- logs-insights/error-analysis.sql
-- エラーログの分析

-- 1. サービス別エラー数（過去1時間）
fields @timestamp, @message, service, level
| filter level = "ERROR"
| stats count(*) as error_count by service
| sort error_count desc
| limit 10

-- 2. エラーメッセージのパターン分析
fields @timestamp, @message
| filter level = "ERROR"
| parse @message /(?<error_type>\w+Error): (?<error_message>.*)/
| stats count(*) as count by error_type, error_message
| sort count desc
| limit 20

-- 3. トレースID でのログ追跡
fields @timestamp, service, level, message, trace_id
| filter trace_id = "1-xxxxx-xxxxx"
| sort @timestamp asc

-- 4. レイテンシ異常の検出
fields @timestamp, service, latency_ms
| filter latency_ms > 1000
| stats count(*) as slow_requests,
        avg(latency_ms) as avg_latency,
        max(latency_ms) as max_latency
  by service
| sort slow_requests desc

-- 5. 5xx エラーの時系列分析
fields @timestamp, service, status_code
| filter status_code >= 500
| stats count(*) as error_count by bin(5m), service
| sort @timestamp desc
```

---

## 8. トラブルシューティング課題

### 課題1: Prometheus メトリクスが AMP に書き込まれない

**症状**:
```
Grafana で AMP をデータソースとして設定したが、
メトリクスが表示されない。Prometheus Pod のログには
"remote_write" 関連のエラーが出ている。
```

**調査コマンド**:
```bash
# Prometheus Pod のログ確認
kubectl logs -n prometheus deployment/prometheus-server | grep -i "remote"

# Service Account の確認
kubectl get sa prometheus-server -n prometheus -o yaml

# IAM ロールの確認
aws iam get-role --role-name amp-prometheus-role
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: IRSA（IAM Roles for Service Accounts）の設定が正しくない

**解決手順**:
```bash
# 1. OIDC プロバイダーの確認
aws eks describe-cluster --name rideshare-cluster \
    --query "cluster.identity.oidc.issuer" --output text

# 2. OIDC プロバイダーが IAM に登録されているか確認
aws iam list-open-id-connect-providers

# 3. OIDC プロバイダーが未登録の場合、登録
eksctl utils associate-iam-oidc-provider \
    --cluster rideshare-cluster \
    --approve

# 4. Service Account のアノテーション確認
kubectl get sa prometheus-server -n prometheus -o yaml | grep -A 5 annotations

# 5. アノテーションが不足している場合、更新
kubectl annotate sa prometheus-server -n prometheus \
    eks.amazonaws.com/role-arn=arn:aws:iam::ACCOUNT_ID:role/amp-prometheus-role \
    --overwrite

# 6. Prometheus Pod を再起動
kubectl rollout restart deployment prometheus-server -n prometheus

# 7. Pod が新しい認証情報を取得したか確認
kubectl exec -n prometheus deployment/prometheus-server -- \
    cat /var/run/secrets/eks.amazonaws.com/serviceaccount/token | cut -d '.' -f 2 | base64 -d
```

**追加確認事項**:
- IAM ロールの信頼ポリシーで OIDC の subject が正しいか
- AMP ワークスペースが正しいリージョンにあるか
- remote_write の URL が正しいか
</details>

### 課題2: X-Ray トレースが表示されない

**症状**:
```
アプリケーションで X-Ray SDK を使用しているが、
X-Ray コンソールにトレースが表示されない。
サービスマップも空のまま。
```

**調査コマンド**:
```bash
# X-Ray Daemon Pod の状態確認
kubectl get pods -l app=xray-daemon

# X-Ray Daemon のログ確認
kubectl logs daemonset/xray-daemon

# アプリケーション Pod からの接続確認
kubectl exec -it deployment/rider-service -- \
    nc -vz xray-service.default 2000
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: 複数の原因が考えられる

**パターン1: X-Ray Daemon への接続失敗**
```bash
# アプリケーションの環境変数確認
kubectl get deployment rider-service -o yaml | grep -A 5 AWS_XRAY

# 環境変数が設定されていない場合
kubectl set env deployment/rider-service \
    AWS_XRAY_DAEMON_ADDRESS=xray-service.default:2000
```

**パターン2: IAM 権限不足**
```bash
# Service Account の IAM ロール確認
kubectl get sa xray-daemon -o yaml

# 必要な権限があるか確認
aws iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::ACCOUNT_ID:role/xray-daemon-role \
    --action-names xray:PutTraceSegments xray:PutTelemetryRecords
```

**パターン3: サンプリングルールの問題**
```bash
# デフォルトサンプリングルールの確認
aws xray get-sampling-rules

# サンプリングレートが低すぎる場合、調整
aws xray update-sampling-rule --sampling-rule-update '{
    "RuleName": "Default",
    "FixedRate": 0.1,
    "ReservoirSize": 10
}'
```

**パターン4: アプリケーションコードの問題**
```python
# X-Ray SDK の初期化を確認
from aws_xray_sdk.core import xray_recorder

# 明示的にサービス名を設定
xray_recorder.configure(
    service='rider-service',
    sampling=False,  # デバッグ時は全トレース収集
    daemon_address='xray-service.default:2000'
)
```
</details>

### 課題3: Grafana アラートが発火しない

**症状**:
```
SLO 違反が発生しているはずなのに、Grafana のアラートが
発火しない。ダッシュボードではメトリクスが正常に表示されている。
```

**調査手順**:
```bash
# Grafana のアラート状態確認（API経由）
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
    "https://your-grafana.grafana.net/api/v1/alerts"

# アラートルールの確認
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
    "https://your-grafana.grafana.net/api/v1/provisioning/alert-rules"
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: アラートルールの評価設定の問題

**確認・解決手順**:

1. **アラートルールの `for` 期間を確認**
```yaml
# for が長すぎる場合、アラートが発火しにくい
for: 2m  # 2分間継続して条件を満たす必要がある
```

2. **データソースの設定確認**
```yaml
# データソース UID が正しいか確認
datasourceUid: prometheus  # 実際のデータソース UID と一致しているか
```

3. **評価間隔の確認**
```yaml
# interval が長すぎるとアラートの遅延が発生
interval: 1m  # 1分間隔で評価
```

4. **クエリの検証**
```bash
# Grafana の Explore で直接クエリを実行して結果を確認
# アラート条件と同じクエリを実行
sum(rate(http_requests_total{status!~'5..'}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

5. **通知チャネルの確認**
```yaml
# Contact Point が正しく設定されているか
# Slack/PagerDuty の Webhook URL が有効か
```

6. **Grafana Alerting のデバッグログ有効化**
```bash
# AMG ではログレベルの変更はサポートされていないため、
# CloudWatch Logs で Grafana のログを確認
aws logs filter-log-events \
    --log-group-name "/aws/grafana/rideshare-dashboard" \
    --filter-pattern "alert"
```
</details>

---

## 9. 設計課題

### 設計課題: 大規模マイクロサービスのオブザーバビリティ戦略

**シナリオ**:
RideShare社は事業拡大に伴い、マイクロサービスが15個から50個に増加する計画です。
以下の要件を満たすオブザーバビリティ戦略を設計してください。

**要件**:
```
1. サービス規模
   - マイクロサービス：50個
   - 月間リクエスト：10億件
   - 開発チーム：15チーム

2. 機能要件
   - 全サービスの統合監視
   - チーム単位でのダッシュボード分離
   - サービス間依存関係の可視化
   - カスタムビジネスメトリクス対応

3. 非機能要件
   - メトリクス保持：13ヶ月（コンプライアンス要件）
   - ログ検索：リアルタイム〜30日前
   - アラート遅延：1分以内
   - コスト効率：現状の2倍以内
```

**設計すべき項目**:
```
1. メトリクス収集・保存戦略
2. トレーシング戦略（サンプリング設計）
3. ログ管理戦略（保持・検索）
4. ダッシュボード・アラート設計
5. チーム間の責任分界
```

<details>
<summary>設計例を見る</summary>

### 大規模オブザーバビリティアーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         RideShare 大規模オブザーバビリティ基盤                           │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              データ収集層                                         │   │
│  │                                                                                   │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │   │
│  │   │ Rider Team  │  │ Driver Team │  │Payment Team │  │ ...x15      │            │   │
│  │   │ Services    │  │ Services    │  │ Services    │  │  Teams      │            │   │
│  │   │ (5 svcs)    │  │ (4 svcs)    │  │ (3 svcs)    │  │             │            │   │
│  │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │   │
│  │          │                │                │                │                    │   │
│  │          └────────────────┴────────────────┴────────────────┘                    │   │
│  │                                    │                                              │   │
│  │                    ┌───────────────┴───────────────┐                              │   │
│  │                    │   OpenTelemetry Collector     │                              │   │
│  │                    │   (Gateway Pattern)           │                              │   │
│  │                    │   ┌─────────┐ ┌─────────┐    │                              │   │
│  │                    │   │Sampling │ │Filtering│    │                              │   │
│  │                    │   │Processor│ │Processor│    │                              │   │
│  │                    │   └─────────┘ └─────────┘    │                              │   │
│  │                    └───────────────┬───────────────┘                              │   │
│  └────────────────────────────────────┼──────────────────────────────────────────────┘   │
│                                       │                                                  │
│  ┌────────────────────────────────────┼──────────────────────────────────────────────┐   │
│  │                              データ保存層                                          │   │
│  │                                    │                                              │   │
│  │      ┌─────────────────────────────┼─────────────────────────────┐                │   │
│  │      │                             │                             │                │   │
│  │      ▼                             ▼                             ▼                │   │
│  │ ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │   │
│  │ │    X-Ray     │          │     AMP      │          │  CloudWatch  │             │   │
│  │ │   Traces     │          │   Metrics    │          │    Logs      │             │   │
│  │ │              │          │              │          │              │             │   │
│  │ │ Sampling:    │          │ Retention:   │          │ Hot: 7d      │             │   │
│  │ │ - Head: 5%   │          │ 13 months    │          │ Warm: 30d    │             │   │
│  │ │ - Tail: 100% │          │              │          │ Cold: 365d   │             │   │
│  │ │   (errors)   │          │ Cardinality: │          │ (S3 export)  │             │   │
│  │ └──────────────┘          │ <100K series │          └──────────────┘             │   │
│  │                           └──────────────┘                                        │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              可視化・アラート層                                     │   │
│  │                                                                                   │   │
│  │   ┌─────────────────────────────────────────────────────────────────────────┐    │   │
│  │   │                    Amazon Managed Grafana                                │    │   │
│  │   │                                                                          │    │   │
│  │   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │    │   │
│  │   │  │ Platform     │  │ Team         │  │ Business     │                   │    │   │
│  │   │  │ Overview     │  │ Dashboards   │  │ Metrics      │                   │    │   │
│  │   │  │ (SRE)        │  │ (15 folders) │  │ (Product)    │                   │    │   │
│  │   │  └──────────────┘  └──────────────┘  └──────────────┘                   │    │   │
│  │   │                                                                          │    │   │
│  │   │  Alert Routing:                                                          │    │   │
│  │   │  ┌─────────────────────────────────────────────────────────────────┐    │    │   │
│  │   │  │ Critical → PagerDuty (On-call SRE)                              │    │    │   │
│  │   │  │ High     → PagerDuty (Team On-call) + Slack (#team-alerts)      │    │    │   │
│  │   │  │ Warning  → Slack (#team-alerts)                                  │    │    │   │
│  │   │  │ Info     → Slack (#observability-digest)                         │    │    │   │
│  │   │  └─────────────────────────────────────────────────────────────────┘    │    │   │
│  │   └─────────────────────────────────────────────────────────────────────────┘    │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. メトリクス収集・保存戦略

```yaml
metrics_strategy:
  collection:
    method: pull  # Prometheus スタイル
    interval: 15s
    timeout: 10s

  labeling_guidelines:
    required_labels:
      - service    # サービス名
      - team       # 担当チーム
      - env        # 環境
    cardinality_control:
      # 高カーディナリティラベルの制限
      forbidden_labels:
        - user_id
        - request_id
        - trace_id
      max_label_values: 1000

  storage:
    primary: amazon_managed_prometheus
    retention: 13_months
    estimated_series: 80000  # 50サービス × 1600シリーズ/サービス

  aggregation:
    # 長期保存用に集約
    raw_retention: 15_days
    5m_aggregation: 90_days
    1h_aggregation: 13_months
```

### 2. トレーシング戦略

```yaml
tracing_strategy:
  sampling:
    head_based:
      default_rate: 0.05  # 5%
      rules:
        - service: payment-*
          rate: 0.1  # 決済は10%
        - service: matching-*
          rate: 0.1  # マッチングは10%

    tail_based:
      enabled: true
      policies:
        - type: always_sample
          conditions:
            - status_code >= 500
            - latency > 2s
        - type: probabilistic
          rate: 0.5
          conditions:
            - latency > 500ms

  storage:
    service: aws_xray
    retention: 30_days
    groups:
      - name: errors
        filter: "fault = true"
      - name: slow_requests
        filter: "responsetime > 1"

  service_map:
    refresh_interval: 1m
    depth: 5  # 依存関係の深さ
```

### 3. ログ管理戦略

```yaml
log_strategy:
  structure:
    format: json
    required_fields:
      - timestamp
      - level
      - service
      - team
      - trace_id
      - message
    optional_fields:
      - user_id  # マスキング必須
      - request_path

  storage:
    primary: cloudwatch_logs
    log_groups:
      pattern: /rideshare/{team}/{service}
    retention_policy:
      hot: 7_days     # CloudWatch Logs
      warm: 30_days   # CloudWatch Logs (Infrequent Access)
      cold: 365_days  # S3 Glacier

  export:
    destination: s3
    format: parquet  # Athena でクエリ可能
    schedule: daily
    bucket: rideshare-logs-archive

  search:
    tool: cloudwatch_logs_insights
    max_scan_range: 30_days
    query_timeout: 30s
```

### 4. チーム責任分界

```yaml
responsibility_matrix:
  platform_sre:
    owns:
      - 全体 SLO ダッシュボード
      - インフラメトリクス
      - 共通アラートルール
      - オンコールエスカレーション
    maintains:
      - AMP/AMG インフラ
      - OpenTelemetry Collector
      - 共通ライブラリ

  application_teams:
    owns:
      - チームダッシュボード
      - サービス固有アラート
      - ビジネスメトリクス定義
      - トラブルシューティング
    maintains:
      - アプリケーション計装
      - ログ出力

  access_control:
    grafana:
      - role: Viewer (全社員)
      - role: Editor (チームメンバー) - チームフォルダのみ
      - role: Admin (SRE)
```

### 推定コスト

| サービス | 使用量 | 月額コスト |
|----------|--------|-----------|
| AMP | 80K series, 13M samples/month | $800 |
| AMG | 1 workspace, 50 users | $250 |
| CloudWatch Logs | 500GB/month | $250 |
| CloudWatch Metrics | Container Insights | $150 |
| X-Ray | 10M traces/month | $50 |
| S3 (ログアーカイブ) | 1TB | $25 |
| **合計** | | **$1,525/月** |

</details>

---

## 10. 発展課題

### 発展課題1: OpenTelemetry への移行（難易度：中級）

**課題内容**:
現在の X-Ray SDK から OpenTelemetry に移行し、ベンダーロックインを回避しつつ
同等以上のオブザーバビリティを実現してください。

**要件**:
- 既存の X-Ray トレースとの互換性維持
- メトリクス・ログ・トレースの統合収集
- Kubernetes 環境での自動計装

```yaml
# ヒント: AWS Distro for OpenTelemetry の設定
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: adot-collector
spec:
  mode: deployment
  config: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 1s
        send_batch_size: 50

    exporters:
      awsxray:
        region: ap-northeast-1
      awsprometheusremotewrite:
        endpoint: https://aps-workspaces.ap-northeast-1.amazonaws.com/...
      awscloudwatchlogs:
        log_group_name: /rideshare/otel

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [awsxray]
        metrics:
          receivers: [otlp]
          processors: [batch]
          exporters: [awsprometheusremotewrite]
```

### 発展課題2: AIOps の導入（難易度：上級）

**課題内容**:
Amazon DevOps Guru を導入し、ML ベースの異常検知と
インシデント予測を実現してください。

**要件**:
- CloudWatch メトリクスの異常検知
- インシデントの自動分類と優先度付け
- 推奨アクションの自動生成

### 発展課題3: カオスエンジニアリング統合（難易度：上級）

**課題内容**:
AWS Fault Injection Simulator を使用して、
オブザーバビリティ基盤の有効性を検証するカオス実験を設計・実行してください。

**要件**:
- サービス障害時の検知時間測定
- アラート精度の検証
- ダッシュボードの有用性評価

---

## 11. 振り返りと次のステップ

### 学習のまとめ

```
本課題で学んだこと:
□ CloudWatch Container Insights による EKS 監視
□ AWS X-Ray による分散トレーシング
□ Amazon Managed Prometheus/Grafana の設定
□ SLI/SLO の設計と可視化
□ アラート設計のベストプラクティス
□ 構造化ログと相関分析

GCP との主な違い:
- CloudWatch は統合サービス（メトリクス・ログ・トレース）
- X-Ray は AWS サービスとの深い統合
- AMP/AMG はオープンソース互換のマネージドサービス
- Container Insights は EKS 専用の包括的監視
```

### GCP経験者向けポイント

| 観点 | GCP | AWS | 移行時の注意 |
|------|-----|-----|-------------|
| メトリクス監視 | Cloud Monitoring | CloudWatch Metrics | メトリクス名・ラベル命名規則が異なる |
| 分散トレーシング | Cloud Trace | X-Ray | トレースフォーマットが異なる（W3C vs X-Ray） |
| ログ管理 | Cloud Logging | CloudWatch Logs | クエリ言語が異なる（LogQL vs Insights） |
| Prometheus | Managed Prometheus | AMP | ほぼ同等、remote_write 設定のみ異なる |
| Grafana | (Grafana Cloud) | AMG | データソース設定が異なる |

### 推奨される次のステップ

```
1. AWS Certified DevOps Engineer の学習
   - オブザーバビリティの深い理解
   - CI/CD との統合

2. OpenTelemetry の習得
   - ベンダー中立なテレメトリ
   - 将来性のある技術スタック

3. SRE プラクティスの導入
   - SLO ベースのアラート設計
   - エラーバジェットの運用

4. 関連課題への挑戦
   - 課題27: セキュリティ監視
   - 課題29: コスト最適化
```

---

## 12. 推定コストと注意事項

### 本課題の推定コスト

| サービス | 使用量 | 推定コスト（演習時） |
|----------|--------|---------------------|
| EKS | 1クラスター、3ノード | $75 |
| CloudWatch | Container Insights | $5-10 |
| X-Ray | 10万トレース | $5 |
| AMP | 1万シリーズ | $5-10 |
| AMG | 1ワークスペース | $9 |
| **合計** | | **$100-110** |

### コスト最適化のヒント

```
1. EKS のコスト削減
   - Spot インスタンスの活用
   - 演習後はクラスター削除

2. CloudWatch のコスト削減
   - 不要なメトリクスの除外
   - ログ保持期間の短縮

3. X-Ray のコスト削減
   - サンプリングレートの調整
   - 不要なサービスの除外

4. AMP のコスト削減
   - カーディナリティの管理
   - 不要なメトリクスの除外
```

### 注意事項

```
⚠️ EKS クラスター
- クラスターは課金が継続するため、演習後は削除を推奨
- eksctl delete cluster コマンドで削除可能

⚠️ マネージドサービス
- AMP/AMG は有効化すると課金開始
- 使用しない場合はワークスペースを削除

⚠️ データ保持
- 本番環境でのログ・メトリクス保持期間は要件に応じて設定
- コンプライアンス要件がある場合は適切な保持期間を設定
```

---

**課題作成日**: 2024年1月
**最終更新日**: 2024年1月
**作成者**: AWS学習プログラム
