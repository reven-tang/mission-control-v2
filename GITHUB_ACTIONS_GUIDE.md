# 🚀 GitHub Actions 使用指南

## 第一步：启用 Actions

1. 进入仓库页面: https://github.com/<your-org>/mission-control-v2
2. 点击 **Actions** tab
3. 点击 **I understand my workflows, go ahead and enable them**

## 第二步：修改 CI 配置（如果需要）

`.github/workflows/ci.yml` 已经配置好了，包括：
- TypeScript 编译检查
- 单元测试运行
- 代码覆盖率上传

如需修改，编辑该文件并提交即可。

## 第三步：触发首次运行

### 方式 A: Push 到 main 分支
```bash
git push origin main
```

CI 会自动触发。

### 方式 B: 手动触发
1. 进入 Actions tab
2. 选择 "CI/CD Pipeline" workflow
3. 点击 **Run workflow**
4. 选择分支并点击 **Run workflow**

## 第四步：查看结果

等待约 5 分钟，查看：

### ✅ 成功的标志
```
✓ lint (TypeScript compiled successfully)
✓ test (12 tests passed)
✓ build (Build artifacts uploaded)
```

### ❌ 失败的可能原因
| 问题 | 解决方案 |
|------|----------|
| TypeScript compilation error | 修复 `npx tsc --noEmit` 报错 |
| Tests failed | 运行 `npm test` 本地复现 |
| Build failed | 检查 `.next/` 构建输出 |

## 第五步：添加 Badge 到 README

成功运行后，在 README 顶部已有 badges：

```markdown
[![CI](https://github.com/<your-org>/mission-control-v2/actions/workflows/ci.yml/badge.svg)](...)
```

替换 `<your-org>` 为你的 GitHub 组织名或用户名。

## 持续集成最佳实践

### 1. 每次 PR 都会自动运行测试
- 提交代码 → GitHub Actions 自动运行
- 所有检查通过 → 可以合并
- 有检查失败 → 需要先修复

### 2. 保护 main 分支
在 **Settings → Branches → Branch protection rules**：
- ✓ Require status checks to pass before merging
- ✓ Check the CI workflow

### 3. 查看历史构建记录
- Actions tab → 查看所有运行历史
- 点击具体 run → 查看详细日志

---

## 故障排查

### Q1: Actions 没有触发？
A: 确认 `.github/workflows/ci.yml` 存在且格式正确

### Q2: 测试超时？
A: GitHub Actions runner 资源充足，通常不会超时

### Q3: 环境变量未注入？
A: Actions 使用默认环境，无需额外配置

### Q4: 如何查看详细的错误信息？
A: 点击 workflow run → 点击失败的 job → 展开对应 step → 查看终端输出

---

## 下一步

1. ✅ 配置完成后运行一次完整的 CI
2. ⏳ 接入 Codecov 查看可视化覆盖率报告
3. ⏳ 设置 deploy preview（可选）
