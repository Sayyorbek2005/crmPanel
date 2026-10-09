const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('./ai-server');
async function withServer(options, run) {
  const server = createServer(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const post = (url, data, headers = {}) => fetch(url + '/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof data === 'string' ? data : JSON.stringify(data) });
test('missing key is reported honestly; invalid input rejected', async () => {
  await withServer({ apiKey: '' }, async url => {
    assert.equal((await (await fetch(url + '/api/ai/health')).json()).configured, false);
    assert.equal((await post(url, { message: 'Salom', snapshot: {} })).status, 503);
    assert.equal((await post(url, '{broken')).status, 400);
    assert.equal((await post(url, { message: 'x', history: {}, snapshot: {} })).status, 400);
    assert.equal((await post(url, { message: 'x', snapshot: {} }, { Origin: 'https://evil.example' })).status, 403);
  });
});
test('OpenAI contract, bounded history, no storage, combined output', async () => {
  await withServer({ apiKey: 'test-only', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.input.length, 11);
    assert.equal(body.input[10].role, 'user');
    assert.ok(options.signal);
    return { ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: 'Birinchi' }, { type: 'output_text', text: 'Ikkinchi' }] }] }) };
  } }, async url => {
    const response = await post(url, { message: 'Tahlil', history: Array.from({length: 20}, () => ({role:'user', content:'test'})), snapshot: {finance:{income:100}} });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).answer, 'Birinchi\nIkkinchi');
  });
});
test('provider failures do not leak raw upstream details', async () => {
  await withServer({ apiKey: 'test-only', fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({error:{message:'secret'}}) }) }, async url => {
    const response = await post(url, { message: 'Tahlil', snapshot: {} });
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('secret'));
  });
});
test('empty and incomplete outputs are not presented as successful analysis', async () => {
  await withServer({ apiKey:'test-only', fetchImpl:async () => ({ok:true,json:async () => ({status:'incomplete',output:[]})}) }, async url => {
    assert.equal((await post(url,{message:'Tahlil',snapshot:{}})).status,502);
  });
});
