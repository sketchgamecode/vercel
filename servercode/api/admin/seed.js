import { getDb } from "../_mongo.js";
import { withCORS } from "../_cors.js";
import { json, bad } from "../_utils.js";

async function handler(req, res) {
  if (req.method !== "POST") return bad(res, "POST only", 405);

  const { secret } = req.body || {};
  if (secret !== process.env.ADMIN_SECRET) return bad(res, "Unauthorized", 401);

  // 安全检查：先尝试连接数据库
  let db;
  try {
    db = await getDb();
    if (!db) throw new Error("数据库连接失败");
  } catch (e) {
    console.error("数据库连接异常:", e);
    return bad(res, "Database connection failed");
  }

  try {
    const tiles = db.collection("tiles");

    // 检查是否已经初始化
    const count = await tiles.countDocuments();
    if (count > 0) {
      return json(res, { ok: false, msg: "World already initialized", count });
    }

    // 初始化 100x100 地图
    const bulk = [];
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        bulk.push({
          x,
          y,
          resources: {
            wood: Math.floor(Math.random() * 5),
            ore: Math.floor(Math.random() * 3),
            herb: Math.floor(Math.random() * 4),
            crystal: Math.floor(Math.random() * 2)
          }
        });
      }
    }

    if (bulk.length > 0) await tiles.insertMany(bulk);
    return json(res, { ok: true, msg: "World initialized", total: bulk.length });
  } catch (e) {
    console.error("地图初始化失败:", e);
    return bad(res, "Seed failed");
  }
}

export default withCORS(async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    console.error("Seed function exception:", e);
    json(res, { error: "server", message: e.message }, 500);
  }
});
