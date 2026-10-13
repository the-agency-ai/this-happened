---
type: pvr
workstream: this-happened
covers: this-happened (app/service) + breadcrumb (trace library), per Decision 1
revision: Rev 1 (draft for review)
date: 2026-10-13
status: draft — open for principal comment
principal: jordan
inputs:
  - agency/workstreams/this-happened/seeds/seed-it-happened-and-breadcrumb-20260410.md
  - agency/workstreams/this-happened/seeds/directive-spec-provider-stack-20260410.md
  - agency/workstreams/this-happened/transcripts/transcript-bootstrap-1b1-20260509.md
  - usr/jordan/captain/captain-handoff.md
  - agency/workstreams/this-happened/prototypes/this-happened.html (prototype, copied from opus-5-5-build-day on 2026-10-13)
---

# This Happened! — Product Vision & Requirements (Rev 1)

## How to read this document

- **Decided** items come from the principal: the four bootstrap decisions (1B1 transcript, 2026-05-09) and the stack directive (2026-04-10), D1–D5 below. Nothing else in this document is a principal decision.
- **Principal direction for the prototype** (2026-10-13): replace the prototype's rule-based diagnosis with real Claude triage, and mock "How Do I" well enough to show the idea. These are kept as D6 and D7 so references stay stable, but they were given about the prototype and are pending ratification as product decisions.
- Everything else is a proposal. Where a proposal rests on an assumption the principal has not ruled on, it is marked **Open question:** with a recommended answer. Resolve by commenting on the item.
- The captain handoff (2026-05-09) suggested some success criteria and non-goals. Those were captain suggestions, not principal decisions, so they appear here as open questions where they matter.
- Requirement IDs (FR-, PR-, NFR-, SM-) are stable. A&D and Plan should cite them.

### Decision log (locked)

| # | Source | Decision |
|---|---|---|
| D1 | 1B1 Item 1 | Scope: This Happened! and Breadcrumb together in one repo, two workstreams. They ship as a pair. |
| D2 | 1B1 Item 2 | Full discipline: PVR → A&D → Plan → first iteration. |
| D3 | 1B1 Item 3 | Reference Source license on both workstreams, with two separate LICENSE files so either can be re-licensed independently. |
| D4 | 1B1 Item 4 | Bootstrap via `agency init`. |
| D5 | Stack directive | Backend NestJS; frontend React + Next.js; real running applications, not CLI tools. |

### Principal direction for the prototype (2026-10-13), pending ratification

Given during the 2026-10-13 build session about the prototype. Not part of the locked log until the principal ratifies them as product decisions.

| # | Source | Direction |
|---|---|---|
| D6 | 2026-10-13 request | Triage is done by Claude for real, not by rules. The prototype's rule-based `diagnose()` is a stand-in to be replaced. |
| D7 | 2026-10-13 request | "How Do I": mock something that shows the idea. (The principal's words were "mock something that shows the idea to a degree", said about the prototype. The "Show me / Do it for me" split and "companion surface" framing come from the prototype, not from a principal ruling.) |

Note on D6: the principal's direction was given about the prototype ("replace the fake diagnosis with real Claude triage"). Carrying it into the product as "triage is performed by Claude" is this document's reading of that direction; it is consistent with the request but has not been separately confirmed. Requirements that cite D6 or D7 rest on that pending ratification.

---

## 1. Problem statement

When something goes wrong in an app, the moment it happens is the only moment when the evidence is complete: what was on screen, what the user just did, which calls were in flight, which one failed, what the app logged, which flags were on. That moment is invisible to everyone who later tries to help.

Today the gap is filled by the user, who is the person least able to fill it:

- **The user** is asked to describe a technical failure in words, often after the fact, often to a form that asks for "steps to reproduce." Many give up. Those who don't usually describe the symptom ("it never arrived"), not the cause.
- **Support and developers** cannot reproduce from a symptom. They ask follow-up questions, wait days, and often close the report as "cannot reproduce" even though it did happen.
- **Agents** (Claude Code and similar) can now read code, run reproductions, and open fixes, but they cannot diagnose from "it's broken" either. Give an agent the same vague ticket a human gets and it guesses.
- **In-app AI assistants** add a new failure class. An assistant can call a tool, the tool can fail, and the assistant can tell the user it worked. The prototype's main scenario is exactly this: the assistant says "Done! I've emailed the March invoices" after `pdf.export` returned a 504. Neither the user nor the app team can see this without the conversation and the tool results side by side.

A second, related problem: users who don't know how to do something either guess, abandon the task, or file a report about something that isn't broken. The same embedded assistant that can file a report can also answer "how do I…?" and show them, or do it.

**Why now.** Two things changed. Agents can now carry a report all the way from triage to a reviewed fix, so the cost of getting complete, structured evidence to an agent pays off immediately. And apps are embedding assistants that take actions, which creates failures that only the conversation record can explain.

## 2. Vision

A user who hits a problem says "this happened" — by tapping **!** or by telling the in-app assistant — and that is all they have to do. The app has already kept a short, local record of what happened, with every call tied together by a Breadcrumb trail. The user sees exactly what will be sent, removes anything they don't want to share, and sends it. Private data is stripped before anything leaves the device.

A Claude Code agent picks the report up, follows the Breadcrumb trail into the code, reproduces the failure in a sandbox, proposes a fix as a draft pull request for a person to review, and keeps the user informed in plain language at each step: received, looking into it, fix on the way, fixed. When it's fixed, the user is asked whether it works for them, and their answer closes or reopens the report.

When the user doesn't know how to do something, they ask "how do I…?" and the assistant either shows them (highlighting each control in turn) or does it for them (visibly, with confirmation before anything changes and an undo afterward).

Human-friendly on the front, agent-friendly on the back: the user never writes a bug report, and the agent never has to ask "can you reproduce it?"

## 3. Target users and personas

| Persona | Who they are | What they need | What they must never experience |
|---|---|---|---|
| **P1 — App end-user ("reporter")** | Someone using an app that embeds This Happened! (in the prototype, Maya Lin using the invoicing app Tallyho). Not technical. Busy. Usually annoyed at the moment they report. | Report in one or two taps; never be asked for steps to reproduce; know what is being shared; hear back in plain words; know when it's fixed. | Private data leaving without their say-so; jargon; silence after reporting; being asked to repeat what the system already captured. |
| **P2 — App team (developer, support, product owner)** | The team that builds and runs the host app. They install the SDK, connect their repo, and own what ships. | Complete, structured, redacted reports; a queue that triages itself; draft fixes they can review; control over what the agent may do; trust that the privacy rules hold. | An agent that merges, deploys, or contacts users on its own; reports with private data in them; noise (duplicates, low-quality reports) they must sort by hand. |
| **P3 — The fixing agent (Claude Code)** | A Claude Code session working on behalf of P2, with access to the redacted bundle, the Breadcrumb trail, and the host app's code. | A machine-parseable bundle with a stable schema; trail IDs that map to logs and code; a sandbox to reproduce in; clear, enforced permissions; a way to ask the reporter one question when evidence is missing. | Ambiguous permissions; evidence it isn't allowed to see turning up anyway; pressure to claim certainty it doesn't have. |
| **P4 — The embedded assistant** (actor, not a buyer) | The host app's in-app assistant. It can notice that something went wrong in a conversation and offer to file a report, and it answers "How do I". | A way to assemble a report from the conversation and offer it to the user; a way to drive Show me / Do it for me within limits the app team sets. | Filing anything without the user's consent; acting without confirmation. |

**Open question:** Is P2 a single team per host app, or should Rev 1 support a support tier separate from developers (for example, support sees reports and talks to users; developers see code and PRs)? **Recommendation:** single team with one role in Rev 1; add roles later.

**Open question:** Is the first P2 an external adopter, or The Agency itself dogfooding on one of its own apps? **Recommendation:** dogfood first on a real Agency-owned web app, then one design-partner adopter.

## 4. Scope

### 4.1 What ships (Rev 1 scope)

1. **Capture SDK (browser)** — runs inside the host web app. Keeps a bounded, local rolling record of recent screen state, user steps, network calls with Breadcrumb IDs, app log, assistant conversation and tool calls, feature flags, and browser/app version. Nothing is transmitted until the user sends a report.
2. **Report surfaces** — the **!** control and the review-and-send drawer; the assistant-initiated "Want me to report this?" offer; "My reports" for tracking.
3. **This Happened! service (NestJS)** — receives bundles, stores reports, runs server-side redaction, exposes the agent queue, relays status and messages between agent and reporter.
4. **Agent integration** — a Claude Code entry point (the prototype names it `/this-happened next`) that claims the next report, triages with Claude, reproduces in a sandbox, opens a draft PR, and posts plain-language status updates.
5. **App team console (Next.js)** — queue, report detail, Breadcrumb trail view, agent session log, permissions and redaction settings, approval of fixes.
6. **How Do I (mock level)** — the **?** control, guide answers, Show me (spotlight walkthrough), Do it for me (visible agent cursor, confirm, undo). Rev 1 ships this at prototype/mock fidelity per D7, not as a production capability.

**Open question:** D7 asked for a mock in the prototype; it did not say How Do I is in Rev 1 product scope at all. Is How Do I (even at mock fidelity) a Rev 1 deliverable of the product, or only a prototype demonstration until reviewed? **Recommendation:** keep it in Rev 1 only as the demo-app mock (no production commitment), and decide product scope with PVR open question 16 after the mock is reviewed.

### 4.2 Breadcrumb's role

Breadcrumb is the trace library in the `breadcrumb` workstream (D1). In this product it does four jobs:

1. **Every hop gets a UUID7.** A user action creates a UUID7; each call it triggers across a service boundary adds its own UUID7 and records its parent. UUID7 is time-ordered, so sequence can be reconstructed without clock sync.
2. **IDs travel with the call** (in the prototype, an `X-Breadcrumb` header) and are written into logs at every level.
3. **The report carries the trail.** The bundle includes the trail of each failed call (`id`, `parent`, `service`, and timing/status), so a report links directly to the exact call chain that failed.
4. **The agent follows the trail** from the user's moment to the deepest failing hop, then to that service's logs and code.

Breadcrumb must be usable on its own (retrofit at an API gateway for existing systems) and must not require This Happened!. This Happened! requires Breadcrumb for full value but must still accept a report with no trail (for example, when the user excluded network calls).

**Open question:** Should Breadcrumb interoperate with W3C Trace Context / OpenTelemetry (map UUID7 hop IDs into or alongside `traceparent`), so adopters who already run OTel don't run two tracing systems? **Recommendation:** yes — carry Breadcrumb IDs alongside `traceparent` and offer an OTel span attribute mapping; don't replace OTel.

**Open question:** Does Breadcrumb get its own PVR, or is this PVR sufficient for both workstreams? **Recommendation:** this PVR covers Breadcrumb's requirements as they serve This Happened! (FR-BC below); a short Breadcrumb-only PVR follows if it is offered as a standalone library.

### 4.3 Non-goals (Rev 1)

- **General-purpose APM or observability.** No dashboards of latency percentiles, no alerting, no metrics store. Breadcrumb is a trace-ID pattern, not a tracing backend.
- **Product analytics or session replay.** The capture buffer exists only to support a report the user chooses to send. It is not uploaded continuously and is not used for analytics.
- **Autonomous merge or deploy.** The agent never merges or deploys. A person approves every fix.
- **Agent-initiated contact with users** outside the report thread.
- **Replacing the host app's support desk.** Reports can be handed to a person; integrations with ticketing tools are later.
- **Production-grade How Do I.** Rev 1 is a mock that demonstrates the idea (D7).

**Open question:** Is native mobile (iOS/Android) out of scope for Rev 1? (The captain handoff suggested "web-first; mobile phase 2+.") **Recommendation:** yes, web only in Rev 1; design the bundle schema so a mobile SDK can produce it later.

**Open question:** Is user sign-in/identity handled by the host app (This Happened! receives an opaque reporter ID), or does This Happened! run its own auth for reporters? (The handoff suggested "use Supabase starter" for SSO/auth.) **Recommendation:** host app owns reporter identity and passes a signed, opaque reporter ID; This Happened! runs auth only for the app team console. Auth provider is an A&D decision.

**Open question:** Is retrofit for existing (brownfield) apps in Rev 1, or greenfield only? **Recommendation:** greenfield-first for the canonical experience; Breadcrumb gateway retrofit documented but not a Rev 1 acceptance criterion.

## 5. Use cases and user journeys

### J1 — Report via the **!** button (P1)

1. Maya tries to export March invoices. Tallyho shows "Something went wrong."
2. She taps **!** in the app bar.
3. A drawer opens: "We saved what was on screen and what Tallyho was doing just now. Check it, add a note if you like, and send." It lists the evidence in numbered items (Screen, Your recent steps, Calls and their trails, App log, Assistant conversation, Feature flags, Browser and app version), each with a one-line summary, a checkbox, and an expandable preview of exactly what will be sent.
4. A line under the list says what was removed ("Removed before sending: sign-in token (2×), email address (3×). Nothing leaves your browser until you tap Send.").
5. She unticks anything she doesn't want to share, optionally types a note, and taps **Send**. Or she cancels and nothing is sent.
6. She sees confirmation and a link to the report in My reports. First status: "We got your report and everything we need with it. You don't need to send anything else."

### J2 — Report via the assistant (P1, P4)

1. Maya asks the assistant to export March invoices and email them to her accountant. The assistant calls `invoices.list` (ok) and `pdf.export` (504 after 30 s).
2. Today's failure: the assistant says "Done!" anyway. (This is the demo bug; This Happened! must catch it, not cause it.)
3. Maya says "It never arrived." The assistant recognises a complaint, apologises honestly, and offers: "Want me to report this?", listing what it will include.
4. "Review and send" opens the same drawer as J1, with the conversation and tool calls included and a pre-filled note she can edit. Same consent, same redaction, same Send.
5. "Not now" removes the offer and reminds her that **!** is always available.

**Open question:** Should the assistant proactively offer a report when it detects a failed tool call, before the user complains? **Recommendation:** yes, but only as an offer in the conversation, at most once per failure, and never auto-sent; in Rev 1, require the user to say something first only if the app team turns proactive offers off.

### J3 — Track my reports (P1)

1. My reports lists each report with a short plain-language title, filed date, and status: **Received → Looking into it → Fix on the way → Fixed**.
2. A badge shows unseen updates.
3. Each report shows an update timeline written for the user ("We found it. The part of Tallyho that builds PDFs gives up on exports over about 20 invoices.").
4. If the agent needs information, the report shows one question with a reply box. Her answer goes back to the agent.
5. When status is Fixed, she is asked "Did the fix work for you?" — **Yes, it works** closes the report; **No** reopens it and an agent takes another look.

### J4 — Agent triage → reproduce → fix → verify (P3, P2)

1. **First read (Claude, automatic on receipt):** from the redacted bundle alone, the service writes a first read: a title, what the user saw, a summary, the likely causes with each cause citing the numbered evidence it rests on, a confidence level with a reason, and suggested next steps. Status becomes "Looking into it" and the user gets a plain-language update. (This assumes open question 13 is answered "automatic on receipt".)
2. **Claim:** the agent runs `/this-happened next` (or is dispatched) and claims the oldest claimable report: one that has a first read, or one whose automatic first read failed. For a failed one, the agent writes the first read itself in its session before going on. Reports still waiting for their automatic first read are not claimable. If open question 13 is answered "only on agent pull", step 1 moves into the agent session and the agent claims received reports directly.
3. **Follow the trail:** from the deepest failing Breadcrumb hop to that service's logs and code paths.
4. **Ask, if needed:** if evidence is insufficient, it asks the reporter at most one question through the report, then waits.
5. **Reproduce:** runs the repro in a sandbox and records the result.
6. **Fix:** opens a draft PR linked to the report. Status becomes "Fix on the way" with a plain-language explanation.
7. **Review:** a person on the app team reviews and merges (the agent cannot). After deploy, status becomes "Fixed".
8. **Verify:** the reporter confirms or reopens. A reopen returns the report to the queue with the reporter's answer attached.
9. **Hand off:** if the agent can't diagnose or the problem is outside its permissions, it hands the report to a person and tells the reporter so.

### J5 — How Do I (P1, P4) — mock fidelity in Rev 1

1. Maya taps **?** ("How do I…? Ask the assistant") or types "how do I mark an invoice paid?".
2. The assistant answers with short numbered steps and two buttons: **Show me** and **Do it for me**.
3. **Show me:** a spotlight walkthrough highlights each control in order, with a caption per step; she can step forward/back or exit.
4. **Do it for me:** a visible agent cursor moves to each control. Before any change to data, the assistant asks her to confirm. After the change, an **Undo** is offered.
5. If no guide exists: "I don't have a guide for that yet. I've passed the question on, so the team knows people are asking." The unanswered question is recorded for the app team.
6. If Do it for me fails, the assistant says so honestly and offers to report it (J2).

### J6 — App team review (P2)

1. The team opens the console queue: report key, title, filed time, origin (! or assistant), status.
2. Report detail shows the agent's first read, the Breadcrumb trail, trail-to-code paths, the agent session log, the full redacted bundle (copyable JSON), and the agent's permissions (Can / Can't).
3. They approve or reject the draft PR, take over the report, or answer on the agent's behalf.

## 6. Functional requirements

Each requirement is written to be testable. "MUST" is required for Rev 1; "SHOULD" is required unless the A&D documents why not.

### 6.1 Capture (FR-CAP)

- **FR-CAP-1** The SDK MUST keep a local rolling record of the last N minutes (default 5) of: screen state, user steps, network calls (including calls still in flight at snapshot time, marked as pending — the seed lists "in-flight API calls"), app log, assistant conversation and tool calls, active feature flags, and browser/app version.
- **FR-CAP-2** The record MUST be bounded by both time and count (defaults: 15 steps, 10 calls, 30 log lines, 20 conversation messages) so memory use is capped regardless of session length.
- **FR-CAP-3** The record MUST stay in the browser until the user sends a report. No part of it is transmitted otherwise.
- **FR-CAP-4** Opening the report drawer MUST freeze a snapshot of the record at that moment, so later activity does not change what is reviewed.
- **FR-CAP-5** "Screen" MUST be captured as structured state (route, heading, filters, visible message/toast, viewport), not a pixel screenshot, in Rev 1.
- **FR-CAP-6** Each captured network call MUST carry its Breadcrumb trail (hop IDs, parent links, service names, status, duration).
- **FR-CAP-7** The SDK MUST expose an API for the host app to add structured events and to declare additional fields as sensitive.

**Open question:** Should Rev 1 offer a pixel screenshot (masked) in addition to structured screen state? **Recommendation:** no; structured state only. Screenshots are the hardest thing to redact reliably.

**Open question:** Is 5 minutes the right default window? **Recommendation:** 5 minutes, configurable per app from 1 to 15.

**Open question:** Which device fields are captured? The seed lists "device state (memory, network, OS version, app version)"; FR-CAP-1 says only browser/app version; the prototype (and A&D §2.3) also capture language, timezone and online state. Language and timezone are quasi-identifiers; device memory is a known fingerprinting signal. **Recommendation:** browser, OS, app version, online/connection type, language; timezone only as a UTC offset; no device memory in Rev 1. Record the final list here so the A&D's `device` collector traces to it.

### 6.2 Review and consent (FR-CON)

- **FR-CON-1** Sending a report MUST require an explicit Send action by the reporter, every time. There is no "always send" setting in Rev 1.
- **FR-CON-2** The drawer MUST list every evidence category present, with a one-line summary and a preview of the exact (post-redaction) data to be sent.
- **FR-CON-3** The reporter MUST be able to exclude any category; excluded categories MUST NOT appear in the transmitted bundle.
- **FR-CON-4** The drawer MUST state what redaction removed, by type and count, and update live as categories or the note change.
- **FR-CON-5** Cancel MUST discard the snapshot; nothing is transmitted.
- **FR-CON-6** Assistant-initiated reports (J2) MUST go through the same drawer and the same Send action. The assistant MUST NOT be able to send a report itself.
- **FR-CON-7** The reporter MAY add a free-text note; it is redacted by the same rules as everything else.

**Open question:** Should the drawer tell the reporter that an AI model (Claude, a third-party processor) will read the report? Nothing in J1/J2 discloses it, and transparency obligations (PVR open question 19, GDPR) likely require it. **Recommendation:** yes — one plain line in the drawer ("An AI assistant will read this to work out what went wrong") plus host privacy-policy copy shipped with the SDK.

**Open question:** Evidence can contain other people's personal data that the reporter cannot consent for (e.g., the host app's customers' names and addresses on screen, in tool results, or in the conversation). The PR-2 baseline does not redact names or postal addresses. Is that acceptable for Rev 1? **Recommendation:** treat third-party personal data as a host-declared sensitive field (FR-CAP-7) and require the host to declare such fields at integration; document the residual risk.

### 6.3 Bundle (FR-BUN)

- **FR-BUN-1** The bundle MUST follow a versioned schema (prototype: `this-happened/report@0.2`) with: `schema`, `report_id` (UUID7), `filed_at`, `filed_from` (button or assistant), `reporter` (redacted/opaque), `app`, `note`, `breadcrumbs`, `window`, `evidence{…}`.
- **FR-BUN-2** The schema MUST be published (JSON Schema) and validated on receipt; invalid bundles are rejected with an error the SDK can surface.
- **FR-BUN-3** Every cause the agent cites MUST be able to reference evidence by its number/key.

### 6.4 Breadcrumb (FR-BC)

- **FR-BC-1** Breadcrumb MUST generate RFC 9562 UUIDv7 IDs for every hop.
- **FR-BC-2** Breadcrumb MUST propagate the current ID across HTTP boundaries via a header and record the parent ID at each receiving service.
- **FR-BC-3** Breadcrumb MUST make the current ID available to the host's logger so every log line can carry it.
- **FR-BC-4** Given a set of hops, it MUST be possible to reconstruct the parent/child tree and order without a central clock.
- **FR-BC-5** Breadcrumb MUST work without This Happened! installed.
- **FR-BC-6** Breadcrumb SHOULD provide adapters for the browser (fetch/XHR) and NestJS (middleware/interceptor) in Rev 1.

### 6.5 Reports and tracking (FR-TRK)

- **FR-TRK-1** Each report MUST get a human-readable key (prototype: `TH-0007`) and a status from the fixed set: Received, Looking into it, Fix on the way, Fixed (plus internal states: awaiting reporter, handed to a person, reopened).
- **FR-TRK-2** Every status change MUST produce a plain-language update visible to the reporter in My reports.
- **FR-TRK-3** My reports MUST show unseen-update counts.
- **FR-TRK-4** The reporter MUST be able to answer an agent question in the report and confirm or reject a fix.
- **FR-TRK-5** Rejecting a fix MUST reopen the report and return it to the agent queue with the rejection attached.
- **FR-TRK-6** The reporter MUST be able to see the bundle they sent.
- **FR-TRK-7** The reporter MUST be able to delete a report; deletion removes the bundle from storage (see PR-8).

**Open question:** Should the reporter be notified outside the app (email/push) when status changes? **Recommendation:** in-app only in Rev 1; email notification as an app-team-configurable option later.

**Open question:** The status set has no ending other than Fixed. What does the reporter see when a report is closed without a fix — not a bug (user needed How Do I), won't fix, cannot reproduce, or closed as a duplicate of a report that was fixed? SM-11 measures "cannot reproduce" closures, but no such state exists. **Recommendation:** add one reporter-visible terminal status, **Closed**, with a required plain-language reason chosen by a person (agents may propose, not close), and record the internal reason (`not_a_bug`, `wont_fix`, `cannot_reproduce`, `duplicate`) for SM-11.

**Open question:** What happens to reports that stall — a question the reporter never answers, or a Fixed report the reporter never confirms? Retention (PR-8) counts from close, so a never-confirmed report is never deleted. **Recommendation:** an unanswered question returns the report to the queue after 7 days; an unconfirmed Fixed report auto-closes after 14 days; both configurable.

### 6.6 Agent queue and triage (FR-TRI)

- **FR-TRI-1** The service MUST expose a queue the agent can claim from, with at-most-one active claim per report.
- **FR-TRI-2** Triage MUST be performed by Claude (D6, pending ratification) reading the redacted bundle, and MUST produce: title, what the user saw, summary, causes (each with evidence references), confidence (High/Medium/Low) with a one-line reason, and suggested next steps.
- **FR-TRI-3** Triage output MUST be structured (validated against a schema) so the console and the user-facing text can be generated from it.
- **FR-TRI-4** The agent MUST generate the reporter-facing update text separately from the technical summary, in plain language, with no internal service names or IDs. Reporter-facing text written by a model (updates and questions) MUST NOT contain links, phone numbers, email addresses, or requests for credentials, codes or payment details; text that does is replaced by a fixed template before the reporter sees it.
- **FR-TRI-5** When evidence is insufficient, the agent MUST ask at most one question per triage pass, through the report.
- **FR-TRI-6** If triage fails (model error, timeout, schema-invalid output), the report MUST remain in the queue with an error recorded; no fabricated diagnosis is shown.
- **FR-TRI-7** The agent SHOULD detect likely duplicates (same failing hop/service and signature) and link them, without merging reports. Only open reports are duplicate candidates, and triage never sets a status beyond "Looking into it" (Fixed comes only from FR-FIX-4). *Proposed (2026-10-13, from the prototype; open questions 37–39):* reports marked Fixed are also candidates, but a link to one never makes the new report Fixed: it stays at "Looking into it" and goes to a person ("may already be fixed"). The person either confirms it is the same problem (this report alone becomes Fixed, under FR-FIX-4) or says it is not the same. A "not the same" decision is permanent for that pair, in both directions, unless a person undoes it: neither the agent nor triage offers or links the pair again. The same holds when a reporter says a fix confirmed this way did not work.
- **FR-TRI-8** The agent MUST check its own tool results before reporting success (the failure mode in J2 must not be reproduced by the fixing agent).

**Open question:** Where does the agent run — the app team's own Claude Code session against their repo, or an Agency-hosted agent with repo access? **Recommendation:** Rev 1 runs in the app team's Claude Code (a skill/command plus the service API); a hosted runner is a later option.

**Open question:** Is triage automatic on receipt, or only when an agent session runs `/this-happened next`? **Recommendation:** automatic first-read triage on receipt (fast first status for the reporter); reproduce/fix only in an agent session.

**Open question:** Should triage also assign severity/category, and should the queue be ordered by it? FR-TRI-1 and J4 imply first-in-first-out ("oldest claimable"); the prototype's live triage (2026-10-13) outputs `severity`, `category`, a numeric 0–1 confidence, `code_locations`, `proposed_fix` and `test_plan`, which differ from FR-TRI-2 (High/Medium/Low, no severity). **Recommendation:** add severity (low…critical) to FR-TRI-2 and order the queue by severity then age; keep High/Medium/Low confidence for reporter-facing and console display; drop `code_locations`/`proposed_fix` from receipt-time triage, because that call has no code access and would be guessing (they belong to the agent session).

### 6.7 Reproduce, fix, verify (FR-FIX)

- **FR-FIX-1** The agent MUST attempt a reproduction in a sandbox, not in production, and record the result (reproduced / not reproduced / not attempted, with reason).
- **FR-FIX-2** A fix MUST be proposed as a draft PR linked to the report key and citing the Breadcrumb hop and evidence used.
- **FR-FIX-3** The agent MUST NOT merge, deploy, or approve its own PR.
- **FR-FIX-4** Status "Fixed" MUST be set only after a person merges and the fix is deployed. *Proposed (2026-10-13, from the prototype):* a person on the app team who confirms that a report is a duplicate of a report whose fix is already deployed counts as "a person" here; that sets Fixed for the confirmed report only, the reporter is told a person checked, and the report records which Fixed report it was confirmed with. If that reporter says the fix did not work, the report reopens and the pair is recorded as not the same problem (FR-TRI-7). The agent and triage never set Fixed this way.
- **FR-FIX-5** A fix SHOULD include a regression test (or, for assistant failures, an eval case) reproducing the reported failure.
- **FR-FIX-6** The agent MUST be able to hand the report to a person, with a reason, at any step.

**Open question:** How does the service learn a fix is deployed (PR merged + deploy webhook vs a person marking it)? **Recommendation:** PR merge webhook moves to "Fix merged"; a deploy signal or a person sets "Fixed". A&D to decide mechanism.

**Open question:** Should reports already marked Fixed be duplicate candidates (FR-TRI-7 today says open reports only)? The prototype (2026-10-13) links them and hands the new report to a person. **Recommendation:** yes. A problem that comes back after a fix is the most useful duplicate to catch, and the person gate keeps the agent from saying "fixed" (Risks, row 1).

**Open question:** When a person confirms a report is fixed along with a Fixed report, should that also move other open reports linked to the same Fixed report? **Recommendation:** no, as the prototype does: only the report the person checked. Each other report waits for its own check.

**Open question:** Who can undo a "not the same" decision, and how? **Recommendation:** only a person, from the console, with an audit entry; never the agent or triage.

### 6.8 Agent permissions (FR-PERM)

- **FR-PERM-1** The agent's permissions MUST be explicit, shown in the console, and enforced by the service, not by prompt instructions alone.
- **FR-PERM-2** Default Can: read the redacted bundle; follow the trail into code; run the repro in a sandbox; update status and write to the reporter through the report; open a draft PR.
- **FR-PERM-3** Default Can't: see anything removed before sending; contact the reporter outside the report; merge or deploy.
- **FR-PERM-4** The app team MAY narrow permissions; widening beyond the defaults is out of scope for Rev 1.

### 6.9 How Do I (FR-HDI) — mock fidelity (D7)

- **FR-HDI-1** The **?** control MUST open the assistant in How Do I mode with suggested questions.
- **FR-HDI-2** Answers MUST give numbered steps and offer Show me and Do it for me where a guide exists.
- **FR-HDI-3** Show me MUST highlight each referenced control in order with a caption, and allow next/back/exit.
- **FR-HDI-4** Do it for me MUST show a visible agent cursor, MUST ask for confirmation before any data-changing step, and MUST offer Undo after.
- **FR-HDI-5** Unanswered questions MUST be recorded for the app team.
- **FR-HDI-6** Actions taken by Do it for me MUST appear in the capture record attributed to the assistant, so a later report shows them.

**Open question:** Where do How Do I guides come from in a real product — authored by the app team, generated by Claude from the app's UI and docs, or both? **Recommendation:** decide after the mock is reviewed; Rev 1 uses hand-authored guides for two or three tasks.

**Open question:** Is How Do I part of the This Happened! product, or a separate product that shares the assistant and capture SDK? **Recommendation:** keep it in this repo and PVR as a companion surface for now; revisit after the mock.

### 6.10 App team console (FR-ADM)

- **FR-ADM-1** Queue view with key, title, filed time, origin, status; selectable rows.
- **FR-ADM-2** Report detail: first read, Breadcrumb trail, trail-to-code, agent session log, redacted bundle (copy as JSON), permissions.
- **FR-ADM-3** Settings: capture window and limits, evidence categories enabled, custom redaction rules, agent permissions, proactive-offer toggle.
- **FR-ADM-4** Audit log of every agent action and every human approval.

### 6.11 Integration (FR-INT)

- **FR-INT-1** A host web app MUST be able to add capture, the **!** control, and My reports with an SDK install plus a small amount of configuration (A&D to specify). Verifiable: the integration steps are documented, and the demo host app integrates using only those documented steps.
- **FR-INT-2** The SDK MUST expose hooks for the host's embedded assistant to (a) log conversation and tool calls into the capture record and (b) open the report drawer with a pre-filled note.
- **FR-INT-3** Backend services MUST be able to adopt Breadcrumb independently of the SDK (FR-BC-5).

## 7. Consent, redaction, and privacy requirements (PR)

- **PR-1 Local until Send.** Captured data MUST NOT leave the device before the reporter taps Send (verifiable: no network traffic to the service before Send).
- **PR-2 Client-side redaction first.** Redaction MUST run in the browser before transmission. Rev 1 baseline: auth tokens/credentials (e.g., `Bearer …`, cookies, API keys), email addresses (masked), password and payment-card fields (never captured at all), plus app-declared sensitive fields. The same redaction MUST run on How Do I questions and on the reporter's answers to agent questions before they reach a model or storage.
- **PR-3 Server-side second pass.** The service MUST re-run redaction on receipt and reject or scrub anything the client missed, recording what it scrubbed.
- **PR-4 What you see is what is sent.** The drawer preview MUST be the post-redaction data. A test MUST show the preview and the transmitted bundle are identical.
- **PR-5 Agent sees only the redacted bundle.** No unredacted copy is stored or reachable by the agent.
- **PR-6 Input values.** Text the user typed into form fields MUST NOT be captured by default; the app may opt specific non-sensitive fields in.
- **PR-7 Assistant conversations.** Conversation content is included only if the reporter leaves it ticked; the same redaction applies.
- **PR-8 Retention and deletion.** Reports MUST have a configurable retention period; the reporter can delete their report; deletion removes bundle and attachments from primary storage.
- **PR-9 Access control.** Only the host app's team and its authorised agent can read that app's reports. Reports are isolated per host app (tenant).
- **PR-10 Audit.** Every read of a bundle by a person or agent MUST be logged.
- **PR-11 Model data handling.** Bundles sent to Claude for triage MUST be sent under terms that do not allow training on them. The same applies to every other path by which report data reaches a model: How Do I questions (if classified by Claude), and the fixing agent's Claude Code session, which runs under the app team's own Claude Code account and terms, not the service's. **Open question:** confirm the API/data-retention terms required (e.g., zero data retention) for Rev 1. **Recommendation:** use standard API terms (no training) in Rev 1; offer zero-retention as an enterprise option.
- **PR-12 Do it for me.** Data-changing actions require reporter confirmation and are undoable; the assistant cannot act outside the controls a guide names.

**Open question:** Default retention period? **Recommendation:** 90 days after a report closes, configurable.

**Open question:** Report data leaves the service's storage in three places PR-8 does not reach: the bundle copy the agent writes to the developer's machine, the agent's Claude Code session transcript, and regression tests/fixtures (FR-FIX-5) and PR text committed to the host repo, where git history makes deletion impractical. Does reporter deletion (FR-TRK-7) need to reach these? **Recommendation:** local copies are deleted when the claim ends; regression tests and PR text MUST use synthetic values, not the reporter's data (agent instruction plus a redaction-ruleset check on the PR diff); state in the deletion promise that already-merged code is not covered.

**Open question:** Retention of How Do I questions (FR-HDI-5) — they are stored for the app team but no retention rule covers them. **Recommendation:** same retention as reports, and stored without reporter identity.

**Open question:** Which regulatory regimes must Rev 1 meet (GDPR, CCPA; SOC 2 later)? **Recommendation:** design to GDPR (consent per send, deletion, data minimisation) from Rev 1; no certification target in Rev 1.

## 8. Non-functional requirements (NFR)

- **NFR-1 Capture cost.** Opening the drawer (snapshot + redaction preview) SHOULD take under 50 ms on the NFR-1 reference profile (open question below) for default buffer sizes. The prototype shows a capture time, but it is an indicator, not the NFR-1 benchmark.
- **NFR-2 Host app impact.** The SDK SHOULD add under 50 KB gzipped to the host bundle and under 1 ms per captured event on the main thread.
- **NFR-3 Bounded memory.** Buffer memory MUST stay under a fixed cap (target 2 MB) regardless of session length.
- **NFR-4 First update latency.** The reporter SHOULD see the first triage-based status ("Looking into it" or a question) within 2 minutes of sending (p90), when automatic triage is on.
- **NFR-5 Delivery.** A sent report MUST NOT be lost silently: if offline, the SDK queues it and retries (the A&D sets the retry window); the reporter sees "will send when you're back online." If delivery is finally abandoned, the reporter MUST be told it was not sent. A queued report MUST be sent only under the identity of the reporter who sent it (shared-device case).
- **NFR-6 Availability.** Report intake SHOULD be 99.9% available; triage may lag but intake must not.
- **NFR-7 Accessibility.** All reporter surfaces (drawer, My reports, assistant, Show me) MUST meet WCAG 2.2 AA, including keyboard operation and screen-reader labels; Show me and the agent cursor must not rely on motion alone and must respect reduced-motion settings.
- **NFR-8 Plain language.** Reporter-facing text MUST avoid internal jargon (service names, IDs, HTTP codes). Reviewable via a checklist and an automated eval on generated updates.
- **NFR-9 Honesty.** Agent and assistant text MUST NOT claim success that tool results don't support (eval-tested).
- **NFR-10 Security.** All transport TLS; tenant isolation; secrets never in bundles (PR-2/3); agent credentials scoped per FR-PERM.
- **NFR-11 Browser support.** Current and previous major versions of Chrome, Edge, Firefox, Safari.
- **NFR-12 Responsive.** Reporter surfaces work at phone width (≥ 320 px) in a web app.
- **NFR-13 Ordering.** Report and hop IDs are UUIDv7 so reports and trails sort by time without a central clock.
- **NFR-14 Internationalisation.** Reporter-facing strings externalised; Rev 1 ships English only.

**Open question:** NFR-1 says "under 50 ms" but names no machine; "mid-range laptop" and "throttled CPU profile" are not reproducible. What is the NFR-1 reference profile? **Recommendation:** Chrome stable in headless mode with DevTools CPU throttling at 4× slowdown, on the CI runner, running the A&D §14.5 fixture: the default buffer filled to its count limits (15 steps, 10 calls with trails, 30 log lines, 20 conversation messages), with entry sizes taken from the prototype's export-timeout scenario. Pass = p95 of 50 runs under 50 ms. The A&D §14.5 uses the same wording.

**Open question:** The seed's design principles call for whimsical branding ("we have the kittens, we have the voice") alongside plain language. This PVR has plain-language requirements (NFR-8) but no voice/branding requirement, and the reporter UI sits inside someone else's app. **Recommendation:** whimsy lives in the product name, the **!** control and The Agency's own surfaces (console, docs); reporter-facing text in host apps follows the host's voice and NFR-8, with host-overridable copy.

## 9. Constraints

- **Stack (D5):** NestJS backend, React + Next.js frontend, real running applications. Scaffolding via the framework's SPEC:PROVIDER starter packs (`/service-add`, `/ui-add`).
- **License (D3):** Reference Source on both workstreams, separate LICENSE files.
- **Repo shape (D1):** one repo, two workstreams (`this-happened`, `breadcrumb`); no third workstream without principal sign-off.
- **Process (D2):** PVR → A&D → Plan → iteration; MAR at each transition.
- **Triage model (D6, prototype direction pending ratification):** Claude.
- **Framework conventions:** commits via framework skills; Python tooling 3.13+ stdlib-only where framework tools are involved; Node 18+.
- **Prototype as input:** the prototype (`agency/workstreams/this-happened/prototypes/this-happened.html`, copied from opus-5-5-build-day on 2026-10-13) is a single-file HTML demo with a simulated backend and a fictional host app (Tallyho). Its behaviour is a requirements input, not an architecture.

**Open question:** Hosting/deployment target (handoff suggested Vercel for Next.js; backend unspecified). **Recommendation:** leave to A&D; not a PVR constraint.

**Open question:** Is This Happened! offered as a hosted service, as self-hostable software, or both, given the Reference Source license? **Recommendation:** self-hostable reference implementation first (matches Reference Source), hosted later.

**Open question:** Timeline. No date has been set for Rev 1. **Recommendation:** set after the Plan is drafted.

**Open question:** Distribution model. The seed says "ship as part of the framework or as standalone packages"; the 1B1 transcript lists distribution as a downstream decision not yet made. The A&D proposes publishing `@breadcrumb/*` and `@this-happened/*` to npm. Is public npm publication compatible with the Reference Source license (D3), and are these packages also shipped with The Agency framework? **Recommendation:** publish to npm under the Reference Source license text (source-available, not open source), and not bundle into the framework until the license question in the Risks table is revisited.

## 10. Success criteria and metrics (SM)

Targets are proposals; each is an open question until the principal confirms.

| ID | Metric | Proposed Rev 1 target |
|---|---|---|
| SM-1 | Time from **!** tap to Send (median) | < 30 s |
| SM-2 | Share of drawers opened that end in Send | > 60% (lower suggests consent friction or distrust). **Blocked:** measurable only if A&D OQ-A11 allows a count-only "drawer opened/cancelled" signal before Send. |
| SM-3 | First-update latency | Not a separate target: tracks NFR-4 (p90 < 2 min from Send to the first reporter-visible triage update) as a product metric. |
| SM-4 | Reports triaged with no question to the reporter | ≥ 70% |
| SM-5 | Agent first-read cause later confirmed correct by the reviewing person | ≥ 70% |
| SM-6 | Reports with a reproduction recorded (reproduced or explained not) | ≥ 80% |
| SM-7 | Draft PRs accepted (merged, possibly with edits) | ≥ 50% |
| SM-8 | Fixes confirmed by the reporter ("Yes, it works") among those who answer | ≥ 80%; reopen rate < 15% |
| SM-9 | Privacy leaks: credentials or unredacted PII found in stored bundles (by scan/audit) | 0 |
| SM-10 | How Do I (mock): reviewers can explain Show me vs Do it for me after one walkthrough | Pass rule in the protocol below; principal signs off on the result |
| SM-11 | "Cannot reproduce" closures, compared with a baseline | down by half; baseline is an open question (below) |

**SM-10 walkthrough protocol.** Five reviewers who have not seen How Do I (at least three if five are not available) each watch one scripted walkthrough of the demo app: the question "how do I mark an invoice paid?", one Show me run and one Do it for me run with its confirm and Undo, about 5 minutes. Straight after, each is asked, unprompted, "What is the difference between Show me and Do it for me?" A reviewer passes if they say that Show me points out the steps for them to do, and Do it for me does the steps for them after asking to confirm. SM-10 passes if at least 4 of 5 reviewers pass (or all of them, when fewer than five). The answers are recorded, and the principal signs off on the result.

**Open question:** SM-11 needs a "cannot reproduce" baseline, and a greenfield dogfood app has no prior one. Use a fixed baseline of the first 4 weeks after dogfood launch (compared with weeks 5–12), or drop SM-11 for Rev 1? **Recommendation:** the fixed 4-week baseline. It needs the `cannot_reproduce` close reason from open question 28.

**Open question:** Confirm or replace the targets above. The handoff suggested "user taps → 30 s later support sees a structured report with trace, state, logs, screen capture" and "agent produces a diagnosis without asking the user for clarification"; SM-1/SM-3/SM-4 are this PVR's restatement of those. **Recommendation:** adopt as written for Rev 1 and recalibrate after dogfooding.

## 11. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Redaction misses private data (custom tokens, PII in free text or URLs) | Severe trust and legal harm | Client + server redaction (PR-2/3), structured screen state not screenshots, app-declared sensitive fields, leak-scan in CI and on stored bundles (SM-9), conservative defaults. |
| Users don't trust the drawer and cancel | Few reports; product fails at intake | Plain summaries, preview of exactly what's sent, visible "removed" list, per-category toggles; measure SM-2. |
| Agent diagnoses confidently and wrongly | Wasted review time; wrong fixes; misleading user updates | Evidence-cited causes, confidence with reason, human review of PRs, reporter confirmation step, eval set built from real reports. |
| Agent says "fixed" when it isn't (same class as the J2 bug) | Erodes trust in the whole loop | "Fixed" only after merge + deploy (FR-FIX-4), reporter verification, honesty evals (NFR-9, FR-TRI-8). |
| Over-permissioned agent | Security incident | Service-enforced permissions (FR-PERM-1), sandboxed repro, no merge/deploy, audit log. |
| Capture SDK slows or breaks the host app | Adopters remove it | Bounded buffers, performance budgets (NFR-1–3), SDK failure isolated from host. |
| Report flood / duplicates | Queue noise, cost | Duplicate linking (FR-TRI-7), per-user rate limits (A&D). |
| LLM cost per report | Unsustainable at volume | First-read triage is a single bounded call; deep work only in agent sessions; measure cost per report. |
| Breadcrumb competes with existing OTel tracing | Adoption friction | Interop rather than replacement (see 4.2 open question). |
| How Do I "Do it for me" changes the wrong thing | Data loss, user anger | Confirm before change, undo after, guide-scoped actions only (PR-12); mock-only in Rev 1. |
| Scope creep into APM/analytics/session replay | Delays, privacy creep | Non-goals (4.3). |
| Reference Source license limits adoption of Breadcrumb | Fewer adopters | D3 keeps licenses separable; revisit if adoption matters. |

## 12. Open questions (consolidated)

Each has a recommended answer in context above.

1. Single app-team role vs separate support/developer roles in Rev 1? (§3) — *Rec: single role.*
2. First adopter: Agency dogfood vs external? (§3) — *Rec: dogfood, then one design partner.*
3. Breadcrumb interop with W3C Trace Context / OpenTelemetry? (§4.2) — *Rec: yes, alongside, not replacing.*
4. Separate Breadcrumb PVR? (§4.2) — *Rec: only if offered standalone.*
5. Native mobile out of Rev 1? (§4.3) — *Rec: yes, web only.*
6. Reporter identity owned by host app vs This Happened! auth? (§4.3) — *Rec: host app; console auth via A&D.*
7. Brownfield retrofit in Rev 1? (§4.3) — *Rec: greenfield-first; retrofit documented only.*
8. Proactive assistant offers on detected tool failure? (J2) — *Rec: yes, offer only, never auto-send, toggleable.*
9. Masked screenshots in addition to structured screen state? (FR-CAP) — *Rec: no.*
10. Default capture window? (FR-CAP) — *Rec: 5 min, configurable 1–15.*
11. Out-of-app notifications to reporters? (FR-TRK) — *Rec: in-app only in Rev 1.*
12. Where the agent runs: app team's Claude Code vs hosted? (FR-TRI) — *Rec: app team's Claude Code.*
13. Automatic triage on receipt vs on agent pull? (FR-TRI) — *Rec: automatic first read on receipt.*
14. How "deployed / Fixed" is signalled? (FR-FIX) — *Rec: merge webhook + deploy signal or person; A&D decides.*
15. Source of How Do I guides in a real product? (FR-HDI) — *Rec: decide after mock review; hand-authored for Rev 1.*
16. How Do I as part of this product vs separate? (FR-HDI) — *Rec: keep here for now.*
17. Model data-handling terms (standard vs zero retention)? (PR-11) — *Rec: standard no-training terms; ZDR as option.*
18. Default retention period? (§7) — *Rec: 90 days after close.*
19. Regulatory target for Rev 1? (§7) — *Rec: GDPR-aligned design, no certification.*
20. Hosted vs self-hosted offering? (§9) — *Rec: self-hostable reference first.*
21. Rev 1 timeline? (§9) — *Rec: set after Plan.*
22. Confirm success-metric targets SM-1–SM-11? (§10) — *Rec: adopt, recalibrate after dogfood.*
23. ~~File naming~~ — *Resolved 2026-10-13:* renamed from `this-happened-pvr-20261013.md` to `pvr-this-happened-rev1-20261013.md` (the `/define` convention) on the quality gate's finding, so `/define`, `/design` and `/pre-phase-review` can find it. Number kept so later numbers stay stable.

Added by completeness review (2026-10-13):

24. Is How Do I a Rev 1 product deliverable, or a prototype demonstration only? (§4.1) — *Rec: demo-app mock only; decide with #16.*
25. Device fields captured (seed's memory/network vs prototype's language/timezone)? (FR-CAP) — *Rec: no device memory; timezone as UTC offset.*
26. Disclose AI processing in the drawer? (FR-CON) — *Rec: yes, one plain line + privacy-policy copy.*
27. Third-party personal data (host's customers) in evidence? (FR-CON) — *Rec: host declares such fields as sensitive; document residual risk.*
28. Reporter-visible ending for reports closed without a fix? (FR-TRK) — *Rec: add "Closed" with a person-chosen reason.*
29. Stalled reports (unanswered question, unconfirmed fix)? (FR-TRK) — *Rec: requeue after 7 days; auto-close after 14.*
30. Severity/category in triage and queue order; divergence from prototype triage schema? (FR-TRI) — *Rec: add severity; no code guesses at receipt.*
31. Report data outside service storage (agent machine, transcripts, committed tests/PRs)? (§7) — *Rec: synthetic test data; local copies deleted at claim end.*
32. Retention of How Do I questions? (§7) — *Rec: same as reports, no reporter identity.*
33. Whimsical branding vs host app voice? (§8) — *Rec: whimsy on Agency surfaces; host voice in host apps.*
34. Distribution model (npm, framework bundling) under Reference Source? (§9) — *Rec: npm under Reference Source; not in framework yet.*

Added by the quality gate (2026-10-13):

35. SM-11 baseline: fixed first-4-weeks baseline, or drop SM-11 for Rev 1? (§10) — *Rec: fixed 4-week baseline.*
36. NFR-1 reference profile? (§8) — *Rec: headless Chrome, 4× CPU throttle, CI runner, A&D §14.5 fixture at default count limits; p95 of 50 runs < 50 ms.*

Added from the prototype's duplicate handling (2026-10-13):

37. Reports marked Fixed as duplicate candidates, routed to a person? (FR-TRI-7) — *Rec: yes; a link never sets Fixed.*
38. Does a person's "confirm fixed" on one duplicate also move other linked open reports? (FR-FIX-4) — *Rec: no, only the report checked.*
39. Who can undo a "not the same" decision? (FR-TRI-7) — *Rec: a person in the console, audited; never the agent or triage.*

## 13. Completeness scorecard (per `/define` checklist)

```
PVR Completeness (Rev 1 draft):

1. Problem Statement       ✓ Complete
2. Target Users            ✓ Complete (2 open questions on roles/first adopter)
3. Use Cases               ✓ Complete (J1–J6)
4. Functional Requirements ✓ Complete (FR-CAP … FR-INT); How Do I at mock fidelity per D7
5. Non-Functional Reqs     ~ Partial (targets proposed, not confirmed; NFR-1 reference profile open, #36)
6. Constraints             ~ Partial (hosting model and timeline open; D6/D7 pending ratification)
7. Success Criteria        ~ Partial (targets proposed, not confirmed; SM-2 blocked on A&D OQ-A11; SM-11 baseline open, #35; SM-10 protocol defined)
8. Non-Goals               ✓ Complete (mobile and retrofit pending confirmation)
9. Open Questions          38 remaining (11 added by completeness review, 2 by the quality gate, 3 from the prototype's duplicate handling; #23 resolved)

Score: 6/9 complete, 3 partial — ready for principal comment and MAR.
```
