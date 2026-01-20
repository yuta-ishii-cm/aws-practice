# 課題21: グローバルWebサービスのDDoS対策

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| **カテゴリ** | セキュリティ |
| **難易度** | 初級〜中級（Level 2-3） |
| **所要時間** | 4-5時間 |
| **前提スキル** | ネットワーク基礎、DNS基礎 |
| **関連キーワード** | CloudFront, WAF, Shield, Route53, DDoS, エッジセキュリティ |

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

### DUMMY_MARKER_FOR_DELETION

# バケットポリシー（CloudFrontからのみアクセス許可）
cat > bucket-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::socialconnect-static-ACCOUNT_ID/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
                }
            }
        }
    ]
}
EOF

sed -i "s/ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" bucket-policy.json
```

```bash
# CloudFront Distribution作成
cat > cloudfront-config.json << 'EOF'
{
    "CallerReference": "socialconnect-dist-001",
    "Aliases": {
        "Quantity": 1,
        "Items": ["socialconnect.example.com"]
    },
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 3,
        "Items": [
            {
                "Id": "alb-origin",
                "DomainName": "socialconnect-alb.ap-northeast-1.elb.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "https-only",
                    "OriginSslProtocols": {
                        "Quantity": 1,
                        "Items": ["TLSv1.2"]
                    }
                },
                "OriginShield": {
                    "Enabled": true,
                    "OriginShieldRegion": "ap-northeast-1"
                }
            },
            {
                "Id": "s3-static-origin",
                "DomainName": "socialconnect-static-ACCOUNT_ID.s3.ap-northeast-1.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                },
                "OriginAccessControlId": "OAC_ID"
            },
            {
                "Id": "s3-failover-origin",
                "DomainName": "socialconnect-failover.s3-website-ap-northeast-1.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "OriginGroups": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "alb-failover-group",
                "FailoverCriteria": {
                    "StatusCodes": {
                        "Quantity": 4,
                        "Items": [500, 502, 503, 504]
                    }
                },
                "Members": {
                    "Quantity": 2,
                    "Items": [
                        {"OriginId": "alb-origin"},
                        {"OriginId": "s3-failover-origin"}
                    ]
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "alb-failover-group",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 7,
            "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["GET", "HEAD"]
            }
        },
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-5492eafa07d3",
        "Compress": true
    },
    "CacheBehaviors": {
        "Quantity": 2,
        "Items": [
            {
                "PathPattern": "/api/*",
                "TargetOriginId": "alb-failover-group",
                "ViewerProtocolPolicy": "https-only",
                "AllowedMethods": {
                    "Quantity": 7,
                    "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
                },
                "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
                "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-5492eafa07d3"
            },
            {
                "PathPattern": "/static/*",
                "TargetOriginId": "s3-static-origin",
                "ViewerProtocolPolicy": "https-only",
                "AllowedMethods": {
                    "Quantity": 2,
                    "Items": ["GET", "HEAD"]
                },
                "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
                "Compress": true
            }
        ]
    },
    "PriceClass": "PriceClass_All",
    "Enabled": true,
    "ViewerCertificate": {
        "ACMCertificateArn": "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/xxx",
        "SSLSupportMethod": "sni-only",
        "MinimumProtocolVersion": "TLSv1.2_2021"
    },
    "HttpVersion": "http2and3",
    "IsIPV6Enabled": true,
    "WebACLId": "",
    "Logging": {
        "Enabled": true,
        "IncludeCookies": false,
        "Bucket": "socialconnect-logs.s3.amazonaws.com",
        "Prefix": "cloudfront/"
    }
}
EOF

aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

### Step 2: AWS WAF設定

```bash
# WAF Web ACL作成
cat > waf-webacl.json << 'EOF'
{
    "Name": "socialconnect-waf",
    "Scope": "CLOUDFRONT",
    "DefaultAction": {
        "Allow": {}
    },
    "Rules": [
        {
            "Name": "AWSManagedRulesCommonRuleSet",
            "Priority": 1,
            "OverrideAction": {"None": {}},
            "Statement": {
                "ManagedRuleGroupStatement": {
                    "VendorName": "AWS",
                    "Name": "AWSManagedRulesCommonRuleSet"
                }
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "AWSManagedRulesCommonRuleSetMetric"
            }
        },
        {
            "Name": "AWSManagedRulesKnownBadInputsRuleSet",
            "Priority": 2,
            "OverrideAction": {"None": {}},
            "Statement": {
                "ManagedRuleGroupStatement": {
                    "VendorName": "AWS",
                    "Name": "AWSManagedRulesKnownBadInputsRuleSet"
                }
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "AWSManagedRulesKnownBadInputsRuleSetMetric"
            }
        },
        {
            "Name": "AWSManagedRulesAmazonIpReputationList",
            "Priority": 3,
            "OverrideAction": {"None": {}},
            "Statement": {
                "ManagedRuleGroupStatement": {
                    "VendorName": "AWS",
                    "Name": "AWSManagedRulesAmazonIpReputationList"
                }
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "AWSManagedRulesAmazonIpReputationListMetric"
            }
        },
        {
            "Name": "AWSManagedRulesBotControlRuleSet",
            "Priority": 4,
            "OverrideAction": {"None": {}},
            "Statement": {
                "ManagedRuleGroupStatement": {
                    "VendorName": "AWS",
                    "Name": "AWSManagedRulesBotControlRuleSet",
                    "ManagedRuleGroupConfigs": [
                        {
                            "AWSManagedRulesBotControlRuleSet": {
                                "InspectionLevel": "COMMON"
                            }
                        }
                    ]
                }
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "AWSManagedRulesBotControlRuleSetMetric"
            }
        },
        {
            "Name": "RateLimitRule",
            "Priority": 5,
            "Action": {"Block": {}},
            "Statement": {
                "RateBasedStatement": {
                    "Limit": 10000,
                    "AggregateKeyType": "IP"
                }
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "RateLimitRuleMetric"
            }
        },
        {
            "Name": "GeoBlockRule",
            "Priority": 6,
            "Action": {"Block": {}},
            "Statement": {
                "GeoMatchStatement": {
                    "CountryCodes": ["KP", "IR", "SY", "CU"]
                }
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "GeoBlockRuleMetric"
            }
        },
        {
            "Name": "LoginRateLimit",
            "Priority": 7,
            "Action": {"Block": {}},
            "Statement": {
                "RateBasedStatement": {
                    "Limit": 100,
                    "AggregateKeyType": "IP",
                    "ScopeDownStatement": {
                        "ByteMatchStatement": {
                            "SearchString": "/api/auth/login",
                            "FieldToMatch": {"UriPath": {}},
                            "TextTransformations": [
                                {"Priority": 0, "Type": "LOWERCASE"}
                            ],
                            "PositionalConstraint": "EXACTLY"
                        }
                    }
                }
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "LoginRateLimitMetric"
            }
        }
    ],
    "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "socialconnect-waf"
    }
}
EOF

aws wafv2 create-web-acl --cli-input-json file://waf-webacl.json --scope CLOUDFRONT --region us-east-1
```

### Step 3: AWS Shield Advanced設定

```bash
# Shield Advanced サブスクリプション（コンソールから有効化が必要）
# 月額 $3,000 + データ転送費用

# 保護対象リソースの登録
aws shield create-protection \
    --name socialconnect-cloudfront \
    --resource-arn arn:aws:cloudfront::${AWS_ACCOUNT_ID}:distribution/DISTRIBUTION_ID

aws shield create-protection \
    --name socialconnect-alb \
    --resource-arn arn:aws:elasticloadbalancing:ap-northeast-1:${AWS_ACCOUNT_ID}:loadbalancer/app/socialconnect-alb/xxx

aws shield create-protection \
    --name socialconnect-route53 \
    --resource-arn arn:aws:route53:::hostedzone/HOSTED_ZONE_ID

# DRT (DDoS Response Team) アクセス権限の付与
aws shield associate-drt-log-bucket --log-bucket socialconnect-logs
aws shield associate-drt-role --role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/DRTAccessRole

# Shield Advanced ダッシュボードの確認
aws shield describe-subscription
aws shield list-protections
```

### Step 4: Route 53 ヘルスチェックとフェイルオーバー

```bash
# ヘルスチェック作成（CloudFront）
aws route53 create-health-check --caller-reference "cf-health-$(date +%s)" \
    --health-check-config '{
        "Type": "HTTPS",
        "FullyQualifiedDomainName": "d1234567890.cloudfront.net",
        "Port": 443,
        "ResourcePath": "/health",
        "RequestInterval": 10,
        "FailureThreshold": 2,
        "EnableSNI": true
    }'

# ヘルスチェック作成（ALB直接）
aws route53 create-health-check --caller-reference "alb-health-$(date +%s)" \
    --health-check-config '{
        "Type": "HTTPS",
        "FullyQualifiedDomainName": "socialconnect-alb.ap-northeast-1.elb.amazonaws.com",
        "Port": 443,
        "ResourcePath": "/health",
        "RequestInterval": 10,
        "FailureThreshold": 2,
        "EnableSNI": true
    }'

# CloudWatchアラーム連携
aws route53 update-health-check \
    --health-check-id HC_ID \
    --alarm-identifier '{
        "Region": "us-east-1",
        "Name": "socialconnect-cloudfront-health"
    }'
```

```bash
# フェイルオーバーレコード作成
cat > route53-records.json << 'EOF'
{
    "Changes": [
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "socialconnect.example.com",
                "Type": "A",
                "SetIdentifier": "Primary-CloudFront",
                "Failover": "PRIMARY",
                "AliasTarget": {
                    "HostedZoneId": "Z2FDTNDATAQYW2",
                    "DNSName": "d1234567890.cloudfront.net",
                    "EvaluateTargetHealth": true
                },
                "HealthCheckId": "CF_HEALTH_CHECK_ID"
            }
        },
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "socialconnect.example.com",
                "Type": "A",
                "SetIdentifier": "Secondary-ALB",
                "Failover": "SECONDARY",
                "AliasTarget": {
                    "HostedZoneId": "Z14GRHDCWA56QT",
                    "DNSName": "socialconnect-alb.ap-northeast-1.elb.amazonaws.com",
                    "EvaluateTargetHealth": true
                },
                "HealthCheckId": "ALB_HEALTH_CHECK_ID"
            }
        }
    ]
}
EOF

aws route53 change-resource-record-sets \
    --hosted-zone-id HOSTED_ZONE_ID \
    --change-batch file://route53-records.json
```

### Step 5: 監視とアラート設定

```bash
# CloudWatch ダッシュボード作成
cat > dashboard.json << 'EOF'
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "title": "CloudFront Requests",
                "metrics": [
                    ["AWS/CloudFront", "Requests", "DistributionId", "DISTRIBUTION_ID", {"stat": "Sum", "period": 60}]
                ],
                "region": "us-east-1"
            }
        },
        {
            "type": "metric",
            "properties": {
                "title": "WAF Blocked Requests",
                "metrics": [
                    ["AWS/WAFV2", "BlockedRequests", "WebACL", "socialconnect-waf", {"stat": "Sum", "period": 60}]
                ],
                "region": "us-east-1"
            }
        },
        {
            "type": "metric",
            "properties": {
                "title": "Shield DDoS Events",
                "metrics": [
                    ["AWS/DDoSProtection", "DDoSDetected", {"stat": "Sum", "period": 300}]
                ],
                "region": "us-east-1"
            }
        },
        {
            "type": "metric",
            "properties": {
                "title": "Origin Latency",
                "metrics": [
                    ["AWS/CloudFront", "OriginLatency", "DistributionId", "DISTRIBUTION_ID", {"stat": "p99", "period": 60}]
                ],
                "region": "us-east-1"
            }
        },
        {
            "type": "metric",
            "properties": {
                "title": "Error Rate",
                "metrics": [
                    ["AWS/CloudFront", "5xxErrorRate", "DistributionId", "DISTRIBUTION_ID", {"stat": "Average", "period": 60}],
                    ["AWS/CloudFront", "4xxErrorRate", "DistributionId", "DISTRIBUTION_ID", {"stat": "Average", "period": 60}]
                ],
                "region": "us-east-1"
            }
        },
        {
            "type": "metric",
            "properties": {
                "title": "Cache Hit Rate",
                "metrics": [
                    ["AWS/CloudFront", "CacheHitRate", "DistributionId", "DISTRIBUTION_ID", {"stat": "Average", "period": 300}]
                ],
                "region": "us-east-1"
            }
        }
    ]
}
EOF

aws cloudwatch put-dashboard \
    --dashboard-name SocialConnect-Security \
    --dashboard-body file://dashboard.json
```

```bash
# アラート設定
# DDoS検知アラーム
aws cloudwatch put-metric-alarm \
    --alarm-name socialconnect-ddos-detected \
    --alarm-description "DDoS attack detected" \
    --metric-name DDoSDetected \
    --namespace AWS/DDoSProtection \
    --statistic Sum \
    --period 300 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 1 \
    --alarm-actions arn:aws:sns:us-east-1:${AWS_ACCOUNT_ID}:security-alerts

# 高いブロック率アラーム
aws cloudwatch put-metric-alarm \
    --alarm-name socialconnect-high-block-rate \
    --alarm-description "High WAF block rate" \
    --metric-name BlockedRequests \
    --namespace AWS/WAFV2 \
    --dimensions Name=WebACL,Value=socialconnect-waf \
    --statistic Sum \
    --period 300 \
    --threshold 10000 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions arn:aws:sns:us-east-1:${AWS_ACCOUNT_ID}:security-alerts

# オリジンエラー率アラーム
aws cloudwatch put-metric-alarm \
    --alarm-name socialconnect-high-error-rate \
    --alarm-description "High origin error rate" \
    --metric-name 5xxErrorRate \
    --namespace AWS/CloudFront \
    --dimensions Name=DistributionId,Value=DISTRIBUTION_ID \
    --statistic Average \
    --period 60 \
    --threshold 5 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 3 \
    --alarm-actions arn:aws:sns:us-east-1:${AWS_ACCOUNT_ID}:ops-alerts
```

### Step 6: 自動対応Lambda

```python
# lambda_ddos_response.py
import boto3
import json
import os

wafv2 = boto3.client('wafv2', region_name='us-east-1')
sns = boto3.client('sns')
cloudwatch = boto3.client('cloudwatch')

WEB_ACL_ARN = os.environ['WEB_ACL_ARN']
IP_SET_ARN = os.environ['IP_SET_ARN']
SNS_TOPIC_ARN = os.environ['SNS_TOPIC_ARN']

def lambda_handler(event, context):
    """Shield/WAFイベントに対する自動対応"""

    source = event.get('source')

    if source == 'aws.shield':
        handle_shield_event(event)
    elif source == 'aws.wafv2':
        handle_waf_event(event)

    return {'statusCode': 200}


def handle_shield_event(event):
    """Shield DDoSイベントの処理"""
    detail = event['detail']
    attack_type = detail.get('attackVectors', [{}])[0].get('vectorType', 'Unknown')
    resource = detail.get('resourceArn', 'Unknown')

    # 攻撃開始通知
    if detail.get('eventTypeCategory') == 'DDoS':
        message = f"""
        DDoS Attack Detected!

        Resource: {resource}
        Attack Type: {attack_type}
        Time: {event['time']}

        Shield Advanced is automatically mitigating this attack.
        DRT has been notified if proactive engagement is enabled.
        """

        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject='[CRITICAL] DDoS Attack Detected - SocialConnect',
            Message=message
        )

        # カスタムメトリクス記録
        cloudwatch.put_metric_data(
            Namespace='SocialConnect/Security',
            MetricData=[{
                'MetricName': 'DDoSAttacks',
                'Value': 1,
                'Unit': 'Count',
                'Dimensions': [
                    {'Name': 'AttackType', 'Value': attack_type}
                ]
            }]
        )


def handle_waf_event(event):
    """WAFイベントの処理（レート制限超過時の自動ブロック）"""
    detail = event['detail']

    # レート制限超過IPを永続的にブロック
    if detail.get('ruleName') == 'RateLimitRule':
        source_ip = detail.get('httpRequest', {}).get('clientIp')
        if source_ip:
            add_ip_to_block_list(source_ip)
            notify_ip_blocked(source_ip)


def add_ip_to_block_list(ip_address):
    """IPをブロックリストに追加"""
    try:
        # 現在のIPセット取得
        response = wafv2.get_ip_set(
            Name='socialconnect-block-list',
            Scope='CLOUDFRONT',
            Id=IP_SET_ARN.split('/')[-1]
        )

        current_addresses = response['IPSet']['Addresses']
        lock_token = response['LockToken']

        # 新しいIPを追加
        if f"{ip_address}/32" not in current_addresses:
            current_addresses.append(f"{ip_address}/32")

            wafv2.update_ip_set(
                Name='socialconnect-block-list',
                Scope='CLOUDFRONT',
                Id=IP_SET_ARN.split('/')[-1],
                Addresses=current_addresses,
                LockToken=lock_token
            )

    except Exception as e:
        print(f"Error adding IP to block list: {e}")


def notify_ip_blocked(ip_address):
    """IPブロック通知"""
    sns.publish(
        TopicArn=SNS_TOPIC_ARN,
        Subject='[INFO] IP Automatically Blocked - SocialConnect',
        Message=f"IP {ip_address} has been automatically added to the block list due to rate limit violations."
    )
```

---

## 8. トラブルシューティングチャレンジ

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
curl -I https://socialconnect.example.com/api/posts | grep -i cache

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

## 9. 設計考慮ポイント

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

## 10. 発展課題

### 上級チャレンジ1: Global Acceleratorによる最適化

```bash
# AWS Global Accelerator設定
# 固定IPアドレスとAnycastルーティング

aws globalaccelerator create-accelerator \
    --name socialconnect-accelerator \
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

## 11. コスト見積もり

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

## 12. 学習のポイント

### 今回学んだこと

```
1. CloudFrontによるグローバル配信
   □ エッジロケーションの活用
   □ キャッシュ戦略
   □ オリジン保護

2. AWS ShieldによるDDoS保護
   □ Standard vs Advanced
   □ 自動緩和
   □ DRTサポート

3. AWS WAFによるL7保護
   □ マネージドルール
   □ ボット制御
   □ レート制限

4. Route 53による高可用性DNS
   □ ヘルスチェック
   □ フェイルオーバー
   □ GeoDNS
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
