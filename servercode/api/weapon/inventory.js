import { getDb } from "../_mongo.js";
import { withCORS } from "../_cors.js";
import { json, bad } from "../_utils.js";

async function handler(req, res) {
  if (req.method !== "POST") return bad(res, "POST only", 405);
  const { playerId } = req.body || {};
  if (!playerId) return bad(res, "Missing playerId");

  const db = await getDb();
  const players = db.collection("players");
  
  const player = await players.findOne({ playerId });
  if (!player) return bad(res, "Player not found", 404);

  const inventory = player.inventory || { weapons: [] };
  const weapons = inventory.weapons || [];

  return json(res, {
    success: true,
    data: {
      playerId,
      weaponCount: weapons.length,
      weapons: weapons.map(weapon => ({
        id: weapon.id,
        name: weapon.name,
        quality: weapon.quality,
        damage: weapon.finalStats.damage,
        attributes: weapon.finalStats.attributes,
        obtainedAt: weapon.obtainedAt
      }))
    }
  });
}

export default withCORS(async (req, res) => {
  try { await handler(req, res); } catch (e) { console.error(e); json(res, { error: "server" }, 500); }
});
