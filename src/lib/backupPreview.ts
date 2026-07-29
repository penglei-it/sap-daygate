/**
 * Pure helpers for backup-file preview before import.
 * Keeps Settings / Onboarding UX free of raw JSON jargon.
 */

/** Human-readable summary of a backup file before overwrite import. */
export interface BackupPreview {
  /** Learner display name from the file. */
  displayName: string;
  /** Curriculum pack id. */
  packId: string;
  /** Camp / pack start date (ISO YYYY-MM-DD) when present. */
  startDate: string;
  /** Number of check-in records in the file. */
  checkInCount: number;
  /** Latest check-in timestamp when any exist (ISO), else null. */
  lastActivityAt: string | null;
  /** Whether onboarding was completed in the backup. */
  onboardingDone: boolean;
}

/** Successful parse result. */
export interface BackupPreviewOk {
  ok: true;
  preview: BackupPreview;
  /** Original JSON text (pass through to importJson). */
  raw: string;
}

/** Failed parse result with a user-facing Chinese message. */
export interface BackupPreviewErr {
  ok: false;
  /** Simplified Chinese guidance for next steps. */
  message: string;
}

export type BackupPreviewResult = BackupPreviewOk | BackupPreviewErr;

/**
 * Formats an ISO timestamp for zh-CN display, or a fallback label.
 * @param iso - ISO datetime string or null/undefined.
 * @param emptyLabel - Shown when missing (default: 无).
 * @returns Locale string or emptyLabel.
 */
export function formatBackupTime(
  iso: string | null | undefined,
  emptyLabel = '尚无',
): string {
  if (!iso) return emptyLabel;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return emptyLabel;
  return d.toLocaleString('zh-CN');
}

/**
 * Picks the latest checkedAt among check-in records.
 * @param checkIns - Check-in map from a backup payload.
 * @returns Latest ISO timestamp or null.
 */
export function findLastActivityAt(
  checkIns: Record<string, { checkedAt?: string }> | undefined,
): string | null {
  if (!checkIns) return null;
  let latest: string | null = null;
  let latestMs = -Infinity;
  for (const cin of Object.values(checkIns)) {
    const at = cin?.checkedAt;
    if (!at) continue;
    const ms = Date.parse(at);
    if (Number.isNaN(ms)) continue;
    if (ms > latestMs) {
      latestMs = ms;
      latest = at;
    }
  }
  return latest;
}

/**
 * Parses backup file text into a preview for confirm-before-import UI.
 * Success: returns structured fields. Failure: Chinese next-step message
 * (wrong file, corrupt JSON, missing shape).
 * @param text - Raw file contents.
 * @returns Ok with preview + raw, or Err with message.
 */
export function parseBackupPreview(text: string): BackupPreviewResult {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) {
    return {
      ok: false,
      message:
        '文件是空的。请重新选择一份「备份文件」（通常由本应用下载或自动存到文件夹）。',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      message:
        '无法读取这份文件。可能选错了文件，或文件已损坏。请换一份备份文件再试；也可在设置里尝试「浏览器里的副本」急救。',
    };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      message:
        '这份文件不像学习进度备份。请选择本应用下载的备份文件，或文件夹里的 daygate-backup 开头的文件。',
    };
  }

  const obj = parsed as Record<string, unknown>;
  // Heuristic: real backups carry checkIns / packId / schemaVersion-ish fields.
  const hasProgressShape =
    'checkIns' in obj ||
    'packId' in obj ||
    'schemaVersion' in obj ||
    'onboardingDone' in obj;

  if (!hasProgressShape) {
    return {
      ok: false,
      message:
        '这份文件不像学习进度备份（可能是课程包文件）。请选择「下载备份文件」得到的那份，而不是课程包。',
    };
  }

  const checkIns =
    obj.checkIns && typeof obj.checkIns === 'object' && !Array.isArray(obj.checkIns)
      ? (obj.checkIns as Record<string, { checkedAt?: string }>)
      : undefined;

  const preview: BackupPreview = {
    displayName:
      typeof obj.displayName === 'string' && obj.displayName.trim()
        ? obj.displayName
        : '（未知）',
    packId:
      typeof obj.packId === 'string' && obj.packId.trim()
        ? obj.packId
        : '（未知）',
    startDate:
      typeof obj.startDate === 'string' && obj.startDate.trim()
        ? obj.startDate
        : '（未知）',
    checkInCount: checkIns ? Object.keys(checkIns).length : 0,
    lastActivityAt: findLastActivityAt(checkIns),
    onboardingDone: Boolean(obj.onboardingDone),
  };

  return { ok: true, preview, raw: trimmed };
}

/**
 * Builds a short Chinese summary line for confirm dialogs / banners.
 * @param preview - Parsed backup preview.
 * @returns One multi-line summary string.
 */
export function formatBackupPreviewSummary(preview: BackupPreview): string {
  const activity = formatBackupTime(preview.lastActivityAt, '无打卡记录');
  return (
    `姓名：${preview.displayName}\n` +
    `课程包：${preview.packId}\n` +
    `开营日：${preview.startDate}\n` +
    `打卡条数：${preview.checkInCount}\n` +
    `最后活动：${activity}`
  );
}

/**
 * Triggers a browser download of a backup JSON blob.
 * @param json - Serialized state.
 * @param filename - Suggested download filename.
 */
export function downloadBackupFile(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
