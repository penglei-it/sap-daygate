/**
 * Folder backup via the File System Access API (Chrome/Edge).
 * Directory handles are persisted in IndexedDB (structured clone), not localStorage.
 */

const IDB_NAME = 'daygate-folder-backup';
const IDB_VERSION = 1;
const IDB_STORE = 'handles';
const HANDLE_KEY = 'backupDirectory';

/** Overwritten on every successful folder write. */
export const LATEST_BACKUP_FILENAME = 'daygate-backup-latest.json';

/** Permission options for read/write access to the chosen directory. */
const READWRITE: FileSystemPermissionMode = 'readwrite';

/**
 * Detects whether showDirectoryPicker is available in this browser.
 * @returns True when the File System Access directory picker exists.
 */
export function isFolderBackupSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.showDirectoryPicker === 'function'
  );
}

/**
 * Builds a dated backup filename for history copies.
 * @param date - Instant used for the YYYY-MM-DD suffix (defaults to now).
 * @returns Filename like `daygate-backup-2026-07-29.json`.
 */
export function datedBackupFilename(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `daygate-backup-${y}-${m}-${d}.json`;
}

/**
 * Maps unknown errors to short Chinese messages for the UI.
 * @param err - Thrown value from picker, permission, or write.
 * @returns User-facing simplified Chinese error text.
 */
export function formatFolderBackupError(err: unknown): string {
  if (err == null) return '备份失败：未知错误';
  if (typeof err === 'string') return err;

  const name =
    typeof err === 'object' && err !== null && 'name' in err
      ? String((err as { name: unknown }).name)
      : '';
  const message =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : '';

  if (name === 'AbortError') return '已取消选择文件夹';
  if (name === 'NotAllowedError' || /permission/i.test(message)) {
    return '没有写入权限。请重新选择备份文件夹并允许访问。';
  }
  if (name === 'NotFoundError') {
    return '找不到备份文件夹（可能已删除或移动）。请重新选择。';
  }
  if (name === 'SecurityError') {
    return '浏览器安全策略阻止了文件夹访问。请确认使用 HTTPS 或 localhost。';
  }
  if (message) return `备份失败：${message}`;
  if (!isFolderBackupSupported()) {
    return '当前浏览器不支持选文件夹备份。请使用 Chrome/Edge，或改用「下载备份文件」。';
  }
  return '备份失败：无法写入所选文件夹';
}

/**
 * Opens IndexedDB used to store the directory handle.
 * @returns Open database instance.
 */
function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB 不可用'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onerror = () =>
      reject(req.error ?? new Error('无法打开 IndexedDB'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
  });
}

/**
 * Persists a directory handle in IndexedDB (Chrome structured clone).
 * @param handle - Directory handle from showDirectoryPicker.
 */
export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openHandleDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error('保存文件夹句柄失败'));
      tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY);
    });
  } finally {
    db.close();
  }
}

/**
 * Loads the previously saved directory handle, if any.
 * @returns Saved handle or null when missing / unsupported.
 */
export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openHandleDb();
    try {
      return await new Promise<FileSystemDirectoryHandle | null>(
        (resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const req = tx.objectStore(IDB_STORE).get(HANDLE_KEY);
          req.onsuccess = () => {
            const value = req.result;
            resolve(
              value && typeof value === 'object'
                ? (value as FileSystemDirectoryHandle)
                : null,
            );
          };
          req.onerror = () =>
            reject(req.error ?? new Error('读取文件夹句柄失败'));
        },
      );
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/**
 * Removes the stored directory handle from IndexedDB.
 */
export async function clearDirectoryHandle(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openHandleDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error('清除文件夹句柄失败'));
      tx.objectStore(IDB_STORE).delete(HANDLE_KEY);
    });
  } finally {
    db.close();
  }
}

/**
 * Queries or requests readwrite permission on a directory handle.
 * @param handle - Directory to check.
 * @param requestIfNeeded - When true, may show a permission prompt.
 * @returns True when readwrite is granted.
 */
export async function ensureDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  requestIfNeeded = true,
): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: READWRITE };
  const query = handle.queryPermission?.bind(handle);
  const request = handle.requestPermission?.bind(handle);

  if (query) {
    const state = await query(opts);
    if (state === 'granted') return true;
    if (state === 'denied' || !requestIfNeeded) return false;
  }

  if (requestIfNeeded && request) {
    const state = await request(opts);
    return state === 'granted';
  }

  // Older builds without permission methods: attempt write and let it fail.
  return true;
}

/**
 * Opens the native directory picker and persists the chosen handle.
 * @returns Chosen directory handle.
 * @throws AbortError when the user cancels; other errors for security/API failures.
 */
export async function pickBackupFolder(): Promise<FileSystemDirectoryHandle> {
  if (!isFolderBackupSupported()) {
    throw new Error(
      '当前浏览器不支持选文件夹备份。请使用 Chrome/Edge，或改用「下载备份文件」。',
    );
  }
  const picker = window.showDirectoryPicker;
  if (typeof picker !== 'function') {
    throw new Error(
      '当前浏览器不支持选文件夹备份。请使用 Chrome/Edge，或改用「下载备份文件」。',
    );
  }
  const handle = await picker.call(window, {
    id: 'daygate-backup',
    mode: 'readwrite',
    startIn: 'documents',
  });
  const ok = await ensureDirectoryPermission(handle, true);
  if (!ok) {
    throw new DOMException(
      '没有写入权限。请重新选择备份文件夹并允许访问。',
      'NotAllowedError',
    );
  }
  await saveDirectoryHandle(handle);
  return handle;
}

/**
 * Writes JSON backup files into the directory (latest + optional dated copy).
 * @param handle - Target directory (must already have write permission).
 * @param json - Serialized user state JSON.
 * @param options.includeDatedCopy - Also write `daygate-backup-YYYY-MM-DD.json`.
 * @returns Names of files written.
 * @throws When create/write fails or permission is missing.
 */
export async function writeStateBackup(
  handle: FileSystemDirectoryHandle,
  json: string,
  options: { includeDatedCopy?: boolean } = { includeDatedCopy: true },
): Promise<{ latestName: string; datedName?: string }> {
  const ok = await ensureDirectoryPermission(handle, true);
  if (!ok) {
    throw new DOMException(
      '没有写入权限。请重新选择备份文件夹并允许访问。',
      'NotAllowedError',
    );
  }

  const writeFile = async (name: string) => {
    const fileHandle = await handle.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(json);
    } finally {
      await writable.close();
    }
  };

  await writeFile(LATEST_BACKUP_FILENAME);
  let datedName: string | undefined;
  if (options.includeDatedCopy !== false) {
    datedName = datedBackupFilename();
    await writeFile(datedName);
  }
  return { latestName: LATEST_BACKUP_FILENAME, datedName };
}

/**
 * Snapshot of folder-backup readiness for Settings / hooks.
 */
export interface FolderBackupStatus {
  /** Whether showDirectoryPicker exists. */
  supported: boolean;
  /** Whether a handle is stored in IndexedDB. */
  hasFolder: boolean;
  /** Directory display name when known. */
  folderName?: string;
  /** Last queryPermission result for readwrite. */
  permission?: PermissionState | 'unknown';
}

/**
 * Loads stored handle and verifies permission without prompting when possible.
 * @returns Status for UI display.
 */
export async function getFolderBackupStatus(): Promise<FolderBackupStatus> {
  if (!isFolderBackupSupported()) {
    return { supported: false, hasFolder: false };
  }
  const handle = await loadDirectoryHandle();
  if (!handle) {
    return { supported: true, hasFolder: false };
  }
  let permission: PermissionState | 'unknown' = 'unknown';
  try {
    if (handle.queryPermission) {
      permission = await handle.queryPermission({ mode: READWRITE });
    }
  } catch {
    permission = 'unknown';
  }
  return {
    supported: true,
    hasFolder: true,
    folderName: handle.name,
    permission,
  };
}

/**
 * Loads handle, ensures permission, and writes backup JSON.
 * @param json - Serialized user state.
 * @param options.includeDatedCopy - Also write a dated history file.
 * @returns Write result including folder name.
 * @throws Formatted errors should be wrapped by callers via formatFolderBackupError.
 */
export async function backupJsonToStoredFolder(
  json: string,
  options?: { includeDatedCopy?: boolean },
): Promise<{ latestName: string; datedName?: string; folderName: string }> {
  const handle = await loadDirectoryHandle();
  if (!handle) {
    throw new Error('尚未选择备份文件夹。请先在设置中选择。');
  }
  const written = await writeStateBackup(handle, json, options);
  return { ...written, folderName: handle.name };
}
