import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDayGate } from './hooks/useDayGate';
import './index.css';

/** Vite base path without trailing slash for React Router (e.g. /sap-daygate). */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

/**
 * Registers the offline shell service worker when supported.
 * Failures are ignored so unsupported browsers stay usable.
 */
function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(swUrl).catch(() => {
      // Offline shell is optional; ignore registration errors.
    });
  });
}

/**
 * Root bridge so the DayGate hook owns a single source of truth.
 */
function Root() {
  const api = useDayGate();
  return (
    <BrowserRouter basename={routerBasename}>
      <App api={api} />
    </BrowserRouter>
  );
}

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);
