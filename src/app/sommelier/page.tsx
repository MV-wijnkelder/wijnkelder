"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, PhotoIcon, SparklesIcon } from "@/components/icons";
import { compressImage } from "@/lib/image-compression";
import { FRIENDLY_SOMMELIER_ERROR, requestSommelier } from "@/lib/sommelier-request";
import type { SommelierImageSet, SommelierMessage } from "@/server/sommelier/sommelier";

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
  const [imageSets, setImageSets] = useState<SommelierImageSet[]>([]);
  const [pendingImages, setPendingImages] = useState<Array<{ name: string; dataUrl: string }>>([]);
  const [preparingImages, setPreparingImages] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  function chooseSuggestion(question: string) {
    setInput(question);
    inputRef.current?.focus();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if ((!question && pendingImages.length === 0) || loading || preparingImages) return;
    const prompt = question || "What would you recommend from these images?";
    const imageSetNumber = imageSets.length + 1;
    const newSet = pendingImages.length ? { id: crypto.randomUUID(), messageIndex: messages.length, label: imageSetLabel(imageSetNumber, pendingImages.map((image) => image.name)), images: pendingImages } satisfies SommelierImageSet : null;
    const nextImageSets = newSet ? [...imageSets, newSet] : imageSets;
    const nextMessages: SommelierMessage[] = [...messages, { role: "user", content: newSet ? `${prompt}\n📷 ${newSet.label}` : prompt }];
    setMessages(nextMessages); setInput(""); setLoading(true); setError(null);
    setImageSets(nextImageSets); setPendingImages([]);
    try {
      const reply = await requestSommelier({ messages: nextMessages, imageSets: nextImageSets });
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : FRIENDLY_SOMMELIER_ERROR);
    } finally { setLoading(false); }
  }

  async function chooseImages(files: FileList | null) {
    if (!files?.length) return;
    setPreparingImages(true); setError(null);
    try {
      const selected = Array.from(files).slice(0, 4);
      const images = await Promise.all(selected.map(async (file) => {
        const compressed = await compressImage(file);
        return { name: file.name, dataUrl: await fileToDataUrl(compressed) };
      }));
      setPendingImages(images);
    } catch { setError("I couldn't prepare those images. Please choose JPEG, PNG, or WebP files and try again."); }
    finally { setPreparingImages(false); if (fileRef.current) fileRef.current.value = ""; }
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
        {pendingImages.length > 0 && <div className="sommelier-attachments"><span>New image set · {pendingImages.length} {pendingImages.length === 1 ? "image" : "images"}</span><button type="button" onClick={() => setPendingImages([])}>Remove</button></div>}
        <form onSubmit={send}>
          <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void chooseImages(event.target.files)} />
          <button className="sommelier-upload" type="button" onClick={() => fileRef.current?.click()} disabled={loading || preparingImages} aria-label="Add images"><PhotoIcon className="size-5" /></button>
          <label className="sr-only" htmlFor="sommelier-question">Ask your sommelier</label>
          <input ref={inputRef} id="sommelier-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder={preparingImages ? "Preparing images…" : "Ask about wine…"} autoComplete="off" disabled={loading || preparingImages} />
          <button type="submit" disabled={loading || preparingImages || (!input.trim() && pendingImages.length === 0)} aria-label="Send question">Send</button>
        </form>
      </footer>
    </section>
  </main>;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid image"));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function imageSetLabel(number: number, names: string[]): string {
  const prefix = `Image Set ${number}`;
  const namesLabel = names.join(" + ");
  return namesLabel.length > 96 ? `${prefix} (${names.length} images)` : `${prefix} (${namesLabel})`;
}
