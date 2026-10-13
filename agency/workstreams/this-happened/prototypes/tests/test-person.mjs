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
  ok(/update sent to the reporter/.test(P.$('#term').textContent) && !/update sent to 2 reporters/.test(P.$('#term').textContent), 'status line counts only reporters actually updated');
  ok(/TH-0006/.test(P.$('#person-box').textContent), 'person box names the Fixed report');
  ok(P.$('#run').disabled, 'agent cannot run while a person decides');
  P.click('#person-fixed');
  eq(st(P, k).status, 3, 'same problem: this report becomes Fixed');
  ok(!st(P, k).handed, 'same problem: no longer waiting on a person');
  ok(/Someone on the Tallyho team checked/.test(st(P, k).updates.at(-1).text), 'same problem: reporter told a person checked');
  ok(/A person on the Tallyho team checked: already fixed along with TH-0006/.test(P.$('#term').textContent), 'same problem: terminal records the person');
  eq(st(P, 'TH-0006').status, 3, 'same problem: the earlier report is untouched');
  ok(!P.$('#person-box'), 'person box gone after the decision');
});

await section(async () => {
  const P = load(); await until(() => ['ready', 'off'].includes(P.ev('Sample.state')));
  const k = await handedDuplicate(P);
  P.click('#person-not');
  ok(!st(P, k).handed && st(P, k).status === 1, 'not the same: back to the agent at Looking into it');
  ok(!st(P, k).linked.includes('TH-0006') && !st(P, 'TH-0006').linked.includes(k), 'not the same: unlinked both ways');
  ok(st(P, k).notSame.includes('TH-0006'), 'not the same: remembered');
  ok(!P.$('#run').disabled, 'not the same: agent can run again');
  ok(await runTo(P, () => st(P, k).status === 2), 'not the same: re-run goes on to a draft PR');
  ok(!st(P, k).linked.includes('TH-0006'), 'not the same: re-run does not link TH-0006 again');
  eq(st(P, 'TH-0006').status, 3, 'not the same: the earlier report is untouched');
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
