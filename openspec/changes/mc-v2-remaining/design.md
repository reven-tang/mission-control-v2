# Design: Mission Control v2 剩余功能闭环

## 架构决策

### 1. stories DELETE 路径统一
- 问题：`stories/route.ts` 有 DELETE handler（用 `?id=` query param），`stories/[id]/route.ts` 也有 DELETE handler（用 path param）
- 方案：删除 `stories/route.ts` 中的 DELETE handler，只保留 `stories/[id]/route.ts` 的 PATCH + DELETE
- 原因：REST 约定 DELETE `/api/stories/:id` 是标准写法

### 2. brief.py 内容升级
- 数据源：`data/mc-store.json`（直接 JSON 解析，不依赖 API）
- 板块：System Overview（任务数）、Completed Today（today 完成的）、In Progress（in_progress）、Today's Focus（top 3 backlog）
- 性能：直接读 JSON 文件，零 HTTP 开销

### 3. 日历页面
- `/calendar` Server Component，读取 `mc-store.json` + cron 执行记录
- 展示：今日任务 + cron 执行历史
- 暂不接入真实日历 API（飞书日历 OAuth 复杂度高）

### 4. Content Pipeline 页面
- `/pipeline` 展示概念框架：Research → Script → Thumbnail
- 占位页面，预留 Quill/Pixel 集成入口

### 5. QA 报告
- 代码审查：`gstack-review` 结果 → `reviews/code-quality.md`
- 安全审计：`gstack-cso` 结果 → `reviews/security.md`
- 浏览器验证：手动 curl 验证所有页面 200 + hydration 检查

## 技术约束
- 零新依赖
- 保持现有暗色/浅色主题变量体系
- TypeScript strict，tsc --noEmit 零错误
