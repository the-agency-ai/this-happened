// What Problem: `npm test` must run every suite and fail if any one fails, while
// still showing the results of the suites after a failing one.
//
// How & Why: run each test-*.mjs in its own Node process (each boots its own jsdom
// windows and exits), echo its output, add up the RESULT lines and exit non-zero
// if any suite failed or exited badly. Separate processes keep suites independent.
//
// Written: 2026-10-13 during the opus-5-5-build-day session (QG fix cycle, P25).
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';

const dir = new URL('.', import.meta.url);
const suites = fs.readdirSync(dir).filter(f => /^test-.*\.mjs$/.test(f)).sort();
let pass = 0, fail = 0, bad = [];
for (const s of suites) {
  console.log(`\n=== ${s} ===`);
  const r = spawnSync(process.execPath, [new URL(s, dir).pathname], {encoding:'utf8', timeout:240000});
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  const m = (r.stdout || '').match(/^RESULT \S+ pass=(\d+) fail=(\d+)$/m);
  if (m) { pass += +m[1]; fail += +m[2]; }
  if (r.status !== 0 || !m) bad.push(s);
}
console.log(`\nTOTAL ${suites.length} suites · ${pass} passed · ${fail} failed${bad.length ? ' · failing suites: ' + bad.join(', ') : ''}`);
process.exit(bad.length ? 1 : 0);
