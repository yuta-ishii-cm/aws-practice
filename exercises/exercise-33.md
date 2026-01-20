# 課題33: StreamNow株式会社の動画エンコーディングパイプライン構築

**難易度: 🟢 初級〜中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | バッチ処理 / メディア / コンテンツ配信 |
| 処理タイプ | バッチ / イベント駆動 |
| 使用IaC | CloudFormation |
| 所要時間 | 5〜6時間 |

---

## シナリオ

### 企業プロフィール

**StreamNow株式会社**は、オリジナルドラマ・映画を配信するサブスクリプション型動画配信サービスを運営しています。

| 項目 | 内容 |
|------|------|
| 業種 | 動画配信（OTT） |
| 設立 | 2019年 |
| 従業員数 | 80名 |
| 月間アクティブユーザー | 50万人 |
| 有料会員数 | 30万人 |
| 月商 | 3億円 |
| コンテンツ数 | 2,000本 |
| 月間新規コンテンツ | 500本 |
| 対応デバイス | Web、iOS、Android、Smart TV、Fire TV |

### 現状の課題

コンテンツ制作会社から納品されるマスター動画（4K ProRes形式）を、各デバイス向けに手動でエンコードしています。エンコード作業がボトルネックとなり、コンテンツの配信開始が遅延しています。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| 月間エンコード動画数 | 500本 | 変わらず |
| 1本あたりエンコード時間 | 4時間 | 30分以内 |
| エンコード担当者 | 2名専任 | 0名（自動化） |
| 配信開始リードタイム | 48時間 | 4時間以内 |
| エンコードエラー率 | 5% | 1%以下 |
| 出力フォーマット数 | 8種類 | 12種類以上 |

### 現状のエンコードワークフロー

```
1. 制作会社からマスター動画をHDD/クラウドで受領
2. 担当者がローカルPCにダウンロード（30分〜1時間）
3. Adobe Media Encoderで各フォーマットにエンコード（2〜3時間）
4. 目視で品質チェック（30分）
5. CDNにアップロード（30分）
6. メタデータ登録
→ 合計: 4〜5時間/本
```

### 必要な出力フォーマット

| プロファイル | 解像度 | ビットレート | 対象デバイス |
|--------------|--------|--------------|--------------|
| 4K UHD | 3840×2160 | 15Mbps | 4K TV |
| 1080p High | 1920×1080 | 8Mbps | Smart TV, PC |
| 1080p | 1920×1080 | 5Mbps | PC, Tablet |
| 720p | 1280×720 | 3Mbps | Mobile WiFi |
| 480p | 854×480 | 1.5Mbps | Mobile 4G |
| 360p | 640×360 | 0.8Mbps | Mobile 3G |
| Audio Only | - | 128kbps | バックグラウンド再生 |

+ HLS/DASH 両対応

### 解決したいこと

1. マスター動画アップロード後の自動エンコード
2. 複数フォーマットへの並列エンコード
3. 配信開始リードタイムの大幅短縮
4. エンコード品質の一貫性確保
5. 自動品質チェック・エラー通知

### 成功指標（KPI）

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| エンコード時間/本 | 4時間 | 30分以内 | 1ヶ月後 |
| 配信リードタイム | 48時間 | 4時間以内 | 1ヶ月後 |
| 自動化率 | 0% | 95%以上 | 2ヶ月後 |
| エンコードエラー率 | 5% | 1%以下 | 1ヶ月後 |
| 人的工数 | 160時間/月 | 10時間/月 | 2ヶ月後 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **AWS Elemental MediaConvertの実践活用**
   - ジョブテンプレートの設計
   - 出力グループ（HLS, DASH）の設定
   - カスタムプリセット作成

2. **AWS Batchによる大規模バッチ処理**
   - コンピューティング環境の設計
   - ジョブ定義とジョブキュー
   - スポットインスタンス活用

3. **S3イベント駆動アーキテクチャ**
   - S3 → Lambda → MediaConvert
   - Step Functionsによるワークフロー

4. **CloudFrontによるコンテンツ配信**
   - HLS/DASH配信設定
   - キャッシュ戦略

### 実務で活かせる知識

- 動画配信プラットフォームの構築
- メディア処理パイプラインの設計
- コスト最適化（スポットインスタンス）

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| 動画変換 | MediaConvert | Transcoder API |
| バッチ処理 | AWS Batch | Cloud Run Jobs / Batch |
| CDN | CloudFront | Cloud CDN |
| ストレージ | S3 | Cloud Storage |

---

## 使用するAWSサービス

### メインサービス

| サービス | 役割 | 選定理由 |
|----------|------|----------|
| AWS Elemental MediaConvert | 動画エンコード | 高品質、多フォーマット対応 |
| AWS Batch | 大規模並列処理（前処理用） | スポット対応、コスト効率 |
| Amazon S3 | 入力/出力ストレージ | 大容量、イベント通知 |
| AWS Lambda | オーケストレーション | イベント駆動 |
| AWS Step Functions | ワークフロー管理 | 可視化、エラー処理 |
| Amazon CloudFront | コンテンツ配信 | グローバル配信 |

### 補助サービス

| サービス | 役割 |
|----------|------|
| Amazon DynamoDB | ジョブ状態管理 |
| Amazon SNS | 完了/エラー通知 |
| Amazon CloudWatch | 監視・ログ |
| AWS Secrets Manager | APIキー管理 |

---

## 前提条件

### 必要な事前知識

- AWSの基本操作（S3, Lambda）
- 動画フォーマットの基本（コーデック、コンテナ）
- HLS/DASHの基本概念

### 準備するもの

1. **AWSアカウント**
   - MediaConvertへのアクセス権限
   - 適切なIAM権限

2. **開発環境**
   - AWS CLI v2
   - Python 3.9以上

3. **テストデータ**
   - サンプル動画ファイル（MP4, 1分程度）

---

## アーキテクチャ概要

### システム全体構成

```
[制作会社]
    ↓ マスター動画アップロード
[S3: 入力バケット]
    ↓ S3イベント
[Lambda: トリガー]
    ↓
[Step Functions: エンコードワークフロー]
    ├── [MediaConvert: 動画エンコード]
    │     ├── HLS出力（7プロファイル）
    │     └── DASH出力（7プロファイル）
    │
    ├── [Lambda: サムネイル生成]
    │
    └── [Lambda: メタデータ更新]
            ↓
[S3: 出力バケット]
    ↓
[CloudFront: CDN配信]
    ↓
[視聴者]

[DynamoDB: ジョブ状態管理]
[SNS: 完了/エラー通知]
```

### エンコードフロー

1. **アップロード**: 制作会社がS3にマスター動画をアップロード
2. **トリガー**: S3イベントでLambdaが起動
3. **ワークフロー**: Step Functionsで処理開始
4. **エンコード**: MediaConvertで複数フォーマットに変換
5. **後処理**: サムネイル生成、メタデータ登録
6. **通知**: 完了通知を送信
7. **配信**: CloudFront経由で配信開始

---

## ハンズオン手順

### フェーズ1: 基盤構築（1時間）

#### Step 1-1: S3バケット作成

```bash
# 環境変数
export AWS_REGION=ap-northeast-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# 入力バケット（マスター動画用）
aws s3 mb s3://streamnow-master-${ACCOUNT_ID} --region ${AWS_REGION}

# 出力バケット（配信用）
aws s3 mb s3://streamnow-output-${ACCOUNT_ID} --region ${AWS_REGION}

# CORS設定（プレイヤー用）
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

aws s3api put-bucket-cors --bucket streamnow-output-${ACCOUNT_ID} --cors-configuration file://cors.json

# バケットポリシー（CloudFront用）
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::streamnow-output-${ACCOUNT_ID}/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket streamnow-output-${ACCOUNT_ID} --policy file://bucket-policy.json
```

#### Step 1-2: DynamoDB テーブル作成

```bash
aws dynamodb create-table \
  --table-name streamnow-encoding-jobs \
  --attribute-definitions \
    AttributeName=jobId,AttributeType=S \
    AttributeName=status,AttributeType=S \
  --key-schema \
    AttributeName=jobId,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "status-index",
      "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region ${AWS_REGION}
```

#### Step 1-3: MediaConvert設定

```bash
# MediaConvertエンドポイント取得
MEDIACONVERT_ENDPOINT=$(aws mediaconvert describe-endpoints --query 'Endpoints[0].Url' --output text --region ${AWS_REGION})

echo "MediaConvert Endpoint: ${MEDIACONVERT_ENDPOINT}"

# IAMロール作成（MediaConvert用）
cat > trust-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "mediaconvert.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

aws iam create-role \
  --role-name StreamNowMediaConvertRole \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name StreamNowMediaConvertRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name StreamNowMediaConvertRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonAPIGatewayInvokeFullAccess
```

### フェーズ2: MediaConvert ジョブテンプレート作成（1.5時間）

#### Step 2-1: ジョブ設定JSON

```json
{
  "Settings": {
    "TimecodeConfig": {
      "Source": "ZEROBASED"
    },
    "OutputGroups": [
      {
        "Name": "HLS Group",
        "OutputGroupSettings": {
          "Type": "HLS_GROUP_SETTINGS",
          "HlsGroupSettings": {
            "SegmentLength": 6,
            "MinSegmentLength": 0,
            "Destination": "s3://OUTPUT_BUCKET/hls/CONTENT_ID/",
            "ManifestCompression": "NONE",
            "DirectoryStructure": "SINGLE_DIRECTORY"
          }
        },
        "Outputs": [
          {
            "NameModifier": "_4k",
            "ContainerSettings": {
              "Container": "M3U8"
            },
            "VideoDescription": {
              "Width": 3840,
              "Height": 2160,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "RateControlMode": "QVBR",
                  "MaxBitrate": 15000000,
                  "QualityTuningLevel": "MULTI_PASS_HQ"
                }
              }
            },
            "AudioDescriptions": [
              {
                "CodecSettings": {
                  "Codec": "AAC",
                  "AacSettings": {
                    "Bitrate": 192000,
                    "CodingMode": "CODING_MODE_2_0",
                    "SampleRate": 48000
                  }
                }
              }
            ]
          },
          {
            "NameModifier": "_1080p_high",
            "ContainerSettings": {
              "Container": "M3U8"
            },
            "VideoDescription": {
              "Width": 1920,
              "Height": 1080,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "RateControlMode": "QVBR",
                  "MaxBitrate": 8000000,
                  "QualityTuningLevel": "MULTI_PASS_HQ"
                }
              }
            },
            "AudioDescriptions": [
              {
                "CodecSettings": {
                  "Codec": "AAC",
                  "AacSettings": {
                    "Bitrate": 192000,
                    "CodingMode": "CODING_MODE_2_0",
                    "SampleRate": 48000
                  }
                }
              }
            ]
          },
          {
            "NameModifier": "_1080p",
            "ContainerSettings": {
              "Container": "M3U8"
            },
            "VideoDescription": {
              "Width": 1920,
              "Height": 1080,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "RateControlMode": "QVBR",
                  "MaxBitrate": 5000000
                }
              }
            },
            "AudioDescriptions": [
              {
                "CodecSettings": {
                  "Codec": "AAC",
                  "AacSettings": {
                    "Bitrate": 128000,
                    "CodingMode": "CODING_MODE_2_0",
                    "SampleRate": 48000
                  }
                }
              }
            ]
          },
          {
            "NameModifier": "_720p",
            "ContainerSettings": {
              "Container": "M3U8"
            },
            "VideoDescription": {
              "Width": 1280,
              "Height": 720,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "RateControlMode": "QVBR",
                  "MaxBitrate": 3000000
                }
              }
            },
            "AudioDescriptions": [
              {
                "CodecSettings": {
                  "Codec": "AAC",
                  "AacSettings": {
                    "Bitrate": 128000,
                    "CodingMode": "CODING_MODE_2_0",
                    "SampleRate": 48000
                  }
                }
              }
            ]
          },
          {
            "NameModifier": "_480p",
            "ContainerSettings": {
              "Container": "M3U8"
            },
            "VideoDescription": {
              "Width": 854,
              "Height": 480,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "RateControlMode": "QVBR",
                  "MaxBitrate": 1500000
                }
              }
            },
            "AudioDescriptions": [
              {
                "CodecSettings": {
                  "Codec": "AAC",
                  "AacSettings": {
                    "Bitrate": 96000,
                    "CodingMode": "CODING_MODE_2_0",
                    "SampleRate": 48000
                  }
                }
              }
            ]
          },
          {
            "NameModifier": "_360p",
            "ContainerSettings": {
              "Container": "M3U8"
            },
            "VideoDescription": {
              "Width": 640,
              "Height": 360,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "RateControlMode": "QVBR",
                  "MaxBitrate": 800000
                }
              }
            },
            "AudioDescriptions": [
              {
                "CodecSettings": {
                  "Codec": "AAC",
                  "AacSettings": {
                    "Bitrate": 64000,
                    "CodingMode": "CODING_MODE_2_0",
                    "SampleRate": 48000
                  }
                }
              }
            ]
          },
          {
            "NameModifier": "_audio",
            "ContainerSettings": {
              "Container": "M3U8"
            },
            "AudioDescriptions": [
              {
                "CodecSettings": {
                  "Codec": "AAC",
                  "AacSettings": {
                    "Bitrate": 128000,
                    "CodingMode": "CODING_MODE_2_0",
                    "SampleRate": 48000
                  }
                }
              }
            ]
          }
        ]
      },
      {
        "Name": "Thumbnail Group",
        "OutputGroupSettings": {
          "Type": "FILE_GROUP_SETTINGS",
          "FileGroupSettings": {
            "Destination": "s3://OUTPUT_BUCKET/thumbnails/CONTENT_ID/"
          }
        },
        "Outputs": [
          {
            "ContainerSettings": {
              "Container": "RAW"
            },
            "VideoDescription": {
              "Width": 1920,
              "Height": 1080,
              "CodecSettings": {
                "Codec": "FRAME_CAPTURE",
                "FrameCaptureSettings": {
                  "FramerateNumerator": 1,
                  "FramerateDenominator": 60,
                  "MaxCaptures": 10
                }
              }
            }
          }
        ]
      }
    ],
    "Inputs": [
      {
        "FileInput": "s3://INPUT_BUCKET/INPUT_KEY",
        "AudioSelectors": {
          "Audio Selector 1": {
            "DefaultSelection": "DEFAULT"
          }
        },
        "VideoSelector": {},
        "TimecodeSource": "ZEROBASED"
      }
    ]
  },
  "Role": "arn:aws:iam::ACCOUNT_ID:role/StreamNowMediaConvertRole"
}
```

### フェーズ3: Lambda関数実装（1.5時間）

#### Step 3-1: トリガーLambda

```python
# lambda/trigger/handler.py
import json
import boto3
import os
from urllib.parse import unquote_plus
from datetime import datetime
import uuid

sfn = boto3.client('stepfunctions')
dynamodb = boto3.resource('dynamodb')

STATE_MACHINE_ARN = os.environ['STATE_MACHINE_ARN']
table = dynamodb.Table(os.environ['JOBS_TABLE'])

def handler(event, context):
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])

        # 動画ファイルのみ処理
        if not key.lower().endswith(('.mp4', '.mov', '.mxf', '.avi')):
            print(f"Skipping non-video file: {key}")
            continue

        # コンテンツID生成
        filename = key.split('/')[-1]
        content_id = filename.rsplit('.', 1)[0]
        job_id = str(uuid.uuid4())

        print(f"Starting encoding workflow for: {content_id}")

        # DynamoDBにジョブ登録
        table.put_item(Item={
            'jobId': job_id,
            'contentId': content_id,
            'status': 'STARTED',
            'sourceBucket': bucket,
            'sourceKey': key,
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        })

        # Step Functions起動
        sfn.start_execution(
            stateMachineArn=STATE_MACHINE_ARN,
            name=f"{content_id}-{job_id[:8]}",
            input=json.dumps({
                'jobId': job_id,
                'contentId': content_id,
                'sourceBucket': bucket,
                'sourceKey': key
            })
        )

    return {'statusCode': 200}
```

#### Step 3-2: MediaConvert起動Lambda

```python
# lambda/start_encoding/handler.py
import json
import boto3
import os
from datetime import datetime

mediaconvert_endpoint = os.environ['MEDIACONVERT_ENDPOINT']
mediaconvert = boto3.client('mediaconvert', endpoint_url=mediaconvert_endpoint)
dynamodb = boto3.resource('dynamodb')

OUTPUT_BUCKET = os.environ['OUTPUT_BUCKET']
MEDIACONVERT_ROLE = os.environ['MEDIACONVERT_ROLE']
table = dynamodb.Table(os.environ['JOBS_TABLE'])

def handler(event, context):
    job_id = event['jobId']
    content_id = event['contentId']
    source_bucket = event['sourceBucket']
    source_key = event['sourceKey']

    print(f"Starting MediaConvert job for: {content_id}")

    # ジョブ設定を動的に構築
    job_settings = {
        "Settings": {
            "TimecodeConfig": {"Source": "ZEROBASED"},
            "OutputGroups": [
                {
                    "Name": "HLS Group",
                    "OutputGroupSettings": {
                        "Type": "HLS_GROUP_SETTINGS",
                        "HlsGroupSettings": {
                            "SegmentLength": 6,
                            "MinSegmentLength": 0,
                            "Destination": f"s3://{OUTPUT_BUCKET}/hls/{content_id}/",
                            "ManifestCompression": "NONE"
                        }
                    },
                    "Outputs": [
                        create_hls_output("_1080p", 1920, 1080, 5000000),
                        create_hls_output("_720p", 1280, 720, 3000000),
                        create_hls_output("_480p", 854, 480, 1500000),
                        create_hls_output("_360p", 640, 360, 800000),
                        create_audio_only_output("_audio")
                    ]
                },
                {
                    "Name": "Thumbnail Group",
                    "OutputGroupSettings": {
                        "Type": "FILE_GROUP_SETTINGS",
                        "FileGroupSettings": {
                            "Destination": f"s3://{OUTPUT_BUCKET}/thumbnails/{content_id}/"
                        }
                    },
                    "Outputs": [
                        {
                            "ContainerSettings": {"Container": "RAW"},
                            "VideoDescription": {
                                "Width": 1280,
                                "Height": 720,
                                "CodecSettings": {
                                    "Codec": "FRAME_CAPTURE",
                                    "FrameCaptureSettings": {
                                        "FramerateNumerator": 1,
                                        "FramerateDenominator": 30,
                                        "MaxCaptures": 5
                                    }
                                }
                            }
                        }
                    ]
                }
            ],
            "Inputs": [
                {
                    "FileInput": f"s3://{source_bucket}/{source_key}",
                    "AudioSelectors": {
                        "Audio Selector 1": {"DefaultSelection": "DEFAULT"}
                    },
                    "VideoSelector": {},
                    "TimecodeSource": "ZEROBASED"
                }
            ]
        },
        "Role": MEDIACONVERT_ROLE,
        "UserMetadata": {
            "jobId": job_id,
            "contentId": content_id
        }
    }

    # MediaConvertジョブ作成
    response = mediaconvert.create_job(**job_settings)
    mc_job_id = response['Job']['Id']

    print(f"MediaConvert job created: {mc_job_id}")

    # DynamoDB更新
    table.update_item(
        Key={'jobId': job_id},
        UpdateExpression='SET #status = :status, mediaConvertJobId = :mcJobId, updatedAt = :time',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': 'ENCODING',
            ':mcJobId': mc_job_id,
            ':time': datetime.utcnow().isoformat()
        }
    )

    return {
        **event,
        'mediaConvertJobId': mc_job_id
    }

def create_hls_output(name_modifier, width, height, bitrate):
    return {
        "NameModifier": name_modifier,
        "ContainerSettings": {"Container": "M3U8"},
        "VideoDescription": {
            "Width": width,
            "Height": height,
            "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                    "RateControlMode": "QVBR",
                    "MaxBitrate": bitrate,
                    "QualityTuningLevel": "SINGLE_PASS"
                }
            }
        },
        "AudioDescriptions": [
            {
                "CodecSettings": {
                    "Codec": "AAC",
                    "AacSettings": {
                        "Bitrate": 128000,
                        "CodingMode": "CODING_MODE_2_0",
                        "SampleRate": 48000
                    }
                }
            }
        ]
    }

def create_audio_only_output(name_modifier):
    return {
        "NameModifier": name_modifier,
        "ContainerSettings": {"Container": "M3U8"},
        "AudioDescriptions": [
            {
                "CodecSettings": {
                    "Codec": "AAC",
                    "AacSettings": {
                        "Bitrate": 128000,
                        "CodingMode": "CODING_MODE_2_0",
                        "SampleRate": 48000
                    }
                }
            }
        ]
    }
```

#### Step 3-3: エンコード完了チェックLambda

```python
# lambda/check_encoding/handler.py
import boto3
import os
import time

mediaconvert_endpoint = os.environ['MEDIACONVERT_ENDPOINT']
mediaconvert = boto3.client('mediaconvert', endpoint_url=mediaconvert_endpoint)

def handler(event, context):
    mc_job_id = event['mediaConvertJobId']

    response = mediaconvert.get_job(Id=mc_job_id)
    status = response['Job']['Status']

    print(f"MediaConvert job {mc_job_id} status: {status}")

    return {
        **event,
        'encodingStatus': status,
        'isComplete': status in ['COMPLETE', 'ERROR', 'CANCELED']
    }
```

#### Step 3-4: 完了処理Lambda

```python
# lambda/finalize/handler.py
import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')

table = dynamodb.Table(os.environ['JOBS_TABLE'])
NOTIFICATION_TOPIC = os.environ['NOTIFICATION_TOPIC']
OUTPUT_BUCKET = os.environ['OUTPUT_BUCKET']
CLOUDFRONT_DOMAIN = os.environ.get('CLOUDFRONT_DOMAIN', '')

def handler(event, context):
    job_id = event['jobId']
    content_id = event['contentId']
    encoding_status = event['encodingStatus']

    if encoding_status == 'COMPLETE':
        # 成功
        hls_url = f"https://{CLOUDFRONT_DOMAIN}/hls/{content_id}/index.m3u8" if CLOUDFRONT_DOMAIN else f"s3://{OUTPUT_BUCKET}/hls/{content_id}/"
        thumbnail_url = f"https://{CLOUDFRONT_DOMAIN}/thumbnails/{content_id}/" if CLOUDFRONT_DOMAIN else f"s3://{OUTPUT_BUCKET}/thumbnails/{content_id}/"

        table.update_item(
            Key={'jobId': job_id},
            UpdateExpression='SET #status = :status, hlsUrl = :hls, thumbnailUrl = :thumb, completedAt = :time, updatedAt = :time',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'COMPLETED',
                ':hls': hls_url,
                ':thumb': thumbnail_url,
                ':time': datetime.utcnow().isoformat()
            }
        )

        # 成功通知
        sns.publish(
            TopicArn=NOTIFICATION_TOPIC,
            Subject=f'エンコード完了: {content_id}',
            Message=f"""
動画のエンコードが完了しました。

コンテンツID: {content_id}
ジョブID: {job_id}

配信URL:
- HLS: {hls_url}
- サムネイル: {thumbnail_url}

配信準備が整いました。
"""
        )

        return {
            **event,
            'finalStatus': 'SUCCESS',
            'hlsUrl': hls_url,
            'thumbnailUrl': thumbnail_url
        }
    else:
        # 失敗
        table.update_item(
            Key={'jobId': job_id},
            UpdateExpression='SET #status = :status, errorMessage = :err, updatedAt = :time',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'FAILED',
                ':err': f'MediaConvert status: {encoding_status}',
                ':time': datetime.utcnow().isoformat()
            }
        )

        # 失敗通知
        sns.publish(
            TopicArn=NOTIFICATION_TOPIC,
            Subject=f'[エラー] エンコード失敗: {content_id}',
            Message=f"""
動画のエンコードに失敗しました。

コンテンツID: {content_id}
ジョブID: {job_id}
ステータス: {encoding_status}

MediaConvertコンソールで詳細を確認してください。
"""
        )

        return {
            **event,
            'finalStatus': 'FAILED'
        }
```

### フェーズ4: Step Functions ワークフロー（1時間）

#### Step 4-1: ワークフロー定義

```json
{
  "Comment": "StreamNow Video Encoding Workflow",
  "StartAt": "StartEncoding",
  "States": {
    "StartEncoding": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-northeast-1:${ACCOUNT_ID}:function:streamnow-start-encoding",
      "ResultPath": "$",
      "Next": "WaitForEncoding"
    },
    "WaitForEncoding": {
      "Type": "Wait",
      "Seconds": 30,
      "Next": "CheckEncodingStatus"
    },
    "CheckEncodingStatus": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-northeast-1:${ACCOUNT_ID}:function:streamnow-check-encoding",
      "ResultPath": "$",
      "Next": "IsEncodingComplete"
    },
    "IsEncodingComplete": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.isComplete",
          "BooleanEquals": true,
          "Next": "Finalize"
        }
      ],
      "Default": "WaitForEncoding"
    },
    "Finalize": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-northeast-1:${ACCOUNT_ID}:function:streamnow-finalize",
      "ResultPath": "$",
      "End": true
    }
  }
}
```

### フェーズ5: CloudFront設定とテスト（1時間）

#### Step 5-1: CloudFront ディストリビューション作成

```bash
# CloudFront OAC作成
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "streamnow-oac",
    "Description": "OAC for StreamNow",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
  }' \
  --region ${AWS_REGION}

# ディストリビューション作成（コンソール推奨）
# 設定項目:
# - Origin: S3バケット (streamnow-output-xxx)
# - Origin Access: OAC使用
# - Cache Policy: CachingOptimized
# - Response Headers Policy: SimpleCORS
# - Price Class: Use all edge locations
```

#### Step 5-2: テスト実行

```bash
# テスト動画をアップロード
aws s3 cp sample-video.mp4 s3://streamnow-master-${ACCOUNT_ID}/uploads/test-content-001.mp4

# Step Functions実行確認
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:${AWS_REGION}:${ACCOUNT_ID}:stateMachine:streamnow-encoding-workflow \
  --max-results 5

# DynamoDBでジョブ状態確認
aws dynamodb scan --table-name streamnow-encoding-jobs

# 出力確認
aws s3 ls s3://streamnow-output-${ACCOUNT_ID}/hls/ --recursive
```

---

## トラブルシューティング課題

### 問題1: MediaConvertジョブがエラー終了

**症状:**
```
MediaConvert job status: ERROR
"Unable to open input file"
```

**ヒント:**
1. 入力ファイルのS3パスが正しいか確認
2. MediaConvertロールのS3権限を確認
3. 入力ファイルが破損していないか確認

**解決方法:**
```bash
# IAMロールのポリシー確認
aws iam list-attached-role-policies --role-name StreamNowMediaConvertRole

# S3アクセステスト
aws s3 ls s3://streamnow-master-${ACCOUNT_ID}/uploads/

# MediaConvert用の追加ポリシー
aws iam attach-role-policy \
  --role-name StreamNowMediaConvertRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

### 問題2: HLSマニフェストが正しく生成されない

**症状:**
```
index.m3u8が存在しない
プレイヤーで再生できない
```

**ヒント:**
1. OutputGroupSettingsのDestinationを確認
2. HlsGroupSettingsの設定を確認
3. 出力ファイル一覧を確認

**解決方法:**
```python
# 正しいHLS設定
"HlsGroupSettings": {
    "SegmentLength": 6,
    "MinSegmentLength": 0,
    "Destination": f"s3://{OUTPUT_BUCKET}/hls/{content_id}/",
    "ManifestCompression": "NONE",
    "DirectoryStructure": "SINGLE_DIRECTORY",
    "OutputSelection": "MANIFESTS_AND_SEGMENTS"  # これを追加
}
```

### 問題3: CloudFrontでCORSエラー

**症状:**
```
Access-Control-Allow-Origin エラー
動画プレイヤーで再生できない
```

**ヒント:**
1. S3のCORS設定を確認
2. CloudFrontのResponse Headers Policyを確認
3. ブラウザのキャッシュをクリア

**解決方法:**
```bash
# CloudFront Response Headers Policy設定
# コンソールから:
# 1. CloudFront → ディストリビューション → Behaviors
# 2. Response headers policy: SimpleCORS または カスタムポリシー
# 3. Access-Control-Allow-Origin: *
# 4. Access-Control-Allow-Methods: GET, HEAD, OPTIONS
```

---

## 設計の考察ポイント

### 1. MediaConvert vs 自前エンコード（FFmpeg）

**考察ポイント:**
- MediaConvert: マネージド、スケーラブル、品質保証
- FFmpeg on EC2/ECS: 柔軟性、カスタマイズ性
- コスト比較（長時間動画の場合）

### 2. 出力フォーマットの選定

**考察ポイント:**
- HLS vs DASH（デバイスカバレッジ）
- ビットレートラダーの設計
- ABR（Adaptive Bitrate）の最適化

### 3. 並列処理のアプローチ

**考察ポイント:**
- MediaConvert単独 vs AWS Batch併用
- チャンク分割エンコード
- コスト効率とスループットのバランス

### 4. CDN配信の最適化

**考察ポイント:**
- CloudFrontのキャッシュ戦略
- セグメントサイズと初回再生時間
- リージョン配置（エッジロケーション）

### 5. DRMとセキュリティ

**考察ポイント:**
- 有料コンテンツの保護
- Widevine / FairPlay対応
- 署名付きURL / Cookie

---

## 発展課題（オプション）

### 1. DRM対応（SPEKE）
- AWS Elemental MediaPackage連携
- Widevine / FairPlay / PlayReady
- ライセンスサーバー統合

### 2. ライブ配信対応
- MediaLive + MediaPackage
- ライブ to VODワークフロー
- 低遅延配信（LL-HLS）

### 3. コンテンツモデレーション
- Rekognition Video連携
- 不適切コンテンツの自動検出
- 年齢制限の自動判定

### 4. 字幕・多言語対応
- Transcribe連携（自動字幕）
- Translate連携（翻訳）
- WebVTT埋め込み

### 5. 視聴分析
- CloudFrontログ分析
- Athena + QuickSight
- コンテンツ人気度ダッシュボード

---

## 想定コストと削減方法

### 月額概算コスト（月間500本 × 平均30分処理想定）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| MediaConvert | 500本 × 30分 × 5出力 = 1,250時間 | $625 |
| Amazon S3 | 入力500GB + 出力2TB | $55 |
| AWS Lambda | 処理関数実行 | $5 |
| Step Functions | 500ワークフロー | $0.15 |
| CloudFront | 5TB転送 | $425 |
| DynamoDB | オンデマンド | $2 |
| SNS | 通知 | $0.50 |
| CloudWatch | ログ | $10 |
| **合計** | | **約$1,123（約168,000円）** |

### コスト削減のポイント

1. **MediaConvertの最適化**
   - On-Demand vs Reserved Capacity
   - 品質レベルの調整（SINGLE_PASS vs MULTI_PASS）
   - → 最大30%削減

2. **S3ストレージクラス**
   - 入力: Standard（一時）→ 処理後削除
   - 出力: Intelligent-Tiering
   - → ストレージコスト40%削減

3. **CloudFront Reserved Capacity**
   - 年間契約で割引
   - → 配信コスト最大30%削減

4. **不要解像度の削除**
   - 4K対応が不要なら4K出力を削除
   - → MediaConvertコスト削減

### リソース削除手順

```bash
# CloudFront（コンソールから無効化→削除）

# S3
aws s3 rm s3://streamnow-master-${ACCOUNT_ID} --recursive
aws s3 rm s3://streamnow-output-${ACCOUNT_ID} --recursive
aws s3 rb s3://streamnow-master-${ACCOUNT_ID}
aws s3 rb s3://streamnow-output-${ACCOUNT_ID}

# DynamoDB
aws dynamodb delete-table --table-name streamnow-encoding-jobs

# Step Functions
aws stepfunctions delete-state-machine --state-machine-arn arn:aws:states:...

# Lambda
aws lambda delete-function --function-name streamnow-trigger
aws lambda delete-function --function-name streamnow-start-encoding
aws lambda delete-function --function-name streamnow-check-encoding
aws lambda delete-function --function-name streamnow-finalize

# SNS
aws sns delete-topic --topic-arn arn:aws:sns:...

# IAM
aws iam detach-role-policy --role-name StreamNowMediaConvertRole --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam delete-role --role-name StreamNowMediaConvertRole
```

---

## 学習のポイント

### 1. MediaConvertの基本
AWS の動画変換サービスとして、入力 → 出力グループ → 出力の構造を理解する。HLS/DASH などのストリーミングフォーマットの基本も押さえる。

### 2. イベント駆動アーキテクチャ
S3イベント → Lambda → Step Functions の流れは、バッチ処理の典型パターン。非同期処理の状態管理方法を学ぶ。

### 3. ABR（Adaptive Bitrate）の概念
ネットワーク状況に応じて品質を切り替えるストリーミング技術。ビットレートラダーの設計がユーザー体験に直結する。

### 4. CDN配信の基礎
CloudFront によるグローバル配信、キャッシュ戦略、CORSの設定など、コンテンツ配信の基本を習得する。

### 5. ワークフローの可視化
Step Functions でエンコード処理を可視化することで、進捗確認やエラー対応が容易になる。長時間バッチ処理では特に重要。
