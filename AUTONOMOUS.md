---
backlog:
  - id: b1
    title: 完成 Mission Control v2 文档
    description: 补充设计文档和部署手册
    priority: 3
    tags: [docs]
  - id: b2
    title: 安装研究技能（last30days 等）
    description: 安装使 MC 具备研究能力的技能
    priority: 2
    tags: [research, skills]
  - id: b3
    title: 配置 Telegram/Discord 机器人推送
    description: 晨报通过机器人自动推送
    priority: 2
    tags: [integration]
  - id: b4
    title: 日历集成
    description: 显示日程和后台任务
    priority: 1
    tags: [calendar]
---

# AUTONOMOUS.md
# Mission Control 核心目标与任务积压
# 仅由主进程修改，子 Agent 在 tasks-log.md 追加日志

## Core Objectives
1. 追踪 AI 每日自主任务执行状态
2. 每天 9:30 生成定制化晨报
3. 维护看板数据一致性与防冲突
