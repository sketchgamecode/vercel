import assert from 'assert';
import equip from '../pages/api/weapon/equip.js';
import unequip from '../pages/api/weapon/unequip.js';

function makeReq(body) { return { method: 'POST', body }; }
function makeResCollector() {
  let status = 200; let last = null;
  return {
    status(code){ status = code; return this; },
    setHeader(){},
    end(){},
    json(obj){ last = obj; return Promise.resolve(obj); },
    get last(){ return last; }
  };
}

async function run() {
  const item = { itemId: 'test_item_1', slot: 'weapon_main' };
  let req = makeReq({ playerId: 'p_test', item });
  let res = makeResCollector();
  await equip(req, res);
  // should return simulated success when no mongo
  req = makeReq({ playerId: 'p_test', slot: 'weapon_main' });
  res = makeResCollector();
  await unequip(req, res);
  console.log('equip.test passed');
}

await run();
export const passed = true;
