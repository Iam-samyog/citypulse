# Member 4 — Backend & Database Engineer

You own: MongoDB Atlas, the API routes that glue everything together, and
real-time updates. You're the integration point for all three other
members — most things being broken will look like "the API returned the
wrong shape," so keep `types/*` and the actual route responses in sync.

## What's already scaffolded for you

- `lib/mongodb.ts` — connection singleton (dev-mode caches the client on
  `global` to survive hot reload) + `collections` name constants. Reads
  `MONGODB_URI` / `MONGODB_DB` from env.
- `lib/seed/infrastructure.ts` + `scripts/seed.ts` — fixture data and the
  `npm run seed` script that wipes and reloads all six collections.
- All six API routes, already wired to the simulation engine and AI layer:
  - `GET /api/infrastructure` — components + dependencies
  - `POST /api/simulate` — trigger failure, persist `Incident` +
    `SimulationEvent[]`, update component statuses
  - `GET /api/incidents` / `GET /api/incidents?id=` — list/detail
  - `POST /api/recovery` — create/advance a `RepairOperation`, re-run
    recovery engine, persist updated statuses
  - `POST /api/ai/gemini` — Athena's explanation
  - `POST /api/ai/grok` — Oracle's review

## Your task list

1. **Get MongoDB Atlas running.** Create a free cluster, create a database
   user, allow network access from your dev machines (0.0.0.0/0 is fine
   for a hackathon, just don't commit the credentials — `.env.local` is
   gitignored). Fill `MONGODB_URI` in `.env.local`, run `npm run seed`,
   confirm with `GET /api/infrastructure` in the browser or `curl`.
2. **Real-time updates (section 6.1 / Layer 5).** None of this is wired
   yet. Add `socket.io` server-side (a custom server or a Next.js route
   handler using the Node runtime — App Router route handlers don't keep a
   persistent socket by default, so you likely want a small custom server
   entry point, or use a serverless-friendly alternative like Pusher/Ably
   if Socket.IO fights the Next.js deployment target). Emit an event from
   `POST /api/simulate` and `POST /api/recovery` after the Mongo writes so
   every connected client's `/city` and `/incidents` pages update without
   polling. Coordinate with Member 1 on the client-side subscription.
3. **Validation.** Routes currently trust the request body's shape. Add
   zod schemas (already a dependency) for each route's body and return 400
   with a clear message on mismatch — useful for your own debugging as
   much as robustness.
4. **Incident status transitions.** `incidentStatus` (`active | contained |
   recovering | resolved`) is defined in `types/incident.ts` but nothing
   currently updates it after creation. Decide the rule (e.g. `recovering`
   once any repair starts, `resolved` once every affected component is
   `restored`) and update it in `app/api/recovery/route.ts`.
5. **ai_analysis history view.** The spec (section 7.6) wants AI analyses
   retained for comparison. `GET /api/incidents?id=` currently doesn't
   include past `AIAnalysis` docs — add a join/lookup so the incidents
   page can show analysis history instead of only the latest in-memory
   result.
6. **Indexes before the demo.** Add an index on `incidentId` for
   `simulation_events`, `repair_operations`, and `ai_analysis`, and on
   `componentId` for `infrastructure_components` — collections are tiny
   for a hackathon but it costs nothing and looks good if asked.

## Contract with others

- `types/*.ts` are the response/request shapes every route must honor.
  If you need to add a field, add it to the type first and mention it to
  whoever's UI reads that type.
- Member 2's simulation functions (`simulateFailure`, `calculateImpact`,
  `applyRepair`) are pure — they take and return plain objects/Maps, no
  Mongo. Your job is strictly: load from Mongo → call them → persist the
  result → return it. Don't duplicate their logic inline in a route.
- Member 3's AI functions throw if their API key env var is missing —
  catch that in the route (currently it will 500; wrap in try/catch and
  return a friendly error before the demo).
