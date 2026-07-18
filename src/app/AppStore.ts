/**
 * 应用级运行时状态，不做长期存储。
 * 仅用于跨页面的临时 UI 状态（如当前视图、侧边栏开关等）。
 *
 * TODO: 随着 feature 拆分推进，逐步将状态迁移到各 feature 的 stores/ 中。
 */

export type AppView = 'editor' | 'local-library' | 'canvas';

export interface AppRuntimeState {
  currentView: AppView;
  isSettingsOpen: boolean;
}

export const DEFAULT_APP_STATE: AppRuntimeState = {
  currentView: 'editor',
  isSettingsOpen: false,
};
