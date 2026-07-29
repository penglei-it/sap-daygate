# 日验 DayGate — 产品设计说明（v3）

## 1. 一句话

面向**不同人员类型**的通用「按日学习 / 备考 / 任务」操作系统：用可替换的 Curriculum Pack 承载内容，用证据化验收与门禁保证完成质量。

## 2. 核心抽象

| 抽象 | 含义 |
|------|------|
| PersonType | 小学/中学/大学/在职/转行/中老年/备考冲刺 |
| CurriculumPack | 技能 / 考试 / 任务 课程包 |
| DayPlan | 一日：内容、路径、资料、标准、测试、交付物 |
| Gate | 阶段门禁，强制证据 |

## 3. 设计原则

1. Today First  
2. 验收优于打卡（打字题 + 门禁证据）  
3. 人员类型调节时长与 UI 密度，不复制多套产品  
4. Pack 可替换，内核稳定  
5. **Local-only** + 用户负责备份  

## 4. 内置 Pack

- `skill-sap-abap`：SAP ABAP / S/4 扩展  
- `exam-ruankao-gaoxiang`：软考高项  
- `skill-typescript-basics`：TypeScript 基础  
- `task-personal-okr`：个人目标与任务管理（含小学可用）

## 5. 验收

- 常规：`npm run accept`
- 超高标准：`npm run accept:ultra`
- Ultra+：`npm run accept:ultra-plus`（含 Playwright E2E）

## 6. 数据与责任（Local-only）

DayGate 是 **Local-only** 产品：进度默认存本机 localStorage，并自动写一份 **mirror** 副本。  
**备份责任在用户**：请导出 JSON；门禁 Pass 后会提醒备份。Ultra+ 仍不做云同步。

## 7. v3 / Ultra+ 能力

- Pack JSON 热加载  
- 监护人视图（PIN 哈希）  
- 证据质量门槛 + evidenceHash  
- 镜像恢复、Error Boundary、CI、E2E smoke  
