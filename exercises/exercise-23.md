# 課題23: FinanceFlow株式会社の月次レポート自動生成システム構築

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級 |
| カテゴリ | バッチ処理 / SaaS / 定期実行 |
| 処理タイプ | バッチ / スケジュール |
| 使用IaC | CloudFormation |
| 所要時間 | 4〜5時間 |

---

## シナリオ

### 企業プロフィール

**FinanceFlow株式会社**は、中小企業向けのクラウド会計・経費精算SaaSを提供しています。

| 項目 | 内容 |
|------|------|
| 業種 | SaaS（会計・経費精算） |
| 設立 | 2017年 |
| 従業員数 | 60名 |
| 契約企業数 | 5,000社 |
| 月間処理件数 | 500万件（仕訳・経費） |
| 月商 | 1.2億円 |
| 平均契約単価 | 24,000円/月 |
| データ量 | 月次約100GB増加 |

### 現状の課題

毎月初に全契約企業（5,000社）に対して前月の月次レポート（損益計算書、貸借対照表、経費分析）を生成・配信していますが、処理に時間がかかり、月初の業務負荷が高くなっています。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| レポート生成対象 | 5,000社 | 変わらず |
| 月次処理時間 | 48時間 | 6時間以内 |
| 経理チーム作業 | 20時間/月 | 2時間/月 |
| 配信完了日 | 毎月5日 | 毎月2日 |
| 生成エラー率 | 3% | 0.5%以下 |
| 再生成依頼 | 50件/月 | 10件/月以下 |

### 現状のレポート生成フロー

```
毎月1日:
1. バッチサーバーでスクリプト実行開始
2. PostgreSQLから企業ごとにデータ抽出
3. Pythonでレポート計算・PDF生成
4. S3にアップロード
5. メール配信

問題点:
- 単一サーバーで逐次処理
- エラー時の再実行が困難
- 進捗把握ができない
- サーバーリソースがボトルネック
```

### 生成するレポート種類

| レポート | 内容 | ファイル形式 |
|----------|------|--------------|
| 月次損益計算書 | 売上、費用、利益 | PDF + Excel |
| 月次貸借対照表 | 資産、負債、純資産 | PDF + Excel |
| 経費分析レポート | カテゴリ別経費推移 | PDF |
| キャッシュフロー概要 | 入出金サマリー | PDF |
| 経費精算一覧 | 当月の経費明細 | Excel |

### 解決したいこと

1. 5,000社のレポートを6時間以内に生成
2. 並列処理による高速化
3. 進捗監視とエラーハンドリング
4. 自動リトライ・再生成機能
5. 配信スケジュールの柔軟な管理

### 成功指標（KPI）

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| 処理時間 | 48時間 | 6時間以内 | 1ヶ月後 |
| エラー率 | 3% | 0.5%以下 | 1ヶ月後 |
| 自動化率 | 60% | 95%以上 | 2ヶ月後 |
| 経理工数 | 20時間/月 | 2時間/月 | 2ヶ月後 |
| 配信完了 | 5日 | 2日 | 1ヶ月後 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **Amazon EventBridge Schedulerの実践活用**
   - cron式によるスケジュール設定
   - タイムゾーン対応
   - 柔軟なスケジュール管理

2. **AWS Step Functionsによる並列処理**
   - Map stateによる並列実行
   - エラーハンドリング・リトライ
   - 進捗監視

3. **AWS Lambdaの大規模並列処理**
   - 同時実行制限の理解
   - メモリ・タイムアウト最適化
   - レイヤーの活用

4. **Amazon SESによるメール配信**
   - テンプレートメール
   - バルク送信
   - バウンス処理

### 実務で活かせる知識

- 定期バッチ処理の設計パターン
- 大量データの並列処理アーキテクチャ
- SaaS向けマルチテナント処理

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| スケジューラー | EventBridge Scheduler | Cloud Scheduler |
| ワークフロー | Step Functions | Cloud Workflows |
| サーバーレス関数 | Lambda | Cloud Functions |
| メール配信 | SES | - (SendGridなど外部) |

---

## 使用するAWSサービス

### メインサービス

| サービス | 役割 | 選定理由 |
|----------|------|----------|
| Amazon EventBridge Scheduler | 月次スケジュール実行 | 柔軟なスケジュール設定 |
| AWS Step Functions | ワークフローオーケストレーション | 並列処理、進捗管理 |
| AWS Lambda | レポート生成処理 | サーバーレス並列実行 |
| Amazon S3 | レポートファイル保存 | 大容量、配信連携 |
| Amazon SES | メール配信 | 大量送信対応 |

### 補助サービス

| サービス | 役割 |
|----------|------|
| Amazon DynamoDB | ジョブ状態管理、企業マスタ |
| Amazon SNS | 完了・エラー通知 |
| Amazon CloudWatch | 監視・ログ・アラート |
| AWS Secrets Manager | DB接続情報管理 |

---

## 前提条件

### 必要な事前知識

- AWSの基本操作（S3, Lambda）
- Pythonの基礎
- cron式の基本

### 準備するもの

1. **AWSアカウント**
   - SES本番アクセス（サンドボックス解除推奨）
   - 適切なIAM権限

2. **開発環境**
   - AWS CLI v2
   - Python 3.9以上
   - pip（reportlab, openpyxl等）

3. **テストデータ**
   - サンプル企業データ（10社程度）

---

## アーキテクチャ概要

### システム全体構成

```
[EventBridge Scheduler]
    ↓ 毎月1日 AM 1:00 JST
[Step Functions: MonthlyReportWorkflow]
    │
    ├─[Lambda: FetchCompanies]
    │     └── DynamoDB: 企業一覧取得
    │
    ├─[Map State: 並列レポート生成]
    │     └── [Lambda: GenerateReport] × 5000社
    │           ├── データ取得（RDS/DynamoDB）
    │           ├── レポート計算
    │           ├── PDF/Excel生成
    │           └── S3保存
    │
    ├─[Lambda: SendEmails]
    │     └── SES: メール配信
    │
    └─[Lambda: NotifyCompletion]
          └── SNS: 完了通知

[DynamoDB: ジョブ状態管理]
[CloudWatch: 監視・アラート]
```

### 処理フロー

1. **トリガー**: EventBridge Schedulerが毎月1日AM1時に起動
2. **企業取得**: DynamoDBから処理対象企業一覧を取得
3. **並列生成**: Step Functions Map stateで最大100並列でレポート生成
4. **保存**: 生成したPDF/ExcelをS3に保存
5. **配信**: SESで各企業担当者にメール送信
6. **通知**: 処理完了を管理者に通知

---

## ハンズオン手順

### フェーズ1: 基盤構築（1時間）

#### Step 1-1: リソース作成

```bash
# 環境変数
export AWS_REGION=ap-northeast-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# S3バケット
aws s3 mb s3://financeflow-reports-${ACCOUNT_ID} --region ${AWS_REGION}

# DynamoDBテーブル（企業マスタ）
aws dynamodb create-table \
  --table-name financeflow-companies \
  --attribute-definitions \
    AttributeName=companyId,AttributeType=S \
  --key-schema \
    AttributeName=companyId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ${AWS_REGION}

# DynamoDBテーブル（ジョブ状態）
aws dynamodb create-table \
  --table-name financeflow-report-jobs \
  --attribute-definitions \
    AttributeName=jobId,AttributeType=S \
    AttributeName=companyId,AttributeType=S \
  --key-schema \
    AttributeName=jobId,KeyType=HASH \
    AttributeName=companyId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region ${AWS_REGION}

# SNSトピック
aws sns create-topic --name financeflow-report-notifications --region ${AWS_REGION}
```

#### Step 1-2: サンプル企業データ投入

```python
# scripts/seed_companies.py
import boto3
import random

dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-1')
table = dynamodb.Table('financeflow-companies')

# サンプル企業データ（10社）
companies = [
    {'companyId': f'COMP-{str(i).zfill(5)}',
     'companyName': f'テスト企業{i}株式会社',
     'plan': random.choice(['basic', 'standard', 'premium']),
     'email': f'accounting{i}@example.com',
     'contactName': f'経理担当{i}',
     'createdAt': '2024-01-01T00:00:00Z',
     'isActive': True}
    for i in range(1, 11)
]

with table.batch_writer() as batch:
    for company in companies:
        batch.put_item(Item=company)

print(f"Inserted {len(companies)} companies")
```

### フェーズ2: Lambda関数実装（1.5時間）

#### Step 2-1: 企業一覧取得Lambda

```python
# lambda/fetch_companies/handler.py
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['COMPANIES_TABLE'])

def handler(event, context):
    """アクティブな企業一覧を取得"""
    job_id = event.get('jobId', datetime.utcnow().strftime('%Y%m'))

    # 全企業をスキャン（本番ではページネーション必要）
    response = table.scan(
        FilterExpression='isActive = :active',
        ExpressionAttributeValues={':active': True}
    )

    companies = response.get('Items', [])

    # ページネーション対応
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            FilterExpression='isActive = :active',
            ExpressionAttributeValues={':active': True},
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        companies.extend(response.get('Items', []))

    print(f"Found {len(companies)} active companies")

    return {
        'jobId': job_id,
        'reportMonth': event.get('reportMonth', datetime.utcnow().strftime('%Y-%m')),
        'companies': [
            {
                'companyId': c['companyId'],
                'companyName': c['companyName'],
                'email': c['email'],
                'contactName': c.get('contactName', ''),
                'plan': c.get('plan', 'basic')
            }
            for c in companies
        ],
        'totalCount': len(companies)
    }
```

#### Step 2-2: レポート生成Lambda

```python
# lambda/generate_report/handler.py
import boto3
import json
import os
from datetime import datetime
from io import BytesIO
from decimal import Decimal

# PDF生成ライブラリ（Lambda Layer必要）
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Excel生成
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

OUTPUT_BUCKET = os.environ['OUTPUT_BUCKET']
jobs_table = dynamodb.Table(os.environ['JOBS_TABLE'])

def generate_sample_financial_data(company_id: str, report_month: str) -> dict:
    """サンプル財務データ生成（本番ではDBから取得）"""
    import random
    random.seed(hash(company_id + report_month))

    return {
        'revenue': random.randint(5000000, 50000000),
        'cost_of_sales': random.randint(2000000, 20000000),
        'operating_expenses': random.randint(1000000, 10000000),
        'other_income': random.randint(0, 500000),
        'assets': {
            'current_assets': random.randint(10000000, 100000000),
            'fixed_assets': random.randint(5000000, 50000000),
        },
        'liabilities': {
            'current_liabilities': random.randint(5000000, 30000000),
            'long_term_liabilities': random.randint(2000000, 20000000),
        },
        'expenses_by_category': {
            '人件費': random.randint(1000000, 5000000),
            '賃借料': random.randint(500000, 2000000),
            '通信費': random.randint(50000, 200000),
            '消耗品費': random.randint(100000, 500000),
            '交通費': random.randint(100000, 300000),
            '接待交際費': random.randint(50000, 200000),
        }
    }

def generate_pdf_report(company_name: str, report_month: str, data: dict) -> bytes:
    """PDF形式の月次レポート生成"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []

    styles = getSampleStyleSheet()

    # タイトル
    title = Paragraph(f"月次財務レポート - {report_month}", styles['Title'])
    elements.append(title)
    elements.append(Paragraph(f"企業名: {company_name}", styles['Normal']))
    elements.append(Spacer(1, 20))

    # 損益計算書
    elements.append(Paragraph("損益計算書", styles['Heading2']))

    revenue = data['revenue']
    cost = data['cost_of_sales']
    gross_profit = revenue - cost
    operating_exp = data['operating_expenses']
    operating_income = gross_profit - operating_exp

    pl_data = [
        ['項目', '金額（円）'],
        ['売上高', f'{revenue:,}'],
        ['売上原価', f'{cost:,}'],
        ['売上総利益', f'{gross_profit:,}'],
        ['販管費', f'{operating_exp:,}'],
        ['営業利益', f'{operating_income:,}'],
    ]

    pl_table = Table(pl_data, colWidths=[200, 150])
    pl_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(pl_table)
    elements.append(Spacer(1, 20))

    # 経費内訳
    elements.append(Paragraph("経費カテゴリ別内訳", styles['Heading2']))

    expense_data = [['カテゴリ', '金額（円）']]
    for category, amount in data['expenses_by_category'].items():
        expense_data.append([category, f'{amount:,}'])

    expense_table = Table(expense_data, colWidths=[150, 100])
    expense_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(expense_table)

    doc.build(elements)
    return buffer.getvalue()

def generate_excel_report(company_name: str, report_month: str, data: dict) -> bytes:
    """Excel形式の月次レポート生成"""
    wb = Workbook()
    ws = wb.active
    ws.title = "損益計算書"

    # ヘッダー
    ws['A1'] = f"月次財務レポート - {report_month}"
    ws['A1'].font = Font(size=14, bold=True)
    ws['A2'] = f"企業名: {company_name}"

    # 損益計算書
    ws['A4'] = "項目"
    ws['B4'] = "金額（円）"

    revenue = data['revenue']
    cost = data['cost_of_sales']
    gross_profit = revenue - cost
    operating_exp = data['operating_expenses']
    operating_income = gross_profit - operating_exp

    rows = [
        ('売上高', revenue),
        ('売上原価', cost),
        ('売上総利益', gross_profit),
        ('販管費', operating_exp),
        ('営業利益', operating_income),
    ]

    for i, (item, value) in enumerate(rows, start=5):
        ws[f'A{i}'] = item
        ws[f'B{i}'] = value
        ws[f'B{i}'].number_format = '#,##0'

    # 経費シート
    ws2 = wb.create_sheet("経費内訳")
    ws2['A1'] = "カテゴリ"
    ws2['B1'] = "金額（円）"

    for i, (category, amount) in enumerate(data['expenses_by_category'].items(), start=2):
        ws2[f'A{i}'] = category
        ws2[f'B{i}'] = amount
        ws2[f'B{i}'].number_format = '#,##0'

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()

def handler(event, context):
    """レポート生成メイン処理"""
    job_id = event['jobId']
    report_month = event['reportMonth']
    company = event['company']

    company_id = company['companyId']
    company_name = company['companyName']

    print(f"Generating report for {company_id}: {company_name}")

    try:
        # 財務データ取得
        financial_data = generate_sample_financial_data(company_id, report_month)

        # PDF生成
        pdf_content = generate_pdf_report(company_name, report_month, financial_data)
        pdf_key = f"reports/{report_month}/{company_id}/monthly-report.pdf"

        s3.put_object(
            Bucket=OUTPUT_BUCKET,
            Key=pdf_key,
            Body=pdf_content,
            ContentType='application/pdf'
        )

        # Excel生成
        excel_content = generate_excel_report(company_name, report_month, financial_data)
        excel_key = f"reports/{report_month}/{company_id}/monthly-report.xlsx"

        s3.put_object(
            Bucket=OUTPUT_BUCKET,
            Key=excel_key,
            Body=excel_content,
            ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        # ジョブ状態更新
        jobs_table.put_item(Item={
            'jobId': job_id,
            'companyId': company_id,
            'status': 'COMPLETED',
            'pdfKey': pdf_key,
            'excelKey': excel_key,
            'completedAt': datetime.utcnow().isoformat()
        })

        return {
            'companyId': company_id,
            'companyName': company_name,
            'email': company['email'],
            'status': 'SUCCESS',
            'pdfKey': pdf_key,
            'excelKey': excel_key
        }

    except Exception as e:
        print(f"Error generating report for {company_id}: {e}")

        jobs_table.put_item(Item={
            'jobId': job_id,
            'companyId': company_id,
            'status': 'FAILED',
            'error': str(e),
            'failedAt': datetime.utcnow().isoformat()
        })

        return {
            'companyId': company_id,
            'companyName': company_name,
            'status': 'FAILED',
            'error': str(e)
        }
```

#### Step 2-3: メール配信Lambda

```python
# lambda/send_emails/handler.py
import boto3
import os
from datetime import datetime

ses = boto3.client('ses', region_name='ap-northeast-1')

OUTPUT_BUCKET = os.environ['OUTPUT_BUCKET']
SENDER_EMAIL = os.environ['SENDER_EMAIL']

def handler(event, context):
    """レポート配信メール送信"""
    report_month = event['reportMonth']
    results = event['reportResults']

    sent_count = 0
    failed_count = 0

    for result in results:
        if result['status'] != 'SUCCESS':
            failed_count += 1
            continue

        try:
            # 署名付きURL生成（24時間有効）
            s3 = boto3.client('s3')
            pdf_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': OUTPUT_BUCKET, 'Key': result['pdfKey']},
                ExpiresIn=86400
            )
            excel_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': OUTPUT_BUCKET, 'Key': result['excelKey']},
                ExpiresIn=86400
            )

            # メール送信
            ses.send_email(
                Source=SENDER_EMAIL,
                Destination={'ToAddresses': [result['email']]},
                Message={
                    'Subject': {
                        'Data': f'【FinanceFlow】{report_month} 月次レポートのお届け',
                        'Charset': 'UTF-8'
                    },
                    'Body': {
                        'Text': {
                            'Data': f"""
{result.get('contactName', 'ご担当者')} 様

いつもFinanceFlowをご利用いただきありがとうございます。

{report_month}の月次レポートが完成しましたのでお届けします。

■ レポートダウンロード（24時間有効）
・PDF版: {pdf_url}
・Excel版: {excel_url}

■ レポート内容
・月次損益計算書
・月次貸借対照表
・経費カテゴリ別分析

ご不明な点がございましたら、サポートまでお問い合わせください。

━━━━━━━━━━━━━━━━━━━━━━━━━━
FinanceFlow株式会社
サポート: support@financeflow.example.com
━━━━━━━━━━━━━━━━━━━━━━━━━━
""",
                            'Charset': 'UTF-8'
                        }
                    }
                }
            )

            sent_count += 1
            print(f"Email sent to {result['email']}")

        except Exception as e:
            print(f"Failed to send email to {result['email']}: {e}")
            failed_count += 1

    return {
        'reportMonth': report_month,
        'sentCount': sent_count,
        'failedCount': failed_count,
        'totalCount': len(results)
    }
```

#### Step 2-4: 完了通知Lambda

```python
# lambda/notify_completion/handler.py
import boto3
import os
from datetime import datetime

sns = boto3.client('sns')

NOTIFICATION_TOPIC = os.environ['NOTIFICATION_TOPIC']

def handler(event, context):
    """処理完了通知"""
    report_month = event['reportMonth']
    total_companies = event.get('totalCount', 0)
    email_result = event.get('emailResult', {})

    sent_count = email_result.get('sentCount', 0)
    failed_count = email_result.get('failedCount', 0)

    message = f"""
月次レポート生成・配信が完了しました。

■ 処理結果サマリー
対象月: {report_month}
処理企業数: {total_companies}社
メール送信成功: {sent_count}件
メール送信失敗: {failed_count}件

完了時刻: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
"""

    if failed_count > 0:
        message += f"""
※ {failed_count}件の配信に失敗しました。
CloudWatch Logsで詳細を確認してください。
"""

    sns.publish(
        TopicArn=NOTIFICATION_TOPIC,
        Subject=f'[FinanceFlow] {report_month} 月次レポート処理完了',
        Message=message
    )

    return {
        'status': 'NOTIFIED',
        'reportMonth': report_month,
        'completedAt': datetime.utcnow().isoformat()
    }
```

### フェーズ3: Step Functions ワークフロー（1時間）

#### Step 3-1: ワークフロー定義

```json
{
  "Comment": "FinanceFlow Monthly Report Generation Workflow",
  "StartAt": "FetchCompanies",
  "States": {
    "FetchCompanies": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-northeast-1:${ACCOUNT_ID}:function:financeflow-fetch-companies",
      "ResultPath": "$",
      "Next": "GenerateReportsMap"
    },
    "GenerateReportsMap": {
      "Type": "Map",
      "ItemsPath": "$.companies",
      "MaxConcurrency": 100,
      "Parameters": {
        "jobId.$": "$.jobId",
        "reportMonth.$": "$.reportMonth",
        "company.$": "$$.Map.Item.Value"
      },
      "Iterator": {
        "StartAt": "GenerateReport",
        "States": {
          "GenerateReport": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:ap-northeast-1:${ACCOUNT_ID}:function:financeflow-generate-report",
            "Retry": [
              {
                "ErrorEquals": ["States.TaskFailed", "Lambda.ServiceException"],
                "IntervalSeconds": 5,
                "MaxAttempts": 2,
                "BackoffRate": 2
              }
            ],
            "Catch": [
              {
                "ErrorEquals": ["States.ALL"],
                "ResultPath": "$.error",
                "Next": "ReportFailed"
              }
            ],
            "End": true
          },
          "ReportFailed": {
            "Type": "Pass",
            "Result": {
              "status": "FAILED"
            },
            "ResultPath": "$.result",
            "End": true
          }
        }
      },
      "ResultPath": "$.reportResults",
      "Next": "SendEmails"
    },
    "SendEmails": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-northeast-1:${ACCOUNT_ID}:function:financeflow-send-emails",
      "Parameters": {
        "reportMonth.$": "$.reportMonth",
        "reportResults.$": "$.reportResults"
      },
      "ResultPath": "$.emailResult",
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "IntervalSeconds": 10,
          "MaxAttempts": 2
        }
      ],
      "Next": "NotifyCompletion"
    },
    "NotifyCompletion": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-northeast-1:${ACCOUNT_ID}:function:financeflow-notify-completion",
      "Parameters": {
        "reportMonth.$": "$.reportMonth",
        "totalCount.$": "$.totalCount",
        "emailResult.$": "$.emailResult"
      },
      "End": true
    }
  }
}
```

### フェーズ4: EventBridge Scheduler設定（30分）

#### Step 4-1: スケジューラー作成

```bash
# IAMロール作成（EventBridge Scheduler用）
cat > scheduler-trust-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "scheduler.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

aws iam create-role \
  --role-name FinanceFlowSchedulerRole \
  --assume-role-policy-document file://scheduler-trust-policy.json

# Step Functions実行権限
aws iam put-role-policy \
  --role-name FinanceFlowSchedulerRole \
  --policy-name StepFunctionsExecution \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "states:StartExecution",
      "Resource": "arn:aws:states:ap-northeast-1:'${ACCOUNT_ID}':stateMachine:financeflow-monthly-report"
    }]
  }'

# スケジューラー作成（毎月1日 AM1:00 JST）
aws scheduler create-schedule \
  --name financeflow-monthly-report-schedule \
  --schedule-expression "cron(0 1 1 * ? *)" \
  --schedule-expression-timezone "Asia/Tokyo" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target '{
    "Arn": "arn:aws:states:ap-northeast-1:'${ACCOUNT_ID}':stateMachine:financeflow-monthly-report",
    "RoleArn": "arn:aws:iam::'${ACCOUNT_ID}':role/FinanceFlowSchedulerRole",
    "Input": "{\"reportMonth\": \"<aws.scheduler.scheduled-time>\"}"
  }' \
  --region ${AWS_REGION}
```

### フェーズ5: テストと監視（30分）

#### Step 5-1: 手動テスト実行

```bash
# Step Functionsを手動実行
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:${AWS_REGION}:${ACCOUNT_ID}:stateMachine:financeflow-monthly-report \
  --input '{"reportMonth": "2024-01"}' \
  --region ${AWS_REGION}

# 実行状態確認
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:${AWS_REGION}:${ACCOUNT_ID}:stateMachine:financeflow-monthly-report \
  --max-results 5 \
  --region ${AWS_REGION}

# 生成されたレポート確認
aws s3 ls s3://financeflow-reports-${ACCOUNT_ID}/reports/ --recursive
```

---

## トラブルシューティング課題

### 問題1: Map stateがタイムアウト

**症状:**
```
Step Functions実行が5分以上かかり、タイムアウト
大量の企業を処理できない
```

**ヒント:**
1. MaxConcurrencyの設定を確認
2. Lambda個別のタイムアウトを確認
3. DynamoDB/S3のスループットを確認

**解決方法:**
```json
// Map stateの設定調整
{
  "Type": "Map",
  "MaxConcurrency": 50,  // 100から減らす
  "ItemsPath": "$.companies",
  // Express Workflowの場合は5分制限
  // Standard Workflowは1年まで可能
}
```

### 問題2: SESでメール送信エラー

**症状:**
```
MessageRejected: Email address is not verified
サンドボックス環境での制限
```

**ヒント:**
1. SESのサンドボックス状態を確認
2. 送信先メールアドレスの検証状態を確認
3. 本番アクセスリクエストを申請

**解決方法:**
```bash
# メールアドレス検証（サンドボックス環境）
aws ses verify-email-identity --email-address test@example.com --region ${AWS_REGION}

# 本番アクセス申請（コンソールから）
# SES → Account dashboard → Request production access
```

### 問題3: Lambda同時実行制限に到達

**症状:**
```
TooManyRequestsException: Rate Exceeded
一部のレポート生成がスキップされる
```

**ヒント:**
1. Lambda同時実行数制限（デフォルト1000）を確認
2. Reserved Concurrencyの設定を確認
3. MaxConcurrencyの調整

**解決方法:**
```bash
# アカウントレベルの同時実行制限確認
aws lambda get-account-settings --region ${AWS_REGION}

# 関数レベルのReserved Concurrency設定
aws lambda put-function-concurrency \
  --function-name financeflow-generate-report \
  --reserved-concurrent-executions 200 \
  --region ${AWS_REGION}
```

---

## 設計の考察ポイント

### 1. EventBridge Scheduler vs CloudWatch Events

**考察ポイント:**
- Scheduler: タイムゾーン対応、より柔軟なスケジュール
- CloudWatch Events: 従来の方法、広く使われている
- 2023年以降は Scheduler 推奨

### 2. 並列度の最適化

**考察ポイント:**
- Lambda同時実行制限とのバランス
- DynamoDB/S3のスループット
- コストとスピードのトレードオフ

### 3. エラーハンドリング戦略

**考察ポイント:**
- 個別失敗 vs 全体失敗
- リトライ回数と間隔
- 手動再実行の仕組み

### 4. メール配信の信頼性

**考察ポイント:**
- SESのバウンス処理
- 配信レート制限
- 代替手段（SendGrid等）

### 5. レポートの保存期間

**考察ポイント:**
- S3ライフサイクルポリシー
- コンプライアンス要件
- コスト最適化

---

## 発展課題（オプション）

### 1. レポートのカスタマイズ
- プラン別レポート内容
- 企業ごとのテンプレート
- ロゴ・ブランディング対応

### 2. オンデマンド再生成
- 特定企業のみ再生成
- APIエンドポイント追加
- ダッシュボード連携

### 3. マルチ言語対応
- 英語レポート生成
- 多通貨対応
- タイムゾーン別配信

### 4. 分析機能追加
- AIによる異常検知
- 前月比較・トレンド分析
- 経営アドバイス生成（Bedrock）

### 5. 配信チャネル拡大
- Slack通知
- モバイルプッシュ
- ダッシュボード表示

---

## 想定コストと削減方法

### 月額概算コスト（月間5,000社処理想定）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| AWS Lambda | 5,000回 × 30秒 × 512MB | $3 |
| Step Functions | 5,000遷移 × 7ステート | $0.15 |
| EventBridge Scheduler | 1スケジュール | 無料 |
| Amazon S3 | 5GB（レポート）+ リクエスト | $0.50 |
| Amazon SES | 5,000通 | $0.50 |
| Amazon DynamoDB | オンデマンド | $2 |
| Amazon SNS | 通知 | $0.01 |
| CloudWatch | ログ | $3 |
| **合計** | | **約$9（約1,400円）** |

### コスト削減のポイント

1. **Lambda最適化**
   - メモリサイズの最適化（256MB検討）
   - ARM64アーキテクチャ使用
   - → 最大20%削減

2. **S3ライフサイクル**
   - 古いレポートの自動削除/アーカイブ
   - Intelligent-Tiering

3. **Express Workflow検討**
   - 処理時間5分以内の場合
   - → Step Functions コスト90%削減

4. **SESの最適化**
   - バウンス管理による無駄削減
   - 配信レピュテーション維持

### リソース削除手順

```bash
# EventBridge Scheduler
aws scheduler delete-schedule --name financeflow-monthly-report-schedule --region ${AWS_REGION}

# Step Functions
aws stepfunctions delete-state-machine \
  --state-machine-arn arn:aws:states:${AWS_REGION}:${ACCOUNT_ID}:stateMachine:financeflow-monthly-report

# Lambda
aws lambda delete-function --function-name financeflow-fetch-companies
aws lambda delete-function --function-name financeflow-generate-report
aws lambda delete-function --function-name financeflow-send-emails
aws lambda delete-function --function-name financeflow-notify-completion

# DynamoDB
aws dynamodb delete-table --table-name financeflow-companies
aws dynamodb delete-table --table-name financeflow-report-jobs

# S3
aws s3 rm s3://financeflow-reports-${ACCOUNT_ID} --recursive
aws s3 rb s3://financeflow-reports-${ACCOUNT_ID}

# SNS
aws sns delete-topic --topic-arn arn:aws:sns:${AWS_REGION}:${ACCOUNT_ID}:financeflow-report-notifications

# IAM
aws iam delete-role-policy --role-name FinanceFlowSchedulerRole --policy-name StepFunctionsExecution
aws iam delete-role --role-name FinanceFlowSchedulerRole
```

---

## 学習のポイント

### 1. EventBridge Schedulerの活用
cron式による定期実行をサーバーレスで実現。CloudWatch Eventsより柔軟で、タイムゾーン対応も標準でサポート。

### 2. Step Functions Map stateによる並列処理
大量データを効率的に並列処理する方法。MaxConcurrencyでLambda同時実行数を制御し、リソース制限内で最大効率を実現。

### 3. エラーハンドリングとリトライ
Step Functionsの Retry / Catch 機能で、自動リトライと失敗時のフォールバックを実装。個別失敗が全体に影響しない設計。

### 4. SaaSのマルチテナント処理パターン
数千社のデータを効率的に処理するアーキテクチャ。テナント分離、並列処理、進捗管理の実践的なパターン。

### 5. PDFレポート生成のサーバーレス化
Lambda Layerを活用してPDF生成ライブラリを組み込み、サーバーレスでドキュメント生成を実現。
