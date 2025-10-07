// CommonJS item generator for snapshot-only items (for use in ESM projects via createRequire)
const fs = require('fs');
const path = require('path');

// deterministic RNG (mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(weights, rng) {
  const items = Object.keys(weights);
  const total = items.reduce((s, k) => s + (weights[k] || 0), 0);
  if (total === 0) return null;
  let r = rng() * total;
  for (const k of items) {
    r -= (weights[k] || 0);
    if (r <= 0) return k;
  }
  return items[items.length - 1];
}

function chooseAffixes(affixes, poolName, slot, rng) {
  const pool = affixes.filter(a => a.slotFilter && a.slotFilter.includes(slot));
  if (!pool.length) return [];
  // 30% chance
  if (rng() > 0.3) return [];
  const picked = pool[Math.floor(rng() * pool.length)];
  return [picked];
}

function generateSnapshotItem({samples, bases, seed, rng}) {
  // rng: optional function returning 0..1; seed: optional integer
  const _rng = rng || (seed ? mulberry32(seed) : Math.random);

  const itemSample = samples.items[Math.floor(_rng() * samples.items.length)];
  const base = bases[itemSample.baseType] || {};

  const affixes = chooseAffixes(samples.affixes, itemSample.affixPool, itemSample.slot || '', _rng);

  const resolved = Object.assign({}, itemSample);
  for (const a of affixes) {
    for (const e of (a.effects || [])) {
      const k = e.key;
      const v = e.value;
      resolved[k] = (resolved[k] || 0) + v;
    }
  }

  if (itemSample.baseType) resolved.base = Object.assign({}, base);

  const snapshot = {
    itemId: `${itemSample.id}_inst_${Math.floor(_rng() * 1000000)}`,
    slot: itemSample.slot,
    baseTemplate: itemSample.id,
    resolved,
    createdAt: new Date().toISOString(),
    seed: seed || null,
  };

  if (affixes.length) snapshot.resolved.affixes = affixes.map(a => ({ id: a.id, name: a.name }));

  return snapshot;
}

function loadConfigs(root) {
  const samples = JSON.parse(fs.readFileSync(path.join(root, 'config', 'equipment-samples.json'), 'utf8'));
  const bases = JSON.parse(fs.readFileSync(path.join(root, 'config', 'weapon-bases.json'), 'utf8'));
  return { samples, bases };
}

module.exports = { generateSnapshotItem, loadConfigs, mulberry32 };
