/**
 * 🎭 故事主题数据 — 汇总入口
 * 按顺序导入所有主题，构建完整的 storyLibrary 对象。
 */
import type { StoryLibrary } from '../types';
import { magicTheme } from './magic';
import { scifiTheme } from './scifi';
import { natureTheme } from './nature';
import { cyberpunkTheme } from './cyberpunk';
import { steampunkTheme } from './steampunk';
import { orientalTheme } from './oriental';
import { mythologyTheme } from './mythology';
import { gothicTheme } from './gothic';

export const storyLibrary: StoryLibrary = {
  defaultThemeId: 'magic',
  themes: [
    magicTheme,
    scifiTheme,
    natureTheme,
    cyberpunkTheme,
    steampunkTheme,
    orientalTheme,
    mythologyTheme,
    gothicTheme,
  ],
};

// 单独导出每个主题，方便按需引用
export {
  magicTheme,
  scifiTheme,
  natureTheme,
  cyberpunkTheme,
  steampunkTheme,
  orientalTheme,
  mythologyTheme,
  gothicTheme,
};
