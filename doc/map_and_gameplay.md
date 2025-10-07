# 地图与地图玩法补充文档

更新日期：2025-10-07

本文件补充当前工程中已实现的地图系统与基于地图的玩法（移动、采集、基地与家园设置）的说明。内容基于 `pages/api` 下的实际实现，包含请求/响应示例与玩法规则。

## 世界与瓦片（Tile）
- 世界尺寸：WORLD.width = 100, WORLD.height = 100（坐标范围 0..99）。
- 瓦片集合保存在 `tiles` 集合中，每个瓦片至少包含坐标 `x, y` 与 `resources` 字段，resource 为按分钟产出的数量映射，例如 `{ wood: 1, ore: 0.5 }`。

## 玩家（Player）数据模型（简要）
- playerId: 字符串，玩家唯一 ID。
- name: 昵称（服务端初次同步会生成默认名）。
- x, y: 当前坐标。
- home: 可选家园坐标对象 `{ x, y }`。
- resources: 资源背包 `{ wood, ore, herb, crystal }`。
- base: 基地信息，如 `{ level, defense }`。
- lastMoveEndAt: 上一次移动完成的时间戳（毫秒）。

## API 概览（与示例）

1) 同步 / 建户 — `POST /api/sync`
- 请求体：{ playerId }
- 行为：若玩家不存在则创建初始玩家数据（随机出生点）。返回完整 `player` 对象。
- 响应示例：{ ok: true, player }

2) 移动 — `POST /api/move`
- 请求体：{ playerId, toX, toY }
- 校验：只接收 POST；目标坐标必须在世界边界内。
- 运动规则：使用曼哈顿距离（|dx|+|dy|），SPEED = 1（格/秒），travelSec = ceil(dist / SPEED)。服务端会将玩家位置立即更新为目标坐标，并设置 `lastMoveEndAt = now() + travelSec*1000`，供客户端判断到达时间。
- 响应示例：{ ok: true, dist, travelSec, finishAt }

3) 扫描区域 — `POST /api/map/scan`
- 请求体：{ playerId, x, y, radius = 10 }
- 返回：指定圆形（实际上为矩形包围）区域内的瓦片数组 `region`，以及该区域内已设置 `home` 的玩家 `homes` 列表（含 playerId, name, home）。
- 响应示例：{ ok: true, region: [...tiles], homes: [...players] }

4) 采集资源 — `POST /api/collect`
- 请求体：{ playerId, x, y, minutes = 10 }
- 行为：读取瓦片 `tiles.findOne({x,y})`，对瓦片 `resources` 中每类资源按每分钟产出乘以 `minutes` 取整后加入玩家背包（floor(perMin * minutes)）。同时保存更新后的玩家 `resources`。
- 响应示例：{ ok: true, gain: { wood: 10 }, resources: { ...updated } }

5) 设置家园 — `POST /api/base/set_home`
- 请求体：{ playerId, x, y }
- 行为：把玩家文档中的 `home` 设为目标坐标（无额外校验）。返回新的 `home`。

6) 建造基地（升级） — `POST /api/base/build`
- 请求体：{ playerId }
- 建造成本硬编码在服务端：COST = { wood: 100, ore: 50 }。若资源不足返回 400 错误。
- 成功时：消耗资源，基础 `base.level += 1`，`base.defense += 10`，并返回更新后的 `base` 与 `resources`。

## 玩法要点与建议

- 1) 客户端移动与到达判定：移动 API 会立即将玩家坐标更新为目标位置并记录预计到达时间 `finishAt`（时间戳，毫秒）。客户端应使用该字段显示进度或禁用移动前的交互，服务端未实现额外的位置回滚或碰撞检测。

- 2) 采集是基于瓦片产出速率的瞬时领取：`minutes` 参数允许客户端指定领取多长时间的产出（例如后台离线采集）。因为实现是取整，较小分钟数可能得到 0 收益。

- 3) 扫描接口返回区域内的瓦片与玩家家园信息，适合构建小地图或 radar 视图。注意：radius 默认 10，会被裁切到世界边界。

- 4) 基地升级为简单的资源消耗逻辑。若未来需要更复杂的建造队列或耗时，可将 `base` 扩展为包含建造完成时间的字段。

## 数据约束与边界情况
- 所有 API 主要使用 POST；缺失必需字段会返回 400。
- 坐标必须满足 0 <= x < 100 且 0 <= y < 100，否则返回 Out of bounds。
- `collect` 若瓦片或玩家不存在会返回 404。

## 示例请求（curl）

1) 创建/同步玩家：

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"playerId":"user-abc"}' \
  http://localhost:3000/api/sync
```

2) 扫描地图：

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"playerId":"user-abc","x":10,"y":15,"radius":8}' \
  http://localhost:3000/api/map/scan
```

3) 移动到新位置：

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"playerId":"user-abc","toX":12,"toY":20}' \
  http://localhost:3000/api/move
```

4) 采集资源：

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"playerId":"user-abc","x":12,"y":20,"minutes":15}' \
  http://localhost:3000/api/collect
```

## 建议的未来改进（非必须）
- 在 `tiles` 中加入 `terrain`、`spawnRate` 等属性帮助玩法扩展。
- 将 `collect` 改为异步队列式采集并引入冷却/占用时间，避免瞬时离线领取的不一致感。
- 在 `move` 中实现占位/碰撞检测和移动取消机制。
- 把 `weapon-config` 持久化到 DB 或对象存储，避免运行时改动在无状态部署中丢失。

---

如需把此文档合并至 `doc/` 的其他文件（例如生成器或管理面板说明），我可以帮助把交叉引用和目录页整理好。欢迎告诉我你希望文档的语言风格或额外示例（前端集成、测试脚本等）。
