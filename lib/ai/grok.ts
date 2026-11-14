import type { InfrastructureComponent } from "@/types/infrastructure";
import type { Incident } from "@/types/incident";
import type { RepairOperation } from "@/types/recovery";
import { parseAIResponse, type AIResponseText } from "./gemini";

const GROK_MODEL = "grok-4-fast";

export interface RecoveryReviewInput {
  incident: Incident;
  originComponent: InfrastructureComponent;
  affectedComponents: InfrastructureComponent[];
  proposedRepairs: RepairOperation[];
}

/**
 * The Strategic Oracle: Grok independently reviews the PROPOSED recovery
 * plan and flags overlooked dependencies, priority mismatches, or
 * unreasonable assumptions. It never alters the simulation state — it only
 * returns advisory text.
 */
export async function reviewRecoveryPlan(
  input: RecoveryReviewInput
): Promise<AIResponseText> {
  const apiKey = process.env.GROK_API_KEY;
  const baseUrl = process.env.GROK_API_BASE_URL ?? "https://api.x.ai/v1";
  if (!apiKey) {
    throw new Error("GROK_API_KEY is not set");
  }

  const prompt = buildPrompt(input);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "You are the Strategic Oracle for CITYPULSE, an urban infrastructure " +
            "digital twin. You independently critique recovery plans for simulated " +
            "incidents. Be specific and reference only the data given to you.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";

  return parseAIResponse(text);
}

function buildPrompt(input: RecoveryReviewInput): string {
  const { incident, originComponent, affectedComponents, proposedRepairs } = input;

  return `INCIDENT:
${JSON.stringify(incident, null, 2)}

ORIGIN COMPONENT:
${JSON.stringify(originComponent, null, 2)}

AFFECTED COMPONENTS:
${JSON.stringify(affectedComponents, null, 2)}

PROPOSED RECOVERY PLAN:
${JSON.stringify(proposedRepairs, null, 2)}

Review this recovery plan. Identify:
1. Any dependency or critical facility the plan overlooks.
2. Whether the repair sequence/priority makes sense.
3. Any backup infrastructure that should be checked first.

Respond with a short critique paragraph followed by a bullet list of concrete
recommendations.`;
}
