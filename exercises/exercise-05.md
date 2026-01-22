# 課題5: 社内イベント管理システム - ECS + RDS で作るコンテナアプリケーション

**難易度: 🟡 中級**

---

## 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | コンテナ / データベース |
| 処理タイプ | リアルタイム |
| 使用IaC | CloudFormation |
| 想定所要時間 | 5〜6時間 |

---

## 学習するAWSサービス

この演習では以下のAWSサービスを実践的に学習します。

### メインサービス

| サービス | 役割 | 学習ポイント |
|----------|------|-------------|
| **Amazon ECS (Fargate)** | コンテナ実行環境 | タスク定義、サービス、クラスター |
| **Amazon RDS (PostgreSQL)** | リレーショナルDB | インスタンス作成、セキュリティグループ、接続 |
| **Amazon VPC** | ネットワーク基盤 | パブリック/プライベートサブネット設計 |
| **AWS Secrets Manager** | DB認証情報管理 | シークレット作成、ローテーション |

### 補助サービス

| サービス | 役割 |
|----------|------|
| **Application Load Balancer** | HTTPトラフィック分散 |
| **Amazon ECR** | コンテナイメージ保存 |
| **Amazon CloudWatch** | ログ・メトリクス監視 |
| **AWS IAM** | サービス間の権限管理 |

---

## 最終構成図

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group vpc(cloud)[VPC 10.0.0.0/16] in aws
    group public(server)[Public Subnets] in vpc
    group private(server)[Private Subnets] in vpc
    group data(database)[Data Layer] in vpc

    service user(internet)[社員ユーザー]
    service alb(server)[Application Load Balancer] in public
    service nat(server)[NAT Gateway] in public
    service ecs(server)[ECS Fargate イベント管理アプリ] in private
    service rds(database)[RDS PostgreSQL] in data
    service secrets(server)[Secrets Manager] in aws
    service ecr(disk)[ECR コンテナイメージ] in aws

    user:R --> L:alb
    alb:B --> T:ecs
    ecs:R --> L:rds
    ecs:R --> L:secrets
    ecs:B --> T:nat
    ecr:B --> T:ecs
```

### ネットワーク構成

| サブネット | CIDR | 用途 | リソース |
|------------|------|------|----------|
| Public Subnet 1a | 10.0.1.0/24 | インターネット接続 | ALB, NAT Gateway |
| Public Subnet 1c | 10.0.2.0/24 | インターネット接続 | ALB |
| Private Subnet 1a | 10.0.11.0/24 | アプリケーション | ECS Tasks |
| Private Subnet 1c | 10.0.12.0/24 | アプリケーション | ECS Tasks |
| Private Subnet 1a (DB) | 10.0.21.0/24 | データベース | RDS Primary |
| Private Subnet 1c (DB) | 10.0.22.0/24 | データベース | RDS Standby |

---

## シナリオ

### 企業プロフィール

**〇〇株式会社**は、社員100名規模のIT企業です。勉強会、懇親会、部活動などの社内イベントが活発ですが、イベント管理がSlackとスプレッドシートに分散しており、情報が整理されていません。

| 項目 | 内容 |
|------|------|
| 業種 | IT / SaaS |
| 従業員数 | 100名 |
| 月間イベント数 | 15〜20件 |
| 管理方法 | Slack + スプレッドシート（散在） |

### 現状の課題

「あのイベントいつだっけ？」「参加者誰だっけ？」がSlackの検索で埋もれてしまう。スプレッドシートは誰かが作るが、更新されなかったり、どれが最新かわからなくなる。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| イベント情報の検索時間 | 5分 | 10秒 |
| 参加登録の手間 | Slack返信 + 手動集計 | ワンクリック |
| イベント一覧の把握 | 困難 | 一目で把握 |

### 解決したいこと

1. 社内イベントを一元管理したい
2. イベントの作成・参加登録を簡単にしたい
3. 過去のイベント履歴も検索できるようにしたい
4. モダンな技術スタック（コンテナ）で構築したい

### 成功指標（KPI）

| KPI | 現状 | 目標 |
|-----|------|------|
| イベント登録率 | 50%（把握できてない） | 100% |
| 情報検索時間 | 5分 | 10秒 |
| システム稼働率 | - | 99.9% |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **ECS Fargateの基本**
   - タスク定義の作成
   - サービスの設定
   - ALB との統合
   - オートスケーリング

2. **RDSの基本**
   - PostgreSQL インスタンスの作成
   - サブネットグループの設定
   - セキュリティグループによるアクセス制御
   - 接続文字列の管理

3. **VPCネットワーク設計**
   - パブリック/プライベートサブネットの使い分け
   - NAT Gateway の役割
   - セキュリティグループの設計

4. **Secrets Managerによる認証情報管理**
   - シークレットの作成
   - ECSタスクからの参照
   - 自動ローテーション（オプション）

### 実務で活かせる知識

- コンテナベースのWebアプリケーション構成
- セキュアなデータベース接続パターン
- 本番レベルのネットワーク設計

---

## 前提条件

### 必要な事前知識

- Dockerの基本（Dockerfile, docker build, docker run）
- SQLの基本（SELECT, INSERT, UPDATE, DELETE）
- REST APIの基本概念

### 準備するもの

1. **AWSアカウント**
   - VPC、ECS、RDS、ALBの利用権限

2. **開発環境**
   - AWS CLI v2（設定済み）
   - Docker Desktop
   - お好みのプログラミング言語（Python/Node.js/Go等）

3. **サンプルアプリケーション**
   - 簡単なCRUD Webアプリ（提供 or 自作）

### 必要なIAM権限

以下の権限が必要です（事前に確認してください）：

```
- ec2:* (VPC関連)
- ecs:*
- ecr:*
- rds:*
- elasticloadbalancing:*
- secretsmanager:*
- iam:CreateRole, iam:AttachRolePolicy
- logs:*
```

---

## アプリケーション仕様

### 機能一覧

| 機能 | 説明 |
|------|------|
| イベント一覧 | 開催予定のイベントを一覧表示 |
| イベント作成 | 新しいイベントを作成 |
| イベント詳細 | イベントの詳細と参加者を表示 |
| 参加登録 | イベントに参加登録 |
| 参加キャンセル | 参加登録のキャンセル |

### API設計

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /events | イベント一覧取得 |
| POST | /events | イベント作成 |
| GET | /events/{id} | イベント詳細取得 |
| PUT | /events/{id} | イベント更新 |
| DELETE | /events/{id} | イベント削除 |
| POST | /events/{id}/join | 参加登録 |
| DELETE | /events/{id}/join | 参加キャンセル |

### データベーススキーマ

```sql
-- イベントテーブル
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date TIMESTAMP NOT NULL,
    location VARCHAR(200),
    max_participants INT,
    organizer VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 参加者テーブル
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_name)
);
```

---

## トラブルシューティング課題

### 問題1: ECSタスクがRDSに接続できない

**症状:**
```
Connection refused to database
FATAL: no pg_hba.conf entry for host
```

**ヒント:**
1. セキュリティグループの設定を確認
2. RDSのセキュリティグループがECSからの5432ポートを許可しているか
3. ECSタスクが正しいサブネットで起動しているか

<details>
<summary>解決方法を見る</summary>

1. RDSのセキュリティグループでインバウンドルールを確認：
   - タイプ: PostgreSQL
   - ポート: 5432
   - ソース: ECSタスクのセキュリティグループID

2. ECSタスクがプライベートサブネットで起動していることを確認。

3. VPCのルートテーブルで、プライベートサブネットからNAT Gateway経由でインターネットにアクセスできることを確認（ECRからのイメージプルに必要）。

</details>

### 問題2: ECSタスクが起動しない

**症状:**
```
STOPPED (CannotPullContainerError)
ResourceInitializationError: unable to pull secrets
```

**ヒント:**
1. ECRリポジトリにイメージが存在するか確認
2. タスク実行ロールにECRへのアクセス権限があるか
3. Secrets Managerへのアクセス権限があるか

<details>
<summary>解決方法を見る</summary>

タスク実行ロールに以下のポリシーが必要：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:your-secret-*"
    }
  ]
}
```

</details>

### 問題3: ALBのヘルスチェックが失敗する

**症状:**
```
ECSサービスのタスクが起動してもすぐに停止される
ターゲットグループのヘルスステータスが unhealthy
```

**ヒント:**
1. ヘルスチェックパスが正しいか
2. アプリケーションが指定ポートでリッスンしているか
3. ヘルスチェックの猶予期間が十分か

<details>
<summary>解決方法を見る</summary>

1. ターゲットグループのヘルスチェック設定：
   - パス: `/health` または `/` （アプリに合わせる）
   - 正常しきい値: 2
   - 非正常しきい値: 5
   - タイムアウト: 5秒
   - 間隔: 30秒

2. ECSサービスのヘルスチェック猶予期間を設定（アプリ起動に時間がかかる場合）：
   - healthCheckGracePeriodSeconds: 60

3. アプリケーションが正しいポート（例: 8080）でリッスンしていることを確認。

</details>

---

## 設計の考察ポイント

### 1. なぜFargateを選ぶか

**考えてみよう:**
- EC2でコンテナを動かす場合と何が違う？
- Fargateのメリット・デメリットは？

**比較:**
| 項目 | ECS on EC2 | ECS on Fargate |
|------|------------|----------------|
| サーバー管理 | 必要 | 不要 |
| スケーリング | インスタンス単位 | タスク単位 |
| コスト | 予約で安くなる | 従量課金のみ |
| 起動速度 | 速い（既存インスタンス） | やや遅い |

### 2. RDSをプライベートサブネットに置く理由

**考えてみよう:**
- パブリックサブネットに置いたらどうなる？
- セキュリティグループだけで守れないの？

**理由:**
- 多層防御の原則（ネットワーク + SG）
- 誤設定リスクの軽減
- コンプライアンス要件

### 3. Secrets Managerを使う理由

**考えてみよう:**
- 環境変数に直接パスワードを書いたらダメ？
- Parameter Store との違いは？

**メリット:**
- 認証情報の一元管理
- 自動ローテーション
- 監査ログ

---

## 発展課題

### 1. オートスケーリングの設定
- CPU使用率に基づくスケーリング
- スケジュールベースのスケーリング（イベント前に増強）

### 2. CI/CDパイプラインの構築
- GitHub Actions / CodePipeline
- イメージのビルド → ECRプッシュ → ECSデプロイ

### 3. RDSのMulti-AZ構成
- 高可用性構成への変更
- フェイルオーバーテスト

### 4. CloudFrontの追加
- 静的アセットのキャッシュ
- カスタムドメインとSSL証明書

---

## 想定コストと削減方法

### 月額概算コスト（最小構成）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| ECS Fargate | 0.25 vCPU / 0.5GB × 1タスク × 720時間 | $9 |
| RDS PostgreSQL | db.t3.micro × 720時間 | $15 |
| ALB | 1 ALB + 処理データ | $20 |
| NAT Gateway | 1 NAT × 720時間 + データ処理 | $35 |
| ECR | 1GB | $0.10 |
| Secrets Manager | 1シークレット | $0.40 |
| CloudWatch Logs | 1GB | $0.50 |
| **合計** | | **約$80（約12,000円）** |

### コスト削減のポイント

1. **NAT Gatewayの最適化**
   - VPCエンドポイントの活用（ECR, Secrets Manager）
   - 開発環境ではNATインスタンス検討

2. **RDSの最適化**
   - 開発環境は停止スケジュール設定
   - 本番以外はSingle-AZ

3. **Fargateの最適化**
   - Fargate Spot の活用（開発環境）
   - 適切なリソースサイジング

---

## クリーンアップチェックリスト

演習終了後、以下のリソースを**必ず**削除してください（特にNAT GatewayとRDSは課金が続きます）：

```bash
# 削除順序が重要！依存関係に注意

# 1. ECSサービスを0にスケールダウン
aws ecs update-service --cluster your-cluster --service your-service --desired-count 0

# 2. ECSサービス削除
aws ecs delete-service --cluster your-cluster --service your-service --force

# 3. ALB削除（ターゲットグループも）
aws elbv2 delete-load-balancer --load-balancer-arn your-alb-arn

# 4. RDS削除（スナップショット不要なら --skip-final-snapshot）
aws rds delete-db-instance --db-instance-identifier your-db --skip-final-snapshot

# 5. NAT Gateway削除
aws ec2 delete-nat-gateway --nat-gateway-id your-nat-id

# 6. ECSクラスター削除
aws ecs delete-cluster --cluster your-cluster

# 7. VPC削除（依存リソースを先に削除）
# サブネット、IGW、ルートテーブルなど

# 8. ECRリポジトリ削除
aws ecr delete-repository --repository-name your-repo --force

# 9. Secrets Manager（即時削除）
aws secretsmanager delete-secret --secret-id your-secret --force-delete-without-recovery
```

- [ ] ECSサービス・クラスター
- [ ] Application Load Balancer・ターゲットグループ
- [ ] RDSインスタンス・サブネットグループ
- [ ] **NAT Gateway**（課金注意！）
- [ ] VPC・サブネット・IGW
- [ ] ECRリポジトリ
- [ ] Secrets Manager シークレット
- [ ] CloudWatchロググループ
- [ ] IAMロール・ポリシー

---

## 学習のポイント

### 1. コンテナ + RDS は王道パターン
Webアプリケーションの構成として、ECS (Fargate) + RDS は最もよく使われるパターンの一つ。この構成を理解すれば、多くの実案件に応用できます。

### 2. ネットワーク設計の重要性
VPC、サブネット、セキュリティグループの設計は、セキュリティとコストに直結。パブリック/プライベートの使い分けを理解することが重要。

### 3. 認証情報の適切な管理
パスワードをハードコードしない。Secrets Manager や Parameter Store を使って、安全に認証情報を管理する習慣をつける。

---

## 次のステップ

この演習を終えたら、以下の演習に挑戦してみましょう：

- [課題11: スタートアップのコンテナCI/CD構築](exercise-11.md) - CI/CDパイプラインの構築
- [課題38: SaaS企業のマルチテナント基盤](exercise-38.md) - より高度なECS構成（RDS Proxy活用）
