/* Prototype only: runs the real app code in the browser with sample data, and lets you view it as different people. */
(function () {
  'use strict';
  const pool = MemPool();
  const Core = CoreFactory(pool, L, { randomBytes: n => crypto.getRandomValues(new Uint8Array(n)), seedJson: JSON.stringify(window.SEED_JSON), adminEmail: 'shihan@gioia.sg', adminName: 'Shi Han', googleReady: true, appUrl: 'https://client-desk-production-aee87942.up.railway.app' });
  Core.pool = pool;
  const VIEWERS = [['shihan@gioia.sg', 'Shi Han · admin'], ['melissa@gioia.sg', 'Melissa Wee · admin'], ['jo@gioia.sg', 'Jo Lim · team member'], ['yokliang@yucheng.example', 'Tan Yok Liang · client (Yu Cheng)'], ['grace@lumen.example', 'Grace Ong · prospect (Lumen)']];
  let who = VIEWERS[0][0];
  const ready = ProtoSeed(Core)().catch(e => { console.error(e); alert('Sample data failed: ' + e.message); });
  const reply = data => ({ ok: true, json: async () => data });
  const real = window.fetch.bind(window);
  window.fetch = async (url, opt) => {
    url = String(url);
    if (!url.startsWith('/api/')) return real(url, opt);
    await ready;
    if (url.startsWith('/api/state')) { const cl = await pool.connect(); return reply(await Core.buildState(cl, await Core.identify(cl, who))); }
    try { return reply(await Core.runAction(who, JSON.parse(opt.body))); }
    catch (e) { if (e instanceof Core.Refuse) return reply({ error: e.message }); console.error(e); return reply({ error: 'Something went wrong: ' + e.message }); }
  };
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="/auth"]'); if (a) { e.preventDefault(); e.stopPropagation(); alert('In the prototype, use "Viewing as" at the bottom right to switch people.'); } }, true);
  window.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div'); bar.className = 'proto-bar';
    bar.innerHTML = '<span>Prototype · viewing as</span><select aria-label="View the app as">' + VIEWERS.map(([e, n]) => '<option value="' + e + '">' + n + '</option>').join('') + '</select><button type="button" data-reset>Reset sample data</button>';
    document.body.appendChild(bar);
    bar.querySelector('select').addEventListener('change', e => { who = e.target.value; Object.assign(S, { view: who.includes('gioia.sg') ? 'clients' : S.view, ptab: 'overview', cid: '', drawer: null, modal: null, menu: null, tid: null, init: false }); load(); });
    bar.querySelector('[data-reset]').addEventListener('click', () => location.reload());
  });
})();
