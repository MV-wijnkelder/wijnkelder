# VinoCastello Project Status

> **Canonical status document.** This is the authoritative source for the
> application's current state. Read it together with `docs/ProductVision.md`
> before planning or implementing any future sprint. Update it as a mandatory
> deliverable at the end of every completed sprint; do not reconstruct current
> status from chat history.

# Project Overview

- **Project name:** VinoCastello
- **Current version:** 1.1.0
- **Current development phase:** Cellar intelligence and personal companion;
  trust, reliability, and installable-app completion are next.
- **Last updated:** 28 August 2026

# Current Release

- **Latest completed sprint:** Sprint 13A — Market Value Integration
- **Release status:** Sprint 13A is implemented on the current release branch; commit and PR references are pending merge.
- **Previous merged commit:** `1aaf66d` — documentation merge following the
  Sprint 12 release
- **Previous merged PR:** [#65](https://github.com/MV-wijnkelder/wijnkelder/pull/65)
- **Latest product merge:** PR
  [#64](https://github.com/MV-wijnkelder/wijnkelder/pull/64), commit `672aeb1`
- **Current production capabilities:** A mobile-first wine cellar with canonical
  wine records; camera/photo label recognition; editable review and inventory
  management; AI-generated wine profiles; deterministic, explainable
  cellar-first recommendations; a routed, multimodal personal AI Sommelier with
  browser-local conversation and image context; live-information fallback;
  collection insights with transparent market-value coverage; per-wine market valuation; and web-app manifest/icon metadata groundwork.

# Completed Sprints

The repository's preserved canonical sprint record begins with Sprint 10.
Earlier commits establish the inventory and recognition foundation, but they do
not provide reliable sprint boundaries; this document does not invent them.

## Sprint 10 — Cellar Intelligence and Conversational Foundation

- **Objective:** Turn the cellar from a passive inventory into an informed
  companion through canonical enrichment, owned-bottle recommendations, and a
  routed conversational Sommelier.
- **Key functionality delivered:** Canonical `WineProfile` enrichment and
  profile lifecycle; Wine Details and Explore this Wine; navigation context;
  deterministic What Should I Drink? recommendations; structured Sommelier
  profiles; cellar-aware chat; specialist intent routing; and optional Live
  Intelligence.
- **Merge date:** 27 August 2026
- **PR reference:**
  [#36](https://github.com/MV-wijnkelder/wijnkelder/pull/36),
  [#38–#53](https://github.com/MV-wijnkelder/wijnkelder/pulls?q=is%3Apr+is%3Aclosed)
  (the shipped feature sequence; there was no product PR #37 or #48)

## Sprint 11 — Personal Multimodal Sommelier and Premium Experience

- **Objective:** Make the Sommelier useful in bottle, restaurant, and shop
  situations while preserving conversational context and unifying the
  mobile-first VinoCastello experience.
- **Key functionality delivered:** Camera and multi-image chat; menu, wine-list,
  shelf, and bottle analysis; browser-local text/image memory; bounded image
  context; timeout, retry, and cancellation behavior; and shared premium visual
  primitives and design tokens.
- **Merge date:** 28 August 2026
- **PR reference:**
  [#54](https://github.com/MV-wijnkelder/wijnkelder/pull/54),
  [#56–#62](https://github.com/MV-wijnkelder/wijnkelder/pulls?q=is%3Apr+is%3Aclosed)

## Sprint 12 — Cellar Insights and App Identity Infrastructure

- **Objective:** Surface collection-level value from confirmed cellar data and
  prepare installable-app identity infrastructure.
- **Key functionality delivered:** Cellar Insights metrics and patterns derived
  by a pure domain helper, an insights dashboard, and Next.js manifest and icon
  metadata placeholders.
- **Merge date:** 28 August 2026
- **PR reference:**
  [#63](https://github.com/MV-wijnkelder/wijnkelder/pull/63),
  [#64](https://github.com/MV-wijnkelder/wijnkelder/pull/64)

## Sprint 13A — Market Value Integration

- **Objective:** Replace bookkeeping-oriented purchase-price valuation with a professional current estimated market valuation throughout VinoCastello.
- **Key functionality delivered:** A canonical per-bottle `marketValue`; provider-neutral enrichment output; additive database columns; dynamic per-wine totals; collection valuation using quantity times market value only; and valued/unvalued bottle coverage. Missing valuations remain explicit and are excluded rather than represented as zero.
- **Completion date:** 28 August 2026
- **Release version:** 1.1.0
- **PR reference:** Pending creation for the current release branch.

# Current Architecture

## AI Sommelier

The Next.js App Router chat UI manages interaction state, attachments, browser
memory, and cancellation. The API validates JSON or multipart input and passes
transport-neutral context to the server orchestration layer. The Sommelier
service classifies intent, chooses specialist guidance, retrieves only required
canonical application context, optionally requests current information, and
uses the OpenAI adapter to produce the response. `docs/SommelierPrompt.md` is the
runtime base prompt as well as the documented policy.

## Recommendation Engine

`RecommendationService` is the one deterministic source for meal
interpretation, exclusions, scoring, quality thresholds, and explanations. It
consumes canonical `StoredWine[]` data, filters unavailable or unsuitable
bottles, and returns no more than three explainable matches. It returns suitable
styles rather than fabricating a cellar match when no bottle qualifies.

## Cellar Integration

The canonical `Wine`/`StoredWine` model is the single source of truth. A provider-neutral, per-bottle `marketValue` and its currency are stored on that entity; total values and valuation coverage are always calculated dynamically. AI enrichment currently supplies reliable estimates, while the UI and calculation helper remain independent of the valuation provider.
`NeonWineStorage` maps Neon PostgreSQL rows into that domain and normalizes older
profile and cellar JSON. List, detail, create, update, delete, recommendations,
insights, and Sommelier retrieval all consume the same records. The historical
MCHRDV workbook remains an interchange target, not a competing live store.

## Wine Recognition

The Scan flow accepts front and optional back labels, compresses images in the
browser, and calls a provider-independent recognition service. Recognition
creates an editable canonical draft and can preview enrichment, but nothing is
persisted until the user explicitly confirms Add to My Cellar. Unknown facts
remain unknown and AI output does not override user confirmation.

## Image Pipeline

Scan and Sommelier share client compression principles but have separate
purposes. Scan transforms label images into a reviewable structured draft.
Sommelier groups up to six contextual JPEG, PNG, or WebP images into bounded
browser-local sets, validates multipart uploads server-side, and supplies them
as non-persisting conversational context. Conversation limits are six sets and
eighteen remembered images overall.

## Conversation Context

Up to 100 text messages are accepted. Text persists in `localStorage`; image
sets persist in IndexedDB for the current browser conversation. New chat clears
the session and aborts in-flight work. Cellar, current-wine, image, and live
context are included only when routing indicates they are needed. Personal
conversation memory is not stored as a second server-side cellar record.

## AI Prompt Flow

1. Validate and bound the latest text, history, context, and images.
2. Classify the request into an intent and required context flags.
3. Retrieve confirmed canonical wine/cellar data only when requested by those
   flags.
4. Retrieve Live Intelligence only for time-sensitive questions, with an honest
   unavailable state.
5. Combine the canonical prompt, specialist guidance, bounded conversation,
   application context, image sets, and optional live facts.
6. Generate a concise answer and retain it only in browser-local session memory.

# Current User Features

- Mobile-first home and navigation experience with premium shared styling.
- Scan a front label with the camera or photo library and optionally add a back
  label.
- Client-side image compression, label consistency warnings, and resilient
  recognition handling.
- Review and edit recognized wine details before saving.
- Preview Explore this Wine enrichment without silently adding a bottle.
- Add, browse, search, inspect, edit, and delete canonical cellar records.
- Track bottle quantities and canonical workbook-oriented cellar fields.
- Preserve My Cellar search, navigation, and scroll context when viewing a wine.
- View structured Wine Profiles with tasting, style, food, serving, maturity,
  winery, vintage, and drinking-window guidance.
- Generate, backfill, retry, and explicitly refresh AI profiles.
- Ask What Should I Drink? in natural language and receive up to three
  explainable, cellar-first matches or honest alternative styles.
- Ask focused questions about ready-to-drink bottles, country inventory, and
  comparisons.
- Chat with one personal AI Sommelier across cellar, pairing, serving, storage,
  buying, restaurant, travel, comparison, and general wine topics.
- Attach camera or library images for menu, wine-list, shop-shelf, price-tag,
  multi-bottle, and single-bottle advice.
- Continue conversational follow-ups using bounded browser-local text and image
  context.
- Automatically retry one transient chat failure, cancel work with New chat,
  and retain visible conversation on failure.
- Use current-information research when available, with graceful fallback.
- View Cellar Insights for wine count, bottle count, regions, diversity, readiness, notable collection patterns, estimated collection market value, and bottle-level valuation coverage.
- View current per-bottle market value, quantity, dynamically calculated total market value, or an honest awaiting-valuation state on Wine Details.
- Expose manifest and icon metadata groundwork for a future installable app.

# Open Issues

## Known Bugs and Behavioral Risks

- Market estimates currently depend on the configured AI enrichment provider and are EUR-only; existing wines require explicit profile refresh or a future backfill to receive a valuation.

- Image sets have generic names (`Image Set N`), which makes ambiguity harder to
  resolve in long conversations.
- Typed Sommelier context reserves several IDs/modes that current screen and
  multipart wiring do not supply.
- AI recognition, enrichment, routing, answers, and live research depend on
  configured provider/network access; core inventory remains usable without it.
- `localStorage` and IndexedDB can diverge or be evicted independently, and an
  IndexedDB load failure currently becomes silent loss of image context.
- Drinking-window decisions use the current UTC year and cannot account for
  storage, bottle condition, month, or maturity preference.
- Final installable-app icon artwork is not present.

## Technical Debt

- Full cellar payloads can be sent to the model; there is no scalable semantic
  retrieval, paging, summarization, or explicit token-budget layer.
- Remembered images are re-uploaded and re-encoded instead of using an ephemeral
  server reference/cache.
- Loaded conversation JSON lacks robust schema/version validation.
- The AI route classifier has no deterministic fallback for obvious intents.
- Recommendation vocabulary is a hand-maintained lexicon that can become
  brittle as cuisines expand.
- Recommendation and chat cellar questions overlap but expose different response
  shapes; their intended boundary needs continued documentation.
- Live research has no structured citation/freshness contract, cache policy, or
  sufficient observability.
- Insights fetch the full cellar client-side and do not link into shared cellar filters/navigation state.
- Market-value freshness and provenance timestamps are not yet modeled separately from the broader AI profile lifecycle.
- There is no committed browser end-to-end suite for camera, IndexedDB,
  multipart images, mobile safe areas, database integration, or provider
  contracts.
- Large Scan and Sommelier client components need smaller state/hook boundaries
  without duplicating domain logic.

## UX Improvements

- Show provenance and confidence for recognized, AI-enriched, and user-confirmed
  facts.
- Add accessible OCR review/correction for menus, lists, vintages, and prices.
- Add semantic image-set names, history/thumbnails, deletion, and explicit prior
  set selection.
- Link recommendations and insights to filtered cellar/detail views while
  preserving context.
- Add typed Sommelier handoffs from Wine Details, Scan review,
  recommendations, and Insights.
- Explain precisely which cellar and image context an intentional AI request
  sends.

## Performance Improvements

- Retrieve deterministic candidates and compact profile summaries instead of
  serializing an entire growing cellar.
- Establish token/image budgets, truncation summaries, and context-size
  diagnostics.
- Avoid repeatedly uploading unchanged remembered images.
- Add redacted latency, retry, provider-failure, and retrieval-size telemetry.

# Current Backlog

1. **Market-value trust and refresh:** Backfill existing wines, add valuation-specific provenance/freshness, and prepare a dedicated provider adapter without changing canonical calculations or UI.
2. **Trust, provenance, and end-to-end reliability:** Mark data provenance; add
   browser, database integration, and provider-contract coverage; add redacted
   observability; and finish/validate application icons and manifest behavior.
3. **Contextual handoffs and scalable retrieval:** Connect existing screens to
   the Sommelier with typed context and implement deterministic candidate
   retrieval plus compact canonical summaries.
4. **Structured Restaurant and Wine Shop assistance:** Add progressive controls,
   reviewable OCR results, party/dish/budget context, shortlists, and a safe
   selected-bottle handoff to Scan/Review/Add.
5. **Personal preferences and tasting history:** Add canonical tasting and
   consumption events, inspectable preference signals, correction/reset, and
   explanations.
6. **Actionable insights and workbook interoperability:** Link insights to cellar
   filters, add quality/profile coverage, and implement authoritative,
   previewable, duplicate-aware MCHRDV import and lossless export.
7. **Longer-term cellar utility:** Add bottle locations, opening/quantity actions,
   drinking-window alerts, collection trends, offline inventory shell, and
   graceful queued AI actions.

# Next Planned Sprint

## Sprint 13B — Market Value Trust and Backfill

**Recommended objective:** Backfill valuations for existing canonical wines, expose valuation provenance and freshness, define a replaceable dedicated market-data provider contract, and add safe refresh behavior while preserving honest unavailable states and EUR consistency.

# Architectural Decisions

- **One personal AI Sommelier:** Add contextual entry points or modes to the one
  assistant rather than creating competing assistants.
- **Canonical Wine is authoritative:** The application database and shared Wine
  domain model are the source of truth. AI context, browser memory, analytics,
  and future workbook exchange must not become parallel records.
- **Cellar-first recommendations:** Recommend suitable available owned bottles
  first, explain evidence, and return an honest no-match rather than forcing or
  inventing a result.
- **Reuse services; never duplicate business logic:** Recommendation scoring,
  normalization, storage, recognition, and image preparation remain centralized
  behind existing domain/service boundaries.
- **Separate deterministic decisions from generation:** Keep reproducible
  recommendation filtering/scoring outside generative chat.
- **User confirmation controls writes:** Recognition and enrichment propose
  data; they do not silently persist or overwrite the canonical record.
- **Market value is per bottle:** Store one provider-neutral current estimate on canonical Wine; never store totals or use historical purchase price in valuation calculations.
- **Unknown remains unknown:** Missing scalar values are `null`, empty
  collections represent no known entries, and uncertainty must be explicit.
- **Minimal, bounded AI context:** Route first, retrieve only necessary canonical
  data, bound messages/images, isolate live facts, and degrade gracefully.
- **Browser-local conversation by default:** Text and image context is scoped to
  the current browser session and is not a second durable cellar.
- **Workbook compatibility without dual authority:** Preserve the MCHRDV workbook
  as a lossless import/export format while keeping the database authoritative.
- **Mobile-first, simple, and premium:** Preserve one obvious next action,
  accessible touch behavior, consistent language, calm progressive disclosure,
  and shared visual primitives.
- **Additive evolution:** Schema changes must be backward compatible and
  normalize historical records without fabricating facts.

# Maintenance Rules

Updating this document is a mandatory project deliverable. At the end of every
completed sprint, Codex must:

1. Add the completed sprint, including objective, delivered functionality,
   merge date, and PR reference.
2. Update the current release, latest merged commit and PR, version, development
   phase, and `Last updated` date.
3. Reconcile the complete user feature list with the merged application.
4. Update architecture and architectural decisions when boundaries or flows
   change.
5. Reconcile known bugs, behavioral risks, UX and performance improvements.
6. Reconcile technical debt, removing resolved items rather than accumulating a
   stale changelog.
7. Reprioritize the current backlog.
8. Record the agreed objective for the next planned sprint.
9. Validate all statements against the merged code and sprint artifacts.
10. Keep this as the one canonical status document; supporting sprint summaries
    may provide history but must not compete with it for current status.

Before implementing any future sprint, Codex must read both
`docs/ProductVision.md` and this document in full.
