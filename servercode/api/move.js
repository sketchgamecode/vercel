import { getDb } from "./_mongo.js";
import { withCORS } from "./_cors.js";
import { json, bad, inBounds, manhattan, now } from "./_utils.js";

// 简化规则：速度 1 格/秒（可自行调成每格 2~3 秒）
const SPEED = 1;

async function handler(req, res) {
  if (req.method !== "POST") return bad(res, "POST only", 405);
  const { playerId, toX, toY } = req.body || {};
  if (!playerId || toX == null || toY == null) return bad(res, "Missing params");
  if (!inBounds(toX, toY)) return bad(res, "Out of bounds");

  const db = await getDb();
  const players = db.collection("players");
  const player = await players.findOne({ playerId });
  if (!player) return bad(res, "Player not found", 404);

  const dist = manhattan({ x: player.x, y: player.y }, { x: toX, y: toY });
  const travelSec = Math.ceil(dist / SPEED);
  const finishAt = now() + travelSec * 1000;

  await players.updateOne(
    { playerId },
    { $set: { x: toX, y: toY, lastMoveEndAt: finishAt } }
  );

  return json(res, { ok: true, dist, travelSec, finishAt });
}

export default withCORS(async (req, res) => {
  try { await handler(req, res); } catch (e) { console.error(e); json(res, { error: "server" }, 500); }
});