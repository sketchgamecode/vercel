# 配置使用说明（config/）

更新日期：2025-10-07

本文件说明仓库内 `config/` 下示例配置的作用与如何用于本地测试与仿真。目的在于帮助开发者与测试者快速上手配置、生成装备与验证掉落/战斗行为（在原型阶段我们采用 snapshot-only）。

## 文件清单
- `config/combat.json`：战斗常量（BASE_HIT、baseCrit、baseCritDamage 等）。
- `config/weapon-bases.json`：武器底材定义（W0..W3）。
- `config/loot.json`：掉落数量权重（dropCountWeights）。
- `config/equipment-samples.json`：示例 affix、基础装备与 drop pools（供生成器使用）。
- `config/example-enemy.json`：示例敌人，包含 `equipmentInstances`（用于掉落模拟）。

## 快速使用指南（仅文档说明，未提供自动化脚本）

1. 读取配置

在后端或脚本中把这些 JSON 文件加载为对象，例如（Node.js）：

```javascript
const combat = require('../config/combat.json');
const weaponBases = require('../config/weapon-bases.json');
const loot = require('../config/loot.json');
const equipmentPool = require('../config/equipment-samples.json');
```

2. 生成示例掉落（伪流程）

使用 `config/example-enemy.json` 中的 `equipmentInstances` 作为敌人携带装备。调用 `config/loot.json` 中的 `dropCountWeights` 以从携带装备中抽取 0..3 件（见 `doc/equipment.md` 中的伪码示例），并把抽中的实例写为玩家的 `items`（snapshot-only）。

3. 验证与调试建议

- 若需要复现某一次生成，确保在生成时记录并保留 `seed`（示例 enemy 中可手动添加 seed 字段）。  
- 在每次修改配置并开始新的测试轮前请备份 DB（或在测试环境中清空数据，按团队约定删档）。

4. 关于 snapshot-only 的注意点

- 生成时要把 `resolved` 值写入 item 实例（不要在后续根据 config 动态解析）。  
- 建议 `item` 文档保留 `baseTemplate` 与 `seed` 字段以便后续审计或手工迁移（虽然当前我们不实现自动迁移）。

## 推荐流程（开发者/测试者）

1. 引入配置到本地环境（把 `config/` 下的文件复制到你的运行目录，或在代码中用相对路径引用）。
2. 运行生成器脚本（或手动调用伪码流程）生成 10~100 个样本，检查 `items` 的 `resolved` 字段是否合理。  
3. 修改 `config/equipment-samples.json`（如增加 affix），再次生成并比较新旧样本，确认 snapshot-only 行为（旧样本不变，新样本有差异）。

---

如果你需要，我可以把上面的伪流程实现成一个小脚本 `scripts/simulate_loot.js` 并在本地运行示例 enemy 的一次抽取，输出掉落结果供你查看（需要我执行的话会写入仓库并运行）。
