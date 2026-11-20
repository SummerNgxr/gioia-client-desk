/* Google Workspace connection through a service account:
   - email is sent as EMAIL_FROM (projects@gioia.asia) through the Gmail API, using domain-wide delegation for gmail.send only
   - files live in one shared drive (DRIVE_ID) that the service account is a member of */
'use strict';
const crypto = require('crypto');

function makeGoogle({ serviceAccount, emailFrom, driveId, fromName }) {
  let sa = null;
  try { sa = serviceAccount ? JSON.parse(serviceAccount) : null; } catch (e) { console.error('GOOGLE_SERVICE_ACCOUNT is not valid JSON'); }
  const mailReady = !!(sa && sa.private_key && sa.client_email && emailFrom);
  const driveReady = !!(sa && sa.private_key && sa.client_email && driveId);
  const tokens = {};

  const b64url = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  async function token(scope, sub) {
    const key = scope + '|' + (sub || ''), t = tokens[key];
    if (t && t.exp > Date.now() + 60000) return t.token;
    const now = Math.floor(Date.now() / 1000);
    const claim = Object.assign({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }, sub ? { sub } : {});
    const unsigned = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64url(JSON.stringify(claim));
    const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key);
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + unsigned + '.' + b64url(sig) });
    const j = await r.json();
    if (!r.ok) throw new Error('Google sign-in failed: ' + (j.error_description || j.error || r.status));
    tokens[key] = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
    return j.access_token;
  }
  async function call(url, opt, scope, sub) {
    const r = await fetch(url, Object.assign({}, opt, { headers: Object.assign({ Authorization: 'Bearer ' + await token(scope, sub) }, (opt || {}).headers || {}) }));
    if (!r.ok) { let m = r.status + ''; try { const j = await r.json(); m = (j.error && (j.error.message || j.error)) || m; } catch (e) {} throw new Error(m); }
    return r;
  }

  /* ---------- email ---------- */
  const enc = s => '=?UTF-8?B?' + Buffer.from(s).toString('base64') + '?=';
  async function sendMail({ to, subject, html, text, replyTo }) {
    if (!mailReady) throw new Error('Email is not connected yet.');
    const boundary = 'b' + crypto.randomBytes(8).toString('hex');
    const raw = [
      'From: ' + enc(fromName || 'Gioia') + ' <' + emailFrom + '>', 'To: ' + to, replyTo ? 'Reply-To: ' + replyTo : '', 'Subject: ' + enc(subject), 'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="' + boundary + '"', '',
      '--' + boundary, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(text || '').toString('base64'),
      '--' + boundary, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(html || '').toString('base64'),
      '--' + boundary + '--', ''
    ].filter((l, i) => l !== '' || i > 4).join('\r\n');
    await call('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: b64url(raw) }) }, 'https://www.googleapis.com/auth/gmail.send', emailFrom);
  }

  /* ---------- drive ---------- */
  const DS = 'https://www.googleapis.com/auth/drive', all = 'supportsAllDrives=true&includeItemsFromAllDrives=true';
  const q = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  async function folder(name, parent) {
    // find or create a folder by name inside its parent
    const p = parent || driveId, query = "mimeType='application/vnd.google-apps.folder' and trashed=false and name='" + q(name) + "' and '" + p + "' in parents";
    const r = await (await call('https://www.googleapis.com/drive/v3/files?' + all + '&corpora=drive&driveId=' + driveId + '&fields=files(id,name)&q=' + encodeURIComponent(query), {}, DS)).json();
    if (r.files && r.files[0]) return r.files[0].id;
    const c = await (await call('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [p] }) }, DS)).json();
    return c.id;
  }
  async function folderPath(parts) { let id = driveId; for (const n of parts) id = await folder(String(n).replace(/[\/\\]/g, '-').slice(0, 120) || 'Untitled', id); return id; }
  async function upload(parent, name, mime, buf) {
    const boundary = 'u' + crypto.randomBytes(8).toString('hex');
    const body = Buffer.concat([Buffer.from('--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify({ name, parents: [parent] }) + '\r\n--' + boundary + '\r\nContent-Type: ' + (mime || 'application/octet-stream') + '\r\n\r\n'), buf, Buffer.from('\r\n--' + boundary + '--')]);
    return (await call('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body }, DS)).json();
  }
  async function download(id) { return call('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media&supportsAllDrives=true', {}, DS); }
  async function list(parent) { const query = "'" + parent + "' in parents and trashed=false"; return ((await (await call('https://www.googleapis.com/drive/v3/files?' + all + '&corpora=drive&driveId=' + driveId + '&orderBy=name&pageSize=200&fields=files(id,name)&q=' + encodeURIComponent(query), {}, DS)).json()).files) || []; }
  async function remove(id) { await call('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?supportsAllDrives=true', { method: 'DELETE' }, DS); }

  // start-up check, without sending anything: can it sign in for email, and can it see the shared drive?
  async function check() {
    const out = { mail: mailReady ? 'configured' : 'not configured', drive: driveReady ? 'configured' : 'not configured' };
    if (mailReady) { try { await token('https://www.googleapis.com/auth/gmail.send', emailFrom); out.mail = 'ok, sending as ' + emailFrom; } catch (e) { out.mail = 'FAILED: ' + e.message; } }
    if (driveReady) { try { const r = await (await call('https://www.googleapis.com/drive/v3/drives/' + encodeURIComponent(driveId) + '?fields=name', {}, DS)).json(); out.drive = 'ok, shared drive "' + r.name + '"'; } catch (e) { out.drive = 'FAILED: ' + e.message; } }
    return out;
  }
  return { check, mailReady, driveReady, sendMail, folderPath, upload, download, list, remove, account: sa ? sa.client_email : '' };
}
module.exports = makeGoogle;
