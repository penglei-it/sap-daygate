import { useMemo, useRef, useState } from 'react';
import { PERSON_TYPES } from '../core/personTypes';
import type { DayGateApi } from '../hooks/useDayGate';
import {
  formatBackupTime,
  parseBackupPreview,
  type BackupPreview,
} from '../lib/backupPreview';
import { getPack, listPacksForPerson } from '../packs';
import type { PersonTypeId, UserState } from '../types/curriculum';

/**
 * First-run setup: person type, pack, options, or restore-from-backup entry.
 * @param props.api - DayGate API.
 */
export function Onboarding({ api }: { api: DayGateApi }) {
  const restoreRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('学习者');
  const [startDate, setStartDate] = useState(api.state.startDate);
  const [personTypeId, setPersonTypeId] =
    useState<PersonTypeId>('working_professional');
  const packs = useMemo(
    () => listPacksForPerson(personTypeId, api.state.customPacks),
    [personTypeId, api.state.customPacks],
  );
  const [packId, setPackId] = useState(packs[0]?.id ?? 'task-personal-okr');
  const pack = getPack(packId, api.state.customPacks);
  const person = PERSON_TYPES.find((p) => p.id === personTypeId)!;
  const [guardianName, setGuardianName] = useState('家长/监护人');
  const [guardianPin, setGuardianPin] = useState('');

  const [packOptions, setPackOptions] = useState<Record<string, string | boolean>>(
    () => Object.fromEntries((pack.optionFields ?? []).map((f) => [f.id, f.defaultValue])),
  );
  const [disableCert, setDisableCert] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    preview: BackupPreview;
    raw: string;
  } | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const onPersonChange = (id: PersonTypeId) => {
    setPersonTypeId(id);
    const nextPacks = listPacksForPerson(id, api.state.customPacks);
    const nextId = nextPacks[0]?.id;
    if (nextId) {
      setPackId(nextId);
      const p = getPack(nextId, api.state.customPacks);
      setPackOptions(
        Object.fromEntries((p.optionFields ?? []).map((f) => [f.id, f.defaultValue])),
      );
    }
  };

  const onPackChange = (id: string) => {
    setPackId(id);
    const p = getPack(id, api.state.customPacks);
    setPackOptions(
      Object.fromEntries((p.optionFields ?? []).map((f) => [f.id, f.defaultValue])),
    );
  };

  return (
    <div className={`app-shell onboarding density-${person.uiDensity}`}>
      <div className="card stack">
        <div className="eyebrow">DayGate · 通用学习操作系统</div>
        <h1 className="hero-title">先选「你是谁」，再选「学什么」</h1>
        <p className="muted">
          支持不同年龄与精力画像，课程以可替换的 Pack 提供：技能 / 考试 / 任务。
          验收通过才算完成，不只是打卡。
        </p>

        <div className="restore-entry stack">
          <p className="muted" style={{ margin: 0 }}>
            换了手机、清过缓存，或已有备份？
          </p>
          <div className="meta-row" style={{ margin: 0 }}>
            <button
              className="btn secondary"
              type="button"
              data-testid="onboarding-restore"
              onClick={() => {
                setRestoreError(null);
                setRestorePreview(null);
                restoreRef.current?.click();
              }}
            >
              我有备份，直接恢复
            </button>
          </div>
          {restoreError ? (
            <div className="feedback-banner feedback-err" role="alert">
              {restoreError}
            </div>
          ) : null}
          {restorePreview ? (
            <div className="import-preview stack" data-testid="onboarding-import-preview">
              <strong>确认恢复这份进度？</strong>
              <ul className="import-preview-list">
                <li>姓名：{restorePreview.preview.displayName}</li>
                <li>课程包：{restorePreview.preview.packId}</li>
                <li>开营日：{restorePreview.preview.startDate}</li>
                <li>打卡条数：{restorePreview.preview.checkInCount}</li>
                <li>
                  最后活动：
                  {formatBackupTime(
                    restorePreview.preview.lastActivityAt,
                    '无打卡记录',
                  )}
                </li>
              </ul>
              <p className="warn-line">将覆盖当前本机内容，然后直接进入学习。</p>
              <div className="meta-row">
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    try {
                      // Ensure restore from empty onboarding always enters the app.
                      const parsed = JSON.parse(restorePreview.raw) as Record<
                        string,
                        unknown
                      >;
                      parsed.onboardingDone = true;
                      api.importJson(JSON.stringify(parsed));
                      setRestorePreview(null);
                    } catch {
                      setRestoreError(
                        '恢复失败。请确认文件未损坏、未选错，然后重试。',
                      );
                    }
                  }}
                >
                  确认恢复并进入
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => setRestorePreview(null)}
                >
                  取消
                </button>
              </div>
            </div>
          ) : null}
          <input
            ref={restoreRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const result = parseBackupPreview(text);
                if (!result.ok) {
                  setRestorePreview(null);
                  setRestoreError(result.message);
                } else {
                  setRestoreError(null);
                  setRestorePreview({
                    preview: result.preview,
                    raw: result.raw,
                  });
                }
              } catch {
                setRestorePreview(null);
                setRestoreError(
                  '无法读取文件。请换一份备份再试，或确认文件未损坏。',
                );
              }
              e.target.value = '';
            }}
          />
        </div>

        <hr className="onboarding-divider" />

        <label className="field">
          怎么称呼你
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>

        <label className="field">
          开营日期（第 1 天）
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label className="field">
          人员类型
          <select
            value={personTypeId}
            onChange={(e) => onPersonChange(e.target.value as PersonTypeId)}
          >
            {PERSON_TYPES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          {person.description} 建议每日约 {person.dailyBudgetMinutes} 分钟。
        </p>

        <label className="field">
          课程包
          <select value={packId} onChange={(e) => onPackChange(e.target.value)}>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.category}] {p.title}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">{pack.summary}</p>

        {(pack.optionFields ?? []).map((field) => (
          <label className="field" key={field.id}>
            {field.label}
            {field.type === 'select' ? (
              <select
                value={String(packOptions[field.id] ?? field.defaultValue)}
                onChange={(e) =>
                  setPackOptions((s) => ({ ...s, [field.id]: e.target.value }))
                }
              >
                {(field.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'boolean' ? (
              <select
                value={packOptions[field.id] ? 'yes' : 'no'}
                onChange={(e) =>
                  setPackOptions((s) => ({
                    ...s,
                    [field.id]: e.target.value === 'yes',
                  }))
                }
              >
                <option value="yes">是</option>
                <option value="no">否</option>
              </select>
            ) : (
              <input
                value={String(packOptions[field.id] ?? '')}
                onChange={(e) =>
                  setPackOptions((s) => ({ ...s, [field.id]: e.target.value }))
                }
              />
            )}
          </label>
        ))}

        {pack.optionalTracks?.includes('cert') ? (
          <label className="field">
            是否关闭证书轨（cert）
            <select
              value={disableCert ? 'yes' : 'no'}
              onChange={(e) => setDisableCert(e.target.value === 'yes')}
            >
              <option value="no">保留</option>
              <option value="yes">关闭</option>
            </select>
          </label>
        ) : null}

        <label className="field">
          监护人显示名（可选）
          <input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
        </label>
        <label className="field">
          监护 PIN（可选，用于退出监护视图）
          <input
            type="password"
            value={guardianPin}
            onChange={(e) => setGuardianPin(e.target.value)}
            placeholder="可留空"
          />
        </label>

        <button
          className="btn"
          type="button"
          data-testid="start-day-1"
          onClick={() => {
            void api.completeOnboarding({
              displayName,
              startDate,
              personTypeId,
              packId,
              packOptions,
              disabledTracks: disableCert ? ['cert'] : [],
              mode: person.defaultMode as UserState['mode'],
              guardianName,
              guardianPin,
            });
          }}
        >
          开始第 1 天
        </button>
      </div>
    </div>
  );
}
