# Member 1 — 3D Frontend Developer

You own: the city itself, the Odyssey visual identity, and how data from
the other three members' work gets rendered.

## What's already scaffolded for you

- `components/city/CityScene.tsx` — the R3F `<Canvas>`, lighting, ground
  plane, layer toggles. **This is the file you'll spend the most time in.**
- `components/city/InfrastructureNode.tsx` — one component as a colored box,
  color driven by `operationalStatus`. Swap boxes for real models here.
- `components/city/InfrastructureLayer.tsx` — groups nodes by category so
  layers can be toggled.
- `components/city/ImpactZone.tsx` — a flat translucent circle under
  affected components. Very rough — upgrade this.
- `app/city/page.tsx` — wires fetch → scene → trigger-failure button →
  incident panel. Thin on purpose; feel free to restructure state
  management (consider `zustand`, already in `package.json`) once it grows.
- `app/page.tsx` — landing page with the tagline, already Odyssey-styled.
- `tailwind.config.ts` — color tokens already defined: `aegean`, `ivory`,
  `bronze`, `gold`, and `status.failed/atrisk/operational/repairing/restored`.
  Use these tokens, don't hardcode new hex values.

## Your task list (suggested order)

1. **Run it.** `npm install && npm run dev`, open `/city`. You should see a
   navy plane and nothing else until data loads — components only render
   once `/api/infrastructure` returns, so Member 4 needs Mongo seeded first
   (ask them, or run `npm run seed` yourself once `.env.local` is set).
2. **District layout.** Fixture data (`lib/seed/infrastructure.ts`) places
   components in two districts, "Agora District" and "Penelope Heights",
   roughly 250 units apart. Add visual ground markers / district labels so
   judges can tell them apart at a glance.
3. **Greek architecture pass.** Replace flat ground plane with simple
   geometry suggesting ancient Ithaca — columns, a harbor edge, marble
   texture on the ground. Keep it low-poly; this has to run smoothly on a
   demo laptop.
4. **Category-specific node shapes.** Right now everything is a box sized
   by capacity. At minimum, give hospitals/emergency facilities a distinct
   shape (they're the ones judges will care about most during a cascade).
5. **Camera choreography.** When a failure triggers, consider an automatic
   camera move toward the impact zone (`ImpactZone`'s centroid is already
   computed — reuse that math).
6. **Timeline scrubbing.** `components/dashboard/Timeline.tsx` already
   exists and calls `onScrub(simulationTimeMinutes)`. It is NOT wired into
   `/city` yet — hook it up so scrubbing the timeline re-colors nodes to
   match their state at that point in time (you'll need per-event state,
   which `SimulationEvent[]` from `POST /api/simulate` already gives you).
7. **Polish pass:** loading states, hover tooltips showing component name +
   status, mobile/projector-safe contrast.

## Don't touch

- Anything in `lib/simulation/` — that's Member 2's. If the shape of
  `InfrastructureComponent` doesn't give you what you need for rendering,
  ask them to add a field rather than inventing your own parallel data.
- API routes under `app/api/` — ask Member 4 if you need a new endpoint or
  a different response shape.

## Useful commands

```bash
npm run dev     # http://localhost:3000
npm run lint
```
