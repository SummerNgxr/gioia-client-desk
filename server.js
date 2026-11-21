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

const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 300);
const G = require('./lib/google.js')({ serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT, emailFrom: process.env.EMAIL_FROM, driveId: process.env.DRIVE_ID, fromName: process.env.EMAIL_NAME || 'Gioia' });
const Core = require('./lib/core.js')(pool, L, { payDefault: require('./lib/paydefault.json'), starters: require('./lib/starters.json'), mailer: G, drive: G, emailFrom: process.env.EMAIL_FROM || '', randomBytes: n => crypto.randomBytes(n), seedJson: process.env.SEED_JSON, adminEmail: process.env.ADMIN_EMAIL, adminName: process.env.ADMIN_NAME, googleReady: !!(GOOGLE_ID && GOOGLE_SECRET), devLogin: DEV_LOGIN, appUrl: (process.env.BASE_URL || '').replace(/\/$/, '') });
const { init, identify, buildState, runAction, getKV, setKV, Refuse, DEFAULT_BRAND, uploadTarget, fileFor, exportAll, tx, vendorFile, vendorUploadTarget } = Core;

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
app.use((req, res, next) => req.path === '/api/upload' ? next() : express.json({ limit: '200kb' })(req, res, next));
const baseUrl = req => (process.env.BASE_URL || req.protocol + '://' + req.get('host')).replace(/\/$/, '');

const PAGE_ESC = v => String(v).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
async function legalPage(res, title, body) {
  const b = await getKV(pool, 'brand', DEFAULT_BRAND), co = PAGE_ESC(b.company || b.mark), mail = PAGE_ESC(process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || '');
  res.send('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + title + ' · ' + co + '</title><link rel="stylesheet" href="/style.css"></head><body><div class="solo" style="max-width:720px"><div class="card stack"><h1>' + title + '</h1>' + body(co, mail) + '<p><a href="/">Back to Client Desk</a></p></div></div></body></html>');
}
app.get('/privacy', (req, res) => legalPage(res, 'Privacy Policy', (co, mail) =>
  '<p>Client Desk is the client portal of ' + co + '. It is used by our team and by clients we work with.</p>' +
  '<h2>What we collect</h2><p>When you sign in with Google, we receive your name and email address. We use your email only to recognise you and show you the projects you are entitled to. We also store what you enter in the portal: contact details, comments, approvals and links you share.</p>' +
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

/* tells open pages when a new version of the app has been deployed */
const APP_VERSION = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.RAILWAY_DEPLOYMENT_ID || String(Date.now());
app.get('/api/state', async (req, res) => {
  try {
    const cl = await pool.connect();
    try { res.json(Object.assign(await buildState(cl, await identify(cl, req.session.email)), { version: APP_VERSION })); } finally { cl.release(); }
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
/* uploads go straight into the client's folder in the shared drive */
app.post('/api/upload', express.raw({ type: () => true, limit: '25mb' }), async (req, res) => {
  try {
    if (!G.driveReady) return res.status(400).json({ error: 'File uploads need the Google Drive connection.' });
    const q = req.query, name = String(q.name || 'File').slice(0, 200);
    if (!req.body || !req.body.length) return res.status(400).json({ error: 'That file is empty.' });
    const t = await uploadTarget(req.session.email, q.cid, String(q.key || ''), q.svc);
    const folderId = await G.folderPath(t.parts);
    const f = await G.upload(folderId, name, req.get('content-type'), req.body);
    res.json(await runAction(req.session.email, { a: 'f-add', cid: q.cid, p: { key: q.key, svc: q.svc, name, mime: f.mimeType, size: req.body.length, fileId: f.id } }));
  } catch (e) {
    if (e instanceof Refuse) return res.status(400).json({ error: e.message });
    console.error('upload', e); res.status(500).json({ error: 'The upload did not go through: ' + e.message });
  }
});
/* a vendor's invoice, uploaded when recording a payment (admins only) */
app.post('/api/vendor-upload', express.raw({ type: () => true, limit: '25mb' }), async (req, res) => {
  try {
    if (!G.driveReady) return res.status(400).json({ error: 'File uploads need the Google Drive connection.' });
    if (!req.body || !req.body.length) return res.status(400).json({ error: 'That file is empty.' });
    const t = await vendorUploadTarget(req.session.email, String(req.query.member || '')), name = String(req.query.name || 'Invoice').slice(0, 200);
    const f = await G.upload(await G.folderPath(t.parts), name, req.get('content-type'), req.body);
    res.json({ fileId: f.id });
  } catch (e) { if (e instanceof Refuse) return res.status(400).json({ error: e.message }); console.error('vendor upload', e); res.status(500).json({ error: 'The upload did not go through: ' + e.message }); }
});
app.get('/api/vendor-file/:id', async (req, res) => {
  try {
    const po = await vendorFile(req.session.email, req.params.id), r = await G.download(po.file);
    res.set('Content-Type', r.headers.get('content-type') || 'application/octet-stream');
    res.set('Content-Disposition', 'inline; filename*=UTF-8\'\'' + encodeURIComponent(po.fileName || 'invoice'));
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.status(e instanceof Refuse ? 403 : 404).send(e instanceof Refuse ? e.message : 'This file is no longer in Google Drive.'); }
});
app.get('/api/file/:cid/:id', async (req, res) => {
  try {
    const f = await fileFor(req.session.email, req.params.cid, req.params.id);
    const r = await G.download(f.drive);
    res.set('Content-Type', f.mime || r.headers.get('content-type') || 'application/octet-stream');
    res.set('Content-Disposition', (req.query.dl ? 'attachment' : 'inline') + '; filename*=UTF-8\'\'' + encodeURIComponent(f.name));
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    if (e instanceof Refuse) return res.status(403).send(e.message);
    const gone = /not found|404|trash/i.test(String(e.message || ''));
    res.status(gone ? 404 : 500).type('html').send('<!doctype html><meta charset="utf-8"><body style="font-family:Arial,sans-serif;background:#f4efe5;color:#1f2a22;display:grid;place-items:center;min-height:90vh"><div style="background:#fffdf7;border:1px solid #e7dfcf;border-radius:14px;padding:28px;max-width:420px"><h2 style="margin-top:0">' + (gone ? 'This file is no longer in Google Drive' : 'This file could not be opened') + '</h2><p>' + (gone ? 'It may have been deleted or moved in Drive. You can remove it from the app with the Delete button next to the file.' : 'Please try again in a moment.') + '</p></div></body>');
  }
});
app.get('/api/backup', async (req, res) => {
  const me = await identify(pool, req.session.email).catch(() => null);
  if (!me || me.role !== 'admin') return res.status(403).send('Admins only.');
  res.set('Content-Disposition', 'attachment; filename="client-desk-backup-' + new Date().toISOString().slice(0, 10) + '.json"');
  res.json(await exportAll());
});
/* nightly backup to the shared drive, after 2am Singapore time; the last 30 are kept */
async function nightlyBackup(force) {
  if (!G.driveReady) return;
  const sg = new Date(Date.now() + 8 * 3600000), day = sg.toISOString().slice(0, 10), last = await getKV(pool, 'lastBackup', null);
  if (!force && (sg.getUTCHours() < 2 || (last && last.day === day && last.ok))) return;
  const rec = { day, at: new Date().toISOString() };
  try {
    const folder = await G.folderPath(['Backups']), data = Buffer.from(JSON.stringify(await exportAll()));
    const f = await G.upload(folder, 'client-desk-backup-' + day + '.json', 'application/json', data);
    rec.ok = true; rec.file = f.id; rec.size = data.length;
    const old = (await G.list(folder)).filter(x => /^client-desk-backup-/.test(x.name)).sort((a, b) => b.name.localeCompare(a.name)).slice(30);
    for (const o of old) await G.trash(o.id).catch(() => {});
  } catch (e) { rec.err = String(e.message || e).slice(0, 300); console.error('backup', e); }
  await tx(cl => setKV(cl, 'lastBackup', rec));
}
setInterval(() => nightlyBackup().catch(e => console.error('backup', e)), 30 * 60 * 1000);
app.post('/api/backup-now', async (req, res) => {
  const me = await identify(pool, req.session.email).catch(() => null);
  if (!me || me.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
  if (!G.driveReady) return res.status(400).json({ error: 'Backups to Drive need the Google Drive connection. You can still download a backup.' });
  await nightlyBackup(true); res.json({ ok: true, last: await getKV(pool, 'lastBackup', null) });
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }));

init().then(() => app.listen(PORT, () => { console.log('Client desk listening on ' + PORT); G.check().then(r => console.log('Google email: ' + r.mail + ' | Google Drive: ' + r.drive)).catch(e => console.error('Google check', e)); setTimeout(() => nightlyBackup().catch(e => console.error('backup', e)), 60000); })).catch(e => { console.error('Could not start', e); process.exit(1); });
