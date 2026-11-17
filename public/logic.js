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
  const taskOpen = (c, t) => { const i = t.adhoc ? adhocOf(c, t.adhoc) : inv(c, t.m); return !!i && i.status === 'paid'; };
  const hasAccess = c => c.invoices.some(i => i.status === 'paid') || c.adhoc.some(a => a.status === 'paid');
  const newTask = (id, svc, m, def, adhoc) => ({ id, svc, m, adhoc: adhoc || '', title: def[0], owner: def[1], approve: !!def[2], status: 'todo', rounds: 0, assignee: '', desc: '', due: '', comments: [], files: [], history: [] });
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
  const statusOptions = t => t.owner === 'client' ? ['todo', 'submitted', 'done'] : t.approve ? ['todo', 'progress', 'awaiting', 'changes', 'approved', 'done'] : ['todo', 'progress', 'done'];
  const STATUS = { pending: 'Pending', sent: 'Sent', paid: 'Paid', accepted: 'Accepted', locked: 'Awaiting renewal', todo: 'Pending action', progress: 'In progress', awaiting: 'Awaiting client approval', changes: 'Changes requested', approved: 'Approved by client', submitted: 'Sent by client', done: 'Completed' };
  /* team fees: a fee is payable once the client has paid that month and the person's tasks there are completed */
  const feeSvc = (c, f) => f.svc ? ql(c, f.svc) : null;
  function feeTasks(c, f) { const s = feeSvc(c, f); if (!s) return []; const m = s.adhoc ? 0 : s.billing === 'monthly' ? f.m : 1, all = c.tasks.filter(t => t.svc === s.id && t.m === m), mine = all.filter(t => t.assignee === f.member); return mine.length ? mine : all; }
  function feeUpcoming(c, f) { if (!c || f.status === 'paid' || f.item) return false; const s = feeSvc(c, f); if (!s) return false; const i = s.adhoc ? adhocOf(c, s.adhoc) : inv(c, f.m || 1); if (!i || i.status !== 'paid') return true; return feeTasks(c, f).some(t => t.status !== 'done'); }
  const feeBase = (c, s) => !s ? 0 : s.adhoc ? ((adhocOf(c, s.adhoc) || {}).amount || s.price) : s.price;
  return { MONTHS, pad, clone, money, short, ym, mName, due, ql, adhocOf, invLines, invTotal, inv, invLocked, taskOpen, hasAccess, newTask, buildTasks, acceptQuote, statusOptions, STATUS, feeSvc, feeTasks, feeUpcoming, feeBase };
});
