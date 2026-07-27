/**
 * Phase 3 — background ingestion endpoints.
 *
 * These write into the same `recipe_submissions` table as the in-app form.
 * Wire a Vercel Cron (see vercel.json) or external scheduler once Gmail/Drive
 * OAuth credentials are set on the personal Vercel project.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/middleware";

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;
  // Vercel Cron sends this header on scheduled invocations
  if (request.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const results = {
    gmail: await ingestGmail(admin),
    drive: await ingestDrive(admin),
  };

  return NextResponse.json({ ok: true, results });
}

type Admin = ReturnType<typeof createAdminClient>;

async function ingestGmail(admin: Admin) {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const label = process.env.GMAIL_LABEL ?? "Recipe Inbox";

  if (!clientId || !clientSecret || !refreshToken) {
    return { skipped: true, reason: "Gmail OAuth env vars not configured" };
  }

  // Placeholder: exchange refresh token → list messages with label → create submissions.
  void label;
  void admin;
  return {
    skipped: false,
    note: "Gmail credentials present — implement message pull against Gmail API here",
    created: 0,
  };
}

async function ingestDrive(admin: Admin) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    return { skipped: true, reason: "GOOGLE_DRIVE_FOLDER_ID not configured" };
  }

  void admin;
  return {
    skipped: false,
    note: "Drive folder configured — implement file list + extract here",
    created: 0,
  };
}
