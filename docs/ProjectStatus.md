# VinoCastello Project Status

> **Canonical status document.** This is the authoritative source for the
> application's current state. Read it together with `docs/ProductVision.md`
> before planning or implementing any future sprint. Update it as a mandatory
> deliverable at the end of every completed sprint; do not reconstruct current
> status from chat history.

# Project Overview

- **Project name:** VinoCastello
- **Current version:** 1.7.3
- **Current development phase:** Simple, cost-bounded market-price discovery values each genuinely new scanned wine once and otherwise runs only from an explicit single-wine refresh, alongside safe live-cellar editing and export-only Excel snapshots.
- **Last updated:** 21 September 2026

# Current Release

- **Latest completed sprint:** Sprint 14H — Simple Market Price Flow
- **Release status:** Sprint 14H patch release is implemented on the current release branch; commit and PR references are pending merge.
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
  collection insights with normalized categories, an eight-position drinking lifecycle and current Drinking Outlook; transparent market-value coverage; one automatic public-market valuation for each genuinely new scanned wine plus explicit single-wine refresh; and installable-app metadata using the official VinoCastello artwork.

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

## Sprint 13B — Automatic Market Value Provider

- **Objective:** Automatically populate one honest Estimated Market Value for each canonical wine from reliable public market information, cache the result, and support safe single-wine and complete-cellar refresh.
- **Key functionality delivered:** A replaceable `MarketValueProvider` contract; OpenAI web-search retrieval across official wineries, recognised merchants, reputable retailers, and recognised aggregators; strict matching across producer, wine name, vintage, bottle size, appellation, region, and country; deterministic median selection from validated exact-match EUR observations; stored valuation provenance/freshness; automatic first retrieval; cached unavailable results; isolated single and cellar refresh APIs; and simplified user-visible value states. AI profile generation no longer supplies or overwrites valuations.
- **Completion date:** 28 August 2026
- **Release version:** 1.2.0
- **PR reference:** Pending creation for the current release branch.

## Sprint 13C — Official VinoCastello Mobile/App Icon

- **Objective:** Replace the broken placeholder icon configuration with the manually supplied official VinoCastello artwork without generating or modifying binary assets.
- **Key functionality delivered:** Next.js application, shortcut, and web-app manifest icon metadata now share `public/images/icon-hero.webp` as the canonical icon; nonexistent generic favicon, PNG, and Apple Touch Icon references were removed; and automated checks protect the canonical branding configuration and WebP asset contract.
- **Completion date:** 28 August 2026
- **Release version:** 1.2.1
- **PR reference:** Pending creation for the current release branch.

## Sprint 14A — Drink Readiness, Data Consistency & Drinking Outlook

- **Objective:** Improve Cellar Summary and Cellar Insights accuracy and make
  drinking guidance actionable before VinoCastello is frozen for live cellar use.
- **Root cause addressed:** Category values previously flowed from recognition
  and historical rows with source spelling intact, while insight grouping used
  exact strings. The five-star readiness calculation also measured symmetric
  distance from a midpoint, so it could not distinguish a young wine from one
  already beyond its recorded drinking window. Drink Horizon counted wines by
  start year rather than explaining bottle-level action from the current year.
- **Key functionality delivered:** One centralized, non-migrating category
  normalization boundary canonicalizes capitalization and the clear
  `Toscana`/`Tuscany` alias for existing and newly scanned wines. Analytics and
  Collection Health use the same normalized values. Drink Readiness now spans
  positions 1–8: wine-red positions 1–3 communicate increasing time beyond
  peak, a slash separates them from positions 4–8, and the existing gold
  five-position positive treatment remains the useful-lifecycle side. Drinking
  Outlook replaces Drink Horizon with bottle counts for past peak, ready now,
  the next 1–2 years, 3–5 years and 5+ years, plus one concise priority insight.
  All lifecycle calculations derive the current UTC year dynamically.
- **Completion date:** 2 September 2026
- **Release version:** 1.3.0
- **PR reference:** Pending creation for the current release branch.

## Sprint 14B — Interactive Cellar Insights & Wine Classification

- **Objective:** Turn Cellar Insights into a direct, mobile-first path to the canonical cellar wines behind every displayed category.
- **Root cause addressed:** Colour normalization previously title-cased arbitrary source values, allowing accent variants such as `Rosé` and `Rosè` to split analytics and leaving sparkling semantics mixed into free-text colour/style data. Insight rows also had no shared filter/navigation contract.
- **Key functionality delivered:** Exactly three canonical colours (`Red`, `White`, and `Rosé`) now normalize existing reads and new scans without a data migration. A separate derived `Still`/`Sparkling` type prefers explicit structured style metadata and safely falls back to recognized sparkling identity terms. Collection Mix now displays Type, and all colour, type, country, region, grape, eight-position readiness, and Drinking Outlook rows navigate to centralized filtered cellar results. Blend filtering matches every structured grape. Filtered results reuse the My Cellar card presentation, preserve their route through Wine Details, return to Cellar Insights, and provide an explicit empty state.
- **Current limitations:** Wine records do not yet store a dedicated persisted wine-type field; type is derived from existing structured style metadata, with appellation/name fallback for historical records. Filtered lists intentionally provide browsing and Wine Details navigation rather than inline inventory editing.
- **Completion date:** 2 September 2026
- **Release version:** 1.4.0
- **PR reference:** Pending creation for the current release branch.

## Sprint 14C — Cellar-Aware Drinking Intelligence & Peak Protection

- **Objective:** Make VinoCastello distinguish a bottle that can be enjoyed now from the bottle that should ideally be opened now.
- **Root cause addressed:** The former calculation treated the stored drinking-window midpoint as peak and classified every wine after Drink From as ready now. Earliest drinkability, best period, and Drink By were therefore conflated; recommendations used a separate coarse maturity score and excluded wines outside the window instead of considering ageing opportunity cost.
- **Key functionality delivered:** The canonical profile now supports distinct Drink From, Peak From, Peak Until, and Drink Until dates. One dynamic lifecycle service maps explicit peak dates—or a conservative best-period inference for existing profiles—onto all eight unchanged readiness positions, ideal Drinking Outlook timing, material ageing upside, and a quantity-softened preservation factor. RecommendationService keeps food and occasion fit primary while preferring comparable peak/near-peak bottles and explains when a developing wine is worth keeping. Personal AI Sommelier context includes the same computed lifecycle and follows the same preservation policy. AI enrichment requests producer/cuvée/vintage-specific lifecycle evidence before broader appellation, grape, region, and style fallbacks. Existing wines work immediately without rescanning or destructive backfill.
- **Current limitations:** Existing profiles without explicit peak dates use a deterministic inference within their stored window until explicitly refreshed. Guidance cannot account for storage history, bottle condition, closure variation, or personal maturity preference. Quantity is record-level rather than bottle-condition-specific.
- **Completion date:** 2 September 2026
- **Release version:** 1.5.0
- **PR reference:** Pending creation for the current release branch.

## Sprint 14D — Safe Cellar Editing, Persistent Navigation, Interactive Insights & Excel Export

- **Objective:** Make VinoCastello safe and convenient enough to act as the live cellar inventory while keeping every insight and export tied to canonical wines.
- **Root cause addressed:** Inventory quantity controls wrote immediately, general edits had no review boundary, navigation controls scrolled out of reach, several collection/value/highlight indicators did not expose their wines, and no device-local spreadsheet snapshot was available.
- **Key functionality delivered:** Existing-record edits—including every quantity change—are staged and show a field-by-field confirmation before the single canonical update. Cancel leaves storage unchanged. Full-record deletion retains a separate, stronger bottle-aware warning, while Scan/Add remains unchanged. A compact safe-area-aware Back/Home control remains sticky on non-Home screens. All meaningful insight groups now route through centralized cellar filters, including collection totals, valuation coverage/missing values, vintage and leading producer/origin highlights, all mix categories, all eight readiness stages, and every outlook range. Filtered lists reuse My Cellar cards, selection identity/count, Wine Details routing, and stored scroll context. My Cellar and insight selections explicitly generate a professional, filtered `.xlsx` snapshot with one row per wine, numeric quantities and known market values, canonical lifecycle labels, filters and sensible widths.
- **Architectural decision:** Excel is export-only. VinoCastello does not support Excel import, upload, synchronization, editing, or restore; an exported workbook cannot modify the authoritative cellar.
- **Current limitations:** Browser/device download presentation varies by PWA platform. Export is generated client-side from the currently loaded selection, so very large cellars may eventually need a streamed server export. Workbook output is intentionally a clean VinoCastello snapshot rather than lossless MCHRDV round-trip interoperability.
- **Completion date:** 2 September 2026
- **Release version:** 1.6.0
- **PR reference:** Pending creation for the current release branch.

## Sprint 14E — Reliable Market Valuation & Safe Cellar Refresh

- **Objective:** Make Estimated Market Price evidence reliable and whole-cellar refresh safe, resumable, and cost-conscious.
- **Root cause addressed:** Retrieval previously constrained the model to EUR and accepted any positive EUR number with an HTTPS URL, so observed foreign currencies could be relabelled and product/package evidence was not independently validated. The cellar endpoint also valued every wine sequentially in one request.
- **Key functionality delivered:** One canonical deterministic valuation service now validates actual source currency, merchant independence, producer, exact cuvée, vintage, bottle size, single-bottle package, availability, offer type, and evidence quality. Only EUR observations are currently supported; foreign currencies are safely excluded rather than guessed. A median with a 35%/€5 cluster rule rejects isolated outliers. One high-quality exact offer can produce a low-confidence estimate; weak or absent evidence remains unavailable. Provenance retains accepted URLs, observation count, confidence, provider, and retrieval time. Values remain fresh for 30 days; unavailable automatic attempts have a one-day retry cooldown. Cellar refresh uses client-driven batches of three with a 12-second timeout per provider call, skips fresh/completed wines, reports progress and partial failures, and safely resumes without repeating successful calls.
- **Completion date:** 17 September 2026
- **Release version:** 1.7.0
- **PR reference:** Pending creation for the current release branch.

## Sprint 14F — Practical Market Price Discovery & Safe Revaluation

- **Objective:** Correct the overly restrictive production behavior found after Sprint 14E without weakening its currency, product, package, source, outlier, freshness, batching, or cost protections.
- **Root cause addressed:** Sprint 14E required the provider's `exactMatch` flag and literal exact vintage for every accepted observation, rejected useful retailer titles for short cuvée names, and persisted an unavailable result (or automatic provider failure) as `null`. The same successful-retrieval timestamp was also used as the failed-attempt cooldown. Consequently, legitimate exact-wine retail evidence was routinely excluded and an unsuccessful refresh could erase a valid estimate and its provenance.
- **Key functionality delivered:** Application-owned diagnostic validation now classifies rejection reasons without storing provider payloads. Product identity comparison normalizes case, whitespace, punctuation, apostrophes and diacritics, then requires every canonical producer/cuvée token while tolerating appended appellation/classification text. Evidence is tiered as exact vintage, explicitly observed nearby vintage within two years, or vintage not displayed; higher tiers cannot be outvoted by lower tiers. Independent merchants, direct HTTPS product offers, EUR-only values, exact bottle size, single-bottle packages, availability and deterministic outlier-resistant medians remain mandatory. Every no-result, timeout and provider-error path preserves a prior amount, successful provenance and successful timestamp, while a separate attempt timestamp/failure supports the one-day retry cooldown. Batch completion now distinguishes updated, already-current, retained and genuinely unavailable wines. Retained values continue to power Wine Details, Collection Value and numeric Excel exports.
- **Completion date:** 18 September 2026
- **Release version:** 1.7.1
- **PR reference:** Pending creation for the current release branch.

## Sprint 14G — Explicit-Only Market Valuation

- **Objective:** Ensure that public-web market research occurs only after a user explicitly requests a single-wine or complete-cellar valuation refresh.
- **Root cause addressed:** Ordinary collection reads, Wine Details reads, wine creation, and wine edits all called the automatic valuation helper. Most critically, `GET /api/wines` iterated over every returned wine and made one OpenAI Responses request with web search enabled for each stale or unvalued record. Opening My Cellar—or changing its debounced search text—could therefore research an entire cellar without the user pressing the valuation button. With approximately 351 eligible records, that path could account for approximately 351 web-search-enabled Responses requests in one session. The explicit complete-cellar operation has the same one-request-per-eligible-wine cardinality, although it runs in client-driven batches of three.
- **Key functionality delivered:** Removed market valuation from ordinary list, detail, create, and update routes; removed the obsolete automatic valuation helper and retry predicate; retained market research only behind the explicit single-wine and complete-cellar refresh POST routes; and added source-boundary regression coverage to prevent read/write routes from regaining web-backed valuation side effects.
- **Current limitations:** Each explicitly refreshed eligible wine still requires one provider Responses request with web search enabled. The complete-cellar UI batches work for reliability but does not combine multiple wines into one provider request, so users must expect request volume proportional to the number of stale or unvalued wines selected by that operation.
- **Completion date:** 21 September 2026
- **Release version:** 1.7.2
- **PR reference:** Pending creation for the current release branch.

## Sprint 14H — Simple Market Price Flow

- **Objective:** Make Estimated Market Value simple, predictable, and inexpensive without redesigning the provider/storage architecture.
- **Root cause addressed:** Sprint 14G removed all automatic valuation, so new scans remained unvalued, while retaining a normal whole-cellar refresh that could still generate one web-search request per eligible wine. The valuation selector also discarded a single otherwise credible medium-quality retail offer.
- **Key functionality delivered:** A genuinely new scanned wine is profiled and valued exactly once after its canonical insert. Duplicate scans that only add bottles return the stored profile and market value without valuation research. Home, My Cellar, Cellar Insights, Wine Details reads, filtering, editing, quantity changes, and recommendations use stored values and make no market-price requests. The normal whole-cellar refresh UI, client method, and API route were removed; Wine Details retains the explicit **Refresh Market Price** action. Price selection still prioritizes exact, nearby (within two years), then unstated vintage for an exact producer/cuvée and safe single-bottle package, but now accepts one credible current EUR retail offer and uses the existing outlier-resistant median for multiple offers. Failed refreshes preserve existing value and provenance.
- **Current limitations:** Market retrieval still depends on the configured provider and public offer quality. Non-EUR offers are rejected rather than converted, and no automatic retry runs after a failed new-wine valuation.
- **Completion date:** 21 September 2026
- **Release version:** 1.7.3
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
interpretation, exclusions, scoring, quality thresholds, cellar-preservation ranking, and explanations. It
consumes canonical `StoredWine[]` data, filters unavailable or unsuitable
bottles, and returns no more than three explainable matches. It returns suitable
styles rather than fabricating a cellar match when no bottle qualifies.

## Cellar Integration

The canonical `Wine`/`StoredWine` model is the single source of truth. A provider-neutral, per-bottle `marketValue`, currency, and internal retrieval metadata are stored on that entity; total values and valuation coverage are always calculated dynamically. A dedicated provider uses OpenAI web search to retrieve multiple public EUR offers from official wineries, recognised merchants, reputable EU retailers, and recognised market aggregators. VinoCastello classifies rejection reasons, validates strong producer/cuvée identity and strict package safety, prioritizes exact-vintage evidence over nearby (±2 years) and undisclosed-vintage fallback evidence, deduplicates merchants, and deterministically selects an outlier-resistant median. Failed attempts are recorded separately and never erase a successful estimate or its provenance. AI profile enrichment is separate and cannot overwrite valuation data. A shared drinking-lifecycle service derives readiness, best opening horizon, ageing upside, and preservation cost from the canonical profile for insights, filters, recommendations, and Sommelier context. A genuinely new scanned wine invokes one market valuation after its profile is stored. Ordinary reads, duplicate quantity additions, editing, filtering, recommendations, and insights never perform market research; after creation, only the explicit single-wine refresh POST route can invoke the provider.
`NeonWineStorage` maps Neon PostgreSQL rows into that domain and normalizes older
profile and cellar JSON. Its shared category boundary presents canonical colour,
country, region and grape spelling without requiring a destructive historical
data migration; recognition uses that same boundary before review. List, detail, create, update, delete, recommendations,
insights, centralized insight filtering, Excel row mapping, and Sommelier retrieval all consume the same records. Excel workbook generation consumes exactly the currently displayed canonical list and never writes to storage. The historical
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

## Installable App Identity

Next.js metadata and the generated web-app manifest use the existing
`public/images/icon-hero.webp` artwork as the single canonical VinoCastello
icon. Modern browsers that support WebP application icons use that asset for
favicon, shortcut, and installable-app presentation. No generated icon
derivatives are maintained.

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

- Mobile-first home and navigation experience with premium shared styling and compact sticky Back/Home controls that respect device safe areas.
- Scan a front label with the camera or photo library and optionally add a back
  label.
- Client-side image compression, label consistency warnings, and resilient
  recognition handling.
- Review and edit recognized wine details before saving.
- Preview Explore this Wine enrichment without silently adding a bottle.
- Add, browse, search, inspect, edit, and delete canonical cellar records; existing-record and quantity edits require a change review and explicit confirmation, while complete deletion keeps a stronger bottle-aware warning.
- Track bottle quantities and canonical workbook-oriented cellar fields.
- Preserve My Cellar search, navigation, and scroll context when viewing a wine.
- View structured Wine Profiles with tasting, style, food, serving, maturity,
  winery, vintage, and drinking-window guidance.
- Generate, backfill, retry, and explicitly refresh AI profiles.
- Ask What Should I Drink? in natural language and receive up to three
  explainable, cellar-first matches that protect materially developing bottles when comparable peak alternatives exist, or honest alternative styles.
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
- Read the eight-position Drink Readiness lifecycle, including distinct wine-red past-peak positions and the preserved gold positive scale.
- Use Drinking Outlook bottle counts based on ideal peak timing—not mere earliest drinkability—and its concise priority observation to plan drinking from the current year onwards.
- Tap every meaningful Cellar Insights wine group—including collection totals, valuation gaps/coverage, highlights, Collection Mix, Drink Readiness, and Drinking Outlook—to browse the matching canonical wines in the familiar My Cellar list and continue into Wine Details without losing the selection or scroll context.
- View one clean Estimated Market Value per bottle, a subtle previous-estimate status after unsuccessful verification, or the exact `Currently unavailable` state only when no usable estimate exists; automatically value a genuinely new scanned wine once, or explicitly refresh one wine without changing other wine data. Browsing, searching, duplicate quantity additions, and editing do not initiate market research.
- Explicitly export the complete cellar or the exact current insight selection as a filtered `.xlsx` snapshot; Excel import and write-back are not supported.
- Install VinoCastello from supporting browsers with the official artwork supplied by `public/images/icon-hero.webp`.

# Open Issues

## Known Bugs and Behavioral Risks

- Market retrieval requires the configured OpenAI provider and network access. Conversion is intentionally not attempted: non-EUR offers are excluded until a reliable exchange-rate mechanism is approved. Strong identity and exact single-bottle package evidence may still be unavailable, nearby-vintage evidence is deliberately limited to ±2 years, and retailer listings can change independently of the 30-day successful-value cache.
- Apple Touch Icons require a supported dedicated raster format in Apple environments that do not accept WebP. VinoCastello intentionally has no generated PNG fallback, so those environments may use their own fallback until a suitable official, manually supplied compatible asset exists.

- Image sets have generic names (`Image Set N`), which makes ambiguity harder to
  resolve in long conversations.
- Typed Sommelier context reserves several IDs/modes that current screen and
  multipart wiring do not supply.
- AI recognition, enrichment, routing, answers, and live research depend on
  configured provider/network access; core inventory remains usable without it.
- `localStorage` and IndexedDB can diverge or be evicted independently, and an
  IndexedDB load failure currently becomes silent loss of image context.
- Drinking-lifecycle decisions use the current UTC year and cannot account for storage history, bottle condition, closure variation, month, or personal maturity preference. Historical profiles without explicit peak dates use a conservative inferred best period until refreshed.
- Category normalization intentionally covers capitalization plus clear aliases
  such as Tuscany/Toscana; ambiguous translations and appellation synonyms are
  left unchanged rather than risking incorrect aggregation.

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
- Insights, filtered insight selections, and Excel export load/process the cellar client-side; very large collections will eventually need server-side retrieval, pagination, and streamed export.
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
- Link recommendations to filtered cellar/detail views while preserving context; insight handoffs are complete.
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

1. **Trust, provenance, and end-to-end reliability:** Mark data provenance; add
   browser, database integration, and provider-contract coverage; and add
   redacted observability.
2. **Contextual handoffs and scalable retrieval:** Connect existing screens to
   the Sommelier with typed context and implement deterministic candidate
   retrieval plus compact canonical summaries.
3. **Structured Restaurant and Wine Shop assistance:** Add progressive controls,
   reviewable OCR results, party/dish/budget context, shortlists, and a safe
   selected-bottle handoff to Scan/Review/Add.
4. **Personal preferences and tasting history:** Add canonical tasting and
   consumption events, inspectable preference signals, correction/reset, and
   explanations.
5. **Workbook interoperability and insight scale:** Add quality/profile coverage and server-side insight paging. Excel remains export-only unless a separately approved future sprint revises that safety decision; the current workbook snapshot is not an import or synchronization channel.
6. **Longer-term cellar utility:** Add bottle locations, opening/quantity actions,
   drinking-window alerts, collection trends, offline inventory shell, and
   graceful queued AI actions.

# Next Planned Sprint

## Sprint 15 — Trust, Provenance, and End-to-End Reliability

**Recommended objective:** Extend provider-contract and database integration coverage and visible provenance for AI/user-confirmed facts without weakening the confirmed-write or export-only boundaries.

# Architectural Decisions

- **One personal AI Sommelier:** Add contextual entry points or modes to the one
  assistant rather than creating competing assistants.
- **Canonical Wine is authoritative:** The application database and shared Wine
  domain model are the source of truth. AI context, browser memory, analytics,
  and future workbook exchange must not become parallel records.
- **Cellar-first recommendations:** Recommend suitable available owned bottles first, keep food and occasion fit primary, and use canonical lifecycle opportunity cost to protect materially developing bottles when comparable peak choices exist. Explain evidence and return an honest no-match rather than forcing or inventing a result.
- **Reuse services; never duplicate business logic:** Recommendation scoring,
  normalization, storage, recognition, and image preparation remain centralized
  behind existing domain/service boundaries.
- **Canonical category presentation:** Existing storage rows remain source-faithful, while one shared normalization boundary restricts colour to Red, White, or Rosé and supplies canonical categorical values to recognition, application reads, analytics, filtering, and Collection Health. Still/Sparkling is a separate derived type that prefers structured style metadata.
- **Separate deterministic decisions from generation:** Keep reproducible
  recommendation filtering/scoring outside generative chat.
- **User confirmation controls writes:** Recognition and enrichment propose
  data; they do not silently persist or overwrite the canonical record.
- **Market value is per bottle:** Store one provider-neutral current estimate plus internal cache/provenance metadata on canonical Wine; never store totals or use historical purchase price in valuation calculations. Public observations remain behind the provider boundary and are not exposed in the UI. Revaluation is transactional in meaning: only a reliable replacement updates the successful value and timestamp; unsuccessful attempts preserve the prior estimate and record a separate attempt status.
- **Unknown remains unknown:** Missing scalar values are `null`, empty
  collections represent no known entries, and uncertainty must be explicit.
- **Minimal, bounded AI context:** Route first, retrieve only necessary canonical
  data, bound messages/images, isolate live facts, and degrade gracefully.
- **Browser-local conversation by default:** Text and image context is scoped to
  the current browser session and is not a second durable cellar.
- **Export without dual authority:** Runtime-generated `.xlsx` files are explicit, read-only snapshots of the complete or centrally filtered canonical cellar. Excel import, synchronization, editing and restore are not supported; the database remains authoritative. Longer-term MCHRDV interoperability requires a separately approved safety design.
- **Mobile-first, simple, and premium:** Preserve one obvious next action,
  accessible touch behavior, consistent language, calm progressive disclosure,
  and shared visual primitives.
- **One manually supplied application icon:** `public/images/icon-hero.webp` is
  the canonical VinoCastello icon. Codex must not generate, convert, modify, or
  commit binary image assets; platform gaps remain documented until the user
  supplies a compatible official asset.
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
