"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Incident } from "@/types/incident";
import type { InfrastructureComponent } from "@/types/infrastructure";
import type { ChatMessage } from "@/lib/ai/gemini";

interface ChatbotWidgetProps {
  components: InfrastructureComponent[];
  incidents: Incident[];
  embedded?: boolean;
}

interface DisplayMessage extends ChatMessage {
  id: number;
}

export function ChatbotWidget({ components, incidents, embedded = false }: ChatbotWidgetProps) {
  const [open, setOpen] = useState(embedded);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    const userMessage: DisplayMessage = { id: nextId.current++, role: "user", content };
    const conversation = [...messages, userMessage].slice(-20);
    setMessages(conversation);
    setInput("");
    setError(null);
    setSending(true);

    const context = JSON.stringify({
      assets: components.slice(0, 40).map(({ id, name, category, status, district }) => ({
        id, name, category, status, district,
      })),
      incidents: incidents.slice(0, 12).map(({ incidentId, incidentType, incidentStatus, severity, componentId }) => ({
        incidentId, incidentType, incidentStatus, severity, componentId,
      })),
    });

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
          context,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The assistant is unavailable.");
      setMessages((current) => [...current, {
        id: nextId.current++,
        role: "assistant",
        content: result.reply,
      }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The assistant is unavailable.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={embedded ? "w-full" : "fixed bottom-5 right-5 z-[60]"}>
      {open && (
        <section
          aria-label="Athena AI chat"
          className={embedded
            ? "flex h-[min(650px,calc(100dvh-240px))] min-h-[420px] w-full flex-col overflow-hidden rounded-2xl border border-[#dbe5e8] bg-white shadow-[0_12px_42px_rgba(7,27,35,.12)]"
            : "mb-3 flex h-[min(620px,calc(100dvh-7rem))] w-[min(390px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-[#dbe5e8] bg-white shadow-[0_20px_70px_rgba(7,27,35,.25)]"}
        >
          <header className="flex items-center gap-3 bg-[#071b23] px-4 py-4 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4aa56] text-lg font-semibold text-[#071b23]">✦</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Athena</h2>
              <p className="mt-0.5 text-[10px] text-white/55">CITYPULSE AI assistant · Gemini</p>
            </div>
            {!embedded && <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-8 w-8 place-items-center rounded-lg text-xl text-white/60 hover:bg-white/10 hover:text-white">×</button>}
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f7f9fa] p-4">
            {messages.length === 0 && (
              <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-[#e1e9ec] bg-white p-3 text-xs leading-5 text-[#52636a] shadow-sm">
                Hello, Operator. Ask me about Ithaca&apos;s infrastructure, system health, or incident activity.
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-xs leading-5 ${
                  message.role === "user"
                    ? "ml-auto rounded-br-sm bg-[#0b2a35] text-white"
                    : "rounded-tl-sm border border-[#e1e9ec] bg-white text-[#34464e] shadow-sm"
                }`}
              >
                {message.content}
              </div>
            ))}
            {sending && <p role="status" className="text-[11px] text-[#7b8b92]">Athena is thinking…</p>}
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] leading-5 text-red-700">{error}</p>}
          </div>

          <form onSubmit={sendMessage} className="border-t border-[#e5ebed] bg-white p-3">
            <div className="flex items-end gap-2 rounded-xl border border-[#dce5e8] bg-[#f8fafb] p-2 focus-within:border-[#7daebb]">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                aria-label="Message Athena"
                placeholder="Ask Athena a question…"
                rows={1}
                maxLength={2000}
                className="max-h-24 min-h-9 flex-1 resize-y bg-transparent px-1 py-2 text-xs text-[#263940] outline-none placeholder:text-[#9aa7ac]"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                aria-label="Send message"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e4aa56] text-sm font-bold text-[#071b23] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ↑
              </button>
            </div>
            <p className="mt-2 text-center text-[9px] text-[#9aa7ac]">AI responses can be inaccurate. Verify critical decisions.</p>
          </form>
        </section>
      )}

      {!embedded && (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close Athena chat" : "Open Athena chat"}
          aria-expanded={open}
          className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#e4aa56] text-2xl text-[#071b23] shadow-[0_8px_24px_rgba(7,27,35,.28)] transition hover:scale-105 hover:bg-[#efbd72] focus:outline-none focus:ring-4 focus:ring-[#e4aa56]/35"
        >
          {open ? "×" : "✦"}
        </button>
      )}
    </div>
  );
}
