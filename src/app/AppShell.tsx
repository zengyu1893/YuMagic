import React from 'react';
import { AppProviders } from './AppProviders';
import { StartupErrorBoundary } from './StartupErrorBoundary';

/**
 * 目标架构 — 应用壳子。
 * 当前作为迁移目标存在，尚未切换为入口。
 * 迁移完成后 index.tsx 将改为 import AppShell from './src/app/AppShell'。
 *
 * 职责：
 * - Provider 嵌套
 * - 错误边界
 * - 页面路由/视图切换
 *
 * 禁止：
 * - 业务逻辑、默认值、模型列表、请求规则
 */
export const AppShell: React.FC = () => {
  return (
    <StartupErrorBoundary>
      <AppProviders>
        {/* TODO: 迁移完成后在此处挂载 StudioPage */}
        <div className="app-shell-placeholder">
          {/* 当前入口仍为根目录 App.tsx，完成迁移后切换 */}
        </div>
      </AppProviders>
    </StartupErrorBoundary>
  );
};

export default AppShell;
