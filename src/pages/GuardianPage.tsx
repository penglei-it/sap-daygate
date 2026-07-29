import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { statusLabel } from '../core/acceptance';
import type { DayGateApi } from '../hooks/useDayGate';
import {
  buildGuardianWeekCells,
  buildGuardianWeeklyReportText,
  copyTextToClipboard,
  downloadTextFile,
} from '../lib/guardianReport';

/**
 * Guardian/companion dashboard: read-only progress + soft reminders.
 * @param props.api - DayGate API.
 */
export function GuardianPage({ api }: { api: DayGateApi }) {
  const { guardianSummary: s, state, todayPlan, person, allDays } = api;
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  /** Local feedback after suggesting minimum mode to the learner. */
  const [suggestSent, setSuggestSent] = useState(false);
  /** Feedback after copying or downloading the weekly report. */
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const noteKey = todayPlan ? `${state.packId}:${todayPlan.dayIndex}` : '';
  const [note, setNote] = useState(
    todayPlan ? state.companionNotes[noteKey] ?? '' : '',
  );

  const recentCells = useMemo(
    () =>
      buildGuardianWeekCells({
        viewDate: api.viewDate,
        startDate: state.startDate,
        days: allDays,
        getCheckIn: api.getCheckIn,
      }),
    [allDays, api, state.startDate],
  );

  const weeklyReportText = useMemo(
    () =>
      buildGuardianWeeklyReportText({
        summary: s,
        weekCells: recentCells,
      }),
    [s, recentCells],
  );

  const nextGate = api.stats.gates.find((g) => g.status !== 'pass');

  /**
   * Copies the weekly report to the clipboard.
   */
  const copyReport = async () => {
    const ok = await copyTextToClipboard(weeklyReportText);
    setReportMsg(ok ? '周报已复制到剪贴板。' : '复制失败，请改用下载。');
  };

  /**
   * Downloads the weekly report as a .txt file.
   */
  const downloadReport = () => {
    downloadTextFile(
      weeklyReportText,
      `daygate-week-report-${api.viewDate}.txt`,
    );
    setReportMsg('周报已开始下载。');
  };

  return (
    <div className={`stack density-${person.uiDensity}`}>
      <section className="card stack">
        <div className="eyebrow">监护人视图 · 只读陪伴</div>
        <h1>{s.learnerName} 的学习概览</h1>
        <p className="muted">
          当前课程：{s.packTitle}。此视图不能代打卡，只能看进度、留鼓励、给软提醒。
        </p>

        <div className="stat-grid">
          <div className="stat">
            <b>{s.completionRate}%</b>
            <span className="muted">通过完成率</span>
          </div>
          <div className="stat">
            <b>{s.streakDays}</b>
            <span className="muted">连续进展天数</span>
          </div>
          <div className="stat">
            <b>{s.missedLast7}</b>
            <span className="muted">近 7 日中断</span>
          </div>
          <div className="stat">
            <b>
              {s.passCount}/{s.totalDays}
            </b>
            <span className="muted">通过 / 总课</span>
          </div>
        </div>

        <div className="meta-row">
          <button
            className="btn secondary"
            type="button"
            data-testid="copy-week-report"
            onClick={() => void copyReport()}
          >
            复制周报
          </button>
          <button
            className="btn ghost"
            type="button"
            data-testid="download-week-report"
            onClick={downloadReport}
          >
            下载周报.txt
          </button>
        </div>
        {reportMsg ? (
          <p className="muted" role="status" data-testid="week-report-msg">
            {reportMsg}
          </p>
        ) : null}
        <p className="muted">
          周报为近 7 日纯文本摘要，仅在本机复制或下载，不会上传。
        </p>
      </section>

      <section className="card stack">
        <h2>近 7 日状态</h2>
        <div className="guardian-week">
          {recentCells.map((c) => (
            <div
              key={c.iso}
              className={`cal-cell ${c.status ?? 'empty'}`}
              title={`${c.iso} · ${c.title}${c.status ? ` · ${statusLabel(c.status)}` : ''}`}
            >
              {c.iso.slice(5)}
            </div>
          ))}
        </div>
        {nextGate ? (
          <p className="muted">
            下一道门禁：<strong>{nextGate.id}</strong>（
            {statusLabel(nextGate.status)}）
          </p>
        ) : (
          <p className="muted">本包门禁均已通过。</p>
        )}
      </section>

      <section className="card stack">
        <h2>今日软提醒</h2>
        <p>{s.softReminder}</p>
        <p className="muted">
          今日任务：{s.todayTitle ?? '不在课表映射内'} · 状态{' '}
          {statusLabel(s.todayStatus)}
        </p>
        <div className="meta-row">
          {todayPlan ? (
            <Link className="btn secondary" to={`/task/${todayPlan.dayIndex}`}>
              只读查看今日任务
            </Link>
          ) : null}
          {todayPlan ? (
            <button
              className="btn"
              type="button"
              onClick={() => {
                api.suggestMinimumMode(todayPlan.dayIndex);
                setSuggestSent(true);
                setNote(
                  state.companionNotes[noteKey] ||
                    '家长建议：今天先用保底模式，完成一小步就很好。',
                );
              }}
            >
              建议今天改保底
            </button>
          ) : null}
        </div>
        {suggestSent ? (
          <p className="status-pass" role="status" data-testid="suggest-sent">
            已发给学习者
          </p>
        ) : null}
        <p className="muted">
          「建议今天改保底」会给学习者一条横幅，由对方决定是否采纳。
        </p>
      </section>

      <section className="card stack">
        <h2>陪伴留言（给学习者看）</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：开始的前 10 分钟我陪你，剩下的你自己完成。"
        />
        <button
          className="btn"
          type="button"
          disabled={!todayPlan}
          onClick={() => {
            if (!todayPlan) return;
            api.setCompanionNote(todayPlan.dayIndex, note);
          }}
        >
          保存今日留言
        </button>
      </section>

      <section className="card stack">
        <h2>返回学习者视图</h2>
        {state.guardianPinHash ? (
          <label className="field">
            输入监护 PIN
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="设置里配置的 PIN"
            />
          </label>
        ) : (
          <p className="muted">
            未设置 PIN，可直接返回。建议到设置里补上 PIN，尤其是儿童设备。
          </p>
        )}
        {pinError ? <p className="status-fail">{pinError}</p> : null}
        <button
          className="btn secondary"
          type="button"
          onClick={async () => {
            const ok = await api.leaveGuardian(pin);
            if (!ok) setPinError('PIN 不正确');
            else setPinError(null);
          }}
        >
          退出监护人视图
        </button>
      </section>
    </div>
  );
}
