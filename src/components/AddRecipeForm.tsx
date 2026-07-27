"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTextSubmission, createUrlSubmission } from "@/app/actions";

export function AddRecipeForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"url" | "text" | "file">("text");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function parseAndGo(id: string) {
    setMsg("Parsing recipe…");
    const res = await fetch(`/api/parse/${id}`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      setMsg(body.error ?? "Parse failed — check Review queue");
    } else {
      setMsg("Parsed — review to approve");
    }
    router.push("/review");
    router.refresh();
  }

  function onUrl(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const id = await createUrlSubmission(url.trim());
      await parseAndGo(id);
    });
  }

  function onText(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const id = await createTextSubmission(text.trim());
      await parseAndGo(id);
    });
  }

  async function onFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const body = await res.json();
      if (!res.ok) {
        setMsg(body.error ?? "Upload failed");
        return;
      }
      await parseAndGo(body.id);
    });
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="brand-mark text-3xl sm:text-4xl">Add a recipe</h2>
        <p className="mt-2 text-[var(--ink-soft)]">
          Paste a URL, text, or upload a file. Everything lands in the review queue before
          it joins the library.
        </p>
        {msg ? <p className="mt-2 text-sm font-semibold text-[var(--leaf)]">{msg}</p> : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["text", "Paste text"],
            ["url", "From URL"],
            ["file", "Upload file"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`btn text-sm ${tab === key ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="surface p-5">
        {tab === "text" ? (
          <form onSubmit={onText} className="space-y-3">
            <textarea
              required
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the recipe…"
              className="w-full rounded-xl border border-[var(--haze)] bg-white/70 px-3 py-2 outline-none ring-[var(--leaf)] focus:ring-2"
            />
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Working…" : "Parse & review"}
            </button>
          </form>
        ) : null}

        {tab === "url" ? (
          <form onSubmit={onUrl} className="space-y-3">
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-xl border border-[var(--haze)] bg-white/70 px-3 py-2 outline-none ring-[var(--leaf)] focus:ring-2"
            />
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Working…" : "Fetch, parse & review"}
            </button>
          </form>
        ) : null}

        {tab === "file" ? (
          <form onSubmit={onFile} className="space-y-3">
            <input
              required
              name="file"
              type="file"
              accept=".pdf,image/*"
              className="w-full text-sm"
            />
            <p className="text-sm text-[var(--ink-soft)]">
              Uploads are stored securely. For best results with photos/PDFs, also paste the
              text if OCR quality is poor.
            </p>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Working…" : "Upload & parse"}
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
