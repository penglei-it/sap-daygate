import { useRef, useState } from 'react';
import { PERSON_TYPES } from '../core/personTypes';
import type { DayGateApi } from '../hooks/useDayGate';
import { listPacksForPerson } from '../packs';
import type { PersonTypeId } from '../types/curriculum';

/**
 * Settings: person/pack switch, custom pack hot-load, guardian, backup.
 * Pack / start-date changes require explicit confirmation to avoid silent remap.
 * @param props.api - DayGate API.
 */
export function SettingsPage({ api }: { api: DayGateApi }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const packFileRef = useRef<HTMLInputElement>(null);
  const packs = listPacksForPerson(api.state.personTypeId, api.state.customPacks);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([api.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daygate-backup-${api.state.packId}-${api.state.startDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    api.markBackupExported();
  };

  const downloadPack = () => {
    const blob = new Blob([api.exportCurrentPackJson()], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${api.pack.id}.pack.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Confirms pack switch; progress keys are packId:day and do not merge.
   * @param nextPackId - Target pack id.
   */
  const onPackChange = (nextPackId: string) => {
    if (nextPackId === api.state.packId) return;
    const nextTitle =
      packs.find((p) => p.id === nextPackId)?.title ?? nextPackId;
    const ok = window.confirm(
      `切换课程包到「${nextTitle}」？\n\n` +
        '进度按「课程包 + 日序号」分别保存：旧包进度不会消失，但「今天」会按新包课表显示。' +
        '不会自动把旧包打卡合并到新包。',
    );
    if (ok) api.switchPack(nextPackId);
  };

  /**
   * Confirms start-date change; calendar offset mapping will shift.
   * @param nextDate - ISO date string.
   */
  const onStartDateChange = (nextDate: string) => {
    if (nextDate === api.state.startDate) return;
    const ok = window.confirm(
      `将开营日期改为 ${nextDate}？\n\n` +
        '「今天」对应的课程序号会按新开营日重新映射，已有打卡不会删除，但日历对齐可能变化。',
    );
    if (ok) api.update({ startDate: nextDate });
  };

  return (
    <div className={`stack density-${api.person.uiDensity}`}>
      <section className="card stack">
        <div className="eyebrow">设置</div>
        <h1>人员类型 · 课程包热加载 · 监护人</h1>
        <p className="muted">
          <strong>Local-only：</strong>
          进度保存在本机浏览器 localStorage。清理站点数据、换浏览器或换设备可能导致丢失。请定期导出备份。
        </p>

        <label className="field">
          显示名
          <input
            value={api.state.displayName}
            onChange={(e) => api.update({ displayName: e.target.value })}
          />
        </label>

        <label className="field">
          开营日期
          <input
            type="date"
            value={api.state.startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </label>
        <p className="muted">修改开营日会改变「今天」对应哪一课，会先弹出确认。</p>

        <label className="field">
          人员类型
          <select
            value={api.state.personTypeId}
            onChange={(e) => {
              const personTypeId = e.target.value as PersonTypeId;
              const nextPacks = listPacksForPerson(
                personTypeId,
                api.state.customPacks,
              );
              const packStillOk = nextPacks.some((p) => p.id === api.state.packId);
              const nextPackId = packStillOk
                ? api.state.packId
                : nextPacks[0]?.id;
              const mode = PERSON_TYPES.find((p) => p.id === personTypeId)
                ?.defaultMode;
              if (nextPackId && nextPackId !== api.state.packId) {
                const ok = window.confirm(
                  `人员类型将切换课程包到「${nextPacks[0]?.title ?? nextPackId}」，并可能改默认模式。继续？`,
                );
                if (!ok) return;
              }
              api.update({
                personTypeId,
                packId: nextPackId,
                mode,
              });
            }}
          >
            {PERSON_TYPES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          课程包
          <select
            value={api.state.packId}
            onChange={(e) => onPackChange(e.target.value)}
          >
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.category}] {p.title}
                {api.state.customPacks.some((c) => c.id === p.id) ? ' · 自定义' : ''}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">换包前会确认；旧包进度按包分别保留。</p>

        <label className="field">
          关闭证书轨 cert
          <select
            value={api.state.disabledTracks.includes('cert') ? 'yes' : 'no'}
            onChange={(e) => {
              const disabled = new Set(api.state.disabledTracks);
              if (e.target.value === 'yes') disabled.add('cert');
              else disabled.delete('cert');
              api.update({ disabledTracks: [...disabled] });
            }}
          >
            <option value="no">否</option>
            <option value="yes">是</option>
          </select>
        </label>
      </section>

      <section className="card stack">
        <h2>自定义 Pack JSON 热加载</h2>
        <p className="muted">
          导入符合 CurriculumPack 结构的 JSON（需通过质量门禁）。示例见{' '}
          <code>public/examples/sample-custom-pack.json</code>
        </p>
        <div className="meta-row">
          <button
            className="btn"
            type="button"
            onClick={() => packFileRef.current?.click()}
          >
            导入 Pack JSON
          </button>
          <button className="btn secondary" type="button" onClick={downloadPack}>
            导出当前 Pack
          </button>
          <a className="btn ghost" href={`${import.meta.env.BASE_URL}examples/sample-custom-pack.json`} download>
            下载示例 Pack
          </a>
        </div>
        <input
          ref={packFileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            const ok = api.importCustomPack(text);
            setLocalMsg(
              ok
                ? api.packImportMessage
                : api.packImportMessage ?? '导入失败，请检查 JSON 与质量规则',
            );
            e.target.value = '';
          }}
        />
        {(localMsg || api.packImportMessage) && (
          <p className="muted">{localMsg ?? api.packImportMessage}</p>
        )}
        {api.state.customPacks.length > 0 ? (
          <ul>
            {api.state.customPacks.map((p) => (
              <li key={p.id}>
                {p.title}{' '}
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    if (confirm(`移除自定义 Pack「${p.title}」？`)) {
                      api.removeCustomPack(p.id);
                    }
                  }}
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">暂无自定义 Pack</p>
        )}
      </section>

      <section className="card stack">
        <h2>监护人 / 陪伴模式</h2>
        <label className="field">
          监护人显示名
          <input
            value={api.state.guardianName}
            onChange={(e) => api.update({ guardianName: e.target.value })}
          />
        </label>
        <label className="field">
          退出监护视图 PIN（可选，仅存哈希）
          <input
            type="password"
            defaultValue=""
            placeholder={
              api.state.guardianPinHash ? '已设置（输入新 PIN 可覆盖）' : '可留空'
            }
            onBlur={(e) => {
              const value = e.target.value;
              if (value.trim()) void api.setGuardianPin(value);
            }}
          />
        </label>
        <div className="meta-row">
          <button className="btn" type="button" onClick={() => api.enterGuardian()}>
            进入监护人视图
          </button>
        </div>
      </section>

      <section className="card stack">
        <h2>备份</h2>
        <p className="muted">
          每次保存都会写入主存储 + 镜像副本（daygate-v3-mirror）。若主数据异常，可尝试从镜像恢复。
        </p>

        <h3>文件夹自动备份</h3>
        {!api.folderBackupStatus.supported ? (
          <p className="muted">
            当前浏览器不支持「选文件夹备份」（需 Chrome / Edge 等支持 File System Access
            API）。请继续使用下方「导出备份 JSON」。
          </p>
        ) : (
          <>
            <p className="muted">
              {api.folderBackupStatus.hasFolder
                ? `已选择文件夹：${api.folderBackupStatus.folderName ?? '（已授权）'}`
                : '尚未选择备份文件夹。选定后，验收通过（pass/partial）与门禁 Pass 时会自动写入。'}
            </p>
            <p className="muted">
              上次成功备份：
              {api.state.lastFolderBackupAt
                ? new Date(api.state.lastFolderBackupAt).toLocaleString('zh-CN')
                : '尚无'}
            </p>
            {api.folderBackupStatus.hasFolder &&
            api.folderBackupStatus.permission === 'prompt' ? (
              <p className="muted">
                权限需重新确认：下次备份或点击「立即备份到文件夹」时会弹出授权。
              </p>
            ) : null}
            {api.folderBackupStatus.hasFolder &&
            api.folderBackupStatus.permission === 'denied' ? (
              <p className="muted">
                写入权限已被拒绝，请重新选择备份文件夹并允许访问。
              </p>
            ) : null}
            <div className="meta-row">
              <button
                className="btn"
                type="button"
                disabled={api.folderBackupBusy}
                onClick={() => void api.selectBackupFolder()}
              >
                选择备份文件夹
              </button>
              <button
                className="btn secondary"
                type="button"
                disabled={
                  api.folderBackupBusy || !api.folderBackupStatus.hasFolder
                }
                onClick={() => void api.backupToFolderNow()}
              >
                立即备份到文件夹
              </button>
              {api.folderBackupStatus.hasFolder ? (
                <button
                  className="btn ghost"
                  type="button"
                  disabled={api.folderBackupBusy}
                  onClick={() => {
                    if (confirm('清除已选备份文件夹？（不会删除磁盘上的备份文件）')) {
                      void api.clearBackupFolder();
                    }
                  }}
                >
                  清除所选文件夹
                </button>
              ) : null}
            </div>
            {api.folderBackupError ? (
              <p className="muted" role="alert">
                {api.folderBackupError}
              </p>
            ) : null}
            <p className="muted">
              写入文件：<code>daygate-backup-latest.json</code>
              （覆盖）以及当日副本{' '}
              <code>daygate-backup-YYYY-MM-DD.json</code>。句柄保存在 IndexedDB，不会进入
              localStorage。
            </p>
          </>
        )}

        <h3>手动 JSON 导出 / 导入</h3>
        <p className="muted">
          与文件夹备份相互独立：换机、不支持选文件夹的浏览器，或需要分享进度时，请用导出
          JSON。
        </p>
        <div className="meta-row">
          <button className="btn" type="button" onClick={download}>
            导出备份 JSON
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            导入备份
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => {
              const ok = api.restoreFromMirror();
              setLocalMsg(ok ? '已从镜像恢复' : '未找到可用镜像');
            }}
          >
            从镜像恢复
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              if (confirm('确认清空全部本地进度？')) api.resetAll();
            }}
          >
            重置
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const text = await file.text();
              const parsed = JSON.parse(text) as {
                displayName?: string;
                packId?: string;
                checkIns?: Record<string, unknown>;
              };
              const passHint = parsed.checkIns
                ? Object.keys(parsed.checkIns).length
                : 0;
              const ok = window.confirm(
                `导入备份？\n\n姓名：${parsed.displayName ?? '（未知）'}\n` +
                  `课程包：${parsed.packId ?? '（未知）'}\n打卡记录数：${passHint}\n\n` +
                  '将覆盖当前本地进度。',
              );
              if (!ok) {
                e.target.value = '';
                return;
              }
              api.importJson(text);
              setLocalMsg('备份导入成功');
            } catch {
              setLocalMsg('备份导入失败：JSON 无法解析');
            }
            e.target.value = '';
          }}
        />
      </section>
    </div>
  );
}
