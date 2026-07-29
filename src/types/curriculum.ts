/**
 * Generalized DayGate domain model: person types + curriculum packs.
 */

/** External learning reference. */
export interface ReferenceLink {
  /** Display title shown in UI. */
  title: string;
  /** Absolute URL to the resource. */
  url: string;
}

/** One acceptance test item the learner must confirm. */
export interface AcceptanceTest {
  /** Stable id within the day plan. */
  id: string;
  /** Self-check question or micro-test prompt. */
  question: string;
  /** Hint describing what “pass” looks like. */
  passHint: string;
  /** When true, learner must type a short answer (stored in notes/evidence). */
  requiresTypedAnswer?: boolean;
}

/** Learning / exam / task track. */
export type TrackId =
  | 'main'
  | 'side'
  | 'cert'
  | 'rest'
  | 'gate'
  | 'review'
  | 'practice'
  | 'admin';

/** Single calendar study/work day inside a pack. */
export interface DayPlan {
  /** 1-based study day index in the program. */
  dayIndex: number;
  /** Calendar offset from program start date (0 = day 1). */
  dateOffset: number;
  /** Phase identifier, e.g. A, B, C. */
  phaseId: string;
  /** Human phase name. */
  phaseName: string;
  /** Week number within the whole program. */
  week: number;
  /** Short title for cards. */
  title: string;
  /** Learning track. */
  track: TrackId;
  /** Baseline estimated focus minutes (before person-type scaling). */
  estimatedMinutes: number;
  /** What to learn/do today (detailed). */
  content: string;
  /** Ordered learning path steps. */
  path: string[];
  /** Reference links. */
  references: ReferenceLink[];
  /** Acceptance criteria statements. */
  acceptanceCriteria: string[];
  /** Interactive acceptance tests. */
  acceptanceTests: AcceptanceTest[];
  /** Expected deliverable artifact. */
  deliverable: string;
  /** Shown when user selects minimum/travel mode. */
  minimumMode: boolean;
  /** Optional gate id if this day is a milestone gate. */
  gateId?: string;
  /** If true, Pass requires non-empty evidence text. */
  requireEvidence?: boolean;
}

/** Program phase metadata. */
export interface PhaseMeta {
  id: string;
  name: string;
  goal: string;
  gateId?: string;
}

/** Pack category for marketplace-style filtering. */
export type PackCategory = 'skill' | 'exam' | 'task';

/** Audience tags a pack declares support for. */
export type PersonTypeId =
  | 'child_primary'
  | 'teen_student'
  | 'college_student'
  | 'working_professional'
  | 'career_switcher'
  | 'senior_learner'
  | 'exam_sprinter';

/** Person type profile controlling defaults and minute scaling. */
export interface PersonTypeProfile {
  id: PersonTypeId;
  label: string;
  description: string;
  /** Multiplier applied to day.estimatedMinutes. */
  minuteMultiplier: number;
  /** Soft daily minute budget guidance. */
  dailyBudgetMinutes: number;
  defaultMode: 'standard' | 'minimum' | 'sprint';
  /** UI hint, e.g. larger type for seniors. */
  uiDensity: 'compact' | 'comfortable' | 'roomy';
  recommendedPackCategories: PackCategory[];
  /** Short coaching line shown on Today. */
  todayHint: string;
  /** Evidence-field coaching on Task page. */
  taskEvidenceHint: string;
  /** Optional companion/parent tip (children / seniors). */
  companionHint?: string;
  /** When true, strongly nudge guardian PIN before entering guardian view. */
  preferGuardianPin?: boolean;
}

/** Custom onboarding field defined by a pack. */
export interface PackOptionField {
  id: string;
  label: string;
  type: 'select' | 'boolean' | 'text';
  options?: Array<{ value: string; label: string }>;
  defaultValue: string | boolean;
}

/** Portable curriculum package. */
export interface CurriculumPack {
  id: string;
  version: string;
  title: string;
  subtitle: string;
  category: PackCategory;
  locale: 'zh-CN' | 'en';
  /** Person types this pack is designed for. */
  supportedPersonTypes: PersonTypeId[];
  summary: string;
  phases: PhaseMeta[];
  days: DayPlan[];
  /** Optional pack-specific settings shown in onboarding. */
  optionFields?: PackOptionField[];
  /** Track ids that can be disabled (e.g. cert). */
  optionalTracks?: TrackId[];
}

/** Persisted check-in record for one day. */
export interface DayCheckIn {
  dayIndex: number;
  packId: string;
  status: 'pass' | 'partial' | 'fail' | 'skipped';
  completedPathSteps: number[];
  passedTestIds: string[];
  evidence: string;
  /** SHA-256 of evidence for integrity tracing. */
  evidenceHash?: string;
  typedAnswers: Record<string, string>;
  actualMinutes: number;
  checkedAt: string;
  notes: string;
  /** Required when status is skipped: why the day was skipped. */
  skipReason?: string;
}

/** User settings and progress root. */
export interface UserState {
  onboardingDone: boolean;
  startDate: string;
  displayName: string;
  personTypeId: PersonTypeId;
  packId: string;
  /** Pack-specific option values keyed by field id. */
  packOptions: Record<string, string | boolean>;
  /** Disabled optional tracks. */
  disabledTracks: TrackId[];
  mode: 'standard' | 'minimum' | 'sprint';
  checkIns: Record<string, DayCheckIn>;
  weeklyHours: Record<string, number>;
  /** User-imported curriculum packs (hot-loaded JSON). */
  customPacks: CurriculumPack[];
  /** Current UI role. */
  viewRole: 'learner' | 'guardian';
  /** Optional local PIN hash to leave guardian view. */
  guardianPinHash: string;
  /** Display name for guardian. */
  guardianName: string;
  /** Encouragement notes keyed by packId:dayIndex. */
  companionNotes: Record<string, string>;
  /** True after a gate Pass until user exports backup or dismisses. */
  backupReminderPending: boolean;
  /**
   * ISO timestamp of the last successful write to the chosen backup folder.
   * Directory handles are stored in IndexedDB, not in this object.
   */
  lastFolderBackupAt?: string;
  /**
   * ISO timestamp of the last successful backup of any kind
   * (download file or folder write).
   */
  lastBackupAt?: string;
  /** How the last successful backup was made. */
  lastBackupMethod?: 'download' | 'folder';
  /**
   * User dismissed the soft “please backup” tip on Today
   * (shown when never backed up and enough Passes).
   */
  backupSoftTipDismissed?: boolean;
  /**
   * ISO date (viewDate) when streak-break recall was dismissed; hide until next day.
   */
  streakRecallDismissedOn?: string;
  /**
   * Mode suggested by guardian; learner can accept or dismiss on Today.
   */
  suggestedMode?: 'standard' | 'minimum' | 'sprint';
  /**
   * Soft weekly Pass goal for the commitment bar on Today.
   * When unset, a person-type default is used (typically 4 or 5).
   */
  weeklyPassGoal?: number;
  /** Schema version for migrations. */
  schemaVersion: number;
}

/** Result of pack quality validation. */
export interface PackValidationIssue {
  level: 'error' | 'warning';
  dayIndex?: number;
  message: string;
}

export interface PackValidationResult {
  ok: boolean;
  packId: string;
  issues: PackValidationIssue[];
}
