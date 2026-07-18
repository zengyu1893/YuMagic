/**
 * 🎭 魔法等待故事素材库 — 类型定义
 */

export interface StoryVariant {
  id: string;
  messages: string[];  // 完整故事线（15条）
}

export interface StoryTheme {
  id: string;
  name: string;
  emoji: string;
  keywords: string[];  // 匹配关键词（中英文）
  variants: StoryVariant[];
}

export interface StoryLibrary {
  themes: StoryTheme[];
  defaultThemeId: string;
}
