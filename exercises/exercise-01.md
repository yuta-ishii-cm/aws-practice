# 課題1: ランチガチャAPI - チームのランチ難民を救え！

**難易度: 🟢 初級**

---

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級 |
| カテゴリ | サーバーレス / API |
| 処理タイプ | リアルタイム |
| 使用IaC | SAM |
| 想定所要時間 | 3〜4時間 |

---

## 学習するAWSサービス

この演習では以下のAWSサービスを実践的に学習します。

### メインサービス

| サービス | 役割 | 学習ポイント |
|----------|------|-------------|
| **AWS Lambda** | APIのビジネスロジック実行 | 関数の作成、ハンドラーの実装、環境変数 |
| **Amazon API Gateway** | REST APIエンドポイント | リソース設計、メソッド設定、デプロイ |
| **Amazon DynamoDB** | お店データの保存 | テーブル設計、CRUD操作、Scan |

### 補助サービス

| サービス | 役割 |
|----------|------|
| **Amazon CloudWatch** | ログ・メトリクス監視 |
| **AWS IAM** | Lambda実行ロール、DynamoDBアクセス権限 |

---

## 最終構成図

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group api(server)[API Layer] in aws
    group data(database)[Data Layer] in aws

    service user(internet)[User / Slack Bot]
    service apigw(server)[API Gateway] in api
    service lambda_list(server)[Lambda ListRestaurants] in api
    service lambda_create(server)[Lambda CreateRestaurant] in api
    service lambda_gacha(server)[Lambda Gacha] in api
    service lambda_delete(server)[Lambda DeleteRestaurant] in api
    service dynamodb(database)[DynamoDB Restaurants] in data

    user:R --> L:apigw
    apigw:B --> T:lambda_list
    apigw:B --> T:lambda_create
    apigw:B --> T:lambda_gacha
    apigw:B --> T:lambda_delete
    lambda_list:R --> L:dynamodb
    lambda_create:R --> L:dynamodb
    lambda_gacha:R --> L:dynamodb
    lambda_delete:R --> L:dynamodb
```

### APIエンドポイント設計

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /restaurants | 登録済みのお店一覧を取得 |
| POST | /restaurants | 新しいお店を登録 |
| GET | /gacha | ランダムで1店舗を返す 🎲 |
| DELETE | /restaurants/{id} | お店を削除 |

---

## シナリオ

### 企業プロフィール

**〇〇株式会社**は、都内にオフィスを構えるIT企業。エンジニア中心のチームで、毎日のランチタイムが密かな悩みの種になっています。

| 項目 | 内容 |
|------|------|
| 業種 | IT / SaaS |
| 従業員数 | 50名 |
| 開発チーム | 15名 |
| オフィス所在地 | 渋谷（飲食店多数） |

### 現状の課題

毎日12時になると「今日どこ行く？」「なんでもいい」「じゃあ決めて」の無限ループが発生。決まるまでに平均5分かかり、その間にお店が混み始めるという悪循環。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| ランチ決定までの時間 | 5分 | 10秒 |
| 「なんでもいい」発言回数 | 1日3回 | 0回 |
| 同じ店に行く頻度 | 週3回 | 週1回以下 |

### 解決したいこと

1. ランダムでお店を提案してくれるAPIが欲しい
2. チームで行ったお店を登録・管理したい
3. 将来的にはSlack Botと連携したい

### 成功指標（KPI）

| KPI | 現状 | 目標 |
|-----|------|------|
| ランチ決定時間 | 5分 | 10秒 |
| API応答時間 | - | 500ms以内 |
| 登録店舗数 | - | 30店舗以上 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **API Gateway + Lambda の基本構成**
   - REST APIの設計とデプロイ
   - Lambda関数とAPI Gatewayの統合
   - リクエスト/レスポンスの処理

2. **DynamoDBの基本操作**
   - テーブル作成とパーティションキー設計
   - put_item, get_item, scan, delete_item
   - ランダム取得のロジック実装

3. **SAMによるサーバーレスアプリケーション開発**
   - template.yamlの記述
   - sam build / sam deploy
   - ローカルテスト（sam local invoke）

### 実務で活かせる知識

- サーバーレスAPIの設計パターン
- DynamoDBのシンプルなユースケース
- Infrastructure as Codeの基礎

---

## 前提条件

### 必要な事前知識

- REST APIの基本概念（GET, POST, DELETE）
- Python または Node.js の基礎
- JSONの読み書き

### 準備するもの

1. **AWSアカウント**
   - 無料枠で実施可能

2. **開発環境**
   - AWS CLI v2（設定済み）
   - AWS SAM CLI
   - Python 3.9以上 または Node.js 18.x

### 必要なIAM権限

以下の権限が必要です（事前に確認してください）：

```
- lambda:*
- apigateway:*
- dynamodb:*
- iam:CreateRole, iam:AttachRolePolicy
- cloudformation:*
- s3:* (SAMデプロイ用)
```

---

## トラブルシューティング課題

### 問題1: Lambda関数がDynamoDBにアクセスできない

**症状:**
```
AccessDeniedException: User is not authorized to perform: dynamodb:Scan
```

**ヒント:**
1. Lambda実行ロールのIAMポリシーを確認
2. SAMテンプレートでDynamoDBへのアクセス権限が付与されているか確認

<details>
<summary>解決方法を見る</summary>

SAMテンプレートで `Policies` に `DynamoDBCrudPolicy` を追加：

```yaml
Functions:
  GachaFunction:
    Type: AWS::Serverless::Function
    Properties:
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref RestaurantsTable
```

</details>

### 問題2: API Gatewayで CORS エラー

**症状:**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**ヒント:**
1. API Gatewayのレスポンスヘッダーを確認
2. Lambda関数のレスポンスにCORSヘッダーが含まれているか確認

<details>
<summary>解決方法を見る</summary>

Lambda関数のレスポンスにCORSヘッダーを追加：

```python
return {
    'statusCode': 200,
    'headers': {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
    },
    'body': json.dumps(data)
}
```

</details>

---

## 設計の考察ポイント

### 1. DynamoDBでのランダム取得

**考えてみよう:**
- DynamoDBにはSQLの `ORDER BY RANDOM()` がない。どうやってランダム取得を実現する？
- 全件Scanしてアプリ側でランダム選択するのは効率的？

**代替案:**
- 連番IDを付与して、ランダムな数値でGetItem → 欠番があると取得失敗
- 全件Scanしてランダム選択 → データ量が少なければOK（今回はこれ）
- GSIを使った工夫 → 上級者向け

### 2. API設計: RESTful vs 実用性

**考えてみよう:**
- `/gacha` というエンドポイントはRESTfulと言える？
- 純粋なRESTにこだわるべき？実用性を優先すべき？

---

## 発展課題

### 1. Slack Bot連携
- Slack Appを作成し、`/gacha` コマンドでAPIを呼び出す
- 結果をSlackチャンネルに投稿

### 2. カテゴリ機能追加
- 「和食」「中華」「イタリアン」などのカテゴリを追加
- カテゴリ指定でガチャを回せるようにする

### 3. 履歴機能
- ガチャ結果を履歴テーブルに保存
- 「最近行った店は除外」オプションを追加

---

## 想定コストと削減方法

### 月額概算コスト（チーム15名が毎日利用）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| Lambda | 450リクエスト/月 × 200ms | 無料枠内 |
| API Gateway | 450リクエスト/月 | 無料枠内 |
| DynamoDB | 1GB未満、オンデマンド | 無料枠内 |
| CloudWatch Logs | 1GB未満 | 無料枠内 |
| **合計** | | **$0（無料枠内）** |

### コスト削減のポイント

1. **無料枠の活用**
   - Lambda: 月100万リクエスト無料
   - DynamoDB: 25GBまで無料
   - API Gateway: 12ヶ月間100万リクエスト無料

---

## クリーンアップチェックリスト

演習終了後、以下のリソースを削除してください：

```bash
# SAMでデプロイしたスタックを削除
sam delete --stack-name lunch-gacha-api
```

- [ ] CloudFormationスタック（SAM delete で削除）
- [ ] DynamoDBテーブル（スタックに含まれる）
- [ ] Lambda関数（スタックに含まれる）
- [ ] API Gateway（スタックに含まれる）
- [ ] CloudWatchロググループ（手動削除が必要な場合あり）
- [ ] IAMロール（スタックに含まれる）

---

## 学習のポイント

### 1. サーバーレスの基本構成
API Gateway + Lambda + DynamoDB は、AWSサーバーレスの最も基本的な構成。この構成を理解すれば、多くのユースケースに応用できます。

### 2. SAMによるIaC
手動でリソースを作成するのではなく、SAMテンプレートで定義することで、再現性のあるインフラ構築が可能に。

### 3. DynamoDBの特性理解
RDBとは異なるDynamoDBの特性（パーティションキー、Scan vs Query など）を体感することで、適切なユースケースの判断ができるようになります。

---

## 次のステップ

この演習を終えたら、以下の演習に挑戦してみましょう：

- [課題42: 商品カタログ写真の自動アーカイブ](exercise-42.md) - S3イベント駆動とライフサイクル管理を学ぶ
- [課題2: 旅行予約サイトのサーバーレスAPI基盤](exercise-02.md) - より本格的なサーバーレスAPI構築
