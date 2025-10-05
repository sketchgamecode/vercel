import { withCORS } from "../_cors.js";
import { json, bad } from "../_utils.js";
import fs from "fs";
import path from "path";

const configPath = path.resolve(process.cwd(), "data/weapon-config.json");

async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(raw);
      return json(res, config);
    } catch (e) {
      return bad(res, "配置读取失败: " + e.message, 500);
    }
  }
  if (req.method === "POST") {
    try {
      const newConfig = req.body;
      newConfig.lastModified = new Date().toISOString();
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf-8");
      return json(res, { ok: true });
    } catch (e) {
      return bad(res, "配置保存失败: " + e.message, 500);
    }
  }
  return bad(res, "Method not allowed", 405);
}

export default withCORS(async (req, res) => {
  try { await handler(req, res); } catch (e) { console.error(e); bad(res, "server error", 500); }
});
