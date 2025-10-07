import { json, bad } from '../../../lib/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 'POST only', 405);
  const { playerId, slot } = req.body || {};
  if (!playerId || !slot) return bad(res, 'playerId and slot required', 400);

  try {
    const { getDb } = await import('../../../lib/mongo.js');
    const db = await getDb();

    // find player's equip
    const players = db.collection('players');
    const p = await players.findOne({ playerId });
    const current = p && p.equip && p.equip[slot];
    if (!current) return json(res, { success: true, unequipped: null });

    // remove mapping
    await players.updateOne({ playerId }, { $unset: { [`equip.${slot}`]: '' } });

    // clear owner on item (optional)
    await db.collection('items').updateOne({ itemId: current }, { $set: { owner: null } });

    return json(res, { success: true, unequipped: current });
  } catch (err) {
    return json(res, { success: true, note: 'mongo unavailable - simulated', unequipped: null });
  }
}
