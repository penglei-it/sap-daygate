# DayGate Ultra+ 验收标准

高于 `ACCEPTANCE_ULTRA.md`。通过命令：`npm run accept:ultra-plus`

## P1. 证据加固

- [x] 门禁证据最短 12 字，普通需证 8 字
- [x] 拒绝全重复字符、无字母数字的证据
- [x] Pass 记录写入 `evidenceHash`
- [x] 单测覆盖证据质量规则

## P2. 数据韧性

- [x] 每次 save 写入 mirror key `daygate-v3-mirror`
- [x] 主存储缺失时可回退 mirror
- [x] 设置页提供「从镜像恢复」

## P3. E2E / 冒烟

- [x] jsdom 组件冒烟：开营 → 今天 → 任务页（`npm run test:e2e`）
- [x] jsdom 冒烟：设置页可见 Local-only 与镜像恢复
- [x] 可选真实浏览器：`npm run test:e2e:browser`（需可启动的 Chrome/Edge）
- [x] CI 执行 `accept:ultra-plus`（含 jsdom E2E）

## P4. 无障碍基线

- [x] Skip link 跳到主内容
- [x] `main#main-content` 地标
- [x] `:focus-visible` 可见焦点
- [x] 主导航 aria-label（继承 Ultra）

## P5. 文档与门禁

- [x] README / PRODUCT 提及 ultra-plus
- [x] `scripts/validate-ultra-plus.mts` 结构检查

---

说明：仍不做云同步与绝对防伪造。本环境若无法 spawn 系统浏览器，以 jsdom E2E 作为 Ultra+ 强制门禁，真实浏览器为可选增强。
