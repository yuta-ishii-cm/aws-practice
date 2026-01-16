# 課題13: PayEasy Step Functionsワークフロー - 決済処理オーケストレーション

## 1. 課題の分類

| 項目 | 内容 |
|------|------|
| **カテゴリ** | サーバーレス / ワークフロー |
| **難易度** | 中級（Intermediate） |
| **所要時間** | 5-6時間 |
| **使用IaCツール** | AWS CDK (TypeScript) |
| **前提スキル** | Lambda基礎、AWS基礎、状態機械の概念 |

---

## 2. ビジネスシナリオ

### 企業プロファイル: PayEasy株式会社

```
┌─────────────────────────────────────────────────────────────────┐
│                     PayEasy株式会社                              │
│                    決済代行サービス                              │
├─────────────────────────────────────────────────────────────────┤
│  設立: 2019年    従業員: 80名    本社: 東京                      │
│  事業: EC事業者向け決済代行、サブスクリプション決済             │
│  取引額: 月間50億円    加盟店: 2000社    API: 1日500万リクエスト │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【決済処理の現状】                                              │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐    ││
│  │    │認証 │───►│与信 │───►│決済 │───►│通知 │───►│記録 │    ││
│  │    └─────┘    └─────┘    └─────┘    └─────┘    └─────┘    ││
│  │       │          │          │          │          │        ││
│  │       ▼          ▼          ▼          ▼          ▼        ││
│  │    [複雑な条件分岐とリトライ処理がコード内に散在]            ││
│  │                                                              ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【現在の課題】                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  ・決済フローが複雑化し、コードの可読性が低下               ││
│  │  ・エラー発生時の状態把握が困難                             ││
│  │  ・リトライ・補償処理のロジックが複雑                       ││
│  │  ・処理時間の長い決済でLambdaタイムアウト発生               ││
│  │  ・監査対応のための処理追跡が困難                           ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【目指す姿】                                                    │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                   Step Functions                             ││
│  │  ┌─────────────────────────────────────────────────────┐    ││
│  │  │  ┌────┐   ┌────┐   ┌────┐   ┌────┐   ┌────┐       │    ││
│  │  │  │認証│──►│与信│──►│決済│──►│通知│──►│完了│       │    ││
│  │  │  └────┘   └──┬─┘   └──┬─┘   └────┘   └────┘       │    ││
│  │  │              │        │                            │    ││
│  │  │         ┌────▼────┐  ┌▼───────────┐               │    ││
│  │  │         │与信失敗 │  │決済失敗    │               │    ││
│  │  │         │→拒否通知│  │→ロールバック│               │    ││
│  │  │         └─────────┘  └────────────┘               │    ││
│  │  └─────────────────────────────────────────────────────┘    ││
│  │                                                              ││
│  │  ・視覚的なワークフロー管理                                 ││
│  │  ・組み込みのエラーハンドリング                             ││
│  │  ・実行履歴の自動記録                                       ││
│  │  ・長時間処理のサポート（最大1年）                          ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 決済フロー要件

```
┌─────────────────────────────────────────────────────────────────┐
│                      決済フロー詳細                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【クレジットカード決済フロー】                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  1. 決済リクエスト受付                                       ││
│  │     ├── リクエスト検証                                       ││
│  │     └── 重複チェック（べき等性）                             ││
│  │                                                              ││
│  │  2. カード認証 (3Dセキュア)                                  ││
│  │     ├── 3DS必要判定                                          ││
│  │     ├── 認証リクエスト送信                                   ││
│  │     └── 認証結果待機（コールバック）                         ││
│  │                                                              ││
│  │  3. 与信確保                                                 ││
│  │     ├── カード会社API呼び出し                                ││
│  │     ├── 与信枠確認                                           ││
│  │     └── 与信番号取得                                         ││
│  │                                                              ││
│  │  4. 決済実行                                                 ││
│  │     ├── 売上確定処理                                         ││
│  │     └── 決済番号発行                                         ││
│  │                                                              ││
│  │  5. 後処理                                                   ││
│  │     ├── 加盟店への通知                                       ││
│  │     ├── 購入者への通知                                       ││
│  │     └── 取引記録保存                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【エラーパターンと処理】                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  エラー種別        │ 処理方針                │ リトライ      ││
│  ├────────────────────┼─────────────────────────┼───────────────┤│
│  │  カード認証失敗    │ 拒否通知→終了          │ なし          ││
│  │  与信失敗          │ 拒否通知→終了          │ なし          ││
│  │  与信タイムアウト  │ 再試行                  │ 3回まで       ││
│  │  決済失敗          │ 与信取消→拒否通知      │ なし          ││
│  │  決済タイムアウト  │ 状態確認→判断          │ 確認3回       ││
│  │  通知失敗          │ キュー→再送            │ 5回まで       ││
│  │  システムエラー    │ アラート→手動対応      │ 要確認        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ビジネス要件と KPI

```
┌─────────────────────────────────────────────────────────────────┐
│                    プロジェクト KPI                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【パフォーマンス目標】                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  指標              │ 現状        │ 目標        │ 改善      ││
│  ├────────────────────┼─────────────┼─────────────┼───────────┤│
│  │  決済完了時間      │ 8秒         │ 3秒         │ 62%↓     ││
│  │  決済成功率        │ 97%         │ 99%         │ 2%↑      ││
│  │  エラー検知時間    │ 30分        │ 1分         │ 96%↓     ││
│  │  障害復旧時間      │ 2時間       │ 15分        │ 87%↓     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【運用目標】                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  指標              │ 現状        │ 目標        │ 改善      ││
│  ├────────────────────┼─────────────┼─────────────┼───────────┤│
│  │  コード行数        │ 5000行      │ 2000行      │ 60%↓     ││
│  │  デプロイ時間      │ 30分        │ 5分         │ 83%↓     ││
│  │  監査対応工数      │ 20時間/月   │ 2時間/月    │ 90%↓     ││
│  │  新機能追加工数    │ 2週間       │ 3日         │ 78%↓     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【処理量】                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ・1日あたり決済件数: 50万件                                 ││
│  │  ・ピーク時: 1000件/秒                                       ││
│  │  ・平均決済金額: 5,000円                                     ││
│  │  ・3Dセキュア対象: 30%                                       ││
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
│  │  1. Step Functions 基礎                                      ││
│  │     ├── Amazon States Language (ASL) 構文                    ││
│  │     ├── Standard vs Express ワークフロー                     ││
│  │     ├── 各種ステート（Task, Choice, Parallel, Map等）        ││
│  │     └── 入出力処理（InputPath, OutputPath, ResultPath）      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  2. エラーハンドリング                                       ││
│  │     ├── Retry設定（指数バックオフ）                          ││
│  │     ├── Catch設定（エラー分岐）                              ││
│  │     ├── 補償トランザクション（Saga パターン）                ││
│  │     └── タイムアウト設定                                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  3. 高度なパターン                                           ││
│  │     ├── コールバックパターン（waitForTaskToken）             ││
│  │     ├── 並列処理（Parallel, Map）                            ││
│  │     ├── 動的並列処理（Distributed Map）                      ││
│  │     └── ネストされたワークフロー                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  4. CDKによるStep Functions構築                              ││
│  │     ├── StepFunctions Constructs                             ││
│  │     ├── Lambda統合                                           ││
│  │     ├── 他AWSサービス統合                                    ││
│  │     └── テスト戦略                                           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【副次スキル】                                                  │
│  ・イベント駆動アーキテクチャ                                    │
│  ・CloudWatch Logs Insights でのデバッグ                        │
│  ・X-Ray による分散トレーシング                                 │
│  ・コスト最適化                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### GCPとの対応関係

| AWS サービス | GCP 対応サービス | 主な違い |
|-------------|-----------------|---------|
| Step Functions | Cloud Workflows | Step FunctionsはASL、WorkflowsはYAML |
| Step Functions Express | Cloud Run Jobs | 短時間実行の高スループット |
| EventBridge | Eventarc | イベントルーティング |
| X-Ray | Cloud Trace | 分散トレーシング |

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
│  │  Step Functions    │ ワークフロー管理        │ ★★★★★      ││
│  │  Lambda            │ 各処理ステップ実行      │ ★★★★★      ││
│  │  API Gateway       │ 決済API受付             │ ★★★★☆      ││
│  │  DynamoDB          │ 取引データ保存          │ ★★★★☆      ││
│  │  CDK               │ インフラ定義            │ ★★★★★      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【支援サービス】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  サービス          │ 用途                    │ 重要度      ││
│  ├────────────────────┼─────────────────────────┼─────────────┤│
│  │  SQS               │ 非同期通知キュー        │ ★★★☆☆      ││
│  │  SNS               │ 通知配信                │ ★★★☆☆      ││
│  │  Secrets Manager   │ 認証情報管理            │ ★★★★☆      ││
│  │  CloudWatch        │ 監視・アラート          │ ★★★★☆      ││
│  │  X-Ray             │ 分散トレーシング        │ ★★★☆☆      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 前提条件と事前準備

### 必要な環境

```bash
# Node.js バージョン確認
node --version
# v18.x 以上

# AWS CDK バージョン確認
cdk --version
# 2.x 以上

# AWS CLI バージョン確認
aws --version
# aws-cli/2.x.x 以上

# TypeScript
npm list typescript
```

### AWS環境の準備

```bash
# 環境変数設定
export AWS_REGION=ap-northeast-1
export PROJECT_NAME=payeasy
export ENVIRONMENT=dev

# プロジェクトディレクトリ作成
mkdir -p ~/payeasy-stepfunctions
cd ~/payeasy-stepfunctions

# CDKプロジェクト初期化
cdk init app --language typescript

# 必要なパッケージインストール
npm install @aws-cdk/aws-stepfunctions @aws-cdk/aws-stepfunctions-tasks \
            @aws-cdk/aws-lambda @aws-cdk/aws-lambda-nodejs \
            @aws-cdk/aws-dynamodb @aws-cdk/aws-apigateway \
            @aws-cdk/aws-sqs @aws-cdk/aws-sns @aws-cdk/aws-sns-subscriptions \
            @aws-cdk/aws-secretsmanager @aws-cdk/aws-logs \
            esbuild
```

### IAMポリシー（必要な権限）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "states:*",
        "lambda:*",
        "dynamodb:*",
        "apigateway:*",
        "sqs:*",
        "sns:*",
        "secretsmanager:*",
        "logs:*",
        "xray:*",
        "cloudformation:*",
        "iam:*",
        "s3:*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 6. アーキテクチャ設計

### 決済ワークフロー全体像

```
┌─────────────────────────────────────────────────────────────────┐
│                  PayEasy 決済ワークフロー                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐                                                │
│  │ EC加盟店    │                                                │
│  │   API      │                                                │
│  └──────┬──────┘                                                │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐    ┌──────────────────────────────────────┐   │
│  │API Gateway  │───►│         Step Functions               │   │
│  │  (REST)     │    │      PaymentWorkflow                 │   │
│  └─────────────┘    │                                      │   │
│                     │  ┌────────────────────────────────┐  │   │
│                     │  │      ValidateRequest           │  │   │
│                     │  │   (リクエスト検証・重複チェック)│  │   │
│                     │  └──────────────┬─────────────────┘  │   │
│                     │                 │                     │   │
│                     │                 ▼                     │   │
│                     │  ┌────────────────────────────────┐  │   │
│                     │  │    Check3DSRequired (Choice)   │  │   │
│                     │  └──────┬───────────────┬─────────┘  │   │
│                     │         │               │             │   │
│                     │    [3DS必要]       [3DS不要]         │   │
│                     │         │               │             │   │
│                     │         ▼               │             │   │
│                     │  ┌──────────────┐      │             │   │
│                     │  │ Request3DS   │      │             │   │
│                     │  │(コールバック待機)│    │             │   │
│                     │  └──────┬───────┘      │             │   │
│                     │         │               │             │   │
│                     │         ▼               ▼             │   │
│                     │  ┌────────────────────────────────┐  │   │
│                     │  │       AuthorizePayment         │  │   │
│                     │  │         (与信確保)             │  │   │
│                     │  └──────────────┬─────────────────┘  │   │
│                     │                 │                     │   │
│                     │            [成功/失敗]                │   │
│                     │                 │                     │   │
│                     │  ┌──────────────┴─────────────────┐  │   │
│                     │  │         CapturePayment         │  │   │
│                     │  │          (売上確定)            │  │   │
│                     │  └──────────────┬─────────────────┘  │   │
│                     │                 │                     │   │
│                     │                 ▼                     │   │
│                     │  ┌────────────────────────────────┐  │   │
│                     │  │      SendNotifications         │  │   │
│                     │  │  (Parallel: 加盟店/購入者通知) │  │   │
│                     │  └──────────────┬─────────────────┘  │   │
│                     │                 │                     │   │
│                     │                 ▼                     │   │
│                     │  ┌────────────────────────────────┐  │   │
│                     │  │        SaveTransaction         │  │   │
│                     │  │         (取引記録保存)         │  │   │
│                     │  └────────────────────────────────┘  │   │
│                     │                                      │   │
│                     └──────────────────────────────────────┘   │
│                                                                  │
│  【エラー処理フロー】                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  各ステップで Catch → ErrorHandler → 補償処理/通知        │  │
│  │  ・与信失敗 → 拒否通知                                    │  │
│  │  ・決済失敗 → 与信取消 → 拒否通知                         │  │
│  │  ・通知失敗 → SQS → リトライ                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ステートマシン詳細設計

```
┌─────────────────────────────────────────────────────────────────┐
│              Amazon States Language (ASL) 設計                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【ステート一覧】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ステート名          │ タイプ   │ 説明                     ││
│  ├──────────────────────┼──────────┼──────────────────────────┤│
│  │  ValidateRequest     │ Task     │ 入力検証・重複チェック   ││
│  │  Check3DSRequired    │ Choice   │ 3DS認証要否判定          ││
│  │  Request3DS          │ Task     │ 3DS認証リクエスト        ││
│  │  Wait3DSCallback     │ Task     │ コールバック待機         ││
│  │  Validate3DSResult   │ Choice   │ 3DS結果判定              ││
│  │  AuthorizePayment    │ Task     │ 与信確保                 ││
│  │  CheckAuthResult     │ Choice   │ 与信結果判定             ││
│  │  CapturePayment      │ Task     │ 売上確定                 ││
│  │  SendNotifications   │ Parallel │ 通知送信（並列）         ││
│  │  SaveTransaction     │ Task     │ 取引記録保存             ││
│  │  PaymentSuccess      │ Succeed  │ 正常終了                 ││
│  │  HandleAuthFailure   │ Task     │ 与信失敗処理             ││
│  │  HandleCaptureFailure│ Task     │ 決済失敗→与信取消       ││
│  │  HandleError         │ Task     │ 汎用エラー処理           ││
│  │  PaymentFailed       │ Fail     │ 異常終了                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【エラーハンドリング戦略】                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  リトライ対象:                                               ││
│  │  ├── States.TaskFailed (一時的な失敗)                       ││
│  │  ├── States.Timeout (タイムアウト)                          ││
│  │  └── Lambda.ServiceException (サービスエラー)               ││
│  │                                                              ││
│  │  リトライ設定:                                               ││
│  │  ├── MaxAttempts: 3                                         ││
│  │  ├── IntervalSeconds: 1                                     ││
│  │  ├── BackoffRate: 2.0                                       ││
│  │  └── MaxDelaySeconds: 10                                    ││
│  │                                                              ││
│  │  Catch対象:                                                  ││
│  │  ├── AuthorizationError → HandleAuthFailure                 ││
│  │  ├── CaptureError → HandleCaptureFailure                    ││
│  │  └── States.ALL → HandleError                               ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. ハンズオン手順

### Phase 1: CDKプロジェクト構造の作成

#### 1.1 プロジェクト構造

```
payeasy-stepfunctions/
├── bin/
│   └── payeasy.ts
├── lib/
│   ├── constructs/
│   │   ├── payment-workflow.ts      # Step Functionsワークフロー
│   │   ├── payment-lambdas.ts       # Lambda関数群
│   │   ├── payment-api.ts           # API Gateway
│   │   └── payment-storage.ts       # DynamoDB/SQS
│   └── payeasy-stack.ts             # メインスタック
├── lambda/
│   ├── validate-request/
│   │   └── index.ts
│   ├── authorize-payment/
│   │   └── index.ts
│   ├── capture-payment/
│   │   └── index.ts
│   ├── request-3ds/
│   │   └── index.ts
│   ├── send-notification/
│   │   └── index.ts
│   ├── save-transaction/
│   │   └── index.ts
│   └── handle-error/
│       └── index.ts
├── test/
│   └── payment-workflow.test.ts
├── cdk.json
├── package.json
└── tsconfig.json
```

#### 1.2 メインスタック定義

```typescript
// lib/payeasy-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PaymentWorkflow } from './constructs/payment-workflow';
import { PaymentLambdas } from './constructs/payment-lambdas';
import { PaymentApi } from './constructs/payment-api';
import { PaymentStorage } from './constructs/payment-storage';

export interface PayEasyStackProps extends cdk.StackProps {
  environment: string;
}

export class PayEasyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PayEasyStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // ストレージリソース（DynamoDB, SQS）
    const storage = new PaymentStorage(this, 'PaymentStorage', {
      environment,
    });

    // Lambda関数群
    const lambdas = new PaymentLambdas(this, 'PaymentLambdas', {
      environment,
      transactionTable: storage.transactionTable,
      notificationQueue: storage.notificationQueue,
    });

    // Step Functionsワークフロー
    const workflow = new PaymentWorkflow(this, 'PaymentWorkflow', {
      environment,
      lambdas,
    });

    // API Gateway
    const api = new PaymentApi(this, 'PaymentApi', {
      environment,
      stateMachine: workflow.stateMachine,
    });

    // 出力
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.restApi.url,
      description: 'Payment API Endpoint',
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: workflow.stateMachine.stateMachineArn,
      description: 'Payment Workflow State Machine ARN',
    });
  }
}
```

### Phase 2: ストレージリソースの実装

```typescript
// lib/constructs/payment-storage.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface PaymentStorageProps {
  environment: string;
}

export class PaymentStorage extends Construct {
  public readonly transactionTable: dynamodb.Table;
  public readonly notificationQueue: sqs.Queue;
  public readonly notificationDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props: PaymentStorageProps) {
    super(scope, id);

    const { environment } = props;

    // 取引テーブル
    this.transactionTable = new dynamodb.Table(this, 'TransactionTable', {
      tableName: `payeasy-transactions-${environment}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: environment === 'prod',
      },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // GSI: 加盟店別取引検索
    this.transactionTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 通知用デッドレターキュー
    this.notificationDLQ = new sqs.Queue(this, 'NotificationDLQ', {
      queueName: `payeasy-notification-dlq-${environment}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // 通知キュー
    this.notificationQueue = new sqs.Queue(this, 'NotificationQueue', {
      queueName: `payeasy-notification-${environment}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: this.notificationDLQ,
        maxReceiveCount: 5,
      },
    });
  }
}
```

### Phase 3: Lambda関数の実装

#### 3.1 Lambda Constructs

```typescript
// lib/constructs/payment-lambdas.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

export interface PaymentLambdasProps {
  environment: string;
  transactionTable: dynamodb.Table;
  notificationQueue: sqs.Queue;
}

export class PaymentLambdas extends Construct {
  public readonly validateRequest: lambda.Function;
  public readonly authorizePayment: lambda.Function;
  public readonly capturePayment: lambda.Function;
  public readonly request3DS: lambda.Function;
  public readonly sendNotification: lambda.Function;
  public readonly saveTransaction: lambda.Function;
  public readonly handleError: lambda.Function;
  public readonly rollbackAuthorization: lambda.Function;

  constructor(scope: Construct, id: string, props: PaymentLambdasProps) {
    super(scope, id);

    const { environment, transactionTable, notificationQueue } = props;

    // 共通設定
    const commonProps: Partial<lambdaNodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_MONTH,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      environment: {
        ENVIRONMENT: environment,
        TABLE_NAME: transactionTable.tableName,
        NOTIFICATION_QUEUE_URL: notificationQueue.queueUrl,
      },
    };

    // リクエスト検証Lambda
    this.validateRequest = new lambdaNodejs.NodejsFunction(this, 'ValidateRequest', {
      ...commonProps,
      functionName: `payeasy-validate-request-${environment}`,
      entry: path.join(__dirname, '../../lambda/validate-request/index.ts'),
      handler: 'handler',
    });
    transactionTable.grantReadData(this.validateRequest);

    // 与信確保Lambda
    this.authorizePayment = new lambdaNodejs.NodejsFunction(this, 'AuthorizePayment', {
      ...commonProps,
      functionName: `payeasy-authorize-payment-${environment}`,
      entry: path.join(__dirname, '../../lambda/authorize-payment/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
    });

    // 売上確定Lambda
    this.capturePayment = new lambdaNodejs.NodejsFunction(this, 'CapturePayment', {
      ...commonProps,
      functionName: `payeasy-capture-payment-${environment}`,
      entry: path.join(__dirname, '../../lambda/capture-payment/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
    });

    // 3DS認証リクエストLambda
    this.request3DS = new lambdaNodejs.NodejsFunction(this, 'Request3DS', {
      ...commonProps,
      functionName: `payeasy-request-3ds-${environment}`,
      entry: path.join(__dirname, '../../lambda/request-3ds/index.ts'),
      handler: 'handler',
    });

    // 通知送信Lambda
    this.sendNotification = new lambdaNodejs.NodejsFunction(this, 'SendNotification', {
      ...commonProps,
      functionName: `payeasy-send-notification-${environment}`,
      entry: path.join(__dirname, '../../lambda/send-notification/index.ts'),
      handler: 'handler',
    });
    notificationQueue.grantSendMessages(this.sendNotification);

    // 取引記録保存Lambda
    this.saveTransaction = new lambdaNodejs.NodejsFunction(this, 'SaveTransaction', {
      ...commonProps,
      functionName: `payeasy-save-transaction-${environment}`,
      entry: path.join(__dirname, '../../lambda/save-transaction/index.ts'),
      handler: 'handler',
    });
    transactionTable.grantWriteData(this.saveTransaction);

    // エラーハンドリングLambda
    this.handleError = new lambdaNodejs.NodejsFunction(this, 'HandleError', {
      ...commonProps,
      functionName: `payeasy-handle-error-${environment}`,
      entry: path.join(__dirname, '../../lambda/handle-error/index.ts'),
      handler: 'handler',
    });
    transactionTable.grantWriteData(this.handleError);
    notificationQueue.grantSendMessages(this.handleError);

    // 与信取消Lambda（補償トランザクション）
    this.rollbackAuthorization = new lambdaNodejs.NodejsFunction(this, 'RollbackAuthorization', {
      ...commonProps,
      functionName: `payeasy-rollback-auth-${environment}`,
      entry: path.join(__dirname, '../../lambda/rollback-authorization/index.ts'),
      handler: 'handler',
    });
  }
}
```

#### 3.2 Lambda関数実装例

```typescript
// lambda/validate-request/index.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

interface PaymentRequest {
  paymentId: string;
  merchantId: string;
  amount: number;
  currency: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  customerEmail: string;
  customerName: string;
  require3DS?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  isDuplicate: boolean;
  paymentId: string;
  merchantId: string;
  amount: number;
  currency: string;
  maskedCardNumber: string;
  require3DS: boolean;
  customerEmail: string;
  customerName: string;
  validationErrors?: string[];
}

export const handler = async (event: PaymentRequest): Promise<ValidationResult> => {
  console.log('Validating payment request:', JSON.stringify({
    ...event,
    cardNumber: '****',
    cardCvv: '***'
  }));

  const errors: string[] = [];

  // 必須フィールド検証
  if (!event.paymentId) errors.push('paymentId is required');
  if (!event.merchantId) errors.push('merchantId is required');
  if (!event.amount || event.amount <= 0) errors.push('amount must be positive');
  if (!event.currency) errors.push('currency is required');
  if (!event.cardNumber || event.cardNumber.length < 13) errors.push('invalid cardNumber');
  if (!event.customerEmail) errors.push('customerEmail is required');

  // 重複チェック
  const existingTransaction = await checkDuplicate(event.paymentId);

  // 3DS要否判定（金額ベース or 加盟店設定）
  const require3DS = event.require3DS ?? event.amount >= 10000;

  const result: ValidationResult = {
    isValid: errors.length === 0 && !existingTransaction,
    isDuplicate: !!existingTransaction,
    paymentId: event.paymentId,
    merchantId: event.merchantId,
    amount: event.amount,
    currency: event.currency,
    maskedCardNumber: maskCardNumber(event.cardNumber),
    require3DS,
    customerEmail: event.customerEmail,
    customerName: event.customerName,
    validationErrors: errors.length > 0 ? errors : undefined,
  };

  if (!result.isValid) {
    throw new ValidationError(
      result.isDuplicate
        ? 'Duplicate payment request'
        : `Validation failed: ${errors.join(', ')}`
    );
  }

  return result;
};

async function checkDuplicate(paymentId: string): Promise<boolean> {
  const command = new GetCommand({
    TableName: process.env.TABLE_NAME!,
    Key: {
      PK: `PAYMENT#${paymentId}`,
      SK: 'INFO',
    },
  });

  const response = await docClient.send(command);
  return !!response.Item;
}

function maskCardNumber(cardNumber: string): string {
  return `****${cardNumber.slice(-4)}`;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

```typescript
// lambda/authorize-payment/index.ts
interface AuthorizationInput {
  paymentId: string;
  merchantId: string;
  amount: number;
  currency: string;
  maskedCardNumber: string;
  threeDSResult?: {
    authenticated: boolean;
    cavv: string;
    eci: string;
  };
}

interface AuthorizationResult {
  paymentId: string;
  authorizationCode: string;
  status: 'AUTHORIZED' | 'DECLINED';
  declineReason?: string;
  authorizedAmount: number;
  authorizedAt: string;
}

export const handler = async (event: AuthorizationInput): Promise<AuthorizationResult> => {
  console.log('Processing authorization:', JSON.stringify(event));

  // 模擬的なカード会社API呼び出し
  const authResult = await callCardNetworkApi(event);

  if (authResult.status === 'DECLINED') {
    throw new AuthorizationError(
      `Authorization declined: ${authResult.declineReason}`,
      authResult.declineReason!
    );
  }

  return {
    paymentId: event.paymentId,
    authorizationCode: authResult.authorizationCode,
    status: 'AUTHORIZED',
    authorizedAmount: event.amount,
    authorizedAt: new Date().toISOString(),
  };
};

async function callCardNetworkApi(input: AuthorizationInput): Promise<{
  status: 'AUTHORIZED' | 'DECLINED';
  authorizationCode: string;
  declineReason?: string;
}> {
  // 実際にはカード会社のAPIを呼び出す
  // ここではシミュレーション

  // 10%の確率で拒否をシミュレート
  if (Math.random() < 0.1) {
    return {
      status: 'DECLINED',
      authorizationCode: '',
      declineReason: 'INSUFFICIENT_FUNDS',
    };
  }

  return {
    status: 'AUTHORIZED',
    authorizationCode: `AUTH${Date.now()}`,
  };
}

class AuthorizationError extends Error {
  public readonly declineReason: string;

  constructor(message: string, declineReason: string) {
    super(message);
    this.name = 'AuthorizationError';
    this.declineReason = declineReason;
  }
}
```

```typescript
// lambda/request-3ds/index.ts
import { SFNClient, SendTaskSuccessCommand, SendTaskFailureCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({});

interface ThreeDSInput {
  paymentId: string;
  merchantId: string;
  amount: number;
  maskedCardNumber: string;
  taskToken: string;  // Step Functionsから渡されるトークン
}

interface ThreeDSResult {
  paymentId: string;
  threeDSRequestId: string;
  redirectUrl: string;
  status: 'PENDING';
}

export const handler = async (event: ThreeDSInput): Promise<ThreeDSResult> => {
  console.log('Initiating 3DS authentication:', JSON.stringify(event));

  const threeDSRequestId = `3DS${Date.now()}`;

  // 3DS認証リクエストを外部サービスに送信
  // コールバックURLにはtaskTokenを含める
  const callbackUrl = `https://api.payeasy.example.com/3ds-callback?token=${encodeURIComponent(event.taskToken)}`;

  // 実際には3DSプロバイダーのAPIを呼び出す
  const redirectUrl = await initiate3DSAuthentication({
    paymentId: event.paymentId,
    amount: event.amount,
    callbackUrl,
  });

  // この関数はリダイレクトURLを返すのみ
  // 実際の認証結果はコールバックでStep Functionsに通知される
  return {
    paymentId: event.paymentId,
    threeDSRequestId,
    redirectUrl,
    status: 'PENDING',
  };
};

// 3DSコールバック処理（別のLambdaまたはAPI Gatewayハンドラー）
export const callback3DSHandler = async (event: {
  taskToken: string;
  authenticated: boolean;
  cavv?: string;
  eci?: string;
  error?: string;
}) => {
  console.log('3DS callback received:', JSON.stringify(event));

  if (event.authenticated) {
    await sfnClient.send(new SendTaskSuccessCommand({
      taskToken: event.taskToken,
      output: JSON.stringify({
        authenticated: true,
        cavv: event.cavv,
        eci: event.eci,
      }),
    }));
  } else {
    await sfnClient.send(new SendTaskFailureCommand({
      taskToken: event.taskToken,
      error: 'ThreeDSAuthenticationFailed',
      cause: event.error || '3DS authentication failed',
    }));
  }
};

async function initiate3DSAuthentication(params: {
  paymentId: string;
  amount: number;
  callbackUrl: string;
}): Promise<string> {
  // 実際には3DSプロバイダーのAPIを呼び出し
  return `https://3ds.example.com/auth?id=${params.paymentId}`;
}
```

### Phase 4: Step Functionsワークフローの実装

```typescript
// lib/constructs/payment-workflow.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import { PaymentLambdas } from './payment-lambdas';

export interface PaymentWorkflowProps {
  environment: string;
  lambdas: PaymentLambdas;
}

export class PaymentWorkflow extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: PaymentWorkflowProps) {
    super(scope, id);

    const { environment, lambdas } = props;

    //===========================================
    // タスク定義
    //===========================================

    // 1. リクエスト検証
    const validateRequest = new tasks.LambdaInvoke(this, 'ValidateRequest', {
      lambdaFunction: lambdas.validateRequest,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    // 2. 3DS認証リクエスト（コールバックパターン）
    const request3DS = new tasks.LambdaInvoke(this, 'Request3DS', {
      lambdaFunction: lambdas.request3DS,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      payload: sfn.TaskInput.fromObject({
        'paymentId.$': '$.paymentId',
        'merchantId.$': '$.merchantId',
        'amount.$': '$.amount',
        'maskedCardNumber.$': '$.maskedCardNumber',
        'taskToken.$': '$$.Task.Token',
      }),
      taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(10)),
      resultPath: '$.threeDSResult',
    });

    // 3. 与信確保
    const authorizePayment = new tasks.LambdaInvoke(this, 'AuthorizePayment', {
      lambdaFunction: lambdas.authorizePayment,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    // カスタムリトライ設定
    authorizePayment.addRetry({
      errors: ['States.TaskFailed', 'States.Timeout'],
      interval: cdk.Duration.seconds(2),
      maxAttempts: 3,
      backoffRate: 2,
    });

    // 4. 売上確定
    const capturePayment = new tasks.LambdaInvoke(this, 'CapturePayment', {
      lambdaFunction: lambdas.capturePayment,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    capturePayment.addRetry({
      errors: ['States.TaskFailed', 'States.Timeout'],
      interval: cdk.Duration.seconds(2),
      maxAttempts: 3,
      backoffRate: 2,
    });

    // 5. 通知送信（並列処理）
    const notifyMerchant = new tasks.LambdaInvoke(this, 'NotifyMerchant', {
      lambdaFunction: lambdas.sendNotification,
      payload: sfn.TaskInput.fromObject({
        'type': 'MERCHANT',
        'paymentId.$': '$.paymentId',
        'merchantId.$': '$.merchantId',
        'status.$': '$.status',
        'amount.$': '$.capturedAmount',
      }),
      resultPath: '$.merchantNotification',
    });

    const notifyCustomer = new tasks.LambdaInvoke(this, 'NotifyCustomer', {
      lambdaFunction: lambdas.sendNotification,
      payload: sfn.TaskInput.fromObject({
        'type': 'CUSTOMER',
        'paymentId.$': '$.paymentId',
        'customerEmail.$': '$.customerEmail',
        'status.$': '$.status',
        'amount.$': '$.capturedAmount',
      }),
      resultPath: '$.customerNotification',
    });

    const sendNotifications = new sfn.Parallel(this, 'SendNotifications', {
      resultPath: '$.notifications',
    });
    sendNotifications.branch(notifyMerchant);
    sendNotifications.branch(notifyCustomer);

    // 通知失敗は無視（後でリトライキューから再送）
    sendNotifications.addCatch(
      new sfn.Pass(this, 'NotificationFailed', {
        result: sfn.Result.fromObject({ notificationFailed: true }),
        resultPath: '$.notificationError',
      }),
      { errors: ['States.ALL'] }
    );

    // 6. 取引記録保存
    const saveTransaction = new tasks.LambdaInvoke(this, 'SaveTransaction', {
      lambdaFunction: lambdas.saveTransaction,
      outputPath: '$.Payload',
    });

    // 7. エラーハンドリング
    const handleAuthFailure = new tasks.LambdaInvoke(this, 'HandleAuthFailure', {
      lambdaFunction: lambdas.handleError,
      payload: sfn.TaskInput.fromObject({
        'errorType': 'AUTHORIZATION_FAILED',
        'paymentId.$': '$.paymentId',
        'error.$': '$.error',
      }),
      resultPath: '$.errorHandling',
    });

    const rollbackAndNotify = new tasks.LambdaInvoke(this, 'RollbackAuthorization', {
      lambdaFunction: lambdas.rollbackAuthorization,
      resultPath: '$.rollback',
    });

    const handleCaptureFailure = rollbackAndNotify.next(
      new tasks.LambdaInvoke(this, 'HandleCaptureFailure', {
        lambdaFunction: lambdas.handleError,
        payload: sfn.TaskInput.fromObject({
          'errorType': 'CAPTURE_FAILED',
          'paymentId.$': '$.paymentId',
          'authorizationCode.$': '$.authorizationCode',
          'error.$': '$.error',
        }),
        resultPath: '$.errorHandling',
      })
    );

    const handleGeneralError = new tasks.LambdaInvoke(this, 'HandleGeneralError', {
      lambdaFunction: lambdas.handleError,
      payload: sfn.TaskInput.fromObject({
        'errorType': 'SYSTEM_ERROR',
        'paymentId.$': '$.paymentId',
        'error.$': '$.error',
      }),
      resultPath: '$.errorHandling',
    });

    //===========================================
    // 終了ステート
    //===========================================
    const paymentSuccess = new sfn.Succeed(this, 'PaymentSuccess', {
      comment: 'Payment completed successfully',
    });

    const paymentFailed = new sfn.Fail(this, 'PaymentFailed', {
      error: 'PaymentProcessingFailed',
      cause: 'Payment could not be completed',
    });

    //===========================================
    // 分岐条件
    //===========================================

    // 3DS要否判定
    const check3DSRequired = new sfn.Choice(this, 'Check3DSRequired')
      .when(
        sfn.Condition.booleanEquals('$.require3DS', true),
        request3DS
      )
      .otherwise(authorizePayment);

    // 与信結果判定
    const checkAuthResult = new sfn.Choice(this, 'CheckAuthResult')
      .when(
        sfn.Condition.stringEquals('$.status', 'AUTHORIZED'),
        capturePayment
      )
      .otherwise(handleAuthFailure.next(paymentFailed));

    //===========================================
    // エラーハンドリング設定
    //===========================================

    // 与信のエラーキャッチ
    authorizePayment.addCatch(handleAuthFailure.next(paymentFailed), {
      errors: ['AuthorizationError'],
      resultPath: '$.error',
    });

    authorizePayment.addCatch(handleGeneralError.next(paymentFailed), {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    // 売上確定のエラーキャッチ
    capturePayment.addCatch(handleCaptureFailure.next(paymentFailed), {
      errors: ['CaptureError'],
      resultPath: '$.error',
    });

    capturePayment.addCatch(handleGeneralError.next(paymentFailed), {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    // 3DS認証のエラーキャッチ
    request3DS.addCatch(handleAuthFailure.next(paymentFailed), {
      errors: ['ThreeDSAuthenticationFailed', 'States.Timeout'],
      resultPath: '$.error',
    });

    //===========================================
    // ワークフロー組み立て
    //===========================================
    const definition = validateRequest
      .next(check3DSRequired);

    // 3DS後は与信へ
    request3DS.next(authorizePayment);

    // 与信後は結果チェック
    authorizePayment.next(checkAuthResult);

    // 売上確定後は通知→保存→完了
    capturePayment
      .next(sendNotifications)
      .next(saveTransaction)
      .next(paymentSuccess);

    //===========================================
    // ステートマシン作成
    //===========================================
    const logGroup = new logs.LogGroup(this, 'StateMachineLogGroup', {
      logGroupName: `/aws/stepfunctions/payeasy-payment-${environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.stateMachine = new sfn.StateMachine(this, 'PaymentStateMachine', {
      stateMachineName: `payeasy-payment-workflow-${environment}`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      stateMachineType: sfn.StateMachineType.STANDARD,
      timeout: cdk.Duration.minutes(15),
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });
  }
}
```

### Phase 5: API Gatewayの実装

```typescript
// lib/constructs/payment-api.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface PaymentApiProps {
  environment: string;
  stateMachine: sfn.StateMachine;
}

export class PaymentApi extends Construct {
  public readonly restApi: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: PaymentApiProps) {
    super(scope, id);

    const { environment, stateMachine } = props;

    // REST API作成
    this.restApi = new apigateway.RestApi(this, 'PaymentApi', {
      restApiName: `payeasy-payment-api-${environment}`,
      description: 'PayEasy Payment Processing API',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'GET', 'OPTIONS'],
      },
    });

    // Step Functions統合用IAMロール
    const integrationRole = new iam.Role(this, 'ApiGatewayRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    stateMachine.grantStartExecution(integrationRole);
    stateMachine.grantRead(integrationRole);

    // /payments リソース
    const payments = this.restApi.root.addResource('payments');

    // POST /payments - 決済開始
    const startPaymentIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: integrationRole,
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${stateMachine.stateMachineArn}",
            "input": "$util.escapeJavaScript($input.body)"
          }`,
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `{
                "executionArn": "$input.json('$.executionArn')",
                "startDate": "$input.json('$.startDate')"
              }`,
            },
          },
          {
            statusCode: '400',
            selectionPattern: '4\\d{2}',
            responseTemplates: {
              'application/json': '{"error": "Bad Request"}',
            },
          },
        ],
      },
    });

    payments.addMethod('POST', startPaymentIntegration, {
      methodResponses: [
        { statusCode: '200' },
        { statusCode: '400' },
      ],
      requestValidator: new apigateway.RequestValidator(this, 'RequestValidator', {
        restApi: this.restApi,
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
      requestModels: {
        'application/json': new apigateway.Model(this, 'PaymentRequestModel', {
          restApi: this.restApi,
          contentType: 'application/json',
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            required: ['paymentId', 'merchantId', 'amount', 'currency', 'cardNumber', 'customerEmail'],
            properties: {
              paymentId: { type: apigateway.JsonSchemaType.STRING },
              merchantId: { type: apigateway.JsonSchemaType.STRING },
              amount: { type: apigateway.JsonSchemaType.NUMBER, minimum: 1 },
              currency: { type: apigateway.JsonSchemaType.STRING },
              cardNumber: { type: apigateway.JsonSchemaType.STRING },
              cardExpiry: { type: apigateway.JsonSchemaType.STRING },
              cardCvv: { type: apigateway.JsonSchemaType.STRING },
              customerEmail: { type: apigateway.JsonSchemaType.STRING },
              customerName: { type: apigateway.JsonSchemaType.STRING },
            },
          },
        }),
      },
    });

    // GET /payments/{executionArn} - 実行状態確認
    const paymentExecution = payments.addResource('{executionArn}');

    const getExecutionIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'DescribeExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: integrationRole,
        requestTemplates: {
          'application/json': `{
            "executionArn": "$util.urlDecode($input.params('executionArn'))"
          }`,
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `{
                "executionArn": "$input.json('$.executionArn')",
                "status": "$input.json('$.status')",
                "startDate": "$input.json('$.startDate')",
                "stopDate": "$input.json('$.stopDate')",
                "output": $input.json('$.output')
              }`,
            },
          },
        ],
      },
    });

    paymentExecution.addMethod('GET', getExecutionIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });
  }
}
```

### Phase 6: デプロイと動作確認

#### 6.1 デプロイ

```bash
# CDK Bootstrap（初回のみ）
cdk bootstrap

# 差分確認
cdk diff

# デプロイ
cdk deploy PayEasyStack-dev

# 出力されたAPIエンドポイントを確認
```

#### 6.2 動作テスト

```bash
# APIエンドポイント設定
export API_ENDPOINT="https://xxxx.execute-api.ap-northeast-1.amazonaws.com/dev"

# 決済リクエスト送信
curl -X POST "${API_ENDPOINT}/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "PAY-'$(date +%s)'",
    "merchantId": "MERCHANT001",
    "amount": 5000,
    "currency": "JPY",
    "cardNumber": "4111111111111111",
    "cardExpiry": "12/25",
    "cardCvv": "123",
    "customerEmail": "test@example.com",
    "customerName": "テスト太郎"
  }'

# レスポンス例
# {
#   "executionArn": "arn:aws:states:ap-northeast-1:123456789012:execution:payeasy-payment-workflow-dev:xxx",
#   "startDate": "2024-01-15T10:30:00.000Z"
# }

# 実行状態確認
export EXECUTION_ARN="arn:aws:states:ap-northeast-1:123456789012:execution:payeasy-payment-workflow-dev:xxx"
curl "${API_ENDPOINT}/payments/$(echo $EXECUTION_ARN | jq -sRr @uri)"
```

---

## 8. トラブルシューティング演習

### 演習8-1: タイムアウト問題

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-1                      │
│                  タイムアウト問題                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  3DS認証で外部サービスからのコールバックが                       │
│  タイムアウトになり、決済が失敗するケースが増加している。        │
│                                                                  │
│  【エラー】                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  States.Timeout: Task timed out after 600 seconds           ││
│  │  State: Request3DS                                          ││
│  │  ExecutionArn: arn:aws:states:...:execution:xxx             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. タイムアウトの原因を調査してください                         │
│  2. 適切なタイムアウト設定を検討してください                     │
│  3. タイムアウト時のユーザー体験を改善してください               │
│                                                                  │
│  【ヒント】                                                      │
│  - CloudWatch Logs Insights                                     │
│  - Step Functions 実行履歴                                      │
│  - Heartbeat機能                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**解決策例**

```typescript
// ハートビートを使用した改善版
const request3DSWithHeartbeat = new tasks.LambdaInvoke(this, 'Request3DS', {
  lambdaFunction: lambdas.request3DS,
  integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
  payload: sfn.TaskInput.fromObject({
    'paymentId.$': '$.paymentId',
    'taskToken.$': '$$.Task.Token',
  }),
  // タイムアウト設定
  taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(10)),
  // ハートビート：30秒ごとに生存確認
  heartbeat: cdk.Duration.seconds(30),
  resultPath: '$.threeDSResult',
});

// Lambda側でハートビートを送信
// lambda/request-3ds/index.ts
import { SFNClient, SendTaskHeartbeatCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({});

async function sendHeartbeat(taskToken: string): Promise<void> {
  await sfnClient.send(new SendTaskHeartbeatCommand({ taskToken }));
}

// 外部サービス待機中に定期的にハートビートを送信
const heartbeatInterval = setInterval(async () => {
  try {
    await sendHeartbeat(taskToken);
    console.log('Heartbeat sent successfully');
  } catch (error) {
    console.error('Failed to send heartbeat:', error);
    clearInterval(heartbeatInterval);
  }
}, 25000); // 30秒のハートビートタイムアウトより短く
```

### 演習8-2: 補償トランザクション失敗

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-2                      │
│               補償トランザクション失敗                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  決済（売上確定）が失敗し、与信取消（補償）も失敗した。          │
│  結果として与信枠が確保されたままの状態になっている。            │
│                                                                  │
│  【エラーログ】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  CapturePayment: Failed - Network timeout                   ││
│  │  RollbackAuthorization: Failed - Service unavailable        ││
│  │                                                              ││
│  │  Payment Status: UNKNOWN                                     ││
│  │  Authorization Status: ACTIVE (should be VOIDED)            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. 二重障害パターンへの対策を設計してください                   │
│  2. 未解決トランザクションの検出・解決方法を実装してください     │
│  3. 運用対応フローを策定してください                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**解決策例**

```typescript
// 補償トランザクションの堅牢化
const rollbackWithRetry = new sfn.Parallel(this, 'RobustRollback', {
  resultPath: '$.rollbackResult',
})
.branch(
  // メイン：即座にロールバック試行
  new tasks.LambdaInvoke(this, 'ImmediateRollback', {
    lambdaFunction: lambdas.rollbackAuthorization,
  })
  .addRetry({
    errors: ['States.ALL'],
    interval: cdk.Duration.seconds(5),
    maxAttempts: 5,
    backoffRate: 2,
  })
)
.addCatch(
  // フォールバック：SQSに保存して後で処理
  new sfn.Chain(this, 'RollbackFallback')
    .next(new tasks.SqsSendMessage(this, 'QueueFailedRollback', {
      queue: rollbackDLQ,
      messageBody: sfn.TaskInput.fromObject({
        'paymentId.$': '$.paymentId',
        'authorizationCode.$': '$.authorizationCode',
        'error.$': '$.error',
        'timestamp.$': '$$.State.EnteredTime',
      }),
    }))
    .next(new tasks.SnsPublish(this, 'AlertRollbackFailure', {
      topic: alertTopic,
      message: sfn.TaskInput.fromObject({
        'alert': 'CRITICAL: Rollback failed',
        'paymentId.$': '$.paymentId',
        'requiresManualIntervention': true,
      }),
    })),
  { errors: ['States.ALL'] }
);

// 未解決トランザクション検出用のスケジュール実行
// EventBridge -> Step Functions
const reconciliationWorkflow = new sfn.StateMachine(this, 'ReconciliationWorkflow', {
  definitionBody: sfn.DefinitionBody.fromChainable(
    new tasks.LambdaInvoke(this, 'FindStaleAuthorizations', {
      lambdaFunction: findStaleAuthLambda,
    })
    .next(new sfn.Map(this, 'ProcessEachStale', {
      itemsPath: '$.staleAuthorizations',
      maxConcurrency: 5,
    })
    .itemProcessor(
      new tasks.LambdaInvoke(this, 'ResolveStaleAuth', {
        lambdaFunction: resolveStaleAuthLambda,
      })
    ))
  ),
});
```

### 演習8-3: 高負荷時のスロットリング

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-3                      │
│                 高負荷時スロットリング                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  セール期間中にAPI呼び出しが急増し、                             │
│  Step Functionsのスロットリングが発生している。                  │
│                                                                  │
│  【メトリクス】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ExecutionsStarted: 10,000/sec (limit: 2,000)               ││
│  │  ThrottledEvents: 8,000                                     ││
│  │  API Gateway 429 errors: 急増                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. スロットリングの原因を特定してください                       │
│  2. Standard vs Express ワークフローの使い分けを検討             │
│  3. バッファリング戦略を実装してください                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 設計課題

### 設計課題9-1: サブスクリプション決済ワークフロー

```
┌─────────────────────────────────────────────────────────────────┐
│                      設計課題 9-1                                │
│              サブスクリプション決済ワークフロー                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【課題】                                                        │
│  月額課金のサブスクリプション決済を自動化するワークフローを      │
│  設計してください。                                              │
│                                                                  │
│  【要件】                                                        │
│  ・毎月指定日に自動課金                                          │
│  ・決済失敗時は3回までリトライ（1日、3日、7日後）                │
│  ・3回失敗でサブスクリプション一時停止                           │
│  ・顧客への事前通知・失敗通知                                    │
│  ・管理者への日次レポート                                        │
│                                                                  │
│  【成果物】                                                      │
│  1. ワークフロー設計図（ASL形式）                                │
│  2. リトライ戦略の詳細設計                                       │
│  3. 通知テンプレート                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 設計課題9-2: マルチテナント決済基盤

```
┌─────────────────────────────────────────────────────────────────┐
│                      設計課題 9-2                                │
│                マルチテナント決済基盤                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【課題】                                                        │
│  複数の加盟店（テナント）がそれぞれ独自のワークフローを          │
│  設定できる決済基盤を設計してください。                          │
│                                                                  │
│  【要件】                                                        │
│  ・テナントごとに異なる決済フロー（3DS有無、審査有無等）         │
│  ・テナントごとのAPI制限（レートリミット）                       │
│  ・テナント間のデータ分離                                        │
│  ・共通コンポーネントの再利用                                    │
│                                                                  │
│  【成果物】                                                      │
│  1. マルチテナントアーキテクチャ図                               │
│  2. テナント設定管理の設計                                       │
│  3. 動的ワークフロー生成の仕組み                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. 発展課題

### 発展課題10-1: Express Workflowへの移行

```
┌─────────────────────────────────────────────────────────────────┐
│                      発展課題 10-1                               │
│               Express Workflowへの移行                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【シナリオ】                                                    │
│  決済処理の大部分（3DS不要の小額決済）を                         │
│  Express Workflowに移行してコスト削減したい。                    │
│                                                                  │
│  【技術要件】                                                    │
│  ・Standard/Expressの使い分け判断                                │
│  ・Express Workflow用の設計変更                                  │
│  ・同期実行APIの設計                                             │
│  ・ログ・監視の設計                                              │
│                                                                  │
│  【成果物】                                                      │
│  1. Standard/Express振り分けロジック                             │
│  2. Express Workflow用CDKコード                                  │
│  3. コスト比較分析                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 発展課題10-2: 分散トレーシングの実装

```
┌─────────────────────────────────────────────────────────────────┐
│                      発展課題 10-2                               │
│                分散トレーシングの実装                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【シナリオ】                                                    │
│  決済処理全体のレイテンシボトルネックを特定し、                  │
│  パフォーマンスを改善したい。                                    │
│                                                                  │
│  【技術要件】                                                    │
│  ・X-Rayによるエンドツーエンドトレーシング                       │
│  ・カスタムサブセグメントの追加                                  │
│  ・サービスマップの構築                                          │
│  ・パフォーマンス分析ダッシュボード                              │
│                                                                  │
│  【成果物】                                                      │
│  1. X-Ray設定のCDKコード                                         │
│  2. カスタムアノテーション設計                                   │
│  3. パフォーマンス分析レポート                                   │
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
│  【Step Functions基礎】                                          │
│  □ Standard/Expressワークフローの違いを説明できる               │
│  □ ASL（Amazon States Language）を読み書きできる                │
│  □ 各種ステートタイプの使い分けができる                         │
│  □ 入出力処理（Path系）を理解した                               │
│                                                                  │
│  【エラーハンドリング】                                          │
│  □ Retry設定を適切に設計できる                                  │
│  □ Catch設定でエラー分岐を実装できる                            │
│  □ 補償トランザクション（Saga）を設計できる                     │
│  □ タイムアウト戦略を説明できる                                 │
│                                                                  │
│  【高度なパターン】                                              │
│  □ コールバックパターン（waitForTaskToken）を実装できる         │
│  □ Parallel/Mapステートを使い分けられる                         │
│  □ ネストされたワークフローを設計できる                         │
│  □ 動的並列処理を実装できる                                     │
│                                                                  │
│  【CDK実装】                                                     │
│  □ CDKでStep Functionsを構築できる                              │
│  □ Lambda統合を実装できる                                       │
│  □ API Gateway統合を実装できる                                  │
│  □ テスト戦略を確立した                                         │
│                                                                  │
│  【運用】                                                        │
│  □ CloudWatch Logsでデバッグできる                              │
│  □ 実行履歴を分析できる                                         │
│  □ アラートを設定できる                                         │
│  □ コスト最適化の観点で設計できる                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Step Functions ベストプラクティス

```
┌─────────────────────────────────────────────────────────────────┐
│              Step Functions ベストプラクティス                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【設計原則】                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  1. 単一責任の原則                                          ││
│  │     - 各ステートは1つの責務のみ                             ││
│  │     - Lambdaは小さく保つ                                    ││
│  │                                                              ││
│  │  2. 冪等性の確保                                            ││
│  │     - 同じ入力で同じ結果                                    ││
│  │     - リトライ安全な設計                                    ││
│  │                                                              ││
│  │  3. 失敗を前提とした設計                                    ││
│  │     - すべてのタスクにCatch設定                             ││
│  │     - 適切なリトライ戦略                                    ││
│  │     - 補償トランザクションの準備                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【アンチパターン】                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ✗ 長時間実行のLambda（15分以上の処理）                     ││
│  │  ✗ 大きなペイロード（256KB超）                              ││
│  │  ✗ リトライなしのタスク                                     ││
│  │  ✗ 無限ループの可能性があるChoice                           ││
│  │  ✗ Catch なしのワークフロー                                 ││
│  └─────────────────────────────────────────────────────────────┘│
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
│  │  Step Functions Standard │ 1,000実行       │ $0.025         ││
│  │  Lambda                  │ 10,000呼出      │ $0.002         ││
│  │  API Gateway             │ 1,000リクエスト │ $0.004         ││
│  │  DynamoDB                │ On-Demand       │ $1.00          ││
│  │  CloudWatch Logs         │ 1GB             │ $0.50          ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $2          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【本番環境想定（50万決済/日）】                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                    │ 数量            │ 月額（USD）    ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  Step Functions Standard │ 15M状態遷移     │ $375           ││
│  │  Lambda                  │ 100M呼出        │ $200           ││
│  │  API Gateway             │ 15Mリクエスト   │ $53            ││
│  │  DynamoDB                │ On-Demand       │ $150           ││
│  │  SQS                     │ 10M メッセージ  │ $4             ││
│  │  CloudWatch Logs         │ 100GB           │ $50            ││
│  │  X-Ray                   │ トレース        │ $25            ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $857        ││
│  │                          │                 │ (約 ¥128,000)  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【コスト最適化のポイント】                                      │
│  ・小額決済はExpress Workflow（1/10のコスト）                    │
│  ・Lambda ARM64アーキテクチャ（20%削減）                         │
│  ・CloudWatch Logs保持期間の最適化                               │
│  ・不要なトレースの削減                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## リソースのクリーンアップ

```bash
# CDKスタック削除
cdk destroy PayEasyStack-dev

# 確認
aws cloudformation list-stacks \
  --query "StackSummaries[?StackName=='PayEasyStack-dev'].StackStatus"

# 手動で残ったリソースがないか確認
aws stepfunctions list-state-machines \
  --query "stateMachines[?contains(name, 'payeasy')]"

aws lambda list-functions \
  --query "Functions[?contains(FunctionName, 'payeasy')]"

echo "Cleanup completed!"
```

---

**次の課題**: [課題35: ShopNow Chaos Engineering](exercise-35.md)

**前の課題**: [課題33: MegaMart DynamoDB実践設計](exercise-33.md)
