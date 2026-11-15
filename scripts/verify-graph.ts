/**
 * Validates the seed graph and prints the cascade for each demo scenario.
 * No database needed. Run with: npm run verify:graph
 */
import {
  demoScenarios,
  districtPopulations,
  infrastructureComponents,
  infrastructureDependencies,
} from "@/lib/seed/infrastructure";
import { simulateFailure } from "@/lib/simulation/failureEngine";
import { InfrastructureGraph } from "@/lib/simulation/graph";
import { calculateImpact } from "@/lib/simulation/impactCalculator";

const graph = new InfrastructureGraph(infrastructureComponents, infrastructureDependencies);
const validation = graph.validateGraph();

console.log(
  `${infrastructureComponents.length} components, ${infrastructureDependencies.length} dependencies`
);
for (const error of validation.errors) console.log(`ERROR  ${error}`);
for (const warning of validation.warnings) console.log(`WARN   ${warning}`);
console.log(validation.valid ? "Graph is valid.\n" : "Graph is INVALID.\n");

for (const scenario of demoScenarios) {
  const result = simulateFailure(graph, scenario.originId);
  const impact = calculateImpact(graph, scenario.originId, result.states, districtPopulations);
  const origin = graph.getComponent(scenario.originId)!;

  console.log(`=== ${scenario.title} (${scenario.chapter}): ${origin.id} ${origin.name} fails`);
  for (const status of ["offline", "degraded", "backup"] as const) {
    const hit = result.affectedComponents.filter((a) => a.newStatus === status);
    if (hit.length === 0) continue;
    console.log(`  ${status.toUpperCase()}`);
    for (const a of hit) {
      const c = graph.getComponent(a.componentId)!;
      const backup = a.backupUsed > 0 ? `, backup drawn ${a.backupUsed}` : "";
      console.log(`    ${c.id} ${c.name} (${Math.round(a.serviceLevel * 100)}% served${backup})`);
    }
  }
  const path = graph.getCriticalPath(scenario.originId);
  console.log(`  Critical path: ${path?.componentIds.join(" -> ")}`);
  console.log(
    `  Impact: ${impact.severity}, ${impact.populationExposedPct}% population exposed, ` +
      `${impact.criticalFacilitiesAffected.length} critical facilities, ` +
      `districts: ${impact.affectedDistricts.join(", ")}\n`
  );
}

if (!validation.valid) process.exit(1);
