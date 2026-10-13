// What Problem: the How do I lane (? control: answer it, Show me, Do it for me)
// drives the real Tallyho UI and can change data, so it needs regression coverage.
//
// How & Why: boot the prototype in jsdom (A) offline and (B) with a stubbed sample
// capability, then drive tours, runs, confirms, undo, Stop, hand-off and the
// free-text question path. Pacing is sped up with HDI.speed instead of sleeping.
//
// Written: 2026-10-13 during the opus-5-5-build-day session (ported from the scratchpad, P25).
import {ok, eq, until, vis, load, sampleStub, finish} from './harness.mjs';

const money = n => '$' + n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});

// ---------------- A: no window.claude ----------------
{
  const P = load({compress:false});
  const {d, $, ev} = P;
  ok(await until(() => ev('Sample.state') === 'off'), 'A: sample resolves off');
  ev('HDI.speed = 0.02');
  P.click('#ctl-q');
  ok(await until(() => $('.hdi')), 'A: ? opens the How do I card');
  ok($('.hdi-live').hidden, 'A: Claude badge hidden without window.claude');
  eq(d.querySelectorAll('.hdi [data-hdi=task]').length, 4, 'A: four canned tasks');

  // Show me
  P.click('.hdi [data-hdi=task][data-id="late-fee"]');
  ok(vis($('.hdi-task')) && $('.hdi-tt').textContent === 'Add a late fee to an invoice', 'A: late-fee task picked');
  ok(/Asks first/.test($('.hdi-perm').textContent) && /any change to an invoice/i.test($('.hdi-perm').textContent), 'A: permission chips shown');
  P.click('.hdi [data-hdi=show]');
  ok(!!$('#frame .hdi-tip') && /step 1 of 4/.test($('.hdi-tip').textContent), 'A: Show me step 1 of 4');
  ok(!!$('#frame .hdi-spot'), 'A: spotlight present');
  P.click('.hdi-tip [data-ta=next]');
  ok(!$('#inv-detail').hidden, 'A: step 2 opens the invoice detail');
  P.click('.hdi-tip [data-ta=next]'); ok(!$('#inv-add').hidden, 'A: step 3 shows add-line row');
  P.click('.hdi-tip [data-ta=back]'); ok($('#inv-add').hidden && /step 2/.test($('.hdi-tip').textContent), 'A: Back works');
  P.click('.hdi-tip [data-ta=next]'); P.click('.hdi-tip [data-ta=next]');
  ok(/step 4 of 4/.test($('.hdi-tip').textContent) && $('.hdi-tip [data-ta=end]'), 'A: last step has Done');
  P.click('.hdi-tip [data-ta=end]');
  ok(!$('.hdi-tip') && !$('.hdi-spot') && $('#inv-detail').hidden, 'A: Done removes overlay and closes detail it opened');
  ok(!$('#asst').hidden, 'A: assistant restored after tour');
  P.click('.hdi [data-hdi=show]');
  P.key('Escape');
  ok(!$('.hdi-tip'), 'A: Esc ends the tour');

  // Do it: late fee (asks first, then saves)
  const before = ev('invoicesFor(state.month).find(v => v.status === "Overdue")');
  P.click('.hdi [data-hdi=do]');
  ok(await until(() => $('.hdi-cursor') && !$('.hdi-cursor').hidden), 'A: agent cursor visible during Do it');
  ok(await until(() => !$('.hdi-confirm').hidden), 'A: late fee pauses for confirmation');
  ok($('.hdi-confirm-t').textContent.includes(before.id) && $('.hdi-confirm-t').textContent.includes(before.customer) && /\$25\.00/.test($('.hdi-confirm-t').textContent), 'A: confirm names invoice, customer and amount');
  P.click('.hdi [data-hdi=yes]');
  ok(await until(() => vis($('.hdi-result'))), 'A: late fee run finishes');
  eq(ev(`(invFees["${before.id}"] || []).reduce((s, f) => s + f.amt, 0)`), 25, 'A: late fee saved by the agent');
  ok($(`#rows [data-inv="${before.id}"]`).closest('tr').textContent.includes(money(before.amount + 25)), 'A: row total updated');
  ok(d.querySelectorAll('.hdi-log li').length >= 5, 'A: narration logged (' + d.querySelectorAll('.hdi-log li').length + ' steps)');
  ok(vis($('.hdi [data-hdi=undo]')), 'A: Undo offered');
  P.click('.hdi [data-hdi=undo]');
  eq(ev(`(invFees["${before.id}"] || []).length`), 0, 'A: Undo removes the fee');
  ok(!$('.hdi-cursor'), 'A: cursor removed after run');

  // Do it: reminder with confirm (yes)
  P.click('.hdi [data-hdi=task][data-id="reminder"]');
  P.click('.hdi [data-hdi=do]');
  ok(await until(() => !$('.hdi-confirm').hidden), 'A: reminder pauses for confirmation');
  ok(/Send the reminder/.test($('.hdi-tip').textContent) && $('.hdi-tip [data-ta=yes]'), 'A: confirm also in the tip');
  ok(/past due/.test($('#inv-rmsg').value), 'A: note was typed into the real textarea');
  P.click('.hdi [data-hdi=yes]');
  ok(await until(() => vis($('.hdi-result'))), 'A: reminder run finishes');
  ok(!!ev(`invReminders["${before.id}"]`) && /Reminded/.test($('#rows').textContent), 'A: reminder queued and row badge shown');
  P.click('.hdi [data-hdi=undo]');
  ok(!ev(`invReminders["${before.id}"]`), 'A: Undo recalls reminder');
  // reminder: decline
  P.click('.hdi [data-hdi=do]');
  ok(await until(() => !$('.hdi-confirm').hidden), 'A: reminder asks again');
  P.click('.hdi-tip [data-ta=no]');
  ok(await until(() => vis($('.hdi-result'))), 'A: declined run finishes');
  ok(/didn't send/.test($('.hdi-result-t').textContent) && !ev(`invReminders["${before.id}"]`), 'A: declining does not send');
  // stop mid-run via Esc
  P.click('.hdi [data-hdi=task][data-id="late-fee"]');
  P.click('.hdi [data-hdi=do]');
  ok(await until(() => ev('HDI.run') && $('.hdi-log li')), 'A: late-fee run started');
  P.key('Escape');
  ok(await until(() => vis($('.hdi-result'))), 'A: Esc ends the run');
  ok(/Stopped/.test($('.hdi-result-t').textContent) && !$('.hdi-cursor'), 'A: Esc stops a run');

  // Do it: export (fails on March, 47 invoices)
  P.click('.hdi [data-hdi=task][data-id="export"]');
  P.click('.hdi [data-hdi=do]');
  ok(await until(() => vis($('.hdi-result'))), 'A: export run finishes');
  ok($('.hdi-result').classList.contains('fail') && /failed/.test($('.hdi-result-t').textContent), 'A: export failure reported honestly');
  ok(vis($('.hdi-result [data-hdi=report]')), 'A: Report it with ! offered');
  P.click('.hdi-result [data-hdi=report]');
  ok(!$('#drawer').hidden && /How do I/.test($('#note').value) && /export/i.test($('#note').value), 'A: drawer opened pre-filled: ' + $('#note').value);
  P.click('#dr-x');

  // free text, offline keyword path
  $('.hdi-in').value = 'how can I charge a late fee?';
  P.click('.hdi-q [type=submit]');
  eq($('.hdi [data-id="late-fee"]').getAttribute('aria-pressed'), 'true', 'A: keyword match -> late fee');
  $('.hdi-in').value = 'change my password';
  P.click('.hdi-q [type=submit]');
  ok(vis($('.hdi-none')) && /can't do that yet/.test($('.hdi-none-t').textContent), 'A: no match -> hand-off');
  P.click('.hdi-foot [data-hdi=nope]');
  ok(!$('#drawer').hidden && /change my password/.test($('#note').value), "A: This didn't work opens drawer pre-filled");
  P.click('#dr-x');

  // chat route
  P.say('How do I send a payment reminder?');
  ok(await until(() => $('.hdi [data-id="reminder"][aria-pressed="true"]')), 'A: chat "how do I" routes to the card');

  // existing flows still reach Fixed
  P.say('Export March invoices and email them to my accountant');
  ok(await until(() => ev('state.lastAsstExport')), 'A: assistant export finished');
  P.say('It never arrived');
  ok(await until(() => $('[data-act=review]')), 'A: complaint offers review');
  P.click('[data-act=review]');
  P.click('#send');
  const key = ev('reports[0].key');
  eq(ev('reports[0].origin'), 'conversation', 'A: chat report filed ' + key);
  P.click('#tab-queue');
  ev(`selQueue = "${key}"; renderAll()`);
  P.click('#run');
  ok(await until(() => ev('reports[0].status') === 2 && !ev('running'), 20000), 'A: agent run reaches Fix on the way');
  P.click('#merge');
  eq(ev('reports[0].status'), 3, 'A: chat path reaches Fixed');
  // A later ! report with the same failing trail links to the Fixed one and waits for a person.
  P.click('#tab-app');
  P.click('#ctl-bang'); P.click('#send');
  const k2 = ev('reports[0].key');
  P.click('#tab-queue'); ev(`selQueue = "${k2}"; renderAll()`); P.click('#run');
  ok(await until(() => !ev('running') && ev('reports[0].term.length') > 3, 20000), 'A: ! report run finishes');
  eq(ev('reports[0].status'), 1, 'A: ! report with the same trail end stays at Looking into it');
  ok(ev(`reports[0].linked.includes("${key}")`) && ev('reports[0].handed'), 'A: linked to the fixed report and handed to a person');
}

// ---------------- B: stub window.claude ----------------
{
  let mode = 'task'; const calls = [];
  const P = load({compress:false, claude:sampleStub((prompt, opts) => {
    calls.push({prompt, opts});
    if (mode === 'task') return Promise.resolve({task_id:'reminder', answer:'Open the overdue invoice and click Send reminder.'});
    if (mode === 'none') return Promise.resolve({task_id:null, answer:"Tallyho can't change currencies on a sent invoice."});
    if (mode === 'bad') return Promise.resolve({task_id:'nuke', answer:5});
    if (mode === 'arr') return Promise.resolve([1]);
    if (mode === 'rate') return Promise.reject({code:'rate_limited', message:'slow down'});
    if (mode === 'soft') return Promise.reject({code:'not_granted', message:'no'});
    return new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej({code:'cancelled', message:'stop'})));
  })});
  const {$, ev} = P;
  ok(await until(() => ev('Sample.state') === 'ready'), 'B: sample resolves ready');
  P.click('#ctl-q'); ok(await until(() => $('.hdi')), 'B: card opens');
  ok(!$('.hdi-live').hidden, 'B: Claude badge shown when sample available');
  eq(calls.length, 0, 'B: no model call before a click');
  const ask = async (q, m) => { mode = m; const n = calls.length; $('.hdi-in').value = q; P.click('.hdi-q [type=submit]'); await until(() => calls.length > n || ev('Sample.state') === 'off'); await P.drain(); };
  await ask('how do I nudge Kestrel?', 'task');
  ok(calls[0]?.opts.modelTier === 'quick' && /task_id/.test(calls[0].prompt) && calls[0].prompt.includes('nudge Kestrel'), 'B: sample.json called with quick tier and the question');
  ok($('.hdi [data-id="reminder"]').getAttribute('aria-pressed') === 'true' && $('.hdi-ans').textContent.startsWith('Open the overdue'), 'B: live result picks task and shows answer');
  await ask('change currency', 'none');
  ok(vis($('.hdi-none')) && /currencies/.test($('.hdi-none-t').textContent) && /Still stuck/.test($('.hdi-none [data-hdi=report]').textContent), 'B: null task shows the short answer + hand-off');
  await ask('weird', 'bad');
  ok(vis($('.hdi-none')) && /can't do that yet/.test($('.hdi-none-t').textContent), 'B: invalid fields are validated away');
  await ask('weird', 'arr');
  ok(vis($('.hdi-err')) && $('.hdi-status').classList.contains('err'), 'B: non-object reply -> error with Try again');
  await ask('how do i export', 'rate');
  ok(vis($('.hdi-err')) && /busy/.test($('.hdi-status').textContent), 'B: rate_limited shows message + Try again');
  mode = 'task'; const nRetry = calls.length; P.click('.hdi [data-hdi=retry]');
  ok(await until(() => $('.hdi [data-id="reminder"]').getAttribute('aria-pressed') === 'true'), 'B: Try again re-asks on click');
  ok(calls.length === nRetry + 1 && !vis($('.hdi-err')), 'B: one new call, error cleared');
  await ask('how do i export', 'rate');
  P.click('.hdi [data-hdi=scripted]');
  eq($('.hdi [data-id="export"]').getAttribute('aria-pressed'), 'true', 'B: built-in answer fallback after error');
  await ask('late fee please', 'hang');
  ok($('.hdi-status').textContent === 'Thinking…' && vis($('.hdi [data-hdi=stop-ask]')) && $('.hdi-q [type=submit]').disabled, 'B: Thinking… with Stop while waiting');
  P.click('.hdi [data-hdi=stop-ask]'); await P.drain();
  ok($('.hdi-status').textContent === '' && !$('.hdi-q [type=submit]').disabled && !vis($('.hdi [data-hdi=stop-ask]')), 'B: Stop restores idle UI');
  const n = calls.length;
  await ask('late fee please', 'soft');
  ok($('.hdi [data-id="late-fee"]').getAttribute('aria-pressed') === 'true' && $('.hdi-live').hidden, 'B: not_granted quietly falls back to keywords');
  await ask('send a reminder', 'task');
  eq(calls.length, n + 1, 'B: no further model calls after soft fallback');
  eq(ev('Sample.state'), 'off', 'B: soft fallback turns the shared capability off for triage too');
}
await finish('howdoi');
