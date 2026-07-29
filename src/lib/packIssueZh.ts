import type { PackValidationIssue } from '../types/curriculum';

/**
 * Maps pack validation / import error messages to Chinese UI copy.
 * @param message - Raw English or thrown message.
 * @returns Chinese explanation for learners.
 */
export function packIssueToZh(message: string): string {
  const m = message.trim();
  const patterns: Array<{ re: RegExp; zh: string }> = [
    { re: /^Pack missing id\/title$/i, zh: '缺少课程包编号或标题' },
    { re: /^Pack has no days$/i, zh: '课程包没有日课' },
    {
      re: /^Pack .+ must have at least 14 days \(has (\d+)\)$/i,
      zh: '课程包至少需要 14 天（当前 $1 天）。可先下载「轻量骨架」再改。',
    },
    {
      re: /^Pack must declare supportedPersonTypes$/i,
      zh: '请声明适用哪些人员类型（supportedPersonTypes）',
    },
    { re: /^content must be >= 60 chars$/i, zh: '当日说明文字太短（至少约 60 字）' },
    { re: /^path must have >= 3 steps$/i, zh: '学习路径至少要有 3 步' },
    { re: /^references required$/i, zh: '请至少提供一条参考资料' },
    { re: /^acceptanceCriteria >= 2 required$/i, zh: '验收标准至少写 2 条' },
    { re: /^acceptanceTests >= 2 required$/i, zh: '验收测试至少写 2 题' },
    { re: /^deliverable required$/i, zh: '请填写交付物' },
    {
      re: /^gate days must set requireEvidence=true$/i,
      zh: '门禁日必须要求填写证据（requireEvidence）',
    },
    {
      re: /^Pack must include at least 1 gate day$/i,
      zh: '课程包至少要有 1 个门禁日（gateId）',
    },
    { re: /^Pack\.id is required$/i, zh: '缺少课程包 id' },
    { re: /^Pack\.title is required$/i, zh: '缺少课程包标题' },
    { re: /^Pack\.days must be a non-empty array$/i, zh: 'days 必须是非空列表' },
    { re: /^Pack JSON must be an object$/i, zh: '文件内容必须是一个 JSON 对象' },
    { re: /^Invalid JSON$/i, zh: '不是有效的 JSON 文件' },
    {
      re: /^Pack failed quality validation$/i,
      zh: '未通过质量检查，请按下方清单修改',
    },
  ];
  for (const { re, zh } of patterns) {
    if (re.test(m)) return m.replace(re, zh);
  }
  if (m.startsWith('Duplicate title:')) {
    return `日课标题重复：${m.slice('Duplicate title:'.length).trim()}`;
  }
  return m;
}

/**
 * Formats validation issues for Settings UI.
 * @param issues - Pack validation issues.
 * @returns Chinese bullet strings.
 */
export function formatPackIssuesZh(issues: PackValidationIssue[]): string[] {
  return issues
    .filter((i) => i.level === 'error')
    .map((i) => {
      const zh = packIssueToZh(i.message);
      return i.dayIndex != null ? `第 ${i.dayIndex} 天：${zh}` : zh;
    });
}
