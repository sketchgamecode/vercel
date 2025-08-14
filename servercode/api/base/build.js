import { getDb } from "../../_mongo.js";
import { withCORS } from "../../_cors.js";
import { json, bad } from "../../_utils.js";

// 演示：每级消耗 100 木头 + 50 矿石，防御 +10
const COST = { wood: 100, ore: 50 };

async function handler(req, res) {
  if (req.method !== "POST") return bad(res, "POST only", 405);
  const { playerId } = req.body || {};
  if (!playerId) return bad(res, "Missing playerId");

  const db = await getDb();
  const players = db.collection("players");
  const player = await players.findOne({ playerId });
  if (!player) return bad(res, "Player not found", 404);

  // 读当前建筑等级
  const base = player.base || { level: 0, defense: 0 };

  // 检查资源
  const resBag = { ...player.resources };
  for (const k of Object.keys(COST)) {
    if ((resBag[k] || 0) < COST[k]) return bad(res, "Not enough resources", 400);
  }
  for (const k of Object.keys(COST)) resBag[k] -= COST[k];

  base.level += 1;
  base.defense = (base.defense || 0) + 10;

  await players.updateOne(
    { playerId },
    { $set: { resources: resBag, base } }
  );

  return json(res, { ok: true, base, resources: resBag });
}

export default withCORS(async (req, res) => {
  try { await handler(req, res); } catch (e) { console.error(e); json(res, { error: "server" }, 500); }
});