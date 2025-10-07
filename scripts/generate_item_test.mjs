import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { generateSnapshotItem, loadConfigs } = require('../lib/generateItem.cjs');

// root folder path (ensure Windows backslashes handled)
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const { samples, bases } = loadConfigs(root);

const item = generateSnapshotItem({ samples, bases, seed: Date.now() });
console.log(JSON.stringify(item, null, 2));
