# 简单前端（Play）文档

目标：为现有后端提供一个最小可用的 Next.js 前端页面 `pages/play.js`，用于快速构建和演示战斗交互（发起模拟战斗、展示战斗回放、及用于 QA 的快速 presets）。

1) 页面与交互
- `/play` 页面包含：
  - Presets 下拉：选择预置的战斗场景（来自 `data/presets/*.json`）
  - 自定义面板：可编辑两个玩家的主要字段（playerId、stats、武器 baseType/power）
  - Run 按钮：提交 POST `/api/combat/simulate`，显示 loading 状态
  - 结果区域：以时间轴形式展示 `log`，每条事件显示：回合、攻击者、被攻击者、是否暴击、是否未命中、造成伤害与剩余 HP

2) 数据契约（前端使用）
- Request: POST `/api/combat/simulate` Content-Type: application/json
  - body: { players: [playerObj,...], seed?: integer }

- playerObj 最小字段：
  - playerId: string
  - level: integer
  - stats: { str,int,con,agi,end,luck }
  - equip: { weapon: { baseType, powerFlat?, powerPct? } }

3) UX 细节
- 当返回 `winner` 时，高亮胜利方的条目。支持“播放/暂停”回放（通过 setInterval 播放 log 中事件）。
- 提供复制 JSON 的按钮以便快速把结果粘到 issue/bug report。

4) 本地运行
- 启动 dev server（确保在同一终端导入 `.vercel/.env.preview.local`）:

```bash
set -o allexport; source .vercel/.env.preview.local; set +o allexport
npm run dev
```

- 打开 `http://localhost:3000/play`，选择一个 preset，点击 Run。

5) 文件建议与实现细节
- `pages/play.js` — React 页面，使用 fetch 调用 `/api/combat/simulate`。不需要任何额外的框架。
- `components/CombatPlayback.js` — 将 log 渲染为时间轴，并支持 step/auto-play。
- `data/presets/` — 放一些 JSON 场景（`p1_strong_vs_p2_weak.json` 等）。

6) 可扩展点
- 支持多玩家、队伍、以及本地存储的 custom presets。
- 用 websockets 或轮询实现实时战斗（未来阶段）。

如果你同意，我会接着实现 `pages/play.js` 的最小版本（含一个 preset）并添加一个轻量组件 `components/CombatPlayback.js`，然后把变更放入一个 feature 分支进行提交。你同意我现在开始实现前端最小页面吗？
