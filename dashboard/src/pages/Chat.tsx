import { useEffect, useRef, useState } from "react";

import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import type { ChatMessage } from "../lib/types";

export function Chat(): JSX.Element {
  const { data, loading, error, refresh } = useApi(apiClient.getChatHistory, []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(data ?? []);
  }, [data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(): Promise<void> {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const optimisticUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: "00000000-0000-0000-0000-000000000001",
      role: "user",
      content: trimmed,
      metadata: {},
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticUserMessage]);
    setDraft("");
    setSending(true);
    setSendError(null);

    try {
      const response = await apiClient.sendChatMessage(trimmed);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: optimisticUserMessage.user_id,
        role: "assistant",
        content: response.response,
        metadata: {
          reflection_question: response.reflection_question,
          context_used: response.context_used,
        },
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, assistantMessage]);
      await refresh();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Unable to reach the coach.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Coach Chat</h2>
          <p className="mt-2 text-sm text-slate-400">
            Ask about discipline, recurring patterns, or today’s behavior. The coach uses your real trade data and never gives trade calls.
          </p>
        </div>

        <div ref={scrollRef} className="h-[520px] space-y-4 overflow-y-auto rounded-[24px] border border-edge bg-[#11141D] p-4">
          {loading && <div className="text-sm text-slate-500">Loading chat history...</div>}
          {error && <div className="rounded-2xl border border-block/40 bg-block/10 px-4 py-3 text-sm text-block">{error}</div>}
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "border border-edge bg-panel text-slate-100"
                }`}
              >
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  {message.role === "assistant" ? "Coach" : "You"}
                </div>
                <div>{message.content}</div>
                {message.role === "assistant" && message.metadata.reflection_question && (
                  <div className="mt-3 rounded-2xl border border-warn/30 bg-warn/10 px-3 py-3 text-warn">
                    Reflection: {message.metadata.reflection_question}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-[22px] border border-edge bg-panel px-4 py-3 text-sm text-slate-400">
                Coach is thinking...
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder="Why do I keep pressing after a loss?"
            className="flex-1 resize-none rounded-[22px] border border-edge bg-[#11141D] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending}
            className="rounded-[22px] bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            Send
          </button>
        </div>
        {sendError && <div className="mt-3 text-sm text-block">{sendError}</div>}
      </div>

      <aside className="space-y-4">
        <div className="rounded-[28px] border border-edge bg-panel p-5 shadow-panel">
          <h3 className="text-lg font-semibold text-white">Use This For</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li>Reviewing emotional shifts after losses</li>
            <li>Understanding weak time-of-day behavior</li>
            <li>Spotting overtrading and revenge patterns</li>
            <li>Preparing reflection questions for tomorrow</li>
          </ul>
        </div>
      </aside>
    </section>
  );
}
