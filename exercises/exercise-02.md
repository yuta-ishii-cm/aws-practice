# 課題2: 旅行予約サイトのサーバーレスAPI基盤

**難易度: 🟢 初級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級 |
| カテゴリ | マイクロサービス・API |
| 処理タイプ | 非同期 |
| 使用IaC | SAM |
| 想定所要時間 | 4-5時間 |

---

## 2. シナリオ

### 企業プロフィール
**TravelHub株式会社**は、ホテルと航空券を組み合わせたパッケージ旅行の予約サービスを提供しています。日次約10万リクエストを処理し、ゴールデンウィークや年末年始にはピーク時5倍のトラフィックが発生します。

### 現状の課題
既存のモノリシックなAPIサーバーでは、ピーク時の対応に問題が発生しています：

1. **スケーリングの遅延**：EC2のオートスケーリングに5-10分かかる
2. **コスト非効率**：通常時もピーク対応用のキャパシティを維持
3. **検索のレイテンシ**：複数の外部APIを順次呼び出しており、応答が遅い
4. **キャッシュ効率の悪さ**：同一検索が繰り返されているが、毎回外部APIを叩いている

### 数値で見る問題
- 通常時リクエスト数：**10万件/日**（平均 1.2 req/sec）
- ピーク時リクエスト数：**50万件/日**（平均 6 req/sec、瞬間最大 50 req/sec）
- 検索API応答時間：**平均 3秒**（外部API呼び出し含む）
- インフラコスト：**月額 $3,000**（常時稼働EC2）
- ピーク時のエラー率：**5%**

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 検索API応答時間 | 3秒 | 1秒以内 |
| ピーク時エラー率 | 5% | 0.1%以下 |
| インフラコスト | $3,000/月 | $1,000/月 |
| スケーリング時間 | 5-10分 | 即時 |

---

## 3. 学習目標

### 主要な学習成果
1. API GatewayとLambdaによるサーバーレスAPI構築
2. DynamoDBを使った高速な検索結果キャッシュ
3. 非同期処理による外部API呼び出しの並列化
4. SAMを使ったサーバーレスアプリケーションのIaC

### 習得するスキル
- API Gateway REST APIの設計とセットアップ
- Lambda関数の最適化（コールドスタート対策、メモリ設定）
- DynamoDB の設計パターン（GSI、TTL）
- SAM テンプレートの記述方法

---

## 4. 使用するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| API Gateway | REST API エンドポイント | 高 |
| Lambda | ビジネスロジック実行 | 高 |
| DynamoDB | 検索結果キャッシュ、予約データ | 高 |
| ElastiCache (Redis) | セッション管理 | 中 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| CloudWatch | ログ・メトリクス |
| X-Ray | 分散トレーシング |
| Secrets Manager | API キー管理 |
| WAF | API 保護 |
| CloudFront | API キャッシング |

---

## 5. 前提条件

### 必要な知識
- REST APIの基本概念
- Python または Node.js の基礎
- DynamoDBの基本操作

### 事前準備
1. AWSアカウント
2. AWS CLI v2
3. AWS SAM CLI
4. Python 3.11 または Node.js 18.x

### 環境要件
```bash
# SAM CLIインストール
pip install aws-sam-cli

# バージョン確認
sam --version  # 1.90.0以上
```

---

## 6. アーキテクチャ概要

### システム構成図

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]
    group edge(server)[Edge Layer] in aws
    group api(server)[API Layer] in aws
    group data(database)[Data Layer] in aws
    group async(server)[Async Processing] in aws
    group external(cloud)[External APIs]

    service cloudfront(server)[CloudFront API Caching & WAF] in edge
    service apigw(server)[API Gateway] in api

    service lambda_hotel(server)[Lambda HotelSearch] in api
    service lambda_flight(server)[Lambda FlightSearch] in api
    service lambda_booking(server)[Lambda CreateBooking] in api
    service lambda_get(server)[Lambda GetBooking] in api

    service dynamo_cache(database)[DynamoDB SearchCache TTL 5min] in data
    service dynamo_booking(database)[DynamoDB Bookings] in data

    service hotel_api(server)[Hotel API Partner] in external
    service airline_api(server)[Airline API Partner] in external

    service sqs(server)[SQS BookingConfirmation] in async
    service lambda_confirm(server)[Lambda ProcessConfirmation] in async
    service ses(server)[SES Email Send] in async

    cloudfront:B --> T:apigw
    apigw:B --> T:lambda_hotel
    apigw:B --> T:lambda_flight
    apigw:B --> T:lambda_booking
    apigw:B --> T:lambda_get
    lambda_hotel:B --> T:dynamo_cache
    lambda_flight:B --> T:dynamo_cache
    lambda_booking:B --> T:dynamo_booking
    lambda_get:B --> T:dynamo_booking
    dynamo_cache:R --> L:hotel_api
    dynamo_cache:R --> L:airline_api
    lambda_booking:R --> L:sqs
    sqs:B --> T:lambda_confirm
    lambda_confirm:B --> T:ses
```

### API エンドポイント設計

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /hotels/search | ホテル検索 |
| GET | /hotels/{hotelId} | ホテル詳細取得 |
| GET | /flights/search | フライト検索 |
| GET | /flights/{flightId} | フライト詳細取得 |
| POST | /bookings | 予約作成 |
| GET | /bookings/{bookingId} | 予約詳細取得 |
| DELETE | /bookings/{bookingId} | 予約キャンセル |

---

## 8. トラブルシューティング課題

### Challenge 1: Lambda コールドスタートが遅い
**状況**: 初回リクエストで3秒以上のレイテンシが発生

**調査ポイント**:
1. CloudWatch Logs で Init Duration を確認
2. Lambda のメモリサイズを確認
3. 依存パッケージのサイズを確認

**解決策**:
```yaml
# Provisioned Concurrency の設定
HotelSearchFunction:
  Type: AWS::Serverless::Function
  Properties:
    # ... 既存の設定 ...
    ProvisionedConcurrencyConfig:
      ProvisionedConcurrentExecutions: 5
```

### Challenge 2: DynamoDB の読み取り容量超過
**状況**: ピーク時に `ProvisionedThroughputExceededException` が発生

**調査ポイント**:
1. CloudWatch で ConsumedReadCapacityUnits を確認
2. ホットパーティションの有無を確認
3. キャッシュヒット率を確認

### Challenge 3: 外部API呼び出しタイムアウト
**状況**: パートナーAPIの応答が遅く、Lambdaがタイムアウト

**調査ポイント**:
1. X-Ray でボトルネックを特定
2. 各外部APIの応答時間を確認
3. 並列呼び出しが正しく動作しているか確認

---

## 9. 設計考慮ポイント

### ディスカッション1: キャッシュ戦略
**テーマ**: TTL設定とキャッシュ無効化

| パターン | メリット | デメリット |
|----------|----------|------------|
| 短いTTL（1-5分） | 鮮度が高い | キャッシュヒット率低下 |
| 長いTTL（30分以上） | ヒット率向上 | 古いデータを返すリスク |
| 明示的無効化 | 精度が高い | 実装が複雑 |

### ディスカッション2: API Gateway vs ALB + Lambda
**テーマ**: エントリーポイントの選択

| 観点 | API Gateway | ALB + Lambda |
|------|-------------|--------------|
| コスト（高トラフィック） | 高い | 安い |
| 機能 | 豊富（認証、スロットリング等） | 基本的 |
| WebSocket | 対応 | 非対応 |

### ディスカッション3: 同期 vs 非同期処理
**テーマ**: 予約確定処理のパターン

**選択肢**:
1. **完全同期**: 予約→決済→確認メールを1リクエストで
2. **部分非同期**: 予約→決済は同期、確認メールは非同期
3. **Saga パターン**: 全処理を非同期で、補償トランザクション

---

## 10. 発展課題

### Advanced 1: GraphQL API への移行
**課題**: AppSync を使って GraphQL API を構築し、クライアントが必要なデータのみを取得

### Advanced 2: リアルタイム価格更新
**課題**: WebSocket API と DynamoDB Streams を使って、価格変動をリアルタイムにクライアントへプッシュ

### Advanced 3: マルチリージョン対応
**課題**: Route 53 ヘルスチェックと DynamoDB Global Tables を使った災害対策

---

## 11. コスト見積もり

### 月額コスト概算

| サービス | 使用量 | 月額コスト |
|----------|--------|------------|
| API Gateway | 300万リクエスト | $10.50 |
| Lambda | 300万リクエスト × 500ms × 256MB | $6.25 |
| DynamoDB (SearchCache) | 10GB + 300万WCU + 300万RCU | $50 |
| DynamoDB (Bookings) | 5GB + 10万WCU + 50万RCU | $15 |
| SQS | 50万メッセージ | $0.20 |
| CloudWatch Logs | 10GB | $5 |
| X-Ray | 100万トレース | $5 |
| WAF | 1 WebACL + 300万リクエスト | $8 |

**合計**: 約 **$100/月**（約15,000円）

**従来構成との比較**: $3,000 → $100（約97%削減）

### コスト削減のヒント

1. **Provisioned Concurrencyの最適化**: 本当に必要な時間帯のみ設定
2. **DynamoDB On-demand**: 予測可能なトラフィックならProvisioned Mode
3. **Lambda メモリ最適化**: Power Tuning で最適なメモリサイズを特定

---

## 12. 学習のポイント

### 重要な概念の整理

1. **サーバーレスの特性**
   - 自動スケーリング
   - 従量課金
   - コールドスタート

2. **DynamoDBキャッシュパターン**
   - TTLによる自動削除
   - 一貫性のトレードオフ
   - パーティションキー設計

3. **非同期処理のメリット**
   - レスポンス時間の短縮
   - 障害の分離
   - リトライの容易さ

### GCPとの比較

| 概念 | AWS | GCP |
|------|-----|-----|
| API Gateway | API Gateway | Cloud Endpoints / API Gateway |
| サーバーレス関数 | Lambda | Cloud Functions |
| NoSQL DB | DynamoDB | Firestore / Bigtable |
| メッセージキュー | SQS | Cloud Tasks / Pub/Sub |
| WAF | WAF | Cloud Armor |

### 次のステップ
1. 認証・認可の追加（Cognito）
2. キャッシュ層の追加（CloudFront、ElastiCache）
3. CI/CD パイプラインの構築
