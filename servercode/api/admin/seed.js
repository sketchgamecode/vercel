import { getDb } from "../_mongo.js";
import { withCORS } from "../_cors.js";
import { json, bad, WORLD } from "../_utils.js";

const RESOURCE_TYPES = ["wood", "ore", "herb", "crystal"];

function randomTileResources() {
  const res = {};
  for (const t of RESOURCE_TYPES) {
    res[t] = Math.floor(Math.random() * 5); // 每分钟产量 0~4
  }
  return res;
}

async function handler(req, res) {
  if (req.method !== "POST") return bad(res, "POST only", 405);

  const { secret } = req.body || {};
  if (!secret || secret !== process.env.ADMIN_SECRET) return bad(res, "Unauthorized", 401);

  const db = await getDb();
  const tiles = db.collection("tiles");

  // 清空旧数据
  await tiles.deleteMany({});

  const bulk = [];
  for (let x = 0; x < WORLD.width; x++) {
    for (let y = 0; y < WORLD.height; y++) {
      bulk.push({
        x, y,
        resources: randomTileResources(),
      });
    }
  }
  await tiles.insertMany(bulk);

  return json(res, { ok: true, total: WORLD.width * WORLD.height });
}

export default withCORS(async (req, res) => {
  try { await handler(req, res); } catch (e) { console.error(e); json(res, { error: "server" }, 500); }
});
