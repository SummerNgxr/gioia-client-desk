'use strict';
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const cookieSession = require('cookie-session');
const { Pool } = require('pg');
const L = require('./public/logic.js');

const PORT = process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';
const DEV_LOGIN = process.env.DEV_LOGIN === '1' && !PROD; // local testing only, never in production
const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DEFAULT_BRAND = { mark: 'CLIENT DESK', tagline: '', company: '', address: '', terms: '' };
const rid = p => p + crypto.randomBytes(6).toString('hex');
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 300);
const int = v => Math.floor(Number(v) || 0);
const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' }).toUpperCase().replace(/ /g, '-');
class Refuse extends Error {}
const refuse = msg => { throw new Refuse(msg); };

/* ---------- storage ---------- */
const getKV = async (cl, k, d) => { const r = await cl.query('select v from kv where k=$1', [k]); return r.rows[0] ? r.rows[0].v : d; };
const setKV = (cl, k, v) => cl.query('insert into kv(k,v) values($1,$2) on conflict(k) do update set v=excluded.v', [k, JSON.stringify(v)]);
const getClient = async (cl, id) => { const r = await cl.query('select v from clients where id=$1', [id]); return r.rows[0] ? r.rows[0].v : null; };
const saveClient = (cl, c) => cl.query('insert into clients(id,v) values($1,$2) on conflict(id) do update set v=excluded.v', [c.id, JSON.stringify(c)]);
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
  return Object.assign({ id: rid('c'), company: '', contact: '', email: '', phone: '', website: '', notes: '', invoices: [], tasks: [], files: [], adhoc: [], extra: [],
    quote: { no: String(quoteNo), date: today(), status: 'pending', start: new Date().toISOString().slice(0, 7), months: 6, committed: 3, renewed: false, lines: [], discount: 0 } }, o);
}
async function init() {
  await pool.query('create table if not exists kv(k text primary key, v jsonb not null)');
  await pool.query('create table if not exists clients(id text primary key, v jsonb not null)');
  await pool.query('create table if not exists feed(id bigserial primary key, cid text not null, v jsonb not null)');
  await tx(async cl => {
    if (!(await getKV(cl, 'booted', false))) {
      // First boot. Starter data comes from the SEED_JSON variable so no client or pricing data lives in the code.
      let seed = {};
      try { seed = JSON.parse(process.env.SEED_JSON || '{}'); } catch (e) { console.error('SEED_JSON is not valid JSON, starting empty'); }
      const catalogue = (seed.catalogue || []).map(s => Object.assign({ id: rid('s'), note: '', bullets: [], tasks: [] }, s));
      await setKV(cl, 'catalogue', catalogue);
      await setKV(cl, 'brand', Object.assign({}, DEFAULT_BRAND, seed.brand || {}));
      await setKV(cl, 'team', []);
      await setKV(cl, 'seen', {});
      let next = int(seed.nextQuote) || 1001;
      for (const sc of seed.clients || []) {
        const q = sc.quote || {};
        const c = makeClient({ company: str(sc.company), contact: str(sc.contact), website: str(sc.website), email: str(sc.email).toLowerCase() }, q.no || next++);
        Object.assign(c.quote, { date: q.date || c.quote.date, start: q.start || c.quote.start, months: int(q.months) || 6, committed: int(q.committed) || 3, discount: int(q.discount) });
        c.quote.lines = (q.lines || []).map(id => catalogue.find(s => s.id === id)).filter(Boolean).map(L.clone);
        if (q.accepted && c.quote.lines.length) L.acceptQuote(c);
        await saveClient(cl, c);
      }
      await setKV(cl, 'nextQuote', next);
      await setKV(cl, 'booted', true);
    }
    // The first admin always comes from ADMIN_EMAIL, so there is a way in on day one.
    const admin = str(process.env.ADMIN_EMAIL).toLowerCase();
    if (admin) {
      const team = await getKV(cl, 'team', []);
      if (!team.some(m => m.email === admin)) { team.push({ id: rid('m'), name: str(process.env.ADMIN_NAME) || 'Admin', email: admin, admin: true }); await setKV(cl, 'team', team); }
    }
  });
}

/* ---------- who is signed in ---------- */
async function identify(cl, email) {
  email = str(email).toLowerCase();
  if (!email) return null;
  const team = await getKV(cl, 'team', []);
  const m = team.find(x => x.email && x.email === email);
  if (m) return { role: m.admin ? 'admin' : 'team', id: m.id, name: m.name, key: 'm:' + m.id, email };
  const r = await cl.query("select v from clients where lower(v->>'email')=$1 limit 1", [email]);
  if (r.rows[0]) { const c = r.rows[0].v; return { role: L.hasAccess(c) ? 'client' : 'pending', cid: c.id, name: c.contact || c.company, key: 'c:' + c.id, email }; }
  return { role: 'none', email };
}
async function buildState(cl, me) {
  const brand = await getKV(cl, 'brand', DEFAULT_BRAND);
  if (!me) return { me: null, googleReady: !!(GOOGLE_ID && GOOGLE_SECRET), devLogin: DEV_LOGIN, brand: { mark: brand.mark, tagline: brand.tagline } };
  if (me.role === 'none' || me.role === 'pending') return { me: { role: me.role, email: me.email }, brand: { mark: brand.mark, tagline: brand.tagline } };
  const team = await getKV(cl, 'team', []);
  const seen = (await getKV(cl, 'seen', {}))[me.key] || '';
  const staff = me.role !== 'client';
  let clients = (await cl.query(staff ? 'select v from clients order by v->>\'company\'' : 'select v from clients where id=$1', staff ? [] : [me.cid])).rows.map(r => r.v);
  let feed = (await cl.query(staff ? 'select v,cid from feed order by id desc limit 400' : 'select v,cid from feed where cid=$1 order by id desc limit 400', staff ? [] : [me.cid])).rows.map(r => Object.assign({ cid: r.cid }, r.v));
  if (me.role === 'team') {
    // Team members never receive prices, so they cannot be read from the browser either.
    clients.forEach(c => { c.quote.discount = 0; [...c.quote.lines, ...c.extra].forEach(s => { s.price = 0; }); c.adhoc.forEach(a => { a.amount = 0; if (a.s) a.s.price = 0; }); });
    feed = feed.filter(e => !e.fin);
  }
  if (me.role === 'client') { clients.forEach(c => { delete c.notes; }); feed = feed.filter(e => !e.internal); }
  return {
    me: { role: me.role, id: me.id || '', cid: me.cid || '', name: me.name, key: me.key, email: me.email }, brand, seen, clients, feed,
    team: staff ? (me.role === 'admin' ? team : team.map(m => ({ id: m.id, name: m.name, admin: m.admin }))) : team.map(m => ({ id: m.id, name: m.name })),
    catalogue: me.role === 'admin' ? await getKV(cl, 'catalogue', []) : []
  };
}

/* ---------- actions ---------- */
const ADMIN = ['admin'], STAFF = ['admin', 'team'], ALL = ['admin', 'team', 'client'];
const task = (x, id) => x.c.tasks.find(t => t.id === id) || refuse('That task no longer exists.');
const openTask = (x, id) => { const t = task(x, id); if (!L.taskOpen(x.c, t)) refuse('That task is locked until its invoice is paid.'); return t; };
const draftQuote = x => { if (x.c.quote.status === 'accepted') refuse('This quotation is already accepted.'); return x.c.quote; };
const A = {
  'create-client': { roles: ADMIN, async fn(x, p) {
    const company = str(p.company) || refuse('Enter the company name to create the client.');
    const next = await getKV(x.cl, 'nextQuote', 1001);
    x.c = makeClient({ company, contact: str(p.contact), email: str(p.email).toLowerCase(), website: str(p.website) }, next);
    await setKV(x.cl, 'nextQuote', next + 1);
    x.log('Client account created for ' + company, { internal: true });
    return { cid: x.c.id };
  } },
  'save-details': { roles: ALL, client: true, fn(x, p) {
    ['company', 'contact', 'phone', 'website'].forEach(k => { x.c[k] = str(p[k]); });
    if (x.staff) { x.c.email = str(p.email).toLowerCase(); x.c.notes = str(p.notes, 5000); x.log('Client details updated'); } else x.log('Updated their details');
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
  'q-sent': { roles: ADMIN, client: true, fn(x) { const q = draftQuote(x); if (!q.lines.length) refuse('Add at least one service first.'); q.status = 'sent'; x.log('Quotation ' + q.no + ' sent', { fin: true }); } },
  'q-accept': { roles: ADMIN, client: true, fn(x) { const q = draftQuote(x); if (!q.lines.length) refuse('Add at least one service first.'); L.acceptQuote(x.c); x.log('Quotation ' + q.no + ' accepted. ' + q.months + ' monthly invoices created', { fin: true }); } },
  'i-sent': { roles: ADMIN, client: true, fn(x, p) { const i = L.inv(x.c, int(p.m)) || refuse('Invoice not found.'); if (L.invLocked(x.c, i.m)) refuse('Confirm the renewal first.'); if (i.status === 'pending') i.status = 'sent'; x.log('Invoice ' + i.no + ' (' + L.money(L.invTotal(x.c, i.m)) + ') sent', { fin: true }); } },
  'i-paid': { roles: ADMIN, client: true, fn(x, p) { const i = L.inv(x.c, int(p.m)) || refuse('Invoice not found.'); if (L.invLocked(x.c, i.m)) refuse('Confirm the renewal first.'); i.status = 'paid'; x.log('Invoice ' + i.no + ' marked as paid. ' + L.mName(x.c, i.m) + ' workspaces are active', { fin: true }); } },
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
  'ah-paid': { roles: ADMIN, client: true, fn(x, p) { const a = L.adhocOf(x.c, p.id) || refuse('Invoice not found.'); a.status = 'paid'; x.log('Invoice ' + a.no + ' marked as paid' + (a.s ? '. The "' + L.short(a.s) + '" workspace is active' : ''), { fin: true }); } },
  't-submit': { roles: STAFF, client: true, fn(x, p) { const t = openTask(x, p.id); if (t.owner !== 'gioia' || !t.approve) refuse('This task does not need approval.'); t.status = 'awaiting'; if (!t.assignee) t.assignee = x.me.id; x.log('Submitted "' + t.title + '" for approval'); } },
  't-done': { roles: STAFF, client: true, fn(x, p) { const t = openTask(x, p.id); t.status = 'done'; x.log('Marked "' + t.title + '" as done'); } },
  't-status': { roles: STAFF, client: true, fn(x, p) { const t = openTask(x, p.id); if (!L.statusOptions(t).includes(p.status)) refuse('That status does not apply to this task.'); t.status = p.status; x.log('Changed "' + t.title + '" to ' + L.STATUS[t.status]); } },
  't-assign': { roles: STAFF, client: true, fn(x, p) { const t = task(x, p.id), m = p.assignee ? (x.team.find(m => m.id === p.assignee) || refuse('That team member no longer exists.')) : null; t.assignee = m ? m.id : ''; x.log(m ? 'Assigned "' + t.title + '" to ' + m.name : 'Unassigned "' + t.title + '"', { internal: true }); } },
  't-approve': { roles: ['client'], client: true, fn(x, p) { const t = openTask(x, p.id); if (t.status !== 'awaiting') refuse('This task is not waiting for approval.'); t.status = 'approved'; x.log('Approved "' + t.title + '"'); } },
  't-sent': { roles: ['client'], client: true, fn(x, p) { const t = openTask(x, p.id); if (t.owner !== 'client' || t.status !== 'todo') refuse('This item is not waiting on you.'); t.status = 'submitted'; x.log('Sent "' + t.title + '"'); } },
  't-changes': { roles: ['client'], client: true, fn(x, p) {
    const t = openTask(x, p.id), text = str(p.text, 3000) || refuse('Describe the change you need, then request it.');
    if (t.status !== 'awaiting') refuse('This task is not waiting for approval.');
    if (t.rounds >= 2) refuse('Both included revision rounds are used. Further changes are quoted separately.');
    t.rounds++; t.status = 'changes'; t.comments.push({ by: 'Client', client: true, text, at: x.now });
    x.log('Requested changes on "' + t.title + '" (round ' + t.rounds + ' of 2)');
  } },
  't-comment': { roles: ALL, client: true, fn(x, p) { const t = x.staff ? task(x, p.id) : openTask(x, p.id), text = str(p.text, 3000) || refuse('Write a comment first.'); t.comments.push({ by: x.staff ? x.me.name : 'Client', client: !x.staff, text, at: x.now }); x.log('Commented on "' + t.title + '"'); } },
  'f-link': { roles: ALL, client: true, fn(x, p) {
    const url = str(p.url, 2000); if (!/^https?:\/\/\S+$/.test(url)) refuse('Paste the full link, starting with https://');
    const t = p.key === 'general' ? null : (x.staff ? task(x, p.key) : openTask(x, p.key));
    const name = str(p.name, 120) || url.replace(/^https?:\/\//, '').slice(0, 50);
    const f = { folder: t ? L.short(L.ql(x.c, t.svc)) : 'General', name, url, by: x.staff ? x.me.name : 'Client', at: x.now };
    x.c.files.push(f); if (t) t.files.push(f);
    x.log('Shared a link, "' + name + '"' + (t ? ', on "' + t.title + '"' : ''));
  } },
  'svc-save': { roles: ADMIN, fn(x, p) {
    const d = p.svc || {}, name = str(d.name) || refuse('Give the service a name.');
    const s = { id: str(d.id, 40) || rid('s'), name, price: Math.max(0, int(d.price)), billing: d.billing === 'once' ? 'once' : 'monthly', note: str(d.note),
      bullets: (Array.isArray(d.bullets) ? d.bullets : []).map(b => str(b)).filter(Boolean).slice(0, 12),
      tasks: (Array.isArray(d.tasks) ? d.tasks : []).map(t => [str(t[0], 160), t[1] === 'client' ? 'client' : 'gioia', !!t[2] && t[1] !== 'client']).filter(t => t[0]).slice(0, 40) };
    const i = x.catalogue.findIndex(c => c.id === s.id);
    if (i >= 0) x.catalogue[i] = s; else x.catalogue.push(s);
    x.save.catalogue = true;
  } },
  'svc-delete': { roles: ADMIN, fn(x, p) { x.catalogue = x.catalogue.filter(s => s.id !== p.id); x.save.catalogue = true; } },
  'team-add': { roles: ADMIN, fn(x, p) {
    const name = str(p.name, 80), email = str(p.email, 200).toLowerCase();
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) refuse('Enter the name and Google email. The email is what lets them sign in.');
    if (x.team.some(m => m.email === email)) refuse('That email is already on the team.');
    x.team.push({ id: rid('m'), name, email, admin: !!p.admin }); x.save.team = true;
  } },
  'team-update': { roles: ADMIN, fn(x, p) {
    const m = x.team.find(m => m.id === p.id) || refuse('That team member no longer exists.');
    if (p.name !== undefined) m.name = str(p.name, 80) || m.name;
    if (p.email !== undefined) { const email = str(p.email, 200).toLowerCase(); if (m.id === x.me.id && email !== m.email) refuse('You cannot change your own sign-in email here.'); if (email && !/^\S+@\S+\.\S+$/.test(email)) refuse('That does not look like an email address.'); m.email = email; }
    x.save.team = true;
  } },
  'team-del': { roles: ADMIN, async fn(x, p) {
    if (p.id === x.me.id) refuse('You cannot remove yourself.');
    x.team = x.team.filter(m => m.id !== p.id); x.save.team = true;
    const rows = (await x.cl.query('select v from clients')).rows;
    for (const r of rows) { let hit = false; r.v.tasks.forEach(t => { if (t.assignee === p.id) { t.assignee = ''; hit = true; } }); if (hit) await saveClient(x.cl, r.v); }
  } },
  'brand-save': { roles: ADMIN, async fn(x, p) { const b = p.brand || {}; await setKV(x.cl, 'brand', { mark: str(b.mark, 40) || 'CLIENT DESK', tagline: str(b.tagline, 80), company: str(b.company, 120), address: str(b.address, 400), terms: str(b.terms, 30000) }); } },
  'seen': { roles: ALL, async fn(x) { const seen = await getKV(x.cl, 'seen', {}); seen[x.me.key] = x.now; await setKV(x.cl, 'seen', seen); } }
};
async function runAction(email, body) {
  return tx(async cl => {
    const me = await identify(cl, email);
    if (!me || !ALL.includes(me.role)) refuse('Please sign in again.');
    const def = A[body.a];
    if (!def || !def.roles.includes(me.role)) refuse('You do not have permission to do that.');
    const p = body.p || {}, staff = me.role !== 'client', logs = [];
    const x = { cl, me, staff, now: new Date().toISOString(), save: {}, c: null, team: await getKV(cl, 'team', []), catalogue: await getKV(cl, 'catalogue', []),
      log(text, o) { logs.push(Object.assign({ by: me.key, who: staff ? me.name : 'Client', client: !staff, text, at: x.now }, o || {})); } };
    if (def.client) {
      const cid = staff ? str(body.cid, 60) : me.cid; // a client can only ever touch their own record
      x.c = await getClient(cl, cid) || refuse('That client no longer exists.');
    }
    const out = await def.fn(x, p);
    if (x.c) await saveClient(cl, x.c);
    if (x.save.team) await setKV(cl, 'team', x.team);
    if (x.save.catalogue) await setKV(cl, 'catalogue', x.catalogue);
    for (const e of logs) await cl.query('insert into feed(cid,v) values($1,$2)', [x.c ? x.c.id : '', JSON.stringify(e)]);
    const fresh = await identify(cl, email);
    return { ok: true, out: out || null, logged: logs.map(e => e.text), state: await buildState(cl, fresh) };
  });
}

/* ---------- web ---------- */
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'" });
  next();
});
if (PROD && !process.env.SESSION_SECRET) console.error('SESSION_SECRET is not set: sign-in sessions will reset on every restart.');
app.use(cookieSession({ name: 'desk', keys: [process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')], maxAge: 30 * 24 * 3600 * 1000, sameSite: 'lax', secure: PROD, httpOnly: true }));
app.use(express.json({ limit: '200kb' }));
const baseUrl = req => (process.env.BASE_URL || req.protocol + '://' + req.get('host')).replace(/\/$/, '');

const PAGE_ESC = v => String(v).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
async function legalPage(res, title, body) {
  const b = await getKV(pool, 'brand', DEFAULT_BRAND), co = PAGE_ESC(b.company || b.mark), mail = PAGE_ESC(process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || '');
  res.send('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + title + ' · ' + co + '</title><link rel="stylesheet" href="/style.css"></head><body><div class="solo" style="max-width:720px"><div class="card stack"><h1>' + title + '</h1>' + body(co, mail) + '<p><a href="/">Back to Client Desk</a></p></div></div></body></html>');
}
app.get('/privacy', (req, res) => legalPage(res, 'Privacy Policy', (co, mail) =>
  '<p>Client Desk is the client portal of ' + co + '. It is used by our team and by clients we work with.</p>' +
  '<h2>What we collect</h2><p>When you sign in with Google, we receive your name and email address. We use your email only to recognise you and show you the workspace you are entitled to. We also store what you enter in the portal: contact details, comments, approvals and links you share.</p>' +
  '<h2>How we use it</h2><p>Only to run the client portal and the services we provide to you: showing your quotations, invoices and tasks, recording approvals, and notifying the people working on your account.</p>' +
  '<h2>Sharing</h2><p>We do not sell your information or share it with third parties, apart from the hosting provider that runs the portal on our behalf. We handle personal data in line with Singapore\'s Personal Data Protection Act (PDPA).</p>' +
  '<h2>Google user data</h2><p>Our use of information received from Google is limited to the purposes above and follows the Google API Services User Data Policy, including its Limited Use requirements.</p>' +
  '<h2>Your choices</h2><p>You can ask us to correct or delete your information at any time' + (mail ? ' by writing to <a href="mailto:' + mail + '">' + mail + '</a> (' + mail + ')' : '') + '.</p>'));
app.get('/terms', (req, res) => legalPage(res, 'Terms of Use', (co, mail) =>
  '<p>Client Desk is provided by ' + co + ' to its team and clients. Access is by invitation only, using the Google account we have on record for you.</p>' +
  '<p>The services themselves are governed by the quotation and terms you agreed with ' + co + '. This portal is a tool for tracking that work, and the agreed quotation prevails over anything shown here.</p>' +
  '<p>Please keep your Google account secure, and tell us if someone else may have access to it' + (mail ? ' at <a href="mailto:' + mail + '">' + mail + '</a> (' + mail + ')' : '') + '.</p>'));
app.get('/healthz', (req, res) => res.send('ok'));
app.get('/auth/google', (req, res) => {
  if (!GOOGLE_ID || !GOOGLE_SECRET) return res.status(503).send('Google sign-in is not set up yet.');
  req.session.state = crypto.randomBytes(16).toString('hex');
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: GOOGLE_ID, redirect_uri: baseUrl(req) + '/auth/google/callback', response_type: 'code', scope: 'openid email profile', state: req.session.state, prompt: 'select_account' }));
});
app.get('/auth/google/callback', async (req, res) => {
  try {
    if (!req.query.code || !req.session.state || req.query.state !== req.session.state) return res.redirect('/?signin=failed');
    req.session.state = null;
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: String(req.query.code), client_id: GOOGLE_ID, client_secret: GOOGLE_SECRET, redirect_uri: baseUrl(req) + '/auth/google/callback', grant_type: 'authorization_code' }) });
    const tok = await r.json();
    // The ID token comes straight from Google over TLS in exchange for our secret, so its claims can be trusted here.
    const claims = JSON.parse(Buffer.from(String(tok.id_token || '').split('.')[1] || '', 'base64url').toString() || '{}');
    if (claims.aud !== GOOGLE_ID || !claims.email || claims.email_verified === false) return res.redirect('/?signin=failed');
    req.session.email = String(claims.email).toLowerCase();
    res.redirect('/');
  } catch (e) { console.error('sign-in failed', e.message); res.redirect('/?signin=failed'); }
});
app.get('/auth/logout', (req, res) => { req.session = null; res.redirect('/'); });
if (DEV_LOGIN) app.get('/auth/dev', (req, res) => { req.session.email = str(req.query.email).toLowerCase(); res.redirect('/'); });

app.get('/api/state', async (req, res) => {
  try {
    const cl = await pool.connect();
    try { res.json(await buildState(cl, await identify(cl, req.session.email))); } finally { cl.release(); }
  } catch (e) { console.error(e); res.status(500).json({ error: 'Something went wrong loading the app.' }); }
});
app.post('/api/action', async (req, res) => {
  try {
    if (!req.is('application/json')) return res.status(415).json({ error: 'Unsupported request.' });
    res.json(await runAction(req.session.email, req.body || {}));
  } catch (e) {
    if (e instanceof Refuse) return res.status(400).json({ error: e.message });
    console.error(e); res.status(500).json({ error: 'Something went wrong. Nothing was changed.' });
  }
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }));

init().then(() => app.listen(PORT, () => console.log('Client desk listening on ' + PORT))).catch(e => { console.error('Could not start', e); process.exit(1); });
