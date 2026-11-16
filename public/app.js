'use strict';
/* Client Desk front end. All rules and permissions are enforced on the server; this file only draws what the server sends. */
const { MONTHS, money, short, ym, mName, due, ql, adhocOf, invLines, invTotal, inv, invLocked, taskOpen, statusOptions, STATUS, clone } = L;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmt = iso => { const d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

let D = null; // data from the server
const S = { view: 'clients', cid: '', tab: 'overview', ctab: 'work', ws: null, wm: 1, open: null, modal: null, toast: null };

const staff = () => D.me.role !== 'client';
const isAdmin = () => D.me.role === 'admin';
const client = () => D.clients.find(c => c.id === S.cid) || D.clients[0];
const svc = id => D.catalogue.find(s => s.id === id);
const member = id => D.team.find(m => m.id === id);
const unread = e => e.by !== D.me.key && e.at > (D.seen || '');
const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };

/* ---------- small view helpers ---------- */
const TONE = { pending: '', sent: 'info', paid: 'ok', accepted: 'ok', locked: 'lock', todo: '', awaiting: 'warn', changes: 'crit', approved: 'ok', submitted: 'info', done: 'ok' };
const pill = k => '<span class="pill ' + TONE[k] + '">' + STATUS[k] + '</span>';
const btn = (label, a, data, cls, dis) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '" ' + Object.entries(data || {}).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + (dis ? ' disabled' : '') + '>' + label + '</button>';
const field = (id, label, v, type) => '<div class="field"><label for="' + id + '">' + label + '</label>' + (type === 'area' ? '<textarea id="' + id + '">' + esc(v) + '</textarea>' : '<input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(v) + '">') + '</div>';
const fileLine = f => '<div class="row small">' + (f.url ? '🔗 <a href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.name) + '</a>' : '📄 ' + esc(f.name)) + ' <span class="muted">· ' + esc(f.by) + ' · ' + fmt(f.at) + '</span></div>';
function addBox(key) {
  return '<div class="addbox"><div class="field"><label for="ln-' + key + '">Share a Google link</label><input id="ln-' + key + '" type="text" placeholder="https://docs.google.com/..."></div><div class="field"><label for="lt-' + key + '">Link name</label><input id="lt-' + key + '" type="text" placeholder="e.g. Article 1 edited draft"></div>' + btn('Add link', 'f-link', { key }, 'ghost') + '</div><p class="small muted">File uploads arrive with the Google Drive connection. For now, share the Google link to the file.</p>';
}
function feedHtml(list) {
  if (!list.length) return '<p class="muted">Nothing yet.</p>';
  return '<div class="feed">' + list.map(e => '<div class="ev"><span class="muted small num">' + fmt(e.at) + '</span><span class="' + (unread(e) ? 'unread' : '') + '"><span class="chip ' + (e.client ? 'client' : '') + '">' + esc(e.who) + '</span> ' + esc(e.text) + (e.internal ? ' <span class="muted small">· team only</span>' : '') + '</span></div>').join('') + '</div>';
}

/* ---------- workspaces (shared by all roles) ---------- */
function taskHtml(c, t) {
  const A = staff(), acts = [];
  if (A) {
    if (t.owner === 'gioia' && t.approve && (t.status === 'todo' || t.status === 'changes')) acts.push(btn(t.status === 'changes' ? 'Resubmit for approval' : 'Submit for approval', 't-submit', { id: t.id }));
    if (t.owner === 'gioia' && !t.approve && t.status === 'todo') acts.push(btn('Mark as done', 't-done', { id: t.id }));
    if (t.status === 'approved') acts.push(btn('Mark as done', 't-done', { id: t.id }));
    if (t.owner === 'client' && (t.status === 'todo' || t.status === 'submitted')) acts.push(btn('Mark as received', 't-done', { id: t.id }, t.status === 'todo' ? 'ghost' : ''));
  } else {
    if (t.status === 'awaiting') acts.push(btn('Approve', 't-approve', { id: t.id }));
    if (t.owner === 'client' && t.status === 'todo') acts.push(btn('Mark as sent', 't-sent', { id: t.id }));
  }
  const canChange = !A && t.status === 'awaiting';
  acts.push(btn((canChange ? 'Comment, links or request changes' : 'Comments and links') + ' (' + (t.comments.length + t.files.length) + ')', 't-open', { id: t.id }, 'quiet'));
  let ctl = '';
  if (A) {
    ctl = '<div class="row ctl">' + (t.owner === 'gioia' ? '<label for="as-' + t.id + '">Assigned to</label><select id="as-' + t.id + '" data-as="' + t.id + '"><option value="">Unassigned</option>' + D.team.map(m => '<option value="' + m.id + '"' + (t.assignee === m.id ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') + '</select>' : '') +
      '<label for="st-' + t.id + '">Status</label><select id="st-' + t.id + '" data-ts="' + t.id + '">' + statusOptions(t).map(k => '<option value="' + k + '"' + (t.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>').join('') + '</select></div>';
  } else if (t.assignee && member(t.assignee)) ctl = '<div class="small muted">Handled by ' + esc(member(t.assignee).name) + '</div>';
  let panel = '';
  if (S.open === t.id) {
    panel = '<div class="stack panel">' + (t.files.length ? '<div class="stack" style="gap:4px">' + t.files.map(fileLine).join('') + '</div>' : '') +
      t.comments.map(m => '<div class="cmt"><span class="chip ' + (m.client ? 'client' : '') + '">' + esc(m.by) + '</span> ' + esc(m.text) + ' <span class="muted small">· ' + fmt(m.at) + '</span></div>').join('') +
      '<div class="field"><label for="cm-' + t.id + '">Your comment</label><textarea id="cm-' + t.id + '"></textarea></div><div class="row">' + btn('Add comment', 't-comment', { id: t.id }, 'ghost') +
      (canChange ? btn('Request changes with this comment', 't-changes', { id: t.id }, 'ghost', t.rounds >= 2) : '') + '</div>' +
      (canChange && t.rounds >= 2 ? '<p class="small muted">Both included revision rounds are used. Further changes are quoted separately.</p>' : '') + addBox(t.id) + '</div>';
  }
  return '<div class="task s-' + t.status + '"><div class="row between"><div class="row"><span class="ttitle">' + esc(t.title) + '</span><span class="chip ' + (t.owner === 'client' ? 'client' : '') + '">' + (t.owner === 'client' ? 'Client' : 'Team') + '</span></div><div class="row">' +
    (t.approve ? '<span class="small muted num">Revisions ' + t.rounds + ' of 2</span>' : '') + pill(t.status) + '</div></div>' + ctl + '<div class="row">' + acts.join('') + '</div>' + panel + '</div>';
}
function workspacesHtml(c) {
  if (!c.tasks.length) return '<div class="lockbox">Workspaces are created when the quotation is accepted.</div>';
  const ids = [...c.quote.lines, ...c.extra].map(s => s.id); if (!ids.includes(S.ws)) S.ws = ids[0];
  const s = ql(c, S.ws), ad = s.adhoc ? adhocOf(c, s.adhoc) : null, monthly = s.billing === 'monthly' && !ad; const m = ad ? 0 : monthly ? Math.min(S.wm, c.quote.months) : 1;
  const count = id => c.tasks.filter(t => t.svc === id && taskOpen(c, t) && (staff() ? ['changes', 'approved', 'submitted'].includes(t.status) : (t.status === 'awaiting' || (t.owner === 'client' && t.status === 'todo')))).length;
  let h = '<div class="wsnav">' + ids.map(id => { const n = count(id); return '<button data-a="ws" data-id="' + esc(id) + '" aria-pressed="' + (id === S.ws) + '">' + esc(short(ql(c, id))) + (ql(c, id).adhoc ? ' (added)' : '') + (n ? ' · ' + n : '') + '</button>'; }).join('') + '</div>';
  if (monthly) h += '<div class="wsnav">' + Array.from({ length: c.quote.months }, (_, i) => i + 1).map(x => '<button data-a="wm" data-m="' + x + '" aria-pressed="' + (x === m) + '">' + (inv(c, x).status === 'paid' ? '' : '🔒 ') + MONTHS[ym(c, x).mo].slice(0, 3) + '</button>').join('') + '</div>';
  const list = c.tasks.filter(t => t.svc === S.ws && t.m === m), i = ad || inv(c, m), amt = isAdmin() || !staff();
  if (i.status !== 'paid') {
    h += '<div class="lockbox"><b>' + (ad ? 'This added service' : mName(c, m)) + ' is locked.</b><br>' + (ad ? 'It unlocks when invoice ' + ad.no + (amt ? ' (' + money(ad.amount) + ')' : '') + ' is marked as paid.' : invLocked(c, m) ? 'Months ' + (c.quote.committed + 1) + ' to ' + c.quote.months + ' start once both parties confirm the renewal.' : 'It unlocks when invoice ' + i.no + (amt ? ' (' + money(invTotal(c, m)) + ', due ' + due(c, m) + ')' : '') + ' is marked as paid.') +
      '<br><span class="small">' + list.length + ' tasks are queued.</span></div>';
  } else {
    const done = list.filter(t => t.status === 'done').length;
    h += '<p class="muted small">' + (monthly ? mName(c, m) : ad ? 'Added service, invoice ' + ad.no : 'One-off project') + ' · ' + done + ' of ' + list.length + ' tasks done' + (staff() ? ' · Use the buttons for the normal flow, or set any status directly with the Status menu.' : '') + '</p><div class="stack">' + list.map(t => taskHtml(c, t)).join('') + '</div>';
  }
  return '<div class="stack">' + h + '</div>';
}

/* ---------- quotation and invoice documents ---------- */
function docHtml(c, type, m) {
  const q = c.quote, B = D.brand, isQ = type === 'quote', a = type === 'adhoc' ? adhocOf(c, m) : null, lines = a ? [{ s: a.s, name: a.name, amount: a.amount }] : invLines(c, isQ ? 1 : m); let n = 0;
  const rows = lines.map(l => '<tr><td>' + (l.s ? '<div class="lt">' + (++n) + ') ' + esc(l.name) + '</div><ul>' + l.s.bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>' + (l.s.note ? '<i>' + esc(l.s.note) + '</i>' : '') : '<div class="lt">' + esc(l.name) + '</div>') + '</td><td class="num">' + (l.s ? l.amount.toLocaleString('en-SG') : '') + '</td><td class="num">' + (l.s ? 1 : '') + '</td><td class="right num">' + money(l.amount) + '</td></tr>').join('');
  const once = lines.filter(l => l.s && l.s.billing === 'once').reduce((x, l) => x + l.amount, 0), m1 = invTotal(c, 1), m2 = q.months > 1 ? invTotal(c, 2) : 0;
  let foot;
  if (isQ) {
    foot = (once ? '<div class="sub"><span>One-time fee</span><span class="num">' + money(once) + '</span></div>' : '') + '<div class="bar"><span>Month 1 retainer</span><span class="num">' + money(m1 - once) + '</span></div>' +
      '<h4>Payment Schedule &amp; Project Timeline</h4><b>Payment</b><ul><li>Each month is payable in advance on the 1st day of that month, before work for that month starts.</li><li>Month 1 (' + mName(c, 1) + '): ' + money(m1) + ' in total' + (once ? ', including the ' + money(once) + ' one-time fee' : '') + '.</li>' +
      (q.months > 1 ? '<li>Month 2 to Month ' + q.months + ': ' + money(m2) + ' per month' + (q.discount ? ', after the ' + money(q.discount) + ' discount' : '') + '.</li>' : '') + '</ul>' +
      '<b>Commitment</b><ul><li>Months 1 to ' + q.committed + ' are committed' + (q.months > q.committed ? '. Months ' + (q.committed + 1) + ' to ' + q.months + ' go ahead when both parties confirm' : '') + '.</li></ul>';
  } else if (a) {
    foot = '<div class="bar"><span>Total</span><span class="num">' + money(a.amount) + '</span></div><p>Work on this item starts when payment is received.</p>';
  } else {
    foot = '<div class="bar"><span>Month ' + m + ' total · due ' + due(c, m) + '</span><span class="num">' + money(invTotal(c, m)) + '</span></div><p>Payable in advance on the 1st day of the month, before work for that month starts.</p>';
  }
  const head = '<div class="logo"><b>' + esc(B.mark) + '</b>' + (B.tagline ? '<i>' + esc(B.tagline) + '</i>' : '') + '</div><div class="co">' + esc(B.company) + '</div><div class="addr">' + esc(B.address).replace(/\n/g, '<br>') + '</div>';
  return '<div class="scroll"><div class="doc">' + head +
    '<div class="row between" style="align-items:flex-start"><div><div class="lab">Issued to:</div>' + esc(c.contact) + '<br>' + esc(c.company) + '<br>' + esc(c.website) + '</div><div class="right"><div><span class="lab">' + (isQ ? 'Quotation no:' : 'Invoice no:') + '</span> <b>' + (isQ ? q.no : a ? a.no : inv(c, m).no) + '</b></div><div><span class="lab">Date:</span> ' + (isQ ? esc(q.date) : a ? esc(a.date) : due(c, m).toUpperCase().replace(/ /g, '-')) + '</div>' + (isQ ? '' : '<div><span class="lab">Quotation:</span> ' + q.no + '</div>') + '</div></div>' +
    '<table><thead><tr><th>Description</th><th>Unit price</th><th>Qty</th><th class="right">Total</th></tr></thead><tbody><tr><td colspan="4"><b class="lab">Period:</b> ' + (isQ ? mName(c, 1) + ' to ' + mName(c, q.months) + ' (' + q.months + ' months)' : a ? 'Additional item, outside the monthly retainer' : mName(c, m) + ' (Month ' + m + ' of ' + q.months + ')') + '</td></tr>' + rows + '</tbody></table>' + foot +
    (isQ && B.terms ? '<div class="page2">' + head + '<div class="lab" style="margin-bottom:8px">Terms &amp; Conditions</div><div class="terms">' + esc(B.terms) + '</div></div>' : '') + '</div></div>';
}

/* ---------- staff views ---------- */
function clientsView() {
  return '<div class="row between"><h1>Clients</h1>' + (isAdmin() ? btn('New client', 'new-client') : '') + '</div>' + (D.clients.length ? '<div class="card scroll"><table><thead><tr><th>Client</th><th>Contact</th><th>Quotation</th><th>Paid months</th><th>Needs the team</th><th></th></tr></thead><tbody>' +
    D.clients.map(c => { const need = c.tasks.filter(t => taskOpen(c, t) && ['changes', 'approved', 'submitted'].includes(t.status)).length;
      return '<tr><td><b>' + esc(c.company) + '</b></td><td>' + esc(c.contact) + '</td><td>' + esc(c.quote.no) + ' ' + pill(c.quote.status) + '</td><td class="num">' + c.invoices.filter(i => i.status === 'paid').length + ' of ' + (c.invoices.length || c.quote.months) + '</td><td class="num">' + (need ? '<span class="pill warn">' + need + ' tasks</span>' : '<span class="muted">None</span>') + '</td><td class="right">' + btn('Open', 'open-client', { id: c.id }, 'ghost') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="lockbox">No clients yet.' + (isAdmin() ? ' Use New client to add your first one.' : '') + '</div>');
}
function overviewTab(c) {
  const paid = c.invoices.filter(i => i.status === 'paid').length, open = c.tasks.filter(t => taskOpen(c, t)), next = c.invoices.find(i => i.status !== 'paid' && !invLocked(c, i.m));
  const step = (on, t, d) => '<div class="step ' + (on ? 'on' : '') + '"><b>' + t + '</b><span class="small muted">' + d + '</span></div>';
  const load = D.team.map(m => { const n = open.filter(t => t.assignee === m.id && t.status !== 'done').length; return n ? esc(m.name) + ': ' + n : ''; }).filter(Boolean).join(' · ');
  return '<div class="steps">' + step(true, '1. Account', 'Created') + step(c.quote.status === 'accepted', '2. Quotation', STATUS[c.quote.status]) + step(paid > 0, '3. Payment', paid ? paid + ' of ' + c.invoices.length + ' months paid' : 'No invoice paid yet') + step(L.hasAccess(c) && !!c.email, '4. Client access', !c.email ? 'Add their Google email' : L.hasAccess(c) ? 'Client can sign in' : 'Opens after first payment') + step(open.length > 0, '5. Tasks', open.length ? open.filter(t => t.status === 'done').length + ' of ' + open.length + ' active tasks done' : 'Not active') + '</div>' +
    (next && isAdmin() ? '<div class="card row between"><span>Next invoice: <b>' + next.no + '</b> for ' + mName(c, next.m) + ', <span class="num">' + money(invTotal(c, next.m)) + '</span>, due ' + due(c, next.m) + ' ' + pill(next.status) + '</span>' + btn('Go to invoices', 'tab', { t: 'invoices' }, 'ghost') + '</div>' : '') +
    (open.length ? '<div class="card"><b>Open tasks by team member:</b> ' + (load || '<span class="muted">none assigned yet. Assign tasks under Workspaces.</span>') + '</div>' : '') +
    '<div class="grid2"><div class="card stack"><h3>Client details</h3>' + field('d-company', 'Company', c.company) + field('d-contact', 'Contact person', c.contact) + field('d-email', 'Google email (used to sign in)', c.email, 'email') + field('d-phone', 'Phone', c.phone) + field('d-website', 'Website', c.website) + '</div>' +
    '<div class="card stack"><h3>Internal notes (only the team sees these)</h3>' + field('d-notes', 'Notes', c.notes, 'area') + '<div>' + btn('Save details', 'save-details') + '</div>' + (c.email ? '' : '<p class="small muted">Add the client\'s Google email so they can sign in.</p>') + '</div></div>';
}
function quoteTab(c) {
  const q = c.quote;
  if (q.status === 'accepted') return '<div class="card stack"><div class="row between"><h2>Quotation ' + esc(q.no) + ' ' + pill('accepted') + '</h2>' + btn('View document', 'doc', { type: 'quote' }, 'ghost') + '</div><div class="scroll"><table><thead><tr><th>Service</th><th>Billing</th><th class="right">Price</th></tr></thead><tbody>' + q.lines.map(s => '<tr><td>' + esc(s.name) + '</td><td>' + (s.billing === 'once' ? 'One-time, Month 1' : 'Monthly, Months 1 to ' + q.months) + '</td><td class="right num">' + money(s.price) + '</td></tr>').join('') + (q.discount ? '<tr><td>Monthly discount</td><td>Months 2 to ' + q.months + '</td><td class="right num">' + money(-q.discount) + '</td></tr>' : '') + '</tbody></table></div><p class="muted small">' + mName(c, 1) + ' to ' + mName(c, q.months) + '. Months 1 to ' + q.committed + ' committed. Its invoices are under the Invoices tab.</p></div>';
  const m1 = invTotal(c, 1), m2 = invTotal(c, 2);
  return '<div class="grid2"><div class="card stack"><h3>Service catalogue: click to add</h3>' + (D.catalogue.length ? D.catalogue.map(s => '<button class="pickbtn" data-a="q-add" data-id="' + esc(s.id) + '"' + (ql(c, s.id) ? ' disabled' : '') + '><span><b>' + esc(s.name) + '</b><br><span class="small muted">' + esc(s.bullets[0] || '') + '</span></span><span class="num"><b>' + money(s.price) + '</b><br><span class="small muted">' + (s.billing === 'once' ? 'one-time' : 'per month') + '</span></span></button>').join('') : '<p class="muted">The catalogue is empty. Add services under Service catalogue first.</p>') + '</div>' +
    '<div class="card stack"><div class="row between"><h2>Quotation ' + esc(q.no) + '</h2>' + pill(q.status) + '</div>' +
    (q.lines.length ? q.lines.map(s => '<div class="row between"><span>' + esc(s.name) + ' <span class="small muted">· ' + (s.billing === 'once' ? 'one-time' : 'monthly') + ' · opens a workspace with ' + s.tasks.length + ' tasks' + (s.billing === 'monthly' ? ' a month' : '') + '</span></span><span class="row"><b class="num">' + money(s.price) + '</b><button class="link" data-a="q-remove" data-id="' + esc(s.id) + '">Remove</button></span></div>').join('') : '<p class="muted">No services yet. Click a service on the left to add it.</p>') +
    '<div class="grid2" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="field"><label for="q-start">First month</label><input id="q-start" type="month" data-q="start" value="' + esc(q.start) + '"></div><div class="field"><label for="q-months">Total months</label><input id="q-months" type="number" min="1" max="24" data-q="months" value="' + q.months + '"></div><div class="field"><label for="q-committed">Committed months</label><input id="q-committed" type="number" min="1" max="24" data-q="committed" value="' + q.committed + '"></div><div class="field"><label for="q-discount">Monthly discount from Month 2 ($)</label><input id="q-discount" type="number" min="0" data-q="discount" value="' + q.discount + '"></div></div>' +
    '<div class="row between"><span>Month 1: <b class="num">' + money(m1) + '</b></span>' + (q.months > 1 ? '<span>Month 2 onward: <b class="num">' + money(m2) + '</b></span>' : '') + '</div>' +
    '<div class="row">' + btn('Preview document', 'doc', { type: 'quote' }, 'ghost', !q.lines.length) + (q.status === 'pending' ? btn('Mark as sent', 'q-sent', {}, '', !q.lines.length) : '') + btn('Mark as accepted', 'q-accept', {}, q.status === 'pending' ? 'ghost' : '', !q.lines.length) + '</div><p class="small muted">Accepting creates one invoice per month and queues the workspaces. Tasks stay locked until each month is paid.</p></div></div>';
}
function invoicesTab(c, readonly) {
  if (!c.invoices.length) return '<div class="lockbox">Invoices are created automatically when the quotation is marked as accepted.</div>';
  const q = c.quote, pending = q.months > q.committed && !q.renewed;
  return (pending ? '<div class="card row between"><span>Months ' + (q.committed + 1) + ' to ' + q.months + ' go ahead only when both parties confirm the renewal.</span>' + (readonly ? '' : btn('Confirm renewal', 'renew', {}, 'ghost')) + '</div>' : '') +
    '<div class="card scroll"><table><thead><tr><th>Month</th><th>Invoice</th><th>Due</th><th class="right">Amount</th><th>Status</th><th></th></tr></thead><tbody>' + c.invoices.map(i => { const lk = invLocked(c, i.m);
      return '<tr><td>' + mName(c, i.m) + '</td><td class="num">' + esc(i.no) + '</td><td class="num">' + due(c, i.m) + '</td><td class="right num">' + money(invTotal(c, i.m)) + '</td><td>' + pill(lk ? 'locked' : i.status) + '</td><td class="right"><div class="row" style="justify-content:flex-end">' + btn('View', 'doc', { type: 'inv', m: i.m }, 'quiet') +
        (readonly || lk ? '' : (i.status === 'pending' ? btn('Mark as sent', 'i-sent', { m: i.m }, 'ghost') : '') + (i.status !== 'paid' ? btn('Mark as paid', 'i-paid', { m: i.m }) : '')) + '</div></td></tr>'; }).join('') + '</tbody></table></div>' +
    '<p class="small muted">Committed total (Months 1 to ' + q.committed + '): <b class="num">' + money(Array.from({ length: q.committed }, (_, i) => invTotal(c, i + 1)).reduce((x, y) => x + y, 0)) + '</b> · Full term: <b class="num">' + money(c.invoices.reduce((x, i) => x + invTotal(c, i.m), 0)) + '</b></p>' +
    '<h2>Ad hoc invoices</h2>' + (c.adhoc.length ? '<div class="card scroll"><table><thead><tr><th>Item</th><th>Invoice</th><th>Date</th><th class="right">Amount</th><th>Status</th><th></th></tr></thead><tbody>' + c.adhoc.map(a => '<tr><td>' + esc(a.name) + (a.s ? ' <span class="small muted">· opens a workspace</span>' : '') + '</td><td class="num">' + esc(a.no) + '</td><td class="num">' + esc(a.date) + '</td><td class="right num">' + money(a.amount) + '</td><td>' + pill(a.status) + '</td><td class="right"><div class="row" style="justify-content:flex-end">' + btn('View', 'doc', { type: 'adhoc', id: a.id }, 'quiet') + (readonly ? '' : (a.status === 'pending' ? btn('Mark as sent', 'ah-sent', { id: a.id }, 'ghost') : '') + (a.status !== 'paid' ? btn('Mark as paid', 'ah-paid', { id: a.id }) : '')) + '</div></td></tr>').join('') + '</tbody></table></div>' : '<p class="muted small">None yet.' + (readonly ? '' : ' Use this when the client adds a service along the way.') + '</p>') +
    (readonly ? '' : '<div class="card stack"><h3>Create an ad hoc invoice</h3><div class="addbox"><div class="field"><label for="ah-svc">Service</label><select id="ah-svc"><option value="">Custom item (no workspace)</option>' + D.catalogue.map(s => '<option value="' + esc(s.id) + '">' + esc(s.name) + ' · ' + money(s.price) + '</option>').join('') + '</select></div>' + field('ah-name', 'Description (for a custom item)', '') + field('ah-amt', 'Amount ($), blank uses the catalogue price', '', 'number') + btn('Create invoice', 'ah-create', {}, 'ghost') + '</div><p class="small muted">Choosing a catalogue service also queues its workspace once. It unlocks when this invoice is paid.</p></div>');
}
function filesTab(c) {
  const folders = ['Quotations and invoices', ...new Set([...c.quote.lines, ...c.extra].map(short)), 'Reports', 'General'];
  return '<div class="card stack"><h2>' + esc(c.company) + '</h2><p class="muted small">Links shared on tasks are filed here by service. The Google Drive folder connection comes next.</p>' +
    folders.map(f => { const list = c.files.filter(x => x.folder === f); return '<div class="folder"><div class="row between"><b>📁 ' + esc(f) + '</b><span class="muted small">' + (list.length ? list.length + (list.length === 1 ? ' item' : ' items') : 'empty') + '</span></div>' + list.map(fileLine).join('') + '</div>'; }).join('') +
    '<h3>Add to the General folder</h3>' + addBox('general') + '</div>';
}
function clientView() {
  const c = client(); let tabs = [['overview', 'Overview'], ['work', 'Workspaces'], ['files', 'Files'], ['activity', 'Activity'], ['quote', 'Quotation'], ['invoices', 'Invoices']];
  if (!isAdmin()) { tabs = tabs.filter(t => t[0] !== 'quote' && t[0] !== 'invoices'); if (S.tab === 'quote' || S.tab === 'invoices') S.tab = 'overview'; }
  const body = { overview: overviewTab, quote: quoteTab, invoices: invoicesTab, work: c => '<div class="card">' + workspacesHtml(c) + '</div>', files: filesTab, activity: c => '<div class="card">' + feedHtml(D.feed.filter(e => e.cid === c.id)) + '</div>' }[S.tab](c);
  return '<div><button class="link" data-a="nav" data-v="clients">Clients</button> <span class="muted">/</span><h1>' + esc(c.company) + '</h1></div><div class="tabs" role="tablist">' + tabs.map(([k, l]) => '<button role="tab" data-a="tab" data-t="' + k + '" aria-selected="' + (S.tab === k) + '">' + l + '</button>').join('') + '</div>' + body;
}
function catalogueView() {
  return '<div class="row between"><h1>Service catalogue</h1>' + btn('Add service', 'svc-new') + '</div><p class="muted">Your standard services. Each one carries its price, its description for the quotation, and the task list that opens as a workspace.</p><div class="grid2">' + D.catalogue.map(s => '<div class="svc card"><div class="row between"><h2>' + esc(s.name) + '</h2><span class="row"><span class="pill ' + (s.billing === 'once' ? 'info' : 'ok') + '">' + (s.billing === 'once' ? 'One-time' : 'Monthly') + '</span>' + btn('Edit', 'svc-edit', { id: s.id }, 'quiet') + '</span></div><div class="num"><b>' + money(s.price) + '</b>' + (s.billing === 'monthly' ? ' per month' : '') + '</div><ul>' + s.bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>' + (s.note ? '<i class="small muted">' + esc(s.note) + '</i>' : '') + '<h3 style="margin-top:8px">Workspace tasks' + (s.billing === 'monthly' ? ' (each month)' : '') + '</h3><div class="stack" style="gap:4px">' + s.tasks.map(t => '<div class="row between small"><span>' + esc(t[0]) + '</span><span class="row"><span class="chip ' + (t[1] === 'client' ? 'client' : '') + '">' + (t[1] === 'client' ? 'Client' : 'Team') + '</span>' + (t[2] ? '<span class="chip">Needs approval</span>' : '') + '</span></div>').join('') + '</div></div>').join('') + '</div>';
}
function teamView() {
  return '<h1>Team</h1><p class="muted">Team members sign in with their Google account. The app recognises each person by the Google email saved here, and anyone not on this list or a client record is turned away. Admins see everything. Team members see clients, workspaces, files and activity, but not quotations, invoices, prices or the catalogue.</p><div class="card scroll"><table><thead><tr><th>Name</th><th>Google email (sign-in)</th><th>Role</th><th></th></tr></thead><tbody>' +
    D.team.map(m => '<tr><td><input type="text" data-tn="' + m.id + '" value="' + esc(m.name) + '" aria-label="Name"></td><td>' + (m.id === D.me.id ? esc(m.email) + ' <span class="muted small">(you)</span>' : '<input type="email" data-te="' + m.id + '" value="' + esc(m.email) + '" placeholder="Add Google email" aria-label="Google email for ' + esc(m.name) + '">') + '</td><td><span class="pill ' + (m.admin ? 'ok' : 'info') + '">' + (m.admin ? 'Admin' : 'Team member') + '</span></td><td class="right">' + (m.id === D.me.id ? '' : btn('Remove', 'team-del', { id: m.id }, 'quiet')) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="card stack" style="max-width:520px"><h3>Add a team member</h3>' + field('tm-name', 'Name', '') + field('tm-email', 'Google email (this is how the app recognises them)', '', 'email') + '<div class="field"><label for="tm-role">Role</label><select id="tm-role"><option value="0">Team member</option><option value="1">Admin</option></select></div><div>' + btn('Add team member', 'team-add') + '</div></div>';
}
function settingsView() {
  const B = D.brand;
  return '<h1>Settings</h1><p class="muted">These details appear on every quotation and invoice.</p><div class="card stack" style="max-width:680px">' + field('b-mark', 'Logo wordmark', B.mark) + field('b-tagline', 'Tagline under the wordmark', B.tagline) + field('b-company', 'Company name', B.company) + field('b-address', 'Address (one line per row)', B.address, 'area') + field('b-terms', 'Terms & Conditions (printed as page 2 of each quotation)', B.terms, 'area') + '<div>' + btn('Save settings', 'brand-save') + '</div></div>';
}
function staffHtml() {
  const need = D.feed.filter(unread).length;
  let nav = [['clients', 'Clients', ''], ['catalogue', 'Service catalogue', ''], ['team', 'Team', ''], ['activity', 'Activity', need || ''], ['settings', 'Settings', '']];
  if (!isAdmin()) { nav = nav.filter(n => ['clients', 'activity'].includes(n[0])); if (!['clients', 'client', 'activity'].includes(S.view)) S.view = 'clients'; }
  if (S.view === 'client' && !D.clients.length) S.view = 'clients';
  const cur = S.view === 'client' ? 'clients' : S.view;
  const main = S.view === 'clients' ? clientsView() : S.view === 'client' ? clientView() : S.view === 'catalogue' ? catalogueView() : S.view === 'team' ? teamView() : S.view === 'settings' ? settingsView() : '<h1>Activity</h1><p class="muted">Every action by a client or a team member is logged here.</p><div class="card">' + feedHtml(D.feed.map(e => Object.assign({}, e, { text: ((D.clients.find(c => c.id === e.cid) || {}).company || '') + ': ' + e.text }))) + '</div>';
  return '<div class="shell"><nav class="side">' + nav.map(([k, l, n]) => '<button data-a="nav" data-v="' + k + '" aria-current="' + (cur === k) + '"><span>' + l + '</span>' + (n ? '<span class="pill warn">' + n + '</span>' : '') + '</button>').join('') + '</nav><main class="main">' + main + '</main></div>';
}

/* ---------- client portal ---------- */
function portalHtml() {
  const c = client(), n = D.feed.filter(unread).length;
  const tabs = [['work', 'Workspaces'], ['files', 'Files'], ['details', 'My details'], ['invoices', 'Invoices'], ['notes', 'Notifications' + (n ? ' (' + n + ')' : '')]];
  const wait = c.tasks.filter(t => taskOpen(c, t) && t.status === 'awaiting').length, todo = c.tasks.filter(t => taskOpen(c, t) && t.owner === 'client' && t.status === 'todo').length;
  const body = S.ctab === 'work' ? '<div class="card row"><span class="pill warn">' + wait + ' waiting for your approval</span><span class="pill info">' + todo + ' for you to send</span></div><div class="card">' + workspacesHtml(c) + '</div>'
    : S.ctab === 'invoices' ? invoicesTab(c, true) : S.ctab === 'files' ? filesTab(c)
    : S.ctab === 'details' ? '<div class="card stack" style="max-width:520px">' + field('d-company', 'Company', c.company) + field('d-contact', 'Contact person', c.contact) + field('d-phone', 'Phone', c.phone) + field('d-website', 'Website', c.website) + '<p class="small muted">Signed in with Google as ' + esc(D.me.email) + '.</p><div>' + btn('Save details', 'save-details') + '</div></div>'
    : '<div class="card">' + feedHtml(D.feed) + '</div>';
  return '<div class="solo"><div><h3>Client portal</h3><h1>Welcome, ' + esc(c.contact || c.company) + '</h1></div><div class="tabs" role="tablist">' + tabs.map(([k, l]) => '<button role="tab" data-a="ctab" data-t="' + k + '" aria-selected="' + (S.ctab === k) + '">' + l + '</button>').join('') + '</div>' + body + '</div>';
}

/* ---------- catalogue editor ---------- */
function svcModal() {
  const d = S.modal.draft;
  return '<div class="modal" data-a="close-bg"><div class="sheet stack" style="max-width:640px"><h2>' + (d.isNew ? 'Add service' : 'Edit service') + '</h2>' + field('e-name', 'Service name', d.name) +
    '<div class="grid2" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + field('e-price', 'Price ($)', d.price, 'number') + '<div class="field"><label for="e-billing">Billing</label><select id="e-billing"><option value="once"' + (d.billing === 'once' ? ' selected' : '') + '>One-time (Month 1)</option><option value="monthly"' + (d.billing === 'monthly' ? ' selected' : '') + '>Monthly</option></select></div></div>' +
    field('e-bullets', 'Description for the quotation (one point per line)', d.bullets.join('\n'), 'area') + field('e-note', 'Small note under the description (optional)', d.note) +
    '<h3>Workspace tasks</h3>' + d.tasks.map((t, i) => '<div class="trow"><input id="et-title-' + i + '" type="text" value="' + esc(t[0]) + '" aria-label="Task ' + (i + 1) + ' title" placeholder="Task title"><select id="et-owner-' + i + '" aria-label="Task ' + (i + 1) + ' owner"><option value="gioia"' + (t[1] === 'gioia' ? ' selected' : '') + '>Team</option><option value="client"' + (t[1] === 'client' ? ' selected' : '') + '>Client</option></select><label class="small"><input id="et-appr-' + i + '" type="checkbox"' + (t[2] ? ' checked' : '') + '> Needs approval</label><button class="link" data-a="svc-row-del" data-i="' + i + '">Remove</button></div>').join('') +
    '<div>' + btn('Add task', 'svc-row-add', {}, 'quiet') + '</div><p class="small muted">Changes apply to new quotations. Quotations already created keep their own copy of the service.</p>' +
    '<div class="row">' + btn('Save service', 'svc-save') + btn('Cancel', 'close', {}, 'quiet') + (d.isNew ? '' : btn('Delete service', 'svc-delete', {}, 'quiet')) + '</div></div></div>';
}
function syncDraft() {
  const d = S.modal.draft; d.name = val('e-name'); d.price = Math.max(0, +val('e-price') || 0); d.billing = val('e-billing'); d.note = val('e-note');
  d.bullets = val('e-bullets').split('\n').map(x => x.trim()).filter(Boolean);
  d.tasks = d.tasks.map((t, i) => [val('et-title-' + i), val('et-owner-' + i), document.getElementById('et-appr-' + i).checked && val('et-owner-' + i) === 'gioia']);
}

/* ---------- gates, render ---------- */
function gateHtml() {
  const B = D.brand || {}, failed = /signin=failed/.test(location.search);
  let body;
  if (!D.me) body = '<p>Sign in with the Google account your invitation was sent to.</p>' + (failed ? '<p class="pill crit" style="align-self:center">Sign-in did not complete. Please try again.</p>' : '') + (D.googleReady ? '<a class="btn" href="/auth/google">Sign in with Google</a>' : '<p class="muted">Google sign-in is being set up. Please check back shortly.</p>') + (D.devLogin ? '<p class="small muted">Local testing: open /auth/dev?email=you@example.com</p>' : '');
  else if (D.me.role === 'pending') body = '<p>You are signed in as <b>' + esc(D.me.email) + '</b>.</p><p>Your workspace opens once your first invoice has been received. We will be in touch.</p><a class="btn ghost" href="/auth/logout">Sign out</a>';
  else body = '<p>You are signed in as <b>' + esc(D.me.email) + '</b>, but this account is not on the client or team list.</p><p class="muted">Ask your contact to add this email, or sign in with a different Google account.</p><a class="btn ghost" href="/auth/logout">Use a different account</a>';
  return '<div class="gate"><div class="card"><div class="mark">' + esc(B.mark || 'Client Desk') + '</div><h3>Client Desk</h3>' + body + '</div></div>';
}
let toastTimer;
function toast(t) { S.toast = t; clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; render(); }, 4000); }
function render() {
  const root = document.getElementById('app');
  if (!D) return;
  if (!D.me || !['admin', 'team', 'client'].includes(D.me.role)) { root.innerHTML = gateHtml(); return; }
  const c = client();
  let modal = '';
  if (S.modal && S.modal.kind === 'doc' && c) modal = '<div class="modal" data-a="close-bg"><div class="sheet"><div class="row between noprint" style="margin-bottom:10px"><h2>' + (S.modal.type === 'quote' ? 'Quotation ' + esc(c.quote.no) : 'Invoice ' + esc(S.modal.type === 'adhoc' ? adhocOf(c, S.modal.m).no : inv(c, S.modal.m).no)) + '</h2><span class="row">' + btn('Print or save as PDF', 'print', {}, 'ghost') + btn('Close', 'close', {}, 'quiet') + '</span></div>' + docHtml(c, S.modal.type, S.modal.m) + '</div></div>';
  if (S.modal && S.modal.kind === 'new') modal = '<div class="modal" data-a="close-bg"><div class="sheet stack" style="max-width:480px"><h2>New client</h2>' + field('n-company', 'Company', '') + field('n-contact', 'Contact person', '') + field('n-email', 'Google email (used to sign in)', '', 'email') + field('n-website', 'Website', '') + '<p class="small muted">They cannot sign in until their first invoice is marked as paid.</p><div class="row">' + btn('Create client', 'create-client') + btn('Cancel', 'close', {}, 'quiet') + '</div></div></div>';
  if (S.modal && S.modal.kind === 'svc') modal = svcModal();
  root.innerHTML = '<header class="top"><div class="brand"><b>' + esc(D.brand.mark) + '</b><span>Client Desk</span></div><div class="role"><span>' + esc(D.me.name) + (staff() ? ' · ' + (isAdmin() ? 'Admin' : 'Team member') : '') + '</span><a href="/auth/logout">Sign out</a></div></header>' +
    (staff() ? staffHtml() : portalHtml()) + modal + (S.toast ? '<div class="toast" role="status">' + esc(S.toast) + '</div>' : '');
}

/* ---------- talking to the server ---------- */
async function load() {
  const r = await fetch('/api/state', { credentials: 'same-origin' });
  D = await r.json();
  if (D.error) { document.getElementById('app').innerHTML = '<p style="padding:24px">' + esc(D.error) + '</p>'; D = null; return; }
  if (D.me && D.me.role === 'client') S.cid = D.me.cid;
  render();
}
async function api(a, p, quiet) {
  let res;
  try {
    const r = await fetch('/api/action', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a, cid: S.cid, p: p || {} }) });
    res = await r.json();
  } catch (e) { toast('Could not reach the server. Check your connection and try again.'); return null; }
  if (res.error) { toast(res.error); return null; }
  D = res.state;
  if (!quiet) toast(res.logged && res.logged.length ? 'Done: ' + res.logged[0] : 'Saved.');
  return res;
}
const ACT = {
  nav(d) { S.view = d.v; if (d.v === 'activity') return api('seen', {}, true); },
  'open-client'(d) { S.cid = d.id; S.view = 'client'; S.tab = 'overview'; S.ws = null; S.wm = 1; },
  tab(d) { S.tab = d.t; },
  ctab(d) { S.ctab = d.t; if (d.t === 'notes') setTimeout(() => api('seen', {}, true).then(render), 1500); },
  ws(d) { S.ws = d.id; S.open = null; }, wm(d) { S.wm = +d.m; S.open = null; },
  'new-client'() { S.modal = { kind: 'new' }; },
  async 'create-client'() { const r = await api('create-client', { company: val('n-company'), contact: val('n-contact'), email: val('n-email'), website: val('n-website') }); if (r) { S.cid = r.out.cid; S.view = 'client'; S.tab = 'quote'; S.modal = null; S.ws = null; } },
  'save-details'() { return api('save-details', { company: val('d-company'), contact: val('d-contact'), phone: val('d-phone'), website: val('d-website'), email: val('d-email'), notes: val('d-notes') }); },
  'q-add'(d) { return api('q-add', { id: d.id }, true); }, 'q-remove'(d) { return api('q-remove', { id: d.id }, true); },
  'q-sent'() { return api('q-sent'); },
  async 'q-accept'() { if (await api('q-accept')) S.tab = 'invoices'; },
  'i-sent'(d) { return api('i-sent', { m: +d.m }); }, 'i-paid'(d) { return api('i-paid', { m: +d.m }); },
  renew() { return api('renew'); },
  'ah-create'() { return api('ah-create', { sid: val('ah-svc'), name: val('ah-name'), amount: val('ah-amt') }); },
  'ah-sent'(d) { return api('ah-sent', { id: d.id }); }, 'ah-paid'(d) { return api('ah-paid', { id: d.id }); },
  doc(d) { S.modal = { kind: 'doc', type: d.type, m: d.type === 'adhoc' ? d.id : (+d.m || 1) }; }, close() { S.modal = null; },
  print() { window.print(); },
  't-open'(d) { S.open = S.open === d.id ? null : d.id; },
  't-submit'(d) { return api('t-submit', { id: d.id }); }, 't-done'(d) { return api('t-done', { id: d.id }); },
  't-approve'(d) { return api('t-approve', { id: d.id }); }, 't-sent'(d) { return api('t-sent', { id: d.id }); },
  't-comment'(d) { return api('t-comment', { id: d.id, text: val('cm-' + d.id) }); },
  't-changes'(d) { return api('t-changes', { id: d.id, text: val('cm-' + d.id) }); },
  'f-link'(d) { return api('f-link', { key: d.key, url: val('ln-' + d.key), name: val('lt-' + d.key) }); },
  'svc-new'() { S.modal = { kind: 'svc', draft: { isNew: true, id: '', name: '', price: 0, billing: 'monthly', note: '', bullets: [], tasks: [['', 'gioia', true]] } }; },
  'svc-edit'(d) { S.modal = { kind: 'svc', draft: clone(svc(d.id)) }; },
  'svc-row-add'() { syncDraft(); S.modal.draft.tasks.push(['', 'gioia', true]); },
  'svc-row-del'(d) { syncDraft(); S.modal.draft.tasks.splice(+d.i, 1); },
  async 'svc-save'() { syncDraft(); if (await api('svc-save', { svc: S.modal.draft })) S.modal = null; },
  async 'svc-delete'() { if (await api('svc-delete', { id: S.modal.draft.id })) S.modal = null; },
  'team-add'() { return api('team-add', { name: val('tm-name'), email: val('tm-email'), admin: val('tm-role') === '1' }); },
  'team-del'(d) { return api('team-del', { id: d.id }); },
  'brand-save'() { return api('brand-save', { brand: { mark: val('b-mark'), tagline: val('b-tagline'), company: val('b-company'), address: val('b-address'), terms: val('b-terms') } }); }
};
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-a]'); if (!el || !D) return;
  if (el.dataset.a === 'close-bg') { if (e.target === el) { S.modal = null; render(); } return; }
  if (el.disabled || !ACT[el.dataset.a]) return;
  await ACT[el.dataset.a](el.dataset); render();
});
document.addEventListener('change', async e => {
  const d = e.target.dataset; if (!D) return;
  if (d.ts) await api('t-status', { id: d.ts, status: e.target.value });
  else if (d.as) await api('t-assign', { id: d.as, assignee: e.target.value });
  else if (d.te) await api('team-update', { id: d.te, email: e.target.value });
  else if (d.tn) await api('team-update', { id: d.tn, name: e.target.value });
  else if (d.q) await api('q-set', { k: d.q, v: e.target.value }, true);
  else return;
  render();
});
load();
