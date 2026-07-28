"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTextSubmission, createUrlSubmission } from "@/app/actions";

type Discovered = { title: string; url: string };

export function AddRecipeForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"url" | "text" | "file">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [listMode, setListMode] = useState(false);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<Discovered[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importResults, setImportResults] = useState<
    Array<{ title: string; url: string; ok: boolean; error?: string }> | null
  >(null);

  async function parseAndGo(id: string) {
    setMsg("Parsing recipe…");
    const res = await fetch(`/api/parse/${id}`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      setMsg(body.error ?? "Parse failed — check Review queue");
    } else {
      setMsg("Parsed — review to approve");
      router.push("/review");
      router.refresh();
    }
  }

  function onUrl(e: React.FormEvent) {
    e.preventDefault();
    setImportResults(null);
    startTransition(async () => {
      setMsg("Scanning page for recipes…");
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMsg(body.error ?? "Could not read that URL");
        return;
      }

      if (body.mode === "list" && (body.recipes?.length ?? 0) >= 2) {
        setListMode(true);
        setPageTitle(body.pageTitle ?? null);
        setDiscovered(body.recipes);
        setSelected(new Set(body.recipes.map((r: Discovered) => r.url)));
        setMsg(
          `Found ${body.recipes.length} recipes on this page. Select which to import (public pages only).`,
        );
        return;
      }

      // Single recipe page
      setListMode(false);
      const id = await createUrlSubmission(url.trim());
      await parseAndGo(id);
    });
  }

  function toggle(urlKey: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(urlKey)) next.delete(urlKey);
      else next.add(urlKey);
      return next;
    });
  }

  function selectAll(on: boolean) {
    setSelected(on ? new Set(discovered.map((d) => d.url)) : new Set());
  }

  function onImportSelected() {
    const picks = discovered.filter((d) => selected.has(d.url));
    if (!picks.length) {
      setMsg("Select at least one recipe");
      return;
    }
    startTransition(async () => {
      setMsg(`Importing ${picks.length} recipe${picks.length === 1 ? "" : "s"}…`);
      setImportResults(null);
      const res = await fetch("/api/import-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipes: picks }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMsg(body.error ?? "Import failed");
        return;
      }
      setImportResults(body.results);
      setMsg(
        `Imported ${body.imported} · ${body.failed} couldn’t be scraped (often paywalled). Public ones are in Review.`,
      );
      if (body.imported > 0) {
        // Stay so they can see failures; offer link via message
      }
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
          Paste a recipe URL, a roundup/list article, text, or upload a file. Roundups
          show a checklist. We only import publicly readable recipes.
        </p>
        {msg ? <p className="mt-2 text-sm font-semibold text-[var(--forest)]">{msg}</p> : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["url", "From URL"],
            ["text", "Paste text"],
            ["file", "Upload file"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`btn text-sm ${tab === key ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setTab(key);
              setListMode(false);
              setImportResults(null);
            }}
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
              className="w-full rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2 outline-none ring-[var(--forest)] focus:ring-2"
            />
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Working…" : "Parse & review"}
            </button>
          </form>
        ) : null}

        {tab === "url" ? (
          <div className="space-y-4">
            <form onSubmit={onUrl} className="space-y-3">
              <input
                required
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://… (recipe or roundup article)"
                className="w-full rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2 outline-none ring-[var(--forest)] focus:ring-2"
              />
              <button type="submit" className="btn btn-primary" disabled={pending}>
                {pending ? "Working…" : listMode ? "Scan again" : "Find recipes"}
              </button>
            </form>

            {listMode && discovered.length > 0 ? (
              <div className="space-y-3 border-t border-[var(--haze)] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-[var(--ink)]">
                      {pageTitle ?? "Recipes on this page"}
                    </p>
                    <p className="text-sm text-[var(--ink-soft)]">
                      {selected.size} of {discovered.length} selected
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      onClick={() => selectAll(true)}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      onClick={() => selectAll(false)}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <ul className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-[var(--haze)] bg-white/50 p-2">
                  {discovered.map((r) => (
                    <li key={r.url}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white/80">
                        <input
                          type="checkbox"
                          className="mt-1 accent-[var(--forest)]"
                          checked={selected.has(r.url)}
                          onChange={() => toggle(r.url)}
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold">{r.title}</span>
                          <span className="block truncate text-xs text-[var(--ink-soft)]">
                            {r.url}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={pending || selected.size === 0}
                  onClick={onImportSelected}
                >
                  {pending
                    ? "Importing…"
                    : `Import ${selected.size} selected`}
                </button>
                <p className="text-sm text-[var(--ink-soft)]">
                  Paywalled recipes (e.g. many NYT Cooking pages) will be skipped with an
                  error — paste those by hand.
                </p>
              </div>
            ) : null}

            {importResults ? (
              <div className="space-y-2 border-t border-[var(--haze)] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-extrabold">Import results</p>
                  <button
                    type="button"
                    className="btn btn-primary text-sm"
                    onClick={() => {
                      router.push("/review");
                      router.refresh();
                    }}
                  >
                    Open review queue
                  </button>
                </div>
                <ul className="space-y-2 text-sm">
                  {importResults.map((r) => (
                    <li
                      key={r.url}
                      className={`rounded-xl px-3 py-2 ${
                        r.ok
                          ? "bg-[rgba(168,197,160,0.35)]"
                          : "bg-[rgba(196,112,63,0.2)]"
                      }`}
                    >
                      <span className="font-bold">{r.ok ? "✓" : "✗"} {r.title}</span>
                      {r.error ? (
                        <span className="mt-0.5 block text-[var(--clay)]">{r.error}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
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
