// What Problem: the 2026-10-13 quality gate found 24 defects in the prototype
// (P1-P24). Each fix needs a test that failed before the fix and passes after it,
// so the defect cannot come back unnoticed.
//
// How & Why: one jsdom check (or a small group) per finding, named by finding ID,
// written before the fix and run red, then run green after it. Static checks read
// the HTML; behaviour checks drive the page. Timers are compressed by the harness.
//
// Written: 2026-10-13 during the opus-5-5-build-day session (QG fix cycle, P1-P24).
import {ok, eq, until, vis, load, sampleStub, finish, section, html} from './harness.mjs';

const NEUTRAL_Q = 'What were you doing, and what did you expect to happen?';
const NEUTRAL_UPDATE = "We found what went wrong and we're working on a fix.";
const st = (P, k) => P.ev(`reports.find(r => r.key === "${k}")`);
// The shared capability state (Sample.state); before P18 the triage lane kept its own (sampleState).
const sstate = P => P.ev('typeof Sample !== "undefined" ? Sample.state : sampleState');
const ready = P => until(() => ['ready', 'off'].includes(sstate(P)));
const lastAsst = P => [...P.d.querySelectorAll('#msgs .m.a:not(.typing)')].pop()?.textContent || '';
async function openHdi(P) { P.click('#ctl-q'); return until(() => P.$('.hdi')); }
async function runTo(P, cond) { P.click('#run'); return until(() => !P.ev('running') && cond()); }
function canned(extra = {}) {
  return {summary:'Export timed out.', category:'perf', severity:'high', likely_cause:'deadline', evidence:[], duplicates:[],
    code_locations:[], repro_steps:['Export March'], question_for_user:null, proposed_fix:'Batch the render.', test_plan:['t'],
    plain_language_update:'We found it. Big exports were timing out.', confidence:0.7, ...extra};
}

// ================= Static checks on the file =================
await section(async () => {
  ok(/^<!--[\s\S]*What Problem:[\s\S]*How & Why:[\s\S]*Written: 2026-10-13 during the opus-5-5-build-day session[\s\S]*?-->/.test(html), 'P19: provenance header comment at the top');
  const meta = html.indexOf('<meta charset="utf-8">');
  ok(meta > html.indexOf('-->') && meta < html.indexOf('<title>') && !/<(?:link|style|script)/.test(html.slice(0, meta)), 'P19: meta charset right after the header, before the title');
  ok(!/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html), 'P19: no doctype/html/head/body (the publisher wraps the page)');
  ok(!/eyJ[\w-]{8,}\./.test(html), 'P8: no JWT-shaped token in the file');
  ok(/Bearer demo-not-a-real-token/.test(html), 'P8: obviously fake demo token');
  ok(!/Maya|maya/.test(html) && /Robin Vale/.test(html) && /robin\.vale@/.test(html), 'P8: persona renamed everywhere');
  const onDanger = [...html.matchAll(/--on-danger:\s*(#[0-9A-Fa-f]{6})/g)].map(m => m[1]);
  const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  ok(onDanger.length === 3 && onDanger[0].toUpperCase() === '#FFFFFF', 'P20: --on-danger defined in light and both dark blocks');
  ok(onDanger.length === 3 && ratio(onDanger[1], '#F2776B') >= 4.5 && ratio(onDanger[2], '#F2776B') >= 4.5, 'P20: dark --on-danger reaches 4.5:1 on #F2776B');
  ok(/\.app-toast\.err\{[^}]*color:var\(--on-danger\)/.test(html), 'P20: error toast uses --on-danger');
  eq((html.match(/font-size:20px;line-height:1;color:var\(--muted\)/g) || []).length, 1, 'P22: one shared close-button rule');
  eq((html.match(/window\.claude\.use\(/g) || []).length, 1, 'P18: one sample capability lookup');
  ok(!/HDI_HARD|HDI_SOFT|TRI_MSG|\bQUIET\b/.test(html), 'P18: one error table (no per-lane copies)');
  const hdi = html.slice(html.indexOf('// ================= How do I'), html.indexOf('// ================= Capture'));
  ok(hdi.length > 1000 && !/document\.createElement/.test(hdi) && /mkEl\(/.test(hdi), 'P18: How do I code builds DOM with mkEl');
  ok(html.indexOf('const mkEl') > 0 && html.indexOf('const mkEl') < html.indexOf('const esc') + 400, 'P18: mkEl hoisted next to $ and esc');
  ok(!/function howTo|show-paid|do-paid|show-export|do-export|class="howto"/.test(html), 'P3: legacy howTo / show-* / do-* path removed');
});

// ================= P1: triage never sets Fixed; open candidates only; no diag copy =================
await section(async () => {
  let hook = null; const calls = [];
  const P = load({claude:sampleStub((prompt, opts) => { calls.push(prompt); const r = hook ? hook(prompt) : canned(); return Promise.resolve(r); })});
  await ready(P);
  P.click('#tab-queue');
  P.change('#scn-kind', 'never'); P.click('#scn-file');
  const k = P.ev('reports[0].key');
  // TH-0006 becomes Fixed while Claude is thinking; Claude names it as the duplicate.
  hook = () => { P.ev('reports.find(r => r.key === "TH-0006").status = 3'); return canned({duplicates:[{report_id:'TH-0006', why:'same'}, {report_id:'TH-0004', why:'fixed long ago'}]}); };
  ok(await runTo(P, () => st(P, k).term.length > 3), 'P1: live run finishes');
  const open = JSON.parse(calls[0].split('OPEN_REPORTS:\n')[1].split('\n</untrusted_report_data>')[0] || '[]');
  ok(open.length > 0 && open.every(r => r.status !== 'Fixed') && !open.some(r => r.report_id === 'TH-0004'), 'P1: only open reports are sent as duplicate candidates');
  ok(!st(P, k).triage.duplicates.some(d => d.key === 'TH-0004'), 'P1: a Fixed report that was not a candidate is dropped');
  eq(st(P, k).status, 1, 'P1: live duplicate of a Fixed report stays at Looking into it');
  ok(/may already be fixed/.test(P.$('#term').textContent) && /person/.test(P.$('#term').textContent), 'P1: terminal says it may already be fixed and a person should confirm');
  ok(st(P, k).handed && st(P, k).linked.includes('TH-0006'), 'P1: linked and handed to a person');
  ok(st(P, k).updates.every(u => u.s < 2), 'P1: no Fix-on-the-way or Fixed update sent');
});
await section(async () => {
  const P = load(); await ready(P);
  P.click('#tab-queue'); P.click('#run');
  ok(await until(() => st(P, 'TH-0006').status === 2 && !P.ev('running')), 'P1: TH-0006 scripted to a draft PR');
  P.click('#merge'); eq(st(P, 'TH-0006').status, 3, 'P1: Fixed only after a person merges');
  P.change('#scn-kind', 'never'); P.click('#scn-file');
  const k = P.ev('reports[0].key');
  ok(await runTo(P, () => st(P, k).term.length > 3), 'P1: scripted run on a report with the same trail end');
  eq(st(P, k).status, 1, 'P1: scripted duplicate of a Fixed report stays at Looking into it');
  ok(/may already be fixed/.test(P.$('#term').textContent) && st(P, k).handed, 'P1: scripted path says it may already be fixed');
  // No trail, answer full of export keywords: no keyword match, no copied diagnosis.
  P.click('#tab-app'); P.click('#ctl-bang'); P.click('#send');
  const k2 = P.ev('reports[0].key');
  P.click('#tab-queue'); P.ev(`selQueue = "${k2}"; renderAll()`);
  ok(await runTo(P, () => st(P, k2).awaiting), 'P1: no-trail report asks a question');
  P.click('#tab-mine'); P.$('#answer').value = 'I was exporting invoices to PDF and the download never arrived.'; P.click('[data-answer]');
  P.click('#tab-queue'); P.ev(`selQueue = "${k2}"; renderAll()`);
  ok(await runTo(P, () => st(P, k2).handed), 'P1: answered no-trail report is handed to a person');
  ok(st(P, k2).linked.length === 0 && !st(P, k2).diag.root && !st(P, k2).diag.assistantLied, "P1: scripted path never copies another report's diagnosis");
  ok(st(P, k2).status <= 1, 'P1: status stays at most Looking into it');
});

// ================= P2: the reporter's answer and How Do I questions are redacted =================
await section(async () => {
  const calls = [];
  const P = load({claude:sampleStub((prompt, opts) => { calls.push({prompt, tier:opts.modelTier}); return Promise.resolve(opts.modelTier === 'quick' ? {task_id:null, answer:'Not sure.'} : canned({question_for_user:'Which month?'})); })});
  await ready(P);
  await openHdi(P);
  P.$('.hdi-in').value = 'how do I email robin.vale@acme-co.example with Bearer abc.def-123'; P.click('.hdi-q [type=submit]');
  ok(await until(() => calls.length === 1), 'P2: question sent');
  ok(!/robin\.vale@|Bearer abc/.test(calls[0].prompt), 'P2: How Do I question redacted before the prompt');
  ok(!/robin\.vale@|Bearer abc/.test(P.ev('HDI.q') + JSON.stringify(P.ev('live.actions'))), 'P2: How Do I question redacted before it is stored');
  P.click('#tab-queue'); P.change('#scn-kind', 'totals'); P.click('#scn-file');
  const k = P.ev('reports[0].key');
  ok(await runTo(P, () => st(P, k).awaiting), 'P2: live triage asks a question');
  P.click('#tab-mine'); P.$('#answer').value = 'March. Reach me at robin.vale@acme-co.example or Bearer zzz.yyy-1'; P.click('[data-answer]');
  ok(!/robin\.vale@|Bearer zzz/.test(st(P, k).answer) && /r\*\*\*@/.test(st(P, k).answer), "P2: reporter's answer redacted before it is stored");
  P.click('#tab-queue'); P.ev(`selQueue = "${k}"; renderAll()`);
  ok(await runTo(P, () => calls.length === 3), 'P2: second triage call made');
  ok(/REPORTER ANSWER:/.test(calls[2].prompt) && !/robin\.vale@|Bearer zzz/.test(calls[2].prompt), "P2: reporter's answer redacted in the prompt");
});

// ================= P3, P6, P24: confirms, mark paid, undo =================
await section(async () => {
  const P = load(), {$, ev, d} = P; await ready(P);
  // The boot chip (the greeting's suggestions) goes away once anything is said, so open the panel directly and click it first.
  ev('setAsst(true)');
  P.click('[data-say="How do I mark an invoice paid?"]');
  ok(await until(() => $('.hdi [data-id="mark-paid"][aria-pressed="true"]')), 'P3: boot chip "How do I mark an invoice paid?" opens the How do I card');
  ok(!$('.howto'), 'P3: no legacy how-to card');
  ok(/Any change to an invoice/.test($('.hdi-perm').textContent) && /Anything that emails a customer/.test($('.hdi-perm').textContent), 'P3: permission chips updated');
  const target = ev('invoicesFor(state.month).find(v => v.status === "Overdue")');
  P.click('.hdi [data-hdi=do]');
  ok(await until(() => !$('.hdi-confirm').hidden), 'P3: mark paid asks first');
  ok($('.hdi-confirm-t').textContent.includes(target.id) && $('.hdi-confirm-t').textContent.includes(target.customer), 'P3: mark-paid confirm names the invoice and customer');
  eq(d.activeElement?.dataset?.ta, 'no', 'P6: data-changing confirm focuses the decline button');
  P.click('.hdi [data-hdi=no]');
  ok(await until(() => vis($('.hdi-result'))), 'P3: declined mark-paid run finishes');
  ok(!ev(`state.paid.has("${target.id}")`), 'P3: declining leaves the invoice unpaid');
  P.click('.hdi [data-hdi=do]');
  ok(await until(() => !$('.hdi-confirm').hidden), 'P3: asks again');
  P.click('.hdi [data-hdi=yes]');
  ok(await until(() => vis($('.hdi-result'))), 'P3: mark-paid run finishes');
  ok(ev(`state.paid.has("${target.id}")`), 'P3: invoice marked paid');
  ok(vis($('.hdi [data-hdi=undo]')), 'P3: Undo offered for mark paid');
  P.click('.hdi [data-hdi=undo]');
  ok(!ev(`state.paid.has("${target.id}")`), 'P3: Undo marks it unpaid again');
});
await section(async () => {
  const P = load(), {$} = P; await ready(P);
  P.say('how do i record that a customer paid?');
  ok(await until(() => $('.hdi [data-id="mark-paid"][aria-pressed="true"]')), 'P3: "how do I … paid" in chat routes to the How do I card');
  ok(!$('.howto'), 'P3: chat route shows no legacy how-to card');
});
await section(async () => {
  const P = load(), {$, ev, d} = P; await ready(P);
  await openHdi(P);
  // Late fee: confirm names invoice, customer, amount; decline saves nothing
  P.click('.hdi [data-hdi=task][data-id="late-fee"]');
  const v = ev('invoicesFor(state.month).find(v => v.status === "Overdue")');
  P.click('.hdi [data-hdi=do]');
  ok(await until(() => !$('.hdi-confirm').hidden), 'P3: late fee asks before saving');
  ok(/\$25\.00/.test($('.hdi-confirm-t').textContent) && $('.hdi-confirm-t').textContent.includes(v.id) && $('.hdi-confirm-t').textContent.includes(v.customer), 'P3: late-fee confirm names invoice, customer and amount');
  eq(d.activeElement?.dataset?.ta, 'no', 'P6: late-fee confirm focuses the decline button');
  P.click('.hdi [data-hdi=no]');
  ok(await until(() => vis($('.hdi-result'))), 'P3: declined late fee finishes');
  eq(ev(`(invFees["${v.id}"] || []).length`), 0, 'P3: declining the late fee saves nothing');

  // P24: Undo removes only the agent's fee and keeps a line the user added later
  P.click('.hdi [data-hdi=do]'); await until(() => !$('.hdi-confirm').hidden); P.click('.hdi [data-hdi=yes]');
  ok(await until(() => vis($('.hdi-result')) && ev(`(invFees["${v.id}"] || []).length`) === 1), 'P24: agent added the fee');
  P.click('#inv-addline'); $('#inv-ldesc').value = 'Rush fee'; $('#inv-lamt').value = '10'; P.click('#inv-lsave');
  P.click('.hdi [data-hdi=undo]');
  eq(ev(`JSON.stringify(invFees["${v.id}"])`), JSON.stringify([{desc:'Rush fee', amt:10}]), "P24: Undo removes only the agent's fee and keeps the user's line");
  // Changed after the agent added it: leave it and say so
  P.click('.hdi [data-hdi=do]'); await until(() => !$('.hdi-confirm').hidden); P.click('.hdi [data-hdi=yes]');
  ok(await until(() => vis($('.hdi-result')) && ev(`invFees["${v.id}"].length`) === 2), 'P24: agent added the fee again');
  ev(`invFees["${v.id}"][1].amt = 30; renderApp()`);
  P.click('.hdi [data-hdi=undo]');
  ok(ev(`invFees["${v.id}"].length`) === 2 && /changed/.test($('.hdi-result-t').textContent), 'P24: a changed fee is left alone and Undo says so');
  // Month switch withdraws Undo
  ev(`invFees["${v.id}"] = []`);
  P.click('.hdi [data-hdi=do]'); await until(() => !$('.hdi-confirm').hidden); P.click('.hdi [data-hdi=yes]');
  ok(await until(() => vis($('.hdi-result')) && vis($('.hdi [data-hdi=undo]'))), 'P24: Undo offered after the third run');
  P.change('#month', '2026-02');
  ok(!vis($('.hdi [data-hdi=undo]')) && /month/.test($('.hdi-result-t').textContent), 'P24: switching month withdraws Undo and says why');
});
await section(async () => {
  const P = load(), {$, ev, d} = P; await ready(P);
  await openHdi(P);
  const v = ev('invoicesFor(state.month).find(v => v.status === "Overdue")');
  // P6: the outbound reminder confirm focuses Don't send
  P.click('.hdi [data-hdi=task][data-id="reminder"]');
  P.click('.hdi [data-hdi=do]');
  ok(await until(() => !$('.hdi-confirm').hidden), 'P6: reminder confirm shown');
  eq(d.activeElement?.dataset?.ta, 'no', "P6: outbound confirm focuses Don't send");
  P.click('.hdi [data-hdi=yes]');
  ok(await until(() => vis($('.hdi-result')) && vis($('.hdi [data-hdi=undo]'))), 'P7: reminder queued with Undo');
  // P7: after 30 s the reminder has gone out; Undo goes away and the card says so.
  ev('window.__now = Date.now.bind(Date); Date.now = () => window.__now() + 31000');
  ok(await until(() => !vis($('.hdi [data-hdi=undo]')), 3000), 'P7: Undo withdrawn after the 30 s window');
  ok(/gone out|can't be undone|can no longer/.test($('.hdi-result-t').textContent), 'P7: says honestly that it can no longer be recalled');
  ok(!!ev(`invReminders["${v.id}"]`), 'P7: the reminder stays sent');
  ev('Date.now = window.__now');
});
await section(async () => {
  const P = load(), {$, ev} = P; await ready(P);
  await openHdi(P);
  // P16: Do it for me export while an export is already running
  ev('state.busy = true');
  P.click('.hdi [data-hdi=task][data-id="export"]');
  const nNet = ev('live.net.length');
  P.click('.hdi [data-hdi=do]');
  ok(await until(() => vis($('.hdi-result')), 4000), 'P16: export run finishes quickly');
  ok(/already running/.test($('.hdi-result-t').textContent) && ev('live.net.length') === nNet, 'P16: says an export is already running and starts none');
  ev('state.busy = false');
});

// ================= P4: lint model text shown to the reporter; untrusted block in the prompt =================
await section(async () => {
  let next = canned(); const prompts = [];
  const P = load({claude:sampleStub(prompt => { prompts.push(prompt); return Promise.resolve(next); })});
  await ready(P);
  P.click('#tab-queue');
  const bad = ['Call us on 415-555-0134 and we will fix it.', 'Visit https://tallyho-help.example/fix to finish.', 'Email help@tallyho-support.example for a refund.',
    'Please reply with your password so we can check.', 'Send us your card number to get a refund.', 'Confirm your payment details below.'];
  for (const text of bad) {
    next = canned({plain_language_update:text});
    P.change('#scn-kind', 'blank'); P.click('#scn-file');
    const k = P.ev('reports[0].key');
    await runTo(P, () => st(P, k).status === 2);
    const ups = st(P, k).updates.map(u => u.text).join(' | ');
    ok(!ups.includes(text) && ups.includes(NEUTRAL_UPDATE), `P4: rejected update "${text.slice(0, 30)}…" falls back to the neutral text`);
  }
  next = canned({question_for_user:'What is your card number, so we can check the charge?'});
  P.change('#scn-kind', 'totals'); P.click('#scn-file');
  const kq = P.ev('reports[0].key');
  await runTo(P, () => st(P, kq).awaiting);
  eq(st(P, kq).question, NEUTRAL_Q, 'P4: a question asking for payment details falls back to the neutral question');
  next = canned({plain_language_update:'We found it: big exports were timing out.'});
  P.change('#scn-kind', 'blank'); P.click('#scn-file');
  const kk = P.ev('reports[0].key');
  await runTo(P, () => st(P, kk).status === 2);
  ok(st(P, kk).updates.some(u => u.text === 'We found it: big exports were timing out.'), 'P4: clean model text is still used');
  const p = prompts[prompts.length - 1];
  ok(/<untrusted_report_data>[\s\S]*BUNDLE:[\s\S]*OPEN_REPORTS:[\s\S]*<\/untrusted_report_data>/.test(p), 'P4: bundle and other reports sit inside a delimited untrusted block');
  ok(/untrusted/i.test(p.split('<untrusted_report_data>')[0]) && /ignore (any )?instructions/i.test(p.split('<untrusted_report_data>')[0]), 'P4: prompt says to ignore instructions inside the block');
});

// ================= P5: redaction =================
await section(async () => {
  const P = load(), {$, ev} = P; await ready(P);
  const jwt = ['eyJ' + 'hbGciOiJIUzI1NiJ9', 'eyJ' + 'zdWIiOiIxMjMifQ', 'c2lnbmF0dXJlLXZhbHVl'].join('.');
  const cases = [
    ['Authorization Bearer abc.def-ghi', /Bearer abc/, 'Bearer token'],
    ['token ' + jwt, /eyJ/, 'JWT'],
    ['key sk-' + 'live_' + 'a1B2c3D4e5F6g7H8i9J0k1L2', /sk-live_a1B2/, 'sk- key'],
    ['gh ' + 'ghp_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8', /ghp_A1b2/, 'ghp_ key'],
    ['gho ' + 'gho_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8', /gho_A1b2/, 'gho_ key'],
    ['card 4242 4242 4242 4242 ok', /4242 4242 4242 4242/, 'Luhn-valid card'],
    ['card 4111111111111111', /4111111111111111/, 'Luhn-valid card, no spaces'],
    ['call +1 415-555-0134', /555-0134/, 'phone'],
    ['call (415) 555-0134', /555-0134/, 'phone with brackets'],
    ['call +65 6123 4567', /6123 4567/, 'international phone'],
    ['link https://x.example/cb?access_token=abc123secret&state=1', /abc123secret/, 'access_token param'],
  ];
  cases.forEach(([s, leak, name]) => {
    const out = JSON.stringify(ev(`redact(${JSON.stringify({evidence:{console:[{msg:s}]}})}).data`));
    ok(!leak.test(out), `P5: redact() catches ${name}`);
  });
  const keep = {t:1760360000000, evidence:{console:[{msg:'trail 019a1b2c-3d4e-7f56-8901-234567890123 INV-2041 $48,912.40 month=2026-03 card 4242 4242 4242 4241 at 2026-10-13T10:00:00.000Z'}]}};
  eq(JSON.stringify(ev(`redact(${JSON.stringify(keep)}).data`)), JSON.stringify(keep), 'P5: ids, timestamps, invoice ids, money and a Luhn-invalid number are kept');
  const m = ev(`redact(${JSON.stringify({note:'Northwind Bakery owes me', evidence:{console:[{msg:'reminder queued: customer=Northwind Bakery'}], actions:[{detail:'INV-2043 Lumen Dental'}]}})})`);
  ok(m.data.note.includes('Northwind Bakery') && !JSON.stringify(m.data.evidence).match(/Northwind|Lumen/) && JSON.stringify(m.data.evidence).includes('INV-2043') && JSON.stringify(m.data.evidence).includes('[customer]'), 'P5: customer names masked in evidence, invoice ids and the note kept');
  // Drawer copy and the sent bundle
  P.click('#export'); await until(() => !ev('state.busy') && ev('state.toast'));
  P.click('#ctl-bang');
  ok(/masked/i.test($('#redact').textContent) && /email address/.test($('#redact').textContent), 'P5: drawer says emails are masked, not removed');
  ok(!/Removed[^.]*email/.test($('#redact').textContent), 'P5: drawer no longer says emails were removed');
  P.click('#send');
  const b = ev('reports[0].bundle');
  ok(/^UTC[+-]\d{2}:\d{2}$/.test(b.evidence.device.timezone), 'P5: timezone sent as a UTC offset only (' + b.evidence.device.timezone + ')');
  ok('reporter' in b && !/robin|@acme|vale/i.test(b.reporter), 'P5: reporter field kept but fully masked (' + b.reporter + ')');
  ok(ev('reports.every(r => !/Asia\\//.test(JSON.stringify(r.bundle)))'), 'P5: no named timezone in any report');
});

// ================= P9: Show me / Do it for me come back when a run is reset from outside =================
await section(async () => {
  const P = load(), {$, ev} = P; await ready(P);
  await openHdi(P);
  const idle = () => !$('.hdi [data-hdi=do]').disabled && !$('.hdi [data-hdi=show]').disabled && !vis($('.hdi [data-hdi=stop]')) && !vis($('.hdi-confirm')) && !$('.hdi-log li.now');
  const startRun = async (task = 'late-fee') => { P.click(`.hdi [data-hdi=task][data-id="${task}"]`); P.click('.hdi [data-hdi=do]'); return until(() => ev('HDI.run') && $('.hdi-log li.now')); };
  ok(await startRun(), 'P9: run started (1)');
  P.click('.hdi [data-hdi=task][data-id="reminder"]');
  ok(idle(), 'P9: picking another task resets the run controls');
  ok(await startRun('reminder'), 'P9: run started (2)');
  ok(await until(() => !$('.hdi-confirm').hidden), 'P9: run (2) waiting at its confirm');
  P.click('#asst-x'); P.click('#ctl-q');
  ok(await until(() => !$('#asst').hidden) && idle(), 'P9: closing the assistant resets the run controls');
  ok(await startRun(), 'P9: run started (3)');
  P.click('.hdi-foot [data-hdi=nope]');
  ok(!$('#drawer').hidden && idle(), 'P9: the report hand-off resets the run controls');
  P.click('#dr-x');
  await P.drain();
  ok(idle(), 'P9: still idle after the stopped run settles');
});

// ================= P10: linked fan-out text, awaiting, answering never lowers status =================
await section(async () => {
  const P = load(), {$, ev} = P; await ready(P);
  P.click('#ctl-bang'); P.click('#send');
  const k = ev('reports[0].key');
  P.click('#tab-queue'); ev(`selQueue = "${k}"; renderAll()`);
  ok(await runTo(P, () => st(P, k).awaiting), 'P10: no-trail report asks a question');
  eq(st(P, k).status, 1, 'P10: asking sets Looking into it');
  P.click('#tab-mine'); ev(`selMine = "${k}"; renderAll()`);
  P.click('[data-answer]');
  ok(st(P, k).awaiting, 'COV: empty answer is not sent');
  eq(P.d.activeElement?.id, 'answer', 'COV: empty answer focuses the answer box');
  // Link it to TH-0006 (as a confirmed duplicate would), then let TH-0006 move forward.
  ev(`st0 = reports.find(r => r.key === "TH-0006"); st0.linked.push("${k}"); reports.find(r => r.key === "${k}").linked.push("TH-0006")`);
  P.click('#tab-queue'); ev('selQueue = "TH-0006"; renderAll()');
  ok(await runTo(P, () => st(P, 'TH-0006').status === 2), 'P10: TH-0006 reaches Fix on the way');
  const r = st(P, k);
  eq(r.status, 2, 'P10: linked report moves forward with it');
  ok(!r.awaiting, 'P10: a linked report stops awaiting when it moves forward');
  const last = r.updates[r.updates.length - 1].text;
  ok(!/PDF|export|assistant/i.test(last) && /same problem/i.test(r.updates.map(u => u.text).join(' ')), 'P10: linked report gets neutral text (' + last + ')');
  P.click('#merge');
  eq(st(P, k).status, 3, 'P10: merge fans out Fixed to the linked report');
  ok(!/PDF|export/i.test(st(P, k).updates[st(P, k).updates.length - 1].text), 'P10: neutral Fixed text for the linked report');
  // COV: confirm / reopen
  P.click('#tab-mine'); ev(`selMine = "${k}"; renderAll()`);
  P.click('[data-confirm="no"]');
  ok(st(P, k).status === 1 && st(P, k).confirmed === null && /reopened/.test(st(P, k).updates.at(-1).text), 'COV: "No, still broken" reopens at Looking into it');
  ev('selMine = "TH-0006"; renderAll()');
  P.click('[data-confirm="yes"]');
  ok(st(P, 'TH-0006').confirmed === true && /confirmed/.test($('#rdetail').textContent), 'COV: "Yes, it works" closes the report');
});
await section(async () => {
  // Answering never lowers a status already >= 1
  const P = load(), {ev} = P; await ready(P);
  P.click('#ctl-bang'); P.click('#send');
  const k = ev('reports[0].key');
  ev(`(r => { r.status = 2; r.awaiting = true; })(reports.find(r => r.key === "${k}"))`);
  P.click('#tab-mine'); ev(`selMine = "${k}"; renderAll()`);
  P.$('#answer').value = 'March'; P.click('[data-answer]');
  eq(st(P, k).status, 2, 'P10: answering never lowers the status');
});

// ================= P11: one Esc ends a tour, not the drawer too =================
await section(async () => {
  const P = load(), {$, ev} = P; await ready(P);
  await openHdi(P);
  P.click('.hdi [data-hdi=task][data-id="export"]'); P.click('.hdi [data-hdi=show]');
  P.click('#ctl-bang');
  ok(ev('!!HDI.tour') && !$('#drawer').hidden, 'P11: tour and drawer both open');
  P.key('Escape');
  ok(!ev('HDI.tour') && !$('#drawer').hidden, 'P11: one Esc ends the tour and leaves the drawer open');
  P.key('Escape');
  ok($('#drawer').hidden, 'P11: a second Esc closes the drawer');
});

// ================= P12: agent ticks keep the My reports answer box =================
await section(async () => {
  const P = load(), {$, ev, d} = P; await ready(P);
  P.click('#ctl-bang'); P.click('#send');
  const k = ev('reports[0].key');
  P.click('#tab-queue'); ev(`selQueue = "${k}"; renderAll()`);
  ok(await runTo(P, () => st(P, k).awaiting), 'P12: report awaiting an answer');
  P.click('#tab-mine'); ev(`selMine = "${k}"; renderAll()`);
  $('#answer').value = 'half-typed answer'; $('#answer').focus(); $('#answer').setSelectionRange(4, 4);
  $('#rdetail details').open = true;
  ev('selQueue = "TH-0006"; runAgent()');
  ok(await until(() => ev('running')), 'P12: agent running in the background');
  ok(await until(() => !ev('running')), 'P12: agent finished');
  eq($('#answer')?.value, 'half-typed answer', 'P12: answer text survives agent ticks');
  eq(d.activeElement?.id, 'answer', 'P12: focus stays in the answer box');
  eq($('#answer')?.selectionStart, 4, 'P12: caret position kept');
  ok($('#rdetail details')?.open, 'P12: "What you sent" stays open');
});

// ================= P13: Stop works while waiting for the capability =================
await section(async () => {
  const resolvers = []; let jsonCalls = 0;
  const fn = async () => ({text:''}); fn.json = () => { jsonCalls++; return Promise.resolve(canned()); };
  const P = load({claude:{use: () => new Promise(r => resolvers.push(() => r(fn)))}}), {$, ev} = P;
  await P.drain();
  eq(sstate(P), 'pending', 'P13: capability still pending');
  P.click('#tab-queue'); ev('selQueue = "TH-0006"; renderAll()');
  P.click('#run');
  ok(await until(() => $('#stop')), 'P13: Stop shown while waiting for the capability');
  P.click('#stop');
  ok(await until(() => !ev('running')), 'P13: Stop ends the run while waiting');
  resolvers.forEach(f => f());
  ok(await until(() => sstate(P) === 'ready'), 'P13: capability arrives later');
  await P.drain();
  eq(jsonCalls, 0, 'P13: no Claude call after Stop');
  ok(st(P, 'TH-0006').status === 0 && st(P, 'TH-0006').term.length === 0 && !$('#run').disabled, 'P13: report untouched and Run available again');
});

// ================= P14: sending a report during a run keeps the queue on the run =================
await section(async () => {
  const P = load(), {ev} = P; await ready(P);
  P.click('#tab-queue'); ev('selQueue = "TH-0006"; renderAll()');
  P.click('#run');
  ok(await until(() => ev('running')), 'P14: agent running');
  P.click('#ctl-bang'); P.click('#send');
  eq(ev('selQueue'), 'TH-0006', 'P14: queue selection stays on the running report');
  ok(await until(() => !ev('running')), 'P14: run finishes');
  eq(st(P, 'TH-0006').status, 2, 'P14: the run finished on TH-0006');
});

// ================= P15: the assistant says when a report from the conversation is fixed =================
await section(async () => {
  const P = load(), {$, ev} = P; await ready(P);
  P.click('#ctl-q'); await until(() => $('.hdi'));
  P.say('Export March invoices and email them to my accountant');
  ok(await until(() => ev('state.lastAsstExport')), 'P15: assistant export done');
  P.say('It never arrived');
  ok(await until(() => $('[data-act=review]')), 'P15: offer to report');
  P.click('[data-act=review]'); P.click('#send');
  const k = ev('reports[0].key');
  P.click('#tab-queue'); ev(`selQueue = "${k}"; renderAll()`);
  ok(await runTo(P, () => st(P, k).status === 2), 'P15: chat report reaches Fix on the way');
  P.click('#merge');
  ok(await until(() => new RegExp(k + ' is fixed', 'i').test(lastAsst(P))), 'P15: assistant posts that the report is fixed');
  ok(/is fixed/.test(P.ev('live.convo.filter(m => m.role === "assistant").at(-1).text')), 'P15: the fixed message is part of the conversation record');
});

// ================= P17: small talk =================
await section(async () => {
  const P = load(); await ready(P);
  const count = () => P.d.querySelectorAll('#msgs .m.a:not(.typing)').length;
  const reply = async text => { const n = count(); P.say(text); return (await until(() => count() > n && !P.$('#msgs .typing'))) ? lastAsst(P) : ''; };
  const r1 = await reply('look at this book');
  ok(r1 && !/welcome/.test(r1), 'P17: "look"/"book" are not "ok" (' + r1 + ')');
  ok(/welcome/.test(await reply('ok')), 'P17: "ok" still gets "You\'re welcome"');
});

// ================= P21 + P23 + COV: drawer preview equals payload; capture time; consent and note =================
await section(async () => {
  const P = load(), {$, ev} = P; await ready(P);
  P.click('#export'); await until(() => !ev('state.busy') && ev('state.toast'));
  ev('window.__pn = performance.now.bind(performance); window.__extra = 0; performance.now = () => window.__pn() + window.__extra; window.__es = evSummary; evSummary = (...a) => { window.__extra += 50; return window.__es(...a); }');
  P.click('#ctl-bang');
  ok(ev('pending.ms') >= 50, 'P23: capture time includes the redaction preview render (' + ev('pending.ms') + ' ms)');
  ev('performance.now = window.__pn; evSummary = window.__es');
  ok(!!$('#ev-meta') && /Report details/.test($('#ev-meta').textContent), 'P21: drawer shows a Report details row');
  const meta = () => JSON.parse($('#ev-meta pre').textContent);
  ok(meta().breadcrumbs.length > 0, 'P21: preview lists the trail ids');
  // COV: untick calls and app log, type a note with private data
  $('#inc-network').checked = false; $('#inc-network').dispatchEvent(new P.w.Event('change'));
  $('#inc-console').checked = false; $('#inc-console').dispatchEvent(new P.w.Event('change'));
  eq(meta().breadcrumbs.length, 0, 'P21: unticking calls removes the trail ids from the preview');
  P.input('#note', 'Export broke. Call me on 415-555-0134 or mail robin.vale@acme-co.example');
  const shown = meta();
  P.click('#send');
  const b = ev('reports[0].bundle');
  eq(JSON.stringify({reporter:b.reporter, app:b.app, report_id:b.report_id, filed_from:b.filed_from, breadcrumbs:b.breadcrumbs}), JSON.stringify(shown), 'P21: preview equals what was sent');
  ok(!('network' in b.evidence) && !('console' in b.evidence) && b.breadcrumbs.length === 0, 'COV: unticked evidence is not sent');
  ok(!/555-0134|robin\.vale@/.test(b.note) && /r\*\*\*@/.test(b.note), 'COV: the note is redacted');
  ok(ev('reports[0].captureMs') >= 1, 'P23: real reports keep a measured capture time');
  ok(ev('["TH-0004", "TH-0006"].every(k => reports.find(r => r.key === k).captureMs == null)'), 'P23: seed reports claim no measured time');
  P.click('#tab-queue'); ev('selQueue = "TH-0006"; renderAll()');
  ok(!/captured in/.test($('.wi-head').textContent), 'P23: seeded TH-0006 shows no capture time');
  P.change('#scn-kind', 'blank'); P.click('#scn-file');
  ok(ev('reports[0].captureMs') == null && !/captured in/.test($('.wi-head').textContent), 'P23: a test report shows no capture time');
});

// ================= P22: every report-record field is initialised =================
await section(async () => {
  const P = load(), {ev} = P; await ready(P);
  P.click('#ctl-bang'); P.click('#send');
  const fields = ['key', 'bundle', 'removed', 'masked', 'diag', 'origin', 't', 'captureMs', 'status', 'updates', 'unseen', 'confirmed', 'term', 'linked',
    'triage', 'triageErr', 'prompt', 'candidates', 'question', 'awaiting', 'answer', 'handed', 'thinking', 'stream', 'abort', 'pr', 'chat', 'toldFixed'];
  const missing = fields.filter(f => !ev(`Object.hasOwn(reports[0], "${f}")`));
  eq(missing.join(','), '', 'P22: addReport initialises every field');
});

// ================= COV: long and empty notes; How Do I actions in the bundle =================
await section(async () => {
  const P = load(), {$, ev} = P; await ready(P);
  P.click('#ctl-bang'); P.click('#send');
  eq(ev('reports[0].bundle.note'), null, 'COV: empty note sent as null');
  eq(ev('reports[0].diag.title'), 'Something went wrong (no details)', 'COV: empty note with no trail gets the no-details title');
  const long = 'I tried to export my invoices for the accountant '.repeat(8).trim();
  P.click('#ctl-bang'); $('#note').value = long; P.click('#send');
  const t = ev('reports[0].diag.title');
  ok(t.length <= 141 && t.endsWith('…') && long.startsWith(t.slice(0, -1)), 'COV: long note headline cut at a word, under 141 chars');
  eq(ev('reports[0].bundle.note'), long, 'COV: long note stored in full');
  await openHdi(P);
  P.click('.hdi [data-hdi=task][data-id="export"]'); P.click('.hdi [data-hdi=show]'); P.key('Escape');
  P.click('#ctl-bang'); P.click('#send');
  const acts = ev('reports[0].bundle.evidence.actions.map(a => a.target)');
  ok(acts.includes('How do I? (?)') && acts.includes('How do I: task') && acts.includes('How do I: Show me'), 'COV: How do I actions are recorded in the bundle');
});

// ================= COV: error codes, table-driven, both lanes =================
const HARD = {rate_limited:'Claude is busy right now.', upstream_error:"Couldn't reach Claude.", invalid_json:"Claude's reply didn't make sense.",
  empty_completion:'Claude sent back an empty reply.', refused:'Claude declined to answer this one.', mystery_code:"Couldn't get an answer from Claude."};
const QUIET = ['not_granted', 'sampling_disabled', 'capability_disabled', 'not_declared', 'capability_removed'];
await section(async () => {
  let code = null;
  const P = load({claude:sampleStub(() => code === 'error_object' ? Promise.reject(new Error('boom')) : Promise.reject({code, message:'raw upstream text'}))}), {$, ev} = P;
  await ready(P);
  await openHdi(P);
  for (const [c, msg] of Object.entries(HARD)) {
    code = c; $('.hdi-in').value = 'how do I x'; P.click('.hdi-q [type=submit]');
    ok(await until(() => vis($('.hdi-err'))), `COV: How do I ${c} -> error with Try again`);
    eq($('.hdi-status').textContent, msg + ' Try again, or use the built-in answer.', `COV: How do I ${c} copy`);
  }
  code = 'cancelled'; $('.hdi-in').value = 'how do I x'; P.click('.hdi-q [type=submit]'); await P.drain();
  ok(!vis($('.hdi-err')) && $('.hdi-status').textContent === '', 'COV: How do I cancelled -> silent');
  P.click('#tab-queue');
  for (const [c, msg] of Object.entries({...HARD, error_object:HARD.upstream_error})) {
    code = c; P.change('#scn-kind', 'blank'); P.click('#scn-file');
    const k = ev('reports[0].key');
    P.click('#run');
    ok(await until(() => $('#tri-err-msg') && !ev('running')), `COV: triage ${c} -> error panel`);
    eq(st(P, k).triageErr.code, c === 'error_object' ? 'upstream_error' : c, `COV: triage ${c} code`);
    eq($('#tri-err-msg').textContent, msg + ' The scripted run still works offline.', `COV: triage ${c} copy`);
  }
  code = 'cancelled'; P.change('#scn-kind', 'blank'); P.click('#scn-file');
  const kc = ev('reports[0].key'); P.click('#run');
  ok(await until(() => !ev('running')) && !st(P, kc).triageErr && st(P, kc).term.length === 0, 'COV: triage cancelled -> silent, idle');
  eq(sstate(P), 'ready', 'COV: hard errors leave the capability on');
});
for (const c of QUIET) await section(async () => {
  const P = load({claude:sampleStub(() => Promise.reject({code:c}))}), {$, ev} = P;
  await ready(P);
  await openHdi(P);
  $('.hdi-in').value = 'how do I charge a late fee'; P.click('.hdi-q [type=submit]');
  ok(await until(() => $('.hdi [data-id="late-fee"][aria-pressed="true"]')) && sstate(P) === 'off' && $('.hdi-live').hidden, `COV: How do I ${c} -> quiet keyword fallback, capability off`);
  const Q = load({claude:sampleStub(() => Promise.reject({code:c}))});
  await ready(Q);
  Q.click('#tab-queue'); Q.click('#run');
  ok(await until(() => !Q.ev('running') && st(Q, 'TH-0006').status === 2) && sstate(Q) === 'off' && !Q.$('#live-on'), `COV: triage ${c} -> quiet scripted fallback, capability off`);
});

// ================= COV: late resolve after Stop; duplicate edge cases =================
await section(async () => {
  let pending = []; let reply = canned();
  const P = load({claude:sampleStub((prompt, opts) => new Promise(res => pending.push(() => res(opts.modelTier === 'quick' ? {task_id:'reminder', answer:'late'} : reply))))}), {$, ev} = P;
  await ready(P);
  await openHdi(P);
  $('.hdi-in').value = 'how do I nudge someone'; P.click('.hdi-q [type=submit]');
  ok(await until(() => pending.length === 1), 'COV: question in flight');
  P.click('.hdi [data-hdi=stop-ask]');
  pending.shift()(); await P.drain();
  ok(!$('.hdi [aria-pressed="true"]') && $('.hdi-status').textContent === '', 'COV: How do I answer arriving after Stop is ignored');
  P.click('#tab-queue'); ev('selQueue = "TH-0006"; renderAll()'); P.click('#run');
  ok(await until(() => pending.length === 1 && $('#stop')), 'COV: triage in flight');
  P.click('#stop');
  ok(await until(() => !ev('running')), 'COV: Stop ends the triage');
  pending.shift()(); await P.drain();
  ok(!st(P, 'TH-0006').triage && st(P, 'TH-0006').status === 0 && st(P, 'TH-0006').term.length === 0, 'COV: triage result arriving after Stop is ignored');
  // Duplicates: itself, twice, unknown, and a Fixed report that was not offered
  P.change('#scn-kind', 'never'); P.click('#scn-file');
  const k = ev('reports[0].key');
  reply = canned({duplicates:[{report_id:k, why:'self'}, {report_id:'TH-0006', why:'a'}, {report_id:'TH-0006', why:'b'}, {report_id:'TH-0004', why:'fixed'}, {report_id:'TH-0042', why:'unknown'}, {report_id:7}]});
  P.click('#run');
  ok(await until(() => pending.length === 1), 'COV: duplicate-case triage in flight');
  pending.shift()();
  ok(await until(() => !ev('running') && st(P, k).status === 2), 'COV: duplicate-case triage finishes');
  eq(st(P, k).triage.duplicates.map(d => d.key).join(), 'TH-0006', 'COV: self, repeated, Fixed-not-offered, unknown and non-string duplicates dropped');
  eq(st(P, k).linked.join(), 'TH-0006', 'COV: linked once');
});
await finish('qg');
