import type { AIAnalysis } from "@/types/simulation";

interface OracleReviewProps {
  analysis: AIAnalysis | null;
  onRequestReview: () => void;
  loading?: boolean;
}

/**
 * Chapter IV, "Athena's Strategy" — the Grok-powered independent
 * strategic review, shown side-by-side with AthenaAnalysis so judges can
 * compare the two AI perspectives directly.
 */
export function OracleReview({ analysis, onRequestReview, loading }: OracleReviewProps) {
  return (
    <div className="border border-gold/40 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg">The Strategic Oracle (Grok)</h3>
        <button
          onClick={onRequestReview}
          className="border border-gold px-3 py-1 text-xs uppercase hover:bg-gold hover:text-aegean transition-colors"
        >
          Review Plan
        </button>
      </div>

      {loading && <p className="text-sm text-ivory/60">The oracle is deliberating...</p>}

      {analysis && (
        <div className="space-y-2 text-sm">
          <p>{analysis.generatedSummary}</p>
          {analysis.recommendations.length > 0 && (
            <ul className="list-disc list-inside space-y-1 text-ivory/80">
              {analysis.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
