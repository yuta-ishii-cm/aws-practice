# aws-practice
AWS学習要検証課題集

## デプロイ先

https://aws-practice.work-yi.com/

## セットアップ

```bash
# 依存関係のインストール
pnpm install

# CDKの依存関係インストール
cd iac && pnpm install
```

## デプロイコマンド

### インフラ（CDK）

```bash
# 差分確認
aws-vault exec default -- pnpm --filter iac cdk diff

# デプロイ
aws-vault exec default -- pnpm --filter iac cdk deploy
```

### サイトコンテンツ（S3同期）

```bash
# VitePressビルド
pnpm docs:build

# S3にアップロード（バケット名は cdk deploy の出力を確認）
aws-vault exec default -- aws s3 sync .vitepress/dist s3://<バケット名> --delete

# CloudFrontキャッシュ無効化（Distribution IDは cdk deploy の出力を確認）
aws-vault exec default -- aws cloudfront create-invalidation --distribution-id <Distribution ID> --paths "/*"
```
