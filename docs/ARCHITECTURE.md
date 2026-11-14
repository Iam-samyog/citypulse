# Architecture

## Layers

```
Presentation (Next.js + React Three Fiber)
        │  fetch() / websocket
Simulation Engine (lib/simulation/*)  ──persists──►  MongoDB Atlas
        │                                                  ▲
AI Layer (lib/ai/gemini.ts, lib/ai/grok.ts)  ───reads/writes┘
        │  server-side only, API keys never reach the client
Real-time layer (Socket.IO) — broadcasts state changes to all connected clients
```

## Data flow for one failure → recovery cycle

1. Client: user clicks a component in `CityScene`, then "Trigger Failure"
   on `/city` → `POST /api/simulate { componentId, incidentType }`.
2. Server (`app/api/simulate/route.ts`): loads the graph from Mongo,
   calls `simulateFailure()` then `calculateImpact()`, writes an `Incident`
   + `SimulationEvent[]` to Mongo, updates each affected component's
   `operationalStatus`.
3. Client: refetches `/api/infrastructure`, re-renders the city with new
   colors; renders `IncidentPanel` with the impact report.
4. On `/incidents`: user picks the incident, clicks "Ask Athena" →
   `POST /api/ai/gemini { incidentId }` → explanation persisted as an
   `AIAnalysis` and shown in `AthenaAnalysis`.
5. User clicks "Review Plan" → `POST /api/ai/grok { incidentId }` → critique
   shown side-by-side in `OracleReview`.
6. User advances repair stages in `RecoveryPanel` → `POST /api/recovery`
   → when a repair is `restored` + `verified`, `applyRepair()` re-runs
   propagation from that component and persists newly-restored statuses.

## Why these boundaries

- **Simulation engine has zero dependency on Mongo or Next.js** — it's pure
  TypeScript operating on in-memory `InfrastructureComponent[]` /
  `InfrastructureDependency[]`. This means Member 2 can unit-test it with
  plain arrays and Member 4 can swap persistence without touching engine
  logic.
- **AI calls only happen in `app/api/ai/*/route.ts`** (server). `GEMINI_API_KEY`
  / `GROK_API_KEY` must never appear in any file under `components/` or any
  client-side bundle. If you're tempted to call Gemini/Grok directly from a
  component, stop — add a server route instead.
- **types/ is the contract.** Everyone imports from `@/types/*`. If a field
  needs to change, say so in the team group chat before changing it — three
  other people's code depends on those shapes compiling.

## Path alias

`@/*` maps to the project root (see `tsconfig.json`), so import as
`import { simulateFailure } from "@/lib/simulation/failureEngine"` from
anywhere, not relative paths like `../../lib/...`.
