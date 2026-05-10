# Mission Control v2.0 设计文档

## 概述
Mission Control 是 AI Agent 任务管理与自动化运营中心。

## 核心功能

### 1. Kanban 任务管理
- **5 阶段工作流**: BACKLOG → TODO → IN PROGRESS → REVIEW → DONE
- **拖拽交互**: 可在 5 列之间拖拽任务
- **状态选择器**: 点击任务卡片选择目标状态
- **验证规则**: REVIEW→DONE 需要 `tested` tag 或 description > 50 字符

### 2. Research Pipeline
- **数据源**: last30days 抓取用户痛点
- **自动聚类**: 解析 markdown 识别关键词
- **机会识别**: 生成 Opportunities
- **MVP 构建**: 自动创建任务

### 3. Content Pipeline
- **4 阶段**: Research → Script → Visual → Publish
- **Quill Agent**: 研究 + 脚本生成
- **Pixel Agent**: 图像生成

### 4. Cron 自动化
- **定时任务**: 9:30/10:00/10:30/14:00
- **飞书推送**: 消息自动通知
- **删除功能**: 支持手动删除

## 技术栈
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- 飞书消息推送

## 部署
```bash
npm install
npm run dev
# 访问 http://localhost:3001
```

## 项目结构
```
src/
├── app/
│   ├── kanban/          # 任务看板
│   ├── pipeline/        # 内容流水线
│   ├── research/        # 研究页面
│   ├── cron/           # Cron 管理
│   ├── cost/           # 成本追踪
│   └── api/            # API 路由
├── lib/
│   ├── components/      # UI 组件
│   ├── services/       # 业务逻辑
│   ├── db/             # 数据存储
│   └── types/          # 类型定义
└── scripts/
    ├── research-pipeline.py
    └── agents/
        ├── quill.py
        └── pixel.py
```

## 版本历史
- v2.0 (2026-05-10): 5阶段工作流 + Content Pipeline + Cost Tracker
- v1.0: 基础 Kanban 功能
