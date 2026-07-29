import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyPersonScaling,
  evaluateAcceptance,
  filterDays,
} from '../core/acceptance';
import { buildGuardianSummary } from '../core/guardian';
import { importPackFromJson } from '../core/packImport';
import { getPersonType } from '../core/personTypes';
import { addDays, diffDays, formatISODate, weekKey } from '../lib/date';
import { hashEvidence } from '../lib/evidence';
import { hashPin, verifyPin } from '../lib/security';
import {
  createDefaultState,
  exportStateJson,
  loadState,
  restoreFromMirror,
  saveState,
} from '../lib/storage';
import {
  BUILTIN_PACKS,
  getPack,
  listPacksForPerson,
  mergeWithCustomPacks,
} from '../packs';
import type {
  DayCheckIn,
  DayPlan,
  PersonTypeId,
  TrackId,
  UserState,
} from '../types/curriculum';

/**
 * Root application state hook: packs, person scaling, guardian, check-ins.
 * @returns State, derived today plan, and mutators.
 */
export function useDayGate() {
  const [state, setState] = useState<UserState>(() => loadState());
  const [viewDate, setViewDate] = useState(() => formatISODate(new Date()));
  const [packImportMessage, setPackImportMessage] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const person = getPersonType(state.personTypeId);
  const allPacks = useMemo(
    () => mergeWithCustomPacks(state.customPacks),
    [state.customPacks],
  );
  const pack = useMemo(
    () => getPack(state.packId, state.customPacks),
    [state.packId, state.customPacks],
  );

  const scaledDays = useMemo(() => {
    return pack.days.map((d) =>
      applyPersonScaling(d, person.minuteMultiplier, person.dailyBudgetMinutes),
    );
  }, [pack, person]);

  const visibleDays = useMemo(
    () =>
      filterDays(scaledDays, {
        mode: state.mode,
        disabledTracks: state.disabledTracks,
      }),
    [scaledDays, state.mode, state.disabledTracks],
  );

  const planByOffset = useMemo(() => {
    const map = new Map<number, DayPlan>();
    for (const d of visibleDays) {
      map.set(d.dateOffset, d);
    }
    return map;
  }, [visibleDays]);

  const offsetToday = diffDays(state.startDate, viewDate);
  const todayPlan = planByOffset.get(offsetToday) ?? null;

  const minimumPool = useMemo(() => {
    if (state.mode !== 'minimum') return [] as DayPlan[];
    return scaledDays.filter((d) => d.minimumMode).slice(0, 5);
  }, [state.mode, scaledDays]);

  const isGuardian = state.viewRole === 'guardian';

  const update = useCallback((patch: Partial<UserState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const submitCheckIn = useCallback(
    async (
      plan: DayPlan,
      input: {
        completedPathSteps: number[];
        passedTestIds: string[];
        evidence: string;
        typedAnswers: Record<string, string>;
        actualMinutes: number;
        notes: string;
        forceSkip?: boolean;
        /** Required when forceSkip is true. */
        skipReason?: string;
      },
    ) => {
      if (state.viewRole === 'guardian') {
        return 'fail' as const;
      }

      const isGate = Boolean(plan.gateId);
      const status = evaluateAcceptance({
        allTests: plan.acceptanceTests,
        passedTestIds: input.passedTestIds,
        pathTotal: plan.path.length,
        pathDone: input.completedPathSteps.length,
        evidence: input.evidence,
        typedAnswers: input.typedAnswers,
        requireEvidence: Boolean(plan.requireEvidence || plan.gateId),
        isGate,
        forceSkip: input.forceSkip,
      });

      const evidenceHash = await hashEvidence(input.evidence);

      const record: DayCheckIn = {
        dayIndex: plan.dayIndex,
        packId: state.packId,
        status,
        completedPathSteps: input.completedPathSteps,
        passedTestIds: input.passedTestIds,
        evidence: input.evidence,
        evidenceHash,
        typedAnswers: input.typedAnswers,
        actualMinutes: input.actualMinutes,
        checkedAt: new Date().toISOString(),
        notes: input.notes,
        skipReason:
          status === 'skipped' ? (input.skipReason ?? '').trim() : undefined,
      };

      setState((s) => {
        const key = `${s.packId}:${plan.dayIndex}`;
        const wk = weekKey(viewDate);
        const prevHours = s.weeklyHours[wk] ?? 0;
        const gatePassed = status === 'pass' && Boolean(plan.gateId);
        return {
          ...s,
          checkIns: { ...s.checkIns, [key]: record },
          weeklyHours: {
            ...s.weeklyHours,
            [wk]: prevHours + (input.actualMinutes || 0) / 60,
          },
          backupReminderPending: gatePassed ? true : s.backupReminderPending,
        };
      });

      return status;
    },
    [state.packId, state.viewRole, viewDate],
  );

  const getCheckIn = useCallback(
    (dayIndex: number) => state.checkIns[`${state.packId}:${dayIndex}`],
    [state.checkIns, state.packId],
  );

  const stats = useMemo(() => {
    const values = Object.values(state.checkIns).filter(
      (c) => c.packId === state.packId,
    );
    const pass = values.filter((c) => c.status === 'pass').length;
    const partial = values.filter((c) => c.status === 'partial').length;
    const fail = values.filter((c) => c.status === 'fail').length;
    const skipped = values.filter((c) => c.status === 'skipped').length;
    const gates = pack.phases
      .map((p) => p.gateId)
      .filter(Boolean)
      .map((g) => {
        const gateDay = scaledDays.find((d) => d.gateId === g);
        const cin = gateDay ? getCheckIn(gateDay.dayIndex) : undefined;
        return { id: g as string, status: cin?.status ?? 'pending' };
      });
    return {
      pass,
      partial,
      fail,
      skipped,
      total: scaledDays.length,
      gates,
      phases: pack.phases,
    };
  }, [state.checkIns, state.packId, pack.phases, scaledDays, getCheckIn]);

  const guardianSummary = useMemo(
    () =>
      buildGuardianSummary({
        state,
        packTitle: pack.title,
        days: scaledDays,
        viewDate,
        todayPlan,
        getCheckIn,
      }),
    [state, pack.title, scaledDays, viewDate, todayPlan, getCheckIn],
  );

  const completeOnboarding = useCallback(
    async (payload: {
      displayName: string;
      startDate: string;
      personTypeId: PersonTypeId;
      packId: string;
      packOptions: Record<string, string | boolean>;
      disabledTracks: TrackId[];
      mode: UserState['mode'];
      guardianName?: string;
      guardianPin?: string;
    }) => {
      const guardianPinHash = await hashPin(payload.guardianPin ?? '');
      setState((s) => ({
        ...s,
        displayName: payload.displayName,
        startDate: payload.startDate,
        personTypeId: payload.personTypeId,
        packId: payload.packId,
        packOptions: payload.packOptions,
        disabledTracks: payload.disabledTracks,
        mode: payload.mode,
        guardianName: payload.guardianName ?? s.guardianName,
        guardianPinHash,
        onboardingDone: true,
      }));
      setViewDate(payload.startDate);
    },
    [],
  );

  const switchPack = useCallback((packId: string) => {
    setState((s) => ({ ...s, packId }));
  }, []);

  const importCustomPack = useCallback((text: string) => {
    const result = importPackFromJson(text);
    if (!result.pack) {
      setPackImportMessage(result.error ?? '导入失败');
      return false;
    }
    setState((s) => {
      const others = s.customPacks.filter((p) => p.id !== result.pack!.id);
      return {
        ...s,
        customPacks: [...others, result.pack!],
        packId: result.pack!.id,
      };
    });
    setPackImportMessage(`已热加载并切换到：${result.pack.title}`);
    return true;
  }, []);

  const removeCustomPack = useCallback((packId: string) => {
    setState((s) => {
      const customPacks = s.customPacks.filter((p) => p.id !== packId);
      const stillExists = mergeWithCustomPacks(customPacks).some(
        (p) => p.id === s.packId,
      );
      return {
        ...s,
        customPacks,
        packId: stillExists ? s.packId : BUILTIN_PACKS[0].id,
      };
    });
  }, []);

  const enterGuardian = useCallback(() => {
    setState((s) => ({ ...s, viewRole: 'guardian' }));
  }, []);

  const leaveGuardian = useCallback(
    async (pin: string) => {
      const ok = await verifyPin(pin, state.guardianPinHash);
      if (!ok) return false;
      setState((s) => ({ ...s, viewRole: 'learner' }));
      return true;
    },
    [state.guardianPinHash],
  );

  const setGuardianPin = useCallback(async (rawPin: string) => {
    const guardianPinHash = await hashPin(rawPin);
    setState((s) => ({ ...s, guardianPinHash }));
  }, []);

  const dismissBackupReminder = useCallback(() => {
    setState((s) => ({ ...s, backupReminderPending: false }));
  }, []);

  const markBackupExported = useCallback(() => {
    setState((s) => ({ ...s, backupReminderPending: false }));
  }, []);

  const setCompanionNote = useCallback((dayIndex: number, note: string) => {
    setState((s) => {
      const key = `${s.packId}:${dayIndex}`;
      return {
        ...s,
        companionNotes: { ...s.companionNotes, [key]: note },
      };
    });
  }, []);

  const resetAll = useCallback(() => {
    const fresh = createDefaultState();
    setState(fresh);
    setViewDate(fresh.startDate);
  }, []);

  const importJson = useCallback((raw: string) => {
    const parsed = JSON.parse(raw) as UserState;
    setState({ ...createDefaultState(), ...parsed, schemaVersion: 3 });
  }, []);

  const compatiblePacks = useMemo(
    () => listPacksForPerson(state.personTypeId, state.customPacks),
    [state.personTypeId, state.customPacks],
  );

  const exportCurrentPackJson = useCallback(() => {
    return JSON.stringify(pack, null, 2);
  }, [pack]);

  return {
    state,
    update,
    viewDate,
    setViewDate,
    todayPlan,
    minimumPool,
    allDays: scaledDays,
    visibleDays,
    pack,
    packs: allPacks,
    builtinPacks: BUILTIN_PACKS,
    compatiblePacks,
    person,
    planByOffset,
    offsetToday,
    submitCheckIn,
    getCheckIn,
    stats,
    guardianSummary,
    isGuardian,
    completeOnboarding,
    switchPack,
    importCustomPack,
    removeCustomPack,
    packImportMessage,
    setPackImportMessage,
    enterGuardian,
    leaveGuardian,
    setGuardianPin,
    setCompanionNote,
    dismissBackupReminder,
    markBackupExported,
    exportCurrentPackJson,
    resetAll,
    restoreFromMirror: () => {
      const ok = restoreFromMirror();
      if (ok) setState(loadState());
      return ok;
    },
    exportJson: () => exportStateJson(state),
    importJson,
    addDays,
    formatISODate,
  };
}

export type DayGateApi = ReturnType<typeof useDayGate>;
