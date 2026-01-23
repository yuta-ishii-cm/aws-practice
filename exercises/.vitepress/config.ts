import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import taskLists from 'markdown-it-task-lists'

export default withMermaid(defineConfig({
  title: 'AWS Practice',
  description: 'AWS学習ロードマップ - 45問の実践演習',
  lang: 'ja-JP',
  ignoreDeadLinks: true,

  vite: {
    optimizeDeps: {
      include: ['mermaid', 'dayjs']
    }
  },

  // Mermaid設定
  mermaid: {
    // architecture-beta等の実験的機能を有効化するためのテーマ設定
    theme: 'default'
  },

  markdown: {
    config: (md) => {
      md.use(taskLists, { enabled: true })
    }
  },

  themeConfig: {
    nav: [
      { text: 'ホーム', link: '/' },
      { text: 'ロードマップ', link: '/ROADMAP' }
    ],

    sidebar: [
      { text: 'ロードマップ', link: '/ROADMAP' },
      { text: '01. ランチガチャAPI', link: '/exercise-01' },
      { text: '02. 商品カタログ写真の自動アーカイブ', link: '/exercise-02' },
      { text: '03. 予約システムの死活監視', link: '/exercise-03' },
      { text: '04. AWSコスト異常アラート', link: '/exercise-04' },
      { text: '05. 社内イベント管理システム', link: '/exercise-05' },
      { text: '06. 月次レポート自動生成', link: '/exercise-06' },
      { text: '07. 旅行予約サイトのサーバーレスAPI基盤', link: '/exercise-07' },
      { text: '08. カスタマーサポート自動化', link: '/exercise-08' },
      { text: '09. ECレビュー分析・インサイト抽出', link: '/exercise-09' },
      { text: '10. 物件画像自動分析システム', link: '/exercise-10' },
      { text: '11. 動画教材自動字幕生成', link: '/exercise-11' },
      { text: '12. AIマッチング非同期処理', link: '/exercise-12' },
      { text: '13. ヘルスケアアプリのマイクロサービス化', link: '/exercise-13' },
      { text: '14. スタートアップの開発環境自動構築', link: '/exercise-14' },
      { text: '15. ゲーム会社のマルチ環境管理', link: '/exercise-15' },
      { text: '16. スタートアップのコンテナCI/CD構築', link: '/exercise-16' },
      { text: '17. ニュースメディアのCMS基盤', link: '/exercise-17' },
      { text: '18. EC企業のデータレイク構築', link: '/exercise-18' },
      { text: '19. 配車サービスの統合監視基盤', link: '/exercise-19' },
      { text: '20. AWS基盤設計（Organizations）', link: '/exercise-20' },
      { text: '21. 金融系SaaSのセキュア基盤', link: '/exercise-21' },
      { text: '22. グローバルWebサービスのDDoS対策', link: '/exercise-22' },
      { text: '23. Cognito認証基盤', link: '/exercise-23' },
      { text: '24. 動画エンコーディングパイプライン', link: '/exercise-24' },
      { text: '25. 設備異常検知AIモデル運用基盤', link: '/exercise-25' },
      { text: '26. 契約書レビュー支援システム', link: '/exercise-26' },
      { text: '27. SageMaker モデル基盤', link: '/exercise-27' },
      { text: '28. CreditAI MLOpsパイプライン', link: '/exercise-28' },
      { text: '29. センサーデータ集計・異常検知', link: '/exercise-29' },
      { text: '30. DynamoDB実践設計', link: '/exercise-30' },
      { text: '31. モバイルアプリのリアルタイム分析', link: '/exercise-31' },
      { text: '32. 小売業のデータウェアハウス', link: '/exercise-32' },
      { text: '33. 広告テック企業のマイクロサービスCI/CD', link: '/exercise-33' },
      { text: '34. Fintech企業のゼロダウンタイムデプロイ', link: '/exercise-34' },
      { text: '35. PayEasy Step Functionsワークフロー', link: '/exercise-35' },
      { text: '36. ヘルスケア企業のセキュリティ監視', link: '/exercise-36' },
      { text: '37. TechCorp IAM Identity Center', link: '/exercise-37' },
      { text: '38. TeamHub マルチテナントSaaS認証', link: '/exercise-38' },
      { text: '39. マーケティングSaaSのコスト最適化', link: '/exercise-39' },
      { text: '40. AWS FIS カオスエンジニアリング', link: '/exercise-40' },
      { text: '41. グローバル展開のマルチリージョン構成', link: '/exercise-41' },
      { text: '42. 物流企業のイベント駆動配送管理', link: '/exercise-42' },
      { text: '43. SaaS企業のマルチテナント基盤', link: '/exercise-43' },
      { text: '44. 小売チェーンの在庫管理API', link: '/exercise-44' },
      { text: '45. 統合課題 - AWSアーキテクチャ総合演習', link: '/exercise-45' }
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
