# Oracle of Ithaca — The Odyssey of a City

An AI-powered urban infrastructure digital twin. HackUTA submission.

> Every city has an Odyssey. Every failure is a trial. Every recovery is a return.

## What this is

A 3D digital twin of a fictional city ("Ithaca") where infrastructure
components (electrical substations, water pumps, hospitals, traffic
systems...) are modeled as a dependency graph. Triggering a failure
propagates through that graph deterministically; two Gemini-powered agents,
**Athena** and **Oracle**, explain the incident and stress-test recovery, while
**MongoDB Atlas** persists the whole incident-to-recovery lifecycle.

Full product spec: [`docs/SPEC.md`](docs/SPEC.md).
Team assignments: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) +
one guide per member in `docs/`.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI and GEMINI_API_KEY
npm run seed                 # loads the fixture city into MongoDB
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Sign in with the demo account: **operator** / **Ithaca2026!**. Set
`DEMO_USERNAME`, `DEMO_PASSWORD`, and a long random `DEMO_SESSION_SECRET` to
change it. Production deployments must configure these values. The demo city
fixture contains 38 simulated infrastructure assets, 69 dependency links, and
4 districts; `/api/infrastructure` can serve that fixture when MongoDB is
unavailable.

The dashboard's **AI Assistants** section includes Athena chat, powered by
Gemini. Set `GEMINI_API_KEY` in `.env.local`; the key is used server-side and
must never be put in a `NEXT_PUBLIC_` variable. The default model is
`gemini-3.6-flash`, with `gemini-3.8-flash` as fallback. You can override the
primary model with `GEMINI_MODEL` in `.env.local`, then restart the dev server.

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
    ai/oracle/                  POST Oracle's recovery review
    chatbot/                    POST Athena chat messages
components/
  city/        3D scene (React Three Fiber)
  dashboard/   Incident / impact / timeline / recovery panels
  ai/          Athena + Oracle agent panels
lib/
  simulation/  graph.ts, failureEngine.ts, impactCalculator.ts, recoveryEngine.ts
  ai/          gemini.ts (server-only, shared model with two personas)
  seed/        fixture city data (~38 components)
  mongodb.ts   DB connection + collection names
types/         shared TypeScript contracts — READ THESE FIRST
```

## Who owns what

| Area | Member | Guide |
|---|---|---|
| 3D city, Odyssey visual design | Member 1 | [`docs/MEMBER_1_FRONTEND.md`](docs/MEMBER_1_FRONTEND.md) |
| Simulation engine (graph, failure, impact, recovery) | Member 2 | [`docs/MEMBER_2_SIMULATION.md`](docs/MEMBER_2_SIMULATION.md) |
| Athena + Oracle integration | Member 3 | [`docs/MEMBER_3_AI.md`](docs/MEMBER_3_AI.md) |
| MongoDB, API routes, real-time | Member 4 | [`docs/MEMBER_4_BACKEND.md`](docs/MEMBER_4_BACKEND.md) |

Everyone: read [`types/infrastructure.ts`](types/infrastructure.ts),
[`types/incident.ts`](types/incident.ts), [`types/recovery.ts`](types/recovery.ts),
and [`types/simulation.ts`](types/simulation.ts) before writing code against
them. These are the contract — **do not change field names without telling
the other three people first.**

## Demo script

See [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for the exact walkthrough to
rehearse before judging.
