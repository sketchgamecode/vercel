
---

### **武器生成系统设计文档**

**文档目标**： 明确定义挂机游戏中武器生成系统的规则和数据结构，用于指导后续API开发与客户端实现。

---

## 1. 系统概述

玩家通过调用武器生成API，输入角色的**等级**和**职业**，服务器将根据预设规则随机生成一把武器。生成的武器数据将包含完整的属性，用于在客户端显示并存入玩家的背包存档。

一把生成的武器由三个核心部分组成：**品质**、**词缀** 和 **底材**。其名称由 `词缀名[+词缀名]+底材类型` 构成。

---

## 2. 核心组件定义

### 2.1 底材

底材决定了武器的基本类型和伤害基础。

**数据模型**:
```javascript
{
  "baseId": string,           // 底材唯一ID，如 "base_sword"
  "weaponType": string,       // 武器类型，取自预定义类型
  "weaponTypeName": string,   // 武器类型名称，用于显示
  "damageRange": {            // 基础伤害区间
    "min": number,
    "max": number
  },
  "damageVariance": number,   // 伤害随机调整幅度（百分比，如0.5代表50%）
  "levelRequirement": number, // 使用此武器的最低等级需求
  "weight": number            // 武器重量
}
```

**预定义底材类型**:
| 武器类型 (weaponType) | 武器类型名称 (weaponTypeName) | 基础伤害区间 (min-max) |
| :-------------------- | :---------------------------- | :--------------------- |
| `blade`               | 刀                            | 3 - 8                  |
| `sword`               | 剑                            | 2 - 6                  |
| `spear`               | 矛                            | 0 - 9                  |
| `hammer`              | 锤                            | 4 - 5                  |

### 2.2 品质

品质决定了武器可以拥有的词缀数量。

**品质规则**:
武器生成时，根据以下概率随机确定一个品质：

| 品质名称 | 出现概率 | 词缀数量 |
| :------- | :------- | :------- |
| 普通     | 60%      | 0个      |
| 精制     | 30%      | 1个      |
| 极品     | 10%      | 2个      |

### 2.3 词缀

词缀为武器提供额外的属性加成。

**数据模型**:
```javascript
{
  "affixId": string,          // 词缀唯一ID，如 "affix_copper"
  "affixName": string,        // 词缀名称，用于武器命名
  "attributeModifiers": [     // 属性加成列表（一个词缀可能影响多个属性）
    {
      "type": string,         // 属性类型，如 "strength", "damageMultiplier"
      "value": number         // 加成数值
    }
  ]
}
```

**预定义词缀池**:
| 词缀ID          | 词缀名称 | 属性加成                                 |
| :-------------- | :------- | :--------------------------------------- |
| `affix_copper`  | 铜       | `{ "type": "strength", "value": 1 }`     |
| `affix_iron`    | 铁       | `{ "type": "strength", "value": 2 }`     |
| `affix_steel`   | 钢       | `{ "type": "strength", "value": 3 }`     |
| `affix_thin`    | 细       | `{ "type": "agility", "value": 1 }`      |
| `affix_light`   | 轻       | `{ "type": "agility", "value": 2 }`      |
| `affix_quick`   | 快       | `{ "type": "agility", "value": 3 }`      |
| `affix_green`   | 绿       | `{ "type": "critChance", "value": 1 }`   |
| `affix_blue`    | 蓝       | `{ "type": "critChance", "value": 2 }`   |
| `affix_purple`  | 紫       | `{ "type": "critChance", "value": 3 }`   |
| `affix_red`     | 红       | `{ "type": "critChance", "value": 4 }`   |
| `affix_long`    | 长       | `{ "type": "damageMultiplier", "value": 0.1 }`  // +10% 伤害 |
| `affix_short`   | 短       | `{ "type": "damageMultiplier", "value": 0.2 }`  // +20% 伤害 |
| `affix_big`     | 大       | `{ "type": "critDamageMultiplier", "value": 0.5 }` // +50% 暴击伤害 |
| `affix_small`   | 小       | `{ "type": "levelRequirementReduction", "value": -0.5 }` // 等级需求 -50% |

---

## 3. 武器生成逻辑

### 3.1 输入参数
API调用需提供以下参数：
- `playerLevel`: `number` - 玩家的等级。
- `playerClass`: `string` - 玩家的职业（虽未在规则中直接使用，但为后续扩展预留）。

### 3.2 生成流程

1.  **选择底材**：
    - 从预定义的4种底材中**随机选择一种**。

2.  **计算最终伤害**：
    - 从底材的 `damageRange` 中随机一个基础伤害值 `baseDamage`。
    - 应用伤害浮动：`finalDamage = baseDamage * (1 - Math.random() * damageVariance)`。
    - 对 `finalDamage` 进行四舍五入或取整，并确保不小于0.5（或1）。

3.  **确定品质**：
    - 根据60%/30%/10%的概率，随机选择【普通】、【精制】或【极品】品质。

4.  **选择词缀**：
    - 根据确定的品质，从总词缀池中**不重复地随机抽取**相应数量的词缀（0个、1个或2个）。

5.  **计算武器名称**：
    - 将选中的词缀按其 `affixName` 顺序拼接，最后加上底材的 `weaponTypeName`。
    - 例如，抽到 [`紫`, `铜`, `细`] 和 `刀`，则武器名称为 **"紫铜细刀"**。

6.  **合成最终武器属性**：
    - **基础属性**：继承自底材（伤害、等级需求、重量）。
    - **附加属性**：累加所有词缀的 `attributeModifiers`。
    - **特殊处理**：
      - 若存在 `damageMultiplier` 词缀，则最终伤害 = `finalDamage * (1 + 所有damageMultiplier之和)`。
      - 若存在 `levelRequirementReduction` 词缀，则最终等级需求 = `max(1, floor(levelRequirement * (1 + levelRequirementReduction)))`。

---

## 4. 生成的武器数据模型

当API成功生成一把武器后，将返回以下结构的完整数据：

```javascript
{
  "success": true,
  "data": {
    "weapon": {
      "id": string,                 // 生成的武器唯一实例ID
      "name": string,               // 完整武器名称，如 "紫铜细刀"
      "quality": string,            // 品质，如 "极品"
      "base": { ... },              // 完整的底材数据对象
      "affixes": [ ... ],           // 附着的完整词缀数据对象数组
      "finalStats": {               // 计算后的最终属性
        "damage": number,           // 最终伤害值
        "levelRequirement": number, // 最终等级需求（经过词缀调整后）
        "weight": number,           // 最终重量
        "attributes": {             // 所有属性加成的汇总
          "strength": number,
          "agility": number,
          "critChance": number,
          "critDamageMultiplier": number // 默认0，有词缀则累加
          // ... 其他可能出现的属性
        }
      }
    }
  }
}
```

---

## 5. 示例

**输入**:
`playerLevel: 10`, `playerClass: "warrior"`

**生成过程**:
1.  随机选中底材：`刀` (伤害区间 3-8)。
2.  随机基础伤害：`5`。
3.  伤害浮动（假设浮动30%）：`5 * (1 - 0.3) = 3.5` -> 取整为 `4`。
4.  随机品质：`极品` (获得2个词缀)。
5.  随机词缀：`紫` (暴击+3), `铜` (力量+1)。
6.  武器命名：`紫铜刀`。
7.  合成属性：
    - 最终伤害：`4` (无伤害加成词缀)。
    - 最终等级需求：`1` (底材需求为1，且无调整词缀)。
    - 属性汇总：`strength: 1`, `critChance: 3`。

**API返回**:
```json
{
  "success": true,
  "data": {
    "weapon": {
      "id": "weapon_abc123",
      "name": "紫铜刀",
      "quality": "极品",
      "base": {
        "baseId": "base_blade",
        "weaponType": "blade",
        "weaponTypeName": "刀",
        "damageRange": { "min": 3, "max": 8 },
        "damageVariance": 0.3,
        "levelRequirement": 1,
        "weight": 2.0
      },
      "affixes": [
        {
          "affixId": "affix_purple",
          "affixName": "紫",
          "attributeModifiers": [{ "type": "critChance", "value": 3 }]
        },
        {
          "affixId": "affix_copper",
          "affixName": "铜",
          "attributeModifiers": [{ "type": "strength", "value": 1 }]
        }
      ],
      "finalStats": {
        "damage": 4,
        "levelRequirement": 1,
        "weight": 2.0,
        "attributes": {
          "strength": 1,
          "agility": 0,
          "critChance": 3,
          "critDamageMultiplier": 0
        }
      }
    }
  }
}
```

---

AI可以根据此文档生成高度准确的API代码。