# 角色与战斗设计（最终版）

更新日期：2025-10-07

本文件是基于当前项目实现和之前讨论的最终设计文档，面向后端与前端实现人员。它定义了角色属性、派生属性、武器底材（base types）如何影响攻击、回合制战斗流程、伤害与命中/暴击/幸运的计算规则，以及示例计算与可配置项。

---

## 1. 设计要点回顾（你已确认）
- 所有攻击使用统一的命中基准（BASE_HIT），当前阶段不把命中和一级属性绑定。未来可把命中作为稀缺属性放在部分武器/装备上。  
- 防御采用直接减伤（flat def）。  
- 武器 `power` 支持两种类型：`powerFlat`（可为负）和 `powerPct`（百分比）。两者可同时存在并叠加。  
- 行动顺序采用固定顺序（实现简单、易复现）。  
- Luck（幸运）简化为“使伤害更趋近区间上限”的机制；luck>=9 强制取区间上限。  

---

## 2. 数据模型（最小可行）

- 角色（Player/NPC）示例结构：

```json
{
  "id": "string",
  "name": "string",
  "level": 1,
  "stats": { "str": 10, "int": 5, "con": 8, "agi": 7, "end": 6, "luck": 0 },
  "derived": { "atk": 0, "critRate": 0.0, "critDamage": 0.5, "def": 0, "maxHp": 0 },
  "hp": 100,
  "equip": {
    "weapon": { "id":"w-1", "baseType":"W1", "powerFlat":5, "powerPct":0.1, "bonusCrit":0.05 },
    "armor": { "defFlat":0 }
  },
  "status": {}
}
```

- 武器底材配置（示例 `config/weapon-bases.json`）：

```json
{
  "W0": { "roundsPerAttack":1, "attacksPerTrigger":1, "sourceAttr":"str", "conversionPct":1.0 },
  "W1": { "roundsPerAttack":1, "attacksPerTrigger":2, "sourceAttr":"agi", "conversionPct":0.5 },
  "W2": { "roundsPerAttack":2, "attacksPerTrigger":1, "sourceAttr":"int", "conversionPct":2.0 },
  "W3": { "roundsPerAttack":5, "attacksPerTrigger":1, "sourceAttr":"con", "conversionPct":5.0 }
}
```

字段说明：
- `roundsPerAttack`：每多少回合触发一次（1 = 每回合）。
- `attacksPerTrigger`：一次触发内的独立攻击次数（每次独立判定命中/暴击/伤害）。
- `sourceAttr`：作为伤害来源的一级属性。
- `conversionPct`：把 `sourceAttr` 的值乘以该系数得到武器来源伤害贡献。

---

## 3. 二级属性（默认推导）

建议在角色创建/同步时计算并存储 `derived` 字段，便于在战斗中直接读取：

- maxHp = 50 + con * 10 + level * 5
- def = floor(end * 1.5) + (armor.defFlat || 0)
- atk = floor(str * 1.0 + int * 0.5)
- critRate = baseCrit + (luck * luckToCrit) + (weapon.bonusCrit || 0)
- critDamage = baseCritDamage + (luck * luckToCritDamageBoost)

其中 `baseCrit`, `baseCritDamage`, `luckToCrit`, `luckToCritDamageBoost` 为可配置常量。

注意：命中不再依赖一级属性，使用统一 `BASE_HIT`。

---

## 4. 回合与行动顺序

- 服务器维护整型回合计数 t = 1,2,3...
- 角色列表按固定顺序（队列）循环处理：对队列中的每个角色（若其仍存活），检查其武器底材定义是否在当前回合触发攻击（t % roundsPerAttack === 0），若触发则执行 `attacksPerTrigger` 次子攻击，每次独立判定并立即应用伤害。
- 若角色死亡则从队列中跳过。

示例：若队列 A,B,C；t=1 时顺序 A->B->C 检查并执行触发动作，随后 t++。

---

## 5. 单次子攻击判定（最终公式）

常量（建议）：
- BASE_HIT = 0.85
- baseCrit = 0.05
- baseCritDamage = 0.5
- damageIntervalRatio = [0.85, 1.15]
- luckAlpha = 0.25

步骤：

1) 命中判定
- pHit = clamp(BASE_HIT, 0.01, 0.99)
- rollHit = randomFloat(0,1)
- 若 rollHit > pHit → miss，记录并结束该次子攻击。

2) 暴击判定（若命中）
- pCrit = clamp(attacker.derived.critRate, 0, 0.95)
- isCrit = randomFloat(0,1) < pCrit

3) 伤害基值（damageBase）
- weaponSource = attacker.stats[sourceAttr] * conversionPct
- damageBase = weaponSource + attacker.derived.atk + (weapon.powerFlat || 0)
- damageBase = damageBase * (1 + (weapon.powerPct || 0))
- damageBase = max(0, damageBase)

4) 暴击放大
- if isCrit → damageAfterCrit = damageBase * (1 + attacker.derived.critDamage)
- else damageAfterCrit = damageBase

5) 随机区间
- L = floor(damageAfterCrit * damageIntervalRatio[0])
- H = ceil(damageAfterCrit * damageIntervalRatio[1])

6) Luck 偏斜取值
- 若 attacker.stats.luck >= 9 → rawDamage = H
- 否：取 u = randomFloat(0,1)，计算 u' = u^(1 / (1 + luck * luckAlpha))（luck=0 → u'=u，luck 越大 u' 越偏向 1）
- rawDamage = L + (H - L) * u'

7) 防御直接减伤
- finalDamage = max(0, round(rawDamage) - defender.derived.def)

8) 应用并记录
- defender.hp = max(0, defender.hp - finalDamage)
- 记录事件 log：{ attackerId, defenderId, isCrit, miss, finalDamage, newHp }

注：若 finalDamage == 0 且攻击未 miss，可按策略选择是否强制 1 点最小伤害；默认**不强制**，但这是可配置项。

---

## 6. 示例战斗（单回合、详细计算）

常量如下（示例）：
- BASE_HIT=0.85；baseCrit=0.05；baseCritDamage=0.5；damageIntervalRatio=[0.85,1.15]；luckAlpha=0.25

参与方：
- Attacker: stats={str:20,int:5,con:8,agi:7,end:6,luck:0}, derived.atk=floor(20*1+5*0.5)=22, derived.critRate=0.05
- Weapon: baseType=W1 (sourceAttr=agi, conversionPct=0.5), powerFlat=5, powerPct=0.1, bonusCrit=0.05
- Defender: derived.def=9, hp=100

单次子攻击计算：
1) weaponSource = agi * 0.5 = 7 * 0.5 = 3.5
2) damageBase = 3.5 + 22 + 5 = 30.5
3) apply pct: damageBase *= 1.1 => 33.55
4) 非暴击：damageAfterCrit = 33.55
5) L = floor(33.55 * 0.85) = 28；H = ceil(33.55 * 1.15) = 39
6) luck=0，取 u=0.6 → rawDamage = 28 + (39-28)*0.6 = 34.6 → round -> 35
7) finalDamage = max(0, 35 - 9) = 26
8) defender.hp = 100 - 26 = 74

如果暴击且 critDamage = 0.5（基础），damageAfterCrit = 33.55 * 1.5 = 50.325 → L/H 及最终计算相同流程，最后得到更高伤害。

若 attacker.stats.luck >= 9，则 rawDamage 直接取 H（39），最终 39-9=30。

---

## 7. 扩展点与实现建议

- RNG：服务器端为每场战斗使用 PRNG 种子（可记录）以便复放与调试。  
- Hooks：在攻击流中暴露 hook（onAttackStart, onHit, onDamage, onDeath）以便职业/武器/道具注入行为。  
- 多攻击目标：当前设计对单目标（主目标）生效；若实现 AOE 或弹道溢射，需扩展触发逻辑并指定溢出规则。  
- 平衡：把常量放入配置文件（例如 `config/combat.json`）便于线上快速调整。  

---

## 战斗掉落（Loot）规则建议

若战斗需要掉落装备到玩家背包，建议遵循以下规则（与 `doc/equipment.md` 的掉落生成保持一致）：

- 敌人携带的装备以 `enemy.equipmentInstances` 字段表示（数组），掉落从该数组中抽取。
- 若 `enemy.equipmentInstances` 为空，则掉落 0 件。若非空，则随机抽取 0..3 件进行掉落，抽取数量按可配置的权重决定（示例：{0:0.1,1:0.75,2:0.12,3:0.03}）。
- 抽取时不重复抽取同一实例；若抽中数量超过敌人携带数量，则按最大数量下发。
- 掉落给玩家的物品应当为 snapshot（已 resolve）版本，直接写入 `items` collection 并归属到玩家 inventory。

实现建议：把默认的 `dropCountWeights` 放在 `config/loot.json` 中，便于调整并用于仿真统计。


---

## 8. 配置样例（建议）

config/combat.json（示例）

```json
{
  "BASE_HIT": 0.85,
  "baseCrit": 0.05,
  "baseCritDamage": 0.5,
  "damageIntervalRatio": [0.85, 1.15],
  "luckAlpha": 0.25,
  "luckThresholdForMax": 9
}
```

weapon-bases.json（示例，见上节）

---

如果你同意这个最终文档，我将：
1. 把文件保存为 `doc/characters_and_combat.md`（已完成）。
2. 如果你需要，我可以接着把配套的 `config/combat.json` 与 `config/weapon-bases.json` 示例文件加入到仓库，方便后端直接读取。  

要不要我把上面的 config 示例也写成文件并加入仓库？我可以一起 `git add` 并显示待 commit 的修改。