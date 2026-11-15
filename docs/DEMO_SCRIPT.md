# Demo Script — rehearse this exact sequence before judging

Target: ~4-5 minutes. One continuous story, no dead air while waiting on
API calls — have a backup recorded clip in case wifi/API latency bites.

## 0. Setup (before judges arrive)

- `npm run seed` fresh, so the city starts in a clean "all operational" state.
- Confirm `GEMINI_API_KEY` / `GROK_API_KEY` work with a dry-run.
- Open `/city` in the browser, full screen, judges can't see your terminal.

## 1. Opening — Enter Ithaca (30s)

- Land on `/` ("Oracle of Ithaca: The Odyssey of a City"), click "Enter Ithaca."
- On `/city`: orbit the camera, point out the two districts and a few
  component types (substation, water pump, hospital). One sentence: "every
  box here is a real piece of infrastructure, connected to the ones it
  depends on."

## 2. The Disruption — Poseidon's Wrath (30s)

- Click the electrical substation `TX-104`.
- Click "Trigger Failure."
- Say what you're about to do before the request resolves, so the pause
  reads as intentional: "I'm failing this substation — watch what happens
  downstream."

## 3. The Cascade — The Labyrinth (60s)

- Nodes recolor: water pump → amber/red, water distribution → affected,
  hospital flickers to at-risk (backup holding), residential blocks drop.
- Point at the `ImpactZone` highlight.
- Read the `IncidentPanel` impact numbers out loud: downstream count,
  districts, population %, critical facilities, estimated recovery time.
  Explicitly say: "these are simulated numbers from our city model, not
  real municipal data" — judges respect that disclosure.

## 4. The Intelligence — Athena's Strategy (60-90s)

- Navigate to `/incidents`, select the active incident.
- Click "Ask Athena" — while it loads, narrate: "Gemini is reading the
  same structured data you just saw, not guessing."
- Read Gemini's explanation.
- Type a live follow-up question in Athena's box (e.g. "which neighborhood
  is most at risk?") to prove it's not canned.
- Click "Review Plan" for Grok — point out it's a **different model**
  independently critiquing the same incident, and that it may disagree
  with or add to Gemini's take. This contrast is the differentiator — slow
  down here.

## 5. The Return — Restoration (60s)

- In the Recovery panel, advance `TX-104` through repair stages to
  "restored" (verified).
- Flip back to `/city` — nodes should recolor back toward
  operational/restored as the cascade reverses.
- Close with the line from the pitch: "Odysseus spent years finding his
  way back to Ithaca. Our mission is to help a city find its way home when
  its systems fall apart."

## If something breaks live

- API timeout on Gemini/Grok → say "the oracle is taking its time" and
  move on, come back to it, or show a pre-recorded fallback.
- MongoDB connection drop → have a local JSON fallback build ready
  (lower priority, only build this if time allows after the MVP works).

## Questions judges are likely to ask — have answers ready

- "Is this real infrastructure data?" → No, simulated city, disclosed in
  the UI itself.
- "Why two AI models instead of one?" → Independent review catches blind
  spots a single model's bias might miss — same reason human incident
  response uses a second reviewer.
- "What decides the actual failure state, the AI or the simulation?" → The
  deterministic engine (`lib/simulation/`) always decides state; AI is
  advisory only, never authoritative.
- "How would this scale to a real city?" → See "Future Scope" in the
  original pitch — real datasets, GIS, live telemetry, with proper
  engineering validation and human oversight.
