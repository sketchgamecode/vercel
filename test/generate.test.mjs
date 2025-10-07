import assert from 'assert';
import { createRequire } from 'module';
import path from 'path';
const root = process.cwd();
const require = createRequire(import.meta.url);
const { generateSnapshotItem, loadConfigs, mulberry32 } = require(path.join(root, 'lib', 'generateItem.cjs'));

const { samples, bases } = loadConfigs(root);
const seed = 5555;
const rng = mulberry32(seed);
const item1 = generateSnapshotItem({ samples, bases, seed, rng });

// deterministic repeat
const rng2 = mulberry32(seed);
const item2 = generateSnapshotItem({ samples, bases, seed, rng: rng2 });

assert.strictEqual(item1.baseTemplate, item2.baseTemplate, 'baseTemplate deterministic');
console.log('generate.test passed');
export const passed = true;
