import { withCORS } from "./_cors.js";
import { json } from "./_utils.js";

export default withCORS(async (req, res) => {
  return json(res, { ok: true, ts: new Date().toISOString() });
});
