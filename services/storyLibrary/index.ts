/**
 * 🎭 魔法等待故事素材库 v2.0
 *
 * 设计原则：
 * - 每条消息 50-100 字，内容丰富生动
 * - 情理之外，意料之中的戏剧张力
 * - 完整叙事弧线：开始 → 发展 → 高潮 → 结束
 * - 每个主题 6 套变体，共 48 套故事线
 */

// 类型
export type { StoryVariant, StoryTheme, StoryLibrary } from './types';

// 数据
export { storyLibrary } from './data';
export {
  magicTheme,
  scifiTheme,
  natureTheme,
  cyberpunkTheme,
  steampunkTheme,
  orientalTheme,
  mythologyTheme,
  gothicTheme,
} from './data';

// 算法
export {
  matchStoryTheme,
  getRandomVariant,
  getMessagesForResolution,
  getIntervalForResolution,
  getMatchedStory,
} from './matcher';
