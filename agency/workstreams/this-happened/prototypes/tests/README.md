# Prototype tests

jsdom tests for `../this-happened.html`, the single-file This Happened! prototype.

```sh
npm install && npm test
```

`npm test` runs every `test-*.mjs` suite in its own Node process and fails if any suite fails.
Each suite also fails on any script error, `console.error`, or unhandled rejection in the page or in Node.

| Suite | Covers |
|-------|--------|
| `test-close.mjs` | Nothing opens on load; `?` and `!` each open one panel with one ×; Esc; the reporter's whole note is the headline |
| `test-howdoi.mjs` | How do I: Show me tours, Do it for me runs, confirms, Undo, Stop, hand-off to `!`, free-text questions offline and with a stubbed Claude |
| `test-integration.mjs` | Flows across lanes: `!` report, question and answer, How do I hand-off to a report, live triage, merge |
| `test-triage.mjs` | Agent queue: scripted run, live triage with a stubbed `window.claude` sample capability, question loop, errors, Stop, quiet fallback |
| `test-qg.mjs` | One check per 2026-10-13 quality-gate finding (P1-P24), plus coverage: consent and redaction, error codes in both lanes, late replies after Stop, duplicate edge cases, confirm and reopen, empty answers, long and empty notes |

The live lanes are tested with a stub of `window.claude.use('sample')`, so no network or model is needed.
Pacing is compressed (page timers capped at 3 ms, or `HDI.speed` lowered); waits poll a condition instead of sleeping.

`TH_HTML=/path/to/file.html npm test` runs the suites against another copy of the page.
`TH_UNTIL_MS=1500` caps every wait, for a quick red run against an unfixed file.

jsdom has no layout engine, so these tests do not check layout. Check layout with headless Chrome screenshots, for example at 1000x710:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1000,710 --virtual-time-budget=3000 --screenshot=shot.png file:///path/to/page.html
```

The published artifact is wrapped in a document skeleton by the publisher, so for a screenshot put `<!doctype html>` in front of a copy of the page.
