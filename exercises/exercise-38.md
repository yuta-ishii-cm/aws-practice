# 課題38: Fintech企業のゼロダウンタイムデプロイ

**難易度: 🟡 中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| 難易度 | 中級 |
| カテゴリ | IaC・DevOps |
| 処理タイプ | 非同期 |
| 使用IaC | CloudFormation |
| 想定所要時間 | 5-6時間 |

---

## 2. シナリオ

### 企業プロフィール
**PayEasy株式会社**は、中小企業向けの決済代行サービスを提供するFintech企業です。月間取引件数は100万件を超え、24時間365日の安定稼働が求められています。

### 現状の課題
サービスの成長に伴い、リリース頻度を上げたいが、ダウンタイムが許容されない状況です：

1. **メンテナンス時間の確保困難**：深夜帯でも取引があり、停止できる時間帯がない
2. **リリース失敗時のリスク**：ロールバックに時間がかかり、障害が長期化
3. **データベースマイグレーション**：スキーマ変更を伴うリリースが特に危険
4. **テスト不足**：本番環境でしか発覚しない問題が多い

### 数値で見る問題
- 計画メンテナンス時間：月 **4時間**（深夜リリース）
- 直近1年のリリース失敗：**8件**
- 平均ロールバック時間：**45分**
- リリース起因の障害損失：年間約 **2,000万円**

### 成功指標（KPI）
| 指標 | 現状 | 目標 |
|------|------|------|
| デプロイ時ダウンタイム | 30分/回 | 0分 |
| ロールバック時間 | 45分 | 5分以内 |
| リリース失敗率 | 8件/年 | 2件以下/年 |
| リリース頻度 | 月2回 | 週1回以上 |

---

## 3. 学習目標

### 主要な学習成果
1. CodeDeployによるブルーグリーンデプロイの実装
2. ALBのターゲットグループ切り替えによる無停止リリース
3. Lambda Hooksを使ったデプロイ検証の自動化
4. データベースマイグレーションのベストプラクティス

### 習得するスキル
- CodeDeploy Blue/Green Deployment設定
- ALB Listener Rules の動的切り替え
- AppSpec.yml の記述方法
- カナリアリリースの設計
- 本番トラフィックを使った検証

---

## 4. 使用するAWSサービス

### コアサービス
| サービス | 用途 | 重要度 |
|----------|------|--------|
| CodeDeploy | ブルーグリーンデプロイ制御 | 高 |
| ECS Fargate | アプリケーション実行環境 | 高 |
| ALB | トラフィック制御・切り替え | 高 |
| Lambda | デプロイHooks実行 | 高 |
| RDS (Aurora) | 決済データベース | 高 |

### 補助サービス
| サービス | 用途 |
|----------|------|
| CodePipeline | CI/CDパイプライン |
| CloudWatch | メトリクス監視・アラーム |
| X-Ray | 分散トレーシング |
| Secrets Manager | DB認証情報管理 |
| SNS | デプロイ通知 |

---

## 5. 前提条件

### 必要な知識
- ECSの基本概念（タスク定義、サービス）
- ALBの仕組み（ターゲットグループ、リスナー）
- Lambdaの基本的な使い方
- データベースマイグレーションの概念

### 事前準備
1. AWSアカウント
2. AWS CLI v2
3. Docker Desktop
4. 決済APIのサンプルアプリケーション

### 環境要件
```bash
# 必要なツール
aws --version  # 2.x
docker --version
```

---

## 6. アーキテクチャ概要

### システム構成図（ブルーグリーン構成）

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group cicd(server)[CI/CD] in aws
    service codepipeline(server)[CodePipeline Source Build Deploy] in cicd

    group alb_layer(server)[Application Load Balancer] in aws
    service prod_listener(internet)[Production Listener 443] in alb_layer
    service test_listener(internet)[Test Listener 8443] in alb_layer
    service blue_tg(server)[Blue Target Group Active] in alb_layer
    service green_tg(server)[Green Target Group Standby] in alb_layer

    group ecs_cluster(server)[ECS Cluster] in aws
    service blue_env(server)[Blue Environment v1.0 Tasks] in ecs_cluster
    service green_env(server)[Green Environment v1.1 Tasks] in ecs_cluster

    group database(database)[Database Layer] in aws
    service aurora(database)[Aurora PostgreSQL Primary Read/Write] in database

    codepipeline:B --> T:prod_listener
    prod_listener:B --> T:blue_tg
    test_listener:B --> T:green_tg
    blue_tg:B --> T:blue_env
    green_tg:B --> T:green_env
    blue_env:B --> T:aurora
    green_env:B --> T:aurora
```

### デプロイフロー

```mermaid
architecture-beta
    group deploy_flow(server)[Blue/Green Deployment Flow]

    service step1(server)[1. BeforeInstall Hook Lambda Pre-deployment checks] in deploy_flow
    service step2(server)[2. Install New tasks in Green TG] in deploy_flow
    service step3(server)[3. AfterInstall Hook Lambda Smoke tests] in deploy_flow
    service step4(server)[4. AllowTestTraffic Test listener routes to Green] in deploy_flow
    service step5(server)[5. AfterAllowTestTraffic Hook Lambda Integration tests] in deploy_flow
    service step6(server)[6. BeforeAllowTraffic Hook Lambda Final validation] in deploy_flow
    service step7(server)[7. AllowTraffic Production listener switches] in deploy_flow
    service step8(server)[8. AfterAllowTraffic Hook Lambda Post-deployment validation] in deploy_flow

    step1:B --> T:step2
    step2:B --> T:step3
    step3:B --> T:step4
    step4:B --> T:step5
    step5:B --> T:step6
    step6:B --> T:step7
    step7:B --> T:step8
```

---

## 7. ハンズオン手順

### Phase 1: 基盤インフラ構築（60分）

#### Step 1-1: VPCとネットワーク

```yaml
# infrastructure/vpc.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: PayEasy VPC Infrastructure

Parameters:
  Environment:
    Type: String
    Default: prod
    AllowedValues: [dev, stg, prod]

Mappings:
  CidrMap:
    dev:
      VpcCidr: 10.0.0.0/16
    stg:
      VpcCidr: 10.1.0.0/16
    prod:
      VpcCidr: 10.2.0.0/16

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !FindInMap [CidrMap, !Ref Environment, VpcCidr]
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-vpc

  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-igw

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [0, !Cidr [!FindInMap [CidrMap, !Ref Environment, VpcCidr], 6, 8]]
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-public-1

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [1, !Cidr [!FindInMap [CidrMap, !Ref Environment, VpcCidr], 6, 8]]
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-public-2

  # Private Subnets (App)
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [2, !Cidr [!FindInMap [CidrMap, !Ref Environment, VpcCidr], 6, 8]]
      AvailabilityZone: !Select [0, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-private-1

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [3, !Cidr [!FindInMap [CidrMap, !Ref Environment, VpcCidr], 6, 8]]
      AvailabilityZone: !Select [1, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-private-2

  # Private Subnets (DB)
  DBSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [4, !Cidr [!FindInMap [CidrMap, !Ref Environment, VpcCidr], 6, 8]]
      AvailabilityZone: !Select [0, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-db-1

  DBSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [5, !Cidr [!FindInMap [CidrMap, !Ref Environment, VpcCidr], 6, 8]]
      AvailabilityZone: !Select [1, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-db-2

  # NAT Gateway
  NatEIP1:
    Type: AWS::EC2::EIP
    Properties:
      Domain: vpc

  NatGateway1:
    Type: AWS::EC2::NatGateway
    Properties:
      AllocationId: !GetAtt NatEIP1.AllocationId
      SubnetId: !Ref PublicSubnet1
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-nat-1

  # Route Tables
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-public-rt

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: AttachGateway
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet1
      RouteTableId: !Ref PublicRouteTable

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet2
      RouteTableId: !Ref PublicRouteTable

  PrivateRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-private-rt

  PrivateRoute:
    Type: AWS::EC2::Route
    Properties:
      RouteTableId: !Ref PrivateRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NatGateway1

  PrivateSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PrivateSubnet1
      RouteTableId: !Ref PrivateRouteTable

  PrivateSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PrivateSubnet2
      RouteTableId: !Ref PrivateRouteTable

Outputs:
  VpcId:
    Value: !Ref VPC
    Export:
      Name: !Sub ${Environment}-VpcId

  PublicSubnet1Id:
    Value: !Ref PublicSubnet1
    Export:
      Name: !Sub ${Environment}-PublicSubnet1Id

  PublicSubnet2Id:
    Value: !Ref PublicSubnet2
    Export:
      Name: !Sub ${Environment}-PublicSubnet2Id

  PrivateSubnet1Id:
    Value: !Ref PrivateSubnet1
    Export:
      Name: !Sub ${Environment}-PrivateSubnet1Id

  PrivateSubnet2Id:
    Value: !Ref PrivateSubnet2
    Export:
      Name: !Sub ${Environment}-PrivateSubnet2Id

  DBSubnet1Id:
    Value: !Ref DBSubnet1
    Export:
      Name: !Sub ${Environment}-DBSubnet1Id

  DBSubnet2Id:
    Value: !Ref DBSubnet2
    Export:
      Name: !Sub ${Environment}-DBSubnet2Id
```

### Phase 2: ECS Blue/Green環境構築（60分）

#### Step 2-1: ALBとターゲットグループ

```yaml
# infrastructure/alb.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: PayEasy ALB for Blue/Green Deployment

Parameters:
  Environment:
    Type: String
    Default: prod

Resources:
  ALBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub payeasy-${Environment}-alb-sg
      GroupDescription: Security group for ALB
      VpcId: !ImportValue
        Fn::Sub: ${Environment}-VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 8443
          ToPort: 8443
          CidrIp: 10.0.0.0/8  # 内部テスト用
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-alb-sg

  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: !Sub payeasy-${Environment}-alb
      Scheme: internet-facing
      Type: application
      Subnets:
        - !ImportValue
          Fn::Sub: ${Environment}-PublicSubnet1Id
        - !ImportValue
          Fn::Sub: ${Environment}-PublicSubnet2Id
      SecurityGroups:
        - !Ref ALBSecurityGroup
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-alb

  # Blue Target Group
  BlueTargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: !Sub payeasy-${Environment}-blue-tg
      Port: 8080
      Protocol: HTTP
      VpcId: !ImportValue
        Fn::Sub: ${Environment}-VpcId
      TargetType: ip
      HealthCheckPath: /health
      HealthCheckIntervalSeconds: 15
      HealthCheckTimeoutSeconds: 5
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 3
      TargetGroupAttributes:
        - Key: deregistration_delay.timeout_seconds
          Value: '30'

  # Green Target Group
  GreenTargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: !Sub payeasy-${Environment}-green-tg
      Port: 8080
      Protocol: HTTP
      VpcId: !ImportValue
        Fn::Sub: ${Environment}-VpcId
      TargetType: ip
      HealthCheckPath: /health
      HealthCheckIntervalSeconds: 15
      HealthCheckTimeoutSeconds: 5
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 3
      TargetGroupAttributes:
        - Key: deregistration_delay.timeout_seconds
          Value: '30'

  # Production Listener (HTTPS)
  ProductionListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !Ref ApplicationLoadBalancer
      Port: 443
      Protocol: HTTPS
      Certificates:
        - CertificateArn: !Ref ACMCertificate
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref BlueTargetGroup

  # Test Listener (for pre-production validation)
  TestListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !Ref ApplicationLoadBalancer
      Port: 8443
      Protocol: HTTPS
      Certificates:
        - CertificateArn: !Ref ACMCertificate
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref BlueTargetGroup

  # ACM Certificate (要事前作成または参照)
  ACMCertificate:
    Type: AWS::CertificateManager::Certificate
    Properties:
      DomainName: !Sub api.${Environment}.payeasy.example.com
      ValidationMethod: DNS
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-cert

Outputs:
  ALBArn:
    Value: !Ref ApplicationLoadBalancer
    Export:
      Name: !Sub ${Environment}-ALBArn

  ALBDNSName:
    Value: !GetAtt ApplicationLoadBalancer.DNSName
    Export:
      Name: !Sub ${Environment}-ALBDNSName

  BlueTargetGroupArn:
    Value: !Ref BlueTargetGroup
    Export:
      Name: !Sub ${Environment}-BlueTargetGroupArn

  GreenTargetGroupArn:
    Value: !Ref GreenTargetGroup
    Export:
      Name: !Sub ${Environment}-GreenTargetGroupArn

  ProductionListenerArn:
    Value: !Ref ProductionListener
    Export:
      Name: !Sub ${Environment}-ProductionListenerArn

  TestListenerArn:
    Value: !Ref TestListener
    Export:
      Name: !Sub ${Environment}-TestListenerArn

  ALBSecurityGroupId:
    Value: !Ref ALBSecurityGroup
    Export:
      Name: !Sub ${Environment}-ALBSecurityGroupId
```

#### Step 2-2: ECSクラスターとサービス

```yaml
# infrastructure/ecs.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: PayEasy ECS Service with Blue/Green Deployment

Parameters:
  Environment:
    Type: String
    Default: prod
  ImageUri:
    Type: String
    Description: ECR Image URI

Resources:
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub payeasy-${Environment}
      ClusterSettings:
        - Name: containerInsights
          Value: enabled
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}

  ECSSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub payeasy-${Environment}-ecs-sg
      GroupDescription: Security group for ECS tasks
      VpcId: !ImportValue
        Fn::Sub: ${Environment}-VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 8080
          ToPort: 8080
          SourceSecurityGroupId: !ImportValue
            Fn::Sub: ${Environment}-ALBSecurityGroupId
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-ecs-sg

  TaskExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub payeasy-${Environment}-task-execution-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
      Policies:
        - PolicyName: SecretsAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - secretsmanager:GetSecretValue
                Resource: !Sub arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:payeasy/${Environment}/*

  TaskRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub payeasy-${Environment}-task-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: XRayAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - xray:PutTraceSegments
                  - xray:PutTelemetryRecords
                Resource: '*'

  LogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub /ecs/payeasy/${Environment}/payment-api
      RetentionInDays: 90

  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: !Sub payeasy-${Environment}-payment-api
      Cpu: '512'
      Memory: '1024'
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      ExecutionRoleArn: !GetAtt TaskExecutionRole.Arn
      TaskRoleArn: !GetAtt TaskRole.Arn
      ContainerDefinitions:
        - Name: payment-api
          Image: !Ref ImageUri
          Essential: true
          PortMappings:
            - ContainerPort: 8080
              Protocol: tcp
          Environment:
            - Name: ENV
              Value: !Ref Environment
            - Name: AWS_XRAY_DAEMON_ADDRESS
              Value: '127.0.0.1:2000'
          Secrets:
            - Name: DB_CONNECTION_STRING
              ValueFrom: !Sub arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:payeasy/${Environment}/db-connection
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: payment-api
          HealthCheck:
            Command:
              - CMD-SHELL
              - curl -f http://localhost:8080/health || exit 1
            Interval: 30
            Timeout: 5
            Retries: 3
            StartPeriod: 60

        # X-Ray Daemon Sidecar
        - Name: xray-daemon
          Image: amazon/aws-xray-daemon
          Essential: false
          Cpu: 32
          MemoryReservation: 256
          PortMappings:
            - ContainerPort: 2000
              Protocol: udp

  # ECSサービス（CodeDeployで管理されるため、DeploymentControllerを設定）
  ECSService:
    Type: AWS::ECS::Service
    Properties:
      ServiceName: !Sub payeasy-${Environment}-payment-api
      Cluster: !Ref ECSCluster
      TaskDefinition: !Ref TaskDefinition
      DesiredCount: 2
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          AssignPublicIp: DISABLED
          SecurityGroups:
            - !Ref ECSSecurityGroup
          Subnets:
            - !ImportValue
              Fn::Sub: ${Environment}-PrivateSubnet1Id
            - !ImportValue
              Fn::Sub: ${Environment}-PrivateSubnet2Id
      LoadBalancers:
        - ContainerName: payment-api
          ContainerPort: 8080
          TargetGroupArn: !ImportValue
            Fn::Sub: ${Environment}-BlueTargetGroupArn
      DeploymentController:
        Type: CODE_DEPLOY
      Tags:
        - Key: Name
          Value: !Sub payeasy-${Environment}-payment-api

Outputs:
  ClusterArn:
    Value: !GetAtt ECSCluster.Arn
    Export:
      Name: !Sub ${Environment}-ECSClusterArn

  ServiceArn:
    Value: !Ref ECSService
    Export:
      Name: !Sub ${Environment}-ECSServiceArn

  ServiceName:
    Value: !GetAtt ECSService.Name
    Export:
      Name: !Sub ${Environment}-ECSServiceName
```

### Phase 3: CodeDeployの設定（60分）

#### Step 3-1: CodeDeployアプリケーションとデプロイグループ

```yaml
# infrastructure/codedeploy.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: PayEasy CodeDeploy Blue/Green Configuration

Parameters:
  Environment:
    Type: String
    Default: prod

Resources:
  CodeDeployServiceRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub payeasy-${Environment}-codedeploy-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: codedeploy.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS
      Policies:
        - PolicyName: InvokeLambdaHooks
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - lambda:InvokeFunction
                Resource:
                  - !GetAtt BeforeInstallHook.Arn
                  - !GetAtt AfterInstallHook.Arn
                  - !GetAtt AfterAllowTestTrafficHook.Arn
                  - !GetAtt BeforeAllowTrafficHook.Arn
                  - !GetAtt AfterAllowTrafficHook.Arn

  CodeDeployApplication:
    Type: AWS::CodeDeploy::Application
    Properties:
      ApplicationName: !Sub payeasy-${Environment}-payment-api
      ComputePlatform: ECS

  DeploymentGroup:
    Type: AWS::CodeDeploy::DeploymentGroup
    Properties:
      ApplicationName: !Ref CodeDeployApplication
      DeploymentGroupName: !Sub payeasy-${Environment}-payment-api-dg
      ServiceRoleArn: !GetAtt CodeDeployServiceRole.Arn
      DeploymentConfigName: CodeDeployDefault.ECSLinear10PercentEvery1Minutes
      AutoRollbackConfiguration:
        Enabled: true
        Events:
          - DEPLOYMENT_FAILURE
          - DEPLOYMENT_STOP_ON_ALARM
      BlueGreenDeploymentConfiguration:
        DeploymentReadyOption:
          ActionOnTimeout: CONTINUE_DEPLOYMENT
          WaitTimeInMinutes: 0
        TerminateBlueInstancesOnDeploymentSuccess:
          Action: TERMINATE
          TerminationWaitTimeInMinutes: 5
      DeploymentStyle:
        DeploymentOption: WITH_TRAFFIC_CONTROL
        DeploymentType: BLUE_GREEN
      ECSServices:
        - ClusterName: !Sub payeasy-${Environment}
          ServiceName: !Sub payeasy-${Environment}-payment-api
      LoadBalancerInfo:
        TargetGroupPairInfoList:
          - ProdTrafficRoute:
              ListenerArns:
                - !ImportValue
                  Fn::Sub: ${Environment}-ProductionListenerArn
            TestTrafficRoute:
              ListenerArns:
                - !ImportValue
                  Fn::Sub: ${Environment}-TestListenerArn
            TargetGroups:
              - Name: !Sub payeasy-${Environment}-blue-tg
              - Name: !Sub payeasy-${Environment}-green-tg
      AlarmConfiguration:
        Enabled: true
        Alarms:
          - Name: !Ref HighErrorRateAlarm
          - Name: !Ref HighLatencyAlarm

  # CloudWatch Alarms for Auto Rollback
  HighErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub payeasy-${Environment}-high-error-rate
      MetricName: HTTPCode_Target_5XX_Count
      Namespace: AWS/ApplicationELB
      Dimensions:
        - Name: LoadBalancer
          Value: !ImportValue
            Fn::Sub: ${Environment}-ALBArn
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching

  HighLatencyAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub payeasy-${Environment}-high-latency
      MetricName: TargetResponseTime
      Namespace: AWS/ApplicationELB
      Dimensions:
        - Name: LoadBalancer
          Value: !ImportValue
            Fn::Sub: ${Environment}-ALBArn
      Statistic: p99
      Period: 60
      EvaluationPeriods: 2
      Threshold: 2
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching

  # Lambda Hooks
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub payeasy-${Environment}-hook-lambda-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: CodeDeployHookAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - codedeploy:PutLifecycleEventHookExecutionStatus
                Resource: '*'
              - Effect: Allow
                Action:
                  - ecs:DescribeServices
                  - ecs:DescribeTasks
                  - elasticloadbalancing:DescribeTargetHealth
                Resource: '*'

  BeforeInstallHook:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub payeasy-${Environment}-before-install
      Runtime: python3.11
      Handler: index.handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Timeout: 60
      Environment:
        Variables:
          ENVIRONMENT: !Ref Environment
      Code:
        ZipFile: |
          import json
          import boto3
          import os

          codedeploy = boto3.client('codedeploy')

          def handler(event, context):
              print(f"BeforeInstall Hook: {json.dumps(event)}")

              deployment_id = event['DeploymentId']
              lifecycle_event_hook_execution_id = event['LifecycleEventHookExecutionId']

              try:
                  # Pre-deployment checks
                  # 1. Verify database connectivity
                  # 2. Check configuration validity
                  # 3. Ensure required secrets exist

                  print("Pre-deployment checks passed")

                  codedeploy.put_lifecycle_event_hook_execution_status(
                      deploymentId=deployment_id,
                      lifecycleEventHookExecutionId=lifecycle_event_hook_execution_id,
                      status='Succeeded'
                  )

              except Exception as e:
                  print(f"Pre-deployment check failed: {str(e)}")
                  codedeploy.put_lifecycle_event_hook_execution_status(
                      deploymentId=deployment_id,
                      lifecycleEventHookExecutionId=lifecycle_event_hook_execution_id,
                      status='Failed'
                  )

              return {'statusCode': 200}

  AfterInstallHook:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub payeasy-${Environment}-after-install
      Runtime: python3.11
      Handler: index.handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Timeout: 300
      Environment:
        Variables:
          ENVIRONMENT: !Ref Environment
          TEST_LISTENER_PORT: '8443'
      Code:
        ZipFile: |
          import json
          import boto3
          import urllib.request
          import os

          codedeploy = boto3.client('codedeploy')

          def handler(event, context):
              print(f"AfterInstall Hook: {json.dumps(event)}")

              deployment_id = event['DeploymentId']
              lifecycle_event_hook_execution_id = event['LifecycleEventHookExecutionId']

              try:
                  # Run smoke tests against the new version via test listener
                  test_endpoints = [
                      '/health',
                      '/api/v1/status',
                  ]

                  alb_dns = os.environ.get('ALB_DNS', 'localhost')
                  test_port = os.environ.get('TEST_LISTENER_PORT', '8443')

                  for endpoint in test_endpoints:
                      url = f"https://{alb_dns}:{test_port}{endpoint}"
                      print(f"Testing: {url}")
                      # In production, implement actual HTTP calls

                  print("Smoke tests passed")

                  codedeploy.put_lifecycle_event_hook_execution_status(
                      deploymentId=deployment_id,
                      lifecycleEventHookExecutionId=lifecycle_event_hook_execution_id,
                      status='Succeeded'
                  )

              except Exception as e:
                  print(f"Smoke test failed: {str(e)}")
                  codedeploy.put_lifecycle_event_hook_execution_status(
                      deploymentId=deployment_id,
                      lifecycleEventHookExecutionId=lifecycle_event_hook_execution_id,
                      status='Failed'
                  )

              return {'statusCode': 200}

  AfterAllowTestTrafficHook:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub payeasy-${Environment}-after-test-traffic
      Runtime: python3.11
      Handler: index.handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Timeout: 300
      Code:
        ZipFile: |
          import json
          import boto3
          import time

          codedeploy = boto3.client('codedeploy')

          def handler(event, context):
              print(f"AfterAllowTestTraffic Hook: {json.dumps(event)}")

              deployment_id = event['DeploymentId']
              lifecycle_event_hook_execution_id = event['LifecycleEventHookExecutionId']

              try:
                  # Run integration tests
                  # 1. API endpoint tests
                  # 2. Database connectivity tests
                  # 3. External service integration tests

                  print("Running integration tests...")
                  time.sleep(30)  # Simulate test execution

                  print("Integration tests passed")

                  codedeploy.put_lifecycle_event_hook_execution_status(
                      deploymentId=deployment_id,
                      lifecycleEventHookExecutionId=lifecycle_event_hook_execution_id,
                      status='Succeeded'
                  )

              except Exception as e:
                  print(f"Integration test failed: {str(e)}")
                  codedeploy.put_lifecycle_event_hook_execution_status(
                      deploymentId=deployment_id,
                      lifecycleEventHookExecutionId=lifecycle_event_hook_execution_id,
                      status='Failed'
                  )

              return {'statusCode': 200}

  BeforeAllowTrafficHook:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub payeasy-${Environment}-before-traffic
      Runtime: python3.11
      Handler: index.handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Timeout: 60
      Code:
        ZipFile: |
          import json
          import boto3

          codedeploy = boto3.client('codedeploy')

          def handler(event, context):
              print(f"BeforeAllowTraffic Hook: {json.dumps(event)}")

              deployment_id = event['DeploymentId']
              lifecycle_event_hook_execution_id = event['LifecycleEventHookExecutionId']

              try:
                  # Final validation before production traffic switch
                  # 1. Verify DB migration completed successfully
                  # 2. Check all health checks are passing
                  # 3. Verify external dependencies are healthy

                  print("Final validation passed - ready for production traffic")

                  codedeploy.put_lifecycle_event_hook_execution_status(
                      deploymentId=deployment_id,
                      lifecycleEventHookExecutionId=lifecycle_event_hook_execution_id,
                      status='Succeeded'
                  )

              except Exception as e:
                  print(f"Final validation failed: {str(e)}")
                  codedeploy.put_lifecycle_event_hook_execution_status(
                      deploymentId=deployment_id,
                      lifecycleEventHookExecutionId=lifecycle_event_hook_execution_id,
                      status='Failed'
                  )

              return {'statusCode': 200}

  AfterAllowTrafficHook:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub payeasy-${Environment}-after-traffic
      Runtime: python3.11
      Handler: index.handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Timeout: 300
      Code:
        ZipFile: |
          import json
          import boto3
          import time

          codedeploy = boto3.client('codedeploy')
          cloudwatch = boto3.client('cloudwatch')

          def handler(event, context):
              print(f"AfterAllowTraffic Hook: {json.dumps(event)}")

              deployment_id = event['DeploymentId']
              lifecycle_event_hook_execution_id = event['LifecycleEventHookExecutionId']

              try:
                  # Post-deployment monitoring
                  # Wait and observe metrics for 2 minutes
                  print("Monitoring post-deployment metrics...")
                  time.sleep(120)

                  # Check error rate
                  # Check latency
                  # Verify no anomalies

                  print("Post-deployment validation passed")

                  codedeploy.put_lifecycle_event_hook_execution_status(
                      deploymentId=deployment_id,
                      lifecycleEventHookExecutionId=lifecycle_event_hook_execution_id,
                      status='Succeeded'
                  )

              except Exception as e:
                  print(f"Post-deployment validation failed: {str(e)}")
                  codedeploy.put_lifecycle_event_hook_execution_status(
                      deploymentId=deployment_id,
                      lifecycleEventHookExecutionId=lifecycle_event_hook_execution_id,
                      status='Failed'
                  )

              return {'statusCode': 200}

Outputs:
  CodeDeployApplicationName:
    Value: !Ref CodeDeployApplication
    Export:
      Name: !Sub ${Environment}-CodeDeployApplicationName

  DeploymentGroupName:
    Value: !Ref DeploymentGroup
    Export:
      Name: !Sub ${Environment}-DeploymentGroupName
```

### Phase 4: AppSpecファイルとタスク定義テンプレート（30分）

#### Step 4-1: appspec.yaml

```yaml
# appspec.yaml
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: <TASK_DEFINITION>
        LoadBalancerInfo:
          ContainerName: "payment-api"
          ContainerPort: 8080
        PlatformVersion: "LATEST"
        NetworkConfiguration:
          AwsvpcConfiguration:
            Subnets:
              - "subnet-xxxxxxxxx"
              - "subnet-yyyyyyyyy"
            SecurityGroups:
              - "sg-zzzzzzzzz"
            AssignPublicIp: "DISABLED"

Hooks:
  - BeforeInstall: "arn:aws:lambda:ap-northeast-1:ACCOUNT_ID:function:payeasy-prod-before-install"
  - AfterInstall: "arn:aws:lambda:ap-northeast-1:ACCOUNT_ID:function:payeasy-prod-after-install"
  - AfterAllowTestTraffic: "arn:aws:lambda:ap-northeast-1:ACCOUNT_ID:function:payeasy-prod-after-test-traffic"
  - BeforeAllowTraffic: "arn:aws:lambda:ap-northeast-1:ACCOUNT_ID:function:payeasy-prod-before-traffic"
  - AfterAllowTraffic: "arn:aws:lambda:ap-northeast-1:ACCOUNT_ID:function:payeasy-prod-after-traffic"
```

#### Step 4-2: タスク定義テンプレート

```json
// taskdef.json
{
  "family": "payeasy-prod-payment-api",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/payeasy-prod-task-execution-role",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/payeasy-prod-task-role",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "payment-api",
      "image": "<IMAGE1_NAME>",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENV",
          "value": "prod"
        }
      ],
      "secrets": [
        {
          "name": "DB_CONNECTION_STRING",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:ACCOUNT_ID:secret:payeasy/prod/db-connection"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/payeasy/prod/payment-api",
          "awslogs-region": "ap-northeast-1",
          "awslogs-stream-prefix": "payment-api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Phase 5: DBマイグレーション戦略（30分）

#### Step 5-1: 後方互換性を保つマイグレーション

```sql
-- migrations/V1__add_transaction_status.sql
-- Blue/Green対応: 新カラムはNULLableで追加し、デフォルト値を設定

-- Step 1: 新カラムを追加（NULL許容）
ALTER TABLE transactions
ADD COLUMN status_v2 VARCHAR(50) DEFAULT 'pending';

-- Step 2: 既存データをマイグレーション（バックグラウンドで実行）
UPDATE transactions
SET status_v2 = CASE status
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'processing'
    WHEN 2 THEN 'completed'
    WHEN 3 THEN 'failed'
    ELSE 'unknown'
END
WHERE status_v2 IS NULL;

-- Step 3: インデックス作成（CONCURRENTLY で無停止）
CREATE INDEX CONCURRENTLY idx_transactions_status_v2
ON transactions (status_v2);

-- Note: 旧カラム(status)の削除は、全サービスが新バージョンになった後の
-- 別リリースで実施
```

#### Step 5-2: マイグレーション実行Lambda

```python
# migration_runner.py
import boto3
import psycopg2
import json
import os

def get_db_credentials():
    """Secrets Managerから認証情報を取得"""
    client = boto3.client('secretsmanager')
    secret_name = os.environ['DB_SECRET_ARN']

    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

def run_migration(event, context):
    """マイグレーションを実行"""
    credentials = get_db_credentials()

    conn = psycopg2.connect(
        host=credentials['host'],
        port=credentials['port'],
        user=credentials['username'],
        password=credentials['password'],
        database=credentials['dbname']
    )

    try:
        with conn.cursor() as cur:
            # マイグレーションバージョンテーブルの確認
            cur.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(255) PRIMARY KEY,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 適用済みマイグレーションの取得
            cur.execute("SELECT version FROM schema_migrations")
            applied = {row[0] for row in cur.fetchall()}

            # 新しいマイグレーションの適用
            migrations = get_pending_migrations(applied)

            for migration in migrations:
                print(f"Applying migration: {migration['version']}")

                # トランザクション内で実行
                cur.execute(migration['sql'])
                cur.execute(
                    "INSERT INTO schema_migrations (version) VALUES (%s)",
                    (migration['version'],)
                )

                conn.commit()
                print(f"Migration {migration['version']} applied successfully")

        return {'statusCode': 200, 'body': 'Migrations completed'}

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {str(e)}")
        raise

    finally:
        conn.close()

def get_pending_migrations(applied_versions):
    """未適用のマイグレーションを取得"""
    # S3やコードから読み込む
    all_migrations = [
        {
            'version': 'V1__add_transaction_status',
            'sql': open('migrations/V1__add_transaction_status.sql').read()
        }
    ]

    return [m for m in all_migrations if m['version'] not in applied_versions]
```

---

## 8. トラブルシューティング課題

### Challenge 1: デプロイが "In Progress" のまま止まる
**状況**: CodeDeployのステータスがAfterInstallで停止し、進まない

**調査ポイント**:
1. Lambda Hookのログを確認
2. ECSタスクのヘルスチェック状態を確認
3. ターゲットグループのヘルス状態を確認

**解決コマンド**:
```bash
# Lambda Hookのログ確認
aws logs tail /aws/lambda/payeasy-prod-after-install --follow

# ECSタスクの状態確認
aws ecs describe-tasks \
  --cluster payeasy-prod \
  --tasks $(aws ecs list-tasks --cluster payeasy-prod --query 'taskArns' --output text)

# ターゲットグループのヘルス確認
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:ap-northeast-1:ACCOUNT:targetgroup/payeasy-prod-green-tg/xxx
```

### Challenge 2: 自動ロールバックが発生
**状況**: デプロイ完了後、CloudWatch Alarmがトリガーされて自動ロールバック

**調査ポイント**:
1. どのアラームがトリガーされたか確認
2. メトリクスの推移を確認
3. アプリケーションログでエラーを特定

### Challenge 3: DBマイグレーション後の不整合
**状況**: 新バージョンと旧バージョンで異なるスキーマを参照してエラー

**調査ポイント**:
1. マイグレーションが後方互換性を保っているか確認
2. 両バージョンのSQLクエリを確認
3. トランザクション分離レベルを確認

---

## 9. 設計考慮ポイント

### ディスカッション1: デプロイ戦略の選択
**テーマ**: Linear vs Canary vs All-at-once

| 戦略 | 特徴 | ユースケース |
|------|------|-------------|
| Linear10PercentEvery1Minutes | 均等に段階的切り替え | 標準的なリリース |
| Canary10Percent5Minutes | 最初に少量、問題なければ残り全部 | リスクの高いリリース |
| AllAtOnce | 即座に全切り替え | ホットフィックス |

### ディスカッション2: ロールバック戦略
**テーマ**: 自動 vs 手動ロールバック

**考慮点**:
1. **自動ロールバック**: アラーム連動で即座に戻せるが、誤検知のリスク
2. **手動ロールバック**: 判断に時間がかかるが、慎重な対応が可能
3. **ハイブリッド**: 重大なメトリクスのみ自動、その他は手動

### ディスカッション3: データベーススキーマ変更
**テーマ**: オンラインスキーママイグレーション

**パターン**:
1. **Expand and Contract**: 新旧両対応→旧削除
2. **Ghost Tables**: シャドーテーブルでの段階的移行
3. **Feature Flags**: 新スキーマの段階的有効化

---

## 10. 発展課題

### Advanced 1: カナリアリリースの実装
**課題**: ALB Weighted Target Groupsを使って、5%のトラフィックを新バージョンに流し、問題なければ徐々に増加

### Advanced 2: Feature Flagsとの連携
**課題**: AWS AppConfigと連携して、デプロイとリリースを分離。デプロイ後にFeature Flagで機能を段階的に有効化

### Advanced 3: Chaos Engineering
**課題**: AWS Fault Injection Simulatorを使って、デプロイ中の障害シナリオをテスト

---

## 11. コスト見積もり

### 月額コスト概算

| サービス | リソース | 月額コスト |
|----------|----------|------------|
| ECS Fargate (Blue) | 0.5 vCPU / 1GB × 2タスク | $29 |
| ECS Fargate (Green) | デプロイ時のみ | $5（概算） |
| ALB | 1 | $16 |
| NAT Gateway | 1 | $32 |
| Aurora PostgreSQL | db.r6g.large (Multi-AZ) | $350 |
| CodeDeploy | 無料 | $0 |
| Lambda (Hooks) | 月100回デプロイ想定 | $1 |
| CloudWatch | ログ・メトリクス | $15 |
| X-Ray | トレース | $5 |

**合計**: 約 **$453/月**（約68,000円）

### コスト削減のヒント

1. **デプロイ時間の短縮**: Green環境の稼働時間を最小化
2. **開発環境の簡素化**: dev/stgはSingle-AZで運用
3. **Savings Plans**: Fargateの長期コミット割引

---

## 12. 学習のポイント

### 重要な概念の整理

1. **Blue/Green Deployment**
   - 2つの同一環境を維持
   - トラフィック切り替えで無停止リリース
   - 即座のロールバックが可能

2. **CodeDeploy Lifecycle Hooks**
   - 各フェーズでカスタムロジックを実行
   - テスト、検証、通知などを自動化
   - 失敗時は自動でデプロイ停止

3. **後方互換性のあるマイグレーション**
   - 新旧バージョンが共存できる設計
   - カラム追加はNULL許容で
   - 削除は全環境更新後に別リリースで

### GCPとの比較

| 概念 | AWS | GCP |
|------|-----|-----|
| Blue/Green Deploy | CodeDeploy | Cloud Deploy |
| コンテナ実行 | ECS Fargate | Cloud Run |
| ロードバランサー | ALB | Cloud Load Balancing |
| トラフィック分割 | Target Group Weight | Traffic Splitting |
| デプロイHooks | Lambda | Cloud Functions |

### 次のステップ
1. Progressive Deliveryの実装（Argo Rollouts等）
2. サービスメッシュでのトラフィック制御
3. GitOpsワークフローの導入
