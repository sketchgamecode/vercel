# 装备系统设计（最终版）

更新日期：2025-10-07

本文档基于之前讨论的设计决议：保持装备规则简单（flat/pct/tags），将 armor 细分为多个直观槽位以扩大掉落与美术空间，引入 affix（前/后缀）与 slot-aware 掉落池用于内容扩充，暂不引入镶嵌、重铸等玩法。

---

## 1. 核心设计回顾
- 槽位：主手（weapon_main）、副手（weapon_off）、头（head）、胸（chest）、手（hands）、脚（feet）、饰品1（accessory1） —— 共 7 个默认槽位；后续可解锁 second accessory。  
- 装备属性：支持 `powerFlat`, `powerPct`, `defFlat`, `hpFlat`, `bonusCrit`, `extraLuck`, `tags`（如 lifeSteal）。flat/pct 叠加规则简单明了。  
- Affix：装备可带 0..2 个 affix（按 rarity 决定是否附带），affix 提供小型属性（例如 +2 powerFlat 或 +1 luck）。  
- 掉落策略：slot-aware drop pools，affix 池按区域/敌人稀有度决定。  

---

## 2. 槽位与解锁策略

默认槽位（建议实现）

- `weapon_main`：主武器，决定 attack 底材（baseType）。
- `weapon_off`：副手（盾或副手武器/饰品）。
- `head`：头盔/帽子。
- `chest`：护胸/上身。
- `hands`：手套/护手。
- `feet`：靴子/脚部装备。
- `accessory1`：饰品（初始开放一个）。

Accessory2 unlock 建议：在 config 里设置解锁级别，例如 `accessoryUnlockAtLevel: 10`。

---

## 3. 装备数据结构（示例）

```json
{
  "id":"w-123",
  "name":"锋利短刃",
  "slot":"weapon_main",
  "baseType":"W1",
  "powerFlat":4,
  "powerPct":0.05,
  "bonusCrit":0.02,
  "defFlat":0,
  "hpFlat":0,
  "extraLuck":0,
  "affixes":[{"id":"a1","name":"锋利的","effects":[{"key":"powerFlat","value":2}]}],
  "rarity":"uncommon",
  "sockets":0,
  "tags":[]
}
```

Affix 结构示例：

```json
{
  "id":"a1",
  "name":"锋利的",
  "slotFilter":["weapon_main","weapon_off"],
  "rarity":"uncommon",
  "effects":[{"key":"powerFlat","value":2}]
}
```

---

## 4. 装备合并规则（应用顺序）

1. 计算角色基础 `derived`（基于 stats）
2. 聚合装备所有 `flat` 数值并相加（例如 powerFlatSum, defFlatSum, hpFlatSum）并应用到 derived（derived.atk += powerFlatSum 等）
3. 聚合装备所有 `pct`（powerPctSum）并按比例放大（derived.atk *= (1+powerPctSum)）
4. 处理 critRate/critDamage 的 flat/pct 并 clamp 到允许范围
5. 计算最终 maxHp = baseMaxHp + hpFlatSum

注：当装备被替换或装备槽变化时需重新计算 derived 并保存。

---

## 5. 掉落生成（slot-aware pools 与 affix）

1. 敌人/区域定义 dropPools（例如 goblin_scout 给 weapon_main/feet 等概率）
2. 生成流程：选择 slot -> 按 rarity 抽取 base item -> 按 rarity 抽取 0..2 个 affix -> 返回装备
3. Affix 池按区域/敌人限定（如火山区域的 affix 包含火属性/火焰特效），增加主题性与引导性

示例 drop pool：

```json
{
  "goblin_scout":{
    "weapon_main":{"common":60,"uncommon":30,"rare":10},
    "feet":{"common":70,"uncommon":25,"rare":5}
  }
}
```

---

## 6. 设计示例（示范一套装备生成）

- 敌人：forest_bandit（lvl5） dropPool 指定 weapon_main/hand/feet
- 抽出 weapon_main（rarity uncommon），baseType=W1，base powerFlat=3
- 按 uncommon 概率选出 1 个 affix：{ "锋利的" : +2 powerFlat }
- 最终装备：powerFlat = 3 + 2 = 5，powerPct = 0.05

---

## 战斗掉落规则（胜利后拾取）

当玩家战胜敌人时，若游戏设计包含战斗掉落（Loot），采用以下规则：

- 若敌人身上没有任何装备，则掉落为 0 件。  
- 若敌人身上有 1 件或多件装备，则从其所携带的装备中随机抽取 0 至 3 件进行掉落（不重复抽取）。  
- 抽取数量（0、1、2、3）的概率为可配置项（示例默认权重）：
  - 默认（可配置）概率分布（示例）：{ 0: 0.10, 1: 0.75, 2: 0.12, 3: 0.03 }
  - 其中“掉落 1 件”的概率较大，掉落 2 件/3 件的概率逐步降低。  
- 若抽取数量大于敌人实际携带装备数，则按最大可用数量掉落（例如敌人仅携带 2 件且抽中 3 件，则掉落 2 件）。
- 掉落的具体选择从敌人装备列表中随机抽取（无替换）。

实现与配置建议：

1. 将 drop-count 权重作为配置项（例如 `config/loot.json` 中的 `dropCountWeights`），便于快速调整平衡。  
2. 把掉落逻辑（选择数量、从携带装备中抽取）写在 loot/掉落生成器中，与物品生成器共享相同的 `resolved` snapshot 流程，确保掉落给玩家的物品已包含 resolved 字段。  
3. 在掉落界面向玩家明确展示“掉落概率说明”或在日志中记录掉落决策（用于调试/审计）。

示例伪码：

```javascript
// dropCountWeights = {0:0.1,1:0.75,2:0.12,3:0.03}
function pickDropsFromEnemy(enemy) {
  const carried = enemy.equipmentInstances || [];
  if (!carried.length) return [];
  const count = sampleFromWeights(dropCountWeights);
  const dropCount = Math.min(count, carried.length);
  return sampleWithoutReplacement(carried, dropCount);
}
```


## 7. 平衡与监控建议

- 定义“替换阈值”（例如综合评分提升 >= 5%）以衡量掉落是否能真正替换玩家装备
- 监控替换率（player per X encounters get replacement），若过低则调整掉落概率或 affix 强度

---

## 8. 下一步与交付

1. 我可以把 `doc/equipment.md`（已创建）与 `config/equipment-samples.json`（包含 7 个槽位的样例、部分 affix 与 drop pools）一起加入仓库。  
2. 或者仅保留文档，让你先 review。  

请选择要我执行的操作（A：只提交文档；B：同时添加示例 config 文件并 stage；C：先 review 再提交）。

---

## 持久化策略（snapshot-only, 原型阶段约定）

为保持实现简单并降低原型阶段出错风险，我们在当前开发/测试周期采用 **snapshot-only** 策略，以下为明确约定与实施建议：

- 策略要点：生成（掉落/奖励）物品时，立即计算并写入该物品的 `resolved` 最终数值到 item 实例中；后续对 admin 配置的修改不会影响已存在的物品实例。
- 测试周期约定：在内测/原型验证阶段，若你需要修改武器/affix/掉落配置并希望所有新掉落使用新规则，采用“全服删档重置”来清空历史数据（你已说明会在测试周期内进行删档）。这样避免实现复杂的回溯/迁移逻辑。

实现与运维建议（简洁）

1. 生成器务必在写入 `items` collection 前把 `resolved` 字段计算好并保存（见文档前面的伪码）。记录 `createdAt` 与 `seed`（可选）便于调试。  
2. 在 item 文档保留可选 `baseTemplate` 字段以便审计（但不作为运行时依赖）。  
3. Admin 保存配置仍建议保留变更日志（who/when/what），即便我们不做版本化也便于追踪。  
4. 禁止实现对已生成 item 的自动“回写”逻辑（避免在配置变更时无意更改玩家资产）。如需对历史物品做变更，应使用一次性迁移脚本或由运营在删档后重新放出（当前阶段不做）。

测试注意事项

- 在修改配置并准备开始新一轮测试前，先备份当前 DB（若需要），然后按计划清空 items/players 等测试数据。  
- 使用 `seed` 字段能在开发者本地复现某一条生成记录，便于调试 affix roll 与模板效果。

兼容未来的可选项（留接口）

- 虽然当前采用 snapshot-only，我们仍建议在 item schema 中保留 `baseTemplate`/`seed` 字段，为未来若需实现版本化或受控迁移留接口（但不现在实现）。

此策略能让我们以最低的实现与维护成本快速推进原型与玩法验证，同时维持测试者与开发团队的灵活性。
