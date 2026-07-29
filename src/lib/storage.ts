import type { DayCheckIn, UserState } from '../types/curriculum';
import { evaluateAcceptance } from '../core/acceptance';
import type { AcceptanceInput } from '../core/acceptance';
import { hashPin } from './security';

const STORAGE_KEY = 'daygate-v3';
const MIRROR_KEY = 'daygate-v3-mirror';

/** Default user state for first launch. */
export function createDefaultState(): UserState {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  return {
    onboardingDone: false,
    startDate: iso,
    displayName: '学习者',
    personTypeId: 'working_professional',
    packId: 'skill-sap-abap',
    packOptions: {},
    disabledTracks: [],
    mode: 'standard',
    checkIns: {},
    weeklyHours: {},
    customPacks: [],
    viewRole: 'learner',
    guardianPinHash: '',
    guardianName: '监护人',
    companionNotes: {},
    backupReminderPending: false,
    schemaVersion: 3,
  };
}

/**
 * Loads persisted state from localStorage with light migration.
 * Falls back to mirrored copy when primary is missing/corrupt.
 * @returns Parsed state or defaults when missing/corrupt.
 */
export function loadState(): UserState {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(MIRROR_KEY) ??
      localStorage.getItem('daygate-v2') ??
      localStorage.getItem('sap-daygate-v1');
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as Partial<UserState> & {
      businessDomain?: string;
      certTrackEnabled?: boolean;
      guardianPin?: string;
    };
    const base = createDefaultState();
    const merged: UserState = {
      ...base,
      ...parsed,
      packOptions: parsed.packOptions ?? {},
      disabledTracks: parsed.disabledTracks ?? [],
      checkIns: parsed.checkIns ?? {},
      weeklyHours: parsed.weeklyHours ?? {},
      customPacks: parsed.customPacks ?? [],
      companionNotes: parsed.companionNotes ?? {},
      viewRole: parsed.viewRole === 'guardian' ? 'guardian' : 'learner',
      guardianPinHash: parsed.guardianPinHash ?? '',
      guardianName: parsed.guardianName ?? '监护人',
      backupReminderPending: Boolean(parsed.backupReminderPending),
      schemaVersion: 3,
      personTypeId: parsed.personTypeId ?? base.personTypeId,
      packId: parsed.packId ?? base.packId,
    };
    if (parsed.businessDomain && !merged.packOptions.businessDomain) {
      merged.packOptions.businessDomain = parsed.businessDomain;
    }
    if (
      parsed.certTrackEnabled === false &&
      !merged.disabledTracks.includes('cert')
    ) {
      merged.disabledTracks = [...merged.disabledTracks, 'cert'];
    }
    // One-shot migration from legacy plaintext PIN -> hash (no recursive load).
    if (!merged.guardianPinHash && parsed.guardianPin) {
      const legacy = parsed.guardianPin;
      void hashPin(legacy).then((digest) => {
        try {
          const currentRaw = localStorage.getItem(STORAGE_KEY);
          const current = currentRaw
            ? (JSON.parse(currentRaw) as Record<string, unknown>)
            : {};
          current.guardianPinHash = digest;
          delete current.guardianPin;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch {
          // ignore migration failure; user can reset PIN in settings
        }
      });
    }
    return merged;
  } catch {
    return createDefaultState();
  }
}

/**
 * Persists user state and mirrors a secondary local copy.
 * @param state - Full user state object.
 */
export function saveState(state: UserState): void {
  const { ...safe } = state;
  // Ensure plaintext PIN never persists even if callers attach it dynamically.
  delete (safe as { guardianPin?: string }).guardianPin;
  const payload = JSON.stringify(safe);
  localStorage.setItem(STORAGE_KEY, payload);
  localStorage.setItem(MIRROR_KEY, payload);
}

/**
 * Loads mirrored backup if primary is missing/corrupt.
 * @returns Parsed mirror state or null.
 */
export function loadMirrorState(): UserState | null {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserState;
    return { ...createDefaultState(), ...parsed, schemaVersion: 3 };
  } catch {
    return null;
  }
}

/**
 * Restores primary storage from mirror.
 * @returns True when mirror existed and was restored.
 */
export function restoreFromMirror(): boolean {
  const mirror = loadMirrorState();
  if (!mirror) return false;
  saveState(mirror);
  return true;
}

/**
 * Exports state as downloadable JSON string.
 */
export function exportStateJson(state: UserState): string {
  const { ...safe } = state;
  delete (safe as { guardianPin?: string }).guardianPin;
  return JSON.stringify(safe, null, 2);
}

/**
 * Wrapper kept for callers that still use the older signature shape.
 */
export function evaluateAcceptanceLegacy(
  allTestIds: string[],
  passedTestIds: string[],
  pathTotal: number,
  pathDone: number,
  extra?: Partial<AcceptanceInput>,
): DayCheckIn['status'] {
  return evaluateAcceptance({
    allTests: allTestIds.map((id) => ({
      id,
      question: id,
      passHint: '',
    })),
    passedTestIds,
    pathTotal,
    pathDone,
    evidence: extra?.evidence ?? '',
    typedAnswers: extra?.typedAnswers ?? {},
    requireEvidence: extra?.requireEvidence ?? false,
    forceSkip: extra?.forceSkip,
  });
}
