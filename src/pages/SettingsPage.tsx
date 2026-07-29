import { useRef, useState } from 'react';
import { PERSON_TYPES } from '../core/personTypes';
import type { DayGateApi } from '../hooks/useDayGate';
import {
  downloadBackupFile,
  formatBackupTime,
  parseBackupPreview,
  type BackupPreview,
} from '../lib/backupPreview';
import { listPacksForPerson } from '../packs';
import type { PersonTypeId } from '../types/curriculum';

/**
 * Settings: person/pack switch, custom pack hot-load, guardian, backup & restore.
 * Pack / start-date changes require explicit confirmation to avoid silent remap.
 * @param props.api - DayGate API.
 */
export function SettingsPage({ api }: { api: DayGateApi }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const packFileRef = useRef<HTMLInputElement>(null);
  const packs = listPacksForPerson(api.state.personTypeId, api.state.customPacks);
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    tone: 'ok' | 'err' | 'info';
    text: string;
  } | null>(null);
  const [importPreview, setImportPreview] = useState<{
    preview: BackupPreview;
    raw: string;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [offerFolderAfterImport, setOfferFolderAfterImport] = useState(false);

  const lastBackupLabel = (() => {
    const at = api.state.lastBackupAt ?? api.state.lastFolderBackupAt;
    if (!at) return '尚未备份';
    const method =
      api.state.lastBackupMethod === 'folder'
        ? '已存到文件夹'
        : api.state.lastBackupMethod === 'download'
          ? '已下载文件'
          : api.state.lastFolderBackupAt
            ? '已存到文件夹'
            : '已备份';
    return `${method} · ${formatBackupTime(at)}`;
  })();

  /**
   * Downloads current progress as a backup file and records the event.
   */
  const download = () => {
    downloadBackupFile(
      api.exportJson(),
      `daygate-backup-${api.state.packId}-${api.state.startDate}.json`,
    );
    api.markBackupExported();
    setBanner({
      tone: 'ok',
      text: '备份文件已下载。可发给自己微信/网盘，换手机也能恢复。',
    });
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

  /**
   * Applies a confirmed backup import and optionally offers folder auto-backup.
   * @param raw - Validated backup JSON text.
   */
  const confirmImport = (raw: string) => {
    try {
      api.importJson(raw);
      setImportPreview(null);
      setImportError(null);
      setBanner({
        tone: 'ok',
        text: '已恢复，可继续学习。当前本机进度已被这份备份覆盖。',
      });
      if (
        api.folderBackupStatus.supported &&
        !api.folderBackupStatus.hasFolder
      ) {
        setOfferFolderAfterImport(true);
      }
    } catch {
      setBanner({
        tone: 'err',
        text: '恢复失败。请确认文件未损坏、未选错，然后重试。',
      });
    }
  };

  return (
    <div className={`stack density-${api.person.uiDensity}`}>
      <section className="card stack">
        <div className="eyebrow">设置</div>
        <h1>人员类型 · 课程包 · 监护人</h1>
        <p className="muted">
          学习进度保存在本机浏览器。清缓存、换浏览器或换设备可能丢失，建议定期备份。
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
        <h2>自定义课程包热加载</h2>
        <p className="muted">
          导入符合结构的课程包文件（需通过质量门禁）。示例见{' '}
          <code>public/examples/sample-custom-pack.json</code>
        </p>
        <div className="meta-row">
          <button
            className="btn"
            type="button"
            onClick={() => packFileRef.current?.click()}
          >
            导入课程包
          </button>
          <button className="btn secondary" type="button" onClick={downloadPack}>
            导出当前课程包
          </button>
          <a
            className="btn ghost"
            href={`${import.meta.env.BASE_URL}examples/sample-custom-pack.json`}
            download
          >
            下载示例
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
                : api.packImportMessage ?? '导入失败，请检查文件与质量规则',
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
                    if (confirm(`移除自定义课程包「${p.title}」？`)) {
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
          <p className="muted">暂无自定义课程包</p>
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

      {/* —— Backup & restore (product-facing) —— */}
      <section className="card stack backup-hub" data-testid="backup-hub">
        <div className="eyebrow">备份与恢复</div>
        <h2>保护学习进度</h2>
        <p className="muted">
          <strong>备份</strong>用来防丢；
          <strong>恢复</strong>用来找回来；
          <strong>自动存到文件夹</strong>让本机更省心。三者各管一件事。
        </p>
        <p className="backup-status-line">
          上次备份：{lastBackupLabel}
        </p>

        {banner ? (
          <div
            className={`feedback-banner feedback-${banner.tone}`}
            role="status"
          >
            {banner.text}
          </div>
        ) : null}

        {offerFolderAfterImport ? (
          <div className="feedback-banner feedback-info stack">
            <strong>要不要顺便开启「自动存到文件夹」？</strong>
            <p className="muted" style={{ margin: 0 }}>
              选一个本机文件夹后，以后通过门禁时会自动再存一份，更省心。
            </p>
            <div className="meta-row" style={{ margin: 0 }}>
              <button
                className="btn"
                type="button"
                disabled={api.folderBackupBusy}
                onClick={() => {
                  void (async () => {
                    const ok = await api.selectBackupFolder();
                    if (ok) {
                      await api.backupToFolderNow();
                      setOfferFolderAfterImport(false);
                      setBanner({
                        tone: 'ok',
                        text: '已选文件夹并完成一次备份。',
                      });
                    }
                  })();
                }}
              >
                选择备份文件夹
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setOfferFolderAfterImport(false)}
              >
                先不用
              </button>
            </div>
          </div>
        ) : null}

        {/* 1. Protect progress (folder) */}
        <div className="backup-block stack">
          <h3>1. 保护进度（推荐）</h3>
          <p className="muted">
            选一个本机文件夹，通过门禁时自动再存一份。适合一直用同一台电脑 / Chrome
            或 Edge。
          </p>
          {!api.folderBackupStatus.supported ? (
            <p className="muted">
              当前浏览器不支持「自动存到文件夹」。请用下方「下载备份文件」，或改用
              Chrome / Edge。
            </p>
          ) : (
            <>
              <p className="muted">
                {api.folderBackupStatus.hasFolder
                  ? `已选文件夹：${api.folderBackupStatus.folderName ?? '（已授权）'}`
                  : '尚未选择备份文件夹。'}
              </p>
              <p className="muted">
                文件夹上次成功：
                {formatBackupTime(api.state.lastFolderBackupAt)}
              </p>
              {api.folderBackupStatus.hasFolder &&
              api.folderBackupStatus.permission === 'prompt' ? (
                <p className="muted">
                  需要重新允许访问：下次备份或点「立即备份」时会弹出提示。
                </p>
              ) : null}
              {api.folderBackupStatus.hasFolder &&
              api.folderBackupStatus.permission === 'denied' ? (
                <p className="muted">
                  写入权限已被拒绝，请重新选择文件夹并允许访问。
                </p>
              ) : null}
              <div className="meta-row">
                <button
                  className="btn"
                  type="button"
                  disabled={api.folderBackupBusy}
                  onClick={() => void api.selectBackupFolder()}
                >
                  {api.folderBackupStatus.hasFolder
                    ? '更换备份文件夹'
                    : '选择备份文件夹'}
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  disabled={
                    api.folderBackupBusy || !api.folderBackupStatus.hasFolder
                  }
                  onClick={() => {
                    void (async () => {
                      const ok = await api.backupToFolderNow();
                      if (ok) {
                        setBanner({
                          tone: 'ok',
                          text: '已备份到文件夹。',
                        });
                      }
                    })();
                  }}
                >
                  立即备份
                </button>
                {api.folderBackupStatus.hasFolder ? (
                  <button
                    className="btn ghost"
                    type="button"
                    disabled={api.folderBackupBusy}
                    onClick={() => {
                      if (
                        confirm(
                          '清除已选备份文件夹？（不会删除电脑上已有的备份文件）',
                        )
                      ) {
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
              <p className="tech-note">
                会写入「最新一份」与「按日期的副本」到所选文件夹；授权信息保存在本机，不会上传。
              </p>
            </>
          )}
        </div>

        {/* 2. Download */}
        <div className="backup-block stack">
          <h3>2. 下载一份备份</h3>
          <p className="muted">
            发给自己微信 / 网盘，换手机、换电脑也能用。
          </p>
          <div className="meta-row">
            <button className="btn" type="button" onClick={download}>
              下载备份文件
            </button>
          </div>
        </div>

        {/* 3. Restore from file */}
        <div className="backup-block stack">
          <h3>3. 从备份恢复</h3>
          <p className="muted">
            新设备、清过缓存、或空白状态时，用之前下载 / 文件夹里的备份把进度找回来。
          </p>
          <div className="meta-row">
            <button
              className="btn"
              type="button"
              onClick={() => {
                setImportError(null);
                setImportPreview(null);
                fileRef.current?.click();
              }}
            >
              从备份文件恢复
            </button>
          </div>

          {importError ? (
            <div className="feedback-banner feedback-err" role="alert">
              <strong>恢复失败</strong>
              <p style={{ margin: '8px 0 0' }}>{importError}</p>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                下一步：确认选的是本应用的备份文件；若仍失败，可展开下方「本机急救」试试浏览器副本。
              </p>
            </div>
          ) : null}

          {importPreview ? (
            <div className="import-preview stack" data-testid="import-preview">
              <strong>请确认要恢复的内容</strong>
              <ul className="import-preview-list">
                <li>姓名：{importPreview.preview.displayName}</li>
                <li>课程包：{importPreview.preview.packId}</li>
                <li>开营日：{importPreview.preview.startDate}</li>
                <li>打卡条数：{importPreview.preview.checkInCount}</li>
                <li>
                  最后活动：
                  {formatBackupTime(
                    importPreview.preview.lastActivityAt,
                    '无打卡记录',
                  )}
                </li>
              </ul>
              <p className="warn-line">
                将覆盖当前本机进度。确认后无法用「撤销」自动回到现在这一版（除非你另有备份）。
              </p>
              <div className="meta-row">
                <button
                  className="btn"
                  type="button"
                  onClick={() => confirmImport(importPreview.raw)}
                >
                  确认恢复
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => setImportPreview(null)}
                >
                  取消
                </button>
              </div>
            </div>
          ) : null}

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="backup-file-input"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const result = parseBackupPreview(text);
                if (!result.ok) {
                  setImportPreview(null);
                  setImportError(result.message);
                } else {
                  setImportError(null);
                  setImportPreview({
                    preview: result.preview,
                    raw: result.raw,
                  });
                }
              } catch {
                setImportPreview(null);
                setImportError(
                  '无法读取文件。请换一份备份再试，或确认文件未损坏。',
                );
              }
              e.target.value = '';
            }}
          />
        </div>

        {/* 4. Emergency / reset */}
        <div className="backup-block stack">
          <h3>4. 本机急救</h3>
          <button
            className="btn ghost"
            type="button"
            onClick={() => setShowEmergency((v) => !v)}
          >
            {showEmergency ? '收起急救选项' : '展开急救选项（少用）'}
          </button>
          {showEmergency ? (
            <>
              <p className="muted">
                浏览器里通常还会留一份自动副本。主进度异常时，可尝试找回。
              </p>
              <div className="meta-row">
                <button
                  className="btn secondary"
                  type="button"
                  data-testid="restore-browser-copy"
                  onClick={() => {
                    const ok = api.restoreFromMirror();
                    setBanner(
                      ok
                        ? {
                            tone: 'ok',
                            text: '已从浏览器副本找回，可继续学习。',
                          }
                        : {
                            tone: 'err',
                            text: '未找到可用的浏览器副本。请改用「从备份文件恢复」。',
                          },
                    );
                  }}
                >
                  尝试从浏览器副本找回
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      '确认清空全部本地进度？\n\n' +
                        '此操作不可撤销。清空后需重新开营，或从备份文件恢复。' +
                        '建议先「下载备份文件」再重置。',
                    );
                    if (ok) {
                      api.resetAll();
                      setBanner({
                        tone: 'info',
                        text: '已清空本机进度。可重新开营，或从备份文件恢复。',
                      });
                    }
                  }}
                >
                  重置全部进度
                </button>
              </div>
              <p className="tech-note">
                技术说明：副本键名 daygate-v3-mirror；与文件夹备份相互独立。
              </p>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
