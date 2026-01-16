# 課題15: LearnHub株式会社の動画教材自動字幕生成システム構築

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | AI / メディア処理 / EdTech |
| 処理タイプ | バッチ / 非同期 |
| 使用IaC | CloudFormation |
| 所要時間 | 5〜6時間 |

---

## シナリオ

### 企業プロフィール

**LearnHub株式会社**は、プログラミング・IT技術に特化したオンライン学習プラットフォームを運営するEdTechスタートアップです。

| 項目 | 内容 |
|------|------|
| 業種 | EdTech（オンライン教育） |
| 設立 | 2020年 |
| 従業員数 | 25名 |
| 月間アクティブ視聴者 | 3万人 |
| 登録ユーザー | 10万人 |
| 動画コンテンツ数 | 500本（総時間300時間） |
| 平均動画長 | 36分 |
| 月商 | 2,500万円 |
| 講師数 | 30名（外部委託含む） |

### 現状の課題

海外展開を進めるため、既存の日本語動画コンテンツに多言語字幕を追加したいが、外注費用と時間がかかりすぎています。また、聴覚障害者向けのアクセシビリティ対応も求められています。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| 字幕付き動画比率 | 20%（日本語のみ） | 100%（日英中） |
| 字幕作成コスト | 15,000円/時間 | 3,000円/時間以下 |
| 字幕作成リードタイム | 2週間 | 24時間以内 |
| 多言語対応言語数 | 日本語のみ | 日本語・英語・中国語 |
| 月間新規動画 | 20本 | - |
| 字幕外注費 | 月90万円 | 月20万円以下 |

### 現状の字幕作成フロー

```
1. 動画を外部字幕制作会社に送付
2. 制作会社が文字起こし（3-5日）
3. 内容確認・修正依頼（2-3日）
4. 翻訳発注（3-5日）
5. 翻訳確認・修正（2-3日）
6. VTT/SRTファイル納品
7. 動画プレイヤーへ統合
→ 合計: 2-3週間
```

### 解決したいこと

1. 動画の音声からの自動文字起こし（日本語）
2. 日本語字幕の自動生成（タイムスタンプ付き）
3. 英語・中国語への自動翻訳
4. 字幕ファイル（VTT形式）の自動生成
5. 生成された字幕の品質向上（AI校正）

### 成功指標（KPI）

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| 字幕カバー率 | 20% | 100% | 3ヶ月後 |
| 文字起こし精度 | - | 95%以上 | 1ヶ月後 |
| 字幕作成時間 | 2週間 | 24時間以内 | 1ヶ月後 |
| コスト削減率 | - | 70%以上 | 3ヶ月後 |
| 海外ユーザー増加 | - | +30% | 6ヶ月後 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **Amazon Transcribeの実践活用**
   - 音声からの自動文字起こし
   - 日本語モデルの活用
   - カスタムボキャブラリー設定

2. **Amazon Translateの実践活用**
   - 多言語翻訳
   - 用語集（Terminology）の活用
   - バッチ翻訳処理

3. **Amazon Bedrockによる品質向上**
   - 字幕の校正・修正
   - 文脈を考慮した翻訳改善

4. **メディアパイプラインの構築**
   - S3イベント駆動
   - Lambda + SQSによる非同期処理
   - VTT/SRT形式の生成

### 実務で活かせる知識

- 音声処理パイプラインの設計
- 多言語対応システムの構築
- メディアファイル処理の自動化

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| 音声認識 | Amazon Transcribe | Speech-to-Text |
| 翻訳 | Amazon Translate | Cloud Translation |
| 生成AI | Bedrock | Vertex AI |
| メディア処理 | MediaConvert | Transcoder API |

---

## 使用するAWSサービス

### メインサービス

| サービス | 役割 | 選定理由 |
|----------|------|----------|
| Amazon Transcribe | 音声→テキスト変換 | 日本語対応、字幕形式出力 |
| Amazon Translate | 多言語翻訳 | リアルタイム翻訳、用語集対応 |
| Amazon Bedrock | 字幕校正・品質向上 | 文脈理解、自然な表現 |
| AWS Lambda | 各処理の実行 | サーバーレス |
| Amazon S3 | 動画・字幕ファイル保存 | 大容量対応 |
| Amazon SQS | 非同期処理キュー | 順序制御、リトライ |

### 補助サービス

| サービス | 役割 |
|----------|------|
| Amazon DynamoDB | 処理ステータス管理 |
| Amazon SNS | 処理完了通知 |
| Amazon CloudWatch | 監視・ログ |

---

## 前提条件

### 必要な事前知識

- AWSの基本操作（S3, Lambda）
- Python基礎
- 字幕フォーマット（VTT/SRT）の基本理解

### 準備するもの

1. **AWSアカウント**
   - Bedrock有効化（Claude 3 Haiku推奨）
   - Transcribe/Translate アクセス権限

2. **開発環境**
   - AWS CLI v2
   - Python 3.9以上

3. **テストデータ**
   - サンプル動画ファイル（MP4, 5-10分）
   - または音声ファイル（MP3/WAV）

---

## アーキテクチャ概要

### システム全体構成

```
[講師が動画アップロード]
        ↓
[S3: 動画入力バケット]
        ↓ S3イベント
[SQS: 処理キュー]
        ↓
[Lambda: transcribe-starter]
        ↓
[Amazon Transcribe]（非同期ジョブ）
        ↓ 完了イベント
[Lambda: transcribe-callback]
        ↓
[S3: 日本語字幕JSON保存]
        ↓
[Lambda: translator]
        ├── Amazon Translate（英語）
        └── Amazon Translate（中国語）
        ↓
[Lambda: vtt-generator]
        ├── Bedrock（字幕校正）
        └── VTT/SRTファイル生成
        ↓
[S3: 字幕出力バケット]
        ↓
[SNS: 完了通知]
```

### 字幕生成フロー

1. **動画アップロード**: S3にMP4をアップロード
2. **音声抽出**: Transcribeが自動で音声を認識
3. **文字起こし**: 日本語テキスト+タイムスタンプ生成
4. **翻訳**: Translateで英語・中国語に翻訳
5. **校正**: Bedrockで字幕の品質向上
6. **出力**: VTT形式で3言語分の字幕ファイル生成
7. **通知**: 処理完了をメール通知

---

## ハンズオン手順

### フェーズ1: 基盤構築（1時間）

#### Step 1-1: S3バケット作成

```bash
# 環境変数設定
export AWS_REGION=ap-northeast-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# バケット作成
aws s3 mb s3://learnhub-videos-input-${ACCOUNT_ID} --region ${AWS_REGION}
aws s3 mb s3://learnhub-subtitles-output-${ACCOUNT_ID} --region ${AWS_REGION}

# CORSポリシー設定（動画プレイヤー用）
cat > cors.json << 'EOF'
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "HEAD"],
            "AllowedHeaders": ["*"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF

aws s3api put-bucket-cors --bucket learnhub-subtitles-output-${ACCOUNT_ID} --cors-configuration file://cors.json
```

#### Step 1-2: DynamoDBテーブル作成

```bash
aws dynamodb create-table \
  --table-name learnhub-subtitle-jobs \
  --attribute-definitions \
    AttributeName=jobId,AttributeType=S \
  --key-schema \
    AttributeName=jobId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ${AWS_REGION}
```

#### Step 1-3: SQSキュー作成

```bash
aws sqs create-queue \
  --queue-name learnhub-subtitle-queue \
  --attributes '{
    "VisibilityTimeout": "900",
    "MessageRetentionPeriod": "86400"
  }' \
  --region ${AWS_REGION}
```

#### Step 1-4: SNSトピック作成

```bash
aws sns create-topic --name learnhub-subtitle-notifications --region ${AWS_REGION}

# メール購読（実際のメールアドレスに変更）
aws sns subscribe \
  --topic-arn arn:aws:sns:${AWS_REGION}:${ACCOUNT_ID}:learnhub-subtitle-notifications \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --region ${AWS_REGION}
```

### フェーズ2: Lambda関数実装（2.5時間）

#### Step 2-1: IAMロール作成

```yaml
# cloudformation/iam-role.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: IAM Role for LearnHub Subtitle System

Parameters:
  AccountId:
    Type: String
  Environment:
    Type: String
    Default: dev

Resources:
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'learnhub-subtitle-lambda-role-${Environment}'
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
        - PolicyName: TranscribeAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - transcribe:StartTranscriptionJob
                  - transcribe:GetTranscriptionJob
                  - transcribe:ListTranscriptionJobs
                Resource: '*'
        - PolicyName: TranslateAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - translate:TranslateText
                Resource: '*'
        - PolicyName: BedrockAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - bedrock:InvokeModel
                Resource: '*'
        - PolicyName: S3Access
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:PutObject
                  - s3:ListBucket
                Resource:
                  - !Sub 'arn:aws:s3:::learnhub-videos-input-${AccountId}'
                  - !Sub 'arn:aws:s3:::learnhub-videos-input-${AccountId}/*'
                  - !Sub 'arn:aws:s3:::learnhub-subtitles-output-${AccountId}'
                  - !Sub 'arn:aws:s3:::learnhub-subtitles-output-${AccountId}/*'
        - PolicyName: DynamoDBAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:PutItem
                  - dynamodb:UpdateItem
                  - dynamodb:GetItem
                Resource: !Sub 'arn:aws:dynamodb:ap-northeast-1:${AccountId}:table/learnhub-subtitle-jobs'
        - PolicyName: SQSAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - sqs:ReceiveMessage
                  - sqs:DeleteMessage
                  - sqs:SendMessage
                  - sqs:GetQueueAttributes
                Resource: !Sub 'arn:aws:sqs:ap-northeast-1:${AccountId}:learnhub-subtitle-queue'
        - PolicyName: SNSAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - sns:Publish
                Resource: !Sub 'arn:aws:sns:ap-northeast-1:${AccountId}:learnhub-subtitle-notifications'

Outputs:
  RoleArn:
    Value: !GetAtt LambdaExecutionRole.Arn
```

```bash
# CloudFormationデプロイ
aws cloudformation deploy \
  --template-file cloudformation/iam-role.yaml \
  --stack-name learnhub-subtitle-iam \
  --parameter-overrides AccountId=${ACCOUNT_ID} Environment=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${AWS_REGION}
```

#### Step 2-2: Transcribe起動Lambda

```python
# lambda/transcribe_starter.py
import json
import boto3
import os
from datetime import datetime
from urllib.parse import unquote_plus

transcribe = boto3.client('transcribe')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('learnhub-subtitle-jobs')

def lambda_handler(event, context):
    for record in event['Records']:
        # SQSメッセージからS3イベント取得
        body = json.loads(record['body'])
        s3_event = body['Records'][0]

        bucket = s3_event['s3']['bucket']['name']
        key = unquote_plus(s3_event['s3']['object']['key'])

        # 動画ファイルのみ処理
        if not key.lower().endswith(('.mp4', '.mp3', '.wav', '.m4a')):
            print(f"Skipping non-media file: {key}")
            continue

        video_id = key.split('/')[-1].rsplit('.', 1)[0]
        job_name = f"learnhub-{video_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        print(f"Starting transcription job: {job_name}")

        # Transcribeジョブ開始
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': f's3://{bucket}/{key}'},
            MediaFormat=key.split('.')[-1].lower(),
            LanguageCode='ja-JP',
            OutputBucketName=os.environ['OUTPUT_BUCKET'],
            OutputKey=f'transcripts/{video_id}.json',
            Subtitles={
                'Formats': ['vtt', 'srt'],
                'OutputStartIndex': 1
            },
            Settings={
                'ShowSpeakerLabels': False,
                'ShowAlternatives': False,
            }
        )

        # DynamoDBにジョブ情報保存
        table.put_item(Item={
            'jobId': job_name,
            'videoId': video_id,
            'status': 'TRANSCRIBING',
            'sourceBucket': bucket,
            'sourceKey': key,
            'startedAt': datetime.utcnow().isoformat(),
            'languages': ['ja', 'en', 'zh']
        })

    return {'statusCode': 200, 'body': 'Transcription started'}
```

#### Step 2-3: Transcribe完了処理Lambda

```python
# lambda/transcribe_callback.py
import json
import boto3
import os
from datetime import datetime

s3 = boto3.client('s3')
translate = boto3.client('translate')
bedrock = boto3.client('bedrock-runtime', region_name='ap-northeast-1')
dynamodb = boto3.resource('dynamodb')
sqs = boto3.client('sqs')

table = dynamodb.Table('learnhub-subtitle-jobs')

def lambda_handler(event, context):
    # EventBridgeからTranscribe完了イベントを受信
    detail = event['detail']
    job_name = detail['TranscriptionJobName']
    status = detail['TranscriptionJobStatus']

    print(f"Job {job_name} status: {status}")

    if status != 'COMPLETED':
        table.update_item(
            Key={'jobId': job_name},
            UpdateExpression='SET #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': f'FAILED: {status}'}
        )
        return

    # DynamoDBからジョブ情報取得
    response = table.get_item(Key={'jobId': job_name})
    job_info = response.get('Item', {})
    video_id = job_info.get('videoId', '')

    # 日本語VTT読み込み
    output_bucket = os.environ['OUTPUT_BUCKET']
    vtt_key = f'transcripts/{video_id}.vtt'

    try:
        vtt_response = s3.get_object(Bucket=output_bucket, Key=vtt_key)
        ja_vtt_content = vtt_response['Body'].read().decode('utf-8')
    except Exception as e:
        print(f"Error reading VTT: {e}")
        return

    # SQSに翻訳ジョブを投入
    queue_url = os.environ['TRANSLATE_QUEUE_URL']

    for target_lang in ['en', 'zh']:
        sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps({
                'jobId': job_name,
                'videoId': video_id,
                'sourceLanguage': 'ja',
                'targetLanguage': target_lang,
                'vttContent': ja_vtt_content,
                'outputBucket': output_bucket
            })
        )

    # ステータス更新
    table.update_item(
        Key={'jobId': job_name},
        UpdateExpression='SET #status = :status, transcribedAt = :time',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': 'TRANSLATING',
            ':time': datetime.utcnow().isoformat()
        }
    )

    return {'statusCode': 200}
```

#### Step 2-4: 翻訳・VTT生成Lambda

```python
# lambda/translator_vtt_generator.py
import json
import boto3
import os
import re
from datetime import datetime

s3 = boto3.client('s3')
translate = boto3.client('translate')
bedrock = boto3.client('bedrock-runtime', region_name='ap-northeast-1')
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')

table = dynamodb.Table('learnhub-subtitle-jobs')

def parse_vtt(vtt_content: str) -> list:
    """VTTをパースしてセグメントリストに変換"""
    segments = []
    lines = vtt_content.strip().split('\n')

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # タイムスタンプ行を探す
        if '-->' in line:
            time_match = re.match(r'(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})', line)
            if time_match:
                start_time = time_match.group(1)
                end_time = time_match.group(2)

                # テキストを収集
                text_lines = []
                i += 1
                while i < len(lines) and lines[i].strip() and '-->' not in lines[i]:
                    text_lines.append(lines[i].strip())
                    i += 1

                if text_lines:
                    segments.append({
                        'start': start_time,
                        'end': end_time,
                        'text': ' '.join(text_lines)
                    })
                continue
        i += 1

    return segments

def generate_vtt(segments: list) -> str:
    """セグメントリストからVTTを生成"""
    lines = ['WEBVTT', '']

    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{seg['start']} --> {seg['end']}")
        lines.append(seg['text'])
        lines.append('')

    return '\n'.join(lines)

def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Amazon Translateでテキスト翻訳"""
    # 言語コードマッピング
    lang_map = {'ja': 'ja', 'en': 'en', 'zh': 'zh'}

    response = translate.translate_text(
        Text=text,
        SourceLanguageCode=lang_map[source_lang],
        TargetLanguageCode=lang_map[target_lang]
    )
    return response['TranslatedText']

def improve_subtitle_with_bedrock(text: str, target_lang: str) -> str:
    """Bedrockで字幕の品質を向上"""
    lang_name = {'en': '英語', 'zh': '中国語（簡体字）', 'ja': '日本語'}

    prompt = f"""以下の{lang_name.get(target_lang, target_lang)}字幕テキストを、より自然で読みやすい表現に修正してください。
技術用語は正確に保持し、口語的すぎる表現は適度にフォーマルにしてください。
修正後のテキストのみを返してください。

字幕テキスト:
{text}"""

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 500,
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
        print(f"Bedrock error: {e}")
        return text

def lambda_handler(event, context):
    for record in event['Records']:
        message = json.loads(record['body'])

        job_id = message['jobId']
        video_id = message['videoId']
        source_lang = message['sourceLanguage']
        target_lang = message['targetLanguage']
        vtt_content = message['vttContent']
        output_bucket = message['outputBucket']

        print(f"Translating {video_id} from {source_lang} to {target_lang}")

        # VTTをパース
        segments = parse_vtt(vtt_content)
        print(f"Parsed {len(segments)} segments")

        # 各セグメントを翻訳
        translated_segments = []
        for seg in segments:
            # Amazon Translateで翻訳
            translated_text = translate_text(seg['text'], source_lang, target_lang)

            # Bedrockで品質向上（長いセグメントのみ）
            if len(translated_text) > 20:
                translated_text = improve_subtitle_with_bedrock(translated_text, target_lang)

            translated_segments.append({
                'start': seg['start'],
                'end': seg['end'],
                'text': translated_text
            })

        # VTT生成
        translated_vtt = generate_vtt(translated_segments)

        # S3に保存
        output_key = f'subtitles/{video_id}/{video_id}_{target_lang}.vtt'
        s3.put_object(
            Bucket=output_bucket,
            Key=output_key,
            Body=translated_vtt.encode('utf-8'),
            ContentType='text/vtt'
        )

        print(f"Saved: s3://{output_bucket}/{output_key}")

        # ジョブ完了チェック
        response = table.get_item(Key={'jobId': job_id})
        job_info = response.get('Item', {})
        completed_langs = job_info.get('completedLanguages', [])
        completed_langs.append(target_lang)

        target_languages = job_info.get('languages', ['ja', 'en', 'zh'])

        if set(completed_langs) >= set(target_languages) - {'ja'}:  # 日本語は翻訳不要
            # 全言語完了
            table.update_item(
                Key={'jobId': job_id},
                UpdateExpression='SET #status = :status, completedAt = :time, completedLanguages = :langs',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'COMPLETED',
                    ':time': datetime.utcnow().isoformat(),
                    ':langs': completed_langs
                }
            )

            # 完了通知
            sns.publish(
                TopicArn=os.environ['NOTIFICATION_TOPIC_ARN'],
                Subject=f'字幕生成完了: {video_id}',
                Message=f"""動画「{video_id}」の字幕生成が完了しました。

生成された字幕ファイル:
- 日本語: s3://{output_bucket}/subtitles/{video_id}/{video_id}_ja.vtt
- 英語: s3://{output_bucket}/subtitles/{video_id}/{video_id}_en.vtt
- 中国語: s3://{output_bucket}/subtitles/{video_id}/{video_id}_zh.vtt

動画プレイヤーに統合してください。
"""
            )
        else:
            # 一部完了
            table.update_item(
                Key={'jobId': job_id},
                UpdateExpression='SET completedLanguages = :langs',
                ExpressionAttributeValues={':langs': completed_langs}
            )

    return {'statusCode': 200}
```

### フェーズ3: イベント連携設定（1時間）

#### Step 3-1: S3イベント→SQS設定

```bash
# SQSポリシー設定
QUEUE_ARN=$(aws sqs get-queue-attributes \
  --queue-url https://sqs.${AWS_REGION}.amazonaws.com/${ACCOUNT_ID}/learnhub-subtitle-queue \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' --output text)

cat > sqs-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Service": "s3.amazonaws.com"},
      "Action": "sqs:SendMessage",
      "Resource": "${QUEUE_ARN}",
      "Condition": {
        "ArnLike": {
          "aws:SourceArn": "arn:aws:s3:::learnhub-videos-input-${ACCOUNT_ID}"
        }
      }
    }
  ]
}
EOF

aws sqs set-queue-attributes \
  --queue-url https://sqs.${AWS_REGION}.amazonaws.com/${ACCOUNT_ID}/learnhub-subtitle-queue \
  --attributes '{"Policy": "'$(cat sqs-policy.json | jq -c . | sed 's/"/\\"/g')'"}'

# S3イベント通知設定
cat > s3-notification.json << EOF
{
  "QueueConfigurations": [
    {
      "QueueArn": "${QUEUE_ARN}",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {"Name": "prefix", "Value": "videos/"},
            {"Name": "suffix", "Value": ".mp4"}
          ]
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-notification-configuration \
  --bucket learnhub-videos-input-${ACCOUNT_ID} \
  --notification-configuration file://s3-notification.json
```

#### Step 3-2: EventBridge設定（Transcribe完了イベント）

```bash
# EventBridgeルール作成
aws events put-rule \
  --name learnhub-transcribe-complete \
  --event-pattern '{
    "source": ["aws.transcribe"],
    "detail-type": ["Transcribe Job State Change"],
    "detail": {
      "TranscriptionJobStatus": ["COMPLETED", "FAILED"]
    }
  }' \
  --region ${AWS_REGION}

# Lambda をターゲットに設定（transcribe_callback のARN）
aws events put-targets \
  --rule learnhub-transcribe-complete \
  --targets "Id"="1","Arn"="arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:learnhub-transcribe-callback" \
  --region ${AWS_REGION}
```

### フェーズ4: テストと監視（30分）

#### Step 4-1: 動作テスト

```bash
# テスト動画をアップロード
aws s3 cp sample-video.mp4 s3://learnhub-videos-input-${ACCOUNT_ID}/videos/test-video-001.mp4

# Transcribeジョブ確認
aws transcribe list-transcription-jobs --status IN_PROGRESS

# DynamoDBでステータス確認
aws dynamodb scan --table-name learnhub-subtitle-jobs

# 生成された字幕確認
aws s3 ls s3://learnhub-subtitles-output-${ACCOUNT_ID}/subtitles/ --recursive
```

#### Step 4-2: VTTファイル確認

```bash
# 日本語字幕ダウンロード
aws s3 cp s3://learnhub-subtitles-output-${ACCOUNT_ID}/subtitles/test-video-001/test-video-001_ja.vtt ./

# 内容確認
cat test-video-001_ja.vtt
```

---

## トラブルシューティング課題

### 問題1: Transcribeジョブが失敗

**症状:**
```
TranscriptionJobStatus: FAILED
FailureReason: "The media format provided does not match the detected media format."
```

**ヒント:**
1. ファイル拡張子と実際のフォーマットが一致しているか確認
2. サポートされているフォーマットか確認（MP3, MP4, WAV, FLAC等）
3. ファイルが破損していないか確認

**解決方法:**
```python
# Lambda内でファイル形式を自動検出
import mimetypes

def get_media_format(key):
    extension = key.split('.')[-1].lower()
    format_map = {
        'mp4': 'mp4',
        'mp3': 'mp3',
        'wav': 'wav',
        'm4a': 'mp4',
        'flac': 'flac'
    }
    return format_map.get(extension, 'mp4')
```

### 問題2: 翻訳結果が不自然

**症状:**
```
技術用語が一般的な意味で翻訳される
プログラミング用語が変な日本語になる
```

**ヒント:**
1. Amazon Translateの用語集（Terminology）を活用
2. Bedrockの校正プロンプトを調整
3. カスタムボキャブラリーを設定

**解決方法:**
```python
# 用語集の使用
def translate_with_terminology(text, source_lang, target_lang, terminology_names):
    response = translate.translate_text(
        Text=text,
        SourceLanguageCode=source_lang,
        TargetLanguageCode=target_lang,
        TerminologyNames=terminology_names
    )
    return response['TranslatedText']

# 用語集の例（事前にCSVでアップロード）
# en,ja
# Lambda,Lambda
# API Gateway,API Gateway
# serverless,サーバーレス
```

### 問題3: 字幕のタイミングがずれる

**症状:**
```
音声と字幕が同期していない
特に翻訳後の字幕で顕著
```

**ヒント:**
1. VTTパース時にタイムスタンプが正しく保持されているか
2. 翻訳で文が長くなりすぎていないか
3. セグメント分割が適切か

**解決方法:**
```python
# 長すぎる字幕を分割
MAX_CHARS_PER_LINE = 40

def split_long_subtitle(text, max_chars=MAX_CHARS_PER_LINE):
    if len(text) <= max_chars:
        return text

    # 適切な位置で改行
    words = text.split()
    lines = []
    current_line = []

    for word in words:
        if len(' '.join(current_line + [word])) <= max_chars:
            current_line.append(word)
        else:
            lines.append(' '.join(current_line))
            current_line = [word]

    if current_line:
        lines.append(' '.join(current_line))

    return '\n'.join(lines)
```

---

## 設計の考察ポイント

### 1. なぜTranscribeの標準字幕出力を使わないのか？

**考察ポイント:**
- Transcribeの標準VTT出力 vs カスタム処理
- 翻訳を挟む必要性
- 品質向上のためのカスタマイズ余地

### 2. Bedrockによる校正は必要か？

**考察ポイント:**
- Amazon Translateの品質
- 追加コストと品質向上のトレードオフ
- 処理時間への影響

### 3. 同期処理 vs 非同期処理の選択

**考察ポイント:**
- Transcribeは非同期のみ
- 翻訳は同期/非同期どちらも可能
- ユーザー体験とシステム設計のバランス

### 4. カスタムボキャブラリーの運用

**考察ポイント:**
- 技術用語の一貫性
- 更新頻度と管理方法
- 講師ごとの専門用語対応

### 5. 字幕品質のモニタリング

**考察ポイント:**
- 自動評価の方法
- 人間によるサンプリング確認
- フィードバックループの設計

---

## 発展課題（オプション）

### 1. リアルタイム字幕（ライブ配信対応）
- Amazon Transcribe Streamingの活用
- WebSocketによるリアルタイム配信
- 遅延最小化の工夫

### 2. 話者分離（Speaker Diarization）
- 複数講師の動画対応
- 話者ラベルの自動付与
- 対話形式コンテンツへの対応

### 3. 字幕エディターUIの構築
- Webベースの字幕編集ツール
- タイムライン表示
- 修正→再生成のワークフロー

### 4. 品質スコアリング
- 文字起こし精度の自動評価
- WER（Word Error Rate）計測
- 低品質字幕の自動フラグ

### 5. 対応言語の拡大
- 韓国語、スペイン語等の追加
- 言語自動検出
- 多言語プレイリスト対応

---

## 想定コストと削減方法

### 月額概算コスト（月20本×平均36分処理想定）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| Amazon Transcribe | 20本 × 36分 = 720分 | $17 |
| Amazon Translate | 720分 × 2言語 × 約2000文字 | $30 |
| Amazon Bedrock (Haiku) | 720分 × 2言語 × 50セグメント | $5 |
| AWS Lambda | 処理時間合計 | $2 |
| Amazon S3 | 動画+字幕保存 | $5 |
| Amazon DynamoDB | オンデマンド | $1 |
| Amazon SQS | メッセージ | $0.01 |
| Amazon SNS | 通知 | $0.01 |
| CloudWatch | ログ | $3 |
| **合計** | | **約$63（約9,500円）** |

### コスト削減のポイント

1. **Transcribeの効率化**
   - 同じ動画の再処理を避ける（キャッシング）
   - 短い動画は結合して処理

2. **翻訳の最適化**
   - 繰り返しフレーズのキャッシュ
   - バッチ翻訳API（大量処理時）

3. **Bedrock校正の選択的適用**
   - 全セグメントではなく長いセグメントのみ
   - Claude 3 Haikuの使用（Sonnetより安価）

4. **S3ライフサイクル**
   - 古い中間ファイルの自動削除
   - Intelligent-Tieringの活用

### リソース削除手順

```bash
# S3バケット内容削除
aws s3 rm s3://learnhub-videos-input-${ACCOUNT_ID} --recursive
aws s3 rm s3://learnhub-subtitles-output-${ACCOUNT_ID} --recursive

# S3バケット削除
aws s3 rb s3://learnhub-videos-input-${ACCOUNT_ID}
aws s3 rb s3://learnhub-subtitles-output-${ACCOUNT_ID}

# DynamoDBテーブル削除
aws dynamodb delete-table --table-name learnhub-subtitle-jobs

# SQSキュー削除
aws sqs delete-queue --queue-url https://sqs.${AWS_REGION}.amazonaws.com/${ACCOUNT_ID}/learnhub-subtitle-queue

# SNSトピック削除
aws sns delete-topic --topic-arn arn:aws:sns:${AWS_REGION}:${ACCOUNT_ID}:learnhub-subtitle-notifications

# EventBridgeルール削除
aws events remove-targets --rule learnhub-transcribe-complete --ids 1
aws events delete-rule --name learnhub-transcribe-complete

# Lambda関数削除
aws lambda delete-function --function-name learnhub-transcribe-starter
aws lambda delete-function --function-name learnhub-transcribe-callback
aws lambda delete-function --function-name learnhub-translator-vtt-generator

# CloudFormation スタック削除
aws cloudformation delete-stack --stack-name learnhub-subtitle-iam
```

---

## 学習のポイント

### 1. メディア処理パイプラインの設計
Transcribe（音声認識）→ Translate（翻訳）→ カスタム処理の流れは、メディア処理の典型パターン。各サービスの特性（同期/非同期、制限）を理解して設計する。

### 2. 非同期処理の設計
Transcribeのような長時間ジョブは必然的に非同期になる。EventBridgeでジョブ完了イベントをキャッチし、後続処理につなげるパターンを習得する。

### 3. 多言語対応の考慮点
翻訳品質は用語集（Terminology）やカスタムボキャブラリーで大きく向上する。技術コンテンツでは特に重要。

### 4. 字幕フォーマットの理解
VTT/SRT形式の構造を理解し、パース・生成ができるようになる。タイムスタンプの精度が視聴体験に直結する。

### 5. AI校正による品質向上
機械翻訳の結果をLLMで校正する「翻訳後編集（Post-editing）」パターン。コストと品質のバランスを取りながら、実用的な品質を実現する。
