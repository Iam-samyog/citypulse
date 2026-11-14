import type { ImpactEstimate } from "@/types/incident";

interface ImpactReportProps {
  impact: ImpactEstimate;
}

/** Renders the structured impact estimate as a simple stat table. */
export function ImpactReport({ impact }: ImpactReportProps) {
  const rows: Array<[string, string | number]> = [
    ["Directly failed components", impact.directlyFailedCount],
    ["Downstream components affected", impact.downstreamAffectedCount],
    ["Potentially affected districts", impact.affectedDistricts.length],
    ["Population exposed to disruption", `${impact.populationExposedPct}%`],
    ["Critical facilities requiring attention", impact.criticalFacilitiesAffected.length],
    ["Estimated recovery time", `${impact.estimatedRecoveryMinutes} minutes`],
    ["Severity", impact.severity.toUpperCase()],
  ];

  return (
    <div className="border border-gold/40 rounded p-4">
      <h3 className="font-serif text-lg mb-3">Impact Report</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-gold/10 last:border-0">
              <td className="py-1.5 text-ivory/70">{label}</td>
              <td className="py-1.5 text-right font-medium">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ivory/50 mt-3">
        Simulated values from the city model, not real municipal measurements.
      </p>
    </div>
  );
}
