import { withCORS } from "../_cors.js";
import { json, bad } from "../_utils.js";

// 预定义底材池
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

// 预定义词缀池
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

// 品质概率与词缀数量
const QUALITIES = [
  { name: "普通", chance: 0.6, affixCount: 0 },
  { name: "精制", chance: 0.3, affixCount: 1 },
  { name: "极品", chance: 0.1, affixCount: 2 },
];

// 随机函数
function pickRandom(arr, count = 1) {
  const copy = [...arr];
  const res = [];
  while (res.length < count && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    res.push(copy.splice(idx, 1)[0]);
  }
  return count === 1 ? res[0] : res;
}

function pickQuality() {
  const r = Math.random();
  let acc = 0;
  for (const q of QUALITIES) {
    acc += q.chance;
    if (r < acc) return q;
  }
  return QUALITIES[0];
}

function genId() {
  return "weapon_" + Math.random().toString(36).slice(2, 10);
}

function sumModifiers(affixes, type) {
  return affixes.reduce((sum, affix) => {
    for (const mod of affix.attributeModifiers) {
      if (mod.type === type) sum += mod.value;
    }
    return sum;
  }, 0);
}

async function handler(req, res) {
  if (req.method !== "POST") return bad(res, "POST only", 405);
  const { playerLevel, playerClass } = req.body || {};
  if (typeof playerLevel !== "number") return bad(res, "Missing or invalid playerLevel", 400);

  // 1. 随机底材
  const base = pickRandom(BASES);

  // 2. 随机基础伤害
  const baseDamage = Math.floor(Math.random() * (base.damageRange.max - base.damageRange.min + 1)) + base.damageRange.min;
  let finalDamage = Math.round(baseDamage * (1 - Math.random() * base.damageVariance));
  if (finalDamage < 1) finalDamage = 1;

  // 3. 品质
  const qualityObj = pickQuality();
  const quality = qualityObj.name;
  const affixCount = qualityObj.affixCount;
  // 4. 随机词缀
  let affixes = [];
  if (affixCount > 0) {
    const selectedAffixes = pickRandom(AFFIXES, affixCount);
    affixes = affixCount === 1 ? [selectedAffixes] : selectedAffixes;
  }

  // 5. 计算武器名称
  const affixNames = affixes.map(a => a.affixName);
  const name = affixNames.join("") + base.weaponTypeName;

  // 6. 合成属性
  let damageMultiplier = sumModifiers(affixes, "damageMultiplier");
  let levelReduction = sumModifiers(affixes, "levelRequirementReduction");
  let critDamageMultiplier = sumModifiers(affixes, "critDamageMultiplier");

  // 汇总属性
  const attributes = {
    strength: sumModifiers(affixes, "strength"),
    agility: sumModifiers(affixes, "agility"),
    critChance: sumModifiers(affixes, "critChance"),
    critDamageMultiplier: critDamageMultiplier,
  };

  // 最终伤害
  let damage = Math.round(finalDamage * (1 + damageMultiplier));
  // 最终等级需求
  let levelRequirement = Math.max(1, Math.floor(base.levelRequirement * (1 + levelReduction)));
  // 最终重量
  let weight = base.weight;

  // 返回结构
  return json(res, {
    success: true,
    data: {
      weapon: {
        id: genId(),
        name,
        quality,
        base,
        affixes,
        finalStats: {
          damage,
          levelRequirement,
          weight,
          attributes,
        },
      },
    },
  });
}

export default withCORS(async (req, res) => {
  try { await handler(req, res); } catch (e) { console.error(e); json(res, { error: "server" }, 500); }
});
