import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Root error boundary to avoid blank white screen on render failures.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  /**
   * Derives error UI state from thrown error.
   * @param error - Render error.
   */
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'Unknown render error',
    };
  }

  /**
   * Logs error details for local debugging.
   * @param error - Thrown error.
   * @param info - React error info.
   */
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Local-only product: keep console for developer diagnosis.
    console.error('DayGate ErrorBoundary', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <div className="card stack">
            <h1>页面出错了</h1>
            <p className="muted">{this.state.message}</p>
            <p className="muted">
              你的本地进度通常仍在浏览器中。可尝试刷新；若持续失败，请到设置导出备份后再重置。
            </p>
            <button
              className="btn"
              type="button"
              onClick={() => window.location.reload()}
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
