# 开发连续性与中断恢复指南

目的：当开发会话因各种原因（网络、断电、聊天会话中断等）被中断时，提供一份可放在仓库内的恢复清单和最佳实践，帮助任何开发者（或自动化代理）能够快速、可靠地恢复工作而不丢失上下文。

核心理念
- 小步提交（atomic commits）：每次改动局限在一个可验证的单位（修复一个 bug、实现一个小 API），并写清楚 commit message。
- 经常推送（push early, push often）：即便是草稿分支，也推到远端以防本地丢失。
- 可重复的本地运行方式：提供脚本、种子（seed）、以及 `.env.example`，使得别人能在本地还原运行环境。

快速恢复检查表（遇到中断，按此顺序操作）
1) 拉最新远端与查看分支

```bash
# 确保远端最新
git fetch --all
# 看看当前在哪个分支
git branch --show-current
```

2) 查看未提交/未推送的改动

```bash
git status --porcelain
git log --oneline -n 20
```

3) 如果你之前有未提交的工作，先保存快照（stash）或做临时提交

```bash
# 轻量保存
git stash push -m "wip: brief note"
# 或者做临时提交（在特性分支上）
git add -A
git commit -m "wip: save progress before interruption"
git push origin HEAD
```

4) 恢复时：切回到你的 feature 分支并运行测试/lint

```bash
git checkout feature/your-branch || git checkout -b feature/your-branch origin/feature/your-branch
# 恢复 stash（如果适用）
git stash list
git stash apply stash@{0}   # 按需要选择索引

# 本地运行检查
npm ci
npm run lint
npm test
```

5) 启动本地快速 smoke 测试（仓库约定的脚本）

```bash
# 启动 dev server（示例）
npm run dev
# 或直接运行小型验证脚本
node scripts/generate_item_test.cjs
```

如果你发现远端已有草稿（别人已推送），可用 `git pull --rebase` 或创建新分支抓取变更并继续工作。

减少中断影响的实践（建议团队采用）
- 小任务拆分：每个 PR 不要同时改大量文件。
- Feature 分支策略：feature/xxx、hotfix/xxx 命名，且在 push 前确保能单元测试通过。
- 草稿 PR（Draft PR）：把工作推上远端并打开 Draft PR，这样他人或 CI 都能看到并运行。
- 新增可重复的种子数据和脚本：把 scripts/ 下的小工具和 `scripts/seed/*.json` 放在仓库中，保证测试可复现。
- 提供 `.env.example` 与运行说明：列出必需的 ENV 变量和默认开发值。
- 在仓库中保留短小 README（或 `doc/DEVELOPER.md`），说明如何本地跑起服务和运行关键脚本。
- 使用 CI 运行关键检查（lint/tests）并对 PR 强制要求通过。

恢复流程示例（会话被中断后，如何由另一个开发者接手）
1. 运行 `git fetch`。
2. 查看远端分支 `git branch -r`。
3. 检出对应分支 `git checkout -b resume/branch origin/feature/branch`。
4. 运行 `git log --oneline --graph --decorate` 找到上次已知的提交点。
5. 如果需要把本地未提交改动合并进分支：

```bash
git stash push -m "resume: from interrupted session"
git checkout resume/branch
git stash pop
```

6. 运行项目的 smoke tests 与脚本，确认行为一致。

常用命令速查（保存在仓库，便于复制）
- 提交并创建临时保存点：

```bash
git add -A
git commit -m "wip: brief note"
git push origin HEAD
```

- 创建新分支并推送：

```bash
git checkout -b feature/short-description
git push -u origin feature/short-description
```

- 恢复 stash：

```bash
git stash list
git stash apply stash@{0}
```

建议的提交信息模板
- feat(scope): short description
- fix(scope): short description
- wip(scope): short description
- chore: tooling or docs

最小可交付单元（定义）
- 一个小 change 就包括：实现一个 API 路由、一个后端函数、一个独立的单元测试。避免把 schema、API、前端同时大幅改动放在一个 PR。

如果你希望由 AI 代理或同事接手，需要在 PR 或 issue 中包含：
1. 当前目标（2-3 行）。
2. 当前进度（完成/未完成的文件、已通过的测试）。
3. 本地复现步骤（包含命令、种子数据位置、环境变量）。
4. 期望的下一步（例如：实现 `generateItem()` 并写 2 个测试用例）。

结语
-----
把这份文件放在仓库根目录可以显著降低会话中断带来的成本。接下来我可以根据你确认的策略：

- （可选）为仓库生成一个 `.github/workflows/ci.yml` 的样板，以便每次 push 自动运行 lint/test。
- （可选）在 `scripts/` 下添加更多自检脚本（例如 `scripts/check_workflow.sh`）来一键运行上述检查。

如果你同意，我现在把这个文件添加到仓库（已完成），并可以马上开始实现第 2 项：`Implement item generator (snapshot)`。
