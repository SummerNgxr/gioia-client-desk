/* Prototype only: runs the real app code in the browser with sample data, and lets you view it as different people. */
(function () {
  'use strict';
  const pool = MemPool();
  const Core = CoreFactory(pool, L, { payDefault: window.PAY_DEFAULT, terms: window.TERMS, randomBytes: n => crypto.getRandomValues(new Uint8Array(n)), seedJson: JSON.stringify(window.SEED_JSON), adminEmail: 'shihan@gioia.sg', adminName: 'Shi Han', googleReady: true, appUrl: 'https://client-desk-production-aee87942.up.railway.app',
    // prototype: emails are recorded as previews instead of being sent, and uploads stay in this browser
    mailer: { mailReady: true, sim: true, sendMail: async () => {} }, drive: { driveReady: true, trash: async () => {} }, emailFrom: 'projects@gioia.asia', awaitMail: true });
  const FILES = new Map(); let fileSeq = 0;
  Core.pool = pool;
  const VIEWERS = [['shihan@gioia.sg', 'Shi Han · admin'], ['melissa@gioia.sg', 'Melissa Wee · admin'], ['jo@gioia.sg', 'Jo Lim · team member'], ['ken@kenstudio.example', 'Ken Tan · vendor (photographer)'], ['yokliang@yucheng.example', 'Tan Yok Liang · client (Yu Cheng)'], ['grace@lumen.example', 'Grace Ong · prospect (Lumen)']];
  let who = VIEWERS[0][0];
  const ready = ProtoSeed(Core)().catch(e => { console.error(e); alert('Sample data failed: ' + e.message); });
  const reply = data => ({ ok: true, json: async () => data });
  const real = window.fetch.bind(window);
  window.fetch = async (url, opt) => {
    url = String(url);
    if (!url.startsWith('/api/')) return real(url, opt);
    await ready;
    if (url.startsWith('/api/state')) { const cl = await pool.connect(); return reply(await Core.buildState(cl, await Core.identify(cl, who))); }
    if (url.startsWith('/api/upload')) {
      const q = new URLSearchParams(url.split('?')[1] || ''), body = opt.body;
      try { await Core.uploadTarget(who, q.get('cid'), q.get('key'), q.get('svc')); const id = 'proto-' + (++fileSeq); FILES.set(id, body);
        return reply(await Core.runAction(who, { a: 'f-add', cid: q.get('cid'), p: { key: q.get('key'), svc: q.get('svc'), name: q.get('name'), mime: body.type, size: body.size, fileId: id } })); }
      catch (e) { return reply({ error: e.message }); }
    }
    if (url.startsWith('/api/vendor-upload')) { const q = new URLSearchParams(url.split('?')[1] || ''); try { await Core.vendorUploadTarget(who, q.get('member')); const id = 'proto-' + (++fileSeq); FILES.set(id, opt.body); return { ok: true, json: async () => ({ fileId: id }) }; } catch (e) { return { ok: false, json: async () => ({ error: e.message }) }; } }
    if (url.startsWith('/api/backup-now')) { const cl = await pool.connect(); const data = JSON.stringify(await Core.exportAll()); await Core.tx(c => Core.setKV(c, 'lastBackup', { day: new Date().toISOString().slice(0, 10), at: new Date().toISOString(), ok: true, size: data.length })); return reply({ ok: true, last: { ok: true } }); }
    try { return reply(await Core.runAction(who, JSON.parse(opt.body))); }
    catch (e) { if (e instanceof Core.Refuse) return reply({ error: e.message }); console.error(e); return reply({ error: 'Something went wrong: ' + e.message }); }
  };
  document.addEventListener('click', async e => {
    const f = e.target.closest('a[href^="/api/file/"]');
    if (f) { e.preventDefault(); e.stopPropagation(); const id = decodeURIComponent(f.getAttribute('href').split('/').pop().split('?')[0]), blob = FILES.get(id); if (!blob) { alert('In the prototype, only files uploaded since the page was loaded can be opened.'); return; } const u = URL.createObjectURL(blob); window.open(u, '_blank'); return; }
    const vf = e.target.closest('a[href^="/api/vendor-file/"]');
    if (vf) { e.preventDefault(); e.stopPropagation(); try { const po = await Core.vendorFile(who, vf.getAttribute('href').split('/').pop()), blob = FILES.get(po.file); if (!blob) { alert('In the prototype, only files uploaded since the page was loaded can be opened.'); return; } window.open(URL.createObjectURL(blob), '_blank'); } catch (er) { alert(er.message); } return; }
    const bk = e.target.closest('a[href="/api/backup"]');
    if (bk) { e.preventDefault(); e.stopPropagation(); const data = JSON.stringify(await Core.exportAll(), null, 1), a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a2.download = 'client-desk-backup-prototype.json'; a2.click(); return; }
  }, true);
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="/auth"]'); if (a) { e.preventDefault(); e.stopPropagation(); alert('In the prototype, use "Viewing as" at the bottom right to switch people.'); } }, true);
  window.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div'); bar.className = 'proto-bar';
    bar.innerHTML = '<span>Prototype · viewing as</span><select aria-label="View the app as">' + VIEWERS.map(([e, n]) => '<option value="' + e + '">' + n + '</option>').join('') + '</select><button type="button" data-reset>Reset sample data</button>';
    document.body.appendChild(bar);
    bar.querySelector('select').addEventListener('change', e => { who = e.target.value; Object.assign(S, { view: who.includes('gioia.sg') ? 'clients' : who.includes('kenstudio') ? 'mytasks' : S.view, ptab: 'overview', cid: '', drawer: null, modal: null, menu: null, tid: null, init: false, tour: null, tourChecked: false }); load(); });
    bar.querySelector('[data-reset]').addEventListener('click', () => location.reload());
  });
})();
