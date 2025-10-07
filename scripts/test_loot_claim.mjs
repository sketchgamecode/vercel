import handler from '../pages/api/loot/claim.js';

function makeMockReq(body) {
  return { method: 'POST', body };
}

function makeMockRes() {
  let statusCode = 200;
  let payload = null;
  return {
    status(code) { statusCode = code; return this; },
    json(obj) { payload = obj; console.log('STATUS', statusCode); console.log(JSON.stringify(obj, null, 2)); return Promise.resolve(obj); },
    end() { return Promise.resolve(); }
  };
}

async function run() {
  const req = makeMockReq({ enemyId: 'goblin_scout', playerId: 'player_test_1', seed: 424242 });
  const res = makeMockRes();
  await handler(req, res);
}

run().catch(e => { console.error(e); process.exit(1); });
