'use strict';
/* Client Desk front end. The server enforces every rule and permission; this file draws what the server sends. */
const { MONTHS, money, short, ym, mName, due, ql, adhocOf, invLines, invTotal, inv, invLocked, taskOpen, hasAccess, statusOptions, STATUS, clone } = L;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const TODAY = new Date().toISOString().slice(0, 10);
const dshort = iso => { if (!iso) return ''; const d = new Date(iso + 'T00:00'); return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); };
const dlong = iso => { if (!iso) return ''; const d = new Date(iso + 'T00:00'); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); };
const stamp = () => new Date().toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const lastDay = (c, m) => { const x = ym(c, m); const d = new Date(x.y, x.mo + 1, 0); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ---------- icons ---------- */
const P = {
  leaf: '<path d="M20 4C10 4 4 9 4 16c0 1.5.3 2.8.8 4"/><path d="M20 4c0 9-5 15-12 15-1.2 0-2.3-.2-3.2-.5"/><path d="M4.8 20C8 15 12 11 17 8"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 13.6c2.7.2 5 2 5 5"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.8 3.1-6.3 7-6.3s7 2.5 7 6.3"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/>',
  layers: '<path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  check: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  tick: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 6.1l1.7 1.7M18.1 16.2l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 17.9l1.7-1.7M18.1 7.8l1.7-1.7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  board: '<rect x="4" y="4" width="5" height="16" rx="1.5"/><rect x="11" y="4" width="5" height="11" rx="1.5"/><rect x="18" y="4" width="2.5" height="7" rx="1"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="18" r=".8"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  chat: '<path d="M5 18 4 21l3.5-1.5A8 8 0 1 0 5 18z"/>',
  send: '<path d="M21 3 10 14"/><path d="M21 3 14 21l-4-7-7-4z"/>',
  home: '<path d="m4 11 8-7 8 7"/><path d="M6 10v10h12V10"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  out: '<path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>',
  chart: '<path d="M5 20v-7M10 20V8M15 20v-5M20 20V5"/>',
  circle: '<circle cx="12" cy="12" r="7.5"/>',
  refresh: '<path d="M19.5 9A8 8 0 0 0 5 7.5"/><path d="M4.5 4v4h4"/><path d="M4.5 15A8 8 0 0 0 19 16.5"/><path d="M19.5 20v-4h-4"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M4 20h16"/>',
  filter: '<path d="M4 5h16l-6 7.5V19l-4 1v-7.5z"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="2.6"/><path d="M3 7v4c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6V7"/><path d="M3 11v4c0 1.4 2.7 2.6 6 2.6 1 0 1.9-.1 2.7-.3"/><ellipse cx="16" cy="14" rx="5" ry="2.2"/><path d="M11 14v3.5c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V14"/>',
  hourglass: '<path d="M7 3h10M7 21h10"/><path d="M8 3c0 5 8 5 8 9s-8 4-8 9"/><path d="M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>'
};
const logoImg = (tone, h) => '<img class="brandlogo" src="' + LOGO[tone] + '" alt="' + esc(S.brand.mark) + '" style="height:' + h + 'px">';
const I = (k, cls) => '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + P[k] + '</svg>';

/* ---------- statuses ---------- */
STATUS.progress = 'In progress'; STATUS.todo = 'Pending action'; STATUS.done = 'Completed';
const statusOpts = t => t.owner === 'client' ? ['todo', 'submitted', 'done'] : t.approve ? ['todo', 'progress', 'awaiting', 'changes', 'approved', 'done'] : ['todo', 'progress', 'done'];
const GROUPS = [['todo', 'Pending action', ['todo'], 'circle'], ['progress', 'In progress', ['progress', 'changes', 'submitted'], 'refresh'], ['awaiting', 'Awaiting approval', ['awaiting'], 'clock'], ['approved', 'Approved', ['approved'], 'tick'], ['done', 'Completed', ['done'], 'tick']];
const groupOf = st => GROUPS.find(g => g[2].includes(st))[0];
const SICON = { todo: 'circle', progress: 'refresh', changes: 'refresh', submitted: 'upload', awaiting: 'clock', approved: 'tick', done: 'tick' };
const SVCI = { web: 'monitor', articles: 'doc', social: 'image', ads: 'chart' };
const svcIcon = sid => SVCI[String(sid).split('-x')[0]] || 'check';
function nextStep(t) {
  if (t.status === 'done') return null;
  if (t.owner === 'client') return t.status === 'submitted' ? ['Team to mark as received', 'Once the team has what they need'] : ['Client to send', 'Waiting on the client'];
  if (t.status === 'awaiting') return ['Client to review', 'The client approves or requests changes'];
  if (t.status === 'approved') return ['Team to mark task completed', 'Once all updates are finalised'];
  return t.approve ? ['Team to submit for client review', 'When the work is ready'] : ['Team to mark task completed', 'When the work is complete'];
}

/* ---------- data (filled from the server) ---------- */
const S = {
  role: 'admin', me: '', view: 'clients', cid: '', ctab: 'overview', ws: null, wm: 1, mode: 'board', ifilter: 'all', qtab: 'invoices', ptab: 'overview',
  drawer: null, modal: null, menu: null, q: '', toast: null, drag: null, nextQuote: 0, tid: null, back: null, confirm: null, mtg: '', mtq: '', mtClient: '', mtScope: 'me', mtFilters: false, pws: '', ptg: '',
  wsOpen: [], billOpen: [], fOpen: [], fees: [], acq: '', acs: '', afq: '', afs: '', init: false,
  brand: { mark: 'GIOIA' }, team: [], catalogue: [], clients: [], feed: []
};
const svc = id => S.catalogue.find(s => s.id === id);
const client = () => S.clients.find(c => c.id === S.cid) || S.clients[0];
const member = id => S.team.find(m => m.id === id);
const viewer = () => S.role === 'client' ? 'client' : S.me;
const isAdmin = () => S.role === 'admin' && !!member(S.me) && !!member(S.me).admin;
const staff = () => S.role !== 'client';
const actor = () => S.role === 'client' ? 'Client' : (member(S.me) || {}).name || '';
const canRead = () => true;
const unreadFor = e => !!D && e.by !== D.me.key && e.at > (D.seen || '');
const fmtAt = v => { if (!v) return ''; if (/^\d{4}-\d{2}-\d{2}T/.test(v)) { const d = new Date(v); return d.toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return dshort(v); return esc(v); };

/* ---------- view helpers ---------- */
const TONE = { pending: '', sent: 'info', paid: 'ok', accepted: 'ok', locked: 'lock', todo: '', progress: 'warn', awaiting: 'gold', changes: 'crit', approved: 'ok', submitted: 'info', done: 'ok' };
const pill = (k, label) => '<span class="pill ' + TONE[k] + '">' + (SICON[k] ? I(SICON[k], 'sm') : '') + (label || STATUS[k]) + '</span>';
const btn = (label, a, data, cls, dis) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '" ' + Object.entries(data || {}).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + (dis ? ' disabled' : '') + '>' + label + '</button>';
const field = (id, label, v, type, req) => '<div class="field"><label for="' + id + '">' + label + (req ? ' <span class="req">*</span>' : '') + '</label>' + (type === 'area' ? '<textarea id="' + id + '">' + esc(v) + '</textarea>' : '<input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(v) + '">') + '</div>';
const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
const avatar = (id, cls) => { const m = member(id); return '<span class="av ' + (cls || '') + '" title="' + esc(m ? m.name : 'Unassigned') + '">' + (m ? initials(m.name) : '–') + '</span>'; };
const dueHtml = t => t.due ? '<span class="due ' + (t.due < TODAY && t.status !== 'done' ? 'late' : '') + '">' + I('cal', 'sm') + 'Due ' + dshort(t.due) + '</span>' : '';
const fileKind = f => f.kind || (f.url ? 'lnk' : /\.pdf$/i.test(f.name) ? 'pdf' : /\.(png|jpe?g|gif|webp|fig|svg)$/i.test(f.name) ? 'img' : 'doc');
const fileRow = f => { const k = fileKind(f); return '<div class="file"><span class="ft ' + k + '">' + (k === 'lnk' ? I('link', 'sm') : k.toUpperCase()) + '</span><div><b>' + (f.url ? '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a>' : esc(f.name)) + '</b><span class="small muted">' + (f.size ? esc(f.size) + ' · ' : '') + esc(f.by) + ' · ' + fmtAt(f.at) + '</span></div>' + (f.url ? '<a class="dl" href="' + esc(f.url) + '" target="_blank" rel="noopener" aria-label="Open link">' + I('ext', 'sm') + '</a>' : '<button class="dl" data-a="noop" aria-label="Download">' + I('download', 'sm') + '</button>') + '</div>'; };
const amountsVisible = () => isAdmin() || S.role === 'client';
function wsList(c) { return [...c.quote.lines, ...c.extra]; }
function wsTasks(c, sid, m) { return c.tasks.filter(t => t.svc === sid && t.m === m); }
function wsMonth(c, s) { const ad = s.adhoc ? adhocOf(c, s.adhoc) : null; return ad ? 0 : s.billing === 'monthly' ? Math.min(S.wm, c.quote.months) : 1; }
function wsInvoice(c, s, m) { return s.adhoc ? adhocOf(c, s.adhoc) : inv(c, m); }
function currentMonth(c) { let m = 1; c.invoices.forEach(i => { if (i.status === 'paid') m = Math.max(m, i.m); }); return m; }
const needsTeam = t => ['changes', 'approved', 'submitted'].includes(t.status);
const canSee = (c, t) => taskOpen(c, t);
const needsClient = t => t.status === 'awaiting' || (t.owner === 'client' && t.status === 'todo');

/* ---------- task card and board ---------- */
const COLS = GROUPS;
function tags(t) {
  const out = [];
  if (t.owner === 'client') out.push('<span class="chip client">Client to send</span>');
  if (t.status === 'changes') out.push(pill('changes'));
  if (t.status === 'submitted') out.push(pill('submitted', 'Received from client'));
  if (t.status === 'progress') out.push(pill('progress'));
  if (t.approve && t.rounds) out.push('<span class="chip">Revision ' + t.rounds + ' of 2</span>');
  if (t.files.length) out.push('<span class="chip">' + I('link', 'sm') + t.files.length + '</span>');
  return out.length ? '<div class="tags">' + out.join('') + '</div>' : '';
}
function card(t) {
  const m = member(t.assignee);
  return '<div class="tcard k-' + t.status + '" data-a="task" data-id="' + t.id + '"' + (staff() ? ' draggable="true" data-drag="' + t.id + '"' : '') + '><div class="ttl"><span class="box ' + (t.status === 'done' ? 'on' : '') + '">' + (t.status === 'done' ? I('tick', 'sm') : '') + '</span><span>' + esc(t.title) + '</span></div>' + tags(t) +
    '<div class="tfoot"><span class="who">' + (t.owner === 'client' ? '<span class="av">' + initials(client().contact || 'C') + '</span><span>' + esc(client().contact || 'Client') + '</span>' : avatar(t.assignee) + '<span>' + esc(m ? m.name : 'Unassigned') + '</span>') + '</span>' + dueHtml(t) + '</div></div>';
}
function boardHtml(list) {
  return '<div class="board">' + COLS.map(([k, label, sts]) => { const items = list.filter(t => sts.includes(t.status)); return '<div class="col c-' + k + '" data-col="' + k + '"><div class="colhead">' + label + ' <span class="count">' + items.length + '</span></div>' + (items.map(card).join('') || '<p class="small muted" style="padding:4px">Nothing here</p>') + '</div>'; }).join('') + '</div>';
}
function listHtml(list) {
  return '<div class="card" style="padding:0"><div class="listrow small muted" style="cursor:default;font-weight:600"><span>Task</span><span>Assigned to</span><span>Due</span><span>Status</span></div>' + list.map(t => { const m = member(t.assignee); return '<div class="listrow" data-a="task" data-id="' + t.id + '"><span class="ttl"><span class="box ' + (t.status === 'done' ? 'on' : '') + '">' + (t.status === 'done' ? I('tick', 'sm') : '') + '</span><span>' + esc(t.title) + '</span></span><span class="who small">' + (t.owner === 'client' ? '<span class="chip client">Client</span>' : avatar(t.assignee) + '<span>' + esc(m ? m.name : 'Unassigned') + '</span>') + '</span><span class="small">' + (dueHtml(t) || '<span class="muted">No date</span>') + '</span><span>' + pill(t.status) + '</span></div>'; }).join('') + '</div>';
}

/* ---------- workspace page ---------- */
function workspacePage(c) {
  const s = ql(c, S.ws); if (!s) { S.view = 'client'; S.ctab = 'work'; return clientPage(c); }
  const monthly = s.billing === 'monthly' && !s.adhoc, m = wsMonth(c, s), i = wsInvoice(c, s, m), list = wsTasks(c, s.id, m);
  const open = i && i.status === 'paid', done = list.filter(t => t.status === 'done').length;
  const invCard = i ? '<div class="mini">' + I('doc') + '<div><div class="eyebrow">Invoice</div><b class="num">' + esc(i.no) + '</b></div>' + pill(invLocked(c, m) && !s.adhoc ? 'locked' : i.status) + '</div>' : '';
  const dueCard = '<div class="mini">' + I('cal') + '<div><div class="eyebrow">' + (monthly ? 'Month ends' : 'Period') + '</div><b>' + (monthly ? dlong(lastDay(c, m)) : s.adhoc ? 'Added service' : mName(c, 1)) + '</b></div></div>';
  let body;
  if (!open) body = '<div class="lockbox"><h2>' + (s.adhoc ? 'This added service' : mName(c, m)) + ' is locked</h2><p>' + (invLocked(c, m) && !s.adhoc ? 'Months ' + (c.quote.committed + 1) + ' to ' + c.quote.months + ' start once both parties confirm the renewal.' : 'It unlocks when invoice ' + esc(i.no) + (amountsVisible() ? ' (' + money(s.adhoc ? i.amount : invTotal(c, m)) + ')' : '') + ' is marked as paid.') + '</p><p class="small">' + list.length + ' tasks are queued.</p></div>';
  else body = '<div class="row between"><div class="row"><h2>Tasks</h2><span class="muted small">' + done + ' of ' + list.length + ' completed</span></div><div class="row"><div class="seg">' + '<button data-a="mode" data-m="board" aria-pressed="' + (S.mode === 'board') + '">' + I('board', 'sm') + 'Board</button><button data-a="mode" data-m="list" aria-pressed="' + (S.mode === 'list') + '">' + I('list', 'sm') + 'List</button></div>' + (staff() ? btn(I('plus', 'sm') + 'Add task', 'task-new') : '') + '</div></div>' + (S.mode === 'board' ? boardHtml(list) : listHtml(list)) + (staff() ? '<p class="small muted">Drag a card to another column to change its status, or open it for details.</p>' : '');
  const files = c.files.filter(f => f.folder === short(s));
  const filesPanel = '<aside class="card stack"><div class="row between"><h2 class="row" style="gap:8px">' + I('folder') + 'Files</h2><span class="small muted">' + files.length + '</span></div>' + btn(I('upload', 'sm') + 'Upload file', 'pick-file', { key: 'ws' }, 'block') + '<input type="file" id="up-ws" data-up="ws" multiple hidden>' + btn(I('link', 'sm') + 'Add Google link', 'link-open', { key: 'ws' }, 'ghost block') + '<div class="files">' + (files.map(fileRow).join('') || '<p class="small muted">No files yet. Files added to tasks in this workspace also appear here.</p>') + '</div><p class="small muted">Saved to Drive: Clients / ' + esc(c.company) + ' / ' + esc(short(s)) + '</p></aside>' + wsFeesPanel(c, s, m);
  return '<div class="crumbs"><button data-a="nav" data-v="workspaces">Workspaces</button>' + I('chev', 'sm') + '<button data-a="open-client" data-id="' + c.id + '">' + esc(c.company) + '</button>' + I('chev', 'sm') + '<b>' + esc(short(s)) + '</b></div>' +
    '<div class="head" style="border:0"><div class="stack" style="gap:6px;max-width:640px"><h1>' + esc(short(s)) + (s.adhoc ? ' <span class="chip">Added service</span>' : '') + '</h1><p class="muted" style="margin:0">' + esc(s.bullets.join('. ')) + '</p></div><div class="row">' + dueCard + invCard + '</div></div>' +
    (monthly ? '<div class="tabs" style="border-bottom:1px solid var(--line)">' + Array.from({ length: c.quote.months }, (_, k) => k + 1).map(x => { const st = inv(c, x).status; return '<button data-a="wm" data-m="' + x + '" aria-selected="' + (x === m) + '">' + MONTHS[ym(c, x).mo].slice(0, 3) + ' ' + String(ym(c, x).y).slice(2) + (st === 'paid' ? '' : ' 🔒') + '</button>'; }).join('') + '</div>' : '') +
    '<div class="wsgrid"><section class="stack">' + body + '</section><div class="stack">' + filesPanel + '</div></div>';
}

/* ---------- client pages ---------- */
function clientHeader(c, tabs, cur, act) {
  return '<div class="head"><div class="row" style="gap:16px"><div class="tilelogo">' + initials(c.company) + '</div><div class="stack" style="gap:6px"><h1>' + esc(c.company) + '</h1><div class="row" style="gap:8px"><span class="chip">Client</span><span class="small muted">' + esc(c.contact) + (c.website ? ' · ' + esc(c.website) : '') + '</span></div></div></div><nav class="tabs" role="tablist">' + tabs.map(([k, l]) => '<button role="tab" data-a="' + act + '" data-t="' + k + '" aria-selected="' + (cur === k) + '">' + l + '</button>').join('') + '</nav></div>';
}
function wsCards(c) {
  return '<div class="grid g2">' + wsList(c).map(s => { const m = s.adhoc ? 0 : s.billing === 'monthly' ? currentMonth(c) : 1, list = wsTasks(c, s.id, m), i = wsInvoice(c, s, m), open = i && i.status === 'paid', done = list.filter(t => t.status === 'done').length, pct = list.length ? Math.round(done / list.length * 100) : 0, need = open ? list.filter(staff() ? needsTeam : needsClient).length : 0;
    return '<button class="wscard" data-a="open-ws" data-cid="' + c.id + '" data-id="' + esc(s.id) + '" data-m="' + (m || 1) + '"><div class="row between"><span class="eyebrow">' + (s.adhoc ? 'Added service' : s.billing === 'once' ? 'One-off' : mName(c, m)) + '</span>' + (open ? (need ? '<span class="pill warn">' + need + (staff() ? ' need you' : ' for you') + '</span>' : pill('approved', 'On track')) : pill('locked', 'Locked')) + '</div><h2>' + esc(short(s)) + '</h2><div class="bar"><i style="width:' + pct + '%"></i></div><span class="small muted">' + done + ' of ' + list.length + ' tasks completed</span></button>'; }).join('') + '</div>';
}
function overviewTab(c) {
  const open = c.tasks.filter(t => taskOpen(c, t)), next = c.invoices.find(i => i.status !== 'paid' && !invLocked(c, i.m));
  const tile = (label, v, sub) => '<div class="tile"><span class="eyebrow">' + label + '</span><b class="num">' + v + '</b><span class="small muted">' + sub + '</span></div>';
  return '<div class="grid g4">' + tile('Active tasks', open.filter(t => t.status !== 'done').length, open.filter(t => t.status === 'done').length + ' completed so far') + tile('Waiting on client', open.filter(needsClient).length, 'approvals and materials') + tile('Needs the team', open.filter(needsTeam).length, 'changes, approvals, received items') +
    (isAdmin() ? tile('Next invoice', next ? money(invTotal(c, next.m)) : '—', next ? next.no + ' · due ' + due(c, next.m) : 'All invoices paid') : '') + '</div>' +
    '<div class="stack"><div class="row between"><h2>Workspaces</h2><button class="link" data-a="ctab" data-t="work">See all</button></div>' + wsCards(c) + '</div>' + (isAdmin() && c.invoices.length ? costingHtml(c) : '') +
    '<div class="grid g2"><div class="card stack"><h2>Client details</h2>' + field('d-company', 'Company', c.company) + field('d-contact', 'Contact person', c.contact) + field('d-email', 'Google email (used to sign in)', c.email, 'email') + field('d-phone', 'Phone', c.phone) + field('d-website', 'Website', c.website) + '</div>' +
    '<div class="card stack"><h2>Internal notes</h2><p class="small muted" style="margin:0">Only the team sees these.</p>' + field('d-notes', 'Notes', c.notes, 'area') + '<div>' + btn('Save details', 'save-details') + '</div></div></div>';
}
function quoteTab(c) {
  const q = c.quote;
  return '<div class="card stack"><div class="row between"><h2>Quotation ' + esc(q.no) + ' ' + pill(q.status) + '</h2><div class="row">' + btn('View document', 'doc', { type: 'quote' }, 'ghost') + (q.status !== 'accepted' ? btn('Edit quotation', 'quote-open', { id: c.id }) : '') + '</div></div><div class="scroll"><table class="tbl"><thead><tr><th>Service</th><th>Billing</th><th class="right">Price</th></tr></thead><tbody>' + (q.lines.map(s => '<tr><td>' + esc(s.name) + '</td><td>' + (s.billing === 'once' ? 'One-time, Month 1' : 'Monthly, Months 1 to ' + q.months) + '</td><td class="right num">' + money(s.price) + '</td></tr>').join('') || '<tr><td colspan="3" class="muted">No services yet.</td></tr>') + (q.discount ? '<tr><td>Monthly discount</td><td>Months 2 to ' + q.months + '</td><td class="right num">' + money(-q.discount) + '</td></tr>' : '') + '</tbody></table></div><p class="muted small" style="margin:0">' + mName(c, 1) + ' to ' + mName(c, q.months) + '. Months 1 to ' + q.committed + ' committed.</p></div>';
}
function invoiceRows(rows, readonly) {
  return '<div class="card scroll" style="padding:4px 8px"><table class="tbl"><thead><tr><th>Invoice</th>' + (rows.some(r => r.showClient) ? '<th>Client</th>' : '') + '<th>For</th><th>Due</th><th class="right">Amount</th><th>Status</th><th></th></tr></thead><tbody>' + (rows.map(r => '<tr><td class="num"><b>' + esc(r.no) + '</b></td>' + (r.showClient ? '<td>' + esc(r.c.company) + '</td>' : '') + '<td>' + esc(r.label) + '</td><td class="num">' + esc(r.due) + '</td><td class="right num">' + money(r.amount) + '</td><td>' + pill(r.state) + '</td><td class="right"><div class="row" style="justify-content:flex-end;gap:6px">' + btn('View', 'doc', r.docData, 'quiet') + (readonly || r.state === 'locked' || r.state === 'paid' ? '' : (r.state === 'pending' ? btn('Mark as sent', r.sentA, r.data, 'ghost') : '') + btn('Mark as paid', r.paidA, r.data)) + '</div></td></tr>').join('') || '<tr><td colspan="7" class="muted">No invoices match.</td></tr>') + '</tbody></table></div>';
}
function rowsFor(c, all) {
  const rows = c.invoices.map(i => ({ c, no: i.no, label: mName(c, i.m), due: due(c, i.m), amount: invTotal(c, i.m), state: invLocked(c, i.m) ? 'locked' : i.status, docData: { type: 'inv', m: i.m, cid: c.id }, sentA: 'i-sent', paidA: 'i-paid', data: { m: i.m, cid: c.id }, showClient: all }));
  c.adhoc.forEach(a => rows.push({ c, no: a.no, label: a.name, due: a.date, amount: a.amount, state: a.status, docData: { type: 'adhoc', id: a.id, cid: c.id }, sentA: 'ah-sent', paidA: 'ah-paid', data: { id: a.id, cid: c.id }, showClient: all }));
  return rows;
}
function invoicesTab(c, readonly) {
  if (!c.invoices.length) return '<div class="lockbox">Invoices are created when the quotation is marked as accepted.</div>';
  const q = c.quote;
  return (q.months > q.committed && !q.renewed ? '<div class="card row between"><span>Months ' + (q.committed + 1) + ' to ' + q.months + ' go ahead only when both parties confirm the renewal.</span>' + (readonly ? '' : btn('Confirm renewal', 'renew', { cid: c.id }, 'ghost')) + '</div>' : '') + invoiceRows(rowsFor(c, false), readonly) +
    (readonly ? '' : '<div class="card stack"><h2>Ad hoc invoice</h2><p class="small muted" style="margin:0">For a service added along the way. A catalogue service also opens its workspace once this invoice is paid.</p><div class="grid g4" style="align-items:end"><div class="field"><label for="ah-svc">Service</label><select id="ah-svc"><option value="">Custom item (no workspace)</option>' + S.catalogue.map(s => '<option value="' + s.id + '">' + esc(s.name) + ' · ' + money(s.price) + '</option>').join('') + '</select></div>' + field('ah-name', 'Description (custom item)', '') + field('ah-amt', 'Amount ($)', '', 'number') + btn('Create invoice', 'ah-create', { cid: c.id }, 'ghost') + '</div></div>');
}
function folderBlock(c, f, list) {
  const key = c.id + '|' + f, open = S.fOpen.includes(key);
  return '<div class="fold' + (open ? ' open' : '') + '"><button class="foldhead" data-a="fold" data-k="' + esc(key) + '" aria-expanded="' + open + '">' + I('chev', 'sm chevi') + I('folder') + '<b>' + esc(f) + '</b><span class="small muted" style="margin-left:auto">' + (list.length ? list.length + (list.length === 1 ? ' file' : ' files') : 'Empty') + '</span></button>' + (open ? '<div class="foldbody files">' + (list.map(fileRow).join('') || '<p class="small muted" style="margin:6px 0">Nothing here yet.</p>') + '</div>' : '') + '</div>';
}
function folderNames(c) { return ['Quotations and invoices', ...new Set(wsList(c).map(short)), 'Reports', 'General']; }
function filesTab(c) {
  const fs = folderNames(c);
  return '<div class="grid g2" style="align-items:start"><div class="card stack"><div class="row between"><h2>Clients / ' + esc(c.company) + '</h2><span class="row"><button class="link" data-a="fold-all" data-cid="' + c.id + '" data-v="1">Show all</button><button class="link" data-a="fold-all" data-cid="' + c.id + '" data-v="0">Hide all</button></span></div><div class="stack" style="gap:8px">' + fs.map(f => folderBlock(c, f, c.files.filter(x => x.folder === f))).join('') + '</div></div>' +
    '<div class="card stack"><h2>Add to General</h2>' + btn(I('upload', 'sm') + 'Upload file', 'pick-file', { key: 'general' }, 'block') + '<input type="file" id="up-general" data-up="general" multiple hidden>' + btn(I('link', 'sm') + 'Add Google link', 'link-open', { key: 'general' }, 'ghost block') + '<p class="small muted" style="margin:0">In the live app these go straight into the client\'s Google Drive folder.</p></div></div>';
}
function feedHtml(list) {
  if (!list.length) return '<p class="muted">Nothing yet.</p>';
  const v = viewer();
  return '<div class="stack" style="gap:0">' + list.map(e => '<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line);align-items:flex-start;flex-wrap:nowrap"><span class="av">' + initials(e.who) + '</span><div style="flex:1"><div style="' + (unreadFor(e, v) ? 'font-weight:600' : '') + '"><b>' + esc(e.who) + '</b> ' + esc(e.text) + '</div><span class="small muted">' + fmtAt(e.at) + (e.priv ? ' · only ' + esc((member(e.priv) || {}).name || '') + ' and admins' : e.internal ? ' · team only' : '') + '</span></div></div>').join('') + '</div>';
}
function clientPage(c) {
  let tabs = [['overview', 'Overview'], ['work', 'Workspaces'], ['files', 'Files'], ['activity', 'Activity'], ['quote', 'Quotation'], ['invoices', 'Invoices']];
  if (!isAdmin()) { tabs = tabs.filter(t => !['quote', 'invoices'].includes(t[0])); if (['quote', 'invoices'].includes(S.ctab)) S.ctab = 'overview'; }
  const body = { overview: overviewTab, work: wsCards, files: filesTab, activity: c => '<div class="card">' + feedHtml(S.feed.filter(e => e.cid === c.id && canRead(e, viewer()))) + '</div>', quote: quoteTab, invoices: c => invoicesTab(c, false) }[S.ctab](c);
  return '<div class="crumbs"><button data-a="nav" data-v="clients">Clients</button>' + I('chev', 'sm') + '<b>' + esc(c.company) + '</b></div>' + clientHeader(c, tabs, S.ctab, 'ctab') + body;
}

/* ---------- other staff pages ---------- */
function clientsPage() {
  return '<div class="row between"><div><h1>Clients</h1><p class="muted" style="margin:4px 0 0">' + S.clients.length + ' client' + (S.clients.length === 1 ? '' : 's') + '</p></div>' + (isAdmin() ? btn(I('plus', 'sm') + 'New quotation', 'quote-open', { id: 'new' }) : '') + '</div>' +
    '<div class="card scroll" style="padding:4px 8px"><table class="tbl"><thead><tr><th>Client</th><th>Quotation</th><th>Progress this month</th><th>Needs the team</th><th>Waiting on client</th></tr></thead><tbody>' + S.clients.map(c => { const open = c.tasks.filter(t => taskOpen(c, t)), d = open.filter(t => t.status === 'done').length, pct = open.length ? Math.round(d / open.length * 100) : 0, nt = open.filter(needsTeam).length, nc = open.filter(needsClient).length;
      return '<tr class="click" data-a="open-client" data-id="' + c.id + '"><td><div class="row" style="flex-wrap:nowrap"><span class="tilelogo" style="width:38px;height:38px;font-size:14px;border-radius:9px">' + initials(c.company) + '</span><div><b>' + esc(c.company) + '</b><div class="small muted">' + esc(c.contact) + '</div></div></div></td><td class="num">' + esc(c.quote.no) + ' ' + pill(c.quote.status) + '</td><td style="min-width:160px"><div class="bar"><i style="width:' + pct + '%"></i></div><span class="small muted">' + d + ' of ' + open.length + ' tasks</span></td><td>' + (nt ? '<span class="pill warn">' + nt + '</span>' : '<span class="muted">None</span>') + '</td><td>' + (nc ? '<span class="pill info">' + nc + '</span>' : '<span class="muted">None</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
}
function accHead(c, act, open, right) {
  return '<button class="acchead" data-a="' + act + '" data-id="' + c.id + '" aria-expanded="' + open + '"><span class="tilelogo" style="width:40px;height:40px;font-size:15px;border-radius:9px">' + initials(c.company) + '</span><span style="flex:1;min-width:180px"><b style="font:600 17px var(--display)">' + esc(c.company) + '</b><br><span class="small muted">' + esc(c.contact) + '</span></span>' + right + I('chev', 'chevi') + '</button>';
}
function workspacesPage() {
  const list = S.clients.filter(c => c.tasks.length);
  return '<div class="row between"><div><h1>Workspaces</h1><p class="muted" style="margin:4px 0 0">Click a client to show or hide their workspaces.</p></div><div class="row"><button class="link" data-a="ws-all" data-v="1">Expand all</button><button class="link" data-a="ws-all" data-v="0">Collapse all</button></div></div>' +
    (list.length ? list.map(c => { const open = S.wsOpen.includes(c.id), act = c.tasks.filter(t => canSee(c, t)), nt = act.filter(needsTeam).length, nc = act.filter(needsClient).length;
      return '<div class="acc' + (open ? ' open' : '') + '">' + accHead(c, 'ws-toggle', open, '<span class="row" style="gap:8px"><span class="chip">' + wsList(c).length + ' workspaces</span>' + (nt ? '<span class="pill warn">' + nt + ' need the team</span>' : '') + (nc ? '<span class="pill info">' + nc + ' with client</span>' : '') + '</span>') + (open ? '<div class="accbody">' + wsCards(c) + '</div>' : '') + '</div>'; }).join('') : '<div class="lockbox">No active workspaces yet. They appear when a quotation is accepted.</div>');
}
function chipsHtml(list, cur, act, labels) {
  return '<div class="chips">' + GROUPS.map(([k, l, sts, ic]) => '<button class="fchip" data-a="' + act + '" data-g="' + k + '" aria-pressed="' + (cur === k) + '">' + I(ic, 'sm') + ((labels || {})[k] || l) + ' (' + list.filter(t => sts.includes(t.status)).length + ')</button>').join('') + '</div>';
}
function taskRow(c, t, mode) {
  const s = ql(c, t.svc), m = member(t.assignee), sub = t.desc || (short(s) + (t.m ? ' · ' + mName(c, t.m) : ''));
  const who = t.owner === 'client' ? (S.role === 'client' ? 'You' : esc(c.contact || 'Client')) : esc(m ? m.name : 'Unassigned');
  const late = t.due && t.due < TODAY && t.status !== 'done';
  return '<div class="tli" data-a="task" data-id="' + t.id + '" data-cid="' + c.id + '"><span class="ticon">' + I(svcIcon(t.svc)) + '</span><div class="stack" style="gap:4px;min-width:0"><b>' + esc(t.title) + '</b><span class="small muted clamp">' + esc(sub) + '</span><span>' + pill(t.status, S.role === 'client' && t.status === 'awaiting' ? 'Awaiting your approval' : '') + '</span></div>' +
    '<span class="row small c3" style="gap:8px;flex-wrap:nowrap">' + (mode === 'client' ? I('building', 'sm') + esc(c.company) : I('user', 'sm') + who) + '</span><span class="row small c4" style="gap:8px;flex-wrap:nowrap' + (late ? ';color:var(--crit);font-weight:600' : '') + '">' + (t.due ? I('cal', 'sm') + dlong(t.due) : '<span class="muted">No due date</span>') + '</span>' + I('chev', 'sm') + '</div>';
}
function taskTable(rows, mode) {
  return '<div class="tlist"><div class="tlh"><span></span><span>Task</span><span>' + (mode === 'client' ? 'Client' : 'Assignee') + '</span><span>Due date</span><span></span></div>' + (rows.map(({ c, t }) => taskRow(c, t, mode)).join('') || '<p class="muted" style="padding:16px;margin:0">No tasks match.</p>') + '</div>';
}
function myTasksPage() {
  const scope = isAdmin() ? S.mtScope : 'me', q = S.mtq.toLowerCase();
  let rows = [];
  S.clients.forEach(c => c.tasks.forEach(t => { if (canSee(c, t) && (scope === 'all' || t.assignee === S.me) && (!S.mtClient || c.id === S.mtClient) && (!q || (t.title + ' ' + c.company + ' ' + short(ql(c, t.svc))).toLowerCase().includes(q))) rows.push({ c, t }); }));
  rows.sort((a, b) => (a.t.due || '9') < (b.t.due || '9') ? -1 : 1);
  const all = rows.map(r => r.t), shown = S.mtg ? rows.filter(r => groupOf(r.t.status) === S.mtg) : rows;
  return '<div class="row between"><div><h1>My tasks</h1><p class="muted" style="margin:4px 0 0">' + (scope === 'all' ? 'Every task across clients.' : 'Your assignments across clients. Track progress and deliver work.') + '</p></div>' + (isAdmin() ? '<div class="seg"><button data-a="mt-scope" data-s="me" aria-pressed="' + (scope === 'me') + '">Assigned to me</button><button data-a="mt-scope" data-s="all" aria-pressed="' + (scope === 'all') + '">Everyone</button></div>' : '') + '</div>' +
    '<div class="row" style="flex-wrap:nowrap"><div class="search" style="max-width:none">' + I('search') + '<input id="mt-q" type="search" data-mtq="1" placeholder="Search tasks, clients or workspaces…" value="' + esc(S.mtq) + '" aria-label="Search tasks"></div><button class="btn quiet" data-a="mt-filters" aria-expanded="' + S.mtFilters + '">' + I('filter', 'sm') + 'Filters' + (S.mtClient ? ' (1)' : '') + '</button></div>' +
    (S.mtFilters ? '<div class="card row"><div class="field" style="min-width:240px"><label for="mt-client">Client</label><select id="mt-client" data-mtclient="1"><option value="">All clients</option>' + S.clients.map(c => '<option value="' + c.id + '"' + (S.mtClient === c.id ? ' selected' : '') + '>' + esc(c.company) + '</option>').join('') + '</select></div>' + (S.mtClient || S.mtg ? '<button class="link" data-a="mt-clear" style="align-self:end;margin-bottom:10px">Clear filters</button>' : '') + '</div>' : '') +
    chipsHtml(all, S.mtg, 'mt-group') + taskTable(shown, 'client');
}
function filesPage() {
  return '<div class="row between"><div><h1>Files</h1><p class="muted" style="margin:4px 0 0">Each client\'s files, grouped by folder. Click a client or a folder to show or hide its files.</p></div></div>' + S.clients.map(c => { const open = S.wsOpen.includes('f:' + c.id);
    return '<div class="acc' + (open ? ' open' : '') + '">' + accHead(c, 'files-toggle', open, '<span class="chip">' + c.files.length + ' files</span>') + (open ? '<div class="accbody"><div class="stack" style="gap:8px">' + folderNames(c).map(f => folderBlock(c, f, c.files.filter(x => x.folder === f))).join('') + '</div><div><button class="link" data-a="open-client-tab" data-id="' + c.id + '" data-t="files">Open the client\'s files to add more</button></div></div>' : '') + '</div>'; }).join('');
}
function feeWhere(f) { const c = S.clients.find(x => x.id === f.cid), s = c && f.svc ? ql(c, f.svc) : null; return { c, s, label: f.item ? f.item : s ? short(s) : 'Removed workspace', when: f.item ? 'One-off item' : !s ? '' : s.adhoc ? 'Added service' : s.billing === 'once' ? 'One-off' : mName(c, f.m) }; }
function feeBase(c, s) { return !s ? 0 : s.adhoc ? (adhocOf(c, s.adhoc) || {}).amount || s.price : s.price; }
function feeTasks(f) { const w = feeWhere(f); return w.c ? L.feeTasks(w.c, f) : []; }
function clientInvState(c) { const rows = rowsFor(c, false).filter(r => r.state !== 'locked'); if (!rows.length) return 'none'; const un = rows.filter(r => r.state !== 'paid'); return !un.length ? 'paid' : un.some(r => r.state === 'sent') ? 'sent' : 'pending'; }
function costing(c) {
  const q = c.quote, months = q.renewed ? q.months : q.committed, fees = S.fees.filter(f => f.cid === c.id);
  const rows = q.lines.map(s => { const n = s.billing === 'once' ? 1 : months, fee = fees.filter(f => f.svc === s.id).reduce((a, f) => a + f.amount, 0); return { name: short(s), detail: s.billing === 'once' ? 'One-off' : money(s.price) + ' × ' + n + ' months', value: s.price * n, fee }; });
  if (q.discount && q.lines.some(s => s.billing === 'monthly') && months > 1) rows.push({ name: 'Monthly discount', detail: money(-q.discount) + ' × ' + (months - 1) + ' months', value: -q.discount * (months - 1), fee: 0 });
  c.adhoc.forEach(a => rows.push({ name: a.name, detail: 'Ad hoc invoice ' + a.no, value: a.amount, fee: a.s ? fees.filter(f => f.svc === a.s.id).reduce((x, f) => x + f.amount, 0) : 0 }));
  const value = rows.reduce((a, r) => a + r.value, 0), fee = rows.reduce((a, r) => a + r.fee, 0);
  return { rows, value, fee, margin: value - fee, months };
}
function costingHtml(c) {
  const k = costing(c), pct = k.value ? Math.round(k.margin / k.value * 100) : 0;
  return '<div class="card stack"><div class="row between"><h2>Project costing</h2><span class="small muted">Admins only</span></div><div class="scroll"><table class="tbl"><thead><tr><th>Workspace</th><th>Billed to client</th><th class="right">Value</th><th class="right">Team fees</th><th class="right">Margin</th></tr></thead><tbody>' +
    k.rows.map(r => '<tr><td><b>' + esc(r.name) + '</b></td><td class="small muted">' + esc(r.detail) + '</td><td class="right num">' + money(r.value) + '</td><td class="right num">' + (r.fee ? money(r.fee) : '<span class="muted">—</span>') + '</td><td class="right num">' + money(r.value - r.fee) + '</td></tr>').join('') +
    '<tr class="tot"><td colspan="2"><b>Total</b></td><td class="right num"><b>' + money(k.value) + '</b></td><td class="right num"><b>' + money(k.fee) + '</b></td><td class="right num"><b>' + money(k.margin) + '</b> <span class="pill ' + (pct >= 50 ? 'ok' : pct >= 25 ? 'warn' : 'crit') + '">' + pct + '%</span></td></tr></tbody></table></div><p class="small muted" style="margin:0">Value counts ' + (c.quote.renewed ? 'all ' + k.months : 'the ' + k.months + ' committed') + ' months' + (c.quote.renewed ? '' : '. It grows when the renewal is confirmed') + '. Team fees are everything assigned on this client, paid or not.</p></div>';
}
function feeTable(list, mode) {
  return '<div class="tlist"><div class="tlh ft-row"><span></span><span>' + (mode === 'mine' ? 'Client' : 'Team member') + '</span><span>Project</span><span class="right">Fee</span><span>Payment status</span><span></span></div>' + (list.map(f => { const w = feeWhere(f), m = member(f.member);
    return '<div class="tli ft-row" data-a="' + (mode === 'mine' ? 'fee-view' : 'fee-edit') + '" data-id="' + f.id + '"><span class="ticon">' + (mode === 'mine' ? I('building') : I('user')) + '</span><span><b>' + esc(mode === 'mine' ? (w.c ? w.c.company : '') : (m ? m.name : 'Removed member')) + '</b>' + (mode === 'mine' ? '' : '<br><span class="small muted">' + esc(w.c ? w.c.company : '') + '</span>') + '</span><span>' + esc(w.label) + '<br><span class="small muted">' + esc(w.when) + (f.note ? ' · ' + esc(f.note) : '') + '</span></span><span class="right num"><b>S' + money(f.amount) + '</b>' + (f.pct ? '<br><span class="small muted">' + f.pct + '% of S' + money(f.base) + '</span>' : '') + '</span><span>' + feePill(f) + (feeUpcoming(f) && feeProgress(f) ? '<br><span class="small muted">' + feeProgress(f) + '</span>' : '') + '</span>' + I('chev', 'sm') + '</div>'; }).join('') || '<p class="muted" style="padding:16px;margin:0">No fees match.</p>') + '</div>';
}
function feeUpcoming(f) { const w = feeWhere(f); return L.feeUpcoming(w.c, f); }
function feeProgress(f) { const ts = feeTasks(f); if (!ts.length) return ''; const d = ts.filter(t => t.status === 'done').length; return d + ' of ' + ts.length + ' tasks completed'; }
const feePill = f => feeUpcoming(f) ? '<span class="pill lock" title="Payable once the tasks are completed">' + I('cal', 'sm') + 'Upcoming</span>' : f.status === 'paid' ? '<span class="pill ok">' + I('tick', 'sm') + 'Paid' + (f.paidOn ? ' ' + fmtAt(f.paidOn).replace(/,.*$/, '') : '') + '</span>' : '<span class="pill gold">' + I('hourglass', 'sm') + 'Awaiting payment</span>';
function ktile(ic, tone, label, v) { return '<div class="ktile ' + tone + '"><span class="kico">' + I(ic) + '</span><div><span class="klab">' + label + '</span><b class="num">S' + money(v) + '</b></div></div>'; }
function billingPage() {
  const all = S.clients.flatMap(c => rowsFor(c, false)), sum = st => all.filter(r => st.includes(r.state)).reduce((a, r) => a + r.amount, 0);
  const feeSum = st => S.fees.filter(f => st === 'upcoming' ? feeUpcoming(f) : st === 'pending' ? f.status === 'pending' && !feeUpcoming(f) : f.status === st).reduce((a, f) => a + f.amount, 0);
  const cq = S.acq.toLowerCase(), fq = S.afq.toLowerCase();
  const clients = S.clients.filter(c => (!cq || (c.company + ' ' + c.quote.no + ' ' + rowsFor(c, false).map(r => r.no).join(' ')).toLowerCase().includes(cq)) && (!S.acs || clientInvState(c) === S.acs));
  const fees = S.fees.filter(f => { const w = feeWhere(f), m = member(f.member); return (!fq || ((m ? m.name : '') + ' ' + w.label + ' ' + (w.c ? w.c.company : '')).toLowerCase().includes(fq)) && (!S.afs || (S.afs === 'upcoming' ? feeUpcoming(f) : S.afs === 'pending' ? f.status === 'pending' && !feeUpcoming(f) : f.status === S.afs)); });
  const inv = { paid: ['ok', 'tick', 'Paid'], sent: ['info', 'send', 'Sent'], pending: ['', 'clock', 'Pending'], none: ['lock', 'clock', 'No invoices yet'] };
  const crow = c => { const st = inv[clientInvState(c)], owing = rowsFor(c, false).filter(r => ['pending', 'sent'].includes(r.state)).reduce((a, r) => a + r.amount, 0), open = S.billOpen.includes(c.id);
    return '<div class="tli ca-row' + (open ? ' sel' : '') + '" data-a="bill-toggle" data-id="' + c.id + '" aria-expanded="' + open + '"><span class="ticon">' + I('building') + '</span><b>' + esc(c.company) + '</b><span class="num">' + esc(c.quote.no) + ' <span class="small muted">' + STATUS[c.quote.status] + '</span></span><span><span class="pill ' + st[0] + '">' + I(st[1], 'sm') + st[2] + '</span></span><span class="num">' + (owing ? '<span class="pill gold" style="font-size:13px">S' + money(owing) + '</span>' : '<b>S$0</b>') + '</span><span class="right">' + btn(open ? 'Hide' : 'View', 'bill-toggle', { id: c.id }, 'ghost') + '</span></div>' +
      (open ? '<div class="accbody"><div class="row between"><span class="small muted">' + (c.quote.lines.length ? esc(c.quote.lines.map(short).join(' · ')) + ' · ' + mName(c, 1) + ' to ' + mName(c, c.quote.months) : 'Draft quotation, no services yet') + '</span><div class="row" style="gap:6px">' + btn('View quotation', 'doc', { type: 'quote', cid: c.id }, 'quiet', !c.quote.lines.length) + (c.quote.status !== 'accepted' ? btn('Edit quotation', 'quote-open', { id: c.id }, 'ghost') : '') + btn('Open client', 'open-client-tab', { id: c.id, t: 'invoices' }, 'ghost') + '</div></div>' + (c.invoices.length ? invoiceRows(rowsFor(c, false), false) + costingHtml(c) : '') + '</div>' : ''); };
  return '<div class="row between"><div><h1>Accounts</h1><p class="muted" style="margin:4px 0 0">Client invoices, quotations and team fee payments.</p></div><div class="row">' + btn(I('doc', 'sm') + 'New quotation', 'quote-open', { id: 'new' }, 'ghost') + btn(I('doc', 'sm') + 'New invoice', 'inv-new') + '</div></div>' +
    '<div class="grid g4">' + ktile('coins', 'g', 'Outstanding client invoices', sum(['pending', 'sent'])) + ktile('check', 'o', 'Client payments received', sum(['paid'])) + ktile('hourglass', 'g', 'Team fees to pay now', feeSum('pending')) + ktile('coins', 'o', 'Team fees paid', feeSum('paid')) + '</div>' +
    '<div class="row between" style="align-items:flex-end"><div><h2 style="font-size:26px">Client accounts</h2><p class="muted" style="margin:2px 0 0">Click a client to see their invoices and project costing.</p></div><div class="row"><div class="search" style="width:300px">' + I('search') + '<input id="ac-q" type="search" data-acq="1" placeholder="Search clients, quotations or invoices…" value="' + esc(S.acq) + '" aria-label="Search client accounts"></div><select data-acs="1" aria-label="Invoice status" style="width:auto"><option value="">All statuses</option>' + [['pending', 'Pending'], ['sent', 'Sent'], ['paid', 'Paid'], ['none', 'No invoices yet']].map(([k, l]) => '<option value="' + k + '"' + (S.acs === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div></div>' +
    '<div class="tlist"><div class="tlh ca-row"><span></span><span>Client</span><span>Latest quotation</span><span>Invoice status</span><span>Outstanding</span><span></span></div>' + (clients.map(crow).join('') || '<p class="muted" style="padding:16px;margin:0">No clients match.</p>') + '</div>' +
    '<div class="row between" style="align-items:flex-end"><div><h2 style="font-size:26px">Team payments</h2><p class="muted" style="margin:2px 0 0">Fees for the people doing the work. Click a fee to edit it or mark it as paid.</p></div><div class="row"><div class="search" style="width:300px">' + I('search') + '<input id="af-q" type="search" data-afq="1" placeholder="Search team members or projects…" value="' + esc(S.afq) + '" aria-label="Search team payments"></div><select data-afs="1" aria-label="Payment status" style="width:auto"><option value="">All statuses</option><option value="upcoming"' + (S.afs === 'upcoming' ? ' selected' : '') + '>Upcoming</option><option value="pending"' + (S.afs === 'pending' ? ' selected' : '') + '>Awaiting payment</option><option value="paid"' + (S.afs === 'paid' ? ' selected' : '') + '>Paid</option></select>' + btn(I('plus', 'sm') + 'Add team fee', 'fee-new') + '</div></div>' + feeTable(fees, 'admin');
}
function earningsPage() {
  const mine = S.fees.filter(f => f.member === S.me), sum = st => mine.filter(f => st === 'upcoming' ? feeUpcoming(f) : st === 'pending' ? f.status === 'pending' && !feeUpcoming(f) : f.status === st).reduce((a, f) => a + f.amount, 0);
  return '<div><h1>My earnings</h1><p class="muted" style="margin:4px 0 0">Fees assigned to you. A fee becomes payable once your tasks for that month are completed. Only you and the admins see these.</p></div><div class="grid g4">' + ktile('hourglass', 'g', 'Awaiting payment', sum('pending')) + ktile('cal', 'g', 'Upcoming', sum('upcoming')) + ktile('coins', 'o', 'Paid to you', sum('paid')) + '</div>' + feeTable(mine, 'mine');
}
function wsFeesPanel(c, s, m) {
  if (S.role === 'client') return '';
  const list = S.fees.filter(f => f.cid === c.id && f.svc === s.id && (isAdmin() || f.member === S.me)), month = list.filter(f => !s.billing || s.billing !== 'monthly' || s.adhoc || f.m === m);
  if (!isAdmin()) return list.length ? '<aside class="card stack"><h2 class="row" style="gap:8px">' + I('coins') + 'Your fee</h2>' + list.map(f => '<div class="row between"><span>' + esc(feeWhere(f).when) + (f.note ? '<br><span class="small muted">' + esc(f.note) + '</span>' : '') + '</span><span class="row"><b class="num">S' + money(f.amount) + '</b>' + feePill(f) + '</span></div>').join('') + '</aside>' : '';
  return '<aside class="card stack"><div class="row between"><h2 class="row" style="gap:8px">' + I('coins') + 'Team fees</h2><span class="small muted">Admins only</span></div>' + (month.map(f => { const mm = member(f.member); return '<button class="feerow" data-a="fee-edit" data-id="' + f.id + '">' + avatar(f.member) + '<span style="flex:1;text-align:left">' + esc(mm ? mm.name : 'Removed') + (f.note ? '<br><span class="small muted">' + esc(f.note) + '</span>' : '') + '</span><b class="num">S' + money(f.amount) + '</b>' + feePill(f) + '</button>'; }).join('') || '<p class="small muted" style="margin:0">No fees assigned' + (s.billing === 'monthly' && !s.adhoc ? ' for ' + mName(c, m) : '') + '.</p>') + btn(I('plus', 'sm') + 'Assign a fee', 'fee-new', { cid: c.id, svc: s.id, m: m || 1 }, 'ghost block') + '</aside>';
}
function feeDrawer() {
  const d = S.drawer.draft, c = S.clients.find(x => x.id === d.cid), list = c ? wsList(c) : [], custom = d.svc === '__new', s = c && !custom && list.find(x => x.id === d.svc), monthly = s && s.billing === 'monthly' && !s.adhoc;
  const base = s ? feeBase(c, s) : 0, pctOk = !!s, amt = d.type === 'pct' && pctOk ? Math.round(base * (+d.pct || 0) / 100) : +d.amount || 0;
  return '<div class="scrim" data-a="close-bg"><div class="drawer" role="dialog" aria-label="Team fee"><div class="dhead">' + I('coins') + '<h2>' + (d.isNew ? 'Assign a team fee' : 'Team fee') + '</h2><button class="iconbtn" data-a="close" aria-label="Close">' + I('x') + '</button></div><div class="dbody">' +
    '<div class="field"><label for="fe-member">Team member <span class="req">*</span></label><select id="fe-member" data-fe="member"><option value="">Choose…</option>' + S.team.map(m => '<option value="' + m.id + '"' + (d.member === m.id ? ' selected' : '') + '>' + esc(m.name) + (m.admin ? ' (admin)' : '') + '</option>').join('') + '</select></div>' +
    '<div class="meta"><div class="field"><label for="fe-cid">Client <span class="req">*</span></label><select id="fe-cid" data-fe="cid">' + S.clients.map(x => '<option value="' + x.id + '"' + (d.cid === x.id ? ' selected' : '') + '>' + esc(x.company) + '</option>').join('') + '</select></div><div class="field"><label for="fe-svc">Project <span class="req">*</span></label><select id="fe-svc" data-fe="svc"><option value="">Choose…</option>' + list.map(x => '<option value="' + esc(x.id) + '"' + (d.svc === x.id ? ' selected' : '') + '>' + esc(short(x)) + (x.adhoc ? ' (added)' : '') + '</option>').join('') + '<option value="__new"' + (custom ? ' selected' : '') + '>+ New item…</option></select></div></div>' +
    (custom ? field('fe-item', 'Item name', d.item || '', 'text', true) + '<p class="small muted" style="margin:-8px 0 0">For work that isn\'t a workspace, such as a one-off photoshoot or a rush job. It is payable straight away.</p>' : '') +
    (monthly ? '<div class="field"><label for="fe-m">Month</label><select id="fe-m" data-fe="m">' + Array.from({ length: c.quote.months }, (_, i) => i + 1).map(x => '<option value="' + x + '"' + (+d.m === x ? ' selected' : '') + '>' + mName(c, x) + '</option>').join('') + '</select></div>' : '') +
    '<div class="stack" style="gap:8px"><span class="lab">How the fee is worked out</span><div class="seg" style="align-self:flex-start"><button data-a="fee-type" data-t="fixed" aria-pressed="' + (d.type !== 'pct') + '">Fixed amount</button><button data-a="fee-type" data-t="pct" aria-pressed="' + (d.type === 'pct') + '"' + (pctOk ? '' : ' disabled title="Choose a workspace first"') + '>Percentage of client price</button></div>' +
    (d.type === 'pct' && pctOk ? '<div class="meta"><div class="field"><label for="fe-pct">Percentage</label><input id="fe-pct" type="number" min="0" max="100" data-fe="pct" value="' + esc(d.pct) + '"></div><div class="field"><span class="lab">Fee</span><b class="num" style="font:600 22px var(--display)">S' + money(amt) + '</b><span class="small muted">' + (+d.pct || 0) + '% of S' + money(base) + (monthly ? ' per month' : '') + '</span></div></div>' : '<div class="field"><label for="fe-amt">Fee (S$) <span class="req">*</span></label><input id="fe-amt" type="number" min="0" data-fe="amount" value="' + esc(d.amount) + '"></div>') + '</div>' +
    (monthly && d.isNew ? '<label class="opt ' + (d.repeat ? 'on' : '') + '"><input type="checkbox" data-fe="repeat"' + (d.repeat ? ' checked' : '') + '><span>Repeat this fee for every month of this service from ' + mName(c, +d.m) + '</span></label>' : '') +
    field('fe-note', 'Note (the team member sees this)', d.note) +
    (!d.isNew ? '<div class="row between"><span class="lab">Payment status</span><span>' + feePill(d) + (feeUpcoming(d) && feeProgress(d) ? ' <span class="small muted">' + feeProgress(d) + '</span>' : '') + '</span></div>' : '') +
    '<p class="small muted" style="margin:0">' + (custom ? '' : 'Payable once this person\'s tasks for the month are completed. ') + 'They are emailed when the fee is assigned, when it becomes payable and when it is paid. They see only their own fees, never the client\'s price.</p>' +
    '<div class="row">' + btn('Save fee', 'fee-save') + (!d.isNew && d.status !== 'paid' ? btn(I('tick', 'sm') + 'Mark as paid', 'fee-paid', { id: d.id }, 'ghost') : '') + (!d.isNew && d.status === 'paid' ? btn('Mark as unpaid', 'fee-unpaid', { id: d.id }, 'quiet') : '') + (!d.isNew ? btn('Delete', 'fee-del', { id: d.id }, 'quiet') : '') + '</div></div></div></div>';
}
function invDrawer() {
  const d = S.drawer.draft, ok = S.clients.filter(x => x.quote.status === 'accepted');
  return '<div class="scrim" data-a="close-bg"><div class="drawer" role="dialog" aria-label="New invoice"><div class="dhead">' + I('doc') + '<h2>New invoice</h2><button class="iconbtn" data-a="close" aria-label="Close">' + I('x') + '</button></div><div class="dbody">' +
    '<p class="small muted" style="margin:0">Monthly invoices are created automatically when a quotation is accepted. Use this for anything extra along the way.</p>' +
    '<div class="field"><label for="ni-cid">Client <span class="req">*</span></label><select id="ni-cid">' + ok.map(x => '<option value="' + x.id + '"' + (d.cid === x.id ? ' selected' : '') + '>' + esc(x.company) + '</option>').join('') + '</select></div>' +
    '<div class="field"><label for="ni-svc">Service</label><select id="ni-svc"><option value="">Custom item (no workspace)</option>' + S.catalogue.map(s => '<option value="' + s.id + '">' + esc(s.name) + ' · ' + money(s.price) + '</option>').join('') + '</select></div>' + field('ni-name', 'Description (custom item)', '') + field('ni-amt', 'Amount (S$), blank uses the catalogue price', '', 'number') +
    '<p class="small muted" style="margin:0">A catalogue service also opens its workspace once this invoice is paid.</p><div class="row">' + btn('Create invoice', 'inv-create') + btn('Cancel', 'close', {}, 'quiet') + '</div></div></div></div>';
}
function cataloguePage() {
  return '<div class="row between"><div><h1>Service catalogue</h1><p class="muted" style="margin:4px 0 0">Price, quotation wording and the task list each service opens.</p></div>' + btn(I('plus', 'sm') + 'Add service', 'svc-new') + '</div><div class="grid g2">' + S.catalogue.map(s => '<div class="card stack"><div class="row between"><span class="pill ' + (s.billing === 'once' ? 'info' : 'ok') + '">' + (s.billing === 'once' ? 'One-time' : 'Monthly') + '</span>' + btn('Edit', 'svc-edit', { id: s.id }, 'quiet') + '</div><h2>' + esc(s.name) + '</h2><div><b class="num" style="font:600 22px var(--display)">' + money(s.price) + '</b>' + (s.billing === 'monthly' ? ' <span class="muted">per month</span>' : '') + '</div><ul style="margin:0;padding-left:18px">' + s.bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>' + (s.note ? '<i class="small muted">' + esc(s.note) + '</i>' : '') + '<div class="eyebrow">Workspace tasks' + (s.billing === 'monthly' ? ' each month' : '') + ' · ' + s.tasks.length + '</div><div class="ctasks">' + s.tasks.map(t => '<div class="ctask"><span>' + esc(t[0]) + '</span><span class="ctags">' + (t[1] === 'client' ? '<span class="chip client">Client sends</span>' : '') + (t[2] ? '<span class="chip">Needs approval</span>' : '') + '</span></div>').join('') + '</div></div>').join('') + '</div>';
}
function teamPage() {
  return '<h1>Team</h1><p class="muted" style="margin:-8px 0 0">People sign in with the Google email saved here. Team members don\'t see prices, quotations, invoices or the catalogue. They see only their own fees, under My earnings.</p><div class="card scroll" style="padding:4px 8px"><table class="tbl"><thead><tr><th>Name</th><th>Google email</th><th>Role</th><th>Open tasks</th><th class="right">Fees awaiting</th><th></th></tr></thead><tbody>' +
    S.team.map(m => '<tr><td><div class="row" style="flex-wrap:nowrap">' + avatar(m.id) + '<input type="text" data-tn="' + m.id + '" value="' + esc(m.name) + '" aria-label="Name"></div></td><td>' + (m.id === S.me ? esc(m.email) : '<input type="email" data-te="' + m.id + '" value="' + esc(m.email || '') + '" placeholder="Add Google email" aria-label="Google email for ' + esc(m.name) + '">') + '</td><td>' + pill(m.admin ? 'approved' : 'sent', m.admin ? 'Admin' : 'Team member') + '</td><td class="num">' + S.clients.reduce((a, c) => a + c.tasks.filter(t => t.assignee === m.id && t.status !== 'done' && taskOpen(c, t)).length, 0) + '</td><td class="right num">' + money(S.fees.filter(f => f.member === m.id && f.status === 'pending').reduce((a, f) => a + f.amount, 0)) + '</td><td class="right">' + (m.id === S.me ? '<span class="small muted">You</span>' : btn('Remove', 'team-del', { id: m.id }, 'quiet')) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="card stack" style="max-width:560px"><h2>Add a team member</h2>' + field('tm-name', 'Name', '', 'text', true) + field('tm-email', 'Google email', '', 'email', true) + '<div class="field"><label for="tm-role">Role</label><select id="tm-role"><option value="0">Team member</option><option value="1">Admin</option></select></div><div>' + btn('Add team member', 'team-add') + '</div></div>';
}
function settingsPage() {
  const B = S.brand;
  return '<h1>Settings</h1><div class="card stack" style="max-width:680px"><h2>Quotation and invoice details</h2>' + field('b-mark', 'Logo wordmark', B.mark) + field('b-tagline', 'Tagline', B.tagline) + field('b-company', 'Company name', B.company) + field('b-address', 'Address', B.address, 'area') + field('b-terms', 'Terms & Conditions (printed as page 2 of every quotation)', B.terms || '', 'area') + '<div>' + btn('Save settings', 'brand-save') + '</div></div>';
}

/* ---------- shell ---------- */
function myOpenCount() { let n = 0; S.clients.forEach(c => c.tasks.forEach(t => { if (t.assignee === S.me && taskOpen(c, t) && !['done', 'awaiting'].includes(t.status)) n++; })); return n; }
function sidebar() {
  const nav = [['clients', 'Clients', 'building'], ['billing', 'Accounts', 'coins', 'admin'], ['catalogue', 'Service catalogue', 'layers', 'admin'], ['workspaces', 'Workspaces', 'folder'], ['mytasks', 'My tasks', 'check'], ['earnings', 'My earnings', 'coins'], ['files', 'Files', 'folder'], ['team', 'Team', 'users', 'admin']];
  const bv = S.view === 'task' ? (S.back || {}).view : S.view, cur = bv === 'client' ? 'clients' : bv === 'ws' ? 'workspaces' : bv, n = myOpenCount();
  return '<aside class="side"><div class="logo">' + logoImg('white', 46) + '<span class="desk">Client Desk</span></div><div class="sidelab">' + (isAdmin() ? 'Admin' : 'Team') + '</div>' + nav.filter(x => !x[3] || (x[3] === 'admin' ? isAdmin() : !isAdmin())).map(([k, l, ic]) => '<button class="nav" data-a="nav" data-v="' + k + '" aria-current="' + (cur === k) + '">' + I(ic) + '<span class="lbl">' + l + '</span>' + (k === 'mytasks' && n ? '<span class="badge">' + n + '</span>' : '') + '</button>').join('') +
    (isAdmin() ? '<div class="foot"><button class="nav" data-a="nav" data-v="settings" aria-current="' + (cur === 'settings') + '">' + I('cog') + '<span class="lbl">Settings</span></button></div>' : '') + '</aside>';
}
function bellMenu() {
  const v = viewer(), list = S.feed.filter(e => canRead(e, v)).slice(0, 8);
  return '<div class="menu"><div class="row between" style="padding:4px 8px 8px"><h3>Notifications</h3><button class="link" data-a="seen-all">Mark all as read</button></div>' + list.map(e => '<button class="mi" data-a="note-open" data-cid="' + e.cid + '"><span class="av">' + initials(e.who) + '</span><span><span style="' + (unreadFor(e, v) ? 'font-weight:600' : '') + '">' + esc(e.who) + ' · ' + esc(e.text) + '</span><br><span class="small muted">' + esc((S.clients.find(c => c.id === e.cid) || {}).company || '') + ' · ' + fmtAt(e.at) + '</span></span></button>').join('') + '<p class="small muted" style="padding:6px 8px 0;margin:0">Each of these is also emailed.</p></div>';
}
function topRight() {
  const n = S.feed.filter(e => unreadFor(e, viewer())).length, who = S.role === 'client' ? client().contact : member(S.me).name;
  return '<div class="row" style="gap:6px;margin-left:auto;position:relative"><div style="position:relative"><button class="iconbtn" data-a="menu" data-m="bell" aria-label="Notifications">' + I('bell') + (n ? '<span class="badge">' + n + '</span>' : '') + '</button>' + (S.menu === 'bell' ? bellMenu() : '') + '</div><div style="position:relative"><button class="me" data-a="menu" data-m="me" aria-label="Account and view switcher"><span class="av lg">' + initials(who) + '</span>' + I('down', 'sm') + '</button>' + (S.menu === 'me' ? meMenu() : '') + '</div></div>';
}
function staffShell() {
  const c = client(), page = { task: () => taskPage(c, c.tasks.find(x => x.id === S.tid)), clients: clientsPage, client: () => c ? clientPage(c) : clientsPage(), ws: () => c ? workspacePage(c) : clientsPage(), workspaces: workspacesPage, mytasks: myTasksPage, files: filesPage, billing: billingPage, earnings: earningsPage, catalogue: cataloguePage, team: teamPage, settings: settingsPage }[S.view]();
  return '<div class="app">' + sidebar() + '<div class="main"><header class="topbar"><div class="search">' + I('search') + '<input id="gsearch" type="search" placeholder="Search clients, workspaces, tasks, files…" value="' + esc(S.q) + '" autocomplete="off" aria-label="Search"><div id="sres"></div></div>' + topRight() + '</header><main class="page">' + page + '</main></div></div>';
}

/* ---------- client portal ---------- */
function reviewCard(c, t) {
  const s = ql(c, t.svc), last = t.files[t.files.length - 1];
  return '<div class="review"><div class="row between"><span class="pill warn">' + I('clock', 'sm') + 'Awaiting your review</span><span class="small muted">' + esc(short(s)) + '</span></div><h2>' + esc(t.title) + '</h2>' + (t.desc ? '<p style="margin:0">' + esc(t.desc) + '</p>' : '') + (last ? fileRow(last) : '') + '<div class="row small muted" style="gap:22px"><span class="row" style="gap:6px">' + I('user', 'sm') + 'Handled by ' + esc((member(t.assignee) || {}).name || 'the team') + '</span>' + (t.due ? '<span class="row" style="gap:6px">' + I('cal', 'sm') + dlong(t.due) + '</span>' : '') + '<span>Revision ' + t.rounds + ' of 2 used</span></div><div class="row">' + btn(I('tick', 'sm') + 'Approve', 't-approve', { id: t.id }) + btn(I('chat', 'sm') + 'Open to comment or request changes', 'task', { id: t.id }, 'quiet') + '</div></div>';
}
function portalTasks(c) {
  const ids = wsList(c).map(s => s.id); if (S.pws && !ids.includes(S.pws)) S.pws = '';
  const all = c.tasks.filter(t => canSee(c, t) && (!S.pws || t.svc === S.pws)).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
  const shown = S.ptg ? all.filter(t => groupOf(t.status) === S.ptg) : all;
  return '<div><h1>Tasks</h1><p class="muted" style="margin:4px 0 0">Review work, send what\'s needed and give your approvals.</p></div>' +
    '<label class="wsselect" for="p-ws">' + I('layers') + '<span style="flex:1;display:flex;flex-direction:column"><span class="small muted">Workspace</span><select id="p-ws" data-pws="1"><option value="">All workspaces</option>' + wsList(c).map(s => '<option value="' + esc(s.id) + '"' + (S.pws === s.id ? ' selected' : '') + '>' + esc(short(s)) + '</option>').join('') + '</select></span></label>' +
    chipsHtml(all, S.ptg, 'p-group', { awaiting: 'Awaiting your approval' }) + taskTable(shown.map(t => ({ c, t })), 'assignee') + '<p class="small muted" style="margin:0">Monthly services show paid months only. Each new month appears once its invoice is paid.</p>';
}
function portalShell() {
  const c = client(), open = c.tasks.filter(t => canSee(c, t));
  if (!hasAccess(c)) return '<div class="app"><aside class="side"><div class="logo">' + logoImg('white', 46) + '<span class="desk">Client portal</span></div></aside><div class="main"><header class="topbar"><b>' + esc(c.company) + '</b>' + topRight() + '</header><main class="page"><div class="lockbox"><h2>Your workspace is almost ready</h2><p>It opens once your first invoice has been received.</p></div></main></div></div>';
  const awaiting = open.filter(t => t.status === 'awaiting'), tosend = open.filter(t => t.owner === 'client' && t.status === 'todo'), n = awaiting.length + tosend.length;
  const tabs = [['overview', 'Overview', 'home'], ['workspaces', 'Workspaces', 'layers'], ['tasks', 'Tasks', 'check'], ['files', 'Files', 'folder'], ['invoices', 'Invoices', 'receipt'], ['details', 'My details', 'user']];
  const curTab = S.ptab === 'task' ? 'tasks' : S.ptab;
  let body;
  if (S.ptab === 'task') body = taskPage(c, c.tasks.find(x => x.id === S.tid));
  else if (S.ptab === 'overview') body = '<div><h1>Welcome, ' + esc(c.contact) + '</h1><p class="muted" style="margin:6px 0 0">' + (n ? 'There ' + (n === 1 ? 'is 1 thing' : 'are ' + n + ' things') + ' waiting for you.' : 'Nothing needs you right now. Here is where things stand.') + '</p></div>' +
    (awaiting.length ? '<div class="stack"><h2>Awaiting your review</h2>' + awaiting.map(t => reviewCard(c, t)).join('') + '</div>' : '') +
    (tosend.length ? '<div class="stack"><h2>For you to send</h2>' + taskTable(tosend.map(t => ({ c, t })), 'assignee') + '</div>' : '') + '<div class="stack"><h2>Your services</h2>' + wsCards(c) + '</div>';
  else if (S.ptab === 'workspaces') body = '<h1>Workspaces</h1>' + wsCards(c);
  else if (S.ptab === 'tasks') body = portalTasks(c);
  else if (S.ptab === 'files') body = '<h1>Files</h1>' + filesTab(c);
  else if (S.ptab === 'invoices') body = '<h1>Invoices</h1>' + invoicesTab(c, true);
  else body = '<h1>My details</h1><div class="card stack" style="max-width:560px">' + field('d-company', 'Company', c.company) + field('d-contact', 'Contact person', c.contact) + field('d-phone', 'Phone', c.phone) + field('d-website', 'Website', c.website) + '<p class="small muted" style="margin:0">Signed in with Google.</p><div>' + btn('Save details', 'save-details') + '</div></div>';
  const side = '<aside class="side"><div class="logo">' + logoImg('white', 46) + '<span class="desk">Client portal</span></div><div class="sidelab">' + esc(c.company) + '</div>' + tabs.map(([k, l, ic]) => '<button class="nav" data-a="ptab" data-t="' + k + '" aria-current="' + (curTab === k) + '">' + I(ic) + '<span class="lbl">' + l + '</span>' + (k === 'overview' && n ? '<span class="badge">' + n + '</span>' : k === 'tasks' && awaiting.length ? '<span class="badge">' + awaiting.length + '</span>' : '') + '</button>').join('') + '</aside>';
  return '<div class="app">' + side + '<div class="main"><header class="topbar"><div class="row" style="gap:10px"><span class="tilelogo" style="width:36px;height:36px;font-size:13px;border-radius:8px">' + initials(c.company) + '</span><b>' + esc(c.company) + '</b></div>' + topRight() + '</header><main class="page">' + body + '</main></div></div>';
}
/* ---------- drawers ---------- */
function timelineHtml(t) {
  const steps = (t.history || []).slice(-5).map(h => ['on', h.text, h.by, fmtAt(h.at)]), nx = nextStep(t);
  if (nx) steps.push(['', nx[0], nx[1], '']);
  if (!steps.length) return '<p class="small muted" style="margin:0">No activity yet.</p>';
  return '<div class="tl">' + steps.map(([on, title, sub, at]) => '<div class="tls"><span class="dot ' + on + '">' + (on ? I('tick', 'sm') : '') + '</span><div><b>' + esc(title) + '</b><div class="small muted">' + esc(sub) + '</div></div><span class="small muted">' + at + '</span></div>').join('') + '</div>';
}
function taskPage(c, t) {
  if (!t) return '<div class="lockbox">This task no longer exists.</div>';
  const A = staff(), s = ql(c, t.svc), m = member(t.assignee), cl = S.role === 'client';
  if (cl && S.confirm === t.id) {
    const mine = t.comments.filter(x => x.client).slice(-1)[0];
    return '<div class="tpage"><button class="backlink" data-a="task-back">' + I('back') + '<h1>Review submitted</h1></button><div class="banner"><span class="big">' + I('tick') + '</span><div><h2 style="font-size:26px">Approved</h2><p style="margin:4px 0 0">You have approved “' + esc(t.title) + '”.</p></div></div>' +
      (mine ? '<div class="stack"><h2>Your comment</h2><div class="card row" style="flex-wrap:nowrap">' + I('chat') + '<span>' + esc(mine.text) + '</span></div></div>' : '') + '<div class="stack"><h2>Activity timeline</h2><div class="card">' + timelineHtml(t) + '</div></div>' + btn(I('back', 'sm') + 'Back to tasks', 'task-back', {}, 'block bigbtn') + '</div>';
  }
  const label = cl && t.status === 'awaiting' ? 'Awaiting your approval' : '';
  const assignee = A && t.owner === 'gioia' ? '<select id="dr-as" data-as="' + t.id + '" aria-label="Assignee"><option value="">Unassigned</option>' + S.team.map(x => '<option value="' + x.id + '"' + (t.assignee === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>' : '<b>' + (t.owner === 'client' ? (cl ? 'You' : esc(c.contact || 'Client')) : esc(m ? m.name : 'Unassigned')) + '</b>';
  const dueCell = A ? '<input id="dr-due" type="date" data-due="' + t.id + '" value="' + esc(t.due) + '" aria-label="Due date">' : '<b>' + (t.due ? dlong(t.due) : '—') + '</b>';
  const head = '<div class="card stack" style="gap:14px"><div class="row" style="gap:16px;flex-wrap:nowrap;align-items:flex-start"><span class="ticon lg">' + I(svcIcon(t.svc)) + '</span><div class="stack" style="gap:8px"><h1 style="font-size:26px">' + esc(t.title) + '</h1><span class="row" style="gap:6px">' + pill(t.status, label) + (t.approve && t.rounds ? '<span class="chip">Revision ' + t.rounds + ' of 2</span>' : '') + '</span></div></div>' +
    '<div class="metarow"><div>' + I('user') + '<div class="stack" style="gap:2px;flex:1"><span class="small muted">' + (cl ? 'Assigned to' : 'Assignee') + '</span>' + assignee + '</div></div>' + (A ? '<div>' + I('building') + '<div class="stack" style="gap:2px"><span class="small muted">Client</span><b>' + esc(c.company) + '</b></div></div>' : '') + '<div>' + I('cal') + '<div class="stack" style="gap:2px;flex:1"><span class="small muted">Due date</span>' + dueCell + '</div></div></div></div>';
  const desc = '<div class="stack" style="gap:6px"><h2>Description</h2>' + (A ? '<textarea id="dr-desc" data-desc="' + t.id + '" placeholder="What was done, and what the client should check. The client sees this.">' + esc(t.desc) + '</textarea>' : '<p style="margin:0">' + (t.desc ? esc(t.desc) : '<span class="muted">No description.</span>') + '</p>') + '<span class="small muted">' + esc(short(s)) + (t.m ? ' · ' + mName(c, t.m) : '') + '</span></div>';
  const status = A ? '<div class="stack" style="gap:6px"><h2>Status</h2><select id="dr-status" data-ts="' + t.id + '" aria-label="Status">' + statusOpts(t).map(k => '<option value="' + k + '"' + (t.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>').join('') + '</select></div>' : '';
  const canAdd = A || (cl && ((t.owner === 'client' && t.status === 'todo') || t.status === 'awaiting'));
  const files = '<div class="stack" style="gap:8px"><h2>Attachment (' + t.files.length + ')</h2>' + (t.files.length ? '<div class="card files" style="padding:0 14px">' + t.files.map(fileRow).join('').replace('class="file"', 'class="file" style="border-top:0"') + '</div>' : '<p class="small muted" style="margin:0">Nothing attached yet.</p>') + '<input type="file" id="up-' + t.id + '" data-up="' + t.id + '" multiple hidden>' +
    (canAdd ? '<div class="grid g2">' + btn(I('upload') + 'Upload file', 'pick-file', { key: t.id }, 'quiet block bigbtn') + btn(I('link') + 'Add Google link', 'link-open', { key: t.id }, 'quiet block bigbtn') + '</div>' : '') + '</div>';
  const comments = '<div class="stack" style="gap:8px"><h2>' + (cl ? 'Activity &amp; comments' : 'Comments') + ' (' + t.comments.length + ')</h2><div class="card stack" style="gap:0;padding:0 16px">' + t.comments.map(x => '<div class="row" style="flex-wrap:nowrap;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line)"><span class="av" style="width:36px;height:36px">' + (x.client ? initials(c.contact) : initials(x.by)) + '</span><div style="flex:1"><div class="row between"><b>' + (cl && x.client ? 'You (Client)' : esc(x.client ? c.contact + ' (Client)' : x.by)) + '</b><span class="small muted">' + fmtAt(x.at) + '</span></div><div>' + esc(x.text) + '</div></div></div>').join('') +
    '<div class="field" style="padding:12px 0"><label for="cm-text">' + (cl && t.status === 'awaiting' ? 'Your comment (needed to request changes, optional when approving)' : 'Add a comment') + '</label><textarea id="cm-text"></textarea>' + (cl && t.status === 'awaiting' ? '' : '<div>' + btn('Post comment', 't-comment', { id: t.id }, 'ghost') + '</div>') + '</div></div></div>';
  let main = '';
  if (A) {
    if (t.owner === 'gioia' && t.approve && ['todo', 'progress', 'changes'].includes(t.status)) main = btn(I('send') + (t.status === 'changes' ? 'Resubmit for client review' : 'Submit for client review'), 't-submit', { id: t.id }, 'block bigbtn');
    else if (t.status === 'approved' || (t.owner === 'gioia' && !t.approve && t.status !== 'done')) main = btn(I('tick') + 'Mark as completed', 't-done', { id: t.id }, 'block bigbtn') + '<p class="small muted row" style="justify-content:center;gap:6px;margin:0">' + I('clock', 'sm') + 'Approval doesn\'t complete a task, in case there are follow-up actions. The client is notified when you mark it as completed.</p>';
    else if (t.owner === 'client' && t.status !== 'done') main = btn(I('tick') + 'Mark as received', 't-done', { id: t.id }, 'block bigbtn');
    else if (t.status === 'awaiting') main = '<div class="lockbox" style="padding:14px">Waiting for the client to review. You\'ll be notified when they respond.</div>';
  } else {
    if (t.status === 'awaiting') main = '<div class="grid g2">' + btn(I('tick') + 'Approve', 't-approve', { id: t.id }, 'block bigbtn') + btn(I('chat') + 'Request changes', 't-changes', { id: t.id }, 'ghost block bigbtn', t.rounds >= 2) + '</div>' + (t.rounds >= 2 ? '<p class="small muted" style="margin:0;text-align:center">Both included revision rounds are used. Further changes are quoted separately.</p>' : '');
    else if (t.owner === 'client' && t.status === 'todo') main = btn(I('send') + 'Mark as sent to the team', 't-sent', { id: t.id }, 'block bigbtn');
  }
  const banner = A && t.status === 'approved' ? '<div class="banner"><span class="big">' + I('tick') + '</span><div><h2 style="font-size:26px">Client approved</h2><p style="margin:4px 0 0">The client has approved “' + esc(t.title) + '”.</p></div></div>' : '';
  return '<div class="tpage"><button class="backlink" data-a="task-back">' + I('back') + '<h1>' + (banner ? 'Client approved' : 'Task details') + '</h1></button>' + banner + head + desc + status + files + comments + '<div class="stack" style="gap:8px"><h2>Activity timeline</h2><div class="card">' + timelineHtml(t) + '</div></div>' + main + '</div>';
}
function newTaskDrawer() {
  return '<div class="scrim" data-a="close-bg"><div class="drawer" role="dialog" aria-label="New task"><div class="dhead">' + I('plus') + '<h2>New task</h2><button class="iconbtn" data-a="close" aria-label="Close">' + I('x') + '</button></div><div class="dbody">' + field('nt-title', 'Task', '', 'text', true) + field('nt-desc', 'Description', '', 'area') +
    '<div class="meta"><div class="field"><label for="nt-owner">Who does it</label><select id="nt-owner"><option value="gioia">The team</option><option value="client">The client sends it</option></select></div><div class="field"><label for="nt-as">Assigned to</label><select id="nt-as"><option value="">Unassigned</option>' + S.team.map(m => '<option value="' + m.id + '">' + esc(m.name) + '</option>').join('') + '</select></div>' + field('nt-due', 'Due date', '', 'date') + '<label class="opt" style="align-self:end"><input type="checkbox" id="nt-appr" checked> Needs client approval</label></div>' +
    '<p class="small muted" style="margin:0">Added to this workspace for this month only. To add it every month, edit the service in the catalogue.</p><div class="row">' + btn('Add task', 'task-create') + btn('Cancel', 'close', {}, 'quiet') + '</div></div></div></div>';
}
function quoteDrawer() {
  const d = S.drawer, isNew = d.id === 'new', c = isNew ? null : S.clients.find(x => x.id === d.id), q = d.q;
  const tmp = { quote: Object.assign({}, q, { lines: q.ids.map(svc).filter(Boolean) }) }, m1 = invTotal(tmp, 1), m2 = invTotal(tmp, 2);
  const drafts = S.clients.filter(x => x.quote.status !== 'accepted');
  return '<div class="scrim" data-a="close-bg"><div class="drawer" role="dialog" aria-label="Quotation"><div class="dhead">' + I('doc') + '<h2>' + (isNew ? 'New quotation' : 'Quotation ' + esc(c.quote.no)) + '</h2><button class="iconbtn" data-a="close" aria-label="Close">' + I('x') + '</button></div><div class="dbody">' +
    '<div class="field"><label for="qd-client">Client <span class="req">*</span></label><select id="qd-client" data-qclient="1"><option value="new"' + (isNew ? ' selected' : '') + '>New client…</option>' + drafts.map(x => '<option value="' + x.id + '"' + (x.id === d.id ? ' selected' : '') + '>' + esc(x.company) + '</option>').join('') + '</select></div>' +
    (isNew ? '<div class="meta">' + field('qd-company', 'Company', d.company || '', 'text', true) + field('qd-contact', 'Contact person', d.contact || '') + field('qd-email', 'Google email', d.email || '', 'email') + field('qd-website', 'Website', d.website || '') + '</div>' : '') +
    '<div class="stack" style="gap:8px"><span class="lab">Services <span class="req" style="color:var(--crit)">*</span></span>' + S.catalogue.map(s => '<label class="opt ' + (q.ids.includes(s.id) ? 'on' : '') + '"><input type="checkbox" data-qsvc="' + s.id + '"' + (q.ids.includes(s.id) ? ' checked' : '') + '><span style="flex:1"><b>' + esc(s.name) + '</b><br><span class="small muted">' + esc(s.bullets[0] || '') + '</span></span><span class="num"><b>' + money(s.price) + '</b><br><span class="small muted">' + (s.billing === 'once' ? 'one-time' : 'per month') + '</span></span></label>').join('') + '</div>' +
    '<div class="meta"><div class="field"><label for="qd-start">First month</label><input id="qd-start" type="month" data-qf="start" value="' + esc(q.start) + '"></div><div class="field"><label for="qd-months">Total months</label><input id="qd-months" type="number" min="1" max="24" data-qf="months" value="' + q.months + '"></div><div class="field"><label for="qd-committed">Committed months</label><input id="qd-committed" type="number" min="1" max="24" data-qf="committed" value="' + q.committed + '"></div><div class="field"><label for="qd-discount">Monthly discount from Month 2</label><input id="qd-discount" type="number" min="0" data-qf="discount" value="' + q.discount + '"></div></div>' +
    '<div class="card" style="background:var(--card-2)"><div class="row between"><span>Month 1</span><b class="num" style="font:600 20px var(--display)">S' + money(m1) + '</b></div>' + (q.months > 1 ? '<div class="row between"><span>Month 2 onward</span><b class="num">S' + money(m2) + ' / month</b></div>' : '') + '<div class="row between small muted"><span>Full term, ' + q.months + ' months</span><span class="num">S' + money(m1 + m2 * Math.max(0, q.months - 1)) + '</span></div></div>' +
    (D.email ? field('qd-to', 'Send to (email)', d.to != null ? d.to : (isNew ? d.email || '' : c.email), 'email') : '') +
    '<div class="grid" style="grid-template-columns:1fr 1fr">' + btn(I('doc', 'sm') + 'Preview', 'qd-preview', {}, 'ghost block', !q.ids.length) + btn('Save draft', 'qd-save', {}, 'quiet block', !q.ids.length) + '</div>' + (D.email ? btn(I('send', 'sm') + 'Email quotation to client', 'qd-email', {}, 'block bigbtn', !q.ids.length) + '<p class="small muted" style="margin:0">Sends the quotation as a PDF, with your terms, to the address above, and marks it as sent.</p>' : '<p class="small muted" style="margin:0">Emailing quotations from the app is coming. For now, use Preview to print or save the PDF, send it yourself, then click Mark as sent.</p>') +
    '<div class="grid" style="grid-template-columns:1fr 1fr">' + btn(D.email ? 'Mark as sent (sent another way)' : 'Mark as sent', 'qd-send', {}, D.email ? 'quiet block' : 'block', !q.ids.length) + btn('Mark as accepted', 'qd-accept', {}, 'quiet block', !q.ids.length) + '</div></div></div></div>';
}
function svcDrawer() {
  const d = S.drawer.draft;
  return '<div class="scrim" data-a="close-bg"><div class="drawer" role="dialog" aria-label="Service"><div class="dhead">' + I('layers') + '<h2>' + (d.isNew ? 'Add service' : 'Edit service') + '</h2><button class="iconbtn" data-a="close" aria-label="Close">' + I('x') + '</button></div><div class="dbody">' + field('e-name', 'Service name', d.name, 'text', true) +
    '<div class="meta">' + field('e-price', 'Price ($)', d.price, 'number') + '<div class="field"><label for="e-billing">Billing</label><select id="e-billing"><option value="once"' + (d.billing === 'once' ? ' selected' : '') + '>One-time (Month 1)</option><option value="monthly"' + (d.billing === 'monthly' ? ' selected' : '') + '>Monthly</option></select></div></div>' +
    field('e-bullets', 'Quotation description, one point per line', d.bullets.join('\n'), 'area') + field('e-note', 'Small note under the description', d.note) + '<h3>Workspace tasks</h3>' +
    d.tasks.map((t, i) => '<div class="trow"><input id="et-title-' + i + '" type="text" value="' + esc(t[0]) + '" aria-label="Task ' + (i + 1) + '" placeholder="Task"><select id="et-owner-' + i + '" aria-label="Task ' + (i + 1) + ' owner"><option value="gioia"' + (t[1] === 'gioia' ? ' selected' : '') + '>Team</option><option value="client"' + (t[1] === 'client' ? ' selected' : '') + '>Client</option></select><label class="small"><input id="et-appr-' + i + '" type="checkbox"' + (t[2] ? ' checked' : '') + '> Approval</label><button class="link" data-a="svc-row-del" data-i="' + i + '">Remove</button></div>').join('') +
    '<div>' + btn(I('plus', 'sm') + 'Add task', 'svc-row-add', {}, 'quiet') + '</div><p class="small muted" style="margin:0">Changes apply to new quotations. Existing ones keep their own copy.</p><div class="row">' + btn('Save service', 'svc-save') + btn('Cancel', 'close', {}, 'quiet') + (d.isNew ? '' : btn('Delete', 'svc-delete', {}, 'quiet')) + '</div></div></div></div>';
}
function linkDrawer() {
  return '<div class="modal" data-a="close-bg"><div class="sheet stack" style="max-width:460px"><h2>Add a Google link</h2>' + field('ln-url', 'Link', '', 'text', true) + field('ln-name', 'Name', '') + '<div class="row">' + btn('Add link', 'link-add') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
}

/* ---------- Gioia document ---------- */
function docHtml(c, type, m) {
  const q = c.quote, B = S.brand, isQ = type === 'quote', a = type === 'adhoc' ? adhocOf(c, m) : null, lines = a ? [{ s: a.s, name: a.name, amount: a.amount }] : invLines(c, isQ ? 1 : m); let n = 0;
  const rows = lines.map(l => '<tr><td>' + (l.s ? '<div class="lt">' + (++n) + ') ' + esc(l.name) + '</div><ul>' + l.s.bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>' + (l.s.note ? '<i>' + esc(l.s.note) + '</i>' : '') : '<div class="lt">' + esc(l.name) + '</div>') + '</td><td class="num">' + (l.s ? l.amount.toLocaleString('en-SG') : '') + '</td><td>' + (l.s ? 1 : '') + '</td><td class="right num">' + money(l.amount) + '</td></tr>').join('');
  const once = lines.filter(l => l.s && l.s.billing === 'once').reduce((x, l) => x + l.amount, 0), m1 = invTotal(c, 1), m2 = q.months > 1 ? invTotal(c, 2) : 0;
  const foot = isQ ? (once ? '<div class="sub"><span>One-time fee</span><span>' + money(once) + '</span></div>' : '') + '<div class="dbar"><span>Month 1 retainer</span><span>' + money(m1 - once) + '</span></div><h4>Payment Schedule &amp; Project Timeline</h4><ul><li>Month 1 (' + mName(c, 1) + '): ' + money(m1) + ' in total.</li>' + (q.months > 1 ? '<li>Month 2 to Month ' + q.months + ': ' + money(m2) + ' per month.</li>' : '') + '</ul>' : a ? '<div class="dbar"><span>Total</span><span>' + money(a.amount) + '</span></div>' : '<div class="dbar"><span>Month ' + m + ' total · due ' + due(c, m) + '</span><span>' + money(invTotal(c, m)) + '</span></div>';
  return '<div class="scroll"><div class="doc"><div class="logo2">' + logoImg('green', 64) + '</div><div class="co">' + esc(B.company) + '</div><div class="addr">' + esc(B.address).replace(/\n/g, '<br>') + '</div><div class="row between" style="align-items:flex-start"><div><div class="lab2">Issued to:</div>' + esc(c.contact) + '<br>' + esc(c.company) + '<br>' + esc(c.website) + '</div><div class="right"><span class="lab2">' + (isQ ? 'Quotation no:' : 'Invoice no:') + '</span> <b>' + esc(isQ ? q.no : a ? a.no : inv(c, m).no) + '</b><br><span class="lab2">Date:</span> ' + esc(isQ ? q.date : a ? a.date : due(c, m)) + '</div></div><table><thead><tr><th>Description</th><th>Unit price</th><th>Qty</th><th class="right">Total</th></tr></thead><tbody>' + rows + '</tbody></table>' + foot + (isQ && B.terms ? '<div class="page2"><div class="logo2">' + logoImg('green', 48) + '</div><div class="lab2" style="margin:14px 0 8px">Terms &amp; Conditions</div><div class="terms">' + esc(B.terms) + '</div></div>' : '') + '</div></div>';
}

/* ---------- render ---------- */
let toastT;
function toast(t) { S.toast = t; clearTimeout(toastT); toastT = setTimeout(() => { S.toast = null; render(); }, 4200); }
function render() {
  if (!D) return;
  if (!D.me || !['admin', 'team', 'client'].includes(D.me.role)) { document.getElementById('app').innerHTML = gateHtml(); return; }
  const c = client();
  let overlay = '';
  if (S.drawer) {
    const k = S.drawer.kind;
    if (k === 'newtask') overlay = newTaskDrawer();
    if (k === 'quote') overlay = quoteDrawer();
    if (k === 'svc') overlay = svcDrawer();
    if (k === 'fee') overlay = feeDrawer();
    if (k === 'invoice') overlay = invDrawer();
  }
  if (S.modal && S.modal.kind === 'doc') { const dc = S.modal.temp || S.clients.find(x => x.id === S.modal.cid) || c; overlay += '<div class="modal" data-a="close-bg-modal"><div class="sheet"><div class="row between noprint" style="margin-bottom:12px"><h2>' + (S.modal.type === 'quote' ? (S.modal.temp ? 'Preview: quotation ' : 'Quotation ') + esc(dc.quote.no) : 'Invoice') + '</h2><div class="row">' + btn(I('download', 'sm') + 'Print or save as PDF', 'print', {}, 'ghost') + btn(S.modal.temp ? 'Back to the quotation' : 'Close', 'close-modal', {}, 'quiet') + '</div></div>' + docHtml(dc, S.modal.type, S.modal.m) + '</div></div>'; }
  if (S.modal && S.modal.kind === 'link') overlay += linkDrawer();
  const ae = document.activeElement, fid = ae && ae.id, sel = ae && ae.id && 'selectionStart' in ae ? [ae.selectionStart, ae.selectionEnd] : null;
  document.getElementById('app').innerHTML = (S.role === 'client' ? portalShell() : staffShell()) + overlay + (S.toast ? '<div class="toast" role="status">' + I('tick', 'sm') + esc(S.toast) + '</div>' : '');
  if (['mt-q', 'gsearch', 'ac-q', 'af-q'].includes(fid)) { const el = document.getElementById(fid); if (el) { el.focus(); try { if (sel) el.setSelectionRange(sel[0], sel[1]); } catch (x) {} } }
}
function renderSearch() {
  const box = document.getElementById('sres'); if (!box) return;
  const q = S.q.toLowerCase(); if (q.length < 2) { box.innerHTML = ''; return; }
  const hits = [];
  S.clients.forEach(c => {
    if ((c.company + ' ' + c.contact).toLowerCase().includes(q)) hits.push(['open-client', { id: c.id }, 'users', c.company, 'Client']);
    wsList(c).forEach(s => { if (s.name.toLowerCase().includes(q)) hits.push(['open-ws', { id: s.id, cid: c.id, m: currentMonth(c) }, 'folder', short(s), 'Workspace · ' + c.company]); });
    c.tasks.forEach(t => { if (taskOpen(c, t) && t.title.toLowerCase().includes(q)) hits.push(['task', { id: t.id, cid: c.id }, 'check', t.title, 'Task · ' + c.company + (t.m ? ' · ' + mName(c, t.m) : '')]); });
    c.files.forEach(f => { if (f.name.toLowerCase().includes(q)) hits.push(['open-client-tab', { id: c.id, t: 'files' }, 'doc', f.name, 'File · ' + c.company]); });
  });
  box.innerHTML = '<div class="sres">' + (hits.slice(0, 12).map(([a, d, ic, t, sub]) => '<button data-a="' + a + '" ' + Object.entries(d).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + '>' + I(ic) + '<span><b>' + esc(t) + '</b><br><span class="small muted">' + esc(sub) + '</span></span></button>').join('') || '<p class="small muted" style="padding:8px 10px;margin:0">No matches.</p>') + '</div>';
}

function syncFee() { const d = S.drawer.draft; const g = id => document.getElementById(id); if (g('fe-amt')) d.amount = g('fe-amt').value; if (g('fe-pct')) d.pct = g('fe-pct').value; if (g('fe-item')) d.item = g('fe-item').value.trim(); if (g('fe-note')) d.note = g('fe-note').value.trim(); }
function openQuote(id) {
  const c = S.clients.find(x => x.id === id);
  const q = c ? { ids: c.quote.lines.map(s => s.id), start: c.quote.start, months: c.quote.months, committed: c.quote.committed, discount: c.quote.discount } : { ids: [], start: '2026-12', months: 6, committed: 3, discount: 0 };
  S.drawer = { kind: 'quote', id: c ? c.id : 'new', q };
}
function syncSvc() {
  const d = S.drawer.draft; d.name = val('e-name'); d.price = Math.max(0, +val('e-price') || 0); d.billing = val('e-billing'); d.note = val('e-note');
  d.bullets = val('e-bullets').split('\n').map(x => x.trim()).filter(Boolean);
  d.tasks = d.tasks.map((t, i) => [val('et-title-' + i), val('et-owner-' + i), document.getElementById('et-appr-' + i).checked && val('et-owner-' + i) === 'gioia']);
}
function syncQuoteNew() { if (!S.drawer || S.drawer.kind !== 'quote') return; if (S.drawer.id === 'new') ['company', 'contact', 'email', 'website'].forEach(k => { S.drawer[k] = val('qd-' + k); }); if (document.getElementById('qd-to')) S.drawer.to = val('qd-to'); }
function draftQuoteClient() { const d = S.drawer, q = d.q, ex = S.clients.find(x => x.id === d.id), c = ex ? clone(ex) : { id: 'draft', company: d.company || 'New client', contact: d.contact || '', website: d.website || '', quote: { no: String(S.nextQuote), date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase().replace(/ /g, '-'), status: 'pending' }, invoices: [], adhoc: [], extra: [], tasks: [], files: [] }; c.quote = Object.assign({}, c.quote, { lines: q.ids.map(id => clone(svc(id))), start: q.start, months: q.months, committed: Math.min(q.committed, q.months), discount: q.discount }); return c; }
/* ---------- talking to the server ---------- */
let D = null;
function checkFees() {}
const task = id => client().tasks.find(t => t.id === id);
function pickClient(d) { if (d.cid) S.cid = d.cid; }
function adopt(st) {
  D = st; if (!D.me || !['admin', 'team', 'client'].includes(D.me.role)) return;
  S.brand = D.brand; S.team = D.team || []; S.catalogue = D.catalogue || []; S.clients = D.clients || []; S.fees = D.fees || []; S.feed = D.feed || []; S.nextQuote = D.nextQuote || 0;
  S.clients.forEach(c => { c.adhoc = c.adhoc || []; c.extra = c.extra || []; c.files = c.files || []; c.tasks.forEach(t => { t.desc = t.desc || ''; t.due = t.due || ''; t.history = t.history || []; t.comments = t.comments || []; t.files = t.files || []; }); });
  S.role = D.me.role === 'client' ? 'client' : 'admin'; S.me = D.me.id || '';
  if (D.me.role === 'client') S.cid = D.me.cid; else if (!S.clients.find(c => c.id === S.cid)) S.cid = (S.clients[0] || {}).id || '';
  if (!S.init) { S.init = true; S.wsOpen = S.clients.slice(0, 1).map(c => c.id); }
  if (!isAdmin() && ['billing', 'catalogue', 'team', 'settings'].includes(S.view)) S.view = 'clients';
  if (!client() && ['client', 'ws', 'task'].includes(S.view)) S.view = 'clients';
  document.body.classList.toggle('no-upload', !D.uploads); document.body.classList.toggle('no-email', !D.email);
}
async function load() {
  try { const r = await fetch('/api/state', { credentials: 'same-origin' }); const st = await r.json(); if (st.error) throw new Error(st.error); adopt(st); }
  catch (e) { document.getElementById('app').innerHTML = '<p style="padding:24px">The app could not load. Please refresh the page.</p>'; return; }
  render();
}
async function api(a, p, opts) {
  opts = opts || {}; let res;
  try { const r = await fetch('/api/action', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a, cid: opts.cid || S.cid, p: p || {} }) }); res = await r.json(); }
  catch (e) { toast('Could not reach the server. Check your connection and try again.'); return null; }
  if (res.error) { toast(res.error); return null; }
  adopt(res.state);
  if (!opts.quiet) toast(opts.msg || (res.logged && res.logged.length ? res.logged[0] : 'Saved.'));
  return res;
}
function gateHtml() {
  const failed = /signin=failed/.test(location.search); let body;
  if (!D.me) body = '<p>Sign in with the Google account your invitation was sent to.</p>' + (failed ? '<p class="pill crit" style="align-self:center">Sign-in did not complete. Please try again.</p>' : '') + (D.googleReady ? '<a class="btn bigbtn" href="/auth/google">Sign in with Google</a>' : '<p class="muted">Google sign-in is being set up. Please check back shortly.</p>') + (D.devLogin ? '<p class="small muted">Local testing: open /auth/dev?email=you@example.com</p>' : '');
  else if (D.me.role === 'pending') body = '<p>You are signed in as <b>' + esc(D.me.email) + '</b>.</p><p>Your workspace opens once your first invoice has been received. We will be in touch.</p><a class="btn ghost" href="/auth/logout">Sign out</a>';
  else body = '<p>You are signed in as <b>' + esc(D.me.email) + '</b>, but this account is not on the client or team list.</p><p class="muted">Ask your contact to add this email, or sign in with a different Google account.</p><a class="btn ghost" href="/auth/logout">Use a different account</a>';
  return '<div class="gate"><div class="gatelogo">' + logoImg('green', 72) + '</div><div class="card stack" style="text-align:center;align-items:center;gap:14px;padding:30px"><h2>Client Desk</h2>' + body + '</div></div>';
}
function meMenu() {
  return '<div class="menu" style="width:270px"><div style="padding:8px 10px 10px"><b>' + esc(D.me.name || '') + '</b><br><span class="small muted">' + esc(D.me.email) + '</span><br><span class="small muted">' + (S.role === 'client' ? 'Client' : isAdmin() ? 'Admin' : 'Team member') + '</span></div><a class="mi" href="/auth/logout">' + I('out') + '<span>Sign out</span></a></div>';
}

/* ---------- actions ---------- */
async function saveQuote(then, msg) {
  syncQuoteNew(); const d = S.drawer;
  const r = await api('q-save', { cid: d.id, client: { company: d.company || '', contact: d.contact || '', email: d.email || '', website: d.website || '' }, q: d.q, then }, { msg });
  if (!r) return; S.drawer = null; S.cid = r.out.cid; S.view = 'client'; S.ctab = then === 'accept' ? 'invoices' : 'quote';
}
const ACT = {
  noop() { toast('Not available yet.'); },
  print() { window.print(); return 'skip'; },
  nav(d) { S.view = d.v; S.menu = null; S.q = ''; },
  menu(d) { S.menu = S.menu === d.m ? null : d.m; },
  'seen-all'() { return api('seen', {}, { quiet: true }); },
  'note-open'(d) { S.menu = null; S.cid = d.cid; if (S.role === 'client') S.ptab = 'overview'; else { S.view = 'client'; S.ctab = 'activity'; } return api('seen', {}, { quiet: true }); },
  'open-client'(d) { S.cid = d.id; S.view = 'client'; S.ctab = 'overview'; S.q = ''; },
  'open-client-tab'(d) { S.cid = d.id; S.view = 'client'; S.ctab = d.t; S.q = ''; },
  'open-ws'(d) { pickClient(d); S.ws = d.id; S.wm = +d.m || 1; S.q = ''; if (S.role === 'client') { S.ptab = 'tasks'; S.pws = d.id; S.ptg = ''; } else S.view = 'ws'; },
  ctab(d) { S.ctab = d.t; }, ptab(d) { S.ptab = d.t; }, qtab(d) { S.qtab = d.t; }, ifilter(d) { S.ifilter = d.f; },
  ws(d) { S.ws = d.id; }, wm(d) { S.wm = +d.m; }, mode(d) { S.mode = d.m; },
  task(d) { pickClient(d); S.back = { view: S.view, ptab: S.ptab }; S.tid = d.id; S.confirm = null; S.q = ''; if (staff()) S.view = 'task'; else S.ptab = 'task'; const mn = document.querySelector('.main'); if (mn) mn.scrollTop = 0; window.scrollTo(0, 0); },
  'task-back'() { const b = S.back || {}; S.confirm = null; if (staff()) S.view = b.view && b.view !== 'task' ? b.view : 'mytasks'; else S.ptab = b.ptab && b.ptab !== 'task' ? b.ptab : 'tasks'; },
  'mt-scope'(d) { S.mtScope = d.s; }, 'mt-group'(d) { S.mtg = S.mtg === d.g ? '' : d.g; }, 'mt-filters'() { S.mtFilters = !S.mtFilters; }, 'mt-clear'() { S.mtClient = ''; S.mtg = ''; },
  'p-group'(d) { S.ptg = S.ptg === d.g ? '' : d.g; },
  'ws-toggle'(d) { S.wsOpen = S.wsOpen.includes(d.id) ? S.wsOpen.filter(x => x !== d.id) : [...S.wsOpen, d.id]; },
  'ws-all'(d) { S.wsOpen = d.v === '1' ? S.clients.map(c => c.id) : []; },
  'bill-toggle'(d) { S.billOpen = S.billOpen.includes(d.id) ? S.billOpen.filter(x => x !== d.id) : [...S.billOpen, d.id]; },
  'bill-all'(d) { S.billOpen = d.v === '1' ? S.clients.map(c => c.id) : []; },
  fold(d) { S.fOpen = S.fOpen.includes(d.k) ? S.fOpen.filter(x => x !== d.k) : [...S.fOpen, d.k]; },
  'fold-all'(d) { const c = S.clients.find(x => x.id === d.cid), keys = folderNames(c).map(f => c.id + '|' + f); S.fOpen = d.v === '1' ? [...new Set([...S.fOpen, ...keys])] : S.fOpen.filter(k => !keys.includes(k)); },
  'files-toggle'(d) { const k = 'f:' + d.id; S.wsOpen = S.wsOpen.includes(k) ? S.wsOpen.filter(x => x !== k) : [...S.wsOpen, k]; },
  close() { S.drawer = null; }, 'close-modal'() { S.modal = null; },
  doc(d) { S.modal = { kind: 'doc', type: d.type, m: d.type === 'adhoc' ? d.id : (+d.m || 1), cid: d.cid || S.cid }; },
  'task-new'() { S.drawer = { kind: 'newtask' }; },
  async 'task-create'() {
    const c = client(), s = ql(c, S.ws), title = val('nt-title'); if (!title) { toast('Give the task a name.'); return; }
    const r = await api('task-create', { svc: s.id, m: wsMonth(c, s), title, desc: val('nt-desc'), owner: val('nt-owner'), assignee: val('nt-as'), due: val('nt-due'), approve: document.getElementById('nt-appr').checked });
    if (r) S.drawer = null;
  },
  't-submit'(d) { return api('t-submit', { id: d.id }); },
  't-done'(d) { return api('t-done', { id: d.id }); },
  't-sent'(d) { return api('t-sent', { id: d.id }); },
  async 't-approve'(d) { const onPage = S.ptab === 'task'; const r = await api('t-approve', { id: d.id, text: val('cm-text') }); if (r && onPage) S.confirm = d.id; },
  't-comment'(d) { const x = val('cm-text'); if (!x) { toast('Write a comment first.'); return; } return api('t-comment', { id: d.id, text: x }); },
  't-changes'(d) { const x = val('cm-text'); if (!x) { toast('Write what you would like changed in the comment box first.'); return; } return api('t-changes', { id: d.id, text: x }); },
  'pick-file'() { toast('File uploads arrive with the Google Drive connection. For now, add a Google link.'); return 'skip'; },
  'link-open'(d) { S.modal = { kind: 'link', key: d.key, svc: S.ws }; },
  async 'link-add'() { const url = val('ln-url'); if (!/^https?:\/\/\S+$/.test(url)) { toast('Paste the full link, starting with https://'); return; } const r = await api('f-link', { key: S.modal.key, svc: S.modal.svc, url, name: val('ln-name') }); if (r) S.modal = null; },
  'save-details'() { return api('save-details', { company: val('d-company'), contact: val('d-contact'), phone: val('d-phone'), website: val('d-website'), email: val('d-email'), notes: val('d-notes') }); },
  'quote-open'(d) { openQuote(d.id); },
  'qd-preview'() { syncQuoteNew(); S.modal = { kind: 'doc', type: 'quote', m: 1, temp: draftQuoteClient() }; },
  'qd-save'() { return saveQuote('draft', 'Quotation saved as a draft.'); },
  'qd-send'() { return saveQuote('sent'); },
  'qd-accept'() { return saveQuote('accept'); },
  'qd-email'() { toast('Emailing quotations is not connected yet. Download the PDF from Preview, send it yourself, then use Mark as sent.'); return 'skip'; },
  'i-sent'(d) { return api('i-sent', { m: +d.m }, { cid: d.cid || S.cid }); },
  'i-paid'(d) { return api('i-paid', { m: +d.m }, { cid: d.cid || S.cid }); },
  'ah-sent'(d) { return api('ah-sent', { id: d.id }, { cid: d.cid || S.cid }); },
  'ah-paid'(d) { return api('ah-paid', { id: d.id }, { cid: d.cid || S.cid }); },
  renew(d) { return api('renew', {}, { cid: d.cid || S.cid }); },
  'ah-create'(d) { return api('ah-create', { sid: val('ah-svc'), name: val('ah-name'), amount: val('ah-amt') }, { cid: d.cid || S.cid }); },
  'inv-new'() { const ok = S.clients.filter(x => x.quote.status === 'accepted'); if (!ok.length) { toast('Accept a quotation first: invoices belong to a client with an accepted quotation.'); return; } S.drawer = { kind: 'invoice', draft: { cid: (ok.find(x => x.id === S.cid) || ok[0]).id } }; },
  async 'inv-create'() { const cid = val('ni-cid'); const r = await api('ah-create', { sid: val('ni-svc'), name: val('ni-name'), amount: val('ni-amt') }, { cid }); if (r) { S.drawer = null; S.billOpen = [...new Set([...S.billOpen, cid])]; } },
  'svc-new'() { S.drawer = { kind: 'svc', draft: { isNew: true, id: '', name: '', price: 0, billing: 'monthly', note: '', bullets: [], tasks: [['', 'gioia', true]] } }; },
  'svc-edit'(d) { S.drawer = { kind: 'svc', draft: clone(svc(d.id)) }; },
  'svc-row-add'() { syncSvc(); S.drawer.draft.tasks.push(['', 'gioia', true]); },
  'svc-row-del'(d) { syncSvc(); S.drawer.draft.tasks.splice(+d.i, 1); },
  async 'svc-save'() { syncSvc(); const d = S.drawer.draft; if (!d.name) { toast('Give the service a name.'); return; } const r = await api('svc-save', { svc: Object.assign({}, d, { id: d.isNew ? '' : d.id }) }, { msg: 'Service saved.' }); if (r) S.drawer = null; },
  async 'svc-delete'() { const r = await api('svc-delete', { id: S.drawer.draft.id }, { msg: 'Service removed from the catalogue.' }); if (r) S.drawer = null; },
  'team-add'() { const name = val('tm-name'); return api('team-add', { name, email: val('tm-email'), admin: val('tm-role') === '1' }, { msg: name + ' added. They can now sign in with that Google email.' }); },
  'team-del'(d) { return api('team-del', { id: d.id }, { msg: 'Team member removed.' }); },
  'brand-save'() { return api('brand-save', { brand: { mark: val('b-mark'), tagline: val('b-tagline'), company: val('b-company'), address: val('b-address'), terms: val('b-terms') } }, { msg: 'Settings saved.' }); },
  'fee-new'(d) { const c = S.clients.find(x => x.id === (d.cid || S.cid)) || S.clients[0]; if (!c) { toast('Add a client first.'); return; } S.drawer = { kind: 'fee', draft: { isNew: true, id: '', member: '', cid: c.id, svc: d.svc || '', m: +d.m || 1, amount: '', note: '', status: 'pending', repeat: false, type: 'fixed', pct: '', item: '' } }; },
  'fee-edit'(d) { const f = S.fees.find(x => x.id === d.id); S.drawer = { kind: 'fee', draft: Object.assign({ type: f.pct ? 'pct' : 'fixed', svc: f.svc || (f.item ? '__new' : '') }, f, { svc: f.item ? '__new' : f.svc }) }; },
  'fee-type'(d) { syncFee(); S.drawer.draft.type = d.t; },
  'fee-view'() { toast('If anything about this fee looks wrong, ask an admin.'); },
  async 'fee-save'() {
    syncFee(); const d = S.drawer.draft;
    const r = await api('fee-save', { fee: { id: d.isNew ? '' : d.id, member: d.member, cid: d.cid, svc: d.svc, item: d.item, m: d.m, type: d.type, pct: d.pct, amount: d.amount, note: d.note, repeat: d.repeat } }, { msg: d.isNew ? 'Fee assigned. Only they and the admins can see it.' : 'Fee updated.' });
    if (r) S.drawer = null;
  },
  async 'fee-paid'(d) { const r = await api('fee-paid', { id: d.id }, { msg: 'Marked as paid.' }); if (r) S.drawer = null; },
  async 'fee-unpaid'(d) { const r = await api('fee-unpaid', { id: d.id }, { msg: 'Marked as awaiting payment.' }); if (r) S.drawer = null; },
  async 'fee-del'(d) { const r = await api('fee-del', { id: d.id }, { msg: 'Fee deleted.' }); if (r) S.drawer = null; }
};
document.addEventListener('click', async e => {
  if (!D || !D.me) return;
  const el = e.target.closest('[data-a]');
  if (!el) { if (S.menu && !e.target.closest('.menu')) { S.menu = null; render(); } return; }
  const a = el.dataset.a;
  if (a === 'close-bg' || a === 'close-bg-modal') { if (e.target === el) { if (a === 'close-bg') S.drawer = null; else S.modal = null; render(); } return; }
  if (el.disabled || !ACT[a]) return;
  if (a !== 'menu' && !el.closest('.menu')) S.menu = null;
  const out = ACT[a](el.dataset);
  if (out === 'skip') return;
  render();
  if (out && out.then) { el.disabled = true; const v = await out; if (v !== 'skip') render(); }
});
document.addEventListener('input', e => { if (e.target.id === 'gsearch') { S.q = e.target.value; renderSearch(); } else if (e.target.dataset.mtq) { S.mtq = e.target.value; render(); } else if (e.target.dataset.acq) { S.acq = e.target.value; render(); } else if (e.target.dataset.afq) { S.afq = e.target.value; render(); } });
document.addEventListener('change', async e => {
  const d = e.target.dataset; if (!D || !D.me) return;
  if (d.ts) await api('t-status', { id: d.ts, status: e.target.value });
  else if (d.as) await api('t-assign', { id: d.as, assignee: e.target.value });
  else if (d.due) await api('t-due', { id: d.due, due: e.target.value });
  else if (d.desc) await api('t-desc', { id: d.desc, desc: e.target.value }, { msg: 'Description saved. The client sees it on the task.' });
  else if (d.te) await api('team-update', { id: d.te, email: e.target.value }, { msg: 'Email saved.' });
  else if (d.tn) await api('team-update', { id: d.tn, name: e.target.value }, { msg: 'Name saved.' });
  else if (d.mtclient) { S.mtClient = e.target.value; }
  else if (d.fe) { const x = S.drawer.draft; syncFee(); if (d.fe === 'repeat') x.repeat = e.target.checked; else if (!['amount', 'pct'].includes(d.fe)) x[d.fe] = e.target.value; if (d.fe === 'cid') { x.svc = ''; x.m = 1; } if (d.fe === 'svc') x.m = 1; if (d.fe === 'amount') return; }
  else if (d.acs !== undefined && e.target.dataset.acs) { S.acs = e.target.value; }
  else if (e.target.dataset.afs) { S.afs = e.target.value; }
  else if (d.pws) { S.pws = e.target.value; S.ptg = ''; }
  else if (d.qclient) { syncQuoteNew(); openQuote(e.target.value); }
  else if (d.qsvc) { syncQuoteNew(); const q = S.drawer.q; q.ids = e.target.checked ? [...q.ids, d.qsvc] : q.ids.filter(x => x !== d.qsvc); }
  else if (d.qf) { syncQuoteNew(); const q = S.drawer.q, k = d.qf; if (k === 'start') { if (e.target.value) q.start = e.target.value; } else { q[k] = Math.max(k === 'discount' ? 0 : 1, Math.floor(+e.target.value || 0)); if (k !== 'discount') q[k] = Math.min(q[k], 24); } if (q.committed > q.months) q.committed = q.months; }
  else return;
  render();
});
/* drag a card between columns (team only) */
document.addEventListener('dragstart', e => { const el = e.target.closest('[data-drag]'); if (!el) return; S.drag = el.dataset.drag; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', S.drag); } catch (x) {} });
document.addEventListener('dragover', e => { const col = e.target.closest('[data-col]'); if (!col || !S.drag) return; e.preventDefault(); document.querySelectorAll('.col.over').forEach(x => x !== col && x.classList.remove('over')); col.classList.add('over'); });
document.addEventListener('dragleave', e => { const col = e.target.closest('[data-col]'); if (col && !col.contains(e.relatedTarget)) col.classList.remove('over'); });
document.addEventListener('drop', async e => {
  const col = e.target.closest('[data-col]'); if (!col || !S.drag) return; e.preventDefault();
  const t = task(S.drag), to = col.dataset.col; S.drag = null;
  if (!t || COLS.find(x => x[0] === to)[2].includes(t.status)) return render();
  if (!statusOpts(t).includes(to)) { toast(t.owner === 'client' ? 'Items the client sends go from Pending action to Completed once received.' : 'That status does not apply: this task does not need client approval.'); return render(); }
  await api('t-status', { id: t.id, status: to }); render();
});
document.addEventListener('dragend', () => { S.drag = null; document.querySelectorAll('.col.over').forEach(x => x.classList.remove('over')); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && D && D.me) { if (S.modal) S.modal = null; else if (S.drawer) S.drawer = null; else S.menu = null; render(); } });
load();
