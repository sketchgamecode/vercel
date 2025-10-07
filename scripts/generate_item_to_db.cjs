#!/usr/bin/env node
const { generateSnapshotItem, loadConfigs, mulberry32 } = require('../lib/generateItem.cjs');
const path = require('path');
function parseArgs() {
  const out = { count: 1 };
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--seed' && args[i+1]) { out.seed = Number(args[++i]); }
    else if (a === '--owner' && args[i+1]) { out.owner = args[++i]; }
    else if (a === '--count' && args[i+1]) { out.count = Number(args[++i]); }
    else if (a === '--help' || a === '-h') { console.log('Usage: --seed N --owner name --count N'); process.exit(0); }
  }
  return out;
}

const argv = parseArgs();

const root = path.resolve(__dirname, '..');
const { samples, bases } = loadConfigs(root);

async function tryInsert(items) {
  try {
    const { getDb } = require('../lib/mongo.js');
    const db = await getDb();
    const res = await db.collection('items').insertMany(items.map(i => ({ ...i, owner: argv.owner || null })));
    console.log('Inserted:', res.insertedCount);
    console.log(Object.values(res.insertedIds));
  } catch (err) {
    console.log('Mongo unavailable or error, printing simulated insertion result');
    console.log(JSON.stringify(items.map(i => ({ ...i, owner: argv.owner || null })), null, 2));
  }
}

const items = [];
for (let i = 0; i < argv.count; i++) {
  const seed = argv.seed ? argv.seed + i : Math.floor(Math.random() * 0x1000000);
  const rng = mulberry32(seed);
  const item = generateSnapshotItem({ samples, bases, seed, rng });
  items.push(item);
}

tryInsert(items).then(() => process.exit(0)).catch(() => process.exit(1));
