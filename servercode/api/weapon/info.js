import { withCORS } from "../_cors.js";
import { json, bad } from "../_utils.js";

// 重用 generate.js 中的数据定义
const BASES = [
  {
    baseId: "base_blade",
    weaponType: "blade",
    weaponTypeName: "刀",
    damageRange: { min: 3, max: 8 },
    damageVariance: 0.3,
    levelRequirement: 1,
    weight: 2.0,
  },
  {
    baseId: "base_sword",
    weaponType: "sword",
    weaponTypeName: "剑",
    damageRange: { min: 2, max: 6 },
    damageVariance: 0.2,
    levelRequirement: 1,
    weight: 1.5,
  },
  {
    baseId: "base_spear",
    weaponType: "spear",
    weaponTypeName: "矛",
    damageRange: { min: 0, max: 9 },
    damageVariance: 0.4,
    levelRequirement: 1,
    weight: 2.5,
  },
  {
    baseId: "base_hammer",
    weaponType: "hammer",
    weaponTypeName: "锤",
    damageRange: { min: 4, max: 5 },
    damageVariance: 0.1,
    levelRequirement: 1,
    weight: 3.0,
  },
];

const AFFIXES = [
  { affixId: "affix_copper", affixName: "铜", attributeModifiers: [{ type: "strength", value: 1 }] },
  { affixId: "affix_iron", affixName: "铁", attributeModifiers: [{ type: "strength", value: 2 }] },
  { affixId: "affix_steel", affixName: "钢", attributeModifiers: [{ type: "strength", value: 3 }] },
  { affixId: "affix_thin", affixName: "细", attributeModifiers: [{ type: "agility", value: 1 }] },
  { affixId: "affix_light", affixName: "轻", attributeModifiers: [{ type: "agility", value: 2 }] },
  { affixId: "affix_quick", affixName: "快", attributeModifiers: [{ type: "agility", value: 3 }] },
  { affixId: "affix_green", affixName: "绿", attributeModifiers: [{ type: "critChance", value: 1 }] },
  { affixId: "affix_blue", affixName: "蓝", attributeModifiers: [{ type: "critChance", value: 2 }] },
  { affixId: "affix_purple", affixName: "紫", attributeModifiers: [{ type: "critChance", value: 3 }] },
  { affixId: "affix_red", affixName: "红", attributeModifiers: [{ type: "critChance", value: 4 }] },
  { affixId: "affix_long", affixName: "长", attributeModifiers: [{ type: "damageMultiplier", value: 0.1 }] },
  { affixId: "affix_short", affixName: "短", attributeModifiers: [{ type: "damageMultiplier", value: 0.2 }] },
  { affixId: "affix_big", affixName: "大", attributeModifiers: [{ type: "critDamageMultiplier", value: 0.5 }] },
  { affixId: "affix_small", affixName: "小", attributeModifiers: [{ type: "levelRequirementReduction", value: -0.5 }] },
];

const QUALITIES = [
  { name: "普通", chance: 0.6, affixCount: 0 },
  { name: "精制", chance: 0.3, affixCount: 1 },
  { name: "极品", chance: 0.1, affixCount: 2 },
];

async function handler(req, res) {
  if (req.method !== "GET") return bad(res, "GET only", 405);

  return json(res, {
    success: true,
    data: {
      bases: BASES,
      affixes: AFFIXES,
      qualities: QUALITIES
    },
  });
}

export default withCORS(async (req, res) => {
  try { await handler(req, res); } catch (e) { console.error(e); json(res, { error: "server" }, 500); }
});
