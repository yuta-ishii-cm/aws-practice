# カスタムドメイン設定手順（CloudFront + ACM）

CloudFrontでカスタムドメインを使用するための設定手順です。

## 背景

Security Hub の **CloudFront.7** 準拠のため、カスタムSSL/TLS証明書が必要。

## 前提条件

- CloudFront ディストリビューションが作成済み
- カスタムドメインを所有している
- ドメインのDNS管理画面にアクセスできる

## 設定情報

| 項目 | 値 |
|------|-----|
| ドメイン | `aws-practice.work-yi.com` |
| DNS管理 | Squarespace Domains |
| 証明書ARN | `arn:aws:acm:us-east-1:758876371399:certificate/6a3805fc-62e8-4b26-98e4-07a33cb65a0c` |
| CloudFrontドメイン | `dma7yq41g4cww.cloudfront.net` |

---

## 手順

### Step 1: ACM証明書をリクエスト（us-east-1）

CloudFrontで使用する証明書は **us-east-1** で発行する必要がある。

```bash
aws acm request-certificate \
  --domain-name "aws-practice.work-yi.com" \
  --validation-method DNS \
  --region us-east-1
```

### Step 2: DNS検証レコードを取得

```bash
aws acm describe-certificate \
  --certificate-arn "<証明書ARN>" \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

### Step 3: DNS検証用CNAMEレコードを追加

DNS管理サービス（Squarespace Domains等）で以下を追加:

| 項目 | 値 |
|------|-----|
| タイプ | CNAME |
| ホスト | `_xxxxx.aws-practice`（ACMが発行した値） |
| データ | `_xxxxx.acm-validations.aws.`（ACMが発行した値） |
| TTL | デフォルト |

**📝 補足**: ホスト名からドメイン部分（`.work-yi.com.`）は省略する。

**⚠️ 注意**: このDNS検証用レコードは**削除しないこと**。ACMが証明書を自動更新する際に使用する。

### Step 4: 証明書のステータスを確認

```bash
aws acm describe-certificate \
  --certificate-arn "<証明書ARN>" \
  --region us-east-1 \
  --query 'Certificate.Status'
```

`"ISSUED"` になるまで待つ（数分〜30分程度）。

---

### Step 5: CDKコードを修正

`iac/lib/iac-stack.ts` に以下を追加:

```typescript
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

// ... 既存のコード ...

// 既存のACM証明書を参照（us-east-1で作成済み）
const certificate = acm.Certificate.fromCertificateArn(
  this,
  'Certificate',
  '<証明書ARN>'
);

// CloudFrontディストリビューションにドメインと証明書を追加
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  // カスタムドメイン設定
  domainNames: ['aws-practice.work-yi.com'],
  certificate: certificate,
  defaultBehavior: {
    // ... 既存の設定 ...
  },
  // ... その他の設定 ...
});
```

### Step 6: デプロイ

```bash
cd iac
cdk diff
cdk deploy
```

### Step 7: CloudFront用CNAMEレコードを追加

デプロイ後、DNS管理サービスで以下を追加:

| 項目 | 値 |
|------|-----|
| タイプ | CNAME |
| ホスト | `aws-practice` |
| データ | `dma7yq41g4cww.cloudfront.net` |

### Step 8: 動作確認

```bash
curl -I https://aws-practice.work-yi.com
```

---

## aws-vault設定（MFAセッションキャッシュ）

MFA入力を毎回行わないようにするため、aws-vaultを設定する。

### インストール

```bash
brew install aws-vault
```

### ~/.aws/config の設定

```ini
# デフォルト（認証情報 + スイッチロール）
[default]
region = ap-northeast-1
role_arn = arn:aws:iam::<ターゲットアカウントID>:role/<ロール名>
mfa_serial = arn:aws:iam::<IAMユーザーアカウントID>:mfa/<MFAデバイス名>

# 他のプロファイル
[profile other-env]
region = ap-northeast-1
role_arn = arn:aws:iam::<別アカウントID>:role/<ロール名>
source_profile = default
mfa_serial = arn:aws:iam::<IAMユーザーアカウントID>:mfa/<MFAデバイス名>
```

### 認証情報の登録

```bash
aws-vault add default
# Access Key ID、Secret Access Key、MFA Device ARNを入力
```

### ~/.aws/credentials を削除

aws-vaultがキーチェーンで管理するため、credentialsファイルは不要。

```bash
rm ~/.aws/credentials
```

### 使い方

```bash
# 初回はMFA入力が必要（セッション有効中は不要）
aws-vault exec default -- aws sts get-caller-identity
aws-vault exec default -- cdk deploy
aws-vault exec default -- aws s3 sync ./dist s3://<バケット名>
```

---

## 参考リンク

- [CloudFront でカスタムSSL証明書を使用する](https://docs.aws.amazon.com/ja_jp/AmazonCloudFront/latest/DeveloperGuide/using-https-alternate-domain-names.html)
- [ACM 証明書のDNS検証](https://docs.aws.amazon.com/ja_jp/acm/latest/userguide/dns-validation.html)
- [aws-vault](https://github.com/99designs/aws-vault)
