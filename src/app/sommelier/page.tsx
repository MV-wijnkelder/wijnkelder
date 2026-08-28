"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { CameraIcon, ChevronLeftIcon, PhotoIcon, SparklesIcon } from "@/components/icons";
import { compressImage } from "@/lib/image-compression";
import { clearRememberedImageSets, loadRememberedImageSets, saveRememberedImageSets, type RememberedImageSet } from "@/lib/sommelier-image-memory";
import { FRIENDLY_SOMMELIER_ERROR, requestSommelier } from "@/lib/sommelier-request";
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
  const [imageSets, setImageSets] = useState<RememberedImageSet[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(HISTORY_KEY);
        if (saved) setMessages(JSON.parse(saved) as SommelierMessage[]);
        void loadRememberedImageSets().then(setImageSets).catch(() => setImageSets([]));
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
    const request = new AbortController();
    requestRef.current = request;
    setMessages(nextMessages); setInput(""); setLoading(true); setError(null);
    try {
      const newSet = images.length ? { id: crypto.randomUUID(), label: `Image Set ${imageSets.length + 1}`, files: images.map(({ file }) => file) } : null;
      const rememberedSets = [...imageSets, ...(newSet ? [newSet] : [])].slice(-6);
      while (rememberedSets.reduce((total, set) => total + set.files.length, 0) > 18) rememberedSets.shift();
      const reply = await requestSommelier(() => {
        const form = new FormData();
        form.set("messages", JSON.stringify(nextMessages));
        form.set("imageSets", JSON.stringify(rememberedSets.map((set) => ({ id: set.id, label: set.label, imageCount: set.files.length }))));
        rememberedSets.forEach((set) => set.files.forEach((file) => form.append("images", file)));
        return form;
      }, fetch, request.signal);
      if (request.signal.aborted) return;
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      if (newSet) { setImageSets(rememberedSets); void saveRememberedImageSets(rememberedSets).catch(() => undefined); }
      images.forEach(({ url }) => URL.revokeObjectURL(url)); setImages([]);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : FRIENDLY_SOMMELIER_ERROR);
    } finally {
      if (requestRef.current === request) { requestRef.current = null; setLoading(false); }
    }
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

  function newConversation() {
    requestRef.current?.abort(); requestRef.current = null;
    images.forEach(({ url }) => URL.revokeObjectURL(url));
    setMessages([]); setImages([]); setImageSets([]); setInput(""); setError(null); setLoading(false);
    localStorage.removeItem(HISTORY_KEY);
    void clearRememberedImageSets().catch(() => undefined);
  }

  return <main className="app-shell sommelier-shell relative h-dvh overflow-hidden">
    <div aria-hidden="true" className="ambient ambient-top" />
    <section className="sommelier-page page-enter relative z-10 mx-auto flex h-full w-full max-w-3xl flex-col">
      <header className="sommelier-header">
        <Link className="back-link" href="/"><ChevronLeftIcon className="size-5" /> Home</Link>
        <div><span className="sommelier-mark"><SparklesIcon className="size-4" /></span><h1>🍷 Your Sommelier</h1><p>Ask anything about wine.</p></div>
        <button className="sommelier-new-chat" type="button" onClick={newConversation}>New chat</button>
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
