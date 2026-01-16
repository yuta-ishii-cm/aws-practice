# 課題36: SmartRetail SageMaker モデル基盤 - 需要予測モデルの構築とデプロイ

## 1. 課題の分類

| 項目 | 内容 |
|------|------|
| **カテゴリ** | 機械学習 / SageMaker |
| **難易度** | 中級（Intermediate） |
| **所要時間** | 6-8時間 |
| **使用IaCツール** | CloudFormation |
| **前提スキル** | Python基礎、機械学習概念、AWS基礎 |

---

## 2. ビジネスシナリオ

### 企業プロファイル: SmartRetail株式会社

```
┌─────────────────────────────────────────────────────────────────┐
│                   SmartRetail株式会社                            │
│                  小売チェーン運営企業                            │
├─────────────────────────────────────────────────────────────────┤
│  設立: 2010年    従業員: 3000名    本社: 大阪                    │
│  事業: コンビニエンスストアチェーン（全国500店舗）              │
│  年商: 800億円    SKU数: 3000品目    1日販売数: 200万個         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【現在の課題】                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  ┌─────────────────────────────────────────────────────┐    ││
│  │  │  発注業務の問題                                      │    ││
│  │  │  ・各店舗の店長が経験と勘で発注量を決定             │    ││
│  │  │  ・欠品率: 8%（機会損失 月間2億円）                 │    ││
│  │  │  ・廃棄ロス率: 5%（月間4000万円）                   │    ││
│  │  │  ・発注作業時間: 1店舗あたり2時間/日                │    ││
│  │  └─────────────────────────────────────────────────────┘    ││
│  │                                                              ││
│  │  ┌─────────────────────────────────────────────────────┐    ││
│  │  │  データはあるが活用できていない                      │    ││
│  │  │  ・POSデータ: 3年分（10億レコード）                 │    ││
│  │  │  ・気象データ: 連携済み                              │    ││
│  │  │  ・イベント情報: 手動管理                            │    ││
│  │  └─────────────────────────────────────────────────────┘    ││
│  │                                                              ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【目指す姿】                                                    │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │         ┌─────────────────────────────────────┐             ││
│  │         │    AI需要予測システム               │             ││
│  │         │                                     │             ││
│  │         │  ┌───────┐  ┌───────┐  ┌───────┐  │             ││
│  │         │  │  POS  │  │ 気象  │  │ Event │  │             ││
│  │         │  │ Data  │  │ Data  │  │ Data  │  │             ││
│  │         │  └───┬───┘  └───┬───┘  └───┬───┘  │             ││
│  │         │      └──────────┼──────────┘      │             ││
│  │         │                 ▼                  │             ││
│  │         │         ┌─────────────┐           │             ││
│  │         │         │  SageMaker  │           │             ││
│  │         │         │   Model     │           │             ││
│  │         │         └──────┬──────┘           │             ││
│  │         │                ▼                  │             ││
│  │         │    商品×店舗×日 の需要予測        │             ││
│  │         │    → 自動発注推奨                 │             ││
│  │         │                                     │             ││
│  │         └─────────────────────────────────────┘             ││
│  │                                                              ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ビジネス要件と KPI

```
┌─────────────────────────────────────────────────────────────────┐
│                    プロジェクト KPI                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【予測精度目標】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  指標              │ 現状        │ 目標        │ 改善      ││
│  ├────────────────────┼─────────────┼─────────────┼───────────┤│
│  │  MAPE（平均絶対    │ 手動: 25%   │ < 15%       │ 40%↓     ││
│  │  パーセント誤差）  │             │             │           ││
│  │  欠品率            │ 8%          │ < 3%        │ 62%↓     ││
│  │  廃棄ロス率        │ 5%          │ < 2%        │ 60%↓     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【ビジネス効果目標】                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目              │ 現状        │ 目標        │ 効果      ││
│  ├────────────────────┼─────────────┼─────────────┼───────────┤│
│  │  機会損失削減      │ 2億円/月    │ 0.8億円/月  │ 1.2億円↓ ││
│  │  廃棄ロス削減      │ 4000万/月   │ 1600万/月   │ 2400万↓  ││
│  │  発注作業時間      │ 2時間/日/店 │ 30分/日/店  │ 75%↓     ││
│  │  年間コスト削減    │ -           │ 約15億円    │ -         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【システム要件】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ・推論レイテンシ: < 500ms（バッチ推論は許容）               ││
│  │  ・モデル更新頻度: 週次再学習                                ││
│  │  ・予測対象: 500店舗 × 3000SKU × 7日先                       ││
│  │  ・1日あたり推論回数: 約1050万回（バッチ）                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 学習目標

### 習得スキル

```
┌─────────────────────────────────────────────────────────────────┐
│                       学習目標マップ                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【主要スキル】                                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  1. SageMaker基礎                                           ││
│  │     ├── SageMaker Studio / Notebooks                        ││
│  │     ├── 組み込みアルゴリズム（XGBoost, DeepAR等）           ││
│  │     ├── Training Job / Processing Job                       ││
│  │     └── Model / Endpoint / Batch Transform                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  2. モデル開発ライフサイクル                                ││
│  │     ├── データ前処理（SageMaker Processing）                ││
│  │     ├── 特徴量エンジニアリング                              ││
│  │     ├── ハイパーパラメータチューニング                      ││
│  │     └── モデル評価・検証                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  3. モデルデプロイ                                          ││
│  │     ├── リアルタイム推論エンドポイント                      ││
│  │     ├── バッチ変換（Batch Transform）                       ││
│  │     ├── サーバーレス推論                                    ││
│  │     └── マルチモデルエンドポイント                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  4. CloudFormationによるML基盤構築                          ││
│  │     ├── SageMaker Domain / Studio                           ││
│  │     ├── S3バケット設計                                      ││
│  │     ├── IAMロール設計                                       ││
│  │     └── VPCネットワーク設計                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【副次スキル】                                                  │
│  ・時系列予測の基礎知識                                          │
│  ・Feature Storeの活用                                           │
│  ・Model Registry                                                │
│  ・コスト最適化                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### GCPとの対応関係

| AWS サービス | GCP 対応サービス | 主な違い |
|-------------|-----------------|---------|
| SageMaker | Vertex AI | 統合ML プラットフォーム |
| SageMaker Studio | Vertex AI Workbench | ノートブック環境 |
| SageMaker Endpoints | Vertex AI Predictions | モデルサービング |
| SageMaker Processing | Dataflow / Dataproc | データ処理 |

---

## 4. 使用するAWSサービス

```
┌─────────────────────────────────────────────────────────────────┐
│                    使用AWSサービス一覧                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【コアサービス】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  サービス          │ 用途                    │ 重要度      ││
│  ├────────────────────┼─────────────────────────┼─────────────┤│
│  │  SageMaker         │ ML開発・デプロイ        │ ★★★★★      ││
│  │  S3                │ データ・モデル保存      │ ★★★★★      ││
│  │  CloudFormation    │ インフラ定義            │ ★★★★★      ││
│  │  IAM               │ アクセス制御            │ ★★★★☆      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【支援サービス】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  サービス          │ 用途                    │ 重要度      ││
│  ├────────────────────┼─────────────────────────┼─────────────┤│
│  │  CloudWatch        │ 監視・ログ              │ ★★★★☆      ││
│  │  EventBridge       │ スケジュール実行        │ ★★★☆☆      ││
│  │  Lambda            │ 推論トリガー            │ ★★★☆☆      ││
│  │  Step Functions    │ ML パイプライン         │ ★★★☆☆      ││
│  │  ECR               │ カスタムコンテナ        │ ★★☆☆☆      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 前提条件と事前準備

### 必要な環境

```bash
# AWS CLI バージョン確認
aws --version
# aws-cli/2.x.x 以上

# Python環境
python3 --version
# Python 3.9以上

# 必要なPythonパッケージ
pip install boto3 sagemaker pandas numpy scikit-learn
```

### AWS環境の準備

```bash
# 環境変数設定
export AWS_REGION=ap-northeast-1
export PROJECT_NAME=smartretail
export ENVIRONMENT=dev

# 作業ディレクトリ作成
mkdir -p ~/smartretail-sagemaker/{cfn,notebooks,scripts,data}
cd ~/smartretail-sagemaker
```

### IAMポリシー（必要な権限）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sagemaker:*",
        "s3:*",
        "ecr:*",
        "cloudwatch:*",
        "logs:*",
        "iam:PassRole",
        "iam:CreateServiceLinkedRole",
        "cloudformation:*",
        "ec2:*",
        "kms:*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 6. アーキテクチャ設計

### ML基盤全体像

```
┌─────────────────────────────────────────────────────────────────┐
│              SmartRetail ML基盤アーキテクチャ                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Data Layer                               ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │ POS Data    │  │Weather Data │  │ Event Data  │         ││
│  │  │ (RDS/S3)    │  │ (API→S3)    │  │ (Manual→S3) │         ││
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         ││
│  │         └────────────────┼────────────────┘                 ││
│  │                          ▼                                   ││
│  │              ┌───────────────────────┐                      ││
│  │              │      S3 Data Lake     │                      ││
│  │              │  ├─ raw/              │                      ││
│  │              │  ├─ processed/        │                      ││
│  │              │  └─ features/         │                      ││
│  │              └───────────┬───────────┘                      ││
│  └──────────────────────────┼──────────────────────────────────┘│
│                             │                                    │
│  ┌──────────────────────────┼──────────────────────────────────┐│
│  │                    ML Layer                                 ││
│  │                          ▼                                   ││
│  │  ┌───────────────────────────────────────────────────────┐  ││
│  │  │              SageMaker Studio                          │  ││
│  │  │  ┌─────────────────────────────────────────────────┐  │  ││
│  │  │  │           Jupyter Notebooks                      │  │  ││
│  │  │  │  ・探索的データ分析（EDA）                       │  │  ││
│  │  │  │  ・モデル開発・実験                              │  │  ││
│  │  │  └─────────────────────────────────────────────────┘  │  ││
│  │  └───────────────────────────────────────────────────────┘  ││
│  │                          │                                   ││
│  │    ┌─────────────────────┼─────────────────────┐            ││
│  │    │                     ▼                     │            ││
│  │    │  ┌─────────────┐  ┌─────────────┐        │            ││
│  │    │  │ Processing  │  │  Training   │        │            ││
│  │    │  │    Job      │─►│    Job      │        │            ││
│  │    │  │(前処理)     │  │(モデル学習) │        │            ││
│  │    │  └─────────────┘  └──────┬──────┘        │            ││
│  │    │                          │               │            ││
│  │    │                          ▼               │            ││
│  │    │              ┌───────────────────┐       │            ││
│  │    │              │   Model Registry  │       │            ││
│  │    │              │  (モデル管理)     │       │            ││
│  │    │              └─────────┬─────────┘       │            ││
│  │    └────────────────────────┼─────────────────┘            ││
│  └─────────────────────────────┼────────────────────────────────┘│
│                                │                                 │
│  ┌─────────────────────────────┼────────────────────────────────┐│
│  │                    Inference Layer                           ││
│  │                             ▼                                ││
│  │    ┌────────────────────────┴────────────────────────┐      ││
│  │    │                                                  │      ││
│  │    ▼                                                  ▼      ││
│  │  ┌─────────────────┐                    ┌─────────────────┐  ││
│  │  │ Batch Transform │                    │ Real-time       │  ││
│  │  │ (日次バッチ予測)│                    │ Endpoint        │  ││
│  │  │ 全店舗×全SKU   │                    │ (オンデマンド)  │  ││
│  │  └────────┬────────┘                    └────────┬────────┘  ││
│  │           │                                      │           ││
│  │           ▼                                      ▼           ││
│  │  ┌─────────────────┐                    ┌─────────────────┐  ││
│  │  │  S3 Results     │                    │   API Gateway   │  ││
│  │  │  (予測結果)     │                    │   (予測API)     │  ││
│  │  └─────────────────┘                    └─────────────────┘  ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### データフロー設計

```
┌─────────────────────────────────────────────────────────────────┐
│                    データフロー詳細                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【入力データ】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  データソース        │ 形式      │ 更新頻度  │ サイズ      ││
│  ├──────────────────────┼───────────┼───────────┼─────────────┤│
│  │  POSトランザクション │ CSV/Parquet│ 日次     │ 10GB/日     ││
│  │  商品マスタ          │ CSV       │ 週次      │ 10MB        ││
│  │  店舗マスタ          │ CSV       │ 月次      │ 1MB         ││
│  │  気象データ          │ JSON→CSV  │ 日次      │ 100MB       ││
│  │  イベントカレンダー  │ CSV       │ 週次      │ 1MB         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【特徴量設計】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  カテゴリ          │ 特徴量例                              ││
│  ├────────────────────┼──────────────────────────────────────┤│
│  │  時間特徴          │ 曜日, 月, 祝日フラグ, 給料日フラグ   ││
│  │  ラグ特徴          │ 過去7日/14日/28日の販売数            ││
│  │  ローリング統計    │ 7日/14日移動平均, 標準偏差           ││
│  │  商品特徴          │ カテゴリ, 価格帯, 新商品フラグ       ││
│  │  店舗特徴          │ 立地タイプ, 面積, 客層               ││
│  │  気象特徴          │ 気温, 降水確率, 天気カテゴリ         ││
│  │  イベント特徴      │ 近隣イベント, 店舗イベント           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【出力データ】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  予測結果 = 店舗ID × 商品ID × 予測日 × 予測販売数          ││
│  │  + 信頼区間（上限/下限）                                    ││
│  │  + 推奨発注数                                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. ハンズオン手順

### Phase 1: CloudFormationによるML基盤構築

#### 1.1 VPCとネットワーク設定

```yaml
# cfn/network.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'SmartRetail ML Platform - Network Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, stg, prod]

  VpcCidr:
    Type: String
    Default: 10.0.0.0/16

Resources:
  #============================================
  # VPC
  #============================================
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCidr
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub 'smartretail-ml-vpc-${Environment}'

  #============================================
  # Private Subnets（SageMaker用）
  #============================================
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: false
      Tags:
        - Key: Name
          Value: !Sub 'smartretail-ml-private-1-${Environment}'

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: false
      Tags:
        - Key: Name
          Value: !Sub 'smartretail-ml-private-2-${Environment}'

  #============================================
  # VPC Endpoints（SageMaker用）
  #============================================
  S3VPCEndpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      ServiceName: !Sub 'com.amazonaws.${AWS::Region}.s3'
      VpcId: !Ref VPC
      VpcEndpointType: Gateway
      RouteTableIds:
        - !Ref PrivateRouteTable

  SageMakerAPIEndpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      ServiceName: !Sub 'com.amazonaws.${AWS::Region}.sagemaker.api'
      VpcId: !Ref VPC
      VpcEndpointType: Interface
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      SecurityGroupIds:
        - !Ref SageMakerSecurityGroup
      PrivateDnsEnabled: true

  SageMakerRuntimeEndpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      ServiceName: !Sub 'com.amazonaws.${AWS::Region}.sagemaker.runtime'
      VpcId: !Ref VPC
      VpcEndpointType: Interface
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      SecurityGroupIds:
        - !Ref SageMakerSecurityGroup
      PrivateDnsEnabled: true

  #============================================
  # Security Group
  #============================================
  SageMakerSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for SageMaker
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: !Ref VpcCidr
      Tags:
        - Key: Name
          Value: !Sub 'smartretail-ml-sg-${Environment}'

  # 自己参照ルール（SageMaker間通信用）
  SageMakerSecurityGroupSelfIngress:
    Type: AWS::EC2::SecurityGroupIngress
    Properties:
      GroupId: !Ref SageMakerSecurityGroup
      IpProtocol: -1
      SourceSecurityGroupId: !Ref SageMakerSecurityGroup

  #============================================
  # Route Table
  #============================================
  PrivateRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub 'smartretail-ml-private-rt-${Environment}'

  PrivateSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PrivateSubnet1
      RouteTableId: !Ref PrivateRouteTable

  PrivateSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PrivateSubnet2
      RouteTableId: !Ref PrivateRouteTable

Outputs:
  VpcId:
    Value: !Ref VPC
    Export:
      Name: !Sub '${AWS::StackName}-VpcId'

  PrivateSubnetIds:
    Value: !Join [',', [!Ref PrivateSubnet1, !Ref PrivateSubnet2]]
    Export:
      Name: !Sub '${AWS::StackName}-PrivateSubnetIds'

  SecurityGroupId:
    Value: !Ref SageMakerSecurityGroup
    Export:
      Name: !Sub '${AWS::StackName}-SecurityGroupId'
```

#### 1.2 S3バケットとIAMロール

```yaml
# cfn/storage-iam.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'SmartRetail ML Platform - Storage and IAM'

Parameters:
  Environment:
    Type: String
    Default: dev

Resources:
  #============================================
  # S3 Buckets
  #============================================
  DataBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'smartretail-ml-data-${Environment}-${AWS::AccountId}'
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      VersioningConfiguration:
        Status: Enabled
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      LifecycleConfiguration:
        Rules:
          - Id: ArchiveOldData
            Status: Enabled
            Transitions:
              - StorageClass: INTELLIGENT_TIERING
                TransitionInDays: 30
      Tags:
        - Key: Purpose
          Value: MLDataLake

  ModelBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'smartretail-ml-models-${Environment}-${AWS::AccountId}'
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      VersioningConfiguration:
        Status: Enabled
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      Tags:
        - Key: Purpose
          Value: MLModels

  #============================================
  # SageMaker Execution Role
  #============================================
  SageMakerExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'smartretail-sagemaker-execution-${Environment}'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: sagemaker.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonSageMakerFullAccess
      Policies:
        - PolicyName: S3Access
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:PutObject
                  - s3:DeleteObject
                  - s3:ListBucket
                Resource:
                  - !GetAtt DataBucket.Arn
                  - !Sub '${DataBucket.Arn}/*'
                  - !GetAtt ModelBucket.Arn
                  - !Sub '${ModelBucket.Arn}/*'
        - PolicyName: CloudWatchLogs
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - logs:CreateLogGroup
                  - logs:CreateLogStream
                  - logs:PutLogEvents
                Resource: !Sub 'arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/sagemaker/*'
        - PolicyName: ECRAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - ecr:GetAuthorizationToken
                  - ecr:BatchCheckLayerAvailability
                  - ecr:GetDownloadUrlForLayer
                  - ecr:BatchGetImage
                Resource: '*'

  #============================================
  # KMS Key for Encryption
  #============================================
  MLKMSKey:
    Type: AWS::KMS::Key
    Properties:
      Description: KMS key for SmartRetail ML data encryption
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: kms:*
            Resource: '*'
          - Effect: Allow
            Principal:
              Service: sagemaker.amazonaws.com
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:GenerateDataKey
            Resource: '*'

  MLKMSKeyAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: !Sub 'alias/smartretail-ml-${Environment}'
      TargetKeyId: !Ref MLKMSKey

Outputs:
  DataBucketName:
    Value: !Ref DataBucket
    Export:
      Name: !Sub '${AWS::StackName}-DataBucketName'

  ModelBucketName:
    Value: !Ref ModelBucket
    Export:
      Name: !Sub '${AWS::StackName}-ModelBucketName'

  SageMakerExecutionRoleArn:
    Value: !GetAtt SageMakerExecutionRole.Arn
    Export:
      Name: !Sub '${AWS::StackName}-SageMakerExecutionRoleArn'

  KMSKeyArn:
    Value: !GetAtt MLKMSKey.Arn
    Export:
      Name: !Sub '${AWS::StackName}-KMSKeyArn'
```

#### 1.3 SageMaker Domain

```yaml
# cfn/sagemaker-domain.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'SmartRetail ML Platform - SageMaker Domain'

Parameters:
  Environment:
    Type: String
    Default: dev

  VpcId:
    Type: String

  SubnetIds:
    Type: CommaDelimitedList

  SecurityGroupId:
    Type: String

  ExecutionRoleArn:
    Type: String

Resources:
  #============================================
  # SageMaker Domain
  #============================================
  SageMakerDomain:
    Type: AWS::SageMaker::Domain
    Properties:
      DomainName: !Sub 'smartretail-ml-domain-${Environment}'
      AuthMode: IAM
      VpcId: !Ref VpcId
      SubnetIds: !Ref SubnetIds
      AppNetworkAccessType: VpcOnly
      DefaultUserSettings:
        ExecutionRole: !Ref ExecutionRoleArn
        SecurityGroups:
          - !Ref SecurityGroupId
        SharingSettings:
          NotebookOutputOption: Allowed
          S3OutputPath: !Sub 's3://smartretail-ml-data-${Environment}-${AWS::AccountId}/studio-outputs/'
        JupyterServerAppSettings:
          DefaultResourceSpec:
            InstanceType: system
            SageMakerImageArn: !Sub 'arn:aws:sagemaker:${AWS::Region}:081325390199:image/jupyter-server-3'
        KernelGatewayAppSettings:
          DefaultResourceSpec:
            InstanceType: ml.t3.medium
            SageMakerImageArn: !Sub 'arn:aws:sagemaker:${AWS::Region}:081325390199:image/datascience-3.0'
      Tags:
        - Key: Environment
          Value: !Ref Environment

  #============================================
  # Default User Profile
  #============================================
  DataScientistUserProfile:
    Type: AWS::SageMaker::UserProfile
    Properties:
      DomainId: !Ref SageMakerDomain
      UserProfileName: !Sub 'data-scientist-${Environment}'
      UserSettings:
        ExecutionRole: !Ref ExecutionRoleArn

  #============================================
  # SageMaker Model Package Group (Model Registry)
  #============================================
  DemandForecastModelGroup:
    Type: AWS::SageMaker::ModelPackageGroup
    Properties:
      ModelPackageGroupName: !Sub 'smartretail-demand-forecast-${Environment}'
      ModelPackageGroupDescription: Demand forecasting models for SmartRetail
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: UseCase
          Value: DemandForecast

Outputs:
  DomainId:
    Value: !Ref SageMakerDomain
    Export:
      Name: !Sub '${AWS::StackName}-DomainId'

  DomainArn:
    Value: !GetAtt SageMakerDomain.DomainArn
    Export:
      Name: !Sub '${AWS::StackName}-DomainArn'

  UserProfileArn:
    Value: !GetAtt DataScientistUserProfile.UserProfileArn
    Export:
      Name: !Sub '${AWS::StackName}-UserProfileArn'

  ModelPackageGroupArn:
    Value: !GetAtt DemandForecastModelGroup.ModelPackageGroupArn
    Export:
      Name: !Sub '${AWS::StackName}-ModelPackageGroupArn'
```

### Phase 2: サンプルデータの準備

```python
# scripts/generate_sample_data.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import boto3
import io

def generate_sample_data(
    n_stores: int = 10,
    n_products: int = 50,
    n_days: int = 365,
    output_bucket: str = None
):
    """需要予測用のサンプルデータを生成"""

    np.random.seed(42)

    # 日付範囲
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=n_days)
    dates = pd.date_range(start=start_date, end=end_date, freq='D')

    # 店舗マスタ
    stores = pd.DataFrame({
        'store_id': [f'STORE_{i:03d}' for i in range(1, n_stores + 1)],
        'store_name': [f'店舗{i}' for i in range(1, n_stores + 1)],
        'prefecture': np.random.choice(['東京', '大阪', '愛知', '福岡'], n_stores),
        'store_type': np.random.choice(['駅前', 'ロードサイド', '住宅街'], n_stores),
        'floor_space': np.random.randint(50, 200, n_stores)
    })

    # 商品マスタ
    categories = ['飲料', '食品', '日用品', '菓子']
    products = pd.DataFrame({
        'product_id': [f'PROD_{i:04d}' for i in range(1, n_products + 1)],
        'product_name': [f'商品{i}' for i in range(1, n_products + 1)],
        'category': np.random.choice(categories, n_products),
        'unit_price': np.random.choice([100, 150, 200, 300, 500], n_products),
        'is_seasonal': np.random.choice([0, 1], n_products, p=[0.8, 0.2])
    })

    # 販売データ生成
    sales_records = []

    for store_id in stores['store_id']:
        for product_id in products['product_id']:
            # 基本販売数（商品と店舗で異なる）
            base_sales = np.random.randint(5, 30)

            for date in dates:
                # 曜日効果
                weekday_effect = 1.2 if date.weekday() >= 5 else 1.0

                # 季節効果
                month = date.month
                if month in [7, 8]:
                    season_effect = 1.3  # 夏
                elif month in [12, 1]:
                    season_effect = 1.2  # 年末年始
                else:
                    season_effect = 1.0

                # ランダムノイズ
                noise = np.random.normal(1, 0.2)

                # 最終販売数
                sales = max(0, int(base_sales * weekday_effect * season_effect * noise))

                sales_records.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'store_id': store_id,
                    'product_id': product_id,
                    'sales_quantity': sales,
                    'sales_amount': sales * products[products['product_id'] == product_id]['unit_price'].values[0]
                })

    sales_df = pd.DataFrame(sales_records)

    # 気象データ生成
    weather_records = []
    for date in dates:
        # 基本気温（季節変動）
        month = date.month
        base_temp = 15 + 10 * np.sin((month - 4) * np.pi / 6)
        temp = base_temp + np.random.normal(0, 3)

        weather_records.append({
            'date': date.strftime('%Y-%m-%d'),
            'temperature': round(temp, 1),
            'precipitation_prob': np.random.randint(0, 100),
            'weather_type': np.random.choice(['晴れ', '曇り', '雨'], p=[0.5, 0.3, 0.2])
        })

    weather_df = pd.DataFrame(weather_records)

    # S3にアップロード
    if output_bucket:
        s3 = boto3.client('s3')

        # 店舗マスタ
        csv_buffer = io.StringIO()
        stores.to_csv(csv_buffer, index=False)
        s3.put_object(
            Bucket=output_bucket,
            Key='raw/master/stores.csv',
            Body=csv_buffer.getvalue()
        )

        # 商品マスタ
        csv_buffer = io.StringIO()
        products.to_csv(csv_buffer, index=False)
        s3.put_object(
            Bucket=output_bucket,
            Key='raw/master/products.csv',
            Body=csv_buffer.getvalue()
        )

        # 販売データ
        csv_buffer = io.StringIO()
        sales_df.to_csv(csv_buffer, index=False)
        s3.put_object(
            Bucket=output_bucket,
            Key='raw/sales/sales_history.csv',
            Body=csv_buffer.getvalue()
        )

        # 気象データ
        csv_buffer = io.StringIO()
        weather_df.to_csv(csv_buffer, index=False)
        s3.put_object(
            Bucket=output_bucket,
            Key='raw/weather/weather_history.csv',
            Body=csv_buffer.getvalue()
        )

        print(f"Data uploaded to s3://{output_bucket}/raw/")

    return stores, products, sales_df, weather_df


if __name__ == '__main__':
    import os
    bucket = os.environ.get('DATA_BUCKET', 'smartretail-ml-data-dev-123456789012')
    generate_sample_data(output_bucket=bucket)
```

### Phase 3: データ前処理（SageMaker Processing）

```python
# scripts/preprocessing.py
"""
SageMaker Processing Job用の前処理スクリプト
"""
import argparse
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def add_time_features(df):
    """時間特徴量を追加"""
    df['date'] = pd.to_datetime(df['date'])
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.month
    df['day'] = df['date'].dt.day
    df['day_of_week'] = df['date'].dt.dayofweek
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    df['week_of_year'] = df['date'].dt.isocalendar().week

    # 日本の祝日（簡略化）
    holidays = [
        '01-01', '01-02', '01-03',  # 年始
        '05-03', '05-04', '05-05',  # GW
        '08-13', '08-14', '08-15',  # お盆
    ]
    df['is_holiday'] = df['date'].dt.strftime('%m-%d').isin(holidays).astype(int)

    return df

def add_lag_features(df, group_cols, target_col, lags):
    """ラグ特徴量を追加"""
    df = df.sort_values(['store_id', 'product_id', 'date'])

    for lag in lags:
        df[f'{target_col}_lag_{lag}'] = df.groupby(group_cols)[target_col].shift(lag)

    return df

def add_rolling_features(df, group_cols, target_col, windows):
    """ローリング統計量を追加"""
    df = df.sort_values(['store_id', 'product_id', 'date'])

    for window in windows:
        df[f'{target_col}_rolling_mean_{window}'] = (
            df.groupby(group_cols)[target_col]
            .transform(lambda x: x.shift(1).rolling(window=window, min_periods=1).mean())
        )
        df[f'{target_col}_rolling_std_{window}'] = (
            df.groupby(group_cols)[target_col]
            .transform(lambda x: x.shift(1).rolling(window=window, min_periods=1).std())
        )

    return df

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', type=str, default='/opt/ml/processing/input')
    parser.add_argument('--output-dir', type=str, default='/opt/ml/processing/output')
    args = parser.parse_args()

    print("Loading data...")

    # データ読み込み
    sales_df = pd.read_csv(os.path.join(args.input_dir, 'sales', 'sales_history.csv'))
    weather_df = pd.read_csv(os.path.join(args.input_dir, 'weather', 'weather_history.csv'))
    stores_df = pd.read_csv(os.path.join(args.input_dir, 'master', 'stores.csv'))
    products_df = pd.read_csv(os.path.join(args.input_dir, 'master', 'products.csv'))

    print(f"Sales records: {len(sales_df)}")

    # マスタデータとの結合
    df = sales_df.merge(stores_df, on='store_id', how='left')
    df = df.merge(products_df, on='product_id', how='left')
    df = df.merge(weather_df, on='date', how='left')

    print("Adding time features...")
    df = add_time_features(df)

    print("Adding lag features...")
    df = add_lag_features(
        df,
        group_cols=['store_id', 'product_id'],
        target_col='sales_quantity',
        lags=[1, 7, 14, 28]
    )

    print("Adding rolling features...")
    df = add_rolling_features(
        df,
        group_cols=['store_id', 'product_id'],
        target_col='sales_quantity',
        windows=[7, 14, 28]
    )

    # カテゴリカル変数のエンコーディング
    print("Encoding categorical features...")
    categorical_cols = ['store_type', 'prefecture', 'category', 'weather_type']
    df = pd.get_dummies(df, columns=categorical_cols, drop_first=True)

    # 欠損値処理
    df = df.dropna()

    # 特徴量とターゲットの分離
    feature_cols = [col for col in df.columns if col not in [
        'date', 'store_id', 'product_id', 'store_name', 'product_name',
        'sales_quantity', 'sales_amount'
    ]]

    # 訓練/検証/テストデータの分割（時系列分割）
    df = df.sort_values('date')
    train_end = df['date'].max() - timedelta(days=14)
    val_end = df['date'].max() - timedelta(days=7)

    train_df = df[df['date'] <= train_end]
    val_df = df[(df['date'] > train_end) & (df['date'] <= val_end)]
    test_df = df[df['date'] > val_end]

    print(f"Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")

    # 出力
    os.makedirs(os.path.join(args.output_dir, 'train'), exist_ok=True)
    os.makedirs(os.path.join(args.output_dir, 'validation'), exist_ok=True)
    os.makedirs(os.path.join(args.output_dir, 'test'), exist_ok=True)

    # XGBoost形式（ターゲットが最初の列）
    train_output = train_df[['sales_quantity'] + feature_cols]
    val_output = val_df[['sales_quantity'] + feature_cols]
    test_output = test_df[['sales_quantity'] + feature_cols]

    train_output.to_csv(
        os.path.join(args.output_dir, 'train', 'train.csv'),
        index=False, header=False
    )
    val_output.to_csv(
        os.path.join(args.output_dir, 'validation', 'validation.csv'),
        index=False, header=False
    )
    test_output.to_csv(
        os.path.join(args.output_dir, 'test', 'test.csv'),
        index=False, header=False
    )

    # 特徴量名保存
    with open(os.path.join(args.output_dir, 'feature_names.txt'), 'w') as f:
        f.write('\n'.join(feature_cols))

    print("Preprocessing completed!")


if __name__ == '__main__':
    main()
```

### Phase 4: モデル訓練（Training Job）

```python
# notebooks/train_demand_forecast.py
"""
SageMaker Training Job を使用した需要予測モデルの訓練
"""
import sagemaker
from sagemaker import get_execution_role
from sagemaker.estimator import Estimator
from sagemaker.inputs import TrainingInput
from sagemaker.tuner import HyperparameterTuner, IntegerParameter, ContinuousParameter
import boto3
import os

# セットアップ
session = sagemaker.Session()
role = get_execution_role()
region = session.boto_region_name

# パラメータ
environment = os.environ.get('ENVIRONMENT', 'dev')
data_bucket = f'smartretail-ml-data-{environment}-{boto3.client("sts").get_caller_identity()["Account"]}'
model_bucket = f'smartretail-ml-models-{environment}-{boto3.client("sts").get_caller_identity()["Account"]}'

# データパス
train_path = f's3://{data_bucket}/processed/train/'
validation_path = f's3://{data_bucket}/processed/validation/'
output_path = f's3://{model_bucket}/training-output/'

# XGBoost コンテナ
xgboost_container = sagemaker.image_uris.retrieve(
    framework='xgboost',
    region=region,
    version='1.7-1'
)

# ハイパーパラメータチューニング
def run_hyperparameter_tuning():
    """ハイパーパラメータチューニングを実行"""

    # 基本Estimator
    xgb_estimator = Estimator(
        image_uri=xgboost_container,
        role=role,
        instance_count=1,
        instance_type='ml.m5.xlarge',
        output_path=output_path,
        sagemaker_session=session,
        base_job_name='smartretail-demand-forecast',
        hyperparameters={
            'objective': 'reg:squarederror',
            'eval_metric': 'rmse',
            'num_round': 200,
        }
    )

    # チューニングパラメータ
    hyperparameter_ranges = {
        'max_depth': IntegerParameter(3, 10),
        'eta': ContinuousParameter(0.01, 0.3),
        'min_child_weight': IntegerParameter(1, 10),
        'subsample': ContinuousParameter(0.5, 1.0),
        'colsample_bytree': ContinuousParameter(0.5, 1.0),
        'gamma': ContinuousParameter(0, 5),
    }

    # チューナー設定
    tuner = HyperparameterTuner(
        estimator=xgb_estimator,
        objective_metric_name='validation:rmse',
        objective_type='Minimize',
        hyperparameter_ranges=hyperparameter_ranges,
        max_jobs=20,
        max_parallel_jobs=5,
        strategy='Bayesian',
        early_stopping_type='Auto',
    )

    # データ入力
    train_input = TrainingInput(
        s3_data=train_path,
        content_type='text/csv'
    )
    validation_input = TrainingInput(
        s3_data=validation_path,
        content_type='text/csv'
    )

    # チューニング開始
    tuner.fit({
        'train': train_input,
        'validation': validation_input
    }, wait=True)

    return tuner


def run_single_training(hyperparameters: dict):
    """単一のTraining Jobを実行"""

    xgb_estimator = Estimator(
        image_uri=xgboost_container,
        role=role,
        instance_count=1,
        instance_type='ml.m5.xlarge',
        output_path=output_path,
        sagemaker_session=session,
        base_job_name='smartretail-demand-forecast',
        hyperparameters={
            'objective': 'reg:squarederror',
            'eval_metric': 'rmse',
            'num_round': 300,
            **hyperparameters
        }
    )

    train_input = TrainingInput(
        s3_data=train_path,
        content_type='text/csv'
    )
    validation_input = TrainingInput(
        s3_data=validation_path,
        content_type='text/csv'
    )

    xgb_estimator.fit({
        'train': train_input,
        'validation': validation_input
    }, wait=True)

    return xgb_estimator


def register_model(estimator, model_package_group_name: str):
    """モデルをModel Registryに登録"""

    model = estimator.create_model()

    model_package = model.register(
        model_package_group_name=model_package_group_name,
        inference_instances=['ml.t2.medium', 'ml.m5.large'],
        transform_instances=['ml.m5.xlarge'],
        content_types=['text/csv'],
        response_types=['text/csv'],
        approval_status='PendingManualApproval',
        description='Demand forecast model for SmartRetail'
    )

    return model_package


if __name__ == '__main__':
    # ハイパーパラメータ（チューニング済みの例）
    best_hyperparameters = {
        'max_depth': 6,
        'eta': 0.1,
        'min_child_weight': 3,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'gamma': 1,
    }

    # 訓練実行
    estimator = run_single_training(best_hyperparameters)

    # モデル登録
    model_package = register_model(
        estimator,
        model_package_group_name=f'smartretail-demand-forecast-{environment}'
    )

    print(f"Model registered: {model_package.model_package_arn}")
```

### Phase 5: モデルデプロイ

```yaml
# cfn/inference-endpoint.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'SmartRetail ML Platform - Inference Endpoint'

Parameters:
  Environment:
    Type: String
    Default: dev

  ModelDataUrl:
    Type: String
    Description: S3 URI of the model artifacts

  ExecutionRoleArn:
    Type: String

  InstanceType:
    Type: String
    Default: ml.t2.medium

  InitialInstanceCount:
    Type: Number
    Default: 1

Resources:
  #============================================
  # SageMaker Model
  #============================================
  DemandForecastModel:
    Type: AWS::SageMaker::Model
    Properties:
      ModelName: !Sub 'smartretail-demand-forecast-${Environment}'
      ExecutionRoleArn: !Ref ExecutionRoleArn
      PrimaryContainer:
        Image: !Sub '${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/sagemaker-xgboost:1.7-1'
        ModelDataUrl: !Ref ModelDataUrl
        Mode: SingleModel

  #============================================
  # Endpoint Configuration
  #============================================
  EndpointConfig:
    Type: AWS::SageMaker::EndpointConfig
    Properties:
      EndpointConfigName: !Sub 'smartretail-demand-forecast-config-${Environment}'
      ProductionVariants:
        - VariantName: AllTraffic
          ModelName: !Ref DemandForecastModel
          InstanceType: !Ref InstanceType
          InitialInstanceCount: !Ref InitialInstanceCount
          InitialVariantWeight: 1.0
      DataCaptureConfig:
        EnableCapture: true
        InitialSamplingPercentage: 10
        DestinationS3Uri: !Sub 's3://smartretail-ml-models-${Environment}-${AWS::AccountId}/data-capture/'
        CaptureOptions:
          - CaptureMode: Input
          - CaptureMode: Output

  #============================================
  # Endpoint
  #============================================
  InferenceEndpoint:
    Type: AWS::SageMaker::Endpoint
    Properties:
      EndpointName: !Sub 'smartretail-demand-forecast-${Environment}'
      EndpointConfigName: !Ref EndpointConfig

  #============================================
  # Auto Scaling
  #============================================
  ScalableTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      MaxCapacity: 5
      MinCapacity: 1
      ResourceId: !Sub 'endpoint/${InferenceEndpoint}/variant/AllTraffic'
      RoleARN: !Sub 'arn:aws:iam::${AWS::AccountId}:role/aws-service-role/sagemaker.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_SageMakerEndpoint'
      ScalableDimension: sagemaker:variant:DesiredInstanceCount
      ServiceNamespace: sagemaker

  ScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      PolicyName: SageMakerEndpointInvocationScalingPolicy
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref ScalableTarget
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 70.0
        PredefinedMetricSpecification:
          PredefinedMetricType: SageMakerVariantInvocationsPerInstance
        ScaleInCooldown: 600
        ScaleOutCooldown: 300

Outputs:
  EndpointName:
    Value: !Ref InferenceEndpoint
    Export:
      Name: !Sub '${AWS::StackName}-EndpointName'

  EndpointArn:
    Value: !Ref InferenceEndpoint
    Export:
      Name: !Sub '${AWS::StackName}-EndpointArn'
```

### Phase 6: バッチ推論

```python
# scripts/batch_inference.py
"""
バッチ推論の実行スクリプト
"""
import sagemaker
from sagemaker.transformer import Transformer
import boto3
from datetime import datetime

def run_batch_transform(
    model_name: str,
    input_path: str,
    output_path: str,
    instance_type: str = 'ml.m5.xlarge',
    instance_count: int = 2
):
    """バッチ変換ジョブを実行"""

    session = sagemaker.Session()

    transformer = Transformer(
        model_name=model_name,
        instance_count=instance_count,
        instance_type=instance_type,
        output_path=output_path,
        sagemaker_session=session,
        strategy='MultiRecord',
        max_payload=6,  # MB
        max_concurrent_transforms=4,
        accept='text/csv',
        assemble_with='Line'
    )

    transformer.transform(
        data=input_path,
        content_type='text/csv',
        split_type='Line',
        wait=True
    )

    return transformer


def create_inference_input(
    bucket: str,
    stores: list,
    products: list,
    forecast_dates: list
):
    """推論用入力データを作成"""
    import pandas as pd
    import io

    # 全組み合わせを生成
    records = []
    for store_id in stores:
        for product_id in products:
            for date in forecast_dates:
                # 特徴量を計算（実際には最新のラグ特徴量等を含める）
                records.append({
                    'store_id': store_id,
                    'product_id': product_id,
                    'date': date.strftime('%Y-%m-%d'),
                    # ... 他の特徴量
                })

    df = pd.DataFrame(records)

    # S3にアップロード
    s3 = boto3.client('s3')
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False, header=False)

    key = f'batch-inference/input/{datetime.now().strftime("%Y%m%d")}/input.csv'
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=csv_buffer.getvalue()
    )

    return f's3://{bucket}/{key}'


if __name__ == '__main__':
    from datetime import timedelta
    import os

    environment = os.environ.get('ENVIRONMENT', 'dev')
    account_id = boto3.client('sts').get_caller_identity()['Account']

    model_name = f'smartretail-demand-forecast-{environment}'
    data_bucket = f'smartretail-ml-data-{environment}-{account_id}'
    model_bucket = f'smartretail-ml-models-{environment}-{account_id}'

    # 7日間の予測
    forecast_dates = [
        datetime.now().date() + timedelta(days=i)
        for i in range(1, 8)
    ]

    # 入力データ作成（実際には全店舗・全商品）
    input_path = create_inference_input(
        bucket=data_bucket,
        stores=[f'STORE_{i:03d}' for i in range(1, 11)],
        products=[f'PROD_{i:04d}' for i in range(1, 51)],
        forecast_dates=forecast_dates
    )

    # バッチ推論実行
    output_path = f's3://{model_bucket}/batch-inference/output/{datetime.now().strftime("%Y%m%d")}/'

    transformer = run_batch_transform(
        model_name=model_name,
        input_path=input_path,
        output_path=output_path
    )

    print(f"Batch transform completed. Output: {output_path}")
```

---

## 8. トラブルシューティング演習

### 演習8-1: モデル精度の劣化

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-1                      │
│                  モデル精度の劣化                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  本番稼働後3ヶ月で、予測精度が徐々に低下している。              │
│  MAPEが当初15%だったが、現在は25%まで悪化。                     │
│                                                                  │
│  【観測データ】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  時期        │ MAPE  │ 特記事項                            ││
│  ├─────────────┼───────┼─────────────────────────────────────┤│
│  │  1ヶ月目    │ 15%   │ 正常                                ││
│  │  2ヶ月目    │ 18%   │ 新商品50品追加                      ││
│  │  3ヶ月目    │ 25%   │ 夏季セール開始                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. 精度劣化の原因を分析してください                             │
│  2. データドリフト検出の仕組みを設計してください                 │
│  3. モデル再学習の自動化を提案してください                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 演習8-2: 推論エンドポイントのレイテンシ問題

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-2                      │
│              推論レイテンシの問題                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  リアルタイム推論エンドポイントのレイテンシが                    │
│  SLO（500ms）を超えるケースが増加している。                     │
│                                                                  │
│  【メトリクス】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ・平均レイテンシ: 300ms                                    ││
│  │  ・P99レイテンシ: 1200ms                                    ││
│  │  ・モデル読み込み時間: 800ms                                ││
│  │  ・コールドスタート発生率: 15%                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. レイテンシ問題の根本原因を特定してください                   │
│  2. コールドスタート対策を提案してください                       │
│  3. Serverless Inferenceの適用を検討してください                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 設計課題

### 設計課題9-1: マルチモデル戦略

```
┌─────────────────────────────────────────────────────────────────┐
│                      設計課題 9-1                                │
│                 マルチモデル戦略                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【課題】                                                        │
│  商品カテゴリごとに異なるモデルを使い分ける                      │
│  マルチモデル戦略を設計してください。                            │
│                                                                  │
│  【要件】                                                        │
│  ・飲料/食品/日用品/菓子で異なるモデル                          │
│  ・各モデルは独立して更新可能                                    │
│  ・推論時にカテゴリに応じて適切なモデルを選択                    │
│  ・コスト効率の良いエンドポイント設計                            │
│                                                                  │
│  【成果物】                                                      │
│  1. マルチモデルエンドポイントの設計                             │
│  2. モデルルーティングロジック                                   │
│  3. CloudFormationテンプレート                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 設計課題9-2: A/Bテスト基盤

```
┌─────────────────────────────────────────────────────────────────┐
│                      設計課題 9-2                                │
│                   A/Bテスト基盤                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【課題】                                                        │
│  新しいモデルバージョンを安全にデプロイするための                │
│  A/Bテスト基盤を設計してください。                               │
│                                                                  │
│  【要件】                                                        │
│  ・トラフィックの10%を新モデルに振り分け                        │
│  ・モデル間の精度比較を自動化                                    │
│  ・問題発生時の自動ロールバック                                  │
│  ・統計的有意性の判定                                            │
│                                                                  │
│  【成果物】                                                      │
│  1. A/Bテストアーキテクチャ図                                    │
│  2. トラフィック分割設定                                         │
│  3. 評価ダッシュボード設計                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. 発展課題

### 発展課題10-1: Feature Store の活用

```
┌─────────────────────────────────────────────────────────────────┐
│                      発展課題 10-1                               │
│                 Feature Store の活用                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【シナリオ】                                                    │
│  特徴量の管理と再利用を効率化するため、                          │
│  SageMaker Feature Storeを導入したい。                           │
│                                                                  │
│  【技術要件】                                                    │
│  ・オフラインストア（学習用）とオンラインストア（推論用）       │
│  ・特徴量のバージョン管理                                        │
│  ・リアルタイム特徴量取得（<10ms）                              │
│  ・特徴量の共有と再利用                                          │
│                                                                  │
│  【成果物】                                                      │
│  1. Feature Group設計                                            │
│  2. 特徴量パイプライン                                           │
│  3. CloudFormationテンプレート                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. 学習のまとめ

### 学習チェックリスト

```
┌─────────────────────────────────────────────────────────────────┐
│                     学習チェックリスト                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【SageMaker基礎】                                               │
│  □ SageMaker Studioの環境構築ができる                           │
│  □ Processing Jobでデータ前処理ができる                         │
│  □ Training Jobでモデル訓練ができる                             │
│  □ Batch Transformでバッチ推論ができる                          │
│                                                                  │
│  【モデル開発】                                                  │
│  □ 組み込みアルゴリズム（XGBoost等）を使用できる                │
│  □ ハイパーパラメータチューニングができる                       │
│  □ モデル評価指標を適切に選択できる                             │
│  □ Model Registryを活用できる                                   │
│                                                                  │
│  【デプロイ】                                                    │
│  □ リアルタイムエンドポイントを構築できる                       │
│  □ Auto Scalingを設定できる                                     │
│  □ Data Captureを設定できる                                     │
│  □ A/Bテスト環境を構築できる                                    │
│                                                                  │
│  【CloudFormation】                                              │
│  □ SageMaker Domainを構築できる                                 │
│  □ IAMロールを適切に設計できる                                  │
│  □ VPCエンドポイントを設定できる                                │
│  □ エンドポイントをIaCで管理できる                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. コスト見積もり

### 想定コスト（月額）

```
┌─────────────────────────────────────────────────────────────────┐
│                      コスト見積もり                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【開発環境】                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                    │ 数量            │ 月額（USD）    ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  SageMaker Studio        │ 40時間/月       │ $12            ││
│  │  Training Job (m5.xl)    │ 10時間/月       │ $2.30          ││
│  │  Processing Job          │ 5時間/月        │ $1.15          ││
│  │  S3 Storage              │ 50GB            │ $1.15          ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $17         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【本番環境想定】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                    │ 数量            │ 月額（USD）    ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  Endpoint (ml.m5.large)  │ 2台 × 24h       │ $210           ││
│  │  Batch Transform (週次)  │ 4回 × 2時間     │ $18            ││
│  │  Training Job (週次)     │ 4回 × 3時間     │ $28            ││
│  │  S3 Storage              │ 500GB           │ $11.50         ││
│  │  CloudWatch              │ ログ・メトリクス│ $15            ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $283        ││
│  │                          │                 │ (約 ¥42,000)   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【コスト最適化のポイント】                                      │
│  ・Spot Instancesの活用（Training: 最大90%削減）                │
│  ・Serverless Inferenceの検討（低トラフィック時）                │
│  ・適切なインスタンスサイズ選定                                  │
│  ・不要なリソースの自動停止                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## リソースのクリーンアップ

```bash
# エンドポイント削除
aws sagemaker delete-endpoint \
  --endpoint-name smartretail-demand-forecast-dev

aws sagemaker delete-endpoint-config \
  --endpoint-config-name smartretail-demand-forecast-config-dev

aws sagemaker delete-model \
  --model-name smartretail-demand-forecast-dev

# CloudFormationスタック削除
aws cloudformation delete-stack --stack-name smartretail-sagemaker-domain-dev
aws cloudformation delete-stack --stack-name smartretail-storage-iam-dev
aws cloudformation delete-stack --stack-name smartretail-network-dev

# S3バケット削除（中身がある場合は先に空にする）
aws s3 rb s3://smartretail-ml-data-dev-${ACCOUNT_ID} --force
aws s3 rb s3://smartretail-ml-models-dev-${ACCOUNT_ID} --force

echo "Cleanup completed!"
```

---

**次の課題**: [課題37: CreditAI MLOpsパイプライン](exercise-37.md)

**前の課題**: [課題35: ShopNow Chaos Engineering](exercise-35.md)
