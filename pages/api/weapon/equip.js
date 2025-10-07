import { json, bad } from '../../../lib/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 'POST only', 405);
  const { playerId, item } = req.body || {};
  if (!playerId || !item || !item.itemId || !item.slot) return bad(res, 'playerId and item with itemId and slot required', 400);

  // attempt DB ops lazily
  try {
    const { getDb } = await import('../../../lib/mongo.js');
    const db = await getDb();

    // upsert item (ensure owner and createdAt present)
    const itemDoc = Object.assign({}, item, { owner: playerId, createdAt: item.createdAt || new Date().toISOString() });
    await db.collection('items').updateOne({ itemId: itemDoc.itemId }, { $set: itemDoc }, { upsert: true });

    // ensure player equip mapping updated
    const players = db.collection('players');
    const update = { $set: {} };
    update.$set[`equip.${itemDoc.slot}`] = itemDoc.itemId;
    await players.updateOne({ playerId }, update, { upsert: true });

    return json(res, { success: true, equipped: itemDoc.itemId });
  } catch (err) {
    // fallback: return what would be done
    return json(res, { success: true, note: 'mongo unavailable - simulated', equipped: item.itemId });
  }
}
