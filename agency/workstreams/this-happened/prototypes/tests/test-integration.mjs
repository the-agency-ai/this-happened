// What Problem: the three lanes (! report, How do I, Agent queue) share one record
// and one capability; a change in one can break a flow that crosses into another.
//
// How & Why: end-to-end flows in jsdom, offline and with a stub that serves both
// model tiers: ! report -> question -> answer -> rerun; How do I -> hand-off ->
// report -> triage; live How do I -> hand-off -> live triage -> merge.
//
// Written: 2026-10-13 during the opus-5-5-build-day session (ported from the scratchpad, P25).
import {ok, eq, until, vis, load, sampleStub, finish} from './harness.mjs';

// ---- Offline: ! path with answer-a-question loop; How Do I -> report -> scripted triage
{
  const P = load(), {$, ev} = P;
  ok(await until(() => ev('Sample.state') === 'off'), 'OFF: sample resolves off');
  P.click('#ctl-bang'); P.click('#send');
  const k = ev('reports[0].key');
  P.click('#tab-queue'); ev(`selQueue = "${k}"; renderAll()`); P.click('#run');
  ok(await until(() => ev('reports[0].awaiting') && !ev('running')), 'OFF: ! report with no trail asks the reporter a question');
  eq(ev('reports[0].status'), 1, 'OFF: asking puts it at Looking into it');
  P.click('#tab-mine');
  ok(!!$('[data-ans]'), 'OFF: canned answer chip in My reports');
  P.click('[data-ans]'); P.click('[data-answer]');
  ok(!ev('reports[0].awaiting'), 'OFF: answer clears awaiting');
  eq(ev('reports[0].status'), 1, 'OFF: answering keeps Looking into it (never lowers it)');
  P.click('#tab-queue'); ev(`selQueue = "${k}"; renderAll()`); P.click('#run');
  ok(await until(() => ev('reports[0].handed') && !ev('running')), 'OFF: rerun with no trail to match hands it to a person');
  ok(/person on the Tallyho team/.test($('#term').textContent), 'OFF: terminal says a person takes it');
  eq(ev('reports[0].linked.length'), 0, 'OFF: no keyword-only link to another report');
  // How Do I export -> Report it with ! -> submit -> scripted triage
  P.click('#tab-app'); P.click('#ctl-q'); ok(await until(() => $('.hdi')), 'OFF: How do I card opens');
  P.click('.hdi [data-hdi=task][data-id="export"]'); P.click('.hdi [data-hdi=show]');
  ok(await until(() => $('.hdi-tip')), 'OFF: Show me opens spotlight tip');
  P.key('Escape');
  P.click('.hdi [data-hdi=do]');
  ok(await until(() => vis($('.hdi-result'))), 'OFF: Do it for me export completes');
  P.click('.hdi-result [data-hdi=report]');
  ok(!$('#drawer').hidden && /How do I/.test($('#note').value), 'OFF: hand-off pre-fills drawer');
  const n0 = ev('reports.length'); P.click('#send');
  eq(ev('reports.length'), n0 + 1, 'OFF: How Do I hand-off files a report');
  ok(ev('reports[0].bundle.evidence.actions.some(a => a.target === "How do I: Do it for me")'), 'OFF: How do I actions are in the bundle');
  const k2 = ev('reports[0].key');
  P.click('#tab-queue'); ev(`selQueue = "${k2}"; renderAll()`);
  eq(ev('reports[0].term.length'), 0, 'OFF: queue shows the report with no run yet');
  eq(P.$('.wi-head .mono').textContent, k2, 'OFF: queue is on the hand-off report');
  P.click('#run');
  ok(await until(() => ev('reports[0].status') === 2 && !ev('running')), 'OFF: hand-off report triaged (scripted) to a draft PR');
  ok(/Scripted \(offline\)/.test($('#view-queue').textContent), 'OFF: scripted badge');
}

// ---- Live stub serving both tiers
{
  const calls = [];
  const P = load({claude:sampleStub((prompt, opts) => {
    calls.push({prompt, tier:opts?.modelTier});
    if (opts?.modelTier === 'quick') return Promise.resolve({task_id:'export', answer:'Click Export PDF on the invoices page.'});
    return new Promise(res => setTimeout(() => { opts.onText?.({text:'{"summary"'});
      res({summary:'Export timed out.', category:'perf', severity:'high', likely_cause:'deadline', evidence:[], duplicates:[], code_locations:[{path:'services/pdf-renderer/src/render.ts', why:'x'}],
        repro_steps:['Export March'], question_for_user:null, proposed_fix:'Batch the render', test_plan:['t'], plain_language_update:'Found it.', confidence:0.7}); }, 10)); })});
  const {$, ev} = P;
  ok(await until(() => ev('Sample.state') === 'ready'), 'LIVE: sample ready');
  eq(calls.length, 0, 'LIVE: no calls at load');
  P.click('#ctl-q'); ok(await until(() => $('.hdi')), 'LIVE: card opens');
  ok(!$('.hdi-live').hidden, 'LIVE: How Do I Claude badge');
  $('.hdi-in').value = 'how do I get a pdf of march?'; P.click('.hdi-q [type=submit]');
  ok(await until(() => calls.length === 1 && $('.hdi-ans')?.textContent), 'LIVE: answer shown');
  ok(calls[0].tier === 'quick' && $('.hdi [data-id="export"]').getAttribute('aria-pressed') === 'true', 'LIVE: free text -> quick tier -> export task');
  P.click('.hdi-foot [data-hdi=nope]');
  ok(!$('#drawer').hidden && /pdf of march/.test($('#note').value), "LIVE: This didn't work pre-fills drawer");
  P.click('#send');
  const k = ev('reports[0].key');
  P.click('#tab-queue'); ev(`selQueue = "${k}"; renderAll()`);
  eq(calls.length, 1, 'LIVE: no triage call before Run');
  P.click('#run');
  ok(await until(() => ev('reports[0].status') === 2 && !ev('running')), 'LIVE: live triage reaches Fix');
  ok(calls[1]?.tier === 'default' && calls[1].prompt.includes('pdf of march'), 'LIVE: triage default tier, prompt carries How Do I note');
  ok(/Live: Claude triage/.test($('#view-queue').textContent), 'LIVE: live badge');
  P.click('#merge');
  eq(ev('reports[0].status'), 3, 'LIVE: hand-off report reaches Fixed');
}
await finish('integration');
