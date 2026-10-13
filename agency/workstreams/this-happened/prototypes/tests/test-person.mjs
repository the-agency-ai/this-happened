// What Problem: since the quality gate, a report that may duplicate an already-Fixed one stops at
// "Looking into it" and is handed to a person, but the prototype had no way for that person to decide,
// so such reports sat there forever.
//
// How & Why: drive the scripted lane to the hand-off, then check both decisions a person can make:
// "same problem" confirms only this report as Fixed; "not the same" unlinks it and sends it back to the
// agent, which must not link it to that report again. Written red against the earlier file, then green.
//
// Written: 2026-10-13 during the opus-5-5-build-day session (person-confirm control).
import {ok, eq, until, vis, load, finish, section} from './harness.mjs';

const st = (P, k) => P.ev(`reports.find(r => r.key === "${k}")`);
async function runTo(P, cond) { P.click('#run'); return until(() => !P.ev('running') && cond()); }
// TH-0006 to Fixed by a person's merge, then a new report with the same trail end, run to the hand-off.
async function handedDuplicate(P) {
  P.click('#tab-queue'); P.click('#run');
  ok(await until(() => st(P, 'TH-0006').status === 2 && !P.ev('running')), 'setup: TH-0006 scripted to a draft PR');
  P.click('#merge');
  eq(st(P, 'TH-0006').status, 3, 'setup: TH-0006 Fixed by a person');
  P.change('#scn-kind', 'never'); P.click('#scn-file');
  const k = P.ev('reports[0].key');
  ok(await runTo(P, () => st(P, k).handed), 'setup: same-trail report handed to a person');
  return k;
}

await section(async () => {
  const P = load(); await until(() => ['ready', 'off'].includes(P.ev('Sample.state')));
  const k = await handedDuplicate(P);
  ok(vis(P.$('#person-box')), 'person box shows for a report that may already be fixed');
  const stats = st(P, k).term.filter(t => t[0] === 'stat').map(t => t[1]);
  ok(stats.includes('Status → "Looking into it" · update sent to the reporter'), 'status line counts only reporters actually updated: ' + JSON.stringify(stats));
  ok(stats.every(x => !/\d+ reporters|0 reporters/.test(x)), 'no wrong reporter counts');
  ok(/May already be fixed along with TH-0006\. A person decides below\./.test(P.$('.term-bar').textContent), 'why text says a person decides');
  ok(/Confirming covers only this report/.test(P.$('#person-box').textContent), 'box says confirming covers only this report');
  ok(/TH-0006/.test(P.$('#person-box').textContent), 'person box names the Fixed report');
  ok(P.$('#run').disabled, 'agent cannot run while a person decides');
  P.click('#person-fixed');
  eq(st(P, k).status, 3, 'same problem: this report becomes Fixed');
  ok(!st(P, k).handed, 'same problem: no longer waiting on a person');
  ok(/Someone on the Tallyho team checked/.test(st(P, k).updates.at(-1).text), 'same problem: reporter told a person checked');
  ok(/A person on the Tallyho team checked: already fixed along with TH-0006/.test(P.$('#term').textContent), 'same problem: terminal records the person');
  eq(st(P, 'TH-0006').status, 3, 'same problem: the earlier report is untouched');
  ok(!P.$('#person-box'), 'person box gone after the decision');
  P.click('#tab-mine'); P.ev(`selMine = "${k}"; renderAll()`);
  ok(/Someone on the Tallyho team checked/.test(P.$('#rdetail').textContent), 'My reports shows the person-checked update');
  // C3: the reporter says it isn't fixed: not the same problem as TH-0006, so no relink and no second person box.
  P.click('#rdetail [data-confirm="no"]');
  ok(st(P, k).status === 1 && st(P, k).notSame.includes('TH-0006') && st(P, 'TH-0006').notSame.includes(k), 'reporter says no: recorded as not the same, both ways');
  ok(!st(P, k).linked.includes('TH-0006') && !st(P, 'TH-0006').linked.includes(k), 'reporter says no: unlinked both ways');
  P.click('#tab-queue'); P.ev(`selQueue = "${k}"; renderAll()`);
  ok(await runTo(P, () => st(P, k).status === 2), 'reporter says no: re-run goes to a draft PR, not back to the person');
  ok(!st(P, k).linked.includes('TH-0006') && !P.$('#person-box'), 'reporter says no: never relinked to TH-0006');
});

await section(async () => {
  const P = load(); await until(() => ['ready', 'off'].includes(P.ev('Sample.state')));
  const k = await handedDuplicate(P);
  const nUpd = st(P, k).updates.length;
  P.click('#person-not');
  ok(!st(P, k).handed, 'not the same: back to the agent');
  eq(st(P, k).updates.length, nUpd, 'not the same: no new update sent to the reporter');
  ok(!P.$('#person-box'), 'not the same: person box gone');
  ok(/not the same problem as TH-0006\. Unlinked and back to the agent/.test(P.$('#term').textContent), 'not the same: terminal records the person');
  ok(!st(P, k).linked.includes('TH-0006') && !st(P, 'TH-0006').linked.includes(k), 'not the same: unlinked both ways');
  ok(st(P, k).notSame.includes('TH-0006'), 'not the same: remembered');
  ok(!P.$('#run').disabled, 'not the same: agent can run again');
  ok(await runTo(P, () => st(P, k).status === 2), 'not the same: re-run goes on to a draft PR');
  ok(!st(P, k).linked.includes('TH-0006'), 'not the same: re-run does not link TH-0006 again');
  eq(st(P, 'TH-0006').status, 3, 'not the same: the earlier report is untouched');
  const stats = st(P, k).term.filter(t => t[0] === 'stat').map(t => t[1]);
  ok(stats.some(x => x === 'Status stays "Looking into it" · no new update for the reporter') && !stats.some(x => /0 reporters/.test(x)), 'C2: a status that does not change says so: ' + JSON.stringify(stats));
  ok(st(P, 'TH-0006').notSame.includes(k), 'C1: not the same is recorded on both reports');
  // C1: TH-0006 reopens and runs again; it must not re-link the report a person ruled out.
  P.click('#tab-mine'); P.ev(`selMine = "TH-0006"; renderAll()`); P.click('#rdetail [data-confirm="no"]');
  P.click('#tab-queue'); P.ev(`selQueue = "TH-0006"; renderAll()`);
  ok(await runTo(P, () => st(P, 'TH-0006').status === 2), 'C1: reopened TH-0006 re-runs to a draft PR');
  ok(!st(P, 'TH-0006').linked.includes(k) && !st(P, k).linked.includes('TH-0006'), 'C1: reopened TH-0006 does not re-link the ruled-out report');
  P.click('#merge');
  ok(st(P, k).status !== 3 || st(P, k).updates.every(u => !/same problem other people reported/.test(u.text)), 'C1: merging TH-0006 does not mark the ruled-out report Fixed');
});

await section(async () => {
  // C7: the Fixed report reopens while the duplicate waits on a person: the duplicate goes back to the agent.
  const P = load(); await until(() => ['ready', 'off'].includes(P.ev('Sample.state')));
  const k = await handedDuplicate(P);
  P.click('#tab-mine'); P.ev(`selMine = "TH-0006"; renderAll()`); P.click('#rdetail [data-confirm="no"]');
  ok(!st(P, k).handed, 'C7: duplicate released from the hand-off when the Fixed report reopens');
  P.click('#tab-queue'); P.ev(`selQueue = "${k}"; renderAll()`);
  ok(!P.$('#run').disabled && !P.$('#person-box'), 'C7: Run is enabled again; no stale person box');
  ok(/linked report reopened/.test(P.$('#term').textContent), 'C7: terminal says why');
});

await section(async () => {
  // T2: the live lane honours a person's "not the same" (candidates and duplicates), not just the scripted one.
  const {sampleStub} = await import('./harness.mjs');
  let dupKey = null; const calls = [];
  const canned = () => ({summary:'Export timed out.', category:'perf', severity:'high', likely_cause:'deadline', evidence:[], code_locations:[],
    duplicates:dupKey ? [{report_id:dupKey, why:'same trail'}] : [], repro_steps:['Export March'], question_for_user:null,
    proposed_fix:'Batch the render.', test_plan:['t'], plain_language_update:'We found it.', confidence:0.7});
  const P = load({claude:sampleStub(prompt => { calls.push(prompt); return Promise.resolve(canned()); })});
  await until(() => P.ev('Sample.state') === 'ready');
  P.ev('liveOn = false');  // scripted setup to reach the hand-off
  const k = await handedDuplicate(P);
  P.click('#person-not');
  P.click('#tab-mine'); P.ev(`selMine = "TH-0006"; renderAll()`); P.click('#rdetail [data-confirm="no"]');
  P.ev('liveOn = true'); dupKey = k;
  P.click('#tab-queue'); P.ev(`selQueue = "TH-0006"; renderAll()`);
  ok(await runTo(P, () => st(P, 'TH-0006').triage), 'T2: live triage ran on reopened TH-0006');
  ok(!st(P, 'TH-0006').candidates.includes(k), 'T2: the ruled-out report is not offered to Claude as a candidate');
  ok(!st(P, 'TH-0006').triage.duplicates.some(x => x.key === k), 'T2: Claude naming it as a duplicate is dropped');
  ok(!st(P, 'TH-0006').linked.includes(k), 'T2: not re-linked by live triage');
});

await section(async () => {
  // A hand-off with no Fixed link (no matching trail) has nothing for the person box to decide.
  const P = load(); await until(() => ['ready', 'off'].includes(P.ev('Sample.state')));
  P.click('#ctl-bang'); P.click('#send');
  const k = P.ev('reports[0].key');
  P.click('#tab-queue'); P.ev(`selQueue = "${k}"; renderAll()`);
  ok(await runTo(P, () => st(P, k).awaiting), 'no-trail report asks a question');
  P.click('#tab-mine'); P.$('#answer').value = 'Nothing happened.'; P.click('[data-answer]');
  P.click('#tab-queue'); P.ev(`selQueue = "${k}"; renderAll()`);
  ok(await runTo(P, () => st(P, k).handed), 'no-match report handed to a person');
  ok(!P.$('#person-box'), 'no person box without a Fixed link');
});

await finish('person');
