import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type { DayGateApi } from './hooks/useDayGate';
import { Onboarding } from './pages/Onboarding';
import { TodayPage } from './pages/TodayPage';
import { TaskPage } from './pages/TaskPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { GuardianPage } from './pages/GuardianPage';

/**
 * Application shell with navigation and route table.
 * @param props.api - Shared DayGate state API from root hook.
 */
export function App({ api }: { api: DayGateApi }) {
  if (!api.state.onboardingDone) {
    return <Onboarding api={api} />;
  }

  const guardian = api.isGuardian;

  return (
    <div className={`app-shell density-${api.person.uiDensity}`}>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="topbar">
        <div className="brand">
          <strong>日验 DayGate</strong>
          <span>
            {guardian
              ? `监护人视图 · ${api.state.guardianName}`
              : '通用学习操作系统 · 技能 / 考试 / 任务'}
          </span>
        </div>
        <nav className="nav" aria-label="主导航">
          {!guardian ? (
            <>
              <NavLink
                to="/"
                end
                aria-label="今天"
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                今天
              </NavLink>
              <NavLink
                to="/progress"
                aria-label="进度"
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                进度
              </NavLink>
            </>
          ) : null}
          <NavLink
            to="/guardian"
            aria-label="监护人视图"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            监护人
          </NavLink>
          <NavLink
            to="/settings"
            aria-label="设置"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            设置
          </NavLink>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
      <Routes>
        <Route
          path="/"
          element={
            guardian ? <Navigate to="/guardian" replace /> : <TodayPage api={api} />
          }
        />
        <Route path="/task/:dayIndex" element={<TaskPage api={api} />} />
        <Route
          path="/progress"
          element={
            guardian ? <Navigate to="/guardian" replace /> : <ProgressPage api={api} />
          }
        />
        <Route path="/guardian" element={<GuardianPage api={api} />} />
        <Route path="/settings" element={<SettingsPage api={api} />} />
        <Route path="*" element={<Navigate to={guardian ? '/guardian' : '/'} replace />} />
      </Routes>
      </main>
    </div>
  );
}
