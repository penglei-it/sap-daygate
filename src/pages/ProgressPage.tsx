import { Link } from 'react-router-dom';
import { statusLabel } from '../core/acceptance';
import type { DayGateApi } from '../hooks/useDayGate';
import { addDays } from '../lib/date';

/**
 * Progress dashboard with gates, stats, heatmap, and next-step coaching.
 * @param props.api - DayGate API.
 */
export function ProgressPage({ api }: { api: DayGateApi }) {
  const { stats, state, allDays, pack, person, guardianSummary } = api;
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
  const skipped = cells.filter((c) => c.status === 'skipped');
  const neverBackedUp = !state.lastBackupAt && !state.lastFolderBackupAt;

  const actions: Array<{ key: string; text: string; to?: string }> = [];
  if (nextGate) {
    actions.push({
      key: 'gate',
      text: `下一道门禁 ${nextGate.id}（${statusLabel(nextGate.status)}）。卡住时可到「今天」开保底。`,
      to: '/',
    });
  }
  if (guardianSummary.missedLast7 >= 3 && state.mode !== 'minimum') {
    actions.push({
      key: 'missed',
      text: `近 7 日中断 ${guardianSummary.missedLast7} 次，建议切到保底模式先接上节奏。`,
      to: '/',
    });
  }
  if (skipped.length > 0) {
    const first = skipped[0];
    actions.push({
      key: 'skip',
      text: `有 ${skipped.length} 天标记为已跳过，可点热力补做（例：第 ${first.dayIndex} 天）。`,
      to: `/task/${first.dayIndex}`,
    });
  }
  if (neverBackedUp && stats.pass >= 1) {
    actions.push({
      key: 'backup',
      text: '尚未备份进度，建议到设置下载备份或选文件夹自动存。',
      to: '/settings',
    });
  }
  if (actions.length === 0) {
    actions.push({
      key: 'ok',
      text: '节奏不错。继续按「今天」完成验收即可。',
      to: '/',
    });
  }

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
      </section>

      <section className="card stack" data-testid="progress-actions">
        <h2>下一步建议</h2>
        <ul className="action-list">
          {actions.map((a) => (
            <li key={a.key}>
              {a.to ? <Link to={a.to}>{a.text}</Link> : a.text}
            </li>
          ))}
        </ul>
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
