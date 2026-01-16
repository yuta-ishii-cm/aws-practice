# AWS学習ロードマップ（40問・難易度順）

GCP経験者向けのAWS実践演習。初級から統合課題まで段階的にスキルアップできる構成です。

## 全体概要

| フェーズ | 問題数 | 推定学習時間 | 対象レベル |
|----------|--------|--------------|------------|
| フェーズ1: 基礎固め | 8問 | 12〜20時間 | 初級 |
| フェーズ2: 実践力養成 | 17問 | 51〜102時間 | 初級〜中級 |
| フェーズ3: 高度な実装 | 12問 | 48〜96時間 | 中級 |
| フェーズ4: 実践統合 | 3問 | 3〜9日 | 中級〜上級 |
| **合計** | **40問** | **約120〜230時間** | - |

---

## フェーズ1: 基礎固め（初級）【8問】

AWSの基本サービスとサーバーレスアーキテクチャの基礎を学びます。

| # | ファイル | タイトル | カテゴリ | 所要時間 | 主要サービス |
|---|----------|----------|----------|----------|--------------|
| 1 | [exercise-01.md](exercise-01.md) | CloudShop - サーバーレスECサイト | サーバーレス基礎 | 1.5〜2h | Lambda, API Gateway, DynamoDB |
| 2 | [exercise-02.md](exercise-02.md) | CostWatch - コスト最適化 | コスト管理 | 1.5〜2h | Cost Explorer, Budgets, Lambda |
| 3 | [exercise-03.md](exercise-03.md) | EventHub - イベント駆動アーキテクチャ | イベント駆動 | 2〜3h | EventBridge, SQS, SNS, Lambda |
| 4 | [exercise-04.md](exercise-04.md) | TalkBot - AIチャットボット | AI入門 | 2〜3h | Lex, Bedrock, Lambda |
| 5 | [exercise-05.md](exercise-05.md) | DocuMind - 生成AIドキュメント処理 | 生成AI | 2〜3h | Bedrock, Textract, Comprehend |
| 6 | [exercise-06.md](exercise-06.md) | VisualSearch - 画像認識検索 | 画像AI | 2〜3h | Rekognition, OpenSearch, Lambda |
| 7 | [exercise-07.md](exercise-07.md) | CodeAssist - AIコード支援 | 開発支援AI | 1.5〜2h | Bedrock, CodeWhisperer, Lambda |
| 8 | [exercise-08.md](exercise-08.md) | DevBoost - Organizations Landing Zone | マルチアカウント | 2〜3h | Organizations, Control Tower |

---

## フェーズ2: 実践力養成（初級〜中級）【17問】

本格的なアプリケーション構築とAIの実践的な活用パターンを学びます。

### 2-1. サーバーレス・API応用（2問）

| # | ファイル | タイトル | 所要時間 | 主要サービス |
|---|----------|----------|----------|--------------|
| 9 | [exercise-09.md](exercise-09.md) | SecureBank - セキュアAPI基盤 | 3〜4h | API Gateway, WAF, Secrets Manager |
| 10 | [exercise-10.md](exercise-10.md) | GlobalCDN - グローバルコンテンツ配信 | 3〜4h | CloudFront, Lambda@Edge, Route 53 |

### 2-2. 非同期・バッチ処理（3問）

| # | ファイル | タイトル | 所要時間 | 主要サービス |
|---|----------|----------|----------|--------------|
| 11 | [exercise-11.md](exercise-11.md) | MediaFlow - 画像・動画変換パイプライン | 3〜4h | Step Functions, MediaConvert, S3 |
| 12 | [exercise-12.md](exercise-12.md) | BatchMaster - 大規模バッチ処理 | 4〜5h | AWS Batch, Step Functions |
| 13 | [exercise-13.md](exercise-13.md) | PayEasy - Step Functionsワークフロー | 4〜6h | Step Functions, Lambda, CDK |

### 2-3. データ処理・分析（3問）

| # | ファイル | タイトル | 所要時間 | 主要サービス |
|---|----------|----------|----------|--------------|
| 14 | [exercise-14.md](exercise-14.md) | DataLake - データレイク構築 | 4〜5h | S3, Glue, Athena, QuickSight |
| 15 | [exercise-15.md](exercise-15.md) | LogWatch - ログ分析プラットフォーム | 3〜4h | CloudWatch, Kinesis, OpenSearch |
| 16 | [exercise-16.md](exercise-16.md) | MegaMart - DynamoDB実践設計 | 4〜6h | DynamoDB, DAX, CloudFormation |

### 2-4. 生成AI応用（6問）

| # | ファイル | タイトル | 所要時間 | 主要サービス |
|---|----------|----------|----------|--------------|
| 17 | [exercise-17.md](exercise-17.md) | VoiceAssist - 音声AIアシスタント | 3〜4h | Transcribe, Polly, Bedrock, Lex |
| 18 | [exercise-18.md](exercise-18.md) | RAGChat - RAGチャットボット | 4〜5h | Bedrock, OpenSearch Serverless, Kendra |
| 19 | [exercise-19.md](exercise-19.md) | ContractAI - 契約書AI分析 | 3〜4h | Textract, Comprehend, Bedrock |
| 20 | [exercise-20.md](exercise-20.md) | AIWorkflow - マルチモーダルAI処理 | 4〜5h | Bedrock, Step Functions, Rekognition |
| 21 | [exercise-21.md](exercise-21.md) | RealtimeAI - リアルタイムAI分析 | 4〜5h | Kinesis, Bedrock, Lambda |
| 22 | [exercise-22.md](exercise-22.md) | PersonalizeAI - AIパーソナライゼーション | 4〜5h | Personalize, Bedrock, DynamoDB |

### 2-5. コンテナ・認証基礎（3問）

| # | ファイル | タイトル | 所要時間 | 主要サービス |
|---|----------|----------|----------|--------------|
| 23 | [exercise-23.md](exercise-23.md) | ContainerApp - コンテナ化Webアプリ | 3〜4h | ECS, Fargate, ALB, ECR |
| 24 | [exercise-24.md](exercise-24.md) | MedConnect - Cognito認証基盤 | 3〜4h | Cognito, API Gateway, Lambda |
| 25 | [exercise-25.md](exercise-25.md) | TechCorp - IAM Identity Center | 3〜4h | IAM Identity Center, Organizations |

---

## フェーズ3: 高度な実装（中級）【12問】

IaC、CI/CD、セキュリティ、MLOpsなど高度なトピックを学びます。

### 3-1. IaC・DevOps（3問）

| # | ファイル | タイトル | 所要時間 | 主要サービス |
|---|----------|----------|----------|--------------|
| 26 | [exercise-26.md](exercise-26.md) | DevOps Pipeline - CI/CDパイプライン | 4〜6h | CodePipeline, CodeBuild, CodeDeploy |
| 27 | [exercise-27.md](exercise-27.md) | DisasterGuard - DR/バックアップ | 4〜6h | AWS Backup, DRS, Route 53 |
| 28 | [exercise-28.md](exercise-28.md) | TaskFlow - マルチリージョン構成 | 5〜7h | Route 53, DynamoDB Global Tables, CDK |

### 3-2. セキュリティ・コンプライアンス（2問）

| # | ファイル | タイトル | 所要時間 | 主要サービス |
|---|----------|----------|----------|--------------|
| 29 | [exercise-29.md](exercise-29.md) | ComplianceHub - コンプライアンス自動化 | 4〜6h | Config, Security Hub, GuardDuty |
| 30 | [exercise-30.md](exercise-30.md) | ShopNow - Chaos Engineering | 4〜6h | AWS FIS, CloudWatch, Terraform |

### 3-3. 認証・認可応用（2問）

| # | ファイル | タイトル | 所要時間 | 主要サービス |
|---|----------|----------|----------|--------------|
| 31 | [exercise-31.md](exercise-31.md) | ServerlessSaaS - サーバーレスSaaS | 5〜7h | AppSync, Cognito, DynamoDB |
| 32 | [exercise-32.md](exercise-32.md) | TeamHub - マルチテナントSaaS認証 | 5〜7h | Cognito, Lambda Authorizer, CDK |

### 3-4. IoT（2問）

| # | ファイル | タイトル | 所要時間 | 主要サービス |
|---|----------|----------|----------|--------------|
| 33 | [exercise-33.md](exercise-33.md) | SmartHome - IoTデバイス管理 | 4〜5h | IoT Core, Timestream, Lambda |
| 34 | [exercise-34.md](exercise-34.md) | EdgeFactory - エッジコンピューティング | 4〜6h | IoT Greengrass, SageMaker Edge |

### 3-5. ML/MLOps（3問）

| # | ファイル | タイトル | 所要時間 | 主要サービス |
|---|----------|----------|----------|--------------|
| 35 | [exercise-35.md](exercise-35.md) | MLServe - 機械学習推論基盤 | 4〜5h | SageMaker Endpoints, Lambda |
| 36 | [exercise-36.md](exercise-36.md) | SmartRetail - SageMakerモデル基盤 | 5〜7h | SageMaker Studio, Training, Batch |
| 37 | [exercise-37.md](exercise-37.md) | CreditAI - MLOpsパイプライン | 6〜8h | SageMaker Pipelines, Model Registry |

---

## フェーズ4: 実践統合（中級〜上級）【3問】

複数の技術領域を統合した本格的なアーキテクチャを構築します。

| # | ファイル | タイトル | 所要時間 | 主要サービス |
|---|----------|----------|----------|--------------|
| 38 | [exercise-38.md](exercise-38.md) | MicroServices - マイクロサービス | 1〜2日 | EKS, App Mesh, X-Ray |
| 39 | [exercise-39.md](exercise-39.md) | HybridConnect - ハイブリッドネットワーク | 1〜2日 | Transit Gateway, Direct Connect, VPN |
| 40 | [exercise-40.md](exercise-40.md) | MultiAgentAI - マルチエージェントAI | 1〜3日 | Bedrock Agents, Step Functions |

---

## 学習パス早見表

```
フェーズ1: 基礎固め（初級）
┌─────────────────────────────────────────────────────────────────────────────┐
│  1.CloudShop → 2.CostWatch → 3.EventHub → 4.TalkBot                        │
│      │                                        │                             │
│      ▼                                        ▼                             │
│  5.DocuMind → 6.VisualSearch → 7.CodeAssist → 8.DevBoost                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
フェーズ2: 実践力養成（初級〜中級）
┌─────────────────────────────────────────────────────────────────────────────┐
│  サーバーレス応用        非同期・バッチ           データ分析                   │
│  9.SecureBank          11.MediaFlow            14.DataLake                  │
│  10.GlobalCDN          12.BatchMaster          15.LogWatch                  │
│                        13.PayEasy              16.MegaMart                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  生成AI応用                                    コンテナ・認証基礎             │
│  17.VoiceAssist → 18.RAGChat → 19.ContractAI  23.ContainerApp              │
│  20.AIWorkflow → 21.RealtimeAI → 22.Personalize 24.MedConnect              │
│                                                25.TechCorp                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
フェーズ3: 高度な実装（中級）
┌─────────────────────────────────────────────────────────────────────────────┐
│  IaC・DevOps             セキュリティ           認証・認可応用                 │
│  26.CI/CD Pipeline       29.ComplianceHub      31.ServerlessSaaS            │
│  27.DisasterGuard        30.Chaos Eng          32.TeamHub                   │
│  28.TaskFlow                                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│  IoT                     ML/MLOps                                           │
│  33.SmartHome            35.MLServe                                         │
│  34.EdgeFactory          36.SmartRetail                                     │
│                          37.CreditAI                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
フェーズ4: 実践統合（中級〜上級）
┌─────────────────────────────────────────────────────────────────────────────┐
│  38.MicroServices → 39.HybridConnect → 40.MultiAgentAI                     │
│  (EKS+メッシュ)      (ハイブリッドNW)    (AIエージェント)                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 新旧課題番号 対応表

| 新番号 | 旧番号 | タイトル |
|--------|--------|----------|
| 1 | 1 | CloudShop - サーバーレスECサイト |
| 2 | 16 | CostWatch - コスト最適化 |
| 3 | 11 | EventHub - イベント駆動アーキテクチャ |
| 4 | 6 | TalkBot - AIチャットボット |
| 5 | 21 | DocuMind - 生成AIドキュメント処理 |
| 6 | 22 | VisualSearch - 画像認識検索 |
| 7 | 28 | CodeAssist - AIコード支援 |
| 8 | 31 | DevBoost - Organizations Landing Zone |
| 9 | 5 | SecureBank - セキュアAPI基盤 |
| 10 | 10 | GlobalCDN - グローバルコンテンツ配信 |
| 11 | 2 | MediaFlow - 画像・動画変換パイプライン |
| 12 | 12 | BatchMaster - 大規模バッチ処理 |
| 13 | 34 | PayEasy - Step Functionsワークフロー |
| 14 | 3 | DataLake - データレイク構築 |
| 15 | 4 | LogWatch - ログ分析プラットフォーム |
| 16 | 33 | MegaMart - DynamoDB実践設計 |
| 17 | 23 | VoiceAssist - 音声AIアシスタント |
| 18 | 24 | RAGChat - RAGチャットボット |
| 19 | 27 | ContractAI - 契約書AI分析 |
| 20 | 25 | AIWorkflow - マルチモーダルAI処理 |
| 21 | 26 | RealtimeAI - リアルタイムAI分析 |
| 22 | 29 | PersonalizeAI - AIパーソナライゼーション |
| 23 | 8 | ContainerApp - コンテナ化Webアプリ |
| 24 | 38 | MedConnect - Cognito認証基盤 |
| 25 | 40 | TechCorp - IAM Identity Center |
| 26 | 14 | DevOps Pipeline - CI/CDパイプライン |
| 27 | 15 | DisasterGuard - DR/バックアップ |
| 28 | 32 | TaskFlow - マルチリージョン構成 |
| 29 | 17 | ComplianceHub - コンプライアンス自動化 |
| 30 | 35 | ShopNow - Chaos Engineering |
| 31 | 19 | ServerlessSaaS - サーバーレスSaaS |
| 32 | 39 | TeamHub - マルチテナントSaaS認証 |
| 33 | 7 | SmartHome - IoTデバイス管理 |
| 34 | 20 | EdgeFactory - エッジコンピューティング |
| 35 | 9 | MLServe - 機械学習推論基盤 |
| 36 | 36 | SmartRetail - SageMakerモデル基盤 |
| 37 | 37 | CreditAI - MLOpsパイプライン |
| 38 | 13 | MicroServices - マイクロサービス |
| 39 | 18 | HybridConnect - ハイブリッドネットワーク |
| 40 | 30 | MultiAgentAI - マルチエージェントAI |

---

## 推奨学習スケジュール

| 期間 | フェーズ | 問題数 | 1日2時間の場合 | 1日4時間の場合 |
|------|----------|--------|----------------|----------------|
| 第1-2週 | フェーズ1 | 8問 | 2週間 | 1週間 |
| 第3-8週 | フェーズ2 | 17問 | 6週間 | 3週間 |
| 第9-14週 | フェーズ3 | 12問 | 6週間 | 3週間 |
| 第15-17週 | フェーズ4 | 3問 | 3週間 | 1.5週間 |
| **合計** | - | **40問** | **約4ヶ月** | **約2ヶ月** |

---

## 学習のコツ

1. **順番通りに進める** - 前の課題の知識が次の課題で活きます
2. **手を動かす** - 読むだけでなく実際にAWS環境で構築しましょう
3. **トラブルシューティング** - エラーが出ても諦めず、原因を調査する力をつけましょう
4. **コスト管理** - 課題2で学んだコスト意識を常に持ちましょう
5. **復習** - 各フェーズ終了時に振り返りチェックリストを確認しましょう
