#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadJSON(relPath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8'));
}

// seeded RNG (mulberry32)
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function sampleFromWeights(weights, rng) {
  // weights is object {k: weight}
  const entries = Object.entries(weights).map(([k, v]) => [k, Number(v)]);
  const total = entries.reduce((s, e) => s + e[1], 0);
  const r = rng() * total;
  let acc = 0;
  for (const [k, w] of entries) {
    acc += w;
    if (r <= acc) return Number(k);
  }
  return Number(entries[entries.length-1][0]);
}

function sampleWithoutReplacement(arr, count, rng) {
  const copy = arr.slice();
  const res = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * copy.length);
    res.push(copy.splice(idx,1)[0]);
  }
  return res;
}

function simulateOnce(enemy, lootConfig, seed) {
  const rng = mulberry32(seed >>> 0);
  const carried = enemy.equipmentInstances || [];
  if (!carried.length) return [];
  const count = sampleFromWeights(lootConfig.dropCountWeights, rng);
  const dropCount = Math.min(count, carried.length);
  return sampleWithoutReplacement(carried, dropCount, rng);
}

function main() {
  const combat = loadJSON('config/combat.json');
  const loot = loadJSON('config/loot.json');
  const eq = loadJSON('config/equipment-samples.json');
  const enemy = loadJSON('config/example-enemy.json');

  const trials = 10;
  const seedBase = 42;
  console.log('Simulating loot drops for enemy:', enemy.id);
  console.log('Carried items:', enemy.equipmentInstances.map(i => i.itemId).join(', '));
  for (let t = 0; t < trials; t++) {
    const seed = seedBase + t;
    const drops = simulateOnce(enemy, loot, seed);
    console.log(`Trial ${t+1} (seed=${seed}): dropped ${drops.length} item(s):`, drops.map(d => d.itemId));
  }
}

main();
