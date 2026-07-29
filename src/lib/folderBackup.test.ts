import { describe, expect, it } from 'vitest';
import {
  datedBackupFilename,
  formatFolderBackupError,
  isFolderBackupSupported,
  LATEST_BACKUP_FILENAME,
} from './folderBackup';

describe('folderBackup pure helpers', () => {
  it('exposes a stable latest filename', () => {
    expect(LATEST_BACKUP_FILENAME).toBe('daygate-backup-latest.json');
  });

  it('builds dated backup filenames from a fixed date', () => {
    // Local calendar date: avoid UTC shift surprises in CI
    const d = new Date(2026, 6, 29);
    expect(datedBackupFilename(d)).toBe('daygate-backup-2026-07-29.json');
  });

  it('pads single-digit month and day', () => {
    expect(datedBackupFilename(new Date(2026, 0, 5))).toBe(
      'daygate-backup-2026-01-05.json',
    );
  });

  it('detects unsupported environments without showDirectoryPicker', () => {
    // Vitest node env has no window.showDirectoryPicker by default
    expect(isFolderBackupSupported()).toBe(false);
  });

  it('formats AbortError as cancelled', () => {
    const err = new DOMException('The user aborted a request.', 'AbortError');
    expect(formatFolderBackupError(err)).toBe('已取消选择文件夹');
  });

  it('formats NotAllowedError as permission message', () => {
    const err = new DOMException('Permission denied', 'NotAllowedError');
    expect(formatFolderBackupError(err)).toContain('没有写入权限');
  });

  it('formats NotFoundError as missing folder', () => {
    const err = new DOMException('Not found', 'NotFoundError');
    expect(formatFolderBackupError(err)).toContain('找不到备份文件夹');
  });

  it('formats plain Error messages', () => {
    expect(formatFolderBackupError(new Error('磁盘已满'))).toBe(
      '备份失败：磁盘已满',
    );
  });

  it('formats string errors as-is', () => {
    expect(formatFolderBackupError('自定义错误')).toBe('自定义错误');
  });

  it('formats null/undefined as unknown', () => {
    expect(formatFolderBackupError(null)).toBe('备份失败：未知错误');
  });
});
