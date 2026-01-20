# 課題35: TalentBridge株式会社のAIマッチング非同期処理システム構築

**難易度: 🟢 初級〜中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | バッチ処理 / AI / 人材サービス |
| 処理タイプ | 非同期 / イベント駆動 |
| 使用IaC | CloudFormation |
| 所要時間 | 5〜6時間 |

---

## シナリオ

### 企業プロフィール

**TalentBridge株式会社**は、IT・Web業界に特化した人材紹介サービスを運営しています。

| 項目 | 内容 |
|------|------|
| 業種 | 人材紹介（IT特化） |
| 設立 | 2016年 |
| 従業員数 | 100名（うちキャリアアドバイザー40名） |
| 登録求職者数 | 2万人 |
| 掲載求人数 | 5,000件 |
| 月間マッチング件数 | 1万件 |
| 成約数 | 月150件 |
| 年間売上 | 20億円 |
| 平均紹介手数料 | 年収の30%（約130万円） |

### 現状の課題

求職者と求人のマッチングを人手とルールベースで行っていますが、マッチング精度が低く、成約率が上がりません。また、日次1万件のマッチング処理がピーク時にシステム負荷を与え、レスポンス低下を招いています。

### 数値で示された問題

| 指標 | 現状 | 業界平均 |
|------|------|----------|
| マッチング精度 | 15%（推薦→応募） | 25% |
| 日次マッチング処理 | 1万件 | - |
| マッチング処理時間 | 4時間（夜間バッチ） | - |
| 成約率 | 1.5% | 3% |
| キャリアアドバイザー工数 | 30%がマッチング確認 | - |
| システム負荷（ピーク時） | CPU 90%超 | - |

### 現状のマッチングロジック

```
ルールベースマッチング:
1. 勤務地: 求職者希望 ∩ 求人勤務地
2. 職種: 求職者経験職種 = 求人職種
3. 年収: 求職者希望年収 ≤ 求人提示年収
4. スキル: 求職者スキル ⊇ 求人必須スキル

問題点:
- 単純なルールでは潜在的なマッチが見落とされる
- スキルの類似性が考慮されない
- 求職者の成長可能性が考慮されない
```

### 解決したいこと

1. AIによる高精度なマッチングスコア算出
2. 日次マッチング処理の非同期・分散処理
3. リアルタイムの新着求人マッチング通知
4. マッチング理由の説明生成（キャリアアドバイザー支援）
5. 処理のスケーラビリティ確保

### 成功指標（KPI）

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| マッチング精度 | 15% | 30%以上 | 3ヶ月後 |
| 処理時間 | 4時間 | 30分以内 | 1ヶ月後 |
| 成約率 | 1.5% | 3%以上 | 6ヶ月後 |
| システム負荷 | ピーク90% | ピーク50%以下 | 1ヶ月後 |
| CA工数削減 | - | 50%削減 | 3ヶ月後 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **SQS + Lambdaによる非同期処理**
   - メッセージキューイング
   - 並列処理とスケーリング
   - デッドレターキュー

2. **Amazon Bedrockによるマッチングスコア算出**
   - 埋め込みベクトル生成
   - 類似度計算
   - 説明生成

3. **DynamoDBの設計パターン**
   - 複合キー設計
   - GSIの活用
   - クエリパターンの最適化

4. **イベント駆動アーキテクチャ**
   - 疎結合な設計
   - イベントソーシング

### 実務で活かせる知識

- 大量データの非同期処理設計
- AIを活用したマッチングシステム
- スケーラブルなバッチ処理

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| メッセージキュー | SQS | Pub/Sub |
| サーバーレス関数 | Lambda | Cloud Functions |
| NoSQL | DynamoDB | Firestore / Bigtable |
| 生成AI | Bedrock | Vertex AI |

---

## 使用するAWSサービス

### メインサービス

| サービス | 役割 | 選定理由 |
|----------|------|----------|
| Amazon SQS | マッチング処理キュー | 大量メッセージのバッファリング |
| AWS Lambda | マッチング処理実行 | 並列スケーリング |
| Amazon Bedrock | AIマッチングスコア算出 | 高精度な類似度計算 |
| Amazon DynamoDB | 求職者・求人・マッチング結果保存 | 高速読み書き |
| Amazon SNS | 通知配信 | プッシュ通知 |

### 補助サービス

| サービス | 役割 |
|----------|------|
| Amazon S3 | レジュメファイル保存 |
| Amazon EventBridge | 日次バッチトリガー |
| Amazon CloudWatch | 監視・ログ |

---

## 前提条件

### 必要な事前知識

- AWSの基本操作（S3, Lambda, DynamoDB）
- Pythonの基礎
- メッセージキューの概念

### 準備するもの

1. **AWSアカウント**
   - Bedrock有効化（Claude 3 / Titan Embeddings）
   - 適切なIAM権限

2. **開発環境**
   - AWS CLI v2
   - Python 3.9以上

3. **テストデータ**
   - サンプル求職者データ
   - サンプル求人データ

---

## アーキテクチャ概要

### システム全体構成

```
[日次バッチ]
    ↓ EventBridge（毎日 AM 2:00）
[Lambda: EnqueueMatchingJobs]
    ↓ 全求職者をキューに投入
[SQS: MatchingQueue]
    ↓ バッチサイズ10
[Lambda: ProcessMatching] × N並列
    ├── DynamoDB: 求職者情報取得
    ├── DynamoDB: 求人一覧取得
    ├── Bedrock: マッチングスコア算出
    └── DynamoDB: マッチング結果保存
    ↓ 高スコアマッチング
[SNS: MatchingNotification]
    ↓
[求職者/キャリアアドバイザーに通知]

[新着求人イベント]
    ↓
[Lambda: NewJobMatching]
    └── リアルタイムマッチング
```

### データフロー

1. **日次バッチ**: 全求職者に対してマッチング処理をキューイング
2. **並列処理**: Lambdaが自動スケールして並列にマッチング実行
3. **スコア算出**: Bedrockで求職者と求人の類似度を計算
4. **結果保存**: マッチング結果をDynamoDBに保存
5. **通知**: 高スコアマッチングをSNS経由で通知

---

## ハンズオン手順

### フェーズ1: データ基盤構築（1時間）

#### Step 1-1: DynamoDBテーブル作成

```bash
# 環境変数
export AWS_REGION=ap-northeast-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# 求職者テーブル
aws dynamodb create-table \
  --table-name talentbridge-candidates \
  --attribute-definitions \
    AttributeName=candidateId,AttributeType=S \
    AttributeName=status,AttributeType=S \
  --key-schema \
    AttributeName=candidateId,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "status-index",
      "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region ${AWS_REGION}

# 求人テーブル
aws dynamodb create-table \
  --table-name talentbridge-jobs \
  --attribute-definitions \
    AttributeName=jobId,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=category,AttributeType=S \
  --key-schema \
    AttributeName=jobId,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "status-index",
      "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"}
    },
    {
      "IndexName": "category-index",
      "KeySchema": [{"AttributeName": "category", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region ${AWS_REGION}

# マッチング結果テーブル
aws dynamodb create-table \
  --table-name talentbridge-matches \
  --attribute-definitions \
    AttributeName=candidateId,AttributeType=S \
    AttributeName=jobId,AttributeType=S \
    AttributeName=score,AttributeType=N \
  --key-schema \
    AttributeName=candidateId,KeyType=HASH \
    AttributeName=jobId,KeyType=RANGE \
  --global-secondary-indexes '[
    {
      "IndexName": "job-score-index",
      "KeySchema": [{"AttributeName": "jobId", "KeyType": "HASH"}, {"AttributeName": "score", "KeyType": "RANGE"}],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region ${AWS_REGION}
```

#### Step 1-2: SQSキュー作成

```bash
# メインキュー
aws sqs create-queue \
  --queue-name talentbridge-matching-queue \
  --attributes '{
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "86400",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:'${AWS_REGION}':'${ACCOUNT_ID}':talentbridge-matching-dlq\",\"maxReceiveCount\":\"3\"}"
  }' \
  --region ${AWS_REGION}

# デッドレターキュー
aws sqs create-queue \
  --queue-name talentbridge-matching-dlq \
  --attributes '{
    "MessageRetentionPeriod": "1209600"
  }' \
  --region ${AWS_REGION}
```

#### Step 1-3: サンプルデータ投入

```python
# scripts/seed_data.py
import boto3
import random
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-1')

# スキルリスト
SKILLS = [
    'Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Ruby', 'PHP',
    'React', 'Vue.js', 'Angular', 'Node.js', 'Django', 'Rails',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
    '機械学習', 'データ分析', 'プロジェクト管理'
]

LOCATIONS = ['東京', '大阪', '名古屋', '福岡', 'リモート']
CATEGORIES = ['バックエンド', 'フロントエンド', 'インフラ', 'データ', 'マネジメント']

# 求職者データ
candidates_table = dynamodb.Table('talentbridge-candidates')
for i in range(1, 101):  # 100名
    skills = random.sample(SKILLS, random.randint(3, 8))
    candidates_table.put_item(Item={
        'candidateId': f'CAND-{str(i).zfill(5)}',
        'name': f'求職者{i}',
        'email': f'candidate{i}@example.com',
        'skills': skills,
        'experience_years': random.randint(1, 15),
        'desired_salary': random.randint(400, 1200) * 10000,
        'desired_locations': random.sample(LOCATIONS, random.randint(1, 3)),
        'category': random.choice(CATEGORIES),
        'status': 'active',
        'profile_summary': f'{random.choice(CATEGORIES)}エンジニアとして{random.randint(1,10)}年の経験。{", ".join(skills[:3])}が得意。',
    })

print("Inserted 100 candidates")

# 求人データ
jobs_table = dynamodb.Table('talentbridge-jobs')
for i in range(1, 51):  # 50件
    required_skills = random.sample(SKILLS, random.randint(2, 5))
    preferred_skills = random.sample([s for s in SKILLS if s not in required_skills], random.randint(0, 3))
    jobs_table.put_item(Item={
        'jobId': f'JOB-{str(i).zfill(5)}',
        'title': f'{random.choice(CATEGORIES)}エンジニア',
        'company': f'テスト企業{i}株式会社',
        'required_skills': required_skills,
        'preferred_skills': preferred_skills,
        'min_experience': random.randint(0, 5),
        'salary_min': random.randint(400, 800) * 10000,
        'salary_max': random.randint(800, 1500) * 10000,
        'location': random.choice(LOCATIONS),
        'category': random.choice(CATEGORIES),
        'status': 'active',
        'job_description': f'{random.choice(CATEGORIES)}チームでの開発業務。{", ".join(required_skills)}の経験必須。',
    })

print("Inserted 50 jobs")
```

### フェーズ2: Lambda関数実装（2時間）

#### Step 2-1: マッチングジョブ投入Lambda

```python
# lambda/enqueue_matching/handler.py
import boto3
import json
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
sqs = boto3.client('sqs')

CANDIDATES_TABLE = os.environ['CANDIDATES_TABLE']
QUEUE_URL = os.environ['QUEUE_URL']

def handler(event, context):
    """アクティブな求職者をマッチングキューに投入"""
    table = dynamodb.Table(CANDIDATES_TABLE)
    batch_id = datetime.utcnow().strftime('%Y%m%d%H%M%S')

    # アクティブな求職者を取得
    response = table.query(
        IndexName='status-index',
        KeyConditionExpression='#status = :status',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={':status': 'active'}
    )

    candidates = response.get('Items', [])

    # ページネーション対応
    while 'LastEvaluatedKey' in response:
        response = table.query(
            IndexName='status-index',
            KeyConditionExpression='#status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': 'active'},
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        candidates.extend(response.get('Items', []))

    print(f"Found {len(candidates)} active candidates")

    # SQSにメッセージ送信（バッチ送信）
    entries = []
    for i, candidate in enumerate(candidates):
        entries.append({
            'Id': str(i),
            'MessageBody': json.dumps({
                'batchId': batch_id,
                'candidateId': candidate['candidateId'],
                'processType': 'full_matching'
            })
        })

        # 10件ずつバッチ送信
        if len(entries) == 10:
            sqs.send_message_batch(QueueUrl=QUEUE_URL, Entries=entries)
            entries = []

    # 残りを送信
    if entries:
        sqs.send_message_batch(QueueUrl=QUEUE_URL, Entries=entries)

    return {
        'batchId': batch_id,
        'enqueuedCount': len(candidates),
        'status': 'ENQUEUED'
    }
```

#### Step 2-2: マッチング処理Lambda

```python
# lambda/process_matching/handler.py
import boto3
import json
import os
from decimal import Decimal
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
bedrock = boto3.client('bedrock-runtime', region_name='ap-northeast-1')
sns = boto3.client('sns')

CANDIDATES_TABLE = os.environ['CANDIDATES_TABLE']
JOBS_TABLE = os.environ['JOBS_TABLE']
MATCHES_TABLE = os.environ['MATCHES_TABLE']
NOTIFICATION_TOPIC = os.environ.get('NOTIFICATION_TOPIC', '')
SCORE_THRESHOLD = float(os.environ.get('SCORE_THRESHOLD', '0.7'))

candidates_table = dynamodb.Table(CANDIDATES_TABLE)
jobs_table = dynamodb.Table(JOBS_TABLE)
matches_table = dynamodb.Table(MATCHES_TABLE)

def get_embedding(text: str) -> list:
    """Titan Embeddingsでテキストのベクトルを取得"""
    body = json.dumps({
        "inputText": text[:8000]  # 制限
    })

    response = bedrock.invoke_model(
        modelId='amazon.titan-embed-text-v1',
        body=body
    )

    result = json.loads(response['body'].read())
    return result['embedding']

def cosine_similarity(vec1: list, vec2: list) -> float:
    """コサイン類似度を計算"""
    import math

    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))

    if norm1 == 0 or norm2 == 0:
        return 0.0

    return dot_product / (norm1 * norm2)

def calculate_skill_match(candidate_skills: list, required_skills: list, preferred_skills: list) -> float:
    """スキルマッチ度を計算"""
    if not required_skills:
        return 1.0

    required_match = len(set(candidate_skills) & set(required_skills)) / len(required_skills)
    preferred_match = len(set(candidate_skills) & set(preferred_skills)) / max(len(preferred_skills), 1) if preferred_skills else 0

    return required_match * 0.7 + preferred_match * 0.3

def calculate_salary_match(desired_salary: int, salary_min: int, salary_max: int) -> float:
    """年収マッチ度を計算"""
    if desired_salary <= salary_min:
        return 0.5  # 希望が最低以下
    elif desired_salary <= salary_max:
        return 1.0  # 範囲内
    else:
        # 希望が最高を超える場合、超過率で減点
        over_ratio = (desired_salary - salary_max) / salary_max
        return max(0, 1.0 - over_ratio)

def generate_match_reason(candidate: dict, job: dict, score: float) -> str:
    """マッチング理由を生成"""
    prompt = f"""以下の求職者と求人のマッチング理由を、キャリアアドバイザー向けに簡潔に説明してください。

【求職者】
- スキル: {', '.join(candidate.get('skills', []))}
- 経験年数: {candidate.get('experience_years', 0)}年
- 希望勤務地: {', '.join(candidate.get('desired_locations', []))}
- プロフィール: {candidate.get('profile_summary', '')}

【求人】
- 職種: {job.get('title', '')}
- 企業: {job.get('company', '')}
- 必須スキル: {', '.join(job.get('required_skills', []))}
- 勤務地: {job.get('location', '')}
- 求人内容: {job.get('job_description', '')}

【マッチングスコア】
{score:.1%}

50文字以内で簡潔に理由を説明してください。"""

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 200,
        "messages": [{"role": "user", "content": prompt}]
    })

    try:
        response = bedrock.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            body=body
        )
        result = json.loads(response['body'].read())
        return result['content'][0]['text'].strip()
    except Exception as e:
        print(f"Error generating reason: {e}")
        return "スキルと経験がマッチしています"

def process_candidate(candidate_id: str) -> list:
    """求職者に対するマッチング処理"""
    # 求職者情報取得
    candidate_response = candidates_table.get_item(Key={'candidateId': candidate_id})
    candidate = candidate_response.get('Item')

    if not candidate:
        print(f"Candidate not found: {candidate_id}")
        return []

    # 求職者のプロフィールをベクトル化
    candidate_text = f"""
    スキル: {', '.join(candidate.get('skills', []))}
    経験年数: {candidate.get('experience_years', 0)}年
    希望カテゴリ: {candidate.get('category', '')}
    プロフィール: {candidate.get('profile_summary', '')}
    """
    candidate_embedding = get_embedding(candidate_text)

    # アクティブな求人を取得
    jobs_response = jobs_table.query(
        IndexName='status-index',
        KeyConditionExpression='#status = :status',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={':status': 'active'}
    )
    jobs = jobs_response.get('Items', [])

    matches = []

    for job in jobs:
        # 求人のテキストをベクトル化
        job_text = f"""
        職種: {job.get('title', '')}
        必須スキル: {', '.join(job.get('required_skills', []))}
        歓迎スキル: {', '.join(job.get('preferred_skills', []))}
        カテゴリ: {job.get('category', '')}
        求人内容: {job.get('job_description', '')}
        """
        job_embedding = get_embedding(job_text)

        # 類似度計算
        semantic_score = cosine_similarity(candidate_embedding, job_embedding)

        # スキルマッチ
        skill_score = calculate_skill_match(
            candidate.get('skills', []),
            job.get('required_skills', []),
            job.get('preferred_skills', [])
        )

        # 年収マッチ
        salary_score = calculate_salary_match(
            candidate.get('desired_salary', 0),
            job.get('salary_min', 0),
            job.get('salary_max', 0)
        )

        # 総合スコア（重み付け）
        total_score = (
            semantic_score * 0.4 +
            skill_score * 0.4 +
            salary_score * 0.2
        )

        if total_score >= SCORE_THRESHOLD:
            # マッチング理由生成（高スコアのみ）
            reason = generate_match_reason(candidate, job, total_score)

            match_result = {
                'candidateId': candidate_id,
                'jobId': job['jobId'],
                'score': Decimal(str(round(total_score, 4))),
                'semanticScore': Decimal(str(round(semantic_score, 4))),
                'skillScore': Decimal(str(round(skill_score, 4))),
                'salaryScore': Decimal(str(round(salary_score, 4))),
                'reason': reason,
                'matchedAt': datetime.utcnow().isoformat(),
                'status': 'new'
            }

            # DynamoDBに保存
            matches_table.put_item(Item=match_result)
            matches.append(match_result)

    return matches

def handler(event, context):
    """SQSからのメッセージを処理"""
    results = []

    for record in event['Records']:
        message = json.loads(record['body'])
        candidate_id = message['candidateId']

        print(f"Processing matching for: {candidate_id}")

        try:
            matches = process_candidate(candidate_id)

            # 高スコアマッチングを通知
            high_score_matches = [m for m in matches if float(m['score']) >= 0.8]

            if high_score_matches and NOTIFICATION_TOPIC:
                # 求職者取得
                candidate = candidates_table.get_item(Key={'candidateId': candidate_id}).get('Item', {})

                sns.publish(
                    TopicArn=NOTIFICATION_TOPIC,
                    Subject=f'新規マッチング: {candidate.get("name", candidate_id)}',
                    Message=f"""
高スコアマッチングが見つかりました。

求職者: {candidate.get('name', candidate_id)}
マッチング件数: {len(high_score_matches)}件

【マッチング求人】
""" + '\n'.join([f"- {m['jobId']}: スコア{float(m['score']):.1%} - {m['reason']}" for m in high_score_matches[:5]])
                )

            results.append({
                'candidateId': candidate_id,
                'matchCount': len(matches),
                'highScoreCount': len(high_score_matches),
                'status': 'SUCCESS'
            })

        except Exception as e:
            print(f"Error processing {candidate_id}: {e}")
            results.append({
                'candidateId': candidate_id,
                'status': 'FAILED',
                'error': str(e)
            })

    return {
        'processed': len(results),
        'results': results
    }
```

### フェーズ3: イベント設定とデプロイ（1時間）

#### Step 3-1: CloudFormationテンプレート

```yaml
# cloudformation/template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: TalentBridge AI Matching System

Parameters:
  Environment:
    Type: String
    Default: dev
  ScoreThreshold:
    Type: String
    Default: '0.7'

Resources:
  # SQS Queues
  MatchingQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub 'talentbridge-matching-queue-${Environment}'
      VisibilityTimeout: 300
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt MatchingDLQ.Arn
        maxReceiveCount: 3

  MatchingDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub 'talentbridge-matching-dlq-${Environment}'
      MessageRetentionPeriod: 1209600

  # SNS Topic
  NotificationTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub 'talentbridge-matching-notifications-${Environment}'

  # Lambda Execution Role
  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'talentbridge-matching-lambda-role-${Environment}'
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
        - PolicyName: DynamoDBAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:GetItem
                  - dynamodb:PutItem
                  - dynamodb:Query
                  - dynamodb:Scan
                Resource:
                  - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/talentbridge-*'
                  - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/talentbridge-*/index/*'
        - PolicyName: SQSAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - sqs:SendMessage
                  - sqs:SendMessageBatch
                  - sqs:ReceiveMessage
                  - sqs:DeleteMessage
                  - sqs:GetQueueAttributes
                Resource: !GetAtt MatchingQueue.Arn
        - PolicyName: BedrockAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - bedrock:InvokeModel
                Resource: '*'
        - PolicyName: SNSAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - sns:Publish
                Resource: !Ref NotificationTopic

  # Lambda Functions
  EnqueueMatchingFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'talentbridge-enqueue-matching-${Environment}'
      Runtime: python3.11
      Handler: handler.handler
      Role: !GetAtt LambdaRole.Arn
      Timeout: 300
      MemorySize: 256
      Environment:
        Variables:
          CANDIDATES_TABLE: talentbridge-candidates
          QUEUE_URL: !Ref MatchingQueue
      Code:
        ZipFile: |
          # Placeholder - replace with actual code

  ProcessMatchingFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'talentbridge-process-matching-${Environment}'
      Runtime: python3.11
      Handler: handler.handler
      Role: !GetAtt LambdaRole.Arn
      Timeout: 120
      MemorySize: 512
      Environment:
        Variables:
          CANDIDATES_TABLE: talentbridge-candidates
          JOBS_TABLE: talentbridge-jobs
          MATCHES_TABLE: talentbridge-matches
          NOTIFICATION_TOPIC: !Ref NotificationTopic
          SCORE_THRESHOLD: !Ref ScoreThreshold
      Code:
        ZipFile: |
          # Placeholder - replace with actual code

  # SQS Lambda Event Source
  MatchingQueueEventSource:
    Type: AWS::Lambda::EventSourceMapping
    Properties:
      BatchSize: 5
      EventSourceArn: !GetAtt MatchingQueue.Arn
      FunctionName: !GetAtt ProcessMatchingFunction.Arn
      Enabled: true

  # EventBridge Rule (Daily Batch)
  DailyBatchRule:
    Type: AWS::Events::Rule
    Properties:
      Name: !Sub 'talentbridge-daily-matching-${Environment}'
      Description: Daily matching batch trigger
      ScheduleExpression: 'cron(0 17 * * ? *)'  # AM 2:00 JST
      State: ENABLED
      Targets:
        - Id: EnqueueMatchingTarget
          Arn: !GetAtt EnqueueMatchingFunction.Arn

  EnqueueMatchingPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref EnqueueMatchingFunction
      Action: lambda:InvokeFunction
      Principal: events.amazonaws.com
      SourceArn: !GetAtt DailyBatchRule.Arn

Outputs:
  QueueUrl:
    Value: !Ref MatchingQueue
  NotificationTopicArn:
    Value: !Ref NotificationTopic
```

### フェーズ4: テストと監視（1時間）

#### Step 4-1: 手動テスト

```bash
# サンプルデータ投入
python scripts/seed_data.py

# キューにテストメッセージ送信
aws sqs send-message \
  --queue-url https://sqs.${AWS_REGION}.amazonaws.com/${ACCOUNT_ID}/talentbridge-matching-queue-dev \
  --message-body '{"candidateId": "CAND-00001", "processType": "full_matching"}'

# Lambda実行ログ確認
aws logs tail /aws/lambda/talentbridge-process-matching-dev --follow

# マッチング結果確認
aws dynamodb scan \
  --table-name talentbridge-matches \
  --filter-expression "candidateId = :cid" \
  --expression-attribute-values '{":cid": {"S": "CAND-00001"}}'
```

#### Step 4-2: 一括テスト

```bash
# 全求職者のマッチング処理を開始
aws lambda invoke \
  --function-name talentbridge-enqueue-matching-dev \
  --payload '{}' \
  response.json

cat response.json

# キュー状態確認
aws sqs get-queue-attributes \
  --queue-url https://sqs.${AWS_REGION}.amazonaws.com/${ACCOUNT_ID}/talentbridge-matching-queue-dev \
  --attribute-names ApproximateNumberOfMessages
```

---

## トラブルシューティング課題

### 問題1: Lambdaがタイムアウト

**症状:**
```
Task timed out after 120.00 seconds
マッチング処理が完了しない
```

**ヒント:**
1. Bedrock呼び出し回数を確認
2. 求人数が多すぎないか確認
3. バッチサイズの調整

**解決方法:**
```python
# 求人数を制限
jobs = jobs_response.get('Items', [])[:50]  # 上位50件のみ

# 埋め込み生成をキャッシュ（DynamoDB/ElastiCache）
def get_cached_embedding(key: str, text: str) -> list:
    # キャッシュから取得、なければ生成してキャッシュ
    pass
```

### 問題2: SQSメッセージが処理されない

**症状:**
```
メッセージがDLQに溜まる
Lambda呼び出しエラー
```

**ヒント:**
1. Lambda実行ロールの権限を確認
2. イベントソースマッピングの設定を確認
3. VisibilityTimeoutとLambda Timeoutの関係

**解決方法:**
```bash
# イベントソースマッピング確認
aws lambda list-event-source-mappings --function-name talentbridge-process-matching-dev

# VisibilityTimeoutはLambda Timeoutの6倍以上推奨
aws sqs set-queue-attributes \
  --queue-url <QUEUE_URL> \
  --attributes '{"VisibilityTimeout": "720"}'
```

### 問題3: マッチングスコアが全体的に低い

**症状:**
```
全てのマッチングスコアが閾値以下
高スコアマッチングが出ない
```

**ヒント:**
1. 埋め込み生成のテキストを確認
2. スコアの重み付けを調整
3. 閾値を下げて検証

**解決方法:**
```python
# スコア計算の調整
total_score = (
    semantic_score * 0.5 +  # 意味的類似度を重視
    skill_score * 0.35 +
    salary_score * 0.15
)

# 閾値を調整
SCORE_THRESHOLD = 0.6  # 0.7から下げる
```

---

## 設計の考察ポイント

### 1. SQS + Lambda パターンの利点

**考察ポイント:**
- 疎結合による耐障害性
- 自動スケーリング
- リトライ・DLQによるエラー処理
- コスト効率（アイドル時ゼロ）

### 2. 埋め込みベクトルの活用

**考察ポイント:**
- ルールベース vs セマンティック検索
- 埋め込みのキャッシング戦略
- 次元数とコストのトレードオフ

### 3. マッチングスコアの設計

**考察ポイント:**
- 複数指標の重み付け
- ビジネス要件との整合性
- 説明可能性の確保

### 4. リアルタイム vs バッチ

**考察ポイント:**
- 新着求人の即時マッチング
- 日次バッチの必要性
- ハイブリッドアプローチ

### 5. スケーラビリティ

**考察ポイント:**
- 求職者・求人数が10倍になった場合
- Bedrockのレート制限
- コストのスケール

---

## 発展課題（オプション）

### 1. 埋め込みベクトルのキャッシング
- DynamoDBに埋め込みを保存
- 更新時のみ再計算
- コスト削減と高速化

### 2. ストリーミングマッチング
- 新着求人投稿時の即時マッチング
- DynamoDB Streamsの活用
- リアルタイム通知

### 3. フィードバックループ
- 応募/不応募の結果収集
- マッチングモデルの改善
- A/Bテスト

### 4. レコメンデーションUI
- APIエンドポイント追加
- マッチング結果の表示
- フィルタリング・ソート

### 5. 類似求職者検索
- 企業向け機能
- 条件に合う求職者のサジェスト

---

## 想定コストと削減方法

### 月額概算コスト（日次1万件マッチング想定）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| Amazon Bedrock (Titan Embeddings) | 30万回 × $0.0001/1K tokens | $30 |
| Amazon Bedrock (Claude Haiku) | 5万回 × $0.00025/1K tokens | $15 |
| AWS Lambda | 30万回 × 60秒 × 512MB | $50 |
| Amazon SQS | 60万メッセージ | $0.30 |
| Amazon DynamoDB | オンデマンド | $20 |
| Amazon SNS | 通知 | $1 |
| CloudWatch | ログ | $5 |
| **合計** | | **約$121（約18,000円）** |

### コスト削減のポイント

1. **埋め込みキャッシング**
   - 求人の埋め込みを事前計算して保存
   - → Bedrock呼び出し50%削減

2. **バッチ処理の最適化**
   - 変更のあった求職者のみ処理
   - 増分マッチング

3. **理由生成の選択的実行**
   - 高スコアマッチングのみ理由生成
   - → Claude呼び出し70%削減

4. **Lambda ARM64**
   - Graviton2プロセッサ使用
   - → Lambda コスト20%削減

### リソース削除手順

```bash
# CloudFormation削除
aws cloudformation delete-stack --stack-name talentbridge-matching

# DynamoDBテーブル（CloudFormation外で作成した場合）
aws dynamodb delete-table --table-name talentbridge-candidates
aws dynamodb delete-table --table-name talentbridge-jobs
aws dynamodb delete-table --table-name talentbridge-matches

# SQS（CloudFormation外）
aws sqs delete-queue --queue-url <MATCHING_QUEUE_URL>
aws sqs delete-queue --queue-url <DLQ_URL>

# SNS（CloudFormation外）
aws sns delete-topic --topic-arn <TOPIC_ARN>
```

---

## 学習のポイント

### 1. SQS + Lambda の非同期処理パターン
大量データを効率的に処理する基本パターン。キューによるバッファリング、自動スケーリング、DLQによるエラー処理を組み合わせる。

### 2. 埋め込みベクトルを使ったセマンティック検索
テキストの意味的類似度を計算する手法。ルールベースでは捕捉できない潜在的なマッチングを発見できる。

### 3. 複合スコアリング
複数の指標を組み合わせて総合スコアを算出する設計。ビジネス要件に応じた重み付けが重要。

### 4. イベント駆動アーキテクチャ
EventBridge、SQS、SNSを組み合わせた疎結合なシステム設計。スケーラビリティと耐障害性を両立。

### 5. MLとビジネスロジックの統合
AI/MLの出力をビジネスロジック（年収マッチ等）と組み合わせて、実用的なシステムを構築する方法。
