export function json(res, data, status = 200) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export function bad(res, msg = "Bad Request", status = 400) {
  return json(res, { error: msg }, status);
}

export function now() {
  return Date.now();
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export const WORLD = { width: 100, height: 100 };

export function inBounds(x, y) {
  return x >= 0 && x < WORLD.width && y >= 0 && y < WORLD.height;
}
