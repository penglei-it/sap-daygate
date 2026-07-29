import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DayGateApi } from '../hooks/useDayGate';

/**
 * Guardian/companion dashboard: read-only progress + soft reminders.
 * @param props.api - DayGate API.
 */
export function GuardianPage({ api }: { api: DayGateApi }) {
  const { guardianSummary: s, state, todayPlan, person } = api;
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const noteKey = todayPlan ? `${state.packId}:${todayPlan.dayIndex}` : '';
  const [note, setNote] = useState(
    todayPlan ? state.companionNotes[noteKey] ?? '' : '',
  );

  return (
    <div className={`stack density-${person.uiDensity}`}>
      <section className="card stack">
        <div className="eyebrow">监护人视图 · 只读陪伴</div>
        <h1>
          {s.learnerName} 的学习概览
        </h1>
        <p className="muted">
          当前课程：{s.packTitle}。此视图不能代打卡，只能看进度、留鼓励、给软提醒。
        </p>

        <div className="stat-grid">
          <div className="stat">
            <b>{s.completionRate}%</b>
            <span className="muted">Pass 完成率</span>
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
            <span className="muted">Pass / 总课</span>
          </div>
        </div>
      </section>

      <section className="card stack">
        <h2>今日软提醒</h2>
        <p>{s.softReminder}</p>
        <p className="muted">
          今日任务：{s.todayTitle ?? '不在课表映射内'} · 状态 {s.todayStatus}
        </p>
        {todayPlan ? (
          <Link className="btn secondary" to={`/task/${todayPlan.dayIndex}`}>
            只读查看今日任务
          </Link>
        ) : null}
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
          <p className="muted">未设置 PIN，可直接返回。</p>
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
