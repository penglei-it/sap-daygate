import type { PersonTypeId, PersonTypeProfile } from '../types/curriculum';

/**
 * Built-in person type catalog for generalized DayGate.
 * Copy fields make each audience feel like a different product surface.
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
    todayHint: '今天只做一小步就很好。可以请家长陪你开始前几分钟。',
    taskEvidenceHint: '用一句话写下你做完了什么，例如「读完第 3 页并画了一张图」。',
    companionHint: '建议家长陪伴开始，再让孩子自己点完成。',
    preferGuardianPin: true,
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
    todayHint: '和作业抢时间时，先保证今天这一课验收通过。',
    taskEvidenceHint: '写清作业本页码、文档名或截图说明，方便自己复习。',
    companionHint: '可请家长看进度，不必代写答案。',
    preferGuardianPin: true,
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
    todayHint: '把今天当成一次可交付的实验：做完、留下证据、再结束。',
    taskEvidenceHint: '优先写仓库路径、对象名或报告文件名，便于复盘。',
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
    todayHint: '忙的时候可切「保底模式」，先保住连续天，再回标准。',
    taskEvidenceHint: '写工作笔记路径、事务码或对象名即可，短而可核对。',
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
    todayHint: '今天的交付物最好能放进作品集或面试故事里。',
    taskEvidenceHint: '写作品链接、仓库或文档名，门禁日务必可核对。',
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
    todayHint: '慢慢来就好。默认已帮你偏「保底」，做完勾选即可。',
    taskEvidenceHint: '写一句你完成了什么就行，不必用专业缩写。',
    companionHint: '家人可在监护视图鼓励，不必催进度。',
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
    todayHint: '今日必做：完成课表主线验收。侧支已隐藏，先拿分数相关产出。',
    taskEvidenceHint: '写清题号、错题本页码或模考分数，方便复盘。',
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
