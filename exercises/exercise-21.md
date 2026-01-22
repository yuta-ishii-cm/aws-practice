# 課題21: グローバルWebサービスのDDoS対策

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | セキュリティ |
| 処理タイプ | リアルタイム |
| 使用IaC | CloudFormation |
| 想定所要時間 | 4-5時間 |

---

## 2. シナリオ

### 企業プロファイル

| 項目 | 内容 |
|------|------|
| **企業名** | 〇〇株式会社 |
| **業種** | グローバルSNS |
| **従業員数** | 200名（エンジニア60名） |
| **月間UU** | 500万人（グローバル） |
| **リージョン** | 日本、US、EU |
| **可用性目標** | 99.99% |

### 現状の課題

```
〇〇株式会社はグローバル展開するSNSサービスを運営しています。
サービス可用性において以下の課題を抱えています：

1. DDoS攻撃の増加
   - 月に2-3回のDDoS攻撃を受けている
   - 攻撃時にサービスが数時間停止
   - 競合他社からの攻撃が疑われるケースも

2. レイテンシの問題
   - 海外ユーザーからのレスポンスが遅い
   - 日本リージョンへの直接アクセス
   - CDN未導入

3. セキュリティ対策の不足
   - WAFが未導入
   - ボットアクセスの増加
   - 不正アカウント作成の多発

4. 運用負荷
   - 攻撃時の手動対応
   - 24/365の監視体制がない
   - インシデント対応に時間がかかる
```

### ビジネス目標

| KPI | 現状 | 目標 |
|-----|------|------|
| 可用性 | 99.5% | 99.99% |
| DDoS攻撃時のダウンタイム | 2-3時間 | 0分 |
| グローバルレイテンシ（P50） | 500ms | 100ms |
| ボットトラフィック率 | 30% | 5%以下 |
| 攻撃検知時間 | 30分 | 即時 |

---

## 3. 達成目標（ゴール）

### 主要な学習成果

```
この課題を完了すると、以下ができるようになります：

1. Amazon CloudFrontによるグローバル配信
   - エッジロケーションの活用
   - キャッシュ戦略の設計
   - オリジン保護

2. AWS Shieldによる DDoS 保護
   - Shield Standard の自動保護
   - Shield Advanced の高度な保護
   - DDoS Response Team (DRT) との連携

3. AWS WAFによるアプリケーション保護
   - ボット対策
   - レート制限
   - 地理的制限

4. Amazon Route 53による耐障害性DNS
   - ヘルスチェック
   - フェイルオーバールーティング
   - GeoDNS
```

### 合格基準

| 項目 | 基準 |
|------|------|
| CloudFront | グローバルにコンテンツが配信されること |
| Shield | DDoS攻撃が自動的に緩和されること |
| WAF | 悪意のあるトラフィックがブロックされること |
| Route53 | DNS障害時にフェイルオーバーすること |
| 可用性 | 攻撃シミュレーション時もサービス継続すること |

---

## 4. 使用するAWSサービス

### コア技術スタック

```yaml
エッジセキュリティ:
  - Amazon CloudFront: グローバルCDN
  - AWS Shield Standard: 基本DDoS保護（無料）
  - AWS Shield Advanced: 高度なDDoS保護
  - AWS WAF: Webアプリケーション保護

DNS:
  - Amazon Route 53: マネージドDNS
  - Route 53 Health Checks: ヘルスチェック
  - Route 53 Traffic Flow: 高度なルーティング

オリジン:
  - Application Load Balancer: ロードバランサ
  - Amazon S3: 静的コンテンツ
  - AWS Global Accelerator: 固定IP・最適化ルーティング（オプション）

監視・対応:
  - Amazon CloudWatch: メトリクス・ダッシュボード
  - AWS Firewall Manager: 一元管理
  - Amazon SNS: アラート通知
```

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| CDN | CloudFront | Cloud CDN |
| DDoS保護 | Shield | Cloud Armor |
| WAF | AWS WAF | Cloud Armor WAF |
| DNS | Route 53 | Cloud DNS |
| Anycast | Global Accelerator | Cloud Load Balancing |

---

## 5. 前提条件

### 技術要件

```bash
# 必要なCLIツール
aws --version          # 2.x

# AWS設定
aws configure
export AWS_REGION=ap-northeast-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

### 事前準備

```bash
# ドメイン設定
# socialconnect.example.com を Route 53 で管理済み

# 既存リソース
# - ALB (オリジン)
# - S3バケット (静的コンテンツ)
# - ACM証明書 (us-east-1)
```

---

## 6. トラブルシューティングチャレンジ

### Challenge 1: CloudFrontキャッシュがヒットしない

```
問題:
キャッシュヒット率が10%以下で、ほとんどのリクエストがオリジンに到達している。

メトリクス:
- CacheHitRate: 8%
- OriginRequests: 90%

調査項目:
1. キャッシュポリシー設定
2. Varyヘッダー
3. クエリストリング
```

<details>
<summary>解決のヒント</summary>

```bash
# 1. キャッシュポリシー確認
aws cloudfront get-cache-policy --id POLICY_ID

# 2. オリジンのレスポンスヘッダー確認
curl -I https://example.com/api/posts | grep -i cache

# Cache-Control: no-store が原因の可能性

# 3. クエリストリングの影響確認
# ?timestamp=xxx のような動的パラメータがキャッシュを無効化

# 解決策:
# a) Cache-Control ヘッダーの適切な設定
# オリジンで: Cache-Control: public, max-age=300

# b) クエリストリングのホワイトリスト設定
# 必要なクエリパラメータのみをキャッシュキーに含める

# c) キャッシュポリシーの最適化
aws cloudfront create-cache-policy --cache-policy-config '{
    "Name": "OptimizedCachePolicy",
    "MinTTL": 1,
    "MaxTTL": 86400,
    "DefaultTTL": 300,
    "ParametersInCacheKeyAndForwardedToOrigin": {
        "EnableAcceptEncodingGzip": true,
        "EnableAcceptEncodingBrotli": true,
        "HeadersConfig": {
            "HeaderBehavior": "none"
        },
        "CookiesConfig": {
            "CookieBehavior": "none"
        },
        "QueryStringsConfig": {
            "QueryStringBehavior": "whitelist",
            "QueryStrings": {
                "Items": ["page", "limit"]
            }
        }
    }
}'
```
</details>

### Challenge 2: WAFがレジティメートなボットをブロック

```
問題:
Google botやBing botがWAFにブロックされ、
SEOに悪影響が出ている。

WAFログ:
terminatingRuleId: AWSManagedRulesBotControlRuleSet
action: BLOCK
labels: ["awswaf:managed:aws:bot-control:bot:verified"]

調査項目:
1. ボット制御ルールの設定
2. ラベルマッチング
3. 例外設定
```

<details>
<summary>解決のヒント</summary>

```bash
# 1. 検証済みボットを許可する例外ルールを追加

# WAF Web ACLに新しいルールを追加（優先度を上げる）
{
    "Name": "AllowVerifiedBots",
    "Priority": 0,
    "Action": {"Allow": {}},
    "Statement": {
        "LabelMatchStatement": {
            "Scope": "LABEL",
            "Key": "awswaf:managed:aws:bot-control:bot:verified"
        }
    },
    "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AllowVerifiedBotsMetric"
    }
}

# 2. 特定のUser-Agentを許可
{
    "Name": "AllowGoogleBot",
    "Priority": 1,
    "Action": {"Allow": {}},
    "Statement": {
        "ByteMatchStatement": {
            "SearchString": "Googlebot",
            "FieldToMatch": {
                "SingleHeader": {"Name": "user-agent"}
            },
            "TextTransformations": [
                {"Priority": 0, "Type": "LOWERCASE"}
            ],
            "PositionalConstraint": "CONTAINS"
        }
    },
    "VisibilityConfig": {...}
}

# 3. ボット制御ルールのモード変更
# COMMON → TARGETED に変更して、悪意のあるボットのみブロック
```
</details>

### Challenge 3: Shield Advanced でコスト保護が機能しない

```
問題:
大規模DDoS攻撃を受け、CloudFrontとALBのデータ転送料金が
大幅に増加したが、Shield Advancedのコスト保護が適用されない。

請求:
- CloudFront データ転送: $50,000
- ALB データ転送: $10,000
- Shield Advanced: $3,000

調査項目:
1. コスト保護の条件
2. 保護対象リソースの設定
3. DRT への連絡
```

<details>
<summary>解決のヒント</summary>

```bash
# Shield Advancedのコスト保護を受けるための条件:

# 1. リソースが保護対象として登録されていること
aws shield list-protections

# 2. 攻撃がShieldによって検知されていること
aws shield list-attacks --start-time "2024-01-01T00:00:00Z" --end-time "2024-01-31T23:59:59Z"

# 3. WAFがAssociateされていること（L7攻撃の場合）
aws wafv2 get-web-acl-for-resource \
    --resource-arn arn:aws:cloudfront::xxx:distribution/yyy

# コスト保護申請手順:
# a) AWS サポートケースを開く
# b) 以下の情報を提供:
#    - Shield 攻撃ID
#    - 影響を受けたリソースのARN
#    - 異常なコストが発生した期間
#    - コスト増加の証拠（請求書）

# c) DRTに連絡（プロアクティブエンゲージメント有効時）
aws shield describe-subscription
# ProactiveEngagementStatus: ENABLED であることを確認

# 注意: コスト保護は攻撃が正当にDDoS攻撃として認定された場合のみ適用
# スケーリングによる正常なトラフィック増加は対象外
```
</details>

---

## 7. 設計考慮ポイント

### Shield Standard vs Advanced

```yaml
Shield Standard (無料):
  保護対象:
    - CloudFront
    - Route 53
    - Global Accelerator
  保護内容:
    - Layer 3/4 DDoS攻撃の自動緩和
    - SYN floods, UDP floods, Reflection attacks
  制限:
    - 可視性なし
    - コスト保護なし
    - DRTサポートなし

Shield Advanced ($3,000/月 + WAF費用):
  追加保護:
    - ALB, NLB, EIP, EC2
  追加機能:
    - リアルタイム攻撃可視性
    - DDoS Response Team (24/7)
    - コスト保護
    - WAF無料（Shield関連）
    - Health-based detection
  適用ケース:
    - ミッションクリティカル
    - 高頻度の攻撃
    - SLA要件あり

選択基準:
  月間UU > 100万 または
  ダウンタイムコスト > $10,000/時間
  → Shield Advanced を推奨
```

### グローバル配信戦略

```
エッジロケーション最適化:

┌─────────────────────────────────────────────────────────────┐
│                    Price Class 選択                         │
├─────────────────────────────────────────────────────────────┤
│ PriceClass_All        : 全リージョン (最高パフォーマンス)    │
│ PriceClass_200        : 北米、欧州、アジア、中東、アフリカ   │
│ PriceClass_100        : 北米、欧州のみ (最低コスト)          │
└─────────────────────────────────────────────────────────────┘

推奨:
- グローバルサービス → PriceClass_All
- 日本中心 + 一部海外 → PriceClass_200
- 開発環境 → PriceClass_100
```

---

## 8. 発展課題（オプション）

### 上級チャレンジ1: Global Acceleratorによる最適化

```bash
# AWS Global Accelerator設定
# 固定IPアドレスとAnycastルーティング

aws globalaccelerator create-accelerator \
    --name example-accelerator \
    --ip-address-type IPV4 \
    --enabled

# リスナー作成
aws globalaccelerator create-listener \
    --accelerator-arn arn:aws:globalaccelerator::xxx:accelerator/yyy \
    --port-ranges '[{"FromPort":443,"ToPort":443}]' \
    --protocol TCP

# エンドポイントグループ作成（複数リージョン）
aws globalaccelerator create-endpoint-group \
    --listener-arn arn:aws:globalaccelerator::xxx:accelerator/yyy/listener/zzz \
    --endpoint-group-region ap-northeast-1 \
    --endpoint-configurations '[{"EndpointId":"arn:aws:elasticloadbalancing:...","Weight":100}]' \
    --traffic-dial-percentage 100 \
    --health-check-path "/health" \
    --health-check-interval-seconds 10
```

### 上級チャレンジ2: 多層キャッシング戦略

```yaml
# CloudFront + Origin Shield + ALB + ElastiCache

Layer 1: CloudFront Edge
  - 静的コンテンツ: 24時間キャッシュ
  - 動的コンテンツ: 5分キャッシュ
  - キャッシュヒット率目標: 80%

Layer 2: Origin Shield
  - リージョナルエッジキャッシュの一元化
  - オリジンへのリクエスト削減: 50%

Layer 3: Application Cache (ElastiCache)
  - API レスポンスキャッシュ
  - セッションストア
  - TTL: 1-5分

結果:
  - オリジンへの到達率: 10%以下
  - レイテンシ改善: 80%
```

### 上級チャレンジ3: カオスエンジニアリング

```python
# DDoS攻撃シミュレーション（AWS FISを使用）
# 注意: 本番環境では事前にAWSサポートに連絡が必要

# FIS実験テンプレート
{
    "description": "Simulate high traffic load",
    "targets": {
        "alb": {
            "resourceType": "aws:elasticloadbalancing:loadbalancer",
            "resourceArns": ["arn:aws:elasticloadbalancing:..."],
            "selectionMode": "ALL"
        }
    },
    "actions": {
        "inject-fault": {
            "actionId": "aws:fis:inject-api-throttle-error",
            "parameters": {
                "duration": "PT5M",
                "percentage": "50"
            },
            "targets": {
                "LoadBalancers": "alb"
            }
        }
    },
    "stopConditions": [
        {
            "source": "aws:cloudwatch:alarm",
            "value": "arn:aws:cloudwatch:...:alarm:emergency-stop"
        }
    ],
    "roleArn": "arn:aws:iam::xxx:role/FISRole"
}
```

---

## 9. コスト見積もり

### 月額コスト概算

| サービス | スペック | 月額コスト |
|----------|----------|------------|
| CloudFront | 10TB転送 + 1億リクエスト | $1,200 |
| Shield Advanced | 基本料金 | $3,000 |
| WAF | Web ACL + ルール + ボット制御 | $50 |
| Route 53 | ホステッドゾーン + クエリ | $10 |
| ヘルスチェック | 3つ | $2 |
| CloudWatch | ログ・メトリクス | $30 |
| **合計** | | **約 $4,292/月** |

### Shield Advancedなしの場合

```
Shield Standard (無料) の場合:
- CloudFront: $1,200
- WAF: $50
- Route 53: $12
- CloudWatch: $30
合計: 約 $1,292/月

差額: $3,000/月

判断基準:
- DDoS攻撃によるダウンタイムコスト
- ブランド毀損のリスク
- SLA要件

500万UU × 広告収入 $0.01/UU = $50,000/月
1時間ダウンタイム = $2,000+ の損失
→ Shield Advanced の投資対効果は高い
```

---

## 10. 学習のポイント

### 今回学んだこと

```
1. CloudFrontによるグローバル配信
   - エッジロケーションの活用
   - キャッシュ戦略
   - オリジン保護

2. AWS ShieldによるDDoS保護
   - Standard vs Advanced
   - 自動緩和
   - DRTサポート

3. AWS WAFによるL7保護
   - マネージドルール
   - ボット制御
   - レート制限

4. Route 53による高可用性DNS
   - ヘルスチェック
   - フェイルオーバー
   - GeoDNS
```

### GCPとの比較まとめ

| 観点 | AWS | GCP |
|------|-----|-----|
| CDN | CloudFront (450+ PoPs) | Cloud CDN |
| DDoS | Shield (Standard無料) | Cloud Armor |
| 専門サポート | DRT (Shield Advanced) | なし（標準サポート内） |
| 価格モデル | 月額固定 + 従量 | 従量課金のみ |

### 次のステップ

```
1. 発展学習:
   - AWS Global Accelerator
   - CloudFront Functions/Lambda@Edge
   - Origin Shield

2. 実務応用:
   - 攻撃シミュレーション訓練
   - インシデントレスポンス計画
   - SLA設計

3. 認定資格:
   - AWS Certified Security - Specialty
   - AWS Certified Advanced Networking - Specialty
```

---

