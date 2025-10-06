console.log('Starting router test...');

async function run() {
  try {
    console.log('About to import router');
  const mod = await import('../pages/api/admin/config.js');
  console.log('Handler imported:', typeof mod.default);

  const handler = mod.default;
  const req = { method: 'GET', url: '/api/admin/config' };
    const res = {
      statusCode: 200,
      setHeader: () => {},
      status: (code) => { res.statusCode = code; return res; },
      end: (chunk) => { console.log('Response:', chunk); },
    };

    console.log('Calling router...');
  await handler(req, res);
  console.log('Handler completed');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

run().catch(console.error);
