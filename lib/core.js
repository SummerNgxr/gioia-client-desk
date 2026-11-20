/* Client Desk core: data, permissions and every action. Runs on the server (Postgres) and in the prototype (in memory). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.CoreFactory = factory;
})(this, function (pool, L, CFG) {
'use strict';
CFG = CFG || {};
const hex = n => { const b = CFG.randomBytes(n); return Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); };
const DEFAULT_BRAND = { mark: 'CLIENT DESK', tagline: '', company: '', address: '', terms: '' };
const rid = p => p + hex(6);
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 300);
const int = v => Math.floor(Number(v) || 0);
const isoToday = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' }).toUpperCase().replace(/ /g, '-');
class Refuse extends Error {}
const refuse = msg => { throw new Refuse(msg); };

/* ---------- storage ---------- */
const getKV = async (cl, k, d) => { const r = await cl.query('select v from kv where k=$1', [k]); return r.rows[0] ? r.rows[0].v : d; };
const setKV = (cl, k, v) => cl.query('insert into kv(k,v) values($1,$2) on conflict(k) do update set v=excluded.v', [k, JSON.stringify(v)]);
const getClient = async (cl, id) => { const r = await cl.query('select v from clients where id=$1', [id]); return r.rows[0] ? L.normalizeClient(r.rows[0].v) : null; };
const saveClient = (cl, c) => cl.query('insert into clients(id,v) values($1,$2) on conflict(id) do update set v=excluded.v', [c.id, JSON.stringify(c)]);
const allProjects = async cl => (await cl.query('select v from clients')).rows.map(r => L.normalizeClient(r.v));
const projectsOf = async (cl, aid) => (await cl.query("select v from clients where v->>'aid'=$1", [aid])).rows.map(r => L.normalizeClient(r.v));
const delProject = async (cl, id) => { await cl.query('delete from clients where id=$1', [id]); await cl.query('delete from feed where cid=$1', [id]); };
const getAccount = async (cl, id) => { const r = await cl.query('select v from accounts where id=$1', [id]); return r.rows[0] ? r.rows[0].v : null; };
const saveAccount = (cl, a) => cl.query('insert into accounts(id,v) values($1,$2) on conflict(id) do update set v=excluded.v', [a.id, JSON.stringify(a)]);
const allAccounts = async cl => (await cl.query('select v from accounts')).rows.map(r => r.v);
const ACCT = ['company', 'contact', 'email', 'phone', 'website'];
const syncAccount = (c, a) => { ACCT.forEach(k => { c[k] = a[k] || ''; }); c.aid = a.id; return c; };
const makeAccount = o => Object.assign({ id: rid('a'), company: '', contact: '', email: '', phone: '', website: '', notes: '', noteLog: [], archived: false }, o);
/* every quotation and invoice number is unique; key names the one being changed so it doesn't clash with itself */
async function numberTaken(cl, no, key) {
  for (const c of await allProjects(cl)) {
    if (c.quote.no === no && key !== 'q:' + c.id) return 'quotation ' + no + ' (' + c.company + ')';
    for (const i of c.invoices) if (i.no === no && key !== 'i:' + c.id + ':' + i.m) return 'invoice ' + no + ' (' + c.company + ')';
    for (const a of c.adhoc) if (a.no === no && key !== 'a:' + c.id + ':' + a.id) return 'invoice ' + no + ' (' + c.company + ')';
    for (const r of L.renewals(c)) if (r.no === no && key !== 'r:' + c.id + ':' + r.id) return 'renewal ' + no + ' (' + c.company + ')';
  }
  return '';
}
/* how an invoice was paid; "deposit" draws on the security deposit, with any remainder paid another way */
const PAYMODE = { paynow: 'PayNow', bank: 'bank transfer', deposit: 'security deposit', other: 'other' };
function payWith(x, inv, total, p) {
  const date = isDate(str(p.date, 10)) ? str(p.date, 10) : isoToday(), mode = PAYMODE[p.mode] ? p.mode : 'bank', note = str(p.note, 200);
  let how = ' (' + PAYMODE[mode] + ', ' + date + ')';
  inv.pay = { mode, date, note, by: x.me.name, prev: inv.status };
  if (mode === 'deposit') {
    const di = L.depositInv(x.c), bal = L.depBalance(x.c); if (!di || bal <= 0) refuse('There is no deposit balance to use.');
    const use = Math.min(bal, total), rest = total - use;
    if (rest > 0 && !['paynow', 'bank', 'other'].includes(p.mode2)) refuse('The deposit covers ' + L.money(use) + '. Choose how the remaining ' + L.money(rest) + ' was paid.');
    (di.uses = di.uses || []).push({ id: rid('u'), type: 'utilise', amount: use, date, inv: inv.no, by: x.me.name, at: x.now });
    Object.assign(inv.pay, { fromDeposit: use, mode2: rest > 0 ? p.mode2 : '' });
    how = ' (' + L.money(use) + ' from security deposit ' + di.no + (rest > 0 ? ', ' + L.money(rest) + ' by ' + PAYMODE[p.mode2] : '') + ', ' + date + ')';
  }
  inv.status = 'paid'; inv.paidAt = date + 'T12:00:00.000Z';
  return how;
}
/* after a task or step changes hands: tell the previous person, and settle any unpaid fee they had on it
   fee: "move" to the new person, "remove", or "keep" (the default, so nothing is lost by accident) */
function reassigned(x, t, stage, prev, next, fee, nextLabel) {
  if (!prev || prev === next) return {};
  const pm = x.team.find(z => z.id === prev), nm = next ? x.team.find(z => z.id === next) : null, to = nextLabel || (nm ? nm.name : 'the team');
  const fees = x.fees.filter(f => f.taskId === t.id && f.member === prev && (stage === null ? f.stage === null || f.stage === undefined : f.stage === stage));
  let moved = 0, removed = 0, kept = 0;
  fees.forEach(f => {
    if (f.paid) { kept++; return; }
    if (fee === 'move' && nm) { f.member = nm.id; f.notified = 0; moved++; }
    else if (fee === 'remove') { x.fees = x.fees.filter(z => z !== f); removed++; }
    else kept++;
  });
  if (moved || removed) x.save.fees = true;
  const what = (stage === null ? '"' + t.title + '"' : 'Step ' + (stage + 1) + ' of "' + t.title + '"');
  if (pm) x.log(what + ' has been reassigned to ' + to + ', so it is no longer on your list', { internal: true, priv: pm.id, tid: t.id });
  if (moved) x.log('Moved ' + pm.name + '\'s fee for ' + what + ' to ' + nm.name, { internal: true });
  if (removed) x.log('Removed ' + pm.name + '\'s fee for ' + what, { internal: true });
  if (kept && fees.length) x.log(pm.name + ' keeps their fee for ' + what, { internal: true });
  x.reassign = { prev, what, to, open: L.taskOpen(x.c, t) };
  return x.reassign;
}
const VENDOR_OK = ['t-status', 't-step', 't-submit', 't-done', 't-desc', 't-comment', 't-comment-del', 'f-link', 'f-add', 'f-del'];
const mineTask = (t, id) => !!t && (t.assignee === id || (t.stages || []).some(s => s.assignee === id));
/* a team member works only on projects where they have a task, a step or a fee */
const assignedTo = (c, id, fees) => c.tasks.some(t => t.assignee === id || (t.stages || []).some(s => s.assignee === id)) || fees.some(f => f.cid === c.id && f.member === id);
const cleanNo = v => str(v, 40).replace(/\s+/g, ' ');
async function tx(fn) {
  const cl = await pool.connect();
  try {
    await cl.query('begin');
    await cl.query('select pg_advisory_xact_lock(7)'); // one change at a time: simple and safe at this scale
    const out = await fn(cl);
    await cl.query('commit');
    return out;
  } catch (e) { await cl.query('rollback'); throw e; } finally { cl.release(); }
}
function makeClient(o, quoteNo) {
  return Object.assign({ id: rid('c'), aid: '', name: '', prep: 'closed', company: '', contact: '', email: '', phone: '', website: '', invoices: [], tasks: [], files: [], adhoc: [], extra: [],
    quote: { no: String(quoteNo), date: today(), status: 'pending', start: new Date().toISOString().slice(0, 7), months: 6, committed: 3, renewed: false, lines: [], discount: 0 } }, o);
}
async function init() {
  await pool.query("create table if not exists accounts(id text primary key, v jsonb not null)");
  await pool.query('create table if not exists kv(k text primary key, v jsonb not null)');
  await pool.query('create table if not exists clients(id text primary key, v jsonb not null)');
  await pool.query('create table if not exists feed(id bigserial primary key, cid text not null, v jsonb not null)');
  await tx(async cl => {
    if (!(await getKV(cl, 'booted', false))) {
      // First boot. Starter data comes from the SEED_JSON variable so no client or pricing data lives in the code.
      let seed = {};
      try { seed = JSON.parse(CFG.seedJson || '{}'); } catch (e) { console.error('SEED_JSON is not valid JSON, starting empty'); }
      const catalogue = (seed.catalogue || []).map(s => Object.assign({ id: rid('s'), note: '', bullets: [], tasks: [] }, s));
      await setKV(cl, 'catalogue', catalogue);
      await setKV(cl, 'brand', Object.assign({}, DEFAULT_BRAND, seed.brand || {}));
      await setKV(cl, 'team', []);
      await setKV(cl, 'seen', {});
      let next = int(seed.nextQuote) || 1001;
      for (const sc of seed.clients || []) {
        const q = sc.quote || {};
        const c = makeClient({ name: str(sc.project), company: str(sc.company), contact: str(sc.contact), website: str(sc.website), email: str(sc.email).toLowerCase() }, q.no || next++);
        Object.assign(c.quote, { date: q.date || c.quote.date, start: q.start || c.quote.start, months: int(q.months) || 6, committed: int(q.committed) || 3, discount: int(q.discount) });
        c.quote.lines = (q.lines || []).map(id => catalogue.find(s => s.id === id)).filter(Boolean).map(L.clone);
        if (q.accepted && c.quote.lines.length) L.acceptQuote(c);
        (q.paid || []).forEach(m => { const i = L.inv(c, int(m)); if (i) i.status = 'paid'; });
        await saveClient(cl, c);
      }
      await setKV(cl, 'nextQuote', next);
      await setKV(cl, 'booted', true);
    }
    if (!(await getKV(cl, 'migratedV2', false))) {
      // keep an untouched copy of the data as it was before the version 2 upgrade
      if (!(await getKV(cl, 'backupPreV2', null))) { const kv = (await cl.query('select k, v from kv')).rows.filter(r => !/^backup/.test(r.k)); await setKV(cl, 'backupPreV2', { at: new Date().toISOString(), clients: (await cl.query('select v from clients')).rows.map(r => r.v), kv }); }
      await migrateV2(cl);
    }
    if (CFG.starters && !(await getKV(cl, 'migratedV7', false))) {
      // starter templates from the prototype; anything with the same name already in the app is left alone
      const team = await getKV(cl, 'team', []), now = new Date().toISOString(), id = p => p + hex(4);
      const st = await getKV(cl, 'stepTemplates', []), pt = await getKV(cl, 'prepTemplates', []), has = (l, n) => l.some(t => t.name.toLowerCase() === n.toLowerCase());
      (CFG.starters.stepTemplates || []).forEach(t => { if (has(st, t.name)) return; const s = L.toStages(t.steps, team); st.push({ id: id('t'), name: t.name, steps: L.stepsText(s, team), count: s.length, at: now, by: '', byName: 'Gioia' }); });
      (CFG.starters.prepTemplates || []).forEach(t => { if (has(pt, t.name)) return; pt.push({ id: id('pt'), name: t.name, tasks: t.tasks.map(k => ({ title: k.title, owner: k.owner, steps: k.steps ? L.stepsText(L.toStages(k.steps, team), team) : '' })), at: now, by: '', byName: 'Gioia' }); });
      await setKV(cl, 'stepTemplates', st); await setKV(cl, 'prepTemplates', pt); await setKV(cl, 'migratedV7', true);
    }
    if (!(await getKV(cl, 'migratedV6', false))) {
      // one team: vendors become ordinary team members (their company and payment details are kept)
      const team = await getKV(cl, 'team', []); team.forEach(m => { if (m.kind === 'vendor') { delete m.kind; m.admin = false; } }); await setKV(cl, 'team', team);
      await setKV(cl, 'migratedV6', true);
    }
    if (!(await getKV(cl, 'migratedV5', false))) {
      // invoices print payment details; start with Gioia's bank and PayNow details (editable in Settings)
      const b = await getKV(cl, 'brand', DEFAULT_BRAND);
      if (!b.pay && CFG.payDefault) await setKV(cl, 'brand', Object.assign({}, b, { pay: CFG.payDefault.pay, qr: CFG.payDefault.qr }));
      await setKV(cl, 'migratedV5', true);
    }
    if (!(await getKV(cl, 'migratedV4', false))) {
      for (const c of await allProjects(cl)) { if (c.quote.committed !== c.quote.months || !c.quote.renewed) { c.quote.committed = c.quote.months; c.quote.renewed = true; await saveClient(cl, c); } }
      await setKV(cl, 'migratedV4', true);
    }
    if (!(await getKV(cl, 'migratedV3', false))) {
      for (const a of await allAccounts(cl)) { a.noteLog = a.noteLog || []; if (a.notes) a.noteLog.push({ id: rid('n'), text: a.notes, by: '', byName: 'Earlier notes', at: '' }); delete a.notes; await saveAccount(cl, a); }
      await setKV(cl, 'migratedV3', true);
    }
    // The first admin always comes from ADMIN_EMAIL, so there is a way in on day one.
    const admin = str(CFG.adminEmail).toLowerCase();
    if (admin) {
      const team = await getKV(cl, 'team', []);
      if (!team.some(m => m.email === admin)) { team.push({ id: rid('m'), name: str(CFG.adminName) || 'Admin', email: admin, admin: true }); await setKV(cl, 'team', team); }
    }
  });
}

/* Version 2: a client account can hold several projects, and team fees are paid for work done. */
async function migrateV2(cl) {
  for (const c of await allProjects(cl)) {
    if (c.aid) continue;
    const a = makeAccount({ company: c.company, contact: c.contact, email: c.email, phone: c.phone, website: c.website, notes: c.notes || '' });
    await saveAccount(cl, a);
    c.aid = a.id; delete c.notes; c.prep = c.prep || 'closed';
    if (!c.name) c.name = String(c.quote.start || '').slice(0, 4) + ' ' + (CFG.firstProjectName || 'Digital Marketing Retainer');
    await saveClient(cl, c);
  }
  const fees = await getKV(cl, 'fees', []), payouts = await getKV(cl, 'payouts', []);
  fees.forEach(f => {
    if (f.kind) return;
    f.kind = f.item ? 'item' : 'month'; f.rule = 'prorata'; f.paid = f.status === 'paid' ? f.amount : 0;
    if (f.paid) payouts.push({ id: rid('p'), member: f.member, date: String(f.paidOn || '').slice(0, 10), lines: [{ feeId: f.id, amount: f.paid }], total: f.paid, note: 'Recorded before payouts' });
    delete f.status; delete f.payable; delete f.paidOn;
  });
  await setKV(cl, 'fees', fees); await setKV(cl, 'payouts', payouts);
  if (!(await getKV(cl, 'invFormat', ''))) await setKV(cl, 'invFormat', '{quote}-{nn}');
  await setKV(cl, 'migratedV2', true);
}

/* ---------- who is signed in ---------- */
async function identify(cl, email) {
  email = str(email).toLowerCase();
  if (!email) return null;
  const team = await getKV(cl, 'team', []);
  const m = team.find(x => x.email && x.email === email);
  if (m) return { role: m.admin ? 'admin' : 'team', vendor: !m.admin && m.kind === 'vendor', id: m.id, name: m.name, key: 'm:' + m.id, email };
  const r = await cl.query("select v from accounts where lower(v->>'email')=$1 limit 1", [email]);
  if (r.rows[0]) { const a = r.rows[0].v, all = await projectsOf(cl, a.id), ps = [...all.filter(L.hasAccess), ...all.filter(z => !L.hasAccess(z) && L.shared(z))]; return { role: ps.length ? 'client' : 'pending', aid: a.id, cids: ps.map(c => c.id), cid: (ps[0] || {}).id || '', name: a.contact || a.company, key: 'c:' + a.id, email }; }
  return { role: 'none', email };
}
async function buildState(cl, me) {
  const brand = await getKV(cl, 'brand', DEFAULT_BRAND);
  if (!me) return { me: null, googleReady: !!CFG.googleReady, devLogin: !!CFG.devLogin, brand: { mark: brand.mark, tagline: brand.tagline } };
  if (me.role === 'none' || me.role === 'pending') return { me: { role: me.role, email: me.email }, brand: { mark: brand.mark, tagline: brand.tagline } };
  const team = await getKV(cl, 'team', []);
  const seen = (await getKV(cl, 'seen', {}))[me.key] || '', tours = (await getKV(cl, 'tours', {}))[me.key] || {};
  const staff = me.role !== 'client';
  const allFees = await getKV(cl, 'fees', []);
  let clients = staff ? await allProjects(cl) : (await projectsOf(cl, me.aid)).filter(z => me.cids.includes(z.id));
  if (me.role === 'team') clients = clients.filter(z => assignedTo(z, me.id, allFees));
  clients.sort((a, b) => (a.company + a.name).localeCompare(b.company + b.name));
  let feed = (await cl.query(staff ? 'select v,cid from feed order by id desc limit 400' : 'select v,cid from feed where cid = any($1) order by id desc limit 400', staff ? [] : [clients.map(c => c.id)])).rows.map(r => Object.assign({ cid: r.cid }, r.v));
  let accounts = staff ? (await allAccounts(cl)).filter(a => me.role === 'admin' || clients.some(z => z.aid === a.id)) : [await getAccount(cl, me.aid)].filter(Boolean).map(a => Object.assign({}, a, { notes: '', noteLog: [] }));
  let fees = await getKV(cl, 'fees', []), payouts = await getKV(cl, 'payouts', []);
  if (me.vendor) accounts = accounts.map(a => ({ id: a.id, company: a.company, contact: a.contact, noteLog: [] }));
  if (me.role === 'team') { const ok = clients.map(z => z.id); feed = feed.filter(e => ok.includes(e.cid) || e.priv === me.id); fees = fees.filter(f => f.member === me.id).map(f => Object.assign({}, f, { base: 0, pct: 0 })); payouts = payouts.filter(p => p.member === me.id); feed = feed.filter(e => e.priv ? e.priv === me.id : e.by === me.key || (e.to || []).includes(me.id)); }
  if (me.role === 'client') { fees = []; payouts = []; }
  if (me.role !== 'admin') clients.forEach(c => c.tasks.forEach(t => { delete t.value; }));
  if (me.role === 'client') clients.forEach(c => c.tasks.forEach(t => { t.comments = t.comments.filter(m => !m.internal); }));
  if (me.vendor) clients.forEach(c => { c.tasks = c.tasks.filter(t => mineTask(t, me.id)); const keep = new Set(c.tasks.flatMap(t => (t.files || []).map(L.fkey))); c.files = c.files.filter(f => keep.has(L.fkey(f))); c.email = ''; c.phone = ''; });
  if (me.role === 'team') {
    // Team members never receive prices, so they cannot be read from the browser either.
    clients.forEach(c => { c.quote.discount = 0; c.quote.discounts = []; L.renewals(c).forEach(r => { r.discounts = []; r.lines.forEach(s => { s.price = 0; }); }); [...c.quote.lines, ...c.extra].forEach(s => { s.price = 0; }); c.adhoc.forEach(a => { a.amount = 0; if (a.s) a.s.price = 0; }); });
    feed = feed.filter(e => !e.fin);
  }
  if (me.role === 'client') feed = feed.filter(e => !e.internal);
  return {
    me: Object.assign({ role: me.role, id: me.id || '', aid: me.aid || '', cid: me.cid || '', name: me.name, key: me.key, email: me.email }, me.vendor ? { vendor: true } : {}), brand, seen, tours, clients, accounts, feed, payouts,
    team: staff ? (me.role === 'admin' ? team : team.map(m => ({ id: m.id, name: m.name }))) : team.map(m => ({ id: m.id, name: m.name })),
    catalogue: me.role === 'admin' ? await getKV(cl, 'catalogue', []) : [],
    fees, nextQuote: me.role === 'admin' ? await getKV(cl, 'nextQuote', 1001) : 0, invFormat: me.role === 'admin' ? await getKV(cl, 'invFormat', '{quote}-{nn}') : '', appUrl: CFG.appUrl || '', emailOn: !(await getKV(cl, 'emailOff', {}))[me.role === 'client' ? 'c:' + me.aid : 'm:' + me.id],
    google: me.role === 'admin' ? { mail: !!(CFG.mailer && CFG.mailer.mailReady), drive: !!(CFG.drive && CFG.drive.driveReady), from: CFG.emailFrom || '', sim: !!(CFG.mailer && CFG.mailer.sim), log: (await getKV(cl, 'mailLog', [])).slice(0, 60), backup: await getKV(cl, 'lastBackup', null) } : null,
    templates: staff && !me.vendor ? await getKV(cl, 'stepTemplates', []) : [], prepTemplates: staff && !me.vendor ? await getKV(cl, 'prepTemplates', []) : [], uploads: !!(CFG.drive && CFG.drive.driveReady), email: !!(CFG.mailer && CFG.mailer.mailReady)
  };
}

/* ---------- project import: a plan Claude drafts, previewed before anything is created ---------- */
const lc = v => str(v, 200).toLowerCase();
const monthList = (spec, s, c) => {
  if (s.adhoc || s.billing === 'general') return [0];
  if (s.billing !== 'monthly') return [1];
  const all = Array.from({ length: c.quote.months }, (_, i) => i + 1);
  if (spec === undefined || spec === null || spec === 'all') return all;
  const arr = (Array.isArray(spec) ? spec : [spec]).map(int).filter(m => m >= 1 && m <= c.quote.months);
  if (!arr.length) refuse('Month ' + JSON.stringify(spec) + ' is outside the ' + c.quote.months + '-month term.');
  return [...new Set(arr)];
};
function dueFor(pt, c, m) {
  if (pt.due) { const d = str(pt.due, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) refuse('Due date "' + pt.due + '" must look like 2026-12-15.'); return d; }
  if (pt.dueDay && m) { const x = L.ym(c, m), last = new Date(x.y, x.mo + 1, 0).getDate(), day = Math.min(last, Math.max(1, int(pt.dueDay))); return x.y + '-' + L.pad(x.mo + 1) + '-' + L.pad(day); }
  return '';
}
async function applyPlan(x, plan, dry) {
  plan = plan && typeof plan === 'object' ? plan : refuse('The plan is empty.');
  const out = { warnings: [], tasks: [], fees: [] };
  const person = name => { const n = lc(name); if (!n) return null; return x.team.find(m => lc(m.name) === n || m.email === n || lc(m.name).split(' ')[0] === n) || refuse('There is no team member called "' + name + '". The team is: ' + x.team.map(m => m.name).join(', ') + '.'); };
  const k = plan.client || refuse('The plan needs a "client".');
  let c, isNew = false, acct = null, next = await getKV(x.cl, 'nextQuote', 1001);
  if (k.existing) {
    const accts = await allAccounts(x.cl);
    acct = accts.find(v => lc(v.company) === lc(k.existing)) || refuse('There is no client called "' + k.existing + '". Clients: ' + accts.map(v => v.company).join(', ') + '.');
    const ps = await projectsOf(x.cl, acct.id);
    if (k.project && !k.newProject) c = ps.find(v => lc(v.name) === lc(k.project)) || refuse(acct.company + ' has no project called "' + k.project + '". Projects: ' + ps.map(v => v.name).join(', ') + '. Use "newProject": true to start one.');
    else if (k.newProject) { c = syncAccount(makeClient({ name: str(k.project) || 'New project' }, next), acct); isNew = true; }
    else if (ps.length === 1) c = ps[0];
    else refuse(acct.company + ' has ' + ps.length + ' projects. Name one with "project": ' + ps.map(v => '"' + v.name + '"').join(', ') + '.');
  } else {
    const company = str(k.company) || refuse('The client needs a "company" name, or use "existing" to add to a current client.');
    acct = makeAccount({ company, contact: str(k.contact), email: str(k.email).toLowerCase(), phone: str(k.phone), website: str(k.website), noteLog: str(k.notes, 5000) ? [{ id: rid('n'), text: str(k.notes, 5000), by: x.me.id, byName: x.me.name, at: x.now }] : [] });
    c = syncAccount(makeClient({ name: str(k.project) || 'New project' }, next), acct); isNew = true;
  }
  const q = plan.quotation;
  if (q) {
    if (c.quote.status === 'accepted') refuse(c.company + ' already has an accepted quotation. Leave "quotation" out of the plan to add tasks and fees to it.');
    const lines = (Array.isArray(q.lines) ? q.lines : []).map((ln, i) => {
      let s;
      if (ln.service) { const base = x.catalogue.find(z => z.id === ln.service || lc(z.name) === lc(ln.service) || lc(L.short(z)) === lc(ln.service)) || refuse('There is no service "' + ln.service + '" in the catalogue. Services: ' + x.catalogue.map(z => z.id + ' (' + L.short(z) + ')').join(', ') + '.'); s = L.clone(base); }
      else { s = { id: 'p' + hex(3) + i, name: str(ln.name, 120) || refuse('Each custom line needs a "name".'), price: 0, billing: 'monthly', note: '', bullets: [], tasks: [] }; }
      if (ln.name) s.name = str(ln.name, 120);
      if (ln.price !== undefined) s.price = Math.max(0, int(ln.price));
      if (ln.billing) s.billing = ln.billing === 'once' ? 'once' : 'monthly';
      if (Array.isArray(ln.bullets)) s.bullets = ln.bullets.map(b => str(b)).filter(Boolean).slice(0, 12);
      if (ln.note !== undefined) s.note = str(ln.note);
      if (ln.templateTasks === false) s.tasks = [];
      return s;
    });
    if (!lines.length) refuse('The quotation needs at least one line.');
    const ids = new Set(); lines.forEach(s => { if (ids.has(s.id)) refuse('"' + L.short(s) + '" appears twice in the quotation.'); ids.add(s.id); });
    Object.assign(c.quote, { lines, date: today() });
    if (q.start) { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(q.start)) refuse('Quotation "start" must look like 2026-12.'); c.quote.start = q.start; }
    c.quote.months = Math.min(24, Math.max(1, int(q.months) || c.quote.months)); c.quote.committed = Math.min(c.quote.months, Math.max(1, int(q.committed) || c.quote.months)); c.quote.discount = Math.max(0, int(q.discount));
    const st = q.status || 'draft'; if (!['draft', 'sent', 'accepted'].includes(st)) refuse('Quotation "status" must be draft, sent or accepted.');
    if (st === 'sent') c.quote.status = 'sent';
    if (st === 'accepted') L.acceptQuote(c, x.invFormat);
    out.quote = { no: c.quote.no, status: c.quote.status, start: L.mName(c, 1), end: L.mName(c, c.quote.months), months: c.quote.months, committed: c.quote.committed, discount: c.quote.discount, lines: lines.map(s => ({ name: s.name, billing: s.billing, price: s.price, templateTasks: s.tasks.length })), month1: L.invTotal(c, 1), month2: c.quote.months > 1 ? L.invTotal(c, 2) : 0, invoices: c.invoices.length };
  }
  for (const m of Array.isArray(plan.paid) ? plan.paid : []) { const i = L.inv(c, int(m)) || refuse('Can\'t mark month ' + m + ' as paid: ' + (c.invoices.length ? 'there is no such invoice.' : 'the quotation is not accepted.')); i.status = 'paid'; }
  const findWs = name => { if (lc(name) === 'general') return ensureGeneral(c); const list = [...c.quote.lines, ...c.extra]; return list.find(s => s.id === name || lc(s.name) === lc(name) || lc(L.short(s)) === lc(name)) || refuse('"' + name + '" is not one of ' + c.company + '\'s workspaces: ' + list.map(s => L.short(s)).join(', ') + ', or "general".'); };
  const untouched = t => ['todo', 'cdraft'].includes(t.status) && !t.comments.length && !t.files.length && (t.history || []).length === 0 && !(t.stage > 0);
  for (const r of Array.isArray(plan.replaceTemplateTasks) ? plan.replaceTemplateTasks : []) {
    const s = findWs(r.service || r), months = monthList(r.months, s, c), before = c.tasks.length;
    c.tasks = c.tasks.filter(t => !(t.svc === s.id && months.includes(t.m) && untouched(t)));
    out.warnings.push('Removed ' + (before - c.tasks.length) + ' untouched template tasks from ' + L.short(s) + '. Tasks with progress were kept.');
  }
  let n = 0;
  for (const pt of Array.isArray(plan.tasks) ? plan.tasks : []) {
    const s = findWs(pt.service || 'general'), months = monthList(pt.month !== undefined ? pt.month : pt.months, s, c), title = str(pt.title, 160) || refuse('Every task needs a "title".');
    const steps = L.toStages(Array.isArray(pt.steps) ? pt.steps.join('\n') : str(pt.steps, 4000)), owner = steps.length ? 'gioia' : pt.owner === 'client' ? 'client' : 'gioia';
    const who = owner === 'gioia' ? person(pt.assignee) : null;
    for (const m of months) {
      const t = L.newTask(c.id + '-i' + hex(4), s.id, m, [title, owner, owner === 'gioia' && !steps.length && pt.approve !== false, steps], s.adhoc || '');
      Object.assign(t, { desc: str(pt.desc, 3000), assignee: who ? who.id : '', due: dueFor(pt, c, m) }); hist(x, t, 'Created from a project plan'); c.tasks.push(t); n++;
    }
    out.tasks.push({ ws: L.short(s), title, months: months.length, when: s.billing === 'monthly' && !s.adhoc ? (months.length === c.quote.months ? 'every month' : months.map(m => L.mName(c, m)).join(', ')) : '', owner: owner === 'client' ? 'Client' : who ? who.name : 'Unassigned', steps: steps.length, due: pt.due || (pt.dueDay ? 'day ' + int(pt.dueDay) + ' of the month' : '') });
  }
  const fees = [];
  for (const pf of Array.isArray(plan.fees) ? plan.fees : []) {
    const m = person(pf.member) || refuse('Every fee needs a "member".'), custom = !!pf.item, s = custom ? null : findWs(pf.service || refuse('Every fee needs a "service" or an "item".'));
    const months = custom ? [0] : monthList(pf.month !== undefined ? pf.month : pf.months, s, c);
    const pct = !custom && pf.percent !== undefined ? Math.min(100, Math.max(0, Number(pf.percent) || 0)) : 0, base = s ? L.feeBase(c, s) : 0;
    const amount = pct ? Math.round(base * pct / 100) : Math.floor(Number(pf.amount) || 0);
    if (!(amount > 0)) refuse('The fee for ' + m.name + ' on ' + (custom ? pf.item : L.short(s)) + ' works out to $0. Give an "amount" or a "percent" of a priced service.');
    months.forEach(mm => fees.push({ id: rid('f'), kind: custom ? 'item' : 'month', rule: pf.rule === 'all' ? 'all' : 'prorata', member: m.id, cid: c.id, svc: custom ? '' : s.id, item: custom ? str(pf.item, 120) : '', m: mm, amount, pct, base: pct ? base : 0, note: str(pf.note, 300), paid: 0, created: x.now }));
    out.fees.push({ member: m.name, label: custom ? str(pf.item, 120) : L.short(s), each: amount, months: months.length, pct, total: amount * months.length });
  }
  const months = c.quote.renewed ? c.quote.months : c.quote.committed;
  const value = c.quote.lines.reduce((a, s) => a + s.price * (s.billing === 'once' ? 1 : months), 0) - (c.quote.discount && c.quote.lines.some(s => s.billing === 'monthly') ? c.quote.discount * Math.max(0, months - 1) : 0);
  const feeTotal = fees.reduce((a, f) => a + f.amount, 0) + x.fees.filter(f => f.cid === c.id).reduce((a, f) => a + f.amount, 0);
  Object.assign(out, { client: { company: c.company, project: c.name, contact: c.contact, email: c.email, isNew }, newTasks: n, costing: { value, fees: feeTotal, margin: value - feeTotal, months } });
  if (!dry) {
    if (isNew) await setKV(x.cl, 'nextQuote', next + 1);
    if (!k.existing) await saveAccount(x.cl, acct);
    x.c = c; fees.forEach(f => x.fees.push(f)); if (fees.length) x.save.fees = true;
    fees.forEach(f => x.log('Assigned you a fee of ' + L.money(f.amount) + ' for ' + (f.item || L.short(L.ql(c, f.svc))) + (f.m ? ', ' + L.mName(c, f.m) : ''), { internal: true, priv: f.member, cid: c.id }));
    x.log((isNew ? 'Project created for ' : 'Project plan added to ') + c.company + ': ' + n + ' tasks' + (fees.length ? ', ' + fees.length + ' team fees' : '') + (out.quote ? ', quotation ' + out.quote.no + ' (' + L.STATUS[c.quote.status] + ')' : ''), { internal: true });
    out.cid = c.id;
  }
  return out;
}

/* ---------- actions ---------- */
const ADMIN = ['admin'], STAFF = ['admin', 'team'], ALL = ['admin', 'team', 'client'];
const task = (x, id) => x.c.tasks.find(t => t.id === id) || refuse('That task no longer exists.');
const openTask = (x, id) => { const t = task(x, id); if (!L.taskOpen(x.c, t)) refuse('That task is locked until its invoice is paid.'); return t; };
function ensurePrep(c) { if (!c.extra.find(s => s.id === 'prep')) c.extra.unshift({ id: 'prep', name: 'Preparation', billing: 'prep', price: 0, note: '', bullets: ['Set-up work before the first month starts'], tasks: [] }); return c.extra.find(s => s.id === 'prep'); }
const member = (x, id) => (x.team.find(m => m.id === id) || refuse('That team member no longer exists.'));
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d);
const stageAt = (t, i) => (L.staged(t) && t.stages[int(i)]) || refuse('That step no longer exists.');
const feeLabel = (c, f) => f.kind === 'item' ? f.item : f.kind === 'task' ? (() => { const t = c && c.tasks.find(z => z.id === f.taskId); return t ? '"' + t.title + '"' + (f.stage !== null && f.stage !== undefined && f.stage !== '' && t.stages && t.stages[f.stage] ? ', step ' + (int(f.stage) + 1) : '') : 'a removed task'; })() : (c && L.feeSvc(c, f) ? L.short(L.feeSvc(c, f)) + (f.m ? ', ' + L.mName(c, f.m) : '') : 'this work');
function applyRenewal(x, r, who) {
  // add the renewal's months to the project: invoices, each service's tasks (this project's own task list) and repeating monthly fees
  const c = x.c, q = c.quote, n0 = q.months; r.from = n0 + 1; r.to = n0 + r.months;
  q.months = r.to; q.committed = q.months; q.renewed = true; r.status = 'accepted'; r.acceptedBy = Object.assign({ at: x.now }, who);
  for (let m = r.from; m <= r.to; m++) c.invoices.push({ m, no: L.invNo(x.invFormat, q.no, m), status: 'pending' });
  let k = 0;
  r.lines.forEach(s => { const ms = s.billing === 'once' ? [r.from] : Array.from({ length: r.months }, (_, i) => r.from + i); ms.forEach(m => (s.tasks || []).forEach(def => c.tasks.push(L.taskFromDef(c, c.id + '-r' + hex(3) + (++k), s, m, def)))); });
  x.fees.filter(f => f.cid === c.id && f.kind === 'month' && f.m === n0).forEach(f => { if (!r.lines.some(s => s.id === f.svc && s.billing === 'monthly')) return; for (let m = r.from; m <= r.to; m++) x.fees.push(Object.assign({}, f, { id: rid('f'), m, paid: 0, notified: 0, created: x.now })); x.save.fees = true; });
  x.log('Renewal ' + r.no + ' accepted (' + who.how + '). ' + L.mName(c, r.from) + ' to ' + L.mName(c, r.to) + ' added: ' + r.months + ' invoices and their tasks', { fin: true });
}
function ensureGeneral(c) { if (!c.extra.find(s => s.id === 'general')) c.extra.push({ id: 'general', name: 'General (ad-hoc)', billing: 'general', price: 0, note: '', bullets: ['Ad-hoc tasks outside the quoted services'], tasks: [] }); return c.extra.find(s => s.id === 'general'); }
function advance(x, t, approved) {
  const s = t.stages[t.stage], n = t.stage + 1, total = t.stages.length;
  s.done = true; s.by = x.staff ? x.me.name : (x.c.contact || 'Client'); s.at = x.now; t.stage = n; t.status = 'todo'; L.syncStage(t);
  hist(x, t, (approved ? 'Approved step ' : 'Completed step ') + n + ' of ' + total + ': ' + s.title);
  const nx = L.curStage(t);
  x.log((approved ? 'Approved' : 'Completed') + ' step ' + n + ' of ' + total + ' on "' + t.title + '"' + (nx ? '. Next: ' + nx.title + (nx.owner === 'client' ? ' (client)' : ' (team)') : '. All steps completed'));
}
const hist = (x, t, text) => { (t.history = t.history || []).push({ text, by: x.staff ? x.me.name : (x.c.contact || 'Client'), at: x.now }); };
const draftQuote = x => { if (['accepted', 'cancelled'].includes(x.c.quote.status)) refuse('This quotation is already ' + x.c.quote.status + '.'); return x.c.quote; };
const A = {
  'create-client': { roles: ADMIN, async fn(x, p) {
    const company = str(p.company) || refuse('Enter the company name to create the client.'), email = str(p.email).toLowerCase();
    if (email && (await allAccounts(x.cl)).some(a => a.email === email)) refuse('Another client already signs in with ' + email + '.');
    const a = makeAccount({ company, contact: str(p.contact), email, phone: str(p.phone), website: str(p.website) }); await saveAccount(x.cl, a);
    x.log('Client account created for ' + company, { internal: true, cid: 'a:' + a.id });
    return { aid: a.id };
  } },
  'save-details': { roles: ALL, client: true, async fn(x, p) {
    // Details live on the client account and are copied to each of its projects.
    const a = await getAccount(x.cl, x.c.aid) || refuse('That client no longer exists.');
    ['company', 'contact', 'phone', 'website'].forEach(k => { a[k] = str(p[k]); });
    if (x.staff) {
      const email = str(p.email).toLowerCase();
      if (email && email !== a.email && (await allAccounts(x.cl)).some(o => o.id !== a.id && o.email === email)) refuse('Another client already signs in with ' + email + '.');
      a.email = email; if (p.project !== undefined && x.me.role === 'admin') x.c.name = str(p.project, 120) || x.c.name;
    }
    if (!a.company) refuse('The company name can\'t be empty.');
    await saveAccount(x.cl, a);
    for (const o of await projectsOf(x.cl, a.id)) if (o.id !== x.c.id) await saveClient(x.cl, syncAccount(o, a));
    syncAccount(x.c, a); x.log(x.staff ? 'Client details updated' : 'Updated their details');
  } },
  'note-add': { roles: STAFF, async fn(x, p) {
    const a = await getAccount(x.cl, str(p.aid, 60)) || refuse('That client no longer exists.'), text = str(p.text, 5000) || refuse('Write the note first.');
    (a.noteLog = a.noteLog || []).push({ id: rid('n'), text, by: x.me.id, byName: x.me.name, at: x.now }); await saveAccount(x.cl, a);
  } },
  'note-edit': { roles: STAFF, async fn(x, p) {
    const a = await getAccount(x.cl, str(p.aid, 60)) || refuse('That client no longer exists.'), n = (a.noteLog || []).find(z => z.id === p.id) || refuse('That note no longer exists.');
    if (x.me.role !== 'admin' && n.by !== x.me.id) refuse('Only ' + (n.byName || 'its writer') + ' can change this note.');
    if (p.remove) a.noteLog = a.noteLog.filter(z => z.id !== n.id); else { n.text = str(p.text, 5000) || refuse('The note can\'t be empty. Delete it instead.'); n.edited = x.now; }
    await saveAccount(x.cl, a);
  } },
  'p-rename': { roles: ADMIN, client: true, fn(x, p) { const n = str(p.name, 120) || refuse('Give the project a name.'); x.log('Project renamed from "' + x.c.name + '" to "' + n + '"', { internal: true }); x.c.name = n; } },
  'q-number': { roles: ADMIN, client: true, async fn(x, p) {
    const q = x.c.quote, no = cleanNo(p.no) || refuse('Enter the quotation number.'); if (no === q.no) return;
    if (q.status !== 'pending' && !p.override) refuse('Quotation ' + q.no + ' has already been ' + (q.status === 'sent' ? 'sent' : q.status) + '. Tick "Change it anyway" to override.');
    const hit = await numberTaken(x.cl, no, 'q:' + x.c.id); if (hit) refuse(no + ' is already used by ' + hit + '.');
    x.log('Quotation number changed from ' + q.no + ' to ' + no + (q.status !== 'pending' ? ' after it was ' + (q.status === 'sent' ? 'sent' : q.status) : ''), { fin: true }); q.no = no;
  } },
  'i-number': { roles: ADMIN, client: true, async fn(x, p) {
    const i = p.id ? L.adhocOf(x.c, p.id) : L.inv(x.c, int(p.m)); if (!i) refuse('Invoice not found.');
    const no = cleanNo(p.no) || refuse('Enter the invoice number.'); if (no === i.no) return;
    if (i.status !== 'pending' && !p.override) refuse('Invoice ' + i.no + ' has already been ' + (i.status === 'sent' ? 'sent' : 'marked as ' + i.status) + '. Tick "Change it anyway" to override.');
    const hit = await numberTaken(x.cl, no, p.id ? 'a:' + x.c.id + ':' + i.id : 'i:' + x.c.id + ':' + i.m); if (hit) refuse(no + ' is already used by ' + hit + '.');
    x.log('Invoice number changed from ' + i.no + ' to ' + no + (i.status !== 'pending' ? ' after it was ' + (i.status === 'sent' ? 'sent' : i.status) : ''), { fin: true }); i.no = no;
  } },
  'q-delete': { roles: ADMIN, client: true, async fn(x) {
    const q = x.c.quote; if (['accepted', 'cancelled'].includes(q.status) || x.c.invoices.length) refuse('Only a quotation that has not been accepted can be deleted. Cancel it instead.');
    const label = x.c.company + ', ' + x.c.name; await delProject(x.cl, x.c.id);
    x.fees = x.fees.filter(f => f.cid !== x.c.id); x.save.fees = true;
    x.log('Draft quotation ' + q.no + ' deleted (' + label + ')', { internal: true, cid: 'a:' + x.c.aid }); x.c = null;
  } },
  'q-cancel': { roles: ADMIN, client: true, fn(x, p) {
    const q = x.c.quote; if (q.status !== 'accepted') refuse('Only an accepted quotation can be cancelled. A draft can be deleted.');
    q.status = 'cancelled'; q.cancelled = x.now; q.cancelNote = str(p.note, 300); let n = 0;
    x.c.invoices.forEach(i => { if (i.status !== 'paid') { i.status = 'void'; n++; } }); x.c.adhoc.forEach(a => { if (a.status !== 'paid') { a.status = 'void'; n++; } });
    x.log('Quotation ' + q.no + ' cancelled. ' + n + ' unpaid invoice' + (n === 1 ? '' : 's') + ' voided; paid invoices and all records are kept', { fin: true });
  } },
  'acct-archive': { roles: ADMIN, async fn(x, p) { const a = await getAccount(x.cl, str(p.aid, 60)) || refuse('That client no longer exists.'); a.archived = !!p.archived; await saveAccount(x.cl, a); x.log((a.archived ? 'Archived ' : 'Restored ') + a.company, { internal: true, cid: 'a:' + a.id }); } },
  'acct-delete': { roles: ADMIN, async fn(x, p) {
    const a = await getAccount(x.cl, str(p.aid, 60)) || refuse('That client no longer exists.');
    if (str(p.confirm).toLowerCase() !== a.company.trim().toLowerCase()) refuse('Type the company name exactly to confirm.');
    const ps = await projectsOf(x.cl, a.id);
    if (ps.some(c => c.invoices.some(i => i.status === 'paid') || c.adhoc.some(i => i.status === 'paid'))) refuse(a.company + ' has paid invoices, so it can\'t be deleted. Archive it instead.');
    for (const c of ps) await delProject(x.cl, c.id);
    await x.cl.query('delete from accounts where id=$1', [a.id]);
    const ids = ps.map(c => c.id); x.fees = x.fees.filter(f => !ids.includes(f.cid)); x.save.fees = true;
    x.log('Deleted the client ' + a.company + ' and ' + ps.length + ' project' + (ps.length === 1 ? '' : 's'), { internal: true, cid: '' });
  } },
  'prep-start': { roles: ADMIN, client: true, fn(x) {
    if (x.c.prep === 'open') refuse('Preparation is already open.');
    ensurePrep(x.c); x.c.prep = 'open'; let n = 0;
    if (!x.c.prepSeeded) {
      x.c.quote.lines.forEach(s => { const base = x.catalogue.find(z => z.id === s.id) || s; (base.prep || []).forEach(def => { x.c.tasks.push(L.newTask(x.c.id + '-p' + hex(4), 'prep', 0, def)); n++; }); });
      x.c.prepSeeded = true;
    }
    x.log('Preparation started' + (n ? ': ' + n + ' preparation task' + (n === 1 ? ' is' : 's are') + ' open' : '') + '. Monthly work stays locked until each invoice is paid');
  } },
  'q-add': { roles: ADMIN, client: true, fn(x, p) { const q = draftQuote(x), s = x.catalogue.find(s => s.id === p.id) || refuse('That service is no longer in the catalogue.'); if (!L.ql(x.c, s.id)) q.lines.push(L.clone(s)); } },
  'q-remove': { roles: ADMIN, client: true, fn(x, p) { const q = draftQuote(x); q.lines = q.lines.filter(s => s.id !== p.id); } },
  'q-set': { roles: ADMIN, client: true, fn(x, p) {
    const q = draftQuote(x);
    if (p.k === 'start') { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(p.v)) q.start = p.v; }
    else if (p.k === 'months') q.months = Math.min(24, Math.max(1, int(p.v)));
    else if (p.k === 'committed') q.committed = Math.max(1, int(p.v));
    else if (p.k === 'discount') q.discount = Math.max(0, int(p.v));
    if (q.committed > q.months) q.committed = q.months;
  } },
  'q-sent': { roles: ADMIN, client: true, fn(x) { const q = draftQuote(x); if (!q.lines.length) refuse('Add at least one service first.'); if (['changes', 'declined'].includes(q.status)) q.version = (q.version || 1) + 1; q.status = 'sent'; x.log('Quotation ' + q.no + ' sent', { fin: true }); } },
  'q-accept': { roles: ADMIN, client: true, fn(x) { const q = draftQuote(x); if (!q.lines.length) refuse('Add at least one service first.'); L.acceptQuote(x.c, x.invFormat); x.log('Quotation ' + q.no + ' accepted. ' + q.months + ' monthly invoices created', { fin: true }); } },
  'i-sent': { roles: ADMIN, client: true, fn(x, p) { const i = L.inv(x.c, int(p.m)) || refuse('Invoice not found.'); if (i.status === 'void') refuse('This invoice was voided when the quotation was cancelled.'); if (L.invLocked(x.c, i.m)) refuse('Confirm the renewal first.'); if (i.status === 'pending') i.status = 'sent'; x.log('Invoice ' + i.no + ' (' + L.money(L.invTotal(x.c, i.m)) + ') sent', { fin: true }); } },
  'i-paid': { roles: ADMIN, client: true, fn(x, p) { const i = L.inv(x.c, int(p.m)) || refuse('Invoice not found.'); if (i.status === 'void') refuse('This invoice was voided when the quotation was cancelled.'); if (L.invLocked(x.c, i.m)) refuse('Confirm the renewal first.'); if (i.status === 'paid') refuse('This invoice is already paid.'); const how = payWith(x, i, L.invTotal(x.c, i.m), p); x.log('Invoice ' + i.no + ' marked as paid' + how + '. ' + L.mName(x.c, i.m) + ' workspaces are active', { fin: true });
    // the first invoice also opens preparation, if it is not open yet
    if (i.m === 1 && x.c.prep !== 'open') A['prep-start'].fn(x);
  } },
  'renew': { roles: ADMIN, client: true, fn(x) { const q = x.c.quote; q.renewed = true; x.log('Renewal confirmed for Months ' + (q.committed + 1) + ' to ' + q.months, { fin: true }); } },
  'ah-create': { roles: ADMIN, client: true, fn(x, p) {
    if (x.c.quote.status !== 'accepted') refuse('Accept the quotation before adding ad hoc invoices.');
    const base = p.sid ? (x.catalogue.find(s => s.id === p.sid) || refuse('That service is no longer in the catalogue.')) : null;
    const name = base ? base.name : str(p.name) || refuse('Choose a service or describe the custom item.');
    const amount = int(p.amount) || (base ? base.price : 0);
    if (amount <= 0) refuse('Enter the amount for this invoice.');
    const n = x.c.adhoc.length + 1, a = { id: x.c.id + '-a' + n, no: x.c.quote.no + '-A' + n, name, amount, status: 'pending', date: today(), s: null };
    if (base) {
      const s = L.clone(base); s.id = base.id + '-x' + n; s.price = amount; s.adhoc = a.id; a.s = s; x.c.extra.push(s);
      s.tasks.forEach((def, k) => x.c.tasks.push(L.newTask(a.id + '-t' + k, s.id, 0, def, a.id)));
    }
    x.c.adhoc.push(a);
    x.log('Ad hoc invoice ' + a.no + ' created for "' + name + '" (' + L.money(amount) + ')', { fin: true });
  } },
  'ah-sent': { roles: ADMIN, client: true, fn(x, p) { const a = L.adhocOf(x.c, p.id) || refuse('Invoice not found.'); if (a.status === 'pending') a.status = 'sent'; x.log('Invoice ' + a.no + ' (' + L.money(a.amount) + ') sent', { fin: true }); } },
  'ah-paid': { roles: ADMIN, client: true, fn(x, p) {
    const a = L.adhocOf(x.c, p.id) || refuse('Invoice not found.'); if (a.status === 'paid') refuse('This invoice is already paid.'); if (a.deposit && p.mode === 'deposit') refuse('Choose how the deposit was paid.'); const how = payWith(x, a, a.amount, p); x.log('Invoice ' + a.no + ' marked as paid' + how + (a.s ? '. The "' + L.short(a.s) + '" workspace is active' : ''), { fin: true });
    // a paid deposit opens preparation, so kick-off and set-up can start
    if (a.deposit && x.c.prep !== 'open') { A['prep-start'].fn(x); return { prepOpened: true }; }
  } },
  'dep-refund': { roles: ADMIN, client: true, fn(x, p) {
    const di = L.depositInv(x.c) || refuse('This project has no deposit.'); const bal = L.depBalance(x.c); if (bal <= 0) refuse('There is no deposit balance to refund.');
    const amount = int(p.amount); if (amount <= 0) refuse('Enter the amount refunded.'); if (amount > bal) refuse('The deposit balance is ' + L.money(bal) + '.');
    const date = isDate(str(p.date, 10)) ? str(p.date, 10) : isoToday(), mode = PAYMODE[p.mode] ? p.mode : 'bank';
    (di.uses = di.uses || []).push({ id: rid('u'), type: 'refund', amount, date, mode, note: str(p.note, 200), by: x.me.name, at: x.now });
    x.log('Refunded ' + L.money(amount) + ' of deposit ' + di.no + ' by ' + PAYMODE[mode] + ' on ' + date + (amount === bal ? '. The deposit is fully refunded' : '. Balance ' + L.money(bal - amount)), { fin: true });
    return { amount, bal: bal - amount };
  } },
  'dep-undo': { roles: ADMIN, client: true, fn(x, p) {
    const di = L.depositInv(x.c) || refuse('This project has no deposit.'), u = (di.uses || []).find(z => z.id === p.id) || refuse('That entry no longer exists.');
    if (u.type === 'utilise') { const t = x.c.invoices.find(i => i.no === u.inv) || x.c.adhoc.find(a => a.no === u.inv); if (t && t.status === 'paid') { t.status = t.pay && t.pay.prev === 'sent' ? 'sent' : 'pending'; t.pay = null; t.paidAt = ''; } }
    di.uses = di.uses.filter(z => z !== u); x.log('Undid ' + (u.type === 'refund' ? 'the refund of ' : 'using ') + L.money(u.amount) + ' of deposit ' + di.no + (u.type === 'utilise' ? ' for invoice ' + u.inv + ', which is unpaid again' : ''), { fin: true });
  } },
  't-submit': { roles: STAFF, client: true, fn(x, p) { const t = openTask(x, p.id); if (L.staged(t)) refuse('This task moves step by step. Complete the current step instead.'); if (t.owner !== 'gioia' || !t.approve) refuse('This task does not need approval.'); t.status = 'awaiting'; if (!t.assignee) t.assignee = x.me.id; hist(x, t, 'Submitted for client review'); x.log('Submitted "' + t.title + '" for client review'); } },
  't-done': { roles: STAFF, client: true, fn(x, p) { const t = openTask(x, p.id); if (L.staged(t)) { t.stages.forEach(s => { s.done = true; }); t.stage = t.stages.length; } t.status = 'done'; hist(x, t, t.owner === 'client' ? 'Marked as received' : 'Marked as completed'); x.log('Marked "' + t.title + '" as ' + (t.owner === 'client' ? 'received' : 'completed')); } },
  't-status': { roles: STAFF, client: true, fn(x, p) { const t = openTask(x, p.id); if (!L.statusOptions(t).includes(p.status)) refuse(L.staged(t) ? 'This task follows its steps. Change the current step instead.' : 'That status does not apply to this task.'); if (t.status === p.status) return; t.status = p.status; hist(x, t, 'Status changed to ' + L.STATUS[t.status]); x.log('Changed "' + t.title + '" to ' + L.STATUS[t.status]); } },
  't-due': { roles: STAFF, client: true, fn(x, p) { const t = task(x, p.id), d = str(p.due, 10); if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) refuse('That is not a valid date.'); t.due = d; x.log(d ? 'Set the due date for "' + t.title + '" to ' + d : 'Cleared the due date for "' + t.title + '"'); } },
  't-delete': { roles: ADMIN, client: true, fn(x, p) {
    const t = task(x, p.id), fees = x.fees.filter(f => f.taskId === t.id);
    if (fees.some(f => f.paid)) refuse('A fee for this task has already been paid out, so it cannot be deleted. Mark it done or rename it instead.');
    x.c.tasks = x.c.tasks.filter(z => z !== t);
    if (fees.length) { x.fees = x.fees.filter(f => f.taskId !== t.id); x.save.fees = true; }
    x.log('Deleted the task "' + t.title + '"' + (fees.length ? ' and its unpaid fee' + (fees.length > 1 ? 's' : '') : '') + '. Its files stay in the project\'s Files', { internal: true });
  } },
  /* new order for a set of tasks (one workspace and month): they swap places among themselves, everything else stays put */
  't-reorder': { roles: STAFF, client: true, fn(x, p) {
    const ids = (Array.isArray(p.ids) ? p.ids : []).map(String), set = new Set(ids);
    if (ids.length < 2 || set.size !== ids.length || !ids.every(id => x.c.tasks.some(t => t.id === id))) refuse('Those tasks have changed. Refresh and try again.');
    const slots = []; x.c.tasks.forEach((t, i) => { if (set.has(t.id)) slots.push(i); });
    const byId = Object.fromEntries(x.c.tasks.filter(t => set.has(t.id)).map(t => [t.id, t]));
    slots.forEach((slot, k) => { x.c.tasks[slot] = byId[ids[k]]; });
  } },
  't-rename': { roles: STAFF, client: true, fn(x, p) { const t = task(x, p.id), title = str(p.title, 160); if (!title) refuse('Enter the task name.'); if (title === t.title) return; const old = t.title; t.title = title; x.log('Renamed "' + old + '" to "' + title + '"', { internal: true, tid: t.id }); } },
  't-desc': { roles: STAFF, client: true, fn(x, p) { const t = task(x, p.id); t.desc = str(p.desc, 3000); } },
  'task-create': { roles: STAFF, client: true, fn(x, p) {
    if (p.svc === 'general') ensureGeneral(x.c);
    if (p.svc === 'prep' && x.c.prep !== 'open') refuse('Start preparation on this project first.');
    const s = L.ql(x.c, str(p.svc, 80)) || refuse('That workspace no longer exists.'), title = str(p.title, 160) || refuse('Give the task a name.');
    const m = s.adhoc || L.freeWs(s) ? 0 : s.billing === 'monthly' ? Math.min(x.c.quote.months, Math.max(1, int(p.m))) : 1, owner = p.owner === 'client' ? 'client' : 'gioia';
    const assignee = p.assignee ? (x.team.find(mm => mm.id === p.assignee) || refuse('That team member no longer exists.')).id : '';
    const d = str(p.due, 10); if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) refuse('That is not a valid due date.');
    const steps = L.toStages(str(p.steps, 4000), x.team);
    const t = L.newTask(x.c.id + '-n' + hex(4), s.id, m, [title, steps.length ? 'gioia' : owner, owner === 'gioia' && !!p.approve, steps], s.adhoc || '');
    Object.assign(t, { desc: str(p.desc, 3000), assignee: t.owner === 'gioia' ? assignee : '', due: d }); hist(x, t, 'Task added'); x.c.tasks.push(t); x.log('Added task "' + title + '"');
    return { id: t.id, svc: s.id, m };
  } },
  /* switch a task between the team and the client: "client" makes it the client's to send or do; a member id gives it to the team */
  't-owner': { roles: STAFF, client: true, fn(x, p) {
    const t = task(x, p.id); if (L.staged(t)) refuse('This task follows its steps, so who does it is set step by step. Open the task to change the steps.');
    if (p.owner === 'client') { if (t.owner === 'client') return; const prev = t.assignee; t.owner = 'client'; t.assignee = ''; if (t.status !== 'done') t.status = 'cdraft'; t.approve = false; x.log('"' + t.title + '" is now for the client to do', { tid: t.id }); return reassigned(x, t, null, prev, '', p.fee, 'the client'); }
    const m = p.assignee ? (x.team.find(z => z.id === p.assignee) || refuse('That team member no longer exists.')) : null;
    if (t.owner === 'client') { t.owner = 'gioia'; if (['cdraft', 'creview'].includes(t.status)) t.status = 'todo'; }
    t.assignee = m ? m.id : ''; x.log('"' + t.title + '" is now with the team' + (m ? ', assigned to ' + m.name : ''), { tid: t.id, to: m ? m.id : '' });
  } },
  't-assign': { roles: STAFF, client: true, fn(x, p) { const t = task(x, p.id), m = p.assignee ? (x.team.find(m => m.id === p.assignee) || refuse('That team member no longer exists.')) : null, prev = t.assignee; t.assignee = m ? m.id : ''; x.log(m ? 'Assigned "' + t.title + '" to ' + m.name : 'Unassigned "' + t.title + '"', { internal: true }); return reassigned(x, t, null, prev, t.assignee, p.fee); } },
  't-step': { roles: ALL, client: true, fn(x, p) {
    // Complete the current step and pass the task to whoever owns the next one.
    const t = openTask(x, p.id), s = L.curStage(t) || refuse('This task has no step waiting.'), text = str(p.text, 3000);
    if (x.staff ? s.owner !== 'gioia' : s.owner !== 'client') refuse(x.staff ? 'This step is with the client.' : 'This step is with the team.');
    if (!x.staff && s.kind === 'approve') refuse('Approve or request changes on this step.');
    if (text) t.comments.push({ id: rid('m'), key: x.me.key, by: x.staff ? x.me.name : 'Client', client: !x.staff, text, at: x.now });
    advance(x, t);
  } },
  't-stage-set': { roles: STAFF, client: true, fn(x, p) {
    const t = task(x, p.id); if (!L.staged(t)) refuse('This task has no steps.');
    const n = Math.max(0, Math.min(t.stages.length, int(p.stage))); t.stages.forEach((s, i) => { s.done = i < n; }); t.stage = n; t.status = 'todo'; L.syncStage(t);
    hist(x, t, n >= t.stages.length ? 'Moved to completed' : 'Moved to step ' + (n + 1) + ': ' + t.stages[n].title); x.log('Moved "' + t.title + '" to ' + (n >= t.stages.length ? 'Completed' : 'step ' + (n + 1) + ' of ' + t.stages.length));
  } },
  't-steps-set': { roles: STAFF, client: true, fn(x, p) {
    // Add, edit or remove the steps on any task. Steps already done stay done while their position still exists.
    const t = task(x, p.id), next = L.toStages(str(p.steps, 4000), x.team);
    if (!next.length) { if (!L.staged(t)) return; delete t.stages; delete t.stage; t.status = 'todo'; hist(x, t, 'Steps removed'); x.log('Removed the steps on "' + t.title + '"'); return; }
    if (t.owner === 'client') t.owner = 'gioia';
    const at = L.staged(t) ? Math.min(t.stage, next.length) : 0;
    next.forEach((s, i) => { s.done = i < at; const old = L.staged(t) && t.stages[i]; if (old && old.due) s.due = old.due; if (s.done && old && old.done) { s.by = old.by; s.at = old.at; } });
    t.stages = next; t.stage = at; t.approve = next.some(s => s.kind === 'approve'); if (!['progress', 'changes'].includes(t.status)) t.status = 'todo'; L.syncStage(t);
    hist(x, t, 'Steps updated (' + next.length + ')'); x.log('Updated the steps on "' + t.title + '" (' + next.length + ' steps)');
  } },
  't-stage-assign': { roles: STAFF, client: true, fn(x, p) {
    const t = task(x, p.id), s = stageAt(t, p.i); if (s.owner === 'client') refuse('That step is the client\'s.');
    const m = p.assignee ? member(x, p.assignee) : null, prev = s.assignee; s.assignee = m ? m.id : '';
    hist(x, t, 'Step ' + (int(p.i) + 1) + (m ? ' assigned to ' + m.name : ' unassigned'));
    x.reassign = reassigned(x, t, int(p.i), prev, s.assignee, p.fee); x.log(m ? 'Assigned step ' + (int(p.i) + 1) + ' of "' + t.title + '" to ' + m.name : 'Unassigned step ' + (int(p.i) + 1) + ' of "' + t.title + '"', { internal: true });
  } },
  't-stage-due': { roles: STAFF, client: true, fn(x, p) {
    const t = task(x, p.id), s = stageAt(t, p.i), d = str(p.due, 10); if (d && !isDate(d)) refuse('That is not a valid date.');
    s.due = d; x.log(d ? 'Step ' + (int(p.i) + 1) + ' of "' + t.title + '" is due ' + d : 'Cleared the due date on step ' + (int(p.i) + 1) + ' of "' + t.title + '"');
  } },
  't-value': { roles: ADMIN, client: true, fn(x, p) { const t = task(x, p.id); if (p.value === '' || p.value === null || p.value === undefined) delete t.value; else t.value = Math.max(0, int(p.value)); } },
  't-approve': { roles: ['client'], client: true, fn(x, p) {
    const t = openTask(x, p.id), text = str(p.text, 3000); if (t.status !== 'awaiting') refuse('This task is not waiting for approval.');
    if (text) t.comments.push({ id: rid('m'), key: x.me.key, by: 'Client', client: true, text, at: x.now });
    if (L.staged(t)) return advance(x, t, true);
    t.status = 'approved'; hist(x, t, 'Client approved'); x.log('Approved "' + t.title + '"');
  } },
  't-sent': { roles: ['client'], client: true, fn(x, p) { const t = openTask(x, p.id); if (L.staged(t)) refuse('Complete the current step instead.'); if (t.owner !== 'client' || !['cdraft', 'todo'].includes(t.status)) refuse('This item is not waiting on you.'); t.status = 'submitted'; hist(x, t, 'Client sent this'); x.log('Sent "' + t.title + '"'); } },
  't-changes': { roles: ['client'], client: true, fn(x, p) {
    const t = openTask(x, p.id), text = str(p.text, 3000) || refuse('Describe the change you need, then request it.');
    if (t.status !== 'awaiting') refuse('This task is not waiting for approval.');
    if (t.rounds >= 2) refuse('Both included revision rounds are used. Further changes are quoted separately.');
    t.rounds++; t.comments.push({ id: rid('m'), key: x.me.key, by: 'Client', client: true, text, at: x.now });
    if (L.staged(t)) { let i = t.stage - 1; while (i > 0 && t.stages[i].owner !== 'gioia') i--; t.stages.forEach((s, k) => { if (k >= i) s.done = false; }); t.stage = Math.max(0, i); }
    t.status = 'changes'; hist(x, t, 'Client requested changes' + (L.staged(t) ? ', back to step ' + (t.stage + 1) : ''));
    x.log('Requested changes on "' + t.title + '" (round ' + t.rounds + ' of 2)');
  } },
  't-comment': { roles: ALL, client: true, fn(x, p) { const t = x.staff ? task(x, p.id) : openTask(x, p.id), text = str(p.text, 3000) || refuse('Write a comment first.'), internal = x.staff && !!p.internal; t.comments.push(Object.assign({ id: rid('m'), key: x.me.key, by: x.staff ? x.me.name : 'Client', client: !x.staff, text, at: x.now }, internal ? { internal: true } : {})); x.log((internal ? 'Left a team-only comment on "' : 'Commented on "') + t.title + '"', internal ? { internal: true } : {}); } },
  't-comment-del': { roles: ALL, client: true, fn(x, p) {
    const t = x.staff ? task(x, p.id) : openTask(x, p.id), m = t.comments.find(z => z.id === p.cid) || refuse('That comment no longer exists.');
    const mine = m.key ? m.key === x.me.key : x.staff ? (!m.client && m.by === x.me.name) : m.client;
    if (!(x.me.role === 'admin' || mine)) refuse('You can only delete your own comments.');
    t.comments = t.comments.filter(z => z !== m); x.log('Deleted a comment on "' + t.title + '"', m.internal ? { internal: true } : {});
  } },
  'f-link': { roles: ALL, client: true, fn(x, p) {
    const url = str(p.url, 2000); if (!/^https?:\/\/\S+$/.test(url)) refuse('Paste the full link, starting with https://');
    const t = ['general', 'ws'].includes(p.key) ? null : (x.staff ? task(x, p.key) : openTask(x, p.key));
    const ws = p.key === 'ws' ? (L.ql(x.c, str(p.svc, 80)) || refuse('That workspace no longer exists.')) : null;
    const name = str(p.name, 120) || url.replace(/^https?:\/\//, '').slice(0, 50);
    const f = { folder: t ? L.short(L.ql(x.c, t.svc)) : ws ? L.short(ws) : 'General', name, url, by: x.staff ? x.me.name : 'Client', at: x.now };
    x.c.files.push(f); if (t) t.files.push(f);
    x.log('Shared a link, "' + name + '"' + (t ? ', on "' + t.title + '"' : ''));
  } },
  'f-add': { roles: ALL, client: true, fn(x, p) {
    // recorded after the server has put the file in Google Drive
    const t = ['general', 'ws'].includes(p.key) ? null : (x.staff ? task(x, p.key) : openTask(x, p.key));
    const ws = p.key === 'ws' ? (L.ql(x.c, str(p.svc, 80)) || refuse('That workspace no longer exists.')) : null;
    const id = str(p.fileId, 200) || refuse('The upload did not finish.'), name = str(p.name, 200) || 'File';
    const kb = Math.max(1, Math.round((+p.size || 0) / 1024)), size = kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
    const f = { folder: t ? L.short(L.ql(x.c, t.svc) || { name: 'General' }) : ws ? L.short(ws) : 'General', name, drive: id, mime: str(p.mime, 100), size, url: '/api/file/' + x.c.id + '/' + encodeURIComponent(id), by: x.staff ? x.me.name : 'Client', at: x.now };
    x.c.files.push(f); if (t) t.files.push(f);
    x.log('Uploaded "' + name + '"' + (t ? ' to "' + t.title + '"' : ''));
  } },
  'f-del': { roles: ALL, client: true, async fn(x, p) {
    // removes a file or link everywhere in the project; an uploaded file also goes to the shared drive's trash
    const k = str(p.key, 400), f = x.c.files.find(z => L.fkey(z) === k) || refuse('That file is no longer here.');
    const mine = x.staff ? f.by === x.me.name : f.by === 'Client';
    if (!(x.me.role === 'admin' || mine)) refuse('Only the person who added it can delete this file.');
    x.c.files = x.c.files.filter(z => L.fkey(z) !== k); x.c.tasks.forEach(t => { t.files = (t.files || []).filter(z => L.fkey(z) !== k); });
    if (f.drive && CFG.drive && CFG.drive.trash) { try { await CFG.drive.trash(f.drive); } catch (e) { /* already gone from Drive */ } }
    x.log('Deleted "' + f.name + '"', { internal: !x.staff ? false : true });
  } },
  'email-pref': { roles: ALL, async fn(x, p) { const off = await getKV(x.cl, 'emailOff', {}), k = x.me.role === 'client' ? 'c:' + x.me.aid : 'm:' + x.me.id; if (p.on) delete off[k]; else off[k] = true; await setKV(x.cl, 'emailOff', off); } },
  'mail-test': { roles: ADMIN, fn(x) { x.testMail = true; } },
  'invite-send': { roles: ADMIN, client: true, fn(x) { if (!x.c.email) refuse('Add the client\'s Google email first.'); x.inviteMail = true; x.log('Sent the portal invite to ' + x.c.email, { internal: true }); } },
  'rn-save': { roles: ADMIN, client: true, async fn(x, p) {
    // Prepare a renewal: more months, with this project's services (prices can change), discounts and a note. Send it as a proposal, or extend straight away.
    const q = x.c.quote, d = p.r || {}, then = ['draft', 'sent', 'extend'].includes(p.then) ? p.then : 'draft';
    if (q.status !== 'accepted') refuse('Only an accepted project can be renewed.');
    q.renewals = q.renewals || [];
    let r = d.id ? q.renewals.find(z => z.id === d.id) || refuse('That renewal no longer exists.') : null;
    if (r && r.status === 'accepted') refuse('That renewal is already accepted.');
    if (!r && q.renewals.some(z => ['draft', 'sent', 'changes'].includes(z.status))) refuse('There is already a renewal in progress. Open it to edit.');
    const months = Math.min(24, Math.max(1, int(d.months) || 1));
    const lines = (Array.isArray(d.lines) ? d.lines : []).map(l => { const base = (r && r.lines.find(s => s.id === l.id)) || L.ql(x.c, String(l.id)) || x.catalogue.find(s => s.id === l.id); if (!base) return null; const s = L.clone(base); s.price = Math.max(0, int(l.price)); return s; }).filter(Boolean);
    if (!lines.length) refuse('Choose at least one service to continue with.');
    const no = cleanNo(d.no) || (q.no + '-R' + (q.renewals.length + (r ? 0 : 1)));
    const hit = await numberTaken(x.cl, no, r ? 'r:' + x.c.id + ':' + r.id : ''); if (hit) refuse(no + ' is already used by ' + hit + '.');
    const rec = { no, date: today(), months, lines, discounts: L.cleanDiscounts(d.discounts, months, lines.map(s => s.id)).map(z => Object.assign(z, { id: z.id || rid('d') })), welcome: str(d.welcome, 3000) };
    if (!r) { r = Object.assign({ id: rid('r'), status: 'draft', version: 1, responses: [] }, rec); q.renewals.push(r); } else Object.assign(r, rec);
    if (then === 'sent') { if (['changes', 'declined'].includes(r.status)) r.version = (r.version || 1) + 1; r.status = 'sent'; r.sentAt = x.now; x.log('Renewal proposal ' + r.no + ' sent: ' + months + ' more month' + (months === 1 ? '' : 's') + ' from ' + L.mName(x.c, q.months + 1), { fin: true }); }
    else if (then === 'extend') { applyRenewal(x, r, { name: x.me.name, how: 'Extended by ' + x.me.name + ' without a proposal' }); }
    return { id: r.id };
  } },
  'rn-delete': { roles: ADMIN, client: true, fn(x, p) { const q = x.c.quote, r = L.renewals(x.c).find(z => z.id === p.id) || refuse('That renewal no longer exists.'); if (r.status === 'accepted') refuse('An accepted renewal can\'t be deleted.'); q.renewals = q.renewals.filter(z => z !== r); x.log('Renewal ' + r.no + ' deleted', { fin: true }); } },
  'rn-respond': { roles: ['client'], client: true, async fn(x, p) {
    const r = L.renewals(x.c).find(z => z.id === p.id) || refuse('That renewal is no longer available.'), text = str(p.text, 2000), d = p.decision, by = x.c.contact || 'Client';
    if (r.status !== 'sent') refuse(r.status === 'accepted' ? 'This renewal is already accepted.' : 'This renewal is not open for a response. We will send you an updated one.');
    const hist = o => (r.responses = r.responses || []).push(Object.assign({ version: r.version || 1, by, at: x.now }, o));
    if (d === 'accept') { if (!p.agree) refuse('Tick the box to confirm you agree to the terms.'); const name = str(p.name, 120); if (name.length < 2) refuse('Type your full name to accept.'); hist({ type: 'accepted', text: 'Signed "' + name + '"' }); applyRenewal(x, r, { name, email: x.me.email, how: 'Accepted in the portal by ' + name, terms: str((await getKV(x.cl, 'brand', DEFAULT_BRAND)).terms, 30000) }); }
    else if (d === 'changes') { if (!text) refuse('Tell us what you would like changed.'); r.status = 'changes'; hist({ type: 'changes', text }); x.log('Asked for changes to renewal ' + r.no + ': "' + text + '"'); }
    else if (d === 'decline') { r.status = 'declined'; hist({ type: 'declined', text }); x.log('Declined renewal ' + r.no + (text ? ': "' + text + '"' : '')); }
    else refuse('Choose accept, request changes or decline.');
  } },
  'q-respond': { roles: ['client'], client: true, async fn(x, p) {
    // The client answers a proposal in the portal: accept (agreeing to the terms, with their typed name), ask for changes, or decline.
    const q = x.c.quote, text = str(p.text, 2000), d = p.decision, by = x.c.contact || 'Client';
    if (q.status !== 'sent') refuse(q.status === 'accepted' ? 'This proposal is already accepted.' : 'This proposal is not open for a response. We will send you an updated one.');
    const hist = o => (q.responses = q.responses || []).push(Object.assign({ version: q.version || 1, by, at: x.now }, o));
    if (d === 'accept') {
      if (!p.agree) refuse('Tick the box to confirm you agree to the terms.');
      const name = str(p.name, 120); if (name.length < 2) refuse('Type your full name to accept.');
      const terms = str((await getKV(x.cl, 'brand', DEFAULT_BRAND)).terms, 30000);
      L.acceptQuote(x.c, x.invFormat); q.acceptedBy = { name, email: x.me.email, at: x.now, terms }; hist({ type: 'accepted', text: 'Signed "' + name + '"' + (terms ? ', agreeing to the Terms and Conditions' : '') });
      x.log('Accepted proposal ' + q.no + ' in the portal, signed "' + name + '". ' + q.months + ' invoices created');
    } else if (d === 'changes') {
      if (!text) refuse('Tell us what you would like changed.');
      q.status = 'changes'; hist({ type: 'changes', text }); x.log('Asked for changes to proposal ' + q.no + ': "' + text + '"');
    } else if (d === 'decline') { q.status = 'declined'; hist({ type: 'declined', text }); x.log('Declined proposal ' + q.no + (text ? ': "' + text + '"' : '')); }
    else refuse('Choose accept, request changes or decline.');
  } },
  'project-create': { roles: ADMIN, async fn(x, p) {
    // The New project form: client, quotation, tasks for every month, team fees and a welcome note, created in one go.
    const w = p.w || {}, k = w.client || {}, then = p.then === 'sent' ? 'sent' : 'draft';
    let a, next = await getKV(x.cl, 'nextQuote', 1001);
    if (w.aid && w.aid !== 'new') {
      a = await getAccount(x.cl, str(w.aid, 60)) || refuse('That client no longer exists.');
      if (k.email !== undefined && !a.email && str(k.email)) a.email = str(k.email).toLowerCase();
    } else {
      const company = str(k.company) || refuse('Enter the company name (screen 1).'), email = str(k.email).toLowerCase();
      if (email && (await allAccounts(x.cl)).some(o => o.email === email)) refuse('Another client already signs in with ' + email + '. Choose that client on screen 1 instead.');
      a = makeAccount({ company, contact: str(k.contact), email, phone: str(k.phone), website: str(k.website) });
    }
    const name = str(w.name, 120) || refuse('Name the project (screen 2).'), no = cleanNo(w.no) || String(next);
    const hit = await numberTaken(x.cl, no, ''); if (hit) refuse('Quotation number ' + no + ' is already used by ' + hit + ' (screen 2).');
    const ids = (Array.isArray(w.ids) ? w.ids : []).map(String);
    // services made just for this project: they live in this quotation only, not in the catalogue
    const own = (Array.isArray(w.custom) ? w.custom : []).filter(s => /^p-/.test(String(s.id))).map(s => ({ id: str(s.id, 40), name: str(s.name, 120) || refuse('A new service needs a name (screen 2).'), price: Math.max(0, int(s.price)), billing: s.billing === 'once' ? 'once' : 'monthly', note: '', bullets: (Array.isArray(s.bullets) ? s.bullets : []).map(b => str(b)).filter(Boolean).slice(0, 12), tasks: [] }));
    const cat = ids.map(id => x.catalogue.find(s => s.id === id) || own.find(s => s.id === id)).filter(Boolean);
    if (!cat.length) refuse('Choose at least one service (screen 2).');
    const c = syncAccount(makeClient({ name }, no), a), q = c.quote;
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(w.start)) q.start = w.start;
    q.months = Math.min(24, Math.max(1, int(w.months) || 1)); q.committed = q.months; q.renewed = true; q.discount = 0; q.welcome = str(w.welcome, 3000);
    q.discounts = L.cleanDiscounts(w.discounts, q.months, ids).map(d => Object.assign(d, { id: d.id || rid('d') })); q.deposit = L.cleanDeposit(w.deposit);
    const team = id => id ? (x.team.find(m => m.id === id) || refuse('A task is assigned to someone no longer on the team.')).id : '';
    const def = t => { const steps = L.parseSteps(str(t.steps, 4000), x.team), owner = steps.length ? 'gioia' : t.owner === 'client' ? 'client' : 'gioia', who = owner === 'gioia' ? team(t.assignee) : '', fee = Math.max(0, int(t.fee));
      if (fee && !who) refuse('"' + str(t.title, 160) + '" has a fee of ' + L.money(fee) + ' but no one assigned (screen 3).');
      return [str(t.title, 160), owner, owner === 'gioia' && (steps.length ? steps.some(z => z[2] === 'approve') : t.approve !== false), steps, { assignee: who, dueDay: Math.min(31, Math.max(0, int(t.dueDay))), fee: who ? fee : 0 }]; };
    const tasks = Array.isArray(w.tasks) ? w.tasks.filter(t => str(t.title)) : [];
    q.lines = cat.map(s => Object.assign(L.clone(s), { tasks: tasks.filter(t => t.svc === s.id).map(def) }));
    let general = 0;
    tasks.filter(t => t.svc === 'general').forEach(t => { ensureGeneral(c); const d = def(t), nt = L.newTask(c.id + '-n' + hex(4), 'general', 0, d); nt.assignee = d[4].assignee; if (d[4].fee) nt.feeDraft = { member: d[4].assignee, amount: d[4].fee }; c.tasks.push(nt); general++; });
    // team fees
    const fees = [];
    for (const f of Array.isArray(w.fees) ? w.fees : []) {
      if (!f.member) continue;
      const m = x.team.find(z => z.id === f.member) || refuse('A fee is for someone no longer on the team.');
      if (f.svc === '__item') { const amt = int(f.amount), item = str(f.item, 120) || refuse('Name the one-off item for ' + m.name + '\'s fee (screen 4).'); if (amt <= 0) refuse('Enter the amount for ' + m.name + '\'s fee (screen 4).'); fees.push({ kind: 'item', member: m.id, item, amount: amt, m: 0, svc: '' }); continue; }
      const s = q.lines.find(z => z.id === f.svc) || refuse('A fee is for a service that is not in this quotation (screen 4).');
      const pct = f.type === 'pct' ? Math.min(100, Math.max(0, Number(f.pct) || 0)) : 0, amt = pct ? Math.round(s.price * pct / 100) : int(f.amount);
      if (amt <= 0) refuse('Enter the amount for ' + m.name + '\'s fee on ' + L.short(s) + ' (screen 4).');
      (s.billing === 'monthly' ? Array.from({ length: q.months }, (_, i) => i + 1) : [0]).forEach(mm => fees.push({ kind: 'month', member: m.id, svc: s.id, m: mm, rule: f.rule === 'all' ? 'all' : 'prorata', amount: amt, pct, base: pct ? s.price : 0, item: '' }));
    }
    await saveAccount(x.cl, a);
    if (no === String(next) || (/^\d+$/.test(no) && +no >= next)) await setKV(x.cl, 'nextQuote', (/^\d+$/.test(no) ? Math.max(+no, next) : next) + 1);
    fees.forEach(f => { const rec = Object.assign({ id: rid('f'), cid: c.id, taskId: '', stage: null, note: '', paid: 0, notified: 0, created: x.now, rule: 'prorata', pct: 0, base: 0 }, f); x.fees.push(rec); });
    if (fees.length) { x.save.fees = true; [...new Set(fees.map(f => f.member))].forEach(id => x.log('Assigned you fees on the new project "' + name + '" for ' + a.company, { internal: true, priv: id, cid: c.id })); }
    if (then === 'sent') { q.status = 'sent'; q.version = 1; }
    x.c = c;
    x.log('New project "' + name + '" for ' + a.company + ': quotation ' + no + (then === 'sent' ? ' sent to the portal' : ' saved as a draft') + ', ' + tasks.length + ' tasks' + (fees.length ? ', team fees set' : ''), { internal: true });
    return { cid: c.id };
  } },
  'q-save': { roles: ADMIN, async fn(x, p) {
    // Saves a quotation: for a project being drafted, a new project on an existing client, or a brand new client.
    const q = p.q || {}, then = ['draft', 'sent', 'accept'].includes(p.then) ? p.then : 'draft';
    const ids = (Array.isArray(q.ids) ? q.ids : []).map(String), no = cleanNo(p.no);
    let next = await getKV(x.cl, 'nextQuote', 1001);
    if (p.cid && p.cid !== 'new') x.c = await getClient(x.cl, str(p.cid, 60)) || refuse('That project no longer exists.');
    else {
      let a;
      if (!p.aid || p.aid === 'new') {
        const k = p.client || {}, company = str(k.company) || refuse('Enter the company name.'), email = str(k.email).toLowerCase();
        if (email && (await allAccounts(x.cl)).some(o => o.email === email)) refuse('Another client already signs in with ' + email + '. Choose that client instead.');
        a = makeAccount({ company, contact: str(k.contact), email, website: str(k.website) }); await saveAccount(x.cl, a);
        x.log('Client account created for ' + company, { internal: true, cid: 'a:' + a.id });
      } else a = await getAccount(x.cl, str(p.aid, 60)) || refuse('That client no longer exists.');
      x.c = syncAccount(makeClient({ name: str(p.name, 120) || refuse('Name the project, for example "2027 Website Redesign".') }, no || next), a);
      if (!no || no === String(next)) await setKV(x.cl, 'nextQuote', next + 1);
      x.log('New project "' + x.c.name + '" for ' + a.company, { internal: true });
    }
    const cq = x.c.quote; if (['accepted', 'cancelled'].includes(cq.status)) refuse('This quotation is already ' + cq.status + '.');
    if (p.name !== undefined && str(p.name, 120)) x.c.name = str(p.name, 120);
    if (no && no !== cq.no) {
      if (cq.status !== 'pending' && !p.override) refuse('Quotation ' + cq.no + ' has already been sent. Tick "Change it anyway" to change its number.');
      const hit = await numberTaken(x.cl, no, 'q:' + x.c.id); if (hit) refuse(no + ' is already used by ' + hit + '.');
      if (cq.status !== 'pending') x.log('Quotation number changed from ' + cq.no + ' to ' + no + ' after it was sent', { fin: true });
      cq.no = no;
    } else if (no) { const hit = await numberTaken(x.cl, no, 'q:' + x.c.id); if (hit) refuse(no + ' is already used by ' + hit + '.'); }
    if (/^\d+$/.test(cq.no) && +cq.no >= next && cq.no !== String(next)) await setKV(x.cl, 'nextQuote', +cq.no + 1);
    // keep this project's own copy of each service (its tasks, assignees and fees); only newly added services come from the catalogue
    cq.lines = ids.map(id => cq.lines.find(s => s.id === id) || L.clone(x.catalogue.find(s => s.id === id) || {})).filter(s => s.id);
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(q.start)) cq.start = q.start;
    cq.months = Math.min(24, Math.max(1, int(q.months) || 1)); cq.committed = cq.months; cq.renewed = true; cq.discount = 0;
    cq.discounts = L.cleanDiscounts(q.discounts, cq.months, ids).map(d => Object.assign(d, { id: d.id || rid('d') })); if (q.deposit !== undefined) cq.deposit = L.cleanDeposit(q.deposit);
    if (p.welcome !== undefined) cq.welcome = str(p.welcome, 3000);
    if (then !== 'draft' && !cq.lines.length) refuse('Add at least one service first.');
    if (then === 'sent') { const again = ['changes', 'declined'].includes(cq.status); if (again) cq.version = (cq.version || 1) + 1; else cq.version = cq.version || 1; cq.status = 'sent'; x.log(again ? 'Updated proposal ' + cq.no + ' (version ' + cq.version + ') sent' : 'Quotation ' + cq.no + ' sent', { fin: true }); }
    if (then === 'accept') { L.acceptQuote(x.c, x.invFormat); x.log('Quotation ' + cq.no + ' accepted. ' + cq.months + ' monthly invoices created', { fin: true }); }
    return { cid: x.c.id };
  } },
  'fee-save': { roles: ADMIN, async fn(x, p) {
    const d = p.fee || {}, m = x.team.find(mm => mm.id === d.member) || refuse('Choose the team member.');
    const kind = ['month', 'task', 'item'].includes(d.kind) ? d.kind : 'month';
    const c = await getClient(x.cl, str(d.cid, 60)) || refuse('Choose the project.');
    let s = null, t = null, stage = null, item = '', month = 0;
    if (kind === 'month') { s = L.ql(c, str(d.svc, 80)) || refuse('Choose the service.'); month = s.billing === 'monthly' && !s.adhoc ? Math.min(c.quote.months, Math.max(1, int(d.m) || 1)) : 0; }
    if (kind === 'task') { t = c.tasks.find(z => z.id === d.taskId) || refuse('Choose the task.'); if (d.stage !== '' && d.stage !== null && d.stage !== undefined) { stageAt(t, d.stage); stage = int(d.stage); } }
    if (kind === 'item') item = str(d.item, 120) || refuse('Name the item.');
    const pct = kind === 'month' && d.type === 'pct' ? Math.min(100, Math.max(0, Number(d.pct) || 0)) : 0, base = s ? L.feeBase(c, s) : 0;
    const amount = pct ? Math.round(base * pct / 100) : Math.floor(Number(d.amount) || 0); if (!(amount > 0)) refuse(pct ? 'Enter the percentage.' : 'Enter the fee amount.');
    const rec = { kind, member: m.id, cid: c.id, svc: s ? s.id : '', m: month, taskId: t ? t.id : '', stage, item, rule: d.rule === 'all' ? 'all' : 'prorata', amount, pct, base: pct ? base : 0, note: str(d.note, 300) };
    if (d.id) {
      const f = x.fees.find(ff => ff.id === d.id) || refuse('That fee no longer exists.');
      if ((f.paid || 0) > amount) refuse(L.money(f.paid) + ' of this fee has been paid already, so it can\'t go below that.');
      if (f.member !== m.id && f.paid) refuse('Part of this fee has been paid to ' + (x.team.find(z => z.id === f.member) || {}).name + '. Undo that payout before changing who it is for.');
      Object.assign(f, rec); x.save.fees = true; return;
    }
    const months = kind === 'month' && month && d.repeat ? Array.from({ length: c.quote.months - month + 1 }, (_, i) => month + i) : [month];
    months.forEach(mm => { const f = Object.assign({ id: rid('f'), paid: 0, notified: 0, created: x.now }, rec, { m: mm }); x.fees.push(f); x.log('Assigned you a fee of ' + L.money(amount) + ' for ' + feeLabel(c, f), { internal: true, priv: m.id, cid: c.id }); });
    x.save.fees = true; return { count: months.length, who: m.name, amount, label: feeLabel(c, Object.assign({}, rec, { m: months[0] })), project: c.company + ', ' + c.name };
  } },
  'fee-del': { roles: ADMIN, fn(x, p) { const f = x.fees.find(ff => ff.id === p.id) || refuse('That fee no longer exists.'); if (f.paid) refuse('Part of this fee has been paid. Undo that payout first.'); x.fees = x.fees.filter(ff => ff.id !== p.id); x.save.fees = true; } },
  'payout-create': { roles: ADMIN, async fn(x, p) {
    // Pays everything a person has earned and not yet been paid, on the date the admin enters.
    const m = member(x, p.member), date = str(p.date, 10); if (!isDate(date)) refuse('Enter the payment date.');
    const only = Array.isArray(p.feeIds) ? p.feeIds.map(String) : null, cache = {}, lines = [];
    for (const f of x.fees.filter(z => z.member === m.id && (!only || only.includes(z.id)))) {
      const c = cache[f.cid] || (cache[f.cid] = await getClient(x.cl, f.cid)), owed = L.feeOwed(c, f);
      if (owed > 0) { lines.push({ feeId: f.id, amount: owed, label: (c ? c.company + ' · ' : '') + feeLabel(c, f) }); f.paid = (f.paid || 0) + owed; }
    }
    if (!lines.length) refuse(m.name + ' has nothing owing right now.');
    const total = lines.reduce((a, l) => a + l.amount, 0), payouts = await getKV(x.cl, 'payouts', []);
    payouts.push(Object.assign({ id: rid('p'), member: m.id, date, lines, total, note: str(p.note, 300), by: x.me.name, at: x.now }, p.invoiceNo || p.fileId ? { invoiceNo: str(p.invoiceNo, 60), invoiceDate: isDate(str(p.invoiceDate, 10)) ? str(p.invoiceDate, 10) : '', file: str(p.fileId, 200), fileName: str(p.fileName, 200) } : {}));
    await setKV(x.cl, 'payouts', payouts); x.save.fees = true;
    x.log('Paid you ' + L.money(total) + ' on ' + date + ' for ' + lines.length + ' fee' + (lines.length === 1 ? '' : 's'), { internal: true, priv: m.id, cid: '' });
    return { total };
  } },
  'payout-del': { roles: ADMIN, async fn(x, p) {
    const payouts = await getKV(x.cl, 'payouts', []), po = payouts.find(z => z.id === p.id) || refuse('That payment no longer exists.');
    po.lines.forEach(l => { const f = x.fees.find(z => z.id === l.feeId); if (f) f.paid = Math.max(0, (f.paid || 0) - l.amount); });
    await setKV(x.cl, 'payouts', payouts.filter(z => z.id !== po.id)); x.save.fees = true;
    x.log('Removed the payment of ' + L.money(po.total) + ' dated ' + po.date + '. Those fees are owing again', { internal: true, priv: po.member, cid: '' });
  } },
  'svc-save': { roles: ADMIN, fn(x, p) {
    const d = p.svc || {}, name = str(d.name) || refuse('Give the service a name.');
    const s = { id: str(d.id, 40) || rid('s'), name, price: Math.max(0, int(d.price)), billing: d.billing === 'once' ? 'once' : 'monthly', note: str(d.note),
      bullets: (Array.isArray(d.bullets) ? d.bullets : []).map(b => str(b)).filter(Boolean).slice(0, 12),
      prep: (Array.isArray(d.prep) ? d.prep : []).map(t => [str(t[0], 160), t[1] === 'client' ? 'client' : 'gioia', false]).filter(t => t[0]).slice(0, 30),
      tasks: (Array.isArray(d.tasks) ? d.tasks : []).map(t => { const st = L.parseSteps(Array.isArray(t[3]) ? L.stepsText(t[3]) : str(t[3], 4000)); return st.length ? [str(t[0], 160), 'gioia', st.some(z => z[2] === 'approve'), st] : [str(t[0], 160), t[1] === 'client' ? 'client' : 'gioia', !!t[2] && t[1] !== 'client']; }).filter(t => t[0]).slice(0, 40) };
    const i = x.catalogue.findIndex(c => c.id === s.id);
    if (i >= 0) x.catalogue[i] = s; else x.catalogue.push(s);
    x.save.catalogue = true; return { id: s.id };
  } },
  'svc-delete': { roles: ADMIN, fn(x, p) { x.catalogue = x.catalogue.filter(s => s.id !== p.id); x.save.catalogue = true; } },
  'team-add': { roles: ADMIN, fn(x, p) {
    const name = str(p.name, 80), email = str(p.email, 200).toLowerCase();
    if (!name) refuse('Enter the name.');
    if (email && !/^\S+@\S+\.\S+$/.test(email)) refuse('That does not look like an email address.');
    if (email && x.team.some(m => m.email === email)) refuse('That email is already on the team.');
    const role = ['admin', 'team', 'vendor'].includes(p.role) ? p.role : p.admin ? 'admin' : 'team';
    const rec = { id: rid('m'), name, email, admin: role === 'admin' }; if (role === 'vendor') rec.kind = 'vendor';
    ['company', 'phone', 'what', 'pay'].forEach(k => { const v = str(p[k], k === 'pay' ? 500 : 160); if (v) rec[k] = v; });
    x.team.push(rec); x.save.team = true;
    if (email && p.welcome !== false) x.teamMail = rec;
    return { id: rec.id, welcomed: !!x.teamMail };
  } },
  'team-welcome': { roles: ADMIN, fn(x, p) { const m = member(x, p.id); if (!m.email) refuse('Add their Google email first.'); x.teamMail = m; x.log('Sent the welcome email to ' + m.name, { internal: true, cid: '' }); } },
  'team-update': { roles: ADMIN, fn(x, p) {
    const m = x.team.find(m => m.id === p.id) || refuse('That team member no longer exists.');
    if (p.name !== undefined) m.name = str(p.name, 80) || m.name;
    if (p.role !== undefined || p.admin !== undefined) {
      const role = ['admin', 'team', 'vendor'].includes(p.role) ? p.role : p.admin ? 'admin' : 'team', admin = role === 'admin', was = m.admin ? 'admin' : m.kind === 'vendor' ? 'vendor' : 'team';
      if (m.id === x.me.id && role !== 'admin') refuse('You cannot remove your own admin access. Ask another admin to change it.');
      if (!admin && !x.team.some(o => o.id !== m.id && o.admin)) refuse('There must always be at least one admin.');
      if (role !== was) { m.admin = admin; if (role === 'vendor') m.kind = 'vendor'; else delete m.kind; x.log(m.name + ' is now ' + (admin ? 'an admin' : role === 'vendor' ? 'a vendor' : 'a team member'), { internal: true, cid: '' }); }
    }
    ['company', 'phone', 'what', 'pay'].forEach(k => { if (p[k] !== undefined) m[k] = str(p[k], k === 'pay' ? 500 : 160); });
    if (p.email !== undefined) { const email = str(p.email, 200).toLowerCase(); if (email && x.team.some(o => o.id !== m.id && o.email === email)) refuse('That email is already on the team.'); if (m.id === x.me.id && email !== m.email) refuse('You cannot change your own sign-in email here.'); if (email && !/^\S+@\S+\.\S+$/.test(email)) refuse('That does not look like an email address.'); m.email = email; }
    x.save.team = true;
  } },
  'team-del': { roles: ADMIN, async fn(x, p) {
    if (p.id === x.me.id) refuse('You cannot remove yourself.');
    x.team = x.team.filter(m => m.id !== p.id); x.save.team = true;
    const rows = (await x.cl.query('select v from clients')).rows;
    for (const r of rows) { let hit = false; r.v.tasks.forEach(t => { if (t.assignee === p.id) { t.assignee = ''; hit = true; } (t.stages || []).forEach(st => { if (st.assignee === p.id) { st.assignee = ''; hit = true; } }); }); if (hit) await saveClient(x.cl, r.v); }
  } },
  'import-preview': { roles: ADMIN, fn(x, p) { return applyPlan(x, p.plan, true); } },
  'import-create': { roles: ADMIN, fn(x, p) { return applyPlan(x, p.plan, false); } },
  'brand-save': { roles: ADMIN, async fn(x, p) {
    const b = p.brand || {}, old = await getKV(x.cl, 'brand', DEFAULT_BRAND), pay = {};
    ['fast', 'meps', 'acct', 'bank', 'swift', 'baddr', 'uen', 'note'].forEach(k => { pay[k] = str((b.pay || {})[k] !== undefined ? b.pay[k] : (old.pay || {})[k], 300); });
    let qr = old.qr || '';
    if (b.qr !== undefined) { qr = str(b.qr, 200000); if (qr && !/^data:image\/(png|jpeg|webp);base64,/.test(qr)) refuse('The QR code must be a PNG or JPG image.'); }
    await setKV(x.cl, 'brand', { mark: str(b.mark, 40) || 'CLIENT DESK', tagline: str(b.tagline, 80), company: str(b.company, 120), address: str(b.address, 400), terms: str(b.terms, 30000), welcome: str(b.welcome, 3000), pay, qr });
  } },
  /* preparation templates: a named list of set-up tasks to drop into a project's Preparation workspace */
  'ptpl-save': { roles: STAFF, async fn(x, p) {
    const list = await getKV(x.cl, 'prepTemplates', []), name = str(p.name, 80) || refuse('Give the template a name.');
    const tasks = (Array.isArray(p.tasks) ? p.tasks : []).map(t => ({ title: str(t.title, 160), owner: t.owner === 'client' ? 'client' : 'gioia', steps: L.stepsText(L.toStages(str(t.steps, 4000), x.team), x.team) })).filter(t => t.title).slice(0, 60);
    if (!tasks.length) refuse('Add at least one task.');
    if (list.some(t => t.id !== p.id && t.name.toLowerCase() === name.toLowerCase())) refuse('There is already a template called "' + name + '".');
    const rec = { name, tasks, at: x.now };
    if (p.id) { const t = list.find(z => z.id === p.id) || refuse('That template no longer exists.'); Object.assign(t, rec, { editedBy: x.me.name }); }
    else list.push(Object.assign({ id: rid('pt'), by: x.me.id, byName: x.me.name }, rec));
    await setKV(x.cl, 'prepTemplates', list);
  } },
  'ptpl-delete': { roles: STAFF, async fn(x, p) {
    const list = await getKV(x.cl, 'prepTemplates', []), t = list.find(z => z.id === p.id) || refuse('That template no longer exists.');
    if (x.me.role !== 'admin' && t.by !== x.me.id) refuse('Only ' + t.byName + ' can delete this template.');
    await setKV(x.cl, 'prepTemplates', list.filter(z => z !== t));
  } },
  'ptpl-apply': { roles: ADMIN, client: true, async fn(x, p) {
    const t = (await getKV(x.cl, 'prepTemplates', [])).find(z => z.id === p.id) || refuse('That template no longer exists.');
    ensurePrep(x.c); const have = new Set(x.c.tasks.filter(z => z.svc === 'prep').map(z => z.title.toLowerCase())); let n = 0;
    t.tasks.forEach(d => { if (have.has(d.title.toLowerCase())) return; const k = L.newTask(x.c.id + '-p' + hex(4), 'prep', 0, [d.title, d.owner, false]), st = L.toStages(d.steps || '', x.team);
      if (st.length) { k.stages = st; k.stage = 0; k.owner = 'gioia'; k.approve = st.some(s => s.kind === 'approve'); L.syncStage(k); }
      x.c.tasks.push(k); n++; });
    x.c.prepSeeded = true;
    if (p.start && x.c.prep !== 'open') { x.c.prep = 'open'; }
    x.log('Added ' + n + ' preparation task' + (n === 1 ? '' : 's') + ' from the "' + t.name + '" template' + (n < t.tasks.length ? ' (' + (t.tasks.length - n) + ' already there)' : '') + (p.start ? '. Preparation is open' : ''));
    return { n, started: !!p.start };
  } },
  'ptpl-from-project': { roles: ADMIN, client: true, async fn(x, p) {
    const list = await getKV(x.cl, 'prepTemplates', []), name = str(p.name, 80) || refuse('Give the template a name.');
    if (list.some(t => t.name.toLowerCase() === name.toLowerCase())) refuse('There is already a template called "' + name + '".');
    const tasks = x.c.tasks.filter(t => t.svc === 'prep').map(t => ({ title: t.title, owner: L.staged(t) ? 'gioia' : t.owner, steps: L.staged(t) ? L.stepsText(t.stages, x.team) : '' }));
    if (!tasks.length) refuse('This project has no preparation tasks yet.');
    list.push({ id: rid('pt'), by: x.me.id, byName: x.me.name, name, tasks, at: x.now }); await setKV(x.cl, 'prepTemplates', list);
    x.log('Saved the preparation tasks as the template "' + name + '"', { internal: true });
  } },
  'tpl-save': { roles: STAFF, async fn(x, p) {
    // Named step flows that everyone on the team can reuse, add and edit. Deleting stays with whoever made one (and admins).
    const list = await getKV(x.cl, 'stepTemplates', []), name = str(p.name, 80) || refuse('Give the template a name.');
    const steps = L.toStages(str(p.steps, 4000), x.team); if (!steps.length) refuse('Add at least one step.');
    if (list.some(t => t.id !== p.id && t.name.toLowerCase() === name.toLowerCase())) refuse('There is already a template called "' + name + '".');
    const rec = { name, steps: L.stepsText(steps, x.team), count: steps.length, at: x.now };
    if (p.id) { const t = list.find(z => z.id === p.id) || refuse('That template no longer exists.'); Object.assign(t, rec, { editedBy: x.me.name }); }
    else list.push(Object.assign({ id: rid('t'), by: x.me.id, byName: x.me.name }, rec));
    await setKV(x.cl, 'stepTemplates', list); x.log((p.id ? 'Updated' : 'Saved') + ' the step template "' + name + '"', { internal: true, cid: '' });
  } },
  'tpl-delete': { roles: STAFF, async fn(x, p) {
    const list = await getKV(x.cl, 'stepTemplates', []), t = list.find(z => z.id === p.id) || refuse('That template no longer exists.');
    if (x.me.role !== 'admin' && t.by !== x.me.id) refuse('Only ' + t.byName + ' can delete this template.');
    await setKV(x.cl, 'stepTemplates', list.filter(z => z.id !== t.id)); x.log('Deleted the step template "' + t.name + '"', { internal: true, cid: '' });
  } },
  'numbers-save': { roles: ADMIN, async fn(x, p) {
    const next = int(p.nextQuote); if (next < 1) refuse('Enter the next quotation number.');
    const fmt = str(p.invFormat, 60) || '{quote}-{nn}'; if (!/\{(nn|n)\}/.test(fmt)) refuse('The invoice format needs {nn} or {n} for the month number, so each invoice is different.');
    const hit = await numberTaken(x.cl, String(next), ''); if (hit) refuse(next + ' is already used by ' + hit + '.');
    await setKV(x.cl, 'nextQuote', next); await setKV(x.cl, 'invFormat', fmt);
  } },
  'tour-done': { roles: ALL, async fn(x, p) { const t = await getKV(x.cl, 'tours', {}), k = str(p.kind, 20) || 'portal'; t[x.me.key] = Object.assign({}, t[x.me.key], { [k]: x.now }); await setKV(x.cl, 'tours', t); } },
  'seen': { roles: ALL, async fn(x) { const seen = await getKV(x.cl, 'seen', {}); seen[x.me.key] = x.now; await setKV(x.cl, 'seen', seen); } }
};
/* ---------- email notifications ----------
   Worked out after each action from what changed, then sent once the change is saved.
   Everyone can turn their own emails off (kv emailOff: { 'm:<member id>' | 'c:<account id>': true }). */
const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
function mailHtml(m, brand) {
  const url = CFG.appUrl || '';
  const body = m.lines.map(l => l && l.quote ? '<div style="border-left:3px solid #1d3a2b;background:#f7f3ea;padding:10px 14px;margin:0 0 14px;white-space:pre-wrap">' + escH(l.quote) + '</div>' : '<p style="margin:0 0 14px;line-height:1.6">' + escH(l) + '</p>').join('');
  return '<div style="background:#f4efe5;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#1f2a22"><div style="max-width:560px;margin:0 auto;background:#fffdf7;border:1px solid #e7dfcf;border-radius:14px;overflow:hidden">' +
    '<div style="background:#1d3a2b;padding:20px 28px;color:#f4efe5;font:700 24px Georgia,serif;letter-spacing:.14em">GIOIA</div><div style="padding:28px">' +
    '<p style="margin:0 0 14px">Hi ' + escH(m.name || 'there') + ',</p>' + body +
    (url ? '<p style="margin:22px 0"><a href="' + escH(url) + '" style="display:inline-block;background:#1d3a2b;color:#ffffff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">' + escH(m.cta || 'Open') + '</a></p>' : '') +
    '<p style="margin:0;color:#7a7a6e;font-size:13px">Sign in with your Google account, ' + escH(m.to) + '.</p></div>' +
    '<div style="padding:16px 28px;border-top:1px solid #e7dfcf;color:#8a8577;font-size:12px;line-height:1.5">' + escH((brand && brand.company) || 'Gioia') + '. You can turn these emails off in the app, under ' + (m.client ? 'My details' : 'your name at the top right') + '.</div></div></div>';
}
const mailText = m => 'Hi ' + (m.name || 'there') + ',\n\n' + m.lines.map(l => l && l.quote ? '"' + l.quote + '"' : l).join('\n\n') + '\n\n' + (m.cta || 'Open') + ': ' + (CFG.appUrl || '') + '\n\nSign in with your Google account, ' + m.to + '.';
function planMails(x, a, p, before, out) {
  const SM = n => L.money(n).replace('$', 'S$'), mails = [], c = x.c, me = x.me, actorEmail = String(me.email || '').toLowerCase(), team = x.team;
  const add = (who, subject, lines, cta) => who.forEach(w => { if (!w || !w.email || w.email.toLowerCase() === actorEmail) return; if (mails.some(m => m.to === w.email && m.subject === subject)) return; mails.push({ to: w.email, key: w.key, name: w.name, client: !!w.client, subject, lines, cta: cta || (w.client ? 'Open your portal' : 'Open the Dashboard') }); });
  const client = c && c.email ? [{ email: c.email, key: 'c:' + c.aid, name: c.contact || c.company, client: true }] : [];
  const mem = id => { const m = team.find(z => z.id === id); return m ? [{ email: m.email, key: 'm:' + m.id, name: m.name.split(' ')[0] }] : []; };
  const admins = team.filter(m => m.admin).map(m => ({ email: m.email, key: 'm:' + m.id, name: m.name.split(' ')[0] }));
  const who = x.staff ? me.name : (c && (c.contact || c.company)) || 'The client', co = c ? c.company : '';
  const P = c ? c.quote : null;
  // proposals, renewals, invoices
  if (c && x.staff && ((a === 'q-sent') || (a === 'q-save' && p.then === 'sent') || (a === 'project-create' && p.then === 'sent'))) add(client, (P.version > 1 ? 'Your updated proposal from Gioia' : 'Your proposal from Gioia') + ': ' + c.name, ['Your ' + (P.version > 1 ? 'updated ' : '') + 'proposal for ' + c.name + ' is ready in your client portal.', 'You can read it, download it, and accept it, ask for changes or decline it there.'], 'View your proposal');
  if (c && a === 'rn-save' && p.then === 'sent') { const r = L.renewals(c).find(z => z.status === 'sent'); if (r) add(client, 'Your renewal proposal from Gioia: ' + c.name, ['Thank you for the months together. Your renewal proposal for ' + r.months + ' more month' + (r.months === 1 ? '' : 's') + ' of ' + c.name + ' is ready in your client portal.'], 'View your renewal'); }
  if (c && a === 'rn-save' && p.then === 'extend') add(client, 'Your contract with Gioia has been extended', [c.name + ' now runs to ' + L.mName(c, c.quote.months) + '. The new invoices are in your portal.']);
  if (c && ['i-sent', 'ah-sent'].includes(a)) { const i = a === 'i-sent' ? L.inv(c, int(p.m)) : L.adhocOf(c, p.id); if (i) add(client, 'Invoice ' + i.no + ' from Gioia', ['Invoice ' + i.no + ' for ' + SM(a === 'i-sent' ? L.invTotal(c, i.m) : i.amount) + ' is in your client portal' + (a === 'i-sent' ? ', for ' + L.mName(c, i.m) : '') + '.']); }
  if (c && a === 'i-paid') { const i = L.inv(c, int(p.m)); if (i) add(client, i.pay && i.pay.mode === 'deposit' ? 'Invoice ' + i.no + ' paid from your deposit' : 'Payment received, thank you', [i.pay && i.pay.mode === 'deposit' ? SM(i.pay.fromDeposit) + ' of your security deposit has been used for invoice ' + i.no + '. Deposit balance: ' + SM(L.depBalance(c)) + '.' : 'We have received payment for invoice ' + i.no + '.', L.mName(c, i.m) + ' is now open in your workspace.']); }
  if (c && a === 'dep-refund' && out) add(client, 'Deposit refund: ' + SM(out.amount), ['We have refunded ' + SM(out.amount) + ' of your security deposit for ' + c.name + '.' + (out.bal > 0 ? ' Remaining balance: ' + SM(out.bal) + '.' : ' Your deposit is now fully refunded.')]);
  if (c && (a === 'prep-start' || (a === 'ah-paid' && out && out.prepOpened) || (a === 'ptpl-apply' && out && out.started))) add(client, 'Your Gioia workspace is ready', ['Your workspace for ' + c.name + ' is open. We are starting with preparation, and there may be a few things we need from you.']);
  if (c && ['q-respond', 'rn-respond'].includes(a)) { const t = { accept: 'accepted', changes: 'asked for changes to', decline: 'declined' }[p.decision]; if (t) add(admins, co + ' ' + t + ' ' + (a === 'rn-respond' ? 'the renewal' : 'the proposal') + ' for ' + c.name, [who + ' ' + t + ' ' + (a === 'rn-respond' ? 'the renewal' : 'the proposal') + ' for ' + c.name + '.', ...(p.text ? [{ quote: str(p.text, 2000) }] : [])]); }
  if (a === 'payout-create') add(mem(p.member), 'Payment recorded: ' + SM(out && out.total || 0), ['A payment of ' + SM(out && out.total || 0) + ' dated ' + p.date + ' has been recorded. The details are under Fees & payouts.']);
  if (a === 'fee-save' && p.fee && !p.fee.id) add(mem(p.fee.member), 'New fee: ' + SM(out && out.amount || 0) + (out && out.project ? ' on ' + out.project : ''), ['A fee of ' + SM(out && out.amount || 0) + (out && out.label ? ' for ' + out.label : '') + (out && out.project ? ' (' + out.project + ')' : '') + ' has been assigned to you' + (out && out.count > 1 ? ', for each of ' + out.count + ' months' : '') + '. The details are under Fees & payouts.']);
  // tasks: what changed
  if (c && x.reassign && x.reassign.prev && x.reassign.open) { const r = x.reassign; add(mem(r.prev), 'Reassigned: ' + r.what.replace(/"/g, ''), [co + ', ' + c.name + ': ' + r.what + ' has been reassigned to ' + r.to + ', so it is no longer on your list. No action is needed from you.']); }
  const forTeam = {}, forClient = [];
  if (c) c.tasks.forEach(t => {
    const b = before[t.id], cur = L.curStage(t), was = b && b.stage, link = '"' + t.title + '"';
    const clientTurn = ['cdraft', 'creview', 'awaiting'].includes(t.status) && L.taskOpen(c, t), wasClient = b && ['cdraft', 'creview', 'awaiting'].includes(b.status);
    if (x.staff && clientTurn && (!b || !wasClient || was !== t.stage || !b.open)) forClient.push([(t.status === 'awaiting' ? 'Ready for your approval: ' : t.status === 'creview' ? 'Ready for your review: ' : 'We need something from you: ') + t.title, [t.status === 'awaiting' ? link + ' is ready for you to approve, or to ask for changes.' : t.status === 'creview' ? link + ' is ready for your review.' : link + ' needs your input' + (cur ? ': ' + cur.title : '') + '.', 'It is in your portal under Tasks.'], 'Open the task']);
    // only tasks that can be worked on now; a locked month's tasks are announced when that month opens
    const openNow = L.taskOpen(c, t), justOpened = openNow && b && !b.open, me1 = t.assignee || (cur && cur.owner === 'gioia' ? cur.assignee : '');
    if (openNow && t.assignee && (!b || b.assignee !== t.assignee || justOpened)) (forTeam[t.assignee] = forTeam[t.assignee] || []).push(t);
    else if (justOpened && me1) (forTeam[me1] = forTeam[me1] || []).push(t);
    if (cur && cur.owner === 'gioia' && cur.assignee && b && (was !== t.stage || b.stageAssignee !== cur.assignee)) add(mem(cur.assignee), 'Your step is ready: ' + t.title, ['Step ' + (t.stage + 1) + ' of ' + link + ' (' + co + ') is ready for you: ' + cur.title + (cur.due ? '. Due ' + cur.due : '') + '.']);
    if (!x.staff && b && (b.status !== t.status || was !== t.stage)) { const what = t.status === 'approved' ? 'approved ' + link : t.status === 'changes' ? 'asked for changes on ' + link : 'moved ' + link + ' forward'; add([...mem(t.assignee), ...(cur && cur.assignee ? mem(cur.assignee) : []), ...admins], co + ' ' + what, [who + ' ' + what + '.']); }
  });
  // one email per person per action: a single task gets its own email, several become one list
  const listLine = ts => ts.slice(0, 12).map(t => '• ' + t.title + (t.due ? ' (due ' + t.due + ')' : '')).join('\n') + (ts.length > 12 ? '\n…and ' + (ts.length - 12) + ' more' : '');
  Object.keys(forTeam).forEach(id => { const ts = forTeam[id];
    if (ts.length === 1) add(mem(id), 'New task for you: ' + ts[0].title, [co + ', ' + c.name + ': "' + ts[0].title + '" ' + (before[ts[0].id] && before[ts[0].id].open === false ? 'is now open and assigned to you' : 'has been assigned to you') + (ts[0].due ? ', due ' + ts[0].due : '') + '.']);
    else add(mem(id), ts.length + ' tasks for you on ' + c.name, [co + ', ' + c.name + ': these ' + ts.length + ' tasks are open and assigned to you.', { quote: listLine(ts) }], 'Open My tasks'); });
  if (forClient.length === 1) add(client, ...forClient[0]);
  else if (forClient.length > 1) add(client, forClient.length + ' things need you on ' + c.name, ['There are ' + forClient.length + ' tasks waiting for you in your workspace for ' + c.name + ':', { quote: forClient.slice(0, 12).map(f => '• ' + f[0]).join('\n') + (forClient.length > 12 ? '\n…and ' + (forClient.length - 12) + ' more' : '') }], 'Open your workspace');
  if (c && a === 't-comment' && !p.internal) { const t = c.tasks.find(z => z.id === p.id); if (t) { if (x.staff) add(client, 'New comment on ' + t.title, [who + ' commented on "' + t.title + '":', { quote: str(p.text, 2000) }], 'Open the task'); else add([...mem(t.assignee), ...admins], co + ' commented on ' + t.title, [who + ' commented on "' + t.title + '":', { quote: str(p.text, 2000) }]); } }
  if (c && !x.staff && ['f-link', 'f-add'].includes(a)) add(admins, co + ' shared a file', [who + ' shared "' + str(p.name || p.url, 160) + '" on ' + c.name + '.']);
  return mails;
}
async function deliver(mails) {
  // sends after the change is saved; every attempt is kept in a short log admins can see
  const off = await getKV(pool, 'emailOff', {}), brand = await getKV(pool, 'brand', DEFAULT_BRAND), log = [];
  for (const m of mails) {
    const rec = { id: hex(5), to: m.to, subject: m.subject, at: new Date().toISOString(), sim: !!(CFG.mailer && CFG.mailer.sim) };
    if (off[m.key]) { rec.skipped = 'They turned emails off'; log.push(rec); continue; }
    const html = mailHtml(m, brand), text = mailText(m); rec.html = html;
    if (!CFG.mailer || !CFG.mailer.mailReady) { rec.skipped = 'Email is not connected yet'; log.push(rec); continue; }
    try { await CFG.mailer.sendMail({ to: m.to, subject: m.subject, html, text }); rec.ok = true; } catch (e) { rec.err = String(e.message || e).slice(0, 300); }
    log.push(rec);
  }
  if (!log.length) return;
  await tx(async cl => { const all = await getKV(cl, 'mailLog', []); await setKV(cl, 'mailLog', [...log.reverse(), ...all].slice(0, 120).map((r, i) => i < 30 ? r : Object.assign({}, r, { html: undefined }))); });
}

async function runAction(email, body) {
  const res = await tx(async cl => {
    const me = await identify(cl, email);
    if (!me || !ALL.includes(me.role)) refuse('Please sign in again.');
    const def = A[body.a];
    if (!def || !def.roles.includes(me.role)) refuse('You do not have permission to do that.');
    const p = body.p || {}, staff = me.role !== 'client', logs = [];
    const x = { cl, me, staff, now: new Date().toISOString(), save: {}, c: null, team: await getKV(cl, 'team', []), catalogue: await getKV(cl, 'catalogue', []), fees: await getKV(cl, 'fees', []), invFormat: await getKV(cl, 'invFormat', '{quote}-{nn}'),
      log(text, o) { logs.push(Object.assign({ by: me.key, who: staff ? me.name : 'Client', client: !staff, text, at: x.now }, o || {})); } };
    if (def.client) {
      const cid = str(body.cid, 60) || me.cid;
      x.c = await getClient(cl, cid) || refuse('That project no longer exists.');
      if (!staff && !me.cids.includes(x.c.id)) refuse('You do not have permission to do that.'); // a client only ever touches their own projects
      if (me.role === 'team' && !assignedTo(x.c, me.id, x.fees)) refuse('You are not assigned to this project.');
      if (me.vendor) {
        if (!VENDOR_OK.includes(body.a)) refuse('Vendors can update their own tasks only.');
        const tid = p.id || (['general', 'ws'].includes(p.key) ? '' : p.key);
        if (body.a !== 'f-del' && !(tid && mineTask(x.c.tasks.find(t => t.id === tid), me.id))) refuse('This task is not assigned to you.');
      }
    }
    const before = {}; if (x.c) x.c.tasks.forEach(t => { const cs = L.curStage(t); before[t.id] = { status: t.status, stage: t.stage, assignee: t.assignee, stageAssignee: cs ? cs.assignee : '', open: L.taskOpen(x.c, t) }; });
    const out = await def.fn(x, p);
    if (x.c) { const made = {};
      x.c.tasks.forEach(t => { if (!t.feeDraft) return; const f = t.feeDraft; delete t.feeDraft; if (!x.team.some(m => m.id === f.member) || !(f.amount > 0)) return;
        x.fees.push({ id: rid('f'), kind: 'task', member: f.member, cid: x.c.id, svc: '', m: 0, taskId: t.id, stage: null, item: '', rule: 'prorata', amount: f.amount, pct: 0, base: 0, note: '', paid: 0, notified: 0, created: x.now }); made[f.member] = (made[f.member] || 0) + 1; x.save.fees = true; });
      Object.keys(made).forEach(id => x.log('Assigned you ' + made[id] + ' task fee' + (made[id] === 1 ? '' : 's') + ' on "' + x.c.name + '" for ' + x.c.company, { internal: true, priv: id }));
    }
    const tid = (out && out.id) || p.id, tk = x.c && tid && x.c.tasks.find(t => t.id === tid);
    if (tk) { const to = [tk.assignee, ...(tk.stages || []).map(s => s.assignee)].filter(Boolean); logs.forEach(e => { if (!e.to) { e.to = [...new Set(to)]; e.tid = tk.id; } }); }
    if (x.c) await saveClient(cl, x.c);
    if (x.save.team) await setKV(cl, 'team', x.team);
    if (x.save.catalogue) await setKV(cl, 'catalogue', x.catalogue);
    // Fees are earned as work is completed. Tell the person each time more of a fee is earned on this project.
    if (x.c) for (const f of x.fees.filter(z => z.cid === x.c.id && z.kind !== 'item')) {
      const e = L.feeEarned(x.c, f);
      if (e !== (f.notified || 0)) { if (e > (f.notified || 0)) logs.push({ by: me.key, who: staff ? me.name : 'Client', client: false, text: 'You have earned ' + L.money(e) + ' of your ' + L.money(f.amount) + ' fee for ' + feeLabel(x.c, f) + (e >= f.amount ? ': all of it' : ''), at: x.now, internal: true, priv: f.member, cid: f.cid }); f.notified = e; x.save.fees = true; }
    }
    if (x.save.fees) await setKV(cl, 'fees', x.fees);
    for (const e of logs) { const cid = e.cid || (x.c ? x.c.id : ''); delete e.cid; await cl.query('insert into feed(cid,v) values($1,$2)', [cid, JSON.stringify(e)]); }
    const fresh = await identify(cl, email);
    let mails = []; try { mails = planMails(x, body.a, p, before, out); if (x.teamMail) { const m = x.teamMail, first = m.name.split(' ')[0]; mails.push({ to: m.email, key: 'm:' + m.id, name: first, subject: 'You now have access to the Gioia Dashboard', lines: [x.me.name + ' has added you to the Gioia team dashboard. It is where you will find the projects and tasks assigned to you, the files for them, and your fees under Fees & payouts.', 'To sign in, open the link below, click "Sign in with Google" and choose ' + m.email + '. The first time you sign in, a short tour will show you around.'], cta: 'Open the dashboard' }); }
      if (x.inviteMail) mails.push({ to: x.c.email, key: 'invite', name: x.c.contact || x.c.company, client: true, subject: 'Your Gioia client portal', lines: ['Your ' + x.c.company + ' workspace with Gioia is ready on our client portal. It is where you can follow the work, send us your materials, review and approve each piece, and see your proposals and invoices.', 'To sign in, open the link below, click "Sign in with Google" and choose ' + x.c.email + '. If you would rather use a different Google account, just reply and we will update it.'], cta: 'Open your portal' });
      if (x.testMail) mails.push({ to: me.email, key: 'test', name: me.name.split(' ')[0], subject: 'Test email from your Client Desk', lines: ['This is a test. If you can read it, email from ' + (CFG.emailFrom || 'the app') + ' is working.'], cta: 'Open the Dashboard' }); } catch (e) { console.error('email plan', e); }
    return { ok: true, out: out || null, logged: logs.map(e => e.text), state: await buildState(cl, fresh), _mails: mails };
  });
  const mails = res._mails || []; delete res._mails;
  if (mails.length) { const d = deliver(mails).catch(e => console.error('email', e)); if (CFG.awaitMail) await d; }
  return res;
}
/* ---------- files in Google Drive ---------- */
// where an upload goes, after checking the person may add files there
async function uploadTarget(email, cid, key, svc) {
  return tx(async cl => {
    const me = await identify(cl, email); if (!me || !ALL.includes(me.role)) refuse('Please sign in again.');
    const c = await getClient(cl, str(cid, 60)) || refuse('That project no longer exists.'), staff = me.role !== 'client', fees = await getKV(cl, 'fees', []);
    if (!staff && !me.cids.includes(c.id)) refuse('You do not have permission to do that.');
    if (me.role === 'team' && !assignedTo(c, me.id, fees)) refuse('You are not assigned to this project.');
    let place = 'General';
    if (me.vendor && ['ws', 'general'].includes(key)) refuse('Add files on your tasks.');
    if (key === 'ws') { const s = L.ql(c, str(svc, 80)) || refuse('That workspace no longer exists.'); place = L.short(s); }
    else if (key !== 'general') { const t = c.tasks.find(z => z.id === key) || refuse('That task no longer exists.'); if (!staff && !L.taskOpen(c, t)) refuse('This task is not open yet.'); if (me.vendor && !mineTask(t, me.id)) refuse('This task is not assigned to you.'); place = L.short(L.ql(c, t.svc) || { name: 'General' }); }
    return { parts: ['Clients', c.company, c.name || 'Project', place] };
  });
}
async function fileFor(email, cid, fileId) {
  return tx(async cl => {
    const me = await identify(cl, email); if (!me || !ALL.includes(me.role)) refuse('Please sign in again.');
    const c = await getClient(cl, str(cid, 60)) || refuse('That project no longer exists.'), fees = await getKV(cl, 'fees', []);
    if (me.role === 'client' && !me.cids.includes(c.id)) refuse('You do not have permission to see that file.');
    if (me.role === 'team' && !assignedTo(c, me.id, fees)) refuse('You do not have permission to see that file.');
    const f = c.files.find(z => z.drive === fileId) || refuse('That file is no longer here.');
    if (me.vendor && !c.tasks.some(t => mineTask(t, me.id) && (t.files || []).some(z => z.drive === fileId))) refuse('You do not have permission to see that file.');
    return f;
  });
}
async function vendorFile(email, payoutId) {
  return tx(async cl => { const me = await identify(cl, email); if (!me || me.role !== 'admin') refuse('Admins only.'); const po = (await getKV(cl, 'payouts', [])).find(z => z.id === payoutId); if (!po || !po.file) refuse('That invoice is no longer here.'); return po; });
}
async function vendorUploadTarget(email, memberId) {
  return tx(async cl => { const me = await identify(cl, email); if (!me || me.role !== 'admin') refuse('Admins only.'); const m = (await getKV(cl, 'team', [])).find(z => z.id === memberId) || refuse('That person is no longer on the team.'); return { parts: ['Team invoices', m.company || m.name] }; });
}
/* ---------- backups ---------- */
async function exportAll() {
  return tx(async cl => ({
    exported: new Date().toISOString(), app: 'GIOIA Client Desk',
    accounts: await allAccounts(cl), projects: (await cl.query('select v from clients')).rows.map(r => r.v),
    settings: (await cl.query('select k, v from kv')).rows.filter(r => !/^backup|^mailLog$/.test(r.k)),
    activity: (await cl.query('select v,cid from feed order by id desc limit 5000')).rows
  }));
}


return { init, identify, buildState, runAction, getKV, setKV, tx, Refuse, DEFAULT_BRAND, uploadTarget, fileFor, exportAll, vendorFile, vendorUploadTarget };
});
