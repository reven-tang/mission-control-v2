# Mission Control v2.0

AI Agent 任务管理与微信公众号自动化运营中心。

## 功能特性

### 核心功能

| 模块 | 描述 |
|------|------|
| **Kanban** | 5 阶段任务管理（BACKLOG → TODO → IN PROGRESS → REVIEW → DONE），支持拖拽、产出物展示 |
| **Content Pipeline** | 4 阶段内容生产（Research → Script → Visual → Publish），LLM 深度文章 + 微信草稿自动发布 |
| **Research Pipeline** | last30days 抓取痛点 → 机会识别 → MVP 构建 |
| **Cron 自动化** | 定时任务调度与执行 |
| **Healthcheck** | 系统健康度监控 |

### 内容 Pipeline 特性（核心亮点）

```
输入主题 → LLM 深度调研写作 → 自动配图 → 微信草稿发布
```

- **深度文章生成**：调用 DeepSeek-V3.2 生成 2000-3000 字博眼球文章
- **自动配图**：从免费图库（picsum.photos）搜索主题相关图片，自动上传到微信素材库
- **微信草稿发布**：自动获取封面图，一键发布到公众号草稿箱
- **一键自动运行**：创建 Pipeline 后全流程自动完成，无需手动干预

### Kanban 工作流

```
BACKLOG ──▶ TODO ──▶ IN PROGRESS ──▶ REVIEW ──▶ DONE
  │                          │                    │
  │                          │                    └─ 产出物展示:
  │                          │                      - 任务详情展示 artifacts 链接
  │                          │                      - 支持 file/url/api 三类型
  │                          │
  └──────────────────────────┴───────── 状态回退:
                               (任意阶段)
```

## 技术栈

- **前端**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **后端**: Next.js API Routes, 本地 JSON 文件存储
- **AI**: DeepSeek-V3.2 (ModelScope), LLM 内容生成
- **微信公众号**: 草稿发布、素材管理
- **外部服务**: picsum.photos 免费图库

## 项目结构

```
mission-control-v2/
├── src/
│   ├── app/
│   │   ├── kanban/           # 任务看板 + 产出物展示
│   │   ├── pipeline/          # 内容流水线页面
│   │   │   └── page.tsx       # Pipeline 列表 + 详情面板 + 删除按钮
│   │   ├── api/
│   │   │   ├── pipeline/      # Pipeline CRUD + 自动运行
│   │   │   ├── publish/       # 微信草稿发布
│   │   │   └── ...
│   │   └── ...
│   ├── lib/
│   │   ├── components/        # UI 组件
│   │   │   ├── TaskDetailPanel.tsx   # 任务详情 + 产出物链接
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── wechat.ts      # 微信 API（Token + 草稿 + 素材）
│   │   │   ├── llm-content.ts # LLM 内容生成（DeepSeek-V3.2）
│   │   │   └── stock-image.ts # 免费图库搜索 + 微信素材上传
│   │   ├── db/                # 数据存储
│   │   └── types/             # TypeScript 类型
│   └── scripts/
│       └── agents/            # Python Agent 脚本
├── data/
│   └── mc-store.json          # 本地数据存储
├── docs/
│   └── DESIGN.md              # 设计文档
├── .env.local                 # 本地环境变量（微信凭证 + LLM API Key）
└── README.md
```

## 快速开始

```bash
# 1. 克隆项目后安装依赖
cd mission-control-v2
npm install

# 2. 配置环境变量（微信凭证 + LLM API）
cp .env.local.example .env.local
# 编辑 .env.local 填入:
#   WECHAT_APPID=wx...
#   WECHAT_APPSECRET=wx...
#   MODELSCOPE_API_KEY=ms-...

# 3. 启动开发服务器
npm run dev
# 访问 http://localhost:3001

# 4. 创建 Pipeline 测试
# 输入主题后自动：LLM 生成文章 → 搜索配图 → 微信草稿发布
```

## 环境变量

| 变量 | 描述 | 必需 |
|------|------|------|
| `PORT` | 服务端口（默认 3001） | 否 |
| `WECHAT_APPID` | 微信公众号 AppID | ✅ |
| `WECHAT_APPSECRET` | 微信公众号 AppSecret | ✅ |
| `MODELSCOPE_API_KEY` | ModelScope API Key（用于 LLM 内容生成） | ✅ |
| `LLM_MODEL` | LLM 模型名（默认 deepseek-ai/DeepSeek-V3.2） | 否 |

**注意**: `.env.local` 已加入 `.gitignore`，不会提交到 GitHub。

## API 端点

### Pipeline

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/pipeline` | 获取所有 Pipeline |
| POST | `/api/pipeline` | 创建 Pipeline（自动运行 LLM 生成 + 微信发布） |
| DELETE | `/api/pipeline?id={id}` | 删除 Pipeline |
| GET | `/api/pipeline/{id}/pieces` | 获取 Pipeline 内容产物 |
| POST | `/api/pipeline/{id}/stage` | 推进 Pipeline 阶段 |

### 微信发布

| 方法 | 路径 | 描述 |
|------|------|------|
| GET/POST | `/api/publish/draft` | 测试连接 / 发布草稿 |

### 任务管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/tasks` | 获取所有任务 |
| POST | `/api/tasks` | 创建任务 |
| PATCH | `/api/stories/{id}/status` | 更新任务状态 |
| DELETE | `/api/stories/{id}` | 删除任务 |

## Pipeline 自动运行流程

```
1. POST /api/pipeline { title, topic }
   ↓
2. Research 阶段
   - 调用 LLM 生成深度文章（2000-3000 字）
   - 标题冲击力 + 开头抓人 + 数据支撑 + 犀利观点
   ↓
3. Script 阶段
   - 保存完整文章内容
   ↓
4. Visual 阶段
   - 根据主题从 picsum.photos 搜索相关图片
   - 下载图片并上传到微信永久素材库
   - 获得 thumb_media_id
   ↓
5. Publish 阶段
   - 使用新封面上传文章到微信草稿箱
   - 自动获取素材库图片作为封面
   ↓
6. 完成
   - status: completed
   - wechat.media_id: 草稿 media_id
```

## 微信素材库

- 封面图自动从 picsum.photos 搜索上传
- 已有素材会优先复用
- 上传的图片可在公众号后台「素材管理」查看

## 产出物（Artifacts）展示

Kanban DONE 任务支持展示产出物：
- **file**: 文件路径（如 `docs/DESIGN.md`）
- **url**: 外部链接（如 `/cost`）
- **api**: API 端点（如 `/api/cost`）

点击任务详情面板可查看具体位置。

## 微信公众号配置

1. 登录微信公众平台
2. 设置 → 公众号设置 → 账号详情 → 查看 AppID
3. 开发 → 开发管理 → 开发设置 → 设置 IP 白名单（添加服务器出口 IP）
4. 开发 → 开发管理 → 接口权限 → 开通草稿箱权限（如需）

## License

MIT
