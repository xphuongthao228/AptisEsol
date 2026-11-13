const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const handlers = {};
const storage = new Map();
let network;
const key = request => typeof request === 'string' ? request : request.url;
const caches = {
  keys: async () => [...storage.keys()],
  delete: async name => storage.delete(name),
  open: async name => {
    if (!storage.has(name)) storage.set(name, new Map());
    const entries = storage.get(name);
    return {
      match: async request => entries.get(key(request))?.clone(),
      put: async (request, response) => entries.set(key(request), response.clone()),
      delete: async request => entries.delete(key(request))
    };
  },
  match: async request => {
    for (const entries of storage.values()) if (entries.has(key(request))) return entries.get(key(request)).clone();
  }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/service-worker.js'), 'utf8'), {
  URL, Response, caches, fetch: (...args) => network(...args),
  self: { location: { origin: 'https://example.test' }, clients: { claim: async () => {} }, addEventListener: (name, callback) => { handlers[name] = callback; } }
});
async function request(url, mode = 'cors') {
  let response;
  const tasks = [];
  handlers.fetch({ request: { url: 'https://example.test' + url, method: 'GET', mode },
    respondWith: promise => { response = promise; }, waitUntil: promise => tasks.push(promise) });
  const result = await response;
  await Promise.all(tasks);
  return result;
}
(async () => {
  await caches.open('aptis-pwa-v2');
  await caches.open('other-application');
  let activation;
  handlers.activate({ waitUntil: promise => { activation = promise; } });
  await activation;
  assert.ok(!storage.has('aptis-pwa-v2'));
  assert.ok(storage.has('other-application'));

  network = async () => new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } });
  assert.equal((await request('/assets/missing.css')).status, 503);
  assert.equal((await request('/assets/missing.js')).status, 503);
  const cache = await caches.open('aptis-pwa-v3');
  assert.equal(await cache.match('https://example.test/assets/missing.css'), undefined);
  await cache.put('https://example.test/assets/valid.css', new Response('<html>poisoned</html>', { headers: { 'Content-Type': 'text/html' } }));
  network = async () => new Response('body{color:red}', { headers: { 'Content-Type': 'text/css' } });
  assert.equal(await (await request('/assets/valid.css')).text(), 'body{color:red}');
  network = async () => { throw new Error('offline'); };
  assert.equal(await (await request('/assets/valid.css')).text(), 'body{color:red}');

  await cache.put('/index.html', new Response('<html>offline app</html>', { headers: { 'Content-Type': 'text/html' } }));
  assert.equal(await (await request('/app/tests/1', 'navigate')).text(), '<html>offline app</html>');
  network = async (_request, options) => {
    assert.equal(options.cache, 'no-cache');
    return new Response('server error', { status: 500 });
  };
  assert.equal((await request('/app/tests/1', 'navigate')).status, 500);
  assert.equal(await (await cache.match('/index.html')).text(), '<html>offline app</html>');

  const dist = path.join(__dirname, '../dist');
  const styles = fs.readdirSync(path.join(dist, 'assets')).filter(name => name.endsWith('.css'));
  assert.equal(styles.length, 1, 'One stylesheet loaded up front; no lazy CSS chunks');
  assert.ok(fs.readFileSync(path.join(dist, 'index.html'), 'utf8').includes(styles[0]));
  console.log('Asset checks passed: consolidated CSS, invalid MIME rejection, cache migration, offline assets and navigation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
