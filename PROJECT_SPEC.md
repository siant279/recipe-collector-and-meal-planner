# Cami's Meal Planner — Handoff Spec

## Background
Sian and her husband want a shared meal/snack planning app for their daughter Cami (age 3-5). It replaces a single-session prototype (a static HTML artifact) with a real multi-user web app: both parents log in, see the same recipe library, plan, and shopping list, and can each add new recipes they find (web links, forwarded emails, documents/photos, Google Drive uploads).

## What's already done (see attached files)
- `recipes.json` — 177 recipes extracted and structured from three Kids Eat in Color cookbooks (Everyday Lunches, Everyday Snacks, Real Easy Weekdays). Each recipe has: `title`, `source`, `meal_type` (breakfast/lunch/snack/dinner), `day` (original rotation day, if from Real Easy Weekdays), `servings`, `prep_time`, `cook_time`, `ingredients` (array of strings), `directions` (array of strings), `optional_sides` (array), `choking_flags` (array of hazard categories, keyword-scanned against KEIC's own choking-hazard guidance for under-4s, since Cami is 3-5). Use this as the seed data for the `recipes` table.
- `schema.sql` — full Postgres schema for Supabase: `recipes`, `recipe_submissions` (ingestion/review queue), `meal_plan`, `shopping_list_items`, plus RLS policies (currently "any authenticated user" — this is a two-person household app, not multi-tenant).

## Stack recommendation
- **Supabase**: Postgres + Auth (email/password is enough for two users) + Storage (for any uploaded images/PDFs) + Edge Functions (for parsing ingestion inputs).
- **Next.js** (App Router) on Vercel, or any framework Cursor's agent is comfortable with — no hard requirement here, just needs Supabase client + auth.
- **Recipe parsing**: whatever LLM API you wire up (e.g. Anthropic's Claude API) to turn raw pasted text / fetched URL content / OCR'd images into the structured recipe shape used in `recipes.json`. Every parse result should land in `recipe_submissions.parsed_recipe` as a draft, not go straight into `recipes` — recipe blogs especially are messy (ads, life stories around the actual recipe) and deserve a one-tap human approve step.

## Core screens
1. **Today's Picks** — one suggested breakfast/lunch/snack/dinner, deterministically rotated by date (see `dayHash` approach in the old artifact for a simple reference algorithm) so it varies daily without needing real personalization logic yet. "Shuffle" for a different pick, "Add to Plan".
2. **Browse & Search** — filter by meal type, source/book, choking-hazard flag; free-text search across title + ingredients.
3. **My Plan** — shared list of planned meals by date/slot (backed by `meal_plan` table, not local storage).
4. **Shopping List** — shared, checkable list (backed by `shopping_list_items`); "Generate from Plan" pulls ingredients from all planned recipes and dedupes them.
5. **Add a Recipe** (new) — three entry points, all writing into `recipe_submissions`:
   - Paste a URL → fetch + parse.
   - Paste raw text (e.g. copied from an email or note) → parse directly.
   - Upload a file (PDF/photo of a recipe card) → OCR/extract then parse.
   Each submission shows a review card (parsed title/ingredients/directions) with Approve (inserts into `recipes`) / Edit / Reject.
6. **Review Queue** — anything sitting in `recipe_submissions` with status `pending`/`needs_review`, so nothing gets silently added wrong.

## Ingestion channels beyond the in-app form
- **Email forwarding**: label incoming forwarded recipe emails (e.g. a Gmail label "Recipe Inbox"), and a scheduled job periodically pulls new labeled messages, extracts the recipe content, and creates a `recipe_submissions` row with `input_type = 'email'`.
- **Google Drive**: watch a designated folder for new files; on new PDF/doc, extract text and create a submission with `input_type = 'drive_file'`.
Both of these are just background jobs that write into the same `recipe_submissions` table the in-app form uses — the review/approve UI doesn't need to know or care where a submission came from.

## Auth / access
- Two Supabase Auth accounts (Sian + husband), both `authenticated` role.
- No admin/owner distinction needed at this scale — either parent can add, edit, or approve.

## Choking-hazard flags
`choking_flags` on each recipe is a best-effort keyword scan (whole grapes, hot dogs, whole nuts/seeds, popcorn, hard raw veg/fruit chunks, cheese chunks, nut/seed-butter spoonfuls, marshmallows, tough meat pieces) against KEIC's published "choking hazards for children under 4" list. It's a prompt to double-check prep for Cami, not a hard block — surface it as a small badge on the recipe card, same as the old artifact did.

## Known data quality notes (carried over from extraction)
The three source PDFs use a two-column ingredients/directions layout; a handful of recipes on pages with a bonus mini-recipe picked up a bit of stray text in their ingredient list. Worth a light manual scan of `recipes.json` for outliers before treating it as gospel, but it's in good shape overall (spot-checked against source PDFs).
