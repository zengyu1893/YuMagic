/**
 * 故事主题偏好服务 — 存储用户手动选择的魔法等待主题
 */
const STORAGE_KEY = 'story_theme_preference';

export type StoryThemePreference = 'auto' | string; // 'auto' = 自动匹配, 或具体主题id

export const getStoryThemePreference = (): StoryThemePreference => {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'auto';
  } catch {
    return 'auto';
  }
};

export const setStoryThemePreference = (theme: StoryThemePreference): void => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
};
