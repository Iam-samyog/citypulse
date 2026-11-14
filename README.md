# CITYPULSE — The Odyssey of a City

An AI-powered urban infrastructure digital twin. HackUTA submission.

> Every city has an Odyssey. Every failure is a trial. Every recovery is a return.

## What this is

A 3D digital twin of a fictional city ("Ithaca") where infrastructure
components (electrical substations, water pumps, hospitals, traffic
systems...) are modeled as a dependency graph. Triggering a failure
propagates through that graph deterministically; **Gemini** explains the
incident, **Grok** independently critiques the recovery plan, and
**MongoDB Atlas** persists the whole incident-to-recovery lifecycle.

Full product spec: [`docs/SPEC.md`](docs/SPEC.md).
Team assignments: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) +
one guide per member in `docs/`.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI, GEMINI_API_KEY, GROK_API_KEY
npm run seed                 # loads the fixture city into MongoDB
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project layout

```
app/
  page.tsx              Landing page
  city/page.tsx          Chapters I–III: explore + trigger failures
  incidents/page.tsx      Chapters IV–V: AI analysis + recovery
  api/
    infrastructure/       GET components + dependencies
    simulate/              POST trigger a failure
    incidents/              GET incident list/detail
    recovery/                POST advance a repair
    ai/gemini/                 POST Athena's explanation
    ai/grok/                    POST Oracle's recovery review
components/
  city/        3D scene (React Three Fiber)
  dashboard/   Incident / impact / timeline / recovery panels
  ai/          Gemini + Grok panels
lib/
  simulation/  graph.ts, failureEngine.ts, impactCalculator.ts, recoveryEngine.ts
  ai/          gemini.ts, grok.ts (server-only — never import from client code)
  seed/        fixture city data (~38 components)
  mongodb.ts   DB connection + collection names
types/         shared TypeScript contracts — READ THESE FIRST
```

## Who owns what

| Area | Member | Guide |
|---|---|---|
| 3D city, Odyssey visual design | Member 1 | [`docs/MEMBER_1_FRONTEND.md`](docs/MEMBER_1_FRONTEND.md) |
| Simulation engine (graph, failure, impact, recovery) | Member 2 | [`docs/MEMBER_2_SIMULATION.md`](docs/MEMBER_2_SIMULATION.md) |
| Gemini + Grok integration | Member 3 | [`docs/MEMBER_3_AI.md`](docs/MEMBER_3_AI.md) |
| MongoDB, API routes, real-time | Member 4 | [`docs/MEMBER_4_BACKEND.md`](docs/MEMBER_4_BACKEND.md) |

Everyone: read [`types/infrastructure.ts`](types/infrastructure.ts),
[`types/incident.ts`](types/incident.ts), [`types/recovery.ts`](types/recovery.ts),
and [`types/simulation.ts`](types/simulation.ts) before writing code against
them. These are the contract — **do not change field names without telling
the other three people first.**

## Demo script

See [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for the exact walkthrough to
rehearse before judging.
