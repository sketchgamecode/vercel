import { getDb } from "./_mongo.js";
import { withCORS } from "./_cors.js";
import { json, bad, inBounds } from "./_utils.js";

// 简单产出规则：tile.resources = { wood: r1, ore: r2, herb: r3, crystal: r4 }
// 采集量 = (每分钟产出 * 挂机分钟数)

async function handler(req, res) {
  if (req.method !== "POST") return bad(res, "POST only", 405);
  const { playerId, x, y, minutes = 10 } = req.body || {};
  if (!playerId || x == null || y == null) return bad(res, "Missing params");
  if (!inBounds(x, y)) return bad(res, "Out of bounds");

  const db = await getDb();
  const tiles = db.collection("tiles");
  const players = db.collection("players");

  const tile = await tiles.findOne({ x, y });
  if (!tile) return bad(res, "Tile not found", 404);

  const gain = {};
  for (const k of Object.keys(tile.resources)) {
    const perMin = tile.resources[k] || 0;
    const amount = Math.floor(perMin * Math.max(0, minutes));
    if (amount > 0) gain[k] = amount;
  }

  const player = await players.findOne({ playerId });
  if (!player) return bad(res, "Player not found", 404);

  const newRes = { ...player.resources };
  for (const k of Object.keys(gain)) newRes[k] = (newRes[k] || 0) + gain[k];

  await players.updateOne({ playerId }, { $set: { resources: newRes } });
  return json(res, { ok: true, gain, resources: newRes });
}

export default withCORS(async (req, res) => {
  try { await handler(req, res); } catch (e) { console.error(e); json(res, { error: "server" }, 500); }
});