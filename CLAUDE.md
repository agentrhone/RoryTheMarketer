# Holistic Marketing Ops Tool — Implementation Outline

Use this outline when building or migrating the marketing ops hub (e.g. into a new standalone project). Phase 1 + multi-brand are already implemented in `creative-studio`; the steps below cover Phases 2–5 and assume the same patterns (Next.js API routes, `context/brands/{id}/`, `data/{brandId}/`, context bundle, persona briefs).

---

## Prerequisites (carry over from current work)

- **Context bundle** — `GET /api/context/bundle?brand=` returning brand voice, personas, USPs, disallowed objects.
- **Persona-aware briefs** — Video brief and general prompt APIs accept `brand`, `persona`, `secondaryPersona`.
- **Multi-brand** — `BRANDS` config, `getBrandContextDir(brandId)`, `getBrandDataDir(brandId)`, `ensureBrandDataDir(brandId)`.
- **Context Hub UI** — Brand switcher, Context Hub page showing voice, personas, USPs, and placeholders for reviews/comments/competitor ads.
- **Docs** — `docs/comment-review-themes.md` for injecting themes per-brand data paths.

---

## Phase 2: Trustpilot + storage

**Goal:** Pull Trustpilot reviews via API, store per brand, optionally generate review themes for briefs.

### 2.1 Trustpilot API client

- **Env:** `TRUSTPILOT_API_KEY` (or Consumer/Data Solutions key).
- **Implement:** `lib/trustpilot.ts` (or `services/trustpilot.ts`).
  - Resolve **Business Unit ID** by domain: `GET https://datasolutions.trustpilot.com/v1/business-units?domain={domain}` (or use Trustpilot's documented endpoint). Use `brand.domain` from your brands config.
  - **Fetch reviews:** Paginated request to Trustpilot's reviews endpoint for that business unit (page, perPage). See [Trustpilot Data Solutions](https://developers.trustpilot.com/data-solutions-how-to) / Consumer API.
  - **Types:** e.g. `{ id, title, content, stars, createdAt, consumerName? }[]`.
- **Rate limits:** Honor limits; add simple retry/backoff if needed.

### 2.2 Sync job and storage

- **Storage:** Per-brand JSON under `data/{brandId}/trustpilot-reviews.json` — schema: `{ syncedAt: string (ISO), reviews: TrustpilotReview[] }`.
- **API route:** `POST /api/trustpilot/sync` (or `GET` for cron). Body or query: `brand` (required). Logic:
  1. Resolve brand and domain; get Business Unit ID; fetch reviews (all pages or up to a limit).
  2. `ensureBrandDataDir(brandId)` then write `data/{brandId}/trustpilot-reviews.json`.
  3. Return `{ ok, count, syncedAt }`.
- **Idempotent:** Overwrite file each run (full sync). Optional: store only new/changed by `id` for incremental sync later.

### 2.3 Reviews API and UI

- **Read path:** `GET /api/reviews?brand=&q=` should read from `data/{brandId}/trustpilot-reviews.json` when present; fallback to existing CSV or empty list. Preserve existing response shape (`{ title, content }[]`) so current review picker and snippet extraction still work.
- **Context Hub:** On the "Reviews" card, show count and last synced time; button "Sync from Trustpilot" calling the sync route.

### 2.4 Review themes (optional)

- **Storage:** `data/{brandId}/review-themes.json` — e.g. `{ generatedAt, period, summary: string }`.
- **API route:** `POST /api/review-themes` — body: `{ brand }`. Load stored reviews for brand, send to Claude (e.g. "Summarize recurring themes, proof points, and objections in 2–3 short paragraphs"), save result to `review-themes.json`.
- **Brief injection:** In `docs/comment-review-themes.md` and in brief API routes: if request includes `brand` and optionally `includeReviewThemes: true`, load `data/{brandId}/review-themes.json` and append to system or user prompt: "Recent review themes: {summary}."

---

## Phase 3: Meta ad comments

**Goal:** Resolve ads to page posts, fetch comments via Graph API, store, summarize into themes, optionally inject into briefs.

### 3.1 Graph API client for comments

- **Env:** Same Meta token as Marketing API (or token with `pages_read_engagement` + `ads_read`). Ensure token has Page access.
- **Implement:** `lib/meta-graph.ts` (or extend MCP/client).
  - **Map ad → post:** From your existing data (e.g. ad creative or insights), get the `effective_object_story_id` or the page post ID that the ad promotes. If your MCP/API doesn't expose it, use Marketing API fields that reference the post (e.g. `creative.fields` or link to page post).
  - **Fetch comments:** `GET /{page-id}/posts` (with appropriate fields) or direct `GET /{post-id}/comments` with fields `id,message,created_time,from,like_count`. Use same token.
- **Pagination:** Follow `paging.next` until no more; respect rate limits.

### 3.2 Sync job and storage

- **Input:** List of ad IDs (or campaign IDs) you care about. Source: from Meta Marketing API (e.g. active ads for the account) or a config list.
- **Storage:** `data/{brandId}/meta-comments.json` — e.g. `{ syncedAt, adIdToPostId: Record<string, string>, comments: { adId, postId, commentId, text, createdTime, from?, likeCount }[] }`. Optionally key by `campaignId` if you pass it.
- **API route:** `POST /api/meta-comments/sync` — body: `{ brand, adIds?: string[], campaignIds?: string[] }`. For each ad, resolve post ID, fetch comments, aggregate, then write `data/{brandId}/meta-comments.json`.

### 3.3 Comment themes (Claude)

- **Storage:** `data/{brandId}/meta-comment-themes.json` — e.g. `{ generatedAt, byCampaign: Record<string, string> }` or a single `summary` for all.
- **API route:** `POST /api/meta-comment-themes` — body: `{ brand, campaignId?: string }`. Load stored comments (optionally filter by campaign), send to Claude ("Summarize recurring questions, objections, and positive themes in 2–3 short paragraphs"), save.
- **Brief injection:** Brief APIs accept optional `campaignId` and/or `includeCommentThemes: true`. Load `meta-comment-themes.json`, pick by campaign or global summary, append to prompt: "Recent ad comment themes: {themes}."

---

## Phase 4: Competitor ads (Foreplay + Meta Ad Library)

**Goal:** Pull ad examples from Foreplay and Meta Ad Library, store per brand, expose in UI and to analyze-competitor/briefs.

### 4.1 Foreplay client

- **Env:** `FOREPLAY_API_KEY`. See: [Foreplay Public API](https://public.api.foreplay.co/docs).
- **Implement:** `lib/foreplay.ts`. Implement:
  - **Discovery:** Search ads by domain/keywords/category (per Foreplay's API).
  - **Spyder / creative data:** Fetch ad creative details (image/video URLs, copy, metadata).
  - **Swipe File:** If you use folders/boards, optional: list or fetch saved ads.
- **Storage:** `data/{brandId}/foreplay-ads.json` — e.g. `{ syncedAt, ads: { id, domain, headline?, body?, imageUrl?, videoUrl?, ... }[] }`. Optionally download thumbnails to `data/{brandId}/foreplay-assets/` and store relative paths.

### 4.2 Foreplay sync route

- **API route:** `POST /api/foreplay/sync` — body: `{ brand, domains?: string[], searchTerms?: string[] }`. Call Foreplay, normalize to common shape, write to `data/{brandId}/foreplay-ads.json` (and assets if applicable).

### 4.3 Meta Ad Library route (server-side)

- **Option A:** Call your existing MCP `search_ads_archive` from a Next.js API route (invoke MCP process or duplicate request logic).
- **Option B:** Direct Meta Ads Library API from Next.js: same endpoint and params as in `ads_archive_tools.py` (search_terms, ad_reached_countries, fields including ad_creative_body, ad_snapshot_url, page_name, etc.). Use `META_ACCESS_TOKEN`.
- **API route:** `GET /api/ads-library/search?brand=&q=&countries=US` or `POST` with body. Store results in `data/{brandId}/ads-library-results.json` — e.g. `{ searchedAt, query, results: { adSnapshotUrl, body, pageName, ... }[] }`. Optionally download snapshot images to `data/{brandId}/ads-library-assets/`.

### 4.4 Competitor ad library UI

- **New section in Context Hub (or new tab):** "Competitor ads" / "Ad library."
  - **Sources:** Tabs or filters: "Foreplay" and "Meta Ad Library."
  - **List:** Show stored results (thumbnail, headline/body, source, date). Data from `foreplay-ads.json` and `ads-library-results.json`.
  - **Actions:** "Add to reference ads" (if you have reference-ads storage), "Analyze with Claude" (send to `analyze-competitor` flow with image + copy).
- **Tie to analyze-competitor:** When analyzing, allow "Load from library" (pick a stored ad by id) so image + metadata are sent to the existing analyze-competitor endpoint.

### 4.5 Brief integration

- **Optional:** When generating a brief, allow selecting one or more "reference competitor ads" from the stored library. Attach their copy or snapshot URL (or a short summary) to the brief prompt so the model can "mimic or differentiate from this."

---

## Phase 5: Polish

**Goal:** Scheduled syncs and a single place to browse comments, reviews, competitor ads and attach them to briefs.

### 5.1 Scheduled syncs

- **Mechanism:** Vercel Cron (if on Vercel) or external cron calling your API.
  - **Cron config:** e.g. `vercel.json` or dashboard: daily (or weekly) job hitting `POST /api/trustpilot/sync`, `POST /api/meta-comments/sync`, `POST /api/foreplay/sync` (and optionally Ad Library). Pass `brand` (e.g. for each brand in `BRANDS`).
  - **Auth:** Protect cron routes with a shared secret (e.g. `CRON_SECRET` in env, sent as header or query). Reject if missing or wrong.
- **Idempotent:** All sync routes overwrite or merge into the same file; safe to run on a schedule.

### 5.2 UI: browse and attach

- **Context Hub (or dedicated "Data" tab):**
  - **Reviews:** List from `trustpilot-reviews.json` with search; "Use in brief" could set a flag or copy snippet into a draft.
  - **Comments:** List comments (or comment themes) per campaign/ad; "Include in next brief" toggles `includeCommentThemes` for the next brief request.
  - **Competitor ads:** Already in 4.4; add "Attach to brief" so the next video/general brief request receives selected ad context.
- **Brief forms:** Add optional checkboxes or selects: "Include review themes," "Include comment themes (campaign X)," "Reference competitor ad: [dropdown]." Send these to the existing brief APIs and implement injection as in Phase 2.4 and 3.3.

### 5.3 Error handling and resilience

- **Sync routes:** Return `{ ok: false, error: string }` on partial failure (e.g. one brand fails); log errors. Callers (cron, UI) can show "Last sync: failed" and retry.
- **Rate limits:** For Trustpilot, Meta, Foreplay: catch 429, retry with backoff or surface "rate limited; try again later."

### 5.4 Auth (optional)

- If the hub is shared: add auth (e.g. NextAuth, API keys, or SSO) so only your team can access Context Hub and sync routes. Keep tokens (Meta, Trustpilot, Foreplay) server-side only; never expose in client.

---

## Moving to a new project

When you create a new repo/app for the marketing ops hub:

1. **Copy or recreate:**
   - Context bundle logic (`getContextBundle(brandId)`, persona parsing, `formatPersonaForPrompt`, `getPersonaForBrief`).
   - Brands config and paths (`getBrandContextDir`, `getBrandDataDir`, `ensureBrandDataDir`).
   - API routes: `GET /api/context/bundle`, `GET /api/brands`; brief routes that accept `brand`, `persona`, `secondaryPersona` (and later `includeReviewThemes`, `includeCommentThemes`, `campaignId`).
   - Context Hub page and BrandSwitcher; main app shell with brand in header.
   - `docs/comment-review-themes.md` and this implementation outline.

2. **Context and data layout:**
   - Keep `context/brands/{brandId}/` for personas, voice, USPs.
   - Keep `data/{brandId}/` for all synced and generated data (reviews, comments, themes, Foreplay, Ad Library).

3. **Env in new project:**
   - `ANTHROPIC_API_KEY` (briefs, themes, analyze-competitor).
   - `META_ACCESS_TOKEN` (Ad Library; comments if same token has Page access).
   - `TRUSTPILOT_API_KEY` (Phase 2).
   - `FOREPLAY_API_KEY` (Phase 4).
   - Optional: `CRON_SECRET` for scheduled syncs.

4. **Dependencies:** Next.js, Anthropic SDK; no need to move the Python MCP unless you run it from this app—you can call Meta Ad Library from Next.js instead.

This outline is the full implementation path for Phases 2–5 and the steps to move the plan into a new project.
