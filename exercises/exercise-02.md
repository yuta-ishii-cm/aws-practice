# 課題2: 商品カタログ写真の自動アーカイブ - EC運営のストレージ最適化

**難易度: 🟢 初級**

---

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級 |
| カテゴリ | ストレージ管理 / イベント駆動 |
| 処理タイプ | 非同期 / バッチ |
| 使用IaC | CloudFormation |
| 想定所要時間 | 3〜4時間 |

---

## 学習するAWSサービス

この演習では以下のAWSサービスを実践的に学習します。

### メインサービス

| サービス | 役割 | 学習ポイント |
|----------|------|-------------|
| **Amazon S3** | 商品画像の保存・管理 | バケット作成、ライフサイクルポリシー、イベント通知 |
| **AWS Lambda** | 画像アップロード時の処理 | S3トリガー、イベント処理 |
| **S3 Lifecycle** | 自動アーカイブ・削除 | ストレージクラス移行、有効期限設定 |

### 補助サービス

| サービス | 役割 |
|----------|------|
| **Amazon SNS** | アーカイブ完了通知 |
| **Amazon CloudWatch** | ログ・メトリクス監視 |
| **AWS IAM** | サービス間の権限管理 |

---

## 最終構成図

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group storage(server)[Storage Layer] in aws
    group compute(server)[Compute Layer] in aws
    group notification(server)[Notification] in aws

    service user(internet)[EC Admin]
    service s3_active(logos:aws-s3)[S3 STANDARD] in storage
    service s3_archive(logos:aws-s3)[S3 Glacier] in storage
    service lambda(logos:aws-lambda)[Lambda] in compute
    service sns(logos:aws-sns)[SNS] in notification
    service email(internet)[Email]

    user:R --> L:s3_active
    s3_active:B --> T:lambda
    s3_active:R -- Auto archive --> L:s3_archive
    lambda:R --> L:sns
    sns:R --> L:email
```

| コンポーネント | 役割 |
|----------------|------|
| **EC Admin** | EC運営担当者（商品画像をアップロード） |
| **S3 STANDARD** | 商品画像の保存（標準ストレージ） |
| **S3 Glacier** | 90日経過後の自動アーカイブ先 |
| **Lambda** | 画像アップロード時の処理（メタデータ記録等） |
| **SNS** | アーカイブ完了通知 |
| **Email** | メール通知の受信先 |

### データフロー

```
1. [担当者] 商品画像をS3にアップロード
2. [S3] アップロードイベントをLambdaに通知
3. [Lambda] 画像のメタデータを記録、サムネイル生成（オプション）
4. [S3 Lifecycle] 90日経過した販売終了商品の画像を自動でGlacierへ移行
5. [S3 Lifecycle] 365日経過した画像を自動削除
```

---

## シナリオ

### 企業プロフィール

**〇〇株式会社**は、アパレル・雑貨を扱うECサイトを運営しています。商品数が増え続ける中、商品画像のストレージコストが課題になってきました。

| 項目 | 内容 |
|------|------|
| 業種 | EC / 小売 |
| 従業員数 | 20名 |
| 商品数 | 5,000点（うち販売終了1,500点） |
| 月間画像アップロード | 500枚 |
| 現在のストレージ使用量 | 200GB |

### 現状の課題

商品画像は一度アップロードしたら放置。販売終了した商品の画像も高コストのストレージに残り続け、毎月のS3料金が増加しています。手動で古い画像を整理するのは現実的ではありません。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| S3ストレージコスト | $50/月 | $20/月 |
| 不要画像の割合 | 30%（60GB） | 5%以下 |
| 画像整理の工数 | 月4時間 | 0時間（自動化） |

### 解決したいこと

1. 販売終了商品の画像を自動でアーカイブしたい
2. 一定期間経過した画像は自動削除したい
3. ストレージコストを削減したい
4. 画像アップロード時に処理を自動化したい

### 成功指標（KPI）

| KPI | 現状 | 目標 |
|-----|------|------|
| 月額ストレージコスト | $50 | $20 |
| 手動作業時間 | 4時間/月 | 0時間 |
| アーカイブ適用率 | 0% | 100% |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **S3ライフサイクルポリシーの設計と実装**
   - ストレージクラスの理解（Standard, Glacier, Deep Archive）
   - 移行ルールの設定
   - 有効期限ルールの設定
   - プレフィックス・タグによるフィルタリング

2. **S3イベント通知とLambda連携**
   - S3イベントトリガーの設定
   - Lambdaでのイベント処理
   - 非同期処理パターン

3. **ストレージコスト最適化**
   - ストレージクラスの使い分け
   - コスト試算の方法
   - S3 Storage Lensの活用

### 実務で活かせる知識

- データライフサイクル管理の設計
- イベント駆動アーキテクチャの基礎
- AWSのストレージコスト最適化

---

## 前提条件

### 必要な事前知識

- S3の基本操作（アップロード、ダウンロード）
- AWS CLIの基本
- JSONの読み書き

### 準備するもの

1. **AWSアカウント**
   - S3、Lambda、SNSの利用権限

2. **開発環境**
   - AWS CLI v2（設定済み）
   - Python 3.9以上（Lambda用）

3. **テスト用画像**
   - 5〜10枚のサンプル画像（JPG/PNG）

### 必要なIAM権限

以下の権限が必要です（事前に確認してください）：

```
- s3:*
- lambda:*
- sns:*
- iam:CreateRole, iam:AttachRolePolicy
- cloudformation:*
```

---

## S3ストレージクラスの比較

| ストレージクラス | 用途 | 料金（GB/月） | 取り出し |
|------------------|------|---------------|----------|
| **S3 Standard** | 頻繁にアクセス | $0.025 | 即時 |
| **S3 Standard-IA** | 低頻度アクセス | $0.0138 | 即時 |
| **S3 Glacier Instant Retrieval** | アーカイブ（即時取得） | $0.005 | 即時 |
| **S3 Glacier Flexible Retrieval** | アーカイブ | $0.0045 | 数分〜数時間 |
| **S3 Glacier Deep Archive** | 長期アーカイブ | $0.002 | 12〜48時間 |

---

## トラブルシューティング課題

### 問題1: ライフサイクルポリシーが適用されない

**症状:**
```
90日以上経過したオブジェクトがGlacierに移行されない
```

**ヒント:**
1. ライフサイクルルールのステータスを確認（Enabled/Disabled）
2. フィルター条件（プレフィックス、タグ）を確認
3. ルール適用は即時ではなく、最大24時間かかる場合がある

<details>
<summary>解決方法を見る</summary>

1. ライフサイクルルールが `Enabled` になっているか確認：

```bash
aws s3api get-bucket-lifecycle-configuration --bucket your-bucket-name
```

2. フィルター条件が正しいか確認。プレフィックスやタグが意図通りか。

3. 小さいオブジェクト（128KB未満）はGlacierへの移行対象外の場合あり。

</details>

### 問題2: LambdaがS3イベントを受信しない

**症状:**
```
S3に画像をアップロードしてもLambdaが起動しない
CloudWatch Logsにログが出力されない
```

**ヒント:**
1. S3バケットのイベント通知設定を確認
2. Lambdaのリソースベースポリシーを確認
3. イベントタイプ（PutObject等）が正しいか確認

<details>
<summary>解決方法を見る</summary>

LambdaにS3からの呼び出し許可を追加：

```bash
aws lambda add-permission \
  --function-name your-function-name \
  --principal s3.amazonaws.com \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --source-arn arn:aws:s3:::your-bucket-name \
  --source-account your-account-id
```

</details>

### 問題3: Glacierから取り出せない

**症状:**
```
アーカイブされた画像をすぐに取得できない
```

**ヒント:**
1. ストレージクラスを確認
2. 復元リクエストが必要か確認
3. Glacier Instant Retrieval なら即時取得可能

<details>
<summary>解決方法を見る</summary>

Glacier Flexible Retrieval からの復元：

```bash
aws s3api restore-object \
  --bucket your-bucket-name \
  --key path/to/image.jpg \
  --restore-request '{"Days":7,"GlacierJobParameters":{"Tier":"Standard"}}'
```

復元完了後（数時間後）にダウンロード可能。

</details>

---

## 設計の考察ポイント

### 1. ストレージクラスの選択

**考えてみよう:**
- 「販売終了後も稀に問い合わせで画像が必要」な場合、どのストレージクラスが適切？
- Glacier Instant Retrieval と Glacier Flexible Retrieval の使い分けは？

**代替案:**
- Glacier Instant Retrieval: 取り出し頻度が低いが、必要時は即座にアクセスしたい場合
- Glacier Flexible Retrieval: 取り出しに数時間かかっても問題ない場合（より安価）

### 2. ライフサイクルルールの設計

**考えてみよう:**
- 「販売中」「販売終了」をどうやって判別する？
- プレフィックス（フォルダ構造）で分ける？タグで分ける？

---

## 発展課題

### 1. サムネイル自動生成
- アップロード時にLambdaでサムネイル画像を自動生成
- 別バケットまたは別プレフィックスに保存

### 2. 画像のメタデータ管理
- DynamoDBで画像のメタデータ（商品ID、アップロード日、ステータス）を管理
- 販売終了フラグをトリガーにアーカイブ

### 3. S3 Storage Lens でコスト分析
- Storage Lensダッシュボードを作成
- ストレージ使用量とコストの可視化

---

## 想定コストと削減方法

### 月額概算コスト（200GB保存、最適化後）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| S3 Standard | 80GB（販売中商品） | $2.00 |
| S3 Glacier Instant Retrieval | 100GB（販売終了） | $0.50 |
| Lambda | 500リクエスト/月 | 無料枠内 |
| SNS | 100通知/月 | 無料枠内 |
| **合計** | | **約$2.50（約375円）** |

### 最適化前後の比較

| | 最適化前 | 最適化後 | 削減率 |
|--|----------|----------|--------|
| 月額コスト | $50 | $2.50 | **95%削減** |

### コスト削減のポイント

1. **ライフサイクルポリシーの活用**
   - アクセス頻度に応じたストレージクラスの自動移行
   - 不要データの自動削除

2. **Intelligent-Tieringの検討**
   - アクセスパターンが予測できない場合に有効
   - 自動でストレージクラスを最適化

---

## クリーンアップチェックリスト

演習終了後、以下のリソースを削除してください：

```bash
# S3バケットの中身を削除してからバケット削除
aws s3 rm s3://your-bucket-name --recursive
aws s3 rb s3://your-bucket-name

# CloudFormationスタックを削除（使用した場合）
aws cloudformation delete-stack --stack-name product-catalog-archive
```

- [ ] S3バケット（中身を先に削除）
- [ ] Lambda関数
- [ ] SNSトピック
- [ ] CloudWatchロググループ
- [ ] IAMロール・ポリシー

---

## 学習のポイント

### 1. S3ライフサイクル管理
データの「温度」（アクセス頻度）に応じてストレージクラスを移行することで、大幅なコスト削減が可能。設定は一度行えば自動で適用されます。

### 2. イベント駆動アーキテクチャ
S3にファイルがアップロードされたら自動でLambdaが起動する仕組みは、多くのユースケースで活用できます。

### 3. ストレージコストの可視化
S3のコストは見えにくいが、Storage Lensなどを使って可視化することで、最適化ポイントが見えてきます。

---

## 次のステップ

この演習を終えたら、以下の演習に挑戦してみましょう：

- [課題43: 予約システムの死活監視](exercise-43.md) - CloudWatch Alarmsによる監視を学ぶ
- [課題3: カスタマーサポート自動化システム](exercise-03.md) - より高度なイベント駆動処理
