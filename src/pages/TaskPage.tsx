import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  evidenceMinLength,
  listAcceptanceGaps,
  statusLabel,
} from '../core/acceptance';
import type { DayGateApi } from '../hooks/useDayGate';

type FocusPhase = 'intro' | 'focus' | 'accept';

/**
 * Formats elapsed seconds as m:ss.
 * @param totalSeconds - Elapsed seconds.
 */
function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Task detail with focus timer, path checklist, and acceptance tests.
 * Flow: start focus → end focus → submit acceptance.
 * @param props.api - DayGate API.
 */
export function TaskPage({ api }: { api: DayGateApi }) {
  const { dayIndex } = useParams();
  const plan = useMemo(
    () => api.allDays.find((d) => String(d.dayIndex) === dayIndex),
    [api.allDays, dayIndex],
  );

  const existing = plan ? api.getCheckIn(plan.dayIndex) : undefined;
  const companionNote = plan
    ? api.state.companionNotes[`${api.state.packId}:${plan.dayIndex}`]
    : '';
  const readOnly = api.isGuardian;
  const [pathDone, setPathDone] = useState<number[]>(
    existing?.completedPathSteps ?? [],
  );
  const [passed, setPassed] = useState<string[]>(existing?.passedTestIds ?? []);
  const [evidence, setEvidence] = useState(existing?.evidence ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [typedAnswers, setTypedAnswers] = useState<Record<string, string>>(
    existing?.typedAnswers ?? {},
  );
  const [minutes, setMinutes] = useState(
    existing?.actualMinutes ?? plan?.estimatedMinutes ?? 70,
  );
  const [result, setResult] = useState<string | null>(existing?.status ?? null);
  const [resultGaps, setResultGaps] = useState<string[]>([]);
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipReason, setSkipReason] = useState(existing?.skipReason ?? '');
  const [skipError, setSkipError] = useState<string | null>(null);

  const initialPhase: FocusPhase =
    readOnly || existing?.status ? 'accept' : 'intro';
  const [phase, setPhase] = useState<FocusPhase>(initialPhase);
  const [focusStartedAt, setFocusStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const isGate = Boolean(plan?.gateId);
  const requireEvidence = Boolean(plan?.requireEvidence || plan?.gateId);
  const minEvidence = evidenceMinLength(isGate);

  useEffect(() => {
    if (phase !== 'focus' || focusStartedAt == null) return;
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - focusStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, focusStartedAt]);

  const liveGaps = useMemo(() => {
    if (!plan) return [];
    return listAcceptanceGaps({
      allTests: plan.acceptanceTests,
      passedTestIds: passed,
      pathTotal: plan.path.length,
      pathDone: pathDone.length,
      evidence,
      typedAnswers,
      requireEvidence,
      isGate,
    });
  }, [plan, passed, pathDone, evidence, typedAnswers, requireEvidence, isGate]);

  if (!plan) {
    return (
      <div className="card">
        <p>未找到该日课程。</p>
        <Link to="/">返回今天</Link>
      </div>
    );
  }

  const togglePath = (idx: number) => {
    setPathDone((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx],
    );
  };

  const toggleTest = (id: string) => {
    setPassed((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const startFocus = () => {
    setFocusStartedAt(Date.now());
    setElapsedSec(0);
    setPhase('focus');
  };

  const endFocus = () => {
    const mins = Math.max(1, Math.round(elapsedSec / 60));
    setMinutes(mins);
    setPhase('accept');
  };

  const onSubmit = async (forceSkip = false, reason = '') => {
    const status = await api.submitCheckIn(plan, {
      completedPathSteps: pathDone,
      passedTestIds: passed,
      evidence,
      typedAnswers,
      actualMinutes: minutes,
      notes,
      forceSkip,
      skipReason: forceSkip ? reason : undefined,
    });
    setResult(status);
    if (status === 'pass' || status === 'skipped') {
      setResultGaps([]);
    } else {
      setResultGaps(liveGaps.map((g) => g.message));
    }
    setSkipOpen(false);
    setSkipError(null);
  };

  const confirmSkip = () => {
    const reason = skipReason.trim();
    if (reason.length < 4) {
      setSkipError('请填写至少 4 个字的跳过原因（便于复盘与监护查看）');
      return;
    }
    void onSubmit(true, reason);
  };

  const showAccept = phase === 'accept' || readOnly;

  return (
    <div className={`stack density-${api.person.uiDensity}`}>
      <div className="card">
        <Link to="/">← 返回今天</Link>
        <div className="meta-row" style={{ marginTop: 12 }}>
          <span className={`chip ${plan.track}`}>{plan.track}</span>
          <span className="chip">
            {plan.phaseId} · W{plan.week}
          </span>
          <span className="chip">Day {plan.dayIndex}</span>
          {plan.gateId ? <span className="chip gate">{plan.gateId}</span> : null}
          {requireEvidence && <span className="chip">需证据</span>}
        </div>
        <h1>{plan.title}</h1>
        <p>{plan.content}</p>
      </div>

      {!readOnly && phase === 'intro' ? (
        <section className="card stack focus-panel" data-testid="focus-intro">
          <h2>开始本课</h2>
          <p className="muted">
            建议先专注学习约 {plan.estimatedMinutes}{' '}
            分钟，完成路径后再做验收。减少中途切去设置或刷手机。
          </p>
          <div className="meta-row">
            <button className="btn" type="button" onClick={startFocus}>
              开始专注
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setPhase('accept')}
            >
              跳过计时，直接验收
            </button>
          </div>
        </section>
      ) : null}

      {!readOnly && phase === 'focus' ? (
        <section className="card stack focus-panel" data-testid="focus-running">
          <h2>专注进行中</h2>
          <p className="focus-timer" aria-live="polite">
            {formatElapsed(elapsedSec)}
          </p>
          <p className="muted">可先勾选左侧学习路径。准备好验收时点下方结束。</p>
          <button className="btn" type="button" onClick={endFocus}>
            结束专注，去验收
          </button>
        </section>
      ) : null}

      <div className="grid-2">
        <section className="card stack">
          <h2>学习路径</h2>
          <ul className="list-check">
            {plan.path.map((step, idx) => (
              <li key={step}>
                <input
                  type="checkbox"
                  checked={pathDone.includes(idx)}
                  disabled={readOnly || phase === 'intro'}
                  onChange={() => togglePath(idx)}
                />
                <span className="path-index">{idx + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>

          <h2>参考资料</h2>
          <div className="refs">
            {plan.references.map((r) => (
              <a key={r.url + r.title} href={r.url} target="_blank" rel="noreferrer">
                {r.title}
              </a>
            ))}
          </div>

          <h2>验收标准</h2>
          <ul>
            {plan.acceptanceCriteria.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p>
            <strong>交付物：</strong>
            {plan.deliverable}
          </p>
        </section>

        <section className="card stack">
          <h2>成果验收测试</h2>
          {!showAccept && !readOnly ? (
            <p className="muted">先「开始专注」或「跳过计时」，再填写验收。</p>
          ) : null}
          {readOnly ? (
            <p className="muted">监护人视图：只读，不能代为提交验收。</p>
          ) : showAccept ? (
            <p className="muted">
              勾选表示你确实达到「通过提示」。含打字题必须作答；门禁日必须填写合格证据。
              下方「距通过还差」会实时提示缺口。
            </p>
          ) : null}

          {showAccept ? (
            <>
              <ul className="list-check">
                {plan.acceptanceTests.map((t) => (
                  <li key={t.id}>
                    <input
                      type="checkbox"
                      checked={passed.includes(t.id)}
                      disabled={readOnly}
                      onChange={() => toggleTest(t.id)}
                    />
                    <div style={{ flex: 1 }}>
                      <div>{t.question}</div>
                      <div className="muted">通过标准：{t.passHint}</div>
                      {t.requiresTypedAnswer ? (
                        <input
                          style={{ marginTop: 8, width: '100%' }}
                          placeholder="在此打字作答（至少 2 字）"
                          disabled={readOnly}
                          value={typedAnswers[t.id] ?? ''}
                          onChange={(e) =>
                            setTypedAnswers((s) => ({
                              ...s,
                              [t.id]: e.target.value,
                            }))
                          }
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              <label className="field">
                成果证据（路径/链接/对象名）
                {!readOnly ? (
                  <p className="muted" style={{ margin: '4px 0 8px' }}>
                    {api.person.taskEvidenceHint}
                    {isGate ? ' 门禁日请写具体可核对的成果。' : ''}
                  </p>
                ) : null}
                {!readOnly ? (
                  <div className="meta-row evidence-chips">
                    {[
                      {
                        label: '填入路径示例',
                        text: 'notes/day-demo.md（或本机文件路径）',
                      },
                      {
                        label: '填入链接示例',
                        text: 'https://example.com/my-work',
                      },
                      {
                        label: '填入对象名示例',
                        text: '对象/事务：ZDEMO_REPORT',
                      },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        className="btn ghost"
                        type="button"
                        onClick={() => setEvidence(chip.text)}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <textarea
                  value={evidence}
                  disabled={readOnly}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder={
                    requireEvidence
                      ? `必填，至少 ${minEvidence} 字，需含文字或数字，拒绝全重复字符`
                      : `可选；若填写建议 ≥ ${minEvidence} 字`
                  }
                />
                {requireEvidence ? (
                  <span className="muted">
                    已输入 {evidence.trim().length} / 最少 {minEvidence} 字
                    {isGate ? '（门禁标准）' : ''}
                  </span>
                ) : null}
              </label>

              {!readOnly && liveGaps.length > 0 ? (
                <div className="gap-panel" role="status">
                  <strong>距通过还差</strong>
                  <ul>
                    {liveGaps.map((g) => (
                      <li key={g.id}>{g.message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!readOnly && liveGaps.length === 0 ? (
                <p className="status-pass" role="status">
                  当前填写已满足通过条件，可以提交验收。
                </p>
              ) : null}

              <label className="field">
                实际用时（分钟）
                <input
                  type="number"
                  min={0}
                  disabled={readOnly}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </label>

              <label className="field">
                备注
                <textarea
                  value={notes}
                  disabled={readOnly}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>

              {!readOnly ? (
                <div className="meta-row">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => void onSubmit(false)}
                  >
                    提交验收
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => {
                      setSkipOpen(true);
                      setSkipError(null);
                    }}
                  >
                    标记跳过…
                  </button>
                </div>
              ) : null}

              {skipOpen && !readOnly ? (
                <div className="skip-panel" role="dialog" aria-label="确认跳过">
                  <strong>确认跳过本日？</strong>
                  <p className="muted">
                    跳过会计入进度（标记为「已跳过」），与「通过」不同。请写明原因，方便自己复盘与监护人查看。
                  </p>
                  <label className="field">
                    跳过原因（至少 4 字）
                    <textarea
                      value={skipReason}
                      onChange={(e) => setSkipReason(e.target.value)}
                      placeholder="例如：出差无环境 / 身体不适改到周末补做"
                    />
                  </label>
                  {skipError ? <p className="status-fail">{skipError}</p> : null}
                  <div className="meta-row">
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={confirmSkip}
                    >
                      确认跳过
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setSkipOpen(false);
                        setSkipError(null);
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : null}

              {result ? (
                <div>
                  <p>
                    验收结果：
                    <span className={`status-${result}`}>{statusLabel(result)}</span>
                    {existing?.skipReason ||
                    (result === 'skipped' && skipReason.trim()) ? (
                      <>
                        <br />
                        <span className="muted">
                          跳过原因：
                          {result === 'skipped'
                            ? skipReason.trim() || existing?.skipReason
                            : existing?.skipReason}
                        </span>
                      </>
                    ) : null}
                  </p>
                  {resultGaps.length > 0 ? (
                    <div className="gap-panel">
                      <strong>本次未通过的原因</strong>
                      <ul>
                        {resultGaps.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="muted">
                    通过 = 测试全过 + 路径≥80% + 打字题有效
                    {requireEvidence &&
                      ` + 合格证据（≥${minEvidence}字且含文字/数字，拒绝全重复字符）`}
                    。
                  </p>
                </div>
              ) : null}
            </>
          ) : null}

          {companionNote ? (
            <div className="card" style={{ marginTop: 8, background: '#f7f3eb' }}>
              <strong>监护人留言</strong>
              <p>{companionNote}</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
