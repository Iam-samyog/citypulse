import type { InfrastructureComponent } from "@/types/infrastructure";
import type { Incident } from "@/types/incident";
import type { RepairOperation } from "@/types/recovery";

const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash"] as const;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export interface IncidentExplanationInput {
  incident: Incident;
  originComponent: InfrastructureComponent;
  affectedComponents: InfrastructureComponent[];
  question?: string;
}

export interface OracleConsultationInput extends IncidentExplanationInput {
  proposedRepairs: RepairOperation[];
}

export interface AIResponseText {
  summary: string;
  recommendations: string[];
}

/** Athena explains what happened and why, grounded in simulation output. */
export async function explainIncident(input: IncidentExplanationInput): Promise<AIResponseText> {
  return generateGeminiResponse(buildAthenaPrompt(input), 0.4);
}

/** Oracle uses the same Gemini model but independently stress-tests strategy. */
export async function consultOracle(input: OracleConsultationInput): Promise<AIResponseText> {
  return generateGeminiResponse(buildOraclePrompt(input), 0.65);
}

async function generateGeminiResponse(prompt: string, temperature: number): Promise<AIResponseText> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  let lastError = "Gemini did not return a response";
  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: 700 },
        }),
        signal: AbortSignal.timeout(12_000),
      });

      if (response.ok) {
        const data = await response.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return parseAIResponse(text);
      }

      lastError = `${response.status} ${await response.text()}`;
      if (response.status !== 429 && response.status !== 503) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "request timed out";
    }
  }
  throw new Error(`Gemini API error: ${lastError}`);
}

function buildAthenaPrompt(input: IncidentExplanationInput): string {
  const { incident, originComponent, affectedComponents, question } = input;
  return `You are Athena, the incident intelligence agent for CITYPULSE, an
urban infrastructure digital twin. Explain the SIMULATED incident using ONLY
the evidence provided. Trace causality and operational impact. Never invent
numbers or city facts.

ORIGIN COMPONENT:
${JSON.stringify(originComponent, null, 2)}

INCIDENT:
${JSON.stringify(incident, null, 2)}

AFFECTED COMPONENTS:
${JSON.stringify(affectedComponents, null, 2)}

${question ? `OPERATOR QUESTION: ${question}` : "Explain why this failure occurred, how it propagated, and which services are most at risk."}

Respond with a concise explanation (3-5 sentences), then a short bullet list
of recommended next actions.`;
}

function buildOraclePrompt(input: OracleConsultationInput): string {
  const { incident, originComponent, affectedComponents, proposedRepairs, question } = input;
  return `You are Oracle, the independent strategic foresight agent for
CITYPULSE. Athena explains causality; your role is to stress-test the response,
challenge assumptions, identify second-order risks, and recommend a resilient
recovery strategy. Use ONLY the simulated evidence below. Never invent
measurements, resources, or city facts.

ORIGIN COMPONENT:
${JSON.stringify(originComponent, null, 2)}

INCIDENT:
${JSON.stringify(incident, null, 2)}

AFFECTED COMPONENTS:
${JSON.stringify(affectedComponents, null, 2)}

PROPOSED REPAIRS:
${JSON.stringify(proposedRepairs, null, 2)}

${question ? `OPERATOR QUESTION: ${question}` : "Independently evaluate the recovery posture, overlooked dependencies, backup risks, and best restoration sequence."}

Respond with a concise strategic assessment (3-5 sentences), then a short
bullet list of prioritized actions.`;
}

export function parseAIResponse(text: string): AIResponseText {
  const [summaryPart, ...rest] = text.split(/\n(?=[-*•])/);
  const recommendations = rest
    .join("\n")
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  return {
    summary: summaryPart.trim(),
    recommendations,
  };
}
