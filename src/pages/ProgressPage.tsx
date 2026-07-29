import { Link } from 'react-router-dom';
import { statusLabel } from '../core/acceptance';
import type { DayGateApi } from '../hooks/useDayGate';
import { addDays } from '../lib/date';

/**
 * Progress dashboard with gates, stats, and calendar heatmap.
 * @param props.api - DayGate API.
 */
export function ProgressPage({ api }: { api: DayGateApi }) {
  const { stats, state, allDays, pack, person } = api;
  const cells = allDays.map((d) => {
    const cin = api.getCheckIn(d.dayIndex);
    return {
      dayIndex: d.dayIndex,
      offset: d.dateOffset,
      status: cin?.status,
      title: d.title,
      skipReason: cin?.skipReason,
    };
  });

  const weekHours = Object.entries(state.weeklyHours)
    .slice(-4)
    .map(([k, v]) => ({ k, v: Math.round(v * 10) / 10 }));

  const nextGate = stats.gates.find((g) => g.status !== 'pass');

  return (
    <div className={`stack density-${person.uiDensity}`}>
      <section className="card">
        <div className="eyebrow">进度 · {pack.category}</div>
        <h1>{pack.title}</h1>
        <p className="muted">{person.label} · 门禁驱动，而不是积分驱动</p>
        <div className="stat-grid">
          <div className="stat">
            <b>{stats.pass}</b>
            <span className="muted">通过</span>
          </div>
          <div className="stat">
            <b>{stats.partial}</b>
            <span className="muted">部分完成</span>
          </div>
          <div className="stat">
            <b>{stats.fail}</b>
            <span className="muted">未通过</span>
          </div>
          <div className="stat">
            <b>{stats.skipped}</b>
            <span className="muted">已跳过</span>
          </div>
          <div className="stat">
            <b>{stats.total}</b>
            <span className="muted">本包天数</span>
          </div>
        </div>
        {nextGate ? (
          <p className="muted" style={{ marginTop: 12 }}>
            下一道门禁：<strong>{nextGate.id}</strong>（
            {statusLabel(nextGate.status)}）。卡住时可到「今天」切换保底模式。
          </p>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>
            本包门禁均已通过。
          </p>
        )}
      </section>

      <section className="card stack">
        <h2>阶段目标</h2>
        {stats.phases.map((p) => (
          <div key={p.id}>
            <strong>
              {p.id}. {p.name}
            </strong>
            <div className="muted">
              {p.goal}
              {p.gateId ? ` · 门禁 ${p.gateId}` : ''}
            </div>
          </div>
        ))}
        <div className="gate-row">
          {stats.gates.map((g) => (
            <span key={g.id} className={`chip ${g.status === 'pass' ? 'main' : ''}`}>
              {g.id} · {statusLabel(g.status)}
            </span>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>近几周投入（小时）</h2>
        {weekHours.length === 0 ? (
          <p className="muted">暂无记录</p>
        ) : (
          <ul>
            {weekHours.map((w) => (
              <li key={w.k}>
                {w.k}: {w.v}h
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack">
        <h2>本包热力（点击进入）</h2>
        <div className="calendar">
          {cells.map((c) => (
            <Link
              key={c.dayIndex}
              className={`cal-cell ${c.status ?? 'empty'}`}
              to={`/task/${c.dayIndex}`}
              title={
                c.skipReason
                  ? `${c.title} · 跳过：${c.skipReason}`
                  : `${c.title}${c.status ? ` · ${statusLabel(c.status)}` : ''}`
              }
              onClick={() => api.setViewDate(addDays(state.startDate, c.offset))}
            >
              {c.dayIndex}
            </Link>
          ))}
        </div>
        <p className="muted">热力色块：通过 / 部分完成 / 未通过 / 已跳过可点击进入当日。</p>
      </section>
    </div>
  );
}
