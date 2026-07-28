"use client";

import { useState, useTransition } from "react";
import type { ParsedRecipeDraft, RecipeSubmission } from "@/lib/types";
import { MEAL_LABELS, AUDIENCE_LABELS } from "@/lib/labels";
import {
  approveSubmission,
  rejectSubmission,
  updateSubmissionDraft,
} from "@/app/actions";

function draftFrom(sub: RecipeSubmission): ParsedRecipeDraft {
  const p = sub.parsed_recipe ?? {};
  return {
    title: p.title ?? "",
    source: p.source ?? null,
    meal_type: p.meal_type ?? null,
    audience: p.audience ?? null,
    servings: p.servings ?? null,
    prep_time: p.prep_time ?? null,
    cook_time: p.cook_time ?? null,
    ingredients: p.ingredients ?? [],
    directions: p.directions ?? [],
    optional_sides: p.optional_sides ?? [],
    choking_flags: p.choking_flags ?? [],
    tags: p.tags ?? [],
    source_url: p.source_url ?? null,
  };
}

export function ReviewClient({ submissions }: { submissions: RecipeSubmission[] }) {
  const [editing, setEditing] = useState<Record<string, ParsedRecipeDraft>>({});
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function getDraft(sub: RecipeSubmission) {
    return editing[sub.id] ?? draftFrom(sub);
  }

  function setField(sub: RecipeSubmission, key: keyof ParsedRecipeDraft, value: string) {
    const base = getDraft(sub);
    let next: ParsedRecipeDraft = { ...base };
    if (key === "ingredients" || key === "directions" || key === "optional_sides" || key === "choking_flags" || key === "tags") {
      next = { ...base, [key]: value.split("\n").map((l) => l.trim()).filter(Boolean) };
    } else if (key === "meal_type") {
      next = {
        ...base,
        meal_type: (value || null) as ParsedRecipeDraft["meal_type"],
      };
    } else if (key === "audience") {
      next = {
        ...base,
        audience: (value || null) as ParsedRecipeDraft["audience"],
      };
    } else {
      next = { ...base, [key]: value };
    }
    setEditing((prev) => ({ ...prev, [sub.id]: next }));
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="brand-mark text-3xl sm:text-4xl">Review queue</h2>
        <p className="mt-2 text-[var(--ink-soft)]">
          Approve, edit, or reject parsed recipes before they enter the library.
        </p>
        {msg ? <p className="mt-2 text-sm font-semibold text-[var(--leaf)]">{msg}</p> : null}
      </div>

      {submissions.length === 0 ? (
        <div className="surface p-6 text-[var(--ink-soft)]">Queue is clear.</div>
      ) : (
        <div className="grid gap-4">
          {submissions.map((sub) => {
            const draft = getDraft(sub);
            return (
              <article key={sub.id} className="surface space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip">{sub.input_type ?? "unknown"}</span>
                  <span className="chip">{sub.status}</span>
                  <span className="text-sm text-[var(--ink-soft)]">
                    {new Date(sub.created_at).toLocaleString()}
                  </span>
                </div>
                {sub.parse_error ? (
                  <p className="text-sm font-semibold text-[var(--berry)]">
                    {sub.parse_error}
                  </p>
                ) : null}

                <label className="block">
                  <span className="text-sm font-bold">Title</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--haze)] bg-white/70 px-3 py-2"
                    value={draft.title}
                    onChange={(e) => setField(sub, "title", e.target.value)}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-bold">Meal type</span>
                    <select
                      className="mt-1 w-full rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2"
                      value={draft.meal_type ?? ""}
                      onChange={(e) => setField(sub, "meal_type", e.target.value)}
                    >
                      <option value="">Choose…</option>
                      <option value="breakfast">{MEAL_LABELS.breakfast}</option>
                      <option value="lunch">{MEAL_LABELS.lunch}</option>
                      <option value="dinner">{MEAL_LABELS.dinner}</option>
                      <option value="snack">{MEAL_LABELS.snack}</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold">Who is it for?</span>
                    <select
                      className="mt-1 w-full rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2"
                      value={draft.audience ?? ""}
                      onChange={(e) => setField(sub, "audience", e.target.value)}
                    >
                      <option value="">Choose…</option>
                      <option value="cami">{AUDIENCE_LABELS.cami}</option>
                      <option value="adult">{AUDIENCE_LABELS.adult}</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold">Source</span>
                    <input
                      className="mt-1 w-full rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2"
                      value={draft.source ?? ""}
                      onChange={(e) => setField(sub, "source", e.target.value)}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-bold">Ingredients (one per line)</span>
                  <textarea
                    rows={6}
                    className="mt-1 w-full rounded-xl border border-[var(--haze)] bg-white/70 px-3 py-2"
                    value={(draft.ingredients ?? []).join("\n")}
                    onChange={(e) => setField(sub, "ingredients", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold">Directions (one per line)</span>
                  <textarea
                    rows={6}
                    className="mt-1 w-full rounded-xl border border-[var(--haze)] bg-white/70 px-3 py-2"
                    value={(draft.directions ?? []).join("\n")}
                    onChange={(e) => setField(sub, "directions", e.target.value)}
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await updateSubmissionDraft(sub.id, draft);
                        setMsg("Draft saved");
                      })
                    }
                  >
                    Save edits
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary text-sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await approveSubmission(sub.id, draft);
                        setMsg("Approved into library");
                      })
                    }
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger text-sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await rejectSubmission(sub.id);
                        setMsg("Rejected");
                      })
                    }
                  >
                    Reject
                  </button>
                  {sub.status === "pending" ? (
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await fetch(`/api/parse/${sub.id}`, {
                            method: "POST",
                          });
                          const body = await res.json();
                          setMsg(res.ok ? "Re-parsed" : body.error);
                          if (res.ok) window.location.reload();
                        })
                      }
                    >
                      Re-parse
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
