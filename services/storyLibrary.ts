/**
 * 🎭 魔法等待故事素材库 v2.0
 *
 * 设计原则：
 * - 每条消息 50-100 字，内容丰富生动
 * - 情理之外，意料之中的戏剧张力
 * - 完整叙事弧线：开始 → 发展 → 高潮 → 结束
 * - 每个主题 6 套变体，共 48 套故事线
 *
 * 此文件保留用于向后兼容，实际实现已迁移至 storyLibrary/ 目录。
 */

// 重新导出所有内容，保持现有 import 路径不变
export type { StoryVariant, StoryTheme, StoryLibrary } from './storyLibrary/index';
export { storyLibrary } from './storyLibrary/index';
export {
  magicTheme,
  scifiTheme,
  natureTheme,
  cyberpunkTheme,
  steampunkTheme,
  orientalTheme,
  mythologyTheme,
  gothicTheme,
} from './storyLibrary/index';
export {
  matchStoryTheme,
  getRandomVariant,
  getMessagesForResolution,
  getIntervalForResolution,
  getMatchedStory,
} from './storyLibrary/index';
