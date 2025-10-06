import { pathToFileURL } from 'url';

async function run() {
  const routePath = new URL('../pages/api/admin/config.js', import.meta.url).href;
  console.log('Importing', routePath);

  try {
    const mod = await import(routePath);
    const handler = mod && mod.default;
    if (typeof handler !== 'function') {
      console.error('Handler not a function', typeof handler);
      process.exit(1);
    }
    console.log('Handler imported successfully');

    const req = { method: 'GET', url: '/api/admin/config' };
    let body = '';
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; return this; },
      status(code) { this.statusCode = code; return this; },
      end(chunk) { if (chunk) body += chunk; this.finished = true; },
    };

    await handler(req, res);
    console.log('Route response status:', res.statusCode);
    console.log('Route response body:', body);
  } catch (e) {
    console.error('Route test failed', e && e.stack ? e.stack : e);
  }
}

run();
