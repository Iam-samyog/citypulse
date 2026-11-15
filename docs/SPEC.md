# Oracle of Ithaca: The Odyssey of a City — Product Spec

**Theme:** Homer's *The Odyssey*. The simulated city is Ithaca. Failures are
trials. AI guidance is Athena's wisdom. Recovery is the return home.

## The problem

Urban infrastructure systems are deeply interconnected but monitored
separately: electricity, water, transportation, and communications each run
their own operational silos. A single failure (e.g. an electrical substation
going down) can cascade — a water pump loses power, distribution capacity
drops, a hospital's backup draws down, traffic signals in the area go dark —
and nobody watching one system sees the whole picture.

Oracle of Ithaca makes that cascade visible, explainable, and recoverable in one
place.

## The five chapters (= the five parts of the demo)

1. **Ithaca — The Living City.** Explore the 3D city, inspect components and
   their dependencies.
2. **Poseidon's Wrath — The Disruption.** Select a component, trigger a
   failure.
3. **The Labyrinth — The Cascading Trials.** Watch the failure propagate
   through the dependency graph; see the impact report.
4. **Athena's Strategy — The Intelligence.** Gemini explains the incident.
   Grok independently reviews the proposed recovery plan. Compare them.
5. **The Return to Ithaca — Restoration.** Run repair operations, watch the
   city recover, verify restoration.

## Core mechanics

- **Infrastructure graph:** every component is a node; every dependency is
  a directed edge (`types/infrastructure.ts`).
- **Failure propagation:** deterministic — same incident + same graph state
  always produces the same result (`lib/simulation/failureEngine.ts`). A
  dependency failing does **not** automatically fail the downstream
  component; capacity, backup power, and operational thresholds decide that.
- **Impact estimate:** translates the raw propagation result into
  judge-readable numbers — affected districts, population %, critical
  facilities, estimated recovery time (`lib/simulation/impactCalculator.ts`).
  These are simulated, not real municipal data — say so in the demo.
- **AI layer:** Gemini (Athena) explains; Grok (the Oracle) critiques the
  recovery plan independently. Both are advisory text grounded in the
  simulation's own structured output — the deterministic engine, not the
  LLM, is the source of truth for component state.
- **Recovery:** repair operations move through defined stages
  (`types/recovery.ts`); only a `verified` + `restored` repair triggers
  recalculation of downstream availability (`lib/simulation/recoveryEngine.ts`).

## MVP scope (what must work for the demo)

- ~38 fixture components across 8 categories, already seeded
  (`lib/seed/infrastructure.ts`).
- One fully-wired failure scenario end to end: select → fail → cascade →
  Gemini explains → Grok reviews → repair → restore.
- 3D city with layer toggles and color-by-status.
- Everything else (real datasets, GIS, live telemetry, weather modeling) is
  explicitly **future scope** — see the original pitch doc, not this repo.

## Non-goals for the hackathon build

- No real infrastructure data or live telemetry.
- No authentication/accounts.
- No production-grade security hardening (still: never expose API keys to
  the client — see each AI route).
