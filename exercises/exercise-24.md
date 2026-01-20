# 課題24: MedConnect Cognito認証基盤 - 医療情報プラットフォームの認証システム

**難易度: 🟢 初級〜中級**

---

## 1. 分類情報

| 項目 | 内容 |
|------|------|
| **カテゴリ** | 認証・認可 / セキュリティ |
| **難易度** | 初級〜中級（Beginner to Intermediate） |
| **所要時間** | 4-5時間 |
| **使用IaCツール** | CloudFormation |
| **前提スキル** | AWS基礎、認証の基本概念 |

---

## 2. ビジネスシナリオ

### 企業プロファイル: MedConnect株式会社

```
┌─────────────────────────────────────────────────────────────────┐
│                    MedConnect株式会社                            │
│                  医療情報プラットフォーム                        │
├─────────────────────────────────────────────────────────────────┤
│  設立: 2021年    従業員: 30名    本社: 東京                      │
│  事業: 医療機関向けオンライン診療プラットフォーム               │
│  ユーザー: 医師5000名、患者30万人、医療機関500施設              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【プラットフォーム概要】                                        │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │   ┌─────────┐    ┌─────────┐    ┌─────────┐              ││
│  │   │  患者   │    │  医師   │    │ 管理者  │              ││
│  │   │ アプリ  │    │ ポータル│    │ 画面    │              ││
│  │   └────┬────┘    └────┬────┘    └────┬────┘              ││
│  │        │              │              │                    ││
│  │        └──────────────┼──────────────┘                    ││
│  │                       ▼                                    ││
│  │              ┌─────────────────┐                          ││
│  │              │   認証基盤      │                          ││
│  │              │  (構築が必要)   │                          ││
│  │              └────────┬────────┘                          ││
│  │                       │                                    ││
│  │              ┌────────▼────────┐                          ││
│  │              │   バックエンド   │                          ││
│  │              │   API群         │                          ││
│  │              └─────────────────┘                          ││
│  │                                                              ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【認証要件】                                                    │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  ユーザー種別    │ 認証方式               │ セキュリティ  ││
│  ├──────────────────┼────────────────────────┼───────────────┤│
│  │  患者            │ メール/パスワード      │ MFA推奨       ││
│  │                  │ + ソーシャルログイン   │               ││
│  │  医師            │ メール/パスワード      │ MFA必須       ││
│  │                  │ + 医師免許番号確認     │               ││
│  │  管理者          │ メール/パスワード      │ MFA必須       ││
│  │                  │ + IP制限              │ + 監査ログ    ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 規制要件

```
┌─────────────────────────────────────────────────────────────────┐
│                    医療情報セキュリティ要件                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【個人情報保護法・医療情報ガイドライン対応】                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  1. 認証強度                                                ││
│  │     ・医療従事者は多要素認証必須                            ││
│  │     ・パスワードポリシー: 12文字以上、複雑性要件            ││
│  │     ・セッションタイムアウト: 30分                          ││
│  │                                                              ││
│  │  2. アクセス制御                                            ││
│  │     ・役割ベースのアクセス制御（RBAC）                      ││
│  │     ・最小権限の原則                                        ││
│  │     ・担当患者のみアクセス可能                              ││
│  │                                                              ││
│  │  3. 監査証跡                                                ││
│  │     ・全ログイン試行の記録                                  ││
│  │     ・アクセスログの7年間保存                               ││
│  │     ・異常アクセスの検知                                    ││
│  │                                                              ││
│  │  4. データ保護                                              ││
│  │     ・通信の暗号化（TLS 1.2以上）                           ││
│  │     ・トークンの安全な管理                                  ││
│  │     ・個人情報の匿名化                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ビジネス要件と KPI

```
┌─────────────────────────────────────────────────────────────────┐
│                    プロジェクト KPI                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【セキュリティ目標】                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  指標              │ 目標        │ 基準                    ││
│  ├────────────────────┼─────────────┼─────────────────────────┤│
│  │  MFA有効化率       │ > 95%       │ 医療従事者は100%        ││
│  │  不正ログイン検知  │ < 1分       │ 自動ブロック            ││
│  │  パスワード漏洩対応│ < 15分      │ 強制リセット            ││
│  │  監査ログ保存期間  │ 7年         │ 規制要件                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【ユーザー体験目標】                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  指標              │ 目標        │ 現状の課題              ││
│  ├────────────────────┼─────────────┼─────────────────────────┤│
│  │  ログイン成功率    │ > 99%       │ -                       ││
│  │  ログイン時間      │ < 3秒       │ -                       ││
│  │  パスワードリセット│ セルフサービス │ 現在は手動            ││
│  │  サポート問い合わせ│ 50%削減     │ 認証関連が多い          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 学習目標

### 習得スキル

```
┌─────────────────────────────────────────────────────────────────┐
│                       学習目標マップ                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【主要スキル】                                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  1. Amazon Cognito基礎                                      ││
│  │     ├── User Pool（ユーザー管理）                           ││
│  │     ├── Identity Pool（一時認証情報）                       ││
│  │     ├── 認証フロー（OAuth 2.0 / OIDC）                      ││
│  │     └── トークン（ID/Access/Refresh）                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  2. セキュリティ設定                                        ││
│  │     ├── パスワードポリシー                                  ││
│  │     ├── MFA（TOTP / SMS）                                   ││
│  │     ├── 高度なセキュリティ機能                              ││
│  │     └── Lambda トリガー                                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  3. API Gateway統合                                         ││
│  │     ├── Cognito Authorizer                                  ││
│  │     ├── スコープベースアクセス制御                          ││
│  │     ├── カスタム認可                                        ││
│  │     └── APIキー管理                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  4. CloudFormationによる構築                                ││
│  │     ├── User Pool定義                                       ││
│  │     ├── App Client設定                                      ││
│  │     ├── API Gateway統合                                     ││
│  │     └── Lambda トリガー設定                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### GCPとの対応関係

| AWS サービス | GCP 対応サービス | 主な違い |
|-------------|-----------------|---------|
| Cognito User Pool | Identity Platform | ユーザー管理 |
| Cognito Identity Pool | なし (IAM直接) | 一時認証情報 |
| API Gateway + Cognito | API Gateway + Firebase Auth | API認可 |

---

## 4. 使用するAWSサービス

```
┌─────────────────────────────────────────────────────────────────┐
│                    使用AWSサービス一覧                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【コアサービス】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  サービス          │ 用途                    │ 重要度      ││
│  ├────────────────────┼─────────────────────────┼─────────────┤│
│  │  Cognito User Pool │ ユーザー認証管理        │ ★★★★★      ││
│  │  Cognito Identity  │ AWS認証情報発行         │ ★★★☆☆      ││
│  │  API Gateway       │ API認可                 │ ★★★★★      ││
│  │  Lambda            │ カスタム処理            │ ★★★★☆      ││
│  │  CloudFormation    │ インフラ定義            │ ★★★★★      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【支援サービス】                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  サービス          │ 用途                    │ 重要度      ││
│  ├────────────────────┼─────────────────────────┼─────────────┤│
│  │  CloudWatch Logs   │ 認証ログ                │ ★★★★☆      ││
│  │  SNS               │ MFA SMS送信             │ ★★★☆☆      ││
│  │  SES               │ メール送信              │ ★★★☆☆      ││
│  │  WAF               │ API保護                 │ ★★★☆☆      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 前提条件と事前準備

### 必要な環境

```bash
# AWS CLI バージョン確認
aws --version
# aws-cli/2.x.x 以上

# Node.js（Lambda関数用）
node --version
# v18.x 以上
```

### AWS環境の準備

```bash
# 環境変数設定
export AWS_REGION=ap-northeast-1
export PROJECT_NAME=medconnect
export ENVIRONMENT=dev

# 作業ディレクトリ作成
mkdir -p ~/medconnect-cognito/{cfn,lambda,scripts}
cd ~/medconnect-cognito
```

---

## 6. アーキテクチャ設計

### 認証基盤全体像

```
┌─────────────────────────────────────────────────────────────────┐
│              MedConnect 認証基盤アーキテクチャ                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Client Applications                      ││
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐                 ││
│  │  │ 患者App │    │医師Portal│    │管理画面 │                 ││
│  │  │ (Mobile)│    │  (Web)  │    │  (Web)  │                 ││
│  │  └────┬────┘    └────┬────┘    └────┬────┘                 ││
│  │       │              │              │                       ││
│  │       └──────────────┼──────────────┘                       ││
│  │                      │                                       ││
│  └──────────────────────┼───────────────────────────────────────┘│
│                         │                                        │
│  ┌──────────────────────┼───────────────────────────────────────┐│
│  │                      ▼          Cognito                      ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │                   User Pool                             │││
│  │  │  ┌─────────────────────────────────────────────────┐    │││
│  │  │  │  Users        │  Groups     │  MFA             │    │││
│  │  │  │  ・患者       │  ・patients │  ・TOTP          │    │││
│  │  │  │  ・医師       │  ・doctors  │  ・SMS           │    │││
│  │  │  │  ・管理者     │  ・admins   │                  │    │││
│  │  │  └─────────────────────────────────────────────────┘    │││
│  │  │                                                         │││
│  │  │  ┌─────────────────────────────────────────────────┐    │││
│  │  │  │  App Clients                                    │    │││
│  │  │  │  ・patient-app (Mobile)                         │    │││
│  │  │  │  ・doctor-portal (Web)                          │    │││
│  │  │  │  ・admin-console (Web)                          │    │││
│  │  │  └─────────────────────────────────────────────────┘    │││
│  │  │                                                         │││
│  │  │  ┌─────────────────────────────────────────────────┐    │││
│  │  │  │  Lambda Triggers                                │    │││
│  │  │  │  ・PreSignUp (医師免許確認)                     │    │││
│  │  │  │  ・PostAuthentication (ログイン監査)            │    │││
│  │  │  │  ・CustomMessage (メールカスタマイズ)           │    │││
│  │  │  └─────────────────────────────────────────────────┘    │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └──────────────────────────────────────────────────────────────┘│
│                         │                                        │
│                         │ JWT Token                              │
│                         │                                        │
│  ┌──────────────────────┼───────────────────────────────────────┐│
│  │                      ▼          API Gateway                  ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │  Cognito Authorizer                                     │││
│  │  │  ├── Token検証                                          │││
│  │  │  ├── スコープ確認                                       │││
│  │  │  └── グループベースアクセス制御                         │││
│  │  └─────────────────────────────────────────────────────────┘││
│  │                      │                                       ││
│  │                      ▼                                       ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │  API Endpoints                                          │││
│  │  │  ├── /patients/* (患者用API)                            │││
│  │  │  ├── /doctors/*  (医師用API)                            │││
│  │  │  └── /admin/*    (管理者用API)                          │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. ハンズオン手順

### Phase 1: Cognito User Pool の構築

```yaml
# cfn/cognito-userpool.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'MedConnect Cognito User Pool'

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, stg, prod]

  DomainPrefix:
    Type: String
    Default: medconnect-auth
    Description: Cognito Domain prefix

Resources:
  #============================================
  # User Pool
  #============================================
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub 'medconnect-userpool-${Environment}'

      # ユーザー名設定
      UsernameAttributes:
        - email
      UsernameConfiguration:
        CaseSensitive: false

      # パスワードポリシー（医療情報セキュリティ要件）
      Policies:
        PasswordPolicy:
          MinimumLength: 12
          RequireLowercase: true
          RequireUppercase: true
          RequireNumbers: true
          RequireSymbols: true
          TemporaryPasswordValidityDays: 1

      # MFA設定
      MfaConfiguration: OPTIONAL
      EnabledMfas:
        - SOFTWARE_TOKEN_MFA
        - SMS_MFA

      # アカウント復旧設定
      AccountRecoverySetting:
        RecoveryMechanisms:
          - Name: verified_email
            Priority: 1
          - Name: verified_phone_number
            Priority: 2

      # 必須属性
      Schema:
        - Name: email
          AttributeDataType: String
          Required: true
          Mutable: true
        - Name: name
          AttributeDataType: String
          Required: true
          Mutable: true
        - Name: phone_number
          AttributeDataType: String
          Required: false
          Mutable: true
        # カスタム属性
        - Name: user_type
          AttributeDataType: String
          Mutable: true
          StringAttributeConstraints:
            MaxLength: '20'
            MinLength: '1'
        - Name: medical_license
          AttributeDataType: String
          Mutable: true
          StringAttributeConstraints:
            MaxLength: '20'
            MinLength: '0'
        - Name: organization_id
          AttributeDataType: String
          Mutable: true
          StringAttributeConstraints:
            MaxLength: '50'
            MinLength: '0'

      # 自動検証
      AutoVerifiedAttributes:
        - email

      # メール設定
      EmailConfiguration:
        EmailSendingAccount: COGNITO_DEFAULT

      # 検証メッセージ
      VerificationMessageTemplate:
        DefaultEmailOption: CONFIRM_WITH_CODE
        EmailSubject: 'MedConnect - 確認コード'
        EmailMessage: 'MedConnectへようこそ。確認コードは {####} です。'

      # 高度なセキュリティ設定
      UserPoolAddOns:
        AdvancedSecurityMode: ENFORCED

      # デバイス追跡
      DeviceConfiguration:
        ChallengeRequiredOnNewDevice: true
        DeviceOnlyRememberedOnUserPrompt: true

      # Lambda トリガー
      LambdaConfig:
        PreSignUp: !GetAtt PreSignUpFunction.Arn
        PostAuthentication: !GetAtt PostAuthFunction.Arn
        CustomMessage: !GetAtt CustomMessageFunction.Arn

      # 削除保護
      DeletionProtection: !If [IsProd, ACTIVE, INACTIVE]

      Tags:
        - Key: Environment
          Value: !Ref Environment

  #============================================
  # User Pool Domain
  #============================================
  UserPoolDomain:
    Type: AWS::Cognito::UserPoolDomain
    Properties:
      Domain: !Sub '${DomainPrefix}-${Environment}'
      UserPoolId: !Ref UserPool

  #============================================
  # User Pool Groups
  #============================================
  PatientsGroup:
    Type: AWS::Cognito::UserPoolGroup
    Properties:
      GroupName: patients
      UserPoolId: !Ref UserPool
      Description: Patient users
      Precedence: 3

  DoctorsGroup:
    Type: AWS::Cognito::UserPoolGroup
    Properties:
      GroupName: doctors
      UserPoolId: !Ref UserPool
      Description: Doctor users (MFA required)
      Precedence: 2

  AdminsGroup:
    Type: AWS::Cognito::UserPoolGroup
    Properties:
      GroupName: admins
      UserPoolId: !Ref UserPool
      Description: Administrator users
      Precedence: 1

  #============================================
  # App Clients
  #============================================
  # 患者用アプリクライアント
  PatientAppClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      ClientName: !Sub 'medconnect-patient-app-${Environment}'
      UserPoolId: !Ref UserPool
      GenerateSecret: false  # SPAの場合はfalse

      # 認証フロー
      ExplicitAuthFlows:
        - ALLOW_USER_SRP_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH

      # OAuth設定
      AllowedOAuthFlows:
        - code
      AllowedOAuthFlowsUserPoolClient: true
      AllowedOAuthScopes:
        - email
        - openid
        - profile
        - medconnect/patient.read
        - medconnect/patient.write

      # コールバックURL
      CallbackURLs:
        - !If [IsProd, 'https://app.medconnect.example.com/callback', 'http://localhost:3000/callback']
      LogoutURLs:
        - !If [IsProd, 'https://app.medconnect.example.com/logout', 'http://localhost:3000/logout']

      SupportedIdentityProviders:
        - COGNITO

      # トークン有効期限
      AccessTokenValidity: 1  # 1時間
      IdTokenValidity: 1      # 1時間
      RefreshTokenValidity: 30 # 30日
      TokenValidityUnits:
        AccessToken: hours
        IdToken: hours
        RefreshToken: days

      # セキュリティ設定
      PreventUserExistenceErrors: ENABLED
      EnableTokenRevocation: true

  # 医師用ポータルクライアント
  DoctorPortalClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      ClientName: !Sub 'medconnect-doctor-portal-${Environment}'
      UserPoolId: !Ref UserPool
      GenerateSecret: true  # サーバーサイドの場合

      ExplicitAuthFlows:
        - ALLOW_USER_SRP_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH

      AllowedOAuthFlows:
        - code
      AllowedOAuthFlowsUserPoolClient: true
      AllowedOAuthScopes:
        - email
        - openid
        - profile
        - medconnect/doctor.read
        - medconnect/doctor.write
        - medconnect/patient.read

      CallbackURLs:
        - !If [IsProd, 'https://doctor.medconnect.example.com/callback', 'http://localhost:3001/callback']
      LogoutURLs:
        - !If [IsProd, 'https://doctor.medconnect.example.com/logout', 'http://localhost:3001/logout']

      SupportedIdentityProviders:
        - COGNITO

      # より短いトークン有効期限（セキュリティ強化）
      AccessTokenValidity: 30   # 30分
      IdTokenValidity: 30       # 30分
      RefreshTokenValidity: 7   # 7日
      TokenValidityUnits:
        AccessToken: minutes
        IdToken: minutes
        RefreshToken: days

      PreventUserExistenceErrors: ENABLED
      EnableTokenRevocation: true

  # 管理者用クライアント
  AdminConsoleClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      ClientName: !Sub 'medconnect-admin-console-${Environment}'
      UserPoolId: !Ref UserPool
      GenerateSecret: true

      ExplicitAuthFlows:
        - ALLOW_USER_SRP_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH

      AllowedOAuthFlows:
        - code
      AllowedOAuthFlowsUserPoolClient: true
      AllowedOAuthScopes:
        - email
        - openid
        - profile
        - medconnect/admin.read
        - medconnect/admin.write

      CallbackURLs:
        - !If [IsProd, 'https://admin.medconnect.example.com/callback', 'http://localhost:3002/callback']
      LogoutURLs:
        - !If [IsProd, 'https://admin.medconnect.example.com/logout', 'http://localhost:3002/logout']

      SupportedIdentityProviders:
        - COGNITO

      # 最も短いトークン有効期限
      AccessTokenValidity: 15   # 15分
      IdTokenValidity: 15       # 15分
      RefreshTokenValidity: 1   # 1日
      TokenValidityUnits:
        AccessToken: minutes
        IdToken: minutes
        RefreshToken: days

      PreventUserExistenceErrors: ENABLED
      EnableTokenRevocation: true

  #============================================
  # Resource Server (API Scopes)
  #============================================
  ResourceServer:
    Type: AWS::Cognito::UserPoolResourceServer
    Properties:
      Identifier: medconnect
      Name: MedConnect API
      UserPoolId: !Ref UserPool
      Scopes:
        - ScopeName: patient.read
          ScopeDescription: Read patient data
        - ScopeName: patient.write
          ScopeDescription: Write patient data
        - ScopeName: doctor.read
          ScopeDescription: Read doctor data
        - ScopeName: doctor.write
          ScopeDescription: Write doctor data
        - ScopeName: admin.read
          ScopeDescription: Read admin data
        - ScopeName: admin.write
          ScopeDescription: Write admin data

  #============================================
  # Lambda Triggers
  #============================================
  PreSignUpFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'medconnect-presignup-${Environment}'
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt LambdaTriggerRole.Arn
      Timeout: 10
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            console.log('PreSignUp trigger:', JSON.stringify(event));

            const userType = event.request.userAttributes['custom:user_type'];
            const medicalLicense = event.request.userAttributes['custom:medical_license'];

            // 医師登録の場合、医師免許番号を確認
            if (userType === 'doctor') {
              if (!medicalLicense || medicalLicense.length < 6) {
                throw new Error('医師登録には有効な医師免許番号が必要です');
              }
              // TODO: 外部APIで医師免許番号を検証
            }

            // 自動確認（本番では管理者承認フローを追加）
            event.response.autoConfirmUser = false;
            event.response.autoVerifyEmail = false;

            return event;
          };

  PostAuthFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'medconnect-postauth-${Environment}'
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt LambdaTriggerRole.Arn
      Timeout: 10
      Environment:
        Variables:
          LOG_GROUP_NAME: !Sub '/medconnect/auth-audit/${Environment}'
      Code:
        ZipFile: |
          const { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand, DescribeLogStreamsCommand } = require('@aws-sdk/client-cloudwatch-logs');

          const logsClient = new CloudWatchLogsClient({});

          exports.handler = async (event) => {
            console.log('PostAuthentication trigger:', JSON.stringify(event));

            const logGroupName = process.env.LOG_GROUP_NAME;
            const logStreamName = new Date().toISOString().split('T')[0];

            // 監査ログを記録
            const auditLog = {
              timestamp: new Date().toISOString(),
              eventType: 'LOGIN',
              userId: event.userName,
              email: event.request.userAttributes.email,
              userType: event.request.userAttributes['custom:user_type'],
              sourceIp: event.request.clientMetadata?.sourceIp || 'unknown',
              deviceId: event.request.clientMetadata?.deviceId || 'unknown',
              success: true
            };

            try {
              // ログストリームの存在確認・作成
              try {
                await logsClient.send(new CreateLogStreamCommand({
                  logGroupName,
                  logStreamName
                }));
              } catch (e) {
                if (e.name !== 'ResourceAlreadyExistsException') throw e;
              }

              // シーケンストークン取得
              const describeResult = await logsClient.send(new DescribeLogStreamsCommand({
                logGroupName,
                logStreamNamePrefix: logStreamName
              }));

              const sequenceToken = describeResult.logStreams?.[0]?.uploadSequenceToken;

              // ログ書き込み
              await logsClient.send(new PutLogEventsCommand({
                logGroupName,
                logStreamName,
                logEvents: [{
                  timestamp: Date.now(),
                  message: JSON.stringify(auditLog)
                }],
                sequenceToken
              }));

            } catch (error) {
              console.error('Audit log error:', error);
              // 監査ログの失敗でログインを妨げない
            }

            return event;
          };

  CustomMessageFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'medconnect-custommessage-${Environment}'
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt LambdaTriggerRole.Arn
      Timeout: 10
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            console.log('CustomMessage trigger:', JSON.stringify(event));

            const name = event.request.userAttributes.name || 'お客様';

            if (event.triggerSource === 'CustomMessage_SignUp') {
              event.response.emailSubject = 'MedConnect - アカウント確認';
              event.response.emailMessage = `
                ${name}様

                MedConnectへのご登録ありがとうございます。

                確認コード: ${event.request.codeParameter}

                このコードは24時間有効です。

                ※このメールに心当たりがない場合は、破棄してください。

                MedConnect サポートチーム
              `;
            } else if (event.triggerSource === 'CustomMessage_ForgotPassword') {
              event.response.emailSubject = 'MedConnect - パスワードリセット';
              event.response.emailMessage = `
                ${name}様

                パスワードリセットのリクエストを受け付けました。

                リセットコード: ${event.request.codeParameter}

                このコードは1時間有効です。

                ※このリクエストに心当たりがない場合は、
                すぐにsupport@medconnect.example.comまでご連絡ください。

                MedConnect サポートチーム
              `;
            }

            return event;
          };

  # Lambda実行ロール
  LambdaTriggerRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'medconnect-lambda-trigger-role-${Environment}'
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
        - PolicyName: CloudWatchLogsAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - logs:CreateLogStream
                  - logs:PutLogEvents
                  - logs:DescribeLogStreams
                Resource: !Sub 'arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/medconnect/auth-audit/${Environment}:*'

  # Lambda実行権限（Cognito）
  PreSignUpPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref PreSignUpFunction
      Action: lambda:InvokeFunction
      Principal: cognito-idp.amazonaws.com
      SourceArn: !GetAtt UserPool.Arn

  PostAuthPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref PostAuthFunction
      Action: lambda:InvokeFunction
      Principal: cognito-idp.amazonaws.com
      SourceArn: !GetAtt UserPool.Arn

  CustomMessagePermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref CustomMessageFunction
      Action: lambda:InvokeFunction
      Principal: cognito-idp.amazonaws.com
      SourceArn: !GetAtt UserPool.Arn

  # 監査ログ用ロググループ
  AuditLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/medconnect/auth-audit/${Environment}'
      RetentionInDays: 2557  # 約7年

Conditions:
  IsProd: !Equals [!Ref Environment, prod]

Outputs:
  UserPoolId:
    Value: !Ref UserPool
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolId'

  UserPoolArn:
    Value: !GetAtt UserPool.Arn
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolArn'

  UserPoolDomain:
    Value: !Sub 'https://${DomainPrefix}-${Environment}.auth.${AWS::Region}.amazoncognito.com'
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolDomain'

  PatientAppClientId:
    Value: !Ref PatientAppClient
    Export:
      Name: !Sub '${AWS::StackName}-PatientAppClientId'

  DoctorPortalClientId:
    Value: !Ref DoctorPortalClient
    Export:
      Name: !Sub '${AWS::StackName}-DoctorPortalClientId'

  AdminConsoleClientId:
    Value: !Ref AdminConsoleClient
    Export:
      Name: !Sub '${AWS::StackName}-AdminConsoleClientId'
```

### Phase 2: API Gateway統合

```yaml
# cfn/api-gateway.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'MedConnect API Gateway with Cognito Authorization'

Parameters:
  Environment:
    Type: String
    Default: dev

  UserPoolId:
    Type: String
    Description: Cognito User Pool ID

  UserPoolArn:
    Type: String
    Description: Cognito User Pool ARN

Resources:
  #============================================
  # REST API
  #============================================
  MedConnectApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: !Sub 'medconnect-api-${Environment}'
      Description: MedConnect API
      EndpointConfiguration:
        Types:
          - REGIONAL

  #============================================
  # Cognito Authorizer
  #============================================
  CognitoAuthorizer:
    Type: AWS::ApiGateway::Authorizer
    Properties:
      Name: !Sub 'medconnect-cognito-authorizer-${Environment}'
      Type: COGNITO_USER_POOLS
      RestApiId: !Ref MedConnectApi
      IdentitySource: method.request.header.Authorization
      ProviderARNs:
        - !Ref UserPoolArn

  #============================================
  # /patients リソース
  #============================================
  PatientsResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref MedConnectApi
      ParentId: !GetAtt MedConnectApi.RootResourceId
      PathPart: patients

  PatientsMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref MedConnectApi
      ResourceId: !Ref PatientsResource
      HttpMethod: GET
      AuthorizationType: COGNITO_USER_POOLS
      AuthorizerId: !Ref CognitoAuthorizer
      AuthorizationScopes:
        - medconnect/patient.read
        - medconnect/doctor.read
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${PatientsFunction.Arn}/invocations'

  #============================================
  # /doctors リソース
  #============================================
  DoctorsResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref MedConnectApi
      ParentId: !GetAtt MedConnectApi.RootResourceId
      PathPart: doctors

  DoctorsMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref MedConnectApi
      ResourceId: !Ref DoctorsResource
      HttpMethod: GET
      AuthorizationType: COGNITO_USER_POOLS
      AuthorizerId: !Ref CognitoAuthorizer
      AuthorizationScopes:
        - medconnect/doctor.read
        - medconnect/admin.read
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${DoctorsFunction.Arn}/invocations'

  #============================================
  # /admin リソース
  #============================================
  AdminResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref MedConnectApi
      ParentId: !GetAtt MedConnectApi.RootResourceId
      PathPart: admin

  AdminMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref MedConnectApi
      ResourceId: !Ref AdminResource
      HttpMethod: GET
      AuthorizationType: COGNITO_USER_POOLS
      AuthorizerId: !Ref CognitoAuthorizer
      AuthorizationScopes:
        - medconnect/admin.read
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${AdminFunction.Arn}/invocations'

  #============================================
  # Lambda Functions
  #============================================
  PatientsFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'medconnect-patients-api-${Environment}'
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt ApiLambdaRole.Arn
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            console.log('Patients API:', JSON.stringify(event));

            // Cognitoからのクレーム取得
            const claims = event.requestContext.authorizer.claims;
            const userId = claims.sub;
            const groups = claims['cognito:groups'] || '';

            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                message: 'Patients API',
                userId,
                groups,
                data: [
                  { id: 'P001', name: '患者A' },
                  { id: 'P002', name: '患者B' }
                ]
              })
            };
          };

  DoctorsFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'medconnect-doctors-api-${Environment}'
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt ApiLambdaRole.Arn
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            console.log('Doctors API:', JSON.stringify(event));

            const claims = event.requestContext.authorizer.claims;

            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                message: 'Doctors API',
                userId: claims.sub,
                data: [
                  { id: 'D001', name: '医師A', specialty: '内科' }
                ]
              })
            };
          };

  AdminFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'medconnect-admin-api-${Environment}'
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt ApiLambdaRole.Arn
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            console.log('Admin API:', JSON.stringify(event));

            const claims = event.requestContext.authorizer.claims;
            const groups = claims['cognito:groups']?.split(',') || [];

            // 管理者グループチェック
            if (!groups.includes('admins')) {
              return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Access denied. Admin group required.' })
              };
            }

            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                message: 'Admin API',
                userId: claims.sub,
                adminData: {
                  userCount: 35000,
                  activeUsers: 5000
                }
              })
            };
          };

  # Lambda実行ロール
  ApiLambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'medconnect-api-lambda-role-${Environment}'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  # Lambda実行権限（API Gateway）
  PatientsFunctionPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref PatientsFunction
      Action: lambda:InvokeFunction
      Principal: apigateway.amazonaws.com
      SourceArn: !Sub 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${MedConnectApi}/*'

  DoctorsFunctionPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref DoctorsFunction
      Action: lambda:InvokeFunction
      Principal: apigateway.amazonaws.com
      SourceArn: !Sub 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${MedConnectApi}/*'

  AdminFunctionPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref AdminFunction
      Action: lambda:InvokeFunction
      Principal: apigateway.amazonaws.com
      SourceArn: !Sub 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${MedConnectApi}/*'

  #============================================
  # API Deployment
  #============================================
  ApiDeployment:
    Type: AWS::ApiGateway::Deployment
    DependsOn:
      - PatientsMethod
      - DoctorsMethod
      - AdminMethod
    Properties:
      RestApiId: !Ref MedConnectApi

  ApiStage:
    Type: AWS::ApiGateway::Stage
    Properties:
      RestApiId: !Ref MedConnectApi
      DeploymentId: !Ref ApiDeployment
      StageName: !Ref Environment
      MethodSettings:
        - ResourcePath: '/*'
          HttpMethod: '*'
          LoggingLevel: INFO
          DataTraceEnabled: true
          MetricsEnabled: true

Outputs:
  ApiEndpoint:
    Value: !Sub 'https://${MedConnectApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}'
    Export:
      Name: !Sub '${AWS::StackName}-ApiEndpoint'
```

### Phase 3: 認証テストスクリプト

```python
# scripts/test_auth.py
"""
Cognito認証テストスクリプト
"""
import boto3
import hmac
import hashlib
import base64
import requests
import json

def calculate_secret_hash(username, client_id, client_secret):
    """クライアントシークレットハッシュを計算"""
    message = username + client_id
    dig = hmac.new(
        client_secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()


def sign_up_user(user_pool_id, client_id, client_secret, email, password, name, user_type):
    """ユーザー登録"""
    cognito = boto3.client('cognito-idp')

    secret_hash = calculate_secret_hash(email, client_id, client_secret)

    try:
        response = cognito.sign_up(
            ClientId=client_id,
            SecretHash=secret_hash,
            Username=email,
            Password=password,
            UserAttributes=[
                {'Name': 'email', 'Value': email},
                {'Name': 'name', 'Value': name},
                {'Name': 'custom:user_type', 'Value': user_type},
            ]
        )
        print(f"User registered: {email}")
        return response
    except cognito.exceptions.UsernameExistsException:
        print(f"User already exists: {email}")
        return None
    except Exception as e:
        print(f"Registration failed: {e}")
        raise


def confirm_user(user_pool_id, client_id, client_secret, email, confirmation_code):
    """ユーザー確認"""
    cognito = boto3.client('cognito-idp')

    secret_hash = calculate_secret_hash(email, client_id, client_secret)

    response = cognito.confirm_sign_up(
        ClientId=client_id,
        SecretHash=secret_hash,
        Username=email,
        ConfirmationCode=confirmation_code
    )
    print(f"User confirmed: {email}")
    return response


def admin_confirm_user(user_pool_id, email):
    """管理者によるユーザー確認（テスト用）"""
    cognito = boto3.client('cognito-idp')

    response = cognito.admin_confirm_sign_up(
        UserPoolId=user_pool_id,
        Username=email
    )
    print(f"User admin confirmed: {email}")
    return response


def add_user_to_group(user_pool_id, email, group_name):
    """ユーザーをグループに追加"""
    cognito = boto3.client('cognito-idp')

    response = cognito.admin_add_user_to_group(
        UserPoolId=user_pool_id,
        Username=email,
        GroupName=group_name
    )
    print(f"User {email} added to group {group_name}")
    return response


def authenticate_user(client_id, client_secret, email, password):
    """ユーザー認証"""
    cognito = boto3.client('cognito-idp')

    secret_hash = calculate_secret_hash(email, client_id, client_secret)

    try:
        response = cognito.initiate_auth(
            ClientId=client_id,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': email,
                'PASSWORD': password,
                'SECRET_HASH': secret_hash
            }
        )

        if 'ChallengeName' in response:
            print(f"Challenge required: {response['ChallengeName']}")
            return response

        tokens = response['AuthenticationResult']
        print(f"Authentication successful!")
        print(f"  Access Token: {tokens['AccessToken'][:50]}...")
        print(f"  ID Token: {tokens['IdToken'][:50]}...")
        print(f"  Expires In: {tokens['ExpiresIn']} seconds")
        return tokens

    except Exception as e:
        print(f"Authentication failed: {e}")
        raise


def call_api(api_endpoint, path, access_token):
    """APIを呼び出し"""
    headers = {
        'Authorization': access_token,
        'Content-Type': 'application/json'
    }

    url = f"{api_endpoint}{path}"
    response = requests.get(url, headers=headers)

    print(f"\nAPI Call: GET {url}")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    return response


if __name__ == '__main__':
    import os

    # 環境変数から設定を取得
    user_pool_id = os.environ.get('USER_POOL_ID')
    client_id = os.environ.get('CLIENT_ID')
    client_secret = os.environ.get('CLIENT_SECRET')
    api_endpoint = os.environ.get('API_ENDPOINT')

    # テストユーザー作成
    test_email = 'test-patient@example.com'
    test_password = 'TestPassword123!'

    # 1. ユーザー登録
    print("=" * 50)
    print("1. User Registration")
    print("=" * 50)
    sign_up_user(
        user_pool_id, client_id, client_secret,
        test_email, test_password, 'テスト患者', 'patient'
    )

    # 2. 管理者確認（テスト用）
    print("\n" + "=" * 50)
    print("2. Admin Confirm User")
    print("=" * 50)
    admin_confirm_user(user_pool_id, test_email)

    # 3. グループに追加
    print("\n" + "=" * 50)
    print("3. Add User to Group")
    print("=" * 50)
    add_user_to_group(user_pool_id, test_email, 'patients')

    # 4. 認証
    print("\n" + "=" * 50)
    print("4. Authentication")
    print("=" * 50)
    tokens = authenticate_user(client_id, client_secret, test_email, test_password)

    # 5. API呼び出し
    if api_endpoint and 'AccessToken' in tokens:
        print("\n" + "=" * 50)
        print("5. API Calls")
        print("=" * 50)

        # 患者API（成功するはず）
        call_api(api_endpoint, '/patients', tokens['AccessToken'])

        # 医師API（スコープ不足で失敗するかも）
        call_api(api_endpoint, '/doctors', tokens['AccessToken'])

        # 管理者API（グループ不足で失敗するはず）
        call_api(api_endpoint, '/admin', tokens['AccessToken'])
```

---

## 8. トラブルシューティング演習

### 演習8-1: MFA設定の問題

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-1                      │
│                  MFA設定の問題                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  医師ユーザーがMFAを設定しようとしているが、                     │
│  「MFA設定が利用できません」というエラーが表示される。           │
│                                                                  │
│  【エラーメッセージ】                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  InvalidParameterException: User pool does not have         ││
│  │  MFA enabled                                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. MFAが有効になっていない原因を特定してください                │
│  2. CloudFormationテンプレートを修正してください                 │
│  3. 既存ユーザーへの影響を確認してください                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 演習8-2: トークンの検証エラー

```
┌─────────────────────────────────────────────────────────────────┐
│              トラブルシューティング演習 8-2                      │
│                トークン検証エラー                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【状況】                                                        │
│  有効なはずのアクセストークンでAPI呼び出しをしているが、         │
│  401 Unauthorizedエラーが返される。                              │
│                                                                  │
│  【エラーログ】                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  API Gateway execution log:                                 ││
│  │  Unauthorized request: JWT token expired                    ││
│  │                                                              ││
│  │  Token exp claim: 1704067200 (2024-01-01 00:00:00)          ││
│  │  Current time: 1704153600 (2024-01-02 00:00:00)             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【課題】                                                        │
│  1. トークン期限切れの原因を確認してください                     │
│  2. リフレッシュトークンによる更新処理を実装してください         │
│  3. クライアント側のトークン管理を改善してください               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 設計課題

### 設計課題9-1: ソーシャルログイン対応

```
┌─────────────────────────────────────────────────────────────────┐
│                      設計課題 9-1                                │
│                 ソーシャルログイン対応                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【課題】                                                        │
│  患者向けアプリにGoogleとAppleでのソーシャルログインを           │
│  追加してください。                                              │
│                                                                  │
│  【要件】                                                        │
│  ・Google / Apple Sign-Inの統合                                  │
│  ・既存メールユーザーとのアカウントリンク                        │
│  ・ソーシャルログインユーザーの属性マッピング                    │
│  ・MFA要件の調整（ソーシャルログインはMFA不要）                  │
│                                                                  │
│  【成果物】                                                      │
│  1. Identity Provider設定                                        │
│  2. 属性マッピング設計                                           │
│  3. CloudFormationテンプレート                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. 発展課題

### 発展課題10-1: リスクベース認証

```
┌─────────────────────────────────────────────────────────────────┐
│                      発展課題 10-1                               │
│                 リスクベース認証                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【シナリオ】                                                    │
│  不正アクセスを検知し、リスクレベルに応じて                      │
│  追加認証を要求する仕組みを実装したい。                          │
│                                                                  │
│  【技術要件】                                                    │
│  ・Cognitoの高度なセキュリティ機能の活用                        │
│  ・異常なログインパターンの検出                                  │
│  ・リスクスコアに基づくMFA要求                                  │
│  ・ブロックリスト/許可リストの管理                              │
│                                                                  │
│  【成果物】                                                      │
│  1. リスク評価ロジック設計                                       │
│  2. Lambda トリガー実装                                          │
│  3. 監視ダッシュボード                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. 学習のまとめ

### 学習チェックリスト

```
┌─────────────────────────────────────────────────────────────────┐
│                     学習チェックリスト                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【Cognito基礎】                                                 │
│  □ User Pool / Identity Pool の違いを説明できる                 │
│  □ OAuth 2.0 / OIDC フローを理解した                            │
│  □ ID/Access/Refresh トークンの役割を説明できる                 │
│  □ App Clientの設定ができる                                     │
│                                                                  │
│  【セキュリティ】                                                │
│  □ パスワードポリシーを適切に設定できる                         │
│  □ MFAを設定できる                                              │
│  □ Lambda トリガーを実装できる                                  │
│  □ 監査ログを設定できる                                         │
│                                                                  │
│  【API Gateway統合】                                             │
│  □ Cognito Authorizerを設定できる                               │
│  □ スコープベースのアクセス制御ができる                         │
│  □ グループベースのアクセス制御ができる                         │
│                                                                  │
│  【CloudFormation】                                              │
│  □ User Poolを定義できる                                        │
│  □ App Clientを定義できる                                       │
│  □ Lambda トリガーを統合できる                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. コスト見積もり

### 想定コスト（月額）

```
┌─────────────────────────────────────────────────────────────────┐
│                      コスト見積もり                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【Cognito料金】                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ・最初の50,000 MAU: 無料                                   ││
│  │  ・50,001〜100,000 MAU: $0.0055/MAU                         ││
│  │  ・100,001以上: $0.0046/MAU                                 ││
│  │  ・高度なセキュリティ: $0.05/MAU                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  【想定コスト（MAU 35,000）】                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  項目                    │ 数量            │ 月額（USD）    ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  Cognito基本料金         │ 35,000 MAU      │ $0 (無料枠内)  ││
│  │  高度なセキュリティ      │ 35,000 MAU      │ $1,750         ││
│  │  SMS MFA                 │ 5,000通/月      │ $40            ││
│  │  API Gateway             │ 1M リクエスト   │ $3.50          ││
│  │  Lambda                  │ 500K 呼び出し   │ $0.10          ││
│  │  CloudWatch Logs         │ 10GB            │ $5.00          ││
│  ├──────────────────────────┼─────────────────┼────────────────┤│
│  │  小計                    │                 │ 約 $1,800      ││
│  │                          │                 │ (約 ¥270,000)  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ※高度なセキュリティを無効にすると大幅にコスト削減可能          │
│  ※開発環境では $5/月 程度                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## リソースのクリーンアップ

```bash
# CloudFormationスタック削除
aws cloudformation delete-stack --stack-name medconnect-api-gateway-dev
aws cloudformation delete-stack --stack-name medconnect-cognito-dev

# 削除完了を待機
aws cloudformation wait stack-delete-complete --stack-name medconnect-cognito-dev

echo "Cleanup completed!"
```

---

**次の課題**: [課題39: TeamHub マルチテナント認証](exercise-39.md)

**前の課題**: [課題37: CreditAI MLOpsパイプライン](exercise-37.md)
