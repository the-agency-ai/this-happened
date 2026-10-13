// What Problem: nothing should open on its own; ? and ! each open exactly one
// panel with one close control; the reporter's own words are the headline (O1).
//
// How & Why: jsdom checks of the open/close controls, Esc, a repeated ?, and the
// whole-note headline in both the Agent queue and My reports.
//
// Written: 2026-10-13 during the opus-5-5-build-day session (ported from the scratchpad, P25).
import {ok, eq, until, load, finish} from './harness.mjs';

const P = load(), {d, $, ev} = P;
P.w.HTMLElement.prototype.scrollIntoView = () => {};
ok(await until(() => ev('Sample.state') === 'off'), 'sample resolves off');
ok($('#asst').hidden, 'assistant is closed on load');
ok($('#drawer').hidden, 'report drawer is closed on load');
ok(!$('.hdi'), 'no How do I card on load');
P.click('#ctl-bang'); ok(!$('#drawer').hidden, 'drawer opens with !');
P.click('#dr-x'); ok($('#drawer').hidden, 'drawer X closes it');
P.click('#ctl-bang'); P.key('Escape'); ok($('#drawer').hidden, 'Esc closes drawer');
P.click('#ctl-q'); ok(await until(() => $('.hdi')), 'How Do I card opens with ?');
ok(!$('#cancel'), 'drawer has no Cancel button');
ok(!$('.hdi [data-hdi=close]'), 'card has no second ×');
P.click('#asst-x'); ok($('#asst').hidden, 'assistant × closes How do I');
P.click('#ctl-q'); ok(await until(() => !$('#asst').hidden && $('.hdi')), '? reopens the assistant with How do I');
const before = d.querySelectorAll('#msgs .m.a').length;
P.click('#ctl-q'); await P.drain();
ok(d.querySelectorAll('#msgs .m.a').length === before && d.querySelectorAll('.hdi').length === 1, 'pressing ? again adds no duplicate message or card');
P.click('#export'); ok(await until(() => !ev('state.busy') && ev('state.toast')), 'export finishes');
const note = 'Tried to export my invoices, but something went wrong and nothing was exported. Was told to try again later.';
P.click('#ctl-bang'); $('#note').value = note; P.click('#send');
P.click('#tab-queue');
eq($('.wi-head h2').textContent, note, 'queue headline is the whole note');
ok($('#scn-box') && !$('#scn-box').open, 'demo form is collapsed by default');
ok(!/What the user wrote/.test($('#scn-box').textContent), 'demo form no longer labelled What the user wrote');
ok($('.saw').textContent.includes('Was told to try again later.'), 'queue shows What the user wrote in full');
ok($('.did').textContent.includes('504'), 'automatic diagnosis still in What actually happened');
P.click('#tab-mine');
ok($('#rdetail h2').textContent.startsWith('Tried to export my invoices'), 'My reports headline is what the user typed');
await finish('close');
