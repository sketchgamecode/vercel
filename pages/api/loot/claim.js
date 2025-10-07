import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// small deterministic RNG (mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chooseFromWeights(weights, rng) {
  const keys = Object.keys(weights);
  const total = keys.reduce((s, k) => s + (weights[k] || 0), 0);
  if (total === 0) return null;
  let r = rng() * total;
  for (const k of keys) {
    r -= (weights[k] || 0);
    if (r <= 0) return k;
  }
  return keys[keys.length - 1];
}

function pickAffixForSlot(affixes, slot, rng) {
  const pool = affixes.filter(a => a.slotFilter && a.slotFilter.includes(slot));
  if (!pool.length) return null;
  if (rng() > 0.3) return null;
  return pool[Math.floor(rng() * pool.length)];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { enemyId, playerId, seed } = req.body || {};
  if (!enemyId || !playerId) return res.status(400).json({ error: 'enemyId and playerId required' });

  // repo root: prefer process.cwd() which works in dev and in tests
  const root = process.cwd();
  const samples = JSON.parse(fs.readFileSync(path.join(root, 'config', 'equipment-samples.json'), 'utf8'));

  const pool = samples.dropPools[enemyId];
  if (!pool) return res.status(404).json({ error: 'no drop pool for enemy' });

  const rng = seed ? mulberry32(seed) : Math.random;

  const created = [];
  // For each slot in pool, pick rarity then pick an item matching slot+rarity
  for (const slot of Object.keys(pool)) {
    const rarity = chooseFromWeights(pool[slot], rng);
    if (!rarity) continue;
    // filter candidates
    const candidates = samples.items.filter(it => it.slot === slot && it.rarity === rarity);
    if (!candidates.length) continue;
    const chosen = candidates[Math.floor(rng() * candidates.length)];
    // build snapshot
    const affix = pickAffixForSlot(samples.affixes, slot, rng);
    const resolved = Object.assign({}, chosen);
    if (affix) {
      for (const e of (affix.effects || [])) resolved[e.key] = (resolved[e.key] || 0) + e.value;
      resolved.affixes = [{ id: affix.id, name: affix.name }];
    }
    const item = {
      itemId: `${chosen.id}_inst_${Math.floor(rng() * 1000000)}`,
      slot: chosen.slot,
      baseTemplate: chosen.id,
      resolved,
      createdAt: new Date().toISOString(),
      seed: seed || null,
      owner: playerId,
    };

    // persist if possible (lazy-load to allow running without MONGODB_* env vars)
    try {
      const { getDb } = await import('../../../lib/mongo.js');
      const db = await getDb();
      const r = await db.collection('items').insertOne(item);
      created.push({ ...item, _id: r.insertedId });
    } catch (err) {
      // fallback: keep in memory and return
      created.push(item);
    }
  }

  return res.status(200).json({ items: created });
}
