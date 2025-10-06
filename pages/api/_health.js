import { withCORS } from "../../lib/cors.js";
import { json } from "../../lib/utils.js";

export default withCORS(async (req, res) => {
  return json(res, { ok: true, ts: new Date().toISOString() });
});
