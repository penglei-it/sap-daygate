import type { PersonTypeId, PersonTypeProfile } from '../types/curriculum';

/**
 * Built-in person type catalog for generalized DayGate.
 */
export const PERSON_TYPES: PersonTypeProfile[] = [
  {
    id: 'child_primary',
    label: '小学阶段',
    description: '短时专注、任务步骤更碎、以打卡习惯和趣味交付为主。',
    minuteMultiplier: 0.55,
    dailyBudgetMinutes: 35,
    defaultMode: 'standard',
    uiDensity: 'roomy',
    recommendedPackCategories: ['skill', 'task'],
  },
  {
    id: 'teen_student',
    label: '中学阶段',
    description: '课业并行，适合技能打底与考试轻量备考。',
    minuteMultiplier: 0.75,
    dailyBudgetMinutes: 55,
    defaultMode: 'standard',
    uiDensity: 'comfortable',
    recommendedPackCategories: ['skill', 'exam', 'task'],
  },
  {
    id: 'college_student',
    label: '大学生/研究生',
    description: '可承受中长学习块，适合系统技能与大型考试。',
    minuteMultiplier: 1.1,
    dailyBudgetMinutes: 100,
    defaultMode: 'standard',
    uiDensity: 'compact',
    recommendedPackCategories: ['skill', 'exam', 'task'],
  },
  {
    id: 'working_professional',
    label: '在职人员',
    description: '碎片时间为主，强依赖保底模式与门禁验收。',
    minuteMultiplier: 1,
    dailyBudgetMinutes: 75,
    defaultMode: 'standard',
    uiDensity: 'compact',
    recommendedPackCategories: ['skill', 'exam', 'task'],
  },
  {
    id: 'career_switcher',
    label: '转行学习者',
    description: '投入偏高，需要清晰路径与作品集门禁。',
    minuteMultiplier: 1.2,
    dailyBudgetMinutes: 110,
    defaultMode: 'standard',
    uiDensity: 'compact',
    recommendedPackCategories: ['skill', 'exam'],
  },
  {
    id: 'senior_learner',
    label: '中老年学习者',
    description: '节奏更稳、步骤更清楚，避免信息过载。',
    minuteMultiplier: 0.7,
    dailyBudgetMinutes: 45,
    defaultMode: 'minimum',
    uiDensity: 'roomy',
    recommendedPackCategories: ['skill', 'task'],
  },
  {
    id: 'exam_sprinter',
    label: '备考冲刺者',
    description: '以模考与错题为核心，默认冲刺模式。',
    minuteMultiplier: 1.15,
    dailyBudgetMinutes: 120,
    defaultMode: 'sprint',
    uiDensity: 'compact',
    recommendedPackCategories: ['exam'],
  },
];

/**
 * Looks up a person type profile.
 * @param id - Person type id.
 * @returns Profile or working_professional fallback.
 */
export function getPersonType(id: PersonTypeId): PersonTypeProfile {
  return (
    PERSON_TYPES.find((p) => p.id === id) ??
    PERSON_TYPES.find((p) => p.id === 'working_professional')!
  );
}
