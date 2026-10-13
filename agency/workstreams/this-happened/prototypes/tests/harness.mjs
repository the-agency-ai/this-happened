// What Problem: every suite needs the same jsdom loader, assertions, polling and
// error capture, and a suite that forgets to watch for script errors or unhandled
// rejections can pass while the page is broken (TQ-11).
//
// How & Why: one shared harness. load() boots the prototype in jsdom with an
// optional window.claude stub and records jsdom errors, console.error (except the
// app's own "[tallyho]" echo), window errors and unhandled rejections for every
// window it creates. finish() asserts all of those are empty, plus Node-level
// unhandled rejections, prints one RESULT line for run-all.mjs, and sets the exit
// code. until() polls instead of sleeping for a fixed time; drain() waits for the
// page's compressed timers to run, for negative checks ("nothing else happened").
//
// Written: 2026-10-13 during the opus-5-5-build-day session (QG fix cycle, P25).
import fs from 'node:fs';
import jsdom from 'jsdom';
const {JSDOM, VirtualConsole} = jsdom;

export const HTML_URL = process.env.TH_HTML ? new URL('file://' + process.env.TH_HTML) : new URL('../this-happened.html', import.meta.url);
export const html = fs.readFileSync(HTML_URL, 'utf8');

let passes = 0, fails = 0;
const windows = [], nodeRej = [];
process.on('unhandledRejection', r => nodeRej.push(String(r?.stack || r)));

export function ok(cond, msg) {
  if (cond) passes++; else fails++;
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  return !!cond;
}
export const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const realTick = () => new Promise(r => setTimeout(r, 5));
// Poll a condition. Returns true when it holds, false on timeout (callers assert on it).
// TH_UNTIL_MS caps every wait (used for quick red runs against an unfixed file).
const CAP = Number(process.env.TH_UNTIL_MS) || Infinity;
export async function until(fn, ms = 10000) {
  const end = Date.now() + Math.min(ms, CAP);
  while (Date.now() < end) { try { if (fn()) return true; } catch { /* not ready yet */ } await realTick(); }
  try { return !!fn(); } catch { return false; }
}
export const vis = el => !!el && !el.hidden && !el.closest('[hidden]');

/**
 * Boot the prototype.
 * claude: object installed as window.claude (or null for "not inside claude.ai").
 * compress: cap every page setTimeout at 3 ms, so the demo's pacing runs fast.
 */
export function load({claude = null, compress = true, url = 'https://example.test/', setup} = {}) {
  const errors = [], rej = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdom: ' + String(e?.stack || e)));
  vc.on('error', (...a) => { const s = a.map(String).join(' '); if (!/^\[tallyho\]/.test(s)) errors.push('console.error: ' + s); });
  const dom = new JSDOM(html, {runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc, url,
    beforeParse(w) {
      w.addEventListener('error', e => errors.push('window error: ' + e.message));
      w.addEventListener('unhandledrejection', e => rej.push(String(e.reason?.stack || e.reason?.message || JSON.stringify(e.reason))));
      if (compress) { const st = w.setTimeout.bind(w); w.setTimeout = (f, ms, ...a) => st(f, Math.min(ms || 0, 3), ...a); }
      if (claude) w.claude = claude;
      setup?.(w);
    }});
  const w = dom.window, d = w.document, $ = s => d.querySelector(s);
  const page = {w, d, $, errors, rej, ev: s => w.eval(s),
    click: s => { const el = typeof s === 'string' ? $(s) : s; if (!el) throw new Error('no element ' + s); el.dispatchEvent(new w.MouseEvent('click', {bubbles:true, cancelable:true})); },
    key: (key, target = d) => target.dispatchEvent(new w.KeyboardEvent('keydown', {key, bubbles:true, cancelable:true})),
    input: (s, value) => { const el = $(s); el.value = value; el.dispatchEvent(new w.Event('input', {bubbles:true})); },
    change: (s, value) => { const el = $(s); el.value = value; el.dispatchEvent(new w.Event('change', {bubbles:true})); },
    // Let every already-scheduled page timer run (each round waits one page timer).
    drain: async (rounds = 8) => { for (let i = 0; i < rounds; i++) await new Promise(r => w.setTimeout(r, compress ? 3 : 0)); },
    say: text => { $('#chatin').value = text; $('#composer').dispatchEvent(new w.Event('submit', {bubbles:true, cancelable:true})); },
    close: () => w.close()};
  windows.push(page);
  return page;
}

// Run a group of checks; an exception counts as one failure instead of ending the suite.
export async function section(fn) {
  try { await fn(); } catch (e) { ok(false, 'section threw: ' + String(e?.stack || e).split('\n').slice(0, 2).join(' ')); }
}

// Builds a window.claude stub whose sample().json is the given handler.
export function sampleStub(handler) {
  const fn = async () => ({text:''});
  fn.json = handler;
  return {use: async n => n === 'sample' ? fn : null};
}

export async function finish(name) {
  await realTick();
  windows.forEach((p, i) => {
    ok(p.errors.length === 0, `${name}: window ${i + 1} had no script errors ${p.errors.join(' | ')}`);
    ok(p.rej.length === 0, `${name}: window ${i + 1} had no unhandled rejections ${p.rej.join(' | ')}`);
    try { p.close(); } catch { /* already closed */ }
  });
  ok(nodeRej.length === 0, `${name}: no unhandled rejections in Node ${nodeRej.join(' | ')}`);
  console.log(`RESULT ${name} pass=${passes} fail=${fails}`);
  process.exit(fails ? 1 : 0);
}
