import { withCORS } from "../../../lib/cors.js";
import { json, bad } from "../../../lib/utils.js";
import fs from "fs";
import path from "path";

function candidateConfigPaths() {
  return [
    path.resolve(process.cwd(), "data/weapon-config.json"),
    path.resolve(process.cwd(), "./data/weapon-config.json"),
    path.resolve(process.cwd(), "servercode/data/weapon-config.json")
  ];
}

function readConfigFromCandidates() {
  for (const p of candidateConfigPaths()) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        if (!raw || raw.trim() === "") {
          console.warn("[admin.config] empty config at", p);
          continue;
        }
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.warn("[admin.config] failed parse", p, e.message);
        }
      }
    } catch (e) {
      console.warn("[admin.config] access error", p, e.message);
    }
  }
  return null;
}

async function handler(req, res) {
  console.log("[admin.config] handling", req.method, req.url);
  if (req.method === "GET") {
    const cfg = readConfigFromCandidates();
    if (cfg) return json(res, cfg);
    return json(res, { bases: [], affixes: [], qualities: [] });
  }

  if (req.method === "POST") {
    try {
      let incoming = req.body;
      if (typeof incoming === "string") {
        try {
          incoming = incoming.length ? JSON.parse(incoming) : {};
        } catch (e) {
          return bad(res, "配置格式错误: " + e.message, 400);
        }
      }

      if (!incoming || typeof incoming !== "object") {
        incoming = {};
      }

      const newConfig = { ...incoming, lastModified: new Date().toISOString() };
      const primary = path.resolve(process.cwd(), "data/weapon-config.json");
      const primaryDir = path.dirname(primary);
      fs.mkdirSync(primaryDir, { recursive: true });
      fs.writeFileSync(primary, JSON.stringify(newConfig, null, 2), "utf-8");
      try {
        const legacy = path.resolve(process.cwd(), "servercode/data/weapon-config.json");
        const legacyDir = path.dirname(legacy);
        fs.mkdirSync(legacyDir, { recursive: true });
        fs.writeFileSync(legacy, JSON.stringify(newConfig, null, 2), "utf-8");
      } catch (e) {
        console.warn("[admin.config] failed to write legacy config copy", e.message);
      }
      return json(res, { ok: true });
    } catch (e) {
      return bad(res, "配置保存失败: " + e.message, 500);
    }
  }

  return bad(res, "Method not allowed", 405);
}

export default withCORS(async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    console.error(e);
    bad(res, "server error", 500);
  }
});
