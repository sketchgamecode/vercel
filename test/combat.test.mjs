import handler from '../pages/api/combat/simulate.js';

function makeReq(body) { return { method: 'POST', body }; }
function makeResCollector() {
  let last = null; let status = 200;
  return {
    status(code){ status = code; return this; },
    end(){},
    json(obj){ last = obj; return Promise.resolve(obj); },
    get last(){ return last; }
  };
}

async function run(){
  const p1 = { playerId: 'p1', level:1, stats: { str: 20, int:5, con:8, agi:7, end:6, luck:0 }, equip: { weapon: { baseType: 'W1', powerFlat: 3, powerPct: 0.05 } } };
  const p2 = { playerId: 'p2', level:1, stats: { str: 5, int:2, con:5, agi:3, end:4, luck:0 }, equip: { weapon: { baseType: 'W0', powerFlat: 0 } } };
  const req = makeReq({ players: [p1,p2], seed: 424242 });
  const res = makeResCollector();
  await handler(req, res);
  if (!res.last) throw new Error('no response');
  if (!res.last.winner) throw new Error('no winner');
  console.log('combat.test passed, winner=', res.last.winner);
}

await run();
export const passed = true;
