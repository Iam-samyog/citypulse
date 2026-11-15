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
            ? "[text-shadow:none] flex h-[calc(100dvh-110px)] min-h-[420px] w-full flex-col overflow-hidden rounded-2xl border border-[#6b4220] bg-[#7a5230] bg-[url(/art/parchment.jpg)] bg-cover bg-center shadow-[0_18px_50px_rgba(0,0,0,.5)]"
            : "[text-shadow:none] mb-3 flex h-[min(620px,calc(100dvh-7rem))] w-[min(390px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-[#6b4220] bg-[#7a5230] bg-[url(/art/parchment.jpg)] bg-cover bg-center shadow-[0_20px_70px_rgba(7,27,35,.25)]"}
        >
          <header className="flex items-center gap-3 bg-[#6b0f1a] px-4 py-4 text-[#f6e6c4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/helmet.png" alt="" aria-hidden className="h-11 w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]" />
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-lg font-normal tracking-[.14em]">Athena</h2>
              <p className="mt-0.5 text-[10px] text-[#f6e6c4]/60">Ithaca AI Assistant</p>
            </div>
            {!embedded && <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-8 w-8 place-items-center rounded-lg text-xl text-white/60 hover:bg-white/10 hover:text-white">×</button>}
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5 sm:px-10">
            {(
              <div className="flex items-end gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/art/helmet.png" alt="" aria-hidden className="h-14 w-auto shrink-0 drop-shadow-[0_3px_6px_rgba(0,0,0,.5)]" />
                <div className="relative mb-2 rounded-2xl rounded-bl-sm border border-[#b98a4a]/60 bg-[#fff4d6]/90 p-4">
                  <span aria-hidden className="absolute -left-2 bottom-3 h-4 w-4 rotate-45 border-b border-l border-[#b98a4a]/60 bg-[#fff4d6]" />
                  <p className="font-heading text-base font-normal leading-7 text-black">Hello, Operator. I&apos;m Athena, your Ithaca operations assistant. I can summarize the live asset list, trace an incident, or help you choose a safe recovery order.</p>
                </div>
              </div>
            )}
            {messages.map((message) => message.role === "user" ? (
              <div
                key={message.id}
                className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm border border-[#b98a4a]/60 bg-[#fff4d6]/90 p-4 font-heading text-base font-normal leading-7 text-black"
              >
                {message.content}
              </div>
            ) : (
              <div key={message.id} className="flex items-end gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/art/helmet.png" alt="" aria-hidden className="h-14 w-auto shrink-0 drop-shadow-[0_3px_6px_rgba(0,0,0,.5)]" />
                <div className="relative mb-2 max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-[#b98a4a]/60 bg-[#fff4d6]/90 p-4 font-heading text-base font-normal leading-7 text-black">
                  <span aria-hidden className="absolute -left-2 bottom-3 h-4 w-4 rotate-45 border-b border-l border-[#b98a4a]/60 bg-[#fff4d6]" />
                  {message.content}
                </div>
              </div>
            ))}
            {sending && (
              <div role="status" className="flex items-end gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/art/helmet.png" alt="" aria-hidden className="h-14 w-auto shrink-0 drop-shadow-[0_3px_6px_rgba(0,0,0,.5)]" />
                <p className="mb-2 rounded-2xl rounded-bl-sm border border-[#b98a4a]/60 bg-[#fff4d6]/90 px-4 py-3 font-heading text-base italic text-black">Athena is thinking…</p>
              </div>
            )}
            {error && (
              <div role="alert" className="flex items-end gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/art/helmet.png" alt="" aria-hidden className="h-14 w-auto shrink-0 drop-shadow-[0_3px_6px_rgba(0,0,0,.5)]" />
                <div className="relative mb-2 max-w-[80%] rounded-2xl rounded-bl-sm border border-[#6b0f1a]/50 bg-[#fff4d6]/90 p-4 font-heading text-base leading-7 text-[#6b0f1a]">
                  <span aria-hidden className="absolute -left-2 bottom-3 h-4 w-4 rotate-45 border-b border-l border-[#6b0f1a]/50 bg-[#fff4d6]" />
                  {error}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="border-t border-[#6b4220]/60 bg-[#2a150d]/80 p-3 backdrop-blur-sm">
            <div className="flex items-end gap-2 rounded-xl border border-[#b98a4a]/60 bg-[#f6e6c4] p-2 focus-within:border-[#e4aa56]">
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
                className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-1 py-2.5 text-base text-[#3b2412] outline-none placeholder:text-[#8a6d4a]"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                aria-label="Send message"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#5a2616] text-sm font-bold text-[#f6e6c4] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ↑
              </button>
            </div>
            <p className="mt-2 text-center text-[9px] text-[#f6e6c4]/50">AI responses can be inaccurate. Verify critical decisions.</p>
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
