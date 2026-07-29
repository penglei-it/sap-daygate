# 日验 DayGate v2

通用 **学习 / 考试 / 任务** 日课验收工具。支持不同人员类型与可替换课程包（Pack）。

## 快速开始

```bash
cd Desktop/sap-daygate
npm install
npm run accept             # 常规验收
npm run accept:ultra       # 超高标准
npm run accept:ultra-plus  # Ultra+（含 E2E）
npm run dev
```

打开终端提示的本地地址（如 http://127.0.0.1:5173）。

## 开营流程

1. 选择**人员类型**（影响时长、默认模式、UI 密度）  
2. 选择兼容的 **Pack**（技能 / 考试 / 任务）  
3. 按日学习 → 路径勾选 → 验收测试（含打字题）→ 门禁交证据  

## 自定义 Pack 热加载

1. 设置 → 导入 Pack JSON（或下载示例）  
2. 通过质量门禁后自动切换到该 Pack  
3. 可导出当前 Pack / 移除自定义 Pack  

## 监护人视图

1. 设置或导航进入「监护人」  
2. 查看完成率、连续天数、软提醒  
3. 给今日留陪伴留言（学习者可见）  
4. 不可代打卡；可用 PIN 退出监护视图  

## 文档

- [PRODUCT.md](./PRODUCT.md) 产品设计  
- [ACCEPTANCE.md](./ACCEPTANCE.md) 验收标准  
