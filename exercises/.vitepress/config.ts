import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: 'AWS Practice',
  description: 'AWS学習ロードマップ - 40問の実践演習',
  lang: 'ja-JP',

  vite: {
    optimizeDeps: {
      include: ['mermaid', 'dayjs']
    }
  },

  themeConfig: {
    nav: [
      { text: 'ホーム', link: '/' },
      { text: 'ロードマップ', link: '/ROADMAP' }
    ],

    sidebar: [
      { text: 'ロードマップ', link: '/ROADMAP' },
      { text: '01. CloudShop - サーバーレスECサイト', link: '/exercise-01' },
      { text: '02. CostWatch - コスト最適化', link: '/exercise-02' },
      { text: '03. EventHub - イベント駆動アーキテクチャ', link: '/exercise-03' },
      { text: '04. TalkBot - AIチャットボット', link: '/exercise-04' },
      { text: '05. DocuMind - 生成AIドキュメント処理', link: '/exercise-05' },
      { text: '06. VisualSearch - 画像認識検索', link: '/exercise-06' },
      { text: '07. CodeAssist - AIコード支援', link: '/exercise-07' },
      { text: '08. DevBoost - Organizations Landing Zone', link: '/exercise-08' },
      { text: '09. SecureBank - セキュアAPI基盤', link: '/exercise-09' },
      { text: '10. GlobalCDN - グローバルコンテンツ配信', link: '/exercise-10' },
      { text: '11. MediaFlow - 画像・動画変換パイプライン', link: '/exercise-11' },
      { text: '12. BatchMaster - 大規模バッチ処理', link: '/exercise-12' },
      { text: '13. PayEasy - Step Functionsワークフロー', link: '/exercise-13' },
      { text: '14. DataLake - データレイク構築', link: '/exercise-14' },
      { text: '15. LogWatch - ログ分析プラットフォーム', link: '/exercise-15' },
      { text: '16. MegaMart - DynamoDB実践設計', link: '/exercise-16' },
      { text: '17. VoiceAssist - 音声AIアシスタント', link: '/exercise-17' },
      { text: '18. RAGChat - RAGチャットボット', link: '/exercise-18' },
      { text: '19. ContractAI - 契約書AI分析', link: '/exercise-19' },
      { text: '20. AIWorkflow - マルチモーダルAI処理', link: '/exercise-20' },
      { text: '21. RealtimeAI - リアルタイムAI分析', link: '/exercise-21' },
      { text: '22. PersonalizeAI - AIパーソナライゼーション', link: '/exercise-22' },
      { text: '23. ContainerApp - コンテナ化Webアプリ', link: '/exercise-23' },
      { text: '24. MedConnect - Cognito認証基盤', link: '/exercise-24' },
      { text: '25. TechCorp - IAM Identity Center', link: '/exercise-25' },
      { text: '26. DevOps Pipeline - CI/CDパイプライン', link: '/exercise-26' },
      { text: '27. DisasterGuard - DR/バックアップ', link: '/exercise-27' },
      { text: '28. TaskFlow - マルチリージョン構成', link: '/exercise-28' },
      { text: '29. ComplianceHub - コンプライアンス自動化', link: '/exercise-29' },
      { text: '30. ShopNow - Chaos Engineering', link: '/exercise-30' },
      { text: '31. ServerlessSaaS - サーバーレスSaaS', link: '/exercise-31' },
      { text: '32. TeamHub - マルチテナントSaaS認証', link: '/exercise-32' },
      { text: '33. SmartHome - IoTデバイス管理', link: '/exercise-33' },
      { text: '34. EdgeFactory - エッジコンピューティング', link: '/exercise-34' },
      { text: '35. MLServe - 機械学習推論基盤', link: '/exercise-35' },
      { text: '36. SmartRetail - SageMakerモデル基盤', link: '/exercise-36' },
      { text: '37. CreditAI - MLOpsパイプライン', link: '/exercise-37' },
      { text: '38. MicroServices - マイクロサービス', link: '/exercise-38' },
      { text: '39. HybridConnect - ハイブリッドネットワーク', link: '/exercise-39' },
      { text: '40. MultiAgentAI - マルチエージェントAI', link: '/exercise-40' }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: '目次'
    }
  }
}))
