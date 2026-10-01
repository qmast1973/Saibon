import {StrictMode, Component, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 개발 환경 및 브라우저에서 발생하는 무의미한 에러/경고 노이즈 필터링 (Vite WebSocket, HMR, PWA ServiceWorker 등)
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;

  const IGNORED_MESSAGES = [
    'failed to connect to websocket',
    'WebSocket connection to',
    'vite:ws',
    'sw.js',
    'ServiceWorker',
    'Download the React DevTools',
    'Warning: ReactDOM.render is no longer supported',
    'Failed to load resource: net::ERR_CONNECTION_REFUSED',
  ];

  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (IGNORED_MESSAGES.some(ignore => msg.includes(ignore))) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (IGNORED_MESSAGES.some(ignore => msg.includes(ignore))) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

// 예기치 못한 오류로 화면 전체가 하얗게 멈추는 것을 막는 안전장치 (정상 동작 시에는 화면에 아무 영향 없음)
class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  declare props: { children: ReactNode };
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('App crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-200 font-bold">일시적인 오류가 발생했습니다.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

