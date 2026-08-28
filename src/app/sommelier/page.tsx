"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { CameraIcon, ChevronLeftIcon, PhotoIcon, SparklesIcon } from "@/components/icons";
import { compressImage } from "@/lib/image-compression";
import type { SommelierMessage } from "@/server/sommelier/sommelier";

const suggestions = [
  "What should I drink tonight?",
  "Should I buy this wine?",
  "Explain Barolo.",
  "How long can I keep this bottle?",
  "Which wine goes with duck?",
  "Tell me about Brunello.",
];
const HISTORY_KEY = "personal-sommelier-conversation";
type AttachedImage = { file: File; url: string };

export default function SommelierPage() {
  const [messages, setMessages] = useState<SommelierMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<AttachedImage[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(HISTORY_KEY);
        if (saved) setMessages(JSON.parse(saved) as SommelierMessage[]);
      } catch { localStorage.removeItem(HISTORY_KEY); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (messages.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(messages)); }, [messages]);

  function chooseSuggestion(question: string) {
    setInput(question);
    inputRef.current?.focus();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if ((!question && !images.length) || loading) return;
    const prompt = question || "Please analyse these images and advise me.";
    const nextMessages: SommelierMessage[] = [...messages, { role: "user", content: prompt }];
    setMessages(nextMessages); setInput(""); setLoading(true); setError(null);
    try {
      const form = new FormData();
      form.set("messages", JSON.stringify(nextMessages));
      images.forEach(({ file }) => form.append("images", file));
      const response = await fetch("/api/sommelier", { method: "POST", body: form });
      const data = await response.json() as { reply?: string; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error || "Your sommelier is temporarily unavailable.");
      setMessages((current) => [...current, { role: "assistant", content: data.reply! }]);
      images.forEach(({ url }) => URL.revokeObjectURL(url)); setImages([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your sommelier is temporarily unavailable.");
    } finally { setLoading(false); }
  }

  async function attach(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).slice(0, 6 - images.length);
    if (!selected.length) return;
    setError(null); setLoading(true);
    try {
      const optimized = await Promise.all(selected.map(compressImage));
      setImages((current) => [...current, ...optimized.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 6));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The photos could not be prepared."); }
    finally { setLoading(false); event.target.value = ""; }
  }

  function removeImage(index: number) {
    setImages((current) => { URL.revokeObjectURL(current[index].url); return current.filter((_, itemIndex) => itemIndex !== index); });
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
        {images.length > 0 && <div className="sommelier-attachments" aria-label="Attached photos">{images.map((image, index) => <div key={image.url}>
          {/* Blob preview URLs cannot use the Next.js image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={`Attachment ${index + 1}`} /><button type="button" onClick={() => removeImage(index)} aria-label={`Remove attachment ${index + 1}`}>×</button>
        </div>)}</div>}
        <form onSubmit={send}>
          <label className="sr-only" htmlFor="sommelier-question">Ask your sommelier</label>
          <input ref={inputRef} id="sommelier-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about wine…" autoComplete="off" disabled={loading} />
          <button type="submit" disabled={loading || (!input.trim() && !images.length)} aria-label="Send question">Send</button>
        </form>
        <div className="sommelier-photo-actions">
          <button type="button" disabled={loading || images.length >= 6} onClick={() => cameraRef.current?.click()}><CameraIcon className="size-4" /> Camera</button>
          <button type="button" disabled={loading || images.length >= 6} onClick={() => libraryRef.current?.click()}><PhotoIcon className="size-4" /> Photo Library</button>
        </div>
        <input ref={cameraRef} className="sr-only" type="file" accept="image/*" capture="environment" multiple onChange={(event) => void attach(event)} aria-label="Take photos" />
        <input ref={libraryRef} className="sr-only" type="file" accept="image/*" multiple onChange={(event) => void attach(event)} aria-label="Choose photos from library" />
      </footer>
    </section>
  </main>;
}
