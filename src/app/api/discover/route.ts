import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { discoverFromHtml, fetchHtml } from "@/lib/discover-recipes";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { url?: string };
  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const html = await fetchHtml(url);
    const result = discoverFromHtml(html, url);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Discover failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
