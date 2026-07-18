import React from 'react';

interface ThreePanelLayoutProps {
  /** 左侧面板 */
  leftPanel?: React.ReactNode;
  /** 中间主区域 */
  mainContent: React.ReactNode;
  /** 右侧面板 */
  rightPanel?: React.ReactNode;
  /** 底部面板 */
  bottomPanel?: React.ReactNode;
  /** 左侧面板宽度（默认 320px） */
  leftWidth?: number;
  /** 右侧面板宽度（默认 320px） */
  rightWidth?: number;
  /** 底部面板高度（默认 auto） */
  bottomHeight?: number;
  /** 左侧面板是否可折叠 */
  leftCollapsible?: boolean;
  /** 左侧面板是否已折叠 */
  leftCollapsed?: boolean;
  /** 折叠切换回调 */
  onLeftToggle?: () => void;
}

/**
 * 通用三栏布局壳子。
 * 两个及以上功能真实复用时可使用此组件。
 * 不放任何业务参数、默认值或模型列表。
 */
export const ThreePanelLayout: React.FC<ThreePanelLayoutProps> = ({
  leftPanel,
  mainContent,
  rightPanel,
  bottomPanel,
  leftWidth = 320,
  rightWidth = 320,
  bottomPanel,
}) => {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        {leftPanel && (
          <div
            className="flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto"
            style={{ width: leftWidth }}
          >
            {leftPanel}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative">
          {mainContent}
        </div>

        {/* Right Panel */}
        {rightPanel && (
          <div
            className="flex-shrink-0 border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto"
            style={{ width: rightWidth }}
          >
            {rightPanel}
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      {bottomPanel && (
        <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800">
          {bottomPanel}
        </div>
      )}
    </div>
  );
};
