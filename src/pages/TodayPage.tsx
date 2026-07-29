import { Link } from 'react-router-dom';
import { statusLabel } from '../core/acceptance';
import type { DayGateApi } from '../hooks/useDayGate';
import { downloadBackupFile } from '../lib/backupPreview';
import { addDays } from '../lib/date';

/**
 * Today hub: primary daily surface with backup reminders and soft tips.
 * @param props.api - DayGate API.
 */
export function TodayPage({ api }: { api: DayGateApi }) {
  const { state, viewDate, setViewDate, todayPlan, minimumPool, offsetToday, pack, person } =
    api;
  const checkIn = todayPlan ? api.getCheckIn(todayPlan.dayIndex) : undefined;

  const modeLabel =
    state.mode === 'minimum'
      ? '保底模式'
      : state.mode === 'sprint'
        ? '冲刺模式'
        : '标准模式';

  const neverBackedUp = !state.lastBackupAt && !state.lastFolderBackupAt;
  const showSoftBackupTip =
    !state.backupReminderPending &&
    neverBackedUp &&
    !state.backupSoftTipDismissed &&
    api.stats.pass >= 3;

  /**
   * Downloads a backup file and records the export timestamp.
   */
  const downloadNow = () => {
    downloadBackupFile(
      api.exportJson(),
      `daygate-backup-${state.packId}-${state.startDate}.json`,
    );
    api.markBackupExported();
  };

  return (
    <div className={`stack density-${person.uiDensity}`}>
      {state.backupReminderPending ? (
        <section className="card stack backup-nudge" data-testid="backup-gate-nudge">
          <strong>建议马上备份一下</strong>
          <p className="muted">
            你刚通过一道重要关卡。进度只在这台设备的浏览器里，清缓存或换手机可能丢。
            选一种方式存一份就安心了。
          </p>
          {api.folderBackupError ? (
            <p className="muted" role="alert">
              {api.folderBackupError}
            </p>
          ) : null}
          <div className="meta-row">
            {api.folderBackupStatus.supported ? (
              <button
                className="btn"
                type="button"
                disabled={api.folderBackupBusy}
                onClick={() => {
                  void (async () => {
                    if (!api.folderBackupStatus.hasFolder) {
                      const ok = await api.selectBackupFolder();
                      if (!ok) return;
                    }
                    await api.backupToFolderNow();
                  })();
                }}
              >
                存到文件夹
              </button>
            ) : null}
            <button
              className={
                api.folderBackupStatus.supported ? 'btn secondary' : 'btn'
              }
              type="button"
              onClick={downloadNow}
            >
              下载备份文件
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => api.dismissBackupReminder()}
            >
              稍后
            </button>
            <Link className="btn ghost" to="/settings">
              打开备份设置
            </Link>
          </div>
        </section>
      ) : null}

      {showSoftBackupTip ? (
        <section className="soft-tip stack" data-testid="backup-soft-tip">
          <p style={{ margin: 0 }}>
            已有 {api.stats.pass} 次通过，建议备份一次，避免清浏览器后丢进度。
          </p>
          <div className="meta-row" style={{ margin: 0 }}>
            {api.folderBackupStatus.supported &&
            api.folderBackupStatus.hasFolder ? (
              <button
                className="btn"
                type="button"
                disabled={api.folderBackupBusy}
                onClick={() => void api.backupToFolderNow()}
              >
                存到文件夹
              </button>
            ) : null}
            <button className="btn secondary" type="button" onClick={downloadNow}>
              下载备份文件
            </button>
            <Link className="btn ghost" to="/settings">
              备份设置
            </Link>
            <button
              className="btn ghost"
              type="button"
              onClick={() => api.dismissBackupSoftTip()}
            >
              关闭提示
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid-2">
        <section className="card">
          <div className="eyebrow">
            今天 · {modeLabel} · {person.label}
          </div>
          <p className="muted">
            {pack.title} · 日预算约 {person.dailyBudgetMinutes} 分钟
          </p>
          <div className="meta-row">
            <label className="field" style={{ minWidth: 180 }}>
              查看日期
              <input
                type="date"
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value)}
              />
            </label>
            <button
              className="btn secondary"
              type="button"
              onClick={() => setViewDate(api.formatISODate(new Date()))}
            >
              回到系统今日
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setViewDate(addDays(viewDate, -1))}
            >
              前一天
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setViewDate(addDays(viewDate, 1))}
            >
              后一天
            </button>
          </div>

          {!todayPlan ? (
            <div>
              <h2>这一天不在当前 Pack 映射内</h2>
              <p className="muted">
                开营日：{state.startDate}；偏移 {offsetToday} 天；本包共 {api.allDays.length}{' '}
                天。可换日期或在设置中换包。
              </p>
            </div>
          ) : (
            <>
              <div className="meta-row">
                <span className={`chip ${todayPlan.track}`}>{todayPlan.track}</span>
                <span className="chip">阶段 {todayPlan.phaseId}</span>
                <span className="chip">第 {todayPlan.dayIndex} 课</span>
                <span className="chip">约 {todayPlan.estimatedMinutes} 分钟</span>
                {todayPlan.gateId ? (
                  <span className="chip gate">门禁 {todayPlan.gateId}</span>
                ) : null}
              </div>
              <h1>{todayPlan.title}</h1>
              <p className="muted">{todayPlan.phaseName}</p>
              <p>{todayPlan.content}</p>
              <p>
                <strong>验收成果：</strong>
                {todayPlan.deliverable}
              </p>
              {api.state.companionNotes[`${state.packId}:${todayPlan.dayIndex}`] ? (
                <p>
                  <strong>监护人留言：</strong>
                  {api.state.companionNotes[`${state.packId}:${todayPlan.dayIndex}`]}
                </p>
              ) : null}
              {checkIn ? (
                <p>
                  今日状态：{' '}
                  <span className={`status-${checkIn.status}`}>
                    {statusLabel(checkIn.status)}
                  </span>
                  {checkIn.status === 'skipped' && checkIn.skipReason ? (
                    <span className="muted"> · {checkIn.skipReason}</span>
                  ) : null}
                </p>
              ) : (
                <p className="muted">尚未验收</p>
              )}
              <div className="meta-row">
                <Link className="btn" to={`/task/${todayPlan.dayIndex}`} data-testid="enter-task">
                  进入学习与验收
                </Link>
              </div>
            </>
          )}
        </section>

        <aside className="card stack">
          <h3>学习模式</h3>
          <select
            value={state.mode}
            onChange={(e) =>
              api.update({
                mode: e.target.value as typeof state.mode,
              })
            }
          >
            <option value="standard">标准：完整日课</option>
            <option value="minimum">保底：只做 minimum / 门禁</option>
            <option value="sprint">冲刺：隐藏 side 轨</option>
          </select>

          {state.mode === 'minimum' ? (
            <div>
              <h3>保底任务池</h3>
              <ul className="muted">
                {minimumPool.map((d) => (
                  <li key={d.dayIndex}>
                    <Link to={`/task/${d.dayIndex}`}>{d.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <h3>门禁快览</h3>
            <div className="gate-row">
              {api.stats.gates.map((g) => (
                <span key={g.id} className="chip">
                  {g.id}:{g.status}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
