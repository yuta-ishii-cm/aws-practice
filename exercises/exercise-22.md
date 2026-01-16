# 課題22: マーケティングSaaSのAWSコスト最適化

## 1. 課題分類

| 項目 | 内容 |
|------|------|
| **カテゴリ** | コスト管理・最適化 |
| **難易度** | 中級（Intermediate） |
| **所要時間** | 4-5時間 |
| **前提スキル** | AWS基礎、EC2/RDS基礎、コスト意識 |
| **関連AWS認定** | AWS Certified Cloud Practitioner、Solutions Architect Associate |

---

## 2. ビジネスシナリオ

### 企業プロファイル
- **企業名**: AdMetrics株式会社
- **業種**: マーケティングSaaS（広告効果測定・分析）
- **規模**: 従業員80名、エンジニア20名
- **顧客数**: 500社、月間データ処理量50TB
- **現状インフラ**: AWS（月額コスト300万円）

### 現状の課題
AdMetrics株式会社は急成長に伴いAWSコストが急増しています。
CFO から「コストを30%削減しつつ、パフォーマンスを維持せよ」という指示が出ました。

1. **コスト可視性の欠如**
   - 部門・プロジェクト別のコストが把握できていない
   - 無駄なリソースの特定ができない
   - 予算超過の早期検知ができない

2. **リソースの非効率な利用**
   - EC2インスタンスの平均CPU使用率が15%
   - 開発環境が24時間稼働
   - 未使用のEBSボリューム・EIPが多数存在

3. **購入オプションの未活用**
   - すべてオンデマンド課金
   - Reserved Instances/Savings Plans 未導入
   - Spot インスタンス未活用

### 現状のAWSコスト内訳
```
月額コスト: 300万円（$20,000相当）

┌────────────────────────────────────────┐
│           コスト内訳                    │
├────────────────────────────────────────┤
│ EC2 (コンピュート)      : 120万円 (40%) │
│ RDS (データベース)      :  60万円 (20%) │
│ S3 (ストレージ)         :  45万円 (15%) │
│ Data Transfer           :  30万円 (10%) │
│ ElastiCache             :  15万円  (5%) │
│ その他                  :  30万円 (10%) │
└────────────────────────────────────────┘
```

### ビジネス要件
```
機能要件:
- コストの部門・プロジェクト別可視化
- 異常コストの自動検知・通知
- 最適化推奨の自動生成
- 月次コストレポートの自動化

非機能要件:
- コスト30%削減（300万円 → 210万円）
- パフォーマンス維持（レイテンシ悪化なし）
- 可用性維持（99.9%）
- 実装期間：3ヶ月
```

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 月額AWSコスト | 300万円 | 210万円（30%削減） |
| EC2 CPU使用率 | 15% | 50-70% |
| Reserved/Savings カバレッジ | 0% | 60% |
| コスト可視性（タグ付け率） | 30% | 95% |
| 無駄リソース数 | 50+ | 0 |

---

## 3. 学習目標

### 本課題で習得するスキル

```
1. コスト可視化（理解度：詳細）
   - AWS Cost Explorer の活用
   - コスト配分タグの設計・実装
   - Cost and Usage Report (CUR) の分析

2. コスト最適化（理解度：実装）
   - Compute Optimizer によるサイジング
   - Reserved Instances / Savings Plans
   - Spot インスタンスの活用

3. コストガバナンス（理解度：実装）
   - AWS Budgets によるアラート
   - Trusted Advisor の活用
   - 自動停止・削除の実装
```

### GCPエンジニア向け補足
```
GCP → AWS マッピング:
- Billing Reports → Cost Explorer
- Committed Use Discounts → Reserved Instances / Savings Plans
- Preemptible VMs → Spot Instances
- Recommender → Compute Optimizer / Trusted Advisor
- Budget Alerts → AWS Budgets

主な違い:
1. AWS は購入オプションが豊富
   - Reserved Instances（1年/3年、全額/一部前払い）
   - Savings Plans（Compute/EC2/SageMaker）
   - Spot Instances（中断あり、最大90%割引）

2. タグベースのコスト配分が詳細
   - Cost Allocation Tags で部門別管理
   - Cost Categories でグルーピング

3. Cost and Usage Report (CUR) で詳細分析
   - S3 + Athena で SQL クエリ可能
   - QuickSight で可視化
```

---

## 4. 使用するAWSサービス

### メインサービス
| サービス | 役割 | 使用機能 |
|----------|------|----------|
| **AWS Cost Explorer** | コスト分析 | 可視化、予測、推奨 |
| **AWS Compute Optimizer** | リソース最適化 | EC2/Lambda/EBS推奨 |
| **AWS Trusted Advisor** | ベストプラクティス | コスト最適化チェック |
| **AWS Budgets** | 予算管理 | アラート、アクション |

### サポートサービス
| サービス | 用途 |
|----------|------|
| **Cost and Usage Report** | 詳細コストデータ |
| **AWS Organizations** | 一括請求、SCP |
| **Amazon S3** | CUR保存 |
| **Amazon Athena** | CUR分析 |
| **Amazon QuickSight** | ダッシュボード |
| **AWS Lambda** | 自動化処理 |
| **Amazon EventBridge** | スケジュール実行 |

### アーキテクチャ図
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AdMetrics コスト最適化基盤                               │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         コスト可視化層                                    │   │
│  │                                                                          │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │   │
│  │  │ Cost Explorer │  │     CUR       │  │  QuickSight   │               │   │
│  │  │               │  │   (S3/Athena) │  │  Dashboard    │               │   │
│  │  │ ・コスト分析  │  │               │  │               │               │   │
│  │  │ ・予測       │  │ ・詳細データ  │  │ ・経営向け    │               │   │
│  │  │ ・RI推奨     │  │ ・SQL分析    │  │ ・部門向け    │               │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         コスト最適化層                                    │   │
│  │                                                                          │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │   │
│  │  │   Compute     │  │   Trusted     │  │   Savings     │               │   │
│  │  │   Optimizer   │  │   Advisor     │  │   Plans       │               │   │
│  │  │               │  │               │  │               │               │   │
│  │  │ ・EC2サイジング│  │ ・未使用EIP  │  │ ・Compute SP │               │   │
│  │  │ ・Lambda最適化│  │ ・未使用EBS  │  │ ・EC2 SP     │               │   │
│  │  │ ・EBS最適化  │  │ ・低使用率EC2│  │ ・購入推奨   │               │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         ガバナンス・自動化層                              │   │
│  │                                                                          │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │   │
│  │  │  AWS Budgets  │  │  EventBridge  │  │   Lambda      │               │   │
│  │  │               │  │   Scheduler   │  │  Functions    │               │   │
│  │  │ ・予算設定   │  │               │  │               │               │   │
│  │  │ ・アラート   │  │ ・定期実行   │  │ ・開発環境停止│               │   │
│  │  │ ・自動停止   │  │ ・レポート生成│  │ ・未使用削除 │               │   │
│  │  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘               │   │
│  │          │                  │                  │                        │   │
│  │          └──────────────────┼──────────────────┘                        │   │
│  │                             ▼                                           │   │
│  │                    ┌───────────────┐                                    │   │
│  │                    │     SNS       │                                    │   │
│  │                    │  (通知配信)   │                                    │   │
│  │                    └───────┬───────┘                                    │   │
│  │                            │                                            │   │
│  │               ┌────────────┼────────────┐                               │   │
│  │               ▼            ▼            ▼                               │   │
│  │           ┌───────┐   ┌───────┐   ┌───────┐                            │   │
│  │           │ Slack │   │ Email │   │PagerDuty│                            │   │
│  │           └───────┘   └───────┘   └───────┘                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 前提条件と事前準備

### 必要な環境
```bash
# AWS CLI v2
aws --version  # 2.x以上

# Python 3.9以上
python3 --version

# jq（JSON処理）
jq --version

# Excel/スプレッドシート（レポート確認用）
```

### AWSアカウント要件
```
- Cost Explorer が有効化されていること
- Cost and Usage Report が設定済み（推奨）
- IAM 権限：Billing管理、Cost Explorer、Compute Optimizer
- Trusted Advisor：Business または Enterprise Support プラン（推奨）
```

### 事前準備スクリプト
```bash
#!/bin/bash
# setup-cost-optimization.sh

# ディレクトリ構造の作成
mkdir -p admetrics-cost/{analysis,automation,reports,dashboards}
cd admetrics-cost

# Cost Explorer の有効化確認
echo "=== Checking Cost Explorer Status ==="
aws ce get-cost-and-usage \
    --time-period Start=2024-01-01,End=2024-01-02 \
    --granularity MONTHLY \
    --metrics "BlendedCost" \
    2>/dev/null && echo "Cost Explorer is enabled" || echo "Enable Cost Explorer in Billing Console"

# Compute Optimizer の有効化
echo "=== Enabling Compute Optimizer ==="
aws compute-optimizer update-enrollment-status \
    --status Active \
    --include-member-accounts

# Trusted Advisor の確認
echo "=== Checking Trusted Advisor ==="
aws support describe-trusted-advisor-checks \
    --language en \
    --query 'checks[?category==`cost_optimizing`].name' \
    --output table 2>/dev/null || echo "Trusted Advisor requires Business/Enterprise Support"

# Cost Allocation Tags の確認
echo "=== Checking Cost Allocation Tags ==="
aws ce list-cost-allocation-tags \
    --query 'CostAllocationTags[*].[TagKey,Status]' \
    --output table
```

---

## 6. アーキテクチャ設計

### コスト配分タグ設計
```yaml
# cost-allocation-tags.yaml
cost_allocation_tags:
  # 必須タグ（全リソース）
  required:
    - key: Environment
      values: [production, staging, development, test]
      description: "環境識別"

    - key: Project
      values: [analytics, api, data-pipeline, infrastructure]
      description: "プロジェクト識別"

    - key: Team
      values: [platform, backend, data, frontend]
      description: "担当チーム"

    - key: CostCenter
      values: [engineering, marketing, sales, operations]
      description: "コストセンター"

  # 推奨タグ（追加情報）
  recommended:
    - key: Owner
      description: "リソース所有者（メールアドレス）"

    - key: Application
      description: "アプリケーション名"

    - key: AutoStop
      values: ["true", "false"]
      description: "自動停止対象"

# タグ付けポリシー（Organizations Tag Policy）
tag_policy:
  enforce_required_tags: true
  allowed_values_only: true
  non_compliant_action: report  # report | deny
```

### コスト最適化戦略
```yaml
# cost-optimization-strategy.yaml
optimization_targets:
  # Phase 1: Quick Wins（即効性のある最適化）
  quick_wins:
    target_savings: 15%  # 45万円/月
    timeline: 1週間
    actions:
      - type: unused_resources
        items:
          - Unattached EBS volumes
          - Unused Elastic IPs
          - Idle load balancers
          - Old snapshots (>90 days)
        estimated_savings: 10万円/月

      - type: development_scheduling
        items:
          - Stop dev/test EC2 at night (19:00-08:00)
          - Stop dev/test RDS at night
          - Weekend shutdown
        estimated_savings: 20万円/月

      - type: s3_optimization
        items:
          - Enable Intelligent-Tiering
          - Delete incomplete multipart uploads
          - Lifecycle policies for old data
        estimated_savings: 15万円/月

  # Phase 2: Right-sizing（適正サイジング）
  right_sizing:
    target_savings: 10%  # 30万円/月
    timeline: 1ヶ月
    actions:
      - type: ec2_right_sizing
        criteria:
          - CPU utilization < 40% for 14 days
          - Memory utilization < 40%
        approach: downsize_one_generation

      - type: rds_right_sizing
        criteria:
          - CPU utilization < 30% for 14 days
          - Connection count < 50% of max
        approach: consider_aurora_serverless

      - type: ebs_optimization
        criteria:
          - IOPS utilization < 50%
          - Throughput utilization < 50%
        approach: gp3_migration

  # Phase 3: Commitment（コミットメント購入）
  commitment:
    target_savings: 5%  # 15万円/月
    timeline: 3ヶ月
    actions:
      - type: savings_plans
        coverage_target: 60%
        type: Compute Savings Plans
        term: 1_year
        payment: no_upfront

      - type: reserved_instances
        coverage_target: 40%
        term: 1_year
        payment: partial_upfront
        targets:
          - RDS (stable workloads)
          - ElastiCache (stable workloads)
```

---

## 7. ハンズオン手順

### Step 1: コスト可視化の設定

```bash
#!/bin/bash
# step1-cost-visibility.sh

# Cost Allocation Tags の有効化
echo "=== Activating Cost Allocation Tags ==="

# Environment タグの有効化
aws ce update-cost-allocation-tags-status \
    --cost-allocation-tags-status \
        TagKey=Environment,Status=Active \
        TagKey=Project,Status=Active \
        TagKey=Team,Status=Active \
        TagKey=CostCenter,Status=Active

# 有効化されたタグの確認
aws ce list-cost-allocation-tags \
    --status Active \
    --query 'CostAllocationTags[*].[TagKey,Type,Status]' \
    --output table

# Cost Categories の作成（部門別グルーピング）
echo "=== Creating Cost Categories ==="
aws ce create-cost-category-definition \
    --name "Department" \
    --rule-version "CostCategoryExpression.v1" \
    --rules '[
        {
            "Value": "Engineering",
            "Rule": {
                "Tags": {
                    "Key": "CostCenter",
                    "Values": ["engineering"],
                    "MatchOptions": ["EQUALS"]
                }
            }
        },
        {
            "Value": "Marketing",
            "Rule": {
                "Tags": {
                    "Key": "CostCenter",
                    "Values": ["marketing"],
                    "MatchOptions": ["EQUALS"]
                }
            }
        },
        {
            "Value": "Operations",
            "Rule": {
                "Tags": {
                    "Key": "CostCenter",
                    "Values": ["operations"],
                    "MatchOptions": ["EQUALS"]
                }
            }
        },
        {
            "Value": "Untagged",
            "Rule": {
                "Tags": {
                    "Key": "CostCenter",
                    "MatchOptions": ["ABSENT"]
                }
            }
        }
    ]' \
    --default-value "Other"
```

### Step 2: Cost Explorer による分析

```python
# analysis/cost_analysis.py
"""
Cost Explorer を使用したコスト分析スクリプト
"""
import boto3
import pandas as pd
from datetime import datetime, timedelta
import json

ce_client = boto3.client('ce')

def get_monthly_costs(months=6):
    """
    過去N ヶ月のサービス別コスト取得
    """
    end_date = datetime.now().replace(day=1)
    start_date = end_date - timedelta(days=months*30)

    response = ce_client.get_cost_and_usage(
        TimePeriod={
            'Start': start_date.strftime('%Y-%m-%d'),
            'End': end_date.strftime('%Y-%m-%d')
        },
        Granularity='MONTHLY',
        Metrics=['BlendedCost', 'UsageQuantity'],
        GroupBy=[
            {'Type': 'DIMENSION', 'Key': 'SERVICE'}
        ]
    )

    # DataFrameに変換
    data = []
    for result in response['ResultsByTime']:
        period = result['TimePeriod']['Start']
        for group in result['Groups']:
            service = group['Keys'][0]
            cost = float(group['Metrics']['BlendedCost']['Amount'])
            data.append({
                'Period': period,
                'Service': service,
                'Cost': cost
            })

    df = pd.DataFrame(data)
    return df

def get_cost_by_tag(tag_key, months=3):
    """
    タグ別コスト分析
    """
    end_date = datetime.now().replace(day=1)
    start_date = end_date - timedelta(days=months*30)

    response = ce_client.get_cost_and_usage(
        TimePeriod={
            'Start': start_date.strftime('%Y-%m-%d'),
            'End': end_date.strftime('%Y-%m-%d')
        },
        Granularity='MONTHLY',
        Metrics=['BlendedCost'],
        GroupBy=[
            {'Type': 'TAG', 'Key': tag_key}
        ]
    )

    data = []
    for result in response['ResultsByTime']:
        period = result['TimePeriod']['Start']
        for group in result['Groups']:
            tag_value = group['Keys'][0] if group['Keys'][0] else 'Untagged'
            cost = float(group['Metrics']['BlendedCost']['Amount'])
            data.append({
                'Period': period,
                'TagValue': tag_value.replace(f'{tag_key}$', ''),
                'Cost': cost
            })

    df = pd.DataFrame(data)
    return df

def get_ri_recommendations():
    """
    Reserved Instance 購入推奨の取得
    """
    response = ce_client.get_reservation_purchase_recommendation(
        Service='Amazon Elastic Compute Cloud - Compute',
        TermInYears='ONE_YEAR',
        PaymentOption='NO_UPFRONT',
        LookbackPeriodInDays='SIXTY_DAYS'
    )

    recommendations = []
    for rec in response.get('Recommendations', []):
        for detail in rec.get('RecommendationDetails', []):
            recommendations.append({
                'InstanceType': detail.get('InstanceDetails', {}).get('EC2InstanceDetails', {}).get('InstanceType'),
                'RecommendedCount': detail.get('RecommendedNumberOfInstancesToPurchase'),
                'EstimatedMonthlySavings': detail.get('EstimatedMonthlySavingsAmount'),
                'EstimatedSavingsPercentage': detail.get('EstimatedMonthlySavingsPercentage'),
                'UpfrontCost': detail.get('UpfrontCost'),
                'RecurringMonthlyCost': detail.get('RecurringStandardMonthlyCost')
            })

    return pd.DataFrame(recommendations)

def get_savings_plans_recommendations():
    """
    Savings Plans 購入推奨の取得
    """
    response = ce_client.get_savings_plans_purchase_recommendation(
        SavingsPlansType='COMPUTE_SP',
        TermInYears='ONE_YEAR',
        PaymentOption='NO_UPFRONT',
        LookbackPeriodInDays='SIXTY_DAYS'
    )

    recommendations = []
    metadata = response.get('Metadata', {})
    sp_recommendations = response.get('SavingsPlansPurchaseRecommendation', {})

    for detail in sp_recommendations.get('SavingsPlansPurchaseRecommendationDetails', []):
        recommendations.append({
            'HourlyCommitment': detail.get('HourlyCommitmentToPurchase'),
            'EstimatedMonthlySavings': detail.get('EstimatedMonthlySavingsAmount'),
            'EstimatedSavingsPercentage': detail.get('EstimatedSavingsPercentage'),
            'EstimatedOnDemandCost': detail.get('EstimatedOnDemandCost'),
            'EstimatedSPCost': detail.get('EstimatedSPCost'),
            'CurrentCoverage': detail.get('CurrentAverageHourlyOnDemandSpend')
        })

    return pd.DataFrame(recommendations)

def get_cost_forecast(months_ahead=3):
    """
    コスト予測の取得
    """
    start_date = datetime.now()
    end_date = start_date + timedelta(days=months_ahead*30)

    response = ce_client.get_cost_forecast(
        TimePeriod={
            'Start': start_date.strftime('%Y-%m-%d'),
            'End': end_date.strftime('%Y-%m-%d')
        },
        Metric='BLENDED_COST',
        Granularity='MONTHLY'
    )

    forecasts = []
    for result in response.get('ForecastResultsByTime', []):
        forecasts.append({
            'Period': result['TimePeriod']['Start'],
            'ForecastedCost': float(result['MeanValue']),
            'LowerBound': float(result.get('PredictionIntervalLowerBound', 0)),
            'UpperBound': float(result.get('PredictionIntervalUpperBound', 0))
        })

    return pd.DataFrame(forecasts)

def generate_cost_report():
    """
    コスト分析レポートの生成
    """
    print("=" * 60)
    print("AdMetrics AWS Cost Analysis Report")
    print("=" * 60)

    # サービス別コスト
    print("\n### Service Cost Breakdown (Last 6 months) ###")
    service_costs = get_monthly_costs(6)
    latest_month = service_costs.groupby('Service')['Cost'].sum().sort_values(ascending=False)
    print(latest_month.head(10).to_string())

    # 環境別コスト
    print("\n### Cost by Environment ###")
    env_costs = get_cost_by_tag('Environment', 3)
    env_summary = env_costs.groupby('TagValue')['Cost'].sum().sort_values(ascending=False)
    print(env_summary.to_string())

    # コスト予測
    print("\n### Cost Forecast (Next 3 months) ###")
    forecast = get_cost_forecast(3)
    print(forecast.to_string())

    # RI 推奨
    print("\n### Reserved Instance Recommendations ###")
    ri_recs = get_ri_recommendations()
    if not ri_recs.empty:
        print(ri_recs.to_string())
    else:
        print("No RI recommendations available")

    # Savings Plans 推奨
    print("\n### Savings Plans Recommendations ###")
    sp_recs = get_savings_plans_recommendations()
    if not sp_recs.empty:
        print(sp_recs.to_string())
    else:
        print("No Savings Plans recommendations available")

    print("\n" + "=" * 60)

if __name__ == '__main__':
    generate_cost_report()
```

### Step 3: Compute Optimizer によるライトサイジング

```python
# analysis/compute_optimizer_analysis.py
"""
Compute Optimizer の推奨を分析し、最適化アクションを生成
"""
import boto3
import pandas as pd
from tabulate import tabulate

co_client = boto3.client('compute-optimizer')
ec2_client = boto3.client('ec2')

def get_ec2_recommendations():
    """
    EC2 インスタンスの最適化推奨を取得
    """
    response = co_client.get_ec2_instance_recommendations()

    recommendations = []
    for rec in response.get('instanceRecommendations', []):
        instance_arn = rec['instanceArn']
        instance_id = instance_arn.split('/')[-1]
        current_type = rec['currentInstanceType']
        finding = rec['finding']  # OVER_PROVISIONED, UNDER_PROVISIONED, OPTIMIZED

        # 推奨オプションの取得
        for option in rec.get('recommendationOptions', []):
            recommendations.append({
                'InstanceId': instance_id,
                'CurrentType': current_type,
                'Finding': finding,
                'RecommendedType': option.get('instanceType'),
                'PerformanceRisk': option.get('performanceRisk'),
                'EstimatedMonthlySavings': option.get('projectedUtilizationMetrics', [{}])[0].get('value', 'N/A'),
                'SavingsOpportunity': option.get('savingsOpportunity', {}).get('savingsOpportunityPercentage', 0)
            })

    return pd.DataFrame(recommendations)

def get_ebs_recommendations():
    """
    EBS ボリュームの最適化推奨を取得
    """
    response = co_client.get_ebs_volume_recommendations()

    recommendations = []
    for rec in response.get('volumeRecommendations', []):
        volume_arn = rec['volumeArn']
        volume_id = volume_arn.split('/')[-1]
        current_config = rec['currentConfiguration']
        finding = rec['finding']

        for option in rec.get('volumeRecommendationOptions', []):
            config = option.get('configuration', {})
            recommendations.append({
                'VolumeId': volume_id,
                'CurrentType': current_config.get('volumeType'),
                'CurrentSize': current_config.get('volumeSize'),
                'CurrentIOPS': current_config.get('volumeBaselineIOPS'),
                'Finding': finding,
                'RecommendedType': config.get('volumeType'),
                'RecommendedSize': config.get('volumeSize'),
                'RecommendedIOPS': config.get('volumeBaselineIOPS'),
                'SavingsOpportunity': option.get('savingsOpportunity', {}).get('savingsOpportunityPercentage', 0)
            })

    return pd.DataFrame(recommendations)

def get_lambda_recommendations():
    """
    Lambda 関数の最適化推奨を取得
    """
    response = co_client.get_lambda_function_recommendations()

    recommendations = []
    for rec in response.get('lambdaFunctionRecommendations', []):
        function_arn = rec['functionArn']
        function_name = function_arn.split(':')[-1]
        current_config = rec['currentMemorySize']
        finding = rec['finding']

        for option in rec.get('memorySizeRecommendationOptions', []):
            recommendations.append({
                'FunctionName': function_name,
                'CurrentMemory': current_config,
                'Finding': finding,
                'RecommendedMemory': option.get('memorySize'),
                'SavingsOpportunity': option.get('savingsOpportunity', {}).get('savingsOpportunityPercentage', 0)
            })

    return pd.DataFrame(recommendations)

def generate_rightsizing_report():
    """
    ライトサイジングレポートの生成
    """
    print("=" * 70)
    print("Compute Optimizer Right-sizing Report")
    print("=" * 70)

    # EC2 推奨
    print("\n### EC2 Instance Recommendations ###")
    ec2_recs = get_ec2_recommendations()
    if not ec2_recs.empty:
        over_provisioned = ec2_recs[ec2_recs['Finding'] == 'OVER_PROVISIONED']
        print(f"\nOver-provisioned instances: {len(over_provisioned)}")
        if not over_provisioned.empty:
            print(tabulate(
                over_provisioned[['InstanceId', 'CurrentType', 'RecommendedType', 'SavingsOpportunity']].head(10),
                headers='keys',
                tablefmt='grid'
            ))
    else:
        print("No EC2 recommendations available")

    # EBS 推奨
    print("\n### EBS Volume Recommendations ###")
    ebs_recs = get_ebs_recommendations()
    if not ebs_recs.empty:
        print(tabulate(
            ebs_recs[['VolumeId', 'CurrentType', 'RecommendedType', 'SavingsOpportunity']].head(10),
            headers='keys',
            tablefmt='grid'
        ))
    else:
        print("No EBS recommendations available")

    # Lambda 推奨
    print("\n### Lambda Function Recommendations ###")
    lambda_recs = get_lambda_recommendations()
    if not lambda_recs.empty:
        print(tabulate(
            lambda_recs[['FunctionName', 'CurrentMemory', 'RecommendedMemory', 'SavingsOpportunity']].head(10),
            headers='keys',
            tablefmt='grid'
        ))
    else:
        print("No Lambda recommendations available")

    print("\n" + "=" * 70)

if __name__ == '__main__':
    generate_rightsizing_report()
```

### Step 4: Trusted Advisor による未使用リソース検出

```python
# analysis/trusted_advisor_analysis.py
"""
Trusted Advisor のコスト最適化チェック結果を分析
"""
import boto3
import json

support_client = boto3.client('support', region_name='us-east-1')

def get_cost_optimization_checks():
    """
    コスト最適化カテゴリのチェック一覧を取得
    """
    response = support_client.describe_trusted_advisor_checks(language='en')

    cost_checks = []
    for check in response['checks']:
        if check['category'] == 'cost_optimizing':
            cost_checks.append({
                'id': check['id'],
                'name': check['name'],
                'description': check['description']
            })

    return cost_checks

def get_check_results(check_id):
    """
    特定のチェック結果を取得
    """
    response = support_client.describe_trusted_advisor_check_result(
        checkId=check_id,
        language='en'
    )

    return response['result']

def analyze_unused_resources():
    """
    未使用リソースの分析
    """
    checks = get_cost_optimization_checks()

    print("=" * 70)
    print("Trusted Advisor Cost Optimization Analysis")
    print("=" * 70)

    total_savings = 0

    for check in checks:
        result = get_check_results(check['id'])
        status = result.get('status', 'unknown')

        # 警告またはエラーがある場合のみ表示
        flagged_resources = result.get('flaggedResources', [])
        if flagged_resources:
            print(f"\n### {check['name']} ###")
            print(f"Status: {status}")
            print(f"Flagged Resources: {len(flagged_resources)}")

            # 最初の5件を表示
            for resource in flagged_resources[:5]:
                metadata = resource.get('metadata', [])
                if metadata:
                    print(f"  - {metadata}")

            # 推定節約額の抽出（チェックによって異なる）
            estimated_savings = result.get('categorySpecificSummary', {}).get('costOptimizing', {}).get('estimatedMonthlySavings', 0)
            if estimated_savings:
                print(f"Estimated Monthly Savings: ${estimated_savings}")
                total_savings += float(estimated_savings)

    print("\n" + "=" * 70)
    print(f"Total Estimated Monthly Savings: ${total_savings:,.2f}")
    print("=" * 70)

# 個別チェックの詳細分析関数

def analyze_idle_rds_instances():
    """
    アイドル状態の RDS インスタンスを検出
    """
    # Trusted Advisor の Idle RDS DB Instances チェック
    check_id = 'Ti39halfu'  # Idle RDS DB Instances

    try:
        result = get_check_results(check_id)
        flagged = result.get('flaggedResources', [])

        print("\n### Idle RDS Instances ###")
        for resource in flagged:
            metadata = resource.get('metadata', [])
            # metadata: [region, instance_id, multi_az, instance_type, storage_type, days_idle, estimated_savings]
            if len(metadata) >= 7:
                print(f"  Instance: {metadata[1]}")
                print(f"    Region: {metadata[0]}")
                print(f"    Type: {metadata[3]}")
                print(f"    Days Idle: {metadata[5]}")
                print(f"    Est. Monthly Savings: ${metadata[6]}")

    except Exception as e:
        print(f"Error: {e}")
        print("Note: This check requires Business or Enterprise Support plan")

def analyze_unassociated_eips():
    """
    未関連付けの Elastic IP を検出
    """
    # Trusted Advisor の Unassociated Elastic IP Addresses チェック
    check_id = 'Z4AUBRNSmz'

    try:
        result = get_check_results(check_id)
        flagged = result.get('flaggedResources', [])

        print("\n### Unassociated Elastic IPs ###")
        print(f"Total: {len(flagged)}")
        for resource in flagged:
            metadata = resource.get('metadata', [])
            # metadata: [region, ip_address]
            if len(metadata) >= 2:
                print(f"  EIP: {metadata[1]} (Region: {metadata[0]})")

    except Exception as e:
        print(f"Error: {e}")

def analyze_low_utilization_ec2():
    """
    低使用率 EC2 インスタンスを検出
    """
    # Trusted Advisor の Low Utilization Amazon EC2 Instances チェック
    check_id = 'Qch7DwouX1'

    try:
        result = get_check_results(check_id)
        flagged = result.get('flaggedResources', [])

        print("\n### Low Utilization EC2 Instances ###")
        print(f"Total: {len(flagged)}")
        for resource in flagged[:10]:
            metadata = resource.get('metadata', [])
            # metadata: [region, instance_id, instance_name, instance_type, estimated_savings, 14day_avg_cpu, 14day_avg_network_io]
            if len(metadata) >= 7:
                print(f"  Instance: {metadata[1]} ({metadata[2]})")
                print(f"    Type: {metadata[3]}")
                print(f"    14-day Avg CPU: {metadata[5]}%")
                print(f"    Est. Monthly Savings: ${metadata[4]}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    analyze_unused_resources()
```

### Step 5: AWS Budgets の設定

```bash
#!/bin/bash
# step5-setup-budgets.sh

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# 月次総コスト予算
echo "=== Creating Monthly Cost Budget ==="
aws budgets create-budget \
    --account-id $ACCOUNT_ID \
    --budget '{
        "BudgetName": "Monthly-Total-Cost",
        "BudgetLimit": {
            "Amount": "20000",
            "Unit": "USD"
        },
        "BudgetType": "COST",
        "TimeUnit": "MONTHLY",
        "CostFilters": {},
        "CostTypes": {
            "IncludeTax": true,
            "IncludeSubscription": true,
            "UseBlended": false,
            "IncludeRefund": false,
            "IncludeCredit": false,
            "IncludeUpfront": true,
            "IncludeRecurring": true,
            "IncludeOtherSubscription": true,
            "IncludeSupport": true,
            "IncludeDiscount": true,
            "UseAmortized": false
        }
    }' \
    --notifications-with-subscribers '[
        {
            "Notification": {
                "NotificationType": "FORECASTED",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": 80,
                "ThresholdType": "PERCENTAGE",
                "NotificationState": "ALARM"
            },
            "Subscribers": [
                {
                    "SubscriptionType": "EMAIL",
                    "Address": "finance@admetrics.example.com"
                },
                {
                    "SubscriptionType": "SNS",
                    "Address": "arn:aws:sns:ap-northeast-1:'$ACCOUNT_ID':cost-alerts"
                }
            ]
        },
        {
            "Notification": {
                "NotificationType": "ACTUAL",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": 100,
                "ThresholdType": "PERCENTAGE",
                "NotificationState": "ALARM"
            },
            "Subscribers": [
                {
                    "SubscriptionType": "EMAIL",
                    "Address": "engineering@admetrics.example.com"
                }
            ]
        }
    ]'

# EC2 サービス別予算
echo "=== Creating EC2 Service Budget ==="
aws budgets create-budget \
    --account-id $ACCOUNT_ID \
    --budget '{
        "BudgetName": "EC2-Monthly-Cost",
        "BudgetLimit": {
            "Amount": "8000",
            "Unit": "USD"
        },
        "BudgetType": "COST",
        "TimeUnit": "MONTHLY",
        "CostFilters": {
            "Service": ["Amazon Elastic Compute Cloud - Compute"]
        }
    }' \
    --notifications-with-subscribers '[
        {
            "Notification": {
                "NotificationType": "FORECASTED",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": 90,
                "ThresholdType": "PERCENTAGE"
            },
            "Subscribers": [
                {
                    "SubscriptionType": "EMAIL",
                    "Address": "platform-team@admetrics.example.com"
                }
            ]
        }
    ]'

# 開発環境予算（自動アクション付き）
echo "=== Creating Development Budget with Auto-Action ==="
aws budgets create-budget \
    --account-id $ACCOUNT_ID \
    --budget '{
        "BudgetName": "Development-Environment",
        "BudgetLimit": {
            "Amount": "3000",
            "Unit": "USD"
        },
        "BudgetType": "COST",
        "TimeUnit": "MONTHLY",
        "CostFilters": {
            "TagKeyValue": ["user:Environment$development"]
        }
    }' \
    --notifications-with-subscribers '[
        {
            "Notification": {
                "NotificationType": "ACTUAL",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": 100,
                "ThresholdType": "PERCENTAGE"
            },
            "Subscribers": [
                {
                    "SubscriptionType": "EMAIL",
                    "Address": "dev-team@admetrics.example.com"
                }
            ]
        }
    ]'

echo "Budgets created successfully"
aws budgets describe-budgets --account-id $ACCOUNT_ID --query 'Budgets[*].BudgetName'
```

### Step 6: 開発環境の自動停止 Lambda

```python
# automation/auto_stop_dev.py
"""
開発環境 EC2/RDS の自動停止 Lambda 関数
"""
import boto3
import os
from datetime import datetime
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ec2_client = boto3.client('ec2')
rds_client = boto3.client('rds')

# 環境変数
TARGET_TAG_KEY = os.environ.get('TARGET_TAG_KEY', 'Environment')
TARGET_TAG_VALUE = os.environ.get('TARGET_TAG_VALUE', 'development')
DRY_RUN = os.environ.get('DRY_RUN', 'false').lower() == 'true'

def lambda_handler(event, context):
    """
    開発環境リソースの自動停止
    """
    action = event.get('action', 'stop')  # 'stop' or 'start'

    logger.info(f"Action: {action}, DryRun: {DRY_RUN}")

    results = {
        'ec2': [],
        'rds': []
    }

    if action == 'stop':
        results['ec2'] = stop_development_ec2()
        results['rds'] = stop_development_rds()
    elif action == 'start':
        results['ec2'] = start_development_ec2()
        results['rds'] = start_development_rds()

    logger.info(f"Results: {results}")

    return {
        'statusCode': 200,
        'body': results
    }

def stop_development_ec2():
    """
    開発環境 EC2 インスタンスを停止
    """
    # AutoStop タグも確認
    filters = [
        {'Name': f'tag:{TARGET_TAG_KEY}', 'Values': [TARGET_TAG_VALUE]},
        {'Name': 'tag:AutoStop', 'Values': ['true']},
        {'Name': 'instance-state-name', 'Values': ['running']}
    ]

    response = ec2_client.describe_instances(Filters=filters)

    instance_ids = []
    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            instance_ids.append(instance['InstanceId'])

    if not instance_ids:
        logger.info("No running development EC2 instances found")
        return []

    logger.info(f"Stopping EC2 instances: {instance_ids}")

    if not DRY_RUN:
        ec2_client.stop_instances(InstanceIds=instance_ids)

    return instance_ids

def start_development_ec2():
    """
    開発環境 EC2 インスタンスを起動
    """
    filters = [
        {'Name': f'tag:{TARGET_TAG_KEY}', 'Values': [TARGET_TAG_VALUE]},
        {'Name': 'tag:AutoStop', 'Values': ['true']},
        {'Name': 'instance-state-name', 'Values': ['stopped']}
    ]

    response = ec2_client.describe_instances(Filters=filters)

    instance_ids = []
    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            instance_ids.append(instance['InstanceId'])

    if not instance_ids:
        logger.info("No stopped development EC2 instances found")
        return []

    logger.info(f"Starting EC2 instances: {instance_ids}")

    if not DRY_RUN:
        ec2_client.start_instances(InstanceIds=instance_ids)

    return instance_ids

def stop_development_rds():
    """
    開発環境 RDS インスタンスを停止
    """
    response = rds_client.describe_db_instances()

    stopped_instances = []
    for db in response['DBInstances']:
        # タグの確認
        arn = db['DBInstanceArn']
        tags = rds_client.list_tags_for_resource(ResourceName=arn)['TagList']

        is_dev = False
        is_auto_stop = False

        for tag in tags:
            if tag['Key'] == TARGET_TAG_KEY and tag['Value'] == TARGET_TAG_VALUE:
                is_dev = True
            if tag['Key'] == 'AutoStop' and tag['Value'] == 'true':
                is_auto_stop = True

        if is_dev and is_auto_stop and db['DBInstanceStatus'] == 'available':
            logger.info(f"Stopping RDS instance: {db['DBInstanceIdentifier']}")

            if not DRY_RUN:
                rds_client.stop_db_instance(
                    DBInstanceIdentifier=db['DBInstanceIdentifier']
                )

            stopped_instances.append(db['DBInstanceIdentifier'])

    return stopped_instances

def start_development_rds():
    """
    開発環境 RDS インスタンスを起動
    """
    response = rds_client.describe_db_instances()

    started_instances = []
    for db in response['DBInstances']:
        arn = db['DBInstanceArn']
        tags = rds_client.list_tags_for_resource(ResourceName=arn)['TagList']

        is_dev = False
        is_auto_stop = False

        for tag in tags:
            if tag['Key'] == TARGET_TAG_KEY and tag['Value'] == TARGET_TAG_VALUE:
                is_dev = True
            if tag['Key'] == 'AutoStop' and tag['Value'] == 'true':
                is_auto_stop = True

        if is_dev and is_auto_stop and db['DBInstanceStatus'] == 'stopped':
            logger.info(f"Starting RDS instance: {db['DBInstanceIdentifier']}")

            if not DRY_RUN:
                rds_client.start_db_instance(
                    DBInstanceIdentifier=db['DBInstanceIdentifier']
                )

            started_instances.append(db['DBInstanceIdentifier'])

    return started_instances
```

### Step 7: 未使用リソースの自動クリーンアップ

```python
# automation/cleanup_unused_resources.py
"""
未使用リソースの自動クリーンアップ Lambda 関数
"""
import boto3
from datetime import datetime, timedelta
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ec2_client = boto3.client('ec2')
elb_client = boto3.client('elbv2')

def lambda_handler(event, context):
    """
    未使用リソースのクリーンアップ
    """
    results = {
        'unattached_volumes': cleanup_unattached_volumes(),
        'unused_eips': cleanup_unused_eips(),
        'old_snapshots': cleanup_old_snapshots(),
        'incomplete_multipart': cleanup_incomplete_multipart_uploads()
    }

    logger.info(f"Cleanup results: {results}")

    return {
        'statusCode': 200,
        'body': results
    }

def cleanup_unattached_volumes():
    """
    未アタッチ EBS ボリュームの削除
    """
    # 30日以上未アタッチのボリュームを対象
    volumes = ec2_client.describe_volumes(
        Filters=[
            {'Name': 'status', 'Values': ['available']}
        ]
    )['Volumes']

    deleted_volumes = []
    skipped_volumes = []

    for volume in volumes:
        volume_id = volume['VolumeId']
        create_time = volume['CreateTime']

        # 30日以上前に作成されたものだけ対象
        if create_time < datetime.now(create_time.tzinfo) - timedelta(days=30):
            # DoNotDelete タグがある場合はスキップ
            tags = {t['Key']: t['Value'] for t in volume.get('Tags', [])}
            if tags.get('DoNotDelete', 'false').lower() == 'true':
                skipped_volumes.append(volume_id)
                continue

            logger.info(f"Deleting unattached volume: {volume_id}")

            try:
                # 削除前にスナップショットを作成
                snapshot = ec2_client.create_snapshot(
                    VolumeId=volume_id,
                    Description=f"Backup before cleanup - {volume_id}",
                    TagSpecifications=[{
                        'ResourceType': 'snapshot',
                        'Tags': [
                            {'Key': 'CreatedBy', 'Value': 'CostOptimizationCleanup'},
                            {'Key': 'OriginalVolumeId', 'Value': volume_id}
                        ]
                    }]
                )
                logger.info(f"Created backup snapshot: {snapshot['SnapshotId']}")

                # ボリューム削除
                ec2_client.delete_volume(VolumeId=volume_id)
                deleted_volumes.append(volume_id)

            except Exception as e:
                logger.error(f"Error deleting volume {volume_id}: {e}")

    return {
        'deleted': deleted_volumes,
        'skipped': skipped_volumes
    }

def cleanup_unused_eips():
    """
    未関連付け Elastic IP の解放
    """
    addresses = ec2_client.describe_addresses()['Addresses']

    released_eips = []

    for address in addresses:
        # AssociationId がない = 未関連付け
        if 'AssociationId' not in address:
            allocation_id = address.get('AllocationId')
            public_ip = address.get('PublicIp')

            # DoNotDelete タグがある場合はスキップ
            tags = {t['Key']: t['Value'] for t in address.get('Tags', [])}
            if tags.get('DoNotDelete', 'false').lower() == 'true':
                continue

            logger.info(f"Releasing unused EIP: {public_ip}")

            try:
                ec2_client.release_address(AllocationId=allocation_id)
                released_eips.append(public_ip)
            except Exception as e:
                logger.error(f"Error releasing EIP {public_ip}: {e}")

    return released_eips

def cleanup_old_snapshots():
    """
    古いスナップショットの削除（90日以上前）
    """
    account_id = boto3.client('sts').get_caller_identity()['Account']

    snapshots = ec2_client.describe_snapshots(
        OwnerIds=[account_id]
    )['Snapshots']

    deleted_snapshots = []
    threshold_date = datetime.now() - timedelta(days=90)

    for snapshot in snapshots:
        snapshot_id = snapshot['SnapshotId']
        start_time = snapshot['StartTime']

        if start_time.replace(tzinfo=None) < threshold_date:
            # 保護タグの確認
            tags = {t['Key']: t['Value'] for t in snapshot.get('Tags', [])}

            # AMI に関連付けられているスナップショットはスキップ
            if tags.get('aws:backup:source-resource'):
                continue
            if tags.get('DoNotDelete', 'false').lower() == 'true':
                continue

            logger.info(f"Deleting old snapshot: {snapshot_id}")

            try:
                ec2_client.delete_snapshot(SnapshotId=snapshot_id)
                deleted_snapshots.append(snapshot_id)
            except Exception as e:
                # AMI に関連付けられている場合はエラーになる
                logger.warning(f"Could not delete snapshot {snapshot_id}: {e}")

    return deleted_snapshots

def cleanup_incomplete_multipart_uploads():
    """
    未完了のマルチパートアップロードを削除
    """
    s3_client = boto3.client('s3')

    # すべてのバケットをリストアップ
    buckets = s3_client.list_buckets()['Buckets']

    cleaned_uploads = []

    for bucket in buckets:
        bucket_name = bucket['Name']

        try:
            # マルチパートアップロードをリストアップ
            uploads = s3_client.list_multipart_uploads(Bucket=bucket_name)

            for upload in uploads.get('Uploads', []):
                upload_id = upload['UploadId']
                key = upload['Key']
                initiated = upload['Initiated']

                # 7日以上前の未完了アップロードを削除
                if initiated < datetime.now(initiated.tzinfo) - timedelta(days=7):
                    logger.info(f"Aborting multipart upload: {bucket_name}/{key}")

                    s3_client.abort_multipart_upload(
                        Bucket=bucket_name,
                        Key=key,
                        UploadId=upload_id
                    )
                    cleaned_uploads.append(f"{bucket_name}/{key}")

        except Exception as e:
            logger.warning(f"Error processing bucket {bucket_name}: {e}")

    return cleaned_uploads
```

### Step 8: コスト最適化ダッシュボード（QuickSight）

```sql
-- CUR データを Athena でクエリするための SQL 例

-- 1. サービス別月次コスト
SELECT
    bill_billing_period_start_date as billing_month,
    line_item_product_code as service,
    SUM(line_item_blended_cost) as total_cost
FROM
    cost_and_usage_report
WHERE
    bill_billing_period_start_date >= date_add('month', -6, current_date)
GROUP BY
    bill_billing_period_start_date,
    line_item_product_code
ORDER BY
    billing_month DESC,
    total_cost DESC;

-- 2. 環境別コスト
SELECT
    bill_billing_period_start_date as billing_month,
    COALESCE(resource_tags_user_environment, 'Untagged') as environment,
    SUM(line_item_blended_cost) as total_cost
FROM
    cost_and_usage_report
WHERE
    bill_billing_period_start_date >= date_add('month', -3, current_date)
GROUP BY
    bill_billing_period_start_date,
    resource_tags_user_environment
ORDER BY
    billing_month DESC,
    total_cost DESC;

-- 3. EC2 インスタンスタイプ別コスト
SELECT
    product_instance_type,
    COUNT(DISTINCT line_item_resource_id) as instance_count,
    SUM(line_item_blended_cost) as total_cost,
    SUM(line_item_usage_amount) as total_hours
FROM
    cost_and_usage_report
WHERE
    line_item_product_code = 'AmazonEC2'
    AND line_item_usage_type LIKE '%BoxUsage%'
    AND bill_billing_period_start_date = date_trunc('month', current_date)
GROUP BY
    product_instance_type
ORDER BY
    total_cost DESC;

-- 4. 未タグ付けリソースのコスト
SELECT
    line_item_product_code as service,
    line_item_resource_id as resource_id,
    SUM(line_item_blended_cost) as total_cost
FROM
    cost_and_usage_report
WHERE
    resource_tags_user_environment IS NULL
    AND resource_tags_user_project IS NULL
    AND bill_billing_period_start_date = date_trunc('month', current_date)
    AND line_item_blended_cost > 0
GROUP BY
    line_item_product_code,
    line_item_resource_id
ORDER BY
    total_cost DESC
LIMIT 50;

-- 5. データ転送コスト分析
SELECT
    line_item_usage_type,
    product_from_location,
    product_to_location,
    SUM(line_item_blended_cost) as total_cost,
    SUM(line_item_usage_amount) as total_gb
FROM
    cost_and_usage_report
WHERE
    line_item_product_code = 'AWSDataTransfer'
    AND bill_billing_period_start_date = date_trunc('month', current_date)
GROUP BY
    line_item_usage_type,
    product_from_location,
    product_to_location
ORDER BY
    total_cost DESC;
```

---

## 8. トラブルシューティング課題

### 課題1: Cost Explorer のデータが表示されない

**症状**:
```
Cost Explorer を開いたが、コストデータが表示されない。
「Data is not available」というメッセージが表示される。
```

**調査コマンド**:
```bash
# Cost Explorer の有効化状態確認
aws ce get-cost-and-usage \
    --time-period Start=2024-01-01,End=2024-01-31 \
    --granularity MONTHLY \
    --metrics "BlendedCost"

# IAM 権限の確認
aws iam get-user
aws iam list-attached-user-policies --user-name YOUR_USER_NAME
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: 複数の原因が考えられる

**パターン1: Cost Explorer が有効化されていない**
```bash
# Cost Explorer は Billing コンソールで有効化が必要
# AWS マネジメントコンソール → Billing → Cost Explorer → Enable Cost Explorer

# 有効化後、データが表示されるまで24時間かかる場合がある
```

**パターン2: IAM 権限不足**
```bash
# 必要な権限
# - ce:GetCostAndUsage
# - ce:GetCostForecast
# - ce:GetReservationPurchaseRecommendation

# IAM ポリシーの例
aws iam attach-user-policy \
    --user-name YOUR_USER_NAME \
    --policy-arn arn:aws:iam::aws:policy/AWSBillingReadOnlyAccess
```

**パターン3: 組織アカウントでのアクセス制限**
```bash
# Organizations を使用している場合、
# 管理アカウントで以下を有効化する必要がある：
# - IAM User and Role Access to Billing Information

# AWS Organizations → Policies → Service Control Policies
# Billing へのアクセスを許可する SCP が必要
```

**パターン4: リージョン設定**
```bash
# Cost Explorer は us-east-1 リージョンで API を呼び出す
aws ce get-cost-and-usage \
    --region us-east-1 \
    --time-period Start=2024-01-01,End=2024-01-31 \
    --granularity MONTHLY \
    --metrics "BlendedCost"
```
</details>

### 課題2: Compute Optimizer の推奨が表示されない

**症状**:
```
Compute Optimizer を有効化したが、EC2 インスタンスの推奨が
「推奨なし」と表示される。
```

**調査コマンド**:
```bash
# Compute Optimizer の状態確認
aws compute-optimizer get-enrollment-status

# EC2 インスタンスの推奨取得
aws compute-optimizer get-ec2-instance-recommendations \
    --query 'instanceRecommendations[*].[instanceArn,finding,findingReasonCodes]' \
    --output table
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: データ収集期間が不足している

**解決手順**:
```bash
# 1. Compute Optimizer は最低14日間のデータが必要
# 新規インスタンスの場合は14日待つ必要がある

# 2. CloudWatch Agent がインストールされているか確認
# メモリメトリクスの収集には Agent が必要
aws ssm describe-instance-information \
    --query 'InstanceInformationList[*].[InstanceId,PingStatus]' \
    --output table

# 3. 詳細モニタリングの有効化（オプション）
aws ec2 monitor-instances --instance-ids i-1234567890abcdef0

# 4. インスタンスの状態確認
# 停止中のインスタンスは分析対象外
aws ec2 describe-instances \
    --query 'Reservations[*].Instances[*].[InstanceId,State.Name]' \
    --output table

# 5. Finding Reason Codes の確認
aws compute-optimizer get-ec2-instance-recommendations \
    --query 'instanceRecommendations[?finding==`NotOptimized`].[instanceArn,findingReasonCodes]'

# 主な Reason Codes:
# - CPUOverprovisioned: CPU が過剰プロビジョニング
# - MemoryOverprovisioned: メモリが過剰（Agent 必要）
# - EBSThroughputOverprovisioned: EBS スループットが過剰
```
</details>

### 課題3: Budget アラートが送信されない

**症状**:
```
AWS Budget で予算を設定し、閾値を超えたはずだが、
通知メールが届かない。
```

**調査コマンド**:
```bash
# Budget の設定確認
aws budgets describe-budget \
    --account-id $(aws sts get-caller-identity --query Account --output text) \
    --budget-name "Monthly-Total-Cost"

# 通知設定の確認
aws budgets describe-notifications-for-budget \
    --account-id $(aws sts get-caller-identity --query Account --output text) \
    --budget-name "Monthly-Total-Cost"
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: 複数の原因が考えられる

**パターン1: メールアドレスの確認が未完了**
```bash
# SNS サブスクリプションの場合、確認メールのリンクをクリックする必要がある
aws sns list-subscriptions-by-topic \
    --topic-arn arn:aws:sns:REGION:ACCOUNT_ID:cost-alerts
```

**パターン2: 閾値の設定ミス**
```bash
# FORECASTED vs ACTUAL の違い
# - FORECASTED: 予測値が閾値を超えた場合
# - ACTUAL: 実際のコストが閾値を超えた場合

# 確認
aws budgets describe-notifications-for-budget \
    --account-id $(aws sts get-caller-identity --query Account --output text) \
    --budget-name "Monthly-Total-Cost" \
    --query 'Notifications[*].[NotificationType,Threshold,ThresholdType]'
```

**パターン3: SNS トピックの権限**
```bash
# Budget から SNS へのパブリッシュ権限を確認
aws sns get-topic-attributes \
    --topic-arn arn:aws:sns:REGION:ACCOUNT_ID:cost-alerts \
    --query 'Attributes.Policy'

# 必要な権限を付与
aws sns set-topic-attributes \
    --topic-arn arn:aws:sns:REGION:ACCOUNT_ID:cost-alerts \
    --attribute-name Policy \
    --attribute-value '{
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "budgets.amazonaws.com"},
            "Action": "SNS:Publish",
            "Resource": "arn:aws:sns:REGION:ACCOUNT_ID:cost-alerts"
        }]
    }'
```

**パターン4: Budget アラートの遅延**
```bash
# Budget アラートは最大24時間の遅延がある場合がある
# Cost Explorer のデータ更新タイミングに依存

# テスト用に低い閾値で Budget を作成
aws budgets create-budget \
    --account-id $(aws sts get-caller-identity --query Account --output text) \
    --budget '{
        "BudgetName": "Test-Alert",
        "BudgetLimit": {"Amount": "1", "Unit": "USD"},
        "BudgetType": "COST",
        "TimeUnit": "MONTHLY"
    }' \
    --notifications-with-subscribers '[{
        "Notification": {
            "NotificationType": "ACTUAL",
            "ComparisonOperator": "GREATER_THAN",
            "Threshold": 1,
            "ThresholdType": "ABSOLUTE_VALUE"
        },
        "Subscribers": [{
            "SubscriptionType": "EMAIL",
            "Address": "your-email@example.com"
        }]
    }]'
```
</details>

---

## 9. 設計課題

### 設計課題: エンタープライズ規模のコストガバナンス体制

**シナリオ**:
AdMetrics社は急成長に伴い、AWS アカウントが10個に増加しました。
全社的なコストガバナンス体制を設計してください。

**現状**:
```
- 10 AWS アカウント（本番、開発、テスト、各チーム用など）
- 月額総コスト：1,500万円
- コスト可視性：各アカウント個別管理
- 購入オプション：未活用
```

**要件**:
```
1. ガバナンス要件
   - 全アカウントのコスト一元管理
   - 部門・プロジェクト別のコスト配分
   - 予算超過の自動検知・対応
   - 月次レポートの自動生成

2. 最適化要件
   - 全アカウント合計で20%コスト削減
   - Savings Plans の組織レベル活用
   - 未使用リソースの自動検出・削除

3. セキュリティ要件
   - コスト情報へのアクセス制御
   - 高額リソース作成の承認フロー
   - 監査ログの保持
```

**設計すべき項目**:
```
1. Organizations 設計（OU 構造）
2. コスト配分タグ戦略
3. Budget・アラート設計
4. 自動化・レポート設計
```

<details>
<summary>設計例を見る</summary>

### エンタープライズコストガバナンスアーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         AWS Organizations 構造                                           │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         Management Account (Root)                                 │   │
│  │                                                                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │   │
│  │  │ Consolidated    │  │ Organization    │  │ Cost Explorer   │                  │   │
│  │  │ Billing         │  │ Policies (SCP)  │  │ (Central)       │                  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                    Security OU                                                    │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │ Security Account                                                         │    │   │
│  │  │ - CloudTrail Organization Trail                                         │    │   │
│  │  │ - Config Aggregator                                                     │    │   │
│  │  │ - Cost and Usage Report (CUR)                                           │    │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐               │
│  │         Workloads OU           │  │       Sandbox OU               │               │
│  │                                 │  │                                │               │
│  │  ┌───────────┐ ┌───────────┐  │  │  ┌───────────┐ ┌───────────┐  │               │
│  │  │Production │ │ Staging   │  │  │  │Development│ │   Test    │  │               │
│  │  │  Account  │ │  Account  │  │  │  │  Account  │ │  Account  │  │               │
│  │  │           │ │           │  │  │  │ (Budget   │ │ (Budget   │  │               │
│  │  │ No Budget │ │ Budget    │  │  │  │  Limited) │ │  Limited) │  │               │
│  │  │  Limit    │ │ Tracked   │  │  │  │           │ │           │  │               │
│  │  └───────────┘ └───────────┘  │  │  └───────────┘ └───────────┘  │               │
│  └────────────────────────────────┘  └────────────────────────────────┘               │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         Team Accounts OU                                          │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐         │   │
│  │  │ Platform  │ │ Backend   │ │   Data    │ │ Frontend  │ │    ML     │         │   │
│  │  │   Team    │ │   Team    │ │   Team    │ │   Team    │ │   Team    │         │   │
│  │  │ (Budget:  │ │ (Budget:  │ │ (Budget:  │ │ (Budget:  │ │ (Budget:  │         │   │
│  │  │  200万円) │ │  300万円) │ │  400万円) │ │  150万円) │ │  250万円) │         │   │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘         │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### コスト配分タグ戦略

```yaml
tagging_strategy:
  # 必須タグ（SCP で強制）
  mandatory_tags:
    - key: Environment
      allowed_values: [production, staging, development, test, sandbox]
      enforcement: deny_if_missing

    - key: CostCenter
      allowed_values: [platform, backend, data, frontend, ml, shared]
      enforcement: deny_if_missing

    - key: Project
      description: プロジェクトコード（自由入力）
      enforcement: report_if_missing

    - key: Owner
      description: リソース所有者のメールアドレス
      enforcement: report_if_missing

  # 自動タグ付け
  auto_tagging:
    - source: IAM User/Role
      target_tag: CreatedBy
    - source: AWS Service Catalog
      target_tag: ProvisionedProduct

  # コストカテゴリ（Cost Categories）
  cost_categories:
    - name: BusinessUnit
      rules:
        - value: Engineering
          match: CostCenter IN [platform, backend, data, frontend, ml]
        - value: Operations
          match: CostCenter = shared

    - name: Environment
      rules:
        - value: Production
          match: Environment = production
        - value: Non-Production
          match: Environment IN [staging, development, test]
        - value: Sandbox
          match: Environment = sandbox
```

### Budget 階層設計

```yaml
budget_hierarchy:
  # 組織全体予算
  organization_level:
    - name: Total-Monthly-Cost
      amount: 10000000  # 1,000万円
      alerts:
        - threshold: 80%
          type: forecasted
          action: notify_cfo
        - threshold: 100%
          type: actual
          action: [notify_all_managers, create_incident]

  # OU レベル予算
  ou_level:
    workloads:
      amount: 7000000  # 700万円
      alerts:
        - threshold: 90%
          action: notify_platform_manager

    sandbox:
      amount: 1500000  # 150万円
      alerts:
        - threshold: 100%
          action: auto_stop_non_essential

  # アカウントレベル予算
  account_level:
    per_team_account:
      amount: varies_by_team
      alerts:
        - threshold: 80%
          action: notify_team_lead
        - threshold: 100%
          action: [notify_team_lead, restrict_ec2_launch]

  # 自動アクション
  budget_actions:
    - trigger: sandbox_over_budget
      action:
        type: lambda
        function: stop_non_production_resources

    - trigger: team_over_budget
      action:
        type: scp_attach
        policy: DenyEC2Launch
```

### 推定コスト削減効果

| 最適化施策 | 対象 | 削減見込み |
|-----------|------|-----------|
| Savings Plans (組織レベル) | EC2/Fargate | 150万円 (20%) |
| 開発環境スケジューリング | Dev/Test | 50万円 |
| ライトサイジング | 全アカウント | 50万円 |
| 未使用リソース削除 | 全アカウント | 30万円 |
| データ転送最適化 | 全アカウント | 20万円 |
| **合計** | | **300万円 (20%)** |

</details>

---

## 10. 発展課題

### 発展課題1: FinOps プラクティスの導入（難易度：上級）

**課題内容**:
FinOps Foundation のフレームワークに基づき、組織的なクラウドコスト管理プラクティスを導入してください。

**要件**:
- Inform（情報提供）: リアルタイムコスト可視化
- Optimize（最適化）: 継続的な最適化サイクル
- Operate（運用）: コスト責任の分散

### 発展課題2: 機械学習によるコスト予測（難易度：上級）

**課題内容**:
Amazon Forecast を使用して、より精度の高いコスト予測モデルを構築してください。

**要件**:
- CUR データを使用した予測モデル
- 季節性・イベント要因の考慮
- 異常検知の実装

### 発展課題3: マルチクラウドコスト管理（難易度：中級）

**課題内容**:
AWS + GCP のマルチクラウド環境でのコスト統合管理ダッシュボードを構築してください。

**要件**:
- 両クラウドのコストデータ統合
- 統一されたタグ体系
- 比較分析ダッシュボード

---

## 11. 振り返りと次のステップ

### 学習のまとめ

```
本課題で学んだこと:
□ Cost Explorer によるコスト分析と予測
□ Compute Optimizer によるライトサイジング
□ Trusted Advisor による未使用リソース検出
□ AWS Budgets によるコスト管理とアラート
□ コスト配分タグの設計と実装
□ 自動化によるコスト最適化

GCP との主な違い:
- AWS は購入オプションが豊富（RI, SP, Spot）
- タグベースのコスト配分がより詳細
- CUR による詳細なコストデータ分析が可能
- Trusted Advisor は Business Support 以上で本領発揮
```

### GCP経験者向けポイント

| 観点 | GCP | AWS | 移行時の注意 |
|------|-----|-----|-------------|
| コスト分析 | Billing Reports | Cost Explorer | UIとクエリ方法が異なる |
| コミットメント | CUD | RI / Savings Plans | AWSはより柔軟なオプション |
| スポット | Preemptible/Spot VM | Spot Instances | 中断通知の仕組みが異なる |
| 推奨 | Recommender | Compute Optimizer | カバー範囲が異なる |
| 予算管理 | Budget Alerts | AWS Budgets | アクション機能がAWSは豊富 |

### 推奨される次のステップ

```
1. AWS Certified Cloud Practitioner の学習
   - コスト管理の基礎を体系的に理解

2. FinOps Foundation 認定の取得
   - クラウドコスト管理のベストプラクティス

3. 実環境での最適化実施
   - 本課題の手法を実際の環境に適用
   - 効果測定と継続的改善

4. 関連課題への挑戦
   - 課題28: オブザーバビリティ（コストとパフォーマンスの相関）
   - 課題30: 統合課題（コスト効率の良いアーキテクチャ設計）
```

---

## 12. 推定コストと注意事項

### 本課題の推定コスト

| サービス | 使用量 | 推定コスト（演習時） |
|----------|--------|---------------------|
| Cost Explorer | 分析 | 無料 |
| Compute Optimizer | 分析 | 無料 |
| Trusted Advisor | 基本 | 無料（Business以上は別途） |
| AWS Budgets | 予算設定 | 無料（最初の2つ） |
| Lambda | 自動化 | < $1 |
| S3 (CUR) | 保存 | < $1 |
| **合計** | | **< $5** |

### コスト最適化の ROI 計算

```
本課題での学習投資:
- 所要時間: 4-5時間
- AWSコスト: ~$5
- 合計コスト: 約 $50（時間コスト含む）

期待される効果（AdMetrics のケース）:
- 月額削減額: 90万円（30%削減）
- 年間削減額: 1,080万円
- ROI: 21,600倍
```

### 注意事項

```
⚠️ Reserved Instances / Savings Plans 購入
- 1年/3年のコミットメントが必要
- 購入前に十分な使用量分析を実施
- 返金不可のため慎重に判断

⚠️ 自動停止・削除の実装
- 本番環境への適用は慎重に
- DRY_RUN モードでの十分なテスト
- 保護タグ（DoNotDelete）の活用

⚠️ Trusted Advisor の制限
- 基本サポートでは一部チェックのみ
- 全機能利用には Business Support 以上が必要
```

---

**課題作成日**: 2024年1月
**最終更新日**: 2024年1月
**作成者**: AWS学習プログラム
