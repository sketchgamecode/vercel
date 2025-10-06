# 武器系统 API 文档

## 概述
武器系统提供完整的武器生成、管理功能，包括武器生成、背包管理等。

## API 端点

### 1. 生成武器 
**POST** `/api/weapon/generate`

生成一把随机武器，根据玩家等级和职业。

**请求参数：**
```json
{
  "playerLevel": 30,          // 必需：玩家等级
  "playerClass": "warrior"    // 可选：玩家职业
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "weapon": {
      "id": "weapon_abc123",
      "name": "长钢刀",
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
          "affixId": "affix_long",
          "affixName": "长",
          "attributeModifiers": [{"type": "damageMultiplier", "value": 0.1}]
        },
        {
          "affixId": "affix_steel", 
          "affixName": "钢",
          "attributeModifiers": [{"type": "strength", "value": 3}]
        }
      ],
      "finalStats": {
        "damage": 8,
        "levelRequirement": 1,
        "weight": 2.0,
        "attributes": {
          "strength": 3,
          "agility": 0,
          "critChance": 0,
          "critDamageMultiplier": 0
        }
      }
    }
  }
}
```

### 2. 添加武器到背包
**POST** `/api/weapon/add`

将生成的武器添加到玩家背包。

**请求参数：**
```json
{
  "playerId": "player123",
  "weapon": {
    // 完整的武器对象（从generate API获得）
  }
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "武器已添加到背包",
  "weaponCount": 5
}
```

### 3. 查看武器背包
**POST** `/api/weapon/inventory`

获取玩家的武器背包。

**请求参数：**
```json
{
  "playerId": "player123"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "playerId": "player123",
    "weaponCount": 3,
    "weapons": [
      {
        "id": "weapon_abc123",
        "name": "长钢刀",
        "quality": "极品",
        "damage": 8,
        "attributes": {
          "strength": 3,
          "agility": 0,
          "critChance": 0,
          "critDamageMultiplier": 0
        },
        "obtainedAt": "2025-10-04T12:13:55.336Z"
      }
    ]
  }
}
```

### 4. 武器系统信息
**GET** `/api/weapon/info`

获取武器系统的配置信息（底材、词缀、品质等）。

**响应示例：**
```json
{
  "success": true,
  "data": {
    "bases": [
      {
        "baseId": "base_blade",
        "weaponType": "blade", 
        "weaponTypeName": "刀",
        "damageRange": {"min": 3, "max": 8},
        "damageVariance": 0.3,
        "levelRequirement": 1,
        "weight": 2.0
      }
    ],
    "affixes": [
      {
        "affixId": "affix_copper",
        "affixName": "铜",
        "attributeModifiers": [{"type": "strength", "value": 1}]
      }
    ],
    "qualities": [
      {"name": "普通", "chance": 0.6, "affixCount": 0},
      {"name": "精制", "chance": 0.3, "affixCount": 1},
      {"name": "极品", "chance": 0.1, "affixCount": 2}
    ]
  }
}
```

## 武器系统规则

### 品质与概率
- **普通** (60%): 0个词缀
- **精制** (30%): 1个词缀  
- **极品** (10%): 2个词缀

### 底材类型
- **刀** (3-8伤害)
- **剑** (2-6伤害)
- **矛** (0-9伤害)
- **锤** (4-5伤害)

### 词缀效果
- **力量系**: 铜(+1)、铁(+2)、钢(+3)
- **敏捷系**: 细(+1)、轻(+2)、快(+3)
- **暴击系**: 绿(+1)、蓝(+2)、紫(+3)、红(+4)
- **伤害系**: 长(+10%)、短(+20%)
- **特殊系**: 大(暴击伤害+50%)、小(等级需求-50%)

## 使用示例

### 完整工作流
```bash
# 1. 注册玩家
curl -X POST /api/sync -d '{"playerId":"player001"}'

# 2. 生成武器  
curl -X POST /api/weapon/generate -d '{"playerLevel":25}'

# 3. 添加到背包
curl -X POST /api/weapon/add -d '{"playerId":"player001","weapon":{...}}'

# 4. 查看背包
curl -X POST /api/weapon/inventory -d '{"playerId":"player001"}'
```

## 错误处理

所有 API 都使用统一的错误格式：
```json
{
  "error": "错误描述"
}
```

常见错误：
- `"Missing playerId"` - 缺少玩家ID
- `"Player not found"` - 玩家不存在
- `"Missing weapon data"` - 缺少武器数据
- `"POST only"` - 方法不允许
