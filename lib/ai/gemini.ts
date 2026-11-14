import type { InfrastructureComponent } from "@/types/infrastructure";
import type { Incident } from "@/types/incident";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface IncidentExplanationInput {
  incident: Incident;
  originComponent: InfrastructureComponent;
  affectedComponents: InfrastructureComponent[];
  question?: string;
}

export interface AIResponseText {
  summary: string;
  recommendations: string[];
}

/**
 * Athena's Intelligence: Gemini explains WHAT happened and WHY, grounded
 * strictly in the simulation's own structured output. Never invent
 * measurements — only restate/interpret values passed in `input`.
 */
export async function explainIncident(
  input: IncidentExplanationInput
): Promise<AIResponseText> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const prompt = buildPrompt(input);

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return parseAIResponse(text);
}

function buildPrompt(input: IncidentExplanationInput): string {
  const { incident, originComponent, affectedComponents, question } = input;

  return `You are Athena, the strategic intelligence for CITYPULSE, an urban
infrastructure digital twin. Explain the following SIMULATED incident using
ONLY the data provided. Do not invent numbers or facts not present below.

ORIGIN COMPONENT:
${JSON.stringify(originComponent, null, 2)}

INCIDENT:
${JSON.stringify(incident, null, 2)}

AFFECTED COMPONENTS:
${JSON.stringify(affectedComponents, null, 2)}

${question ? `USER QUESTION: ${question}` : "Explain why this failure occurred, how it propagated, and which services are most at risk."}

Respond in two parts:
1. A concise explanation (3-5 sentences).
2. A short bullet list of recommended next actions.`;
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
    recommendations: recommendations.length > 0 ? recommendations : [],
  };
}
