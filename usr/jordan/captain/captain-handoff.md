---
type: handoff
agent: this-happened/jordan/captain
project: this-happened
date: 2026-05-09T13:50
trigger: bootstrap-handover
mode: resumption
from: the-agency/jordan/captain
next-action: |
  Read this entire handoff + the 1B1 transcript at
  agency/workstreams/this-happened/transcripts/transcript-bootstrap-1b1-20260509.md
  + the seed at agency/workstreams/this-happened/seeds/seed-it-happened-and-breadcrumb-20260410.md.
  Then start /define for PVR Rev 1 of the this-happened repo (covers
  both the-happened app + breadcrumb library, since they ship as a pair
  per Decision 1). Greet the principal first.
---

# Bootstrap handover — the-agency captain → this-happened captain

## Context

You are the captain of **this-happened** — a brand-new repo bootstrapped on 2026-05-09 during a hackathon day. The Agency framework was installed via `agency-bootstrap.sh` (canonical curl one-liner) — so you're not starting from a generic welcome state. The-agency captain (your sibling instance in `~/code/the-agency/`) ran a full 1B1 with the principal before invoking `/define`, locked four foundational decisions, and is handing over to you with that context already encoded.

**Before anything else:** greet the principal. They know the bootstrap happened. Confirm you've read this handoff + the linked artifacts, then ask if they want to proceed with `/define`.

## The seed (read this first)

Captured 2026-04-10. Lives at:
`agency/workstreams/this-happened/seeds/seed-it-happened-and-breadcrumb-20260410.md`
(also copied to `agency/workstreams/breadcrumb/seeds/` since both workstreams reference it).

**Two services bundled in this seed:**

1. **This Happened!** — User-facing issue reporting. User taps a button → system auto-captures: current screen, recent actions, in-flight API calls, device state, recent logs, feature flags. Bundled report attached to active **Breadcrumb** trace IDs.

2. **Breadcrumb** — Distributed tracing using **UUID7** identifiers. Time-ordered, sortable, no clock sync needed. Chains across service boundaries; integrates with This Happened! for end-to-end "user reported it broke" → "exact failure point" traceability.

**Together:** This Happened! captures the WHAT (state at moment of impact); Breadcrumb traces the WHERE (call chain across services).

**Design principles** (verbatim from seed):
- Human-friendly: whimsical names, clear UI, no jargon. User taps "This Happened!", they don't "file a JIRA ticket with reproduction steps."
- Agent-friendly: structured data, correlation IDs, machine-parseable reports. An agent reads the bundle + Breadcrumb chain and diagnoses without asking for more context.
- Built for greenfield, retrofit for brownfield.
- Whimsical branding — Agency services, not enterprise middleware.

## The 4 locked bootstrap decisions

Decided in a strict-1B1 session with the principal on 2026-05-09. Verbatim transcript at:
`agency/workstreams/this-happened/transcripts/transcript-bootstrap-1b1-20260509.md`

| # | Item | Decision |
|---|---|---|
| **1** | **Scope** | **B** — Both This Happened! AND Breadcrumb together in this repo. Two workstreams. They ship as a pair; the value emerges from their integration. |
| **2** | **Hackathon shape** | **A** — Full discipline. `/define` → `/design` → `/plan` → first iteration. PVR locked + A&D in flight by EOD-2026-05-09. **No running code today.** Principal observation: even hybrid C wouldn't get a visible thing by 5 PM, so framework-correct beats half-built. |
| **3** | **License** | **B with two LICENSE files** — Reference Source on both `breadcrumb/` and `this-happened/`, separately replaceable. Repo also has top-level LICENSE explaining the MIT-framework + Reference-Source-workstream split. |
| **4** | **Bootstrap mechanism** | **`agency init`** (canonical tool) via `agency-bootstrap.sh`. Confirmed working today. Three framework gaps surfaced during the bootstrap (filed; see "Open framework gaps below"). |

These are foundation decisions. Subsequent design choices (tech stack, deployment, persistence, browser SDK boundary) are downstream and will be resolved by `/define` + `/design`.

## The tech-stack directive (locked from prior captain coord)

Per a 2026-04-10 captain directive (copied to `agency/workstreams/this-happened/seeds/directive-spec-provider-stack-20260410.md`):

- **Backend:** NestJS
- **Frontend:** React + Next.js
- **Distribution:** Real running applications (not CLI tools)
- **Scaffolding tools:** SPEC:PROVIDER starter-packs (`nestjs-prototype`, `nextjs-app`)

The framework's `/service-add` and `/ui-add` skills bolt these into a workstream when ready. **Do not invoke them yet** — Decision 2 says PVR + A&D first.

## What's already in the repo

- **Framework** (agency/, .claude/, tests/, etc.) — installed by agency-bootstrap.sh from the-agency v46.24
- **Workstreams**:
  - `agency/workstreams/this-happened/` — the app workstream (created by --project flag during bootstrap)
  - `agency/workstreams/breadcrumb/` — the library workstream (created via `/workstream-create breadcrumb` after bootstrap)
- **Seeds** (in both workstreams' seeds/):
  - `seed-it-happened-and-breadcrumb-20260410.md` — the foundational seed
  - `directive-spec-provider-stack-20260410.md` — the tech-stack lock (in this-happened/seeds only)
- **Transcripts** (in this-happened/transcripts/):
  - `transcript-bootstrap-1b1-20260509.md` — the 4 locked decisions verbatim
- **LICENSE files**:
  - Top-level `LICENSE` — explains framework-MIT + workstream-Reference-Source split
  - `agency/workstreams/breadcrumb/LICENSE` — Reference Source (with re-license note for future MIT consideration)
  - `agency/workstreams/this-happened/LICENSE` — Reference Source (canonical-app framing)
- **GitHub repo:** the-agency-ai/this-happened (public). Origin remote configured.

## Open framework gaps (for context — NOT your job to fix)

Filed on the-agency repo during the bootstrap. They're tracked there; you're free to hit them in your own work and re-file as needed.

| Issue | Gap |
|---|---|
| the-agency#437 | `git-safe init` was missing — RESOLVED in v46.24 |
| the-agency#439 | `git-safe remote` missing + run-in bypasses hookify rules — OPEN |
| the-agency#218 (flag) | captain-release receipt-hash thrash — OPEN |

If you hit any other gap, file via `./agency/tools/agency-issue file --type bug ...` against the-agency-ai/the-agency.

## Your environment

- **Principal:** jordan (see `usr/jordan/`)
- **Project:** this-happened
- **Repo:** github.com/the-agency-ai/this-happened (public)
- **Config:** `agency/config/agency.yaml`
- **Framework version:** v46.24

## Standing rules (don't violate)

Inherited from the-agency framework:
- Never raw `git commit` — use `/git-safe-commit`
- Never raw `git push` — use `/sync` or framework PR tools
- Never raw `gh pr create` / `gh pr merge` — use the safe wrappers
- Never write handoffs manually — use `/handoff`
- All tools work from ANY directory; never prefix with `cd /path/to/main &&`
- Read the dispatch + flag queue at session start (standing priority)

Plus the locked decisions above:
- Don't fast-track to scaffolding before PVR + A&D land. Decision 2 is binding.
- Don't add a third workstream without principal sign-off (Decision 1 is "two — both ship together").

## Your first move (after greeting principal)

1. **Greet the principal warmly.** They know what was built; confirm you've absorbed the context. Suggested:
   > "Welcome — captain of this-happened, briefed and ready. I've read the bootstrap handover from the-agency captain, the seed, the 1B1 transcript, and the SPEC:PROVIDER directive. Locked: B / A / B-with-two-LICENSEs / agency-init. Ready to start `/define` for PVR Rev 1?"

2. **Set up dispatch monitoring** — `/monitor-dispatches`. (Also valid: `/loop 5m dispatch list` if Monitor is unavailable.)

3. **Wait for principal "go" → invoke `/define`.** PVR Rev 1 covers the whole repo (both services, since Decision 1 says they ship as a pair). Pull the PVR template from the framework; sections to address per the seed:
   - **What problem are we solving?** — User can't reproduce + describe issues; support can't reproduce; agents can't diagnose without context. The user's "it happened" moment is invisible to anyone trying to help.
   - **Who's the user?** — Two: end-users hitting issues (taps the button); support/dev/agents reading reports (consumes the bundle + trace).
   - **What's the success criteria?** — User taps button → 30s later, support sees a structured report with trace, state, logs, screen capture. Agent reads same report and produces a diagnosis without asking the user for clarification.
   - **What's NOT in scope (v1)?** — General-purpose APM. Custom analytics. SSO/auth (use Supabase starter). Mobile native (web-first; mobile is a phase 2+).
   - **Greenfield vs retrofit?** — Greenfield-first (we ship the canonical experience), with retrofit-friendly Breadcrumb library.

4. **Once PVR locks** → `/design` for A&D Rev 1. Architecture covers:
   - Browser SDK boundary (where does state capture live?)
   - NestJS backend service shape
   - Next.js frontend (admin/triage UI)
   - Breadcrumb library API (UUID7 generation, propagation, log integration)
   - Persistence (Supabase? Postgres direct? — design call)
   - Deployment (Vercel for the Next.js frontend; backend deploy = ?)

## On resume

If a session ends mid-flight, write your handoff via `/handoff write` at the boundary (don't author manually). Include where /define or /design left off, what's locked, what's still open.

— the-agency captain, signing off this bootstrap handover.

*OFFENDERS WILL BE FED TO THE — CUTE — ATTACK KITTENS!*
