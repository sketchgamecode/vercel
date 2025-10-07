// Lightweight item generator for snapshot-only items
// CommonJS compatible export
const fs = require('fs');
const path = require('path');

function pickWeighted(weights) {
  // weights: {key: weight}
  const items = Object.keys(weights);
  const total = items.reduce((s, k) => s + (weights[k] || 0), 0);
  if (total === 0) return null;
  let r = Math.random() * total;
  for (const k of items) {
    r -= (weights[k] || 0);
    if (r <= 0) return k;
  }
  return items[items.length - 1];
}

function chooseAffixes(affixes, poolName, slot) {
  // naive: pick 0..1 affix that matches slot
  const pool = affixes.filter(a => a.slotFilter && a.slotFilter.includes(slot));
  if (!pool.length) return [];
  // 30% chance to get one
  if (Math.random() > 0.3) return [];
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return [picked];
}

function generateSnapshotItem({samples, bases, seed}) {
  // seed not used for now - kept for future deterministic runs
  const itemSample = samples.items[Math.floor(Math.random() * samples.items.length)];
  const base = bases[itemSample.baseType] || {};

  const affixes = chooseAffixes(samples.affixes, itemSample.affixPool, itemSample.slot || '');

  // Resolve numeric stats by combining baseFlat + affix effects
  const resolved = Object.assign({}, itemSample);
  // apply affix effects
  for (const a of affixes) {
    for (const e of (a.effects || [])) {
      const k = e.key;
      const v = e.value;
      resolved[k] = (resolved[k] || 0) + v;
    }
  }

  // include base weapon behavior
  if (itemSample.baseType) resolved.base = Object.assign({}, base);

  const snapshot = {
    itemId: `${itemSample.id}_inst_${Math.floor(Math.random() * 1000000)}`,
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

module.exports = { generateSnapshotItem, loadConfigs };
