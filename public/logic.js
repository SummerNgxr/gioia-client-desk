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
  function invLines(c, m) {
    const out = [];
    c.quote.lines.forEach(s => { if (s.billing === 'monthly' || m === 1) out.push({ s, name: s.name, amount: s.price }); });
    if (m >= 2 && c.quote.discount > 0 && c.quote.lines.some(s => s.billing === 'monthly'))
      out.push({ name: 'Monthly discount (Month 2 to Month ' + c.quote.months + ')', amount: -c.quote.discount });
    return out;
  }
  const invTotal = (c, m) => invLines(c, m).reduce((a, l) => a + l.amount, 0);
  const inv = (c, m) => c.invoices.find(i => i.m === m);
  const invLocked = (c, m) => m > c.quote.committed && !c.quote.renewed;
  const taskOpen = (c, t) => { if (t.svc === 'general') return true; const i = t.adhoc ? adhocOf(c, t.adhoc) : inv(c, t.m); return !!i && i.status === 'paid'; };
  const hasAccess = c => c.invoices.some(i => i.status === 'paid') || c.adhoc.some(a => a.status === 'paid');
  const newTask = (id, svc, m, def, adhoc) => { const t = { id, svc, m, adhoc: adhoc || '', title: def[0], owner: def[1], approve: !!def[2], status: def[1] === 'client' ? 'cdraft' : 'todo', rounds: 0, assignee: '', desc: '', due: '', comments: [], files: [], history: [] }; const st = toStages(def[3]); if (st.length) { t.stages = st; t.stage = 0; t.owner = 'gioia'; t.approve = st.some(x => x.kind === 'approve'); syncStage(t); } return t; };
  /* step workflows: one task, several steps that pass between the team and the client */
  const STEP_STATUS = { draft: 'cdraft', review: 'creview', approve: 'awaiting' };
  const STEP_PREFIX = [[/^client\s+approves?\s*:/i, 'client', 'approve'], [/^client\s+reviews?\s*:/i, 'client', 'review'], [/^client\s*:/i, 'client', 'draft'], [/^team\s*:/i, 'gioia', 'work']];
  function parseSteps(text) {
    return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { for (const [re, owner, kind] of STEP_PREFIX) if (re.test(l)) return [l.replace(re, '').trim(), owner, kind]; return [l, 'gioia', 'work']; }).filter(x => x[0]).slice(0, 20);
  }
  const stepsText = steps => (steps || []).map(([t, o, k]) => (o === 'client' ? (k === 'approve' ? 'Client approves: ' : k === 'review' ? 'Client reviews: ' : 'Client: ') : 'Team: ') + t).join('\n');
  function toStages(raw) { const arr = typeof raw === 'string' ? parseSteps(raw) : Array.isArray(raw) ? raw : []; return arr.map(x => Array.isArray(x) ? { title: String(x[0] || '').slice(0, 160), owner: x[1] === 'client' ? 'client' : 'gioia', kind: x[1] === 'client' ? (['draft', 'review', 'approve'].includes(x[2]) ? x[2] : 'draft') : 'work', done: false } : x).filter(x => x && x.title).slice(0, 20); }
  const staged = t => !!(t.stages && t.stages.length);
  const curStage = t => staged(t) && t.stage < t.stages.length ? t.stages[t.stage] : null;
  function syncStage(t) { if (!staged(t)) return; if (t.stage >= t.stages.length) { t.stage = t.stages.length; t.status = 'done'; return; } const s = t.stages[t.stage]; if (s.owner === 'client') t.status = STEP_STATUS[s.kind] || 'cdraft'; else if (!['progress', 'changes'].includes(t.status)) t.status = 'todo'; }
  function normalizeClient(c) { c.adhoc = c.adhoc || []; c.extra = c.extra || []; c.files = c.files || []; (c.tasks || []).forEach(t => { t.desc = t.desc || ''; t.due = t.due || ''; t.history = t.history || []; t.comments = t.comments || []; t.files = t.files || []; if (t.owner === 'client' && t.status === 'todo') t.status = 'cdraft'; }); return c; }
  function buildTasks(c) {
    let n = 0; const out = [];
    c.quote.lines.forEach(s => {
      const months = s.billing === 'once' ? [1] : Array.from({ length: c.quote.months }, (_, i) => i + 1);
      months.forEach(m => s.tasks.forEach(def => out.push(newTask(c.id + '-t' + (++n), s.id, m, def))));
    });
    return out;
  }
  function acceptQuote(c) {
    c.quote.status = 'accepted';
    c.invoices = Array.from({ length: c.quote.months }, (_, i) => ({ m: i + 1, no: c.quote.no + '-' + pad(i + 1), status: 'pending' }));
    c.tasks = buildTasks(c);
  }
  const statusOptions = t => staged(t) ? (curStage(t) && curStage(t).owner === 'gioia' ? ['todo', 'progress'] : [t.status]) : t.owner === 'client' ? ['cdraft', 'submitted', 'done'] : t.approve ? ['todo', 'progress', 'cdraft', 'creview', 'awaiting', 'changes', 'approved', 'done'] : ['todo', 'progress', 'cdraft', 'creview', 'done'];
  const STATUS = { pending: 'Pending', sent: 'Sent', paid: 'Paid', accepted: 'Accepted', locked: 'Awaiting renewal', todo: 'Pending action', progress: 'In progress', cdraft: 'Pending client draft', creview: 'Pending client review', awaiting: 'Awaiting client approval', changes: 'Changes requested', approved: 'Approved by client', submitted: 'Sent by client', done: 'Completed' };
  /* team fees: a fee is payable once the client has paid that month and the person's tasks there are completed */
  const feeSvc = (c, f) => f.svc ? ql(c, f.svc) : null;
  function feeTasks(c, f) { const s = feeSvc(c, f); if (!s) return []; const m = s.adhoc || s.billing === 'general' ? 0 : s.billing === 'monthly' ? f.m : 1, all = c.tasks.filter(t => t.svc === s.id && t.m === m), mine = all.filter(t => t.assignee === f.member); return mine.length ? mine : all; }
  function feeUpcoming(c, f) { if (!c || f.status === 'paid' || f.item) return false; const s = feeSvc(c, f); if (!s) return false; if (s.billing === 'general') return feeTasks(c, f).some(t => t.status !== 'done'); const i = s.adhoc ? adhocOf(c, s.adhoc) : inv(c, f.m || 1); if (!i || i.status !== 'paid') return true; return feeTasks(c, f).some(t => t.status !== 'done'); }
  const feeBase = (c, s) => !s ? 0 : s.adhoc ? ((adhocOf(c, s.adhoc) || {}).amount || s.price) : s.price;
  return { MONTHS, pad, clone, money, short, ym, mName, due, ql, adhocOf, invLines, invTotal, inv, invLocked, taskOpen, hasAccess, newTask, buildTasks, acceptQuote, statusOptions, STATUS, feeSvc, feeTasks, feeUpcoming, feeBase, parseSteps, stepsText, toStages, staged, curStage, syncStage, normalizeClient };
});
