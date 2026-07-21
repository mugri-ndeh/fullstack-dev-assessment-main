---
name: build-trainer-matching
description: Autonomously orchestrate a multi-agent pipeline (Planner → API → UI → Reviewer → Reconciler) that implements the AI-powered trainer matching module end to end — backend /api/trainers/suggest, frontend suggestions component — with review/revision loops and bounded termination. Requires zero human input after invocation.
---

# Build Trainer Matching — Agent Pipeline

You (the session that invoked this skill) are the **Orchestrator**. You do not
write feature code yourself. You spawn the agents defined below via the Agent
tool, validate their outputs, route work between them, and decide termination.

## Ground rules (apply to every step)

1. **Zero human input.** Never ask the user anything. When a decision is
   ambiguous, make the call that best matches existing codebase conventions and
   record it in the run log as `DECISION: <what> — <why>`.
2. **Run log.** Append every pipeline event to `agent-run.log` at the repo
   root: agent launches (with one-line input summary), verdicts, decisions,
   gate results, and the final report. This file is the audit trail.
3. **Artifacts directory.** Agents exchange data only through files in
   `.claude/pipeline/` (create it): `plan.json`, `review-<n>.json`,
   `critique-<component>-<n>.json`. Never paste one agent's full transcript
   into another agent's prompt.
4. **Structured outputs.** Every agent must end its reply with a single fenced
   JSON block matching its output contract. If it doesn't parse or fails the
   contract: re-prompt the SAME agent once with the parse error appended. If it
   fails again, abort the pipeline with a FAILURE report (see Termination).
   Never silently continue past bad output.
5. **Type gate.** After any agent writes code, run
   `cd seminar-management && npx tsc --noEmit`. A failing gate is handled like
   a Reviewer rejection (routed to the responsible agent as a critique), and
   counts toward the same revision budget.

## Feature requirements (fixed input to the pipeline)

- Backend: `POST /api/trainers/suggest` — body `{ courseId }`. Returns the top
  3–5 trainers ranked for that course by an LLM called through **OpenRouter**
  (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL` env vars; OpenAI-compatible
  `/chat/completions`). Each suggestion: `trainerId`, `name`, `confidence`
  (0–100), `reasoning` (1–3 sentences), `factors` (subject/location/
  availability/experience notes). Requirements: structured JSON response from
  the LLM; retry with exponential backoff (2 retries) on 429/5xx/network;
  deterministic rule-based fallback scorer when the AI is unavailable or the
  key is unset (response flags `source: "ai" | "fallback"`); exclude trainers
  with conflicts (reuse `services/conflictService.ts`); never call OpenRouter
  from client code; in-memory response cache keyed on course+trainer data
  fingerprint, 5 min TTL.
- Frontend: a `TrainerSuggestions` component rendering ranked suggestions
  (confidence bar, reasoning, factors, fallback-mode notice), with loading /
  error / empty states, an "Assign" action per suggestion (calls
  `PUT /api/courses/:id` with `{ trainerId }`, surfaces 409 conflict responses
  with an override confirm), and a manual-override note that any trainer may
  be chosen elsewhere. Must match existing Tailwind styling conventions.

## Pipeline

```
Planner ──plan.json──▶ API Agent ──┐
   │                               ├──▶ tsc gate ──▶ Reviewer ──▶ APPROVE ▶ Final report
   └──────plan.json──▶ UI Agent ───┘                    │
                                            REVISE(component, issues)
                                                        │
                                   Reconciler(component) ◀─ critique-<c>-<n>.json
                                            │ (≤ 2 cycles per component)
                                            └──▶ tsc gate ──▶ Reviewer (re-review
                                                 CHANGED components only)
```

API and UI agents run **in parallel** — both depend only on `plan.json`
(contract-first), not on each other's code.

---

## Agent definitions

### 1. Planner Agent

- **Role:** Read the codebase structure and produce the implementation plan
  and the API contract both build agents will follow.
- **Receives (in prompt):** The feature requirements above, verbatim; the
  output of `git ls-files` for the repo; instruction to Read (at most) these
  convention-defining files: `seminar-management/lib/api.ts`,
  `seminar-management/schemas/course.ts`,
  `seminar-management/services/conflictService.ts`,
  `seminar-management/services/courseService.ts` (first 80 lines),
  `seminar-management/components/Header.tsx`, `seminar-management/.env.example`.
- **Excluded and why:** page implementations, auth internals, prisma seed,
  git history — conventions and contracts are visible in the six files above;
  anything more inflates context without changing the plan.
- **Produces:** `.claude/pipeline/plan.json`:
  ```json
  {
    "apiContract": {
      "endpoint": "...", "requestBody": {}, "responseBody": {},
      "errorResponses": [{ "status": 0, "shape": {} }]
    },
    "backendSteps": [{ "file": "...", "purpose": "...", "keyDecisions": ["..."] }],
    "frontendSteps": [{ "file": "...", "purpose": "...", "keyDecisions": ["..."] }],
    "conventionsSummary": ["..."],
    "risks": ["..."]
  }
  ```
- **Acceptance (orchestrator validates):** all five keys present;
  `apiContract.responseBody` includes suggestion fields + `source`; every
  `file` path is inside `seminar-management/`. On violation: one re-prompt
  with the specific defect, then abort.

### 2. API Agent

- **Role:** Implement the backend exactly per plan: OpenRouter client, matching
  service (prompting, parsing, retries, fallback, cache), suggest endpoint.
- **Receives:** `plan.json` fields `apiContract`, `backendSteps`,
  `conventionsSummary` (NOT `frontendSteps`); the feature requirements'
  backend bullet; file paths it may Read for conventions (`lib/api.ts`,
  `schemas/trainer.ts`, `services/conflictService.ts`).
- **Excluded and why:** frontend plan and files (irrelevant to its output);
  the Reviewer's rubric (agents must not write to the test).
- **Produces:** code files per `backendSteps`, plus a final JSON block:
  `{ "filesWritten": ["..."], "decisions": ["..."], "limitations": ["..."] }`
- **Constraints:** must use `createHandler` from `lib/api.ts`; zod-validate the
  request body; read the API key from env only; TypeScript strict-clean.

### 3. UI Agent

- **Role:** Implement `TrainerSuggestions` (and any small helpers) against the
  API contract alone.
- **Receives:** `plan.json` fields `apiContract`, `frontendSteps`,
  `conventionsSummary` (NOT `backendSteps`); the feature requirements'
  frontend bullet; file paths it may Read for styling conventions
  (`components/Header.tsx`, `pages/login.tsx`).
- **Excluded and why:** backend implementation files — the contract must be
  sufficient; if it isn't, that's a plan defect the Reviewer will surface, not
  something to patch by peeking at server code.
- **Produces:** component file(s) plus the same final JSON block as the API
  Agent.
- **Constraints:** fetch with credentials (session cookie flows by default);
  handle loading/error/empty/409-conflict states; Tailwind only, match
  existing visual language; no new dependencies.

### 4. Reviewer Agent

- **Role:** Adversarial review of both implementations against the plan and
  the feature requirements. Judges artifacts, not intentions.
- **Receives:** `plan.json` (whole); the list of files written by both agents
  with instruction to Read them; the tsc gate output; the feature requirements
  (whole); this rubric: correctness vs contract, error handling (API failure,
  malformed LLM output, missing key, rate limits), security (key exposure,
  input validation), convention adherence, silent-failure paths.
- **Excluded and why:** the build agents' `decisions`/`limitations` notes on
  the first pass — the code must stand on its own. (On re-review, the relevant
  Reconciler's decisions ARE included so accepted trade-offs aren't re-flagged.)
- **Produces:** `.claude/pipeline/review-<n>.json`:
  ```json
  {
    "verdict": "APPROVE" | "REVISE",
    "issues": [{
      "component": "api" | "ui" | "plan",
      "file": "...", "severity": "blocking" | "advisory",
      "problem": "...", "fixHint": "..."
    }]
  }
  ```
- **Rules:** `REVISE` requires at least one `blocking` issue — advisory-only
  findings mean `APPROVE`. Re-reviews examine ONLY components changed since
  the last review, plus cross-component contract consistency.

### 5. Reconciler Agent (conditional)

- **Role:** Fix exactly the blocking issues for ONE component. Spawned once
  per flagged component per cycle.
- **Receives:** `critique-<component>-<n>.json` — the blocking issues for its
  component only; `apiContract` from the plan; the flagged file paths (Read
  them); the constraint "smallest change that resolves each issue; do not
  refactor beyond the critique; do not touch other components' files."
- **Excluded and why:** the other component's critique and files, full review
  history, the original build agent's transcript — the critique plus code is
  the complete problem statement; anything more invites scope creep.
- **Produces:** revised files plus final JSON:
  `{ "filesChanged": ["..."], "issuesAddressed": ["<problem> -> <what was done>"], "issuesDisputed": [{ "problem": "...", "whyInvalid": "..." }] }`
- **Disputes:** `issuesDisputed` entries are passed to the Reviewer on
  re-review; the Reviewer may drop or re-assert them. A re-asserted disputed
  issue counts as unresolved — no infinite argument loop.

---

## Rejection-loop protocol (exact flow)

1. Reviewer returns `REVISE` with issues.
2. Orchestrator logs the verdict, splits `blocking` issues by `component`, and
   writes `critique-<component>-<n>.json` per affected component. Issues with
   `component: "plan"` are re-scoped by the orchestrator to the component that
   owns the affected file (log as a DECISION).
3. For each affected component: increment that component's revision counter;
   if it now exceeds **2**, stop revising that component and carry its issues
   to the final report as unresolved. Otherwise spawn a Reconciler for it
   (parallel across components).
4. Run the tsc gate on Reconciler output (a failure = one more critique to the
   same Reconciler, counting against the same budget).
5. Re-run the Reviewer on changed components only (include Reconciler
   decisions + disputes).
6. Repeat until APPROVE, or every flagged component has exhausted its budget,
   or the global cap of **3 review rounds** is hit.

## Termination

- **SUCCESS:** Reviewer verdict APPROVE (advisory issues allowed) AND tsc gate
  clean. 
- **PARTIAL:** revision budgets/review rounds exhausted with blocking issues
  remaining, but tsc gate clean — feature ships with documented defects.
- **FAILURE:** contract violation after re-prompt (rule 4), tsc gate cannot be
  made to pass within budgets, or any agent's tools fail irrecoverably.

Every outcome writes a final block to `agent-run.log`:

```
=== PIPELINE RESULT: SUCCESS | PARTIAL | FAILURE ===
Components: api=<cycles used>, ui=<cycles used>; review rounds: <n>
Files written: <list>
Unresolved issues: <list or none>
Verification: tsc <pass/fail>; endpoint smoke test <result | skipped: no API key>
```

There is no code path that ends the pipeline without this block — a run that
stops without it IS a failure and must be reported as one.

## Post-approval verification (orchestrator, not an agent)

1. `npx tsc --noEmit` one final time.
2. Smoke test: authenticate against the running dev server, POST
   `/api/trainers/suggest` with a seeded course id. If `OPENROUTER_API_KEY` is
   unset/placeholder, assert the fallback path returns ranked suggestions with
   `source: "fallback"`; otherwise assert `source: "ai"` with 3–5 suggestions.
3. Record results in the final log block. Do not commit anything — the human
   reviews and commits.
