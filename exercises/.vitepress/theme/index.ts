import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import mermaid from 'mermaid'
import { icons } from '@iconify-json/logos'

// Mermaidにlogosアイコンパックを登録
mermaid.registerIconPacks([
  {
    name: icons.prefix,
    icons
  }
])

export default {
  extends: DefaultTheme
} satisfies Theme
