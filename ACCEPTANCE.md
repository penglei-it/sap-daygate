# DayGate 正式验收标准（v3 泛化版）

本文件定义「可以宣称达到验收标准」的客观清单。全部勾选且自动化命令通过，才算验收通过。

## A. 泛化能力

- [x] 存在可替换的 `CurriculumPack` 协议（类型在 `src/types/curriculum.ts`）
- [x] 支持人员类型 PersonType（小学/中学/大学/在职/转行/中老年/备考冲刺）
- [x] 人员类型影响：分钟缩放、默认模式、UI 密度、推荐 Pack 类别
- [x] 至少 3 类 Pack：`skill` / `exam` / `task`
- [x] 开营可选人员类型 + Pack；设置页可切换
- [x] 每个人员类型至少有 1 个兼容 Pack

## B. 日课内容质量（每个内置 Pack）

对每个 Pack 的**每一天**强制：

- content ≥ 60 字
- path ≥ 3 步
- references ≥ 1
- acceptanceCriteria ≥ 2
- acceptanceTests ≥ 2
- deliverable 非空
- 至少 1 个 gate，且 gate 必须 `requireEvidence=true`

自动化：`npm run validate:packs`

## C. 验收机制可信度（相对 v1）

- [x] Pass 需：测试全过 + 路径 ≥80%
- [x] 打字题 `requiresTypedAnswer` 必须作答
- [x] 门禁/需证据日：evidence 至少 4 字符，否则不能 Pass
- [x] 保底模式 / 冲刺模式（隐藏 side）可用
- [x] 可选轨（如 cert）可关闭

## D. 工程与可运行

- [x] `npm run build` 通过
- [x] `npm test` 通过（验收引擎 + Pack 质量）
- [x] README / PRODUCT / ACCEPTANCE 文档齐全

## F. Pack JSON 热加载

- [x] 可通过设置页导入 CurriculumPack JSON
- [x] 导入前 normalize + validatePack，失败不可入库
- [x] 自定义 Pack 持久化在本地状态，可移除/导出
- [x] 提供示例：`public/examples/sample-custom-pack.json`
- [x] 自动化测试覆盖导入成功/失败

## G. 监护人视图

- [x] 独立「监护人」导航与页面
- [x] 只读进度：完成率、连续天数、近 7 日中断、今日状态
- [x] 软提醒文案（非惩罚式）
- [x] 可留陪伴留言，学习者任务页可见
- [x] 不可代提交验收
- [x] 可选 PIN 退出监护视图
- [x] 开营/设置可配置监护人名与 PIN

---

**验收结论写法：**

> 当 A–G 全部满足，宣布：DayGate v3 达到「可泛化 + 热加载 Pack + 监护人陪伴」验收标准。
