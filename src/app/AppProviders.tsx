import React from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ModelProvider } from '../contexts/ModelContext';
import { RHTaskQueueProvider } from '../contexts/RHTaskQueueContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * 应用全局 Provider 组合壳。
 * 只负责 Provider 嵌套顺序，不写任何业务逻辑。
 * 当前保持轻量透传，避免首屏引入额外依赖。
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <ModelProvider>
        <RHTaskQueueProvider>
          {children}
        </RHTaskQueueProvider>
      </ModelProvider>
    </ThemeProvider>
  );
};
