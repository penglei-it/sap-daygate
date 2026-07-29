# DayGate 超高标准验收（Ultra）

> 本清单高于 `ACCEPTANCE.md`（A–G）。  
> **只有 `npm run accept:ultra` 全绿，才可宣称「超高标准验收通过」。**

## U1. 工程卫生

- [x] 无死代码课表（不存在 `src/data/buildCurriculum.ts`）
- [x] `ACCEPTANCE.md` 版本叙述与当前大版本一致（v3+）
- [x] 存在 Error Boundary，根渲染被包裹
- [x] 存在 CI 工作流（`.github/workflows/accept.yml`）执行 `accept:ultra`

## U2. 数据可靠性

- [x] 设置页明确展示「仅 localStorage、有丢失风险」
- [x] 门禁 Pass 后出现备份提醒，直到用户导出或手动关闭
- [x] 备份导出/导入可用（沿用既有能力）

## U3. 安全基线（本地产品）

- [x] 监护 PIN 不以明文持久化（存储哈希）
- [x] 退出监护视图时对输入 PIN 做哈希比对
- [x] 空 PIN 仍允许退出（兼容未设置）

## U4. 架构与可测试性

- [x] 安全/导入/验收/监护 逻辑在 `src/core` 或 `src/lib`，可单测
- [x] 单测数量 ≥ 14
- [x] `validate:packs` + `test` + `build` 全通过

## U5. 产品可达性（基线）

- [x] 主导航链接具备可访问名称（aria-label 或清晰文本）
- [x] 监护人视图声明只读，无法代提交（既有 + 单测覆盖）

## U6. 文档

- [x] `PRODUCT.md` 写明 Local-only 与备份责任
- [x] `README.md` 含 `accept:ultra` 命令
- [x] 本文件存在且与脚本检查项对齐

---

自动化：`npm run accept:ultra`  
脚本：`scripts/validate-ultra.mts`
