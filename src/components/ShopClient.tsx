"use client";

import { useState, useTransition } from "react";
import type { ShoppingListItem } from "@/lib/types";
import {
  addShopItem,
  generateShopFromPlan,
  removeShopItem,
  toggleShopItem,
} from "@/app/actions";
import { todayISO } from "@/lib/recipes";

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ShopClient({ items }: { items: ShoppingListItem[] }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await addShopItem(text);
      setText("");
    });
  }

  function onGenerate() {
    const from = todayISO();
    const to = addDays(from, 6);
    startTransition(async () => {
      const result = await generateShopFromPlan(from, to);
      setMsg(`Added ${result.added} ingredients from this week’s plan`);
    });
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="brand-mark text-3xl sm:text-4xl">Shopping list</h2>
          <p className="mt-2 text-[var(--ink-soft)]">
            Shared checklist. Generate pulls ingredients from the week’s plan and dedupes them.
          </p>
          {msg ? <p className="mt-2 text-sm font-semibold text-[var(--leaf)]">{msg}</p> : null}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending}
          onClick={onGenerate}
        >
          Generate from plan
        </button>
      </div>

      <form onSubmit={onAdd} className="surface mb-4 flex gap-2 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add an item…"
          className="flex-1 rounded-xl border border-[var(--haze)] bg-white/70 px-3 py-2 outline-none ring-[var(--leaf)] focus:ring-2"
        />
        <button type="submit" className="btn btn-secondary" disabled={pending}>
          Add
        </button>
      </form>

      <ul className="surface divide-y divide-[var(--haze)] overflow-hidden">
        {items.length === 0 ? (
          <li className="p-5 text-[var(--ink-soft)]">List is empty.</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() =>
                  startTransition(async () => {
                    await toggleShopItem(item.id, !item.checked);
                  })
                }
                className="size-4 accent-[var(--leaf)]"
              />
              <span
                className={`flex-1 ${item.checked ? "text-[var(--ink-soft)] line-through" : ""}`}
              >
                {item.text}
              </span>
              <button
                type="button"
                className="btn btn-danger text-sm"
                onClick={() =>
                  startTransition(async () => {
                    await removeShopItem(item.id);
                  })
                }
              >
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
