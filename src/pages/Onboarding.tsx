import { useMemo, useState } from 'react';
import { PERSON_TYPES } from '../core/personTypes';
import type { DayGateApi } from '../hooks/useDayGate';
import { getPack, listPacksForPerson } from '../packs';
import type { PersonTypeId, UserState } from '../types/curriculum';

/**
 * First-run setup: person type, pack, options.
 * @param props.api - DayGate API.
 */
export function Onboarding({ api }: { api: DayGateApi }) {
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
          课程包 Pack
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
