# 課題1: 株式会社QuickEatsのカスタマーサポート自動化システム構築

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | AI / カスタマーサポート |
| 処理タイプ | リアルタイム / 非同期 |
| 使用IaC | CloudFormation |
| 所要時間 | 6〜8時間 |

---

## シナリオ

### 企業プロフィール

**株式会社QuickEats**は、都市部を中心に急成長中のフードデリバリースタートアップです。

| 項目 | 内容 |
|------|------|
| 業種 | フードデリバリー |
| 設立 | 2021年 |
| 従業員数 | 50名（うちサポートスタッフ5名） |
| 月間アクティブユーザー | 10万人 |
| 月商 | 5,000万円 |
| 提携レストラン | 800店舗 |
| 対応エリア | 東京23区、横浜、大阪、名古屋 |

### 現状の課題

カスタマーサポートへの問い合わせが月間3,000件を超え、5名のサポートスタッフでは対応が追いつかなくなっています。急成長に伴い、サービス品質の低下が顧客離れを引き起こすリスクが高まっています。

### 数値で示された問題

| 指標 | 現状 | 業界平均 |
|------|------|----------|
| 平均初回応答時間 | 2時間 | 30分 |
| 平均解決時間 | 8時間 | 2時間 |
| サポートスタッフ残業 | 月平均50時間/人 | - |
| 顧客満足度（5段階） | 3.2 | 4.0 |
| 問い合わせ対応コスト | 月150万円 | - |

### 問い合わせ内訳分析

過去3ヶ月の問い合わせ3,000件を分析した結果：

| カテゴリ | 割合 | 件数/月 | 自動化可能性 |
|----------|------|---------|--------------|
| 注文状況確認 | 25% | 750件 | 高 |
| 配達時間の問い合わせ | 20% | 600件 | 高 |
| キャンセル・変更方法 | 15% | 450件 | 高 |
| クーポン・ポイント | 10% | 300件 | 高 |
| 商品の不備・クレーム | 15% | 450件 | 中（エスカレーション） |
| アプリの使い方 | 10% | 300件 | 高 |
| その他複雑な問題 | 5% | 150件 | 低 |

**定型的な問い合わせ（自動化可能）：約80%（2,400件/月）**

### 解決したいこと

1. 定型的な問い合わせの80%をAIチャットボットで自動応答
2. 平均初回応答時間を2時間から15分以内に短縮
3. サポートスタッフは複雑な問い合わせ・クレーム対応に集中
4. 24時間365日対応を実現
5. 顧客満足度を3.2から4.0以上に改善

### 成功指標（KPI）

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| AI自動応答率 | 0% | 80%以上 | 3ヶ月後 |
| 平均初回応答時間 | 2時間 | 15分以内 | 1ヶ月後 |
| 顧客満足度 | 3.2 | 4.0以上 | 6ヶ月後 |
| サポートコスト | 150万円/月 | 105万円/月（30%削減） | 3ヶ月後 |
| スタッフ残業時間 | 50時間/月 | 20時間/月以下 | 3ヶ月後 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **Amazon Bedrockの実践的活用**
   - Claude 3モデルを使った自然言語処理
   - プロンプトエンジニアリングの基礎
   - RAG（Retrieval-Augmented Generation）パターンの実装

2. **サーバーレスアーキテクチャ設計**
   - Lambda + API Gatewayによるリアルタイム処理
   - DynamoDBを使ったセッション管理・履歴保存

3. **Knowledge Baseの構築と運用**
   - FAQデータのベクトル化と検索
   - Amazon OpenSearch Serverlessの活用

4. **CloudFormationによるIaC**
   - マルチリソースのテンプレート作成
   - 環境変数・パラメータ管理

### 実務で活かせる知識

- カスタマーサポート自動化の設計パターン
- 生成AIを業務システムに組み込む際のベストプラクティス
- チャットボットのUX設計（エスカレーションフロー含む）

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| 生成AI | Amazon Bedrock | Vertex AI |
| ベクトルDB | OpenSearch Serverless | Vertex AI Vector Search |
| サーバーレス関数 | Lambda | Cloud Functions |
| APIゲートウェイ | API Gateway | API Gateway / Cloud Endpoints |

---

## 使用するAWSサービス

### メインサービス

| サービス | 役割 | 選定理由 |
|----------|------|----------|
| Amazon Bedrock | 生成AIによる回答生成 | Claude 3モデルで高品質な日本語応答 |
| Bedrock Knowledge Base | FAQの検索・RAG | マネージドでベクトル検索を実現 |
| Amazon OpenSearch Serverless | ベクトルストア | Knowledge Baseのバックエンド |
| Amazon S3 | FAQドキュメント保存 | Knowledge Baseのソース |
| Amazon DynamoDB | 会話履歴・セッション管理 | 低レイテンシ、スケーラブル |
| AWS Lambda | APIロジック処理 | サーバーレスで運用負荷軽減 |
| Amazon API Gateway | REST API提供 | WebSocket対応、認証統合 |

### 補助サービス

| サービス | 役割 |
|----------|------|
| Amazon CloudWatch | ログ・メトリクス・アラート |
| AWS IAM | 権限管理 |
| AWS Secrets Manager | APIキー管理 |
| Amazon SNS | エスカレーション通知 |

---

## 前提条件

### 必要な事前知識

- AWSマネジメントコンソールの基本操作
- REST APIの基本概念
- Python 3.9以上の基礎文法
- JSONの読み書き

### 準備するもの

1. **AWSアカウント**
   - Bedrockのモデルアクセス有効化（Claude 3 Sonnet）
   - 適切なIAM権限

2. **開発環境**
   - AWS CLI v2（設定済み）
   - Python 3.9以上
   - pip（boto3インストール用）
   - コードエディタ（VS Code推奨）

3. **テストデータ**
   - FAQドキュメント（演習で作成）
   - テスト用問い合わせデータ

### Bedrockモデルアクセスの有効化手順

```
1. AWSコンソール → Amazon Bedrock
2. 左メニュー「Model access」
3. 「Manage model access」クリック
4. 「Anthropic - Claude 3 Sonnet」にチェック
5. 「Request model access」
6. 数分で有効化完了
```

---

## アーキテクチャ概要

### システム全体構成

```
[ユーザー]
    ↓ HTTPS
[API Gateway (REST API)]
    ↓
[Lambda: chat-handler]
    ├── [DynamoDB: 会話履歴取得・保存]
    ├── [Bedrock Knowledge Base: FAQ検索]
    └── [Bedrock Claude 3: 回答生成]
          ↓
    [回答をユーザーに返却]

※複雑な問い合わせの場合
    └── [SNS → サポートスタッフにエスカレーション通知]
```

### データフロー

1. ユーザーがチャットUIから質問を送信
2. API Gateway経由でLambdaが受信
3. DynamoDBから過去の会話履歴を取得
4. Knowledge BaseでFAQから関連情報を検索（RAG）
5. Bedrock Claude 3に会話履歴+検索結果+質問を送信
6. 生成された回答をユーザーに返却
7. 会話履歴をDynamoDBに保存
8. 必要に応じてエスカレーション

---

## ハンズオン手順

### フェーズ1: 基盤構築（1.5時間）

#### Step 1-1: S3バケット作成とFAQデータ準備

```bash
# S3バケット作成
aws s3 mb s3://quickeats-support-kb-${AWS_ACCOUNT_ID} --region ap-northeast-1
```

FAQドキュメント（`faq-data.json`）を作成：

```json
{
  "faqs": [
    {
      "category": "注文状況",
      "question": "注文の状況を確認したい",
      "answer": "アプリの「注文履歴」から現在の配達状況をリアルタイムで確認できます。ステータスは「調理中」「配達員割当中」「配達中」「配達完了」の4段階で表示されます。"
    },
    {
      "category": "配達時間",
      "question": "配達時間はどのくらいかかりますか",
      "answer": "平均配達時間は30-45分です。注文確定時に表示される「お届け予定時間」が目安となります。交通状況や天候により前後する場合があります。"
    },
    {
      "category": "キャンセル",
      "question": "注文をキャンセルしたい",
      "answer": "注文から5分以内であれば、アプリの注文詳細画面から「キャンセル」ボタンでキャンセル可能です。調理開始後のキャンセルはサポートまでお問い合わせください。"
    },
    {
      "category": "クーポン",
      "question": "クーポンの使い方を教えてください",
      "answer": "注文画面の「クーポンを使う」をタップし、クーポンコードを入力してください。有効なクーポンは自動的に割引が適用されます。クーポンには最低注文金額や有効期限がある場合があります。"
    },
    {
      "category": "ポイント",
      "question": "ポイントの確認・使用方法",
      "answer": "マイページの「ポイント」から現在の保有ポイントを確認できます。100ポイント=100円として、注文時に1ポイント単位で使用できます。ポイントの有効期限は最終利用日から1年間です。"
    },
    {
      "category": "アプリ",
      "question": "アプリにログインできない",
      "answer": "「パスワードを忘れた場合」からパスワードリセットをお試しください。メールアドレスに再設定用リンクが送信されます。それでも解決しない場合は、アプリを再インストールしてください。"
    },
    {
      "category": "支払い",
      "question": "支払い方法を変更したい",
      "answer": "マイページの「お支払い方法」から、クレジットカード、デビットカード、PayPay、Apple Pay、Google Payの登録・変更ができます。注文確定後の支払い方法変更はできません。"
    },
    {
      "category": "配達",
      "question": "配達員が見つからない場合",
      "answer": "配達員のマッチングには通常5-10分かかります。15分以上経過しても割り当てられない場合は、自動的にキャンセルとなり全額返金されます。"
    }
  ]
}
```

```bash
# FAQをS3にアップロード
aws s3 cp faq-data.json s3://quickeats-support-kb-${AWS_ACCOUNT_ID}/faq/
```

#### Step 1-2: DynamoDBテーブル作成

```bash
# 会話履歴テーブル
aws dynamodb create-table \
  --table-name quickeats-chat-history \
  --attribute-definitions \
    AttributeName=session_id,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=session_id,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1

# TTL設定（30日で自動削除）
aws dynamodb update-time-to-live \
  --table-name quickeats-chat-history \
  --time-to-live-specification "Enabled=true,AttributeName=ttl" \
  --region ap-northeast-1
```

### フェーズ2: Knowledge Base構築（2時間）

#### Step 2-1: OpenSearch Serverlessコレクション作成

```bash
# コレクション作成（コンソールから実施推奨）
# Bedrock → Knowledge bases → Create knowledge base
# 1. Name: quickeats-support-kb
# 2. IAM role: Create and use a new service role
# 3. Data source: S3
# 4. S3 URI: s3://quickeats-support-kb-${AWS_ACCOUNT_ID}/faq/
# 5. Vector database: Quick create a new vector store (OpenSearch Serverless)
# 6. Embeddings model: Titan Embeddings G1 - Text
```

#### Step 2-2: Knowledge Base同期

```bash
# データソースの同期（Knowledge Base作成後）
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id <YOUR_KB_ID> \
  --data-source-id <YOUR_DS_ID> \
  --region ap-northeast-1
```

### フェーズ3: Lambda関数実装（2時間）

#### Step 3-1: Lambda用IAMロール作成

```yaml
# iam-role.yaml (CloudFormation)
AWSTemplateFormatVersion: '2010-09-09'
Description: IAM Role for QuickEats Support Bot Lambda

Resources:
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: quickeats-support-lambda-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: BedrockAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - bedrock:InvokeModel
                  - bedrock:Retrieve
                Resource: '*'
        - PolicyName: DynamoDBAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:PutItem
                  - dynamodb:GetItem
                  - dynamodb:Query
                Resource: !Sub 'arn:aws:dynamodb:ap-northeast-1:${AWS::AccountId}:table/quickeats-chat-history'
        - PolicyName: SNSAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - sns:Publish
                Resource: !Sub 'arn:aws:sns:ap-northeast-1:${AWS::AccountId}:quickeats-escalation'

Outputs:
  LambdaRoleArn:
    Value: !GetAtt LambdaExecutionRole.Arn
    Export:
      Name: QuickEatsLambdaRoleArn
```

#### Step 3-2: Lambda関数コード

```python
# lambda_function.py
import json
import boto3
import time
import os
from decimal import Decimal
from datetime import datetime, timedelta

# クライアント初期化
bedrock_runtime = boto3.client('bedrock-runtime', region_name='ap-northeast-1')
bedrock_agent_runtime = boto3.client('bedrock-agent-runtime', region_name='ap-northeast-1')
dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-1')
sns = boto3.client('sns', region_name='ap-northeast-1')

# 環境変数
KNOWLEDGE_BASE_ID = os.environ['KNOWLEDGE_BASE_ID']
TABLE_NAME = os.environ['DYNAMODB_TABLE']
ESCALATION_TOPIC_ARN = os.environ.get('ESCALATION_TOPIC_ARN', '')

# DynamoDBテーブル
table = dynamodb.Table(TABLE_NAME)

def get_chat_history(session_id: str, limit: int = 5) -> list:
    """過去の会話履歴を取得"""
    try:
        response = table.query(
            KeyConditionExpression='session_id = :sid',
            ExpressionAttributeValues={':sid': session_id},
            ScanIndexForward=False,  # 新しい順
            Limit=limit
        )
        history = response.get('Items', [])
        history.reverse()  # 古い順に戻す
        return history
    except Exception as e:
        print(f"Error getting chat history: {e}")
        return []

def save_chat_message(session_id: str, role: str, content: str):
    """会話履歴を保存"""
    try:
        ttl = int((datetime.now() + timedelta(days=30)).timestamp())
        table.put_item(Item={
            'session_id': session_id,
            'timestamp': Decimal(str(time.time())),
            'role': role,
            'content': content,
            'ttl': ttl
        })
    except Exception as e:
        print(f"Error saving chat message: {e}")

def retrieve_from_knowledge_base(query: str) -> str:
    """Knowledge Baseから関連情報を検索"""
    try:
        response = bedrock_agent_runtime.retrieve(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalQuery={'text': query},
            retrievalConfiguration={
                'vectorSearchConfiguration': {
                    'numberOfResults': 3
                }
            }
        )

        contexts = []
        for result in response.get('retrievalResults', []):
            content = result.get('content', {}).get('text', '')
            if content:
                contexts.append(content)

        return '\n\n'.join(contexts)
    except Exception as e:
        print(f"Error retrieving from KB: {e}")
        return ""

def should_escalate(query: str, response_text: str) -> bool:
    """エスカレーションが必要か判定"""
    escalation_keywords = ['クレーム', '返金', '苦情', '怒り', 'ひどい', '最悪', '訴える']

    for keyword in escalation_keywords:
        if keyword in query.lower():
            return True

    if '申し訳ございません' in response_text and 'お問い合わせ' in response_text:
        return True

    return False

def send_escalation(session_id: str, query: str):
    """サポートスタッフにエスカレーション通知"""
    if ESCALATION_TOPIC_ARN:
        try:
            sns.publish(
                TopicArn=ESCALATION_TOPIC_ARN,
                Subject='【要対応】カスタマーサポートエスカレーション',
                Message=f"""
エスカレーション通知

セッションID: {session_id}
お客様の問い合わせ内容:
{query}

対応をお願いします。
                """
            )
        except Exception as e:
            print(f"Error sending escalation: {e}")

def invoke_bedrock(messages: list, system_prompt: str) -> str:
    """Bedrock Claude 3を呼び出し"""
    try:
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "system": system_prompt,
            "messages": messages
        })

        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-sonnet-20240229-v1:0',
            body=body
        )

        response_body = json.loads(response['body'].read())
        return response_body['content'][0]['text']
    except Exception as e:
        print(f"Error invoking Bedrock: {e}")
        raise

def lambda_handler(event, context):
    """メインハンドラー"""
    try:
        # リクエストパース
        body = json.loads(event.get('body', '{}'))
        session_id = body.get('session_id', 'default')
        user_message = body.get('message', '')

        if not user_message:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Message is required'})
            }

        # 会話履歴取得
        history = get_chat_history(session_id)

        # Knowledge Baseから関連情報検索
        kb_context = retrieve_from_knowledge_base(user_message)

        # システムプロンプト構築
        system_prompt = f"""あなたはQuickEatsのカスタマーサポートAIアシスタントです。
以下のルールに従って、お客様の問い合わせに丁寧に回答してください。

## ルール
1. 常に丁寧で親切な対応を心がけてください
2. 以下の参考情報を活用して、正確な回答を提供してください
3. 分からないことは「確認いたします」と伝え、サポートスタッフへの引き継ぎを案内してください
4. クレームや複雑な問題は、人間のサポートスタッフへの引き継ぎを提案してください
5. 回答は簡潔に、3-4文程度でまとめてください

## 参考情報（FAQ）
{kb_context}

## 会社情報
- サービス名: QuickEats
- サポート営業時間: 24時間対応（AIチャット）
- 有人対応: 9:00-21:00
"""

        # 会話履歴をメッセージ形式に変換
        messages = []
        for item in history:
            messages.append({
                "role": item['role'],
                "content": item['content']
            })
        messages.append({"role": "user", "content": user_message})

        # Bedrock呼び出し
        assistant_response = invoke_bedrock(messages, system_prompt)

        # 会話履歴保存
        save_chat_message(session_id, 'user', user_message)
        save_chat_message(session_id, 'assistant', assistant_response)

        # エスカレーション判定
        escalated = False
        if should_escalate(user_message, assistant_response):
            send_escalation(session_id, user_message)
            escalated = True
            assistant_response += "\n\n※この問い合わせは担当スタッフに引き継ぎました。追ってご連絡いたします。"

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'response': assistant_response,
                'session_id': session_id,
                'escalated': escalated
            }, ensure_ascii=False)
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Internal server error'})
        }
```

#### Step 3-3: Lambda関数デプロイ

```bash
# パッケージ作成
zip lambda_function.zip lambda_function.py

# Lambda関数作成
aws lambda create-function \
  --function-name quickeats-chat-handler \
  --runtime python3.11 \
  --role arn:aws:iam::${AWS_ACCOUNT_ID}:role/quickeats-support-lambda-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://lambda_function.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{KNOWLEDGE_BASE_ID=<YOUR_KB_ID>,DYNAMODB_TABLE=quickeats-chat-history}" \
  --region ap-northeast-1
```

### フェーズ4: API Gateway設定（1時間）

#### Step 4-1: REST API作成

```bash
# API作成
aws apigateway create-rest-api \
  --name quickeats-support-api \
  --description "QuickEats Customer Support API" \
  --region ap-northeast-1

# リソース作成 (/chat)
aws apigateway create-resource \
  --rest-api-id <API_ID> \
  --parent-id <ROOT_RESOURCE_ID> \
  --path-part chat \
  --region ap-northeast-1

# POSTメソッド作成
aws apigateway put-method \
  --rest-api-id <API_ID> \
  --resource-id <CHAT_RESOURCE_ID> \
  --http-method POST \
  --authorization-type NONE \
  --region ap-northeast-1

# Lambda統合設定
aws apigateway put-integration \
  --rest-api-id <API_ID> \
  --resource-id <CHAT_RESOURCE_ID> \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:ap-northeast-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-northeast-1:${AWS_ACCOUNT_ID}:function:quickeats-chat-handler/invocations \
  --region ap-northeast-1

# Lambda実行権限追加
aws lambda add-permission \
  --function-name quickeats-chat-handler \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:ap-northeast-1:${AWS_ACCOUNT_ID}:<API_ID>/*/POST/chat" \
  --region ap-northeast-1

# デプロイ
aws apigateway create-deployment \
  --rest-api-id <API_ID> \
  --stage-name prod \
  --region ap-northeast-1
```

### フェーズ5: 監視設定（30分）

#### Step 5-1: CloudWatchアラーム設定

```yaml
# monitoring.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Monitoring for QuickEats Support Bot

Resources:
  # Lambda エラーアラーム
  LambdaErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: quickeats-chat-lambda-errors
      AlarmDescription: Lambda function error rate exceeded
      MetricName: Errors
      Namespace: AWS/Lambda
      Dimensions:
        - Name: FunctionName
          Value: quickeats-chat-handler
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching

  # Lambda レイテンシーアラーム
  LambdaLatencyAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: quickeats-chat-lambda-latency
      AlarmDescription: Lambda function latency exceeded
      MetricName: Duration
      Namespace: AWS/Lambda
      Dimensions:
        - Name: FunctionName
          Value: quickeats-chat-handler
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 10000  # 10秒
      ComparisonOperator: GreaterThanThreshold

  # カスタムメトリクス用ダッシュボード
  SupportDashboard:
    Type: AWS::CloudWatch::Dashboard
    Properties:
      DashboardName: QuickEats-Support-Dashboard
      DashboardBody: !Sub |
        {
          "widgets": [
            {
              "type": "metric",
              "properties": {
                "title": "Lambda Invocations",
                "metrics": [
                  ["AWS/Lambda", "Invocations", "FunctionName", "quickeats-chat-handler"]
                ],
                "period": 300,
                "region": "ap-northeast-1"
              }
            },
            {
              "type": "metric",
              "properties": {
                "title": "Lambda Duration",
                "metrics": [
                  ["AWS/Lambda", "Duration", "FunctionName", "quickeats-chat-handler"]
                ],
                "period": 300,
                "region": "ap-northeast-1"
              }
            },
            {
              "type": "metric",
              "properties": {
                "title": "Lambda Errors",
                "metrics": [
                  ["AWS/Lambda", "Errors", "FunctionName", "quickeats-chat-handler"]
                ],
                "period": 300,
                "region": "ap-northeast-1"
              }
            },
            {
              "type": "metric",
              "properties": {
                "title": "API Gateway Requests",
                "metrics": [
                  ["AWS/ApiGateway", "Count", "ApiName", "quickeats-support-api"]
                ],
                "period": 300,
                "region": "ap-northeast-1"
              }
            }
          ]
        }
```

### フェーズ6: テスト（30分）

#### Step 6-1: API動作確認

```bash
# テストリクエスト送信
curl -X POST https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-001",
    "message": "注文の状況を確認したいのですが"
  }'

# 会話継続テスト
curl -X POST https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-001",
    "message": "キャンセルはできますか？"
  }'

# エスカレーションテスト
curl -X POST https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-002",
    "message": "商品が届かなくて非常に困っています。返金してほしいです。"
  }'
```

---

## トラブルシューティング課題

### 問題1: Knowledge Baseからの検索結果が空

**症状:**
```
Knowledge Baseに問い合わせても、関連するFAQが返ってこない。
回答が一般的すぎて、QuickEats固有の情報が含まれない。
```

**ヒント:**
1. Knowledge Baseの同期状態を確認してください
2. S3のFAQデータが正しいパスにあるか確認してください
3. OpenSearch Serverlessコレクションのステータスを確認してください

**解決方法:**
```bash
# 同期ジョブの状態確認
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id <KB_ID> \
  --data-source-id <DS_ID> \
  --region ap-northeast-1

# 再同期実行
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id <KB_ID> \
  --data-source-id <DS_ID> \
  --region ap-northeast-1
```

### 問題2: Lambda実行時にAccessDeniedエラー

**症状:**
```
Error: User: arn:aws:sts::xxx:assumed-role/quickeats-support-lambda-role/quickeats-chat-handler
is not authorized to perform: bedrock:InvokeModel
```

**ヒント:**
1. IAMロールにBedrockの権限が付与されているか確認
2. Bedrockのモデルアクセスが有効化されているか確認
3. リージョンが一致しているか確認

**解決方法:**
```bash
# IAMポリシー確認
aws iam list-attached-role-policies --role-name quickeats-support-lambda-role

# モデルアクセス確認（コンソールから）
# Bedrock → Model access → Claude 3 Sonnetが「Access granted」か確認
```

### 問題3: API Gatewayで504 Gateway Timeout

**症状:**
```
API呼び出しが30秒以上かかり、504エラーが返る
CloudWatch Logsには処理途中で終了した形跡がある
```

**ヒント:**
1. API Gatewayのタイムアウト設定を確認（デフォルト29秒）
2. Lambda関数のタイムアウト設定を確認
3. Bedrockの応答時間をログで確認

**解決方法:**
```bash
# Lambda タイムアウト延長（最大15分まで可能）
aws lambda update-function-configuration \
  --function-name quickeats-chat-handler \
  --timeout 60 \
  --region ap-northeast-1

# API Gatewayはコンソールから統合リクエストのタイムアウトを変更
# （最大29秒の制限あり。それ以上の場合はWebSocket APIを検討）
```

---

## 設計の考察ポイント

### 1. なぜAPI Gateway + Lambdaのサーバーレス構成を選択したのか？

**考察ポイント:**
- EC2やECS常駐と比較したコスト効率
- トラフィックパターン（ピーク時と平常時の差）
- 運用負荷の軽減
- スケーラビリティの自動化

**代替案:**
- ECS Fargate: 常時接続が必要な場合
- EC2 + ALB: 大量の同時接続が必要な場合

### 2. DynamoDBを会話履歴に選択した理由は？

**考察ポイント:**
- セッションベースのアクセスパターン
- スケーラビリティ要件
- TTLによる自動削除の必要性
- コスト（オンデマンドモード）

**代替案:**
- ElastiCache (Redis): 高速だがセッション管理が複雑
- RDS: 複雑なクエリが必要な場合
- S3: 長期アーカイブ用途

### 3. RAG（Knowledge Base）を採用した利点と欠点は？

**利点:**
- FAQの更新がリアルタイムに反映
- ハルシネーションの軽減
- 根拠のある回答が可能

**欠点:**
- 検索精度の調整が必要
- OpenSearch Serverlessのコスト
- レイテンシーの増加

### 4. エスカレーション判定のロジックは適切か？

**考察ポイント:**
- キーワードベースの判定の限界
- 感情分析（Comprehend）の導入検討
- 閾値の調整方法
- False Positive/Negativeのバランス

### 5. セキュリティ面で考慮すべき点は？

**考察ポイント:**
- API Gatewayの認証（Cognito連携）
- 個人情報の取り扱い（DynamoDBの暗号化）
- ログに含まれる機密情報
- レート制限の必要性

---

## 発展課題（オプション）

### 1. WebSocket APIへの移行
- リアルタイム双方向通信の実現
- ストリーミングレスポンス（タイピング中表示）
- プッシュ通知対応

### 2. Amazon Comprehendによる感情分析追加
- ユーザーの感情をリアルタイム検知
- ネガティブ判定時の自動エスカレーション
- 感情トレンドのダッシュボード化

### 3. マルチチャネル対応
- LINE公式アカウント連携
- Slack連携（社内サポート用）
- メール自動応答

### 4. A/Bテスト基盤構築
- プロンプトの改善サイクル
- 回答品質の定量評価
- CTR（クリック率）トラッキング

### 5. 多言語対応
- Amazon Translateとの連携
- 言語自動検出
- 言語別FAQ管理

---

## 想定コストと削減方法

### 月額概算コスト（月間3,000リクエスト想定）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| Amazon Bedrock (Claude 3 Sonnet) | 入力: 約300万トークン、出力: 約60万トークン | $12-15 |
| Bedrock Knowledge Base | 検索クエリ3,000回 | $0.50 |
| OpenSearch Serverless | 2 OCU（最小構成） | $350 |
| Lambda | 3,000回 × 10秒 × 256MB | $0.10 |
| API Gateway | 3,000リクエスト | $0.01 |
| DynamoDB | オンデマンド、1GB未満 | $1-2 |
| CloudWatch | ログ・メトリクス | $5 |
| **合計** | | **約$370（約55,000円）** |

### コスト削減のポイント

1. **OpenSearch Serverlessの代替検討**
   - Pinecone（無料枠あり）
   - PostgreSQL + pgvector（RDS活用）
   - → 最大$300/月削減可能

2. **Bedrockモデルの最適化**
   - Claude 3 Haikuへの切り替え（単純な質問向け）
   - → 約50%コスト削減

3. **キャッシング導入**
   - よくある質問の回答をElastiCacheにキャッシュ
   - Bedrock呼び出し回数削減

4. **Lambda Provisioned Concurrency**
   - コールドスタート対策（ただしコスト増）
   - 本番運用時のみ検討

### リソース削除手順

```bash
# 1. API Gateway削除
aws apigateway delete-rest-api --rest-api-id <API_ID> --region ap-northeast-1

# 2. Lambda関数削除
aws lambda delete-function --function-name quickeats-chat-handler --region ap-northeast-1

# 3. DynamoDBテーブル削除
aws dynamodb delete-table --table-name quickeats-chat-history --region ap-northeast-1

# 4. Knowledge Base削除（コンソールから）
# Bedrock → Knowledge bases → 削除

# 5. OpenSearch Serverlessコレクション削除（コンソールから）
# OpenSearch → Serverless → Collections → 削除

# 6. S3バケット削除
aws s3 rb s3://quickeats-support-kb-${AWS_ACCOUNT_ID} --force --region ap-northeast-1

# 7. IAMロール削除
aws iam delete-role-policy --role-name quickeats-support-lambda-role --policy-name BedrockAccess
aws iam delete-role-policy --role-name quickeats-support-lambda-role --policy-name DynamoDBAccess
aws iam delete-role --role-name quickeats-support-lambda-role

# 8. CloudWatchリソース削除
aws cloudwatch delete-alarms --alarm-names quickeats-chat-lambda-errors quickeats-chat-lambda-latency
aws cloudwatch delete-dashboards --dashboard-names QuickEats-Support-Dashboard
```

---

## 学習のポイント

### 1. RAGパターンの理解
生成AIを業務システムに組み込む際の最重要パターン。外部知識（FAQ）を検索して、コンテキストとしてLLMに渡すことで、ハルシネーションを防ぎつつ正確な回答を実現する。

### 2. サーバーレスアーキテクチャの設計原則
Lambda + API Gateway + DynamoDBの組み合わせは、変動するトラフィックに対してコスト効率が高い。ただし、コールドスタートやタイムアウトの制約を理解する必要がある。

### 3. プロンプトエンジニアリングの基礎
システムプロンプトでAIの役割・制約・参考情報を明確に定義することで、回答品質を大幅に向上させられる。

### 4. エスカレーションフローの重要性
AIで100%対応することを目指さず、人間へのエスカレーションパスを最初から設計に組み込む。これが顧客満足度を維持する鍵。

### 5. オブザーバビリティの組み込み
本番運用を見据え、ログ・メトリクス・アラートを最初から設計に含める。問題発生時の原因特定を迅速に行えるようにする。
