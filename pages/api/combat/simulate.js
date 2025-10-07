import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function chooseRand(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

function computeDerived(player, config) {
  const { stats = {}, equip = {} } = player;
  const atk = Math.floor((stats.str || 0) * 1.0 + (stats.int || 0) * 0.5);
  const def = Math.floor((stats.end || 0) * 1.5) + ((equip.armor && equip.armor.defFlat) || 0);
  const maxHp = 50 + (stats.con || 0) * 10 + (player.level || 0) * 5;
  const critRate = (config.baseCrit || 0.05) + ((stats.luck || 0) * (config.luckToCrit || 0 || 0));
  const critDamage = (config.baseCritDamage || 0.5) + ((stats.luck || 0) * (config.luckToCritDamageBoost || 0 || 0));
  return { atk, def, maxHp, critRate, critDamage };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = req.body || {};
  const players = body.players || [];
  const seed = body.seed || Date.now();

  const root = process.cwd();
  const combatCfg = JSON.parse(fs.readFileSync(path.join(root, 'config', 'combat.json'), 'utf8'));
  const bases = JSON.parse(fs.readFileSync(path.join(root, 'config', 'weapon-bases.json'), 'utf8'));

  const rng = mulberry32(seed);

  // shallow clone players and initialize
  const roster = players.map(p => {
    const copy = JSON.parse(JSON.stringify(p));
    copy.derived = computeDerived(copy, combatCfg);
    copy.hp = copy.hp || copy.derived.maxHp;
    return copy;
  });

  const log = [];
  const maxTurns = body.maxTurns || 50;

  for (let t = 1; t <= maxTurns; t++) {
    for (let i = 0; i < roster.length; i++) {
      const attacker = roster[i];
      if (attacker.hp <= 0) continue;
      // choose a target (simple: next alive in roster)
      const targets = roster.filter((_, idx) => idx !== i && roster[idx].hp > 0);
      if (!targets.length) {
        return res.status(200).json({ winner: attacker.playerId || attacker.id || ('p' + i), log, seed });
      }
      const defender = chooseRand(rng, targets);

      const weapon = attacker.equip && (attacker.equip.weapon || attacker.equip.weapon_main || attacker.equip.weapon_main);
      const baseType = weapon && weapon.baseType;
      const wbase = bases[baseType] || { roundsPerAttack: 1, attacksPerTrigger: 1, sourceAttr: 'str', conversionPct: 1 };

      if (t % (wbase.roundsPerAttack || 1) !== 0) continue;

      for (let a = 0; a < (wbase.attacksPerTrigger || 1); a++) {
        // hit roll
        const pHit = clamp(combatCfg.BASE_HIT || 0.85, 0.01, 0.99);
        const rh = rng();
        if (rh > pHit) {
          log.push({ t, attacker: attacker.playerId || attacker.id, defender: defender.playerId || defender.id, miss: true });
          continue;
        }

        const pCrit = clamp(attacker.derived.critRate || 0, 0, 0.95);
        const isCrit = rng() < pCrit;

        const sourceVal = attacker.stats && (attacker.stats[wbase.sourceAttr] || 0);
        let damageBase = (sourceVal * (wbase.conversionPct || 1)) + (attacker.derived.atk || 0) + ((weapon && weapon.powerFlat) || 0);
        damageBase = damageBase * (1 + ((weapon && weapon.powerPct) || 0));
        damageBase = Math.max(0, damageBase);

        let damageAfterCrit = isCrit ? damageBase * (1 + (attacker.derived.critDamage || combatCfg.baseCritDamage || 0.5)) : damageBase;

        const L = Math.floor(damageAfterCrit * (combatCfg.damageIntervalRatio[0] || 0.85));
        const H = Math.ceil(damageAfterCrit * (combatCfg.damageIntervalRatio[1] || 1.15));

        let rawDamage;
        if ((attacker.stats && (attacker.stats.luck || 0)) >= (combatCfg.luckThresholdForMax || 9)) {
          rawDamage = H;
        } else {
          const u = rng();
          const luck = (attacker.stats && attacker.stats.luck) || 0;
          const luckAlpha = combatCfg.luckAlpha || 0.25;
          const uprime = Math.pow(u, 1 / (1 + luck * luckAlpha));
          rawDamage = L + (H - L) * uprime;
        }

        const finalDamage = Math.max(0, Math.round(rawDamage) - (defender.derived && defender.derived.def ? defender.derived.def : 0));
        defender.hp = Math.max(0, defender.hp - finalDamage);

        log.push({ t, attacker: attacker.playerId || attacker.id, defender: defender.playerId || defender.id, isCrit, miss: false, damage: finalDamage, defenderHp: defender.hp });

        if (defender.hp <= 0) {
          return res.status(200).json({ winner: attacker.playerId || attacker.id, log, seed });
        }
      }
    }
  }

  return res.status(200).json({ winner: null, log, seed, reason: 'turns_exhausted' });
}
