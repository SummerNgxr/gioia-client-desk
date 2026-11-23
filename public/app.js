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
  chev: '<path d="m9 6 6 6-6 6"/>', chevd: '<path d="m6 9 6 6 6-6"/>',
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
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17h.01"/>',
  refresh: '<path d="M19.5 9A8 8 0 0 0 5 7.5"/><path d="M4.5 4v4h4"/><path d="M4.5 15A8 8 0 0 0 19 16.5"/><path d="M19.5 20v-4h-4"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M4 20h16"/>',
  filter: '<path d="M4 5h16l-6 7.5V19l-4 1v-7.5z"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="2.6"/><path d="M3 7v4c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6V7"/><path d="M3 11v4c0 1.4 2.7 2.6 6 2.6 1 0 1.9-.1 2.7-.3"/><ellipse cx="16" cy="14" rx="5" ry="2.2"/><path d="M11 14v3.5c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V14"/>',
  hourglass: '<path d="M7 3h10M7 21h10"/><path d="M8 3c0 5 8 5 8 9s-8 4-8 9"/><path d="M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
  megaphone: '<path d="M4 10v4h3l8 5V5l-8 5z"/><path d="M18 9.5a3.5 3.5 0 0 1 0 5M7 14l1.5 5h2.5l-1-5"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12l2 2 4-4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  ul: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'
};
const logoImg = (tone, h) => '<img class="brandlogo" src="' + LOGO[tone] + '" alt="' + esc(S.brand.mark) + '" style="height:' + h + 'px">';
const I = (k, cls) => '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + P[k] + '</svg>';

/* ---------- statuses ---------- */
STATUS.progress = 'In progress'; STATUS.todo = 'Pending action'; STATUS.done = 'Completed';
const statusOpts = t => L.statusOptions(t);
const staged = t => L.staged(t), curStage = t => L.curStage(t);
const GROUPS = [['todo', 'Pending action', ['todo'], 'circle'], ['progress', 'In progress', ['progress', 'changes', 'submitted'], 'refresh'], ['client', 'Pending client', ['cdraft', 'creview'], 'user'], ['awaiting', 'Awaiting approval', ['awaiting'], 'clock'], ['approved', 'Approved', ['approved'], 'tick'], ['done', 'Completed', ['done'], 'tick']];
const groupOf = st => GROUPS.find(g => g[2].includes(st))[0];
/* the client's own wording: they are the client, so "pending client" reads as "your turn" */
const yourTurn = t => t.status !== 'done' && (staged(t) ? (curStage(t) || {}).owner === 'client' : ['cdraft', 'creview'].includes(t.status) || (t.owner === 'client' && ['todo', 'progress'].includes(t.status)));
const CSTATUS = { todo: 'Not started', progress: 'In progress', cdraft: 'My task', creview: 'My task: review', awaiting: 'Ready for approval', changes: 'Making your changes', approved: 'Approved', submitted: 'Received by Gioia', done: 'Completed' };
const cLabel = t => S.role !== 'client' ? '' : t.status === 'awaiting' ? CSTATUS.awaiting : yourTurn(t) ? (CSTATUS[t.status] && t.status.startsWith('c') ? CSTATUS[t.status] : 'My task') : CSTATUS[t.status] || '';
const CORDER = ['client', 'awaiting', 'todo', 'progress', 'approved', 'done'], cRank = t => S.role === 'client' ? CORDER.indexOf(tGroup(t)) : 0;
const tGroup = t => S.role === 'client' && yourTurn(t) && t.status !== 'awaiting' ? 'client' : groupOf(t.status);
const CGROUPS = { todo: 'Not started', progress: 'In progress', client: 'My tasks', awaiting: 'Ready for approval', approved: 'Approved', done: 'Completed' };
const SICON = { cdraft: 'doc', creview: 'user', todo: 'circle', progress: 'refresh', changes: 'refresh', submitted: 'upload', awaiting: 'clock', approved: 'tick', done: 'tick' };
const SVCI = { web: 'monitor', articles: 'doc', social: 'image', ads: 'chart' };
const svcIcon = sid => SVCI[String(sid).split('-x')[0]] || 'check';
function nextStep(t) {
  if (t.status === 'done') return null;
  if (staged(t)) { const s = curStage(t); if (!s) return null; return [(s.owner === 'client' ? 'Client' : 'Team') + ': ' + s.title, 'Step ' + (t.stage + 1) + ' of ' + t.stages.length + (s.kind === 'approve' ? ', needs approval' : '')]; }
  if (t.owner === 'client') return t.status === 'submitted' ? ['Team to mark as received', 'Once the team has what they need'] : ['Client to send', 'Waiting on client'];
  if (t.status === 'awaiting') return ['Client to review', 'The client approves or requests changes'];
  if (t.status === 'approved') return ['Team to mark task completed', 'Once all updates are finalised'];
  if (t.status === 'cdraft' || t.status === 'creview') return ['Client to ' + (t.status === 'cdraft' ? 'send their draft' : 'review'), 'Waiting on client'];
  return t.approve ? ['Team to submit for client review', 'When the work is ready'] : ['Team to mark task completed', 'When the work is complete'];
}
/* ---------- data (filled from the server) ---------- */
const S = {
  role: 'admin', me: '', view: 'clients', cid: '', ctab: 'overview', ws: null, wm: 1, mode: 'list', ifilter: 'all', qtab: 'invoices', ptab: 'overview',
  drawer: null, modal: null, menu: null, q: '', toast: null, drag: null, nextQuote: 0, tid: null, back: null, confirm: null, mtg: '', mtq: '', mtClient: '', mtScope: 'me', mtMode: (() => { try { return localStorage.getItem('mtMode') || 'simple'; } catch (e) { return 'simple'; } })(), mtFilters: false, pws: '', ptg: '',
  wsOpen: [], billOpen: [], fOpen: [], fees: [], acq: '', acs: '', afq: '', afs: '', init: false,
  brand: { mark: 'GIOIA' }, team: [], catalogue: [], clients: [], accounts: [], payouts: [], feed: [], showArchived: false, invFormat: '', templates: []
};
const acct = id => S.accounts.find(a => a.id === id);
const projectsOf = aid => S.clients.filter(c => c.aid === aid);
const pname = c => c ? (c.name || 'Project') : '';
const cname = c => c ? c.company + ' · ' + pname(c) : '';
const freeWs = s => L.freeWs(s);
const sm = n => money(n).replace('$', 'S$');
const svc = id => S.catalogue.find(s => s.id === id);
const client = () => S.clients.find(c => c.id === S.cid) || S.clients[0];
const member = id => S.team.find(m => m.id === id);
const isVendor = m => false; // vendors are now ordinary team members
const vendorMe = () => S.role !== 'client' && !!(D && D.me && D.me.vendor);
const vlabel = m => esc(m.name) + (m.company && m.company !== m.name ? ' · ' + esc(m.company) : '');
/* one assignee list: the team first, then vendors */
function teamOpts(sel, adminTag, only) {
  const o = m => '<option value="' + m.id + '"' + (sel === m.id ? ' selected' : '') + '>' + vlabel(m) + (adminTag && m.admin ? ' (admin)' : '') + '</option>', t = S.team.filter(m => !isVendor(m)), v = S.team.filter(isVendor);
  if (only) return (only === 'vendor' ? v : t).map(o).join('') || '<option value="" disabled>' + (only === 'vendor' ? 'No vendors yet. Add them under Team.' : 'No team members') + '</option>';
  return v.length ? '<optgroup label="Team">' + t.map(o).join('') + '</optgroup><optgroup label="Vendors">' + v.map(o).join('') + '</optgroup>' : t.map(o).join('');
}
const viewer = () => S.role === 'client' ? 'client' : S.me;
const isAdmin = () => S.role === 'admin' && !!member(S.me) && !!member(S.me).admin;
const staff = () => S.role !== 'client';
const actor = () => S.role === 'client' ? 'Client' : (member(S.me) || {}).name || '';
const canRead = () => true;
const feedKey = e => (String(e.at || '') + '|' + String(e.text || '').slice(0, 60)).trim();
const unreadFor = e => !!D && e.by !== D.me.key && e.at > (D.seen || '') && !(D.read || []).includes(feedKey(e));
const fmtAt = v => { if (!v) return ''; if (/^\d{4}-\d{2}-\d{2}T/.test(v)) { const d = new Date(v); return d.toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return dshort(v); return esc(v); };

/* ---------- view helpers ---------- */
const TONE = { declined: 'crit', cancelled: 'lock', void: 'lock', owed: 'gold', upcoming: 'lock', cdraft: 'info', creview: 'info', pending: '', sent: 'info', paid: 'ok', partial: 'gold', accepted: 'ok', locked: 'lock', todo: '', progress: 'warn', awaiting: 'gold', changes: 'crit', approved: 'ok', submitted: 'info', done: 'ok' };
const pill = (k, label) => '<span class="pill ' + TONE[k] + '">' + (SICON[k] ? I(SICON[k], 'sm') : '') + (label || STATUS[k]) + '</span>';
const btn = (label, a, data, cls, dis) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '" ' + Object.entries(data || {}).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + (dis ? ' disabled' : '') + '>' + label + '</button>';
const field = (id, label, v, type, req) => '<div class="field"><label for="' + id + '">' + label + (req ? ' <span class="req">*</span>' : '') + '</label>' + (type === 'area' ? '<textarea id="' + id + '">' + esc(v) + '</textarea>' : '<input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(v) + '">') + '</div>';
const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
/* a company tile: its logo if one was uploaded, otherwise its initials */
const logoTile = (company, logo, style) => '<span class="tilelogo' + (logo ? ' haslogo' : '') + '"' + (style ? ' style="' + style + '"' : '') + '>' + (logo ? '<img src="' + esc(logo) + '" alt="' + esc(company) + ' logo">' : esc(initials(company))) + '</span>';
const picImg = (src, name) => src ? '<img src="' + esc(src) + '" alt="" referrerpolicy="no-referrer" loading="lazy">' : esc(initials(name || '?'));
const avatar = (id, cls) => { const m = member(id); if (m && m.pic) return '<span class="av pic ' + (cls || '') + '" title="' + esc(m.name) + '">' + picImg(m.pic, m.name) + '</span>'; return '<span class="av ' + (cls || '') + '" title="' + esc(m ? m.name : 'Unassigned') + '">' + (m ? initials(m.name) : '–') + '</span>'; };
const dueHtml = t => t.due ? '<span class="due ' + (t.due < TODAY && t.status !== 'done' ? 'late' : '') + '">' + I('cal', 'sm') + 'Due ' + dshort(t.due) + '</span>' : '';
const fileKind = f => f.kind || (f.url ? 'lnk' : /\.pdf$/i.test(f.name) ? 'pdf' : /\.(png|jpe?g|gif|webp|fig|svg)$/i.test(f.name) ? 'img' : 'doc');
const canDelFile = f => isAdmin() || (S.role === 'client' ? f.by === 'Client' : f.by === (member(S.me) || {}).name);
const fileOwner = f => S.clients.find(c => c.files.some(x => L.fkey(x) === L.fkey(f)));
const fileRow = f => { const k = fileKind(f); return '<div class="file"><span class="ft ' + k + '">' + (k === 'lnk' ? I('link', 'sm') : k.toUpperCase()) + '</span><div><b>' + (f.url ? '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a>' : esc(f.name)) + '</b><span class="small muted">' + (f.size ? esc(f.size) + ' · ' : '') + esc(f.by) + ' · ' + fmtAt(f.at) + '</span></div>' + (f.drive ? '<a class="dl" href="' + esc(f.url) + '?dl=1" aria-label="Download">' + I('download', 'sm') + '</a>' : f.url ? '<a class="dl" href="' + esc(f.url) + '" target="_blank" rel="noopener" aria-label="Open link">' + I('ext', 'sm') + '</a>' : '<button class="dl" data-a="noop" aria-label="Download">' + I('download', 'sm') + '</button>') + (canDelFile(f) && fileOwner(f) ? '<button class="dl fdel" data-a="file-del-open" data-k="' + esc(L.fkey(f)) + '" data-cid="' + fileOwner(f).id + '" aria-label="Delete ' + esc(f.name) + '" title="Delete">' + I('x', 'sm') + '</button>' : '') + '</div>'; };
const amountsVisible = () => isAdmin() || S.role === 'client';
function wsList(c) { const all = [...c.extra.filter(s => s.billing === 'prep'), ...c.quote.lines, ...L.renewLines(c), ...c.extra.filter(s => s.billing !== 'prep')]; return vendorMe() ? all.filter(s => c.tasks.some(t => t.svc === s.id)) : all; }
function wsTasks(c, sid, m) { return c.tasks.filter(t => t.svc === sid && t.m === m); }
function wsMonth(c, s) { return s.adhoc || freeWs(s) ? 0 : s.billing === 'monthly' ? Math.min(S.wm, c.quote.months) : 1; }
function wsInvoice(c, s, m) { return freeWs(s) ? null : s.adhoc ? adhocOf(c, s.adhoc) : inv(c, m); }
const wsOpenFor = (c, s, m) => s.billing === 'general' || (s.billing === 'prep' ? c.prep === 'open' : (wsInvoice(c, s, m) || {}).status === 'paid');
function currentMonth(c) { let m = 1; c.invoices.forEach(i => { if (i.status === 'paid') m = Math.max(m, i.m); }); return m; }
const needsTeam = t => ['changes', 'approved', 'submitted'].includes(t.status);
const canSee = (c, t) => taskOpen(c, t);
const needsClient = t => ['cdraft', 'creview', 'awaiting'].includes(t.status);

/* ---------- task card and board ---------- */
const COLS = GROUPS;
function tags(t) {
  const out = [];
  if (staged(t) && t.stage < t.stages.length) { const st = curStage(t); out.push('<span class="chip' + (st.owner === 'client' ? ' client' : '') + '">Step ' + (t.stage + 1) + ' of ' + t.stages.length + ' · ' + (st.owner === 'client' ? 'Client' : 'Team') + '</span>'); }
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
  return '<div class="tcard k-' + t.status + '" data-a="task" data-id="' + t.id + '"' + (staff() ? ' draggable="true" data-drag="' + t.id + '"' : '') + '><div class="ttl"><span class="box ' + (t.status === 'done' ? 'on' : '') + '">' + (t.status === 'done' ? I('tick', 'sm') : '') + '</span><span>' + esc(t.title) + '</span></div>' + tags(t) + (staged(t) ? '<div class="bar"><i style="width:' + Math.round(t.stage / t.stages.length * 100) + '%"></i></div>' : '') +
    '<div class="tfoot"><span class="who">' + (t.owner === 'client' ? '<span class="av' + (client().pic ? ' pic' : '') + '">' + (client().pic ? picImg(client().pic, client().contact) : initials(client().contact || 'C')) + '</span><span>' + esc(client().contact || 'Client') + '</span>' : avatar(t.assignee) + '<span>' + esc(m ? m.name : 'Unassigned') + '</span>') + '</span>' + dueHtml(t) + '</div></div>';
}
function boardHtml(list) {
  return '<div class="board">' + COLS.map(([k, label, sts]) => { const items = list.filter(t => sts.includes(t.status)); return '<div class="col c-' + k + '" data-col="' + k + '"><div class="colhead">' + label + ' <span class="count">' + items.length + '</span></div>' + (items.map(card).join('') || '<p class="small muted" style="padding:4px">Nothing here</p>') + '</div>'; }).join('') + '</div>';
}
function listHtml(list) {
  // the team can change assignee, due date and status straight from the list; clicking anywhere else opens the task
  const ed = staff() && !vendorMe();
  return '<div class="card" style="padding:0"><div class="listrow small muted" style="cursor:default;font-weight:600"><span>Task</span><span>Assigned to</span><span>Due</span><span>Status</span></div>' + list.map(t => { const m = member(t.assignee), opts = statusOpts(t);
    const who = staged(t) ? (curStage(t) ? stepAv(client(), curStage(t)) : '<span class="small muted">' + I('tick', 'sm') + ' Done</span>') : ed ? '<span class="avpick" title="Change who it is assigned to">' + (t.owner === 'client' ? whoAv(client(), t) : avatar(t.assignee)) + I('chevd', 'sm') + '<select class="inl" data-lass="' + t.id + '" aria-label="Assigned to"><option value="@client"' + (t.owner === 'client' ? ' selected' : '') + '>Client</option><option value=""' + (t.owner !== 'client' && !t.assignee ? ' selected' : '') + '>Team · unassigned</option>' + teamOpts(t.owner === 'client' ? '' : t.assignee) + '</select></span>' : t.owner === 'client' ? '<span class="chip client">Client</span>' : ed ? '<span class="row" style="gap:6px;flex-wrap:nowrap">' + avatar(t.assignee) + '<select class="inl" data-lass="' + t.id + '" aria-label="Assigned to"><option value="">Unassigned</option>' + teamOpts(t.assignee) + '</select></span>' : avatar(t.assignee) + '<span>' + esc(m ? m.name : 'Unassigned') + '</span>';
    const due = ed ? '<input class="inl' + (t.due ? '' : ' empty') + '" type="date" data-ldue="' + t.id + '" value="' + esc(t.due || '') + '" aria-label="Due date">' : (dueHtml(t) || '<span class="muted">No date</span>');
    const st = !taskOpen(client(), t) ? pill('locked', 'Locked') : ed && !staged(t) && opts.length > 1 ? '<select class="inl pill ' + (TONE[t.status] || '') + '" data-lst="' + t.id + '" aria-label="Status">' + opts.map(k => '<option value="' + k + '"' + (k === t.status ? ' selected' : '') + '>' + esc(STATUS[k]) + '</option>').join('') + '</select>' : pill(t.status, cLabel(t)) + (staged(t) && curStage(t) ? '<div class="small muted" style="margin-top:3px">Step ' + (t.stage + 1) + ' of ' + t.stages.length + '</div>' : '');
    return '<div class="listrow' + (ed ? ' canmove' : '') + '" data-a="task" data-id="' + t.id + '"' + (ed ? ' draggable="true" data-ldrag="' + t.id + '"' : '') + '><span class="ttl">' + (ed ? '<span class="grip" title="Drag to reorder" aria-hidden="true">' + I('grip', 'sm') + '</span>' : '') + '<span class="box ' + (t.status === 'done' ? 'on' : '') + '">' + (t.status === 'done' ? I('tick', 'sm') : '') + '</span><span>' + esc(t.title) + '</span></span><span class="who small">' + who + '</span><span class="small">' + due + '</span><span>' + st + '</span></div>'; }).join('') + '</div>';
}

/* terms: plain text, with headings ("1. FEES AND PAYMENT") and clause numbers ("1.1") in bold */
function termsHtml(t) {
  return esc(t || '').split('\n').map(l => /^\s*(\d+\.\s+)?[A-Z][A-Z0-9 &,'\-\/()]{2,}$/.test(l) ? '<b class="th">' + l + '</b>' : l.replace(/^(\s*\d+\.\d+[a-z]?)(\s)/, '<b>$1</b>$2')).join('\n');
}
/* ---------- deliverable page ---------- */
function workspacePage(c) {
  const s = ql(c, S.ws); if (!s) { S.view = 'client'; S.ctab = 'work'; return clientPage(c); }
  const monthly = s.billing === 'monthly' && !s.adhoc, m = wsMonth(c, s), i = wsInvoice(c, s, m), list = wsTasks(c, s.id, m);
  const open = wsOpenFor(c, s, m), done = list.filter(t => t.status === 'done').length;
  const invCard = i ? '<div class="mini">' + I('doc') + '<div><div class="eyebrow">Invoice</div><b class="num">' + esc(i.no) + '</b></div>' + pill(invLocked(c, m) && !s.adhoc ? 'locked' : i.status) + '</div>' : '';
  const dueCard = '<div class="mini">' + I('cal') + '<div><div class="eyebrow">' + (monthly ? 'Month ends' : freeWs(s) ? 'Deliverable' : 'Period') + '</div><b>' + (monthly ? dlong(lastDay(c, m)) : s.billing === 'prep' ? 'Before ' + mName(c, 1) : s.billing === 'general' ? 'Ad-hoc tasks' : s.adhoc ? 'Added service' : mName(c, 1)) + '</b></div></div>';
  let body;
  const addBtn = staff() ? btn(I('plus', 'sm') + (freeWs(s) ? 'Add task' : 'Add ad-hoc task'), 'task-new', { cid: c.id, svc: s.id, m: m }) : '';
  const lockedEdit = !open && isAdmin() && s.billing !== 'prep';
  if (lockedEdit) body = '<div class="lockbox" style="padding:14px 18px;text-align:left"><b>' + I('lock', 'sm') + ' ' + (s.adhoc ? 'This added service' : mName(c, m)) + ' is still locked for the client and team.</b> ' + (invLocked(c, m) && !s.adhoc ? 'It starts once both parties confirm the renewal.' : 'It unlocks when invoice ' + esc(i.no) + ' is marked as paid.') + ' You can plan it now: rename, reorder, add or delete tasks, and set assignees, steps and due dates. Work on it starts once it unlocks.</div>' +
    '<div class="row between"><div class="row"><h2>Tasks</h2><span class="muted small">' + list.length + ' planned</span></div><div class="row">' + addBtn + '</div></div>' + listHtml(list);
  else if (!open) body = (staff() && s.billing !== 'prep' ? '<div class="row between"><h2>Tasks</h2>' + addBtn + '</div>' : '') + (s.billing === 'prep' ? '<div class="lockbox"><h2>Preparation is not unlocked yet</h2><p>' + (isAdmin() ? '<span class="row" style="justify-content:center">' + btn('Start preparation', 'prep-start', { cid: c.id }) + btn(I('list', 'sm') + 'Use a template', 'ptapply-open', { cid: c.id }, 'ghost') + '</span>' : 'It opens when set-up work begins.') + '</p></div>' : '<div class="lockbox"><h2>' + (s.adhoc ? 'This added service' : mName(c, m)) + ' is locked</h2><p>' + (invLocked(c, m) && !s.adhoc ? 'Months ' + (c.quote.committed + 1) + ' to ' + c.quote.months + ' start once both parties confirm the renewal.' : 'It unlocks when invoice ' + esc(i.no) + (amountsVisible() ? ' (' + money(s.adhoc ? i.amount : invTotal(c, m)) + ')' : '') + ' is marked as paid.') + '</p><p class="small">' + list.length + ' tasks are queued.' + (staff() ? ' You can still add tasks to this month: they unlock with it.' : '') + '</p></div>');
  else body = '<div class="row between"><div class="row"><h2>Tasks</h2><span class="muted small">' + done + ' of ' + list.length + ' completed</span></div><div class="row"><div class="seg">' + '<button data-a="mode" data-m="board" aria-pressed="' + (S.mode === 'board') + '">' + I('board', 'sm') + 'Board</button><button data-a="mode" data-m="list" aria-pressed="' + (S.mode === 'list') + '">' + I('list', 'sm') + 'List</button></div>' + addBtn + '</div></div>' + (isAdmin() && s.billing === 'prep' ? '<div class="row" style="gap:8px">' + btn(I('list', 'sm') + 'Add from a template', 'ptapply-open', { cid: c.id }, 'ghost') + (list.length ? btn('Save as template', 'ptsave-open', { cid: c.id }, 'quiet') : '') + '</div>' : '') + (S.mode === 'board' ? boardHtml(list) : listHtml(list)) + (staff() && S.mode === 'board' ? '<p class="small muted">Drag a card to another column to change its status, or open it for details.</p>' : '');
  const files = c.files.filter(f => f.folder === short(s));
  const filesPanel = '<aside class="card stack"><div class="row between"><h2 class="row" style="gap:8px">' + I('folder') + 'Files</h2><span class="small muted">' + files.length + '</span></div>' + btn(I('upload', 'sm') + 'Upload file', 'pick-file', { key: 'ws' }, 'block') + '<input type="file" id="up-ws" data-up="ws" multiple hidden>' + btn(I('link', 'sm') + 'Add Google link', 'link-open', { key: 'ws' }, 'ghost block') + '<div class="files">' + (files.map(fileRow).join('') || '<p class="small muted">No files yet. Files added to tasks in this deliverable also appear here.</p>') + '</div><p class="small muted">Saved to Drive: Clients / ' + esc(c.company) + ' / ' + esc(pname(c)) + ' / ' + esc(short(s)) + '</p></aside>' + wsFeesPanel(c, s, m);
  return '<div class="crumbs"><button data-a="nav" data-v="clients">Clients</button>' + I('chev', 'sm') + '<button data-a="open-client-tab" data-id="' + c.id + '" data-t="work" class="crumbco" title="' + esc(cname(c)) + '">' + logoTile(c.company, c.logo, 'width:22px;height:22px;font-size:9px;border-radius:5px') + esc(pname(c)) + '</button>' + I('chev', 'sm') + '<b>' + esc(short(s)) + '</b></div>' +
    '<div class="head" style="border:0"><div class="stack" style="gap:6px;max-width:640px"><h1>' + esc(short(s)) + (s.adhoc ? ' <span class="chip">Added service</span>' : s.billing === 'prep' ? ' <span class="chip">Before the first month</span>' : '') + '</h1><p class="muted" style="margin:0">' + esc(s.bullets.join('. ')) + '</p></div><div class="row">' + dueCard + invCard + '</div></div>' +
    (monthly ? '<div class="tabs" style="border-bottom:1px solid var(--line)">' + Array.from({ length: c.quote.months }, (_, k) => k + 1).map(x => { const st = inv(c, x).status; return '<button data-a="wm" data-m="' + x + '" aria-selected="' + (x === m) + '">' + MONTHS[ym(c, x).mo].slice(0, 3) + ' ' + String(ym(c, x).y).slice(2) + (st === 'paid' ? '' : ' 🔒') + '</button>'; }).join('') + '</div>' : '') +
    '<div class="wsgrid"><section class="stack">' + body + '</section><div class="stack">' + filesPanel + '</div></div>';
}

/* ---------- client pages ---------- */
function projectSwitch(c) {
  const ps = projectsOf(c.aid);
  return '<label class="pswitch">' + I('layers', 'sm') + '<select data-pswitch="1" aria-label="Project">' + ps.map(x => '<option value="' + x.id + '"' + (x.id === c.id ? ' selected' : '') + '>' + esc(pname(x)) + ' · ' + esc(STATUS[x.quote.status]) + '</option>').join('') + '</select></label>';
}
function clientHeader(c, tabs, cur, act) {
  const a = acct(c.aid) || {};
  return '<div class="head chead"><div class="row" style="gap:16px">' + (isAdmin() ? '<button class="logobtn" data-a="logo-open" data-cid="' + c.id + '" title="' + (c.logo ? 'Change' : 'Add') + ' the company logo">' + logoTile(c.company, c.logo) + '<span class="logoedit">' + I('upload', 'sm') + '</span></button>' : logoTile(c.company, c.logo)) + '<div class="stack" style="gap:6px"><h1>' + esc(c.company) + (a.archived ? ' <span class="chip">Archived</span>' : '') + '</h1><div class="row" style="gap:8px">' + projectSwitch(c) + (isAdmin() ? btn(I('plus', 'sm') + 'New project', 'wz-new', { aid: c.aid }, 'quiet') : '') + (isAdmin() && c.email ? '<button class="avbtn" data-a="pic-for" data-e="' + esc(c.email) + '" data-n="' + esc(c.contact || c.company) + '" data-p="' + esc(c.pic || '') + '" title="Change ' + esc(c.contact || 'the client') + '\'s photo"><span class="av' + (c.pic ? ' pic' : ' cl') + '">' + (c.pic ? picImg(c.pic, c.contact) : esc(initials(c.contact || c.company))) + '</span></button>' : '') + '<span class="small muted">' + esc(c.contact) + (c.website ? ' · ' + esc(c.website) : '') + '</span></div></div></div><nav class="tabs" role="tablist">' + tabs.map(([k, l]) => '<button role="tab" data-a="' + act + '" data-t="' + k + '" aria-selected="' + (cur === k) + '">' + l + '</button>').join('') + '</nav></div>';
}
/* every committed month at a glance: paid months are unlocked, the rest show a lock until their invoice is paid */
/* plain-words summary of the reminder settings, for Settings */
function remindSummary(r) {
  if (!r) return '';
  const hr = (r.hour % 12 || 12) + (r.hour < 12 ? 'am' : 'pm'), wd = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][r.weekday], bits = [];
  if (r.team) bits.push('team members get tasks due ' + (r.teamBefore === 1 ? 'tomorrow' : 'in ' + r.teamBefore + ' days') + ' and overdue ones' + (r.overdueEvery ? ' (repeated every ' + (r.overdueEvery === 1 ? 'day' : r.overdueEvery + ' days') + ')' : ''));
  if (r.client) bits.push('clients get a nudge when work has waited ' + r.clientAfter + ' day' + (r.clientAfter === 1 ? '' : 's') + (r.invBefore || r.invOnDue ? ', and invoice reminders ' + [r.invBefore ? r.invBefore + ' day' + (r.invBefore === 1 ? '' : 's') + ' before' : '', r.invOnDue ? 'on the due date' : ''].filter(Boolean).join(' and ') : ''));
  if (r.admin) bits.push('you get a ' + wd + ' summary');
  return 'Every day after ' + hr + ': ' + (bits.join('; ') || 'nothing is set to be sent') + '.';
}
/* client overview: one line on how the work is going and what unlocks next, instead of repeating the deliverable cards */
function glanceCard(c) {
  const cur = currentMonth(c), open = c.tasks.filter(t => canSee(c, t)), done = open.filter(t => t.status === 'done').length, pct = open.length ? Math.round(done / open.length * 100) : 0;
  const next = c.invoices.find(i => i.status !== 'paid' && !invLocked(c, i.m)), months = c.quote.months, paidN = c.invoices.filter(i => i.status === 'paid').length;
  return '<div class="card stack" style="gap:10px"><div class="row between"><h2 style="margin:0">At a glance</h2>' + btn(I('layers', 'sm') + 'See deliverables', 'ptab', { t: 'workspaces' }, 'ghost') + '</div>' +
    '<div class="bar"><i style="width:' + pct + '%"></i></div><span class="small"><b>' + done + ' of ' + open.length + '</b> unlocked tasks completed · ' + paidN + ' of ' + months + ' month' + (months === 1 ? '' : 's') + ' unlocked</span>' +
    (next ? '<span class="small muted">' + I('lock', 'sm') + ' Next to unlock: <b>' + esc(mName(c, next.m)) + '</b>, once invoice ' + esc(next.no) + ' (' + money(invTotal(c, next.m)) + ', due ' + esc(due(c, next.m)) + ') is paid. <button class="link" data-a="ptab" data-t="invoices">View invoices</button></span>' : '') + '</div>';
}
function monthStrip(c, cur) {
  return '<span class="mstrip" aria-label="Months of the contract">' + Array.from({ length: c.quote.months }, (_, k) => k + 1).map(x => { const paid = inv(c, x).status === 'paid'; return '<span class="' + (paid ? 'ok' : 'lk') + (x === cur ? ' cur' : '') + '" title="' + MONTHS[ym(c, x).mo] + ' ' + ym(c, x).y + (paid ? ': unlocked' : ': unlocks when its invoice is paid') + '">' + MONTHS[ym(c, x).mo].slice(0, 3) + (paid ? '' : ' 🔒') + '</span>'; }).join('') + '</span>';
}
/* a deliverable's state, checked in this order: completed, overdue, action required, behind schedule, on track */
function wsStatus(c, s, m, list) {
  if (list.length && list.every(t => t.status === 'done')) return pill('done', 'Completed');
  const late = list.filter(t => t.status !== 'done' && t.due && t.due < TODAY).length;
  if (late) return '<span class="pill crit">' + I('clock', 'sm') + 'Overdue (' + late + ')</span>';
  // the same state for everyone; the person who needs to act reads "Action required"
  const onClient = list.filter(needsClient).length, onTeam = list.filter(needsTeam).length;
  if (staff() && onTeam) return '<span class="pill warn">' + I('bell', 'sm') + 'Action required (' + onTeam + ')</span>';
  if (onClient) return '<span class="pill warn">' + I(staff() ? 'user' : 'bell', 'sm') + (staff() ? 'Waiting on client (' : 'Action required (') + onClient + ')</span>';
  if (s.billing === 'monthly' && m && list.length) { const end = lastDay(c, m), left = Math.round((Date.parse(end) - Date.parse(TODAY)) / 864e5), done = list.filter(t => t.status === 'done').length;
    if (left >= 0 && left < 7 && done / list.length < 0.5) return '<span class="pill gold">' + I('hourglass', 'sm') + 'Behind schedule</span>'; }
  return pill('approved', 'On track');
}
/* deliverables: one-off and preparation work first, then the monthly services for the month picked in the strip */
function wsCards(c) {
  const all = wsList(c), isMonthly = s => s.billing === 'monthly' && !s.adhoc && !freeWs(s);
  const one = all.filter(s => !isMonthly(s) && (s.billing !== 'prep' || c.prep === 'open')), rec = all.filter(isMonthly);
  const months = c.quote.months || 0, cur = Math.min(Math.max(1, S.dm && S.dmc === c.id ? S.dm : currentMonth(c)), Math.max(1, months));
  const row = (s, m, tag) => { const list = wsTasks(c, s.id, m).filter(t => staff() || canSee(c, t)), ok = wsOpenFor(c, s, m), d = list.filter(t => t.status === 'done').length, p = list.length ? Math.round(d / list.length * 100) : 0;
    const st = !ok ? pill('locked', s.billing === 'prep' ? 'Not started' : 'Locked') : !list.length ? pill('upcoming', 'No tasks yet') : d === list.length ? pill('done', 'Completed') : wsStatus(c, s, m, list);
    return '<button class="dvrow" data-a="open-ws" data-cid="' + c.id + '" data-id="' + esc(s.id) + '" data-m="' + (m || 1) + '"><span class="dvname"><b>' + esc(short(s)) + '</b>' + (tag ? '<span class="chip dvtag">' + tag + '</span>' : '') + '</span><span class="dvst">' + st + '</span><span class="small dvcount">' + (!ok && !staff() ? 'Unlocks when paid' : d + ' of ' + list.length + ' tasks complete') + '</span><span class="obar sm"><i style="width:' + p + '%"></i></span>' + I('chev') + '</button>'; };
  const tagOf = s => s.billing === 'prep' ? '' : s.billing === 'general' ? 'Ad-hoc' : s.adhoc ? 'Added service' : 'One-off';
  const prepNotStarted = isAdmin() && c.prep !== 'open' && c.quote.lines.length && c.quote.status !== 'cancelled' ? '<div class="dvrow" style="cursor:default"><span class="dvname"><b>Preparation</b><span class="chip dvtag">Before ' + mName(c, 1) + '</span></span><span class="dvst">' + pill('upcoming', 'Not started') + '</span><span class="row" style="gap:6px;grid-column:span 3;justify-content:flex-end">' + btn(I('plus', 'sm') + 'Start preparation', 'prep-start', { cid: c.id }, 'ghost') + btn(I('list', 'sm') + 'Use a template', 'ptapply-open', { cid: c.id }, 'quiet') + '</span></div>' : '';
  const sec1 = one.length || prepNotStarted ? '<section class="stack" style="gap:4px"><h2 class="dvh">Preparation &amp; One-off</h2><p class="muted small" style="margin:0 0 8px">Set-up and one-off deliverables, not tied to a month.</p><div class="dvlist">' + prepNotStarted + one.map(s => row(s, s.adhoc || freeWs(s) ? 0 : 1, tagOf(s))).join('') + '</div></section>' : '';
  const strip = months > 1 ? '<div class="dvstrip" role="tablist" aria-label="Month">' + Array.from({ length: months }, (_, k) => k + 1).map(x => { const iv = inv(c, x), lk = !iv || (iv.status !== 'paid' && !L.covered(c, x)), mo = MONTHS[ym(c, x).mo]; return '<button role="tab" data-a="dv-month" data-cid="' + c.id + '" data-m="' + x + '" aria-selected="' + (x === cur) + '" title="' + mo + ' ' + ym(c, x).y + (lk ? ': unlocks when its invoice is paid' : '') + '">' + (x === cur ? mo : mo.slice(0, 3)) + (lk ? ' ' + I('lock', 'sm') : '') + '</button>'; }).join('') + '</div>' : '';
  const sec2 = rec.length ? '<section class="stack" style="gap:4px"><div class="row between" style="align-items:flex-end;gap:16px"><div><h2 class="dvh">Recurring services</h2><p class="muted small" style="margin:0 0 8px">Monthly deliverables. Pick a month to see and manage its tasks.</p></div>' + strip + '</div><div class="dvlist">' + rec.map(s => row(s, cur, mName(c, cur))).join('') + '</div></section>' : '';
  return '<div class="stack" style="gap:30px">' + (sec1 + sec2 || '<div class="card"><p class="muted" style="margin:0">Deliverables appear once the quotation is accepted.</p></div>') + '</div>';
}
/* the project overview: progress at a glance and each deliverable on the left; what needs attention and the latest activity on the right */
const wsIcon = s => { const n = (s.name + ' ' + (s.billing || '')).toLowerCase(); return s.billing === 'prep' ? 'clipboard' : /article|blog|copywrit|editing/.test(n) ? 'doc' : /advert|\bads?\b|campaign|paid media/.test(n) ? 'chart' : /social|instagram|facebook|tiktok|posting/.test(n) ? 'megaphone' : /web|site|seo|optimi/.test(n) ? 'globe' : /photo|video|shoot/.test(n) ? 'camera' : 'layers'; };
function agoText(v) { if (!v) return ''; const d = new Date(v), mins = Math.round((Date.now() - d) / 60000); if (mins < 1) return 'Just now'; if (mins < 60) return mins + 'm ago'; const h = Math.round(mins / 60); if (h < 24 && new Date().toDateString() === d.toDateString()) return h + 'h ago'; const y = new Date(); y.setDate(y.getDate() - 1); if (y.toDateString() === d.toDateString()) return 'Yesterday'; return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); }
const feedIcon = t => /payment|paid|invoice|deposit|fee/i.test(t) ? 'coins' : /upload|file|added .*link|google link/i.test(t) ? 'upload' : /complet|approv|received|done/i.test(t) ? 'tick' : /comment|replied|question/i.test(t) ? 'chat' : 'doc';
/* the client's overview: what needs them, how the project is going, and the latest updates */
function clientOverview(c, open, awaiting, tosend) {
  const svcOf = id => ql(c, id) || (id === 'prep' ? { name: 'Preparation', billing: 'prep' } : id === 'general' ? { name: 'Other tasks', billing: 'general' } : { name: 'Tasks' });
  const item = (ic, title, sub, b) => '<div class="carow"><span class="oico">' + I(ic) + '</span><span class="cat"><b>' + esc(title) + '</b><span class="small muted">' + esc(sub) + '</span></span>' + b + '</div>';
  const items = awaiting.map(t => item(wsIcon(svcOf(t.svc)), t.title, short(svcOf(t.svc)) + ' · ready for your approval', btn('Review', 'task', { id: t.id, cid: c.id })));
  // tasks due soon: the client's own tasks (to send or check), overdue or due in the next two weeks
  const dueOf = t => { const cs = L.staged(t) && L.curStage(t); return (cs && cs.due) || t.due || ''; }, soon = new Date(Date.now() + 3 * 864e5 + 8 * 3600e3).toISOString().slice(0, 10);
  const dated = tosend.filter(t => dueOf(t) && dueOf(t) <= soon).sort((a, b) => dueOf(a).localeCompare(dueOf(b))), dueList = dated, rest = tosend.length - dueList.length;
  const dueTxt = d => !d ? 'No due date yet' : d < TODAY ? 'Overdue · was due ' + dshort(d) : d === TODAY ? 'Due today' : 'Due ' + dlong(d).replace(/, \d{4}$/, '');
  const dueItems = dueList.map(t => '<div class="carow"><span class="oico' + (dueOf(t) && dueOf(t) < TODAY ? ' gold' : '') + '">' + I(wsIcon(svcOf(t.svc))) + '</span><span class="cat"><b>' + esc(t.title) + '</b><span class="small ' + (dueOf(t) && dueOf(t) < TODAY ? 'goldtxt' : 'muted') + '">' + esc(short(svcOf(t.svc))) + ' · ' + dueTxt(dueOf(t)) + '</span></span>' + btn('Open', 'task', { id: t.id, cid: c.id }, 'ghost') + '</div>');
  const done = open.filter(t => t.status === 'done').length, pct = open.length ? Math.round(done / open.length * 100) : 0;
  const ws = wsList(c).filter(s => s.billing !== 'prep' || c.prep === 'open').map(s => { const m = s.adhoc || freeWs(s) ? 0 : s.billing === 'monthly' ? currentMonth(c) : 1, list = wsTasks(c, s.id, m).filter(t => canSee(c, t)), ok = wsOpenFor(c, s, m), d = list.filter(t => t.status === 'done').length;
    return '<button class="cdrow" data-a="open-ws" data-cid="' + c.id + '" data-id="' + esc(s.id) + '" data-m="' + (m || 0) + '">' + I(wsIcon(s)) + '<span class="ell">' + esc(short(s)) + (s.billing === 'monthly' && !s.adhoc ? ' <span class="small muted">· ' + mName(c, m) + '</span>' : '') + '</span><span class="num muted">' + (ok ? d + ' / ' + list.length : I('lock', 'sm') + ' Locked') + '</span>' + I('chev', 'sm') + '</button>'; }).join('');
  const when = v => { const d = new Date(v), t = d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' }), y = new Date(); y.setDate(y.getDate() - 1); return (d.toDateString() === new Date().toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3)) + ', ' + t; };
  const feed = S.feed.filter(e => e.cid === c.id && !e.internal && !e.priv && !e.rem).slice(0, 5);
  const sec = t => '<div class="csec"><h2>' + t + '</h2><span></span></div>';
  return '<div><h1>Welcome, ' + esc(c.contact || c.company) + '</h1><p class="muted" style="margin:6px 0 0">Here is your project at a glance.</p></div>' +
    '<div class="covgrid"><div class="stack" style="gap:18px">' + sec('Ready for approval') + '<div class="card cabox">' + (items.join('') || '<p class="muted" style="margin:0;padding:8px 4px">Nothing to approve right now. We will let you know when something is ready.</p>') + '</div>' +
    sec('Tasks due soon') + '<div class="card cabox">' + (dueItems.join('') || '<p class="muted" style="margin:0;padding:8px 4px">Nothing due in the next 3 days.</p>') + (rest > 0 ? '<button class="cdrow" data-a="ptab" data-t="tasks" style="grid-template-columns:1fr 16px"><span class="small">' + rest + (dueList.length ? ' more ' : ' ') + (rest === 1 ? 'task' : 'tasks') + ' for you later on · see all</span>' + I('chev', 'sm') + '</button>' : '') + '</div>' +
    sec('Project progress') + '<div class="stack" style="gap:10px"><div class="row between"><span><b>' + done + ' of ' + open.length + '</b> tasks completed</span><span>' + pct + '%</span></div><div class="obar"><i style="width:' + pct + '%"></i></div></div><div class="card cabox" style="padding:4px 18px">' + (ws || '<p class="muted" style="margin:8px 0">Your deliverables will show here once work begins.</p>') + '</div></div>' +
    '<div class="stack cside" style="gap:18px">' + sec('Recent updates') + '<div class="ctl">' + (feed.map(e => '<div class="ctli"><span class="dot"></span><span>' + esc(e.text) + '<span class="small muted" style="display:block">' + when(e.at) + '</span></span></div>').join('') || '<p class="muted" style="margin:0">Updates on your project will show here.</p>') + '</div>' +
    '<div class="clinks">' + [['tasks', 'check', 'View tasks'], ['workspaces', 'layers', 'View deliverables'], ['files', 'folder', 'View files']].map(([t, ic, l]) => '<button class="cdrow" data-a="ptab" data-t="' + t + '">' + I(ic) + '<span>' + l + '</span><span></span>' + I('chev', 'sm') + '</button>').join('') + '</div></div></div>';
}
/* the team's project overview, laid out like the client's: what needs the team, what is due soon, progress, and the latest updates */
function overviewTab(c) {
  const open = c.tasks.filter(t => taskOpen(c, t)), svcOf = id => ql(c, id) || (id === 'prep' ? { name: 'Preparation', billing: 'prep' } : id === 'general' ? { name: 'Ad-hoc', billing: 'general' } : { name: 'Tasks' });
  const item = (ic, title, sub, b, tone) => '<div class="carow"><span class="oico' + (tone ? ' ' + tone : '') + '">' + I(ic) + '</span><span class="cat"><b>' + esc(title) + '</b><span class="small muted">' + esc(sub) + '</span></span>' + b + '</div>';
  const label = t => t.status === 'changes' ? 'changes requested by the client' : t.status === 'submitted' ? 'received from the client, to check' : 'approved by the client, ready to finish';
  const items = [], team = open.filter(needsTeam), by = {};
  team.forEach(t => { (by[t.svc] = by[t.svc] || []).push(t); });
  Object.entries(by).forEach(([sid, ts]) => { const sv = svcOf(sid); items.push(ts.length === 1 ? item(wsIcon(sv), ts[0].title, short(sv) + ' · ' + label(ts[0]), btn('Open', 'task', { id: ts[0].id, cid: c.id }), ts[0].status === 'changes' ? 'gold' : '') : item(wsIcon(sv), short(sv), ts.length + ' tasks need the team', btn('View tasks', 'open-ws', { cid: c.id, id: sid, m: ts[0].m || 1 }, 'ghost'))); });
  if (isAdmin()) {
    const nowK = TODAY.slice(0, 7);
    rowsFor(c, false).filter(r => r.owed > 0 && (r.data.m ? L.monthKey(c, r.data.m) : String(r.due).slice(0, 7)) <= nowK).slice(0, 2).forEach(r => items.push(item('coins', 'Invoice ' + r.no, sm(r.owed) + (r.state === 'partial' ? ' still owed' : ' unpaid') + ' · ' + r.label, btn('Record payment', 'pay-open', { cid: c.id, pa: r.paidA, m: r.data.m || '', id: r.data.id || '' }, 'ghost'), 'gold')));
    if (c.quote.status === 'accepted' && !openRenewal(c) && nowK >= L.monthKey(c, Math.max(1, c.quote.months - 1))) items.push(item('refresh', 'Renewal', 'The contract ' + (nowK > L.monthKey(c, c.quote.months) ? 'ended in ' : 'ends in ') + mName(c, c.quote.months), btn('Prepare renewal', 'rn-open', { cid: c.id }), 'gold'));
    if (c.prep !== 'open' && c.quote.status !== 'cancelled' && c.quote.lines.length && !c.invoices.some(i => i.status === 'paid')) items.push(item('clipboard', 'Preparation', 'Set-up work before ' + mName(c, 1) + ': kick-off, logins, brand assets', btn('Start preparation', 'prep-start', { cid: c.id }, 'ghost')));
  }
  // due soon: the team's own tasks (and team steps) that are overdue or due in the next 3 days
  const dueOf = t => { const cs = L.staged(t) && L.curStage(t); return (cs && cs.due) || t.due || ''; }, teamTurn = t => t.status !== 'done' && !needsClient(t) && (L.staged(t) ? (L.curStage(t) || {}).owner !== 'client' : t.owner !== 'client');
  const soon = new Date(Date.now() + 3 * 864e5 + 8 * 3600e3).toISOString().slice(0, 10), mineOnly = !isAdmin();
  const mine = t => !mineOnly || t.assignee === S.me || (t.stages || []).some(x => x.assignee === S.me);
  const dueList = open.filter(t => teamTurn(t) && mine(t) && dueOf(t) && dueOf(t) <= soon).sort((a, b) => dueOf(a).localeCompare(dueOf(b)));
  const dueTxt = d => d < TODAY ? 'Overdue · was due ' + dshort(d) : d === TODAY ? 'Due today' : 'Due ' + dlong(d).replace(/, \d{4}$/, '');
  const dueItems = dueList.map(t => '<div class="carow"><span class="oico' + (dueOf(t) < TODAY ? ' gold' : '') + '">' + I(wsIcon(svcOf(t.svc))) + '</span><span class="cat"><b>' + esc(t.title) + '</b><span class="small ' + (dueOf(t) < TODAY ? 'goldtxt' : 'muted') + '">' + esc(short(svcOf(t.svc))) + ' · ' + dueTxt(dueOf(t)) + '</span></span><span class="row" style="gap:10px;flex-wrap:nowrap">' + (staged(t) ? whoAv(c, t) : avatar(t.assignee)) + btn('Open', 'task', { id: t.id, cid: c.id }, 'ghost') + '</span></div>');
  const done = open.filter(t => t.status === 'done').length, pct = open.length ? Math.round(done / open.length * 100) : 0, wc = open.filter(needsClient).length;
  const ws = wsList(c).filter(s => s.billing !== 'prep' || c.prep === 'open').map(s => { const m = s.adhoc || freeWs(s) ? 0 : s.billing === 'monthly' ? currentMonth(c) : 1, list = wsTasks(c, s.id, m), ok = wsOpenFor(c, s, m), d = list.filter(t => t.status === 'done').length;
    return '<button class="cdrow" data-a="open-ws" data-cid="' + c.id + '" data-id="' + esc(s.id) + '" data-m="' + (m || 1) + '">' + I(wsIcon(s)) + '<span class="ell">' + esc(short(s)) + (s.billing === 'monthly' && !s.adhoc ? ' <span class="small muted">· ' + mName(c, m) + '</span>' : '') + '</span><span class="num muted">' + (ok ? '' : I('lock', 'sm') + ' ') + d + ' / ' + list.length + '</span>' + I('chev', 'sm') + '</button>'; }).join('');
  const when = v => { const d = new Date(v), t = d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' }), y = new Date(); y.setDate(y.getDate() - 1); return (d.toDateString() === new Date().toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3)) + ', ' + t; };
  const feed = S.feed.filter(e => e.cid === c.id && !e.priv && !e.rem && canRead(e, viewer())).slice(0, 5);
  const sec = t => '<div class="csec"><h2>' + t + '</h2><span></span></div>';
  const links = [['work', 'layers', 'View deliverables'], ['files', 'folder', 'View files'], ['activity', 'clock', 'View all activity']].concat(isAdmin() ? [['invoices', 'receipt', 'View invoices']] : []);
  return '<div class="covgrid"><div class="stack" style="gap:18px">' + sec('Needs the team') + '<div class="card cabox">' + (items.join('') || '<p class="muted" style="margin:0;padding:8px 4px">Nothing needs the team right now.</p>') + '</div>' +
    sec(isAdmin() ? 'Tasks due soon' : 'Your tasks due soon') + '<div class="card cabox">' + (dueItems.join('') || '<p class="muted" style="margin:0;padding:8px 4px">Nothing due in the next 3 days.</p>') + '</div>' +
    sec('Project progress') + '<div class="stack" style="gap:10px"><div class="row between"><span><b>' + done + ' of ' + open.length + '</b> tasks completed' + (wc ? ' <span class="small muted">· ' + wc + ' waiting on the client</span>' : '') + '</span><span>' + pct + '%</span></div><div class="obar"><i style="width:' + pct + '%"></i></div></div><div class="card cabox" style="padding:4px 18px">' + (ws || '<p class="muted" style="margin:8px 0">Deliverables appear once the quotation is accepted.</p>') + '</div></div>' +
    '<div class="stack cside" style="gap:18px">' + sec('Recent updates') + '<div class="ctl">' + (feed.map(e => '<div class="ctli"><span class="dot"></span><span>' + esc(e.text) + '<span class="small muted" style="display:block">' + esc(e.who ? e.who + ' · ' : '') + when(e.at) + '</span></span></div>').join('') || '<p class="muted" style="margin:0">Nothing yet.</p>') + '</div>' +
    '<div class="clinks">' + links.map(([t, ic, l]) => '<button class="cdrow" data-a="ctab" data-t="' + t + '">' + I(ic) + '<span>' + l + '</span><span></span>' + I('chev', 'sm') + '</button>').join('') + '</div></div></div>' +
    '<div class="grid g2"><div class="card stack"><h2>Client details</h2><p class="small muted" style="margin:0">Shared by all of ' + esc(c.company) + '\'s projects.</p>' + field('d-company', 'Company', c.company) + field('d-contact', 'Contact person', c.contact) + field('d-email', 'Google email (used to sign in)', c.email, 'email') + field('d-phone', 'Phone', c.phone) + field('d-website', 'Website', c.website) + '<div>' + btn('Save details', 'save-details') + '</div></div>' +
    '<div class="stack" style="gap:16px"><div class="card stack"><h2>This project</h2>' + (isAdmin() ? field('d-project', 'Project name', pname(c)) + '<div>' + btn('Save project name', 'save-details', {}, 'ghost') + '</div>' : '<b>' + esc(pname(c)) + '</b>') + '</div>' + inviteCard(c) + '</div></div>' + notesCard(c) + (isAdmin() ? dangerZone(c) : '');
}
function notesCard(c) {
  const a = acct(c.aid) || {}, list = (a.noteLog || []).slice().reverse();
  return '<div class="card stack"><div class="row between"><h2>Internal notes</h2><span class="small muted">Only the team sees these · shared by all of ' + esc(c.company) + '\'s projects</span></div>' +
    '<div class="field"><label for="nn-text" class="sr">New note</label><textarea id="nn-text" class="grow" rows="2" placeholder="Add a note: preferences, contacts, things to remember…"></textarea></div><div>' + btn(I('plus', 'sm') + 'Add note', 'note-add', { aid: a.id }) + '</div>' +
    (list.length ? '<div class="notes">' + list.map(n => { const mine = isAdmin() || n.by === S.me;
      return '<div class="note">' + (S.noteEdit === n.id ? '<textarea id="ne-text" class="grow" rows="3">' + esc(n.text) + '</textarea><div class="row">' + btn('Save', 'note-save', { aid: a.id, id: n.id }) + btn('Cancel', 'note-cancel', {}, 'quiet') + '</div>' : '<div class="notetext">' + esc(n.text) + '</div>') +
        '<div class="row between small muted"><span>' + esc(n.byName || '') + (n.at ? ' · ' + fmtAt(n.at) : '') + (n.edited ? ' · edited' : '') + '</span>' + (mine && S.noteEdit !== n.id ? '<span class="row" style="gap:12px"><button class="link" data-a="note-edit" data-id="' + n.id + '">Edit</button><button class="link" data-a="note-del" data-aid="' + a.id + '" data-id="' + n.id + '">Delete</button></span>' : '') + '</div></div>'; }).join('') + '</div>' : '<p class="small muted" style="margin:0">No notes yet.</p>') + '</div>';
}
function inviteCard(c) {
  const ps = projectsOf(c.aid), open = ps.some(hasAccess);
  return '<div class="card stack"><h2>Portal access</h2><p class="small muted" style="margin:0">' + (!c.email ? 'Add the client\'s Google email in Client details first. That is the account they sign in with.' : open ? esc(c.contact || c.company) + ' can sign in now with <b>' + esc(c.email) + '</b>.' : esc(c.contact || c.company) + ' can sign in with <b>' + esc(c.email) + '</b> once you start preparation or their first invoice is paid. Until then they see a "deliverables almost ready" page.') + '</p><p class="small muted" style="margin:0">' + (D.email ? 'Email them the invitation from ' + esc((D.google && D.google.from) || 'your project address') + ', or copy it to send by WhatsApp.' : 'The app doesn\'t email invitations yet. Copy a ready-made message and send it by email or WhatsApp.') + '</p><div>' + (D.email ? btn(I('send', 'sm') + 'Email portal invite', 'invite-send', { cid: c.id }, '', !c.email) + ' ' : '') + btn(I('doc', 'sm') + 'Copy portal invite', 'invite-open', { cid: c.id }, 'ghost', !c.email) + '</div></div>';
}
function inviteText(c) {
  const url = (D.appUrl || location.origin), from = (S.brand.company || 'Gioia').replace(/ PRIVATE LIMITED| PTE\.? LTD\.?/i, '');
  return 'Hi ' + (c.contact || 'there') + ',\n\nYour ' + c.company + ' project with ' + from + ' is ready on our client portal. It is where you can follow the work, send us your materials, review and approve each piece, and see your invoices.\n\nTo sign in:\n1. Open ' + url + '\n2. Click "Sign in with Google"\n3. Choose this Google account: ' + c.email + '\n\nIf you would rather use a different Google account, just reply and we will update it.\n\nWarm regards,\n' + (member(S.me) || {}).name + '\n' + from;
}
function dangerZone(c) {
  const a = acct(c.aid) || {}, paid = projectsOf(c.aid).some(x => x.invoices.some(i => i.status === 'paid') || x.adhoc.some(i => i.status === 'paid'));
  return '<div class="card stack danger"><h2>Archive or delete</h2><div class="row between"><span><b>' + (a.archived ? 'Restore this client' : 'Archive this client') + '</b><br><span class="small muted">' + (a.archived ? 'Shows them in the Clients list again.' : 'Hides them from the Clients list. Everything is kept and can be restored.') + '</span></span>' + btn(a.archived ? 'Restore' : 'Archive', 'acct-archive', { aid: a.id, v: a.archived ? '0' : '1' }, 'ghost') + '</div>' +
    '<div class="row between"><span><b>Delete this client</b><br><span class="small muted">' + (paid ? 'Not available: this client has paid invoices. Archive them instead.' : 'Removes the client, all ' + projectsOf(c.aid).length + ' of their projects, tasks and team fees. This can\'t be undone.') + '</span></span>' + btn('Delete client', 'del-acct-open', { aid: a.id }, 'quiet', paid) + '</div></div>';
}
function quoteTab(c) {
  const q = c.quote, done = ['accepted', 'cancelled'].includes(q.status), acc = L.renewals(c).filter(r => r.status === 'accepted'), qEnd = acc.length ? acc[0].from - 1 : q.months;
  return (q.status === 'accepted' ? contractCard(c) : '') + '<div class="card stack"><div class="row between"><h2>Quotation ' + esc(q.no) + ' ' + pill(q.status) + ' <button class="link small" data-a="num-open" data-k="q" data-cid="' + c.id + '">Change number</button></h2><div class="row">' + btn('View document', 'doc', { type: 'quote' }, 'ghost') + (!done ? btn('Edit quotation', 'quote-open', { id: c.id }) + btn('Delete draft', 'q-del-open', { cid: c.id }, 'quiet') : q.status === 'accepted' ? btn('Cancel quotation', 'q-cancel-open', { cid: c.id }, 'quiet') : '') + '</div></div>' + (q.acceptedBy ? '<p class="small" style="margin:0">' + I('tick', 'sm') + ' Accepted in the portal by <b>' + esc(q.acceptedBy.name) + '</b> (' + esc(q.acceptedBy.email) + ') on ' + fmtAt(q.acceptedBy.at) + '.</p>' : q.status === 'accepted' ? signedAdmin(c) : '') + (['changes', 'declined'].includes(q.status) ? '<div class="card row between prepcard"><span><b>' + (q.status === 'changes' ? 'The client asked for changes' : 'The client declined') + '</b><br><span class="small muted">' + (lastResp(q, q.status) ? '"' + esc(lastResp(q, q.status)) + '"' : 'No reason given.') + ' Edit the quotation, then mark it as sent to repropose as version ' + ((q.version || 1) + 1) + '.</span></span>' + btn('Edit and repropose', 'quote-open', { id: c.id }) + '</div>' : '') + ((q.responses || []).length ? '<div class="stack" style="gap:6px"><span class="lab">Client responses</span>' + q.responses.map(r => '<div class="note"><div class="row between small"><b>' + ({ accepted: 'Accepted', changes: 'Asked for changes', declined: 'Declined' }[r.type]) + ' · version ' + r.version + '</b><span class="muted">' + esc(r.by) + ' · ' + fmtAt(r.at) + '</span></div>' + (r.text ? '<div class="notetext">' + esc(r.text) + '</div>' : '') + '</div>').join('') + '</div>' : '') + (q.status === 'sent' ? '<p class="small muted" style="margin:0">' + ((q.version || 1) > 1 ? 'Version ' + q.version + '. ' : '') + (c.email ? esc(c.contact || 'The client') + ' can view and accept this in the portal by signing in with ' + esc(c.email) + '.' : 'Add the client\'s Google email so they can view and accept this in the portal.') + '</p>' : '') + (q.status === 'cancelled' ? '<p class="small muted" style="margin:0">Cancelled ' + fmtAt(q.cancelled) + (q.cancelNote ? ': ' + esc(q.cancelNote) : '') + '. Unpaid invoices were voided; paid invoices and all work are kept.</p>' : '') + '<div class="scroll"><table class="tbl"><thead><tr><th>Service</th><th>Billing</th><th class="right">Price</th></tr></thead><tbody>' + (q.lines.map(s => '<tr><td>' + esc(s.name) + '</td><td>' + (s.billing === 'once' ? 'One-time, Month 1' : 'Monthly, Months 1 to ' + qEnd) + '</td><td class="right num">' + money(s.price) + '</td></tr>').join('') || '<tr><td colspan="3" class="muted">No services yet.</td></tr>') + L.discounts(c).map(d => '<tr><td>' + esc(d.label || 'Discount') + '</td><td>' + (d.scope !== 'all' && ql(c, d.scope) ? esc(short(ql(c, d.scope))) + ', ' : '') + esc(L.discWhen(d, c)) + '</td><td class="right num">' + (d.type === 'pct' ? '−' + d.value + '%' : money(-d.value)) + '</td></tr>').join('') + '</tbody></table></div><p class="muted small" style="margin:0">' + mName(c, 1) + ' to ' + mName(c, qEnd) + ', ' + qEnd + ' months.' + (acc.length ? ' Renewals are listed under Contract above.' : '') + '</p></div>';
}
const fdue = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? (x => x.getDate() + ' ' + MONTHS[x.getMonth()].slice(0, 3) + ' ' + x.getFullYear())(new Date(d + 'T00:00')) : d;
function invoiceRows(rows, readonly) {
  const key = r => 'inv:' + r.c.id + ':' + (r.data.id || r.data.m);
  const act = r => {
    if (readonly) return btn(I('doc', 'sm') + 'View invoice', 'doc', r.docData, 'ghost');
    const open = !['locked', 'paid', 'void'].includes(r.state), pay = { cid: r.c.id, pa: r.paidA, m: r.data.m || '', id: r.data.id || '' };
    const main = !open ? btn('View', 'doc', r.docData, 'quiet') : r.state === 'pending' ? btn('Mark as sent', r.sentA, r.data, 'ghost') : btn('Record payment', 'pay-open', pay);
    const mi = (ic, label, a, d) => '<button class="mi" data-a="' + a + '" ' + Object.entries(d).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + '>' + I(ic, 'sm') + '<span>' + label + '</span></button>';
    const items = (open ? mi('doc', 'View invoice', 'doc', r.docData) : '') + (open && r.state === 'pending' ? mi('tick', 'Record payment', 'pay-open', pay) : '') + (r.parts.length ? mi('coins', 'Payments received', 'parts-open', { cid: r.c.id, m: r.data.m || '', id: r.data.id || '' }) : '') + (r.state === 'void' ? '' : mi('edit', 'Change invoice number', 'num-open', Object.assign({ k: 'i', cid: r.c.id }, r.data.id ? { id: r.data.id } : { m: r.data.m })));
    return '<div class="row" style="justify-content:flex-end;gap:6px;flex-wrap:nowrap">' + main + (items ? '<div style="position:relative"><button class="iconbtn" data-a="menu" data-m="' + key(r) + '" aria-label="More for invoice ' + esc(r.no) + '">⋯</button>' + (S.menu === key(r) ? '<div class="menu imenu">' + items + '</div>' : '') + '</div>' : '') + '</div>';
  };
  return '<div class="card" style="padding:4px 8px"><table class="tbl invtbl"><thead><tr><th>Invoice</th>' + (rows.some(r => r.showClient) ? '<th>Client</th>' : '') + '<th>For</th><th>Due</th><th class="right">Amount</th><th>Status</th><th></th></tr></thead><tbody>' + (rows.map(r => '<tr><td class="num ino"><b>' + esc(r.no) + '</b></td>' + (r.showClient ? '<td class="icl">' + esc(r.c.company) + '</td>' : '') + '<td class="ifor">' + esc(r.label) + '</td><td class="num idue"><span class="mlab">Due </span>' + esc(fdue(r.due)) + '</td><td class="right num iamt">' + money(r.amount) + '</td><td class="ist"><span class="row" style="gap:8px;flex-wrap:nowrap">' + pill(r.state) + (r.state === 'paid' && r.pay ? '<span class="small muted" style="white-space:nowrap">' + esc(payText(r.pay)) + '</span>' : r.state === 'partial' ? '<span class="small muted" style="white-space:nowrap">' + sm(r.paid) + ' paid · ' + sm(r.owed) + ' to pay</span>' : '') + '</span></td><td class="right iact">' + act(r) + '</td></tr>').join('') || '<tr><td colspan="7" class="muted">No invoices match.</td></tr>') + '</tbody></table></div>';
}
function rowsFor(c, all) {
  const rows = c.invoices.map(i => ({ c, no: i.no, label: mName(c, i.m), due: due(c, i.m), amount: invTotal(c, i.m), pay: i.pay, state: invLocked(c, i.m) ? 'locked' : L.covered(c, i.m) && i.status !== 'void' ? 'paid' : i.status, docData: { type: 'inv', m: i.m, cid: c.id }, sentA: 'i-sent', paidA: 'i-paid', data: { m: i.m, cid: c.id }, showClient: all }));
  c.adhoc.forEach(a => rows.push({ c, no: a.no, label: a.name, due: a.date, amount: a.amount, pay: a.pay, state: a.status, docData: { type: 'adhoc', id: a.id, cid: c.id }, sentA: 'ah-sent', paidA: 'ah-paid', data: { id: a.id, cid: c.id }, showClient: all }));
  rows.forEach(r => { const src = r.data.id ? c.adhoc.find(a => a.id === r.data.id) : c.invoices.find(i => i.m === r.data.m); r.src = src; r.parts = (src && src.parts) || []; r.paid = r.state === 'paid' ? r.amount : r.parts.reduce((a, q) => a + q.amount, 0); r.owed = ['locked', 'void', 'paid'].includes(r.state) ? 0 : r.amount - r.paid; });
  return rows;
}
const PAYM = { paynow: 'PayNow', bank: 'Bank transfer', deposit: 'Security deposit', other: 'Other' };
const payText = p => { const dt = /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') ? ' · ' + dshort(p.date) : ''; return (p.mode === 'deposit' ? sm(p.fromDeposit) + ' from deposit' + (p.mode2 ? ' + ' + PAYM[p.mode2] : '') : PAYM[p.mode] || 'Paid') + dt; };
function depositCard(c, readonly) {
  const di = L.depositInv(c); if (!di) return '';
  const sec = L.depSecurity(c), bal = L.depBalance(c), uses = di.uses || [], paid = di.status === 'paid';
  const st = !paid ? pill(di.status) : bal <= 0 ? '<span class="pill ok">' + (uses.some(u => u.type === 'refund') && !uses.some(u => u.type === 'utilise') ? 'Refunded' : 'Fully used') + '</span>' : '<span class="pill gold">Held · ' + sm(bal) + '</span>';
  return '<div class="card stack depcard"><div class="row between"><div><h2>' + (sec ? 'Security deposit' : 'Deposit') + ' ' + esc(di.no) + '</h2><span class="small muted">' + sm(di.amount) + (paid && di.pay ? ' · paid ' + esc(payText(di.pay)) : ' · not paid yet') + '</span></div>' + st + '</div>' +
    (sec ? '<p class="small muted" style="margin:0">' + (paid && bal <= 0 ? 'Nothing left to use or refund.' : paid ? 'Balance ' + sm(bal) + '. Use it to pay an invoice (choose "Security deposit" when marking it paid), or refund it.' : 'Once the deposit is paid, it can be used to pay an invoice or refunded.') + '</p>' : '<p class="small muted" style="margin:0">' + esc(L.depUse(c)) + '</p>') +
    (uses.length ? '<div class="stack" style="gap:4px">' + uses.map(u => '<div class="row between dline2"><span>' + (u.type === 'refund' ? I('coins', 'sm') + 'Refunded <b>' + sm(u.amount) + '</b> by ' + esc(PAYM[u.mode] || u.mode) + (u.note ? ' · ' + esc(u.note) : '') : I('tick', 'sm') + 'Used <b>' + sm(u.amount) + '</b> for invoice <b>' + esc(u.inv) + '</b>') + ' <span class="small muted">· ' + dlong(u.date) + '</span></span>' + (readonly ? '' : '<button class="link small" data-a="dep-undo" data-id="' + u.id + '" data-cid="' + c.id + '">Undo</button>') + '</div>').join('') + '</div>' : '') +
    (!readonly && sec && paid && bal > 0 ? '<div class="row">' + btn(I('tick', 'sm') + 'Use for an invoice', 'depuse-open', { cid: c.id }, 'ghost') + btn(I('coins', 'sm') + 'Refund', 'deprefund-open', { cid: c.id }, 'ghost') + '</div>' : '') + '</div>';
}
function invoicesTab(c, readonly) {
  if (!c.invoices.length) return '<div class="lockbox">Invoices are created when the quotation is marked as accepted.</div>';
  const q = c.quote;
  return depositCard(c, readonly) + (q.months > q.committed && !q.renewed ? '<div class="card row between"><span>Months ' + (q.committed + 1) + ' to ' + q.months + ' go ahead only when both parties confirm the renewal.</span>' + (readonly ? '' : btn('Confirm renewal', 'renew', { cid: c.id }, 'ghost')) + '</div>' : '') + invoiceRows(rowsFor(c, false), readonly) +
    (readonly ? '' : '<div class="card stack"><h2>Ad hoc invoice</h2><p class="small muted" style="margin:0">For a service added along the way. A catalogue service also unlocks its deliverable once this invoice is paid.</p><div class="grid g4" style="align-items:end"><div class="field"><label for="ah-svc">Service</label><select id="ah-svc"><option value="">Custom item (no deliverable)</option>' + S.catalogue.map(s => '<option value="' + s.id + '">' + esc(s.name) + ' · ' + money(s.price) + '</option>').join('') + '</select></div>' + field('ah-name', 'Description (custom item)', '') + field('ah-amt', 'Amount ($)', '', 'number') + btn('Create invoice', 'ah-create', { cid: c.id }, 'ghost') + '</div></div>');
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
  return '<div class="stack" style="gap:0">' + list.map(e => '<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line);align-items:flex-start;flex-wrap:nowrap"><span class="av">' + initials(e.who) + '</span><div style="flex:1"><div style="' + (unreadFor(e, v) ? 'font-weight:600' : '') + '"><b>' + esc(e.who) + '</b> ' + esc(e.text) + '</div><span class="small muted">' + fmtAt(e.at) + (e.priv ? (isAdmin() ? ' · only ' + esc((member(e.priv) || {}).name || '') + ' and admins' : ' · only you') : e.internal ? ' · team only' : '') + '</span></div></div>').join('') + '</div>';
}
function clientPage(c) {
  let tabs = [['overview', 'Overview'], ['work', 'Deliverables'], ['files', 'Files'], ['activity', 'Activity'], ['quote', 'Quotation'], ['invoices', 'Invoices']];
  if (!isAdmin()) { tabs = tabs.filter(t => !['quote', 'invoices'].includes(t[0])); if (['quote', 'invoices'].includes(S.ctab)) S.ctab = 'overview'; }
  const body = { overview: overviewTab, work: wsCards, files: filesTab, activity: c => '<div class="card">' + feedHtml(S.feed.filter(e => e.cid === c.id && canRead(e, viewer()))) + '</div>', quote: quoteTab, invoices: c => invoicesTab(c, false) }[S.ctab](c);
  return '<div class="row between"><div class="crumbs"><button data-a="nav" data-v="clients">Clients</button>' + I('chev', 'sm') + '<b>' + esc(c.company) + '</b></div></div>' + clientHeader(c, tabs, S.ctab, 'ctab') + body;
}

/* ---------- other staff pages ---------- */
function clientsPage() {
  const list = S.accounts.filter(a => S.showArchived || !a.archived).sort((a, b) => a.company.localeCompare(b.company)), nArch = S.accounts.filter(a => a.archived).length;
  const prow = c => { const open = c.tasks.filter(t => taskOpen(c, t)), d = open.filter(t => t.status === 'done').length, pct = open.length ? Math.round(d / open.length * 100) : 0, nt = open.filter(needsTeam).length, nc = open.filter(needsClient).length;
    return '<tr class="click prow" data-a="open-client" data-id="' + c.id + '"><td><div class="row" style="flex-wrap:nowrap;gap:10px;padding-left:48px">' + I('layers', 'sm') + '<div><b>' + esc(pname(c)) + '</b>' + (c.prep === 'open' && !hasAccessPaid(c) ? ' <span class="chip">Preparing</span>' : '') + '</div></div></td><td class="num">' + esc(c.quote.no) + ' ' + pill(c.quote.status) + '</td><td style="min-width:160px">' + (open.length ? '<div class="bar"><i style="width:' + pct + '%"></i></div><span class="small muted">' + d + ' of ' + open.length + ' tasks</span>' : '<span class="small muted">No open work yet</span>') + '</td><td>' + (nt ? '<span class="pill warn">' + nt + '</span>' : '<span class="muted">None</span>') + '</td><td>' + (nc ? '<span class="pill info">' + nc + '</span>' : '<span class="muted">None</span>') + '</td></tr>'; };
  const arow = a => { const ps = projectsOf(a.id);
    return '<tr class="arow"><td colspan="5"><div class="row between" style="flex-wrap:nowrap"><div class="row" style="flex-wrap:nowrap">' + logoTile(a.company, a.logo, 'width:38px;height:38px;font-size:14px;border-radius:9px') + '<div><b>' + esc(a.company) + '</b>' + (a.archived ? ' <span class="chip">Archived</span>' : '') + '<div class="small muted">' + esc(a.contact) + ' · ' + ps.length + (ps.length === 1 ? ' project' : ' projects') + '</div></div></div>' + (isAdmin() ? btn(I('plus', 'sm') + 'New project', 'wz-new', { aid: a.id }, 'quiet') : '') + '</div></td></tr>' + ps.map(prow).join(''); };
  return '<div class="row between"><div><h1>' + (vendorMe() ? 'Projects' : 'Clients') + '</h1><p class="muted" style="margin:4px 0 0">' + list.length + ' client' + (list.length === 1 ? '' : 's') + ', ' + S.clients.filter(c => list.some(a => a.id === c.aid)).length + ' projects' + (nArch ? ' · <button class="link" data-a="arch-toggle">' + (S.showArchived ? 'Hide' : 'Show') + ' ' + nArch + ' archived</button>' : '') + '</p></div>' + '<div class="row">' + (isAdmin() ? btn(I('plus', 'sm') + 'New project', 'wz-new', {}) : '') + '</div></div>' +
    '<div class="card scroll" style="padding:4px 8px"><table class="tbl ctable"><thead><tr><th>Client and project</th><th>Quotation</th><th>Progress</th><th>Needs the team</th><th>Waiting on client</th></tr></thead><tbody>' + (list.map(arow).join('') || '<tr><td colspan="5" class="muted">No clients yet.</td></tr>') + '</tbody></table></div>';
}
const hasAccessPaid = c => c.invoices.some(i => i.status === 'paid') || c.adhoc.some(a => a.status === 'paid');
function accHead(c, act, open, right) {
  return '<button class="acchead" data-a="' + act + '" data-id="' + c.id + '" aria-expanded="' + open + '">' + logoTile(c.company, c.logo, 'width:40px;height:40px;font-size:15px;border-radius:9px') + '<span style="flex:1;min-width:180px"><b style="font:600 17px var(--display)">' + esc(c.company) + '</b><br><span class="small muted">' + esc(pname(c)) + '</span></span>' + right + I('chev', 'chevi') + '</button>';
}
function workspacesPage() {
  const list = S.clients.filter(c => c.tasks.length);
  return '<div class="row between"><div><h1>Deliverables</h1><p class="muted" style="margin:4px 0 0">Click a client to show or hide their deliverables.</p></div><div class="row"><button class="link" data-a="ws-all" data-v="1">Expand all</button><button class="link" data-a="ws-all" data-v="0">Collapse all</button></div></div>' +
    (list.length ? list.map(c => { const open = S.wsOpen.includes(c.id), act = c.tasks.filter(t => canSee(c, t)), nt = act.filter(needsTeam).length, nc = act.filter(needsClient).length;
      return '<div class="acc' + (open ? ' open' : '') + '">' + accHead(c, 'ws-toggle', open, '<span class="row" style="gap:8px"><span class="chip">' + wsList(c).length + ' deliverables</span>' + (nt ? '<span class="pill warn">' + nt + ' need the team</span>' : '') + (nc ? '<span class="pill info">' + nc + ' with client</span>' : '') + '</span>') + (open ? '<div class="accbody">' + wsCards(c) + '</div>' : '') + '</div>'; }).join('') : '<div class="lockbox">No active deliverables yet. They appear when a quotation is accepted.</div>');
}
function chipsHtml(list, cur, act, labels) {
  const G = S.role === 'client' ? CORDER.map(k => GROUPS.find(g => g[0] === k)) : GROUPS;
  const allChip = S.role === 'client' ? '<button class="fchip" data-a="' + act + '" data-g="" aria-pressed="' + !cur + '">' + I('list', 'sm') + 'All (' + list.length + ')</button>' : '';
  return '<div class="chips">' + G.filter(([k]) => cur === k || list.some(t => tGroup(t) === k)).map(([k, l, sts, ic]) => '<button class="fchip" data-a="' + act + '" data-g="' + k + '" aria-pressed="' + (cur === k) + '">' + I(ic, 'sm') + ((labels || {})[k] || l) + ' (' + list.filter(t => tGroup(t) === k).length + ')</button>').join('') + allChip + '</div>';
}
/* the face of whoever has the task now: the client, the current step's person, or the assignee */
function whoAv(c, t, cls) {
  const cs = curStage(t), onClient = t.status !== 'done' && (staged(t) && cs ? cs.owner === 'client' : t.owner === 'client' || ['cdraft', 'creview', 'awaiting'].includes(t.status));
  if (onClient) return '<span class="av ' + (c.pic ? 'pic ' : 'cl ') + (cls || '') + '" title="' + esc(c.contact || 'Client') + '">' + (c.pic ? picImg(c.pic, c.contact) : esc(initials(c.contact || 'C'))) + '</span>';
  const id = (staged(t) && cs && cs.assignee) || t.assignee;
  return id ? avatar(id, cls) : '<span class="av ' + (cls || '') + '" title="Unassigned">–</span>';
}
/* tasks with steps: who has the current step, who is next, and everyone involved */
const stepName = (c, x) => x.owner === 'client' ? (S.role === 'client' ? 'You' : c.contact || 'Client') : ((member(x.assignee) || {}).name || 'Team · unassigned');
const stepAv = (c, x, cls) => x.owner === 'client' ? '<span class="av ' + (c.pic ? 'pic ' : 'cl ') + (cls || '') + '" title="' + esc(c.contact || 'Client') + '">' + (c.pic ? picImg(c.pic, c.contact) : esc(initials(c.contact || 'C'))) + '</span>' : x.assignee ? avatar(x.assignee, cls) : '<span class="av ' + (cls || '') + '" title="Team · unassigned">–</span>';
function withNow(c, t) {
  const i = t.stage, cur = t.stages[i], nxt = t.stages[i + 1], seen = {}, people = t.stages.filter(x => { const k = x.owner === 'client' ? 'client' : x.assignee || ''; if (seen[k]) return false; seen[k] = 1; return true; });
  if (!cur) return '<span class="stack" style="gap:2px"><b>All steps done</b><span class="avstack">' + people.map(x => stepAv(c, x, 'sm')).join('') + '</span></span>';
  return '<span class="stack" style="gap:3px"><b>' + esc(stepName(c, cur)) + '</b><span class="small muted">Step ' + (i + 1) + ' of ' + t.stages.length + (nxt ? ' · next: ' + esc(stepName(c, nxt)) : ' · last step') + '</span><span class="avstack" title="Everyone on this task">' + people.map(x => stepAv(c, x, 'sm')).join('') + '</span></span>';
}
function taskRow(c, t, mode) {
  const s = ql(c, t.svc), m = member(t.assignee), cs = curStage(t), sub = (staged(t) ? (cs ? 'Step ' + (t.stage + 1) + ' of ' + t.stages.length + ': ' + cs.title + (cs.owner === 'client' ? (S.role === 'client' ? ' (you)' : ' (client)') : ' (team)') : 'All ' + t.stages.length + ' steps completed') + ' · ' : '') + (t.desc || (short(s) + (t.m ? ' · ' + mName(c, t.m) : '')));
  const sm2 = staged(t) && cs ? (cs.owner === 'client' ? null : member(cs.assignee)) : null;
  const who = (staged(t) && cs ? cs.owner === 'client' : t.owner === 'client') ? (S.role === 'client' ? 'You' : esc(c.contact || 'Client')) : esc(sm2 ? sm2.name : m ? m.name : staged(t) && cs ? 'Team' : 'Unassigned');
  const late = t.due && t.due < TODAY && t.status !== 'done';
  return '<div class="tli" data-a="task" data-id="' + t.id + '" data-cid="' + c.id + '"><span class="ticon">' + I(svcIcon(t.svc)) + '</span><div class="stack" style="gap:4px;min-width:0"><b>' + esc(t.title) + '</b><span class="small muted clamp">' + esc(sub) + '</span><span>' + pill(t.status, cLabel(t)) + '</span></div>' +
    '<span class="row small c3" style="gap:8px;flex-wrap:nowrap">' + (mode === 'both' ? I('building', 'sm') + '<span>' + esc(c.company) + '<br><span class="muted">' + esc(pname(c)) + '</span><br><span class="row" style="gap:6px;margin-top:3px;flex-wrap:nowrap">' + whoAv(c, t, 'sm') + who + '</span></span>' : mode === 'client' ? I('building', 'sm') + '<span>' + esc(c.company) + '<br><span class="muted">' + esc(pname(c)) + '</span></span>' : whoAv(c, t) + '<span>' + who + '</span>') + '</span><span class="row small c4" style="gap:8px;flex-wrap:nowrap' + (late ? ';color:var(--crit);font-weight:600' : '') + '">' + (t.due ? I('cal', 'sm') + dlong(t.due) : '<span class="muted">No due date</span>') + '</span>' + I('chev', 'sm') + '</div>';
}
function taskTable(rows, mode) {
  return '<div class="tlist"><div class="tlh"><span></span><span>Task</span><span>' + (mode === 'both' ? 'Client · assignee' : mode === 'client' ? 'Client' : 'Assignee') + '</span><span>Due date</span><span></span></div>' + (rows.map(({ c, t }) => taskRow(c, t, mode)).join('') || '<p class="muted" style="padding:16px;margin:0">No tasks match.</p>') + '</div>';
}
/* ---------- My tasks, simple view: what needs doing now, by when; waiting-on-client and later folded away ---------- */
const plusDays = n => { const d = new Date(TODAY + 'T00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const waitsClient = t => ['cdraft', 'creview', 'awaiting'].includes(t.status) || (staged(t) ? (curStage(t) || {}).owner === 'client' : t.owner === 'client' && t.status !== 'done');
function compactRow(c, t, showWho) {
  const cs = curStage(t), late = t.due && t.due < TODAY && t.status !== 'done';
  const sm2 = staged(t) && cs ? (cs.owner === 'client' ? null : member(cs.assignee)) : null, m = sm2 || member(t.assignee);
  const bits = [cname(c), staged(t) && cs ? 'Step ' + (t.stage + 1) + ' of ' + t.stages.length + ': ' + cs.title : short(ql(c, t.svc))];
  if (showWho) bits.push(waitsClient(t) ? 'Client' : m ? m.name : 'Unassigned');
  return '<div class="tli tlic" data-a="task" data-id="' + t.id + '" data-cid="' + c.id + '"><span class="ticon sm">' + I(svcIcon(t.svc), 'sm') + '</span><span class="tlic-main"><b>' + esc(t.title) + '</b><span class="small muted clamp1">' + esc(bits.join(' · ')) + '</span></span>' +
    '<span class="tlic-av">' + (showWho ? whoAv(c, t, 'sm') : '') + '</span><span class="tlic-st">' + pill(t.status, cLabel(t)) + '</span><span class="small tlic-due' + (late ? ' late' : '') + '">' + (t.due ? dshort(t.due) : '<span class="muted">No date</span>') + '</span>' + I('chev', 'sm') + '</div>';
}
function simpleTasks(rows, showWho) {
  const open = rows.filter(r => r.t.status !== 'done'), mine = open.filter(r => !waitsClient(r.t)), waiting = open.filter(r => waitsClient(r.t)), wk = plusDays(7);
  const buckets = [['overdue', 'Overdue', mine.filter(r => r.t.due && r.t.due < TODAY), true], ['today', 'Due today', mine.filter(r => r.t.due === TODAY), true], ['week', 'Next 7 days', mine.filter(r => r.t.due > TODAY && r.t.due <= wk), true], ['later', 'Later', mine.filter(r => !r.t.due || r.t.due > wk), !mine.some(r => r.t.due && r.t.due <= wk)], ['waiting', 'Waiting on client', waiting, false]];
  const sum = [[buckets[0][2].length, 'overdue'], [buckets[1][2].length, 'due today'], [buckets[2][2].length, 'due in the next 7 days'], [waiting.length, 'waiting on client']].filter(x => x[0]).map(x => '<b>' + x[0] + '</b> ' + x[1]).join(' · ');
  S.mtDef = Object.fromEntries(buckets.map(b => [b[0], b[3]]));
  const open1 = k => S.mtOpen && k in S.mtOpen ? S.mtOpen[k] : null;
  const body = buckets.filter(b => b[2].length).map(([k, l, list, dflt]) => { const isOpen = open1(k) === null ? dflt : open1(k), LIM = 8, more = S.mtMore && S.mtMore[k];
    return '<div class="card mtgroup' + (k === 'overdue' ? ' crit' : '') + '"><button class="mtgh" data-a="mt-fold" data-k="' + k + '" aria-expanded="' + isOpen + '"><span class="row" style="gap:10px">' + I(isOpen ? 'chevd' : 'chev', 'sm') + '<b>' + l + '</b><span class="count">' + list.length + '</span></span>' + (k === 'waiting' ? '<span class="small muted">Nothing to do until the client responds</span>' : k === 'later' ? '<span class="small muted">Due after ' + dshort(wk) + '</span>' : '') + '</button>' +
      (isOpen ? list.slice(0, more ? 999 : LIM).map(r => compactRow(r.c, r.t, showWho)).join('') + (list.length > LIM && !more ? '<button class="link mtmore" data-a="mt-more" data-k="' + k + '">Show all ' + list.length + '</button>' : '') : '') + '</div>'; }).join('');
  const urgent = buckets[0][2].length + buckets[1][2].length + buckets[2][2].length;
  return (sum ? '<p class="mtsum">' + (urgent ? '' : 'Nothing due in the next 7 days. ') + sum + (buckets[3][2].length ? ' · <b>' + buckets[3][2].length + '</b> later' : '') + '</p>' : '') + (body || '<div class="card" style="padding:28px;text-align:center"><b>All clear.</b><br><span class="muted small">Nothing is waiting on you right now.</span></div>');
}
function myTasksPage() {
  // admins and team members can widen this to everyone's tasks on their projects; vendors only ever see their own
  const scope = vendorMe() ? 'me' : S.mtWho ? 'all' : S.mtScope, q = S.mtq.toLowerCase(), who = vendorMe() ? '' : S.mtWho || '';
  const whoOk = t => !who || (who === '@client' ? t.owner === 'client' || (staged(t) && (curStage(t) || {}).owner === 'client') : who === '@none' ? t.owner !== 'client' && !t.assignee && !(t.stages || []).some(s => s.assignee) : t.assignee === who || L.stageMine(t, who));
  let rows = [];
  S.clients.forEach(c => c.tasks.forEach(t => { if (canSee(c, t) && whoOk(t) && (scope === 'all' || t.assignee === S.me || L.stageMine(t, S.me)) && (!S.mtClient || c.id === S.mtClient) && (!q || (t.title + ' ' + c.company + ' ' + short(ql(c, t.svc))).toLowerCase().includes(q))) rows.push({ c, t }); }));
  rows.sort((a, b) => (a.t.due || '9') < (b.t.due || '9') ? -1 : 1);
  const all = rows.map(r => r.t), shown = S.mtg ? rows.filter(r => tGroup(r.t) === S.mtg) : rows;
  return '<div class="row between"><div><h1>My tasks</h1><p class="muted" style="margin:4px 0 0">' + (scope === 'all' ? (isAdmin() ? 'Every task across clients.' : 'Every task on the projects you work on.') : 'Your assignments across clients. Track progress and deliver work.') + '</p></div>' + '<div class="row">' + '<div class="seg" title="How tasks are shown"><button data-a="mt-mode" data-m="simple" aria-pressed="' + ((S.mtMode || 'simple') === 'simple') + '">Simple</button><button data-a="mt-mode" data-m="full" aria-pressed="' + (S.mtMode === 'full') + '">Full list</button></div>' + (!vendorMe() ? '<div class="seg"><button data-a="mt-scope" data-s="me" aria-pressed="' + (scope === 'me') + '">Assigned to me</button><button data-a="mt-scope" data-s="all" aria-pressed="' + (scope === 'all') + '">Everyone</button></div>' : '') + (S.clients.length ? btn(I('plus', 'sm') + 'Add task', 'task-new') : '') + '</div></div>' +
    '<div class="row" style="flex-wrap:nowrap"><div class="search" style="max-width:none">' + I('search') + '<input id="mt-q" type="search" data-mtq="1" placeholder="Search tasks, clients or deliverables…" value="' + esc(S.mtq) + '" aria-label="Search tasks"></div><button class="btn quiet" data-a="mt-filters" aria-expanded="' + S.mtFilters + '">' + I('filter', 'sm') + 'Filters' + ((S.mtClient ? 1 : 0) + (who ? 1 : 0) ? ' (' + ((S.mtClient ? 1 : 0) + (who ? 1 : 0)) + ')' : '') + '</button></div>' +
    (S.mtFilters ? '<div class="card row"><div class="field" style="min-width:240px"><label for="mt-client">Client</label><select id="mt-client" data-mtclient="1"><option value="">All clients</option>' + S.clients.map(c => '<option value="' + c.id + '"' + (S.mtClient === c.id ? ' selected' : '') + '>' + esc(cname(c)) + '</option>').join('') + '</select></div>' + (!vendorMe() ? '<div class="field" style="min-width:220px"><label for="mt-who">Assignee</label><select id="mt-who" data-mtwho="1"><option value="">Anyone</option>' + S.team.filter(m => isAdmin() || m.id === S.me || who === m.id || S.clients.some(c => c.tasks.some(t => t.assignee === m.id || (t.stages || []).some(z => z.assignee === m.id)))).sort((x, y) => x.name.localeCompare(y.name)).map(m => '<option value="' + m.id + '"' + (who === m.id ? ' selected' : '') + '>' + esc(m.name) + (m.id === S.me ? ' (you)' : '') + '</option>').join('') + '<option value="@client"' + (who === '@client' ? ' selected' : '') + '>Client</option><option value="@none"' + (who === '@none' ? ' selected' : '') + '>Unassigned</option></select></div>' : '') + (S.mtClient || S.mtg || who ? '<button class="link" data-a="mt-clear" style="align-self:end;margin-bottom:10px">Clear filters</button>' : '') + '</div>' : '') +
    ((S.mtMode || 'simple') === 'simple' && !S.mtg ? simpleTasks(rows, scope === 'all') : chipsHtml(all, S.mtg, 'mt-group') + taskTable(shown, scope === 'all' ? 'both' : 'client'));
}
function filesPage() {
  return '<div class="row between"><div><h1>Files</h1><p class="muted" style="margin:4px 0 0">Each client\'s files, grouped by folder. Click a client or a folder to show or hide its files.</p></div></div>' + S.clients.map(c => { const open = S.wsOpen.includes('f:' + c.id);
    return '<div class="acc' + (open ? ' open' : '') + '">' + accHead(c, 'files-toggle', open, '<span class="chip">' + c.files.length + ' files</span>') + (open ? '<div class="accbody"><div class="stack" style="gap:8px">' + folderNames(c).map(f => folderBlock(c, f, c.files.filter(x => x.folder === f))).join('') + '</div><div><button class="link" data-a="open-client-tab" data-id="' + c.id + '" data-t="files">Open the client\'s files to add more</button></div></div>' : '') + '</div>'; }).join('');
}
function feeWhere(f) {
  const c = S.clients.find(x => x.id === f.cid);
  if (!c) return { c, label: f.item || 'Removed project', when: '' };
  if (f.kind === 'item') return { c, label: f.item, when: 'One-off item' };
  if (f.kind === 'task') { const t = c.tasks.find(x => x.id === f.taskId), st = t && f.stage !== null && f.stage !== undefined && f.stage !== '' && t.stages ? t.stages[f.stage] : null, s = t ? ql(c, t.svc) : null;
    return { c, t, label: t ? t.title : 'Removed task', step: st ? 'Step ' + (+f.stage + 1) + ': ' + st.title : '', when: (s ? short(s) : '') + (t && t.m ? ' · ' + mName(c, t.m) : '') }; }
  const s = f.svc ? ql(c, f.svc) : null;
  return { c, s, label: s ? short(s) : 'Removed deliverable', when: !s ? '' : s.adhoc ? 'Added service' : s.billing === 'once' ? 'One-off' : mName(c, f.m) };
}
function feeBase(c, s) { return !s ? 0 : s.adhoc ? (adhocOf(c, s.adhoc) || {}).amount || s.price : s.price; }
const fx = f => { const c = S.clients.find(x => x.id === f.cid), earned = L.feeEarned(c, f), paid = f.paid || 0; return { c, earned, paid, owed: Math.max(0, earned - paid), state: L.feeState(c, f) }; };
const KIND = { month: 'Monthly sum', task: 'Per task', item: 'One-off item' };
function feeHow(f) {
  if (f.kind === 'item') return 'Payable straight away';
  if (f.kind === 'task') return f.stage !== null && f.stage !== undefined && f.stage !== '' ? 'Payable when this step is completed' : 'Payable when the task is completed';
  const ts = L.feeTasks(fx(f).c, f), d = ts.filter(t => t.status === 'done').length;
  return (f.rule === 'all' ? 'All tasks done to be paid' : 'Paid per completed task') + ' · ' + d + ' of ' + ts.length + ' done';
}
const feePill = f => { const k = fx(f); return k.state === 'paid' ? '<span class="pill ok">' + I('tick', 'sm') + 'Paid</span>' : k.state === 'owed' ? '<span class="pill gold">' + I('hourglass', 'sm') + sm(k.owed) + ' owing</span>' : '<span class="pill lock" title="Not earned yet">' + I('cal', 'sm') + (k.paid ? 'Part paid' : 'Upcoming') + '</span>'; };
function feeRowHtml(f, mode) {
  const w = feeWhere(f), m = member(f.member), k = fx(f);
  return '<div class="tli ft-row" data-a="' + (mode === 'mine' ? 'fee-view' : 'fee-edit') + '" data-id="' + f.id + '"><span class="ticon">' + (mode === 'mine' ? I('building') : avatar(f.member)) + '</span><span><b>' + esc(mode === 'mine' ? (w.c ? w.c.company : '') : (m ? m.name : 'Removed member')) + '</b><br><span class="small muted">' + esc(mode === 'mine' ? pname(w.c) : cname(w.c)) + '</span></span><span><span class="chip">' + KIND[f.kind] + '</span> ' + esc(w.label) + '<br><span class="small muted">' + esc([w.step, w.when, f.note].filter(Boolean).join(' · ')) + '</span></span><span class="right num"><b>' + sm(f.amount) + '</b><br><span class="small muted">' + (f.kind === 'item' ? '' : sm(k.earned) + ' earned') + (f.pct ? ' · ' + f.pct + '%' : '') + '</span></span><span>' + feePill(f) + '<br><span class="small muted">' + esc(feeHow(f)) + '</span></span>' + I('chev', 'sm') + '</div>';
}
function feeTable(list, mode) {
  return '<div class="tlist"><div class="tlh ft-row"><span></span><span>' + (mode === 'mine' ? 'Client' : 'Team member') + '</span><span>For</span><span class="right">Fee</span><span>Payment</span><span></span></div>' + (list.map(f => feeRowHtml(f, mode)).join('') || '<p class="muted" style="padding:16px;margin:0">No fees match.</p>') + '</div>';
}
function payoutTable(list, admin) {
  if (!list.length) return '<p class="muted small" style="margin:0">No payments recorded yet.</p>';
  return '<div class="card scroll" style="padding:4px 8px"><table class="tbl"><thead><tr><th>Paid on</th>' + (admin ? '<th>Paid to</th>' : '') + '<th>For</th><th class="right">Amount</th>' + (admin ? '<th></th>' : '') + '</tr></thead><tbody>' + list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(p => '<tr><td class="num">' + (p.date ? dlong(p.date) : '<span class="muted">Earlier</span>') + '</td>' + (admin ? '<td>' + ((m => m ? vlabel(m) + (isVendor(m) ? ' <span class="chip">Vendor</span>' : '') : 'Removed')(member(p.member))) + '</td>' : '') + '<td class="small">' + (p.invoiceNo || p.file ? '<span class="vinv">' + I('doc', 'sm') + (admin ? 'Their invoice ' : 'Your invoice ') + esc(p.invoiceNo || '') + (p.invoiceDate ? ' · ' + dshort(p.invoiceDate) : '') + (p.file && admin ? ' <a href="/api/vendor-file/' + p.id + '" target="_blank" rel="noopener">' + esc(p.fileName || 'Open') + '</a>' : '') + '</span><br>' : '') + p.lines.map(l => esc(l.label || feeWhere(S.fees.find(f => f.id === l.feeId) || {}).label || 'Fee') + ' <span class="muted">' + sm(l.amount) + '</span>').join('<br>') + (p.note ? '<br><span class="muted">' + esc(p.note) + '</span>' : '') + '</td><td class="right num"><b>' + sm(p.total) + '</b></td>' + (admin ? '<td class="right">' + btn('Undo', 'payout-del', { id: p.id }, 'quiet') + '</td>' : '') + '</tr>').join('') + '</tbody></table></div>';
}
function clientInvState(c) { const rows = rowsFor(c, false).filter(r => !['locked', 'void'].includes(r.state)); if (!rows.length) return 'none'; const un = rows.filter(r => r.state !== 'paid'); return !un.length ? 'paid' : un.some(r => r.state === 'sent' || r.state === 'partial') ? 'sent' : 'pending'; }
const feeWs = (c, f) => f.kind === 'item' ? '__item' : f.kind === 'task' ? ((c.tasks.find(t => t.id === f.taskId) || {}).svc || '') : f.svc;
function costing(c) {
  const q = c.quote, months = q.renewed ? q.months : q.committed, fees = S.fees.filter(f => f.cid === c.id), sum = id => fees.filter(f => feeWs(c, f) === id).reduce((a, f) => a + f.amount, 0);
  const rows = q.lines.map(s => { const n = s.billing === 'once' ? 1 : months; return { name: short(s), detail: s.billing === 'once' ? 'One-off' : money(s.price) + ' × ' + n + ' months', value: s.price * n, fee: sum(s.id) }; });
  let disc = 0; for (let m = 1; m <= months; m++) invLines(c, m).forEach(l => { if (l.disc) disc += l.amount; });
  if (disc) rows.push({ name: 'Discounts', detail: L.discounts(c).map(d => L.discLabel(d, c)).join('; '), value: disc, fee: 0 });
  c.adhoc.forEach(a => rows.push({ name: a.name, detail: 'Ad hoc invoice ' + a.no, value: a.status === 'void' ? 0 : a.amount, fee: a.s ? sum(a.s.id) : 0 }));
  const extra = sum('prep') + sum('general'); if (extra) rows.push({ name: 'Preparation and ad-hoc tasks', detail: 'Not billed separately', value: 0, fee: extra });
  if (sum('__item')) rows.push({ name: 'One-off items', detail: fees.filter(f => f.kind === 'item').map(f => f.item).join(', '), value: 0, fee: sum('__item') });
  const value = rows.reduce((a, r) => a + r.value, 0), fee = rows.reduce((a, r) => a + r.fee, 0);
  return { rows, value, fee, margin: value - fee, months };
}
function costingHtml(c) {
  const k = costing(c), pct = k.value ? Math.round(k.margin / k.value * 100) : 0;
  return '<div class="card stack"><div class="row between"><h2>Project costing</h2><span class="small muted">Admins only</span></div><div class="scroll"><table class="tbl"><thead><tr><th>Deliverable</th><th>Billed to client</th><th class="right">Value</th><th class="right">Team fees</th><th class="right">Margin</th></tr></thead><tbody>' +
    k.rows.map(r => '<tr><td><b>' + esc(r.name) + '</b></td><td class="small muted">' + esc(r.detail) + '</td><td class="right num">' + money(r.value) + '</td><td class="right num">' + (r.fee ? money(r.fee) : '<span class="muted">—</span>') + '</td><td class="right num">' + money(r.value - r.fee) + '</td></tr>').join('') +
    '<tr class="tot"><td colspan="2"><b>Total</b></td><td class="right num"><b>' + money(k.value) + '</b></td><td class="right num"><b>' + money(k.fee) + '</b></td><td class="right num"><b>' + money(k.margin) + '</b> <span class="pill ' + (pct >= 50 ? 'ok' : pct >= 25 ? 'warn' : 'crit') + '">' + pct + '%</span></td></tr></tbody></table></div><p class="small muted" style="margin:0">Value counts all ' + k.months + ' months of the contract' + (L.renewals(c).some(r => r.status === 'accepted') ? ', including renewals' : '') + '. Team fees are everything assigned on this project, earned or not. Open a task to see its own value and cost.</p></div>';
}
function ktile(ic, tone, label, v) { return '<div class="ktile ' + tone + '"><span class="kico">' + I(ic) + '</span><div><span class="klab">' + label + '</span><b class="num">' + sm(v) + '</b></div></div>'; }
const feeMatch = (f, st) => !st || fx(f).state === st;
/* ---------- profit and loss: what came in, what went out and what is left, by month and by project ----------
   work basis: client invoices by the month they are for, team fees by the month of the work (accrual)
   cash basis: client payments by the date received, team payments and deposit refunds by the date paid */
const pk = (y, mo) => y + '-' + String(mo + 1).padStart(2, '0');
const pkIso = iso => /^\d{4}-\d{2}/.test(iso || '') ? String(iso).slice(0, 7) : '';
const pkName = k => { const [y, m] = k.split('-').map(Number); return MONTHS[m - 1] + ' ' + y; };
function pnlEntries(basis, cid) {
  const out = [];
  S.clients.filter(c => !cid || c.id === cid).forEach(c => {
    if (basis === 'work') {
      c.invoices.forEach(i => { if (invLocked(c, i.m) || ['void', 'cancelled'].includes(i.status)) return; const x = ym(c, i.m); const adv = L.depositInv(c) && !L.depSecurity(c) ? L.depositCut(c, i.m) : 0; out.push({ k: pk(x.y, x.mo), cid: c.id, dir: 'in', amount: invTotal(c, i.m) + adv, done: i.status === 'paid' || L.covered(c, i.m) }); });
      c.adhoc.forEach(a => { if (a.deposit || ['void', 'cancelled'].includes(a.status)) return; out.push({ k: pkIso(a.date), cid: c.id, dir: 'in', amount: a.amount, done: a.status === 'paid' }); });
    } else {
      rowsFor(c, false).forEach(r => { if (r.parts.length) { r.parts.forEach(q => { if (q.amount - (q.fromDeposit || 0) > 0) out.push({ k: pkIso(q.date), cid: c.id, dir: 'in', amount: q.amount - (q.fromDeposit || 0), done: true }); }); return; } if (r.state !== 'paid') return; const src = r.data.id ? c.adhoc.find(a => a.id === r.data.id) : c.invoices.find(i => i.m === r.data.m), d = src && src.pay && src.pay.date ? src.pay.date : src && src.paidAt ? src.paidAt : '', dep = src && src.pay && src.pay.mode === 'deposit' ? src.pay.fromDeposit || 0 : 0; if (r.amount - dep > 0) out.push({ k: pkIso(d), cid: c.id, dir: 'in', amount: r.amount - dep, done: true }); });
      const di = L.depositInv(c); (di && di.uses || []).filter(u => u.type === 'refund').forEach(u => out.push({ k: pkIso(u.date), cid: c.id, dir: 'out', amount: u.amount, done: true, refund: true }));
    }
  });
  S.clients.filter(c => !cid || c.id === cid).forEach(c => (c.expenses || []).forEach(x => out.push({ k: pkIso(x.date), cid: c.id, dir: 'out', amount: x.amount, done: true, paid: x.amount, exp: true })));
  if (basis === 'work') S.fees.filter(f => !cid || f.cid === cid).forEach(f => { const c = S.clients.find(x => x.id === f.cid); let k = pkIso(f.created); if (c) { const t = f.kind === 'task' && c.tasks.find(z => z.id === f.taskId), m = f.kind === 'task' ? t && t.m : f.kind === 'item' ? 0 : f.m; if (m) { const x = ym(c, m); k = pk(x.y, x.mo); } } const st = fx(f); out.push({ k, cid: f.cid, dir: 'out', amount: f.amount, done: st.paid >= f.amount, paid: Math.min(st.paid, f.amount), earned: st.earned, fee: true }); });
  else S.payouts.forEach(p => p.lines.forEach(l => { const f = S.fees.find(z => z.id === l.feeId); out.push({ k: pkIso(p.date), cid: f ? f.cid : '', dir: 'out', amount: l.amount, done: true }); }));
  return out.filter(e => e.amount && (!cid || e.cid === cid));
}
function pnlSection() {
  const st = (S.pl = S.pl || {}).all = S.pl.all || {}, cash = st.b === 'cash', basis = cash ? 'cash' : 'work', yr = String(new Date().getFullYear()), per = st.p || 'y:' + yr, all = pnlEntries(basis);
  const keys = [...new Set(all.map(e => e.k).filter(Boolean))].sort(), years = [...new Set(keys.map(k => k.slice(0, 4)))];
  if (!years.includes(yr)) years.push(yr); years.sort();
  const inPer = e => per === 'all' ? true : per.startsWith('y:') ? e.k.startsWith(per.slice(2)) : e.k === per.slice(2);
  const list = all.filter(inPer), tot = d => list.filter(e => e.dir === d).reduce((a, e) => a + e.amount, 0), tin = tot('in'), tout = tot('out'), left = tin - tout, pct = tin ? Math.round(left / tin * 100) : 0;
  const notIn = list.filter(e => e.dir === 'in' && !e.done).reduce((a, e) => a + e.amount, 0), notOut = list.filter(e => e.dir === 'out' && !e.done).reduce((a, e) => a + e.amount, 0);
  const opts = [['all', 'All time'], ...years.slice().reverse().map(y => ['y:' + y, 'Year ' + y]), ...keys.slice().reverse().map(k => ['m:' + k, pkName(k)])];
  const tiles = '<div class="grid g3">' + pltile(cash ? 'Received' : 'Billed to clients', tin, cash ? 'Payments from clients' : notIn ? sm(notIn) + ' not paid yet' : tin ? 'All paid' : '', 'in') + pltile(cash ? 'Paid out' : 'Team and vendor fees', tout, cash ? 'To the team, vendors and refunds' : notOut ? sm(notOut) + ' not paid yet' : tout ? 'All paid' : '', 'out') + pltile(cash ? (left >= 0 ? 'Left' : 'Short') : (left >= 0 ? 'Profit' : 'Loss'), left, tin ? pct + '% margin' : 'Nothing billed in this period', left >= 0 ? 'ok' : 'bad') + '</div>';
  const mk = per.startsWith('m:') ? [] : keys.filter(k => per === 'all' || k.startsWith(per.slice(2)));
  const byMonth = mk.length > 1 ? '<details class="faq"><summary>See each month</summary>' + monthTable(mk.map(k => { const es = all.filter(e => e.k === k); return { k, i: es.filter(e => e.dir === 'in').reduce((a, e) => a + e.amount, 0), o: es.filter(e => e.dir === 'out').reduce((a, e) => a + e.amount, 0) }; }), cash ? ['Received', 'Paid out', 'Left'] : ['Billed', 'Fees', 'Profit'], true) + '</details>' : '';
  const undated = cash ? all.filter(e => !e.k).length : 0;
  return '<div class="card stack plcard"><div class="row between" style="align-items:center"><div><h2>Profit and loss</h2><p class="muted small" style="margin:2px 0 0">' + (cash ? 'Money that actually moved, by the date it was paid.' : 'All projects: what was billed for the period, less the team fees for that work.') + '</p></div><div class="row"><label class="opt plsw' + (cash ? ' on' : '') + '"><input type="checkbox" data-a="pl-cash"' + (cash ? ' checked' : '') + '><span>Show cash only</span></label><select data-plp="all" aria-label="Period" style="width:auto">' + opts.map(([v, l]) => '<option value="' + v + '"' + (per === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div></div>' + tiles + byMonth + (undated ? '<p class="small muted" style="margin:0">' + undated + ' payment' + (undated === 1 ? ' has' : 's have') + ' no date recorded, so ' + (undated === 1 ? 'it shows' : 'they show') + ' only under All time.</p>' : '') + '</div>';
}
function pltile(lab, v, sub, tone) { return '<div class="pltile ' + tone + '"><span class="klab">' + lab + '</span><b class="num">' + (v < 0 ? '−' : '') + sm(Math.abs(v)) + '</b><span class="small muted">' + (sub || '&nbsp;') + '</span></div>'; }
function monthTable(rows, cols, click) {
  const mx = Math.max(1, ...rows.map(r => Math.max(r.i, r.o))), bar = (v, cls) => '<span class="plbar ' + cls + '" style="width:' + Math.round(v / mx * 100) + '%"></span>', neg = v => v < 0 ? '<span style="color:var(--crit)">−' + sm(-v) + '</span>' : sm(v);
  return '<div class="pltable"><div class="plh"><span>Month</span><span></span><span class="num">' + cols[0] + '</span><span class="num">' + cols[1] + '</span><span class="num">' + cols[2] + '</span></div>' + rows.map(r => (click ? '<button class="plr" data-a="pl-per" data-p="m:' + r.k + '">' : '<div class="plr">') + '<span>' + pkName(r.k) + '</span><span class="plbars">' + bar(r.i, 'in') + bar(r.o, 'out') + '</span><span class="num">' + sm(r.i) + '</span><span class="num">' + (r.o ? sm(r.o) : '<span class="muted">—</span>') + '</span><b class="num">' + neg(r.i - r.o) + '</b>' + (click ? '</button>' : '</div>')).join('') + '</div>';
}
/* one project's account: summary, then invoices, profit and payments */
function projMoney(c) {
  const w = pnlEntries('work', c.id), k = pnlEntries('cash', c.id), sum = (l, f) => l.filter(f).reduce((a, e) => a + e.amount, 0);
  const billed = sum(w, e => e.dir === 'in'), fees = sum(w, e => e.dir === 'out');
  return { billed, received: sum(k, e => e.dir === 'in'), collect: sum(w, e => e.dir === 'in' && !e.done), fees, paidOut: sum(k, e => e.dir === 'out' && !e.refund), profit: billed - fees, pct: billed ? Math.round((billed - fees) / billed * 100) : 0, w };
}
function acctPage(c) {
  const q = c.quote, sibs = S.clients.filter(x => x.aid === c.aid), w = pnlEntries('work', c.id), per = (S.apper && S.apper.cid === c.id) ? S.apper : { cid: c.id, mode: 'month', k: '' };
  const keys = [...new Set(w.map(e => e.k).filter(Boolean))].sort(), now = pk(new Date().getFullYear(), new Date().getMonth()), mk = per.k && keys.includes(per.k) ? per.k : keys.includes(now) ? now : keys[0] || '';
  const whole = per.mode === 'all' || !mk, list = whole ? w : w.filter(e => e.k === mk), sum = f => list.filter(f).reduce((a, e) => a + e.amount, 0);
  const income = sum(e => e.dir === 'in'), feesT = sum(e => e.fee), expT = sum(e => e.exp), costs = feesT + expT, result = income - costs, margin = income ? Math.round(result / income * 1000) / 10 : 0;
  const recv = list.filter(e => e.dir === 'in' && e.done).reduce((a, e) => a + e.amount, 0), tPaid = list.filter(e => e.fee).reduce((a, e) => a + (e.paid || 0), 0);
  const neg = v => (v < 0 ? '−' : '') + sm(Math.abs(v));
  const head = '<button class="link row" style="gap:6px" data-a="nav" data-v="billing">' + I('back', 'sm') + 'Accounts</button><div class="row between" style="align-items:center"><div class="row" style="gap:16px;flex-wrap:nowrap">' + logoTile(c.company, c.logo) + '<div class="stack" style="gap:6px"><h1>' + esc(c.company) + '</h1><label class="row small muted" style="gap:10px">Project <select data-acctproj="1" class="projsel">' + sibs.map(x => '<option value="' + x.id + '"' + (x.id === c.id ? ' selected' : '') + '>' + esc(pname(x)) + '</option>').join('') + '</select></label></div></div><div class="row">' + btn('View quotation', 'doc', { type: 'quote', cid: c.id }, 'quiet', !q.lines.length) + (!['accepted', 'cancelled'].includes(q.status) ? btn('Edit quotation', 'quote-open', { id: c.id }, 'ghost') : '') + btn('Open project', 'open-client-tab', { id: c.id, t: 'overview' }, 'ghost') + '</div></div>';
  // 1. P&L
  const pickers = '<div class="row" style="gap:10px"><label class="row small muted" style="gap:8px">Period <select data-apmode="1" style="width:auto"><option value="month"' + (!whole ? ' selected' : '') + (keys.length ? '' : ' disabled') + '>By month</option><option value="all"' + (whole ? ' selected' : '') + '>Whole project</option></select></label>' + (!whole ? '<label class="monthpick">' + I('cal', 'sm') + '<select data-apk="1" aria-label="Month">' + keys.map(k => '<option value="' + k + '"' + (k === mk ? ' selected' : '') + '>' + pkName(k) + '</option>').join('') + '</select></label>' : '') + '</div>';
  const line = (l, v, cls) => '<div class="row between ' + (cls || '') + '"><span>' + l + '</span><b class="num">' + neg(v) + '</b></div>';
  const plCard = '<div class="card stack plbox"><div class="plnote">' + I('info', 'sm') + 'Based on costs entered for ' + (whole ? 'the whole project' : 'this month') + '.</div>' + line('Project income', income, 'plbig') + '<div class="stack" style="gap:6px">' + line('Project costs', costs, 'plbig') + line('Recorded team fees', feesT, 'plsub') + line('Other expenses', expT, 'plsub') + '</div><div class="plresult ' + (result < 0 ? 'bad' : '') + '"><div><b>' + (result < 0 ? 'Estimated loss' : 'Estimated result') + '</b><span class="small muted">' + (income ? margin + '% margin' : 'Nothing billed yet') + '</span></div><b class="num">' + neg(result) + '</b></div></div>';
  const prow = (ic, l, v, tone) => '<div class="porow"><span class="poic ' + (tone || '') + '">' + I(ic, 'sm') + '</span><span>' + l + '</span><b class="num' + (tone === 'gold' && v ? ' goldtxt' : '') + '">' + sm(v) + '</b></div>';
  const payCard = '<div class="card stack"><h2>Payment overview</h2>' + prow('dl', 'Client received', recv) + prow('hourglass', 'Outstanding', income - recv, 'gold') + prow('ul', 'Team paid', tPaid) + prow('hourglass', 'Team unpaid', feesT - tPaid, 'gold') + '</div>';
  const sec1 = '<section class="stack" style="gap:14px"><div class="row between"><h1 class="sech">Project P&amp;L</h1>' + pickers + '</div><div class="grid plgrid">' + plCard + payCard + '</div>' + (!whole ? '<button class="link row" style="gap:6px;align-self:flex-start" data-a="ap-all">' + I('doc', 'sm') + 'View full project</button>' : '') + '</section>';
  // 2. invoices
  const rows = rowsFor(c, false), key = r => 'inv:' + r.c.id + ':' + (r.data.id || r.data.m);
  const mi = (ic, label, a, d) => '<button class="mi" data-a="' + a + '" ' + Object.entries(d).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + '>' + I(ic, 'sm') + '<span>' + label + '</span></button>';
  const irow = r => { const open = !['locked', 'paid', 'void'].includes(r.state), pay = { cid: r.c.id, pa: r.paidA, m: r.data.m || '', id: r.data.id || '' }, items = (open && r.state === 'pending' ? mi('send', 'Mark as sent', r.sentA, r.data) : '') + (open ? mi('tick', 'Mark as paid', 'pay-open', pay) : '') + (r.state === 'void' ? '' : mi('edit', 'Change invoice number', 'num-open', Object.assign({ k: 'i', cid: r.c.id }, r.data.id ? { id: r.data.id } : { m: r.data.m })));
    return '<div class="ivr"><span class="num">' + esc(r.no) + '<span class="small muted ivfor">' + esc(r.label) + '</span></span><span class="num">' + esc(String(r.due).replace(/ \d{4}$/, '')) + '</span><span class="num">' + sm(r.amount) + '</span><span>' + pill(r.state) + '</span><span class="row" style="gap:6px;justify-content:flex-end;flex-wrap:nowrap"><button class="link" data-a="doc" ' + Object.entries(r.docData).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + '>View</button>' + (items ? '<span style="position:relative"><button class="iconbtn" data-a="menu" data-m="' + key(r) + '" aria-label="More for invoice ' + esc(r.no) + '">⋯</button>' + (S.menu === key(r) ? '<div class="menu imenu">' + items + '</div>' : '') + '</span>' : '') + '</span></div>'; };
  const sec2 = '<section class="stack" style="gap:14px"><div class="row between"><h1 class="sech">Invoices</h1>' + btn(I('plus', 'sm') + 'New invoice', 'inv-new') + '</div>' + depositCard(c, false) + '<div class="card ftable"><div class="ivr ivh"><span>Invoice</span><span>Due</span><span>Amount</span><span>Status</span><span class="right">Action</span></div>' + (rows.map(irow).join('') || '<p class="muted" style="margin:0;padding:16px 22px">No invoices yet. They are created when the quotation is accepted.</p>') + '</div></section>';
  // 3. team fees
  const fees = S.fees.filter(f => f.cid === c.id), frow = f => { const m = member(f.member), wh = feeWhere(f); return '<button class="fvr" data-a="fee-edit" data-id="' + f.id + '"><span class="row" style="gap:12px;flex-wrap:nowrap">' + avatar(f.member) + esc(m ? m.name : 'Removed') + '</span><span>' + esc(f.kind === 'task' ? (wh.step ? wh.step : wh.label) : f.kind === 'item' ? f.item : wh.label || feeLabel(c, f)) + '<span class="small muted fvsub">' + esc(f.kind === 'month' ? 'Monthly sum' + (f.m ? ' · ' + mName(c, f.m) : '') : f.kind === 'item' ? 'One-off item' : 'Per task') + '</span></span><span class="num">' + sm(f.amount) + '</span><span>' + feePill(f) + '</span></button>'; };
  const sec3 = '<section class="stack" style="gap:14px"><div class="row between"><h1 class="sech">Team fees</h1>' + btn(I('plus', 'sm') + 'Add fee', 'fee-new', { cid: c.id }) + '</div><div class="card ftable"><div class="fvr fvh"><span>Team member</span><span>Work</span><span>Fee</span><span>Payment</span></div>' + (fees.map(frow).join('') || '<p class="muted" style="margin:0;padding:16px 22px">No team fees yet.</p>') + '</div></section>';
  // 4. expenses
  const ex = (c.expenses || []).slice().sort((a, b) => b.date.localeCompare(a.date)), sel = ex.find(x => x.id === S.expSel) || ex[0], eic = x => /photo|shoot|video|camera/i.test(x.name + ' ' + x.category) ? 'camera' : /print|brochure|flyer|banner/i.test(x.name + ' ' + x.category) ? 'printer' : 'coins';
  const exList = '<div class="card ftable"><div class="exr exh"><span>Expense</span><span class="right">Amount</span></div>' + ex.map(x => '<button class="exr' + (sel && sel.id === x.id ? ' on' : '') + '" data-a="exp-sel" data-id="' + x.id + '"><span class="row" style="gap:12px;flex-wrap:nowrap">' + I(eic(x)) + esc(x.name) + '</span><span class="num right">' + sm(x.amount) + '</span></button>').join('') + '<div class="extot"><b>Total</b><b class="num">' + sm(ex.reduce((a, x) => a + x.amount, 0)) + '</b></div></div>';
  const drow = (ic, l, v) => '<div class="exd"><span class="row" style="gap:10px">' + I(ic, 'sm') + l + '</span><span>' + v + '</span></div>';
  const exDet = sel ? '<div class="card stack"><div class="row between"><h2>Expense details</h2><div class="row" style="gap:6px">' + btn(I('edit', 'sm') + 'Edit', 'exp-edit', { id: sel.id }, 'quiet') + '</div></div>' + drow('tag', 'Category', esc(sel.category || '—')) + drow('cal', 'Date', dlong(sel.date)) + drow('doc', 'Receipt', sel.file ? '<a class="link" href="/api/receipt/' + c.id + '/' + sel.id + '" target="_blank" rel="noopener">' + I('doc', 'sm') + esc(sel.fileName || 'Receipt') + '</a>' : '<span class="muted">None attached</span>') + drow('user', 'Paid by', esc(sel.paidBy || 'Gioia')) + (sel.note ? '<p class="small muted" style="margin:0">' + esc(sel.note) + '</p>' : '') + '</div>' : '';
  const sec4 = '<section class="stack" style="gap:14px"><div class="row between"><h1 class="sech">Project expenses</h1>' + btn(I('plus', 'sm') + 'Add expense', 'exp-new') + '</div>' + (ex.length ? '<div class="grid exgrid">' + exList + exDet + '</div>' : '<div class="card"><p class="muted" style="margin:0">No expenses yet. Add costs other than team fees, such as printing or a photoshoot. They are counted in the project P&amp;L.</p></div>') + '</section>';
  return '<div class="stack acctpg" style="gap:34px"><div class="stack" style="gap:14px">' + head + '</div>' + sec1 + sec2 + sec3 + sec4 + '</div>';
}
function expModal(M) {
  const c = S.clients.find(x => x.id === M.cid), e = M.id && c ? (c.expenses || []).find(x => x.id === M.id) : null, v = (k, d) => esc(e ? e[k] : d || '');
  const cats = ['Marketing & creative', 'Printing', 'Advertising spend', 'Software & tools', 'Transport', 'Other'];
  return '<div class="modal" data-a="close-bg-modal"><div class="sheet" style="max-width:520px"><div class="row between"><h2>' + (e ? 'Edit expense' : 'Add an expense') + '</h2><button class="iconbtn" data-a="close-modal" aria-label="Close">' + I('x') + '</button></div><div class="stack" style="gap:14px">' +
    (M.pick ? '<div class="field"><label for="ex-cid">Project <span class="req">*</span></label><select id="ex-cid">' + S.clients.map(x => '<option value="' + x.id + '">' + esc(x.company + ' · ' + pname(x)) + '</option>').join('') + '</select></div>' : '') + field('ex-name', 'What it was for', e ? e.name : '', 'text', true) + '<div class="meta"><div class="field"><label for="ex-amt">Amount (S$) <span class="req">*</span></label><input id="ex-amt" type="number" min="0" step="0.01" value="' + v('amount') + '"></div><div class="field"><label for="ex-date">Date <span class="req">*</span></label><input id="ex-date" type="date" value="' + v('date', new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10)) + '"></div></div>' +
    '<div class="meta"><div class="field"><label for="ex-cat">Category</label><select id="ex-cat">' + cats.map(x => '<option' + ((e ? e.category : cats[0]) === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' + field('ex-by', 'Paid by', e ? e.paidBy : 'Gioia') + '</div>' +
    '<div class="field"><span class="lab">Receipt</span>' + (e && e.file && !M.drop ? '<div class="row between"><span class="small">' + I('doc', 'sm') + esc(e.fileName || 'Receipt') + '</span><button class="link small" data-a="exp-dropfile">Remove</button></div>' : '<input type="file" id="ex-file" accept="image/*,application/pdf">') + '</div>' + field('ex-note', 'Note (optional)', e ? e.note : '') +
    '<div class="row">' + btn('Save expense', 'exp-save') + (e ? btn('Delete', 'exp-del', { id: e.id }, 'quiet') : '') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div></div>';
}
/* ---------- Accounts: a short overview, with each detailed list on its own page ----------
   income is recognised in the month it is scheduled (each monthly invoice, one-off services in the month of their invoice);
   costs in the month of the work (team and vendor fees) or on their own date (expenses). Deposits are never income. */
const isVen = m => !!m && !m.admin && (m.kind === 'vendor' || !!m.company || !!m.what);
const nowKey = () => pk(new Date().getFullYear(), new Date().getMonth());
function aPer() { if (!S.ap) S.ap = { mode: 'm', m: nowKey(), y: nowKey().slice(0, 4) }; return S.ap; }
const inP = (k, p) => !!k && (p.mode === 'all' || (p.mode === 'y' ? k.startsWith(p.y) : k === p.m));
const perName = p => p.mode === 'all' ? 'the whole project' : p.mode === 'y' ? p.y : pkName(p.m);
function allKeys() { return [...new Set(pnlEntries('work').concat(pnlEntries('cash')).map(e => e.k).filter(Boolean).concat([nowKey()]))].sort(); }
function perPicker(full) {
  const p = aPer(), ks = allKeys(), ys = [...new Set(ks.map(k => k.slice(0, 4)))], mode = full && S.pfull ? 'all' : p.mode;
  const seg = '<div class="seg pseg">' + [['m', 'Monthly'], ['y', 'Yearly']].concat(full ? [['all', 'Full project']] : []).map(([v, l]) => '<button data-a="ap-mode" data-m="' + v + '" aria-pressed="' + (mode === v) + '">' + l + '</button>').join('') + '</div>';
  const sel = mode === 'all' ? '' : '<label class="monthpick">' + I('cal', 'sm') + '<select data-apsel="1" aria-label="Period">' + (mode === 'y' ? ys.slice().reverse().map(y => '<option value="' + y + '"' + (y === p.y ? ' selected' : '') + '>' + y + '</option>') : ks.slice().reverse().map(k => '<option value="' + k + '"' + (k === p.m ? ' selected' : '') + '>' + pkName(k) + '</option>')).join('') + '</select></label>';
  return '<div class="row" style="gap:10px">' + seg + sel + '</div>';
}
function feeKey(f) { const c = S.clients.find(x => x.id === f.cid); let k = pkIso(f.created); if (c) { const t = f.kind === 'task' && c.tasks.find(z => z.id === f.taskId), m = f.kind === 'task' ? t && t.m : f.kind === 'item' ? 0 : f.m; if (m) { const x = ym(c, m); k = pk(x.y, x.mo); } } return k; }
function incomeItems(p, cid) { return pnlEntries('work', cid).filter(e => e.dir === 'in' && inP(e.k, p)); }
function costItems(p, cid) {
  const out = [];
  S.fees.filter(f => (!cid || f.cid === cid)).forEach(f => { const k = feeKey(f); if (!inP(k, p)) return; const m = member(f.member), c = S.clients.find(x => x.id === f.cid), st = fx(f), w = feeWhere(f); out.push({ cat: isVen(m) ? 'vendor' : 'team', k, cid: f.cid, c, who: m ? m.name + (m.company && m.company !== m.name ? ' (' + m.company + ')' : '') : 'Removed', desc: f.kind === 'item' ? f.item : f.kind === 'task' ? (w.step || w.label) : (w.label || ''), amount: f.amount, earned: st.earned, paid: Math.min(st.paid, f.amount), status: st.state, fee: f }); });
  S.clients.filter(c => !cid || c.id === cid).forEach(c => (c.expenses || []).forEach(x => { const k = pkIso(x.date); if (!inP(k, p)) return; out.push({ cat: 'exp', k, cid: c.id, c, who: x.paidBy || 'Gioia', desc: x.name + (x.category ? ' · ' + x.category : ''), amount: x.amount, earned: x.amount, paid: x.amount, status: 'paid', exp: x }); }));
  return out;
}
const CATS = { team: 'Team fees', vendor: 'Vendor fees', exp: 'Other expenses' };
const sumA = l => l.reduce((a, e) => a + e.amount, 0);
const sneg = v => (v < 0 ? '−' : '') + sm(Math.abs(v));
function aHead(title, sub, back, right) { return '<button class="link row" style="gap:6px" data-a="asub" data-s="' + (back || '') + '">' + I('back', 'sm') + (back ? 'Back' : 'Accounts') + '</button><div class="row between" style="align-items:flex-end"><div><h1>' + title + '</h1>' + (sub ? '<p class="muted" style="margin:4px 0 0">' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>'; }
const sumRow = (l, v, a, d, cls) => '<' + (a ? 'button data-a="' + a + '" ' + Object.entries(d || {}).map(([k, x]) => 'data-' + k + '="' + esc(x) + '"').join(' ') : 'div') + ' class="srow' + (cls ? ' ' + cls : '') + '"><span>' + l + '</span><b class="num">' + sneg(v) + (a ? ' ' + I('chev', 'sm') : '') + '</b></' + (a ? 'button' : 'div') + '>';
const totRow = (l, v) => '<div class="stot' + (v < 0 ? ' bad' : '') + '"><b>' + l + '</b><b class="num">' + sneg(v) + '</b></div>';
function deposHeld() { let sec = 0, adv = 0; S.clients.forEach(c => { const di = L.depositInv(c); if (!di || di.status !== 'paid') return; const b = L.depBalance(c); if (L.depSecurity(c)) sec += b; else adv += b; }); return { sec, adv }; }

const sideNav = items => '<div class="clinks pplinks">' + items.map(([l, a, d, ic]) => '<button class="cdrow" data-a="' + a + '" ' + Object.entries(d || {}).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + '>' + I(ic) + '<span>' + l + '</span><span></span>' + I('chev', 'sm') + '</button>').join('') + '</div>';
function billingPage() {
  const sub = S.asub || '';
  if (sub === 'income') return incomePage();
  if (sub === 'costs') return costsPage();
  if (sub === 'costcat') return costCatPage();
  if (sub === 'project') return projPLPage();
  if (sub === 'projects') return projListPage();
  if (sub === 'invoices') return invoicesPage();
  if (sub === 'fees') return feesPage();
  if (sub === 'teaminv') return teamInvPage();
  if (sub === 'history') return historyPage();
  if (sub === 'deposits') return depositsPage();
  if (sub === 'audit') return auditPage();
  const p = aPer(), inc = sumA(incomeItems(p)), cost = sumA(costItems(p)), prof = inc - cost, dep = deposAt(p.mode === 'y' ? p.y + '-12' : p.m);
  const all = S.clients.flatMap(c => rowsFor(c, false)), endK = p.mode === 'y' ? p.y + '-12' : p.m;
  const billed = sumA(pnlEntries('work').filter(e => e.dir === 'in' && inP(e.k, p))), received = sumA(pnlEntries('cash').filter(e => e.dir === 'in' && inP(e.k, p)));
  const outstanding = all.filter(r => r.owed > 0 && (r.data.m ? (x => pk(x.y, x.mo))(ym(r.c, r.data.m)) : pkIso(r.due) || '0000') <= endK).reduce((a, r) => a + r.owed, 0);
  const pl = '<div class="card stack aplcard"><div class="row between" style="align-items:center"><div><h2 class="aph">Overall P&amp;L</h2><p class="muted small" style="margin:2px 0 0">Income and costs for ' + perName(p) + '.</p></div>' + perPicker(false) + '</div><div class="ppgrid"><div class="sbox">' + sumRow('Recognised income', inc, 'asub', { s: 'income' }) + sumRow('Costs', cost, 'asub', { s: 'costs' }) + totRow(prof < 0 ? 'Estimated loss' : 'Estimated profit', prof) + '</div><div class="cside">' + sideNav([['Income by client', 'asub', { s: 'income' }, 'users'], ['Costs by category', 'asub', { s: 'costs' }, 'coins'], ['Project P&amp;L', 'asub', { s: 'projects' }, 'building'], ['View deposits', 'asub', { s: 'deposits' }, 'lock']]) + '</div></div></div>';
  const money = '<div class="card stack"><h2 class="aph" style="font-size:20px">Money in ' + perName(p) + '</h2><div class="mline">' + [['Billed to clients', billed, 'Invoices scheduled for the period'], ['Received', received, 'Payments that came in'], ['Outstanding', outstanding, 'Unpaid invoices due by the end of the period'], ['Deposits held at ' + endName(p), dep.sec + dep.adv, (dep.sec ? sm(dep.sec) + ' security' : '') + (dep.sec && dep.adv ? ' · ' : '') + (dep.adv ? sm(dep.adv) + ' advance' : '') || 'Not counted as income']].map(([l, v, s]) => '<div><span class="small muted">' + l + '</span><b class="num">' + sm(v) + '</b><span class="small muted">' + s + '</span></div>').join('') + '</div></div>';
  const owing = S.fees.reduce((a, f) => a + fx(f).owed, 0), toReview = (S.bills || []).filter(b => ['submitted', 'approved', 'queried'].includes(b.status)).length, unpaid = all.filter(r => r.owed > 0).length;
  const qt = (ic, l, sub2, s) => '<button class="qtile" data-a="asub" data-s="' + s + '">' + I(ic) + '<span><b>' + l + '</b><span class="small muted">' + sub2 + '</span></span>' + I('chev', 'sm') + '</button>';
  const quick = '<div class="grid g3">' + qt('building', 'Client projects', S.clients.length + ' project' + (S.clients.length === 1 ? '' : 's') + ', profit for each', 'projects') + qt('doc', 'Invoices & payments', unpaid + ' unpaid invoice' + (unpaid === 1 ? '' : 's'), 'invoices') + qt('coins', 'Team & vendor fees', sm(owing) + ' owing now', 'fees') + qt('send', 'Team invoices', toReview ? toReview + ' to review or pay' : 'Nothing to review', 'teaminv') + qt('clock', 'Payment history', S.payouts.length + ' payment' + (S.payouts.length === 1 ? '' : 's') + ' to the team', 'history') + qt('receipt', 'Deposits', sm(dep.sec + dep.adv) + ' held at ' + endName(p), 'deposits') + qt('refresh', 'Change history', 'Who changed financial records, and when', 'audit') + qt('download', 'Export for finance', 'Excel workbook for ' + perName(p), 'export') + '</div>';
  return '<div class="row between"><div><h1>Accounts</h1><p class="muted" style="margin:4px 0 0">Your business finances at a glance.</p></div><div class="row">' + btn(I('download', 'sm') + 'Export for finance', 'acc-xlsx', {}, 'ghost') + btn(I('doc', 'sm') + 'New invoice', 'inv-new') + '</div></div>' + pl + money + quick;
}
function incomePage() {
  const p = aPer(), items = incomeItems(p), tot = sumA(items), byA = {};
  items.forEach(e => { const c = S.clients.find(x => x.id === e.cid); if (!c) return; const a = byA[c.aid] = byA[c.aid] || { name: c.company, aid: c.aid, total: 0, ps: {} }; a.total += e.amount; a.ps[c.id] = (a.ps[c.id] || 0) + e.amount; });
  const list = Object.values(byA).sort((a, b) => b.total - a.total), open = S.incOpen || [];
  const rows = list.map(a => { const isOpen = open.includes(a.aid), n = Object.keys(a.ps).length; return '<button class="srow" data-a="inc-toggle" data-id="' + a.aid + '" aria-expanded="' + isOpen + '"><span>' + esc(a.name) + ' <span class="small muted">' + n + ' project' + (n === 1 ? '' : 's') + '</span></span><b class="num">' + sm(a.total) + ' ' + I(isOpen ? 'chevd' : 'chev', 'sm') + '</b></button>' + (isOpen ? Object.entries(a.ps).map(([id, v]) => { const c = S.clients.find(x => x.id === id); return '<button class="srow sub" data-a="acct-open" data-id="' + id + '"><span>' + esc(pname(c)) + ' <span class="small muted">' + (a.total ? Math.round(v / a.total * 100) : 0) + '% of the client</span></span><b class="num">' + sm(v) + ' ' + I('chev', 'sm') + '</b></button>'; }).join('') : ''); }).join('');
  return aHead('Income by client', 'Recognised income for ' + perName(p) + '.', '', perPicker(false)) + '<div class="ppgrid"><div class="card stack"><div class="sbox">' + (rows || '<p class="muted" style="margin:0;padding:12px 0">No income recognised for this period.</p>') + totRow('Total', tot) + '</div></div><div class="cside">' + sideNav([['View projects', 'asub', { s: 'projects' }, 'building'], ['Costs by category', 'asub', { s: 'costs' }, 'coins'], ['Invoices &amp; payments', 'asub', { s: 'invoices' }, 'receipt'], ['View deposits', 'asub', { s: 'deposits' }, 'lock']]) + '</div></div>';
}
function costsPage() {
  const p = aPer(), items = costItems(p), by = k => sumA(items.filter(e => e.cat === k));
  return aHead('Costs by category', 'Project costs for ' + perName(p) + '. Each cost is counted once, from the fee or expense itself.', '', perPicker(false)) + '<div class="ppgrid"><div class="card stack"><div class="sbox">' + Object.entries(CATS).map(([k, l]) => sumRow(l + ' <span class="small muted">' + items.filter(e => e.cat === k).length + '</span>', by(k), 'acat', { c: k })).join('') + totRow('Total', sumA(items)) + '</div></div><div class="cside">' + sideNav([['Income by client', 'asub', { s: 'income' }, 'users'], ['Team &amp; vendor fees', 'asub', { s: 'fees' }, 'coins'], ['Payment history', 'asub', { s: 'history' }, 'clock'], ['Project P&amp;L', 'asub', { s: 'projects' }, 'building']]) + '</div></div>';
}
function costCatPage() {
  const p = aPer(), cat = S.acat || 'team', items = costItems(p, S.afc || '').filter(e => e.cat === cat).sort((a, b) => a.k.localeCompare(b.k));
  const stp = e => e.exp ? '<span class="pill ok">' + I('tick', 'sm') + 'Paid</span>' : feePill(e.fee);
  const rows = items.map(e => '<button class="ccr" data-a="' + (e.exp ? 'exp-edit2' : 'fee-edit') + '" data-id="' + (e.exp ? e.exp.id : e.fee.id) + '" data-cid="' + e.cid + '"><span><b>' + esc(e.who) + '</b></span><span>' + (e.c ? '<span class="ell">' + esc(e.c.company) + '</span><span class="ell small muted">' + esc(pname(e.c)) + '</span>' : '') + '</span><span><span class="ell">' + esc(e.desc) + '</span><span class="small muted">' + pkName(e.k) + '</span></span><span class="num right">' + sm(e.amount) + '</span><span class="num right">' + sm(e.paid) + '</span><span>' + stp(e) + '</span></button>').join('');
  const fc = S.afc ? S.clients.find(x => x.id === S.afc) : null;
  return aHead(CATS[cat], (fc ? esc(fc.company) + ' · ' + esc(pname(fc)) + ' · ' : '') + perName(p) + '.', 'costs', '<div class="row">' + perPicker(false) + (cat === 'exp' ? btn(I('plus', 'sm') + 'Add expense', 'exp-new2') : btn(I('plus', 'sm') + 'Add fee', 'fee-new', fc ? { cid: fc.id } : {})) + '</div>') +
    '<div class="card ftable"><div class="ccr cch"><span>' + (cat === 'exp' ? 'Paid by' : cat === 'vendor' ? 'Vendor' : 'Team member') + '</span><span>Client and project</span><span>Description</span><span class="right">Amount</span><span class="right">Paid</span><span>Status</span></div>' + (rows || '<p class="muted" style="margin:0;padding:16px 22px">Nothing in this category for the period.</p>') + '<div class="extot"><b>Total</b><b class="num">' + sm(sumA(items)) + '</b></div></div>';
}
function projListPage() {
  const rows = S.clients.slice().sort((a, b) => a.company.localeCompare(b.company) || pname(a).localeCompare(pname(b))).map(c => { const pm = projMoney(c); return '<button class="tli ca-row" data-a="acct-open" data-id="' + c.id + '"><span class="ticon">' + logoTile(c.company, c.logo, 'width:38px;height:38px;font-size:14px;border-radius:9px') + '</span><span><b>' + esc(c.company) + '</b><br><span class="small muted">' + esc(pname(c)) + ' · ' + esc(c.quote.no) + ' ' + STATUS[c.quote.status] + '</span></span><span class="num">' + sm(costing(c).value) + '</span><span class="num">' + sm(pm.billed) + '</span><span class="num">' + (pm.collect ? '<span class="pill gold" style="font-size:13px">' + sm(pm.collect) + '</span>' : '<span class="muted">S$0</span>') + '</span><span class="num">' + (pm.billed || pm.fees ? '<b' + (pm.profit < 0 ? ' style="color:var(--crit)"' : '') + '>' + sm(pm.profit) + '</b>' + (pm.billed ? '<br><span class="small muted">' + pm.pct + '%</span>' : '') : '<span class="muted">—</span>') + '</span><span class="right">' + I('chev', 'sm') + '</span></button>'; }).join('');
  return aHead('Client projects', 'Every project with its value and expected profit. Click one for its P&amp;L.', '', btn(I('plus', 'sm') + 'New project', 'wz-new', {}, 'ghost')) + '<div class="tlist"><div class="tlh ca-row"><span></span><span>Client and project</span><span class="num">Agreed value</span><span class="num">Billed</span><span class="num">To collect</span><span class="num">Profit</span><span></span></div>' + rows + '</div>';
}
function projPLPage() {
  const c = S.clients.find(x => x.id === S.cid) || S.clients[0]; if (!c) return aHead('Project P&amp;L', 'No projects yet.');
  const accts = [...new Map(S.clients.map(x => [x.aid, x.company])).entries()].sort((a, b) => a[1].localeCompare(b[1])), sibs = S.clients.filter(x => x.aid === c.aid);
  const p = aPer(), full = !!S.pfull, now = nowKey();
  const fig = (pp, upto) => { const inc = incomeItems(pp, c.id).filter(e => !upto || e.k <= upto), cs = costItems(pp, c.id).filter(e => !upto || e.k <= upto), by = k => sumA(cs.filter(e => e.cat === k)); return { inc: sumA(inc), team: by('team'), vendor: by('vendor'), exp: by('exp'), cost: sumA(cs) }; };
  const pickers = '<div class="row" style="gap:10px"><select data-ppa="1" aria-label="Client" style="width:auto">' + accts.map(([id, n]) => '<option value="' + id + '"' + (id === c.aid ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select>' + (sibs.length > 1 ? '<select data-acctproj="1" aria-label="Project" style="width:auto">' + sibs.map(x => '<option value="' + x.id + '"' + (x.id === c.id ? ' selected' : '') + '>' + esc(pname(x)) + '</option>').join('') + '</select>' : '') + perPicker(true) + '</div>';
  const agreed = costing(c).value;
  let card;
  if (full) {
    const a = fig({ mode: 'all' }, now), e = fig({ mode: 'all' }), r = (l, x, y, cls) => '<div class="pprow ' + (cls || '') + '"><span>' + l + '</span><b class="num">' + sneg(x) + '</b><b class="num">' + sneg(y) + '</b></div>';
    card = '<div class="card stack ppcard"><div class="pprow pph"><span></span><span class="num">Actual so far</span><span class="num">Expected, full project</span></div>' + r('Service income', a.inc, e.inc, 'big') + r('Team fees', a.team, e.team, 'sub') + r('Vendor fees', a.vendor, e.vendor, 'sub') + r('Other expenses', a.exp, e.exp, 'sub') + r('Costs', a.cost, e.cost, 'big') + '<div class="pprow pptot"><b>Estimated profit</b><b class="num">' + sneg(a.inc - a.cost) + '</b><b class="num">' + sneg(e.inc - e.cost) + '</b></div><p class="small muted" style="margin:0">Actual counts months up to ' + pkName(now) + '. Expected adds the months still to come and every fee already planned.</p></div>';
  } else {
    const f = fig(p), fut = (p.mode === 'm' ? p.m : p.y + '-01') > now;
    card = '<div class="card stack ppcard">' + (fut ? '<div class="plnote">' + I('info', 'sm') + 'This period is still to come, so these figures are planned, not actual.</div>' : '') + '<div class="sbox">' + sumRow('Service income', f.inc) + sumRow('Team fees', f.team, '', null, 'sub') + sumRow('Vendor fees', f.vendor, '', null, 'sub') + sumRow('Other expenses', f.exp, '', null, 'sub') + sumRow('Costs', f.cost) + totRow(f.inc - f.cost < 0 ? 'Estimated loss' : 'Estimated profit', f.inc - f.cost) + '</div></div>';
  }
  const lk = (l, a, d, ic) => '<button class="cdrow" data-a="' + a + '" ' + Object.entries(d).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + '>' + I(ic) + '<span>' + l + '</span><span></span>' + I('chev', 'sm') + '</button>';
  const links = '<div class="clinks pplinks">' + lk('View quotation', 'doc', { type: 'quote', cid: c.id }, 'doc') + lk('View invoices', 'asub', { s: 'invoices', cid: c.id }, 'receipt') + lk('View payments', 'asub', { s: 'history', cid: c.id }, 'clock') + lk('View team fees', 'acat', { c: 'team', cid: c.id }, 'users') + lk('View expenses', 'acat', { c: 'exp', cid: c.id }, 'coins') + lk('View deposits', 'asub', { s: 'deposits', cid: c.id }, 'lock') + lk('View deliverables', 'open-client-tab', { id: c.id, t: 'work' }, 'layers') + '</div>';
  return aHead('Project P&amp;L', esc(c.company) + ' · ' + esc(pname(c)) + ' · Agreed value <b>' + sm(agreed) + '</b> · ' + (full ? 'whole project' : perName(p)), '') + pickers + '<div class="ppgrid"><div class="stack">' + card + '</div><div class="cside">' + links + '</div></div>';
}
function invoicesPage() {
  const now = nowKey(), q = (S.iq || '').toLowerCase(), st = S.ist || '', fc = S.afc || '';
  const keyOf = r => r.data.m ? (x => pk(x.y, x.mo))(ym(r.c, r.data.m)) : pkIso(r.due);
  const state = r => r.state === 'pending' && keyOf(r) > now ? 'scheduled' : r.state;
  const all = S.clients.filter(c => !fc || c.id === fc).flatMap(c => rowsFor(c, true)).filter(r => r.state !== 'void').sort((a, b) => (keyOf(a) || '').localeCompare(keyOf(b) || ''));
  const list = all.filter(r => (!st || state(r) === st) && (!q || (r.no + ' ' + r.c.company + ' ' + pname(r.c)).toLowerCase().includes(q)));
  const lab = { scheduled: ['', 'cal', 'Scheduled'] }, pillOf = r => state(r) === 'scheduled' ? '<span class="pill sched">' + I('cal', 'sm') + 'Scheduled</span>' : r.state === 'pending' ? pill('pending', 'Draft') : pill(r.state);
  const key = r => 'inv:' + r.c.id + ':' + (r.data.id || r.data.m), mi = (ic, label, a, d) => '<button class="mi" data-a="' + a + '" ' + Object.entries(d).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + '>' + I(ic, 'sm') + '<span>' + label + '</span></button>';
  const row = r => { const open = !['locked', 'paid'].includes(r.state), pay = { cid: r.c.id, pa: r.paidA, m: r.data.m || '', id: r.data.id || '' }, items = (open && r.state === 'pending' ? mi('send', 'Mark as sent', r.sentA, r.data) : '') + (open ? mi('tick', 'Record payment', 'pay-open', pay) : '') + (r.parts.length ? mi('coins', 'Payments received', 'parts-open', { cid: r.c.id, m: r.data.m || '', id: r.data.id || '' }) : '') + mi('edit', 'Change invoice number', 'num-open', Object.assign({ k: 'i', cid: r.c.id }, r.data.id ? { id: r.data.id } : { m: r.data.m })), paid = r.paid;
    return '<div class="ivr2"><span><b class="ell" title="' + esc(r.c.company) + '">' + esc(r.c.company) + '</b><span class="ell small muted">' + esc(pname(r.c)) + '</span></span><span class="num">' + esc(r.no) + '<br><span class="small muted">' + esc(r.label) + '</span></span><span class="num">' + esc(fdue(r.due)) + '</span><span class="num right">' + sm(r.amount) + '</span><span class="num right">' + (paid ? sm(paid) : '<span class="muted">—</span>') + '</span><span class="num right">' + (r.owed ? sm(r.owed) : '<span class="muted">—</span>') + '</span><span title="' + (r.state === 'paid' && r.pay ? esc(payText(r.pay)) : '') + '">' + pillOf(r) + '</span><span class="row" style="gap:6px;justify-content:flex-end;flex-wrap:nowrap"><button class="link" data-a="doc" ' + Object.entries(r.docData).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + '>View</button><span style="position:relative"><button class="iconbtn" data-a="menu" data-m="' + key(r) + '" aria-label="More for invoice ' + esc(r.no) + '">⋯</button>' + (S.menu === key(r) ? '<div class="menu imenu">' + items + '</div>' : '') + '</span></span></div>'; };
  const fcName = fc && S.clients.find(x => x.id === fc);
  const out = list.filter(r => state(r) !== 'scheduled').reduce((a, r) => a + r.owed, 0);
  return aHead('Invoices &amp; payments', (fcName ? esc(fcName.company) + ' · ' + esc(pname(fcName)) + ' · ' : '') + list.length + ' invoice' + (list.length === 1 ? '' : 's') + ' · ' + sm(out) + ' due and unpaid. Scheduled invoices are for months still to come.', '', btn(I('plus', 'sm') + 'New invoice', 'inv-new')) +
    '<div class="row"><div class="search" style="width:300px">' + I('search') + '<input type="search" data-iq="1" placeholder="Search number, client or project…" value="' + esc(S.iq || '') + '" aria-label="Search invoices"></div><select data-ist="1" aria-label="Status" style="width:auto"><option value="">All statuses</option>' + [['scheduled', 'Scheduled'], ['pending', 'Draft'], ['sent', 'Sent'], ['partial', 'Partially paid'], ['paid', 'Paid'], ['locked', 'Awaiting renewal']].map(([k, l]) => '<option value="' + k + '"' + (st === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select><select data-afc="1" aria-label="Project" style="width:auto"><option value="">All projects</option>' + S.clients.map(c => '<option value="' + c.id + '"' + (fc === c.id ? ' selected' : '') + '>' + esc(c.company + ' · ' + pname(c)) + '</option>').join('') + '</select></div>' +
    '<div class="card ftable"><div class="ivr2 ivh"><span>Client and project</span><span>Invoice</span><span>Due</span><span class="right">Amount</span><span class="right">Paid</span><span class="right">Outstanding</span><span>Status</span><span></span></div>' + (list.map(row).join('') || '<p class="muted" style="margin:0;padding:16px 22px">No invoices match.</p>') + '</div>';
}
function feesPage() {
  const fq = (S.afq || '').toLowerCase(), fc = S.afc || '';
  const fees = S.fees.filter(f => (!fc || f.cid === fc) && (!fq || ((member(f.member) || {}).name + ' ' + feeWhere(f).label + ' ' + cname(feeWhere(f).c)).toLowerCase().includes(fq)) && feeMatch(f, S.afs));
  const card = p => '<div class="card stack paycard"><div class="row" style="flex-wrap:nowrap">' + avatar(p.m.id, 'lg') + '<span><b style="font:600 18px var(--display)">' + esc(p.m.name) + '</b>' + (isVen(p.m) ? '<br><span class="small muted">Vendor' + (p.m.company ? ' · ' + esc(p.m.company) : '') + '</span>' : '') + '</span></div><div class="row between"><span class="muted small">Owing now</span><b class="num" style="font:600 22px var(--display)">' + sm(p.owed) + '</b></div><div class="row between small muted"><span>Not earned yet</span><span class="num">' + sm(p.up) + '</span></div>' + btn(I('coins', 'sm') + 'Record payment', 'payout-open', { member: p.m.id }, p.owed ? 'block' : 'ghost block', !p.owed) + '</div>';
  const people = S.team.map(m => { const mine = S.fees.filter(f => f.member === m.id), owed = mine.reduce((a, f) => a + fx(f).owed, 0), up = mine.reduce((a, f) => a + Math.max(0, f.amount - fx(f).earned), 0); return { m, owed, up, n: mine.length }; }).filter(x => x.n && x.owed);
  return aHead('Team &amp; vendor fees', 'Fees are earned as the work is completed. Click a fee for its details.', '', btn(I('plus', 'sm') + 'Add fee', 'fee-new')) + (people.length ? '<div class="eyebrow">Owing now</div><div class="grid g3">' + people.map(card).join('') + '</div>' : '') +
    '<div class="row"><div class="search" style="width:280px">' + I('search') + '<input id="af-q" type="search" data-afq="1" placeholder="Search people or projects…" value="' + esc(S.afq || '') + '" aria-label="Search team fees"></div><select data-afs="1" aria-label="Payment status" style="width:auto"><option value="">All statuses</option><option value="owed"' + (S.afs === 'owed' ? ' selected' : '') + '>Owing</option><option value="upcoming"' + (S.afs === 'upcoming' ? ' selected' : '') + '>Upcoming</option><option value="paid"' + (S.afs === 'paid' ? ' selected' : '') + '>Paid</option></select><select data-afc="1" aria-label="Project" style="width:auto"><option value="">All projects</option>' + S.clients.map(c => '<option value="' + c.id + '"' + (fc === c.id ? ' selected' : '') + '>' + esc(c.company + ' · ' + pname(c)) + '</option>').join('') + '</select></div>' + feeTable(fees, 'admin');
}
function teamInvPage() {
  const f = S.billF || 'open', list = (S.bills || []).filter(b => b.status !== 'withdrawn' && (f === 'all' || (f === 'paid' ? b.status === 'paid' : b.status !== 'paid'))).sort((a, b) => (a.status === 'submitted' ? 0 : 1) - (b.status === 'submitted' ? 0 : 1) || b.at.localeCompare(a.at)), n = (S.bills || []).filter(b => ['submitted', 'approved', 'queried'].includes(b.status)).length;
  return aHead('Team invoices', 'Invoices team members and vendors send Gioia for their earned fees. Approve, ask a question, or mark paid.', '', '<div class="seg">' + [['open', 'To pay' + (n ? ' (' + n + ')' : '')], ['paid', 'Paid'], ['all', 'All']].map(([v, l]) => '<button data-a="bill-filter" data-f="' + v + '" aria-pressed="' + (f === v) + '">' + l + '</button>').join('') + '</div>') + billTable(list, true);
}
function historyPage() {
  const fc = S.afc || '', tab = S.htab || 'out', ids = fc ? S.fees.filter(f => f.cid === fc).map(f => f.id) : null;
  const outs = S.payouts.filter(p => !ids || p.lines.some(l => ids.includes(l.feeId)));
  const ins = S.clients.filter(c => !fc || c.id === fc).flatMap(c => rowsFor(c, false).filter(r => r.state === 'paid').map(r => { const src = r.data.id ? c.adhoc.find(a => a.id === r.data.id) : c.invoices.find(i => i.m === r.data.m), d = src && src.pay && src.pay.date ? src.pay.date : src && src.paidAt ? src.paidAt.slice(0, 10) : ''; return { c, r, d }; })).sort((a, b) => (b.d || '').localeCompare(a.d || ''));
  const inTable = ins.length ? '<div class="card scroll" style="padding:4px 8px"><table class="tbl"><thead><tr><th>Received on</th><th>Client and project</th><th>Invoice</th><th>Method</th><th class="right">Amount</th></tr></thead><tbody>' + ins.map(x => '<tr><td class="num">' + (x.d ? dlong(x.d) : '<span class="muted">Not recorded</span>') + '</td><td>' + esc(x.c.company) + '<br><span class="small muted">' + esc(pname(x.c)) + '</span></td><td class="num">' + esc(x.r.no) + '</td><td class="small">' + (x.r.pay ? esc(payText(x.r.pay)) : '') + '</td><td class="right num">' + sm(x.r.amount) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted small" style="margin:0">No client payments recorded yet.</p>';
  const fcName = fc && S.clients.find(x => x.id === fc);
  return aHead('Payment history', (fcName ? esc(fcName.company) + ' · ' + esc(pname(fcName)) + '. ' : '') + 'Every payment recorded, with date, who, project and amount.', '', btn(I('download', 'sm') + 'Export for finance', 'acc-xlsx', {}, 'ghost')) + '<div class="seg" style="align-self:flex-start">' + [['out', 'Paid to the team'], ['in', 'Received from clients']].map(([v, l]) => '<button data-a="htab" data-t="' + v + '" aria-pressed="' + (tab === v) + '">' + l + '</button>').join('') + '</div>' + (tab === 'out' ? payoutTable(outs, true) : inTable);
}
/* ---------- deposits: security deposits are held and applied or refunded; advance payments are used up as the work they cover is delivered ---------- */
const endName = p => p.mode === 'y' ? '31 Dec ' + p.y : (([y, m]) => new Date(y, m, 0).getDate() + ' ' + MONTHS[m - 1].slice(0, 3) + ' ' + y)(p.m.split('-').map(Number));
function depAt(c, endK) {
  const di = L.depositInv(c); if (!di) return null;
  const sec = L.depSecurity(c), paidD = di.pay && di.pay.date || (di.paidAt || '').slice(0, 10), got = di.status === 'paid' && (!paidD || pkIso(paidD) <= endK);
  const uses = (di.uses || []).filter(u => !u.date || pkIso(u.date) <= endK), refunded = sumA(uses.filter(u => u.type === 'refund')), usedInv = sumA(uses.filter(u => u.type === 'utilise'));
  const cuts = sec ? [] : c.invoices.map(i => ({ i, cut: L.depositCut(c, i.m), k: (x => pk(x.y, x.mo))(ym(c, i.m)) })).filter(z => z.cut > 0);
  const delivered = sumA(cuts.filter(z => z.k <= endK).map(z => ({ amount: z.cut })));
  const applied = sec ? usedInv : delivered;
  return { di, sec, paidD, got, applied, refunded, cuts, bal: got ? Math.max(0, di.amount - applied - refunded) : 0 };
}
function deposAt(endK) { let sec = 0, adv = 0; S.clients.forEach(c => { const d = depAt(c, endK); if (!d) return; if (d.sec) sec += d.bal; else adv += d.bal; }); return { sec, adv }; }
function depositsPage() {
  const p = aPer(), endK = p.mode === 'y' ? p.y + '-12' : p.m, fc = S.afc || '', tot = deposAt(endK);
  const cards = S.clients.filter(c => (!fc || c.id === fc) && L.depositInv(c)).map(c => {
    const d = depAt(c, endK), di = d.di, ev = [];
    if (di.status === 'paid') ev.push([d.paidD, I('dl', 'sm') + 'Received <b>' + sm(di.amount) + '</b>' + (di.pay ? ' by ' + esc(PAYM[di.pay.mode] || '') + (di.pay.ref ? ' · ref ' + esc(di.pay.ref) : '') : ''), '']);
    (di.uses || []).forEach(u => ev.push([u.date, u.type === 'refund' ? I('ul', 'sm') + 'Refunded <b>' + sm(u.amount) + '</b> by ' + esc(PAYM[u.mode] || u.mode) + (u.ref ? ' · ref ' + esc(u.ref) : '') + (u.note ? ' · ' + esc(u.note) : '') : I('tick', 'sm') + 'Applied <b>' + sm(u.amount) + '</b> to invoice <b>' + esc(u.inv) + '</b>', '<button class="link small" data-a="dep-undo" data-id="' + u.id + '" data-cid="' + c.id + '">Undo</button>']));
    d.cuts.forEach(z => ev.push([z.k + '-01', I('tick', 'sm') + (z.k <= nowKey() ? 'Used ' : 'Will be used ') + '<b>' + sm(z.cut) + '</b> for ' + mName(c, z.i.m) + ' (invoice ' + esc(z.i.no) + ')', z.k <= nowKey() ? '' : '<span class="small muted">Work still to deliver</span>']));
    ev.sort((a, b) => (a[0] || '').localeCompare(b[0] || ''));
    const stat = (l, v, cls) => '<div class="dstat' + (cls ? ' ' + cls : '') + '"><span class="small muted">' + l + '</span><b class="num">' + v + '</b></div>';
    return '<div class="card stack depbox"><div class="row between"><div><h2 style="margin:0">' + esc(c.company) + '</h2><span class="small muted">' + esc(pname(c)) + ' · ' + esc(di.no) + '</span></div><span class="pill ' + (d.sec ? 'info' : 'gold') + '">' + (d.sec ? 'Security deposit' : 'Advance payment') + '</span></div>' +
      (di.status !== 'paid' ? '<div class="row between"><span class="muted">' + sm(di.amount) + ' not received yet.</span>' + btn('Record payment', 'pay-open', { cid: c.id, pa: 'ah-paid', m: '', id: di.id }) + '</div>' :
      '<div class="dgrid">' + stat('Original amount', sm(di.amount)) + stat('Received on', d.paidD ? dlong(d.paidD) : '—') + stat(d.sec ? 'Applied to invoices' : 'Used for work delivered', sm(d.applied)) + stat('Refunded', sm(d.refunded)) + stat('Balance at ' + endName(p), sm(d.bal), 'hl') + '</div>' +
      '<div class="stack" style="gap:2px"><span class="lab">History</span>' + ev.map(e => '<div class="row between dline2"><span>' + e[1] + ' <span class="small muted">· ' + (e[0] ? dlong(e[0].length === 10 ? e[0] : e[0] + '-01') : '') + '</span></span>' + e[2] + '</div>').join('') + '</div>' +
      '<div class="field"><label for="dn-' + c.id + '">Notes</label><textarea id="dn-' + c.id + '" rows="2" data-depnote="' + c.id + '" placeholder="For example: to be applied to the final invoice, or refunded at the end of the agreement">' + esc(di.notes || '') + '</textarea></div>' +
      '<div class="row">' + (d.sec ? btn(I('tick', 'sm') + 'Apply to invoice', 'depuse-open', { cid: c.id }, '', L.depBalance(c) <= 0) : '') + btn(I('ul', 'sm') + 'Record refund', 'deprefund-open', { cid: c.id }, 'ghost', L.depBalance(c) <= 0) + '</div>') + '</div>';
  }).join('');
  return aHead('Deposits', 'Deposit balances at ' + endName(p) + '. Deposits are held for the client, so they are never counted as income.', '', perPicker(false)) +
    '<div class="card stack" style="max-width:760px"><div class="sbox">' + sumRow('Security deposits', tot.sec) + sumRow('Advance for future work', tot.adv) + totRow('Balance at ' + endName(p), tot.sec + tot.adv) + '</div></div>' +
    (cards ? '<div class="grid g2" style="align-items:start">' + cards + '</div>' : '<div class="card"><p class="muted" style="margin:0">No deposits yet. A deposit is added to a quotation, in its Deposit section.</p></div>');
}
/* ---------- change history of financial records ---------- */
function auditPage() {
  const fin = e => e.fin || /invoice|payment|paid|deposit|refund|fee|expense|payout|quotation/i.test(e.text || '');
  const fc = S.afc || '', list = S.feed.filter(e => fin(e) && (!fc || e.cid === fc)).slice(0, 300);
  return aHead('Change history', 'Changes to invoices, payments, deposits, fees and expenses: who made each one, and when. The most recent ' + list.length + ' are shown.', '', '<select data-afc="1" aria-label="Project" style="width:auto"><option value="">All projects</option>' + S.clients.map(c => '<option value="' + c.id + '"' + (fc === c.id ? ' selected' : '') + '>' + esc(c.company + ' · ' + pname(c)) + '</option>').join('') + '</select>') +
    '<div class="card ftable">' + (list.map(e => { const c = S.clients.find(x => x.id === e.cid); return '<div class="aur"><span class="small muted num">' + esc(new Date(e.at).toLocaleString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })) + '</span><span><b>' + esc(e.who || '') + '</b></span><span>' + esc(e.text) + (c ? '<span class="small muted" style="display:block">' + esc(c.company + ' · ' + pname(c)) + '</span>' : '') + '</span></div>'; }).join('') || '<p class="muted" style="margin:0;padding:16px 22px">No changes recorded yet.</p>') + '</div>';
}
/* ---------- Excel export for the accountant: a small .xlsx writer (stored zip, no compression) ---------- */
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  files.forEach(([name, text]) => { const nb = enc.encode(name), db = enc.encode(text), crc = crc32(db), h = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0x21, 2], [14, crc, 4], [18, db.length, 4], [22, db.length, 4], [26, nb.length, 2], [28, 0, 2]].forEach(([o, v, s]) => s === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true));
    parts.push(new Uint8Array(h.buffer), nb, db);
    const cd = new DataView(new ArrayBuffer(46)); [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0x21, 2], [16, crc, 4], [20, db.length, 4], [24, db.length, 4], [28, nb.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, off, 4]].forEach(([o, v, s]) => s === 4 ? cd.setUint32(o, v, true) : cd.setUint16(o, v, true));
    cen.push(new Uint8Array(cd.buffer), nb); off += 30 + nb.length + db.length; });
  const csize = cen.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [8, files.length, 2], [10, files.length, 2], [12, csize, 4], [16, off, 4]].forEach(([o, v, s]) => s === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true));
  return new Blob([...parts, ...cen, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
function xlsx(sheets) {
  const x = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const col = n => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const sheetXml = rows => { const w = []; rows.forEach(r => r.forEach((v, i) => { w[i] = Math.min(60, Math.max(w[i] || 8, String(v == null ? '' : v).length + 2)); }));
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' + w.map((v, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + v + '" customWidth="1"/>').join('') + '</cols><sheetData>' + rows.map((r, ri) => '<row r="' + (ri + 1) + '">' + r.map((v, ci) => { const ref = col(ci) + (ri + 1); if (v == null || v === '') return ''; if (typeof v === 'number') return '<c r="' + ref + '" s="' + (ri === 0 ? 1 : 2) + '"><v>' + v + '</v></c>'; return '<c r="' + ref + '" t="inlineStr"' + (ri === 0 || (r.length === 2 && ci === 0 && String(v).startsWith('Total')) ? ' s="1"' : '') + '><is><t xml:space="preserve">' + x(v) + '</t></is></c>'; }).join('') + '</row>').join('') + '</sheetData></worksheet>'; };
  const files = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((s, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map((s, i) => '<sheet name="' + x(s.name.slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>']
  ].concat(sheets.map((s, i) => ['xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(s.rows)]));
  return zipStore(files);
}
function financeWorkbook() {
  const p = aPer(), name = perName(p), inc = incomeItems(p), cost = costItems(p), depE = deposAt(p.mode === 'y' ? p.y + '-12' : p.m), r2 = v => Math.round(v * 100) / 100;
  const cOf = id => S.clients.find(x => x.id === id), proj = c => c ? pname(c) : '';
  const inR = k => inP(k, p), payD = (c, r) => { const src = r.data.id ? c.adhoc.find(a => a.id === r.data.id) : c.invoices.find(i => i.m === r.data.m); return src && src.pay && src.pay.date ? src.pay.date : src && src.paidAt ? src.paidAt.slice(0, 10) : ''; };
  const rowsAll = S.clients.flatMap(c => rowsFor(c, false).map(r => ({ c, r, k: r.data.m ? (x => pk(x.y, x.mo))(ym(c, r.data.m)) : pkIso(r.due), d: payD(c, r) })));
  const summary = [['Gioia accounts', 'Period: ' + name], ['Prepared', new Date().toISOString().slice(0, 10)], [], ['Profit and loss', 'S$'], ['Recognised service income', r2(sumA(inc))], ['Team fees', r2(sumA(cost.filter(e => e.cat === 'team')))], ['Vendor fees', r2(sumA(cost.filter(e => e.cat === 'vendor')))], ['Other expenses', r2(sumA(cost.filter(e => e.cat === 'exp')))], ['Total costs', r2(sumA(cost))], ['Total estimated profit', r2(sumA(inc) - sumA(cost))], [], ['Cash and balances', 'S$'], ['Received from clients in the period', r2(sumA(pnlEntries('cash').filter(e => e.dir === 'in' && inR(e.k))))], ['Paid to the team and vendors in the period', r2(S.payouts.filter(x => inR(pkIso(x.date))).reduce((a, x) => a + x.total, 0))], ['Security deposits held at ' + endName(p), r2(depE.sec)], ['Advance payments held at ' + endName(p), r2(depE.adv)], [], ['Income is recognised in the month it is scheduled. Costs in the month of the work, expenses on their date. Deposits are not income.']];
  const incomeS = [['Client', 'Project', 'Month', 'Invoice', 'Amount (S$)', 'Paid']].concat(rowsAll.filter(x => inR(x.k) && x.r.state !== 'void' && x.r.state !== 'locked' && !(x.r.data.id && (x.c.adhoc.find(a => a.id === x.r.data.id) || {}).deposit)).map(x => [x.c.company, proj(x.c), pkName(x.k), x.r.no, r2(x.r.amount), x.r.state === 'paid' ? 'Yes' : 'No']));
  const costS = [['Category', 'Team member, vendor or paid by', 'Client', 'Project', 'Description', 'Month', 'Amount (S$)', 'Paid (S$)', 'Balance (S$)', 'Status']].concat(cost.map(e => [CATS[e.cat], e.who, e.c ? e.c.company : '', proj(e.c), e.desc, pkName(e.k), r2(e.amount), r2(e.paid), r2(e.amount - e.paid), e.status === 'owed' ? 'Owing' : e.status === 'paid' ? 'Paid' : 'Upcoming']));
  const invS = [['Invoice', 'Client', 'Project', 'For', 'Due', 'Amount (S$)', 'Paid (S$)', 'Outstanding (S$)', 'Status', 'Paid on', 'Method', 'Reference']].concat(rowsAll.filter(x => inR(x.k)).map(x => [x.r.no, x.c.company, proj(x.c), x.r.label, x.r.due, r2(x.r.amount), r2(x.r.paid), r2(x.r.owed), x.r.state === 'pending' ? 'Draft' : STATUS[x.r.state] || x.r.state, x.d, x.r.pay ? (PAYM[x.r.pay.mode2 || x.r.pay.mode] || '') : '', x.r.parts.map(q => q.ref).filter(Boolean).join(', ')]));
  const inS = [['Date', 'Client', 'Project', 'Invoice', 'Method', 'Reference', 'Amount (S$)']].concat(rowsAll.flatMap(x => x.r.parts.length ? x.r.parts.filter(q => inR(pkIso(q.date)) && q.amount - (q.fromDeposit || 0) > 0).map(q => [q.date, x.c.company, proj(x.c), x.r.no, PAYM[q.fromDeposit ? q.mode2 : q.mode] || '', q.ref || '', r2(q.amount - (q.fromDeposit || 0))]) : x.r.state === 'paid' && inR(pkIso(x.d)) ? [(dp => [x.d, x.c.company, proj(x.c), x.r.no, x.r.pay ? payText(x.r.pay) : '', (x.r.pay && x.r.pay.ref) || '', r2(x.r.amount - dp)])(x.r.pay && x.r.pay.mode === 'deposit' ? x.r.pay.fromDeposit || 0 : 0)] : []).filter(r => r[6] > 0));
  const outS = [['Date', 'Paid to', 'Project', 'For', 'Their invoice', 'Amount (S$)']].concat(S.payouts.filter(x => inR(pkIso(x.date))).flatMap(x => { const m = member(x.member); return x.lines.map(l => { const f = S.fees.find(z => z.id === l.feeId), c = f && cOf(f.cid); return [x.date, m ? m.name : 'Removed', c ? c.company + ' · ' + proj(c) : '', l.label || (f ? feeWhere(f).label : 'Fee'), x.invoiceNo || '', r2(l.amount)]; }); })).concat(S.clients.flatMap(c => { const di = L.depositInv(c); return (di && di.uses || []).filter(u => u.type === 'refund' && inR(pkIso(u.date))).map(u => [u.date, c.company + ' (deposit refund)', proj(c), 'Deposit ' + di.no + ' refund', '', r2(u.amount)]); }));
  const endK = p.mode === 'y' ? p.y + '-12' : p.m, depS = [['Client', 'Project', 'Deposit', 'Type', 'Amount (S$)', 'Received on', 'Applied or used (S$)', 'Refunded (S$)', 'Balance at ' + endName(p) + ' (S$)', 'Notes']].concat(S.clients.map(c => depAt(c, endK)).map((d, i) => [S.clients[i], d]).filter(([, d]) => d).map(([c, d]) => [c.company, proj(c), d.di.no, d.sec ? 'Security deposit' : 'Advance payment', r2(d.di.amount), d.di.status === 'paid' ? d.paidD : 'Not received', r2(d.applied), r2(d.refunded), r2(d.bal), d.di.notes || '']));
  const expS = [['Date', 'Client', 'Project', 'Expense', 'Category', 'Paid by', 'Amount (S$)', 'Receipt']].concat(S.clients.flatMap(c => (c.expenses || []).filter(e => inR(pkIso(e.date))).map(e => [e.date, c.company, proj(c), e.name, e.category || '', e.paidBy || '', r2(e.amount), e.fileName || ''])));
  return { name, blob: xlsx([{ name: 'Summary', rows: summary }, { name: 'Income', rows: incomeS }, { name: 'Costs', rows: costS }, { name: 'Invoices', rows: invS }, { name: 'Money in', rows: inS }, { name: 'Money out', rows: outS }, { name: 'Expenses', rows: expS }, { name: 'Deposits', rows: depS }]) };
}
/* ---------- Help: short how-to answers, written for each role ---------- */
const HELP = {
  client: [
    ['Getting started', [
      ['What do I see before my first payment?', 'Your proposal, with the services, the month-by-month investment and the Terms and Conditions. Accept it, ask for changes, or decline. Once you accept, your first invoice appears. When it is paid, your full portal unlocks, with your deliverables, tasks and files.'],
      ['Where is the proposal I accepted?', 'Open the Proposal tab. It shows what you accepted, when it was signed, and the Terms and Conditions you agreed to. Click View quotation to see the document, then Print or save as PDF.'],
      ['How do I replay the tour?', 'Click your initials at the top right, then Show me around.']
    ]],
    ['Deliverables and tasks', [
      ['What are deliverables?', 'Your work, grouped by service, with one set for every month. Choose a service to see its months and the tasks in each.'],
      ['Why is a month locked?', 'Each month unlocks as soon as that month\'s invoice is paid. Click a locked month to see what is planned for it and to view its invoice.'],
      ['How do I approve work?', 'Anything waiting for you shows on your Overview, with a count beside it. Open the task, look through the attached files, then click Approve, or Request changes with a comment saying what to change.'],
      ['What do the task statuses mean?', 'My task: we need something from you, such as a draft, login details or a review. Ready for approval: the work is done and waiting for you to approve it or ask for changes. Not started and In progress: Gioia is on it, nothing needed from you. Completed: all done.'],
      ['How many rounds of changes do I get?', 'Each piece of work includes 2 rounds of minor revisions, as set out in the Terms. The task shows which round it is on. New concepts or changes to scope are quoted separately.'],
      ['Some tasks are for me to do. What do I do?', 'Tasks such as sending logins, photos or product details are yours. Upload the files or add a comment on the task, then click Mark as sent to the team.'],
      ['How do I ask the team a question?', 'Comment on the task it is about, so the right person sees it with the work. You can also reply to any email we send you.']
    ]],
    ['Invoices and payments', [
      ['How do I pay an invoice?', 'Open Invoices and click View invoice. It shows our bank details and a PayNow QR code. Once we receive your payment, we mark the invoice as paid and that month unlocks.'],
      ['How does the deposit work?', 'If your proposal includes a deposit, it shows on the Invoices tab. Depending on your proposal, it is either taken off your first invoice, or held as a security deposit and used or refunded as set out in your agreement.'],
      ['What happens when my contract ends?', 'We may send you a renewal proposal. A Renewal proposal tab appears, where you can accept it, ask for changes or decline. When you accept, the new months are added to the same deliverables.']
    ]],
    ['Your account', [
      ['Where are my files?', 'The Files tab has everything shared between you and Gioia, sorted into folders.'],
      ['Will you remind me about things?', 'Yes, gently. If something has waited for you for 3 days, or an invoice is due in 3 days or today, we send one email and a note in the bell.'],
      ['How do I change my details or emails?', 'Open My details to update your company, contact and phone number, and to choose which emails you get.']
    ]]
  ],
  team: [
    ['Your day', [
      ['Where do I start each day?', 'My tasks shows everything assigned to you, with due dates. Switch to Everyone to see all the tasks on your projects, and use Filters to narrow by client, assignee or status.'],
      ['How do I replay the tours?', 'Click your initials at the top right, then Show me around. Fees & payouts has its own How billing works button.'],
      ['How do I control my emails?', 'Click your initials at the top right and tick or untick Email me about my work.'],
      ['Will I get reminders?', 'Yes. Each morning after 9am, if you have tasks due tomorrow or overdue, you get one email and a note in the bell listing them.']
    ]],
    ['Tasks', [
      ['How does a task move along?', 'Change the status with the pill at the top of the task. For work the client approves: click Submit for client review, the client approves or asks for changes, then click Mark as completed.'],
      ['What are steps?', 'Some work passes back and forth, such as draft, client review, edit and post. Those tasks have steps, and the current step shows who it is with. When you finish your step, it moves on to the next person, or to the client.'],
      ['Can I reuse a list of steps?', 'Yes. The Templates page has saved step lists and preparation task lists. Open a task, click Add steps and pick a template, or save your own.'],
      ['How do I leave a note only the team sees?', 'When you comment, tick Team only. The client won\'t see it.'],
      ['Where do files go?', 'Attach them on the task. They are saved in the project\'s Google Drive folder, and the client sees them on that task.'],
      ['What happens if a task is reassigned?', 'You get an email when a task is given to you or moved to someone else. The fee moves with the task if Gioia chooses.']
    ]],
    ['Fees and getting paid', [
      ['When is a fee earned?', 'A per-task fee is earned when that task or step is marked done. A monthly sum is earned per completed task, or when all your tasks that month are done, as noted on each fee.'],
      ['How do I bill Gioia?', '1. On Fees & payouts, add your payment details (bank account and PayNow). 2. When fees are ready to bill, click Create invoice and tick the fees to include. 3. Preview the invoice and Send to Gioia, or upload your own invoice instead. You can bill at the end of each month or any time.'],
      ['Can I use my own invoice?', 'Yes. When you create the invoice, choose Upload my own invoice and attach a PDF or photo. Use the same invoice number and total as in the form.'],
      ['What if Gioia has a question about my invoice?', 'You get an email with the question, and the invoice shows it. Reply to Gioia, or withdraw the invoice and send a corrected one.'],
      ['How do I know I have been paid?', 'You get an email when your invoice is marked paid, and the payment is listed under Payments to you.']
    ]]
  ],
  vendor: [
    ['Your work', [
      ['Where do I start?', 'My tasks shows the tasks Gioia has assigned to you, with due dates. Open a task to update its status, upload files or comment.'],
      ['How do I hand in work?', 'Attach the files on the task and add a comment if needed. Then use the main button at the bottom of the task to move it on, for example Mark as completed or finish your step.'],
      ['How do I control my emails?', 'Click your initials at the top right and tick or untick Email me about my work.']
    ]],
    ['Fees and getting paid', [
      ['When can I bill a fee?', 'A fee can be billed once its task or step is marked done. Fees & payouts shows what is ready to bill.'],
      ['How do I bill Gioia?', '1. On Fees & payouts, add your payment details (bank account and PayNow), or skip this if you upload your own invoice. 2. Click Create invoice and tick the fees to include. 3. Preview the portal\'s invoice and Send to Gioia, or choose Upload my own invoice and attach your PDF.'],
      ['What if Gioia has a question about my invoice?', 'You get an email with the question, and the invoice shows it. Reply to Gioia, or withdraw the invoice and send a corrected one.'],
      ['How do I know I have been paid?', 'You get an email when your invoice is marked paid, and the payment is listed under Payments to you.']
    ]]
  ],
  admin: [
    ['Setting up a new client', [
      ['What are the steps for a new client?', '1. New project: add the company and the client\'s Google email. 2. Build the quotation from the Service catalogue, with the months, discounts and any deposit. 3. Send the proposal: the client reads it, agrees to the Terms and accepts in the portal. If they signed on paper, mark it accepted and use Record the signed copy. 4. Email the portal invite. 5. When the first invoice or deposit is paid, use Mark as paid, then Start preparation and apply a preparation template.'],
      ['Where do I set the Terms and Conditions?', 'In Settings. Every proposal shows them, and each client keeps a copy of the version they accepted.'],
      ['How do deposits work?', 'Set the deposit on the quotation: a percentage, a fixed amount, or a number of months of fees. It is either taken off the first invoice, or held as a security deposit that you use against an invoice or refund from the deposit card.']
    ]],
    ['Paying the team', [
      ['How do team invoices reach me?', 'Team members and vendors bill Gioia from Fees & payouts. Their invoices arrive under Accounts, in Invoices from the team, and you get an email. The number beside Accounts in the menu shows how many are waiting.'],
      ['How do I pay a team invoice?', 'Open it with View. Approve it, or click Question to send it back with a note. After paying them outside the app, click Mark paid and enter the date. This records the payment against their fees and emails them.'],
      ['Can I still pay someone without an invoice?', 'Yes. Under Team payments, Record a payment pays what is owing. Fees already on an invoice they sent are left out, so nothing is paid twice.']
    ]],
    ['Renewals', [
      ['What does the client see when I prepare a renewal?', 'Nothing until you send it. Save draft keeps it private. Send to client emails them and adds a Renewal proposal tab, where they can accept, ask for changes or decline. Extend directly adds the months without asking.']
    ]]
  ]
};
function helpSections() {
  if (S.role === 'client') return HELP.client;
  if (vendorMe()) return HELP.vendor;
  return isAdmin() ? HELP.admin.concat(HELP.team.map(([h, qs]) => ['For your team: ' + h.toLowerCase(), qs])) : HELP.team;
}
function helpPage() {
  const tours = S.role === 'client' ? [['tour-start', 'Replay the portal tour']] : [['tour-start', 'Replay the tour'], ...(isAdmin() ? [] : [['tour-pay-go', 'How billing works']])];
  return '<div><h1>Help</h1><p class="muted" style="margin:4px 0 0">Short answers to common questions. Type a word to find one.</p></div>' +
    '<div class="row" style="gap:10px"><div class="search" style="flex:1;max-width:520px">' + I('search', 'sm') + '<input id="help-q" placeholder="Search help, e.g. invoice, approve, locked" autocomplete="off"></div>' + tours.map(([a, l]) => btn(I('help', 'sm') + l, a, {}, 'quiet')).join('') + '</div>' +
    helpSections().map(([h, qs]) => '<section class="stack helpsec" style="gap:8px"><h3 style="margin:0">' + esc(h) + '</h3>' + qs.map(([q, a]) => '<details class="card faq"><summary>' + esc(q) + '</summary><p>' + esc(a).replace(/(^|\s)(\d)\. /g, '$1<br><b>$2.</b> ').replace(/^<br>/, '') + '</p></details>').join('') + '</section>').join('') +
    '<p class="muted small" id="help-none" hidden>Nothing matches that. Try another word, or ' + (S.role === 'client' ? 'comment on a task or reply to any email from us.' : 'ask in the comments on the task.') + '</p>' +
    '<div class="card row" style="gap:12px;flex-wrap:nowrap">' + I('chat') + '<span class="small">' + (S.role === 'client' ? 'Still stuck? Comment on the task it is about, or reply to any email from Gioia, and we will help.' : 'Still stuck? Ask in the comments on the task, or message Gioia.') + '</span></div>';
}
/* ---------- invoices team members and vendors send to Gioia ---------- */
const BILLST = { submitted: ['info', 'Sent to Gioia'], approved: ['ok', 'Approved'], queried: ['warn', 'Question from Gioia'], paid: ['ok', 'Paid'], withdrawn: ['lock', 'Withdrawn'] };
const billOpenAmt = id => (S.bills || []).filter(b => ['submitted', 'approved', 'queried'].includes(b.status)).reduce((a, b) => a + b.lines.filter(l => l.feeId === id).reduce((x, l) => x + l.amount, 0), 0);
const billLeft = f => Math.max(0, fx(f).owed - billOpenAmt(f.id));
const billsWaiting = () => (S.bills || []).filter(b => b.status === 'submitted').length;
const hasBank = b => !!(b && ((b.bankName && b.accNo && b.accName) || b.paynow));
const billPill = b => '<span class="pill ' + BILLST[b.status][0] + '">' + BILLST[b.status][1] + (b.status === 'paid' && b.paidOn ? ' · ' + dshort(b.paidOn) : '') + '</span>';
/* square-crop and shrink a photo in the browser so only a small image is stored */
function shrinkPhoto(file) {
  // read the file as a data: address (blob: addresses are blocked by the site's security rules)
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onerror = () => rej(new Error('unreadable')); fr.onload = () => { const img = new Image(); img.onload = () => { const n = Math.min(img.width, img.height), cv = document.createElement('canvas'); cv.width = cv.height = 192; const g = cv.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 192, 192); g.drawImage(img, (img.width - n) / 2, (img.height - n) / 2, n, n, 0, 0, 192, 192); res(cv.toDataURL('image/jpeg', 0.85)); }; img.onerror = () => rej(new Error('bad image')); img.src = fr.result; }; fr.readAsDataURL(file); });
}
/* fit a logo inside 240px, keeping its shape and any transparent background */
function shrinkLogo(file) {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onerror = () => rej(new Error('unreadable')); fr.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, 240 / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k)), cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h); let d = cv.toDataURL('image/png'); if (d.length > 150000) { const g = cv.getContext('2d'); g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); d = cv.toDataURL('image/jpeg', 0.88); } res(d); }; img.onerror = () => rej(new Error('bad image')); img.src = fr.result; }; fr.readAsDataURL(file); });
}
let BILLFILE = null; // the member's own invoice file, kept while the invoice form is open
function billDraft() {
  const M = S.modal || {}, g = id => document.getElementById(id);
  const ids = document.querySelector('[data-billfee]') ? [...document.querySelectorAll('[data-billfee]')].filter(e => e.checked).map(e => e.dataset.billfee) : (M.ids || S.fees.filter(f => f.member === S.me && billLeft(f) > 0).map(f => f.id));
  return { kind: 'billnew', own: !!M.own, ids, no: g('bn-no') ? g('bn-no').value.trim() : M.no, date: g('bn-date') ? g('bn-date').value : M.date, period: g('bn-period') ? g('bn-period').value.trim() : M.period, note: g('bn-note') ? g('bn-note').value.trim() : M.note };
}
function nextBillNo() {
  const me = member(S.me) || { name: 'ME' }, ini = me.name.split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 3) || 'INV', d = new Date(), ym = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0');
  const used = (S.bills || []).filter(b => b.member === S.me).map(b => b.no.toLowerCase()); let n = 1; while (used.includes((ini + '-' + ym + '-' + n).toLowerCase())) n++;
  return ini + '-' + ym + '-' + n;
}
function billTable(list, admin) {
  if (!list.length) return '<p class="muted small" style="margin:0">' + (admin ? 'No invoices from the team yet.' : 'You have not sent Gioia an invoice yet.') + '</p>';
  const act = b => btn('View', 'bill-view', { id: b.id }, 'quiet') + (admin ? (['submitted', 'queried'].includes(b.status) ? btn('Approve', 'bill-approve', { id: b.id }, 'ghost') : '') + (['submitted', 'approved', 'queried'].includes(b.status) ? btn('Question', 'bill-query-open', { id: b.id }, 'quiet') + btn('Mark paid', 'bill-pay-open', { id: b.id }) : '') : (['submitted', 'queried'].includes(b.status) ? btn('Withdraw', 'bill-withdraw', { id: b.id }, 'quiet') : ''));
  return '<div class="card scroll" style="padding:4px 8px"><table class="tbl"><thead><tr>' + (admin ? '<th>From</th>' : '') + '<th>Invoice</th><th>Period</th><th class="right">Amount</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(b => { const m = member(b.member);
    return '<tr>' + (admin ? '<td><span class="row" style="gap:8px;flex-wrap:nowrap">' + avatar(b.member) + '<span>' + esc(m ? m.name : b.from.name) + (m && isVendor(m) ? ' <span class="chip">Vendor</span>' : '') + '</span></span></td>' : '') + '<td><b>' + esc(b.no) + '</b><br><span class="small muted">' + dshort(b.date) + (b.file ? ' · ' + I('doc', 'sm') + 'own file' : '') + '</span></td><td class="small">' + esc(b.period || '—') + '<br><span class="muted">' + b.lines.length + ' fee' + (b.lines.length === 1 ? '' : 's') + '</span></td><td class="right num"><b>' + sm(b.total) + '</b></td><td>' + billPill(b) + (b.status === 'queried' && b.query ? '<br><span class="small muted">"' + esc(b.query) + '"</span>' : '') + '</td><td class="right"><div class="row" style="gap:6px;justify-content:flex-end;flex-wrap:nowrap">' + act(b) + '</div></td></tr>'; }).join('') + '</tbody></table></div>';
}
function bankSummary(b) {
  if (!hasBank(b)) return '<p class="small muted" style="margin:0">Not added yet. Gioia needs these on your invoice to pay you.</p>';
  const rows = [['Name on invoice', b.name], ['Company', b.company], ['Bank', b.bankName], ['Account name', b.accName], ['Account number', b.accNo], ['PayNow name', b.paynowName], ['PayNow number or UEN', b.paynow]].filter(r => r[1]);
  return '<table class="paytbl">' + rows.map(([l, v]) => '<tr><td class="muted">' + l + '</td><td><b>' + esc(v) + '</b></td></tr>').join('') + '</table>';
}
function billDoc(b) {
  const B = S.brand, bk = b.bank || {}, fr = b.from || {};
  const pay = [['Bank', bk.bankName], ['Account name', bk.accName], ['Account number', bk.accNo], ['PayNow name', bk.paynowName], ['PayNow number / UEN', bk.paynow]].filter(r => r[1]);
  return '<div class="scroll"><div class="doc billdoc"><div class="row between" style="align-items:flex-start"><div><div class="co" style="text-align:left;margin:0">' + esc(fr.company || fr.name) + '</div>' + (fr.company ? '<div>' + esc(fr.name) + '</div>' : '') + (fr.address ? '<div class="small">' + esc(fr.address).replace(/\n/g, '<br>') + '</div>' : '') + (fr.email ? '<div class="small">' + esc(fr.email) + '</div>' : '') + '</div><div class="right"><div class="lab2" style="font-size:20px;letter-spacing:.2em">INVOICE</div><span class="lab2">Invoice no:</span> <b>' + esc(b.no) + '</b><br><span class="lab2">Date:</span> ' + esc(dlong(b.date)) + (b.period ? '<br><span class="lab2">Period:</span> ' + esc(b.period) : '') + '</div></div>' +
    '<div style="margin:18px 0 6px"><div class="lab2">Bill to:</div>' + esc(B.company || 'GIOIA PRIVATE LIMITED') + '<br>' + esc(B.address || '').replace(/\n/g, '<br>') + '</div>' +
    '<table><thead><tr><th>Description</th><th class="right">Amount</th></tr></thead><tbody>' + b.lines.map(l => '<tr><td>' + esc(l.label || 'Fee') + '</td><td class="right num">' + money(l.amount) + '</td></tr>').join('') + '</tbody></table>' +
    '<div class="dbar"><span>Total due</span><span>' + money(b.total) + '</span></div>' + (b.note ? '<p class="small" style="white-space:pre-wrap">' + esc(b.note) + '</p>' : '') +
    (pay.length ? '<div class="paybox"><div><div class="lab2" style="text-decoration:underline;margin-bottom:6px">Payment details</div><table class="paytbl">' + pay.map(([l, v]) => '<tr><td>' + l + ':</td><td><b>' + esc(v) + '</b></td></tr>').join('') + '</table></div></div>' : '') + '</div></div>';
}
function earningsPage() {
  const mine = S.fees.filter(f => f.member === S.me), owed = mine.reduce((a, f) => a + fx(f).owed, 0), up = mine.reduce((a, f) => a + Math.max(0, f.amount - fx(f).earned), 0), paid = S.payouts.filter(p => p.member === S.me).reduce((a, p) => a + p.total, 0);
  const ready = mine.reduce((a, f) => a + billLeft(f), 0), bills = (S.bills || []).filter(b => b.member === S.me && b.status !== 'withdrawn').sort((a, b) => b.at.localeCompare(a.at)), bk = S.myBank, d = new Date().getDate(), monthEnd = d >= 25 || d <= 5;
  const intro = vendorMe() ? 'What Gioia has agreed to pay you for each task, what you can bill now, and payments made. A fee can be billed once that task or step is marked done.' : 'You earn each fee as the work is completed. Per-task fees are earned when that task or step is done; a monthly sum is earned per completed task, or once all your tasks that month are done, as noted on each fee.';
  const billCard = ready > 0 ? '<div class="card row between prepcard" id="fp-bill"><span class="row" style="gap:12px;flex-wrap:nowrap">' + I('doc') + '<span><b>' + sm(ready) + ' is ready to bill</b><br><span class="small muted">' + (monthEnd ? 'It\'s the end of the month: a good time to send Gioia your invoice. ' : 'Send your invoice whenever suits you, for example at the end of each month. ') + (hasBank(bk) ? 'The portal can make the invoice for you with your payment details on it, or you can upload your own.' : D.uploads ? 'Upload your own invoice, or add your payment details below and the portal makes one for you.' : 'Add your payment details first, so they appear on the invoice.') + '</span></span></span>' + (hasBank(bk) || D.uploads ? btn(I('doc', 'sm') + 'Create invoice', 'bill-new') : btn('Add payment details', 'bank-open')) + '</div>' : '';
  return '<div class="row between" style="align-items:flex-start"><div><h1>Fees &amp; payouts</h1><p class="muted" style="margin:4px 0 0">' + intro + '</p></div>' + btn(I('help', 'sm') + 'How billing works', 'tour-pay', {}, 'quiet') + '</div><div class="grid g3" id="fp-tiles">' + ktile('hourglass', 'g', 'Owing to you', owed) + ktile('cal', 'g', 'Not earned yet', up) + ktile('coins', 'o', 'Paid to you', paid) + '</div>' + billCard +
    '<div class="row between"><h3 style="margin:0">Your invoices to Gioia</h3>' + (ready > 0 && hasBank(bk) ? '' : '<span class="small muted"' + (ready > 0 ? '>' : ' id="fp-howto">Nothing to bill right now.') + '</span>') + '</div><div id="fp-invoices">' + billTable(bills, false) + '</div>' +
    '<div class="card stack" style="max-width:560px" id="fp-bank"><div class="row between"><h3 style="margin:0">Your payment details</h3>' + btn(hasBank(bk) ? 'Edit' : 'Add', 'bank-open', {}, 'ghost') + '</div>' + bankSummary(bk) + '<p class="small muted" style="margin:0">These stay private between you and Gioia.</p></div>' +
    '<h3 style="margin:0" id="fp-fees">Your fees</h3>' + feeTable(mine, 'mine') + '<h3 style="margin:0">Payments to you</h3>' + payoutTable(S.payouts.filter(p => p.member === S.me), false);
}
function wsFeesPanel(c, s, m) {
  if (S.role === 'client') return '';
  const tids = wsTasks(c, s.id, m).map(t => t.id), mine = f => isAdmin() || f.member === S.me;
  const list = S.fees.filter(f => f.cid === c.id && mine(f) && ((f.kind === 'month' && f.svc === s.id && (s.billing !== 'monthly' || s.adhoc || f.m === m)) || (f.kind === 'task' && tids.includes(f.taskId))));
  const row = f => { const mm = member(f.member), w = feeWhere(f); return '<button class="feerow" data-a="' + (isAdmin() ? 'fee-edit' : 'fee-view') + '" data-id="' + f.id + '">' + avatar(f.member) + '<span style="flex:1;text-align:left">' + esc(mm ? mm.name : 'Removed') + '<br><span class="small muted">' + esc(f.kind === 'task' ? w.label + (w.step ? ' · ' + w.step : '') : KIND[f.kind] + (f.rule === 'all' ? ', all tasks' : ', per task')) + '</span></span><b class="num">' + sm(f.amount) + '</b>' + feePill(f) + '</button>'; };
  if (!isAdmin()) return list.length ? '<aside class="card stack"><h2 class="row" style="gap:8px">' + I('coins') + 'Your fees here</h2>' + list.map(row).join('') + '</aside>' : '';
  return '<aside class="card stack"><div class="row between"><h2 class="row" style="gap:8px">' + I('coins') + 'Team fees</h2><span class="small muted">Admins only</span></div>' + (list.map(row).join('') || '<p class="small muted" style="margin:0">No fees assigned' + (s.billing === 'monthly' && !s.adhoc ? ' for ' + mName(c, m) : '') + '.</p>') + btn(I('plus', 'sm') + 'Assign a fee', 'fee-new', { cid: c.id, svc: freeWs(s) ? '' : s.id, m: m || 1, kind: freeWs(s) ? 'task' : 'month' }, 'ghost block') + '</aside>';
}
function feeDrawer() {
  const d = S.drawer.draft, c = S.clients.find(x => x.id === d.cid), kind = d.kind || 'month';
  const svcs = c ? wsList(c).filter(x => !freeWs(x)) : [], s = c && kind === 'month' && svcs.find(x => x.id === d.svc), monthly = s && s.billing === 'monthly' && !s.adhoc;
  const t = c && kind === 'task' && c.tasks.find(x => x.id === d.taskId), base = s ? feeBase(c, s) : 0, amt = kind === 'month' && d.type === 'pct' && s ? Math.round(base * (+d.pct || 0) / 100) : +d.amount || 0;
  const k = !d.isNew ? fx(d) : null;
  const fb = c && (kind === 'task' && t ? L.svcBudget(c, S.fees, t.svc, t.m, d.id) : kind === 'month' && s ? L.svcBudget(c, S.fees, s.id, monthly ? +d.m : (s.adhoc || freeWs(s) ? 0 : 1), d.id) : null);
  const taskOpts = c ? wsList(c).map(w => { const ts = c.tasks.filter(x => x.svc === w.id); if (!ts.length) return ''; return '<optgroup label="' + esc(short(w)) + '">' + ts.map(x => '<option value="' + x.id + '"' + (d.taskId === x.id ? ' selected' : '') + '>' + esc(x.title) + (x.m ? ' · ' + MONTHS[ym(c, x.m).mo].slice(0, 3) : '') + (x.status === 'done' ? ' (completed)' : '') + '</option>').join('') + '</optgroup>'; }).join('') : '';
  return '<div class="scrim" data-a="close-bg"><div class="drawer" role="dialog" aria-label="Team fee"><div class="dhead">' + I('coins') + '<h2>' + (d.isNew ? 'Assign a team fee' : 'Team fee') + '</h2><button class="iconbtn" data-a="close" aria-label="Close">' + I('x') + '</button></div><div class="dbody">' +
    '<div class="stack" style="gap:8px"><span class="lab">What the fee is for</span><div class="seg" style="align-self:flex-start">' + [['month', 'Monthly sum for a service'], ['task', 'One task or step'], ['item', 'One-off item']].map(([v, l]) => '<button data-a="fee-kind" data-k="' + v + '" aria-pressed="' + (kind === v) + '"' + (!d.isNew && (d.paid || 0) > 0 && kind !== v ? ' disabled' : '') + '>' + l + '</button>').join('') + '</div></div>' +
    '<div class="meta"><div class="field"><label for="fe-member">Team member <span class="req">*</span></label><select id="fe-member" data-fe="member"><option value="">Choose…</option>' + teamOpts(d.member, true) + '</select></div><div class="field"><label for="fe-cid">Project <span class="req">*</span></label><select id="fe-cid" data-fe="cid">' + S.clients.map(x => '<option value="' + x.id + '"' + (d.cid === x.id ? ' selected' : '') + '>' + esc(cname(x)) + '</option>').join('') + '</select></div></div>' +
    (kind === 'month' ? '<div class="meta"><div class="field"><label for="fe-svc">Service <span class="req">*</span></label><select id="fe-svc" data-fe="svc"><option value="">Choose…</option>' + svcs.map(x => '<option value="' + esc(x.id) + '"' + (d.svc === x.id ? ' selected' : '') + '>' + esc(short(x)) + (x.adhoc ? ' (added)' : '') + '</option>').join('') + '</select></div>' +
      (monthly ? '<div class="field"><label for="fe-m">Month</label><select id="fe-m" data-fe="m">' + Array.from({ length: c.quote.months }, (_, i) => i + 1).map(x => '<option value="' + x + '"' + (+d.m === x ? ' selected' : '') + '>' + mName(c, x) + '</option>').join('') + '</select></div>' : '') + '</div>' +
      '<div class="stack" style="gap:8px"><span class="lab">When it is paid</span><label class="opt ' + (d.rule !== 'all' ? 'on' : '') + '"><input type="radio" name="fe-rule" data-a="fee-rule" data-r="prorata"' + (d.rule !== 'all' ? ' checked' : '') + '><span><b>Pro-rata</b><br><span class="small muted">Earned per completed task. 3 of 4 tasks done earns three quarters of the fee.</span></span></label><label class="opt ' + (d.rule === 'all' ? 'on' : '') + '"><input type="radio" name="fe-rule" data-a="fee-rule" data-r="all"' + (d.rule === 'all' ? ' checked' : '') + '><span><b>All tasks done</b><br><span class="small muted">Earned in full once all of this person\'s tasks for the month are completed.</span></span></label></div>' : '') +
    (kind === 'task' ? '<div class="field"><label for="fe-task">Task <span class="req">*</span></label><select id="fe-task" data-fe="taskId"><option value="">Choose…</option>' + taskOpts + '</select></div>' + (t && staged(t) ? '<div class="field"><label for="fe-stage">Paid when</label><select id="fe-stage" data-fe="stage"><option value=""' + (d.stage === '' || d.stage === null || d.stage === undefined ? ' selected' : '') + '>The whole task is completed</option>' + t.stages.map((x, i) => '<option value="' + i + '"' + (String(d.stage) === String(i) ? ' selected' : '') + '>Step ' + (i + 1) + ' is completed: ' + esc(x.title) + '</option>').join('') + '</select></div>' : '') : '') +
    (kind === 'item' ? field('fe-item', 'Item name', d.item || '', 'text', true) + '<p class="small muted" style="margin:-8px 0 0">For work outside the tasks, such as a photoshoot or a rush job. It is payable straight away.</p>' : '') +
    (fb ? '<div class="card" style="background:var(--card-2)">' + budgetBox(fb, short(fb.s) + (fb.m && fb.s.billing === 'monthly' && !fb.s.adhoc ? ', ' + mName(c, fb.m) : '') + (d.isNew ? '' : ', not counting this fee')) + '</div>' : '') +
    (kind === 'month' ? '<div class="stack" style="gap:8px"><span class="lab">Amount</span><div class="seg" style="align-self:flex-start"><button data-a="fee-type" data-t="fixed" aria-pressed="' + (d.type !== 'pct') + '">Fixed amount</button><button data-a="fee-type" data-t="pct" aria-pressed="' + (d.type === 'pct') + '"' + (s ? '' : ' disabled title="Choose a service first"') + '>Percentage of client price</button></div></div>' : '') +
    (kind === 'month' && d.type === 'pct' && s ? '<div class="meta"><div class="field"><label for="fe-pct">Percentage</label><input id="fe-pct" type="number" min="0" max="100" data-fe="pct" value="' + esc(d.pct) + '"></div><div class="field"><span class="lab">Fee</span><b class="num" style="font:600 22px var(--display)">' + sm(amt) + '</b><span class="small muted">' + (+d.pct || 0) + '% of ' + sm(base) + (monthly ? ' per month' : '') + '</span></div></div>' : '<div class="field"><label for="fe-amt">Fee (S$) <span class="req">*</span></label><input id="fe-amt" type="number" min="0" data-fe="amount" value="' + esc(d.amount) + '"></div>') +
    (kind === 'month' && monthly && d.isNew ? '<label class="opt ' + (d.repeat ? 'on' : '') + '"><input type="checkbox" data-fe="repeat"' + (d.repeat ? ' checked' : '') + '><span>Repeat this fee for every month from ' + mName(c, +d.m) + '</span></label>' : '') +
    field('fe-note', 'Note (the team member sees this)', d.note) +
    (k ? '<div class="card" style="background:var(--card-2)"><div class="row between"><span>Earned so far</span><b class="num">' + sm(k.earned) + ' of ' + sm(d.amount) + '</b></div><div class="row between"><span>Paid</span><b class="num">' + sm(k.paid) + '</b></div><div class="row between"><span>Owing now</span><span>' + feePill(d) + '</span></div><p class="small muted" style="margin:6px 0 0">' + esc(feeHow(d)) + '. Record payments from Accounts, Team payments.</p></div>' : '') +
    '<p class="small muted" style="margin:0">They are notified when the fee is assigned and as it is earned. They see only their own fees, never the client\'s price.</p>' +
    '<div class="row">' + btn('Save fee', 'fee-save') + (!d.isNew ? btn('Delete', 'fee-del', { id: d.id }, 'quiet', (d.paid || 0) > 0) : '') + '</div></div></div></div>';
}
function payoutModal(M) {
  const m = member(M.member), lines = S.fees.filter(f => f.member === M.member && fx(f).owed > 0), total = lines.reduce((a, f) => a + fx(f).owed, 0);
  return '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:560px"><h2>Record a payment to ' + esc(m.name) + '</h2><p class="small muted" style="margin:0">Everything ' + esc(m.name.split(' ')[0]) + ' has earned and not yet been paid. Pay it outside the app, then record it here.</p><div class="card" style="padding:4px 14px">' + lines.map(f => { const w = feeWhere(f); return '<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line);flex-wrap:nowrap"><span>' + esc(w.label) + '<br><span class="small muted">' + esc(cname(w.c)) + (w.step ? ' · ' + esc(w.step) : '') + '</span></span><b class="num">' + sm(fx(f).owed) + '</b></div>'; }).join('') + '<div class="row between" style="padding:10px 0"><b>Total</b><b class="num" style="font:600 22px var(--display)">' + sm(total) + '</b></div></div><div class="meta">' + field('po-date', 'Payment date', TODAY, 'date', true) + field('po-note', 'Note (optional)', '') + '</div>' + (true ? '<div class="card stack" style="padding:12px 14px"><b>Their invoice (optional)</b><div class="meta">' + field('po-inv', 'Invoice number', '') + field('po-invdate', 'Invoice date', '', 'date') + '</div><div class="field"><label for="po-file">Invoice file (optional)</label><input type="file" id="po-file" accept=".pdf,image/*"></div>' + (m.pay ? '<p class="small muted" style="margin:0">Pay to: ' + esc(m.pay) + '</p>' : '') + '</div>' : '') + '<div class="row">' + btn(I('tick', 'sm') + 'Record payment', 'payout-save') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
}
function invDrawer() {
  const d = S.drawer.draft, ok = S.clients.filter(x => x.quote.status === 'accepted');
  return '<div class="scrim" data-a="close-bg"><div class="drawer" role="dialog" aria-label="New invoice"><div class="dhead">' + I('doc') + '<h2>New invoice</h2><button class="iconbtn" data-a="close" aria-label="Close">' + I('x') + '</button></div><div class="dbody">' +
    '<p class="small muted" style="margin:0">Monthly invoices are created automatically when a quotation is accepted. Use this for anything extra along the way.</p>' +
    '<div class="field"><label for="ni-cid">Client <span class="req">*</span></label><select id="ni-cid">' + ok.map(x => '<option value="' + x.id + '"' + (d.cid === x.id ? ' selected' : '') + '>' + esc(x.company) + '</option>').join('') + '</select></div>' +
    '<div class="field"><label for="ni-svc">Service</label><select id="ni-svc"><option value="">Custom item (no deliverable)</option>' + S.catalogue.map(s => '<option value="' + s.id + '">' + esc(s.name) + ' · ' + money(s.price) + '</option>').join('') + '</select></div>' + field('ni-name', 'Description (custom item)', '') + field('ni-amt', 'Amount (S$), blank uses the catalogue price', '', 'number') +
    '<p class="small muted" style="margin:0">A catalogue service also unlocks its deliverable once this invoice is paid.</p><div class="row">' + btn('Create invoice', 'inv-create') + btn('Cancel', 'close', {}, 'quiet') + '</div></div></div></div>';
}
function cataloguePage() {
  const head = '<div class="row between"><div><h1>Service catalogue</h1><p class="muted" style="margin:4px 0 0">Price, quotation wording and the task list each service opens.</p></div><div class="row"><div class="seg"><button data-a="cat-mode" data-m="board" aria-pressed="' + (S.catMode !== 'list') + '">' + I('board', 'sm') + 'Cards</button><button data-a="cat-mode" data-m="list" aria-pressed="' + (S.catMode === 'list') + '">' + I('list', 'sm') + 'List</button></div>' + btn(I('plus', 'sm') + 'Add service', 'svc-new') + '</div></div>';
  if (S.catMode === 'list') return head + '<div class="card scroll" style="padding:4px 8px"><table class="tbl"><thead><tr><th>Service</th><th>Billing</th><th class="right">Price</th><th>Deliverable tasks</th><th>Preparation</th><th></th></tr></thead><tbody>' + S.catalogue.map(s => '<tr class="click" data-a="svc-edit" data-id="' + s.id + '"><td><b>' + esc(s.name) + '</b><div class="small muted clamp">' + esc(s.bullets.join(' · ')) + '</div></td><td>' + pill(s.billing === 'once' ? 'sent' : 'approved', s.billing === 'once' ? 'One-time' : 'Monthly') + '</td><td class="right num"><b>' + money(s.price) + '</b>' + (s.billing === 'monthly' ? '<br><span class="small muted">per month</span>' : '') + '</td><td>' + s.tasks.length + (s.billing === 'monthly' ? ' each month' : '') + (s.tasks.some(t => t[3] && t[3].length) ? ' <span class="chip">with steps</span>' : '') + '</td><td>' + ((s.prep || []).length || '<span class="muted">None</span>') + '</td><td class="right">' + btn('Edit', 'svc-edit', { id: s.id }, 'quiet') + '</td></tr>').join('') + '</tbody></table></div>';
  return head + '<div class="grid g2">' + S.catalogue.map(s => '<div class="card stack"><div class="row between"><span class="pill ' + (s.billing === 'once' ? 'info' : 'ok') + '">' + (s.billing === 'once' ? 'One-time' : 'Monthly') + '</span>' + btn('Edit', 'svc-edit', { id: s.id }, 'quiet') + '</div><h2>' + esc(s.name) + '</h2><div><b class="num" style="font:600 22px var(--display)">' + money(s.price) + '</b>' + (s.billing === 'monthly' ? ' <span class="muted">per month</span>' : '') + '</div><ul style="margin:0;padding-left:18px">' + s.bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>' + (s.note ? '<i class="small muted">' + esc(s.note) + '</i>' : '') + '<div class="eyebrow">Deliverable tasks' + (s.billing === 'monthly' ? ' each month' : '') + ' · ' + s.tasks.length + '</div><div class="ctasks">' + s.tasks.map(t => '<div class="ctask"><span>' + esc(t[0]) + '</span><span class="ctags">' + (t[3] && t[3].length ? '<span class="chip">' + t[3].length + ' steps</span>' : '') + (t[1] === 'client' ? '<span class="chip client">Client sends</span>' : '') + (t[2] && !(t[3] && t[3].length) ? '<span class="chip">Needs approval</span>' : '') + '</span></div>').join('') + '</div>' + (s.prep && s.prep.length ? '<div class="eyebrow">Preparation tasks · ' + s.prep.length + '</div><div class="ctasks">' + s.prep.map(p => '<div class="ctask"><span>' + esc(p[0]) + '</span><span class="ctags">' + (p[1] === 'client' ? '<span class="chip client">Client sends</span>' : '') + '</span></div>').join('') + '</div>' : '') + '</div>').join('') + '</div>';
}
function teamPage() {
  const team = S.team;
  return '<h1>Team</h1><p class="muted" style="margin:-8px 0 0">People sign in with the Google email saved here. Admins see everything. Team members see the projects they are assigned to, without prices, quotations, invoices or the catalogue, and only their own fees under Fees &amp; payouts. Vendors see only the tasks assigned to them, with no client contact details or templates. Only admins see roles: everyone else just sees names. Change anyone\'s role in the Role column.</p><div class="card scroll" style="padding:4px 8px"><table class="tbl"><thead><tr><th>Name</th><th>Google email</th><th>Role</th><th>Open tasks</th><th class="right">Fees owing</th><th></th></tr></thead><tbody>' +
    team.map(m => '<tr><td><div class="row" style="flex-wrap:nowrap">' + (m.id === S.me ? '<button class="avbtn" data-a="photo-open" title="Change your photo">' + avatar(m.id) + '</button>' : '<button class="avbtn" data-a="pic-for" data-mid="' + m.id + '" data-e="' + esc(m.email || '') + '" data-n="' + esc(m.name) + '" data-p="' + esc(m.pic || '') + '" title="Change ' + esc(m.name) + '\'s photo">' + avatar(m.id) + '</button>') + '<input type="text" data-tn="' + m.id + '" value="' + esc(m.name) + '" aria-label="Name"></div></td><td>' + (m.id === S.me ? esc(m.email) : '<input type="email" data-te="' + m.id + '" value="' + esc(m.email || '') + '" placeholder="Add Google email" aria-label="Google email for ' + esc(m.name) + '">') + '</td><td>' + (m.id === S.me ? pill('approved', 'Admin') : '<select data-trole="' + m.id + '" aria-label="Role for ' + esc(m.name) + '" style="width:auto">' + [['team', 'Team member'], ['vendor', 'Vendor'], ['admin', 'Admin']].map(([v, l]) => '<option value="' + v + '"' + ((m.admin ? 'admin' : m.kind === 'vendor' ? 'vendor' : 'team') === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>') + '</td><td class="num">' + S.clients.reduce((a, c) => a + c.tasks.filter(t => t.assignee === m.id && t.status !== 'done' && taskOpen(c, t)).length, 0) + '</td><td class="right num">' + money(S.fees.filter(f => f.member === m.id).reduce((a, f) => a + fx(f).owed, 0)) + '</td><td class="right">' + (m.id === S.me ? '<span class="small muted">You</span>' : '<span class="row" style="gap:4px;justify-content:flex-end;flex-wrap:nowrap">' + btn('Details', 'tm-details', { id: m.id }, 'quiet') + (m.email ? btn('Resend welcome', 'team-welcome', { id: m.id }, 'quiet') : '') + btn('Remove', 'team-del', { id: m.id }, 'quiet') + '</span>') + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="card stack" style="max-width:620px"><h2>Add a team member</h2><div class="meta">' + field('tm-name', 'Name', '', 'text', true) + field('tm-email', 'Google email', '', 'email') + '<div class="field"><label for="tm-role">Role</label><select id="tm-role"><option value="team">Team member</option><option value="vendor">Vendor</option><option value="admin">Admin</option></select></div>' + field('tm-company', 'Company (optional)', '') + '</div><span class="small muted" style="margin-top:-6px">With a Google email, they get a welcome email with the link to sign in. Leave it blank for someone who doesn\'t need to sign in, or for a cost such as software.</span><div>' + btn('Add team member', 'team-add') + '</div></div>';
}
function googleCard() {
  const g = D.google || {}, b = g.backup, st = (ok, l) => '<span class="pill ' + (ok ? 'ok' : 'lock') + '">' + I(ok ? 'tick' : 'clock', 'sm') + l + '</span>';
  const row = m => '<button class="mrow" data-a="mail-view" data-id="' + m.id + '"><span class="pill ' + (m.ok ? (m.sim ? 'info' : 'ok') : m.skipped ? 'lock' : 'crit') + '">' + (m.ok ? (m.sim ? 'Preview' : 'Sent') : m.skipped ? 'Not sent' : 'Failed') + '</span><span style="flex:1;min-width:0;text-align:left"><b class="clamp">' + esc(logSubject(m)) + '</b><span class="small muted">To ' + esc(m.to) + ' · ' + fmtAt(m.at) + (m.skipped ? ' · ' + esc(m.skipped) : m.err ? ' · ' + esc(m.err) : '') + '</span></span>' + I('chev', 'sm') + '</button>';
  return '<div class="card stack" style="max-width:680px"><h2>Google Workspace</h2>' + (g.sim ? '<p class="small" style="margin:0;background:#eef3ff;border-radius:8px;padding:8px 10px">Prototype: emails are not really sent. Each one appears below as a preview, so you can check the wording.</p>' : '') +
    '<div class="row between"><span><b>Email</b><br><span class="small muted">' + (g.mail ? 'Sent from ' + esc(g.from) : 'Not connected. Add GOOGLE_SERVICE_ACCOUNT and EMAIL_FROM in Railway.') + '</span></span><span class="row" style="gap:8px">' + st(g.mail, g.mail ? 'Connected' : 'Not connected') + (g.mail ? btn('Send me a test', 'mail-test', {}, 'quiet') : '') + '</span></div>' +
    '<div class="row between"><span><b>Daily reminders</b><br><span class="small muted">' + (g.remindOn ? remindSummary(g.remindCfg) + ' Sent by email and to the bell. ' + (g.remindLast ? 'Last run ' + fmtAt(g.remindLast.at) + ': ' + g.remindLast.mails + ' email' + (g.remindLast.mails === 1 ? '' : 's') + '.' : 'Not run yet.') : 'Off. No reminder emails or notifications are sent.') + '</span></span><span class="row" style="gap:8px;flex:none">' + (g.remindOn ? btn('Change', 'remcfg-open', {}, 'quiet') : '') + '<label class="row" style="gap:8px;cursor:pointer;flex:none"><input type="checkbox" data-remtoggle="1"' + (g.remindOn ? ' checked' : '') + ' style="width:auto"><span>' + (g.remindOn ? 'On' : 'Off') + '</span></label></span></div>' +
    '<div class="row between"><span><b>Google Drive</b><br><span class="small muted">' + (g.drive ? 'Uploads go to the shared drive, in Clients / company / project / deliverable.' : 'Not connected. Add GOOGLE_SERVICE_ACCOUNT and DRIVE_ID in Railway.') + '</span></span>' + st(g.drive, g.drive ? 'Connected' : 'Not connected') + '</div>' +
    '<div class="row between"><span><b>Nightly backup</b><br><span class="small muted">' + (b ? (b.ok ? 'Last backup ' + fmtAt(b.at) + ', saved to Backups in the shared drive. The last 30 are kept.' : 'The last backup failed: ' + esc(b.err || '')) : g.drive ? 'Runs every night after 2am. None yet.' : 'Runs every night once Google Drive is connected.') + '</span></span><span class="row" style="gap:8px">' + (g.drive ? btn('Back up now', 'backup-now', {}, 'quiet') : '') + '<a class="btn ghost" href="/api/backup" data-dl="backup">' + I('download', 'sm') + 'Download a backup</a></span></div>' +
    mailLogHtml(g.log || [], row) + '</div>';
}
/* the email log: newest first, 8 at a time, with a status filter and a search */
/* the email log is read by admins: a subject written to the recipient ("mentioned you") reads with their name */
function logSubject(m) {
  const tm = S.team.find(x => (x.email || '').toLowerCase() === String(m.to || '').toLowerCase()), cc = S.clients.find(x => (x.email || '').toLowerCase() === String(m.to || '').toLowerCase());
  const n = (tm && tm.name) || (cc && (cc.contact || cc.company)) || m.toName || m.to; let s = String(m.subject || '');
  return s.replace(/ mentioned you on /, ' mentioned ' + n + ' on ').replace(/ is back with you/, ' is back with ' + n).replace(/^Your step is ready/, n + "'s step is ready").replace(/^A step is back with you/, 'A step is back with ' + n).replace(/^Paid you/, 'Paid ' + n);
}
function mailLogHtml(log, row) {
  if (!log.length) return '<h3 style="margin:6px 0 0">Emails sent</h3><p class="small muted" style="margin:0">None yet.</p>';
  const st = S.mlSt || '', q = (S.mlQ || '').toLowerCase(), n = S.mlN || 8, kind = m => !m.ok ? (m.skipped ? 'skipped' : 'failed') : 'sent';
  const list = log.filter(m => (!st || kind(m) === st) && (!q || (m.to + ' ' + m.subject).toLowerCase().includes(q))), cnt = k => log.filter(m => kind(m) === k).length;
  return '<div class="row between" style="margin-top:6px"><h3 style="margin:0">Emails sent</h3><div class="row" style="gap:8px"><div class="search" style="width:220px">' + I('search') + '<input id="ml-q" type="search" data-mlq="1" placeholder="Search recipient or subject…" value="' + esc(S.mlQ || '') + '" aria-label="Search emails"></div><select data-mlst="1" aria-label="Email status" style="width:auto"><option value="">All (' + log.length + ')</option><option value="sent"' + (st === 'sent' ? ' selected' : '') + '>Sent (' + cnt('sent') + ')</option><option value="skipped"' + (st === 'skipped' ? ' selected' : '') + '>Not sent (' + cnt('skipped') + ')</option><option value="failed"' + (st === 'failed' ? ' selected' : '') + '>Failed (' + cnt('failed') + ')</option></select></div></div>' +
    (list.length ? '<div class="stack" style="gap:6px">' + list.slice(0, n).map(row).join('') + '</div><div class="row between small muted"><span>Showing ' + Math.min(n, list.length) + ' of ' + list.length + '. The app keeps the latest 120.</span>' + (list.length > n ? '<button class="link" data-a="ml-more">Show more</button>' : '') + '</div>' : '<p class="small muted" style="margin:0">No emails match.</p>');
}
const PAYF = [['fast', 'Beneficiary (for FAST)'], ['meps', 'Beneficiary (for MEPS / local TT)'], ['acct', 'Account number'], ['bank', 'Bank name'], ['swift', 'Bank SWIFT / BIC'], ['baddr', 'Beneficiary address'], ['uen', 'PayNow UEN'], ['note', 'Note under the QR code']];
function payCard() {
  const P = S.brand.pay || {}, qr = S.payQr !== undefined ? S.payQr : (S.brand.qr || '');
  return '<div class="card stack" style="max-width:680px"><h2>Payment details on invoices</h2><p class="small muted" style="margin:0">Printed at the bottom of every invoice, so clients know how to pay. Leave a line blank to leave it out.</p><div class="meta">' + PAYF.map(([k, l]) => field('pay-' + k, l, P[k] || '', k === 'baddr' || k === 'note' ? 'area' : 'text')).join('') + '</div>' +
    '<div class="field"><label>PayNow QR code</label><div class="row" style="gap:14px;align-items:center">' + (qr ? '<img src="' + qr + '" alt="PayNow QR code" style="width:120px;border:1px solid var(--line);border-radius:8px;background:#fff">' : '<span class="small muted">No QR code yet.</span>') + '<span class="stack" style="gap:6px"><label class="btn ghost" style="cursor:pointer">' + I('upload', 'sm') + (qr ? 'Replace image' : 'Upload image') + '<input type="file" accept="image/png,image/jpeg" data-payqr="1" hidden></label>' + (qr ? '<button class="link" data-a="payqr-del">Remove</button>' : '') + '</span></div><span class="small muted">Use the original QR image from your bank app if you can, so it prints sharply.</span></div>' +
    '<div>' + btn('Save payment details', 'brand-save') + '</div></div>';
}
function payBlock() {
  const P = S.brand.pay || {}, qr = S.brand.qr || '', rows = PAYF.filter(([k]) => !['uen', 'note'].includes(k) && P[k]);
  if (!rows.length && !qr) return '';
  return '<div class="paybox"><div><div class="lab2" style="text-decoration:underline;margin-bottom:6px">Bank details</div><table class="paytbl">' + rows.map(([k, l]) => '<tr><td>' + esc(l.replace(' (for FAST)', ' (For FAST)').replace(' (for MEPS / local TT)', ' (For MEPS/Local TT)')) + ':</td><td>' + (['fast', 'acct', 'bank'].includes(k) ? '<b>' + esc(P[k]) + '</b>' : esc(P[k])) + '</td></tr>').join('') + '</table></div>' +
    (qr ? '<div class="payqr"><img src="' + qr + '" alt="PayNow QR code">' + (P.note ? '<div class="paynote">' + esc(P.note) + '</div>' : P.uen ? '<div class="small">UEN: ' + esc(P.uen) + '</div>' : '') + '</div>' : P.uen ? '<div class="payqr"><b>PayNow UEN</b><br>' + esc(P.uen) + (P.note ? '<div class="paynote">' + esc(P.note) + '</div>' : '') + '</div>' : '') + '</div>';
}
function settingsPage() {
  const B = S.brand;
  return '<h1>Settings</h1>' + googleCard() + '<div class="card stack" style="max-width:680px"><h2>Quotation and invoice details</h2>' + field('b-mark', 'Logo wordmark', B.mark) + field('b-tagline', 'Tagline', B.tagline) + field('b-company', 'Company name', B.company) + field('b-address', 'Address', B.address, 'area') + field('b-terms', 'Terms & Conditions (printed as page 2 of every quotation)', B.terms || '', 'area') + '<div class="field"><label for="b-welcome">Standard welcome note on proposal pages</label><textarea id="b-welcome" class="grow" placeholder="Dear {name}, thank you for the time you spent with us…">' + esc(B.welcome || '') + '</textarea><span class="small muted">Shown when a prospect opens their proposal in the portal. {name} becomes the contact\'s name and {company} the company. Any quotation can have its own note instead.</span></div>' + '<div>' + btn('Save settings', 'brand-save') + '</div></div>' +
    payCard() +
    '<div class="card stack" style="max-width:680px"><h2>Numbering</h2><div class="meta">' + field('n-next', 'Next quotation number', S.nextQuote, 'number') + field('n-fmt', 'Invoice number format', S.invFormat || '{quote}-{nn}') + '</div><p class="small muted" style="margin:0">In the format, <b>{quote}</b> is the quotation number and <b>{nn}</b> the month (01, 02…), or <b>{n}</b> without the zero. Example: ' + esc(L.invNo(S.invFormat || '{quote}-{nn}', String(S.nextQuote || 260070), 2)) + '. Ad hoc invoices use {quote}-A1, -A2. Any single number can also be changed on the quotation or invoice itself.</p><div>' + btn('Save numbering', 'numbers-save') + '</div></div>';
}

/* ---------- shell ---------- */
function myOpenCount() { let n = 0; S.clients.forEach(c => c.tasks.forEach(t => { if ((t.assignee === S.me || L.stageMine(t, S.me)) && taskOpen(c, t) && !['done', 'awaiting'].includes(t.status)) n++; })); return n; }
function sidebar() {
  const nav = vendorMe() ? [['mytasks', 'My tasks', 'check'], ['clients', 'Projects', 'building'], ['earnings', 'Fees & payouts', 'coins'], ['files', 'Files', 'folder'], ['help', 'Help', 'help']] : [['clients', 'Clients', 'building'], ['billing', 'Accounts', 'coins', 'admin'], ['mytasks', 'My tasks', 'check'], ['earnings', 'Fees & payouts', 'coins'], ['files', 'Files', 'folder'], ['team', 'Team', 'users', 'admin'], ['templates', 'Templates', 'list'], ['catalogue', 'Service catalogue', 'layers', 'admin'], ['help', 'Help', 'help']];
  const bv = ['import', 'newproj'].includes(S.view) ? 'clients' : S.view === 'task' ? (S.back || {}).view : S.view, cur = bv === 'acct' ? 'billing' : bv === 'client' ? 'clients' : bv === 'ws' || bv === 'workspaces' ? 'clients' : bv, n = myOpenCount();
  return '<aside class="side"><div class="logo">' + logoImg('white', 46) + '<span class="desk">Dashboard</span></div><div class="sidelab">' + (isAdmin() ? 'Admin' : 'Team') + '</div>' + nav.filter(x => !x[3] || (x[3] === 'admin' ? isAdmin() : !isAdmin())).map(([k, l, ic]) => '<button class="nav" data-a="nav" data-v="' + k + '" aria-current="' + (cur === k) + '">' + I(ic) + '<span class="lbl">' + l + '</span>' + (k === 'mytasks' && n ? '<span class="badge">' + n + '</span>' : '') + (k === 'billing' && billsWaiting() ? '<span class="badge">' + billsWaiting() + '</span>' : '') + '</button>').join('') +
    (isAdmin() ? '<div class="foot"><button class="nav" data-a="nav" data-v="settings" aria-current="' + (cur === 'settings') + '">' + I('cog') + '<span class="lbl">Settings</span></button></div>' : '') + '</aside>';
}
function bellMenu() {
  const v = viewer(), all = S.feed.filter(e => canRead(e, v)), un = all.filter(e => unreadFor(e, v)).length, only = S.bellUnread && un;
  // every unread one is listed, however old, plus the latest read ones
  const list = S.bellList = only ? all.filter(e => unreadFor(e, v)) : all.filter((e, i) => i < 40 || unreadFor(e, v));
  return '<div class="menu bellmenu"><div class="row between" style="padding:4px 8px 8px"><h3>Notifications' + (un ? ' <span class="small muted" style="font-weight:400">· ' + un + ' unread</span>' : '') + '</h3>' + (un ? '<span class="row" style="gap:12px"><button class="link small" data-a="bell-only">' + (only ? 'Show all' : 'Unread only') + '</button><button class="link small" data-a="seen-all">Mark all as read</button></span>' : '') + '</div>' + (!list.length ? '<p class="muted small" style="padding:8px">You are all caught up.</p>' : '') + list.map((e, i) => '<button class="mi nitem' + (unreadFor(e, v) ? ' unread' : '') + '" data-a="note-open" data-i="' + i + '" data-cid="' + e.cid + '"><span class="av">' + initials(e.who) + '</span><span><span>' + esc(e.who) + ' · ' + esc(e.text) + '</span><br><span class="small muted">' + esc((S.clients.find(c => c.id === e.cid) || {}).company || '') + ' · ' + fmtAt(e.at) + '</span></span></button>').join('') + '<p class="small muted" style="padding:6px 8px 0;margin:0">Each of these is also emailed.</p></div>';
}
function topRight() {
  const n = S.feed.filter(e => unreadFor(e, viewer())).length, who = S.role === 'client' ? client().contact : member(S.me).name;
  return '<div class="row" style="gap:6px;margin-left:auto;position:relative"><div style="position:relative"><button class="iconbtn" data-a="menu" data-m="bell" aria-label="Notifications">' + I('bell') + (n ? '<span class="badge">' + n + '</span>' : '') + '</button>' + (S.menu === 'bell' ? bellMenu() : '') + '</div><div style="position:relative"><button class="me" data-a="menu" data-m="me" aria-label="Account and view switcher"><span class="av lg' + (D.me.pic ? ' pic' : '') + '">' + (D.me.pic ? picImg(D.me.pic, who) : initials(who)) + '</span>' + I('down', 'sm') + '</button>' + (S.menu === 'me' ? meMenu() : '') + '</div></div>';
}
function staffShell() {
  const c = client(), page = { help: helpPage, task: () => taskPage(c, c.tasks.find(x => x.id === S.tid)), clients: clientsPage, client: () => c ? clientPage(c) : clientsPage(), ws: () => c ? workspacePage(c) : clientsPage(), workspaces: workspacesPage, mytasks: myTasksPage, files: filesPage, billing: billingPage, acct: () => c ? acctPage(c) : billingPage(), import: importPage, earnings: earningsPage, templates: templatesPage, newproj: wizardPage, catalogue: cataloguePage, team: teamPage, settings: settingsPage }[S.view]();
  return '<div class="app">' + sidebar() + '<div class="main"><header class="topbar"><div class="search">' + I('search') + '<input id="gsearch" type="search" placeholder="Search clients, deliverables, tasks, files…" value="' + esc(S.q) + '" autocomplete="off" aria-label="Search"><div id="sres"></div></div>' + topRight() + '</header><main class="page">' + page + '</main></div></div>';
}

/* ---------- client portal ---------- */
function reviewCard(c, t) {
  // a short summary that leads to the full task page, where the client reads everything and then approves or asks for changes
  const s = ql(c, t.svc), cs = staged(t) ? curStage(t) : null, files = t.files.length;
  const by = staged(t) ? (t.stages.slice(0, t.stage).reverse().find(x => x.owner !== 'client' && x.assignee) || {}).assignee || t.assignee : t.assignee, who = member(by);
  const due = (cs && cs.due) || t.due;
  return '<div class="review"><div class="row between"><span class="pill warn">' + I('clock', 'sm') + 'Ready for approval</span><span class="small muted">' + esc(short(s)) + '</span></div>' +
    '<h2>' + esc(t.title) + '</h2>' + (cs ? '<p class="small muted" style="margin:0">Step ' + (t.stage + 1) + ' of ' + t.stages.length + ': ' + esc(cs.title) + '</p>' : '') +
    (t.desc ? '<p class="clamp2" style="margin:0;white-space:pre-line">' + esc(t.desc) + '</p>' : '') +
    '<div class="row small muted" style="gap:18px">' + (who ? '<span class="row" style="gap:6px">' + avatar(who.id, 'sm') + 'Prepared by ' + esc(who.name) + '</span>' : '') + '<span class="row" style="gap:6px">' + I('folder', 'sm') + (files ? files + ' file' + (files === 1 ? '' : 's') + ' to look at' : 'No files attached') + '</span>' + (due ? '<span class="row" style="gap:6px">' + I('cal', 'sm') + 'Please respond by ' + dlong(due) + '</span>' : '') + (t.approve ? '<span>Revision ' + t.rounds + ' of 2 used</span>' : '') + '</div>' +
    '<div class="row">' + btn(I('doc', 'sm') + 'Review and approve', 'task', { id: t.id }) + '</div></div>';
}

const lastResp = (q, type) => { const r = (q.responses || []).filter(x => x.type === type).pop(); return r ? r.text : ''; };
function progressCard(c) {
  const paid = c.invoices.filter(i => i.status === 'paid').length, done = c.tasks.filter(t => t.status === 'done').length, open = c.tasks.filter(t => taskOpen(c, t)).length;
  return '<div class="card stack"><h2>Your progress so far</h2><div class="grid g3"><div class="field"><span class="lab">Months together</span><b class="num" style="font:600 26px var(--display)">' + paid + ' of ' + c.quote.months + '</b><span class="small muted">' + mName(c, 1) + ' to ' + mName(c, c.quote.months) + '</span></div><div class="field"><span class="lab">Tasks completed</span><b class="num" style="font:600 26px var(--display)">' + done + '</b><span class="small muted">of ' + open + ' opened so far</span></div><div class="field"><span class="lab">Services</span><b style="font:600 18px var(--display)">' + esc(c.quote.lines.map(short).join(', ')) + '</b></div></div></div>';
}
/* the month-by-month breakdown on the proposal page */
function investTable(c, dep, rn, total) {
  const n = c.quote.months, sec = L.depSecurity(c), rows = [];
  for (let m = 1; m <= n; m++) {
    const ls = invLines(c, m), svc = ls.filter(l => l.s), adj = ls.filter(l => !l.s);
    rows.push('<tr><td><b>' + MONTHS[ym(c, m).mo].slice(0, 3) + ' ' + ym(c, m).y + '</b><br><span class="small muted">Month ' + m + '</span></td><td class="small">' + svc.map(l => esc(short(l.s)) + (l.s.billing === 'once' ? ' <span class="chip">One-time</span>' : '') + ' <span class="muted num">' + sm(l.amount) + '</span>').join('<br>') + (adj.length ? '<br>' + adj.map(l => '<span class="' + (l.dep ? 'depline' : 'muted') + '">' + esc(l.name) + ' <span class="num">−' + sm(-l.amount) + '</span></span>').join('<br>') : '') + '</td><td class="right num"><b>' + (dep && invTotal(c, m) <= 0 ? 'Covered by deposit' : sm(invTotal(c, m))) + '</b></td></tr>');
  }
  return '<div class="scroll"><table class="tbl invest"><thead><tr><th>Month</th><th>What is billed</th><th class="right">Invoice</th></tr></thead><tbody>' +
    (dep ? '<tr class="deprow"><td><b>On acceptance</b><br><span class="small muted">' + (sec ? 'Security deposit' : 'Deposit') + '</span></td><td class="small">' + (c.quote.deposit && L.cleanDeposit(c.quote.deposit).type === 'months' ? L.cleanDeposit(c.quote.deposit).value + ' month' + (L.cleanDeposit(c.quote.deposit).value === 1 ? '' : 's') + ' of fees. ' : c.quote.deposit && L.cleanDeposit(c.quote.deposit).type === 'pct' ? L.cleanDeposit(c.quote.deposit).value + '% of the contract. ' : '') + esc(L.depUse(c)) + '</td><td class="right num"><b>' + sm(dep) + '</b></td></tr>' : '') + rows.join('') +
    '</tbody><tfoot>' + (() => { let disc = 0; const names = new Set(); for (let m = 1; m <= n; m++) invLines(c, m).forEach(l => { if (l.disc) { disc -= l.amount; names.add(l.name.replace(/ \(.*\)$/, '')); } }); return disc > 0 ? '<tr class="sumrow"><td colspan="2">Before discounts</td><td class="right num">' + sm(total + disc) + '</td></tr><tr class="sumrow save"><td colspan="2">Total discounts over the term <span class="small muted">' + esc([...names].join(', ')) + '</span></td><td class="right num"><b>−' + sm(disc) + '</b></td></tr>' : ''; })() + '<tr><td colspan="2"><b>' + (rn ? 'Renewal total' : 'Full term') + '</b> <span class="small muted">' + n + ' months, ' + mName(c, 1) + ' to ' + mName(c, n) + (dep && sec ? ', plus the ' + sm(dep) + ' security deposit' : '') + '</span></td><td class="right num"><b style="font:600 22px var(--display)">' + sm(total) + '</b></td></tr></tfoot></table></div>';
}
/* admin: record the signed copy of a quotation accepted outside the portal */
function signedAdmin(c) {
  const sg = c.quote.signed;
  if (sg && !S.editSigned) return '<p class="small row" style="margin:0;gap:8px">' + I('tick', 'sm') + '<span>Signed copy: <b>' + esc(sg.name) + '</b> on ' + longDate(sg.date) + '. The client sees this as the signature on their Proposal page.</span><button class="link" data-a="q-signed-edit">Edit</button></p>';
  return '<div class="card stack prepcard"><div><b>Record the signed copy</b><br><span class="small muted">This quotation was accepted outside the portal. Add who signed it and when, so the client\'s Proposal page shows the signature.</span></div><div class="row" style="align-items:flex-end">' + field('qs-name', 'Signed by', sg ? sg.name : c.contact || '') + field('qs-date', 'Date signed', sg ? sg.date : '', 'date') + btn('Save', 'q-signed', { cid: c.id }) + (sg ? btn('Remove', 'q-signed-clear', { cid: c.id }, 'quiet') + btn('Cancel', 'q-signed-edit', {}, 'quiet') : '') + '</div></div>';
}
const longDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const fullAt = v => v ? new Date(v).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' (Singapore time)' : '';
/* the acceptance record at the end of an accepted proposal: the typed signature, or a note when it was confirmed outside the portal */
function signBlock(c) {
  const q = c.quote, a = q.acceptedBy, terms = (a && a.terms) || q.terms;
  if (a && a.name) return '<div class="card stack signblock"><span class="eyebrow">Signature</span><div class="sig">' + esc(a.name) + '</div><div class="sigline"></div><p class="small" style="margin:0"><b>' + esc(a.name) + '</b>' + (a.email ? ' (' + esc(a.email) + ')' : '') + ', for ' + esc(c.company) + '</p><p class="small muted" style="margin:0">Signed in the client portal on ' + fullAt(a.at) + (terms ? ', agreeing to this proposal and the Terms and Conditions above.' : ', agreeing to this proposal.') + '</p></div>';
  if (q.signed) return '<div class="card stack signblock"><span class="eyebrow">Signature</span><div class="sig">' + esc(q.signed.name) + '</div><div class="sigline"></div><p class="small" style="margin:0"><b>' + esc(q.signed.name) + '</b>, for ' + esc(c.company) + '</p><p class="small muted" style="margin:0">Signed on ' + longDate(q.signed.date) + (terms ? ', agreeing to this proposal and the Terms and Conditions above.' : ', agreeing to this proposal.') + ' Gioia keeps the signed copy.</p></div>';
  return '<div class="card stack signblock"><span class="eyebrow">Acceptance</span><p class="small" style="margin:0"><b>Accepted' + (q.acceptedAt ? ' on ' + fullAt(q.acceptedAt) : '') + '</b> for ' + esc(c.company) + '.</p><p class="small muted" style="margin:0">This proposal was confirmed with Gioia outside the portal, so there is no online signature here.' + (terms ? ' The Terms and Conditions above apply.' : '') + '</p></div>';
}
function proposalPage(c0, rn, record) {
  const c = rn ? L.pseudo(c0, rn) : c0, rd = { rid: rn ? rn.id : '' }, from0 = rn ? L.rnFrom(c0, rn) : 1;
  const q = c.quote, B = S.brand, sched = L.schedule(c), m1 = invTotal(c, 1), dep = L.depositAmt(c), depI = L.depositInv(c0), total = L.contractTotal(c);
  const welcome = q.welcome || (rn ? '' : B.welcome) || '', from = (B.company || 'GIOIA').replace(/ PRIVATE LIMITED| PTE\.? LTD\.?/i, '');
  const status = record ? '<div class="banner"><span class="big">' + I('tick') + '</span><div><h2 style="font-size:24px">The proposal you accepted</h2><p style="margin:4px 0 0">' + (q.acceptedBy && q.acceptedBy.name ? 'Signed by ' + esc(q.acceptedBy.name) + ' on ' + fullAt(q.acceptedBy.at) + '.' : q.signed ? 'Signed by ' + esc(q.signed.name) + ' on ' + longDate(q.signed.date) + '.' : q.acceptedAt ? 'Accepted on ' + fullAt(q.acceptedAt) + '.' : 'Accepted.') + '</p></div></div>' : q.status === 'accepted' ? '<div class="banner">' + '<span class="big">' + I('tick') + '</span><div><h2 style="font-size:24px">' + (rn ? 'Renewal accepted, thank you' : 'Accepted, thank you') + '</h2><p style="margin:4px 0 0">' + (q.acceptedBy && q.acceptedBy.name ? 'Signed by ' + esc(q.acceptedBy.name) + ' on ' + fmtAt(q.acceptedBy.at) + (q.acceptedBy.terms ? ', agreeing to the Terms and Conditions' : '') + '. ' : '') + (rn ? 'The new months are now in your deliverables, and their invoices are below.' : 'Your first invoice is below. Your deliverables unlock as soon as it is paid.') + '</p></div></div>' : q.status === 'declined' ? '<div class="card stack"><h2>You declined this proposal</h2><p class="muted" style="margin:0">Thank you for letting us know. If you change your mind, just tell us and we will send an updated proposal here.</p></div>' : q.status === 'changes' ? '<div class="card stack"><h2>Changes requested</h2><p style="margin:0">' + esc(lastResp(q, 'changes')) + '</p><p class="muted small" style="margin:0">We are working on an updated proposal and will let you know when it is here.</p></div>' : (q.version || 1) > 1 ? '<div class="card stack"><h2>Updated proposal, version ' + q.version + '</h2>' + (lastResp(q, 'changes') ? '<p class="muted" style="margin:0">You asked: "' + esc(lastResp(q, 'changes')) + '"</p>' : '') + '</div>' : '';
  const svcCard = s => '<div class="pcard"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">' + (s.billing === 'once' ? 'One-time' : 'Monthly') + '</span><h3>' + esc(short(s)) + '</h3></div><div class="right"><b class="num" style="font:600 22px var(--display)">' + sm(s.price) + '</b><br><span class="small muted">' + (s.billing === 'once' ? 'in ' + mName(c, 1) : 'per month') + '</span>' + (rn && L.ql(c0, s.id) && curPrice(c0, L.ql(c0, s.id)) !== s.price ? '<br><span class="small muted">was ' + sm(curPrice(c0, L.ql(c0, s.id))) + '</span>' : rn && !L.ql(c0, s.id) ? '<br><span class="chip">New</span>' : '') + '</div></div><ul>' + s.bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>' + (s.note ? '<p class="small muted" style="margin:0">' + esc(s.note) + '</p>' : '') + '</div>';
  const steps = rn ? [['Accept the renewal', 'Tick the terms and type your name below.'], ['First renewal invoice', 'Invoice ' + L.invNo(S.invFormat, c0.quote.no, from0) + ' for ' + sm(m1) + ', due ' + due(c, 1) + '.'], ['Work continues', mName(c, 1) + ', in the same deliverables. Each month unlocks when its invoice is paid.']] : [['Accept the proposal', 'Tick the terms and type your name below.'], ...(dep ? [['Deposit', 'Invoice ' + q.no + '-D for ' + sm(dep) + ', ready in your portal as soon as you accept. Preparation starts once it is paid. ' + L.depUse(c)]] : []), ['First invoice', 'Invoice ' + (L.invNo(S.invFormat, q.no, 1)) + ' for ' + sm(m1) + ', due ' + due(c, 1) + '.'], ['Preparation and kick-off', 'We set up together: logins, brand assets and goals.'], ['Work begins', mName(c, 1) + '. Each month unlocks when its invoice is paid.']];
  const act = q.status === 'sent' ? '<div class="card stack accept" id="accept"><h2>' + (rn ? 'Accept this renewal' : 'Accept this proposal') + '</h2><label class="opt"><input type="checkbox" id="qx-agree"><span>' + (B.terms ? 'I have read this proposal and the <a href="#terms" data-a="noop-terms">Terms and Conditions</a> above, and I agree to them on behalf of ' + esc(c.company) + '.' : 'I have read this proposal and agree to it on behalf of ' + esc(c.company) + '.') + '</span></label>' + field('qx-name', 'Your full name, as your signature', '') + '<div class="row">' + btn(I('tick', 'sm') + (rn ? 'Accept renewal' : 'Accept proposal'), 'q-accept-go', rd, 'bigbtn') + btn(I('chat', 'sm') + 'Request changes', 'q-changes-open', rd, 'ghost') + btn('Decline', 'q-decline-open', rd, 'quiet') + '</div><p class="small muted" style="margin:0">Signed as ' + esc(D.me.email) + '. We record your name and the time you accept.</p></div>' : '';
  return '<div class="proposal stack"><div class="phero"><span class="eyebrow">' + (rn ? 'Renewal proposal ' : 'Proposal ') + esc(q.no) + ((q.version || 1) > 1 ? ' · version ' + q.version : '') + ' · ' + esc(q.date) + '</span><h1>' + esc(pname(c)) + '</h1><p class="muted" style="margin:0">' + (rn ? 'To continue from ' + mName(c, 1) + ' to ' + mName(c, q.months) + ', for ' : 'Prepared for ') + esc(c.company) + ' by ' + esc(from) + '</p><div class="row">' + pill(q.status === 'sent' ? 'awaiting' : q.status, q.status === 'sent' ? 'Awaiting your decision' : q.status === 'changes' ? 'Changes requested' : '') + (rn ? btn(I('doc', 'sm') + 'View renewal', 'rn-doc', { cid: c0.id, rid: rn.id }, 'quiet') : btn(I('doc', 'sm') + 'View quotation', 'doc', { type: 'quote', cid: c.id }, 'quiet')) + '</div></div>' + status +
    (welcome && !record ? '<div class="card welcome"><p style="margin:0;white-space:pre-wrap">' + esc(welcome.replace(/\{name\}/g, c.contact || '').replace(/\{company\}/g, c.company)) + '</p></div>' : '') +
    (rn ? progressCard(c0) : '') + '<h2>' + (rn ? 'What we will continue with' : 'What we will do') + '</h2><div class="grid g2">' + q.lines.map(svcCard).join('') + '</div>' +
    '<div class="card stack"><h2>Investment</h2>' + investTable(c, dep, rn, total) + '</div>' +
    (q.status !== 'accepted' ? '<div class="card stack"><h2>What happens next</h2><ol class="nextsteps">' + steps.map(([h, p]) => '<li><b>' + esc(h) + '</b><span class="small muted">' + esc(p) + '</span></li>').join('') + '</ol></div>' : '') +
    (record ? '' : q.status === 'accepted' ? '<h2>Your invoices</h2>' + invoicesTab(c0, true) : rn ? '' : '<div class="stack"><h2>Your client portal</h2><p class="muted" style="margin:0">Once you accept, this is where we work together: you review and approve each piece, send us materials, and see your invoices.</p><div class="grid g3">' + q.lines.map(s => '<div class="wscard" style="cursor:default"><div class="row between"><span class="eyebrow">' + (s.billing === 'once' ? 'One-off' : 'Monthly') + '</span>' + pill('locked', 'Opens after payment') + '</div><h2>' + esc(short(s)) + '</h2><span class="small muted">' + (s.tasks || []).length + ' tasks' + (s.billing === 'monthly' ? ' each month' : '') + '</span></div>').join('') + '</div></div>') +
    (B.terms || q.terms || (q.acceptedBy && q.acceptedBy.terms) ? (q.status === 'sent' ? '<div class="card stack" id="terms"><div class="row between"><h2>Terms and Conditions</h2><span class="small muted">Please read before accepting</span></div><div class="terms tbox">' + termsHtml(B.terms) + '</div></div>' : '<details class="card" id="terms"' + (S.openTerms || record ? ' open' : '') + '><summary class="lab" style="cursor:pointer">' + (q.acceptedBy && q.acceptedBy.terms ? 'Terms and Conditions you agreed to' : 'Terms and Conditions') + '</summary><div class="terms" style="margin-top:10px">' + termsHtml(q.acceptedBy && q.acceptedBy.terms || q.terms || B.terms) + '</div></details>') : '') + (record ? signBlock(c) : '') + act + '</div>';
}
/* a monthly service shows every month of the contract; months not yet paid are locked, with the invoice that opens them */
function portalMonths(c, s) {
  const n = c.quote.months, m = Math.min(Math.max(1, S.pwm || currentMonth(c)), n);
  const tabs = '<div class="tabs" style="border-bottom:1px solid var(--line);overflow-x:auto">' + Array.from({ length: n }, (_, k) => k + 1).map(x => { const i = inv(c, x), paid = i && i.status === 'paid'; return '<button data-a="pwm" data-m="' + x + '" aria-selected="' + (x === m) + '">' + MONTHS[ym(c, x).mo].slice(0, 3) + ' ' + String(ym(c, x).y).slice(2) + (paid ? '' : ' 🔒') + '</button>'; }).join('') + '</div>';
  const i = inv(c, m), planned = c.tasks.filter(t => t.svc === s.id && t.m === m);
  if (i && i.status === 'paid') return { m, tabs, locked: '' };
  return { m, tabs, locked: '<div class="lockbox">' + I('clock') + '<h2>' + esc(mName(c, m)) + ' is locked</h2><p>This month unlocks as soon as invoice <b>' + esc(i ? i.no : '') + '</b>' + (i ? ' (' + sm(invTotal(c, m)) + ')' : '') + ' is paid.' + (planned.length ? ' Here is what is planned:' : '') + '</p>' + (planned.length ? '<ul class="planned">' + planned.map(t => '<li>' + esc(t.title) + '</li>').join('') + '</ul>' : '') + (i && i.status !== 'void' ? '<div>' + btn(I('doc', 'sm') + 'View invoice', 'doc', { type: 'inv', m, cid: c.id }, 'ghost') + '</div>' : '') + '</div>' };
}
function portalTasks(c) {
  const ids = wsList(c).map(s => s.id); if (S.pws && !ids.includes(S.pws)) S.pws = '';
  const ps = S.pws ? ql(c, S.pws) : null, pm = ps && ps.billing === 'monthly' && !ps.adhoc ? portalMonths(c, ps) : null;
  const all = c.tasks.filter(t => canSee(c, t) && (!S.pws || t.svc === S.pws) && (!pm || t.m === pm.m)).sort((a, b) => cRank(a) - cRank(b) || ((a.due || '9') < (b.due || '9') ? -1 : 1));
  const shown = S.ptg ? all.filter(t => tGroup(t) === S.ptg) : all;
  return '<div><h1>Tasks</h1><p class="muted" style="margin:4px 0 0">Review work, send what\'s needed and give your approvals.</p></div>' +
    '<label class="wsselect" for="p-ws">' + I('layers') + '<span style="flex:1;display:flex;flex-direction:column"><span class="small muted">Deliverable</span><select id="p-ws" data-pws="1"><option value="">All deliverables</option>' + wsList(c).map(s => '<option value="' + esc(s.id) + '"' + (S.pws === s.id ? ' selected' : '') + '>' + esc(short(s)) + '</option>').join('') + '</select></span></label>' +
    (pm ? pm.tabs : '') + (pm && pm.locked ? pm.locked : chipsHtml(all, S.ptg, 'p-group', S.role === 'client' ? CGROUPS : null) + taskTable(shown.map(t => ({ c, t })), 'assignee')) + '<p class="small muted" style="margin:0">' + (pm ? 'Each month unlocks once its invoice is paid.' : 'Choose a deliverable to see it month by month. Each month unlocks once its invoice is paid.') + '</p>';
}
function portalShell() {
  const c = client(), open = c.tasks.filter(t => canSee(c, t));
  if (!hasAccess(c)) {
    if (!['proposal', 'details', 'help'].includes(S.ptab)) S.ptab = 'proposal';
    const ptabs = [['proposal', c.quote.status === 'accepted' ? 'Proposal and invoices' : 'Your proposal', 'doc'], ['details', 'My details', 'user'], ['help', 'Help', 'help']];
    const pbody = S.ptab === 'help' ? helpPage() : S.ptab === 'details' ? '<h1>My details</h1><div class="card stack" style="max-width:560px">' + field('d-company', 'Company', c.company) + field('d-contact', 'Contact person', c.contact) + field('d-phone', 'Phone', c.phone) + field('d-website', 'Website', c.website) + '<p class="small muted" style="margin:0">Signed in with Google.</p><div>' + btn('Save details', 'save-details') + '</div></div>' + emailPrefCard() : proposalPage(c);
    return '<div class="app"><aside class="side"><div class="logo">' + logoImg('white', 46) + '<span class="desk">Client portal</span></div><div class="sidelab">' + esc(c.company) + '</div>' + ptabs.map(([k, l, ic]) => '<button class="nav" data-a="ptab" data-t="' + k + '" aria-current="' + (S.ptab === k) + '">' + I(ic) + '<span class="lbl">' + l + '</span></button>').join('') + '</aside><div class="main"><header class="topbar"><div class="row" style="gap:10px">' + logoTile(c.company, c.logo, 'width:36px;height:36px;font-size:13px;border-radius:8px') + '<b>' + esc(c.company) + '</b>' + (S.clients.length > 1 ? projectSwitch(c) : '') + '</div>' + topRight() + '</header><main class="page">' + pbody + '</main></div></div>';
  }
  const awaiting = open.filter(t => t.status === 'awaiting'), tosend = open.filter(t => ['cdraft', 'creview'].includes(t.status)), n = awaiting.length + tosend.length;
  const rp = L.renewals(c).find(r => ['sent', 'changes', 'declined'].includes(r.status)) || (S.ptab === 'renewal' && L.renewals(c).filter(r => r.status === 'accepted').pop());
  if (S.ptab === 'renewal' && !rp) S.ptab = 'overview';
  const tabs = [['overview', 'Overview', 'home'], ...(rp ? [['renewal', 'Renewal proposal', 'refresh']] : []), ['workspaces', 'Deliverables', 'layers'], ['tasks', 'Tasks', 'check'], ['files', 'Files', 'folder'], ['invoices', 'Invoices', 'receipt'], ...(c.quote.status === 'accepted' ? [['proposal', 'Proposal', 'doc']] : []), ['details', 'My details', 'user'], ['help', 'Help', 'help']];
  const curTab = S.ptab === 'task' ? 'tasks' : S.ptab;
  let body;
  if (S.ptab === 'task') body = taskPage(c, c.tasks.find(x => x.id === S.tid));
  else if (S.ptab === 'overview') body = (rp && rp.status === 'sent' ? '<div class="card row between prepcard"><span class="row" style="gap:12px;flex-wrap:nowrap">' + I('refresh') + '<span><b>Your renewal proposal is ready</b><br><span class="small muted">' + rp.months + ' more months, ' + mName(c, c.quote.months + 1) + ' to ' + mName(c, c.quote.months + rp.months) + '. Have a look and let us know.</span></span></span>' + btn('View renewal', 'ptab', { t: 'renewal' }) + '</div>' : '') + clientOverview(c, open, awaiting, tosend);
  else if (S.ptab === 'renewal') body = proposalPage(c, rp);
  else if (S.ptab === 'proposal') body = proposalPage(c, null, true);
  else if (S.ptab === 'workspaces') body = '<h1>Deliverables</h1>' + wsCards(c);
  else if (S.ptab === 'tasks') body = portalTasks(c);
  else if (S.ptab === 'files') body = '<h1>Files</h1>' + filesTab(c);
  else if (S.ptab === 'invoices') body = '<h1>Invoices</h1>' + invoicesTab(c, true);
  else if (S.ptab === 'help') body = helpPage();
  else body = '<h1>My details</h1><div class="card stack" style="max-width:560px">' + field('d-company', 'Company', c.company) + field('d-contact', 'Contact person', c.contact) + field('d-phone', 'Phone', c.phone) + field('d-website', 'Website', c.website) + '<p class="small muted" style="margin:0">Signed in with Google.</p><div>' + btn('Save details', 'save-details') + '</div></div>' + emailPrefCard();
  const side = '<aside class="side"><div class="logo">' + logoImg('white', 46) + '<span class="desk">Client portal</span></div><div class="sidelab">' + esc(c.company) + '</div>' + tabs.map(([k, l, ic]) => '<button class="nav" data-a="ptab" data-t="' + k + '" aria-current="' + (curTab === k) + '">' + I(ic) + '<span class="lbl">' + l + '</span>' + (k === 'renewal' && rp.status === 'sent' ? '<span class="badge">1</span>' : k === 'overview' && n ? '<span class="badge">' + n + '</span>' : k === 'tasks' && awaiting.length ? '<span class="badge">' + awaiting.length + '</span>' : '') + '</button>').join('') + '</aside>';
  return '<div class="app">' + side + '<div class="main"><header class="topbar"><div class="row" style="gap:10px">' + logoTile(c.company, c.logo, 'width:36px;height:36px;font-size:13px;border-radius:8px') + '<b>' + esc(c.company) + '</b>' + (S.clients.length > 1 ? projectSwitch(c) : '<span class="small muted">' + esc(pname(c)) + '</span>') + '</div>' + topRight() + '</header><main class="page">' + body + '</main></div></div>';
}
/* ---------- drawers ---------- */
function timelineHtml(t) {
  const steps = (t.history || []).slice(-5).map(h => ['on', h.text, h.by, fmtAt(h.at)]), nx = nextStep(t);
  if (nx) steps.push(['', nx[0], nx[1], '']);
  if (!steps.length) return '<p class="small muted" style="margin:0">No activity yet.</p>';
  return '<div class="tl">' + steps.map(([on, title, sub, at]) => '<div class="tls"><span class="dot ' + on + '">' + (on ? I('tick', 'sm') : '') + '</span><div><b>' + esc(title) + '</b><div class="small muted">' + esc(sub) + '</div></div><span class="small muted">' + at + '</span></div>').join('') + '</div>';
}
const tpw = (id, h) => h ? '<div id="' + id + '" class="stack" style="gap:inherit">' + h + '</div>' : '';
function taskPage(c, t) {
  if (!t) return '<div class="lockbox">This task no longer exists.</div>';
  const A = staff(), E = A && !vendorMe(), s = ql(c, t.svc), m = member(t.assignee), cl = S.role === 'client';
  const canSt = A && taskOpen(c, t) && statusOpts(t).length > 1 && !(staged(t) && !curStage(t));
  if (cl && S.confirm === t.id) {
    const mine = t.comments.filter(x => x.client).slice(-1)[0];
    return '<div class="tpage"><button class="backlink" data-a="task-back">' + I('back') + '<h1>Review submitted</h1></button><div class="banner"><span class="big">' + I('tick') + '</span><div><h2 style="font-size:26px">Approved</h2><p style="margin:4px 0 0">You have approved “' + esc(t.title) + '”.</p></div></div>' +
      (mine ? '<div class="stack"><h2>Your comment</h2><div class="card row" style="flex-wrap:nowrap">' + I('chat') + '<span>' + esc(mine.text) + '</span></div></div>' : '') + '<div class="stack"><h2>Activity timeline</h2><div class="card">' + timelineHtml(t) + '</div></div>' + btn(I('back', 'sm') + 'Back to tasks', 'task-back', {}, 'block bigbtn') + '</div>';
  }
  const label = cLabel(t);
  const assignee = staged(t) ? withNow(c, t) : E ? '<select id="dr-as" data-as="' + t.id + '" aria-label="Assignee"><option value="@client"' + (t.owner === 'client' ? ' selected' : '') + '>Client</option><option value=""' + (t.owner !== 'client' && !t.assignee ? ' selected' : '') + '>Team · unassigned</option>' + teamOpts(t.owner === 'client' ? '' : t.assignee) + '</select>' : E && t.owner === 'gioia' ? '<select id="dr-as" data-as="' + t.id + '" aria-label="Assignee"><option value="">Unassigned</option>' + teamOpts(t.assignee) + '</select>' : '<b>' + (t.owner === 'client' ? (cl ? 'You' : esc(c.contact || 'Client')) : esc(m ? m.name : 'Unassigned')) + '</b>';
  const dueCell = E ? '<input id="dr-due" type="date" data-due="' + t.id + '" value="' + esc(t.due) + '" aria-label="Due date">' : '<b>' + (t.due ? dlong(t.due) : '—') + '</b>';
  const head = '<div class="card stack" style="gap:14px"><div class="row" style="gap:16px;flex-wrap:nowrap;align-items:flex-start"><span class="ticon lg">' + I(svcIcon(t.svc)) + '</span><div class="stack" style="gap:8px">' + (E && S.renaming === t.id ? '<div class="row" style="gap:8px;flex-wrap:nowrap"><input id="tr-title" value="' + esc(t.title) + '" aria-label="Task name" style="font:600 22px var(--display);min-width:280px">' + btn('Save', 'tr-save', { id: t.id }) + btn('Cancel', 'tr-cancel', {}, 'quiet') + '</div>' : '<div class="row" style="gap:6px;flex-wrap:nowrap;align-items:center"><h1 style="font-size:26px">' + esc(t.title) + '</h1>' + (E ? '<button class="iconbtn" data-a="tr-open" data-id="' + t.id + '" aria-label="Rename task" title="Rename task">' + I('edit', 'sm') + '</button>' : '') + (isAdmin() ? '<button class="iconbtn" data-a="td-open" data-id="' + t.id + '" aria-label="Delete task" title="Delete task">' + I('trash', 'sm') + '</button>' : '') + '</div>') + '<span class="row" style="gap:6px">' + (canSt ? '<select class="stpill pill ' + (TONE[t.status] || '') + '" data-ts="' + t.id + '" aria-label="Status" title="Change the status">' + statusOpts(t).map(k => '<option value="' + k + '"' + (t.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>').join('') + '</select>' : pill(t.status, label)) + (t.approve && t.rounds ? '<span class="chip">Revision ' + t.rounds + ' of 2</span>' : '') + '</span></div></div>' +
    '<div class="metarow"><div>' + I('user') + '<div class="stack" style="gap:2px;flex:1"><span class="small muted">' + (staged(t) ? 'With now' : cl ? 'Assigned to' : 'Assignee') + '</span><span class="row" style="gap:8px;flex-wrap:nowrap">' + (staged(t) ? whoAv(c, t) : t.owner === 'client' ? stepAv(c, { owner: 'client' }) : avatar(t.assignee)) + assignee + '</span></div></div>' + (A ? '<div>' + I('building') + '<div class="stack" style="gap:2px"><span class="small muted">Client</span><b>' + esc(c.company) + '</b></div></div>' : '') + '<div>' + I('cal') + '<div class="stack" style="gap:2px;flex:1"><span class="small muted">Due date</span>' + dueCell + '</div></div>' + vcCell(c, t) + '</div></div>';
  const desc = '<div class="stack" style="gap:6px"><h2>Description</h2>' + (A ? '<textarea id="dr-desc" class="grow" data-desc="' + t.id + '" placeholder="What was done, and what the client should check. The client sees this.">' + esc(t.desc) + '</textarea>' : '<p style="margin:0;white-space:pre-wrap">' + (t.desc ? esc(t.desc) : '<span class="muted">No description.</span>') + '</p>') + '<span class="small muted">' + esc(short(s)) + (t.m ? ' · ' + mName(c, t.m) : '') + '</span></div>';
  const cs = curStage(t);
  const status = '';
  const stepsEdit = E && S.editSteps === t.id ? '<div class="card stack"><div class="field"><label for="dr-steps">Steps, one per line. Start each with <b>Client:</b>, <b>Client reviews:</b>, <b>Client approves:</b>, <b>Team:</b> or a team member\'s name, such as <b>' + esc((S.team[1] || S.team[0] || { name: 'Jo' }).name.split(' ')[0]) + ':</b></label><textarea id="dr-steps" rows="9" placeholder="Client: Send the draft&#10;Jo: Edit and optimise&#10;Client approves: Approve the final version&#10;Team: Publish">' + esc(staged(t) ? L.stepsText(t.stages, S.team) : '') + '</textarea></div>' + tplBar('dr-steps') + '<p class="small muted" style="margin:0">' + (staged(t) ? 'Steps already completed stay completed. Clear the box to remove the steps.' : 'The task will start at step 1, and its status will follow whose step it is. The client sees the steps too.') + '</p><div class="row">' + btn('Save steps', 't-steps-save', { id: t.id }) + btn('Cancel', 'steps-cancel', {}, 'quiet') + '</div></div>' : '';
  const stepsBox = stepsEdit ? '<div class="stack" style="gap:8px"><h2>Steps</h2>' + stepsEdit + '</div>' : !staged(t) ? (E ? '<div class="row between card"><span><b>No steps yet.</b> <span class="muted small">Add steps when this work passes back and forth with the client.</span></span>' + btn(I('plus', 'sm') + 'Add steps', 'steps-edit', { id: t.id }, 'ghost') + '</div>' : '') : staged(t) ? '<div class="stack" id="steps" style="gap:8px;scroll-margin-top:90px"><div class="row between"><h2>Steps</h2>' + (E ? '<span class="row small" style="gap:8px"><label for="dr-stage" class="muted">Current step</label><select id="dr-stage" data-stage="' + t.id + '" style="width:auto">' + t.stages.map((x, i) => '<option value="' + i + '"' + (t.stage === i ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(x.title) + '</option>').join('') + '<option value="' + t.stages.length + '"' + (t.stage >= t.stages.length ? ' selected' : '') + '>All completed</option></select><button class="link" data-a="steps-edit" data-id="' + t.id + '">Edit steps</button></span>' : '<span class="small muted">Step ' + Math.min(t.stage + 1, t.stages.length) + ' of ' + t.stages.length + '</span>') + '</div><div class="card steps">' +
    t.stages.map((x, i) => { const who = x.owner === 'client' ? (cl ? 'You' : esc(c.contact || 'Client')) + (x.kind === 'approve' ? ' · approval' : x.kind === 'review' ? ' · review' : '') : esc((member(x.assignee) || {}).name || 'Team'), late = x.due && !x.done && x.due < TODAY;
      const ctl = E && !x.done ? '<div class="stpctl">' + (x.owner === 'gioia' ? '<select data-sas="' + t.id + '|' + i + '" aria-label="Step ' + (i + 1) + ' assignee"><option value="">Team (unassigned)</option>' + teamOpts(x.assignee) + '</select>' : '') + '<input type="date" data-sdue="' + t.id + '|' + i + '" value="' + esc(x.due || '') + '" aria-label="Step ' + (i + 1) + ' due date"' + (late ? ' class="late"' : '') + '></div>' : '';
      const now = i === t.stage ? (A && x.owner === 'gioia' ? btn(I('tick', 'sm') + 'Mark done', 't-step', { id: t.id }, 'sm') : A ? btn('Done for client', 'stage-next', { id: t.id }, 'quiet sm') : cl && x.owner === 'client' && x.kind !== 'approve' ? btn(I('tick', 'sm') + 'Done', 't-step', { id: t.id }, 'sm') : '<span class="pill gold">Now</span>') : '';
      return '<div class="stp' + (i === t.stage ? ' now' : '') + (x.done ? ' done' : '') + '"><span class="dot ' + (x.done ? 'on' : '') + '">' + (x.done ? I('tick', 'sm') : i + 1) + '</span><div style="flex:1;min-width:0"><b>' + esc(x.title) + '</b><div class="small muted">' + who + (x.due && (!A || x.done) ? ' · <span' + (late ? ' style="color:var(--crit);font-weight:600"' : '') + '>due ' + dshort(x.due) + '</span>' : '') + (x.done && x.by ? ' · done by ' + esc(x.by) + (x.at ? ', ' + fmtAt(x.at) : '') : '') + '</div>' + ctl + '</div>' + now + (i === t.stage - 1 && x.done && (A ? isAdmin() || x.by === (member(S.me) || {}).name : cl && x.owner === 'client' && !(t.stages[t.stage] && t.stages[t.stage].owner === 'gioia' && t.status !== 'todo')) ? '<button class="link small" data-a="t-step-undo" data-id="' + t.id + '" title="Marked done by mistake? Put this step back.">Undo</button>' : '') + '</div>'; }).join('') + '</div></div>' : '';

  const canAdd = A || (cl && needsClient(t));
  const files = '<div class="stack" id="atts" style="gap:8px;scroll-margin-top:90px"><h2>Attachment (' + t.files.length + ')</h2>' + (t.files.length ? '<div class="card files" style="padding:0 14px">' + t.files.map(fileRow).join('').replace('class="file"', 'class="file" style="border-top:0"') + '</div>' : '<p class="small muted" style="margin:0">Nothing attached yet.</p>') + '<input type="file" id="up-' + t.id + '" data-up="' + t.id + '" multiple hidden>' +
    (canAdd ? '<div class="grid g2">' + btn(I('upload') + 'Upload file', 'pick-file', { key: t.id }, 'quiet block bigbtn') + btn(I('link') + 'Add Google link', 'link-open', { key: t.id }, 'quiet block bigbtn') + '</div>' : '') + '</div>';
  const comments = '<div class="stack" id="cmts" style="gap:8px;scroll-margin-top:90px"><h2>' + (cl ? 'Activity &amp; comments' : 'Comments') + ' (' + t.comments.length + ')</h2><div class="card stack" style="gap:0;padding:0 16px">' + t.comments.map(x => { const long = x.text.length > 600 && !(S.cmOpen || []).includes(x.id), mine = (x.mentions || []).includes(D.me.key) || (cl && (x.mentions || []).includes('client'));
      return '<div id="cm-' + esc(x.id) + '" class="cmt2' + (x.internal ? ' internal' : '') + (mine ? ' tagged' : '') + '"><span class="av" style="width:36px;height:36px">' + (x.client ? initials(c.contact) : initials(x.by)) + '</span><div style="flex:1;min-width:0"><div class="cmhead"><b>' + (cl && x.client ? 'You' : esc(x.client ? c.contact + ' (Client)' : x.by)) + '</b>' + (x.internal ? '<span class="chip">Team only</span>' : '') + (mine ? '<span class="chip tagchip">Mentions you</span>' : '') + '<span class="small muted" style="margin-left:auto;white-space:nowrap">' + fmtAt(x.at) + (isAdmin() || (x.key ? x.key === D.me.key : cl ? x.client : !x.client && x.by === (member(S.me) || {}).name) ? ' · <button class="link small" data-a="cm-del" data-id="' + t.id + '" data-c="' + esc(x.id) + '">Delete</button>' : '') + '</span></div><div class="cmtxt' + (long ? ' clamp' : '') + '">' + cmText(c, x) + '</div>' + (x.text.length > 600 ? '<button class="link small" data-a="cm-more" data-c="' + esc(x.id) + '">' + (long ? 'Show more' : 'Show less') + '</button>' : '') + '</div></div>'; }).join('') +
    (A ? '' : '') + '<div class="field" style="padding:12px 0"><label for="cm-text">' + (cl && t.status === 'awaiting' ? 'Your comment (needed to request changes, optional when approving)' : cl && staged(t) && cs && cs.owner === 'client' ? 'Add a note for the team (optional)' : 'Add a comment') + '</label><div class="mwrap"><textarea id="cm-text" class="grow" data-mention="' + c.id + '" placeholder="Write a comment. Type @ to tag someone."></textarea><div class="mlist" id="mlist" hidden></div></div><p class="small muted" style="margin:4px 0 0">' + (A ? 'Admins are told about every comment. Type @ to notify someone else on the project.' : 'Type @ to notify someone on the project.') + '</p>' + (cl && (t.status === 'awaiting' || (staged(t) && cs && cs.owner === 'client')) ? '' : '<div class="row">' + btn('Post comment', 't-comment', { id: t.id }, 'ghost') + (A ? '<label class="small row" style="gap:6px;cursor:pointer"><input type="checkbox" id="cm-internal"> Team only (the client won\'t see it)</label>' : '') + '</div>') + '</div></div></div>';
  let main = '';
  if (staged(t)) {
    if (!cs) main = '';
    else if (A && cs.owner === 'gioia') { const nx = t.stages[t.stage + 1]; main = btn(I('send') + 'Complete step ' + (t.stage + 1) + (nx ? ' and pass to ' + (nx.owner === 'client' ? 'the client' : 'the team') : ' and finish'), 't-step', { id: t.id }, 'block bigbtn'); }
    else if (A) main = '<div class="lockbox" style="padding:14px">Waiting for the client: ' + esc(cs.title) + '.</div>' + btn('Mark the client\'s step as done on their behalf', 'stage-next', { id: t.id }, 'quiet block');
    else if (cs.owner === 'client' && cs.kind === 'approve') main = '<div class="grid g2">' + btn(I('tick') + 'Approve', 't-approve', { id: t.id }, 'block bigbtn') + btn(I('chat') + 'Request changes', 't-changes', { id: t.id }, 'ghost block bigbtn', t.rounds >= 2) + '</div>' + (t.rounds >= 2 ? '<p class="small muted" style="margin:0;text-align:center">Both included revision rounds are used. Further changes are quoted separately.</p>' : '');
    else if (cs.owner === 'client') main = btn(I('send') + 'Done, send to the team', 't-step', { id: t.id }, 'block bigbtn') + '<p class="small muted" style="margin:0;text-align:center">Add any links above first. The team is notified straight away.</p>';
  } else if (A) {
    if (t.owner === 'gioia' && t.approve && ['todo', 'progress', 'changes', 'cdraft', 'creview'].includes(t.status)) main = btn(I('send') + (t.status === 'changes' ? 'Resubmit for client review' : 'Submit for client review'), 't-submit', { id: t.id }, 'block bigbtn');
    else if (t.status === 'approved' || (t.owner === 'gioia' && !t.approve && t.status !== 'done')) main = btn(I('tick') + 'Mark as completed', 't-done', { id: t.id }, 'block bigbtn') + '<p class="small muted row" style="justify-content:center;gap:6px;margin:0">' + I('clock', 'sm') + 'Approval doesn\'t complete a task, in case there are follow-up actions. The client is notified when you mark it as completed.</p>';
    else if (t.owner === 'client' && t.status !== 'done') main = btn(I('tick') + 'Mark as received', 't-done', { id: t.id }, 'block bigbtn');
    else if (t.status === 'awaiting') main = '<div class="lockbox" style="padding:14px">Waiting for the client to review. You\'ll be notified when they respond.</div>';
  } else {
    if (t.status === 'awaiting') main = '<div class="grid g2">' + btn(I('tick') + 'Approve', 't-approve', { id: t.id }, 'block bigbtn') + btn(I('chat') + 'Request changes', 't-changes', { id: t.id }, 'ghost block bigbtn', t.rounds >= 2) + '</div>' + (t.rounds >= 2 ? '<p class="small muted" style="margin:0;text-align:center">Both included revision rounds are used. Further changes are quoted separately.</p>' : '');
    else if (t.owner === 'client' && ['todo', 'cdraft'].includes(t.status)) main = btn(I('send') + 'Mark as sent to the team', 't-sent', { id: t.id }, 'block bigbtn');
  }
  const canPost = isAdmin() && t.m >= 1 && !['general', 'prep'].includes(t.svc) && !t.adhoc && t.status !== 'done' && t.m < c.quote.months;
  if (!taskOpen(c, t)) main = '<div class="lockbox" style="padding:14px">' + I('lock', 'sm') + ' This task is in a locked month. You can plan it now (title, steps, assignee, due date); it can be worked on once its month unlocks.</div>';
  const banner = A && t.status === 'approved' && !staged(t) ? '<div class="banner"><span class="big">' + I('tick') + '</span><div><h2 style="font-size:26px">Client approved</h2><p style="margin:4px 0 0">The client has approved “' + esc(t.title) + '”.</p></div></div>' : '';
  return '<div class="tpage"><button class="backlink" data-a="task-back">' + I('back') + '<h1>' + (banner ? 'Client approved' : 'Task details') + '</h1></button>' + banner + tpw('tk-head', head) + tpw('tk-steps', stepsBox) + tpw('tk-desc', desc) + status + tpw('tk-files', files) + tpw('tk-comments', comments) + '<div class="stack" style="gap:8px"><h2>Activity timeline</h2><div class="card">' + timelineHtml(t) + '</div></div>' + tpw('tk-main', main + (isAdmin() && t.status !== 'done' && taskOpen(c, t) ? btn(I('bell', 'sm') + 'Send reminder', 'nudge-open', { id: t.id }, 'ghost block') : '') + (canPost ? btn(I('cal', 'sm') + 'Postpone task', 'tpost-open', { id: t.id }, 'ghost block') : '')) + '</div>';
}
function tplBar(ta) {
  return '<div class="tplbar"><select data-tpl="' + ta + '" aria-label="Use a step template"><option value="">Use a saved template…</option>' + S.templates.map(t => '<option value="' + t.id + '">' + esc(t.name) + ' (' + t.count + ' steps)</option>').join('') + '</select><button class="link" data-a="tpl-save-open" data-ta="' + ta + '">Save these steps as a template</button><button class="link" data-a="tpl-manage">Manage templates</button></div>';
}
function prepTplSection() {
  const L2 = S.prepTemplates.slice().sort((x, y) => x.name.localeCompare(y.name));
  return '<div class="row between" style="margin-top:18px"><div><h1 style="font-size:30px">Preparation templates</h1><p class="muted" style="margin:4px 0 0">Ready-made lists of set-up tasks, such as logins, brand assets and kick-off. Add one to a project\'s Preparation deliverables in one click, then adjust it for that client.</p></div>' + btn(I('plus', 'sm') + 'New preparation template', 'ptpl-open', { id: '' }) + '</div>' +
    (L2.length ? '<div class="grid g2">' + L2.map(t => { const mine = isAdmin() || t.by === S.me;
      return '<div class="card stack"><div class="row between"><h2>' + esc(t.name) + '</h2><span class="chip">' + t.tasks.length + ' tasks</span></div><ol class="tplsteps">' + t.tasks.slice(0, 8).map(k => '<li>' + (k.owner === 'client' ? '<span class="chip client">Client</span> ' : '') + esc(k.title) + (k.steps ? ' <span class="small muted">· ' + L.toStages(k.steps, S.team).length + ' steps</span>' : '') + '</li>').join('') + (t.tasks.length > 8 ? '<li class="muted">and ' + (t.tasks.length - 8) + ' more</li>' : '') + '</ol><div class="row between"><span class="small muted">By ' + esc(t.byName || '') + (t.editedBy && t.editedBy !== t.byName ? ', last edited by ' + esc(t.editedBy) : '') + ' · ' + fmtAt(t.at) + '</span><span class="row" style="gap:6px">' + btn('Edit', 'ptpl-open', { id: t.id }, 'quiet') + (mine ? btn('Delete', 'ptpl-del', { id: t.id }, 'quiet') : '') + '</span></div></div>'; }).join('') + '</div>' : '<div class="lockbox"><h2>No preparation templates yet</h2><p>Create one here, or open a project\'s Preparation deliverables and click "Save as template".</p></div>');
}
function ptplRows() { return S.modal.rows; }
function ptplSync() { const M = S.modal; if (!M || M.kind !== 'ptpl') return; const n = document.getElementById('pt-name'); if (n) M.name = n.value; M.rows.forEach((r, i) => { const t = document.getElementById('pt-t-' + i), o = document.getElementById('pt-o-' + i), s = document.getElementById('pt-s-' + i); if (t) r.title = t.value; if (o) r.owner = o.value; if (s && s.value !== 'keep') r.steps = s.value ? (S.templates.find(z => z.id === s.value) || {}).steps || '' : ''; }); }
function ptplModal(M) {
  const stepSel = (r, i) => { const cur = S.templates.find(z => z.steps === r.steps); return '<select id="pt-s-' + i + '" data-ptrow="1" aria-label="Steps" style="width:auto"><option value="">No steps</option>' + (r.steps && !cur ? '<option value="keep" selected>Current steps (' + L.toStages(r.steps, S.team).length + ')</option>' : '') + S.templates.map(z => '<option value="' + z.id + '"' + (cur && cur.id === z.id ? ' selected' : '') + '>Steps: ' + esc(z.name) + '</option>').join('') + '</select>'; };
  return '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:760px"><h2>' + (M.id ? 'Edit preparation template' : 'New preparation template') + '</h2>' + field('pt-name', 'Template name', M.name || '', 'text', true) +
    '<div class="stack" style="gap:6px"><span class="lab">Tasks</span>' + M.rows.map((r, i) => '<div class="ptrow"><input id="pt-t-' + i + '" value="' + esc(r.title) + '" placeholder="Task, e.g. Send brand assets" aria-label="Task"><select id="pt-o-' + i + '" aria-label="Who does it" style="width:auto"><option value="gioia"' + (r.owner !== 'client' ? ' selected' : '') + '>Team</option><option value="client"' + (r.owner === 'client' ? ' selected' : '') + '>Client</option></select>' + stepSel(r, i) + '<button class="iconbtn" data-a="ptpl-row-del" data-i="' + i + '" aria-label="Remove task">' + I('x', 'sm') + '</button></div>').join('') + '<div>' + btn(I('plus', 'sm') + 'Add task', 'ptpl-row-add', {}, 'ghost') + '</div></div>' +
    '<p class="small muted" style="margin:0">Steps come from your Step templates, for tasks that pass between the team and the client. Adding the template to a project copies the tasks, so later changes here don\'t alter projects that already use it.</p><div class="row">' + btn('Save template', 'ptpl-save') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
}
const wrapM = (h, body, act, label) => '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:520px"><h2>' + h + '</h2>' + body + '<div class="row">' + btn(label, act) + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
function ptApplyModal(M, c) {
  const t = S.prepTemplates.find(z => z.id === M.tid) || S.prepTemplates[0], have = new Set(c.tasks.filter(z => z.svc === 'prep').map(z => z.title.toLowerCase()));
  if (!t) return wrapM('Add from a template', '<p class="muted" style="margin:0">There are no preparation templates yet. Create one under Templates.</p>', 'close-modal', 'OK');
  const fresh = t.tasks.filter(k => !have.has(k.title.toLowerCase()));
  return wrapM('Add preparation tasks from a template', '<div class="field"><label for="pa-t">Template</label><select id="pa-t" data-pat="1">' + S.prepTemplates.map(z => '<option value="' + z.id + '"' + (z.id === t.id ? ' selected' : '') + '>' + esc(z.name) + ' (' + z.tasks.length + ' tasks)</option>').join('') + '</select></div><ol class="tplsteps" style="max-height:260px;overflow:auto">' + t.tasks.map(k => '<li' + (have.has(k.title.toLowerCase()) ? ' class="muted"' : '') + '>' + (k.owner === 'client' ? '<span class="chip client">Client</span> ' : '') + esc(k.title) + (have.has(k.title.toLowerCase()) ? ' · already in this project' : '') + '</li>').join('') + '</ol>' + (c.prep !== 'open' ? '<label class="opt"><input type="checkbox" id="pa-start" checked><span>Open preparation now, so the client and team can start</span></label>' : '') + '<p class="small muted" style="margin:0">' + fresh.length + ' task' + (fresh.length === 1 ? '' : 's') + ' will be added. You can assign people and due dates afterwards.</p>', 'ptapply-go', 'Add ' + fresh.length + ' task' + (fresh.length === 1 ? '' : 's'));
}
function templatesPage() {
  return '<div class="row between"><div><h1>Templates</h1><h2 style="margin:14px 0 0">Step templates</h2><p class="muted" style="margin:4px 0 0">Named step flows the whole team can reuse, add to and edit. Pick one when adding steps to a task or a catalogue service, then adjust it for that client.</p></div>' + btn(I('plus', 'sm') + 'New template', 'tpl-open', { id: '' }) + '</div>' +
    (S.templates.length ? '<div class="grid g2">' + S.templates.slice().sort((x, y) => x.name.localeCompare(y.name)).map(t => { const st = L.toStages(t.steps, S.team), mine = isAdmin() || t.by === S.me;
      return '<div class="card stack"><div class="row between"><h2>' + esc(t.name) + '</h2><span class="chip">' + st.length + ' steps</span></div><ol class="tplsteps">' + st.map(x => '<li><span class="chip' + (x.owner === 'client' ? ' client' : '') + '">' + (x.owner === 'client' ? (x.kind === 'approve' ? 'Client approves' : x.kind === 'review' ? 'Client reviews' : 'Client') : esc((member(x.assignee) || {}).name || 'Team')) + '</span> ' + esc(x.title) + '</li>').join('') + '</ol><div class="row between"><span class="small muted">By ' + esc(t.byName || '') + (t.editedBy && t.editedBy !== t.byName ? ', last edited by ' + esc(t.editedBy) : '') + ' · ' + fmtAt(t.at) + '</span>' + '<span class="row" style="gap:6px">' + btn('Edit', 'tpl-open', { id: t.id }, 'quiet') + (mine ? btn('Delete', 'tpl-del-open', { id: t.id }, 'quiet') : '') + '</span>' + '</div></div>'; }).join('') + '</div>' : '<div class="lockbox"><h2>No templates yet</h2><p>Create one here, or open a task with steps and click "Save these steps as a template".</p></div>') + prepTplSection();
}
function tplModal(M) {
  const t = S.templates.find(x => x.id === M.id) || {};
  return '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:560px"><h2>' + (M.id ? 'Edit template' : 'Save as a step template') + '</h2>' + field('tp-name', 'Template name', M.name != null ? M.name : t.name || '', 'text', true) + '<div class="field"><label for="tp-steps">Steps, one per line. Start each with <b>Client:</b>, <b>Client reviews:</b>, <b>Client approves:</b>, <b>Team:</b> or a team member\'s name</label><textarea id="tp-steps" rows="10">' + esc(M.steps != null ? M.steps : t.steps || '') + '</textarea></div><p class="small muted" style="margin:0">Everyone on the team can see and use this template. Using it copies the steps, so later changes to the template don\'t alter tasks that already use it.</p><div class="row">' + btn('Save template', 'tpl-save', { id: M.id || '' }) + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
}
function budgetBox(b, label) {
  const over = b.balance < 0;
  return '<div class="stack" style="gap:10px"><span class="lab">' + esc(label) + '</span><div class="grid g3 budget"><div class="field"><span class="small muted">Service value</span><b class="num">' + sm(b.value) + '</b></div><div class="field"><span class="small muted">Given to the team</span><b class="num">' + sm(b.assigned) + '</b></div><div class="field"><span class="small muted">' + (over ? 'Over by' : 'Balance') + '</span><b class="num" style="color:var(--' + (over ? 'crit' : b.balance > 0 ? 'ok' : 'ink') + ')">' + sm(Math.abs(b.balance)) + '</b></div></div><span class="small muted">' + (over ? 'The fees add up to more than the client pays for this service.' : 'Every fee on the ' + b.tasks + ' task' + (b.tasks === 1 ? '' : 's') + ' in this service' + (b.s.billing === 'monthly' && !b.s.adhoc ? ' this month' : '') + ' counts towards it.') + '</span></div>';
}
function vcCell(c, t) {
  if (S.role === 'client') return '';
  const cost = L.taskCost(c, S.fees, t), n = cost.own.length + cost.share.length;
  if (!isAdmin()) return n ? '<div class="vccell" data-a="vc-open" data-id="' + t.id + '" role="button" tabindex="0">' + I('coins') + '<div class="stack" style="gap:2px"><span class="small muted">Your fee</span><b>' + sm(cost.total) + '</b></div></div>' : '';
  const v = L.taskValue(c, t), bud = L.svcBudget(c, S.fees, t.svc, t.m);
  return '<div class="vccell" data-a="vc-open" data-id="' + t.id + '" role="button" tabindex="0" title="Edit value and fees">' + I('coins') + '<div class="stack" style="gap:3px"><span class="small muted">Value and cost <span class="link">Edit</span></span>' + (bud ? '<span class="vcline">Balance <b' + (bud.balance < 0 ? ' style="color:var(--crit)"' : '') + '>' + sm(bud.balance) + '</b></span>' : '<span class="vcline">Client pays <b>' + sm(v) + '</b></span>') + '<span class="vcline">Team cost <b>' + sm(cost.total) + '</b></span></div></div>';
}
function moneyPanel(c, t) {
  if (S.role === 'client') return '';
  const cost = L.taskCost(c, S.fees, t), line = x => { const f = x.f, m = member(f.member), w = feeWhere(f); return '<button class="feerow" data-a="' + (isAdmin() ? 'fee-edit' : 'fee-view') + '" data-id="' + f.id + '">' + avatar(f.member) + '<span style="flex:1;text-align:left">' + esc(m ? m.name : 'Removed') + '<br><span class="small muted">' + (f.kind === 'task' ? (w.step || 'This task') : 'Share of the monthly ' + esc(short(ql(c, f.svc)) || '') + ' sum (' + sm(f.amount) + ' over ' + L.feeTasks(c, f).length + ' tasks, ' + (f.rule === 'all' ? 'all tasks done' : 'pro-rata') + ')') + '</span></span><b class="num">' + sm(x.amount) + '</b>' + (f.kind === 'task' ? feePill(f) : '') + '</button>'; };
  const lines = [...cost.own, ...cost.share];
  if (!isAdmin()) return lines.length ? '<div class="stack" style="gap:8px"><h2>Your fee on this task</h2><div class="card stack">' + lines.map(line).join('') + '</div></div>' : '';
  const v = L.taskValue(c, t), s = ql(c, t.svc), set = t.value !== undefined && t.value !== null && t.value !== '', sib = c.tasks.filter(x => x.svc === t.svc && x.m === t.m).length, bud = L.svcBudget(c, S.fees, t.svc, t.m);
  const share = '<details class="faq"' + (set ? ' open' : '') + '><summary class="small">This task\'s share of the service value (optional, for margin reports)</summary><div class="field" style="margin-top:8px"><label for="tv-val" class="small muted">What the client pays for this task (S$)</label><input id="tv-val" type="number" min="0" data-tval="' + t.id + '" value="' + (set ? esc(t.value) : '') + '" placeholder="' + v + '"><span class="small muted">' + (set ? 'Set by an admin. Clear to split evenly.' : freeWs(s) ? 'Not billed separately.' : 'Shown as ' + sm(v) + ': ' + sm(feeBase(c, s)) + ' ÷ ' + sib + ' tasks. This doesn\'t limit the fees you can give.') + '</span></div></details>';
  return '<div class="stack" style="gap:8px"><div class="row between"><h2>Value and cost</h2><span class="small muted">Admins only</span></div><div class="card stack">' + (bud ? budgetBox(bud, short(s) + (t.m && s.billing === 'monthly' && !s.adhoc ? ', ' + mName(c, t.m) : '')) + '<hr class="sep">' : '') + '<div class="row between"><span class="lab">Fees on this task</span><b class="num">' + sm(cost.total) + '</b></div>' + lines.map(line).join('') + btn(I('plus', 'sm') + 'Add a fee for this task' + (staged(t) ? ' or one of its steps' : ''), 'fee-new', { kind: 'task', cid: c.id, task: t.id }, 'ghost block') + (bud || set ? share : '') + '</div></div>';
}
function newTaskDrawer() {
  const d = S.drawer, c = S.clients.find(x => x.id === d.cid) || client(), list = c ? [...wsList(c).filter(s => !freeWs(s)), ...(c.prep === 'open' ? [{ id: 'prep', name: 'Preparation', billing: 'prep' }] : []), { id: 'general', name: 'General (ad-hoc)', billing: 'general' }] : [], s = list.find(x => x.id === d.svc) || null, monthly = s && s.billing === 'monthly' && !s.adhoc;
  return '<div class="scrim" data-a="close-bg"><div class="drawer" role="dialog" aria-label="New task"><div class="dhead">' + I('plus') + '<h2>New task</h2><button class="iconbtn" data-a="close" aria-label="Close">' + I('x') + '</button></div><div class="dbody">' +
    '<div class="meta"><div class="field"><label for="nt-cid">Client <span class="req">*</span></label><select id="nt-cid" data-nt="cid">' + S.clients.map(x => '<option value="' + x.id + '"' + (c && x.id === c.id ? ' selected' : '') + '>' + esc(cname(x)) + '</option>').join('') + '</select></div><div class="field"><label for="nt-svc">Deliverable <span class="req">*</span></label><select id="nt-svc" data-nt="svc"><option value="">Choose…</option>' + list.map(x => '<option value="' + esc(x.id) + '"' + (d.svc === x.id ? ' selected' : '') + '>' + esc(short(x)) + (x.billing === 'general' ? ' (not tied to a service)' : x.billing === 'prep' ? ' (before the first month)' : x.adhoc ? ' (added)' : '') + '</option>').join('') + '</select></div>' +
    (monthly ? '<div class="field"><label for="nt-m">Month</label><select id="nt-m" data-nt="m">' + Array.from({ length: c.quote.months }, (_, i) => i + 1).map(x => '<option value="' + x + '"' + (+d.m === x ? ' selected' : '') + '>' + mName(c, x) + (inv(c, x).status === 'paid' ? '' : ' (locked until paid)') + '</option>').join('') + '</select></div>' : '') + '</div>' +
    field('nt-title', 'Task', d.title || '', 'text', true) + field('nt-desc', 'Description (the client sees this)', d.desc || '', 'area') +
    '<div class="meta"><div class="field"><label for="nt-owner">Who does it</label><select id="nt-owner"><option value="gioia">The team</option>' + (S.team.some(isVendor) ? '<option value="vendor">A vendor</option>' : '') + '<option value="client">The client sends it</option></select></div><div class="field"><label for="nt-as">Assigned to</label><select id="nt-as"><option value="">Unassigned</option>' + teamOpts(d.assignee) + '</select></div>' + field('nt-due', 'Due date', d.due || '', 'date') + '<label class="opt" style="align-self:end"><input type="checkbox" id="nt-appr" checked> Needs client approval</label></div>' +
    '<details class="stack"' + (d.steps ? ' open' : '') + '><summary class="lab" style="cursor:pointer">Steps (optional), for work that passes back and forth with the client</summary><div class="field" style="margin-top:8px"><label for="nt-steps" class="small muted">One step per line. Start each with <b>Client:</b>, <b>Client reviews:</b>, <b>Client approves:</b>, <b>Team:</b> or a team member\'s name to assign that step</label>' + tplBar('nt-steps') + '<textarea id="nt-steps" rows="7" placeholder="Client: Write the original content in Chinese&#10;Jo: Develop the English article and optimise for SEO&#10;Client approves: Approve the final headlines&#10;Team: Publish">' + esc(d.steps || '') + '</textarea></div></details>' +
    '<p class="small muted" style="margin:0">' + (s && s.billing === 'prep' ? 'Preparation tasks are unlocked now, before the first month starts.' : s && s.billing === 'general' ? 'General tasks sit outside the quoted services and are open straight away.' : monthly ? 'Added to the chosen month only. To add it every month, edit the service in the catalogue.' : 'Added to this deliverable.') + '</p><div class="row">' + btn('Add task', 'task-create') + btn('Cancel', 'close', {}, 'quiet') + '</div></div></div></div>';
}
function syncNewTask() { const d = S.drawer; if (!d || d.kind !== 'newtask') return; ['title', 'desc', 'due', 'steps'].forEach(k => { const e = document.getElementById('nt-' + k); if (e) d[k] = e.value; }); const a = document.getElementById('nt-as'); if (a) d.assignee = a.value; }
function quoteDrawer() {
  const d = S.drawer, isNew = d.id === 'new', newAcct = d.aid === 'new', c = isNew ? null : S.clients.find(x => x.id === d.id), q = d.q, a = acct(d.aid);
  const opts = [...S.catalogue, ...(c ? c.quote.lines.filter(l => !svc(l.id)) : [])], osvc = id => opts.find(o => o.id === id);
  const tmp = { quote: Object.assign({}, q, { discount: 0, lines: q.ids.map(osvc).filter(Boolean) }), extra: [] };
  const drafts = newAcct ? [] : projectsOf(d.aid).filter(x => !['accepted', 'cancelled'].includes(x.quote.status)), sentNo = c && c.quote.status !== 'pending' && d.no !== c.quote.no;
  return '<div class="scrim" data-a="close-bg"><div class="drawer" role="dialog" aria-label="Quotation"><div class="dhead">' + I('doc') + '<h2>' + (isNew ? 'New quotation' : 'Quotation ' + esc(c.quote.no)) + '</h2><button class="iconbtn" data-a="close" aria-label="Close">' + I('x') + '</button></div><div class="dbody">' +
    '<div class="meta"><div class="field"><label for="qd-client">Client <span class="req">*</span></label><select id="qd-client" data-qclient="1"><option value="new"' + (newAcct ? ' selected' : '') + '>New client…</option>' + S.accounts.filter(x => !x.archived || x.id === d.aid).map(x => '<option value="' + x.id + '"' + (x.id === d.aid ? ' selected' : '') + '>' + esc(x.company) + '</option>').join('') + '</select></div>' +
    (newAcct ? '' : '<div class="field"><label for="qd-proj">Project <span class="req">*</span></label><select id="qd-proj" data-qproj="1"><option value="new"' + (isNew ? ' selected' : '') + '>New project…</option>' + drafts.map(x => '<option value="' + x.id + '"' + (x.id === d.id ? ' selected' : '') + '>' + esc(pname(x)) + ' (' + esc(x.quote.no) + ', ' + STATUS[x.quote.status] + ')</option>').join('') + '</select></div>') + '</div>' +
    (newAcct ? '<div class="meta">' + field('qd-company', 'Company', d.company || '', 'text', true) + field('qd-contact', 'Contact person', d.contact || '') + field('qd-email', 'Google email', d.email || '', 'email') + field('qd-website', 'Website', d.website || '') + '</div>' : '') +
    '<div class="meta">' + field('qd-name', 'Project name', d.name || '', 'text', true) + field('qd-no', 'Quotation number', d.no || '', 'text', true) + '</div>' +
    (c && c.quote.status !== 'pending' ? '<label class="opt' + (d.override ? ' on' : '') + '"><input type="checkbox" id="qd-override"' + (d.override ? ' checked' : '') + '><span>This quotation has been sent. Change its number anyway (recorded in the activity log)</span></label>' : '') +
    '<div class="stack" style="gap:8px"><span class="lab">Services <span class="req" style="color:var(--crit)">*</span></span>' + opts.map(s => '<label class="opt ' + (q.ids.includes(s.id) ? 'on' : '') + '"><input type="checkbox" data-qsvc="' + s.id + '"' + (q.ids.includes(s.id) ? ' checked' : '') + '><span style="flex:1"><b>' + esc(s.name) + '</b><br><span class="small muted">' + esc(s.bullets[0] || '') + '</span></span><span class="num"><b>' + money(s.price) + '</b><br><span class="small muted">' + (s.billing === 'once' ? 'one-time' : 'per month') + '</span></span></label>').join('') + '</div>' +
    '<div class="meta"><div class="field"><label for="qd-start">First month</label><input id="qd-start" type="month" data-qf="start" value="' + esc(q.start) + '"></div><div class="field"><label for="qd-months">Contract length (months)</label><input id="qd-months" type="number" min="1" max="24" data-qf="months" value="' + q.months + '"></div></div>' + discEditor('qdd', q.discounts, q.ids.map(osvc).filter(Boolean), tmp) + depEditor('qdp', q.deposit, tmp) +
    '<div class="field"><label for="qd-welcome">Welcome note on the proposal page (optional)</label><textarea id="qd-welcome" class="grow" placeholder="' + esc(S.brand.welcome ? 'Leave empty to use your standard message from Settings' : 'A personal note to the client. Set a standard message in Settings.') + '">' + esc(d.welcome || '') + '</textarea></div>' + scheduleHtml(tmp) +
    (D.email ? field('qd-to', 'Send to (email)', d.to != null ? d.to : (isNew ? d.email || '' : c.email), 'email') : '') +
    '<div class="grid" style="grid-template-columns:1fr 1fr">' + btn(I('doc', 'sm') + 'Preview', 'qd-preview', {}, 'ghost block', !q.ids.length) + btn('Save draft', 'qd-save', {}, 'quiet block', !q.ids.length) + '</div>' + (D.email ? btn(I('send', 'sm') + 'Email quotation to client', 'qd-email', {}, 'block bigbtn', !q.ids.length) + '<p class="small muted" style="margin:0">Sends the quotation as a PDF, with your terms, to the address above, and marks it as sent.</p>' : '<p class="small muted" style="margin:0"><b>Send</b> puts the proposal in the client\'s portal, where they can view it and accept, ask for changes or decline. Let them know with the portal invite from the client page. You can also download the PDF from Preview.</p>') +
    '<div class="grid" style="grid-template-columns:1fr 1fr">' + btn(I('send', 'sm') + (c && ['changes', 'declined'].includes(c.quote.status) ? 'Send updated proposal' : 'Send'), 'qd-send', {}, 'block', !q.ids.length) + btn('Mark as accepted', 'qd-accept', {}, 'quiet block', !q.ids.length) + '</div></div></div></div>';
}
function svcDrawer() {
  const d = S.drawer.draft;
  return '<div class="scrim" data-a="close-bg"><div class="drawer" role="dialog" aria-label="Service"><div class="dhead">' + I('layers') + '<h2>' + (d.isNew ? 'Add service' : 'Edit service') + '</h2><button class="iconbtn" data-a="close" aria-label="Close">' + I('x') + '</button></div><div class="dbody">' + field('e-name', 'Service name', d.name, 'text', true) +
    '<div class="meta">' + field('e-price', 'Price ($)', d.price, 'number') + '<div class="field"><label for="e-billing">Billing</label><select id="e-billing"><option value="once"' + (d.billing === 'once' ? ' selected' : '') + '>One-time (Month 1)</option><option value="monthly"' + (d.billing === 'monthly' ? ' selected' : '') + '>Monthly</option></select></div></div>' +
    field('e-bullets', 'Quotation description, one point per line', d.bullets.join('\n'), 'area') + field('e-note', 'Small note under the description', d.note) + '<h3>Deliverable tasks</h3>' +
    d.tasks.map((t, i) => { const txt = Array.isArray(t[3]) ? L.stepsText(t[3]) : (t[3] || ''), n = L.parseSteps(txt).length, open = (d.open || []).includes(i) || n; return '<div class="stack" style="gap:6px"><div class="trow"><input id="et-title-' + i + '" type="text" value="' + esc(t[0]) + '" aria-label="Task ' + (i + 1) + '" placeholder="Task"><select id="et-owner-' + i + '" aria-label="Task ' + (i + 1) + ' owner"><option value="gioia"' + (t[1] === 'gioia' ? ' selected' : '') + '>Team</option><option value="client"' + (t[1] === 'client' ? ' selected' : '') + '>Client</option></select><label class="small"><input id="et-appr-' + i + '" type="checkbox"' + (t[2] ? ' checked' : '') + '> Approval</label><span class="row" style="gap:10px"><button class="link" data-a="svc-steps" data-i="' + i + '">' + (n ? n + ' steps' : 'Add steps') + '</button><button class="link" data-a="svc-row-del" data-i="' + i + '">Remove</button></span></div>' + (open ? '<textarea id="et-steps-' + i + '" rows="5" aria-label="Steps for task ' + (i + 1) + '" placeholder="Client: …&#10;Team: …&#10;Client approves: …">' + esc(txt) + '</textarea>' + tplBar('et-steps-' + i) : '') + '</div>'; }).join('') + '<p class="small muted" style="margin:0">Steps: one per line, starting with <b>Client:</b>, <b>Client reviews:</b>, <b>Client approves:</b> or <b>Team:</b>. A task with steps passes back and forth, and its status follows the current step.</p>' +
    '<div>' + btn(I('plus', 'sm') + 'Add task', 'svc-row-add', {}, 'quiet') + '</div><h3>Preparation tasks</h3><p class="small muted" style="margin:-6px 0 0">Added when you click Start preparation on a project with this service, before the first month. One per line; start with <b>Client:</b> for things the client sends.</p><textarea id="e-prep" rows="4" placeholder="Client: Send website login details&#10;Kick-off call and goals">' + esc((d.prep || []).map(p => (p[1] === 'client' ? 'Client: ' : '') + p[0]).join('\n')) + '</textarea><p class="small muted" style="margin:0">Changes apply to new quotations. Existing ones keep their own copy.</p><div class="row">' + btn('Save service', 'svc-save') + btn('Cancel', 'close', {}, 'quiet') + (d.isNew ? '' : btn('Delete', 'svc-delete', {}, 'quiet')) + '</div></div></div></div>';
}
/* @mentions: who can be tagged on this project's comments */
function mentionables(c, internal) {
  const onProj = m => m.admin || c.tasks.some(t => t.assignee === m.id || (t.stages || []).some(x => x.assignee === m.id)) || S.fees.some(f => f.cid === c.id && f.member === m.id);
  const ppl = S.team.filter(m => m.active !== false && onProj(m) && 'm:' + m.id !== D.me.key).map(m => ({ key: 'm:' + m.id, name: m.name, sub: 'Gioia team' }));
  if (staff() && !internal && c.contact) ppl.push({ key: 'client', name: c.contact, sub: 'Client · ' + c.company });
  return ppl;
}
function cmText(c, x) {
  const names = (x.mentions || []).map(k => k === 'client' ? c.contact : (member(k.slice(2)) || {}).name).filter(Boolean);
  let h = esc(x.text); names.sort((a, b) => b.length - a.length).forEach(n => { h = h.split('@' + esc(n)).join('<span class="mention">@' + esc(n) + '</span>'); });
  return h;
}
/* where a notification leads: the task (and the comment, step or attachment), or the page or section it is about */
function openGo(go) {
  const [kind, cid, tid, mid] = String(go).split(':'), cl = S.role === 'client', c = S.clients.find(x => x.id === cid);
  if (kind === 'mytasks') { if (cl) S.ptab = 'tasks'; else S.view = 'mytasks'; return; }
  if (!c) return;
  const t = tid && c.tasks.find(x => x.id === tid);
  if (kind === 'att' && t && (!cl || canSee(c, t))) { ACT.task({ id: t.id, cid: c.id }); S.focus = 'atts'; return; }
  if (kind === 'ws' && tid) { ACT['open-ws']({ cid: c.id, id: tid, m: 1 }); return; }
  if (kind === 'files') { S.cid = c.id; if (cl) S.ptab = 'files'; else { S.view = 'client'; S.ctab = 'files'; } return; }
  if ((kind === 'task' || kind === 'cm') && t && (!cl || canSee(c, t))) { ACT.task({ id: t.id, cid: c.id }); if (kind === 'cm') { S.focus = mid && t.comments.some(z => z.id === mid) ? 'cm-' + mid : 'cmts'; if (mid) S.cmOpen = [...(S.cmOpen || []), mid]; } return; }
  S.cid = c.id; if (cl) S.ptab = 'overview'; else { S.view = 'client'; S.ctab = 'overview'; }
}
function noteGo(e) {
  const t0 = String(e.text || ''), cl = S.role === 'client', adm = isAdmin(), c = S.clients.find(x => x.id === e.cid), has = re => re.test(t0);
  const to = (view, extra) => { S.view = view; S.menu = null; Object.assign(S, extra || {}); };
  const acc = (asub, cid) => to('billing', { asub, afc: cid || '' });
  const tab = (st, ct) => { if (cl) S.ptab = ct; else to('client', { ctab: st }); };
  const fee = has(/\bfees?\b|earned|paid you|^paid |payment details/i);
  if (!c) { // not about one project
    if (cl) { S.ptab = 'overview'; return; }
    if (String(e.cid || '').startsWith('a:') || has(/^deleted the client/i)) return to('clients');
    if (has(/invoice/i)) return adm ? acc('teaminv') : to('earnings');
    if (has(/^paid |removed the payment/i)) return adm ? acc('history') : to('earnings');
    if (has(/payment details/i)) return adm ? to('team') : to('earnings');
    if (has(/welcome email| is now (an admin|a vendor|a team member)|profile photo/i)) return to(adm ? 'team' : 'mytasks');
    if (has(/step template/i)) return to('templates');
    if (has(/reminder settings|daily reminders/i)) return to(adm ? 'settings' : 'mytasks');
    return to(fee ? 'earnings' : 'mytasks');
  }
  S.cid = c.id; if (!cl) S.view = 'client';
  const quoted = [...t0.matchAll(/"([^"]+)"/g)].map(m => m[1]), t = (e.tid && c.tasks.find(x => x.id === e.tid)) || c.tasks.find(x => quoted.includes(x.title));
  const prep = () => { if (c.prep === 'open' || cl) { ACT['open-ws']({ cid: c.id, id: 'prep', m: 1 }); if (cl) S.ptab = 'tasks'; } else tab('work', 'workspaces'); };
  // fees: the team member's own fees page; admins see the project's fees in Accounts
  if (!cl && fee && !(t && has(/^(assigned you a fee|you have earned)/i))) return adm ? acc('fees', c.id) : to('earnings');
  if (has(/^(preparation started|added \d+ preparation task|saved the preparation tasks)/i)) return prep();
  if (t && (!cl || canSee(c, t))) {
    ACT.task({ id: t.id, cid: c.id });
    if (has(/comment|mentioned/i)) { S.focus = e.mid && t.comments.some(z => z.id === e.mid) ? 'cm-' + e.mid : 'cmts'; if (e.mid) S.cmOpen = [...(S.cmOpen || []), e.mid]; }
    else if (has(/^(uploaded|shared a link)/i)) S.focus = 'atts';
    else if (has(/step|steps|undid|moved .* to (completed|step)|is now (for the client|with the team)/i) && L.staged(t)) S.focus = 'steps';
    return;
  }
  if (has(/^(uploaded|shared a link|deleted ")/i)) return tab('files', 'files');
  if (has(/expense/i)) { if (adm) { S.acat = 'exp'; return acc('costcat', c.id); } return tab('overview', 'overview'); }
  if (has(/deposit/i)) return adm ? acc('deposits', c.id) : tab('overview', 'invoices');
  if (has(/quotation|proposal|renewal|\bsigned\b/i)) return tab(adm ? 'quote' : 'overview', 'proposal');
  if (has(/invoice|payment|\bpaid\b|refund/i)) return tab(adm ? 'invoices' : 'overview', 'invoices');
  if (has(/unfinished task|^deleted the task|^moved "/i)) return tab('work', 'workspaces');
  return tab('overview', 'overview');
}
function smallModal(M) {
  const c = S.clients.find(x => x.id === M.cid), wrap = (h, body, act, label, cls) => '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:480px"><h2>' + h + '</h2>' + body + '<div class="row">' + btn(label, act, {}, cls || '') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
  if (M.kind === 'undo') { const t = c && c.tasks.find(z => z.id === M.id), st = t && t.stages[t.stage - 1];
    return wrap('Undo step ' + (t ? t.stage : '') + '?', '<p class="muted" style="margin:0">' + (st ? '"' + esc(st.title) + '" goes back to not done, and the task returns to this step.' : '') + ' Everyone on the task can see the reason.</p><div class="field"><label for="un-why">Why are you undoing it? <span class="req">*</span></label><textarea id="un-why" rows="3" placeholder="For example: marked done by mistake, the files are not ready yet"></textarea></div>', 'undo-go', 'Undo step', 'danger'); }
  if (M.kind === 'remcfg') {
    const r = D.google.remindCfg, sel = (id, v, opts) => '<select id="' + id + '">' + opts.map(([k, l]) => '<option value="' + k + '"' + (+k === +v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>', fld = (l, h) => '<div class="field"><label>' + l + '</label>' + h + '</div>', chk = (id, on, l) => '<label class="opt" style="padding:8px 12px"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span><b>' + l + '</b></span></label>';
    const rng = (a, b, f) => Array.from({ length: b - a + 1 }, (_, k) => a + k).map(n => [n, f(n)]);
    return wrap('Reminder settings', fld('Send each day at', sel('rc-hour', r.hour, rng(6, 20, h => (h % 12 || 12) + (h < 12 ? 'am' : 'pm') + ' (Singapore time)'))) +
      chk('rc-team', r.team, 'Team members and vendors') + '<div class="meta">' + fld('Remind about tasks due', sel('rc-tb', r.teamBefore, rng(1, 7, n => n === 1 ? '1 day before' : n + ' days before'))) + fld('Repeat overdue tasks', sel('rc-oe', r.overdueEvery, rng(0, 14, n => n === 0 ? 'Once only' : n === 1 ? 'Every day' : 'Every ' + n + ' days'))) + '</div>' +
      chk('rc-client', r.client, 'Clients') + '<div class="meta">' + fld('Nudge when work has waited', sel('rc-ca', r.clientAfter, rng(1, 14, n => n === 1 ? '1 day' : n + ' days'))) + fld('Then repeat', sel('rc-ce', r.clientEvery, rng(0, 30, n => n === 0 ? 'Not again' : n === 1 ? 'Every day' : 'Every ' + n + ' days'))) + '</div>' +
      '<div class="meta">' + fld('Invoice reminder', sel('rc-ib', r.invBefore, rng(0, 14, n => n === 0 ? 'None before' : n === 1 ? '1 day before it is due' : n + ' days before it is due'))) + fld('On the due date', sel('rc-id', r.invOnDue ? 1 : 0, [[1, 'Remind them'], [0, 'No reminder']])) + '</div>' +
      chk('rc-admin', r.admin, 'Weekly summary for admins') + fld('Summary day', sel('rc-wd', r.weekday, [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']])), 'remcfg-save', 'Save settings');
  }
  if (M.kind === 'nudge') {
    const c = client(), t = c.tasks.find(z => z.id === M.id), cs = curStage(t), onClient = staged(t) ? !!cs && cs.owner === 'client' : t.owner === 'client' || ['cdraft', 'creview', 'awaiting'].includes(t.status);
    const id = onClient ? '' : (staged(t) && cs && cs.assignee) || t.assignee, m = member(id), who = onClient ? (c.contact || 'the client') : m ? m.name : '';
    if (!onClient && !m) return wrap('Send a reminder', '<p style="margin:0">Nobody is assigned to “' + esc(t.title) + '” yet. Assign someone first, then send the reminder.</p>', 'close-modal', 'OK');
    return wrap('Send a reminder', '<div class="row" style="gap:12px;flex-wrap:nowrap">' + whoAv(c, t) + '<p style="margin:0">' + (onClient ? 'Remind <b>' + esc(who) + '</b> that “' + esc(t.title) + '” is waiting for them.' : 'Remind <b>' + esc(who) + '</b> about “' + esc(t.title) + '”.') + ' They get an email and a notification in the bell.</p></div>' + field('nd-note', 'Note (optional)', '', 'area') + '<p class="small muted" style="margin:0">For example: “Urgent, the client needs this by 3pm today.”</p>', 'nudge-send', 'Send reminder');
  }
  if (M.kind === 'tpost') {
    const c = client(), t = c.tasks.find(z => z.id === M.id), later = Array.from({ length: c.quote.months - t.m }, (_, k) => t.m + 1 + k);
    return wrap('Postpone task', '<p class="small muted" style="margin:0">Move “' + esc(t.title) + '” from ' + esc(mName(c, t.m)) + ' to a later month.' + (t.due ? ' Its due date moves with it.' : '') + '</p><div class="field"><label for="tp-to">Postpone to</label><select id="tp-to">' + later.map(x => '<option value="' + x + '">' + mName(c, x) + (inv(c, x).status === 'paid' ? '' : ' (locked until paid)') + '</option>').join('') + '</select></div>', 'tpost-go', 'Postpone');
  }
  if (M.kind === 'photo' && M.for) {
    const f = M.for, big = '<span class="av pic xl">' + picImg(f.pic, f.name) + '</span>';
    return '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:440px"><h2>Photo for ' + esc(f.name) + '</h2><div class="row" style="gap:16px;flex-wrap:nowrap">' + big + '<p class="small muted" style="margin:0">Upload a photo for them, or go back to the photo from their Google account (picked up when they sign in).</p></div>' +
      '<div class="stack" style="gap:8px"><label class="btn" style="cursor:pointer;justify-content:center">' + I('upload', 'sm') + 'Upload a photo<input type="file" data-picfor="1" accept="image/*" hidden></label>' + btn('Use their Google photo', 'pic-for-set', { m: 'google' }, 'ghost') + btn('Show their initials instead', 'pic-for-set', { m: 'off' }, 'quiet') + '</div><div class="row">' + btn('Done', 'close-modal', {}, 'quiet') + '</div></div></div>';
  }
  if (M.kind === 'photo') {
    const mode = D.me.picMode, big = '<span class="av pic xl">' + picImg(D.me.pic, D.me.name) + '</span>';
    return '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:440px"><h2>Profile photo</h2><div class="row" style="gap:16px;flex-wrap:nowrap">' + big + '<p class="small muted" style="margin:0">' + (S.role === 'client' ? 'Shown to the Gioia team next to your comments and approvals.' : 'Shown next to your name on tasks, comments and the team list.') + (mode === 'custom' ? ' This is the photo you uploaded.' + (D.me.hasGoogle ? ' You can switch back to your Google photo.' : '') : D.me.hasGoogle ? ' We use your Google photo unless you upload your own.' : ' We have not received a photo from your Google account yet. It is picked up when you sign in, or you can upload one here.') + '</p></div>' +
      '<div class="stack" style="gap:8px"><label class="btn" style="cursor:pointer;justify-content:center">' + I('upload', 'sm') + 'Upload a photo<input type="file" data-picfile="1" accept="image/*" hidden></label>' + (D.me.hasGoogle && mode !== 'google' ? btn('Use my Google photo', 'photo-set', { m: 'google' }, 'ghost') : '') + (mode !== 'off' ? btn('Show my initials instead', 'photo-set', { m: 'off' }, 'quiet') : '') + '</div><div class="row">' + btn('Done', 'close-modal', {}, 'quiet') + '</div></div></div>';
  }
  if (M.kind === 'bank') {
    const b = S.myBank || {}, me = member(S.me) || {};
    return wrap('Your payment details', '<p class="small muted" style="margin:0">These appear on the invoices you send Gioia. Fill in a bank account, PayNow, or both.</p>' + field('bk-name', 'Your name, as it should appear on invoices', b.name || me.name || '') + field('bk-company', 'Company name (if you bill as a company)', b.company || '') + field('bk-address', 'Address (optional)', b.address || '', 'area') + '<div class="meta">' + field('bk-bankName', 'Bank name', b.bankName || '') + field('bk-accName', 'Account name', b.accName || '') + '</div>' + field('bk-accNo', 'Account number', b.accNo || '') + '<div class="meta">' + field('bk-paynowName', 'PayNow name', b.paynowName || '') + field('bk-paynow', 'PayNow mobile number or UEN', b.paynow || '') + '</div>' + (S.myPay ? '<p class="small muted" style="margin:0">Gioia has this on file for you: ' + esc(S.myPay) + '</p>' : ''), 'bank-save', 'Save details');
  }
  if (M.kind === 'billnew') {
    const list = S.fees.filter(f => f.member === S.me && billLeft(f) > 0), sel = M.ids || list.map(f => f.id), tot = list.filter(f => sel.includes(f.id)).reduce((a, f) => a + billLeft(f), 0);
    return '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:600px"><h2>Create your invoice to Gioia</h2><p class="small muted" style="margin:0">Tick the fees to include. Only work that is marked done can be billed.</p><div class="card stack" style="padding:8px 12px;max-height:280px;overflow:auto">' + list.map(f => { const w = feeWhere(f); return '<label class="opt" style="border:0;padding:6px 0"><input type="checkbox" data-billfee="' + f.id + '"' + (sel.includes(f.id) ? ' checked' : '') + '><span style="flex:1">' + esc(cname(w.c)) + ' · ' + esc(w.label) + '</span><b class="num">' + sm(billLeft(f)) + '</b></label>'; }).join('') + '</div><div class="row between"><span>Total</span><b class="num" style="font:600 22px var(--display)">' + sm(tot) + '</b></div>' +
      '<div class="meta">' + field('bn-no', 'Your invoice number', M.no || nextBillNo()) + field('bn-date', 'Invoice date', M.date || new Date().toISOString().slice(0, 10), 'date') + '</div>' + field('bn-period', 'Period (optional)', M.period !== undefined ? M.period : new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })) + field('bn-note', 'Note to Gioia (optional)', M.note || '', 'area') +
      (D.uploads ? '<div class="stack" style="gap:8px"><span class="lab">Invoice document</span><label class="opt ' + (!M.own ? 'on' : '') + '"><input type="radio" name="bn-own" data-a="bill-own" data-v=""' + (!M.own ? ' checked' : '') + '><span><b>Use the invoice the portal makes</b><br><span class="small muted">With your payment details on it. Preview it below.</span></span></label><label class="opt ' + (M.own ? 'on' : '') + '"><input type="radio" name="bn-own" data-a="bill-own" data-v="1"' + (M.own ? ' checked' : '') + '><span><b>Upload my own invoice</b><br><span class="small muted">A PDF or photo of your own invoice. Use the same invoice number and total as above.</span></span></label>' +
        (M.own ? '<label class="btn ghost" style="align-self:flex-start;cursor:pointer">' + I('upload', 'sm') + (BILLFILE ? 'Change file' : 'Choose file') + '<input type="file" data-billfile="1" accept="application/pdf,image/*" hidden></label>' + (BILLFILE ? '<span class="small">' + I('doc', 'sm') + ' ' + esc(BILLFILE.name) + '</span>' : '') : '') + '</div>' : '') +
      (hasBank(S.myBank) ? '<div class="small muted">Paid to: ' + esc([S.myBank.bankName && S.myBank.bankName + ' ' + S.myBank.accNo, S.myBank.paynow && 'PayNow ' + S.myBank.paynow].filter(Boolean).join(' · ')) + ' <button class="link" data-a="bank-open">Change</button></div>' : '<div class="small muted">No payment details saved, so make sure they are on your own invoice. <button class="link" data-a="bank-open">Add them</button></div>') +
      '<div class="row">' + (M.own ? '' : btn(I('doc', 'sm') + 'Preview invoice', 'bill-preview', {}, 'ghost', !sel.length)) + btn(I('send', 'sm') + 'Send to Gioia', 'bill-submit', {}, '', !sel.length || (M.own && !BILLFILE)) + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
  }
  if (M.kind === 'billpay') {
    const b = S.bills.find(z => z.id === M.id), m = member(b.member);
    return wrap('Mark invoice ' + esc(b.no) + ' as paid', '<p class="small muted" style="margin:0">Pay ' + esc(m ? m.name : b.from.name) + ' ' + sm(b.total) + ' outside the app, then record it here. It is added to their payments, and they get an email.</p>' + (b.file ? '<a class="btn ghost" style="align-self:flex-start" href="/api/bill-file/' + b.id + '" target="_blank" rel="noopener">' + I('doc', 'sm') + 'Open their invoice (' + esc(b.fileName) + ')</a>' : '') + (hasBank(b.bank) ? '<div class="paybox" style="margin:0"><div>' + bankSummary(Object.assign({ name: b.from.name }, b.bank)) + '</div></div>' : '<p class="small muted" style="margin:0">No payment details saved in the portal; they are on their invoice.</p>') + field('bp-date', 'Date paid', new Date().toISOString().slice(0, 10), 'date') + field('bp-note', 'Note (optional)', ''), 'bill-pay', 'Mark paid');
  }
  if (M.kind === 'billquery') {
    const b = S.bills.find(z => z.id === M.id);
    return wrap('Question about invoice ' + esc(b.no), '<p class="small muted" style="margin:0">They get an email with your question, and can withdraw the invoice and send a corrected one.</p>' + field('bq-note', 'Your question', '', 'area'), 'bill-query', 'Send question');
  }
  if (M.kind === 'num') {
    const i = M.k === 'q' ? c.quote : M.id ? adhocOf(c, M.id) : inv(c, M.m), sent = i.status !== 'pending';
    return wrap('Change ' + (M.k === 'q' ? 'quotation' : 'invoice') + ' number', '<p class="small muted" style="margin:0">' + esc(cname(c)) + '. Numbers must be unique across all clients.</p>' + field('nm-no', 'Number', i.no, 'text', true) + (sent ? '<label class="opt"><input type="checkbox" id="nm-over"><span>It has already been ' + (i.status === 'sent' ? 'sent' : i.status === 'paid' ? 'paid' : i.status) + '. Change it anyway, and record the change in the activity log</span></label>' : ''), 'num-save', 'Save number');
  }
  if (M.kind === 'delacct') { const a = acct(M.aid); return wrap('Delete ' + esc(a.company) + '?', '<p style="margin:0">This removes the client, their ' + projectsOf(a.id).length + ' project(s), every task, file link and team fee. It can\'t be undone.</p>' + field('da-name', 'Type the company name to confirm', ''), 'del-acct', 'Delete client', 'danger'); }
  if (M.kind === 'qdel') return wrap('Delete quotation ' + esc(c.quote.no) + '?', '<p style="margin:0">This deletes the draft project "' + esc(pname(c)) + '" for ' + esc(c.company) + '. The client account stays.</p>', 'q-del', 'Delete draft', 'danger');
  if (M.kind === 'qcancel') return wrap('Cancel quotation ' + esc(c.quote.no) + '?', '<p style="margin:0">Unpaid invoices become void and their months stay locked. Paid invoices, finished work and the record are kept.</p>' + field('qc-note', 'Reason (optional, team only)', ''), 'q-cancel', 'Cancel quotation', 'danger');
  if (M.kind === 'payout') return payoutModal(M);
  if (M.kind === 'pay') {
    const t = M.id ? adhocOf(c, M.id) : inv(c, +M.m), full = M.id ? t.amount : invTotal(c, +M.m), before = (t.parts || []).reduce((a, q) => a + q.amount, 0), total = full - before, bal = L.depBalance(c), canDep = bal > 0 && !t.deposit && L.depSecurity(c), mode = M.mode || (canDep && M.dep ? 'deposit' : 'paynow'), rest = Math.max(0, total - bal);
    const opt = (v, l) => '<option value="' + v + '"' + (mode === v ? ' selected' : '') + '>' + l + '</option>';
    return '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:480px"><h2>Record a payment on ' + esc(t.no) + '</h2><p class="muted" style="margin:0">' + esc(M.id ? t.name : mName(c, t.m)) + ' · invoice ' + sm(full) + (before ? ' · ' + sm(before) + ' already paid · <b>' + sm(total) + ' still owed</b>' : '') + '</p><div class="meta">' + field('py-amt', 'Amount received (S$)', M.amt !== undefined ? M.amt : total, 'number', true) + field('py-date', 'Date paid', M.date || TODAY, 'date', true) +
      '<div class="field"><label for="py-mode">Paid by</label><select id="py-mode" data-pymode="1">' + opt('paynow', 'PayNow') + opt('bank', 'Bank transfer') + (canDep ? opt('deposit', 'Security deposit (' + sm(bal) + ' held)') : '') + opt('other', 'Other') + '</select></div></div>' +
      (mode === 'deposit' ? '<p class="small" style="margin:0;background:var(--card-2);border-radius:8px;padding:8px 10px">' + sm(Math.min(bal, total)) + ' will be taken from deposit ' + esc(L.depositInv(c).no) + ' and recorded as used for this invoice.' + (rest ? ' The deposit does not cover the full amount.' : ' Balance after: ' + sm(bal - total) + '.') + '</p>' + (rest ? '<div class="field"><label for="py-mode2">The remaining ' + sm(rest) + ' was paid by</label><select id="py-mode2"><option value="paynow">PayNow</option><option value="bank">Bank transfer</option><option value="other">Other</option></select></div>' : '') : '') +
      '<div class="meta">' + field('py-ref', 'Payment reference (optional)', '') + field('py-note', 'Note (optional)', '') + '</div><p class="small muted" style="margin:0">Enter less than the amount owed to record a part payment. The invoice shows as Partially paid until the rest comes in.</p><div class="row">' + btn(I('tick', 'sm') + 'Record payment', 'pay-go') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
  }
  if (M.kind === 'rfee') { const pm = member(M.prev) || {}, nm = member(M.next); return '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:480px"><h2>What about ' + esc((pm.name || '').split(' ')[0]) + '\'s fee?</h2><p style="margin:0">' + esc(pm.name || '') + ' has an unpaid fee of <b>' + sm(M.amount) + '</b> for "' + esc(M.what) + '". ' + esc((pm.name || '').split(' ')[0]) + ' will be told the task has been reassigned.</p><div class="stack" style="gap:8px">' + (nm ? btn('Move the fee to ' + esc(nm.name), 'rfee-go', { f: 'move' }, 'block') : '') + btn('Keep it with ' + esc(pm.name || '') + ' (they did part of the work)', 'rfee-go', { f: 'keep' }, 'ghost block') + btn('Remove the fee', 'rfee-go', { f: 'remove' }, 'ghost block') + '</div>' + btn('Cancel, don\'t reassign', 'close-modal', {}, 'quiet') + '</div></div>'; }
  if (M.kind === 'tdel') { const t = c.tasks.find(z => z.id === M.id) || {}, nf = S.fees.filter(f => f.taskId === M.id).length; return wrap('Delete this task?', '<p style="margin:0">"' + esc(t.title || '') + '" will be removed for everyone, including the client.' + (nf ? ' Its unpaid fee' + (nf > 1 ? 's are' : ' is') + ' removed too.' : '') + ' Files added to it stay in the project\'s Files. This cannot be undone.</p>', 'td-go', 'Delete task', 'danger'); }
  if (M.kind === 'ptpl') return ptplModal(M);
  if (M.kind === 'ptapply') return ptApplyModal(M, c);
  if (M.kind === 'ptsave') return wrap('Save as a preparation template', '<p class="small muted" style="margin:0">Saves this project\'s ' + c.tasks.filter(t => t.svc === 'prep').length + ' preparation tasks, with their steps, so you can add them to other projects.</p>' + field('ps-name', 'Template name', '', 'text', true), 'ptsave-go', 'Save template');
  if (M.kind === 'tmd') { const m = member(M.id) || {}; return wrap(esc(m.name) + ': details', '<p class="small muted" style="margin:0">Optional. Payment details show when you record a payment to them.</p><div class="meta">' + field('md-company', 'Company', m.company || '') + field('md-what', 'What they do', m.what || '') + field('md-phone', 'Phone', m.phone || '') + '</div><div class="field"><label for="md-pay">Payment details</label><textarea id="md-pay" rows="2" placeholder="e.g. PayNow UEN, or bank and account name">' + esc(m.pay || '') + '</textarea></div>', 'tmd-save', 'Save details'); }
  if (M.kind === 'depuse') {
    const open = rowsFor(c, false).filter(r => ['pending', 'sent', 'partial'].includes(r.state) && !(r.data.id && (adhocOf(c, r.data.id) || {}).deposit));
    return wrap('Use the deposit for an invoice', '<p class="small muted" style="margin:0">Balance ' + sm(L.depBalance(c)) + '. Usually the final month.</p><div class="field"><label for="du-inv">Invoice</label><select id="du-inv">' + open.map((r, i) => '<option value="' + (r.data.id ? 'a:' + r.data.id : 'm:' + r.data.m) + '"' + (i === open.length - 1 ? ' selected' : '') + '>' + esc(r.no) + ' · ' + esc(r.label) + ' · ' + sm(r.owed) + (r.paid ? ' still owed' : '') + '</option>').join('') + '</select></div>', 'depuse-go', 'Next');
  }
  if (M.kind === 'parts') { const t = M.id ? adhocOf(c, M.id) : inv(c, +M.m), full = M.id ? t.amount : invTotal(c, +M.m), ps = t.parts || [], paid = ps.reduce((a, q) => a + q.amount, 0);
    return '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:520px"><h2>Payments on ' + esc(t.no) + '</h2><p class="muted" style="margin:0">Invoice ' + sm(full) + ' · paid ' + sm(paid) + (full - paid > 0 ? ' · <b>' + sm(full - paid) + ' still owed</b>' : ' · paid in full') + '</p>' + ps.map(q => '<div class="row between dline2"><span><b>' + sm(q.amount) + '</b> · ' + dlong(q.date) + ' · ' + esc(q.fromDeposit ? sm(q.fromDeposit) + ' from deposit' + (q.mode2 ? ' + ' + PAYM[q.mode2] : '') : PAYM[q.mode] || '') + (q.ref ? ' · ref ' + esc(q.ref) : '') + (q.note ? '<br><span class="small muted">' + esc(q.note) + '</span>' : '') + '</span><button class="link small" data-a="pay-undo" data-cid="' + c.id + '" data-m="' + (M.m || '') + '" data-id="' + (M.id || '') + '" data-part="' + q.id + '">Take back</button></div>').join('') + '<div class="row">' + (full - paid > 0 ? btn('Record another payment', 'pay-open', { cid: c.id, pa: M.id ? 'ah-paid' : 'i-paid', m: M.m || '', id: M.id || '' }) : '') + btn('Close', 'close-modal', {}, 'quiet') + '</div></div></div>'; }
  if (M.kind === 'deprefund') { const bal = L.depBalance(c); return wrap('Refund the deposit', '<p class="small muted" style="margin:0">Balance ' + sm(bal) + '. Refund all of it, or part.</p><div class="meta">' + field('dr-amt', 'Amount (S$)', bal, 'number', true) + field('dr-date', 'Date refunded', TODAY, 'date', true) + '<div class="field"><label for="dr-mode">Refunded by</label><select id="dr-mode"><option value="bank">Bank transfer</option><option value="paynow">PayNow</option><option value="other">Other</option></select></div>' + field('dr-ref', 'Payment reference (optional)', '') + field('dr-note', 'Note (optional)', '') + '</div>', 'deprefund-go', 'Record refund'); }
  if (M.kind === 'export') { const noDate = S.clients.reduce((n, c) => n + c.invoices.filter(i => i.status === 'paid' && !i.paidAt).length + c.adhoc.filter(i => i.status === 'paid' && !i.paidAt).length, 0);
    return '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:520px"><h2>Export for accounts</h2><p class="small muted" style="margin:0">A spreadsheet (CSV) of money in and money out between two dates: client invoices paid, and payments to the team, with their invoice numbers. Opens in Excel, Numbers or Google Sheets.</p><div class="meta">' + field('ex-from', 'From', M.from, 'date', true) + field('ex-to', 'To', M.to, 'date', true) + '</div>' + (noDate ? '<p class="small muted" style="margin:0">' + noDate + ' invoice' + (noDate === 1 ? ' was' : 's were') + ' marked paid before paid dates were recorded, so ' + (noDate === 1 ? 'it is' : 'they are') + ' listed with no date at the end.</p>' : '') + '<div class="row">' + btn(I('download', 'sm') + 'Download CSV', 'acc-export-go') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>'; }
  return '';
}
function linkDrawer() {
  return '<div class="modal" data-a="close-bg"><div class="sheet stack" style="max-width:460px"><h2>Add a Google link</h2>' + field('ln-url', 'Link', '', 'text', true) + field('ln-name', 'Name', '') + '<div class="row">' + btn('Add link', 'link-add') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
}

/* ---------- Gioia document ---------- */
function docHtml(c, type, m) {
  const q = c.quote, B = S.brand, isQ = type === 'quote', a = type === 'adhoc' ? adhocOf(c, m) : null, lines = a ? [{ s: a.s, name: a.name, amount: a.amount }] : invLines(c, isQ ? 1 : m); let n = 0;
  const rows = lines.map(l => '<tr><td>' + (l.s ? '<div class="lt">' + (++n) + ') ' + esc(l.name) + '</div><ul>' + l.s.bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>' + (l.s.note ? '<i>' + esc(l.s.note) + '</i>' : '') : '<div class="lt">' + esc(l.name) + '</div>') + '</td><td class="num">' + (l.s ? l.amount.toLocaleString('en-SG') : '') + '</td><td>' + (l.s ? 1 : '') + '</td><td class="right num">' + money(l.amount) + '</td></tr>').join('');
  const once = lines.filter(l => l.s && l.s.billing === 'once').reduce((x, l) => x + l.amount, 0), m1 = invTotal(c, 1);
  const foot = isQ ? (once ? '<div class="sub"><span>One-time fee</span><span>' + money(once) + '</span></div>' : '') + '<div class="dbar"><span>Month 1 retainer</span><span>' + money(invLines(c, 1).filter(l => !l.dep).reduce((x, l) => x + l.amount, 0) - once) + '</span></div>' + (L.depositAmt(c) ? '<div class="sub"><span>Deposit on acceptance (' + esc(L.depLabel(L.cleanDeposit(q.deposit)).replace('your first', 'the first')) + ')</span><span>' + money(L.depositAmt(c)) + '</span></div>' : '') + '<h4>Payment Schedule &amp; Project Timeline</h4><ul>' + (L.depositAmt(c) ? '<li>On acceptance: deposit of ' + money(L.depositAmt(c)) + '. ' + esc(L.depUse(c).replace(/your /g, 'the ')) + '</li>' : '') + L.schedule(c).map(x => '<li>' + (x.from === x.to ? 'Month ' + x.from + ' (' + mName(c, x.from) + '): ' + money(x.total) + ' in total.' : 'Month ' + x.from + ' to Month ' + x.to + ': ' + money(x.total) + ' per month.') + '</li>').join('') + (() => { let d = 0; for (let m = 1; m <= q.months; m++) invLines(c, m).forEach(l => { if (l.disc) d -= l.amount; }); return d > 0 ? '<li>Total discounts over the ' + q.months + ' months: ' + money(d) + '. Full term: ' + money(L.contractTotal(c)) + '.</li>' : ''; })() + '</ul>' : a ? '<div class="dbar"><span>Total</span><span>' + money(a.amount) + '</span></div>' : '<div class="dbar"><span>Month ' + m + ' total · due ' + due(c, m) + '</span><span>' + money(invTotal(c, m)) + '</span></div>';
  return '<div class="scroll"><div class="doc"><div class="logo2">' + logoImg('green', 64) + '</div><div class="co">' + esc(B.company) + '</div><div class="addr">' + esc(B.address).replace(/\n/g, '<br>') + '</div><div class="row between" style="align-items:flex-start"><div><div class="lab2">Issued to:</div>' + esc(c.contact) + '<br>' + esc(c.company) + '<br>' + esc(c.website) + '</div><div class="right"><span class="lab2">' + (isQ ? 'Quotation no:' : 'Invoice no:') + '</span> <b>' + esc(isQ ? q.no : a ? a.no : inv(c, m).no) + '</b><br><span class="lab2">Date:</span> ' + esc(isQ ? q.date : a ? a.date : due(c, m)) + '</div></div><table><thead><tr><th>Description</th><th>Unit price</th><th>Qty</th><th class="right">Total</th></tr></thead><tbody>' + rows + '</tbody></table>' + foot + (isQ ? '' : payBlock()) + (isQ && (B.terms || q.terms || (q.acceptedBy && q.acceptedBy.terms)) ? '<div class="page2"><div class="logo2">' + logoImg('green', 48) + '</div><div class="lab2" style="margin:14px 0 8px">Terms &amp; Conditions</div><div class="terms">' + termsHtml(q.status === 'accepted' && (q.acceptedBy && q.acceptedBy.terms || q.terms) || B.terms) + '</div></div>' : '') + '</div></div>';
}

/* ---------- render ---------- */
let toastT;
/* changing who does a task: if the previous person has an unpaid fee on it, ask what to do with it first */
async function changeAssignee(id, v) {
  const t = (client() || { tasks: [] }).tasks.find(z => z.id === id) || {}, prev = t.owner === 'client' ? '' : t.assignee || '';
  const run = fee => v === '@client' ? api('t-owner', { id, owner: 'client', fee }, { msg: 'Now with the client.' }) : t.owner === 'client' ? api('t-owner', { id, owner: 'gioia', assignee: v }, { msg: 'Now with the team.' }) : api('t-assign', { id, assignee: v, fee }, { msg: v ? 'Reassigned.' : 'Unassigned.' });
  return withFee(t, null, prev, v === '@client' ? '' : v, run);
}
function withFee(t, stage, prev, next, run) {
  const fees = prev && prev !== next ? S.fees.filter(f => f.taskId === t.id && f.member === prev && (stage === null ? f.stage === null || f.stage === undefined : f.stage === stage) && !f.paid) : [];
  if (!isAdmin() || !fees.length) return run('keep');
  S.modal = { kind: 'rfee', run, prev, next, what: stage === null ? t.title : 'Step ' + (stage + 1) + ' of ' + t.title, amount: fees.reduce((a, f) => a + f.amount, 0) }; render();
}
/* accounts export: money in (client invoices paid) and money out (team and vendor payments) */
function accountsCsv(from, to) {
  const inR = d => d && d >= from && d <= to, rows = [], undated = [];
  S.clients.forEach(c => rowsFor(c, false).forEach(r => { if (r.state !== 'paid') return; const src = r.data.id ? c.adhoc.find(a => a.id === r.data.id) : c.invoices.find(i => i.m === r.data.m), d = src && src.pay && src.pay.date ? src.pay.date : src && src.paidAt ? src.paidAt.slice(0, 10) : '', dep = src && src.pay && src.pay.mode === 'deposit' ? src.pay.fromDeposit || 0 : 0;
    // an invoice paid from the security deposit is not new money: only any remainder counts as money in
    if (dep && inR(d)) rows.push([d, 'Deposit used', 'Client', c.company, r.no, pname(c) + ' · ' + r.label + ' · paid from deposit (not counted in totals)', '']);
    if (r.amount - dep > 0) { const row = [d, 'Money in', 'Client', c.company, r.no, pname(c) + ' · ' + r.label + (src && src.pay ? ' · ' + (PAYM[src.pay.mode2 || src.pay.mode] || '') : ''), (r.amount - dep).toFixed(2)]; if (!d) undated.push(row); else if (inR(d)) rows.push(row); } }));
  S.clients.forEach(c => { const di = L.depositInv(c); (di && di.uses || []).filter(u => u.type === 'refund' && inR(u.date)).forEach(u => rows.push([u.date, 'Money out', 'Deposit refund', c.company, di.no, pname(c) + ' · ' + (PAYM[u.mode] || '') + (u.note ? ' · ' + u.note : ''), (-u.amount).toFixed(2)])); });
  S.payouts.forEach(p => { if (!inR(p.date)) return; const m = member(p.member) || { name: 'Removed' }; rows.push([p.date, 'Money out', isVendor(m) ? 'Vendor' : 'Team', m.company ? m.company + ' (' + m.name + ')' : m.name, p.invoiceNo || '', p.lines.map(l => l.label || feeWhere(S.fees.find(f => f.id === l.feeId) || {}).label || 'Fee').join('; ') + (p.note ? ' · ' + p.note : ''), (-p.total).toFixed(2)]); });
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  const q = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v), tin = rows.filter(r => r[1] === 'Money in').reduce((a, r) => a + +r[6], 0), tout = rows.filter(r => r[1] === 'Money out').reduce((a, r) => a + +r[6], 0);
  return [['Date', 'Direction', 'Type', 'Who', 'Invoice no.', 'Description', 'Amount (S$)'], ...rows, ...(undated.length ? [[], ['Paid, date not recorded']].concat(undated) : []), [], ['', '', '', '', '', 'Total in', tin.toFixed(2)], ['', '', '', '', '', 'Total out', tout.toFixed(2)], ['', '', '', '', '', 'Net', (tin + tout).toFixed(2)]].map(r => r.map(q).join(',')).join('\r\n');
}
function downloadCsv(name, text) { const u = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv' })), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
// hiding a toast only removes the toast, never redraws the page, so text being typed or filled in is never lost
function toast(t) { S.toast = t; clearTimeout(toastT); const app = document.getElementById('app'); if (app) { app.querySelectorAll('.toast').forEach(el => el.remove()); app.insertAdjacentHTML('beforeend', '<div class="toast" role="status">' + I('tick', 'sm') + esc(t) + '</div>'); } toastT = setTimeout(() => { S.toast = null; document.querySelectorAll('.toast').forEach(el => el.remove()); }, 4200); }
let lastRoute = '';
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
    if (k === 'renewal') overlay = rnDrawer();
  }
  if (S.modal && S.modal.kind === 'doc') { const dc = S.modal.temp || S.clients.find(x => x.id === S.modal.cid) || c; overlay += S.modal.type === 'bill' ? '<div class="modal" data-a="close-bg-modal"><div class="sheet"><div class="row between noprint" style="margin-bottom:12px"><h2>' + (S.modal.back ? 'Preview: invoice ' : 'Invoice ') + esc(S.modal.bill.no) + '</h2><div class="row">' + btn(I('download', 'sm') + 'Print or save as PDF', 'print', {}, 'ghost') + btn(S.modal.back ? 'Back' : 'Close', S.modal.back ? 'bill-back' : 'close-modal', {}, 'quiet') + '</div></div>' + billDoc(S.modal.bill) + '</div></div>' : '<div class="modal" data-a="close-bg-modal"><div class="sheet"><div class="row between noprint" style="margin-bottom:12px"><h2>' + (S.modal.type === 'quote' ? (S.modal.temp ? 'Preview: quotation ' : 'Quotation ') + esc(dc.quote.no) : 'Invoice') + '</h2><div class="row">' + btn(I('download', 'sm') + 'Print or save as PDF', 'print', {}, 'ghost') + btn(S.modal.temp ? 'Back to the quotation' : 'Close', 'close-modal', {}, 'quiet') + '</div></div>' + docHtml(dc, S.modal.type, S.modal.m) + '</div></div>'; }
  if (S.modal && S.modal.kind === 'link') overlay += linkDrawer();
  if (S.modal && S.modal.kind === 'exp') overlay += expModal(S.modal);
  if (S.modal && ['num', 'undo', 'parts', 'delacct', 'qdel', 'qcancel', 'payout', 'export', 'pay', 'depuse', 'deprefund', 'tmd', 'ptpl', 'ptapply', 'ptsave', 'tdel', 'rfee', 'bank', 'billnew', 'billpay', 'billquery', 'photo', 'remcfg', 'tpost', 'logo', 'nudge'].includes(S.modal.kind)) overlay += smallModal(S.modal);
  if (S.modal && S.modal.kind === 'tpl') overlay += tplModal(S.modal);
  if (S.modal && S.modal.kind === 'filedel') { const c0 = S.clients.find(x => x.id === S.modal.cid), f0 = c0 && c0.files.find(x => L.fkey(x) === S.modal.k) || {}; overlay += '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:460px"><h2>Delete "' + esc(f0.name || 'this file') + '"?</h2><p style="margin:0">' + (f0.drive ? 'It is removed from the app and moved to the Google Drive trash, where it can be restored for 30 days.' : 'The link is removed from the app. The file it points to is not touched.') + '</p><div class="row">' + btn('Delete', 'file-del-go', {}, 'danger') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>'; }
  if (S.modal && S.modal.kind === 'mailview') { const m = ((D.google || {}).log || []).find(x => x.id === S.modal.id) || {}; overlay += '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:680px"><div class="row between"><h2 style="font-size:20px">' + esc(m.subject || '') + '</h2><button class="iconbtn" data-a="close-modal" aria-label="Close">' + I('x') + '</button></div><span class="small muted">To ' + esc(m.to || '') + ' · ' + fmtAt(m.at) + (m.sim ? ' · prototype preview, not sent' : '') + '</span>' + (m.html ? '<iframe class="mailframe" title="Email preview" srcdoc="' + esc(m.html) + '"></iframe>' : '<p class="muted">The preview is only kept for the latest emails.</p>') + '</div></div>'; }
  if (S.modal && S.modal.kind === 'cmdel') overlay += '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:420px"><h2>Delete this comment?</h2><p style="margin:0">It is removed for everyone who can see this task.</p><div class="row">' + btn('Delete comment', 'cm-del-go', {}, 'danger') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
  if (S.modal && S.modal.kind === 'rnextend') overlay += '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:480px"><h2>Extend without a proposal?</h2><p style="margin:0">Use this when the client has already agreed, for example on a call. The new months, invoices and tasks are added straight away, and the client is notified. Nothing is sent for them to accept.</p><div class="row">' + btn('Extend now', 'rn-extend-go') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
  if (S.modal && S.modal.kind === 'qchanges') overlay += '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:520px"><h2>Request changes</h2><p style="margin:0">Tell us what you would like adjusted: services, timing, budget, anything. We will send an updated proposal here.</p>' + field('qx-changes', 'What would you like changed?', '', 'area') + '<div class="row">' + btn(I('send', 'sm') + 'Send request', 'q-changes-go') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
  if (S.modal && S.modal.kind === 'qdecline') overlay += '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:480px"><h2>Decline this proposal?</h2><p style="margin:0">We will be notified. If something just needs adjusting, choose Request changes instead and we will send an updated proposal.</p>' + field('qx-reason', 'Anything you would like us to know (optional)', '', 'area') + '<div class="row">' + btn('Decline proposal', 'q-decline-go', {}, 'danger') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>';
  if (S.modal && S.modal.kind === 'vc') { const vt = c && c.tasks.find(x => x.id === S.modal.id); overlay += vt ? '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:640px"><div class="row between"><h2>' + esc(vt.title) + '</h2><button class="iconbtn" data-a="close-modal" aria-label="Close">' + I('x') + '</button></div>' + moneyPanel(c, vt) + '</div></div>' : ''; }
  if (S.modal && S.modal.kind === 'invite') overlay += '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:600px"><h2>Portal invite</h2><p class="small muted" style="margin:0">' + (S.modal.copied ? 'Copied. Paste it into an email or WhatsApp, and change anything you like first.' : 'Select the message and copy it.') + '</p><textarea rows="15" class="grow" readonly>' + esc(S.modal.text) + '</textarea><div>' + btn('Done', 'close-modal', {}, 'quiet') + '</div></div></div>';
  if (S.modal && S.modal.kind === 'tpldel') { const t = S.templates.find(x => x.id === S.modal.id) || {}; overlay += '<div class="modal" data-a="close-bg-modal"><div class="sheet stack" style="max-width:460px"><h2>Delete "' + esc(t.name) + '"?</h2><p style="margin:0">It disappears for the whole team. Tasks that already use these steps keep them.</p><div class="row">' + btn('Delete template', 'tpl-delete', {}, 'danger') + btn('Cancel', 'close-modal', {}, 'quiet') + '</div></div></div>'; }
  if (S.modal && S.modal.kind === 'setup') overlay += '<div class="modal" data-a="close-bg-modal"><div class="sheet stack"><h2>Copy this for Claude</h2><p class="small muted" style="margin:0">Your browser blocked automatic copying. Select all the text below and copy it.</p><textarea rows="16" class="mono" readonly>' + esc(S.modal.text) + '</textarea><div>' + btn('Close', 'close-modal', {}, 'quiet') + '</div></div></div>';
  const ae = document.activeElement, fid = ae && ae.id, sel = ae && ae.id && 'selectionStart' in ae ? [ae.selectionStart, ae.selectionEnd] : null;
  // stay where you were when the page itself is redrawn (opening a row, saving a field); start at the top on a new page
  const route = [S.role, S.view, S.view === 'billing' ? '' : S.cid, S.ctab, S.ptab, S.tid, S.ws, S.qtab, S.asub, S.acat].join('|'), mEl = document.querySelector('.main'), keepTop = mEl ? mEl.scrollTop : 0, keepY = window.scrollY, same = route === lastRoute, prevRoute = lastRoute; lastRoute = route;
  // each new page becomes a step in the browser history, so Back and Forward work
  try { if (!S.popping) { if (!prevRoute) history.replaceState(navSnap(), ''); else if (!same) { const cur = Object.assign({}, history.state || {}, { scroll: mEl ? keepTop : keepY }); history.replaceState(cur, ''); history.pushState(navSnap(), ''); } } } catch (x) {}
  document.getElementById('app').innerHTML = (S.role === 'client' ? portalShell() : staffShell()) + overlay + (S.toast ? '<div class="toast" role="status">' + I('tick', 'sm') + esc(S.toast) + '</div>' : '');
  { const m2 = document.querySelector('.main'), back = S.popping ? (S.popScroll || 0) : null; S.popping = false; S.popScroll = 0; if (m2) m2.scrollTop = back != null ? back : same ? keepTop : 0; window.scrollTo(0, back != null ? back : same ? keepY : 0); }
  if (S.focus) { const f = document.getElementById(S.focus); S.focus = null; if (f) { f.scrollIntoView({ block: f.id === 'cmts' ? 'start' : 'center' }); f.classList.add('flash'); setTimeout(() => f.classList.remove('flash'), 2400); } }
  drawTour();
  if (['mt-q', 'gsearch', 'ac-q', 'af-q', 'ml-q'].includes(fid)) { const el = document.getElementById(fid); if (el) { el.focus(); try { if (sel) el.setSelectionRange(sel[0], sel[1]); } catch (x) {} } }
}
const NAVK = ['view', 'cid', 'ctab', 'ptab', 'tid', 'ws', 'wm', 'asub', 'acat', 'afc', 'pws', 'qtab', 'ptg'];
function navSnap() { const o = { app: 1 }; NAVK.forEach(k => { if (S[k] !== undefined) o[k] = S[k]; }); return JSON.parse(JSON.stringify(o)); }
window.addEventListener('popstate', e => { const st = e.state; if (!st || !st.app || !S.role) return; NAVK.forEach(k => { S[k] = st[k]; }); S.menu = null; S.modal = null; S.popping = true; S.popScroll = st.scroll || 0; render(); });
/* a short walkthrough the first time a client opens their portal; it can be replayed from the profile menu */
const TOURS = {
  portal: [
    ['[data-t="overview"]', 'Start here', 'Anything waiting for you, such as a draft to send or work to approve, shows on your Overview, with a count beside it.'],
    ['[data-t="workspaces"]', 'Deliverables', 'Deliverables are grouped by service, one set for every month. Each month\'s deliverables unlock once that month\'s invoice is paid.'],
    ['[data-t="tasks"]', 'Tasks', 'Every task and where it stands. Open one to review, approve, ask for changes, comment or upload files.'],
    ['[data-t="files"]', 'Files', 'Everything shared between you and Gioia, sorted into folders.'],
    ['[data-t="invoices"]', 'Invoices', 'Your invoices with our bank and PayNow details, and your deposit if you have one.'],
    ['[data-t="proposal"]', 'Proposal', 'The proposal you accepted, when it was signed, and the Terms and Conditions you agreed to. You can view it as a PDF any time.'],
    ['.topbar .iconbtn', 'Notifications', 'Updates appear here. We also email you whenever something needs you.'],
    ['[data-t="details"]', 'My details', 'Your contact details and email settings. You can replay this tour from the menu at the top right.']
  ],
  team: [
    ['[data-v="mytasks"]', 'My tasks', 'Everything assigned to you across all projects, with due dates. Start here each day. The number shows what is waiting on you.'],
    ['[data-v="clients"]', 'Clients', 'The projects you are working on. Open one to see its deliverables, tasks and files.'],
    ['[data-v="earnings"]', 'Fees & payouts', 'Your fees for each task or month, what you have earned, and where you send Gioia your invoice to get paid.'],
    ['[data-v="files"]', 'Files', 'Files for your projects, sorted into folders.'],
    ['[data-v="templates"]', 'Templates', 'Saved step lists for work that passes back and forth with the client, such as articles, and ready-made preparation task lists.'],
    ['.topbar .iconbtn', 'Notifications', 'Updates on your tasks appear here. We also email you when something needs you.'],
    ['.topbar .me', 'Your menu', 'Email settings, sign out, and Show me around to replay this tour.']
  ],
  vendor: [
    ['[data-v="mytasks"]', 'My tasks', 'The tasks Gioia has assigned to you, with due dates. Open one to update it, upload files or comment.'],
    ['[data-v="clients"]', 'Projects', 'The projects your tasks belong to.'],
    ['[data-v="earnings"]', 'Fees & payouts', 'What Gioia has agreed to pay you for each task, what is owing, and where you send Gioia your invoice to get paid.'],
    ['[data-v="files"]', 'Files', 'Files on your tasks.'],
    ['.topbar .me', 'Your menu', 'Email settings, sign out, and Show me around to replay this tour.']
  ],
  task: [
    ['#tk-head', 'This task', 'The client, project, who it is with and the due date. Click the status pill to change where it stands.'],
    ['#tk-steps', 'Steps', 'Work that passes back and forth with the client follows these steps. The current step shows who it is with; when you finish yours, it moves on.'],
    ['#tk-desc', 'Description', 'What was done and what the client should check. The client sees this.'],
    ['#tk-files', 'Files', 'Attach drafts and finished work here. They are saved in the project\'s Google Drive folder.'],
    ['#tk-comments', 'Comments', 'Talk to the client and the team here. Tick Team only to keep a note internal.'],
    ['#tk-main', 'Move it on', 'This button takes the next step, such as submitting for client review or marking it completed. Completing your work is also what earns your fee.']
  ],
  ctask: [
    ['#tk-head', 'This task', 'What the work is and where it stands.'],
    ['#tk-steps', 'Steps', 'Some work goes back and forth between you and the team. The highlighted step shows whose turn it is.'],
    ['#tk-files', 'Files', 'The drafts or finished work to look at. Click a file to open it.'],
    ['#tk-comments', 'Comments', 'Ask a question or give feedback here, so it stays with the work.'],
    ['#tk-main', 'Your decision', 'Approve the work, or request changes with a comment saying what to change. Each piece includes 2 rounds of changes.']
  ],
  cinv: [
    ['.invtbl', 'Your invoices', 'One for each month of your contract. Each month\'s deliverables unlock as soon as its invoice is paid.'],
    ['.invtbl .ist', 'Status', 'Sent means it is ready for payment. Pending invoices are for later months and are sent nearer the time. Paid invoices show the date and how they were paid.'],
    ['.invtbl .iact .btn', 'View and pay', 'Open the invoice to see our bank details and a PayNow QR code. You can also save it as a PDF.'],
    ['.depcard', 'Your deposit', 'If your proposal has a deposit, it shows here, with how it has been used.']
  ],
  payouts: [
    ['#fp-tiles', 'Your fees at a glance', 'Owing to you is what you have earned and not been paid yet. A fee is earned when the task or step is marked done.'],
    ['#fp-bank', 'Step 1: your payment details', 'Add your bank account and PayNow once. They go on every invoice the portal makes for you, so Gioia knows where to pay.'],
    ['#fp-bill', 'Step 2: create your invoice', 'When there is something to bill, this shows how much. Click Create invoice, tick the fees to include, and check the number and date.'],
    ['#fp-howto', 'Step 2: create your invoice', 'Once you have earned fees, a Create invoice button appears here, showing how much you can bill. Send your invoice whenever suits you, for example at the end of each month.'],
    ['#fp-invoices', 'Step 3: send and track it', 'Use the invoice the portal makes (preview it first) or upload your own PDF. Then follow it here: sent, approved, any question from Gioia, and paid. You get an email when it is paid.'],
    ['#fp-fees', 'Your fees', 'Every fee agreed with you and its status. Payments to you are listed below.']
  ],
  proposal: [
    ['[data-t="proposal"]', 'Your proposal', 'Read what we will do and the month-by-month breakdown. At the bottom, accept it, ask for changes or decline.'],
    ['#terms', 'Terms and Conditions', 'Please read these before accepting. Ticking the box confirms you agree to them.'],
    ['[data-t="details"]', 'My details', 'Your contact details and email settings. You can replay this tour from the menu at the top right.']
  ]
};
function tourKind() { if (S.role !== 'client') return vendorMe() ? 'vendor' : isAdmin() ? '' : 'team'; const c = client(); return c && hasAccess(c) ? 'portal' : 'proposal'; }
function tourSteps() { return (TOURS[S.tour.kind] || []).filter(st => { const el = document.querySelector(st[0]); return el && el.getClientRects().length; }); }
function drawTour() {
  let box = document.getElementById('tour');
  if (!S.tour && !S.tourChecked && D.tours) { S.tourChecked = true; const k = tourKind(); if (k && !D.tours[k] && !S.modal && !S.drawer) S.tour = { kind: k, i: 0 }; }
  if (!S.tour && D.tours && D.tours[tourKind()] && !S.modal && !S.drawer) {
    const pk = S.role === 'client' ? (S.ptab === 'task' ? 'ctask' : S.ptab === 'invoices' ? 'cinv' : '') : isAdmin() ? '' : S.view === 'earnings' ? 'payouts' : S.view === 'task' ? 'task' : '';
    if (pk && !D.tours[pk]) S.tour = { kind: pk, i: 0 };
  }
  if (!S.tour) { if (box) box.remove(); return; }
  const steps = tourSteps(); if (!steps.length) { S.tour = null; if (box) box.remove(); return; }
  if (S.tour.i >= steps.length) S.tour.i = steps.length - 1;
  const [sel, h, t] = steps[S.tour.i], el = document.querySelector(sel);
  el.scrollIntoView({ block: 'nearest', inline: 'center' });
  const r = el.getBoundingClientRect(), pad = 6, W = innerWidth, H = innerHeight, tw = Math.min(340, W - 24), below = r.bottom + 190 < H || r.top < 200;
  const left = Math.max(12, Math.min(W - tw - 12, r.left + r.width / 2 - tw / 2)), top = below ? Math.min(H - 180, r.bottom + 14) : Math.max(12, r.top - 14 - 170);
  if (!box) { box = document.createElement('div'); box.id = 'tour'; document.body.appendChild(box); }
  box.innerHTML = '<div class="tourspot" style="left:' + (r.left - pad) + 'px;top:' + (r.top - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px"></div>' +
    '<div class="tourtip" role="dialog" aria-label="Portal tour" style="left:' + left + 'px;top:' + top + 'px;width:' + tw + 'px"><div class="row between"><span class="eyebrow">' + (S.tour.i + 1) + ' of ' + steps.length + '</span><button class="link small" data-a="tour-skip">Skip tour</button></div><h3 style="margin:2px 0 4px">' + esc(h) + '</h3><p style="margin:0">' + esc(t) + '</p><div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px">' + (S.tour.i ? btn('Back', 'tour-back', {}, 'quiet') : '') + btn(S.tour.i === steps.length - 1 ? 'Got it' : 'Next', 'tour-next') + '</div></div>';
}
window.addEventListener('resize', () => { if (S.tour) drawTour(); });
document.addEventListener('keydown', e => { if (e.target.id === 'tr-title') { if (e.key === 'Enter') { e.preventDefault(); const b = document.querySelector('button[data-a="tr-save"]'); if (b) b.click(); } else if (e.key === 'Escape') { S.renaming = null; render(); } } });
function renderSearch() {
  const box = document.getElementById('sres'); if (!box) return;
  const q = S.q.toLowerCase(); if (q.length < 2) { box.innerHTML = ''; return; }
  const hits = [];
  S.clients.forEach(c => {
    if ((c.company + ' ' + c.contact).toLowerCase().includes(q)) hits.push(['open-client', { id: c.id }, 'users', c.company, 'Client · ' + pname(c)]);
    wsList(c).forEach(s => { if (s.name.toLowerCase().includes(q)) hits.push(['open-ws', { id: s.id, cid: c.id, m: currentMonth(c) }, 'folder', short(s), 'Deliverables · ' + c.company]); });
    c.tasks.forEach(t => { if (taskOpen(c, t) && t.title.toLowerCase().includes(q)) hits.push(['task', { id: t.id, cid: c.id }, 'check', t.title, 'Task · ' + cname(c) + (t.m ? ' · ' + mName(c, t.m) : '')]); });
    c.files.forEach(f => { if (f.name.toLowerCase().includes(q)) hits.push(['open-client-tab', { id: c.id, t: 'files' }, 'doc', f.name, 'File · ' + c.company]); });
  });
  box.innerHTML = '<div class="sres">' + (hits.slice(0, 12).map(([a, d, ic, t, sub]) => '<button data-a="' + a + '" ' + Object.entries(d).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + '>' + I(ic) + '<span><b>' + esc(t) + '</b><br><span class="small muted">' + esc(sub) + '</span></span></button>').join('') || '<p class="small muted" style="padding:8px 10px;margin:0">No matches.</p>') + '</div>';
}

function syncFee() { const d = S.drawer.draft; const g = id => document.getElementById(id); if (g('fe-amt')) d.amount = g('fe-amt').value; if (g('fe-pct')) d.pct = g('fe-pct').value; if (g('fe-item')) d.item = g('fe-item').value.trim(); if (g('fe-note')) d.note = g('fe-note').value.trim(); }
function openQuote(id, aid) {
  const c = id && id !== 'new' ? S.clients.find(x => x.id === id) : null, nx = new Date(); nx.setMonth(nx.getMonth() + 1);
  const q = c ? { ids: c.quote.lines.map(s => s.id), start: c.quote.start, months: c.quote.months, committed: c.quote.committed, discounts: withKeys(L.discounts(c)), deposit: c.quote.deposit || null } : { ids: [], start: nx.toISOString().slice(0, 7), months: 6, committed: 3, discounts: [], deposit: null };
  S.drawer = { kind: 'quote', id: c ? c.id : 'new', aid: c ? c.aid : (aid || 'new'), name: c ? c.name : '', no: c ? c.quote.no : String(S.nextQuote), welcome: c ? c.quote.welcome || '' : '', q };
}
function syncSvc() {
  const d = S.drawer.draft; d.name = val('e-name'); d.price = Math.max(0, +val('e-price') || 0); d.billing = val('e-billing'); d.note = val('e-note');
  d.bullets = val('e-bullets').split('\n').map(x => x.trim()).filter(Boolean);
  if (document.getElementById('e-prep')) d.prep = val('e-prep').split('\n').map(x => x.trim()).filter(Boolean).map(x => /^client\s*:/i.test(x) ? [x.replace(/^client\s*:/i, '').trim(), 'client'] : [x, 'gioia']);
  d.tasks = d.tasks.map((t, i) => { const st = document.getElementById('et-steps-' + i), txt = st ? st.value : (Array.isArray(t[3]) ? L.stepsText(t[3]) : (t[3] || '')); return [val('et-title-' + i), val('et-owner-' + i), document.getElementById('et-appr-' + i).checked && val('et-owner-' + i) === 'gioia', txt]; });
}
function syncQuoteNew() { const d = S.drawer; if (!d || d.kind !== 'quote') return; discSync('qdd'); depSync('qdp'); if (d.aid === 'new') ['company', 'contact', 'email', 'website'].forEach(k => { d[k] = val('qd-' + k); }); ['name', 'no', 'welcome'].forEach(k => { if (document.getElementById('qd-' + k)) d[k] = val('qd-' + k); }); const o = document.getElementById('qd-override'); d.override = !!(o && o.checked); if (document.getElementById('qd-to')) d.to = val('qd-to'); }
function draftQuoteClient() { const d = S.drawer, q = d.q, ex = S.clients.find(x => x.id === d.id), c = ex ? clone(ex) : { id: 'draft', company: d.aid !== 'new' && acct(d.aid) ? acct(d.aid).company : d.company || 'New client', contact: d.aid !== 'new' && acct(d.aid) ? acct(d.aid).contact : d.contact || '', website: d.aid !== 'new' && acct(d.aid) ? acct(d.aid).website : d.website || '', quote: { no: d.no || String(S.nextQuote), date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase().replace(/ /g, '-'), status: 'pending' }, invoices: [], adhoc: [], extra: [], tasks: [], files: [] }; c.quote = Object.assign({}, c.quote, { no: d.no || c.quote.no, lines: q.ids.map(id => clone(svc(id) || (ex && ql(ex, id)) || {})).filter(s => s.id), start: q.start, months: q.months, committed: Math.min(q.committed, q.months), discount: 0, discounts: q.discounts }); return c; }
function importPage() {
  const im = S.imp || (S.imp = { text: '', preview: null }), pv = im.preview;
  const help = '<details class="card"><summary class="lab" style="cursor:pointer">What a plan looks like</summary><pre class="code">' + esc(PLAN_EXAMPLE) + '</pre></details>';
  let prev = '';
  if (pv) {
    const q = pv.quote;
    prev = '<div class="card stack"><div class="row between"><h2>Preview</h2><span class="pill ' + (pv.client.isNew ? 'info' : 'ok') + '">' + (pv.client.isNew ? 'New client' : 'Existing client') + '</span></div>' +
      '<div class="grid g4">' + [['Client', esc(pv.client.company), esc(pv.client.contact || '') + (pv.client.email ? ' · ' + esc(pv.client.email) : '')], ['Quotation', q ? esc(q.no) + ' · ' + STATUS[q.status] : 'No change', q ? q.start + ' to ' + q.end + ', ' + q.committed + ' committed' : ''], ['Tasks to add', pv.newTasks, pv.tasks.length + (pv.tasks.length === 1 ? ' kind of task' : ' kinds of task')], ['Project value', sm(pv.costing.value), 'Team fees ' + sm(pv.costing.fees) + ' · margin ' + sm(pv.costing.margin)]].map(([a, b, c]) => '<div class="tile"><span class="eyebrow">' + a + '</span><b class="num">' + b + '</b><span class="small muted">' + c + '</span></div>').join('') + '</div>' +
      (q ? '<div><h3>Quotation lines</h3><table class="tbl"><tbody>' + q.lines.map(l => '<tr><td>' + esc(l.name) + '</td><td class="small muted">' + (l.billing === 'once' ? 'One-time' : 'Monthly') + (l.templateTasks ? ' · ' + l.templateTasks + ' template tasks' : '') + '</td><td class="right num">' + money(l.price) + '</td></tr>').join('') + (q.discount ? '<tr><td>Monthly discount from Month 2</td><td></td><td class="right num">' + money(-q.discount) + '</td></tr>' : '') + '</tbody></table><p class="small muted">Month 1: ' + money(q.month1) + (q.months > 1 ? ' · Month 2 onward: ' + money(q.month2) : '') + ' · ' + q.invoices + ' invoices</p></div>' : '') +
      (pv.tasks.length ? '<div><h3>Tasks</h3><table class="tbl"><thead><tr><th>Deliverable</th><th>Task</th><th>Owner</th><th>When</th><th>Due</th></tr></thead><tbody>' + pv.tasks.map(t => '<tr><td>' + esc(t.ws) + '</td><td><b>' + esc(t.title) + '</b>' + (t.steps ? ' <span class="chip">' + t.steps + ' steps</span>' : '') + '</td><td>' + esc(t.owner) + '</td><td class="small">' + esc(t.when || '') + (t.months > 1 ? ' (' + t.months + ')' : '') + '</td><td class="small">' + esc(t.due || '') + '</td></tr>').join('') + '</tbody></table></div>' : '') +
      (pv.fees.length ? '<div><h3>Team fees</h3><table class="tbl"><tbody>' + pv.fees.map(f => '<tr><td><b>' + esc(f.member) + '</b></td><td>' + esc(f.label) + (f.pct ? ' <span class="small muted">' + f.pct + '%</span>' : '') + '</td><td class="right num">' + money(f.each) + (f.months > 1 ? ' × ' + f.months : '') + '</td><td class="right num"><b>' + money(f.total) + '</b></td></tr>').join('') + '</tbody></table></div>' : '') +
      (pv.warnings.length ? '<div class="stack" style="gap:4px">' + pv.warnings.map(w => '<span class="small muted">' + esc(w) + '</span>').join('') + '</div>' : '') +
      '<div class="row">' + btn(I('tick', 'sm') + 'Create project', 'imp-create', {}, 'bigbtn') + btn('Edit the plan', 'imp-clear', {}, 'quiet') + '</div><p class="small muted" style="margin:0">Nothing has been created yet. Creating it records everything in one go and notifies each team member of their fees.</p></div>';
  }
  return '<div class="row between"><div><h1>Import project</h1><p class="muted" style="margin:4px 0 0">Describe a project to Claude, paste the plan it gives you here, check the preview, then create it.</p></div>' + btn(I('doc', 'sm') + 'Copy setup for Claude', 'imp-copy', {}, 'ghost') + '</div>' +
    '<div class="card stack"><ol class="small" style="margin:0;padding-left:20px;line-height:1.7"><li>Click <b>Copy setup for Claude</b> and paste it into your chat with Claude, with the project details and requirements.</li><li>Claude replies with a project plan. Copy it and paste it below.</li><li>Click <b>Preview</b>, check everything, then <b>Create project</b>.</li></ol>' +
    '<div class="field"><label for="imp-text">Project plan</label><textarea id="imp-text" rows="12" class="mono" placeholder="Paste the plan from Claude here">' + esc(im.text) + '</textarea></div><div class="row">' + btn('Preview', 'imp-preview') + (im.text ? btn('Clear', 'imp-reset', {}, 'quiet') : '') + '</div></div>' + prev + help;
}
const PLAN_EXAMPLE = JSON.stringify({ version: 1, client: { company: 'Example Pte Ltd', contact: 'Jane Tan', email: 'jane@example.com', website: 'example.sg' },
  quotation: { start: '2027-01', months: 6, committed: 3, discount: 100, status: 'draft', lines: [{ service: 'web' }, { service: 'social', templateTasks: false }, { name: 'Brand photoshoot', price: 800, billing: 'once', bullets: ['Half-day shoot, 20 edited photos'] }] },
  tasks: [{ service: 'social', month: 'all', title: 'Carousel post', assignee: 'Shi Han', dueDay: 20, steps: ['Client: Send the topic and key points', 'Team: Draft the slides and headlines', 'Client approves: Approve the headlines', 'Team: Design and publish'] },
    { service: 'general', title: 'Kick-off call', assignee: 'Shi Han', due: '2027-01-05', approve: false }],
  fees: [{ member: 'Shi Han', service: 'social', months: 'all', percent: 25 }, { member: 'Shi Han', item: 'Brand photoshoot', amount: 300 }] }, null, 2);
function setupText() {
  const today = new Date().toISOString().slice(0, 10);
  const lines = ['GIOIA CLIENT DESK SETUP (' + today + ')', '', 'Please turn my project description into a project plan for the Client Desk "Import project" screen.', 'Reply with the plan as one JSON code block, in exactly the format of the example below, then a short summary.', 'Use only the service ids, team member names and client names listed here. Ask me if anything is unclear.', '', 'TEAM (use these names for assignee and member):'];
  S.team.forEach(m => lines.push('- ' + m.name + (m.admin ? ' (admin)' : '')));
  lines.push('', 'SERVICE CATALOGUE (id: name, price, billing; template tasks each month or once):');
  S.catalogue.forEach(s => { lines.push('- ' + s.id + ': ' + s.name + ', ' + sm(s.price) + ', ' + (s.billing === 'once' ? 'one-time' : 'monthly')); s.tasks.forEach(t => lines.push('    · ' + t[0] + (t[1] === 'client' ? ' [client sends]' : '') + (t[3] && t[3].length ? ' [' + t[3].length + ' steps]' : ''))); });
  lines.push('', 'CLIENTS (for an existing client use client.existing and leave out quotation if it is already accepted):');
  S.clients.forEach(c => lines.push('- ' + c.company + ': quotation ' + c.quote.no + ' ' + STATUS[c.quote.status] + (c.quote.lines.length ? ', ' + mName(c, 1) + ' to ' + mName(c, c.quote.months) + ', deliverables: ' + wsList(c).map(short).join(', ') : '')));
  lines.push('', 'RULES', '- month: a number (1 = first month of the quotation), a list like [1,2], or "all". Leave it out for one-off services.', '- due: a date like 2027-01-15; or dueDay: day of the month for monthly tasks.', '- steps: lines starting "Client:", "Client reviews:", "Client approves:" or "Team:". Use steps for work that passes back and forth.', '- service "general" is for ad-hoc tasks outside the quoted services.', '- templateTasks: false on a quotation line skips the catalogue tasks, so only the plan\'s tasks are used.', '- replaceTemplateTasks: [{"service": "articles", "months": [2,3]}] removes untouched catalogue tasks for an existing client before adding new ones.', '- fees: amount (S$) or percent of the service price; "item" for one-off work outside a deliverable.', '- paid: [1] marks month 1 invoices as paid (only if I say so).', '', 'EXAMPLE PLAN:', PLAN_EXAMPLE);
  return lines.join('\n');
}
function readPlan() {
  const raw = (val('imp-text') || '').replace(/^[\s\S]*?```(?:json)?\s*/i, m => m.includes('```') ? '' : m).replace(/```[\s\S]*$/, '').trim();
  S.imp.text = val('imp-text');
  try { return JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch (e) { toast('That doesn\'t look like a complete plan. Copy the whole code block from Claude and try again.'); return null; }
}

/* ---------- renewals ---------- */
const curPrice = (c, s) => { const r = L.renewals(c).filter(x => x.status === 'accepted' && x.lines.some(l => l.id === s.id)).pop(); return r ? r.lines.find(l => l.id === s.id).price : s.price; };
const openRenewal = c => L.renewals(c).find(r => ['draft', 'sent', 'changes', 'declined'].includes(r.status));
function rnStart(c) {
  const ex = openRenewal(c), cur = wsList(c).filter(s => !freeWs(s) && !s.adhoc);
  if (ex) return { id: ex.id, no: ex.no, months: ex.months, welcome: ex.welcome || '', discounts: withKeys(ex.discounts), lines: [...ex.lines.map(s => ({ s, on: true, price: s.price })), ...cur.filter(s => !ex.lines.some(l => l.id === s.id)).map(s => ({ s, on: false, price: curPrice(c, s) }))] };
  const last = L.renewals(c).filter(r => r.status === 'accepted').pop();
  return { id: '', no: c.quote.no + '-R' + (L.renewals(c).length + 1), months: last ? last.months : (L.renewals(c).length ? 3 : c.quote.months), welcome: '', discounts: [], lines: cur.map(s => ({ s, on: s.billing === 'monthly', price: curPrice(c, s) })) };
}
function rnSync() {
  const d = S.drawer; if (!d || d.kind !== 'renewal') return; const r = d.r, g = id => document.getElementById(id);
  if (g('rn-no')) r.no = g('rn-no').value.trim(); if (g('rn-months')) r.months = Math.min(24, Math.max(1, Math.floor(+g('rn-months').value || 1))); if (g('rn-welcome')) r.welcome = g('rn-welcome').value;
  r.lines.forEach((l, i) => { if (g('rl-on-' + i)) l.on = g('rl-on-' + i).checked; if (g('rl-price-' + i)) l.price = g('rl-price-' + i).value; });
  discSync('rnd');
}
const rnTemp = (c, r) => ({ no: r.no, months: r.months, lines: r.lines.filter(l => l.on).map(l => Object.assign(clone(l.s), { price: +l.price || 0 })), discounts: r.discounts, welcome: r.welcome, status: 'draft' });
function rnDrawer() {
  const d = S.drawer, c = S.clients.find(x => x.id === d.cid), r = d.r, from = c.quote.months + 1, pc = L.pseudo(c, rnTemp(c, r)), ex = r.id && L.renewals(c).find(x => x.id === r.id);
  return '<div class="scrim" data-a="close-bg"><div class="drawer" role="dialog" aria-label="Renewal"><div class="dhead">' + I('refresh') + '<h2>Renewal · ' + esc(pname(c)) + '</h2><button class="iconbtn" data-a="close" aria-label="Close">' + I('x') + '</button></div><div class="dbody">' +
    '<p class="muted" style="margin:0">The current contract runs ' + mName(c, 1) + ' to ' + mName(c, c.quote.months) + '. The renewal continues from <b>' + mName(c, from) + '</b>.</p>' + (ex && ex.status !== 'draft' ? '<p class="small" style="margin:0">' + pill(ex.status === 'sent' ? 'awaiting' : ex.status, ex.status === 'sent' ? 'Sent, waiting for the client' : ex.status === 'changes' ? 'Changes requested' : '') + (lastResp(ex, ex.status) ? ' "' + esc(lastResp(ex, ex.status)) + '"' : '') + '</p>' : '') +
    '<div class="meta">' + field('rn-no', 'Renewal number', r.no, 'text', true) + '<div class="field"><label for="rn-months">More months</label><input id="rn-months" type="number" min="1" max="24" data-rnr="1" value="' + r.months + '"><span class="small muted">' + mName(c, from) + ' to ' + mName(c, from + r.months - 1) + '</span></div></div>' +
    '<div class="stack" style="gap:8px"><span class="lab">Services to continue with</span>' + r.lines.map((l, i) => { const was = curPrice(c, l.s); return '<label class="opt ' + (l.on ? 'on' : '') + '"><input type="checkbox" id="rl-on-' + i + '" data-rnr="1"' + (l.on ? ' checked' : '') + '><span style="flex:1"><b>' + esc(short(l.s)) + '</b><br><span class="small muted">' + (l.s.billing === 'once' ? 'One-time, in ' + mName(c, from) : 'Monthly') + ((l.s.tasks || []).length ? ' · ' + l.s.tasks.length + ' tasks from this project' : '') + '</span></span><span class="stack" style="gap:2px;align-items:flex-end"><input id="rl-price-' + i + '" data-rnr="1" type="number" min="0" value="' + esc(l.price) + '" aria-label="Price" style="width:110px;text-align:right">' + (+l.price !== was && L.ql(c, l.s.id) ? '<span class="small muted">was ' + sm(was) + '</span>' : '') + '</span></label>'; }).join('') +
    '<div class="field"><label for="rn-add">Add a service from the catalogue</label><select id="rn-add" data-rnadd="1"><option value="">Choose…</option>' + S.catalogue.filter(s => !r.lines.some(l => l.s.id === s.id)).map(s => '<option value="' + s.id + '">' + esc(s.name) + ' · ' + money(s.price) + '</option>').join('') + '</select></div></div>' +
    discEditor('rnd', r.discounts, rnTemp(c, r).lines, pc, from - 1) + scheduleHtml(pc, from - 1) +
    '<div class="field"><label for="rn-welcome">Note to the client on the renewal page (optional)</label><textarea id="rn-welcome" class="grow" placeholder="Thank you for the past months together. Here is what we propose for the next ' + r.months + '…">' + esc(r.welcome) + '</textarea></div>' +
    btn(I('send', 'sm') + (ex && ['changes', 'declined'].includes(ex.status) ? 'Send updated renewal proposal' : 'Send renewal proposal'), 'rn-save', { then: 'sent' }, 'block bigbtn') +
    '<p class="small muted" style="margin:0">It appears in the client\'s portal to accept, ask for changes or decline. When they accept, the new months, invoices and tasks are added to this project.</p>' +
    '<div class="grid" style="grid-template-columns:1fr 1fr">' + btn('Save draft', 'rn-save', { then: 'draft' }, 'quiet block') + btn('Extend now, without a proposal', 'rn-extend-open', {}, 'quiet block') + '</div>' + (ex ? btn('Delete this renewal', 'rn-del', { id: ex.id }, 'quiet') : '') + '</div></div></div>';
}
function contractCard(c) {
  const q = c.quote, acc = L.renewals(c).filter(r => r.status === 'accepted'), origEnd = acc.length ? acc[0].from - 1 : q.months, open = openRenewal(c);
  const per = [['Original contract', 1, origEnd, 'Quotation ' + q.no]].concat(acc.map(r => ['Renewal ' + r.no, r.from, r.to, r.acceptedBy ? (r.acceptedBy.how || 'Accepted') + ', ' + fmtAt(r.acceptedBy.at) : '']));
  return '<div class="card stack"><div class="row between"><h2>Contract</h2><span class="small muted">Ends ' + mName(c, q.months) + '</span></div><div class="stack" style="gap:6px">' + per.map(([n, f, t, sub]) => '<div class="row between periodrow"><span><b>' + esc(n) + '</b><br><span class="small muted">' + esc(sub) + '</span></span><span class="num">' + mName(c, f) + ' to ' + mName(c, t) + ' · ' + (t - f + 1) + ' months</span></div>').join('') + '</div>' +
    (open ? '<div class="card stack prepcard"><div class="row between"><span><b>Renewal ' + esc(open.no) + '</b> ' + pill(open.status === 'sent' ? 'awaiting' : open.status, open.status === 'sent' ? 'Sent, waiting for the client' : open.status === 'draft' ? 'Draft' : open.status === 'changes' ? 'Changes requested' : '') + '<br><span class="small muted">' + open.months + ' more months from ' + mName(c, q.months + 1) + (lastResp(open, open.status) ? ' · "' + esc(lastResp(open, open.status)) + '"' : '') + '</span></span><span class="row" style="gap:6px">' + btn('Preview', 'rn-doc', { cid: c.id, rid: open.id }, 'quiet') + btn(open.status === 'sent' ? 'Open' : 'Edit and send', 'rn-open', { cid: c.id }) + '</span></div></div>'
      : '<div class="row between"><span class="small muted">To continue after ' + mName(c, q.months) + ', send the client a renewal proposal. They accept it in their portal, and the new months are added here.</span>' + btn(I('refresh', 'sm') + 'Prepare renewal', 'rn-open', { cid: c.id }) + '</div>') + '</div>';
}

/* ---------- discounts editor, used by the quotation drawer and New project ---------- */
const discList = p => p === 'qdd' ? S.drawer.q.discounts : p === 'rnd' ? S.drawer.r.discounts : S.wiz.discounts;
let discSeq = 0;
function discSync(p) {
  const list = p === 'qdd' ? (S.drawer && S.drawer.q && S.drawer.q.discounts) : p === 'rnd' ? (S.drawer && S.drawer.r && S.drawer.r.discounts) : (S.wiz && S.wiz.discounts); if (!list) return;
  const g = id => document.getElementById(id);
  list.forEach(d => { const k = d.key; if (!g(p + '-value-' + k)) return; ['label', 'type', 'value', 'scope', 'when', 'from', 'to'].forEach(f => { const e = g(p + '-' + f + '-' + k); if (e) d[f] = e.value.trim(); }); });
}
function discEditor(p, list, lines, c, off) {
  off = off || 0; const months = c.quote.months, mo = (id, v) => '<select id="' + id + '" data-dr="' + p + '" aria-label="Month">' + Array.from({ length: months }, (_, i) => i + 1).map(m => '<option value="' + m + '"' + (+v === m ? ' selected' : '') + '>Month ' + (m + off) + ' · ' + MONTHS[ym(c, m).mo].slice(0, 3) + ' ' + String(ym(c, m).y).slice(2) + '</option>').join('') + '</select>';
  return '<div class="stack" style="gap:8px"><span class="lab">Discounts</span>' + (list.length ? list.map(d => { const k = d.key;
    return '<div class="drow"><div class="dline"><input id="' + p + '-label-' + k + '" value="' + esc(d.label || '') + '" placeholder="Name, e.g. Launch discount (optional)" aria-label="Discount name"><button class="iconbtn" data-a="disc-del" data-p="' + p + '" data-k="' + k + '" aria-label="Remove discount">' + I('x', 'sm') + '</button></div><div class="dline"><select id="' + p + '-type-' + k + '" data-dr="' + p + '" aria-label="Discount type" class="dtype"><option value="amount"' + (d.type !== 'pct' ? ' selected' : '') + '>S$</option><option value="pct"' + (d.type === 'pct' ? ' selected' : '') + '>%</option></select><input id="' + p + '-value-' + k + '" data-dr="' + p + '" type="number" min="0" value="' + esc(d.value) + '" placeholder="' + (d.type === 'pct' ? '10' : '100') + '" aria-label="Discount value" class="dval">' +
      '<select id="' + p + '-scope-' + k + '" data-dr="' + p + '" aria-label="Applies to"><option value="all">Whole invoice</option>' + lines.map(s => '<option value="' + esc(s.id) + '"' + (d.scope === s.id ? ' selected' : '') + '>' + esc(short(s)) + ' only</option>').join('') + '</select>' +
      '</div><div class="dline"><select id="' + p + '-when-' + k + '" data-dr="' + p + '" aria-label="When"><option value="once"' + (d.when === 'once' ? ' selected' : '') + '>One-off</option><option value="range"' + (d.when === 'range' ? ' selected' : '') + '>For some months</option><option value="every"' + (d.when === 'every' ? ' selected' : '') + '>Every month</option></select>' +
      (d.when === 'every' ? '<span class="small muted" style="flex:2">All ' + months + ' months</span>' : mo(p + '-from-' + k, d.from) + (d.when === 'range' ? '<span class="small muted">to</span>' + mo(p + '-to-' + k, d.to || months) : '')) + '</div></div>'; }).join('') : '<p class="small muted" style="margin:0">No discounts.</p>') + '<div>' + btn(I('plus', 'sm') + 'Add discount', 'disc-add', { p }, 'quiet') + '</div></div>';
}
function depEditor(p, dep, tmp) {
  const d = dep || {}, amt = L.depositAmt(tmp), o = (v, l, cur) => '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + l + '</option>';
  return '<div class="field"><label for="' + p + '-type">Deposit on acceptance</label><div class="row" style="gap:8px">' +
    '<select id="' + p + '-type" data-dep="' + p + '" style="width:auto">' + o('', 'No deposit', d.type || '') + o('months', 'Months of fees', d.type) + o('pct', '% of the contract', d.type) + o('amount', 'Fixed amount (S$)', d.type) + '</select>' +
    (d.type ? '<input id="' + p + '-value" type="number" min="0" data-dep="' + p + '" value="' + esc(d.value || '') + '" placeholder="' + (d.type === 'pct' ? 'e.g. 50' : d.type === 'months' ? 'e.g. 2' : 'e.g. 1000') + '" style="width:110px" aria-label="Deposit ' + (d.type === 'pct' ? 'percentage' : d.type === 'months' ? 'months' : 'amount') + '">' +
      '<select id="' + p + '-use" data-dep="' + p + '" style="width:auto" aria-label="How the deposit is used">' + o('first', 'Deduct from the first invoice', d.use || 'first') + o('last', 'Security deposit (held, then used or refunded)', d.use || 'first') + '</select>' : '') +
    '</div><span class="small muted">' + (amt ? 'Deposit of <b>' + sm(amt) + '</b>, invoiced as soon as the client accepts. Paying it unlocks preparation. ' + esc(L.depUse(tmp)) : 'Optional. Invoiced as soon as the client accepts, then either deducted from the first invoice or held as a security deposit that covers the last months.') + '</span></div>';
}
function depSync(p) {
  const t = document.getElementById(p + '-type'); if (!t) return; const v = document.getElementById(p + '-value'), u = document.getElementById(p + '-use'), dep = t.value ? { type: t.value, value: v ? v.value : (t.value === 'months' ? 2 : ''), use: u ? u.value : 'first' } : null;
  if (p === 'qdp' && S.drawer && S.drawer.q) S.drawer.q.deposit = dep; if (p === 'wzp' && S.wiz) S.wiz.deposit = dep;
}
function scheduleHtml(c, off) {
  off = off || 0;
  const g = L.schedule(c), dep = L.depositAmt(c), total = L.contractTotal(c);
  return '<div class="card" style="background:var(--card-2)">' + (dep ? '<div class="row between"><span>' + (L.depSecurity(c) ? 'Security deposit' : 'Deposit') + ' <span class="small muted">on acceptance' + (L.depSecurity(c) ? ', held' : '') + '</span></span><b class="num">' + sm(dep) + '</b></div>' : '') + g.map((x, i) => '<div class="row between"><span>' + (x.from === x.to ? 'Month ' + (x.from + off) : 'Months ' + (x.from + off) + ' to ' + (x.to + off)) + ' <span class="small muted">' + MONTHS[ym(c, x.from).mo].slice(0, 3) + (x.from === x.to ? '' : '–' + MONTHS[ym(c, x.to).mo].slice(0, 3)) + '</span></span><b class="num"' + (i === 0 ? ' style="font:600 20px var(--display)"' : '') + '>' + sm(x.total) + (x.from === x.to ? '' : ' / month') + '</b></div>').join('') + '<div class="row between small muted"><span>Full term, ' + c.quote.months + ' months</span><span class="num">' + sm(total) + '</span></div></div>';
}
const withKeys = list => (list || []).map(d => Object.assign({}, d, { key: ++discSeq }));
/* ---------- New project: one guided form for client, quotation, tasks and team fees ---------- */
const wsvc = id => svc(id) || ((S.wiz && S.wiz.custom) || []).find(s => s.id === id);
const WSTEPS = ['Client', 'Project and services', 'Tasks and fees', 'Check'];
function wizNew(aid) {
  const nx = new Date(); nx.setMonth(nx.getMonth() + 1);
  S.wiz = { step: 1, aid: aid || 'new', client: { company: '', contact: '', email: '', phone: '', website: '' }, name: '', no: String(S.nextQuote), ids: [], start: nx.toISOString().slice(0, 7), months: 6, committed: 3, discounts: [], welcome: '', tasks: [], fees: [], seeded: [], open: [], seq: 0 };
  S.view = 'newproj'; S.drawer = null; S.modal = null;
}
function wizSync() {
  const w = S.wiz; if (!w) return; const g = id => document.getElementById(id), v = id => g(id) ? g(id).value.trim() : null;
  ['company', 'contact', 'email', 'phone', 'website'].forEach(k => { if (v('wz-' + k) !== null) w.client[k] = v('wz-' + k); });
  ['name', 'no', 'start', 'welcome'].forEach(k => { if (v('wz-' + k) !== null) w[k] = v('wz-' + k); });
  if (v('wz-months') !== null) w.months = Math.max(1, Math.floor(+v('wz-months') || 0)); discSync('wzd'); depSync('wzp');
  w.months = Math.min(24, w.months); w.committed = w.months;
  if (document.querySelector('[data-wzsvc]')) w.ids = [...document.querySelectorAll('[data-wzsvc]')].filter(e => e.checked).map(e => e.dataset.wzsvc);
  w.tasks.forEach(t => { const k = t.key; if (v('wt-title-' + k) === null) return; t.title = v('wt-title-' + k); const ow = v('wt-owner-' + k); t.who = ow; t.owner = ow === 'client' ? 'client' : 'gioia'; t.assignee = t.owner === 'client' ? '' : v('wt-as-' + k); if (t.assignee && isVendor(member(t.assignee)) !== (ow === 'vendor')) t.assignee = ''; if (v('wt-due-' + k) !== null) t.dueDay = v('wt-due-' + k); if (v('wt-fee-' + k) !== null) t.fee = v('wt-fee-' + k); if (g('wt-steps-' + k)) t.steps = g('wt-steps-' + k).value; });
  if (v('ns-name') !== null) { w.ns = w.ns || {}; ['name', 'price', 'billing', 'bullets'].forEach(z => { w.ns[z] = g('ns-' + z).value; }); }
  w.fees.forEach(f => { const k = f.key; if (v('wf-member-' + k) === null) return; f.member = v('wf-member-' + k); if (v('wf-svc-' + k) !== null) f.svc = v('wf-svc-' + k); ['rule', 'type', 'amount', 'pct', 'item'].forEach(z => { if (v('wf-' + z + '-' + k) !== null) f[z] = v('wf-' + z + '-' + k); }); });
}
function wizSeed() {
  const w = S.wiz;
  w.ids.forEach(id => { if (w.seeded.includes(id)) return; const s = wsvc(id); if (!s) return; s.tasks.forEach(t => w.tasks.push({ key: ++w.seq, svc: id, title: t[0], owner: t[1], approve: !!t[2], steps: Array.isArray(t[3]) && t[3].length ? L.stepsText(t[3], S.team) : '', assignee: '', dueDay: '', fee: '' })); w.seeded.push(id); });
  w.tasks = w.tasks.filter(t => t.svc === 'general' || w.ids.includes(t.svc)); w.seeded = w.seeded.filter(id => w.ids.includes(id));
  w.fees = w.fees.filter(f => f.svc === '__item' || !f.svc || w.ids.includes(f.svc));
}
function wizClient() { const w = S.wiz, a = w.aid !== 'new' && acct(w.aid); return a ? { company: a.company, contact: a.contact, email: a.email || w.client.email, website: a.website } : w.client; }
function wizTemp() { const w = S.wiz, k = wizClient(); return { id: 'wiz', company: k.company, contact: k.contact, website: k.website, quote: { no: w.no, start: w.start, months: w.months, committed: w.committed, discount: 0, discounts: w.discounts, deposit: w.deposit || null, lines: w.ids.map(wsvc).filter(Boolean), status: 'pending' }, invoices: [], adhoc: [], extra: [], tasks: [], files: [] }; }
function wizMoney() {
  const w = S.wiz, lines = w.ids.map(wsvc).filter(Boolean), n = w.months, monthly = lines.some(s => s.billing === 'monthly');
  const tmp = wizTemp(), value = L.contractTotal(tmp);
  const feeOf = f => { if (!f.member) return 0; if (f.svc === '__item') return +f.amount || 0; const s = wsvc(f.svc); if (!s) return 0; const amt = f.type === 'pct' ? Math.round(s.price * (+f.pct || 0) / 100) : +f.amount || 0; return amt * (s.billing === 'monthly' ? n : 1); };
  const taskFee = t => { const s = wsvc(t.svc); return t.owner === 'client' ? 0 : (+t.fee || 0) * (s && s.billing === 'monthly' ? n : 1); };
  const fees = w.fees.reduce((a, f) => a + feeOf(f), 0) + w.tasks.reduce((a, t) => a + taskFee(t), 0);
  const perMonth = id => w.tasks.filter(t => t.svc === id && t.owner !== 'client').reduce((a, t) => a + (+t.fee || 0), 0) + w.fees.filter(f => f.member && f.svc === id).reduce((a, f) => { const s = wsvc(id); return a + (f.type === 'pct' ? Math.round(s.price * (+f.pct || 0) / 100) : +f.amount || 0); }, 0);
  return { value, fees, margin: value - fees, n, feeOf, perMonth };
}
function wizIssues() {
  const w = S.wiz, k = wizClient(), out = [], lines = w.ids.map(wsvc).filter(Boolean);
  if (w.aid === 'new' && !k.company) out.push(['block', 'The client has no company name.', 1]);
  if (!w.name) out.push(['block', 'The project has no name.', 2]);
  if (!lines.length) out.push(['block', 'No services are chosen yet.', 2]);
  if (!w.no) out.push(['block', 'The quotation has no number.', 2]);
  if (!k.email) out.push(['warn', 'No Google email, so ' + (k.contact || 'the client') + ' can\'t sign in to see the proposal or their portal.', 1]);
  if (w.start && w.start < TODAY.slice(0, 7)) out.push(['warn', 'The first month (' + w.start + ') is already in the past.', 2]);
  lines.forEach(s => {
    const ts = w.tasks.filter(t => t.svc === s.id && t.title), un = ts.filter(t => t.owner !== 'client' && !t.assignee && !L.parseSteps(t.steps, S.team).some(x => x[3]));
    if (!ts.length) out.push(['warn', short(s) + ' has no tasks, so nothing will show under it yet.', 3]);
    const nf = ts.filter(t => +t.fee > 0 && t.owner !== 'client' && !t.assignee); if (nf.length) out.push(['block', nf.length + ' task' + (nf.length === 1 ? '' : 's') + ' in ' + short(s) + ' have a fee but no one assigned.', 3]);
    else if (un.length) out.push(['warn', un.length + ' of ' + ts.length + ' tasks in ' + short(s) + ' have no one assigned.', 3]);
    if (s.billing === 'monthly' && ts.some(t => !t.dueDay)) out.push(['info', ts.filter(t => !t.dueDay).length + ' tasks in ' + short(s) + ' have no due day.', 3]);
    if (!w.fees.some(f => f.member && f.svc === s.id) && !ts.some(t => +t.fee > 0)) out.push(['warn', short(s) + ' has no team fees, so its cost shows as S$0.', 3]);
  });
  w.fees.forEach(f => { if (f.member && !(wizMoney().feeOf(f) > 0)) out.push(['block', 'A team fee for ' + ((member(f.member) || {}).name || 'someone') + ' has no amount.', 3]); if (f.svc === '__item' && f.member && !f.item) out.push(['block', 'A one-off item fee has no name.', 3]); });
  if (!w.welcome && !S.brand.welcome) out.push(['info', 'No welcome note, and there is no standard one in Settings. The proposal page will open straight at the services.', 2]);
  else if (!w.welcome) out.push(['info', 'No personal welcome note: your standard message from Settings will be used.', 2]);
  return out;
}
function wizardPage() {
  const w = S.wiz; if (!w) { S.view = 'clients'; return clientsPage(); }
  const step = w.step, issues = step === 4 ? wizIssues() : [];
  const stepper = '<ol class="wsteps">' + WSTEPS.map((l, i) => '<li class="' + (i + 1 === step ? 'on' : i + 1 < step ? 'done' : '') + '"><button data-a="wz-go" data-s="' + (i + 1) + '"><span class="n">' + (i + 1 < step ? I('tick', 'sm') : i + 1) + '</span>' + l + '</button></li>').join('') + '</ol>';
  let body = '';
  if (step === 1) {
    const a = w.aid !== 'new' && acct(w.aid);
    body = '<div class="card stack"><h2>Who is this project for?</h2><div class="field"><label for="wz-aid">Client</label><select id="wz-aid" data-wzaid="1"><option value="new"' + (w.aid === 'new' ? ' selected' : '') + '>New client…</option>' + S.accounts.filter(x => !x.archived).sort((x, y) => x.company.localeCompare(y.company)).map(x => '<option value="' + x.id + '"' + (x.id === w.aid ? ' selected' : '') + '>' + esc(x.company) + '</option>').join('') + '</select></div>' +
      (a ? '<div class="card" style="background:var(--card-2)"><b>' + esc(a.company) + '</b><div class="small muted">' + esc(a.contact || 'No contact name') + (a.website ? ' · ' + esc(a.website) : '') + ' · ' + projectsOf(a.id).length + ' project(s) already</div>' + (a.email ? '<div class="small" style="margin-top:6px">Signs in with ' + esc(a.email) + '</div>' : field('wz-email', 'Google email (they have none yet; used to sign in)', w.client.email, 'email')) + '</div>' :
        '<div class="meta">' + field('wz-company', 'Company', w.client.company, 'text', true) + field('wz-contact', 'Contact person', w.client.contact) + field('wz-email', 'Google email (used to sign in)', w.client.email, 'email') + field('wz-phone', 'Phone', w.client.phone) + field('wz-website', 'Website', w.client.website) + '</div>') + '</div>';
  }
  if (step === 2) {
    const tmp = wizTemp();
    body = '<div class="card stack"><h2>Project</h2><div class="meta">' + field('wz-name', 'Project name', w.name, 'text', true) + field('wz-no', 'Quotation number', w.no, 'text', true) + '</div></div>' +
      '<div class="card stack"><div class="row between"><h2>Services</h2>' + (w.ns ? '' : btn(I('plus', 'sm') + 'New service', 'wz-ns-open', {}, 'quiet')) + '</div>' + (w.ns ? '<div class="card stack" style="background:var(--card-2)"><h3 style="margin:0">New service</h3><div class="meta">' + field('ns-name', 'Service name', w.ns.name || '', 'text', true) + field('ns-price', 'Price (S$)', w.ns.price || '', 'number', true) + '<div class="field"><label for="ns-billing">Billing</label><select id="ns-billing"><option value="monthly"' + (w.ns.billing !== 'once' ? ' selected' : '') + '>Monthly</option><option value="once"' + (w.ns.billing === 'once' ? ' selected' : '') + '>One-time</option></select></div></div>' + field('ns-bullets', 'Description on the quotation, one point per line', w.ns.bullets || '', 'area') + '<p class="small muted" style="margin:0">This service belongs to this project only. It is not added to the Service catalogue. Add its tasks on the next screen.</p><div class="row">' + btn('Add service', 'wz-ns-save') + btn('Cancel', 'wz-ns-cancel', {}, 'quiet') + '</div></div>' : '') + [...S.catalogue, ...(w.custom || [])].map(s => '<label class="opt ' + (w.ids.includes(s.id) ? 'on' : '') + '"><input type="checkbox" data-wzsvc="' + s.id + '" data-wzr="1"' + (w.ids.includes(s.id) ? ' checked' : '') + '><span style="flex:1"><b>' + esc(s.name) + '</b>' + (/^p-/.test(s.id) ? ' <span class="chip">This project only</span> <button class="link small" data-a="wz-ns-del" data-id="' + s.id + '">Remove</button>' : '') + '<br><span class="small muted">' + esc(s.bullets[0] || '') + (/^p-/.test(s.id) ? '' : ' · ' + s.tasks.length + ' tasks' + (s.billing === 'monthly' ? ' a month' : '')) + '</span></span><span class="num"><b>' + money(s.price) + '</b><br><span class="small muted">' + (s.billing === 'once' ? 'one-time' : 'per month') + '</span></span></label>').join('') + '</div>' +
      '<div class="card stack"><h2>Timing and price</h2><div class="meta"><div class="field"><label for="wz-start">First month</label><input id="wz-start" type="month" data-wzr="1" value="' + esc(w.start) + '"></div>' + field('wz-months', 'Contract length (months)', w.months, 'number') + '</div><p class="small muted" style="margin:-4px 0 0">When the contract nears its end, send a renewal proposal from the project\'s Quotation tab to continue.</p>' + discEditor('wzd', w.discounts, w.ids.map(wsvc).filter(Boolean), tmp) + depEditor('wzp', w.deposit, tmp) +
      (w.ids.length ? scheduleHtml(tmp) : '') + '</div>' +
      '<div class="card stack"><h2>Welcome note</h2><div class="field"><label for="wz-welcome">Shown at the top of the proposal page (optional)</label><textarea id="wz-welcome" class="grow" placeholder="' + esc(S.brand.welcome ? 'Leave empty to use your standard message from Settings' : 'A personal note to the client') + '">' + esc(w.welcome) + '</textarea></div></div>';
  }
  if (step === 3) {
    const lines = w.ids.map(wsvc).filter(Boolean), M = wizMoney();
    const row = t => { const k = t.key, n = L.parseSteps(t.steps, S.team).length, op = w.open.includes(k), s = wsvc(t.svc), monthly = s && s.billing === 'monthly', cl = t.owner === 'client', wv = cl ? 'client' : (t.who === 'vendor' || isVendor(member(t.assignee))) ? 'vendor' : 'gioia';
      return '<div class="wtask"><div class="wtrow"><input id="wt-title-' + k + '" value="' + esc(t.title) + '" placeholder="Task" aria-label="Task"><select id="wt-owner-' + k + '" data-wzr="1" aria-label="Who does it"><option value="gioia"' + (wv === 'gioia' ? ' selected' : '') + '>Team</option>' + (S.team.some(isVendor) || wv === 'vendor' ? '<option value="vendor"' + (wv === 'vendor' ? ' selected' : '') + '>Vendor</option>' : '') + '<option value="client"' + (cl ? ' selected' : '') + '>Client sends</option></select><select id="wt-as-' + k + '" data-wzr="1" aria-label="Assigned to"' + (cl ? ' disabled' : '') + '><option value="">' + (cl ? '—' : 'Unassigned') + '</option>' + (cl ? '' : teamOpts(t.assignee, false, wv === 'vendor' ? 'vendor' : 'team')) + '</select>' +
        (cl ? '<span></span>' : '<input id="wt-fee-' + k + '" data-wzr="1" type="number" min="0" value="' + esc(t.fee || '') + '" placeholder="S$" aria-label="Fee for this task">') + (monthly ? '<input id="wt-due-' + k + '" type="number" min="1" max="31" value="' + esc(t.dueDay) + '" placeholder="Day" aria-label="Due day of the month">' : '<span></span>') +
        '<span class="row" style="gap:10px;flex-wrap:nowrap;justify-content:flex-end"><button class="link" data-a="wz-steps" data-k="' + k + '">' + (n ? n + ' steps' : 'Steps') + '</button><button class="iconbtn" data-a="wz-task-del" data-k="' + k + '" aria-label="Remove task">' + I('x', 'sm') + '</button></span></div>' +
        (op ? '<div class="stack" style="gap:6px;padding:4px 0 6px"><textarea id="wt-steps-' + k + '" class="grow" rows="3" placeholder="Client: …&#10;Jo: …&#10;Client approves: …">' + esc(t.steps) + '</textarea>' + tplBar('wt-steps-' + k) + '</div>' : '') + '</div>'; };
    const feeRow = f => { const k = f.key, s = f.svc && f.svc !== '__item' ? wsvc(f.svc) : null;
      return '<div class="wfee"><select id="wf-member-' + k + '" data-wzr="1" aria-label="Team member"><option value="">Team member…</option>' + teamOpts(f.member) + '</select>' +
        (f.svc === '__item' ? '<input id="wf-item-' + k + '" value="' + esc(f.item || '') + '" placeholder="Item, e.g. Photoshoot" aria-label="Item name">' : s && s.billing === 'monthly' ? '<select id="wf-rule-' + k + '" aria-label="When it is paid"><option value="prorata"' + (f.rule !== 'all' ? ' selected' : '') + '>Pro-rata, per task done</option><option value="all"' + (f.rule === 'all' ? ' selected' : '') + '>When all their tasks are done</option></select>' : '<span class="small muted">Paid as the tasks are done</span>') +
        (s ? '<select id="wf-type-' + k + '" data-wzr="1" aria-label="Amount type"><option value="fixed"' + (f.type !== 'pct' ? ' selected' : '') + '>S$</option><option value="pct"' + (f.type === 'pct' ? ' selected' : '') + '>% of price</option></select>' : '<span></span>') +
        (f.type === 'pct' && s ? '<input id="wf-pct-' + k + '" data-wzr="1" type="number" min="0" max="100" value="' + esc(f.pct || '') + '" placeholder="%" aria-label="Percentage">' : '<input id="wf-amount-' + k + '" data-wzr="1" type="number" min="0" value="' + esc(f.amount || '') + '" placeholder="Amount" aria-label="Amount">') +
        '<button class="iconbtn" data-a="wz-fee-del" data-k="' + k + '" aria-label="Remove fee">' + I('x', 'sm') + '</button></div>'; };
    body = lines.map(s => { const pm = M.perMonth(s.id), sf = w.fees.filter(f => f.svc === s.id);
      return '<div class="card stack"><div class="row between" style="align-items:flex-start"><div><h2>' + esc(short(s)) + '</h2><span class="small muted">' + (s.billing === 'monthly' ? 'Every month, ' + w.months + ' months' : 'Once, in ' + mName(wizTemp(), 1)) + '</span>' + (/^p-/.test(s.id) ? '<br><span class="chip" style="margin-top:6px">This project only</span>' : '') + '</div><div class="svcval"><span class="small muted">Client pays</span><b>' + sm(s.price) + (s.billing === 'monthly' ? '<span class="small muted"> / month</span>' : '') + '</b><span class="small ' + (pm > s.price ? 'crit' : 'muted') + '">Team fees ' + sm(pm) + (s.billing === 'monthly' ? ' / month' : '') + '</span></div></div>' +
        '<div class="wthead"><span>Task</span><span>Who does it</span><span>Assigned to</span><span>Fee (S$)</span><span>' + (s.billing === 'monthly' ? 'Due day' : '') + '</span><span></span></div>' + w.tasks.filter(t => t.svc === s.id).map(row).join('') +
        '<div class="row">' + btn(I('plus', 'sm') + 'Add task', 'wz-task-add', { svc: s.id }, 'quiet') + (sf.length ? '' : '<button class="link small" data-a="wz-fee-add" data-svc="' + s.id + '">Or pay someone a ' + (s.billing === 'monthly' ? 'monthly sum' : 'single fee') + ' for this whole service</button>') + '</div>' +
        (sf.length ? '<div class="stack" style="gap:6px"><span class="lab">' + (s.billing === 'monthly' ? 'Monthly sum for the whole service' : 'Fee for the whole service') + '</span>' + sf.map(feeRow).join('') + '<div><button class="link small" data-a="wz-fee-add" data-svc="' + s.id + '">Add another</button></div></div>' : '') + '</div>'; }).join('') +
      '<div class="card stack"><div class="row between"><h2>Other one-off tasks</h2><span class="chip">Not tied to a service</span></div><p class="small muted" style="margin:0">Such as a kick-off call. These go under General and are open straight away.</p>' + (w.tasks.some(t => t.svc === 'general') ? '<div class="wthead"><span>Task</span><span>Who does it</span><span>Assigned to</span><span>Fee (S$)</span><span></span><span></span></div>' : '') + w.tasks.filter(t => t.svc === 'general').map(row).join('') + '<div>' + btn(I('plus', 'sm') + 'Add task', 'wz-task-add', { svc: 'general' }, 'quiet') + '</div></div>' +
      '<div class="card stack"><h2>One-off items</h2><p class="small muted" style="margin:0">Work outside the tasks, such as a photoshoot. Payable straight away.</p>' + w.fees.filter(f => f.svc === '__item').map(feeRow).join('') + '<div>' + btn(I('plus', 'sm') + 'Add item', 'wz-fee-add', { svc: '__item' }, 'quiet') + '</div></div>' +
      '<div class="grid g3">' + ktile('coins', 'g', 'Client pays (' + M.n + ' months)', M.value) + ktile('hourglass', 'o', 'Team fees, same months', M.fees) + ktile('check', 'g', 'Margin', M.margin) + '</div>' +
      '<p class="small muted" style="margin:0">A task fee is paid to the person assigned, once that task is completed; for a monthly service it is paid for each month\'s task. Steps: one per line, starting with Client:, Client reviews:, Client approves:, Team: or a team member\'s name.</p>';
  }
  if (step === 4) {
    const k = wizClient(), lines = w.ids.map(wsvc).filter(Boolean), M = wizMoney(), blocks = issues.filter(x => x[0] === 'block');
    body = '<div class="card stack"><h2>Summary</h2><div class="grid g2 sumgrid"><div><span class="lab">Client</span><b>' + esc(k.company || '—') + '</b><span class="small muted">' + esc(k.contact || '') + (k.email ? ' · ' + esc(k.email) : '') + '</span></div><div><span class="lab">Project</span><b>' + esc(w.name || '—') + '</b><span class="small muted">Quotation ' + esc(w.no) + ' · ' + w.start + ', ' + w.months + ' months</span></div><div><span class="lab">Services</span><b>' + (lines.map(short).join(', ') || '—') + '</b><span class="small muted">' + w.tasks.filter(t => t.title).length + ' tasks set up</span></div><div><span class="lab">Value and team fees (whole contract)</span><b>' + sm(M.value) + ' · ' + sm(M.fees) + '</b><span class="small muted">' + (w.fees.filter(f => f.member).length + w.tasks.filter(t => +t.fee > 0).length) + ' team fees</span></div></div></div>' +
      '<div class="card stack"><h2>' + (issues.length ? 'Worth checking' : 'Everything is covered') + '</h2>' + (issues.length ? issues.map(([lv, t, s]) => '<div class="issue ' + lv + '"><span class="ico-wrap">' + I(lv === 'block' ? 'x' : lv === 'warn' ? 'clock' : 'circle', 'sm') + '</span><span style="flex:1">' + esc(t) + '</span><button class="link" data-a="wz-go" data-s="' + s + '">Fix</button></div>').join('') : '<p class="muted" style="margin:0">Client, services, tasks, assignees and fees are all filled in.</p>') + '</div>' +
      '<div class="card row between"><span class="small muted" style="max-width:560px">' + (blocks.length ? 'Fix the items marked with a cross first.' : '<b>Send</b> puts the proposal in the client\'s portal for them to accept. <b>Save as draft</b> keeps it to yourselves for now. Tasks are created when the proposal is accepted.') + '</span><div class="row">' + btn('Save as draft', 'wz-save', { then: 'draft' }, 'ghost', !!blocks.length) + btn(I('send', 'sm') + 'Send', 'wz-save', { then: 'sent' }, 'bigbtn', !!blocks.length) + '</div></div>';
  }
  return '<div class="crumbs"><button data-a="nav" data-v="clients">Clients</button>' + I('chev', 'sm') + '<b>New project</b></div><div class="row between"><h1>New project</h1>' + btn('Cancel', 'wz-cancel', {}, 'quiet') + '</div>' + stepper + '<div class="stack wizbody">' + body + '</div>' +
    (step < 4 ? '<div class="row between">' + (step > 1 ? btn(I('back', 'sm') + 'Back', 'wz-go', { s: step - 1 }, 'quiet') : '<span></span>') + btn('Next: ' + WSTEPS[step] + ' ' + I('chev', 'sm'), 'wz-go', { s: step + 1 }) + '</div>' : '<div>' + btn(I('back', 'sm') + 'Back', 'wz-go', { s: 3 }, 'quiet') + '</div>');
}

/* ---------- talking to the server ---------- */
let D = null;
function checkFees() {}
const task = id => client().tasks.find(t => t.id === id);
function pickClient(d) { if (d.cid) S.cid = d.cid; }
/* notes written to one person ("Assigned you a fee…") read in the third person for everyone else, e.g. admins */
function personal(e) {
  if (!e.priv || e.priv === ((D && D.me && D.me.id) || S.me)) return e;
  const n = (member(e.priv) || {}).name || 'the team member', t = String(e.text || '');
  const x = t.replace(/^Assigned you /, 'Assigned ' + n + ' ').replace(/^Paid you /, 'Paid ' + n + ' ').replace(/^You have earned (.*?) of your /, n + ' has earned $1 of their ')
    .replace(/no longer on your list/, "no longer on " + n + "'s list").replace(/ is waiting for you\b/, ' is waiting for ' + n).replace(/ tasks are waiting for you\b/, ' tasks are waiting for ' + n).replace(/^Payment details saved$/, n + "'s payment details saved");
  return x === t ? e : Object.assign({}, e, { text: x });
}
function adopt(st) {
  D = st;
  // a link from an email (?go=…): remember it through sign-in, then open it once
  const goQ = new URLSearchParams(location.search).get('go'); let go = goQ; try { if (goQ) sessionStorage.setItem('go', goQ); else go = sessionStorage.getItem('go'); } catch (e) {}
  if (D.me && ['admin', 'team', 'client'].includes(D.me.role) && go && !S.goDone) { S.goDone = true; try { sessionStorage.removeItem('go'); history.replaceState(history.state, '', location.pathname); } catch (e) {} setTimeout(() => { openGo(go); render(); }, 0); }
  if (!D.me || !['admin', 'team', 'client'].includes(D.me.role)) return;
  S.brand = D.brand; S.team = D.team || []; S.catalogue = D.catalogue || []; S.clients = D.clients || []; S.accounts = D.accounts || []; S.payouts = D.payouts || []; S.fees = D.fees || []; S.feed = (D.feed || []).map(e => personal(e)); S.nextQuote = D.nextQuote || 0; S.invFormat = D.invFormat || ''; S.templates = D.templates || []; S.prepTemplates = D.prepTemplates || []; S.bills = D.bills || []; S.myBank = D.myBank || null; S.myPay = D.myPay || '';
  S.clients.forEach(c => { c.adhoc = c.adhoc || []; c.extra = c.extra || []; c.files = c.files || []; c.tasks.forEach(t => { t.desc = t.desc || ''; t.due = t.due || ''; t.history = t.history || []; t.comments = t.comments || []; t.files = t.files || []; }); });
  if (/signin=failed/.test(location.search)) try { history.replaceState(null, '', location.pathname); } catch (e) {}
  S.role = D.me.role === 'client' ? 'client' : 'admin'; S.me = D.me.id || '';
  if (!S.clients.find(c => c.id === S.cid)) S.cid = (D.me.role === 'client' && D.me.cid) || (S.clients[0] || {}).id || '';
  if (!S.init) { S.init = true; S.wsOpen = S.clients.filter(c => c.tasks.some(t => taskOpen(c, t))).map(c => c.id); }
  if (!isAdmin() && ['billing', 'acct', 'catalogue', 'team', 'settings'].includes(S.view)) S.view = 'clients';
  if (!client() && ['client', 'ws', 'task'].includes(S.view)) S.view = 'clients';
  document.body.classList.toggle('no-upload', !D.uploads); document.body.classList.toggle('no-email', !D.email);
}
async function load() {
  try { const r = await fetch('/api/state', { credentials: 'same-origin' }); const st = await r.json(); if (st.error) throw new Error(st.error); SYNC.version = SYNC.version || st.version; SYNC.sig = sig(st); adopt(st); }
  catch (e) { document.getElementById('app').innerHTML = '<p style="padding:24px">The app could not load. Please refresh the page.</p>'; return; }
  render();
}
async function api(a, p, opts) {
  opts = opts || {}; let res;
  try { const r = await fetch('/api/action', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a, cid: opts.cid || S.cid, p: p || {} }) }); res = await r.json(); }
  catch (e) { toast('Could not reach the server. Check your connection and try again.'); return null; }
  if (res.error) { toast(res.error); return null; }
  SYNC.sig = sig(res.state); SYNC.pending = null; adopt(res.state);
  if (!opts.quiet) toast(opts.msg || (res.logged && res.logged.length ? res.logged[0] : 'Saved.'));
  return res;
}
function gateHtml() {
  const failed = /signin=failed/.test(location.search); let body;
  if (!D.me) body = '<p>Sign in with the Google account your invitation was sent to.</p>' + (failed ? '<p class="pill crit" style="align-self:center">Sign-in did not complete. Please try again.</p>' : '') + (D.googleReady ? '<a class="btn bigbtn" href="/auth/google">Sign in with Google</a>' : '<p class="muted">Google sign-in is being set up. Please check back shortly.</p>') + (D.devLogin ? '<p class="small muted">Local testing: open /auth/dev?email=you@example.com</p>' : '');
  else if (D.me.role === 'pending') body = '<p>You are signed in as <b>' + esc(D.me.email) + '</b>.</p><p>Your proposal is being prepared. We will let you know as soon as it is ready to view here.</p><a class="btn ghost" href="/auth/logout">Sign out</a>';
  else body = '<p>You are signed in as <b>' + esc(D.me.email) + '</b>, but this account is not on the client or team list.</p><p class="muted">Ask your contact to add this email, or sign in with a different Google account.</p><a class="btn ghost" href="/auth/logout">Use a different account</a>';
  return '<div class="gate"><div class="gatelogo">' + logoImg('green', 72) + '</div><div class="card stack" style="text-align:center;align-items:center;gap:14px;padding:30px"><h2>Client Portal</h2>' + body + '</div></div>';
}
function emailPrefCard() {
  return '<div class="card stack" style="max-width:560px"><h2>Email updates</h2><label class="opt ' + (D.emailOn ? 'on' : '') + '"><input type="checkbox" data-epref="1"' + (D.emailOn ? ' checked' : '') + '><span><b>Email me when something needs me</b><br><span class="small muted">Proposals, invoices, work ready for your review or approval, and comments from the team. Sent to ' + esc(D.me.email) + '.</span></span></label></div>';
}
function meMenu() {
  return '<div class="menu" style="width:270px"><div style="padding:8px 10px 10px"><b>' + esc(D.me.name || '') + '</b><br><span class="small muted">' + esc(D.me.email) + '</span><br><span class="small muted">' + (S.role === 'client' ? 'Client' : isAdmin() ? 'Admin' : 'Gioia team') + '</span></div>' + (S.role !== 'client' ? '<label class="mi" style="cursor:pointer"><input type="checkbox" data-epref="1"' + (D.emailOn ? ' checked' : '') + ' style="width:auto"><span>Email me about my work</span></label>' : '') + (tourKind() ? '<button class="mi" data-a="tour-start">' + I('help') + '<span>Show me around</span></button>' : '') + '<button class="mi" data-a="photo-open">' + I('user') + '<span>Profile photo</span></button><button class="mi" data-a="help-open">' + I('help') + '<span>Help</span></button>' + '<a class="mi" href="/auth/logout">' + I('out') + '<span>Sign out</span></a></div>';
}

/* ---------- actions ---------- */
async function saveQuote(then, msg) {
  syncQuoteNew(); const d = S.drawer;
  const r = await api('q-save', { cid: d.id, aid: d.aid, name: d.name, no: d.no, welcome: d.welcome || '', override: d.override, client: { company: d.company || '', contact: d.contact || '', email: d.email || '', website: d.website || '' }, q: d.q, then }, { msg });
  if (!r) return; S.drawer = null; S.cid = r.out.cid; S.view = 'client'; S.ctab = then === 'accept' ? 'invoices' : 'quote';
}
const ACT = {
  noop() { toast('Not available yet.'); },
  print() { window.print(); return 'skip'; },
  nav(d) { S.view = d.v; S.menu = null; S.q = ''; if (d.v === 'billing') { S.asub = ''; S.afc = ''; } },
  menu(d) { S.menu = S.menu === d.m ? null : d.m; },
  'bell-only'() { S.bellUnread = !S.bellUnread; S.menu = 'bell'; },
  'seen-all'() { return api('seen', {}, { quiet: true }); },
  'note-open'(d) { S.menu = null; const e = (S.bellList || [])[+d.i] || { cid: d.cid, text: '' }, k = feedKey(e); noteGo(e); if (D && unreadFor(e)) { D.read = [k, ...(D.read || [])]; return api('seen-one', { k }, { quiet: true }); } },
  'open-client'(d) { S.cid = d.id; S.view = 'client'; S.ctab = 'overview'; S.q = ''; },
  'open-client-tab'(d) { S.cid = d.id; S.view = 'client'; S.ctab = d.t; S.q = ''; },
  'open-ws'(d) { pickClient(d); S.ws = d.id; S.wm = +d.m || 1; S.q = ''; if (S.role === 'client') { S.ptab = 'tasks'; S.pws = d.id; S.ptg = ''; S.pwm = +d.m || 0; } else S.view = 'ws'; },
  'pwm'(d) { S.pwm = +d.m; S.ptg = ''; },
  ctab(d) { S.ctab = d.t; }, ptab(d) { S.ptab = d.t; if (d.t === 'tasks' && S.role === 'client') { const c = client(), open = c ? c.tasks.filter(t => canSee(c, t)) : []; S.ptg = open.some(t => tGroup(t) === 'client') ? 'client' : open.some(t => tGroup(t) === 'awaiting') ? 'awaiting' : ''; } }, qtab(d) { S.qtab = d.t; }, ifilter(d) { S.ifilter = d.f; },
  ws(d) { S.ws = d.id; }, wm(d) { S.wm = +d.m; }, mode(d) { S.mode = d.m; },
  task(d) { S.editSteps = null; pickClient(d); S.back = { view: S.view, ptab: S.ptab }; S.tid = d.id; S.confirm = null; S.q = ''; if (staff()) S.view = 'task'; else S.ptab = 'task'; const mn = document.querySelector('.main'); if (mn) mn.scrollTop = 0; window.scrollTo(0, 0); },
  'task-back'() { const b = S.back || {}; S.confirm = null; if (staff()) S.view = b.view && b.view !== 'task' ? b.view : 'mytasks'; else S.ptab = b.ptab && b.ptab !== 'task' ? b.ptab : 'tasks'; },
  'mt-mode'(d) { S.mtMode = d.m; S.mtg = ''; try { localStorage.setItem('mtMode', d.m); } catch (e) {} },
  'mt-fold'(d) { const k = d.k, cur = S.mtOpen && k in S.mtOpen ? S.mtOpen[k] : !!(S.mtDef || {})[k]; S.mtOpen = Object.assign({}, S.mtOpen, { [k]: !cur }); },
  'mt-more'(d) { S.mtMore = Object.assign({}, S.mtMore, { [d.k]: true }); },
  'mt-scope'(d) { S.mtScope = d.s; if (d.s === 'me') S.mtWho = ''; }, 'mt-group'(d) { S.mtg = S.mtg === d.g ? '' : d.g; }, 'mt-filters'() { S.mtFilters = !S.mtFilters; }, 'mt-clear'() { S.mtClient = ''; S.mtg = ''; S.mtWho = ''; },
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
  'task-new'(d) { const c = S.clients.find(x => x.id === (d.cid || S.cid)) || S.clients[0]; if (!c) { toast('Add a client first.'); return; } S.drawer = { kind: 'newtask', cid: c.id, svc: d.svc || '', m: +d.m || currentMonth(c) }; },
  async 'task-create'() {
    syncNewTask(); const d = S.drawer, title = (d.title || '').trim(); if (!d.svc) { toast('Choose the deliverable.'); return; } if (!title) { toast('Give the task a name.'); return; }
    const r = await api('task-create', { svc: d.svc, m: +d.m || 1, title, desc: d.desc, owner: val('nt-owner') === 'client' ? 'client' : 'gioia', assignee: val('nt-as'), due: d.due, approve: document.getElementById('nt-appr').checked, steps: d.steps }, { cid: d.cid });
    if (r) { S.drawer = null; S.cid = d.cid; }
  },
  'steps-edit'(d) { S.editSteps = d.id; },
  'steps-cancel'() { S.editSteps = null; },
  async 't-steps-save'(d) { const r = await api('t-steps-set', { id: d.id, steps: val('dr-steps') }); if (r) S.editSteps = null; },
  't-step'(d) { return api('t-step', { id: d.id, text: val('cm-text') }); },
  't-step-undo'(d) { S.modal = { kind: 'undo', id: d.id, cid: (client() || {}).id }; },
  async 'undo-go'() { const why = val('un-why').trim(); if (!why) { toast('Please give a reason for undoing this step.'); const el = document.getElementById('un-why'); if (el) el.focus(); return 'skip'; } const M = S.modal, r = await api('t-step-undo', { id: M.id, reason: why }, { cid: M.cid, msg: 'Step undone. It is back where it was.' }); if (r) S.modal = null; },
  'stage-next'(d) { const t = task(d.id); return api('t-stage-set', { id: d.id, stage: t.stage + 1 }); },
  'svc-steps'(d) { syncSvc(); const x = S.drawer.draft; x.open = x.open || []; if (!x.open.includes(+d.i)) x.open.push(+d.i); },
  'imp-preview'() { const plan = readPlan(); if (!plan) return; S.imp.plan = plan; return api('import-preview', { plan }, { quiet: true }).then(r => { if (r) S.imp.preview = r.out; }); },
  'imp-clear'() { S.imp.preview = null; },
  'imp-reset'() { S.imp = { text: '', preview: null }; },
  async 'imp-create'() { const r = await api('import-create', { plan: S.imp.plan }, { msg: 'Project created.' }); if (r && r.out) { S.cid = r.out.cid; S.imp = { text: '', preview: null }; S.view = 'client'; S.ctab = 'overview'; } },
  async 'imp-copy'() { const t = setupText(); try { await navigator.clipboard.writeText(t); toast('Copied. Paste it into your chat with Claude, then add the project details.'); } catch (e) { S.modal = { kind: 'setup', text: t }; } },
  't-submit'(d) { return api('t-submit', { id: d.id }); },
  't-done'(d) { return api('t-done', { id: d.id }); },
  't-sent'(d) { return api('t-sent', { id: d.id }); },
  async 't-approve'(d) { const onPage = S.ptab === 'task'; const r = await api('t-approve', { id: d.id, text: val('cm-text') }); if (r && onPage) S.confirm = d.id; },
  't-comment'(d) { const x = val('cm-text'), int = document.getElementById('cm-internal'), c = client(); if (!x) { toast('Write a comment first.'); return; }
    const ment = c ? mentionables(c, !!(int && int.checked)).filter(m => x.includes('@' + m.name)).map(m => m.key) : [];
    return api('t-comment', { id: d.id, text: x, internal: !!(int && int.checked), mentions: ment }, { msg: (int && int.checked ? 'Team-only comment posted. The client can\'t see it.' : 'Comment posted.') + (ment.length ? ' ' + ment.length + (ment.length === 1 ? ' person' : ' people') + ' notified.' : '') }); },
  'cm-more'(d) { S.cmOpen = S.cmOpen || []; S.cmOpen = S.cmOpen.includes(d.c) ? S.cmOpen.filter(z => z !== d.c) : [...S.cmOpen, d.c]; },
  async 'q-accept-go'(d) { const ag = document.getElementById('qx-agree'), p = { decision: 'accept', agree: !!(ag && ag.checked), name: val('qx-name') }; const r = d.rid ? await api('rn-respond', Object.assign(p, { id: d.rid }), { msg: 'Thank you. Your renewal is accepted.' }) : await api('q-respond', p, { msg: 'Thank you. Your proposal is accepted.' }); if (r) window.scrollTo(0, 0); },
  'q-decline-open'(d) { S.modal = { kind: 'qdecline', rid: d.rid || '' }; },
  async 'q-decline-go'() { const rid = S.modal.rid, r = await api(rid ? 'rn-respond' : 'q-respond', { id: rid, decision: 'decline', text: val('qx-reason') }, { msg: 'Thank you for letting us know.' }); if (r) S.modal = null; },
  'q-changes-open'(d) { S.modal = { kind: 'qchanges', rid: d.rid || '' }; },
  async 'q-changes-go'() { const t = val('qx-changes'); if (!t) { toast('Tell us what you would like changed.'); return; } const rid = S.modal.rid, r = await api(rid ? 'rn-respond' : 'q-respond', { id: rid, decision: 'changes', text: t }, { msg: 'Thank you. We will send you an updated proposal.' }); if (r) S.modal = null; },
  'noop-terms'() { S.openTerms = true; setTimeout(() => { const el = document.getElementById('terms'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 50); },
  'cm-del'(d) { S.modal = { kind: 'cmdel', id: d.id, c: d.c }; },
  async 'cm-del-go'() { const r = await api('t-comment-del', { id: S.modal.id, cid: S.modal.c }, { msg: 'Comment deleted.' }); if (r) S.modal = null; },
  'note-add'(d) { const x = val('nn-text'); if (!x) { toast('Write the note first.'); return; } return api('note-add', { aid: d.aid, text: x }, { msg: 'Note added.' }); },
  'note-edit'(d) { S.noteEdit = d.id; },
  'note-cancel'() { S.noteEdit = null; },
  async 'note-save'(d) { const r = await api('note-edit', { aid: d.aid, id: d.id, text: val('ne-text') }, { msg: 'Note saved.' }); if (r) S.noteEdit = null; },
  'note-del'(d) { return api('note-edit', { aid: d.aid, id: d.id, remove: true }, { msg: 'Note deleted.' }); },
  async 'invite-open'(d) { const c = S.clients.find(x => x.id === d.cid), t = inviteText(c); S.modal = { kind: 'invite', text: t }; try { await navigator.clipboard.writeText(t); S.modal.copied = true; } catch (e) {} },
  't-changes'(d) { const x = val('cm-text'); if (!x) { toast('Write what you would like changed in the comment box first.'); return; } return api('t-changes', { id: d.id, text: x }); },
  'pick-file'(d) { if (!D.uploads) { toast('File uploads arrive with the Google Drive connection. For now, add a Google link.'); return 'skip'; } const el = document.getElementById('up-' + d.key); if (el) el.click(); return 'skip'; },
  'link-open'(d) { S.modal = { kind: 'link', key: d.key, svc: S.ws }; },
  async 'link-add'() { const url = val('ln-url'); if (!/^https?:\/\/\S+$/.test(url)) { toast('Paste the full link, starting with https://'); return; } const r = await api('f-link', { key: S.modal.key, svc: S.modal.svc, url, name: val('ln-name') }); if (r) S.modal = null; },
  'save-details'() { const p = { company: val('d-company'), contact: val('d-contact'), phone: val('d-phone'), website: val('d-website'), email: val('d-email') }; if (document.getElementById('d-project')) p.project = val('d-project'); return api('save-details', p); },
  'arch-toggle'() { S.showArchived = !S.showArchived; },
  'pl-cash'() { const p = S.pl = S.pl || {}, x = p.all = p.all || {}; x.b = x.b === 'cash' ? 'work' : 'cash'; },
  'pl-per'(d) { const p = S.pl = S.pl || {}; (p.all = p.all || {}).p = d.p; },
  'acct-open'(d) { S.cid = d.id; S.view = 'billing'; S.asub = 'project'; },
  asub(d) { if (d.s === 'export') return ACT['acc-xlsx'](); S.asub = d.s; S.afc = d.cid || ''; S.menu = null; if (d.s === 'project' && d.cid) S.cid = d.cid; },
  acat(d) { S.afc = d.cid || (S.asub === 'project' ? '' : S.afc || ''); if (!d.cid && S.asub === 'costs') S.afc = ''; S.asub = 'costcat'; S.acat = d.c; },
  'ap-mode'(d) { const p = aPer(); if (d.m === 'all') S.pfull = true; else { S.pfull = false; p.mode = d.m; if (d.m === 'y' && !p.y) p.y = p.m.slice(0, 4); } },
  'inc-toggle'(d) { S.incOpen = S.incOpen || []; S.incOpen = S.incOpen.includes(d.id) ? S.incOpen.filter(x => x !== d.id) : [...S.incOpen, d.id]; },
  htab(d) { S.htab = d.t; },
  'dv-month'(d) { S.dm = +d.m; S.dmc = d.cid; },
  'parts-open'(d) { S.modal = { kind: 'parts', cid: d.cid, m: d.m, id: d.id }; },
  async 'pay-undo'(d) { const r = await api('pay-undo', { m: d.m, id: d.id, part: d.part }, { cid: d.cid, msg: 'Payment taken back.' }); if (r) S.modal = null; },
  'exp-new2'() { S.modal = { kind: 'exp', cid: S.afc || '', pick: !S.afc }; },
  'exp-edit2'(d) { S.modal = { kind: 'exp', cid: d.cid, id: d.id }; },
  'acc-xlsx'() { const w = financeWorkbook(), u = URL.createObjectURL(w.blob), a = document.createElement('a'); a.href = u; a.download = 'Gioia accounts ' + w.name + '.xlsx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000); toast('Exported the accounts for ' + w.name + '. Send the file to your finance team.'); return 'skip'; },
  atab(d) { S.atab = d.t; },
  'ap-all'() { S.apper = { cid: S.cid, mode: 'all', k: '' }; },
  'exp-sel'(d) { S.expSel = d.id; },
  'exp-new'() { S.modal = { kind: 'exp', cid: S.cid }; },
  'exp-edit'(d) { S.modal = { kind: 'exp', cid: S.cid, id: d.id }; },
  'exp-dropfile'() { S.modal.drop = true; },
  async 'exp-del'(d) { const r = await api('exp-del', { id: d.id }, { msg: 'Expense removed.' }); if (r) { S.modal = null; S.expSel = ''; } },
  async 'exp-save'() {
    const M = S.modal; if (M.pick) M.cid = val('ex-cid'); const fi = document.getElementById('ex-file'), f = fi && fi.files[0], p = { id: M.id || '', name: val('ex-name'), amount: val('ex-amt'), date: val('ex-date'), category: val('ex-cat'), paidBy: val('ex-by'), note: val('ex-note'), dropFile: !!M.drop };
    if (f) { if (f.size > 25 * 1024 * 1024) { toast('That receipt is over 25 MB.'); return; } try { const r = await fetch('/api/receipt-upload?cid=' + encodeURIComponent(M.cid) + '&name=' + encodeURIComponent(f.name), { method: 'POST', headers: { 'Content-Type': f.type || 'application/octet-stream' }, body: f }), j = await r.json(); if (j.error) { toast(j.error); return; } p.file = j.fileId; p.fileName = f.name; } catch (er) { toast('The receipt did not upload. Check your connection and try again.'); return; } }
    const r = await api('exp-save', p, { msg: M.id ? 'Expense saved.' : 'Expense added.', cid: M.cid }); if (r) { S.modal = null; if (!M.id) { const c = S.clients.find(x => x.id === M.cid), last = c && (c.expenses || []).slice(-1)[0]; if (last) S.expSel = last.id; } }
  },
  apv(d) { S.apv = d.v; },
  'acct-archive'(d) { return api('acct-archive', { aid: d.aid, archived: d.v === '1' }, { msg: d.v === '1' ? 'Client archived. Find them with "Show archived" on the Clients page.' : 'Client restored.' }); },
  'del-acct-open'(d) { S.modal = { kind: 'delacct', aid: d.aid }; },
  async 'del-acct'() { const r = await api('acct-delete', { aid: S.modal.aid, confirm: val('da-name') }, { msg: 'Client deleted.' }); if (r) { S.modal = null; S.view = 'clients'; } },
  'q-del-open'(d) { S.modal = { kind: 'qdel', cid: d.cid }; },
  async 'q-del'() { const r = await api('q-delete', {}, { cid: S.modal.cid, msg: 'Draft quotation deleted.' }); if (r) { S.modal = null; S.view = 'clients'; } },
  'q-cancel-open'(d) { S.modal = { kind: 'qcancel', cid: d.cid }; },
  async 'q-cancel'() { const r = await api('q-cancel', { note: val('qc-note') }, { cid: S.modal.cid }); if (r) S.modal = null; },
  'num-open'(d) { S.modal = { kind: 'num', k: d.k, cid: d.cid, m: +d.m || 0, id: d.id || '' }; },
  async 'num-save'() { const M = S.modal, o = document.getElementById('nm-over'); const r = await api(M.k === 'q' ? 'q-number' : 'i-number', { no: val('nm-no'), override: !!(o && o.checked), m: M.m, id: M.id }, { cid: M.cid, msg: 'Number changed.' }); if (r) S.modal = null; },
  'prep-start'(d) { return api('prep-start', {}, { cid: d.cid || S.cid }); },
  'vc-open'(d) { S.modal = { kind: 'vc', id: d.id }; },
  'wz-new'(d) { wizNew(d.aid); window.scrollTo(0, 0); },
  'wz-cancel'() { S.wiz = null; S.view = 'clients'; },
  'wz-go'(d) { wizSync(); const s = Math.min(4, Math.max(1, +d.s)); if (s >= 3) wizSeed(); S.wiz.step = s; window.scrollTo(0, 0); const mn = document.querySelector('.main'); if (mn) mn.scrollTop = 0; },
  'wz-task-add'(d) { wizSync(); const w = S.wiz, k = ++w.seq; w.tasks.push({ key: k, svc: d.svc, title: '', owner: 'gioia', approve: true, steps: '', assignee: '', dueDay: '' }); setTimeout(() => { const e = document.getElementById('wt-title-' + k); if (e) e.focus(); }, 30); },
  'wz-task-del'(d) { wizSync(); S.wiz.tasks = S.wiz.tasks.filter(t => t.key !== +d.k); },
  'wz-steps'(d) { wizSync(); const o = S.wiz.open, k = +d.k; S.wiz.open = o.includes(k) ? o.filter(x => x !== k) : [...o, k]; },
  'wz-fee-add'(d) { wizSync(); const w = S.wiz; w.fees.push({ key: ++w.seq, member: '', svc: d.svc || w.ids[0] || '', rule: 'prorata', type: 'fixed', amount: '', pct: '', item: '' }); },
  'wz-ns-open'() { wizSync(); S.wiz.ns = { name: '', price: '', billing: 'monthly', bullets: '' }; },
  'wz-ns-cancel'() { S.wiz.ns = null; },
  'wz-ns-save'() { wizSync(); const w = S.wiz, n = w.ns; if (!n.name.trim()) { toast('Give the service a name.'); return; } const id = 'p-' + Date.now().toString(36); (w.custom = w.custom || []).push({ id, name: n.name.trim(), price: +n.price || 0, billing: n.billing === 'once' ? 'once' : 'monthly', note: '', bullets: n.bullets.split('\n').map(x => x.trim()).filter(Boolean), tasks: [] }); w.ids.push(id); w.ns = null; toast('Added to this project only. It is not saved to the Service catalogue.'); },
  'wz-ns-del'(d) { wizSync(); const w = S.wiz; w.custom = (w.custom || []).filter(s => s.id !== d.id); w.ids = w.ids.filter(x => x !== d.id); },
  'wz-fee-del'(d) { wizSync(); S.wiz.fees = S.wiz.fees.filter(f => f.key !== +d.k); },
  async 'wz-save'(d) {
    wizSync(); const w = S.wiz, payload = { aid: w.aid, client: w.aid === 'new' ? w.client : { email: w.client.email }, name: w.name, no: w.no, ids: w.ids, start: w.start, months: w.months, committed: w.committed, discounts: w.discounts, deposit: w.deposit || null, welcome: w.welcome, tasks: w.tasks.filter(t => t.title).map(t => ({ svc: t.svc, title: t.title, owner: t.owner, approve: t.approve, steps: t.steps, assignee: t.assignee, dueDay: t.dueDay, fee: t.owner === 'client' ? 0 : t.fee })), fees: w.fees.filter(f => f.member), custom: (w.custom || []).filter(s => w.ids.includes(s.id)) };
    const r = await api('project-create', { w: payload, then: d.then }, { msg: d.then === 'sent' ? 'Project created and the proposal is in the client\'s portal.' : 'Project saved as a draft.' });
    if (r && r.out) { S.wiz = null; S.cid = r.out.cid; S.view = 'client'; S.ctab = 'overview'; }
  },
  'disc-add'(d) { if (d.p === 'qdd') syncQuoteNew(); else if (d.p === 'rnd') rnSync(); else wizSync(); const list = discList(d.p), months = d.p === 'qdd' ? S.drawer.q.months : d.p === 'rnd' ? S.drawer.r.months : S.wiz.months; list.push({ key: ++discSeq, label: '', type: 'amount', value: '', scope: 'all', when: 'range', from: Math.min(2, months), to: months }); },
  'disc-del'(d) { if (d.p === 'qdd') syncQuoteNew(); else if (d.p === 'rnd') rnSync(); else wizSync(); const list = discList(d.p), i = list.findIndex(x => x.key === +d.k); if (i >= 0) list.splice(i, 1); },
  'rn-open'(d) { const c = S.clients.find(x => x.id === (d.cid || S.cid)); S.drawer = { kind: 'renewal', cid: c.id, r: rnStart(c) }; },
  async 'rn-save'(d) { rnSync(); const dr = S.drawer, r = dr.r, lines = r.lines.filter(l => l.on).map(l => ({ id: l.s.id, price: +l.price || 0 })); if (!lines.length) { toast('Tick at least one service to continue with.'); return; }
    const res = await api('rn-save', { r: { id: r.id, no: r.no, months: r.months, lines, discounts: r.discounts, welcome: r.welcome }, then: d.then }, { cid: dr.cid, msg: d.then === 'sent' ? 'Renewal proposal sent to the client\'s portal.' : d.then === 'extend' ? 'Contract extended. The new months, invoices and tasks are added.' : 'Renewal saved as a draft.' });
    if (res) { S.drawer = null; S.modal = null; } },
  'rn-extend-open'() { rnSync(); S.modal = { kind: 'rnextend' }; },
  'rn-extend-go'() { return ACT['rn-save']({ then: 'extend' }); },
  async 'rn-del'(d) { const res = await api('rn-delete', { id: d.id }, { cid: S.drawer.cid, msg: 'Renewal deleted.' }); if (res) S.drawer = null; },
  'rn-doc'(d) { const c = S.clients.find(x => x.id === (d.cid || S.cid)) || client(), r = L.renewals(c).find(x => x.id === d.rid); S.modal = { kind: 'doc', type: 'quote', m: 1, temp: L.pseudo(c, r) }; },
  'file-del-open'(d) { S.modal = { kind: 'filedel', k: d.k, cid: d.cid }; },
  async 'file-del-go'() { const M = S.modal, r = await api('f-del', { key: M.k }, { cid: M.cid, msg: 'File deleted.' }); if (r) S.modal = null; },
  'mail-test'() { return api('mail-test', {}, { msg: 'Test email sent to ' + D.me.email + '.' }); },
  'invite-send'(d) { return api('invite-send', {}, { cid: d.cid, msg: 'Portal invite emailed.' }); },
  'ml-more'() { S.mlN = (S.mlN || 8) + 8; },
  'mail-view'(d) { S.modal = { kind: 'mailview', id: d.id }; },
  async 'backup-now'() { const r = await fetch('/api/backup-now', { method: 'POST' }).then(x => x.json()).catch(() => ({ error: 'The backup did not run.' })); if (r.error) toast(r.error); else { toast(r.last && r.last.ok ? 'Backup saved to Google Drive.' : 'The backup failed: ' + ((r.last && r.last.err) || '')); await load(); } return 'skip'; },
  'cat-mode'(d) { S.catMode = d.m; },
  'tpl-open'(d) { S.modal = { kind: 'tpl', id: d.id || '' }; },
  'tpl-save-open'(d) { const el = document.getElementById(d.ta), txt = el ? el.value.trim() : ''; if (!txt) { toast('Write the steps first, then save them as a template.'); return 'skip'; } if (S.drawer && S.drawer.kind === 'newtask') syncNewTask(); if (S.drawer && S.drawer.kind === 'svc') syncSvc(); S.modal = { kind: 'tpl', id: '', name: '', steps: txt }; },
  async 'tpl-save'(d) { const r = await api('tpl-save', { id: d.id, name: val('tp-name'), steps: document.getElementById('tp-steps').value }, { msg: 'Template saved. Everyone on the team can use it.' }); if (r) S.modal = null; },
  'tpl-manage'() { S.drawer = null; S.modal = null; S.view = 'templates'; },
  'tpl-del-open'(d) { S.modal = { kind: 'tpldel', id: d.id }; },
  async 'tpl-delete'() { const r = await api('tpl-delete', { id: S.modal.id }, { msg: 'Template deleted. Tasks that used it keep their steps.' }); if (r) S.modal = null; },
  'numbers-save'() { return api('numbers-save', { nextQuote: val('n-next'), invFormat: val('n-fmt') }, { msg: 'Numbering saved.' }); },
  'quote-open'(d) { openQuote(d.id, d.aid); },
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
  'ptpl-open'(d) { const t = S.prepTemplates.find(z => z.id === d.id); S.modal = { kind: 'ptpl', id: d.id || '', name: t ? t.name : '', rows: t ? t.tasks.map(k => Object.assign({}, k)) : [{ title: '', owner: 'gioia', steps: '' }, { title: '', owner: 'client', steps: '' }] }; },
  'ptpl-row-add'() { ptplSync(); S.modal.rows.push({ title: '', owner: 'gioia', steps: '' }); },
  'ptpl-row-del'(d) { ptplSync(); S.modal.rows.splice(+d.i, 1); },
  async 'ptpl-save'() { ptplSync(); const M = S.modal; const r = await api('ptpl-save', { id: M.id, name: M.name, tasks: M.rows }, { msg: 'Template saved.' }); if (r) S.modal = null; },
  async 'ptpl-del'(d) { const t = S.prepTemplates.find(z => z.id === d.id); if (!t || !confirm('Delete the "' + t.name + '" preparation template? Projects that already use it keep their tasks.')) return 'skip'; return api('ptpl-delete', { id: d.id }, { msg: 'Template deleted.' }); },
  'ptapply-open'(d) { S.modal = { kind: 'ptapply', cid: d.cid, tid: (S.prepTemplates[0] || {}).id }; },
  async 'ptapply-go'() { const M = S.modal, st = document.getElementById('pa-start'); const r = await api('ptpl-apply', { id: M.tid, start: !!(st && st.checked) }, { cid: M.cid, msg: 'Preparation tasks added.' }); if (r) S.modal = null; },
  'ptsave-open'(d) { S.modal = { kind: 'ptsave', cid: d.cid }; },
  async 'ptsave-go'() { const r = await api('ptpl-from-project', { name: val('ps-name') }, { cid: S.modal.cid, msg: 'Saved as a preparation template.' }); if (r) S.modal = null; },
  async 'team-welcome'(d) { const m = member(d.id); if (await api('team-welcome', { id: d.id }, { msg: 'Welcome email sent to ' + m.email + '.' })) S.modal = null; },
  'tm-details'(d) { S.modal = { kind: 'tmd', id: d.id }; },
  async 'tmd-save'() { const r = await api('team-update', { id: S.modal.id, company: val('md-company'), what: val('md-what'), phone: val('md-phone'), pay: val('md-pay') }, { msg: 'Details saved.' }); if (r) S.modal = null; },
  'team-add'() { const name = val('tm-name'), email = val('tm-email'); return api('team-add', { name, email, role: val('tm-role'), company: val('tm-company') }, { msg: name + ' added.' + (email ? ' A welcome email with the sign-in link is on its way to ' + email + '.' : '') }); },
  'team-del'(d) { return api('team-del', { id: d.id }, { msg: 'Team member removed.' }); },
  async 'brand-save'() {
    const B = S.brand, g = id => document.getElementById(id) ? val(id) : undefined, pay = {}; PAYF.forEach(([k]) => { const v = g('pay-' + k); pay[k] = v === undefined ? (B.pay || {})[k] || '' : v; });
    const brand = { mark: g('b-mark') ?? B.mark, tagline: g('b-tagline') ?? B.tagline, company: g('b-company') ?? B.company, address: g('b-address') ?? B.address, terms: g('b-terms') ?? B.terms, welcome: g('b-welcome') ?? B.welcome, pay };
    if (S.payQr !== undefined) brand.qr = S.payQr;
    const r = await api('brand-save', { brand }, { msg: 'Settings saved.' }); if (r) S.payQr = undefined;
  },
  'payqr-del'() { S.payQr = ''; toast('QR code removed. Click Save payment details to keep this.'); },
  'fee-new'(d) { if (S.modal && S.modal.kind === 'vc') S.modal = null; const c = S.clients.find(x => x.id === (d.cid || S.cid)) || S.clients[0]; if (!c) { toast('Add a client first.'); return; } S.drawer = { kind: 'fee', draft: { isNew: true, id: '', kind: d.kind || 'month', member: d.member || '', cid: c.id, svc: d.svc || '', m: +d.m || 1, taskId: d.task || '', stage: d.stage !== undefined ? d.stage : '', rule: 'prorata', amount: '', note: '', repeat: false, type: 'fixed', pct: '', item: '', paid: 0 } }; },
  'fee-edit'(d) { if (S.modal && S.modal.kind === 'vc') S.modal = null; const f = S.fees.find(x => x.id === d.id); S.drawer = { kind: 'fee', draft: Object.assign({ type: f.pct ? 'pct' : 'fixed' }, clone(f), { stage: f.stage === null || f.stage === undefined ? '' : f.stage }) }; },
  'fee-type'(d) { syncFee(); S.drawer.draft.type = d.t; },
  'fee-kind'(d) { syncFee(); S.drawer.draft.kind = d.k; },
  'fee-rule'(d) { syncFee(); S.drawer.draft.rule = d.r; },
  'fee-view'(d) { // open the work the fee is for: the task, the deliverable's month, or the project
    const f = S.fees.find(x => x.id === d.id), c = f && S.clients.find(x => x.id === f.cid);
    if (!c) { toast('That project is no longer available to you.'); return 'skip'; }
    if (f.kind === 'task' && c.tasks.some(t => t.id === f.taskId)) return ACT.task({ id: f.taskId, cid: c.id });
    if ((f.kind === 'month' || !f.kind) && f.svc) return ACT['open-ws']({ cid: c.id, id: f.svc, m: f.m || 1 });
    pickClient({ cid: c.id }); S.view = 'client'; S.ctab = 'overview';
  },
  async 'fee-save'() {
    syncFee(); const d = S.drawer.draft;
    const r = await api('fee-save', { fee: { id: d.isNew ? '' : d.id, kind: d.kind, member: d.member, cid: d.cid, svc: d.svc, m: d.m, taskId: d.taskId, stage: d.stage, rule: d.rule, item: d.item, type: d.type, pct: d.pct, amount: d.amount, note: d.note, repeat: d.repeat } }, { msg: d.isNew ? 'Fee assigned. Only they and the admins can see it.' : 'Fee updated.' });
    if (r) S.drawer = null;
  },
  'payout-open'(d) { S.modal = { kind: 'payout', member: d.member }; },
  async 'payout-save'() {
    const p = { member: S.modal.member, date: val('po-date'), note: val('po-note'), invoiceNo: val('po-inv'), invoiceDate: val('po-invdate') }, fi = document.getElementById('po-file'), f = fi && fi.files[0];
    if (f) { try { const r = await fetch('/api/vendor-upload?member=' + encodeURIComponent(p.member) + '&name=' + encodeURIComponent(f.name), { method: 'POST', headers: { 'Content-Type': f.type || 'application/octet-stream' }, body: f }), j = await r.json(); if (!r.ok) throw new Error(j.error || 'The upload did not go through.'); p.fileId = j.fileId; p.fileName = f.name; } catch (e) { toast(e.message); return; } }
    const r = await api('payout-create', p, { msg: 'Payment recorded.' }); if (r) S.modal = null;
  },
  'tour-next'() { const n = tourSteps().length; if (S.tour.i < n - 1) { S.tour.i++; drawTour(); return 'skip'; } return ACT['tour-skip'](); },
  'tour-back'() { S.tour.i = Math.max(0, S.tour.i - 1); drawTour(); return 'skip'; },
  'tour-skip'() { const k = S.tour && S.tour.kind; S.tour = null; if (k && !(D.tours || {})[k]) { D.tours = Object.assign({}, D.tours, { [k]: true }); api('tour-done', { kind: k }, { quiet: true }); } drawTour(); return 'skip'; },
  'tour-start'() { S.menu = null; S.tour = { kind: tourKind(), i: 0 }; },
  'tour-pay'() { S.tour = { kind: 'payouts', i: 0 }; },
  'tour-pay-go'() { S.view = 'earnings'; render(); S.tour = { kind: 'payouts', i: 0 }; },
  'remcfg-open'() { S.modal = { kind: 'remcfg' }; },
  'remcfg-save'() { const v = id => (document.getElementById(id) || {}).value, ck = id => !!(document.getElementById(id) || {}).checked;
    return api('rem-cfg', { cfg: { hour: v('rc-hour'), team: ck('rc-team'), teamBefore: v('rc-tb'), overdueEvery: v('rc-oe'), client: ck('rc-client'), clientAfter: v('rc-ca'), clientEvery: v('rc-ce'), invBefore: v('rc-ib'), invOnDue: v('rc-id') === '1', admin: ck('rc-admin'), weekday: v('rc-wd') } }, { cid: '' }).then(r => { if (r) { S.modal = null; render(); } }); },
  'nudge-open'(d) { S.modal = { kind: 'nudge', id: d.id }; },
  'nudge-send'() { const id = S.modal.id; return api('t-nudge', { id, note: val('nd-note') }, { cid: S.cid, msg: 'Reminder sent.' }).then(r => { if (r) { S.modal = null; render(); } }); },
  'tpost-open'(d) { S.modal = { kind: 'tpost', id: d.id }; },
  'tpost-go'() { const id = S.modal.id, to = +val('tp-to'); return api('t-month', { id, to }, { cid: S.cid }).then(r => { if (r) { S.modal = null; render(); } }); },
  'logo-open'(d) { S.modal = { kind: 'logo', cid: d.cid }; },
  'logo-remove'() { return api('logo-set', { remove: true }, { cid: S.modal.cid }).then(r => { if (r) { S.modal = null; render(); } }); },
  'pic-for'(d) { S.modal = { kind: 'photo', for: { email: d.e, member: d.mid || '', name: d.n, pic: d.p || '' } }; },
  'pic-for-set'(d) { const f = S.modal.for; return api('pic-set', { email: f.email, member: f.member, name: f.name, mode: d.m }, { cid: '' }).then(r => { if (r) { S.modal = null; render(); } }); },
  'photo-open'() { S.menu = null; S.modal = { kind: 'photo' }; },
  'photo-set'(d) { return api('me-pic', { mode: d.m }, { cid: '' }); },
  'help-open'() { S.menu = null; if (S.role === 'client') S.ptab = 'help'; else S.view = 'help'; },
  async 'rfee-go'(d) { const run = S.modal.run; S.modal = null; await run(d.f); },
  'td-open'(d) { S.modal = { kind: 'tdel', cid: S.cid, id: d.id }; },
  async 'td-go'() { const r = await api('t-delete', { id: S.modal.id }, { cid: S.modal.cid, msg: 'Task deleted.' }); if (r) { S.modal = null; ACT['task-back'](); } },
  'tr-open'(d) { S.renaming = d.id; setTimeout(() => { const el = document.getElementById('tr-title'); if (el) { el.focus(); el.select(); } }, 30); },
  'tr-cancel'() { S.renaming = null; },
  async 'tr-save'(d) { const r = await api('t-rename', { id: d.id, title: val('tr-title') }, { msg: 'Task renamed.' }); if (r) S.renaming = null; },
  'pay-open'(d) { S.modal = { kind: 'pay', cid: d.cid, pa: d.pa, m: d.m, id: d.id }; },
  async 'pay-go'() { const M = S.modal, p = { amount: val('py-amt'), ref: val('py-ref'), date: val('py-date'), mode: val('py-mode'), mode2: document.getElementById('py-mode2') ? val('py-mode2') : '', note: val('py-note') }; if (M.id) p.id = M.id; else p.m = +M.m; const r = await api(M.pa, p, { cid: M.cid }); if (r) S.modal = null; },
  'depuse-open'(d) { S.modal = { kind: 'depuse', cid: d.cid }; },
  'depuse-go'() { const v = val('du-inv'), M = S.modal; S.modal = { kind: 'pay', cid: M.cid, pa: v[0] === 'a' ? 'ah-paid' : 'i-paid', m: v[0] === 'm' ? v.slice(2) : '', id: v[0] === 'a' ? v.slice(2) : '', mode: 'deposit', dep: true }; },
  'deprefund-open'(d) { S.modal = { kind: 'deprefund', cid: d.cid }; },
  async 'deprefund-go'() { const r = await api('dep-refund', { amount: val('dr-amt'), date: val('dr-date'), mode: val('dr-mode'), ref: val('dr-ref'), note: val('dr-note') }, { cid: S.modal.cid }); if (r) S.modal = null; },
  'dep-undo'(d) { return api('dep-undo', { id: d.id }, { cid: d.cid }); },
  'bank-open'() { S.modal = { kind: 'bank', back: S.modal && S.modal.kind === 'billnew' ? billDraft() : null }; },
  'bank-save'() { const v = k => val('bk-' + k), back = S.modal.back; return api('me-bank', { bank: { name: v('name'), company: v('company'), address: v('address'), bankName: v('bankName'), accName: v('accName'), accNo: v('accNo'), paynowName: v('paynowName'), paynow: v('paynow') } }, { cid: '' }).then(r => { if (r) { S.modal = back; render(); } }); },
  'bill-new'() { BILLFILE = null; S.modal = { kind: 'billnew' }; },
  'bill-own'(d) { S.modal = Object.assign(billDraft(), { own: !!d.v }); },
  'bill-preview'() { const M = billDraft(), me = member(S.me) || {}, bk = S.myBank || {}, list = S.fees.filter(f => M.ids.includes(f.id) && billLeft(f) > 0), lines = list.map(f => { const w = feeWhere(f); return { feeId: f.id, amount: billLeft(f), label: cname(w.c) + ' · ' + w.label }; });
    S.modal = { kind: 'doc', type: 'bill', back: M, bill: { no: M.no, date: M.date, period: M.period, note: M.note, lines, total: lines.reduce((a, l) => a + l.amount, 0), from: { name: bk.name || me.name, company: bk.company, address: bk.address, email: '' }, bank: bk } }; },
  'bill-back'() { S.modal = S.modal.back; },
  async 'bill-submit'() {
    const M = billDraft(), p = { feeIds: M.ids, no: M.no, date: M.date, period: M.period, note: M.note };
    if (M.own) { const f = BILLFILE; if (!f) { toast('Choose your invoice file.'); return; } try { const r = await fetch('/api/vendor-upload?member=' + encodeURIComponent(S.me) + '&name=' + encodeURIComponent(f.name), { method: 'POST', headers: { 'Content-Type': f.type || 'application/octet-stream' }, body: f }), j = await r.json(); if (!r.ok) throw new Error(j.error || 'The upload did not go through.'); p.fileId = j.fileId; p.fileName = f.name; } catch (e) { toast(e.message); return; } }
    const r = await api('bill-submit', p, { cid: '' }); if (r) { BILLFILE = null; S.modal = null; render(); }
  },
  'bill-view'(d) { const b = S.bills.find(z => z.id === d.id); if (b && b.file) { const a = document.createElement('a'); a.href = '/api/bill-file/' + b.id; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); return 'skip'; } if (b) S.modal = { kind: 'doc', type: 'bill', bill: b }; },
  'bill-withdraw'(d) { return api('bill-withdraw', { id: d.id }, { cid: '' }); },
  'bill-approve'(d) { return api('bill-approve', { id: d.id }, { cid: '' }); },
  'bill-query-open'(d) { S.modal = { kind: 'billquery', id: d.id }; },
  'bill-query'() { return api('bill-query', { id: S.modal.id, note: val('bq-note') }, { cid: '' }).then(r => { if (r) { S.modal = null; render(); } }); },
  'bill-pay-open'(d) { S.modal = { kind: 'billpay', id: d.id }; },
  'bill-pay'() { return api('bill-pay', { id: S.modal.id, date: val('bp-date'), note: val('bp-note') }, { cid: '' }).then(r => { if (r) { S.modal = null; render(); } }); },
  'bill-filter'(d) { S.billF = d.f; },
  'q-signed'(d) { return api('q-signed', { name: val('qs-name'), date: val('qs-date') }, { cid: d.cid }).then(r => { if (r) { S.editSigned = false; render(); } }); },
  'q-signed-clear'(d) { return api('q-signed', { clear: true }, { cid: d.cid }).then(() => { S.editSigned = false; render(); }); },
  'q-signed-edit'() { S.editSigned = !S.editSigned; render(); },
  'acc-export'() { S.modal = { kind: 'export', from: TODAY.slice(0, 8) + '01', to: TODAY }; render(); },
  'acc-export-go'() { const from = val('ex-from'), to = val('ex-to'); if (!from || !to || from > to) return toast('Choose a start date before the end date.'); downloadCsv('Gioia accounts ' + from + ' to ' + to + '.csv', accountsCsv(from, to)); S.modal = null; render(); },
  'payout-del'(d) { return api('payout-del', { id: d.id }, { msg: 'Payment removed. Those fees are owing again.' }); },
  async 'fee-del'(d) { const r = await api('fee-del', { id: d.id }, { msg: 'Fee deleted.' }); if (r) S.drawer = null; }
};
document.addEventListener('click', async e => {
  if (!D || !D.me) return;
  if (e.target.closest('.inl')) return;
  const el = e.target.closest('[data-a]');
  if (!el) { if (S.menu && !e.target.closest('.menu')) { S.menu = null; render(); } return; }
  const a = el.dataset.a;
  if (a === 'close-bg' || a === 'close-bg-modal') { if (e.target === el) { if (a === 'close-bg') S.drawer = null; else S.modal = null; render(); } return; }
  if (el.disabled || !ACT[a]) return;
  if (a !== 'menu' && (!el.closest('.menu') || el.closest('.imenu'))) S.menu = null;
  const out = ACT[a](el.dataset);
  if (out === 'skip') return;
  render();
  if (out && out.then) { el.disabled = true; const v = await out; if (v !== 'skip') render(); }
});
const grow = el => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 2 + 'px'; };
new MutationObserver(() => document.querySelectorAll('textarea.grow').forEach(grow)).observe(document.getElementById('app'), { childList: true });
document.addEventListener('input', e => { if (e.target.matches && e.target.matches('textarea.grow')) grow(e.target); });
/* Help search: filter the answers in place, without redrawing the page */
document.addEventListener('input', e => {
  if (e.target.id !== 'help-q') return;
  const q = e.target.value.trim().toLowerCase(); let any = false;
  document.querySelectorAll('.helpsec').forEach(sec => { let n = 0; sec.querySelectorAll('details.faq').forEach(d => { const hit = !q || d.textContent.toLowerCase().includes(q); d.hidden = !hit; d.open = !!q && hit; if (hit) n++; }); sec.hidden = !n; if (n) any = true; });
  const none = document.getElementById('help-none'); if (none) none.hidden = any;
});
document.addEventListener('input', e => { if (e.target.id === 'gsearch') { S.q = e.target.value; renderSearch(); } else if (e.target.dataset.mtq) { S.mtq = e.target.value; render(); } else if (e.target.dataset.mlq) { S.mlQ = e.target.value; S.mlN = 8; render(); } else if (e.target.dataset.acq) { S.acq = e.target.value; render(); } else if (e.target.dataset.iq) { S.iq = e.target.value; render(); const el = document.querySelector('[data-iq]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } } else if (e.target.dataset.afq) { S.afq = e.target.value; render(); } });
async function uploadFiles(key, files) {
  const svcId = key === 'ws' ? S.ws : '', cid = S.cid; let last = null;
  for (const f of files) {
    if (f.size > 25 * 1024 * 1024) { toast('"' + f.name + '" is over 25 MB. Share it as a Google link instead.'); continue; }
    toast('Uploading "' + f.name + '"…');
    try {
      const r = await fetch('/api/upload?cid=' + encodeURIComponent(cid) + '&key=' + encodeURIComponent(key) + '&svc=' + encodeURIComponent(svcId || '') + '&name=' + encodeURIComponent(f.name), { method: 'POST', headers: { 'Content-Type': f.type || 'application/octet-stream' }, body: f });
      const j = await r.json(); if (j.error) { toast(j.error); continue; } last = j;
    } catch (err) { toast('The upload did not go through. Check your connection and try again.'); }
  }
  if (last) { adopt(last.state); render(); toast(files.length === 1 ? 'Uploaded to Google Drive.' : 'Files uploaded to Google Drive.'); }
}
document.addEventListener('change', async e => {
  if (e.target.dataset && e.target.dataset.remtoggle) { await api('rem-toggle', { on: e.target.checked }, { cid: '' }); render(); return; }
  if (e.target.dataset && e.target.dataset.logofile) { const f = e.target.files[0], cid = S.modal && S.modal.cid; if (f && cid) { try { const data = await shrinkLogo(f); const r = await api('logo-set', { data }, { cid }); if (r) S.modal = null; } catch (er) { toast('That logo could not be used. Try a PNG or JPG.'); } } render(); return; }
  if (e.target.dataset && e.target.dataset.picfor) { const f = e.target.files[0], who = S.modal && S.modal.for; if (f && who) { try { const data = await shrinkPhoto(f); const r = await api('pic-set', { email: who.email, member: who.member, name: who.name, mode: 'custom', data }, { cid: '' }); if (r) S.modal = null; } catch (er) { toast('That photo could not be used. Try a JPG or PNG.'); } } render(); return; }
  if (e.target.dataset && e.target.dataset.picfile) { const f = e.target.files[0]; if (f) { try { const data = await shrinkPhoto(f); await api('me-pic', { mode: 'custom', data }, { cid: '' }); } catch (er) { toast('That photo could not be used. Try a JPG or PNG.'); } } render(); return; }
  if (e.target.dataset && e.target.dataset.billfee) { S.modal = billDraft(); render(); return; }
  if (e.target.dataset && e.target.dataset.billfile) { BILLFILE = e.target.files[0] || BILLFILE; S.modal = billDraft(); render(); return; }
  const d = e.target.dataset; if (!D || !D.me) return;
  if (d.depnote) { await api('dep-note', { notes: e.target.value }, { cid: d.depnote, msg: 'Notes saved.' }); render(); return; }
  if (d.up) { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) await uploadFiles(d.up, fs); return; }
  if (d.payqr) { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, 600 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0, cv.width, cv.height); let u = cv.toDataURL('image/png'); if (u.length > 190000) u = cv.toDataURL('image/jpeg', 0.9); S.payQr = u; render(); toast('Click Save payment details to keep the new QR code.'); }; img.src = r.result; }; r.readAsDataURL(f); return; }
  if (d.dep) { if (d.dep === 'qdp') syncQuoteNew(); else wizSync(); depSync(d.dep); render(); return; }
  if (d.pymode) { S.modal.mode = e.target.value; S.modal.date = val('py-date'); S.modal.amt = val('py-amt'); render(); return; }
  if (d.pat) { S.modal.tid = e.target.value; render(); return; }
  if (d.lass !== undefined) { await changeAssignee(d.lass, e.target.value); render(); return; }
  if (d.ldue !== undefined) { await api('t-due', { id: d.ldue, due: e.target.value }, { msg: e.target.value ? 'Due date set.' : 'Due date cleared.' }); render(); return; }
  if (d.lst !== undefined) { await api('t-status', { id: d.lst, status: e.target.value }, { msg: 'Status updated.' }); render(); return; }
  if (d.mlst !== undefined) { S.mlSt = e.target.value; S.mlN = 8; render(); return; }
  if (e.target.id === 'nt-owner') { const as = document.getElementById('nt-as'); if (as) { as.innerHTML = '<option value="">' + (e.target.value === 'client' ? '—' : 'Unassigned') + '</option>' + (e.target.value === 'client' ? '' : teamOpts(as.value, false, e.target.value === 'vendor' ? 'vendor' : 'team')); as.disabled = e.target.value === 'client'; } return; }
  if (d.epref) { await api('email-pref', { on: e.target.checked }, { msg: e.target.checked ? 'Emails are on.' : 'Emails are off. You will still see everything in the app.' }); return; }
  if (d.ts) await api('t-status', { id: d.ts, status: e.target.value });
  else if (d.as) await changeAssignee(d.as, e.target.value);
  else if (d.due) await api('t-due', { id: d.due, due: e.target.value });
  else if (d.desc) await api('t-desc', { id: d.desc, desc: e.target.value }, { msg: 'Description saved. The client sees it on the task.' });
  else if (d.te) await api('team-update', { id: d.te, email: e.target.value }, { msg: 'Email saved.' });
  else if (d.tn) await api('team-update', { id: d.tn, name: e.target.value }, { msg: 'Name saved.' });
  else if (d.trole) { const r = await api('team-update', { id: d.trole, role: e.target.value }, { msg: 'Role updated.' }); if (!r) render(); }
  else if (d.tv) { const [id, k] = d.tv.split('|'); await api('team-update', { id, [k]: e.target.value }, { msg: 'Saved.' }); }
  else if (d.nt) { syncNewTask(); S.drawer[d.nt] = e.target.value; if (d.nt === 'cid') { S.drawer.svc = ''; S.drawer.m = 1; } }
  else if (d.stage) await api('t-stage-set', { id: d.stage, stage: +e.target.value });
  else if (d.tpl !== undefined && d.tpl) { const t = S.templates.find(x => x.id === e.target.value), ta = document.getElementById(d.tpl); if (t && ta) { ta.value = t.steps; if (d.tpl === 'nt-steps' && S.drawer) S.drawer.steps = t.steps; toast('Steps from "' + t.name + '" filled in. Adjust them, then save.'); } e.target.value = ''; return; }
  else if (d.dr) { if (d.dr === 'qdd') syncQuoteNew(); else if (d.dr === 'rnd') rnSync(); else wizSync(); }
  else if (d.rnr) { rnSync(); }
  else if (d.rnadd) { rnSync(); const s = svc(e.target.value); if (s) S.drawer.r.lines.push({ s: clone(s), on: true, price: s.price }); }
  else if (d.wzaid) { wizSync(); S.wiz.aid = e.target.value; }
  else if (e.target.dataset.wzr) { wizSync(); }
  else if (d.sas) { const [id, i] = d.sas.split('|'), t = (client() || { tasks: [] }).tasks.find(z => z.id === id) || {}, prev = ((t.stages || [])[+i] || {}).assignee || ''; await withFee(t, +i, prev, e.target.value, fee => api('t-stage-assign', { id, i: +i, assignee: e.target.value, fee }, { msg: 'Step reassigned.' })); }
  else if (d.sdue) { const [id, i] = d.sdue.split('|'); await api('t-stage-due', { id, i: +i, due: e.target.value }); }
  else if (d.tval) await api('t-value', { id: d.tval, value: e.target.value }, { msg: e.target.value === '' ? 'Value split evenly again.' : 'Task value saved.' });
  else if (d.mtclient) { S.mtClient = e.target.value; }
  else if (d.mtwho) { S.mtWho = e.target.value; }
  else if (d.fe) { const x = S.drawer.draft; syncFee(); if (d.fe === 'repeat') x.repeat = e.target.checked; else if (!['amount', 'pct'].includes(d.fe)) x[d.fe] = e.target.value; if (d.fe === 'cid') { x.svc = ''; x.m = 1; x.taskId = ''; x.stage = ''; } if (d.fe === 'svc') x.m = 1; if (d.fe === 'taskId') x.stage = ''; if (d.fe === 'amount') return; }
  else if (d.acs !== undefined && e.target.dataset.acs) { S.acs = e.target.value; }
  else if (e.target.dataset.apsel) { const p = aPer(); if (p.mode === 'y') p.y = e.target.value; else p.m = e.target.value; }
  else if (e.target.dataset.ppa) { const x = S.clients.find(c => c.aid === e.target.value); if (x) S.cid = x.id; }
  else if (e.target.dataset.ist !== undefined && e.target.dataset.ist) { S.ist = e.target.value; }
  else if (e.target.dataset.afc) { S.afc = e.target.value; }
  else if (e.target.dataset.acctproj) { S.cid = e.target.value; S.expSel = ''; }
  else if (e.target.dataset.apmode) { S.apper = { cid: S.cid, mode: e.target.value, k: '' }; }
  else if (e.target.dataset.apk) { S.apper = { cid: S.cid, mode: 'month', k: e.target.value }; }
  else if (e.target.dataset.plp) { const p = S.pl = S.pl || {}, k = e.target.dataset.plp; (p[k] = p[k] || {}).p = e.target.value; }
  else if (e.target.dataset.afs) { S.afs = e.target.value; }
  else if (d.pws) { S.pws = e.target.value; S.ptg = ''; S.pwm = 0; }
  else if (d.qclient) { syncQuoteNew(); const keep = S.drawer; openQuote('new', e.target.value); Object.assign(S.drawer, { q: keep.q, name: keep.name, no: keep.no, welcome: keep.welcome }); }
  else if (d.qproj) { syncQuoteNew(); const keep = S.drawer; if (e.target.value === 'new') { openQuote('new', keep.aid); Object.assign(S.drawer, { q: keep.q, name: '', no: String(S.nextQuote) }); } else openQuote(e.target.value); }
  else if (d.pswitch) { S.cid = e.target.value; if (S.role === 'client') { S.ptab = 'overview'; S.pws = ''; } else if (['ws', 'task'].includes(S.view)) S.view = 'client'; }
  else if (d.qsvc) { syncQuoteNew(); const q = S.drawer.q; q.ids = e.target.checked ? [...q.ids, d.qsvc] : q.ids.filter(x => x !== d.qsvc); }
  else if (d.qf) { syncQuoteNew(); const q = S.drawer.q, k = d.qf; setTimeout(() => { if (S.drawer && S.drawer.q) S.drawer.q.committed = S.drawer.q.months; }); if (k === 'start') { if (e.target.value) q.start = e.target.value; } else { q[k] = Math.max(k === 'discount' ? 0 : 1, Math.floor(+e.target.value || 0)); if (k !== 'discount') q[k] = Math.min(q[k], 24); } if (q.committed > q.months) q.committed = q.months; }
  else return;
  render();
});
/* drag a card between columns (team only) */
/* list view: drag a row up or down to change the order */
document.addEventListener('dragstart', e => { const r = e.target.closest && e.target.closest('[data-ldrag]'); if (!r || e.target.closest('.inl')) return; S.ldrag = r.dataset.ldrag; r.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', S.ldrag); } catch (x) {} });
document.addEventListener('dragover', e => { if (!S.ldrag) return; const r = e.target.closest('[data-ldrag]'); if (!r) return; e.preventDefault(); const b = r.getBoundingClientRect(), after = e.clientY > b.top + b.height / 2; document.querySelectorAll('.listrow.dropb,.listrow.dropa').forEach(x => x.classList.remove('dropb', 'dropa')); if (r.dataset.ldrag !== S.ldrag) r.classList.add(after ? 'dropa' : 'dropb'); });
document.addEventListener('drop', async e => { if (!S.ldrag) return; const r = e.target.closest('[data-ldrag]'); e.preventDefault(); const from = S.ldrag; S.ldrag = null; document.querySelectorAll('.listrow.dropb,.listrow.dropa,.listrow.dragging').forEach(x => x.classList.remove('dropb', 'dropa', 'dragging'));
  if (!r || r.dataset.ldrag === from) return; const ids = [...r.parentNode.querySelectorAll('[data-ldrag]')].map(x => x.dataset.ldrag).filter(id => id !== from), b = r.getBoundingClientRect(), at = ids.indexOf(r.dataset.ldrag) + (e.clientY > b.top + b.height / 2 ? 1 : 0);
  ids.splice(at, 0, from); await api('t-reorder', { ids }, { msg: 'Order saved.' }); render(); });
document.addEventListener('dragend', () => { if (!S.ldrag) return; S.ldrag = null; document.querySelectorAll('.listrow.dropb,.listrow.dropa,.listrow.dragging').forEach(x => x.classList.remove('dropb', 'dropa', 'dragging')); });
document.addEventListener('dragstart', e => { const el = e.target.closest('[data-drag]'); if (!el) return; S.drag = el.dataset.drag; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', S.drag); } catch (x) {} });
document.addEventListener('dragover', e => { const col = e.target.closest('[data-col]'); if (!col || !S.drag) return; e.preventDefault(); document.querySelectorAll('.col.over').forEach(x => x !== col && x.classList.remove('over')); col.classList.add('over'); });
document.addEventListener('dragleave', e => { const col = e.target.closest('[data-col]'); if (col && !col.contains(e.relatedTarget)) col.classList.remove('over'); });
document.addEventListener('drop', async e => {
  const col = e.target.closest('[data-col]'); if (!col || !S.drag) return; e.preventDefault();
  const t = task(S.drag), to = col.dataset.col; S.drag = null;
  if (!t || COLS.find(x => x[0] === to)[2].includes(t.status)) return render();
  if (staged(t)) { toast('This task follows its steps. Open it to complete or change the current step.'); return render(); }
  const target = to === 'client' ? (t.owner === 'client' ? 'cdraft' : 'creview') : to;
  if (!statusOpts(t).includes(target)) { toast(t.owner === 'client' ? 'Items the client sends go from Pending action to Completed once received.' : 'That status does not apply: this task does not need client approval.'); return render(); }
  await api('t-status', { id: t.id, status: target }); render();
});
document.addEventListener('dragend', () => { S.drag = null; document.querySelectorAll('.col.over').forEach(x => x.classList.remove('over')); });
/* live updates: fetch the latest data every 20 seconds and when the tab comes back into view.
   Changes are shown straight away unless you are typing or have a panel open; then they wait until you finish. */
const SYNC = { sig: '', version: '', pending: null, busy: false, newVersion: false };
function sig(st) { const c = Object.assign({}, st); delete c.version; return JSON.stringify(c); }
function userBusy() {
  const a = document.activeElement, typing = a && a.closest && a.closest('#app') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !['checkbox', 'radio', 'file', 'search'].includes(a.type);
  const unsaved = [...document.querySelectorAll('#app textarea, #app input')].some(el => !['file', 'checkbox', 'radio', 'search'].includes(el.type) && el.value !== el.defaultValue);
  return !!(S.drawer || S.modal || S.menu || S.drag || SYNC.busy || typing || unsaved);
}
function applyPending() {
  if (!SYNC.pending || userBusy()) return;
  const st = SYNC.pending, m = document.querySelector('.main'), top = m ? m.scrollTop : 0, wy = window.scrollY;
  SYNC.pending = null; adopt(st); render();
  const m2 = document.querySelector('.main'); if (m2) m2.scrollTop = top; window.scrollTo(0, wy);
}
async function syncNow() {
  if (!D || !D.me || document.hidden || SYNC.busy) return;
  try {
    const r = await fetch('/api/state', { credentials: 'same-origin' }); if (!r.ok) return; const st = await r.json(); if (st.error) return;
    if (st.version && SYNC.version && st.version !== SYNC.version && !SYNC.newVersion) { SYNC.newVersion = true; showUpdateBar(); }
    const s2 = sig(st); if (s2 === SYNC.sig) return; SYNC.sig = s2; SYNC.pending = st; applyPending();
  } catch (e) { /* offline for a moment: try again next time */ }
}
function showUpdateBar() {
  if (document.getElementById('updbar')) return;
  const b = document.createElement('div'); b.id = 'updbar'; b.className = 'updbar'; b.setAttribute('role', 'status');
  b.innerHTML = '<span>A new version of the app is ready.</span><button type="button">Reload</button>';
  b.querySelector('button').addEventListener('click', () => location.reload()); document.body.appendChild(b);
}
setInterval(syncNow, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
window.addEventListener('focus', syncNow);
document.addEventListener('focusout', () => setTimeout(applyPending, 50));
document.addEventListener('click', () => setTimeout(applyPending, 50));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && D && D.me) { if (S.modal) S.modal = null; else if (S.drawer) S.drawer = null; else S.menu = null; render(); } });
load();
/* a photo that will not load (for example a Google address that has expired) falls back to initials */
document.addEventListener('error', e => { const img = e.target; if (img && img.tagName === 'IMG' && img.parentElement && img.parentElement.classList.contains('pic')) { const av = img.parentElement, nm = av.getAttribute('title') || (D && D.me && D.me.name) || '?'; av.classList.remove('pic'); av.textContent = initials(nm); } }, true);
/* @mention suggestions in the comment box: type @ and pick a person; the text keeps "@Full Name" */
(() => {
  let sel = 0, items = [], start = -1;
  const box = () => document.getElementById('mlist'), ta = () => document.querySelector('textarea[data-mention]');
  const hide = () => { const b = box(); if (b) b.hidden = true; items = []; start = -1; };
  const show = t => {
    const c = S.clients.find(x => x.id === t.dataset.mention), pos = t.selectionStart, before = t.value.slice(0, pos), m = before.match(/(^|\s)@([^\s@]{0,30})$/);
    if (!c || !m) return hide();
    const q = m[2].toLowerCase(), int = document.getElementById('cm-internal');
    items = mentionables(c, !!(int && int.checked)).filter(p => !q || p.name.toLowerCase().split(/\s+/).some(w => w.startsWith(q)) || p.name.toLowerCase().startsWith(q)).slice(0, 6);
    start = pos - m[2].length - 1; sel = Math.min(sel, Math.max(0, items.length - 1));
    const b = box(); if (!b) return; if (!items.length) return hide();
    b.innerHTML = items.map((p, i) => '<button type="button" class="mitem' + (i === sel ? ' on' : '') + '" data-mi="' + i + '">' + (p.key === 'client' ? '<span class="av">' + initials(p.name) + '</span>' : avatar(p.key.slice(2))) + '<span><b>' + esc(p.name) + '</b><span class="small muted"> · ' + esc(p.sub) + '</span></span></button>').join('');
    b.hidden = false;
  };
  const pick = i => { const t = ta(), p = items[i]; if (!t || !p || start < 0) return; const end = t.selectionStart, ins = '@' + p.name + ' '; t.value = t.value.slice(0, start) + ins + t.value.slice(end); const at = start + ins.length; t.focus(); t.setSelectionRange(at, at); hide(); };
  document.addEventListener('input', e => { if (e.target.matches && e.target.matches('textarea[data-mention]')) { sel = 0; show(e.target); } });
  document.addEventListener('keydown', e => {
    if (!e.target.matches || !e.target.matches('textarea[data-mention]') || !items.length || box().hidden) return;
    if (e.key === 'ArrowDown') { sel = (sel + 1) % items.length; show(e.target); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = (sel - 1 + items.length) % items.length; show(e.target); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { pick(sel); e.preventDefault(); }
    else if (e.key === 'Escape') { hide(); e.preventDefault(); }
  });
  document.addEventListener('mousedown', e => { const b = e.target.closest && e.target.closest('[data-mi]'); if (b) { e.preventDefault(); pick(+b.dataset.mi); } else if (!(e.target.closest && e.target.closest('#mlist'))) hide(); });
})();
