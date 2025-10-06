import { pathToFileURL } from 'url';
import fs from 'fs';

async function run() {
  const modPath = new URL('../pages/api/weapon/generate.js', import.meta.url).href;
  console.log('Importing', modPath);
  const mod = await import(modPath);
  const handler = mod && mod.default;
  if (typeof handler !== 'function') {
    console.error('Handler not a function');
    process.exit(1);
  }

  const req = { method: 'POST', url: '/api/weapon/generate', body: { playerLevel: 30 } };
  let body = '';
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    end(chunk) { if (chunk) body += chunk; this.finished = true; },
  };

  try {
    await handler(req, res);
    console.log('Response status:', res.statusCode);
    console.log('Response headers:', res.headers);
    console.log('Response body:', body);
  } catch (e) {
    console.error('Handler threw', e && e.stack ? e.stack : e);
  }
}

run();
