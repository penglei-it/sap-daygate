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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);