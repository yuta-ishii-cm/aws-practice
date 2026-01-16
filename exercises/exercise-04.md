# 課題4: テックマニュファクチャリング株式会社の設備異常検知AIモデル運用基盤構築

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | AI / IoT / 製造業 / MLOps |
| 処理タイプ | リアルタイム / バッチ |
| 使用IaC | Terraform |
| 所要時間 | 8〜10時間 |

---

## シナリオ

### 企業プロフィール

**テックマニュファクチャリング株式会社**は、精密機器部品を製造する中堅製造業企業です。

| 項目 | 内容 |
|------|------|
| 業種 | 精密機器製造 |
| 設立 | 1985年 |
| 従業員数 | 450名 |
| 工場数 | 3拠点（埼玉、名古屋、福岡） |
| 生産設備数 | 50台（CNC旋盤、プレス機、射出成形機等） |
| 年間売上 | 120億円 |
| 主要顧客 | 自動車部品メーカー、家電メーカー |
| 稼働率目標 | 95%以上 |

### 現状の課題

設備の突発故障により生産ラインが停止し、納期遅延やコスト増加が発生しています。現在は定期保全（TBM: Time Based Maintenance）を実施していますが、過剰保全によるコスト増や、定期保全の間に発生する故障を防げていません。

### 数値で示された問題

| 指標 | 現状 | 業界平均 |
|------|------|----------|
| 年間計画外停止回数 | 180回（3.6回/台） | 50回以下 |
| 平均ダウンタイム | 4時間/回 | 1時間/回 |
| 年間停止時間 | 720時間 | 50時間以下 |
| 停止による損失 | 年3.6億円 | - |
| 保全コスト | 年2億円 | - |
| 設備稼働率 | 88% | 95% |

### 故障の内訳分析（過去1年）

| 故障種別 | 発生回数 | 平均復旧時間 | 予兆検知可能性 |
|----------|----------|--------------|----------------|
| モーター異常 | 45回 | 6時間 | 高（振動・電流） |
| 軸受け摩耗 | 35回 | 3時間 | 高（振動・温度） |
| 油圧系統異常 | 30回 | 4時間 | 中（圧力・温度） |
| 電気系統故障 | 25回 | 5時間 | 中（電流・電圧） |
| センサー故障 | 20回 | 2時間 | 高（値異常） |
| その他 | 25回 | 3時間 | 低 |

**予兆検知可能な故障: 約80%（144回/年）**

### 解決したいこと

1. 設備センサーデータのリアルタイム収集・分析
2. 異常検知AIモデルによる故障予兆の検出
3. 予知保全（PdM: Predictive Maintenance）への移行
4. 計画外停止の80%削減
5. MLモデルの継続的な改善サイクル確立

### 成功指標（KPI）

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| 計画外停止回数 | 180回/年 | 36回/年（80%削減） | 12ヶ月後 |
| 異常検知精度（Recall） | - | 90%以上 | 6ヶ月後 |
| 誤検知率（False Positive） | - | 10%以下 | 6ヶ月後 |
| 設備稼働率 | 88% | 95%以上 | 12ヶ月後 |
| ダウンタイム損失 | 3.6億円/年 | 0.7億円/年以下 | 12ヶ月後 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **Amazon SageMakerの実践活用**
   - 組み込みアルゴリズム（Random Cut Forest）
   - モデルのトレーニング・デプロイ
   - エンドポイント管理

2. **MLOpsパイプラインの構築**
   - SageMaker Pipelines
   - モデルレジストリ
   - A/Bテストデプロイ

3. **IoTデータパイプライン**
   - IoT Core / Kinesis Data Streams
   - リアルタイム推論
   - Lambda + Step Functions

4. **時系列異常検知の基礎**
   - Random Cut Forest（RCF）アルゴリズム
   - 異常スコアの閾値設計
   - 特徴量エンジニアリング

### 実務で活かせる知識

- 製造業におけるAI活用パターン
- 予知保全システムの設計
- MLOpsの実践的なワークフロー

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| ML プラットフォーム | SageMaker | Vertex AI |
| IoT | IoT Core | Cloud IoT Core |
| ストリーム処理 | Kinesis | Pub/Sub + Dataflow |
| 時系列DB | Timestream | BigQuery + Cloud Monitoring |
| MLパイプライン | SageMaker Pipelines | Vertex AI Pipelines |

---

## 使用するAWSサービス

### メインサービス

| サービス | 役割 | 選定理由 |
|----------|------|----------|
| Amazon SageMaker | 異常検知モデルの構築・デプロイ | エンドツーエンドMLプラットフォーム |
| Amazon Kinesis Data Streams | センサーデータのストリーム処理 | リアルタイム取り込み |
| AWS Lambda | リアルタイム推論・アラート | イベント駆動処理 |
| AWS Step Functions | MLパイプラインオーケストレーション | ワークフロー管理 |
| Amazon S3 | 学習データ・モデル保存 | データレイク |
| Amazon DynamoDB | リアルタイムデータ・アラート履歴 | 高速アクセス |
| Amazon Timestream | 時系列データ保存・分析 | 時系列特化DB |

### 補助サービス

| サービス | 役割 |
|----------|------|
| Amazon SNS | アラート通知 |
| Amazon CloudWatch | 監視・ダッシュボード |
| AWS IoT Core | デバイス接続（実環境用） |
| Amazon EventBridge | スケジュール実行 |

---

## 前提条件

### 必要な事前知識

- AWSの基本操作（S3, Lambda）
- Python基礎
- 機械学習の基本概念（訓練/検証/テスト）
- 時系列データの基本理解

### 準備するもの

1. **AWSアカウント**
   - SageMaker実行権限
   - 適切なIAM権限

2. **開発環境**
   - Terraform v1.5以上
   - AWS CLI v2
   - Python 3.9以上
   - Jupyter Notebook（またはSageMaker Studio）

3. **テストデータ**
   - センサーデータ（CSVまたはJSON）
   - 正常/異常ラベル付きデータ（学習用）

---

## アーキテクチャ概要

### システム全体構成

```
[設備センサー]
      ↓ (MQTT/HTTP)
[IoT Core / API Gateway]
      ↓
[Kinesis Data Streams]
      ├── [Lambda: データ前処理]
      │       ↓
      │   [Timestream: 時系列保存]
      │
      └── [Lambda: リアルタイム推論]
              ├── [SageMaker Endpoint: 異常検知]
              │       ↓ 異常スコア
              │   [DynamoDB: 結果保存]
              │       ↓ 閾値超過
              └── [SNS: アラート通知]
                      ↓
              [保全担当者/管理画面]

[定期バッチ]
      ↓ EventBridge（週次）
[Step Functions: モデル再学習パイプライン]
      ├── [SageMaker Processing: データ準備]
      ├── [SageMaker Training: モデル学習]
      ├── [SageMaker Model Registry: 登録]
      └── [SageMaker Endpoint: デプロイ]
```

### データフロー

1. **データ収集**: センサーデータをKinesis Data Streamsに送信
2. **リアルタイム処理**: Lambdaで前処理し、SageMakerエンドポイントで推論
3. **異常検知**: 異常スコアが閾値を超えたらアラート
4. **モデル改善**: 週次でデータを蓄積し、モデルを再学習

---

## ハンズオン手順

### フェーズ1: データ基盤構築（2時間）

#### Step 1-1: Terraformプロジェクト構造

```
predictive-maintenance/
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/
│   ├── kinesis/
│   ├── timestream/
│   ├── sagemaker/
│   └── lambda/
├── lambda_code/
│   ├── data_processor/
│   └── inference/
└── notebooks/
    └── anomaly_detection_training.ipynb
```

#### Step 1-2: Kinesisストリーム構築

```hcl
# modules/kinesis/main.tf
resource "aws_kinesis_stream" "sensor_data" {
  name             = "${var.project_name}-sensor-data-${var.environment}"
  shard_count      = 2
  retention_period = 24

  stream_mode_details {
    stream_mode = "PROVISIONED"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Kinesis Data Firehose（S3バックアップ用）
resource "aws_kinesis_firehose_delivery_stream" "sensor_backup" {
  name        = "${var.project_name}-sensor-backup-${var.environment}"
  destination = "extended_s3"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.sensor_data.arn
    role_arn           = aws_iam_role.firehose_role.arn
  }

  extended_s3_configuration {
    role_arn           = aws_iam_role.firehose_role.arn
    bucket_arn         = var.data_bucket_arn
    prefix             = "raw/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    buffering_size     = 64
    buffering_interval = 60
    compression_format = "GZIP"
  }
}
```

#### Step 1-3: Timestream構築

```hcl
# modules/timestream/main.tf
resource "aws_timestreamwrite_database" "sensor_db" {
  database_name = "${var.project_name}-sensor-db"

  tags = {
    Project = var.project_name
  }
}

resource "aws_timestreamwrite_table" "sensor_data" {
  database_name = aws_timestreamwrite_database.sensor_db.database_name
  table_name    = "sensor_readings"

  retention_properties {
    memory_store_retention_period_in_hours  = 24
    magnetic_store_retention_period_in_days = 365
  }

  magnetic_store_write_properties {
    enable_magnetic_store_writes = true
  }

  tags = {
    Project = var.project_name
  }
}

resource "aws_timestreamwrite_table" "anomaly_scores" {
  database_name = aws_timestreamwrite_database.sensor_db.database_name
  table_name    = "anomaly_scores"

  retention_properties {
    memory_store_retention_period_in_hours  = 24
    magnetic_store_retention_period_in_days = 365
  }

  tags = {
    Project = var.project_name
  }
}
```

#### Step 1-4: データ生成シミュレーター

```python
# scripts/sensor_simulator.py
import boto3
import json
import random
import time
import math
from datetime import datetime

kinesis = boto3.client('kinesis', region_name='ap-northeast-1')
STREAM_NAME = 'techmfg-sensor-data-dev'

# 設備定義
EQUIPMENT = [
    {'id': 'CNC-001', 'type': 'cnc_lathe', 'location': 'saitama'},
    {'id': 'CNC-002', 'type': 'cnc_lathe', 'location': 'saitama'},
    {'id': 'PRS-001', 'type': 'press', 'location': 'nagoya'},
    {'id': 'INJ-001', 'type': 'injection', 'location': 'fukuoka'},
]

def generate_normal_data(equipment: dict, timestamp: datetime) -> dict:
    """正常時のセンサーデータ生成"""
    base_temp = 45.0
    base_vibration = 2.5
    base_current = 15.0
    base_pressure = 5.0

    # 時間による周期変動
    hour_factor = math.sin(timestamp.hour / 24 * 2 * math.pi)

    return {
        'equipment_id': equipment['id'],
        'equipment_type': equipment['type'],
        'location': equipment['location'],
        'timestamp': timestamp.isoformat(),
        'sensors': {
            'temperature': round(base_temp + random.gauss(0, 2) + hour_factor * 3, 2),
            'vibration': round(base_vibration + random.gauss(0, 0.3), 2),
            'current': round(base_current + random.gauss(0, 1), 2),
            'pressure': round(base_pressure + random.gauss(0, 0.2), 2),
            'rpm': round(1500 + random.gauss(0, 50), 0),
        }
    }

def generate_anomaly_data(equipment: dict, timestamp: datetime, anomaly_type: str) -> dict:
    """異常時のセンサーデータ生成"""
    data = generate_normal_data(equipment, timestamp)

    if anomaly_type == 'motor':
        # モーター異常: 電流上昇、振動増加
        data['sensors']['current'] *= 1.5 + random.random() * 0.5
        data['sensors']['vibration'] *= 2.0 + random.random()
    elif anomaly_type == 'bearing':
        # 軸受け摩耗: 振動増加、温度上昇
        data['sensors']['vibration'] *= 3.0 + random.random()
        data['sensors']['temperature'] += 20 + random.random() * 10
    elif anomaly_type == 'hydraulic':
        # 油圧異常: 圧力変動
        data['sensors']['pressure'] *= 0.5 + random.random() * 0.3

    data['anomaly_type'] = anomaly_type
    return data

def send_to_kinesis(data: dict):
    """Kinesisにデータ送信"""
    kinesis.put_record(
        StreamName=STREAM_NAME,
        Data=json.dumps(data),
        PartitionKey=data['equipment_id']
    )

def main():
    """メインループ"""
    print("Starting sensor data simulation...")
    anomaly_probability = 0.02  # 2%の確率で異常データ

    while True:
        for equipment in EQUIPMENT:
            timestamp = datetime.utcnow()

            if random.random() < anomaly_probability:
                anomaly_type = random.choice(['motor', 'bearing', 'hydraulic'])
                data = generate_anomaly_data(equipment, timestamp, anomaly_type)
                print(f"[ANOMALY] {equipment['id']}: {anomaly_type}")
            else:
                data = generate_normal_data(equipment, timestamp)

            send_to_kinesis(data)

        time.sleep(1)  # 1秒間隔

if __name__ == '__main__':
    main()
```

### フェーズ2: 異常検知モデル構築（3時間）

#### Step 2-1: SageMaker Notebook での学習

```python
# notebooks/anomaly_detection_training.ipynb

# セル1: セットアップ
import boto3
import sagemaker
from sagemaker import get_execution_role
from sagemaker.amazon.amazon_estimator import get_image_uri
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

role = get_execution_role()
session = sagemaker.Session()
bucket = session.default_bucket()
prefix = 'predictive-maintenance'

print(f"Role: {role}")
print(f"Bucket: {bucket}")

# セル2: サンプルデータ生成（実環境ではTimestreamから取得）
def generate_training_data(n_samples=10000, anomaly_ratio=0.05):
    """学習用データ生成"""
    np.random.seed(42)

    # 正常データ
    n_normal = int(n_samples * (1 - anomaly_ratio))
    normal_data = {
        'temperature': np.random.normal(45, 3, n_normal),
        'vibration': np.random.normal(2.5, 0.4, n_normal),
        'current': np.random.normal(15, 1.5, n_normal),
        'pressure': np.random.normal(5.0, 0.3, n_normal),
        'rpm': np.random.normal(1500, 60, n_normal),
    }

    # 異常データ
    n_anomaly = n_samples - n_normal
    anomaly_data = {
        'temperature': np.random.normal(65, 8, n_anomaly),  # 高温異常
        'vibration': np.random.normal(6.0, 1.5, n_anomaly),  # 高振動
        'current': np.random.normal(22, 3, n_anomaly),  # 高電流
        'pressure': np.random.normal(3.0, 0.8, n_anomaly),  # 低圧力
        'rpm': np.random.normal(1400, 150, n_anomaly),  # RPM変動
    }

    # 統合
    df = pd.DataFrame({
        'temperature': np.concatenate([normal_data['temperature'], anomaly_data['temperature']]),
        'vibration': np.concatenate([normal_data['vibration'], anomaly_data['vibration']]),
        'current': np.concatenate([normal_data['current'], anomaly_data['current']]),
        'pressure': np.concatenate([normal_data['pressure'], anomaly_data['pressure']]),
        'rpm': np.concatenate([normal_data['rpm'], anomaly_data['rpm']]),
    })

    return df.sample(frac=1).reset_index(drop=True)  # シャッフル

df = generate_training_data()
print(f"Training data shape: {df.shape}")
df.describe()

# セル3: S3にアップロード
train_data = df.values.astype('float32')
train_file = 'train.csv'

np.savetxt(train_file, train_data, delimiter=',', fmt='%.6f')

train_s3_uri = session.upload_data(
    path=train_file,
    bucket=bucket,
    key_prefix=f'{prefix}/train'
)
print(f"Training data uploaded to: {train_s3_uri}")

# セル4: Random Cut Forestモデルのトレーニング
from sagemaker.amazon.randomcutforest import RandomCutForest

rcf = RandomCutForest(
    role=role,
    instance_count=1,
    instance_type='ml.m5.large',
    num_samples_per_tree=256,
    num_trees=100,
    output_path=f's3://{bucket}/{prefix}/output'
)

# データ形式設定
rcf.fit(
    rcf.record_set(train_data),
    job_name=f'rcf-anomaly-{datetime.now().strftime("%Y%m%d%H%M%S")}'
)

print("Training completed!")

# セル5: モデルデプロイ
predictor = rcf.deploy(
    initial_instance_count=1,
    instance_type='ml.t2.medium',
    endpoint_name=f'anomaly-detection-endpoint-{datetime.now().strftime("%Y%m%d")}'
)

print(f"Endpoint deployed: {predictor.endpoint_name}")

# セル6: テスト推論
from sagemaker.serializers import CSVSerializer
from sagemaker.deserializers import JSONDeserializer

predictor.serializer = CSVSerializer()
predictor.deserializer = JSONDeserializer()

# 正常データのテスト
normal_sample = np.array([[45.0, 2.5, 15.0, 5.0, 1500]])
normal_result = predictor.predict(normal_sample)
print(f"Normal sample score: {normal_result['scores'][0]['score']}")

# 異常データのテスト
anomaly_sample = np.array([[70.0, 8.0, 25.0, 2.5, 1200]])
anomaly_result = predictor.predict(anomaly_sample)
print(f"Anomaly sample score: {anomaly_result['scores'][0]['score']}")
```

#### Step 2-2: SageMaker Endpoint 構成（Terraform）

```hcl
# modules/sagemaker/main.tf
resource "aws_sagemaker_model" "anomaly_detection" {
  name               = "${var.project_name}-anomaly-model-${var.environment}"
  execution_role_arn = aws_iam_role.sagemaker_role.arn

  primary_container {
    image          = "382416733822.dkr.ecr.ap-northeast-1.amazonaws.com/randomcutforest:latest"
    model_data_url = var.model_artifact_s3_uri
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_sagemaker_endpoint_configuration" "anomaly_detection" {
  name = "${var.project_name}-endpoint-config-${var.environment}"

  production_variants {
    variant_name           = "primary"
    model_name             = aws_sagemaker_model.anomaly_detection.name
    initial_instance_count = 1
    instance_type          = "ml.t2.medium"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_sagemaker_endpoint" "anomaly_detection" {
  name                 = "${var.project_name}-endpoint-${var.environment}"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.anomaly_detection.name

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Auto Scaling設定
resource "aws_appautoscaling_target" "sagemaker_target" {
  max_capacity       = 3
  min_capacity       = 1
  resource_id        = "endpoint/${aws_sagemaker_endpoint.anomaly_detection.name}/variant/primary"
  scalable_dimension = "sagemaker:variant:DesiredInstanceCount"
  service_namespace  = "sagemaker"
}

resource "aws_appautoscaling_policy" "sagemaker_policy" {
  name               = "${var.project_name}-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.sagemaker_target.resource_id
  scalable_dimension = aws_appautoscaling_target.sagemaker_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.sagemaker_target.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0
    predefined_metric_specification {
      predefined_metric_type = "SageMakerVariantInvocationsPerInstance"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

### フェーズ3: リアルタイム推論Lambda（1.5時間）

#### Step 3-1: 推論Lambda実装

```python
# lambda_code/inference/handler.py
import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

sagemaker_runtime = boto3.client('sagemaker-runtime')
timestream_write = boto3.client('timestream-write')
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')

ENDPOINT_NAME = os.environ['SAGEMAKER_ENDPOINT']
TIMESTREAM_DB = os.environ['TIMESTREAM_DATABASE']
TIMESTREAM_TABLE = os.environ['TIMESTREAM_TABLE']
ALERT_TOPIC_ARN = os.environ['ALERT_TOPIC_ARN']
ANOMALY_THRESHOLD = float(os.environ.get('ANOMALY_THRESHOLD', '3.0'))

alerts_table = dynamodb.Table(os.environ['ALERTS_TABLE'])

def invoke_endpoint(features: list) -> float:
    """SageMakerエンドポイントで推論"""
    # CSVフォーマットでデータ送信
    payload = ','.join(map(str, features))

    response = sagemaker_runtime.invoke_endpoint(
        EndpointName=ENDPOINT_NAME,
        ContentType='text/csv',
        Body=payload
    )

    result = json.loads(response['Body'].read().decode())
    return result['scores'][0]['score']

def write_to_timestream(equipment_id: str, anomaly_score: float, timestamp: str):
    """Timestreamに異常スコアを書き込み"""
    records = [
        {
            'Dimensions': [
                {'Name': 'equipment_id', 'Value': equipment_id}
            ],
            'MeasureName': 'anomaly_score',
            'MeasureValue': str(anomaly_score),
            'MeasureValueType': 'DOUBLE',
            'Time': str(int(datetime.fromisoformat(timestamp.replace('Z', '+00:00')).timestamp() * 1000)),
            'TimeUnit': 'MILLISECONDS'
        }
    ]

    try:
        timestream_write.write_records(
            DatabaseName=TIMESTREAM_DB,
            TableName='anomaly_scores',
            Records=records
        )
    except Exception as e:
        print(f"Timestream write error: {e}")

def send_alert(equipment_id: str, anomaly_score: float, sensor_data: dict):
    """アラート送信"""
    alert_id = f"{equipment_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    # DynamoDBに記録
    alerts_table.put_item(Item={
        'alert_id': alert_id,
        'equipment_id': equipment_id,
        'anomaly_score': Decimal(str(round(anomaly_score, 4))),
        'sensor_data': json.loads(json.dumps(sensor_data), parse_float=Decimal),
        'created_at': datetime.utcnow().isoformat(),
        'status': 'open',
        'ttl': int(datetime.utcnow().timestamp()) + 86400 * 30
    })

    # SNS通知
    message = f"""
【設備異常検知アラート】

設備ID: {equipment_id}
異常スコア: {anomaly_score:.2f}（閾値: {ANOMALY_THRESHOLD}）
検出時刻: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC

センサー値:
- 温度: {sensor_data.get('temperature', 'N/A')}°C
- 振動: {sensor_data.get('vibration', 'N/A')} mm/s
- 電流: {sensor_data.get('current', 'N/A')} A
- 圧力: {sensor_data.get('pressure', 'N/A')} MPa
- RPM: {sensor_data.get('rpm', 'N/A')}

【推奨アクション】
設備の点検を実施し、異常の原因を調査してください。

---
アラートID: {alert_id}
"""

    sns.publish(
        TopicArn=ALERT_TOPIC_ARN,
        Subject=f'[要確認] 設備異常検知 - {equipment_id}',
        Message=message
    )

    print(f"Alert sent for {equipment_id}")

def handler(event, context):
    """Kinesisからのイベント処理"""
    processed = 0
    alerts = 0

    for record in event['Records']:
        try:
            # Kinesisレコードをデコード
            payload = json.loads(
                boto3.utils.base64.b64decode(record['kinesis']['data']).decode('utf-8')
            )

            equipment_id = payload['equipment_id']
            sensors = payload['sensors']
            timestamp = payload['timestamp']

            # 特徴量抽出
            features = [
                sensors['temperature'],
                sensors['vibration'],
                sensors['current'],
                sensors['pressure'],
                sensors['rpm']
            ]

            # 推論実行
            anomaly_score = invoke_endpoint(features)

            # Timestreamに記録
            write_to_timestream(equipment_id, anomaly_score, timestamp)

            # 閾値判定
            if anomaly_score > ANOMALY_THRESHOLD:
                send_alert(equipment_id, anomaly_score, sensors)
                alerts += 1

            processed += 1

        except Exception as e:
            print(f"Error processing record: {e}")

    return {
        'statusCode': 200,
        'processed': processed,
        'alerts': alerts
    }
```

### フェーズ4: MLOpsパイプライン構築（2時間）

#### Step 4-1: Step Functions定義（モデル再学習）

```json
{
  "Comment": "Predictive Maintenance Model Retraining Pipeline",
  "StartAt": "ExportTrainingData",
  "States": {
    "ExportTrainingData": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-northeast-1:${ACCOUNT_ID}:function:export-training-data",
      "ResultPath": "$.exportResult",
      "Next": "StartTrainingJob"
    },
    "StartTrainingJob": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sagemaker:createTrainingJob.sync",
      "Parameters": {
        "TrainingJobName.$": "States.Format('rcf-retrain-{}', $$.Execution.StartTime)",
        "AlgorithmSpecification": {
          "TrainingImage": "382416733822.dkr.ecr.ap-northeast-1.amazonaws.com/randomcutforest:latest",
          "TrainingInputMode": "File"
        },
        "RoleArn": "${SAGEMAKER_ROLE_ARN}",
        "InputDataConfig": [
          {
            "ChannelName": "train",
            "DataSource": {
              "S3DataSource": {
                "S3DataType": "S3Prefix",
                "S3Uri.$": "$.exportResult.s3Uri"
              }
            },
            "ContentType": "text/csv;label_size=0"
          }
        ],
        "OutputDataConfig": {
          "S3OutputPath": "s3://${BUCKET}/model-output/"
        },
        "ResourceConfig": {
          "InstanceCount": 1,
          "InstanceType": "ml.m5.large",
          "VolumeSizeInGB": 10
        },
        "StoppingCondition": {
          "MaxRuntimeInSeconds": 3600
        },
        "HyperParameters": {
          "num_samples_per_tree": "256",
          "num_trees": "100"
        }
      },
      "ResultPath": "$.trainingResult",
      "Next": "CreateModel"
    },
    "CreateModel": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sagemaker:createModel",
      "Parameters": {
        "ModelName.$": "States.Format('rcf-model-{}', $$.Execution.StartTime)",
        "PrimaryContainer": {
          "Image": "382416733822.dkr.ecr.ap-northeast-1.amazonaws.com/randomcutforest:latest",
          "ModelDataUrl.$": "$.trainingResult.ModelArtifacts.S3ModelArtifacts"
        },
        "ExecutionRoleArn": "${SAGEMAKER_ROLE_ARN}"
      },
      "ResultPath": "$.modelResult",
      "Next": "EvaluateModel"
    },
    "EvaluateModel": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-northeast-1:${ACCOUNT_ID}:function:evaluate-model",
      "ResultPath": "$.evaluationResult",
      "Next": "CheckPerformance"
    },
    "CheckPerformance": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.evaluationResult.meetsThreshold",
          "BooleanEquals": true,
          "Next": "UpdateEndpoint"
        }
      ],
      "Default": "NotifyFailure"
    },
    "UpdateEndpoint": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sagemaker:updateEndpoint",
      "Parameters": {
        "EndpointName": "${ENDPOINT_NAME}",
        "EndpointConfigName.$": "States.Format('config-{}', $$.Execution.StartTime)"
      },
      "Next": "NotifySuccess"
    },
    "NotifySuccess": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "${NOTIFICATION_TOPIC}",
        "Subject": "モデル再学習完了",
        "Message.$": "States.Format('新しいモデルがデプロイされました。評価スコア: {}', $.evaluationResult.score)"
      },
      "End": true
    },
    "NotifyFailure": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "${NOTIFICATION_TOPIC}",
        "Subject": "モデル再学習失敗",
        "Message": "性能基準を満たさなかったため、モデルは更新されませんでした。"
      },
      "End": true
    }
  }
}
```

#### Step 4-2: モデル評価Lambda

```python
# lambda_code/evaluate_model/handler.py
import boto3
import json
import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score

sagemaker_runtime = boto3.client('sagemaker-runtime')
s3 = boto3.client('s3')

def handler(event, context):
    """新モデルの性能評価"""
    model_name = event['modelResult']['ModelName']

    # テストデータ取得（S3から）
    test_data_bucket = 'your-bucket'
    test_data_key = 'test-data/test_with_labels.csv'

    response = s3.get_object(Bucket=test_data_bucket, Key=test_data_key)
    test_data = np.loadtxt(response['Body'], delimiter=',')

    # 最後の列がラベル（0=正常, 1=異常）と仮定
    X_test = test_data[:, :-1]
    y_true = test_data[:, -1]

    # 一時的なエンドポイント設定を作成してテスト
    # （実際にはBatch Transformを使用する方が効率的）

    # 推論実行
    predictions = []
    threshold = 3.0  # 異常判定閾値

    for i in range(0, len(X_test), 100):
        batch = X_test[i:i+100]
        payload = '\n'.join([','.join(map(str, row)) for row in batch])

        response = sagemaker_runtime.invoke_endpoint(
            EndpointName='anomaly-detection-endpoint-dev',  # テスト用エンドポイント
            ContentType='text/csv',
            Body=payload
        )

        result = json.loads(response['Body'].read())
        for score_data in result['scores']:
            predictions.append(1 if score_data['score'] > threshold else 0)

    y_pred = np.array(predictions)

    # 評価メトリクス計算
    precision = precision_score(y_true, y_pred)
    recall = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)

    # 性能基準: Recall 90%以上、Precision 80%以上
    meets_threshold = recall >= 0.90 and precision >= 0.80

    return {
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'score': float(f1),  # F1スコアを総合スコアとする
        'meetsThreshold': meets_threshold
    }
```

### フェーズ5: 監視ダッシュボード（1時間）

#### Step 5-1: CloudWatchダッシュボード

```hcl
# monitoring.tf
resource "aws_cloudwatch_dashboard" "predictive_maintenance" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "SageMaker Endpoint Invocations"
          metrics = [
            ["AWS/SageMaker", "Invocations", "EndpointName", aws_sagemaker_endpoint.anomaly_detection.name, { stat = "Sum", period = 300 }]
          ]
          region = "ap-northeast-1"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Endpoint Latency"
          metrics = [
            ["AWS/SageMaker", "ModelLatency", "EndpointName", aws_sagemaker_endpoint.anomaly_detection.name, { stat = "Average", period = 300 }]
          ]
          region = "ap-northeast-1"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "Kinesis Records"
          metrics = [
            ["AWS/Kinesis", "IncomingRecords", "StreamName", aws_kinesis_stream.sensor_data.name, { stat = "Sum", period = 60 }]
          ]
          region = "ap-northeast-1"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "Lambda Invocations & Errors"
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.inference.function_name, { stat = "Sum", period = 300 }],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.inference.function_name, { stat = "Sum", period = 300, color = "#d62728" }]
          ]
          region = "ap-northeast-1"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "Alerts Sent"
          metrics = [
            ["AWS/SNS", "NumberOfMessagesPublished", "TopicName", aws_sns_topic.alerts.name, { stat = "Sum", period = 3600 }]
          ]
          region = "ap-northeast-1"
        }
      }
    ]
  })
}
```

---

## トラブルシューティング課題

### 問題1: SageMakerエンドポイントのレイテンシーが高い

**症状:**
```
推論に500ms以上かかる
リアルタイム性が損なわれている
```

**ヒント:**
1. インスタンスタイプが適切か確認
2. コールドスタートの影響を確認
3. バッチ推論の活用を検討

**解決方法:**
```python
# バッチ推論の実装
def batch_invoke(features_list: list) -> list:
    """複数サンプルを1回のリクエストで推論"""
    payload = '\n'.join([','.join(map(str, f)) for f in features_list])

    response = sagemaker_runtime.invoke_endpoint(
        EndpointName=ENDPOINT_NAME,
        ContentType='text/csv',
        Body=payload
    )

    result = json.loads(response['Body'].read())
    return [s['score'] for s in result['scores']]
```

### 問題2: 誤検知（False Positive）が多い

**症状:**
```
正常な状態でもアラートが頻発
現場から「オオカミ少年」状態の苦情
```

**ヒント:**
1. 閾値の調整
2. 特徴量エンジニアリングの見直し
3. 時系列の考慮（急変 vs 緩やかな変化）

**解決方法:**
```python
# 連続異常検出による誤検知抑制
def check_consecutive_anomalies(equipment_id: str, current_score: float, window_size: int = 3) -> bool:
    """連続して閾値を超えた場合のみアラート"""
    # DynamoDBから直近のスコアを取得
    recent_scores = get_recent_scores(equipment_id, window_size)
    recent_scores.append(current_score)

    # 全て閾値を超えている場合のみTrue
    return all(s > ANOMALY_THRESHOLD for s in recent_scores[-window_size:])
```

### 問題3: モデル再学習後に性能が低下

**症状:**
```
再学習後のモデルでRecallが低下
既知の異常パターンを検出できなくなった
```

**ヒント:**
1. 学習データの分布を確認
2. 異常データの比率が適切か
3. ハイパーパラメータの調整

**解決方法:**
```python
# データバランシング
def balance_training_data(df: pd.DataFrame, anomaly_ratio: float = 0.1) -> pd.DataFrame:
    """異常データの比率を調整"""
    normal = df[df['is_anomaly'] == 0]
    anomaly = df[df['is_anomaly'] == 1]

    target_anomaly_count = int(len(normal) * anomaly_ratio / (1 - anomaly_ratio))

    if len(anomaly) < target_anomaly_count:
        # アンダーサンプリングされた異常をオーバーサンプリング
        anomaly = anomaly.sample(target_anomaly_count, replace=True)
    else:
        anomaly = anomaly.sample(target_anomaly_count)

    return pd.concat([normal, anomaly]).sample(frac=1).reset_index(drop=True)
```

---

## 設計の考察ポイント

### 1. Random Cut Forest を選択した理由は？

**考察ポイント:**
- 教師なし学習 vs 教師あり学習
- ストリーミングデータへの適応性
- 解釈可能性（なぜ異常か説明できるか）
- 代替: Isolation Forest, AutoEncoder, LSTM

### 2. リアルタイム推論の必要性は？

**考察ポイント:**
- 秒単位の検知 vs 分単位のバッチ
- コスト（エンドポイント常時起動）vs 価値
- エッジでの推論（IoT Greengrass）の検討

### 3. 閾値設計のアプローチは？

**考察ポイント:**
- 固定閾値 vs 動的閾値
- 設備ごとの閾値カスタマイズ
- ビジネスインパクト（見逃し vs 誤検知）

### 4. MLOpsの成熟度は適切か？

**考察ポイント:**
- 手動 → 自動化 → 継続的学習
- モデル監視（ドリフト検知）
- A/Bテストによる段階的デプロイ

### 5. エッジコンピューティングの検討

**考察ポイント:**
- レイテンシー要件が厳しい場合
- ネットワーク障害時の可用性
- IoT Greengrass + SageMaker Edge

---

## 発展課題（オプション）

### 1. マルチモデル構成
- 設備タイプ別のモデル
- SageMaker Multi-Model Endpoint
- モデルルーティング

### 2. 特徴量ストアの導入
- SageMaker Feature Store
- リアルタイム/バッチ両対応
- 特徴量の再利用

### 3. 説明可能AI（XAI）
- SHAP値の計算
- 異常の原因説明
- 保全担当者への情報提供

### 4. エッジ推論
- IoT Greengrass + SageMaker Edge
- オフライン対応
- 帯域幅削減

### 5. 予測メンテナンススケジューリング
- 残存寿命（RUL）予測
- 保全計画の最適化
- 部品在庫との連携

---

## 想定コストと削減方法

### 月額概算コスト

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| SageMaker Endpoint | ml.t2.medium × 24h × 30日 | $50 |
| SageMaker Training | ml.m5.large × 4回/月 × 1時間 | $4 |
| Kinesis Data Streams | 2 シャード × 24h × 30日 | $22 |
| Kinesis Firehose | 100GB/月 | $3 |
| AWS Lambda | 200万回 × 500ms | $5 |
| Amazon Timestream | 10GB 書き込み + 100GBストレージ | $30 |
| Amazon DynamoDB | オンデマンド | $10 |
| Amazon S3 | 50GB | $1 |
| CloudWatch | ログ・メトリクス | $10 |
| Step Functions | 4回/月 | $0.10 |
| **合計** | | **約$135（約20,000円）** |

### コスト削減のポイント

1. **SageMaker Serverless Inference**
   - トラフィックが少ない時間帯の自動スケールダウン
   - → 最大50%削減

2. **Kinesis On-Demand**
   - トラフィックパターンが予測困難な場合
   - シャード管理の自動化

3. **Timestreamの階層化**
   - メモリストア: 直近24時間
   - マグネティックストア: 長期保存

4. **スポットインスタンス（学習時）**
   - SageMaker Training でスポット使用
   - → 学習コスト70%削減

### リソース削除手順

```bash
# SageMaker
aws sagemaker delete-endpoint --endpoint-name techmfg-endpoint-dev
aws sagemaker delete-endpoint-config --endpoint-config-name techmfg-endpoint-config-dev
aws sagemaker delete-model --model-name techmfg-anomaly-model-dev

# Kinesis
aws kinesis delete-stream --stream-name techmfg-sensor-data-dev
aws firehose delete-delivery-stream --delivery-stream-name techmfg-sensor-backup-dev

# Timestream
aws timestream-write delete-table --database-name techmfg-sensor-db --table-name sensor_readings
aws timestream-write delete-table --database-name techmfg-sensor-db --table-name anomaly_scores
aws timestream-write delete-database --database-name techmfg-sensor-db

# DynamoDB
aws dynamodb delete-table --table-name techmfg-alerts

# Step Functions
aws stepfunctions delete-state-machine --state-machine-arn arn:aws:states:...

# Lambda
aws lambda delete-function --function-name techmfg-inference
aws lambda delete-function --function-name techmfg-export-training-data
aws lambda delete-function --function-name techmfg-evaluate-model

# S3
aws s3 rm s3://techmfg-data-bucket --recursive
aws s3 rb s3://techmfg-data-bucket

# SNS
aws sns delete-topic --topic-arn arn:aws:sns:...

# Terraform
terraform destroy -auto-approve
```

---

## 学習のポイント

### 1. 時系列異常検知の基礎
Random Cut Forest は教師なし学習で異常検知を行うアルゴリズム。ストリーミングデータに適しており、SageMaker の組み込みアルゴリズムとして利用可能。

### 2. MLOpsパイプラインの設計
モデルの学習 → 評価 → デプロイの自動化サイクルを Step Functions で構築。性能基準を満たさないモデルはデプロイしない「品質ゲート」を設ける。

### 3. リアルタイム推論アーキテクチャ
Kinesis → Lambda → SageMaker Endpoint の構成は、IoT/ストリーミングデータのリアルタイム推論の典型パターン。

### 4. 閾値設計の重要性
異常検知では、誤検知（False Positive）と見逃し（False Negative）のトレードオフを理解し、ビジネス要件に合った閾値を設計する。

### 5. 予知保全（PdM）の価値
故障を予測して事前に保全することで、計画外停止を減らし、保全コストを最適化できる。製造業DXの重要なユースケース。
