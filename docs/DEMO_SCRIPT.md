# Demo Script — rehearse this exact sequence before judging

Target: 4–5 minutes. The story moves from citywide health, to live incidents,
to Athena's evidence, then to the 3D city and simulator.

## 0. Setup (before judges arrive)

- Run `npm run seed` once to load the 38 assets and 69 dependency links.
- Run `npm run seed:demo` to load the 180-day simulated record, repair events,
  saved simulator runs, and three live demo incidents. Re-running it replaces
  only its own tagged records.
- Sign in as `operator` and open `/dashboard` before the presentation.
- Confirm `GEMINI_API_KEY` works by asking Athena one short question.
- Say clearly that city, incident, population, and history figures are simulated.

## 1. Opening — City at a glance (30s)

- Start on the Overview dashboard. Point out the 38 monitored assets, four
  districts, current operational health, active incidents, and backup coverage.
- Explain that the dependency graph is deterministic and the city dataset is
  fictional; the dashboard makes consequences visible, it does not control
  real infrastructure.

## 2. The disruption — Active incidents (40s)

- Open Incidents and show the three seeded cases: one recovering and two active.
- Pick the waterworks rupture or lighthouse communications outage and name the
  origin asset and downstream impact shown in the record.
- Explain that the other incidents are included so recovery and overlapping
  failures can be demonstrated without waiting for a new event.

## 3. The cascade — The 3D city (45s)

- Open the live 3D city and select the failed origin asset.
- Point out how dependency links, impacted districts, and asset statuses
  correspond to the incident record. The simulation engine determines the
  cascade; Gemini only explains it.

## 4. The intelligence — Athena and the Oracle (90s)

- Open Advisors and use Athena's instant questions: “Give me a status
  briefing” and “What keeps causing failures?” Show the charts and 180-day
  trends: causes, repeat offenders, and peak failure hours.
- Ask Athena a freeform follow-up such as “Which district needs help first?”
  The answer should distinguish current incidents from simulated history.
- Open the Oracle and show its risk outlook. Explain that it is an independent
  resilience view, also grounded in the live city and simulated record.

## 5. The return — Recovery and history (45s)

- Open Simulator and point out the saved runs across all four scenarios.
- Return to Overview and close with: “The city model shows how failures
  cascade, and how a coordinated recovery can bring Ithaca back online.”

## If something breaks live

- Gemini timeout → use Athena's instant insight questions, which are computed
  from the loaded city and history data without an API call.
- MongoDB connection drop → `/api/infrastructure` serves the fixture city;
  seeded incident history and simulator runs require MongoDB.

## Questions judges are likely to ask

- “Is this real infrastructure data?” → No. Ithaca and its operating record
  are simulated, as disclosed in the UI.
- “Why two advisors?” → Athena explains current operations; the Oracle
  independently stress-tests resilience and future risk. Both are advisory.
- “What decides the actual failure state, the AI or the simulation?” → The
  deterministic engine (`lib/simulation/`) decides state; AI is advisory only.
- “How would this scale to a real city?” → With validated real datasets, GIS,
  and live telemetry, plus engineering review and human oversight.
