"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, SparklesIcon } from "@/components/icons";
import type { SommelierMessage } from "@/server/sommelier/sommelier";

const suggestions = [
  "What should I drink tonight?",
  "Should I buy this wine?",
  "Explain Barolo.",
  "How long can I keep this bottle?",
  "Which wine goes with duck?",
  "Tell me about Brunello.",
];

export default function SommelierPage() {
  const [messages, setMessages] = useState<SommelierMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  function chooseSuggestion(question: string) {
    setInput(question);
    inputRef.current?.focus();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    const nextMessages: SommelierMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages); setInput(""); setLoading(true); setError(null);
    try {
      const response = await fetch("/api/sommelier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: nextMessages }) });
      const data = await response.json() as { reply?: string; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error || "Your sommelier is temporarily unavailable.");
      setMessages((current) => [...current, { role: "assistant", content: data.reply! }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your sommelier is temporarily unavailable.");
    } finally { setLoading(false); }
  }

  return <main className="app-shell sommelier-shell relative h-dvh overflow-hidden">
    <div aria-hidden="true" className="ambient ambient-top" />
    <section className="sommelier-page page-enter relative z-10 mx-auto flex h-full w-full max-w-3xl flex-col">
      <header className="sommelier-header">
        <Link className="back-link" href="/"><ChevronLeftIcon className="size-5" /> Home</Link>
        <div><span className="sommelier-mark"><SparklesIcon className="size-4" /></span><h1>🍷 Your Sommelier</h1><p>Ask anything about wine.</p></div>
        <span aria-hidden="true" className="header-spacer" />
      </header>

      <div className="sommelier-conversation" aria-live="polite">
        {messages.length === 0 ? <section className="sommelier-welcome">
          <span className="sommelier-avatar"><SparklesIcon className="size-7" /></span>
          <h2>Hello.</h2>
          <p>I&apos;m your personal sommelier.</p>
          <p>Ask me anything about wine, food pairing, your cellar, wineries, restaurants or buying wine.</p>
          <div className="sommelier-suggestions" aria-label="Suggested questions">
            {suggestions.map((question) => <button key={question} type="button" onClick={() => chooseSuggestion(question)}>{question}</button>)}
          </div>
        </section> : <div className="message-list">
          {messages.map((message, index) => <article className={`chat-message chat-message-${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "user" ? "You" : "Sommelier"}</span><p>{message.content}</p></article>)}
          {loading && <article className="chat-message chat-message-assistant"><span>Sommelier</span><p className="typing" aria-label="Sommelier is thinking"><i /><i /><i /></p></article>}
        </div>}
        <div ref={endRef} />
      </div>

      <footer className="sommelier-composer">
        {error && <p className="sommelier-error" role="alert">{error}</p>}
        <form onSubmit={send}>
          <label className="sr-only" htmlFor="sommelier-question">Ask your sommelier</label>
          <input ref={inputRef} id="sommelier-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about wine…" autoComplete="off" disabled={loading} />
          <button type="submit" disabled={loading || !input.trim()} aria-label="Send question">Send</button>
        </form>
      </footer>
    </section>
  </main>;
}
