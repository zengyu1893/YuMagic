import React from 'react';

interface StartupErrorBoundaryProps {
  children: React.ReactNode;
}

interface StartupErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 启动错误边界 — 防止运行时错误把页面清空成黑屏。
 * 捕获 React 渲染期间的未处理异常，并把错误直接显示在页面上。
 */
export class StartupErrorBoundary extends React.Component<
  StartupErrorBoundaryProps,
  StartupErrorBoundaryState
> {
  constructor(props: StartupErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): StartupErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[StartupErrorBoundary] Uncaught error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black">
          <div className="max-w-lg p-8 text-center">
            <h1 className="text-xl font-bold text-red-400 mb-4">
              应用启动失败
            </h1>
            <p className="text-sm text-neutral-400 mb-4">
              渲染期间发生了未处理的错误。请尝试刷新页面，或检查控制台获取详细信息。
            </p>
            <pre className="text-xs text-left text-red-300 bg-neutral-900 p-4 rounded-lg overflow-auto max-h-48">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
