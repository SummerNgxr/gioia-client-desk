/* Shared rules for quotations, invoices and tasks. Runs on the server and in the browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.L = factory();
})(this, function () {
  'use strict';
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const pad = n => String(n).padStart(2, '0');
  const clone = o => JSON.parse(JSON.stringify(o));
  const money = n => (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-SG');
  const short = s => s.name.split(' (')[0];
  function ym(c, m) { const [y, mo] = c.quote.start.split('-').map(Number); const d = new Date(y, mo - 1 + (m - 1), 1); return { y: d.getFullYear(), mo: d.getMonth() }; }
  const mName = (c, m) => { const x = ym(c, m); return MONTHS[x.mo] + ' ' + x.y; };
  const due = (c, m) => { const x = ym(c, m); return '1 ' + MONTHS[x.mo].slice(0, 3) + ' ' + x.y; };
  const ql = (c, id) => c.quote.lines.find(s => s.id === id) || c.extra.find(s => s.id === id);
  const adhocOf = (c, id) => c.adhoc.find(a => a.id === id);
  /* discounts: a fixed amount or a percentage, on the whole invoice or one service, one-off / every month / a range of months */
  function discounts(c) { const q = c.quote; if (Array.isArray(q.discounts)) return q.discounts; return q.discount > 0 ? [{ id: 'd0', label: '', type: 'amount', value: q.discount, scope: 'all', when: 'range', from: 2, to: q.months }] : []; }
  const discIn = (d, m, months) => d.when === 'every' ? m <= months : d.when === 'once' ? m === (+d.from || 1) : m >= (+d.from || 1) && m <= (+d.to || months);
  function discWhen(d, c) { const n = c.quote.months; return d.when === 'every' ? 'every month' : d.when === 'once' ? 'Month ' + (+d.from || 1) + ' only' : (+d.from || 1) === (+d.to || n) ? 'Month ' + (+d.from || 1) : 'Months ' + (+d.from || 1) + ' to ' + (+d.to || n); }
  function discLabel(d, c) { const s = d.scope !== 'all' && ql(c, d.scope); return (d.label || 'Discount' + (d.type === 'pct' ? ' ' + d.value + '%' : '')) + (s ? ' on ' + short(s) : '') + ' (' + discWhen(d, c) + ')'; }
  function cleanDiscounts(arr, months, ids) {
    return (Array.isArray(arr) ? arr : []).map(d => { const from = Math.min(months, Math.max(1, Math.floor(+d.from || 1))); return { id: String(d.id || ''), label: String(d.label || '').trim().slice(0, 80), type: d.type === 'pct' ? 'pct' : 'amount', value: d.type === 'pct' ? Math.min(100, Math.max(0, Number(d.value) || 0)) : Math.max(0, Math.floor(Number(d.value) || 0)), scope: ids.includes(d.scope) ? d.scope : 'all', when: ['once', 'every', 'range'].includes(d.when) ? d.when : 'range', from, to: Math.min(months, Math.max(from, Math.floor(+d.to || months))) }; }).filter(d => d.value > 0).slice(0, 10);
  }
  function invLines(c, m) {
    const out = [];
    c.quote.lines.forEach(s => { if (s.billing === 'monthly' || m === 1) out.push({ s, name: s.name, amount: s.price }); });
    discounts(c).forEach(d => {
      if (!discIn(d, m, c.quote.months)) return;
      const base = d.scope === 'all' ? out.filter(l => l.s).reduce((a, l) => a + l.amount, 0) : (out.find(l => l.s && l.s.id === d.scope) || {}).amount || 0;
      const amt = Math.min(base, d.type === 'pct' ? Math.round(base * d.value / 100) : +d.value || 0);
      if (amt > 0) out.push({ name: discLabel(d, c), amount: -amt, disc: d.id });
    });
    return out;
  }
  /* months grouped by what is billed: "Month 1: $1,180", "Months 2 to 6: $680 a month" */
  function schedule(c) { const g = []; for (let m = 1; m <= c.quote.months; m++) { const t = invTotal(c, m), last = g[g.length - 1]; if (last && last.total === t && m > 1 && last.from > 1) last.to = m; else g.push({ from: m, to: m, total: t }); } return g; }
  const invTotal = (c, m) => invLines(c, m).reduce((a, l) => a + l.amount, 0);
  const inv = (c, m) => c.invoices.find(i => i.m === m);
  const invLocked = (c, m) => m > c.quote.committed && !c.quote.renewed;
  const freeWs = s => !!s && (s.billing === 'general' || s.billing === 'prep');
  const taskOpen = (c, t) => { if (t.svc === 'general') return true; if (t.svc === 'prep') return c.prep === 'open'; const i = t.adhoc ? adhocOf(c, t.adhoc) : inv(c, t.m); return !!i && i.status === 'paid'; };
  /* a quotation the client can see in the portal before any work opens */
  const shared = c => ['sent', 'accepted', 'declined', 'changes'].includes(c.quote.status);
  const hasAccess = c => c.prep === 'open' || c.invoices.some(i => i.status === 'paid') || c.adhoc.some(a => a.status === 'paid');
  const newTask = (id, svc, m, def, adhoc) => { const t = { id, svc, m, adhoc: adhoc || '', title: def[0], owner: def[1], approve: !!def[2], status: def[1] === 'client' ? 'cdraft' : 'todo', rounds: 0, assignee: '', desc: '', due: '', comments: [], files: [], history: [] }; const st = toStages(def[3]); if (st.length) { t.stages = st; t.stage = 0; t.owner = 'gioia'; t.approve = st.some(x => x.kind === 'approve'); syncStage(t); } return t; };
  const staged = t => !!(t.stages && t.stages.length);
  /* step workflows: one task, several steps that pass between the team and the client */
  const STEP_STATUS = { draft: 'cdraft', review: 'creview', approve: 'awaiting' };
  const STEP_PREFIX = [[/^client\s+approves?\s*:/i, 'client', 'approve'], [/^client\s+reviews?\s*:/i, 'client', 'review'], [/^client\s*:/i, 'client', 'draft'], [/^team\s*:/i, 'gioia', 'work']];
  /* "Jo: Draft the article" assigns a team step to Jo, matching a team member's full or first name */
  const findMember = (team, name) => { const n = String(name || '').trim().toLowerCase(); if (!n) return null; return (team || []).find(m => m.name.toLowerCase() === n) || (team || []).find(m => m.name.toLowerCase().split(' ')[0] === n) || null; };
  function parseSteps(text, team) {
    return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      for (const [re, owner, kind] of STEP_PREFIX) if (re.test(l)) return [l.replace(re, '').trim(), owner, kind];
      const mm = /^([^:]{1,40}):\s*(.+)$/.exec(l), who = mm && findMember(team, mm[1]);
      return who ? [mm[2].trim(), 'gioia', 'work', who.id] : [l, 'gioia', 'work'];
    }).filter(x => x[0]).slice(0, 20);
  }
  const stepsText = (steps, team) => (steps || []).map(x => Array.isArray(x) ? x : [x.title, x.owner, x.kind, x.assignee]).map(([t, o, k, a]) => { const who = a && (team || []).find(m => m.id === a); return (o === 'client' ? (k === 'approve' ? 'Client approves: ' : k === 'review' ? 'Client reviews: ' : 'Client: ') : who ? who.name + ': ' : 'Team: ') + t; }).join('\n');
  function toStages(raw, team) { const arr = typeof raw === 'string' ? parseSteps(raw, team) : Array.isArray(raw) ? raw : []; return arr.map(x => Array.isArray(x) ? { title: String(x[0] || '').slice(0, 160), owner: x[1] === 'client' ? 'client' : 'gioia', kind: x[1] === 'client' ? (['draft', 'review', 'approve'].includes(x[2]) ? x[2] : 'draft') : 'work', assignee: x[1] === 'client' ? '' : (x[3] || ''), due: '', done: false } : x).filter(x => x && x.title).slice(0, 20); }
  const stageMine = (t, id) => staged(t) && t.stages.some(s => !s.done && s.assignee === id);
    const curStage = t => staged(t) && t.stage < t.stages.length ? t.stages[t.stage] : null;
  function syncStage(t) { if (!staged(t)) return; if (t.stage >= t.stages.length) { t.stage = t.stages.length; t.status = 'done'; return; } const s = t.stages[t.stage]; if (s.owner === 'client') t.status = STEP_STATUS[s.kind] || 'cdraft'; else if (!['progress', 'changes'].includes(t.status)) t.status = 'todo'; }
  function normalizeClient(c) { if (c.quote && c.quote.discount > 0 && !Array.isArray(c.quote.discounts)) { c.quote.discounts = discounts(c); c.quote.discount = 0; } c.adhoc = c.adhoc || []; c.extra = c.extra || []; c.files = c.files || []; (c.tasks || []).forEach(t => { (t.comments || []).forEach((m, i) => { if (!m.id) m.id = t.id + '-m' + i; }); t.desc = t.desc || ''; t.due = t.due || ''; t.history = t.history || []; t.comments = t.comments || []; t.files = t.files || []; if (t.owner === 'client' && t.status === 'todo') t.status = 'cdraft'; }); return c; }
  function buildTasks(c) {
    let n = 0; const out = [];
    c.quote.lines.forEach(s => {
      const months = s.billing === 'once' ? [1] : Array.from({ length: c.quote.months }, (_, i) => i + 1);
      months.forEach(m => s.tasks.forEach(def => { const t = newTask(c.id + '-t' + (++n), s.id, m, def), o = def[4] || {};
        // set-up from the New project form: who does it, and which day of the month it is due
        if (o.assignee && t.owner === 'gioia') { t.assignee = o.assignee; if (o.fee > 0) t.feeDraft = { member: o.assignee, amount: o.fee }; }
        if (o.dueDay) { const x = ym(c, m), last = new Date(x.y, x.mo + 1, 0).getDate(); t.due = x.y + '-' + pad(x.mo + 1) + '-' + pad(Math.min(last, Math.max(1, +o.dueDay))); }
        out.push(t); }));
    });
    return out;
  }
  const invNo = (fmt, quoteNo, n) => String(fmt || '{quote}-{nn}').replace(/\{quote\}/g, quoteNo).replace(/\{nn\}/g, pad(n)).replace(/\{n\}/g, n);
  function acceptQuote(c, fmt) {
    c.quote.status = 'accepted';
    c.invoices = Array.from({ length: c.quote.months }, (_, i) => ({ m: i + 1, no: invNo(fmt, c.quote.no, i + 1), status: 'pending' }));
    c.tasks = buildTasks(c);
  }
  const statusOptions = t => staged(t) ? (curStage(t) && curStage(t).owner === 'gioia' ? ['todo', 'progress'] : [t.status]) : t.owner === 'client' ? ['cdraft', 'submitted', 'done'] : t.approve ? ['todo', 'progress', 'cdraft', 'creview', 'awaiting', 'changes', 'approved', 'done'] : ['todo', 'progress', 'cdraft', 'creview', 'done'];
  const STATUS = { pending: 'Pending', sent: 'Sent', paid: 'Paid', accepted: 'Accepted', cancelled: 'Cancelled', declined: 'Declined', void: 'Void', locked: 'Awaiting renewal', todo: 'Pending action', progress: 'In progress', cdraft: 'Pending client draft', creview: 'Pending client review', awaiting: 'Awaiting client approval', changes: 'Changes requested', approved: 'Approved by client', submitted: 'Sent by client', done: 'Completed' };
  /* team fees, paid for work done whether or not the client has paid:
     month: a monthly sum for a service, "all" = earned when all their tasks that month are completed, "prorata" = earned per completed task
     task: one task, or one step of a task, earned when it is completed
     item: one-off work, earned straight away */
  const feeSvc = (c, f) => f.svc ? ql(c, f.svc) : null;
  function feeTasks(c, f) {
    if (!c) return [];
    if (f.kind === 'task') { const t = c.tasks.find(x => x.id === f.taskId); return t ? [t] : []; }
    if (f.kind === 'item') return [];
    const s = feeSvc(c, f); if (!s) return [];
    const m = s.adhoc || freeWs(s) ? 0 : s.billing === 'monthly' ? f.m : 1, all = c.tasks.filter(t => t.svc === s.id && t.m === m);
    const mine = all.filter(t => t.assignee === f.member || (t.stages || []).some(x => x.assignee === f.member));
    return mine.length ? mine : all;
  }
  function feeEarned(c, f) {
    if (f.kind === 'item') return f.amount;
    if (f.kind === 'task') { const t = c && c.tasks.find(x => x.id === f.taskId); if (!t) return 0; if (f.stage !== null && f.stage !== undefined && f.stage !== '') { const st = (t.stages || [])[f.stage]; return st && st.done ? f.amount : 0; } return t.status === 'done' ? f.amount : 0; }
    const ts = feeTasks(c, f); if (!ts.length) return 0; const d = ts.filter(t => t.status === 'done').length;
    return f.rule === 'all' ? (d === ts.length ? f.amount : 0) : Math.round(f.amount * d / ts.length);
  }
  const feeOwed = (c, f) => Math.max(0, feeEarned(c, f) - (f.paid || 0));
  const feeState = (c, f) => (f.paid || 0) >= f.amount ? 'paid' : feeOwed(c, f) > 0 ? 'owed' : 'upcoming';
  /* what a task is worth to the client: the service's price for that month, split evenly, unless an admin set the value */
  function taskValue(c, t) {
    if (t.value !== undefined && t.value !== null && t.value !== '') return Number(t.value) || 0;
    const s = ql(c, t.svc); if (!s || freeWs(s)) return 0;
    const sib = c.tasks.filter(x => x.svc === t.svc && x.m === t.m), set = sib.filter(x => x.value !== undefined && x.value !== null && x.value !== '');
    const rest = Math.max(0, feeBase(c, s) - set.reduce((a, x) => a + (Number(x.value) || 0), 0)), n = sib.length - set.length;
    return n ? Math.round(rest / n) : 0;
  }
  function taskCost(c, fees, t) {
    const out = { own: [], share: [] };
    fees.filter(f => f.cid === c.id).forEach(f => {
      if (f.kind === 'task' && f.taskId === t.id) out.own.push({ f, amount: f.amount });
      else if (f.kind === 'month' || !f.kind) { const ts = feeTasks(c, f); if (ts.some(x => x.id === t.id)) out.share.push({ f, amount: Math.round(f.amount / ts.length) }); }
    });
    out.total = [...out.own, ...out.share].reduce((a, x) => a + x.amount, 0); return out;
  }
  const feeBase = (c, s) => !s ? 0 : s.adhoc ? ((adhocOf(c, s.adhoc) || {}).amount || s.price) : s.price;
  return { MONTHS, pad, clone, money, short, ym, mName, due, ql, adhocOf, invLines, invTotal, inv, invLocked, taskOpen, hasAccess, newTask, buildTasks, acceptQuote, statusOptions, STATUS, freeWs, shared, invNo, discounts, discLabel, discWhen, cleanDiscounts, schedule, findMember, stageMine, feeSvc, feeTasks, feeEarned, feeOwed, feeState, feeBase, taskValue, taskCost, parseSteps, stepsText, toStages, staged, curStage, syncStage, normalizeClient };
});
