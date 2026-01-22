# 課題19: ヘルスケア企業のセキュリティ監視基盤構築

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | セキュリティ・コンプライアンス |
| 処理タイプ | リアルタイム |
| 使用IaC | CloudFormation |
| 想定所要時間 | 5-6時間 |

---

## 2. ビジネスシナリオ

### 企業プロファイル
- **企業名**: MedSecure株式会社
- **業種**: 医療データ管理・分析プラットフォーム
- **規模**: 従業員150名、エンジニア25名
- **データ規模**: 患者データ100万件、月間API呼び出し5000万回
- **現状インフラ**: AWS上でマルチアカウント環境を運用

### 現状の課題
MedSecure株式会社は、複数の医療機関から患者データを預かり、AIによる診断支援サービスを提供しています。しかし、以下の問題を抱えています：

1. **セキュリティ可視性の欠如**
   - 複数AWSアカウントのセキュリティ状態が一元管理されていない
   - 脅威検知が手動で、発見が遅れがち
   - セキュリティイベントの対応が属人化

2. **コンプライアンス対応の負荷**
   - HIPAA準拠の証跡管理が煩雑
   - 監査対応に毎回1ヶ月以上かかる
   - セキュリティベースラインの維持が困難

3. **インシデント対応の遅延**
   - 異常検知から対応まで平均4時間
   - 夜間・休日の対応体制が不十分
   - 対応手順が標準化されていない

### ビジネス要件
```
機能要件:
- マルチアカウントのセキュリティ統合監視
- 脅威の自動検知と重要度分類
- セキュリティイベントの自動対応
- コンプライアンスダッシュボードの構築

非機能要件:
- 脅威検知から通知まで5分以内
- 重大インシデントの自動隔離（15分以内）
- 99.9%の監視システム稼働率
- 監査証跡の13ヶ月保持
```

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 平均検知時間（MTTD） | 4時間 | 5分 |
| 平均対応時間（MTTR） | 8時間 | 30分 |
| セキュリティ検出カバー率 | 40% | 95% |
| コンプライアンススコア | 65% | 95% |
| 自動対応率 | 0% | 80% |

---

## 3. 学習目標

### 本課題で習得するスキル

```
1. セキュリティ監視（理解度：詳細）
   - GuardDutyによる脅威検知の設定
   - Security Hubによるセキュリティ統合管理
   - マルチアカウントセキュリティ集約

2. 自動対応システム（理解度：実装）
   - EventBridgeによるイベントルーティング
   - Lambdaによる自動修復アクション
   - Step Functionsによるワークフロー自動化

3. コンプライアンス管理（理解度：基礎）
   - AWS Configによる構成評価
   - カスタムセキュリティ基準の実装
   - 監査レポートの自動生成
```

### GCPエンジニア向け補足
```
GCP → AWS マッピング:
- Security Command Center → Security Hub
- Event Threat Detection → GuardDuty
- Cloud Functions → Lambda
- Eventarc → EventBridge
- Organization Policy → AWS Config Rules

主な違い:
1. Security Hub: 複数のセキュリティサービスを統合し、
   統一されたセキュリティビューを提供（SCCに近いが、
   より多くのサードパーティ統合が可能）

2. GuardDuty: ML ベースの脅威検知に特化
   （GCPのEvent Threat Detectionより広範な検知パターン）

3. EventBridge: イベント駆動アーキテクチャの中核
   （Eventarcより柔軟なルーティングとフィルタリング）
```

---

## 4. 使用するAWSサービス

### メインサービス
| サービス | 役割 | 使用機能 |
|----------|------|----------|
| **Amazon GuardDuty** | 脅威検知 | ML検知、マルウェア保護、Kubernetes監査 |
| **AWS Security Hub** | 統合管理 | セキュリティ基準、検出結果集約 |
| **Amazon EventBridge** | イベント処理 | ルール、パターンマッチング |
| **AWS Lambda** | 自動対応 | 修復アクション、通知 |

### サポートサービス
| サービス | 用途 |
|----------|------|
| **AWS Config** | 構成評価、コンプライアンスチェック |
| **AWS Organizations** | マルチアカウント管理 |
| **Amazon SNS** | 通知配信 |
| **AWS Step Functions** | ワークフロー自動化 |
| **Amazon S3** | 証跡・レポート保存 |
| **AWS CloudTrail** | API監査ログ |
| **Amazon CloudWatch** | メトリクス・ログ監視 |

### アーキテクチャ図

```mermaid
architecture-beta
    group org(cloud)[AWS Organizations]

    group security_acct(server)[Security Account 集約] in org
    group prod_acct(server)[Production Account] in org
    group dev_acct(server)[Development Account] in org
    group stg_acct(server)[Staging Account] in org

    service sechub(server)[Security Hub Admin] in security_acct
    service guardduty_admin(server)[GuardDuty Delegated Admin] in security_acct
    service config_agg(server)[AWS Config Aggregator] in security_acct
    service eventbridge(server)[EventBridge Central] in security_acct
    service lambda_remediate(server)[Lambda Remediate] in security_acct
    service stepfunctions(server)[Step Functions] in security_acct
    service sns(server)[SNS Notify] in security_acct
    service s3_trail(disk)[S3 証跡保存] in security_acct
    service slack(internet)[Slack PagerDuty] in security_acct

    service prod_guardduty(server)[GuardDuty Member] in prod_acct
    service prod_config(server)[Config Member] in prod_acct

    service dev_guardduty(server)[GuardDuty Member] in dev_acct
    service dev_config(server)[Config Member] in dev_acct

    service stg_guardduty(server)[GuardDuty Member] in stg_acct
    service stg_config(server)[Config Member] in stg_acct

    guardduty_admin:L --> R:sechub
    config_agg:L --> R:sechub
    sechub:B --> T:eventbridge
    eventbridge:B --> T:lambda_remediate
    eventbridge:B --> T:stepfunctions
    eventbridge:B --> T:sns
    stepfunctions:B --> T:s3_trail
    sns:B --> T:slack

    prod_guardduty:T --> B:guardduty_admin
    prod_config:T --> B:config_agg
    dev_guardduty:T --> B:guardduty_admin
    dev_config:T --> B:config_agg
    stg_guardduty:T --> B:guardduty_admin
    stg_config:T --> B:config_agg
```

---

## 5. 前提条件と事前準備

### 必要な環境
```bash
# AWS CLI v2
aws --version  # 2.x以上

# Python 3.9以上
python3 --version

# Terraform（オプション）
terraform --version  # 1.5以上

# jq（JSON処理）
jq --version
```

### AWSアカウント要件
```
- AWS Organizations が有効化されていること
- Security Account（セキュリティ集約用）が作成済み
- 複数のメンバーアカウント（本演習では最低2つ）
- IAM権限：OrganizationsFullAccess, SecurityHubFullAccess,
  GuardDutyFullAccess, ConfigFullAccess, Lambda管理者
```

### 事前準備スクリプト
```bash
#!/bin/bash
# setup-security-baseline.sh

# 変数設定
SECURITY_ACCOUNT_ID="111111111111"  # セキュリティアカウントID
PRODUCTION_ACCOUNT_ID="222222222222"  # 本番アカウントID
REGION="ap-northeast-1"

# ディレクトリ構造の作成
mkdir -p medsecure-security/{terraform,lambda,config-rules,dashboards}
cd medsecure-security

# 必要なIAMロールの確認
echo "Checking IAM permissions..."
aws sts get-caller-identity

# Organizations の確認
echo "Checking Organizations..."
aws organizations describe-organization

# 既存のSecurity Hub状態確認
echo "Checking Security Hub status..."
aws securityhub describe-hub --region $REGION 2>/dev/null || echo "Security Hub not enabled"

# 既存のGuardDuty状態確認
echo "Checking GuardDuty status..."
aws guardduty list-detectors --region $REGION
```

---

## 6. アーキテクチャ設計

### セキュリティ検知フロー設計
```yaml
# security-detection-flow.yaml
detection_sources:
  guardduty:
    enabled_features:
      - EC2_MALWARE_PROTECTION
      - S3_DATA_EVENTS
      - EKS_AUDIT_LOGS
      - RDS_LOGIN_EVENTS
      - LAMBDA_NETWORK_LOGS
    finding_types:
      critical:
        - "Trojan:*"
        - "CryptoCurrency:*"
        - "UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration*"
      high:
        - "Recon:*"
        - "Persistence:*"
        - "PrivilegeEscalation:*"
      medium:
        - "Policy:*"
        - "Stealth:*"

  security_hub:
    standards:
      - AWS-Foundational-Security-Best-Practices
      - CIS-AWS-Foundations-Benchmark
      - HIPAA  # カスタム基準
    aggregation:
      - CRITICAL findings → Immediate response
      - HIGH findings → 1-hour response
      - MEDIUM findings → 24-hour review

  config:
    managed_rules:
      - s3-bucket-public-read-prohibited
      - ec2-instance-no-public-ip
      - encrypted-volumes
      - rds-storage-encrypted
    custom_rules:
      - hipaa-phi-encryption-check
      - patient-data-access-logging
```

### 自動対応マトリックス
```yaml
# auto-remediation-matrix.yaml
remediation_actions:
  # GuardDuty findings
  "UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration":
    severity: CRITICAL
    auto_response: true
    actions:
      - isolate_instance
      - revoke_credentials
      - create_forensic_snapshot
      - notify_security_team
    escalation: immediate

  "Policy:S3/BucketPublicAccessGranted":
    severity: HIGH
    auto_response: true
    actions:
      - block_public_access
      - notify_data_owner
    escalation: 1_hour

  "Recon:EC2/PortProbeUnprotectedPort":
    severity: MEDIUM
    auto_response: false
    actions:
      - log_event
      - notify_security_team
    escalation: 24_hours

  # Config compliance
  "s3-bucket-server-side-encryption-enabled":
    auto_response: true
    actions:
      - enable_default_encryption
      - notify_bucket_owner

  "ec2-instance-no-public-ip":
    auto_response: false  # 要確認
    actions:
      - create_ticket
      - notify_account_owner
```

---

## 8. トラブルシューティング課題

### 課題1: GuardDuty の検出結果が Security Hub に表示されない

**症状**:
```
GuardDuty で脅威が検出されているが、Security Hub のダッシュボードに
表示されない。EventBridge ルールもトリガーされていない。
```

**調査コマンド**:
```bash
# GuardDuty の検出結果確認
aws guardduty list-findings --detector-id YOUR_DETECTOR_ID

# Security Hub の製品統合状態確認
aws securityhub list-enabled-products-for-import

# EventBridge ルールの状態確認
aws events describe-rule --name guardduty-findings-production
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: Security Hub と GuardDuty の製品統合が有効化されていない

**解決手順**:
```bash
# 1. Security Hub で GuardDuty 統合を有効化
aws securityhub enable-import-findings-for-product \
    --product-arn "arn:aws:securityhub:ap-northeast-1::product/aws/guardduty"

# 2. 統合が有効になったことを確認
aws securityhub list-enabled-products-for-import

# 3. GuardDuty の Finding を手動で Security Hub にプッシュ（テスト）
aws securityhub batch-import-findings --findings '[{
    "SchemaVersion": "2018-10-08",
    "Id": "test-finding-001",
    "ProductArn": "arn:aws:securityhub:ap-northeast-1::product/aws/guardduty",
    "GeneratorId": "test-generator",
    "AwsAccountId": "123456789012",
    "Types": ["Software and Configuration Checks/Vulnerabilities"],
    "CreatedAt": "2024-01-15T00:00:00.000Z",
    "UpdatedAt": "2024-01-15T00:00:00.000Z",
    "Severity": {"Label": "HIGH"},
    "Title": "Test Finding",
    "Description": "Test finding for integration verification",
    "Resources": [{"Type": "AwsAccount", "Id": "AWS::::Account:123456789012"}]
}]'
```

**追加確認事項**:
- 両サービスが同じリージョンで有効化されているか
- IAM 権限が適切に設定されているか
- Organizations を使用している場合、Delegated Admin が正しく設定されているか
</details>

### 課題2: Lambda 自動修復が実行されない

**症状**:
```
CRITICAL な GuardDuty finding が検出されたが、
Step Functions ワークフローが開始されず、自動修復が実行されない。
Lambda 関数の CloudWatch Logs にもエントリがない。
```

**調査コマンド**:
```bash
# EventBridge ルールの確認
aws events list-rules --name-prefix "guardduty"

# Lambda の呼び出し状況確認
aws lambda get-function --function-name security-event-router-production

# EventBridge のイベント履歴確認（CloudTrail）
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=EventName,AttributeValue=PutEvents
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: EventBridge ルールの Lambda 呼び出し権限が不足している

**解決手順**:
```bash
# 1. EventBridge ルールのターゲット確認
aws events list-targets-by-rule --rule guardduty-findings-production

# 2. Lambda のリソースベースポリシー確認
aws lambda get-policy --function-name security-event-router-production

# 3. Lambda 呼び出し権限を追加
aws lambda add-permission \
    --function-name security-event-router-production \
    --statement-id EventBridgeInvoke \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn arn:aws:events:ap-northeast-1:123456789012:rule/guardduty-findings-production

# 4. テストイベントを送信して確認
aws events put-events --entries '[{
    "Source": "aws.guardduty",
    "DetailType": "GuardDuty Finding",
    "Detail": "{\"severity\": 8.0, \"type\": \"UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration\", \"title\": \"Test Critical Finding\", \"accountId\": \"123456789012\"}"
}]'

# 5. Lambda ログを確認
aws logs tail /aws/lambda/security-event-router-production --follow
```

**追加確認事項**:
- EventBridge ルールの State が ENABLED になっているか
- イベントパターンが正しくマッチしているか
- Lambda 関数のタイムアウト設定は十分か
</details>

### 課題3: クロスアカウント修復が失敗する

**症状**:
```
メンバーアカウントで検出されたセキュリティイベントに対して、
セキュリティアカウントからの自動修復が "AccessDenied" で失敗する。
```

**エラーログ**:
```json
{
    "errorType": "ClientError",
    "errorMessage": "An error occurred (AccessDenied) when calling the AssumeRole operation: User: arn:aws:sts::111111111111:assumed-role/security-auto-remediation-role-production/security-auto-remediation-production is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::222222222222:role/SecurityRemediationRole"
}
```

**原因と解決**:
<details>
<summary>解答を見る</summary>

**原因**: メンバーアカウントの SecurityRemediationRole の信頼ポリシーが
セキュリティアカウントからのロール引き受けを許可していない

**解決手順**:
```bash
# メンバーアカウントで実行

# 1. 信頼ポリシーを確認
aws iam get-role --role-name SecurityRemediationRole

# 2. 正しい信頼ポリシーを設定
cat > trust-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::111111111111:role/security-auto-remediation-role-production"
            },
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {
                    "sts:ExternalId": "MedSecureSecurityRemediation"
                }
            }
        }
    ]
}
EOF

aws iam update-assume-role-policy \
    --role-name SecurityRemediationRole \
    --policy-document file://trust-policy.json

# 3. ロールに必要な権限を付与
cat > remediation-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:ModifyInstanceAttribute",
                "ec2:StopInstances",
                "ec2:CreateSnapshot",
                "ec2:CreateTags",
                "s3:PutBucketPublicAccessBlock"
            ],
            "Resource": "*"
        }
    ]
}
EOF

aws iam put-role-policy \
    --role-name SecurityRemediationRole \
    --policy-name RemediationActions \
    --policy-document file://remediation-policy.json

# 4. Lambda コードを更新して ExternalId を使用
# assume_role 呼び出しに ExternalId を追加
```

**Lambda コード修正**:
```python
def assume_role_in_account(account_id):
    response = sts_client.assume_role(
        RoleArn=f'arn:aws:iam::{account_id}:role/SecurityRemediationRole',
        RoleSessionName='SecurityAutoRemediation',
        ExternalId='MedSecureSecurityRemediation'  # 追加
    )
    return response['Credentials']
```
</details>

---

## 9. 設計課題

### 設計課題: マルチリージョン・マルチアカウントのセキュリティ集約アーキテクチャ

**シナリオ**:
MedSecure社は事業拡大に伴い、以下の構成でAWSを運用することになりました：

- **アカウント構成**:
  - Production Account（東京）
  - Production Account（バージニア北部）※ DR用
  - Development Account（東京）
  - Staging Account（東京）
  - Security Account（中央管理）

- **要件**:
  1. 全アカウント・全リージョンのセキュリティイベントを一元管理
  2. 検出から通知まで5分以内
  3. HIPAA、SOC2 準拠の監査証跡
  4. コスト効率の良い設計

**設計すべき項目**:
```
1. セキュリティサービスの集約構成
   - GuardDuty のマルチアカウント・マルチリージョン集約方法
   - Security Hub のリージョン間アグリゲーション設計
   - CloudTrail のマルチアカウントログ集約

2. イベント処理アーキテクチャ
   - EventBridge によるクロスアカウント・クロスリージョンイベント転送
   - 中央での処理と分散処理のバランス
   - 障害時のフェイルオーバー設計

3. コンプライアンス対応
   - 監査ログの保持と暗号化
   - アクセス制御と証跡
   - レポート自動生成

4. コスト最適化
   - ログ保持期間の階層化
   - リージョン間データ転送の最小化
```

**期待する成果物**:
- アーキテクチャ図（マルチアカウント・マルチリージョン）
- サービス設定のベストプラクティス
- 推定月額コスト
- 実装の優先順位

<details>
<summary>設計例を見る</summary>

### マルチリージョン・マルチアカウント セキュリティアーキテクチャ

```mermaid
architecture-beta
    group org(cloud)[AWS Organizations]

    group sec_account(server)[Security Account us-east-1 Aggregation Hub] in org
    service sec_hub(server)[Security Hub Aggregation Region] in sec_account
    service guard_duty(server)[GuardDuty Delegated Admin] in sec_account
    service cloud_trail(server)[CloudTrail Organization Trail] in sec_account
    service event_bridge(server)[EventBridge Central Bus] in sec_account
    service lambda(server)[Lambda Process] in sec_account
    service step_fn(server)[Step Functions] in sec_account
    service sns(internet)[SNS Topics] in sec_account
    service s3_logs(disk)[S3 Central Security Logs CloudTrail GuardDuty Config VPC Flow] in sec_account

    group tokyo(server)[ap-northeast-1 Tokyo] in org
    service prod_tokyo(server)[Production Account GuardDuty Security Hub Config CloudTrail] in tokyo
    service dev_tokyo(server)[Development Account GuardDuty Security Hub] in tokyo
    service stag_tokyo(server)[Staging Account GuardDuty Security Hub] in tokyo

    group virginia(server)[us-east-1 Virginia] in org
    service prod_dr(server)[Production DR Account GuardDuty Security Hub Config CloudTrail] in virginia

    service aggregation(server)[Security Hub Aggregation Region us-east-1] in org

    sec_hub:B --> T:event_bridge
    guard_duty:B --> T:event_bridge
    cloud_trail:B --> T:event_bridge
    event_bridge:B --> T:lambda
    event_bridge:B --> T:step_fn
    event_bridge:B --> T:sns
    cloud_trail:R --> L:s3_logs
    prod_tokyo:B --> T:aggregation
    dev_tokyo:B --> T:aggregation
    stag_tokyo:B --> T:aggregation
    prod_dr:B --> T:aggregation
```

### サービス設定のベストプラクティス

```yaml
# 1. Security Hub 設定
security_hub:
  aggregation_region: us-east-1
  linked_regions:
    - ap-northeast-1
  auto_enable_controls: true
  standards:
    - AWS-Foundational-Security-Best-Practices
    - CIS-AWS-Foundations-Benchmark
  finding_aggregator:
    region_linking_mode: ALL_REGIONS

# 2. GuardDuty 設定
guardduty:
  delegated_admin: security-account-id
  auto_enable_members: true
  auto_enable_organization_members: ALL
  publishing_frequency: FIFTEEN_MINUTES
  features:
    - S3_DATA_EVENTS
    - EKS_AUDIT_LOGS
    - EBS_MALWARE_PROTECTION
    - RDS_LOGIN_EVENTS
    - LAMBDA_NETWORK_LOGS

# 3. CloudTrail 設定
cloudtrail:
  organization_trail: true
  multi_region: true
  log_file_validation: true
  kms_encryption: true
  s3_bucket: central-security-logs
  cloudwatch_logs: true
  data_events:
    - S3
    - Lambda

# 4. EventBridge 設定
eventbridge:
  cross_account_policy: allow-from-org
  archive:
    enabled: true
    retention_days: 90
  rules:
    - pattern: guardduty-findings
      targets: [lambda, sns]
    - pattern: securityhub-findings
      targets: [lambda, step-functions]
```

### 推定月額コスト

| サービス | 構成 | 月額コスト |
|----------|------|-----------|
| GuardDuty | 4アカウント × 2リージョン | $150-300 |
| Security Hub | 4アカウント × 2リージョン | $50-100 |
| CloudTrail | Organization Trail | $50-100 |
| EventBridge | イベント処理 | $20-50 |
| Lambda | 修復・通知 | $10-30 |
| S3 | ログ保存（1TB/月） | $30-50 |
| Step Functions | ワークフロー | $10-20 |
| **合計** | | **$320-650** |

### 実装の優先順位

```
Phase 1（Week 1-2）: 基盤構築
├── Organizations 設定確認
├── Security Hub Aggregation Region 設定
├── GuardDuty Delegated Admin 設定
└── CloudTrail Organization Trail 設定

Phase 2（Week 3-4）: 検知・通知
├── EventBridge ルール設定
├── SNS トピック・サブスクリプション設定
├── Lambda 通知関数デプロイ
└── 基本的なアラート動作確認

Phase 3（Week 5-6）: 自動修復
├── Step Functions ワークフロー構築
├── 自動修復 Lambda 関数デプロイ
├── クロスアカウント IAM ロール設定
└── 修復シナリオテスト

Phase 4（Week 7-8）: コンプライアンス・最適化
├── Config ルール（カスタム含む）設定
├── 監査レポート自動生成
├── ダッシュボード構築
└── コスト最適化レビュー
```

</details>

---

## 10. 発展課題

### 発展課題1: SIEM 統合（難易度：上級）

**課題内容**:
セキュリティイベントを外部 SIEM（Splunk または Elastic SIEM）に連携し、
より高度な相関分析を実現してください。

**要件**:
- リアルタイムでのイベント転送
- カスタムフィールドマッピング
- 双方向の連携（SIEM からの修復トリガー）

```python
# ヒント: Kinesis Data Firehose を使用した SIEM 連携
def create_firehose_to_splunk():
    """
    Security Hub findings を Splunk HEC に送信する
    Kinesis Data Firehose の設定
    """
    firehose_config = {
        'DeliveryStreamName': 'security-findings-to-splunk',
        'DeliveryStreamType': 'DirectPut',
        'SplunkDestinationConfiguration': {
            'HECEndpoint': 'https://splunk-hec.medsecure.com:8088',
            'HECEndpointType': 'Raw',
            'HECToken': '{{resolve:secretsmanager:splunk-hec-token}}',
            'HECAcknowledgmentTimeoutInSeconds': 180,
            'RetryOptions': {
                'DurationInSeconds': 60
            },
            'S3BackupMode': 'FailedEventsOnly',
            'ProcessingConfiguration': {
                'Enabled': True,
                'Processors': [{
                    'Type': 'Lambda',
                    'Parameters': [{
                        'ParameterName': 'LambdaArn',
                        'ParameterValue': 'arn:aws:lambda:...:transform-for-splunk'
                    }]
                }]
            }
        }
    }
    return firehose_config
```

### 発展課題2: 脅威インテリジェンス統合（難易度：上級）

**課題内容**:
サードパーティの脅威インテリジェンスフィード（例：AlienVault OTX）を
GuardDuty のカスタム脅威リストとして統合し、業界特有の脅威を検出してください。

**要件**:
- 脅威インテリジェンスフィードの自動取得
- GuardDuty 脅威リストの自動更新
- ヘルスケア業界特有の IoC（Indicators of Compromise）の監視

### 発展課題3: セキュリティダッシュボード構築（難易度：中級）

**課題内容**:
Amazon Managed Grafana を使用して、経営層向けのセキュリティダッシュボードを
構築してください。

**要件**:
- リアルタイムの脅威可視化
- トレンド分析（過去30日間）
- コンプライアンススコアの表示
- 自動 PDF レポート生成

---

## 11. 振り返りと次のステップ

### 学習のまとめ

```
本課題で学んだこと:
□ GuardDuty による ML ベースの脅威検知
□ Security Hub によるセキュリティ統合管理
□ EventBridge を使ったイベント駆動セキュリティ
□ Lambda/Step Functions による自動修復
□ HIPAA 準拠のセキュリティ要件
□ マルチアカウント・マルチリージョンセキュリティ

GCP との主な違い:
- Security Hub は SCC よりサードパーティ統合が豊富
- GuardDuty は専用の ML モデルで検知精度が高い
- EventBridge はより柔軟なイベントルーティングが可能
- Organizations との統合が深い
```

### GCP経験者向けポイント

| 観点 | GCP | AWS | 移行時の注意 |
|------|-----|-----|-------------|
| 統合セキュリティ | Security Command Center | Security Hub | 検出結果のスキーマが異なる |
| 脅威検知 | Event Threat Detection | GuardDuty | ML モデルの検知パターンが異なる |
| イベント処理 | Eventarc | EventBridge | イベントパターンの記法が異なる |
| ポリシー管理 | Organization Policy | AWS Config | ルール定義方法が異なる |
| ログ集約 | Cloud Logging | CloudWatch + CloudTrail | ログの構造と検索方法が異なる |

### 推奨される次のステップ

```
1. AWS Certified Security - Specialty の学習
   - より深いセキュリティサービスの理解
   - ベストプラクティスの習得

2. Incident Response Playbook の作成
   - 組織固有のシナリオ対応手順
   - 自動化可能な範囲の拡大

3. Chaos Engineering for Security
   - GameDay の実施
   - セキュリティ対応訓練

4. 関連課題への挑戦
   - 課題25: セキュアネットワーク基盤
   - 課題26: DDoS対策とエッジセキュリティ
```

---

## 12. 推定コストと注意事項

### 本課題の推定コスト

| サービス | 使用量 | 推定コスト（演習時） |
|----------|--------|---------------------|
| GuardDuty | 1アカウント、基本検出 | $5-10 |
| Security Hub | 基本機能 | $3-5 |
| Lambda | 100回実行 | < $1 |
| Step Functions | 50回実行 | < $1 |
| EventBridge | 1000イベント | < $1 |
| DynamoDB | オンデマンド | $1-2 |
| S3 | 1GB | < $1 |
| **合計** | | **$10-20** |

### コスト最適化のヒント

```
1. GuardDuty の最適化
   - S3 保護は必要なバケットのみ有効化
   - 検出結果のエクスポート頻度を調整

2. Security Hub の最適化
   - 不要なセキュリティ基準を無効化
   - 自動修復で解決済みの検出結果をアーカイブ

3. ログ保存の最適化
   - S3 ライフサイクルポリシーで Glacier に移行
   - CloudWatch Logs の保持期間を適切に設定
```

### 注意事項

```
⚠️ セキュリティサービスの有効化
- GuardDuty、Security Hub は有効化すると即座に課金開始
- テスト後は必ず無効化するか、コストを監視

⚠️ 自動修復のテスト
- 本番環境では十分なテスト後に有効化
- 誤検知による影響を最小化する設計を

⚠️ IAM 権限
- 自動修復用のロールには最小権限を付与
- クロスアカウントアクセスには ExternalId を使用
```

---

**課題作成日**: 2024年1月
**最終更新日**: 2024年1月
**作成者**: AWS学習プログラム
