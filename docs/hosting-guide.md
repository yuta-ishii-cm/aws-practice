# VitePress + S3 + CloudFront ホスティング手順書（CDK版）

このドキュメントでは、VitePressで構築した静的サイトをAWS CDKを使ってS3 + CloudFrontでホスティングする手順を説明します。

## 構成図

```
┌─────────────┐     ┌─────────────────────────────┐     ┌─────────────┐
│   ユーザー   │────▶│  CloudFront                 │────▶│     S3      │
│             │     │  d1234abcd.cloudfront.net   │     │  (非公開)   │
└─────────────┘     └─────────────────────────────┘     └─────────────┘
                              │
                              ▼
                    HTTPS証明書は自動付与
```

**特徴:**
- 独自ドメインなし（CloudFrontのデフォルトドメインを使用）
- HTTPS対応（自動）
- S3バケットは非公開（OACでCloudFrontからのみアクセス）
- コスト: ほぼ無料（無料枠内）
- **CDKでインフラをコード管理**

---

## 前提条件

- AWSアカウント
- AWS CLI v2 がインストール済み & 認証設定済み
- Node.js 18以上
- pnpm がインストール済み

```bash
# AWS CLIの確認
aws --version

# Node.jsの確認
node --version

# pnpmの確認
pnpm --version

# AWS CDKのインストール（未インストールの場合）
pnpm add -g aws-cdk
cdk --version
```

---

## 1. VitePressのセットアップ

### 1.1 プロジェクトの初期化

```bash
# プロジェクトルートで実行
pnpm add -D vitepress
```

### 1.2 VitePress設定ファイルの作成

```bash
mkdir -p .vitepress
```

`.vitepress/config.mts` を作成:

```typescript
// .vitepress/config.mts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AWS Practice Exercises',
  description: 'AWS学習用の演習問題集',

  // ソースディレクトリ（exercisesフォルダを使用）
  srcDir: './exercises',

  // ビルド出力先
  outDir: './dist',

  // ベースパス（CloudFrontのルートから配信する場合は '/'）
  base: '/',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Roadmap', link: '/ROADMAP' }
    ],

    sidebar: [
      {
        text: 'はじめに',
        items: [
          { text: 'ロードマップ', link: '/ROADMAP' }
        ]
      },
      {
        text: '演習問題',
        items: [
          { text: 'Exercise 01', link: '/exercise-01' },
          { text: 'Exercise 02', link: '/exercise-02' },
          { text: 'Exercise 03', link: '/exercise-03' },
          // 必要に応じて追加
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-repo' }
    ]
  }
})
```

### 1.3 トップページの作成

`exercises/index.md` を作成（既存のファイルがなければ）:

```markdown
---
layout: home

hero:
  name: AWS Practice Exercises
  text: AWS学習用の演習問題集
  tagline: 実践的なハンズオンでAWSを学ぶ
  actions:
    - theme: brand
      text: ロードマップを見る
      link: /ROADMAP
    - theme: alt
      text: 演習を始める
      link: /exercise-01

features:
  - title: 実践的な演習
    details: 実際のユースケースに基づいた40の演習問題
  - title: ステップバイステップ
    details: 初心者でも迷わない詳細な手順
  - title: 幅広いサービス
    details: EC2、Lambda、S3、RDS、ECSなど主要サービスをカバー
---
```

### 1.4 package.jsonにスクリプトを追加

```json
{
  "scripts": {
    "docs:dev": "vitepress dev",
    "docs:build": "vitepress build",
    "docs:preview": "vitepress preview"
  }
}
```

### 1.5 ローカルで確認

```bash
# 開発サーバー起動
pnpm docs:dev

# http://localhost:5173 で確認
```

### 1.6 ビルド

```bash
pnpm docs:build
```

`dist/` フォルダにビルド成果物が生成されます。

---

## 2. CDKプロジェクトのセットアップ

### 2.1 CDKディレクトリの作成

```bash
mkdir -p iac
cd iac
```

### 2.2 CDKプロジェクトの初期化

```bash
cdk init app --language typescript
```

### 2.3 必要なパッケージをインストール

```bash
pnpm add aws-cdk-lib constructs
```

---

## 3. CDKスタックの作成

### 3.1 スタックファイルを編集

`iac/lib/iac-stack.ts` を以下の内容に書き換えます:

```typescript
// iac/lib/iac-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class IacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3バケットの作成（非公開）
    const bucket = new s3.Bucket(this, 'WebsiteBucket', {
      // バケット名は自動生成（一意性を保証）
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にバケットも削除
      autoDeleteObjects: true, // バケット内のオブジェクトも自動削除
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // パブリックアクセスを完全ブロック
    });

    // CloudFrontディストリビューションの作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        // S3をオリジンとして設定（OACは自動設定される）
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      defaultRootObject: 'index.html',
      // SPA対応: 403/404エラー時にindex.htmlを返す
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(10),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(10),
        },
      ],
      // コスト最適化: 日本・アジア・北米・欧州のエッジロケーションを使用
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
    });

    // 出力: S3バケット名
    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'S3 Bucket Name',
    });

    // 出力: CloudFront URL
    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });

    // 出力: CloudFront Distribution ID（キャッシュ無効化用）
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });
  }
}
```

### 3.2 アプリケーションエントリポイントを確認

`iac/bin/iac.ts` を確認し、リージョンを設定:

```typescript
// iac/bin/iac.ts
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { IacStack } from '../lib/iac-stack';

const app = new cdk.App();
new IacStack(app, 'IacStack', {
  // env を指定しない場合、環境に依存しない汎用テンプレートになります
  // 特定のリージョンを指定する場合は以下をコメントアウト解除:
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-northeast-1' },
});
```

---

## 4. デプロイ

### 4.1 CDK Bootstrap（初回のみ）

CDKを初めて使うリージョンでは、Bootstrap が必要です:

```bash
cd iac
cdk bootstrap
```

### 4.2 差分確認

デプロイ前に変更内容を確認:

```bash
cdk diff
```

### 4.3 デプロイ実行

```bash
cdk deploy
```

デプロイが完了すると、以下の出力が表示されます:

```
Outputs:
IacStack.BucketName = iacstack-websitebucket-xxxxx
IacStack.DistributionUrl = https://d1234abcd.cloudfront.net
IacStack.DistributionId = E1234ABCD
```

### 4.4 コンテンツをS3にアップロード

```bash
# プロジェクトルートに戻る
cd ..

# VitePressをビルド
pnpm docs:build

# S3にアップロード（バケット名は出力された値を使用）
aws s3 sync ./exercises/.vitepress/dist s3://YOUR_BUCKET_NAME --delete
```

**📝 補足**: VitePressの設定によりビルド出力先は `./exercises/.vitepress/dist` となる。

**💡 Tips**: aws-vaultを使用している場合は以下のように実行:
```bash
aws-vault exec default -- aws s3 sync ./exercises/.vitepress/dist s3://YOUR_BUCKET_NAME --delete
```

---

## 5. 動作確認

ブラウザで CloudFront URL にアクセス:

```
https://d1234abcd.cloudfront.net
```

（`d1234abcd` は実際の出力値に置き換え）

---

## 6. コンテンツ更新時の手順

### 6.1 ビルド & アップロード

```bash
# ビルド
pnpm docs:build

# S3にアップロード
aws s3 sync ./exercises/.vitepress/dist s3://YOUR_BUCKET_NAME --delete

# CloudFrontキャッシュを無効化
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

**💡 Tips**: aws-vaultを使用している場合:
```bash
aws-vault exec default -- aws s3 sync ./exercises/.vitepress/dist s3://YOUR_BUCKET_NAME --delete
aws-vault exec default -- aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### 6.2 デプロイスクリプト（推奨）

`scripts/deploy.sh` を作成:

```bash
#!/bin/bash
set -e

# CDKの出力から値を取得
STACK_NAME="IacStack"
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text)

echo "Bucket: $BUCKET_NAME"
echo "Distribution: $DISTRIBUTION_ID"

echo "Building..."
pnpm docs:build

echo "Uploading to S3..."
aws s3 sync ./exercises/.vitepress/dist s3://$BUCKET_NAME --delete

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "Done! Site will be updated in a few minutes."
```

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## 7. クリーンアップ（削除する場合）

CDKなら1コマンドでリソースを削除できます:

```bash
cd iac
cdk destroy
```

確認プロンプトが表示されるので `y` を入力すると、S3バケット・CloudFrontディストリビューション・OACがすべて削除されます。

---

## コスト目安

| サービス | 月額目安 |
|---------|---------|
| S3 | 〜$0.01（数MB） |
| CloudFront | 無料枠内（月1TB転送まで） |
| **合計** | **ほぼ$0** |

---

## トラブルシューティング

### cdk deploy でエラーが出る

1. AWS CLIの認証情報が設定されているか確認:
   ```bash
   aws sts get-caller-identity
   ```
2. `cdk bootstrap` を実行済みか確認

### 403 Access Deniedエラー

1. S3にファイルがアップロードされているか確認:
   ```bash
   aws s3 ls s3://YOUR_BUCKET_NAME
   ```
2. CloudFrontのデプロイが完了しているか確認（初回は5〜15分かかる）

### ページが見つからない (404)

1. S3にファイルが正しくアップロードされているか確認
2. VitePressのビルドが成功しているか確認

### 更新が反映されない

1. キャッシュ無効化を実行
2. 無効化の完了を待つ（1〜2分）
3. ブラウザのキャッシュもクリア

---

## 参考リンク

- [VitePress 公式ドキュメント](https://vitepress.dev/)
- [AWS CDK ドキュメント](https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/home.html)
- [aws-cdk-lib.aws_cloudfront module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront-readme.html)
- [Amazon S3 ユーザーガイド](https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/userguide/)
- [Amazon CloudFront 開発者ガイド](https://docs.aws.amazon.com/ja_jp/AmazonCloudFront/latest/DeveloperGuide/)
