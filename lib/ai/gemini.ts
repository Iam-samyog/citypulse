import type { InfrastructureComponent } from "@/types/infrastructure";
import type { Incident } from "@/types/incident";
import type { RepairOperation } from "@/types/recovery";

// Tried in order. Each model has its own quota, so when one is exhausted (429) the next
// takes over — important on the free tier, which allows only ~20 requests/day per model.
const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3-flash-preview", "gemini-3.1-flash-lite"] as const;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export class GeminiError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
    this.name = "GeminiError";
  }
}

interface GenerateOptions {
  system: string;
  messages: ChatMessage[];
  /** When set, Gemini is forced to return JSON matching this schema. */
  responseSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
  temperature?: number;
}

type ThinkingLevel = "minimal" | "low" | null;
// Fastest first; a 400 means this model does not support that level, so step down.
const THINKING_LEVELS: ThinkingLevel[] = ["minimal", "low", null];

function requestBody(o: GenerateOptions, level: ThinkingLevel) {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: o.system }] },
    contents: o.messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    generationConfig: {
      temperature: o.temperature ?? 0.6,
      maxOutputTokens: o.maxOutputTokens ?? 2048,
      // Gemini 3 "thinks" before answering, which costs seconds. Operational Q&A and
      // structured briefings do not need deep reasoning, so run it at minimal level.
      ...(level ? { thinkingConfig: { thinkingLevel: level } } : {}),
      ...(o.responseSchema ? { responseMimeType: "application/json", responseSchema: o.responseSchema } : {}),
    },
  });
}

function modelList() {
  const configuredModel = process.env.GEMINI_MODEL;
  return configuredModel
    ? [configuredModel, ...GEMINI_MODELS.filter((model) => model !== configuredModel)]
    : [...GEMINI_MODELS];
}

function requireKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("Gemini is not connected. Add GEMINI_API_KEY to .env.local and restart the server.", 503);
  }
  return apiKey;
}

function netError(error: unknown) {
  return new GeminiError(
    error instanceof Error && error.name === "TimeoutError"
      ? "Gemini took too long to respond. Please try again."
      : "Could not connect to Gemini. Check your network and try again.",
    502
  );
}

/** Maps a non-OK Gemini response to either a thrown GeminiError or "retry next model". */
async function failure(response: Response, model: string): Promise<"next" | "quota" | string> {
  const errorBody = await response.text();
  if (response.status === 401 || response.status === 403) throw new GeminiError("Gemini rejected the API key. Check GEMINI_API_KEY in .env.local.", 503);
  if (response.status === 429) return "quota";
  if (response.status === 404) return "next";
  return response.status === 503 ? "next" : `${response.status} ${errorBody}`;
}

export async function generate(options: GenerateOptions): Promise<string> {
  const apiKey = requireKey();
  let lastError = "Gemini did not return a response.";
  let quota = false;
  for (const model of modelList()) {
    for (const level of THINKING_LEVELS) {
      let response: Response;
      try {
        response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: requestBody(options, level),
          signal: AbortSignal.timeout(60_000),
        });
      } catch (error) {
        throw netError(error);
      }
      if (!response.ok) {
        const status = response.status;
        const outcome = await failure(response, model);
        if (outcome === "quota") quota = true;
        if (outcome === "next" || outcome === "quota") break;
        lastError = outcome;
        // A 400 usually means this model rejects thinkingConfig — retry once without it.
        if (status === 400 && level) continue;
        break;
      }
      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new GeminiError("Gemini returned an unreadable response. Please try again.");
      }
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("")
        .trim();
      if (!text) throw new GeminiError("Gemini returned an empty response. Please rephrase your question.");
      return text;
    }
  }
  if (quota) throw new GeminiError("Gemini's request quota is used up for now. Please try again later, or add billing to the Gemini API key.", 429);
  throw new GeminiError(`Gemini is temporarily unavailable (${lastError}). Please try again.`, 503);
}

/**
 * Streams a reply token-by-token (Server-Sent Events from Gemini) so the UI can
 * show words immediately instead of waiting for the whole answer.
 */
export async function generateStream(options: GenerateOptions): Promise<ReadableStream<Uint8Array>> {
  const apiKey = requireKey();
  let lastError = "Gemini did not return a response.";
  let quota = false;
  for (const model of modelList()) {
    for (const level of THINKING_LEVELS) {
      let response: Response;
      try {
        response = await fetch(`${GEMINI_API_BASE}/${model}:streamGenerateContent?alt=sse`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: requestBody(options, level),
          signal: AbortSignal.timeout(60_000),
        });
      } catch (error) {
        throw netError(error);
      }
      if (!response.ok || !response.body) {
        const status = response.status;
        const outcome = await failure(response, model);
        if (outcome === "quota") quota = true;
        if (outcome === "next" || outcome === "quota") break;
        lastError = outcome;
        if (status === 400 && level) continue;
        break;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      let sent = false;
      return new ReadableStream<Uint8Array>({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            if (!sent) controller.error(new GeminiError("Gemini returned an empty response. Please rephrase your question."));
            else controller.close();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            try {
              const chunk = JSON.parse(line.slice(5).trim());
              const text = chunk?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
              if (text) { sent = true; controller.enqueue(encoder.encode(text)); }
            } catch { /* ignore partial frame */ }
          }
        },
        cancel() { reader.cancel(); },
      });
    }
  }
  if (quota) throw new GeminiError("Gemini's request quota is used up for now. Please try again later, or add billing to the Gemini API key.", 429);
  throw new GeminiError(`Gemini is temporarily unavailable (${lastError}). Please try again.`, 503);
}

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
  const text = await generate({
    system: "You are an Oracle of Ithaca incident response analyst. Use only the evidence in the user message. Follow its requested response format.",
    messages: [{ role: "user", content: prompt }],
    temperature,
  });
  return parseAIResponse(text);
}

function buildAthenaPrompt(input: IncidentExplanationInput): string {
  const { incident, originComponent, affectedComponents, question } = input;
  return `You are Athena, the incident intelligence agent for Oracle of Ithaca, an
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
Oracle of Ithaca. Athena explains causality; your role is to stress-test the response,
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
