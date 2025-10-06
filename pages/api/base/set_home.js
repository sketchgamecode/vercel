import { getDb } from "../../../lib/mongo.js";
import { withCORS } from "../../../lib/cors.js";
import { json, bad } from "../../../lib/utils.js";

async function handler(req, res) {
  if (req.method !== "POST") return bad(res, "POST only", 405);
  const { playerId, x, y } = req.body || {};
  if (!playerId || x == null || y == null) return bad(res, "Missing params");

  const db = await getDb();
  const players = db.collection("players");
  const player = await players.findOne({ playerId });
  if (!player) return bad(res, "Player not found", 404);

  await players.updateOne({ playerId }, { $set: { home: { x, y } } });
  return json(res, { ok: true, home: { x, y } });
}

export default withCORS(async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    console.error(e);
    json(res, { error: "server" }, 500);
  }
});
