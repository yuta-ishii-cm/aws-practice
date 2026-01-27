import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class IacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3バケットの作成（非公開）
    const bucket = new s3.Bucket(this, 'WebsiteBucket', {
      // バケット名は自動生成（一意性を保証）
      // スタック削除時にバケットも削除
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
      // バケット内のオブジェクトも自動削除
      autoDeleteObjects: true, 
       // パブリックアクセスを完全ブロック
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // SSLを強制
      enforceSSL: true,

    });

    // ACM証明書ARNをSSM Parameter Storeから取得（us-east-1で作成済み）
    const certificateArn = ssm.StringParameter.valueForStringParameter(
      this,
      '/aws-practice/certificate-arn'
    );
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      certificateArn
    );

    // CloudFrontディストリビューションの作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      // カスタムドメイン設定
      domainNames: ['aws-practice.work-yi.com'],
      certificate: certificate,
      defaultBehavior: {
        // S3をオリジンとして設定（OACは自動設定される）
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        // HTTPSリダイレクト
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // キャッシュポリシー
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        // gzip圧縮
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