# Proposal: Mission Control v2 剩余功能闭环

## 问题
- B: cron 触发 OK，但真实执行效果未验证；`stories/[id]` 和 `stories` 两处 DELETE 路径重复
- C: brief.py 内容仍为 stub；飞书推送未验证
- D: 日历 + 内容工厂为零实现
- 全量 QA + 安全审计缺失

## 范围
不重构已有页面，只补闭环 + 修复已知问题 + 补 QA

## 交付物

### P0（必做）
1. **统一 stories DELETE 路径** — 删除 `stories/route.ts` 中的 DELETE（与 `stories/[id]/route.ts` 冲突），保留 PATCH/DELETE 在 `[id]` 路由
2. **brief.py 内容升级** — 加入真实任务统计（从 mc-store.json 读取）+ 今日完成/进行中列表
3. **飞书推送验证** — 手动触发 `brief` cron 确认飞书消息到达
4. **TypeScript 编译门禁** — `npx tsc --noEmit` 零错误

### P1（优化）
5. **日历页面 (Calendar)** — `/calendar` 页面 + `/api/calendar/route.ts`，展示今日日程 + 后台 cron 执行记录
6. **Content Pipeline 占位页面** — `/pipeline` 页面，展示内容流水线概念框架
7. **全量 QA 报告** — 浏览器验证 + 代码审查 + 安全审计

### P2（可选）
8. **AUTONOMOUS.md 防冲突强化** — 子 Agent 写 tasks-log.md 时加锁机制
9. **Skills 安装脚本** — 自动安装 last30days 等研究技能

## 非目标
- 不重构现有 UI
- 不引入新外部依赖
- 不做 Telegram/Discord（飞书优先）
