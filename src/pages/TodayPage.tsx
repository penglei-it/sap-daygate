import { Link } from 'react-router-dom';
import { filterDays, statusLabel } from '../core/acceptance';
import type { DayGateApi } from '../hooks/useDayGate';
import { downloadBackupFile } from '../lib/backupPreview';
import {
  buildCatchUpQueue,
  computeTodayMissed,
  shouldShowStreakRecall,
} from '../lib/coach';
import { addDays } from '../lib/date';

/**
 * Today hub: primary daily surface with mode coaching and backup tips.
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

  const standardCount = filterDays(api.allDays, {
    mode: 'standard',
    disabledTracks: state.disabledTracks,
  }).length;
  const visibleCount = api.visibleDays.length;
  const modeExplain =
    state.mode === 'minimum'
      ? `保底：只显示标记为保底的日课和门禁。当前可见 ${visibleCount} 课（标准模式为 ${standardCount} 课）。`
      : state.mode === 'sprint'
        ? `冲刺：已隐藏 side 侧支，列表可能变短。当前可见 ${visibleCount} 课（标准 ${standardCount} 课）。`
        : `标准：完整日课。当前可见 ${visibleCount} 课。`;

  const { missedLast7 } = computeTodayMissed({
    checkIns: state.checkIns,
    packId: state.packId,
    days: api.allDays,
    startDate: state.startDate,
    viewDate,
  });

  const showStreakRecall = shouldShowStreakRecall({
    missedLast7,
    mode: state.mode,
    dismissedOnDate: state.streakRecallDismissedOn,
    viewDate,
  });

  const catchUp = buildCatchUpQueue({
    days: api.allDays,
    packId: state.packId,
    checkIns: state.checkIns,
    maxItems: 5,
    currentOffset: offsetToday,
  });

  const neverBackedUp = !state.lastBackupAt && !state.lastFolderBackupAt;
  const showSoftBackupTip =
    !state.backupReminderPending &&
    neverBackedUp &&
    !state.backupSoftTipDismissed &&
    api.stats.pass >= 3;

  const suggested = state.suggestedMode;
  const showSuggested =
    Boolean(suggested) && suggested !== state.mode;

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
      {showStreakRecall ? (
        <section className="soft-tip stack" data-testid="streak-recall">
          <p style={{ margin: 0 }}>
            近 7 天有 <strong>{missedLast7}</strong> 天中断。没关系——一键开保底（约{' '}
            {person.dailyBudgetMinutes} 分钟），先接上节奏。
          </p>
          <div className="meta-row" style={{ margin: 0 }}>
            <button
              className="btn"
              type="button"
              onClick={() =>
                api.update({
                  mode: 'minimum',
                  streakRecallDismissedOn: viewDate,
                })
              }
            >
              一键开保底
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() =>
                api.update({ streakRecallDismissedOn: viewDate })
              }
            >
              今天不再提醒
            </button>
          </div>
        </section>
      ) : null}

      {showSuggested && suggested ? (
        <section className="soft-tip stack" data-testid="suggested-mode">
          <p style={{ margin: 0 }}>
            {suggested === 'minimum' ? (
              <>
                家长建议今天用<strong>保底</strong>，先接上节奏。
              </>
            ) : (
              <>
                监护人建议今天改用
                <strong>
                  {suggested === 'sprint' ? '冲刺模式' : '标准模式'}
                </strong>
                ，先接上节奏。
              </>
            )}
          </p>
          <div className="meta-row" style={{ margin: 0 }}>
            <button
              className="btn"
              type="button"
              onClick={() =>
                api.update({ mode: suggested, suggestedMode: undefined })
              }
            >
              采纳建议
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => api.update({ suggestedMode: undefined })}
            >
              忽略
            </button>
          </div>
        </section>
      ) : null}

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
          <p className="person-hint">{person.todayHint}</p>
          {person.companionHint ? (
            <p className="muted companion-hint">{person.companionHint}</p>
          ) : null}
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
              <h2>
                {state.mode === 'minimum'
                  ? '今天不在保底课表里'
                  : state.mode === 'sprint'
                    ? '今天可能被冲刺模式隐藏了'
                    : '这一天不在当前课表映射内'}
              </h2>
              <p className="muted">
                {state.mode === 'minimum'
                  ? '可查看右侧保底任务池，或切回标准模式看完整课表。'
                  : state.mode === 'sprint'
                    ? 'side 侧支已隐藏。可换日期，或切回标准模式。'
                    : `开营日：${state.startDate}；偏移 ${offsetToday} 天；本包共 ${api.allDays.length} 天。可换日期或在设置中换包。`}
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
              {person.id === 'exam_sprinter' ? (
                <p className="muted sprint-must" data-testid="sprint-tip">
                  冲刺日：先完成验收再加练
                </p>
              ) : null}
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
                  进入今日课
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
            data-testid="mode-select"
          >
            <option value="standard">标准：完整日课</option>
            <option value="minimum">保底：只做 minimum / 门禁</option>
            <option value="sprint">冲刺：隐藏 side 轨</option>
          </select>
          <p className="muted mode-explain" data-testid="mode-explain">
            {modeExplain}
          </p>

          {catchUp.length > 0 ? (
            <div data-testid="catch-up-queue">
              <h3>补做 / 即将门禁</h3>
              <ul className="action-list">
                {catchUp.map((item) => (
                  <li key={item.key}>
                    <Link
                      to={`/task/${item.dayIndex}`}
                      onClick={() =>
                        api.setViewDate(addDays(state.startDate, item.dateOffset))
                      }
                    >
                      第 {item.dayIndex} 天 · {item.title}
                    </Link>
                    <span className="muted"> — {item.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {state.mode === 'minimum' ? (
            <div>
              <h3>保底任务池</h3>
              {minimumPool.length === 0 ? (
                <p className="muted">本包暂无保底日，可切回标准模式。</p>
              ) : (
                <ul className="muted">
                  {minimumPool.map((d) => (
                    <li key={d.dayIndex}>
                      <Link to={`/task/${d.dayIndex}`}>{d.title}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <div>
            <h3>门禁快览</h3>
            <div className="gate-row">
              {api.stats.gates.map((g) => (
                <span key={g.id} className="chip">
                  {g.id}:{statusLabel(g.status)}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
