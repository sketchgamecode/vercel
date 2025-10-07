import path from 'path';
import { pathToFileURL } from 'url';

const tests = [
  '../test/generate.test.mjs',
  '../test/loot.test.mjs',
  '../test/equip.test.mjs',
  '../test/combat.test.mjs'
].map(p => path.resolve(process.cwd(), 'test', path.basename(p)));

let failures = 0;
for (const t of tests) {
  console.log('RUN', t);
  const url = pathToFileURL(t).href;
  try {
    const res = await import(url);
    if (res && res.passed) console.log('PASS', t);
    else { console.error('FAIL', t); failures++; }
  } catch (e) {
    console.error('ERROR running', t, e);
    failures++;
  }
}

if (failures) process.exit(1);
console.log('ALL TESTS PASSED');
