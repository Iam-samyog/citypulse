# Member 3 — AI Engineer

You own: Gemini (Athena's Intelligence) and Grok (The Strategic Oracle),
and making sure both stay grounded in simulation data instead of
hallucinating numbers.

## What's already scaffolded for you

- `lib/ai/gemini.ts` — `explainIncident({ incident, originComponent,
  affectedComponents, question? })`. Builds a prompt that dumps the
  structured incident/component JSON and explicitly instructs the model
  not to invent facts. Calls the Gemini REST API directly with
  `GEMINI_API_KEY` (no SDK dependency yet — add `@google/generative-ai` if
  you prefer the SDK, just keep the function signature the same).
- `lib/ai/grok.ts` — `reviewRecoveryPlan({ incident, originComponent,
  affectedComponents, proposedRepairs })`. Same pattern, calls Grok's
  OpenAI-compatible chat completions endpoint (`GROK_API_BASE_URL`,
  default `https://api.x.ai/v1`).
- Both export/share `parseAIResponse()` (defined in `gemini.ts`, imported
  by `grok.ts`) — a naive split on the first bullet list to separate
  "summary" from "recommendations[]". **This is the first thing worth
  improving** — consider asking both models for structured JSON output
  instead (Gemini supports `responseMimeType: "application/json"`; Grok's
  endpoint supports `response_format: { type: "json_object" }`) so you're
  not parsing prose.
- `app/api/ai/gemini/route.ts` and `app/api/ai/grok/route.ts` — the only
  places these functions get called. They load the incident + components
  from Mongo, call your function, persist the result as an `AIAnalysis`
  doc, and return it.
- `components/ai/AthenaAnalysis.tsx` / `OracleReview.tsx` — already render
  `summary` + `recommendations[]` and (for Athena) a free-text question
  box wired to `onAskQuestion`.

## Your task list

1. **Get real API keys working.** Fill in `GEMINI_API_KEY` and
   `GROK_API_KEY` in `.env.local` (copy from `.env.example`). Test with a
   seeded incident: trigger a failure on `/city`, then go to `/incidents`
   and click "Ask Athena" / "Review Plan".
2. **Improve prompt grounding.** Read `buildPrompt()` in both files. The
   instruction "do not invent facts not present below" is doing a lot of
   work — consider adding a few-shot example of a good vs. hallucinated
   answer if you see the model drifting during testing.
3. **Structured output.** Switch both calls to request JSON
   (`{ summary: string, recommendations: string[] }`) instead of parsing
   markdown bullets. Update `parseAIResponse` or replace it with
   `JSON.parse` + a zod schema (zod is already a dependency) for
   validation/fallback.
4. **Grok needs Gemini's or the user's proposed plan, not just raw
   incident data.** Right now `reviewRecoveryPlan` is fed
   `proposedRepairs` from Mongo (whatever repair operations Member 2/4's
   recovery flow has created so far). If the demo wants Grok to react to a
   plan the user typed rather than clicked through the UI, you'll need a
   small UI addition — coordinate with Member 1.
5. **Rate limiting / error handling for the demo.** If the API is slow or
   rate-limited mid-demo, you want a graceful fallback message, not a
   crash. Wrap the `fetch` calls with a timeout and a canned "the oracle is
   unreachable" response.
6. **Stretch: "what if this continues for two more hours" style
   what-if questions.** The spec calls this out explicitly (section 5.5).
   `onAskQuestion` in `AthenaAnalysis` already passes free text through to
   `explainIncident`'s `question` param — this mostly works already, just
   validate it live.

## Rules you must not break

- `GEMINI_API_KEY` / `GROK_API_KEY` are read from `process.env` only inside
  `lib/ai/*.ts`, which are only ever imported by files under `app/api/`.
  **Never** import `lib/ai/gemini.ts` or `lib/ai/grok.ts` from anything
  under `components/` — that would bundle the key into client JS.
- Both AI functions are advisory only. They must not be the thing that
  changes `operationalStatus` in the database — that stays the
  deterministic simulation engine's job (Member 2). If you're tempted to
  have the AI "decide" an outcome, route it back through
  `lib/simulation/*` instead.
