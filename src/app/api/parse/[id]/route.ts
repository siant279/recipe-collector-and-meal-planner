import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/middleware";
import { fetchUrlText, parseRecipeWithClaude } from "@/lib/parse-recipe";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sub, error } = await supabase
    .from("recipe_submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !sub) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  try {
    let raw = sub.raw_input ?? "";
    if (sub.input_type === "url" && sub.source_ref) {
      raw = await fetchUrlText(sub.source_ref);
    } else if (
      (sub.input_type === "pdf" || sub.input_type === "image") &&
      sub.source_ref
    ) {
      const admin = createAdminClient();
      const { data: file, error: dlError } = await admin.storage
        .from("recipe-uploads")
        .download(sub.source_ref);
      if (dlError) throw new Error(dlError.message);
      // For MVP we pass a note; OCR can be layered later. Prefer text uploads / paste.
      raw = `[Uploaded ${sub.input_type} file: ${sub.source_ref}]\nPlease ask the user to paste text if parse quality is poor.\nBinary size: ${file.size} bytes.`;
    }

    const parsed = await parseRecipeWithClaude(raw);
    if (sub.input_type === "url") {
      parsed.source_url = sub.source_ref;
    }

    const { error: updateError } = await supabase
      .from("recipe_submissions")
      .update({
        parsed_recipe: parsed,
        status: "needs_review",
        parse_error: null,
      })
      .eq("id", id);

    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ ok: true, parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse failed";
    await supabase
      .from("recipe_submissions")
      .update({ status: "pending", parse_error: message })
      .eq("id", id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
