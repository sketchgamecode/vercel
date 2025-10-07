import { fileURLToPath } from 'url';
import path from 'path';

async function run() {
  const { getDb } = await import('../lib/mongo.js');
  const db = await getDb();
  const item = await db.collection('items').findOne({ owner: 'test_user_db' });
  if (!item) {
    console.error('NO_TEST_ITEM_FOUND');
    process.exit(2);
  }

  // import equip handler
  const equipMod = await import('../pages/api/weapon/equip.js');
  const equip = equipMod.default;

  const req = { method: 'POST', body: { playerId: 'player_test_db', item } };
  let status = 200;
  const res = {
    status(code) { status = code; return this; },
    setHeader() {},
    end() {},
    json(obj) { console.log('EQUIP_RESPONSE', JSON.stringify(obj)); return Promise.resolve(obj); }
  };

  await equip(req, res);

  // verify DB state
  const updatedItem = await db.collection('items').findOne({ itemId: item.itemId });
  const player = await db.collection('players').findOne({ playerId: 'player_test_db' });
  console.log('UPDATED_ITEM', JSON.stringify(updatedItem));
  console.log('PLAYER_DOC', JSON.stringify(player));
}

run().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
