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
