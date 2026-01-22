# 課題6: LearnHub株式会社の動画教材自動字幕生成システム構築

**難易度: 🟢 初級〜中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | AI / メディア処理 / EdTech |
| 処理タイプ | バッチ / 非同期 |
| 使用IaC | CloudFormation |
| 所要時間 | 5〜6時間 |

---

## シナリオ

### 企業プロフィール

**LearnHub株式会社**は、プログラミング・IT技術に特化したオンライン学習プラットフォームを運営するEdTechスタートアップです。

| 項目 | 内容 |
|------|------|
| 業種 | EdTech（オンライン教育） |
| 設立 | 2020年 |
| 従業員数 | 25名 |
| 月間アクティブ視聴者 | 3万人 |
| 登録ユーザー | 10万人 |
| 動画コンテンツ数 | 500本（総時間300時間） |
| 平均動画長 | 36分 |
| 月商 | 2,500万円 |
| 講師数 | 30名（外部委託含む） |

### 現状の課題

海外展開を進めるため、既存の日本語動画コンテンツに多言語字幕を追加したいが、外注費用と時間がかかりすぎています。また、聴覚障害者向けのアクセシビリティ対応も求められています。

### 数値で示された問題

| 指標 | 現状 | 目標 |
|------|------|------|
| 字幕付き動画比率 | 20%（日本語のみ） | 100%（日英中） |
| 字幕作成コスト | 15,000円/時間 | 3,000円/時間以下 |
| 字幕作成リードタイム | 2週間 | 24時間以内 |
| 多言語対応言語数 | 日本語のみ | 日本語・英語・中国語 |
| 月間新規動画 | 20本 | - |
| 字幕外注費 | 月90万円 | 月20万円以下 |

### 現状の字幕作成フロー

```
1. 動画を外部字幕制作会社に送付
2. 制作会社が文字起こし（3-5日）
3. 内容確認・修正依頼（2-3日）
4. 翻訳発注（3-5日）
5. 翻訳確認・修正（2-3日）
6. VTT/SRTファイル納品
7. 動画プレイヤーへ統合
→ 合計: 2-3週間
```

### 解決したいこと

1. 動画の音声からの自動文字起こし（日本語）
2. 日本語字幕の自動生成（タイムスタンプ付き）
3. 英語・中国語への自動翻訳
4. 字幕ファイル（VTT形式）の自動生成
5. 生成された字幕の品質向上（AI校正）

### 成功指標（KPI）

| KPI | 現状 | 目標 | 達成期限 |
|-----|------|------|----------|
| 字幕カバー率 | 20% | 100% | 3ヶ月後 |
| 文字起こし精度 | - | 95%以上 | 1ヶ月後 |
| 字幕作成時間 | 2週間 | 24時間以内 | 1ヶ月後 |
| コスト削減率 | - | 70%以上 | 3ヶ月後 |
| 海外ユーザー増加 | - | +30% | 6ヶ月後 |

---

## 達成目標

この演習で習得できるスキル：

### 技術的な学習ポイント

1. **Amazon Transcribeの実践活用**
   - 音声からの自動文字起こし
   - 日本語モデルの活用
   - カスタムボキャブラリー設定

2. **Amazon Translateの実践活用**
   - 多言語翻訳
   - 用語集（Terminology）の活用
   - バッチ翻訳処理

3. **Amazon Bedrockによる品質向上**
   - 字幕の校正・修正
   - 文脈を考慮した翻訳改善

4. **メディアパイプラインの構築**
   - S3イベント駆動
   - Lambda + SQSによる非同期処理
   - VTT/SRT形式の生成

### 実務で活かせる知識

- 音声処理パイプラインの設計
- 多言語対応システムの構築
- メディアファイル処理の自動化

### GCPとの比較

| 機能 | AWS | GCP |
|------|-----|-----|
| 音声認識 | Amazon Transcribe | Speech-to-Text |
| 翻訳 | Amazon Translate | Cloud Translation |
| 生成AI | Bedrock | Vertex AI |
| メディア処理 | MediaConvert | Transcoder API |

---

## 使用するAWSサービス

### メインサービス

| サービス | 役割 | 選定理由 |
|----------|------|----------|
| Amazon Transcribe | 音声→テキスト変換 | 日本語対応、字幕形式出力 |
| Amazon Translate | 多言語翻訳 | リアルタイム翻訳、用語集対応 |
| Amazon Bedrock | 字幕校正・品質向上 | 文脈理解、自然な表現 |
| AWS Lambda | 各処理の実行 | サーバーレス |
| Amazon S3 | 動画・字幕ファイル保存 | 大容量対応 |
| Amazon SQS | 非同期処理キュー | 順序制御、リトライ |

### 補助サービス

| サービス | 役割 |
|----------|------|
| Amazon DynamoDB | 処理ステータス管理 |
| Amazon SNS | 処理完了通知 |
| Amazon CloudWatch | 監視・ログ |

---

## 前提条件

### 必要な事前知識

- AWSの基本操作（S3, Lambda）
- Python基礎
- 字幕フォーマット（VTT/SRT）の基本理解

### 準備するもの

1. **AWSアカウント**
   - Bedrock有効化（Claude 3 Haiku推奨）
   - Transcribe/Translate アクセス権限

2. **開発環境**
   - AWS CLI v2
   - Python 3.9以上

3. **テストデータ**
   - サンプル動画ファイル（MP4, 5-10分）
   - または音声ファイル（MP3/WAV）

---

## アーキテクチャ概要

### システム全体構成

```
[講師が動画アップロード]
        ↓
[S3: 動画入力バケット]
        ↓ S3イベント
[SQS: 処理キュー]
        ↓
[Lambda: transcribe-starter]
        ↓
[Amazon Transcribe]（非同期ジョブ）
        ↓ 完了イベント
[Lambda: transcribe-callback]
        ↓
[S3: 日本語字幕JSON保存]
        ↓
[Lambda: translator]
        ├── Amazon Translate（英語）
        └── Amazon Translate（中国語）
        ↓
[Lambda: vtt-generator]
        ├── Bedrock（字幕校正）
        └── VTT/SRTファイル生成
        ↓
[S3: 字幕出力バケット]
        ↓
[SNS: 完了通知]
```

### 字幕生成フロー

1. **動画アップロード**: S3にMP4をアップロード
2. **音声抽出**: Transcribeが自動で音声を認識
3. **文字起こし**: 日本語テキスト+タイムスタンプ生成
4. **翻訳**: Translateで英語・中国語に翻訳
5. **校正**: Bedrockで字幕の品質向上
6. **出力**: VTT形式で3言語分の字幕ファイル生成
7. **通知**: 処理完了をメール通知

---

## トラブルシューティング課題

### 問題1: Transcribeジョブが失敗

**症状:**
```
TranscriptionJobStatus: FAILED
FailureReason: "The media format provided does not match the detected media format."
```

**ヒント:**
1. ファイル拡張子と実際のフォーマットが一致しているか確認
2. サポートされているフォーマットか確認（MP3, MP4, WAV, FLAC等）
3. ファイルが破損していないか確認

**解決方法:**
```python
# Lambda内でファイル形式を自動検出
import mimetypes

def get_media_format(key):
    extension = key.split('.')[-1].lower()
    format_map = {
        'mp4': 'mp4',
        'mp3': 'mp3',
        'wav': 'wav',
        'm4a': 'mp4',
        'flac': 'flac'
    }
    return format_map.get(extension, 'mp4')
```

### 問題2: 翻訳結果が不自然

**症状:**
```
技術用語が一般的な意味で翻訳される
プログラミング用語が変な日本語になる
```

**ヒント:**
1. Amazon Translateの用語集（Terminology）を活用
2. Bedrockの校正プロンプトを調整
3. カスタムボキャブラリーを設定

**解決方法:**
```python
# 用語集の使用
def translate_with_terminology(text, source_lang, target_lang, terminology_names):
    response = translate.translate_text(
        Text=text,
        SourceLanguageCode=source_lang,
        TargetLanguageCode=target_lang,
        TerminologyNames=terminology_names
    )
    return response['TranslatedText']

# 用語集の例（事前にCSVでアップロード）
# en,ja
# Lambda,Lambda
# API Gateway,API Gateway
# serverless,サーバーレス
```

### 問題3: 字幕のタイミングがずれる

**症状:**
```
音声と字幕が同期していない
特に翻訳後の字幕で顕著
```

**ヒント:**
1. VTTパース時にタイムスタンプが正しく保持されているか
2. 翻訳で文が長くなりすぎていないか
3. セグメント分割が適切か

**解決方法:**
```python
# 長すぎる字幕を分割
MAX_CHARS_PER_LINE = 40

def split_long_subtitle(text, max_chars=MAX_CHARS_PER_LINE):
    if len(text) <= max_chars:
        return text

    # 適切な位置で改行
    words = text.split()
    lines = []
    current_line = []

    for word in words:
        if len(' '.join(current_line + [word])) <= max_chars:
            current_line.append(word)
        else:
            lines.append(' '.join(current_line))
            current_line = [word]

    if current_line:
        lines.append(' '.join(current_line))

    return '\n'.join(lines)
```

---

## 設計の考察ポイント

### 1. なぜTranscribeの標準字幕出力を使わないのか？

**考察ポイント:**
- Transcribeの標準VTT出力 vs カスタム処理
- 翻訳を挟む必要性
- 品質向上のためのカスタマイズ余地

### 2. Bedrockによる校正は必要か？

**考察ポイント:**
- Amazon Translateの品質
- 追加コストと品質向上のトレードオフ
- 処理時間への影響

### 3. 同期処理 vs 非同期処理の選択

**考察ポイント:**
- Transcribeは非同期のみ
- 翻訳は同期/非同期どちらも可能
- ユーザー体験とシステム設計のバランス

### 4. カスタムボキャブラリーの運用

**考察ポイント:**
- 技術用語の一貫性
- 更新頻度と管理方法
- 講師ごとの専門用語対応

### 5. 字幕品質のモニタリング

**考察ポイント:**
- 自動評価の方法
- 人間によるサンプリング確認
- フィードバックループの設計

---

## 発展課題（オプション）

### 1. リアルタイム字幕（ライブ配信対応）
- Amazon Transcribe Streamingの活用
- WebSocketによるリアルタイム配信
- 遅延最小化の工夫

### 2. 話者分離（Speaker Diarization）
- 複数講師の動画対応
- 話者ラベルの自動付与
- 対話形式コンテンツへの対応

### 3. 字幕エディターUIの構築
- Webベースの字幕編集ツール
- タイムライン表示
- 修正→再生成のワークフロー

### 4. 品質スコアリング
- 文字起こし精度の自動評価
- WER（Word Error Rate）計測
- 低品質字幕の自動フラグ

### 5. 対応言語の拡大
- 韓国語、スペイン語等の追加
- 言語自動検出
- 多言語プレイリスト対応

---

## 想定コストと削減方法

### 月額概算コスト（月20本×平均36分処理想定）

| サービス | 内訳 | 月額コスト |
|----------|------|------------|
| Amazon Transcribe | 20本 × 36分 = 720分 | $17 |
| Amazon Translate | 720分 × 2言語 × 約2000文字 | $30 |
| Amazon Bedrock (Haiku) | 720分 × 2言語 × 50セグメント | $5 |
| AWS Lambda | 処理時間合計 | $2 |
| Amazon S3 | 動画+字幕保存 | $5 |
| Amazon DynamoDB | オンデマンド | $1 |
| Amazon SQS | メッセージ | $0.01 |
| Amazon SNS | 通知 | $0.01 |
| CloudWatch | ログ | $3 |
| **合計** | | **約$63（約9,500円）** |

### コスト削減のポイント

1. **Transcribeの効率化**
   - 同じ動画の再処理を避ける（キャッシング）
   - 短い動画は結合して処理

2. **翻訳の最適化**
   - 繰り返しフレーズのキャッシュ
   - バッチ翻訳API（大量処理時）

3. **Bedrock校正の選択的適用**
   - 全セグメントではなく長いセグメントのみ
   - Claude 3 Haikuの使用（Sonnetより安価）

4. **S3ライフサイクル**
   - 古い中間ファイルの自動削除
   - Intelligent-Tieringの活用

### リソース削除手順

```bash
# S3バケット内容削除
aws s3 rm s3://learnhub-videos-input-${ACCOUNT_ID} --recursive
aws s3 rm s3://learnhub-subtitles-output-${ACCOUNT_ID} --recursive

# S3バケット削除
aws s3 rb s3://learnhub-videos-input-${ACCOUNT_ID}
aws s3 rb s3://learnhub-subtitles-output-${ACCOUNT_ID}

# DynamoDBテーブル削除
aws dynamodb delete-table --table-name learnhub-subtitle-jobs

# SQSキュー削除
aws sqs delete-queue --queue-url https://sqs.${AWS_REGION}.amazonaws.com/${ACCOUNT_ID}/learnhub-subtitle-queue

# SNSトピック削除
aws sns delete-topic --topic-arn arn:aws:sns:${AWS_REGION}:${ACCOUNT_ID}:learnhub-subtitle-notifications

# EventBridgeルール削除
aws events remove-targets --rule learnhub-transcribe-complete --ids 1
aws events delete-rule --name learnhub-transcribe-complete

# Lambda関数削除
aws lambda delete-function --function-name learnhub-transcribe-starter
aws lambda delete-function --function-name learnhub-transcribe-callback
aws lambda delete-function --function-name learnhub-translator-vtt-generator

# CloudFormation スタック削除
aws cloudformation delete-stack --stack-name learnhub-subtitle-iam
```

---

## 学習のポイント

### 1. メディア処理パイプラインの設計
Transcribe（音声認識）→ Translate（翻訳）→ カスタム処理の流れは、メディア処理の典型パターン。各サービスの特性（同期/非同期、制限）を理解して設計する。

### 2. 非同期処理の設計
Transcribeのような長時間ジョブは必然的に非同期になる。EventBridgeでジョブ完了イベントをキャッチし、後続処理につなげるパターンを習得する。

### 3. 多言語対応の考慮点
翻訳品質は用語集（Terminology）やカスタムボキャブラリーで大きく向上する。技術コンテンツでは特に重要。

### 4. 字幕フォーマットの理解
VTT/SRT形式の構造を理解し、パース・生成ができるようになる。タイムスタンプの精度が視聴体験に直結する。

### 5. AI校正による品質向上
機械翻訳の結果をLLMで校正する「翻訳後編集（Post-editing）」パターン。コストと品質のバランスを取りながら、実用的な品質を実現する。
