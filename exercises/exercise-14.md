# 課題14: リーガルパートナーズ法律事務所の契約書レビュー支援システム構築

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | AI / ドキュメント処理 / リーガルテック |
| 処理タイプ | バッチ / 非同期 |
| 使用IaC | CDK (TypeScript) |
| 所要時間 | 8〜10時間 |

---

## シナリオ

### 企業プロフィール

**リーガルパートナーズ法律事務所**は、企業法務を専門とする中堅法律事務所です。

| 項目 | 内容 |
|------|------|
| 業種 | 法律事務所（企業法務特化） |
| 設立 | 2005年 |
| 弁護士数 | 20名（パートナー5名、アソシエイト15名） |
| パラリーガル | 8名 |
| 事務スタッフ | 7名 |
| 年間売上 | 8億円 |
| 主要クライアント | IT企業、製造業、スタートアップ |
| 主な業務 | 契約書レビュー、M&A、知財、労務 |

### 現状の課題

契約書レビュー業務が事務所の主要な収益源ですが、増加する案件数に対応しきれず、若手弁護士の残業が常態化しています。また、レビュー品質にばらつきがあり、重要条項の見落としリスクが懸念されています。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| 月間レビュー件数 | 200件 | 350件対応可能に |
| 平均レビュー時間 | 3時間/件 | 1.5時間/件 |
| アソシエイト残業 | 月60時間/人 | 月30時間/人以下 |
| 重要条項見落とし | 年5件程度発生 | ゼロ |
| クライアント待機時間 | 平均5営業日 | 2営業日以内 |
| 定型契約書比率 | 65% | - |

### レビュー対象の契約書内訳

| 契約書タイプ | 月間件数 | 平均ページ数 | 複雑度 |
|--------------|----------|--------------|--------|
| 秘密保持契約（NDA） | 50件 | 5ページ | 低 |
| 業務委託契約 | 45件 | 15ページ | 中 |
| ソフトウェアライセンス | 35件 | 20ページ | 中〜高 |
| 売買基本契約 | 30件 | 25ページ | 中 |
| 共同開発契約 | 20件 | 30ページ | 高 |
| その他（賃貸借、雇用等） | 20件 | 10ページ | 低〜中 |

### 解決したいこと

1. 契約書の自動OCR・テキスト抽出（PDF/スキャン画像対応）
2. 重要条項（免責、損害賠償、契約解除、秘密保持等）の自動抽出・ハイライト
3. 自社標準ひな形との差分検出
4. リスク条項の自動検出とリスクレベル評価
5. レビューレポートの自動生成
6. 過去の類似契約書・レビューコメントの検索

### 成功指標（KPI）

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| レビュー時間短縮率 | - | 50%以上 | 3ヶ月後 |
| 重要条項抽出精度 | - | 95%以上 | 2ヶ月後 |
| リスク検出精度 | - | 90%以上 | 3ヶ月後 |
| クライアント待機時間 | 5営業日 | 2営業日以内 | 3ヶ月後 |
| 見落とし件数 | 5件/年 | 0件 | 6ヶ月後 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **Amazon Textractの実践活用**
   - PDF/画像からのテキスト抽出
   - テーブル・フォーム認識
   - AnalyzeDocument API

2. **Amazon Comprehendの活用**
   - エンティティ認識（日付、組織名、金額）
   - カスタム分類（契約条項分類）

3. **Amazon Bedrockによる高度な分析**
   - 契約書解析のプロンプトエンジニアリング
   - リスク評価ロジック
   - レビューレポート生成

4. **AWS CDK（TypeScript）によるインフラ構築**
   - スタック設計と分割
   - L2 Constructの活用
   - 環境変数管理

5. **Step Functionsによるワークフロー管理**
   - 複数処理の連携
   - エラーハンドリング
   - 並列処理

### 実務で活かせる知識

- ドキュメント処理パイプラインの設計
- 法務業務におけるAI活用パターン
- CDKによるモダンなIaC実践

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| OCR/ドキュメント処理 | Amazon Textract | Document AI |
| NLP | Amazon Comprehend | Natural Language API |
| 生成AI | Bedrock (Claude 3) | Vertex AI (Gemini) |
| ワークフロー | Step Functions | Cloud Workflows |
| IaC | CDK | Deployment Manager / Terraform |

---

## 使用するAWSサービス

### メインサービス

| サービス | 役割 | 選定理由 |
|----------|------|----------|
| Amazon Textract | PDF/画像からテキスト抽出 | 高精度OCR、テーブル認識対応 |
| Amazon Comprehend | エンティティ認識、分類 | 日本語対応、カスタム分類可能 |
| Amazon Bedrock | 契約書分析、リスク評価、レポート生成 | Claude 3の高度な推論能力 |
| AWS Step Functions | ワークフローオーケストレーション | 複数処理の連携、可視化 |
| Amazon S3 | 契約書ファイル保存 | 大容量、バージョニング |
| Amazon DynamoDB | メタデータ・分析結果保存 | 柔軟なスキーマ、高速 |
| Amazon OpenSearch Service | 過去契約書・コメント検索 | 全文検索、日本語対応 |

### 補助サービス

| サービス | 役割 |
|----------|------|
| AWS Lambda | 各処理ステップの実行 |
| Amazon SQS | 非同期処理キュー |
| Amazon SNS | 処理完了・レビュー依頼通知 |
| Amazon CloudWatch | 監視・ログ・アラート |
| AWS Secrets Manager | API キー管理 |

---

## 前提条件

### 必要な事前知識

- AWSの基本サービス（S3, Lambda, DynamoDB）
- TypeScript基礎（型定義、async/await）
- Node.js環境でのnpm/yarn操作
- Step Functionsの基本概念
- 契約書の基本構造（条項、別紙等）

### 準備するもの

1. **AWSアカウント**
   - Bedrockのモデルアクセス有効化（Claude 3 Sonnet）
   - 適切なIAM権限（AdministratorAccess推奨、学習時）

2. **開発環境**
   - Node.js 18.x以上
   - AWS CDK CLI v2（`npm install -g aws-cdk`）
   - AWS CLI v2（設定済み）
   - TypeScript（`npm install -g typescript`）
   - VS Code + AWS Toolkit拡張

3. **テストデータ**
   - サンプル契約書PDF（3-5件）
   - 自社標準ひな形（テスト用に作成）

### CDK初期設定

```bash
# CDK CLIインストール
npm install -g aws-cdk

# バージョン確認
cdk --version

# プロジェクト作成
mkdir legal-contract-review && cd legal-contract-review
cdk init app --language typescript

# 必要な依存関係追加
npm install @aws-cdk/aws-lambda-python-alpha
```

---

## アーキテクチャ概要

### システム全体構成

```
[弁護士/パラリーガル]
        ↓ アップロード
[S3: 入力バケット]
        ↓ S3イベント
[Step Functions: ContractReviewWorkflow]
        │
        ├─[1] Lambda: ExtractText
        │     └── Textract: PDF→テキスト変換
        │
        ├─[2] Lambda: AnalyzeEntities
        │     └── Comprehend: エンティティ抽出
        │
        ├─[3] Lambda: ClassifyClauses
        │     └── Bedrock: 条項分類・リスク評価
        │
        ├─[4] Lambda: CompareTemplate
        │     └── Bedrock: ひな形との差分検出
        │
        └─[5] Lambda: GenerateReport
              └── Bedrock: レビューレポート生成
        │
        ↓
[DynamoDB: 分析結果保存]
[S3: レポート出力]
[OpenSearch: 検索インデックス]
        ↓
[SNS: 完了通知]
        ↓
[弁護士にメール通知]
```

### 処理フロー詳細

1. **ドキュメントアップロード**: 弁護士がS3に契約書PDFをアップロード
2. **テキスト抽出**: TextractでOCR処理、テーブル・フォーム認識
3. **エンティティ認識**: Comprehendで日付、金額、組織名を抽出
4. **条項分類**: Bedrockで各条項を分類（免責、損害賠償、解除等）
5. **リスク評価**: Bedrockでリスク条項を検出・評価
6. **差分検出**: 標準ひな形との違いを特定
7. **レポート生成**: 分析結果をレビューレポートとして出力
8. **通知**: 担当弁護士にメール通知

---

## ハンズオン手順

### フェーズ1: CDKプロジェクト構築（2時間）

#### Step 1-1: プロジェクト構造

```
legal-contract-review/
├── bin/
│   └── legal-contract-review.ts
├── lib/
│   ├── stacks/
│   │   ├── storage-stack.ts
│   │   ├── processing-stack.ts
│   │   └── api-stack.ts
│   ├── constructs/
│   │   ├── contract-processor.ts
│   │   └── search-index.ts
│   └── legal-contract-review-stack.ts
├── lambda/
│   ├── extract-text/
│   │   └── index.py
│   ├── analyze-entities/
│   │   └── index.py
│   ├── classify-clauses/
│   │   └── index.py
│   ├── compare-template/
│   │   └── index.py
│   └── generate-report/
│       └── index.py
├── templates/
│   └── nda-template.txt
├── cdk.json
├── package.json
└── tsconfig.json
```

#### Step 1-2: メインスタック定義

```typescript
// lib/legal-contract-review-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface LegalContractReviewStackProps extends cdk.StackProps {
  environment: string;
  notificationEmail: string;
}

export class LegalContractReviewStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LegalContractReviewStackProps) {
    super(scope, id, props);

    const { environment, notificationEmail } = props;

    // ==================== S3バケット ====================
    const inputBucket = new s3.Bucket(this, 'InputBucket', {
      bucketName: `legal-contracts-input-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const outputBucket = new s3.Bucket(this, 'OutputBucket', {
      bucketName: `legal-contracts-output-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const templateBucket = new s3.Bucket(this, 'TemplateBucket', {
      bucketName: `legal-contracts-templates-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ==================== DynamoDB ====================
    const analysisTable = new dynamodb.Table(this, 'AnalysisTable', {
      tableName: `legal-contract-analysis-${environment}`,
      partitionKey: { name: 'contractId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    analysisTable.addGlobalSecondaryIndex({
      indexName: 'statusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // ==================== SNS ====================
    const notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: `legal-contract-notifications-${environment}`,
    });

    notificationTopic.addSubscription(
      new subscriptions.EmailSubscription(notificationEmail)
    );

    // ==================== Lambda共通ロール ====================
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      roleName: `legal-contract-lambda-role-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Textract権限
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'textract:AnalyzeDocument',
        'textract:StartDocumentAnalysis',
        'textract:GetDocumentAnalysis',
      ],
      resources: ['*'],
    }));

    // Comprehend権限
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'comprehend:DetectEntities',
        'comprehend:DetectKeyPhrases',
        'comprehend:ClassifyDocument',
      ],
      resources: ['*'],
    }));

    // Bedrock権限
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    }));

    // S3権限
    inputBucket.grantRead(lambdaRole);
    outputBucket.grantReadWrite(lambdaRole);
    templateBucket.grantRead(lambdaRole);

    // DynamoDB権限
    analysisTable.grantReadWriteData(lambdaRole);

    // SNS権限
    notificationTopic.grantPublish(lambdaRole);

    // ==================== Lambda関数 ====================
    const extractTextFn = new lambda.Function(this, 'ExtractTextFunction', {
      functionName: `extract-text-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/extract-text')),
      role: lambdaRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: {
        INPUT_BUCKET: inputBucket.bucketName,
        OUTPUT_BUCKET: outputBucket.bucketName,
      },
    });

    const analyzeEntitiesFn = new lambda.Function(this, 'AnalyzeEntitiesFunction', {
      functionName: `analyze-entities-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/analyze-entities')),
      role: lambdaRole,
      timeout: cdk.Duration.minutes(3),
      memorySize: 512,
    });

    const classifyClausesFn = new lambda.Function(this, 'ClassifyClausesFunction', {
      functionName: `classify-clauses-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/classify-clauses')),
      role: lambdaRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
      },
    });

    const compareTemplateFn = new lambda.Function(this, 'CompareTemplateFunction', {
      functionName: `compare-template-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/compare-template')),
      role: lambdaRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        TEMPLATE_BUCKET: templateBucket.bucketName,
        BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
      },
    });

    const generateReportFn = new lambda.Function(this, 'GenerateReportFunction', {
      functionName: `generate-report-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/generate-report')),
      role: lambdaRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        OUTPUT_BUCKET: outputBucket.bucketName,
        TABLE_NAME: analysisTable.tableName,
        NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn,
        BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
      },
    });

    // ==================== Step Functions ====================
    const extractTextTask = new tasks.LambdaInvoke(this, 'ExtractText', {
      lambdaFunction: extractTextFn,
      outputPath: '$.Payload',
    });

    const analyzeEntitiesTask = new tasks.LambdaInvoke(this, 'AnalyzeEntities', {
      lambdaFunction: analyzeEntitiesFn,
      outputPath: '$.Payload',
    });

    const classifyClausesTask = new tasks.LambdaInvoke(this, 'ClassifyClauses', {
      lambdaFunction: classifyClausesFn,
      outputPath: '$.Payload',
    });

    const compareTemplateTask = new tasks.LambdaInvoke(this, 'CompareTemplate', {
      lambdaFunction: compareTemplateFn,
      outputPath: '$.Payload',
    });

    const generateReportTask = new tasks.LambdaInvoke(this, 'GenerateReport', {
      lambdaFunction: generateReportFn,
      outputPath: '$.Payload',
    });

    // ワークフロー定義
    const definition = extractTextTask
      .next(analyzeEntitiesTask)
      .next(classifyClausesTask)
      .next(compareTemplateTask)
      .next(generateReportTask);

    const stateMachine = new sfn.StateMachine(this, 'ContractReviewWorkflow', {
      stateMachineName: `contract-review-workflow-${environment}`,
      definition,
      timeout: cdk.Duration.minutes(30),
    });

    // S3イベント → Step Functions起動用Lambda
    const triggerFn = new lambda.Function(this, 'TriggerFunction', {
      functionName: `contract-review-trigger-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import boto3
import json
import os
from urllib.parse import unquote_plus

sfn = boto3.client('stepfunctions')

def handler(event, context):
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])

        if key.endswith('.pdf'):
            input_data = {
                'bucket': bucket,
                'key': key,
                'contractId': key.split('/')[-1].replace('.pdf', '')
            }

            sfn.start_execution(
                stateMachineArn=os.environ['STATE_MACHINE_ARN'],
                input=json.dumps(input_data)
            )

    return {'statusCode': 200}
      `),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn,
      },
    });

    stateMachine.grantStartExecution(triggerFn);

    // S3イベント通知
    inputBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(triggerFn),
      { prefix: 'contracts/', suffix: '.pdf' }
    );

    // ==================== Outputs ====================
    new cdk.CfnOutput(this, 'InputBucketName', {
      value: inputBucket.bucketName,
      description: 'Input bucket for contract PDFs',
    });

    new cdk.CfnOutput(this, 'OutputBucketName', {
      value: outputBucket.bucketName,
      description: 'Output bucket for review reports',
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: stateMachine.stateMachineArn,
      description: 'Step Functions state machine ARN',
    });
  }
}
```

#### Step 1-3: エントリポイント

```typescript
// bin/legal-contract-review.ts
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LegalContractReviewStack } from '../lib/legal-contract-review-stack';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'dev';
const notificationEmail = app.node.tryGetContext('notificationEmail') || 'legal-team@example.com';

new LegalContractReviewStack(app, `LegalContractReviewStack-${environment}`, {
  environment,
  notificationEmail,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
  },
});
```

### フェーズ2: Lambda関数実装（3時間）

#### Step 2-1: テキスト抽出Lambda

```python
# lambda/extract-text/index.py
import boto3
import json
import time
import os

textract = boto3.client('textract')
s3 = boto3.client('s3')

def handler(event, context):
    bucket = event['bucket']
    key = event['key']
    contract_id = event['contractId']

    print(f"Processing: s3://{bucket}/{key}")

    # Textractで非同期処理開始
    response = textract.start_document_analysis(
        DocumentLocation={
            'S3Object': {
                'Bucket': bucket,
                'Name': key
            }
        },
        FeatureTypes=['TABLES', 'FORMS']
    )

    job_id = response['JobId']
    print(f"Textract job started: {job_id}")

    # ジョブ完了待ち
    while True:
        result = textract.get_document_analysis(JobId=job_id)
        status = result['JobStatus']

        if status == 'SUCCEEDED':
            break
        elif status == 'FAILED':
            raise Exception(f"Textract job failed: {result.get('StatusMessage')}")

        time.sleep(5)

    # テキスト抽出
    extracted_text = []
    pages = []

    next_token = None
    while True:
        if next_token:
            result = textract.get_document_analysis(JobId=job_id, NextToken=next_token)
        else:
            result = textract.get_document_analysis(JobId=job_id)

        for block in result['Blocks']:
            if block['BlockType'] == 'LINE':
                page_num = block.get('Page', 1)
                text = block.get('Text', '')
                extracted_text.append({
                    'page': page_num,
                    'text': text,
                    'confidence': block.get('Confidence', 0)
                })

        next_token = result.get('NextToken')
        if not next_token:
            break

    # ページごとにテキストを整理
    page_texts = {}
    for item in extracted_text:
        page = item['page']
        if page not in page_texts:
            page_texts[page] = []
        page_texts[page].append(item['text'])

    full_text = ""
    for page_num in sorted(page_texts.keys()):
        full_text += f"\n--- Page {page_num} ---\n"
        full_text += "\n".join(page_texts[page_num])

    # 結果をS3に保存
    output_bucket = os.environ['OUTPUT_BUCKET']
    output_key = f"extracted/{contract_id}.txt"

    s3.put_object(
        Bucket=output_bucket,
        Key=output_key,
        Body=full_text.encode('utf-8'),
        ContentType='text/plain'
    )

    return {
        **event,
        'extractedTextKey': output_key,
        'fullText': full_text[:50000],  # Step Functions用に切り詰め
        'pageCount': len(page_texts),
        'totalLines': len(extracted_text)
    }
```

#### Step 2-2: エンティティ分析Lambda

```python
# lambda/analyze-entities/index.py
import boto3
import json

comprehend = boto3.client('comprehend')

def handler(event, context):
    full_text = event['fullText']
    contract_id = event['contractId']

    # テキストを5000バイト以下に分割（Comprehend制限）
    text_chunks = [full_text[i:i+4900] for i in range(0, len(full_text), 4900)]

    all_entities = []

    for chunk in text_chunks[:10]:  # 最大10チャンク
        # エンティティ検出
        response = comprehend.detect_entities(
            Text=chunk,
            LanguageCode='ja'
        )

        for entity in response['Entities']:
            all_entities.append({
                'type': entity['Type'],
                'text': entity['Text'],
                'score': entity['Score']
            })

    # エンティティの集約
    entity_summary = {
        'dates': [],
        'organizations': [],
        'quantities': [],
        'locations': [],
        'persons': []
    }

    for entity in all_entities:
        entity_type = entity['type']
        if entity['score'] > 0.8:
            if entity_type == 'DATE':
                entity_summary['dates'].append(entity['text'])
            elif entity_type == 'ORGANIZATION':
                entity_summary['organizations'].append(entity['text'])
            elif entity_type == 'QUANTITY':
                entity_summary['quantities'].append(entity['text'])
            elif entity_type == 'LOCATION':
                entity_summary['locations'].append(entity['text'])
            elif entity_type == 'PERSON':
                entity_summary['persons'].append(entity['text'])

    # 重複除去
    for key in entity_summary:
        entity_summary[key] = list(set(entity_summary[key]))

    return {
        **event,
        'entities': entity_summary,
        'rawEntityCount': len(all_entities)
    }
```

#### Step 2-3: 条項分類・リスク評価Lambda

```python
# lambda/classify-clauses/index.py
import boto3
import json
import os

bedrock = boto3.client('bedrock-runtime', region_name='ap-northeast-1')

def handler(event, context):
    full_text = event['fullText']
    contract_id = event['contractId']
    model_id = os.environ['BEDROCK_MODEL_ID']

    # プロンプト
    prompt = f"""以下の契約書テキストを分析し、JSON形式で結果を返してください。

## 分析対象
{full_text[:30000]}

## 分析項目

1. **契約種別** (contract_type): NDA、業務委託、ライセンス、売買、その他
2. **重要条項の抽出** (key_clauses): 以下の条項を特定し、該当箇所を引用
   - 秘密保持条項
   - 損害賠償条項
   - 免責条項
   - 契約解除条項
   - 契約期間
   - 準拠法・管轄
   - 知的財産権
   - 競業避止
3. **リスク評価** (risks): 以下の観点でリスクを評価
   - 損害賠償の上限有無
   - 免責範囲の妥当性
   - 解除条件の一方的有無
   - 秘密保持期間の長さ
   各リスクに high/medium/low の評価とその理由を記載
4. **注意点** (attention_points): 弁護士が特に確認すべき点を5つ以内

## 出力形式
JSONのみで回答してください。"""

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4096,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    })

    response = bedrock.invoke_model(
        modelId=model_id,
        body=body
    )

    response_body = json.loads(response['body'].read())
    result_text = response_body['content'][0]['text']

    # JSONを抽出
    try:
        json_start = result_text.find('{')
        json_end = result_text.rfind('}') + 1
        analysis_result = json.loads(result_text[json_start:json_end])
    except:
        analysis_result = {'raw_response': result_text}

    return {
        **event,
        'clauseAnalysis': analysis_result
    }
```

#### Step 2-4: テンプレート比較Lambda

```python
# lambda/compare-template/index.py
import boto3
import json
import os

s3 = boto3.client('s3')
bedrock = boto3.client('bedrock-runtime', region_name='ap-northeast-1')

def handler(event, context):
    full_text = event['fullText']
    contract_id = event['contractId']
    clause_analysis = event.get('clauseAnalysis', {})
    contract_type = clause_analysis.get('contract_type', 'unknown')

    template_bucket = os.environ['TEMPLATE_BUCKET']
    model_id = os.environ['BEDROCK_MODEL_ID']

    # 契約種別に応じたテンプレートを取得
    template_mapping = {
        'NDA': 'nda-template.txt',
        '秘密保持契約': 'nda-template.txt',
        '業務委託': 'service-agreement-template.txt',
        'ライセンス': 'license-agreement-template.txt',
    }

    template_key = template_mapping.get(contract_type, 'general-template.txt')

    try:
        template_response = s3.get_object(
            Bucket=template_bucket,
            Key=f"templates/{template_key}"
        )
        template_text = template_response['Body'].read().decode('utf-8')
    except:
        template_text = "テンプレートなし"

    # 差分分析プロンプト
    prompt = f"""以下の2つの文書を比較し、差分をJSON形式で報告してください。

## 標準テンプレート
{template_text[:10000]}

## 分析対象契約書
{full_text[:15000]}

## 分析項目

1. **追加された条項** (added_clauses): テンプレートにない条項
2. **削除された条項** (removed_clauses): テンプレートにあって対象にない条項
3. **変更された条項** (modified_clauses): 内容が変更されている条項
   - 条項名
   - テンプレートの内容（要約）
   - 対象契約書の内容（要約）
   - 変更の影響度（high/medium/low）
4. **推奨アクション** (recommendations): 差分に対する推奨対応

## 出力形式
JSONのみで回答してください。"""

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4096,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    })

    response = bedrock.invoke_model(
        modelId=model_id,
        body=body
    )

    response_body = json.loads(response['body'].read())
    result_text = response_body['content'][0]['text']

    try:
        json_start = result_text.find('{')
        json_end = result_text.rfind('}') + 1
        comparison_result = json.loads(result_text[json_start:json_end])
    except:
        comparison_result = {'raw_response': result_text}

    return {
        **event,
        'templateComparison': comparison_result
    }
```

#### Step 2-5: レポート生成Lambda

```python
# lambda/generate-report/index.py
import boto3
import json
import os
from datetime import datetime

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')
bedrock = boto3.client('bedrock-runtime', region_name='ap-northeast-1')

def handler(event, context):
    contract_id = event['contractId']
    entities = event.get('entities', {})
    clause_analysis = event.get('clauseAnalysis', {})
    template_comparison = event.get('templateComparison', {})
    page_count = event.get('pageCount', 0)

    output_bucket = os.environ['OUTPUT_BUCKET']
    table_name = os.environ['TABLE_NAME']
    topic_arn = os.environ['NOTIFICATION_TOPIC_ARN']
    model_id = os.environ['BEDROCK_MODEL_ID']

    # レポート生成プロンプト
    prompt = f"""以下の契約書分析結果を基に、弁護士向けのレビューレポートを作成してください。

## 分析結果

### 基本情報
- 契約書ID: {contract_id}
- ページ数: {page_count}
- 契約種別: {clause_analysis.get('contract_type', '不明')}

### 抽出されたエンティティ
- 当事者（組織）: {', '.join(entities.get('organizations', []))}
- 関連日付: {', '.join(entities.get('dates', []))}
- 金額・数量: {', '.join(entities.get('quantities', []))}

### 条項分析
{json.dumps(clause_analysis, ensure_ascii=False, indent=2)}

### テンプレート比較結果
{json.dumps(template_comparison, ensure_ascii=False, indent=2)}

## レポート形式

以下のMarkdown形式でレポートを作成してください：

1. エグゼクティブサマリー（3-5行）
2. リスク評価サマリー（表形式）
3. 重要条項の確認ポイント
4. テンプレートとの主な差分
5. 推奨アクション
6. 追加確認事項
"""

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4096,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    })

    response = bedrock.invoke_model(
        modelId=model_id,
        body=body
    )

    response_body = json.loads(response['body'].read())
    report_text = response_body['content'][0]['text']

    # レポートをS3に保存
    timestamp = datetime.utcnow().isoformat()
    report_key = f"reports/{contract_id}/{timestamp}.md"

    s3.put_object(
        Bucket=output_bucket,
        Key=report_key,
        Body=report_text.encode('utf-8'),
        ContentType='text/markdown'
    )

    # DynamoDBに分析結果を保存
    table = dynamodb.Table(table_name)
    table.put_item(Item={
        'contractId': contract_id,
        'timestamp': timestamp,
        'status': 'completed',
        'pageCount': page_count,
        'contractType': clause_analysis.get('contract_type', 'unknown'),
        'entities': entities,
        'risks': clause_analysis.get('risks', {}),
        'reportKey': report_key
    })

    # SNS通知
    sns.publish(
        TopicArn=topic_arn,
        Subject=f'契約書レビュー完了: {contract_id}',
        Message=f"""契約書のAIレビューが完了しました。

契約書ID: {contract_id}
契約種別: {clause_analysis.get('contract_type', '不明')}
ページ数: {page_count}

レポートは以下のS3パスに保存されています:
s3://{output_bucket}/{report_key}

※このレポートはAIによる分析結果です。最終判断は弁護士が行ってください。
"""
    )

    return {
        'contractId': contract_id,
        'status': 'completed',
        'reportKey': report_key,
        'timestamp': timestamp
    }
```

### フェーズ3: テンプレートとデプロイ（1時間）

#### Step 3-1: サンプルテンプレート作成

```bash
# テンプレートディレクトリ作成
mkdir -p templates
```

```text
# templates/nda-template.txt
秘密保持契約書（標準ひな形）

第1条（目的）
甲および乙は、[目的]に関連して相互に開示する秘密情報の取り扱いについて、以下のとおり合意する。

第2条（秘密情報の定義）
本契約における「秘密情報」とは、開示者が受領者に対し、書面、口頭、電子的手段その他の方法により開示する技術上または営業上の情報であって、開示の際に秘密である旨を明示したものをいう。

第3条（秘密保持義務）
1. 受領者は、秘密情報を第三者に開示または漏洩してはならない。
2. 受領者は、秘密情報を本契約の目的以外に使用してはならない。
3. 受領者は、秘密情報を善良なる管理者の注意をもって管理しなければならない。

第4条（例外）
以下の情報は秘密情報に該当しない。
（1）開示の時点で公知であった情報
（2）受領後、受領者の責めによらず公知となった情報
（3）開示前から受領者が適法に保有していた情報
（4）第三者から秘密保持義務を負うことなく適法に取得した情報

第5条（秘密情報の返還）
受領者は、開示者の要求があった場合、または本契約が終了した場合、秘密情報および複製物を速やかに返還または破棄する。

第6条（損害賠償）
本契約に違反して秘密情報を漏洩した場合、違反者は相手方に生じた損害を賠償する。

第7条（有効期間）
本契約の有効期間は、締結日から[X]年間とする。ただし、秘密保持義務は契約終了後[Y]年間存続する。

第8条（準拠法・管轄）
本契約は日本法に準拠し、東京地方裁判所を第一審の専属的合意管轄裁判所とする。
```

#### Step 3-2: CDKデプロイ

```bash
# ビルド
npm run build

# CDKブートストラップ（初回のみ）
cdk bootstrap

# 差分確認
cdk diff -c environment=dev -c notificationEmail=your-email@example.com

# デプロイ
cdk deploy -c environment=dev -c notificationEmail=your-email@example.com

# テンプレートをS3にアップロード
aws s3 cp templates/nda-template.txt s3://$(aws cloudformation describe-stacks --stack-name LegalContractReviewStack-dev --query 'Stacks[0].Outputs[?OutputKey==`TemplateBucketName`].OutputValue' --output text)/templates/
```

### フェーズ4: テストと監視（1時間）

#### Step 4-1: テスト実行

```bash
# サンプルPDFをアップロード
INPUT_BUCKET=$(aws cloudformation describe-stacks --stack-name LegalContractReviewStack-dev --query 'Stacks[0].Outputs[?OutputKey==`InputBucketName`].OutputValue' --output text)

aws s3 cp sample-contract.pdf s3://${INPUT_BUCKET}/contracts/test-001.pdf

# Step Functions実行確認
aws stepfunctions list-executions \
  --state-machine-arn $(aws cloudformation describe-stacks --stack-name LegalContractReviewStack-dev --query 'Stacks[0].Outputs[?OutputKey==`StateMachineArn`].OutputValue' --output text) \
  --max-results 5

# 実行詳細確認
aws stepfunctions describe-execution \
  --execution-arn <EXECUTION_ARN>
```

#### Step 4-2: 出力確認

```bash
# レポート確認
OUTPUT_BUCKET=$(aws cloudformation describe-stacks --stack-name LegalContractReviewStack-dev --query 'Stacks[0].Outputs[?OutputKey==`OutputBucketName`].OutputValue' --output text)

aws s3 ls s3://${OUTPUT_BUCKET}/reports/

# レポートダウンロード
aws s3 cp s3://${OUTPUT_BUCKET}/reports/test-001/ ./reports/ --recursive
```

---

## トラブルシューティング課題

### 問題1: Textractのジョブが失敗

**症状:**
```
Textract job failed: Unable to process the document
Step Functions実行がExtractTextステップで失敗
```

**ヒント:**
1. PDFファイルが破損していないか確認
2. PDFのページ数制限（3000ページ）を超えていないか
3. PDFのファイルサイズ制限（500MB）を超えていないか
4. S3へのアクセス権限があるか

**解決方法:**
```python
# Lambdaにバリデーション追加
def validate_document(bucket, key):
    response = s3.head_object(Bucket=bucket, Key=key)
    size_mb = response['ContentLength'] / (1024 * 1024)

    if size_mb > 500:
        raise ValueError(f"File too large: {size_mb}MB (max 500MB)")

    if not key.lower().endswith('.pdf'):
        raise ValueError(f"Unsupported file type: {key}")
```

### 問題2: Bedrockのレスポンスが不完全

**症状:**
```
JSONパースエラーが発生
レスポンスが途中で切れている
```

**ヒント:**
1. max_tokensの設定を確認
2. 入力テキストが長すぎないか
3. プロンプトが明確か

**解決方法:**
```python
# max_tokens増加
body = json.dumps({
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 8192,  # 4096から増加
    "messages": [...]
})

# 入力テキストの切り詰め
full_text = full_text[:25000]  # Claude 3の入力制限に合わせる
```

### 問題3: Step Functions実行タイムアウト

**症状:**
```
States.Timeout エラー
特定のステップで30分以上かかる
```

**ヒント:**
1. 各Lambdaのタイムアウト設定を確認
2. Textractの処理時間が長いPDFかどうか
3. Step Functionsのタイムアウト設定

**解決方法:**
```typescript
// CDKでタイムアウト延長
const stateMachine = new sfn.StateMachine(this, 'ContractReviewWorkflow', {
  timeout: cdk.Duration.hours(1),  // 30分から1時間に延長
  // ...
});

// Lambda個別のタイムアウトも延長
const extractTextFn = new lambda.Function(this, 'ExtractTextFunction', {
  timeout: cdk.Duration.minutes(10),  // 5分から10分に
  // ...
});
```

---

## 設計の考察ポイント

### 1. なぜStep Functionsで処理を分割したのか？

**考察ポイント:**
- 単一Lambdaで全処理を行う場合の問題（タイムアウト、デバッグ困難）
- 処理の可視化とモニタリング
- 部分的な再実行の容易さ
- 各ステップの独立したスケーリング

### 2. CDKを選択した理由は？

**考察ポイント:**
- TypeScriptによる型安全性
- プログラマブルなインフラ定義
- CloudFormationとの比較
- Terraformとの比較（チームのスキルセット）

### 3. 契約書の機密性にどう対応するか？

**考察ポイント:**
- S3の暗号化（SSE-S3 vs SSE-KMS）
- VPCエンドポイントの利用
- アクセスログの監査
- データ保持期間とライフサイクル

### 4. AIの判断をどこまで信頼するか？

**考察ポイント:**
- AIはあくまで支援ツール
- 最終判断は弁護士が行う設計
- 信頼度スコアの活用
- フォールバック（人間へのエスカレーション）

### 5. 本番環境でのスケーラビリティは？

**考察ポイント:**
- Lambda同時実行制限
- Textractのスロットリング
- Bedrockのレート制限
- SQSによるバッファリングの必要性

---

## 発展課題（オプション）

### 1. OpenSearchによる類似契約検索
- 過去の契約書をベクトル化して保存
- 類似契約書の検索機能
- 過去のレビューコメント参照

### 2. カスタムComprehend分類器
- 契約条項に特化した分類モデル
- 自社の過去データで学習
- 精度の継続的改善

### 3. Webフロントエンド構築
- React + Amplifyでのダッシュボード
- 分析結果の可視化
- 承認ワークフローの実装

### 4. 多言語対応
- 英文契約書の処理
- Amazon Translateとの連携
- 言語自動検出

### 5. バージョン管理と差分追跡
- 契約書改訂版の差分表示
- 変更履歴の追跡
- 承認ワークフローとの連携

---

## 想定コストと削減方法

### 月額概算コスト（月間200件処理想定）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| Amazon Textract | 200件 × 20ページ = 4,000ページ | $6 |
| Amazon Comprehend | 200件 × 50KBテキスト = 10MB | $2 |
| Amazon Bedrock | 200件 × 4回呼び出し × 約5000トークン | $40 |
| AWS Lambda | 200件 × 5関数 × 平均60秒 | $5 |
| AWS Step Functions | 200件 × 7ステート遷移 | $0.04 |
| Amazon S3 | 50GB保存 + リクエスト | $2 |
| Amazon DynamoDB | オンデマンド | $2 |
| Amazon SNS | 200件通知 | $0.01 |
| CloudWatch | ログ・メトリクス | $5 |
| **合計** | | **約$62（約9,300円）** |

### コスト削減のポイント

1. **Bedrockモデルの最適化**
   - 簡単な分類はClaude 3 Haikuで
   - 複雑な分析のみSonnet使用
   - → 最大40%削減

2. **Textractの使い分け**
   - テキストPDFはDetectDocumentText（安価）
   - スキャンPDFのみAnalyzeDocument
   - → 最大50%削減

3. **キャッシング**
   - 同じテンプレートとの比較結果をキャッシュ
   - 類似契約のパターンマッチング

4. **バッチ処理**
   - 夜間バッチで処理
   - Spot Instanceの活用（ECS移行時）

### リソース削除手順

```bash
# CDKで全削除
cdk destroy -c environment=dev

# S3バケットが残る場合
INPUT_BUCKET=$(aws cloudformation describe-stacks --stack-name LegalContractReviewStack-dev --query 'Stacks[0].Outputs[?OutputKey==`InputBucketName`].OutputValue' --output text 2>/dev/null || echo "")
OUTPUT_BUCKET=$(aws cloudformation describe-stacks --stack-name LegalContractReviewStack-dev --query 'Stacks[0].Outputs[?OutputKey==`OutputBucketName`].OutputValue' --output text 2>/dev/null || echo "")

if [ -n "$INPUT_BUCKET" ]; then
  aws s3 rm s3://${INPUT_BUCKET} --recursive
fi
if [ -n "$OUTPUT_BUCKET" ]; then
  aws s3 rm s3://${OUTPUT_BUCKET} --recursive
fi

# 再度destroy
cdk destroy -c environment=dev --force
```

---

## 学習のポイント

### 1. ドキュメント処理パイプラインの設計
Textract（OCR）→ Comprehend（NLP）→ Bedrock（生成AI）の組み合わせは、ドキュメント処理の典型的なパターン。各サービスの得意分野を理解して使い分ける。

### 2. AWS CDKの実践
TypeScriptでインフラを定義することで、型チェック、コード補完、ユニットテストが可能になる。CloudFormationの直接記述と比べて生産性が大幅に向上する。

### 3. Step Functionsによるワークフロー管理
複数のLambdaを連携させる場合、Step Functionsを使うことで処理の可視化、エラーハンドリング、再実行が容易になる。

### 4. 法務AIの設計原則
AIは「支援ツール」として位置づけ、最終判断は専門家（弁護士）が行う設計にする。これは法務に限らず、専門性が求められる領域でのAI活用の基本原則。

### 5. セキュリティと機密性への配慮
契約書は機密情報を含むため、暗号化、アクセス制御、監査ログを最初から設計に組み込む。特に法律事務所では守秘義務が重要。
