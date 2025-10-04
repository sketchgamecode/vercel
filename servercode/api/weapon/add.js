import { getDb } from "../_mongo.js";
import { withCORS } from "../_cors.js";
import { json, bad } from "../_utils.js";

async function handler(req, res) {
  if (req.method !== "POST") return bad(res, "POST only", 405);
  const { playerId, weapon } = req.body || {};
  if (!playerId) return bad(res, "Missing playerId");
  if (!weapon || !weapon.id) return bad(res, "Missing weapon data");

  const db = await getDb();
  const players = db.collection("players");
  
  // 检查玩家是否存在
  const player = await players.findOne({ playerId });
  if (!player) return bad(res, "Player not found", 404);

  // 添加武器到玩家背包
  const inventory = player.inventory || { weapons: [] };
  if (!inventory.weapons) inventory.weapons = [];
  
  inventory.weapons.push({
    ...weapon,
    obtainedAt: new Date().toISOString()
  });

  // 更新玩家数据
  await players.updateOne(
    { playerId },
    { $set: { inventory } }
  );

  return json(res, {
    success: true,
    message: "武器已添加到背包",
    weaponCount: inventory.weapons.length
  });
}

export default withCORS(async (req, res) => {
  try { await handler(req, res); } catch (e) { console.error(e); json(res, { error: "server" }, 500); }
});
