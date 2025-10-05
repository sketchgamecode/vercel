import { withCORS } from "../_cors.js";
import { json, bad } from "../_utils.js";
import fs from "fs";
import path from "path";

const configPath = path.resolve(process.cwd(), "data/weapon-config.json");

function pickRandom(arr, count = 1) {
  const copy = [...arr];
  const res = [];
  while (res.length < count && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    res.push(copy.splice(idx, 1)[0]);
  }
  return count === 1 ? res[0] : res;
}
function pickQuality(qualities) {
  const r = Math.random();
  let acc = 0;
  for (const q of qualities) {
    acc += q.chance;
    if (r < acc) return q;
  }
  return qualities[0];
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
  const { playerLevel = 1 } = req.body || {};
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (e) {
    return bad(res, "配置读取失败: " + e.message, 500);
  }
  // 1. 随机底材
  const base = pickRandom(config.bases);
  // 2. 随机基础伤害
  const baseDamage = Math.floor(Math.random() * (base.damageRange.max - base.damageRange.min + 1)) + base.damageRange.min;
  let finalDamage = Math.round(baseDamage * (1 - Math.random() * base.damageVariance));
  if (finalDamage < 1) finalDamage = 1;
  // 3. 品质
  const qualityObj = pickQuality(config.qualities);
  const quality = qualityObj.name;
  const affixCount = qualityObj.affixCount;
  // 4. 随机词缀
  let affixes = [];
  if (affixCount > 0) {
    const selectedAffixes = pickRandom(config.affixes, affixCount);
    affixes = affixCount === 1 ? [selectedAffixes] : selectedAffixes;
  }
  // 5. 计算武器名称
  const affixNames = affixes.map(a => a.affixName);
  const name = affixNames.join("") + base.weaponTypeName;
  // 6. 合成属性
  let damageMultiplier = sumModifiers(affixes, "damageMultiplier");
  let levelReduction = sumModifiers(affixes, "levelRequirementReduction");
  let critDamageMultiplier = sumModifiers(affixes, "critDamageMultiplier");
  const attributes = {
    strength: sumModifiers(affixes, "strength"),
    agility: sumModifiers(affixes, "agility"),
    critChance: sumModifiers(affixes, "critChance"),
    critDamageMultiplier: critDamageMultiplier,
  };
  let damage = Math.round(finalDamage * (1 + damageMultiplier));
  let levelRequirement = Math.max(1, Math.floor(base.levelRequirement * (1 + levelReduction)));
  let weight = base.weight;
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
  try { await handler(req, res); } catch (e) { console.error(e); bad(res, "server error", 500); }
});
