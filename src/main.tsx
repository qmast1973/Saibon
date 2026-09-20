import {StrictMode} from 'react';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

