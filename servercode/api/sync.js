import { getDb } from "./_mongo.js";
import { withCORS } from "./_cors.js";
import { json, bad, WORLD, clamp } from "./_utils.js";

async function handler(req, res) {
  if (req.method !== "POST") return bad(res, "POST only", 405);
  const { playerId } = req.body || {};
  if (!playerId) return bad(res, "Missing playerId");

  const db = await getDb();
  const players = db.collection("players");

  // 初始化玩家
  let player = await players.findOne({ playerId });
  if (!player) {
    player = {
      playerId,
      name: `Adventurer-${playerId.slice(0, 6)}`,
      x: Math.floor(Math.random() * WORLD.width),
      y: Math.floor(Math.random() * WORLD.height),
      home: null,                // 洞府坐标 {x,y}
      level: 1,
      exp: 0,
      stats: { str: 1, agi: 1, con: 1 },
      resources: { wood: 0, ore: 0, herb: 0, crystal: 0 },
      lastMoveEndAt: 0,         // 上一次移动完成时间戳
      queue: []                 // 可扩展：建造/采集等挂机队列
    };
    await players.insertOne(player);
  }
  return json(res, { ok: true, player });
}

export default withCORS(async (req, res) => {
  try { await handler(req, res); } catch (e) { console.error(e); json(res, { error: "server" }, 500); }
});