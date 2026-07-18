/**
 * 🎭 故事匹配算法
 * 根据用户提示词匹配最佳故事主题，并控制故事长度。
 */
import type { StoryTheme, StoryVariant } from './types';
import { storyLibrary } from './data';

/**
 * 根据提示词匹配最佳故事主题
 * @param prompt 用户输入的提示词
 * @returns 匹配的故事主题
 */
export function matchStoryTheme(prompt: string): StoryTheme {
  const normalizedPrompt = prompt.toLowerCase();

  let bestMatch: StoryTheme | null = null;
  let bestScore = 0;

  for (const theme of storyLibrary.themes) {
    let score = 0;

    for (const keyword of theme.keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      if (normalizedPrompt.includes(normalizedKeyword)) {
        // 关键词越长，权重越高（避免短词误匹配）
        score += normalizedKeyword.length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = theme;
    }
  }

  // 如果没有匹配到，返回默认主题
  if (!bestMatch || bestScore === 0) {
    return storyLibrary.themes.find(t => t.id === storyLibrary.defaultThemeId) || storyLibrary.themes[0];
  }

  return bestMatch;
}

/**
 * 从主题中随机选择一个故事变体
 * @param theme 故事主题
 * @returns 随机选择的故事变体
 */
export function getRandomVariant(theme: StoryTheme): StoryVariant {
  const randomIndex = Math.floor(Math.random() * theme.variants.length);
  return theme.variants[randomIndex];
}

/**
 * 根据分辨率截取故事长度
 * @param messages 完整故事消息
 * @param imageSize 分辨率 ('1K' | '2K' | '4K')
 * @returns 截取后的消息数组
 */
export function getMessagesForResolution(messages: string[], imageSize: string): string[] {
  switch (imageSize) {
    case '4K':
      // 4K: 完整 15 条，每条 5 秒 = 75 秒
      return messages;
    case '2K':
      // 2K: 10 条，每条 4.5 秒 = 45 秒
      return messages.slice(0, 10);
    case '1K':
    default:
      // 1K: 6 条，每条 4 秒 = 24 秒
      return messages.slice(0, 6);
  }
}

/**
 * 根据分辨率获取消息切换间隔
 * @param imageSize 分辨率
 * @returns 间隔毫秒数
 */
export function getIntervalForResolution(imageSize: string): number {
  switch (imageSize) {
    case '4K':
      return 5000;
    case '2K':
      return 4500;
    case '1K':
    default:
      return 4000;
  }
}

/**
 * 一站式获取匹配的故事
 * @param prompt 用户提示词
 * @param imageSize 分辨率
 * @returns 包含主题信息和消息的对象
 */
export function getMatchedStory(prompt: string, imageSize: string, forceThemeId?: string): {
  theme: StoryTheme;
  variant: StoryVariant;
  messages: string[];
  interval: number;
} {
  // 如果指定了主题ID且不是 'auto'，优先使用指定主题
  let theme: StoryTheme;
  if (forceThemeId && forceThemeId !== 'auto') {
    theme = storyLibrary.themes.find(t => t.id === forceThemeId) || matchStoryTheme(prompt);
  } else {
    theme = matchStoryTheme(prompt);
  }
  const variant = getRandomVariant(theme);
  const messages = getMessagesForResolution(variant.messages, imageSize);
  const interval = getIntervalForResolution(imageSize);

  return { theme, variant, messages, interval };
}
