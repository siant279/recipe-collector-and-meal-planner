import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { APP_NAME, APP_TAGLINE } from "@/lib/labels";

const NAV = [
  { href: "/today", label: "Today" },
  { href: "/browse", label: "Browse" },
  { href: "/plan", label: "Plan" },
  { href: "/shop", label: "Shop" },
  { href: "/add", label: "Add" },
  { href: "/review", label: "Review" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <header className="fade-up mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
            {APP_TAGLINE}
          </p>
          <Link href="/today" className="brand-mark text-2xl sm:text-3xl">
            {APP_NAME}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--ink-soft)] sm:inline">
            {user.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <nav className="fade-up mb-8 flex flex-wrap gap-2" style={{ animationDelay: "60ms" }}>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-[var(--haze)] bg-white/60 px-3.5 py-1.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-white hover:shadow-sm"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
