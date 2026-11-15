# Oracle of Ithaca — Voiceover Script (1:30 cut)

Real narration audio, generated with ElevenLabs (your own API key/voice), mixed into `out/oracle-of-ithaca-90s.mp4`. Audio files live in `public/audio/`.

| Scene | Narration |
|---|---|
| Cold Open | "Every city has an Odyssey. This is Oracle of Ithaca." |
| I · Overview | "A living city model: thirty-eight infrastructure assets, sixty-nine dependency links, four districts, watched in real time." |
| II · Incidents | "Every incident has a name, an origin, and a blast radius, and the dashboard shows exactly what it touches downstream." |
| III · Cascade | "One failure. A graph decides the rest. A deterministic engine calculates how damage spreads, and when crews respond, the same graph runs in reverse, healing it block by block." |
| IV · Intelligence | "Athena explains what happened. The Oracle helps you decide what's next. Two Gemini powered advisors, grounded in the live city. Always counsel, never control." |
| V · Built With | "Built with Gemini." / "MongoDB Atlas." / "Eleven Labs." / "Vultr." / "And GoDaddy." (one line per sponsor card) |
| VI · The Return | "Ithaca comes back online, not because the danger wasn't real, but because the choices were good. Oracle of Ithaca. A HackUTA submission." |

Total spoken narration: ~57s inside a 90s cut — the rest is visual breathing room (graph animation, device-frame reveals, card transitions).

To regenerate or tweak wording: edit `scripts/generate-voiceover.mjs` and rerun `node scripts/generate-voiceover.mjs`, then re-render.
