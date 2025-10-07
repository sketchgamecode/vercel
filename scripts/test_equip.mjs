import equip from '../pages/api/weapon/equip.js';

function makeReq(body) { return { method: 'POST', body }; }
function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    status(code){ this.statusCode = code; return this; },
    setHeader(k,v){ this.headers[k]=v; },
    json(obj){ console.log('STATUS', this.statusCode); console.log(JSON.stringify(obj, null, 2)); return Promise.resolve(obj); },
    end(s){ if (s) console.log('END', s); return Promise.resolve(); }
  };
}

async function run(){
  const item = { itemId: 'w_shortblade_inst_1', slot: 'weapon_main', baseTemplate: 'w_shortblade' };
  const req = makeReq({ playerId: 'player_test_1', item });
  const res = makeRes();
  await equip(req, res);
}

run().catch(e=>{ console.error(e); process.exit(1); });
