import { getDb } from "../../../lib/mongo.js";
import { withCORS } from "../../../lib/cors.js";
import { json, bad, WORLD, clamp } from "../../../lib/utils.js";

async function handler(req, res) {
  if (req.method !== "POST") return bad(res, "POST only", 405);
  const { playerId, x, y, radius = 10 } = req.body || {};
  if (!playerId || x == null || y == null) return bad(res, "Missing params");

  const db = await getDb();
  const tiles = db.collection("tiles");
  const players = db.collection("players");

  const minX = clamp(x - radius, 0, WORLD.width - 1);
  const maxX = clamp(x + radius, 0, WORLD.width - 1);
  const minY = clamp(y - radius, 0, WORLD.height - 1);
  const maxY = clamp(y + radius, 0, WORLD.height - 1);

  const region = await tiles
    .find(
      {
        x: { $gte: minX, $lte: maxX },
        y: { $gte: minY, $lte: maxY }
      },
      { projection: { _id: 0 } }
    )
    .toArray();

  const homes = await players
    .find(
      {
        home: { $ne: null },
        "home.x": { $gte: minX, $lte: maxX },
        "home.y": { $gte: minY, $lte: maxY }
      },
      { projection: { _id: 0, playerId: 1, name: 1, home: 1 } }
    )
    .toArray();

  return json(res, { ok: true, region, homes });
}

export default withCORS(async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    console.error(e);
    json(res, { error: "server" }, 500);
  }
});
