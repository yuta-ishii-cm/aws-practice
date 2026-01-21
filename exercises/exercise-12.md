# 課題12: ゲーム会社のマルチ環境管理

**難易度: 🟢 初級〜中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 初級〜中級 |
| カテゴリ | IaC・DevOps |
| 処理タイプ | バッチ |
| 使用IaC | CDK |
| 想定所要時間 | 5-6時間 |

---

## 2. シナリオ

### 企業プロフィール
**GameStudio株式会社**は、モバイルゲームを開発・運営する企業です。主力タイトルは DAU（Daily Active Users）30万人を誇り、継続的なアップデートでユーザーを獲得しています。

### 現状の課題
急成長に伴い、インフラ管理が追いついていません：

1. **環境間の差異**：dev/stg/prodで設定が微妙に異なり、本番リリース時にトラブル発生
2. **手動デプロイのリスク**：本番環境へのデプロイは手動で実施、ヒューマンエラーのリスク
3. **インフラ変更の追跡困難**：誰がいつ何を変更したか分からない
4. **スケーリング対応の遅れ**：イベント時の負荷対応が後手に回る

### 数値で見る問題
- 環境差異によるリリース失敗：月 **3件**
- 手動デプロイ時間：1回あたり **2時間**
- 本番インシデント（設定ミス起因）：四半期 **5件**
- イベント時の緊急スケーリング対応：月 **4回**（各30分）

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| 環境差異起因のリリース失敗 | 3件/月 | 0件/月 |
| デプロイ時間 | 2時間 | 15分 |
| 設定ミス起因のインシデント | 5件/四半期 | 1件以下/四半期 |
| スケーリング対応時間 | 30分 | 自動化 |

---

## 3. 学習目標

### 主要な学習成果
1. AWS CDKによる型安全なインフラ定義の習得
2. CodePipelineを使った自動デプロイパイプラインの構築
3. 環境別パラメータ管理とStage分離の実践
4. Application Auto Scalingの設定方法

### 習得するスキル
- CDK Constructsの設計と実装
- cdk diff / cdk deploy の活用
- CodePipelineのステージ構成
- 承認フロー付きデプロイの実装
- Parameter Store / Secrets Manager連携

---

## 4. 使用するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| AWS CDK | インフラのコード化 | 高 |
| CodePipeline | CI/CDパイプライン | 高 |
| CodeBuild | ビルド・テスト実行 | 高 |
| ECS Fargate | ゲームAPIサーバー実行 | 高 |
| Aurora Serverless v2 | ゲームデータベース | 高 |
| ElastiCache (Redis) | セッション・キャッシュ | 中 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| ECR | コンテナイメージ保存 |
| ALB | ロードバランシング |
| CloudWatch | ログ・メトリクス・アラーム |
| SNS | デプロイ通知 |
| SSM Parameter Store | 環境別パラメータ管理 |
| Secrets Manager | DB認証情報管理 |

---

## 5. 前提条件

### 必要な知識
- TypeScriptの基本文法
- AWSの基本サービス理解（VPC、ECS、RDS）
- Dockerの基本操作

### 事前準備
1. AWSアカウント
2. Node.js v18以上
3. AWS CLI v2
4. Docker Desktop
5. VS Code + AWS Toolkit拡張機能

### 環境要件
```bash
# CDKインストール
npm install -g aws-cdk

# バージョン確認
cdk --version  # 2.x 以上
```

---

## 6. アーキテクチャ概要

### システム構成図

```mermaid
architecture-beta
    group pipeline(cloud)[CodePipeline]
    group dev_env(cloud)[Development]
    group stg_env(cloud)[Staging]
    group prod_env(cloud)[Production]

    service source(server)[Source GitHub] in pipeline
    service build(server)[Build CodeBuild] in pipeline
    service dev_deploy(server)[Dev Deploy] in pipeline
    service stg_deploy(server)[Stg Deploy Manual Approve] in pipeline
    service prod_deploy(server)[Prod Deploy Manual Approve] in pipeline

    service dev_alb(server)[ALB] in dev_env
    service dev_ecs(server)[ECS Fargate 1 task] in dev_env
    service dev_aurora(database)[Aurora Serverless 0.5 ACU] in dev_env
    service dev_redis(database)[ElastiCache Redis] in dev_env

    service stg_alb(server)[ALB] in stg_env
    service stg_ecs(server)[ECS Fargate 2 tasks] in stg_env
    service stg_aurora(database)[Aurora Serverless 1 ACU] in stg_env
    service stg_redis(database)[ElastiCache Redis] in stg_env

    service prod_alb(server)[ALB] in prod_env
    service prod_ecs(server)[ECS Fargate 4-20 tasks] in prod_env
    service prod_aurora(database)[Aurora Serverless 2-16 ACU] in prod_env
    service prod_redis(database)[ElastiCache Redis] in prod_env

    source:R --> L:build
    build:R --> L:dev_deploy
    dev_deploy:R --> L:stg_deploy
    stg_deploy:R --> L:prod_deploy

    dev_deploy:B --> T:dev_alb
    dev_alb:B --> T:dev_ecs
    dev_ecs:B --> T:dev_aurora
    dev_ecs:B --> T:dev_redis

    stg_deploy:B --> T:stg_alb
    stg_alb:B --> T:stg_ecs
    stg_ecs:B --> T:stg_aurora
    stg_ecs:B --> T:stg_redis

    prod_deploy:B --> T:prod_alb
    prod_alb:B --> T:prod_ecs
    prod_ecs:B --> T:prod_aurora
    prod_ecs:B --> T:prod_redis
```

### 環境別構成

| 項目 | Development | Staging | Production |
|------|-------------|---------|------------|
| ECS タスク数 | 1 | 2 | 4-20 (Auto Scaling) |
| Aurora ACU | 0.5 | 1 | 2-16 (Auto Scaling) |
| Redis ノード | cache.t3.micro | cache.t3.small | cache.r6g.large |
| デプロイ承認 | 不要 | 必要 | 必要（2名） |

---

## 7. ハンズオン手順

### Phase 1: CDKプロジェクト初期設定（30分）

#### Step 1-1: プロジェクト作成

```bash
# プロジェクトディレクトリ作成
mkdir gamestudio-infra && cd gamestudio-infra

# CDKプロジェクト初期化
cdk init app --language typescript

# 必要なパッケージインストール
npm install @aws-cdk/aws-ec2 @aws-cdk/aws-ecs @aws-cdk/aws-ecs-patterns \
  @aws-cdk/aws-rds @aws-cdk/aws-elasticache @aws-cdk/aws-codepipeline \
  @aws-cdk/aws-codepipeline-actions @aws-cdk/aws-codebuild
```

#### Step 1-2: ディレクトリ構造

```
gamestudio-infra/
├── bin/
│   └── app.ts                    # エントリーポイント
├── lib/
│   ├── constructs/               # 再利用可能なConstructs
│   │   ├── game-api.ts
│   │   ├── database.ts
│   │   └── cache.ts
│   ├── stages/
│   │   └── game-stage.ts         # 環境Stageの定義
│   ├── stacks/
│   │   ├── network-stack.ts      # VPC
│   │   ├── database-stack.ts     # Aurora + Redis
│   │   ├── application-stack.ts  # ECS
│   │   └── pipeline-stack.ts     # CodePipeline
│   └── config/
│       └── environments.ts       # 環境別設定
├── test/
├── cdk.json
├── package.json
└── tsconfig.json
```

### Phase 2: 環境別設定の定義（30分）

#### Step 2-1: 環境設定ファイル

```typescript
// lib/config/environments.ts
export interface EnvironmentConfig {
  readonly envName: string;
  readonly account: string;
  readonly region: string;
  readonly vpc: {
    readonly cidr: string;
    readonly maxAzs: number;
  };
  readonly ecs: {
    readonly cpu: number;
    readonly memory: number;
    readonly desiredCount: number;
    readonly minCapacity: number;
    readonly maxCapacity: number;
  };
  readonly aurora: {
    readonly minCapacity: number;
    readonly maxCapacity: number;
  };
  readonly redis: {
    readonly nodeType: string;
    readonly numCacheNodes: number;
  };
  readonly requireApproval: boolean;
  readonly approvers?: string[];
}

export const environments: Record<string, EnvironmentConfig> = {
  dev: {
    envName: 'dev',
    account: process.env.CDK_DEFAULT_ACCOUNT!,
    region: 'ap-northeast-1',
    vpc: {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
    },
    ecs: {
      cpu: 256,
      memory: 512,
      desiredCount: 1,
      minCapacity: 1,
      maxCapacity: 2,
    },
    aurora: {
      minCapacity: 0.5,
      maxCapacity: 1,
    },
    redis: {
      nodeType: 'cache.t3.micro',
      numCacheNodes: 1,
    },
    requireApproval: false,
  },
  stg: {
    envName: 'stg',
    account: process.env.CDK_DEFAULT_ACCOUNT!,
    region: 'ap-northeast-1',
    vpc: {
      cidr: '10.1.0.0/16',
      maxAzs: 2,
    },
    ecs: {
      cpu: 512,
      memory: 1024,
      desiredCount: 2,
      minCapacity: 2,
      maxCapacity: 4,
    },
    aurora: {
      minCapacity: 1,
      maxCapacity: 2,
    },
    redis: {
      nodeType: 'cache.t3.small',
      numCacheNodes: 1,
    },
    requireApproval: true,
    approvers: ['stg-deployers@gamestudio.example.com'],
  },
  prod: {
    envName: 'prod',
    account: process.env.CDK_DEFAULT_ACCOUNT!,
    region: 'ap-northeast-1',
    vpc: {
      cidr: '10.2.0.0/16',
      maxAzs: 3,
    },
    ecs: {
      cpu: 1024,
      memory: 2048,
      desiredCount: 4,
      minCapacity: 4,
      maxCapacity: 20,
    },
    aurora: {
      minCapacity: 2,
      maxCapacity: 16,
    },
    redis: {
      nodeType: 'cache.r6g.large',
      numCacheNodes: 2,
    },
    requireApproval: true,
    approvers: ['prod-deployers@gamestudio.example.com'],
  },
};
```

### Phase 3: Constructsの実装（60分）

#### Step 3-1: ネットワークスタック

```typescript
// lib/stacks/network-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface NetworkStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const { config } = props;

    // VPC
    this.vpc = new ec2.Vpc(this, 'GameVpc', {
      vpcName: `gamestudio-${config.envName}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr(config.vpc.cidr),
      maxAzs: config.vpc.maxAzs,
      natGateways: config.envName === 'prod' ? config.vpc.maxAzs : 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // VPC Flow Logs
    this.vpc.addFlowLog('FlowLog', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(),
      trafficType: ec2.FlowLogTrafficType.REJECT,
    });

    // Output
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      exportName: `${config.envName}-VpcId`,
    });
  }
}
```

#### Step 3-2: データベーススタック

```typescript
// lib/stacks/database-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface DatabaseStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  readonly vpc: ec2.IVpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly dbCluster: rds.IDatabaseCluster;
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly dbSecurityGroup: ec2.ISecurityGroup;
  public readonly redisCluster: elasticache.CfnCacheCluster;
  public readonly redisSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config, vpc } = props;

    // Aurora Security Group
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      securityGroupName: `gamestudio-${config.envName}-db-sg`,
      description: 'Security group for Aurora',
      allowAllOutbound: true,
    });

    // DB Credentials
    this.dbSecret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: `gamestudio/${config.envName}/db-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'gameadmin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // Aurora Serverless v2
    this.dbCluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      clusterIdentifier: `gamestudio-${config.envName}`,
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      defaultDatabaseName: 'gamedb',
      serverlessV2MinCapacity: config.aurora.minCapacity,
      serverlessV2MaxCapacity: config.aurora.maxCapacity,
      writer: rds.ClusterInstance.serverlessV2('writer', {
        publiclyAccessible: false,
      }),
      readers: config.envName === 'prod' ? [
        rds.ClusterInstance.serverlessV2('reader', {
          scaleWithWriter: true,
        }),
      ] : undefined,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [this.dbSecurityGroup],
      backup: {
        retention: cdk.Duration.days(config.envName === 'prod' ? 35 : 7),
      },
      deletionProtection: config.envName === 'prod',
      removalPolicy: config.envName === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Redis Security Group
    this.redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      securityGroupName: `gamestudio-${config.envName}-redis-sg`,
      description: 'Security group for Redis',
      allowAllOutbound: true,
    });

    // Redis Subnet Group
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      subnetIds: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }).subnetIds,
      description: `Redis subnet group for ${config.envName}`,
      cacheSubnetGroupName: `gamestudio-${config.envName}-redis`,
    });

    // Redis Cluster
    this.redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      clusterName: `gamestudio-${config.envName}-redis`,
      engine: 'redis',
      cacheNodeType: config.redis.nodeType,
      numCacheNodes: config.redis.numCacheNodes,
      cacheSubnetGroupName: redisSubnetGroup.cacheSubnetGroupName,
      vpcSecurityGroupIds: [this.redisSecurityGroup.securityGroupId],
      engineVersion: '7.0',
      port: 6379,
    });

    this.redisCluster.addDependency(redisSubnetGroup);

    // Outputs
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.dbCluster.clusterEndpoint.hostname,
      exportName: `${config.envName}-DbEndpoint`,
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.redisCluster.attrRedisEndpointAddress,
      exportName: `${config.envName}-RedisEndpoint`,
    });
  }
}
```

#### Step 3-3: アプリケーションスタック

```typescript
// lib/stacks/application-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface ApplicationStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  readonly vpc: ec2.IVpc;
  readonly dbSecurityGroup: ec2.ISecurityGroup;
  readonly dbSecret: secretsmanager.ISecret;
  readonly dbEndpoint: string;
  readonly redisSecurityGroup: ec2.ISecurityGroup;
  readonly redisEndpoint: string;
}

export class ApplicationStack extends cdk.Stack {
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly ecrRepository: ecr.IRepository;

  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    const {
      config, vpc, dbSecurityGroup, dbSecret,
      dbEndpoint, redisSecurityGroup, redisEndpoint
    } = props;

    // ECR Repository（既存を参照またはインポート）
    this.ecrRepository = ecr.Repository.fromRepositoryName(
      this,
      'GameApiRepo',
      'gamestudio/game-api'
    );

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: `gamestudio-${config.envName}`,
      vpc,
      containerInsights: true,
    });

    // Log Group
    const logGroup = new logs.LogGroup(this, 'AppLogGroup', {
      logGroupName: `/ecs/gamestudio/${config.envName}/game-api`,
      retention: config.envName === 'prod'
        ? logs.RetentionDays.ONE_YEAR
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Fargate Service with ALB
    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'GameApiService',
      {
        cluster,
        serviceName: `gamestudio-${config.envName}-game-api`,
        cpu: config.ecs.cpu,
        memoryLimitMiB: config.ecs.memory,
        desiredCount: config.ecs.desiredCount,
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(
            this.ecrRepository,
            'latest'
          ),
          containerPort: 8080,
          environment: {
            ENV: config.envName,
            DB_HOST: dbEndpoint,
            DB_PORT: '5432',
            DB_NAME: 'gamedb',
            REDIS_HOST: redisEndpoint,
            REDIS_PORT: '6379',
          },
          secrets: {
            DB_USERNAME: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
            DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
          },
          logDriver: ecs.LogDrivers.awsLogs({
            logGroup,
            streamPrefix: 'game-api',
          }),
        },
        publicLoadBalancer: true,
        circuitBreaker: {
          rollback: true,
        },
      }
    );

    // Security Group Rules
    this.service.service.connections.allowTo(
      dbSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow connection to Aurora'
    );

    this.service.service.connections.allowTo(
      redisSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow connection to Redis'
    );

    // Health Check
    this.service.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // Auto Scaling
    const scaling = this.service.service.autoScaleTaskCount({
      minCapacity: config.ecs.minCapacity,
      maxCapacity: config.ecs.maxCapacity,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // CloudWatch Alarms
    new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      alarmName: `gamestudio-${config.envName}-high-cpu`,
      metric: this.service.service.metricCpuUtilization(),
      threshold: 80,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
      alarmName: `gamestudio-${config.envName}-high-error-rate`,
      metric: this.service.targetGroup.metrics.httpCodeTarget(
        ecs.HttpCodeTarget.TARGET_5XX_COUNT,
        { period: cdk.Duration.minutes(5) }
      ),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.service.loadBalancer.loadBalancerDnsName,
      exportName: `${config.envName}-AlbDns`,
    });

    new cdk.CfnOutput(this, 'ServiceArn', {
      value: this.service.service.serviceArn,
      exportName: `${config.envName}-ServiceArn`,
    });
  }
}
```

### Phase 4: CI/CDパイプライン構築（60分）

#### Step 4-1: パイプラインスタック

```typescript
// lib/stacks/pipeline-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { environments, EnvironmentConfig } from '../config/environments';

export interface PipelineStackProps extends cdk.StackProps {
  readonly repositoryOwner: string;
  readonly repositoryName: string;
  readonly branch: string;
  readonly connectionArn: string;  // CodeStar Connection ARN
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const { repositoryOwner, repositoryName, branch, connectionArn } = props;

    // ECR Repository
    const ecrRepo = new ecr.Repository(this, 'GameApiRepo', {
      repositoryName: 'gamestudio/game-api',
      imageScanOnPush: true,
      lifecycleRules: [
        {
          maxImageCount: 10,
          rulePriority: 1,
          tagStatus: ecr.TagStatus.ANY,
        },
      ],
    });

    // SNS Topic for Notifications
    const notificationTopic = new sns.Topic(this, 'DeployNotifications', {
      topicName: 'gamestudio-deploy-notifications',
    });

    // Subscribe approvers
    environments.prod.approvers?.forEach(email => {
      notificationTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(email)
      );
    });

    // Source Artifact
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // CodeBuild Project for Docker Build
    const dockerBuildProject = new codebuild.PipelineProject(this, 'DockerBuild', {
      projectName: 'gamestudio-docker-build',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,  // Docker build requires privileged mode
        computeType: codebuild.ComputeType.MEDIUM,
      },
      environmentVariables: {
        AWS_ACCOUNT_ID: {
          value: this.account,
        },
        ECR_REPO_URI: {
          value: ecrRepo.repositoryUri,
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com',
              'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
              'IMAGE_TAG=${COMMIT_HASH:=latest}',
            ],
          },
          build: {
            commands: [
              'echo Build started on `date`',
              'echo Building the Docker image...',
              'docker build -t $ECR_REPO_URI:latest .',
              'docker tag $ECR_REPO_URI:latest $ECR_REPO_URI:$IMAGE_TAG',
            ],
          },
          post_build: {
            commands: [
              'echo Build completed on `date`',
              'echo Pushing the Docker images...',
              'docker push $ECR_REPO_URI:latest',
              'docker push $ECR_REPO_URI:$IMAGE_TAG',
              'printf \'{"ImageURI":"%s"}\' $ECR_REPO_URI:$IMAGE_TAG > imageDetail.json',
            ],
          },
        },
        artifacts: {
          files: ['imageDetail.json', 'appspec.yaml', 'taskdef.json'],
        },
      }),
    });

    // Grant ECR permissions
    ecrRepo.grantPullPush(dockerBuildProject);

    // CodeBuild Project for CDK Deploy
    const cdkDeployProject = (envName: string) => new codebuild.PipelineProject(
      this,
      `CdkDeploy${envName}`,
      {
        projectName: `gamestudio-cdk-deploy-${envName}`,
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
          computeType: codebuild.ComputeType.SMALL,
        },
        environmentVariables: {
          ENV_NAME: { value: envName },
        },
        buildSpec: codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              commands: [
                'npm install -g aws-cdk',
                'npm ci',
              ],
            },
            build: {
              commands: [
                'cdk deploy GameStudio-${ENV_NAME}-* --require-approval never',
              ],
            },
          },
        }),
      }
    );

    // Grant CDK deploy permissions
    const cdkDeployRole = (project: codebuild.PipelineProject) => {
      project.addToRolePolicy(new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: ['arn:aws:iam::*:role/cdk-*'],
      }));
      project.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'cloudformation:*',
          'ecs:*',
          'ec2:*',
          'elasticloadbalancing:*',
          'logs:*',
          'ecr:*',
          'iam:*',
          'secretsmanager:*',
          'ssm:*',
        ],
        resources: ['*'],
      }));
    };

    const devDeployProject = cdkDeployProject('dev');
    const stgDeployProject = cdkDeployProject('stg');
    const prodDeployProject = cdkDeployProject('prod');

    cdkDeployRole(devDeployProject);
    cdkDeployRole(stgDeployProject);
    cdkDeployRole(prodDeployProject);

    // Pipeline
    const pipeline = new codepipeline.Pipeline(this, 'GamePipeline', {
      pipelineName: 'gamestudio-game-api',
      crossAccountKeys: false,
    });

    // Source Stage
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipeline_actions.CodeStarConnectionsSourceAction({
          actionName: 'GitHub_Source',
          owner: repositoryOwner,
          repo: repositoryName,
          branch: branch,
          output: sourceOutput,
          connectionArn: connectionArn,
        }),
      ],
    });

    // Build Stage
    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'Docker_Build',
          project: dockerBuildProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    // Dev Deploy Stage
    pipeline.addStage({
      stageName: 'Deploy_Dev',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'CDK_Deploy_Dev',
          project: devDeployProject,
          input: sourceOutput,
        }),
      ],
    });

    // Staging Approval and Deploy
    pipeline.addStage({
      stageName: 'Approve_Stg',
      actions: [
        new codepipeline_actions.ManualApprovalAction({
          actionName: 'Approve_Staging',
          notificationTopic,
          additionalInformation: 'Staging環境へのデプロイを承認してください',
        }),
      ],
    });

    pipeline.addStage({
      stageName: 'Deploy_Stg',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'CDK_Deploy_Stg',
          project: stgDeployProject,
          input: sourceOutput,
        }),
      ],
    });

    // Production Approval and Deploy
    pipeline.addStage({
      stageName: 'Approve_Prod',
      actions: [
        new codepipeline_actions.ManualApprovalAction({
          actionName: 'Approve_Production',
          notificationTopic,
          additionalInformation: '本番環境へのデプロイを承認してください（要2名承認）',
        }),
      ],
    });

    pipeline.addStage({
      stageName: 'Deploy_Prod',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'CDK_Deploy_Prod',
          project: prodDeployProject,
          input: sourceOutput,
        }),
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'PipelineArn', {
      value: pipeline.pipelineArn,
    });

    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: ecrRepo.repositoryUri,
    });
  }
}
```

### Phase 5: CDKアプリケーションのエントリーポイント（30分）

#### Step 5-1: メインアプリケーション

```typescript
// bin/app.ts
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/stacks/network-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { ApplicationStack } from '../lib/stacks/application-stack';
import { PipelineStack } from '../lib/stacks/pipeline-stack';
import { environments } from '../lib/config/environments';

const app = new cdk.App();

// Get target environment from context or default to 'dev'
const targetEnv = app.node.tryGetContext('env') || 'dev';

// Deploy environment-specific stacks
for (const [envName, config] of Object.entries(environments)) {
  // Skip if not target environment (for individual deploy)
  // Comment out for full deployment
  // if (targetEnv !== 'all' && envName !== targetEnv) continue;

  const envProps = {
    env: {
      account: config.account,
      region: config.region,
    },
  };

  // Network Stack
  const networkStack = new NetworkStack(
    app,
    `GameStudio-${envName}-Network`,
    {
      ...envProps,
      config,
    }
  );

  // Database Stack
  const databaseStack = new DatabaseStack(
    app,
    `GameStudio-${envName}-Database`,
    {
      ...envProps,
      config,
      vpc: networkStack.vpc,
    }
  );
  databaseStack.addDependency(networkStack);

  // Application Stack
  const appStack = new ApplicationStack(
    app,
    `GameStudio-${envName}-Application`,
    {
      ...envProps,
      config,
      vpc: networkStack.vpc,
      dbSecurityGroup: databaseStack.dbSecurityGroup,
      dbSecret: databaseStack.dbSecret,
      dbEndpoint: databaseStack.dbCluster.clusterEndpoint.hostname,
      redisSecurityGroup: databaseStack.redisSecurityGroup,
      redisEndpoint: databaseStack.redisCluster.attrRedisEndpointAddress,
    }
  );
  appStack.addDependency(databaseStack);
}

// Pipeline Stack (deploy once)
new PipelineStack(app, 'GameStudio-Pipeline', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-northeast-1',
  },
  repositoryOwner: 'gamestudio',
  repositoryName: 'game-api',
  branch: 'main',
  connectionArn: 'arn:aws:codestar-connections:ap-northeast-1:ACCOUNT:connection/XXXX',
});

app.synth();
```

#### Step 5-2: デプロイコマンド

```bash
# CDK Bootstrap（初回のみ）
cdk bootstrap aws://ACCOUNT_ID/ap-northeast-1

# 差分確認
cdk diff GameStudio-dev-*

# 開発環境のみデプロイ
cdk deploy GameStudio-dev-* --context env=dev

# 全環境デプロイ（通常はパイプライン経由）
cdk deploy --all

# パイプラインスタックのデプロイ
cdk deploy GameStudio-Pipeline
```

---

## 8. トラブルシューティング課題

### Challenge 1: CDK Diffが予期せぬ変更を検出
**状況**: リソースを変更していないのに、cdk diffで大量の変更が表示される

```
[-] AWS::ECS::Service GameApiService/Service
[+] AWS::ECS::Service GameApiService/Service

Resources
[~] AWS::ECS::Service GameApiService/Service ...
 └─ [~] TaskDefinition
     └─ [~] .Fn::Join:
         └─ @@ -1,6 +1,6 @@
```

**調査ポイント**:
1. CDK/AWS SDK のバージョン差異
2. Context値の違い（cdk.context.json）
3. Logical IDの変更

**解決手順**:
```bash
# contextをリセット
rm cdk.context.json
cdk synth

# バージョンを固定
npm install aws-cdk-lib@2.100.0 --save-exact
```

### Challenge 2: ECS タスクがヘルスチェックに失敗
**状況**: デプロイ後、タスクが起動するが即座に停止する

**調査ポイント**:
1. CloudWatch Logsでアプリケーションログを確認
2. ターゲットグループのヘルスチェック設定
3. セキュリティグループのルール

**解決コマンド例**:
```bash
# タスクの停止理由を確認
aws ecs describe-tasks --cluster gamestudio-dev \
  --tasks $(aws ecs list-tasks --cluster gamestudio-dev --desired-status STOPPED --query 'taskArns[0]' --output text) \
  --query 'tasks[0].stoppedReason'
```

### Challenge 3: Aurora Serverless v2のスケーリングが間に合わない
**状況**: 急激な負荷増加時にデータベース接続エラーが発生

**調査ポイント**:
1. ACUの最小/最大設定を確認
2. CloudWatchでACU使用率を監視
3. スケーリング速度の限界を理解

---

## 9. 設計考慮ポイント

### ディスカッション1: CDK vs Terraform
**テーマ**: IaCツールの選定基準

| 観点 | CDK | Terraform |
|------|-----|-----------|
| 学習コスト | プログラミング経験者なら低い | HCL学習が必要 |
| 型安全性 | TypeScriptで高い | terraform validate依存 |
| マルチクラウド | AWS特化 | 対応 |
| 抽象化レベル | 高い（Constructs） | 低い（宣言的） |
| チーム規模 | 小〜中規模向け | 大規模向け |

### ディスカッション2: 環境分離戦略
**テーマ**: 同一アカウント内分離 vs アカウント分離

**選択肢**:
1. **同一アカウント・VPC分離**: シンプルだがセキュリティ境界が弱い
2. **同一アカウント・名前空間分離**: タグとIAMで分離
3. **マルチアカウント**: 最も安全だが運用複雑

### ディスカッション3: ブルーグリーン vs ローリングアップデート
**テーマ**: ECSのデプロイ戦略

| 戦略 | メリット | デメリット |
|------|----------|------------|
| ローリング | リソース効率が良い | ロールバックに時間がかかる |
| ブルーグリーン | 即座にロールバック可能 | 一時的に2倍のリソースが必要 |

---

## 10. 発展課題

### Advanced 1: カナリアデプロイの実装
**課題**: 新バージョンを10%のトラフィックに限定してデプロイし、問題なければ100%に展開

### Advanced 2: Feature Flag連携
**課題**: AWS AppConfig と連携して、デプロイとリリースを分離

### Advanced 3: DR環境の自動構築
**課題**: 別リージョンにDR環境をCDKで自動構築し、定期的にフェイルオーバーテストを実行

---

## 11. コスト見積もり

### 月額コスト概算

| 環境 | サービス | 構成 | 月額コスト |
|------|----------|------|------------|
| **Dev** | ECS Fargate | 0.25 vCPU / 0.5GB × 1 | $9 |
| | Aurora Serverless v2 | 0.5 ACU | $43 |
| | ElastiCache | cache.t3.micro | $12 |
| | NAT Gateway | 1 × 730h | $32 |
| | ALB | 1 | $16 |
| | **小計** | | **$112** |
| **Stg** | ECS Fargate | 0.5 vCPU / 1GB × 2 | $36 |
| | Aurora Serverless v2 | 1 ACU | $86 |
| | ElastiCache | cache.t3.small | $24 |
| | NAT Gateway | 1 × 730h | $32 |
| | ALB | 1 | $16 |
| | **小計** | | **$194** |
| **Prod** | ECS Fargate | 1 vCPU / 2GB × 4-20 | $144-720 |
| | Aurora Serverless v2 | 2-16 ACU | $173-1,382 |
| | ElastiCache | cache.r6g.large × 2 | $219 |
| | NAT Gateway | 3 × 730h | $97 |
| | ALB | 1 | $16 |
| | **小計** | | **$649-2,434** |
| **Pipeline** | CodePipeline | 1 | $1 |
| | CodeBuild | ビルド時間依存 | $10 |
| | ECR | イメージ保存 | $5 |
| | **小計** | | **$16** |

**合計**: 約 **$971-2,756/月**（約145,000-413,000円）

### コスト削減のヒント

1. **Dev/Stg環境の夜間停止**: スケジュールベースでタスク数を0に
2. **Aurora Auto Pause**: 開発環境でアイドル時に自動停止（Serverless v1のみ）
3. **Savings Plans**: Fargateの長期コミットメント割引

---

## 12. 学習のポイント

### 重要な概念の整理

1. **CDK Constructs**
   - L1: CloudFormation直接マッピング（Cfn*）
   - L2: 高レベル抽象化（便利なデフォルト付き）
   - L3: パターン（複数リソースの組み合わせ）

2. **環境分離のベストプラクティス**
   - 設定は外部化（環境変数、Parameter Store）
   - 同じコードベースから全環境をデプロイ
   - 差異は設定ファイルで吸収

3. **CI/CDパイプライン設計**
   - 自動テストをゲートに
   - 本番前の承認フロー
   - ロールバック手段の確保

### GCPとの比較

| 概念 | AWS | GCP |
|------|-----|-----|
| IaC (コード型) | CDK | Pulumi / CDK for Terraform |
| CI/CD | CodePipeline | Cloud Build / Cloud Deploy |
| コンテナ実行 | ECS Fargate | Cloud Run |
| マネージドDB | Aurora Serverless | Cloud SQL / AlloyDB |
| キャッシュ | ElastiCache | Memorystore |

### 次のステップ
1. カナリアデプロイの実装
2. 負荷テスト自動化の追加
3. マルチリージョン展開
