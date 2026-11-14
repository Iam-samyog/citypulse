"use client";

import { useState } from "react";
import type { AIAnalysis } from "@/types/simulation";

interface AthenaAnalysisProps {
  incidentId: string;
  analysis: AIAnalysis | null;
  onAskQuestion: (question: string) => void;
  loading?: boolean;
}

/**
 * Chapter IV, "Athena's Strategy" — the Gemini-powered incident
 * explanation panel. Member 3 (AI Engineer): this calls POST
 * /api/ai/gemini; keep the question box free-text so judges can ask
 * follow-ups live during the demo.
 */
export function AthenaAnalysis({ analysis, onAskQuestion, loading }: AthenaAnalysisProps) {
  const [question, setQuestion] = useState("");

  return (
    <div className="border border-gold/40 rounded p-4 space-y-3">
      <h3 className="font-serif text-lg">Athena&apos;s Intelligence (Gemini)</h3>

      {loading && <p className="text-sm text-ivory/60">Consulting the oracle...</p>}

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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) onAskQuestion(question.trim());
          setQuestion("");
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Athena a question..."
          className="flex-1 bg-transparent border border-gold/40 rounded px-2 py-1 text-sm"
        />
        <button
          type="submit"
          className="border border-gold px-3 py-1 text-sm uppercase hover:bg-gold hover:text-aegean transition-colors"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
