# Member 2 — Simulation Engineer

You own: the deterministic logic that decides what happens when something
fails and what happens when it's repaired. This is the credibility of the
whole project — judges will poke at "why did THIS fail but not THAT," so
the model needs to be explainable, not a black box.

## What's already scaffolded for you

- `lib/simulation/graph.ts` — `InfrastructureGraph`: wraps components +
  dependencies, gives you `getUpstream`, `getDownstream`, and
  `getDownstreamClosure` (BFS reachability with hop-distance). Pure
  TypeScript, no Mongo/Next dependency — you can unit test this with plain
  arrays.
- `lib/simulation/failureEngine.ts` — `simulateFailure(graph, originId)`.
  Current model: a component's available capacity = sum of
  `requiredCapacity` from every upstream dependency whose source is still
  supplying (operational/restored), plus `backupCapacity`, plus 75% credit
  for any dependency flagged `hasBackup`. Compare that against
  `requiredInputCapacity * operationalThreshold` to decide
  operational/degraded/at_risk/failed. **This is intentionally simple —
  read the comment block at the top of the file before changing it.**
- `lib/simulation/impactCalculator.ts` — turns the raw propagation result
  into the judge-facing numbers (affected districts, population %,
  critical facilities, estimated recovery time, severity). The
  `estimateRecoveryMinutes` / `estimateSeverity` heuristics at the bottom
  are placeholders — tune the constants, or replace with something more
  defensible, but keep it deterministic.
- `lib/simulation/recoveryEngine.ts` — `applyRepair(graph, repair)`. Only
  acts when `repairStatus === "restored" && verificationStatus === "verified"`;
  re-runs `simulateFailure` seeded from the now-restored component to
  recalculate anything downstream that can come back online.
- `lib/seed/infrastructure.ts` — your test fixture. ~15 components, 2
  districts, already has a multi-hop chain (`TX-100 → TX-104 → WP-12 →
  WT-01 → HOSP-01/RES-01/RES-02`) specifically so cascades are visible.

## Your task list

1. **Write a quick test harness.** Import `InfrastructureGraph` +
   `simulateFailure` directly with the seed data (no server needed):
   ```ts
   import { InfrastructureGraph } from "@/lib/simulation/graph";
   import { simulateFailure } from "@/lib/simulation/failureEngine";
   import { infrastructureComponents, infrastructureDependencies } from "@/lib/seed/infrastructure";

   const graph = new InfrastructureGraph(infrastructureComponents, infrastructureDependencies);
   console.log(simulateFailure(graph, "TX-104"));
   ```
   Run with `npx tsx -r tsconfig-paths/register <file>` or just inline it in
   a scratch route temporarily. Verify: TX-104 failing should degrade/fail
   WP-12 → WT-01 → downstream residential + (partially, since it has
   backup) the hospital.
2. **Tune backup/threshold logic.** Right now hospitals survive almost any
   upstream failure because `backupCapacity: 50` ≈ `requiredInputCapacity:
   50`. Decide if that's the story you want to tell (hospitals are
   resilient by design — probably yes) or if you want a scenario where even
   backup isn't enough, to make Chapter III dramatic.
3. **Expand or adjust the fixture.** 30–50 components total is the spec
   target; currently ~15 wired into dependencies out of the richer 38
   shown in `lib/seed/infrastructure.ts`'s component list — check whether
   `infrastructureDependencies` covers every component you want in the
   demo cascade, add edges for any that are currently dangling.
4. **Add at least one more incident type scenario** beyond substation
   failure — e.g. a water main break starting from `WP-12` directly — so
   the demo isn't limited to one failure path.
5. **Recovery sequencing nuance.** Currently `applyRepair` only restores
   from a single component. Consider: what happens if two components fail
   independently and one repair shouldn't restore the other? Write a test
   for that before Member 4 wires the real UI to it.

## Contract with others

- Member 4 calls `simulateFailure` + `calculateImpact` from
  `app/api/simulate/route.ts` and `applyRepair` from
  `app/api/recovery/route.ts`. Don't change function signatures without
  telling them — they're already wired.
- Member 3's AI layer receives your `Incident.estimatedImpact` and
  `affectedComponents` verbatim and is instructed to ground its
  explanation ONLY in that data — garbage in, garbage out. If your impact
  numbers are implausible, Gemini will dutifully explain implausible
  numbers.
- Member 1 renders whatever `operationalStatus` you set on each component
  — `operational | degraded | at_risk | failed | repairing | restored`
  (`types/infrastructure.ts`). Don't introduce a new status string without
  updating that type and telling Member 1 (they have colors mapped to each
  one in `InfrastructureNode.tsx`).
