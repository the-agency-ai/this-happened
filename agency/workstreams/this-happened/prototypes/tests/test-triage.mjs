// What Problem: the Agent queue's live-triage lane (Claude via window.claude sample)
// and its scripted fallback need regression coverage without a browser.
//
// How & Why: boot the prototype in jsdom (a) with no window.claude and (b) with a
// stubbed sample capability whose replies we control, then drive the queue through
// run, merge, question loop, errors, Stop and the quiet fallback.
//
// Written: 2026-10-13 during the opus-5-5-build-day session (ported from the scratchpad, P25).
import {ok, eq, until, load, sampleStub, finish} from './harness.mjs';

const hopsIn = prompt => {
  const m = prompt.match(/<untrusted_report_data>\n([\s\S]*?)\n<\/untrusted_report_data>/);
  const b = JSON.parse(m ? m[1].split('\nBUNDLE:\n')[1].split('\n\nOPEN_REPORTS:')[0] : prompt.split("BUNDLE (already redacted in the reporter's browser):\n")[1].split('\n\nCODE_MAP:')[0]);
  return (b.evidence.network || []).flatMap(c => c.hops);
};
const statusOf = (P, k) => P.ev(`reports.find(r => r.key === "${k}").status`);

// ---------------- (a) window.claude undefined ----------------
{
  const A = load();
  ok(await until(() => A.ev('Sample.state') === 'off'), '(a) sample resolves off');
  A.click('#tab-queue');
  ok(!A.$('#claude-saw') && !A.$('#live-on'), '(a) live features hidden');
  ok(/Scripted \(offline\)/.test(A.$('#view-queue').textContent), '(a) scripted badge shown');
  A.click('#run');
  ok(await until(() => statusOf(A, 'TH-0006') === 2 && !A.ev('running')), '(a) TH-0006 scripted run reaches Fix on the way');
  A.click('#merge');
  eq(statusOf(A, 'TH-0006'), 3, '(a) Approve and merge -> Fixed');
  // Chat path: same trail end as the now-Fixed TH-0006, so it links and stays at Looking into it (P1).
  A.click('#tab-app');
  A.ev('userSays("Export March invoices and email them to my accountant")');
  ok(await until(() => A.ev('state.lastAsstExport')), '(a) assistant export finished');
  A.ev('userSays("It never arrived")');
  ok(await until(() => A.$('[data-act="review"]')), '(a) complaint offers review');
  A.click('[data-act="review"]');
  A.click('#send');
  const key = A.ev('reports[0].key');
  A.click('#tab-queue');
  A.ev(`selQueue = "${key}"; renderAll()`);
  A.click('#run');
  ok(await until(() => !A.ev('running') && A.ev('reports[0].term.length') > 3), '(a) chat report run finishes');
  eq(A.ev('reports[0].status'), 1, '(a) duplicate of a Fixed report stays at Looking into it');
  ok(/may already be fixed/.test(A.$('#term').textContent) && A.ev('reports[0].handed'), '(a) says it may already be fixed and hands it to a person');
  ok(A.ev('reports[0].linked.includes("TH-0006")'), '(a) linked to TH-0006');
  // Scenario variant: blank PDF, edited note
  A.change('#scn-kind', 'blank');
  A.input('#scn-note', 'Every page of my PDF is white.');
  A.click('#scn-file');
  eq(A.ev('reports[0].bundle.note'), 'Every page of my PDF is white.', '(a) scenario files a new report with the edited note');
  ok(A.$('.wf-row.bad') && /asset-cdn/.test(A.$('.wf-row.bad').textContent), '(a) blank-PDF trail shows asset-cdn 404');
  A.click('#run');
  ok(await until(() => A.ev('reports[0].awaiting') && !A.ev('running')), '(a) scripted fallback asks a question for a non-failing trail');
}

// ---------------- (b) stubbed sample ----------------
{
  const calls = []; let mode = 'ok';
  const canned = (prompt, extra = {}) => {
    const hops = hopsIn(prompt), bad = hops.find(h => /pdf-renderer|asset-cdn|fx-svc/.test(h.service)) || hops[0];
    return {summary:'Large March export timed out in the PDF renderer.', category:'perf', severity:'HIGH',
      likely_cause:'pdf-renderer has a 30 s deadline and renders 47 pages in one go.',
      evidence:[{breadcrumb_id:bad.id, why:'hit the deadline'}, {breadcrumb_id:'not-a-real-id', why:'x'}, {breadcrumb_id:bad.id.slice(0, 8) + '…' + bad.id.slice(-4), why:'dupe'}],
      duplicates:[{report_id:'TH-0006', why:'same trail end'}, {report_id:'TH-9999', why:'fake'}],
      code_locations:[{path:'services/pdf-renderer/src/render.ts', why:'deadline'}, {path:'lib/made-up.ts', why:'invented'}, {path:42}],
      repro_steps:['Export March 2026 (47 invoices)', 7], question_for_user:null,
      proposed_fix:'Render exports in pages of 20. Queue large jobs.', test_plan:['47 invoices export in under 30 s'],
      plain_language_update:'<b>We found it</b>: big exports were timing out.', confidence:85, ...extra};
  };
  const B = load({claude:sampleStub((prompt, opts) => {
    calls.push({prompt, opts});
    if (mode === 'rate') return Promise.reject({code:'rate_limited', message:'slow down'});
    if (mode === 'quiet') return Promise.reject({code:'not_granted', message:'no'});
    if (mode === 'invalid') return Promise.resolve({foo:1});
    if (mode === 'hang') return new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej({code:'cancelled', message:'stopped'})));
    return new Promise(res => setTimeout(() => { opts.onText?.({text:'{"summary":"Large'}); setTimeout(() => res(canned(prompt, mode === 'ask' ? {question_for_user:'Which month did you export?', duplicates:[]} : mode === 'ask2' ? {question_for_user:'Again?', duplicates:[]} : {})), 20); }, 20));
  })});
  ok(await until(() => B.ev('Sample.state') === 'ready'), '(b) sample resolves ready');
  B.click('#tab-queue');
  ok(!!B.$('#claude-saw') && !!B.$('#live-on'), '(b) live toggle and prompt preview shown');
  B.change('#scn-kind', 'never');
  B.click('#scn-file');
  const k1 = B.ev('reports[0].key'), rep = `reports.find(r => r.key === "${k1}")`;
  B.click('#run');
  ok(/Thinking…/.test(B.$('#term').textContent), '(b) Thinking… shown before any text arrives');
  ok(!!B.$('#stop'), '(b) Stop button while thinking');
  ok(await until(() => /Claude ›/.test(B.$('#term').textContent)), '(b) streamed text shown in the terminal');
  ok(await until(() => B.ev(`${rep}.status`) === 2 && !B.ev('running')), '(b) live run reaches Fix on the way');
  const p = calls[0].prompt;
  ok(calls[0].opts.modelTier === 'default' && calls[0].opts.signal, '(b) default tier + signal');
  ok(/BUNDLE/.test(p) && /CODE_MAP/.test(p) && /OPEN_REPORTS/.test(p) && /TH-0006/.test(p), '(b) prompt has bundle, code map, open reports');
  ok(!/Bearer demo/.test(p) && !/robin\.vale@/.test(p), '(b) prompt is redacted');
  ok(p.length < 256 * 1024, '(b) prompt under 256 KiB (' + p.length + ')');
  ok(B.ev(`${rep}.triage.severity`) === 'high' && B.ev(`${rep}.triage.confidence`) === 0.85, '(b) severity/confidence normalised');
  eq(B.ev(`${rep}.triage.evidence.length`), 1, '(b) invented / duplicate breadcrumb ids dropped');
  eq(B.ev(`${rep}.triage.duplicates.map(d => d.key).join()`), 'TH-0006', '(b) unknown duplicate ids dropped');
  eq(B.ev(`${rep}.triage.code_locations.length`), 2, '(b) code location without a path dropped');
  ok(B.ev(`${rep}.linked.includes("TH-0006")`), '(b) duplicate linked');
  const q = B.$('#view-queue');
  ok(/Live: Claude triage/.test(q.textContent), '(b) live badge');
  ok(!!q.querySelector('.wf-row.cited'), '(b) cited hop highlighted on the waterfall');
  ok(/not in the code map/.test(q.querySelector('#codes-live').textContent), '(b) invented code path flagged');
  ok(q.querySelector('#tri-live').textContent.includes('<b>We found it</b>'), '(b) model text rendered as text, not HTML');
  eq(q.querySelector('#did-text').textContent, 'Large March export timed out in the PDF renderer.', '(b) "what actually happened" uses triage summary');
  ok(B.ev(`${rep}.updates.some(u => u.text.startsWith("<b>We found it"))`), '(b) plain_language_update used as user status');
  ok(/Opened draft PR #812 "Render exports in pages of 20"/.test(B.$('#term').textContent), '(b) PR title from live triage');
  eq(B.$('#prompt-pre').textContent, p, '(b) "What Claude saw" shows the exact prompt');
  B.click('#merge');
  ok(B.ev(`${rep}.status`) === 3 && /Render exports in pages of 20" approved/.test(B.$('#term').textContent), '(b) merge -> Fixed, PR title carried');
  eq(statusOf(B, 'TH-0006'), 3, '(b) linked TH-0006 also Fixed');

  // Question loop
  mode = 'ask';
  B.change('#scn-kind', 'totals');
  B.click('#scn-file');
  const k2 = B.ev('reports[0].key'), r2 = `reports.find(r => r.key === "${k2}")`;
  B.click('#run');
  ok(await until(() => B.ev(`${r2}.awaiting`) && !B.ev('running')), '(b) run stops to ask a question');
  eq(B.ev(`${r2}.question`), 'Which month did you export?', '(b) question_for_user routed to My reports');
  B.click('#tab-mine');
  ok(/Which month did you export\?/.test(B.$('#rdetail').textContent), "(b) My reports shows Claude's question");
  B.$('#answer').value = 'March 2026';
  B.click('[data-answer]');
  B.click('#tab-queue');
  mode = 'ask2';
  B.click('#run');
  ok(await until(() => B.ev(`${r2}.status`) === 2 && !B.ev('running')), '(b) question ignored once answered, run continues to draft PR');
  ok(/REPORTER ANSWER: March 2026/.test(calls[calls.length - 1].prompt), '(b) answer included in second prompt');

  // Error with retry + scripted fallback
  mode = 'rate';
  B.change('#scn-kind', 'blank');
  B.click('#scn-file');
  const k3 = B.ev('reports[0].key'), r3 = `reports.find(r => r.key === "${k3}")`;
  B.click('#run');
  ok(await until(() => B.$('#tri-err-msg')), '(b) error panel shown');
  ok(/busy/.test(B.$('#tri-err-msg').textContent) && !!B.$('#tri-retry') && !!B.$('#tri-script'), '(b) rate_limited -> message, Try again, scripted offer');
  const n = calls.length; await B.drain();
  eq(calls.length, n, '(b) no auto-retry');
  mode = 'invalid'; B.click('#tri-retry');
  ok(await until(() => B.ev(`${r3}.triageErr && ${r3}.triageErr.code`) === 'invalid_json'), '(b) invalid reply -> invalid_json error');
  B.click('#tri-script');
  ok(await until(() => B.ev(`${r3}.awaiting`) && !B.ev('running')), '(b) scripted run after error');
  ok(!B.ev(`${r3}.triage`), '(b) scripted result used after error (no live triage kept)');

  // Cancel
  mode = 'hang';
  B.click('#scn-file');
  const r4 = `reports.find(r => r.key === "${B.ev('reports[0].key')}")`;
  B.click('#run');
  ok(await until(() => B.$('#stop')), '(b) Stop offered while waiting');
  B.click('#stop');
  ok(await until(() => !B.ev('running')), '(b) Stop ends the run');
  ok(B.ev(`${r4}.term.length`) === 0 && !B.$('#run').disabled, '(b) Stop -> idle UI restored');

  // Quiet fallback
  mode = 'quiet';
  B.click('#run');
  ok(await until(() => B.ev(`${r4}.awaiting`) && !B.ev('running')), '(b) not_granted -> scripted run');
  ok(B.ev('Sample.state') === 'off' && !B.$('#live-on'), '(b) not_granted -> live hidden');
}
await finish('triage');
