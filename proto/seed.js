/* Prototype only: sample data, built by running the app's real actions. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory; else root.ProtoSeed = factory; })(this, function (Core, SEED) {
  'use strict';
  const A = 'shihan@gioia.sg', MEL = 'melissa@gioia.sg', JO = 'jo@gioia.sg';
  return async function seed() {
    await Core.init();
    const run = async (who, a, p, cid) => { const r = await Core.runAction(who, { a, p: p || {}, cid }); return r; };
    const st = async who => Core.buildState(await Core.pool.connect(), await (async () => { const cl = await Core.pool.connect(); return Core.identify(cl, who); })());
    await run(A, 'team-add', { name: 'Melissa Wee', email: MEL, admin: true });
    await run(A, 'team-add', { name: 'Jo Lim', email: JO, admin: false });
    await run(A, 'team-add', { welcome: false, name: 'Ken Tan', company: 'Ken Tan Studio', what: 'Photography', phone: '9123 4567', email: 'ken@kenstudio.example', pay: 'PayNow to UEN 53412345K (Ken Tan Studio)' });
    await run(A, 'team-add', { welcome: false, name: 'PrintPro', company: 'PrintPro Pte Ltd', what: 'Printing', pay: 'Bank transfer, DBS 012-345678-9' });
    const b0 = (await st(A)).brand;
    await run(A, 'brand-save', { brand: Object.assign({}, b0, { terms: b0.terms || '1. FEES AND PAYMENT\nSample terms for the prototype. Your own Terms & Conditions from Settings appear here.\n\n2. TERM\nThe committed months are payable in full. Further months continue when both parties confirm.', welcome: 'Dear {name},\n\nThank you for taking the time to share your plans for {company} with us. We have put together the proposal below around what you told us matters most.\n\nTake your time to read through it. If anything needs adjusting, ask us below and we will send an updated version.\n\nWarmly,\nShi Han' }) });
    // catalogue prep tasks
    let s = await st(A);
    const web = s.catalogue.find(x => x.id === 'web'), social = s.catalogue.find(x => x.id === 'social');
    await run(A, 'svc-save', { svc: Object.assign({}, web, { prep: [['Send website login details', 'client'], ['Kick-off call and goals', 'gioia'], ['Baseline SEO snapshot', 'gioia']] }) });
    await run(A, 'svc-save', { svc: Object.assign({}, social, { prep: [['Send brand assets and logo files', 'client'], ['Set up content calendar', 'gioia']] }) });
    s = await st(A);
    const team = s.team, id = n => team.find(m => m.name.startsWith(n)).id;
    const yc = s.clients.find(c => /Yu Cheng/.test(c.company));
    await run(A, 'save-details', { company: yc.company, contact: yc.contact, website: yc.website, phone: '9123 4567', email: 'yokliang@yucheng.example', notes: 'Prefers WhatsApp. Articles are written in Chinese first.' }, yc.id);
    await run(A, 'note-add', { aid: yc.aid, text: 'Prefers WhatsApp for quick questions, email for anything with files.' });
    await run(MEL, 'note-add', { aid: yc.aid, text: 'Articles are written in Chinese first by Mr Tan.\nHe reviews English drafts over the weekend, so send them by Thursday.\nAvoid red in designs for the January posts.' });
    await run(A, 'i-sent', { m: 1 }, yc.id);
    await run(A, 'i-paid', { m: 1 }, yc.id);
    // Yu Cheng: a 9-step article workflow in November
    const art = yc.tasks.find(t => t.svc === 'articles' && t.m === 1 && /Article 1: draft/.test(t.title));
    await run(A, 't-steps-set', { id: art.id, steps: ['Client: Write the original content in Chinese', 'Jo: Translate and develop the English article', 'Jo: Optimise for SEO, GEO and AEO', 'Client reviews: Review the English draft', 'Shi Han: Final edits and headlines', 'Client approves: Approve the final article', 'Jo: Design the article images', 'Jo: Upload to the website', 'Shi Han: Share the link with the client'].join('\n') }, yc.id);
    await run(A, 't-stage-set', { id: art.id, stage: 2 }, yc.id);
    await run(A, 'tpl-save', { name: 'Bilingual article', steps: ['Client: Write the original content in Chinese', 'Jo: Translate and develop the English article', 'Jo: Optimise for SEO, GEO and AEO', 'Client reviews: Review the English draft', 'Shi Han: Final edits and headlines', 'Client approves: Approve the final article', 'Jo: Design the article images', 'Jo: Upload to the website', 'Shi Han: Share the link with the client'].join('\n') });
    await run(A, 'tpl-save', { name: 'Social post with approval', steps: 'Team: Draft caption and design\nClient approves: Approve the post\nTeam: Schedule and publish' });
    await run(A, 'tpl-save', { name: 'Draft then client approves', steps: 'Team: Draft\nClient approves: Approve' });
    const DA = 'Team: Draft\nClient approves: Approve';
    await run(A, 'ptpl-save', { name: 'Digital marketing set-up', tasks: [
      { title: 'Kick-off call: goals, audience, tone of voice' }, { title: 'Send brand assets (logo, colours, approved photos)', owner: 'client' }, { title: 'Agree the monthly approval rhythm' },
      { title: 'Give Gioia admin access to the website', owner: 'client' }, { title: 'Give access to Google Search Console and Analytics', owner: 'client' }, { title: 'Website audit (SEO, GEO and AEO)', steps: 'Team: Audit the website\nClient reviews: Review the findings' },
      { title: 'Article topic list for the first 3 months', steps: DA }, { title: 'Send the first 4 article drafts', owner: 'client' },
      { title: 'Add Gioia as admin of the Instagram and Facebook pages', owner: 'client' }, { title: 'Content pillars and posting schedule', steps: DA },
      { title: 'Set up the Meta ad account and payment', owner: 'client' }, { title: 'Connect the lead form to the Google Sheet, with lead source' }, { title: 'Agree the lead funnel stages' },
      { title: 'WhatsApp follow-up script', steps: 'Team: Write the script\nClient reviews: Review the script' }, { title: 'First creatives and ad copy', steps: DA }, { title: 'Start the reply FAQ doc in Drive' }] });
    await run(A, 't-stage-due', { id: art.id, i: 2, due: '2026-11-24' }, yc.id);
    await run(A, 't-stage-due', { id: art.id, i: 4, due: '2026-11-27' }, yc.id);
    await run(A, 't-stage-due', { id: art.id, i: 7, due: '2026-11-30' }, yc.id);
    // progress on other November tasks
    const nov = (svc, n) => yc.tasks.filter(t => t.svc === svc && t.m === 1)[n];
    for (const [svc, n, who] of [['social', 0, 'Jo'], ['social', 1, 'Jo'], ['social', 4, 'Jo'], ['social', 5, 'Jo'], ['ads', 0, 'Shi Han'], ['ads', 1, 'Shi Han'], ['ads', 2, 'Shi Han'], ['ads', 3, 'Shi Han'], ['web', 1, 'Shi Han'], ['web', 2, 'Jo']]) await run(A, 't-assign', { id: nov(svc, n).id, assignee: id(who) }, yc.id);
    for (const [svc, n] of [['social', 0], ['social', 1], ['ads', 0], ['ads', 1], ['web', 0]]) await run(A, 't-done', { id: nov(svc, n).id }, yc.id);
    await run(A, 't-due', { id: nov('social', 4).id, due: '2026-11-21' }, yc.id);
    await run(A, 't-submit', { id: nov('web', 1).id }, yc.id);
    await run(A, 'i-sent', { m: 2 }, yc.id);
    // fees: per task, per step, monthly (all and pro-rata), one-off item
    await run(A, 'fee-save', { fee: { kind: 'month', member: id('Jo'), cid: yc.id, svc: 'social', m: 1, rule: 'prorata', amount: 200, note: '8 posts' } });
    await run(A, 'fee-save', { fee: { kind: 'month', member: id('Shi Han'), cid: yc.id, svc: 'ads', m: 1, rule: 'all', type: 'pct', pct: 30, note: 'Ads management' } });
    await run(A, 'fee-save', { fee: { kind: 'task', member: id('Jo'), cid: yc.id, taskId: nov('web', 2).id, amount: 120 } });
    await run(A, 'fee-save', { fee: { kind: 'task', member: id('Jo'), cid: yc.id, taskId: art.id, stage: 1, amount: 50, note: 'Translation' } });
    await run(A, 'fee-save', { fee: { kind: 'task', member: id('Jo'), cid: yc.id, taskId: art.id, stage: 7, amount: 20, note: 'Upload' } });
    await run(A, 'fee-save', { fee: { kind: 'item', member: id('Melissa'), cid: yc.id, item: 'Kick-off photoshoot', amount: 300 } });
    s = await st(A);
    await run(A, 'payout-create', { member: id('Melissa'), date: '2026-11-15', note: 'Bank transfer' });
    // vendors: a photographer with two task fees (one paid against his invoice), and a printer
    await run(A, 't-assign', { id: nov('social', 2).id, assignee: id('Ken') }, yc.id);
    await run(A, 't-assign', { id: nov('social', 3).id, assignee: id('Ken') }, yc.id);
    await run(A, 'fee-save', { fee: { kind: 'task', member: id('Ken'), cid: yc.id, taskId: nov('social', 2).id, amount: 180, note: 'Product shoot' } });
    await run(A, 'fee-save', { fee: { kind: 'task', member: id('Ken'), cid: yc.id, taskId: nov('social', 3).id, amount: 180, note: 'Product shoot' } });
    await run(A, 't-done', { id: nov('social', 2).id }, yc.id);
    s = await st(A);
    await run(A, 'payout-create', { member: id('Ken'), date: '2026-11-18', note: 'PayNow', invoiceNo: 'KTS-0412', invoiceDate: '2026-11-16' });
    await run(A, 'fee-save', { fee: { kind: 'item', member: id('PrintPro'), cid: yc.id, item: 'Printed brochures (500)', amount: 220 } });
    // a second project for Yu Cheng, with preparation open before the quotation is accepted
    const r = await run(A, 'q-save', { aid: yc.aid, cid: 'new', name: '2027 Website Redesign', q: { ids: ['web', 'social'], start: '2027-01', months: 3, committed: 3, discount: 0 }, then: 'sent' });
    await run(A, 'prep-start', {}, r.out.cid);
    // a prospect with a draft quotation
    await run(A, 'q-save', { aid: 'new', cid: 'new', name: '2027 Social Media Retainer', client: { company: 'Lumen Wellness Studio', contact: 'Grace Ong', email: 'grace@lumen.example', website: 'lumenwellness.sg' }, q: { ids: ['social', 'ads'], start: '2027-02', months: 6, committed: 3, discounts: [{ label: 'Launch discount', type: 'pct', value: 15, scope: 'all', when: 'once', from: 1 }, { label: 'Retainer discount', type: 'amount', value: 100, scope: 'all', when: 'range', from: 2, to: 6 }] }, then: 'sent', welcome: '' });
  };
});
