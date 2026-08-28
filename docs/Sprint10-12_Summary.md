# Sprints 10–12: Canonical Product and Engineering Summary

**Status:** Current through merged pull request **#64** (`672aeb1`, 28 August 2026)  
**Scope:** Sprint 10 through Sprint 12, plus the current behavior those sprints produced  
**Audience:** Product, engineering, design, QA, and future AI agents

> This document is the canonical reference for the work completed in Sprints 10–12. It was reconstructed from the complete repository history, every merge commit and implementation commit in the range, the current source, prompts, and automated tests. The repository does not contain separate sprint-planning records or pull-request discussion metadata. Sprint boundaries below therefore follow the shipped feature sequence and the explicit in-source labels “Sprint 11D” and “Sprint 12A.” Where the product has an architectural capability but no dedicated screen or persisted workflow, that distinction is stated explicitly.

## 1. Executive Summary

### Sprint 10 — Cellar intelligence and the AI companion foundation

**Objective.** Turn the cellar from a passive inventory into an informed companion: enrich canonical wines with structured knowledge, recommend bottles already owned, and introduce a conversational sommelier that can route different wine questions to the right context and tools.

**Business value.** Users gained practical reasons to return to the application after adding bottles. They can inspect a useful wine profile, ask what to drink with a meal, see why an owned bottle fits, ask cellar questions, and obtain general wine, buying, serving, storage, travel, and restaurant guidance. Recommendations remain inventory-aware rather than becoming a generic affiliate or catalogue experience.

**Major architectural decisions.**

- The canonical `Wine` model remains the source of truth. AI enrichment is an extensible `WineProfile` on that model; structured `SommelierProfile` facts are not maintained in a competing recommendation record.
- Identity, inventory/workbook details, and AI enrichment have explicit boundaries. Unknown scalar facts stay `null`, empty collections mean no known facts, and AI generation timestamps are separate metadata.
- Recommendation logic is centralized in one deterministic `RecommendationService`; the API and UI do not duplicate scoring rules.
- The conversational Sommelier uses a two-stage flow: classify the latest request, then answer with specialist guidance and only the necessary application/live context.
- The documented prompt in `docs/SommelierPrompt.md` is loaded as the runtime prompt, preventing documentation and behavior from silently diverging.
- Time-sensitive research is isolated behind a `LiveIntelligenceSkill` and degrades to an honest “unavailable” state.

### Sprint 11 — Personal multimodal Sommelier and VINOCASTELLO experience

**Objective.** Make the Sommelier genuinely personal and usable in real-world wine moments by adding images, camera access, conversation continuity, resilient requests, and a coherent mobile-first VINOCASTELLO interface.

**Business value.** Users can photograph or upload menus, wine lists, shop shelves, and bottles and discuss them naturally over multiple turns. Text and image history survive navigation or reload in the same browser, temporary service failures receive an automatic retry, and users can deliberately reset the session. The wider application was unified into a premium, recognizable brand rather than a collection of separately styled feature screens.

**Major architectural decisions.**

- Text conversation is browser-local (`localStorage`); binary image sets are browser-local (`IndexedDB`). Neither becomes a second server-side cellar record.
- Images are grouped into named sets and resent as bounded context. The current limits are six images per set, six sets, and eighteen remembered images overall.
- Client-side compression is shared with the existing image pipeline before multimodal requests.
- The API accepts multipart requests, validates message/image count, MIME type, and size, and translates images to transport-neutral `SommelierImageContext` objects before the OpenAI adapter encodes them.
- Requests use a 60-second timeout, one retry for network/transient HTTP failures, cancellation on “New chat,” and a stable user-facing error.
- Shared premium primitives (`HeroBackground`, headers, buttons, back navigation, icons) and design tokens became the cross-application visual system.

### Sprint 12 — Cellar insights and installable-app groundwork

**Objective.** Surface collection-level value from confirmed cellar data and prepare web-app identity infrastructure.

**Business value.** The Cellar Insights dashboard summarizes collection size, bottle count, represented regions, diversity, readiness, and notable collection patterns without requiring users to analyze rows manually. A web manifest and icon metadata lay the groundwork for an installable, branded mobile experience.

**Major architectural decisions.**

- Insight derivation is a pure client-side domain helper over canonical `StoredWine[]`; the page contains presentation, not duplicate analytics logic.
- Insights use only confirmed cellar/profile data and explicitly tolerate missing fields.
- Manifest and icon declarations use Next.js metadata conventions. The sprint intentionally added placeholders/infrastructure rather than final icon artwork.

## 2. Sprint-by-Sprint Summary

## Sprint 10 — Cellar Intelligence and Conversational Foundation

### Objective

Create the intelligence layer between canonical cellar records and user decisions: richer wine knowledge, explainable cellar-first selection, and a flexible conversational surface.

### Features implemented

1. **Canonical wine enrichment foundation**
   - Added `WineProfile`, profile lifecycle metadata, structured tasting/serving/drinking/style/food fields, and canonical workbook-oriented cellar details.
   - Added mobile Wine Details and reusable Wine Profile presentation.
   - Added AI profile generation, persistence, backfill for existing records, explicit refresh, and failure-safe retry behavior.
   - Added a non-persisting **Explore this Wine** preview during scanning; the user chooses whether to save the recognized wine.
   - Improved recognition quality and safe normalization so missing AI facts are not fabricated.

2. **Cellar navigation and data consistency**
   - Preserved search/navigation context between My Cellar and Wine Details.
   - Aligned list, detail, storage, recognition, and service types with the canonical wine entity and workbook-compatible fields.
   - Fixed My Cellar top scrolling.

3. **What Should I Drink?**
   - Added a dedicated recommendation page and API.
   - Added natural-language meal understanding, ingredient/family/cooking-cue classification, multilingual aliases, preference signals, drinking-window checks, bottle availability, suitability exclusions, quality gates, and cellar-first ranking.
   - Returns up to three explainable owned-wine recommendations with match status, pairing reason, maturity, and style; when no bottle clears the quality threshold, returns suitable styles rather than inventing a cellar match.
   - Added focused cellar queries for ready-to-drink wines, country inventory, and comparison.
   - Added validation for unrecognized dishes instead of returning a spurious recommendation.

4. **Structured Sommelier Profiles**
   - Added occasions, excellent/good/avoid pairings, wine style, ageing potential, drinking stage, and serving personality to the canonical `WineProfile`.
   - Added backward-compatible normalization for previously stored profile JSON.
   - Connected those facts to enrichment, profile UI, recommendation scoring, and explanations.

5. **Ask Your Sommelier foundation**
   - Added the chat page, API route, central runtime prompt, bounded message validation, and OpenAI Responses adapter.
   - Added intent routing for cellar, buying, restaurant, travel, wine knowledge, food pairing, serving, storage, comparison, and general requests.
   - Added conditional retrieval of the current wine and/or full cellar.
   - Added live research for current prices, availability, opening hours, travel, events, recent news, and current scores, with graceful fallback when research is unavailable.

### Files and components affected

- **Domain:** `src/domain/wine.ts`
- **Persistence:** `src/server/storage/neon-wine-storage.ts`
- **Enrichment:** `src/server/ai/ai-provider.ts`, `src/server/ai/providers/openai-provider.ts`, `src/server/ai/ai-service.ts`, `src/server/wine-profile-generator.ts`, `src/server/wine-profile-enrichment.ts`
- **Recommendations:** `src/server/recommendations/recommendation-service.ts`, `src/app/api/recommendations/route.ts`, `src/app/recommendation/page.tsx`
- **Sommelier:** `docs/SommelierPrompt.md`, `src/server/sommelier/*`, `src/app/api/sommelier/route.ts`, `src/app/sommelier/page.tsx`
- **Wine flows:** `src/app/cellar/page.tsx`, `src/app/cellar/[id]/page.tsx`, `src/app/scan/page.tsx`, `src/components/wine-profile.tsx`, `src/components/wine-review.tsx`
- **Navigation and parsing:** `src/lib/cellar-navigation.ts`, `src/lib/wine-recognition.ts`, `src/services/wine-service.ts`
- **Tests:** `test/cellar-navigation.test.mjs`, `test/recommendation-service.test.mjs`, `test/sommelier.test.mjs`, `test/wine-profile-enrichment.test.mjs`, `test/wine-recognition-quality.test.mjs`, `test/wine-service.test.mjs`, and updated recognition response tests.

### Technical approach

The enrichment provider returns strict structured data. Storage normalizes old or incomplete documents into the current schema. The recommendation engine then consumes only `StoredWine` records, creates a normalized meal model, eliminates unavailable/unsuitable bottles, scores direct pairings plus food family, style, structure, maturity, serving fit, preference, and availability, and renders explanations from the same score evidence.

The conversational path first asks the model for a strict JSON route. `answerSommelier` combines the canonical prompt with intent-specific guidance, retrieves the smallest relevant application context, optionally invokes Live Intelligence, and calls the answer model. This keeps routing, storage, current-information research, model transport, and response generation replaceable and testable.

### User-facing improvements

- Wine Details became educational and actionable, with explicit AI refresh rather than silent mutation.
- Users can preview enrichment before committing a scanned bottle.
- A meal can be entered in ordinary language; results explain **why**, not merely which bottle won a score.
- The experience honestly reports no match and suggests styles instead of forcing a poor cellar choice.
- The chat provides one approachable entry point for broad wine help while automatically using owned bottles when relevant.

### Known limitations at sprint close

- Recommendation understanding is deterministic and lexicon-based; unfamiliar dishes, nuanced sauces, allergies, budgets, group preferences, or uncommon cuisines may need clarification or may not classify.
- Recommendation preferences exist in the service contract but the focused page does not provide a persistent preference model.
- Profile quality depends on the AI provider and the identifying facts available; refresh is manual and provider-dependent.
- Live Intelligence has no durable source/audit record in the database.
- The first chat implementation did not yet accept images or preserve full session state; Sprint 11 addressed this.

### Test results

Sprint 10 added regression tests for navigation-state preservation, enrichment success/failure/refresh behavior, profile normalization, recognition quality, recommendation ranking and exclusions, natural-language intent routing, structured output, cellar retrieval, and Live Intelligence fallback. At the current Sprint 12 head these tests pass as part of the complete suite; see the validation record at the end of this document.

### Pull requests

- **#36** — AI wine companion foundation
- **#38** — My Cellar navigation state and canonical data consistency
- **#39** — Wine Details enrichment generation, persistence, and backfill
- **#40** — Explore this Wine preview workflow
- **#41** — Profile quality and safe refresh
- **#42** — My Cellar scrolling fix
- **#43** — What Should I Drink? experience
- **#44** — AI-agent documentation consolidation (process/supporting change)
- **#45, #46, #47** — Meal-aware ranking, recommendation quality, and cellar-first refinement
- **#49** — Structured Sommelier Profiles
- **#50** — Your Sommelier chat
- **#51** — Routed wine companion
- **#52** — Live Intelligence
- **#53** — Restored structured recommendations and Sommelier Profile integration

## Sprint 11 — Personal Multimodal Sommelier and Premium Experience

### Objective

Bring the Sommelier into restaurant, shop, and bottle-in-hand situations, preserve conversational context reliably, and make all principal workflows feel like one mobile-first product.

### Features implemented

1. **Multimodal questions**
   - Up to six new images can be attached from the photo library or rear-facing camera.
   - A question is optional; an image-only submission receives a default analysis request.
   - JPEG, PNG, and WebP are supported; images are compressed before upload and previewed/removable in the composer.
   - The prompt explicitly recognizes menus, wine lists, a single bottle/label, shelves, multiple bottles, price tags, and mixed content.

2. **Restaurant, menu, wine-list, shelf, and bottle analysis**
   - Menu plus wine list: aims to return best overall, best value, and special-occasion choices.
   - Menu alone: recommends styles and matching cellar bottles where possible.
   - Wine-shop shelf: considers taste fit, cellar gaps, balance, and value rather than highest rating alone.
   - Single bottle: can discuss visible identity, buying value, comparison with the cellar, drinking window, food pairing, and serving.

3. **Conversation and image memory**
   - Keeps up to 100 validated text messages (50 user/assistant exchanges).
   - Saves text history in `localStorage` and remembered image files/sets in IndexedDB.
   - Reuses remembered sets in follow-ups, resolves pronouns/references from chat history, and asks which set only when multiple image contexts are genuinely ambiguous.
   - “New chat” aborts the active request and clears text, images, attachments, and browser persistence.

4. **Reliability**
   - Retries once on network failures, HTTP 408/425/429, and 5xx responses.
   - Times out each attempt after 60 seconds.
   - Keeps the optimistic user message and exposes a stable “conversation is safe” retry message.
   - Validates multipart structure, file count, set count, supported type, and an 8 MiB per-file server limit.

5. **VINOCASTELLO rebrand and shared premium design**
   - Renamed and repositioned the product as a private collection with a trusted sommelier.
   - Added reusable premium UI primitives, shared tokens, hero atmospheres/artwork, consistent cards/actions/headers, mobile safe-area handling, and a unified visual pass across Home, Cellar, Wine Details, Scan, Recommendations, and Sommelier.

### Files and components affected

- **Multimodal/session:** `src/app/sommelier/page.tsx`, `src/app/api/sommelier/route.ts`, `src/lib/sommelier-image-memory.ts`, `src/lib/sommelier-request.ts`, `src/server/sommelier/sommelier.ts`, `src/server/sommelier/openai-sommelier-model.ts`, `docs/SommelierPrompt.md`
- **Shared experience:** `src/components/premium-ui.tsx`, `src/components/icons.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/layout.tsx`
- **Flow adoption:** `src/app/cellar/page.tsx`, `src/app/cellar/[id]/page.tsx`, `src/app/scan/page.tsx`, `src/app/recommendation/page.tsx`, `src/components/wine-profile.tsx`, `src/components/wine-review.tsx`
- **Artwork:** existing assets under `public/images/` connected through the shared hero system
- **Tests:** `test/sommelier.test.mjs`, new `test/sommelier-request.test.mjs`, and added recommendation validation coverage.

### Technical approach

The client creates an image set only when a message is sent. It retains the newest six sets, removes oldest sets until the total is at most eighteen images, persists those sets in IndexedDB, and rebuilds multipart `FormData` for each request/retry. The server validates set metadata against the exact file count and converts accepted files to byte arrays. The OpenAI adapter groups images by set, inserts labels and data URLs into the latest user content, and includes the entire bounded text history.

Presentation was consolidated around shared primitives rather than page-specific reimplementations. The later Sprint 11 design pass substantially rewrote pages to consume those primitives while retaining the established flows and canonical domain services.

### User-facing improvements

- The same Sommelier now works at home, in a restaurant, and in a shop.
- Camera and library are separate, obvious touch targets.
- Photo previews make upload state visible before sending.
- Follow-up questions no longer require repeating the wine, choice, or image when context is clear.
- Accidental stale responses are prevented when starting a new conversation.
- The entire product uses consistent language, visual hierarchy, back behavior, and mobile-safe controls.

### Known limitations at sprint close

- “Restaurant mode” and “wine shop mode” are prompt-driven conversational behaviors, not dedicated mode toggles or persisted sessions.
- Image-set labels are currently generic (`Image Set 1`, etc.); the model may describe their contents, but the UI does not let users rename them or browse remembered sets.
- Every remembered image is resent on subsequent requests, which increases latency, bandwidth, and model cost as the session grows.
- Text and images are stored only in the current browser, are not synchronized across devices, and are cleared by browser storage controls.
- There is no OCR confidence UI, bounding-box review, or structured extraction/edit step for menu/list prices.
- Sommelier advice does not provide an in-chat “Add to Cellar” transaction; scanning remains the canonical add workflow.

### Test results

Sprint 11 added tests for named image-set forwarding, prompt memory rules, 100-message context, retryable and non-retryable responses, network failure, friendly errors, request cancellation, and current-information behavior. The current full suite, lint, type check, and production build pass; see the validation record below. Visual changes were implemented without a committed screenshot artifact in the sprint history.

### Pull requests

- **#54** — Cellar-aware personal multimodal AI Sommelier
- **#56** — Conversation reliability, named image sets, memory, and hardened requests
- **#57** — VINOCASTELLO redesign
- **#58** — Premium hero artwork integration
- **#60** — Premium UI polish and unknown-dish validation
- **#61** — Shared visual system audit and components
- **#62** — Canonical VINOCASTELLO premium design system

## Sprint 12 — Cellar Insights and App Identity Infrastructure

### Objective

Add an at-a-glance view of collection health and prepare standards-based application identity for future installation and custom icons.

### Features implemented

- Added **Cellar Insights** and a home navigation entry.
- Calculates total distinct wines, bottle total, region count, a diversity score, ready/mature bottles, ageing distribution, country/region/color breakdowns, and notable collection observations from canonical records.
- Added responsive premium dashboard presentation consistent with Sprint 11.
- Added Next.js web manifest metadata, theme/background colors, standalone display configuration, and declared icon locations/sizes.
- Added layout icon metadata for future custom application icons.

### Files and components affected

- `src/app/cellar/insights/page.tsx`
- `src/lib/cellar-insights.ts`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/app/manifest.ts`
- `src/app/layout.tsx`
- `test/cellar-insights.test.mjs`

### Technical approach

The page loads wines through the existing `/api/wines` boundary and passes them to a pure `buildCellarInsights` helper. Normalized buckets and summary observations are derived without mutating records or writing a parallel analytics model. Manifest configuration is code-native through the Next.js App Router metadata API.

### User-facing improvements

- Users can understand collection size, breadth, maturity, and gaps from one dashboard.
- The dashboard is reachable from Home and follows the shared premium/mobile system.
- Browser and future installed-app metadata identify the product consistently as VINOCASTELLO.

### Known limitations at sprint close

- Insights are descriptive, not interactive: chart segments do not filter My Cellar or link to matching bottles.
- Data quality is limited by missing country, region, color, quantity, and maturity/profile fields.
- Insight computation currently occurs after fetching the full cellar rather than through a server-side aggregate endpoint.
- No history exists for trends, consumption, purchases, value, or profile coverage over time.
- Icon metadata is infrastructure only; final icon files/artwork were explicitly not delivered by PR #64.

### Test results

Sprint 12 added tests for empty collections, counts, normalized grouping, maturity/readiness, and summary insight generation. These pass in the current full suite. Lint, type check, and the production build also pass.

### Pull requests

- **#63** — Premium Cellar Insights dashboard and home link
- **#64** — Future custom icon metadata and web manifest (placeholders only)

## 3. Current Personal AI Sommelier Capabilities

### Cellar-aware conversations

The classifier decides whether a request needs the cellar and retrieves it from `NeonWineStorage` only then. The answer receives confirmed canonical records as JSON and is instructed never to invent ownership, quantity, or missing facts. Current-wine and current-scanned-wine IDs are supported by the service contract, although the main chat page currently sends only `cellarEnabled: true` and does not launch with one of those IDs.

Examples include “Which Italian wines do I own?”, “What is ready to drink?”, “Which bottle should I open?”, “Do I already own something similar?”, and cellar-aware buying decisions.

### Recommendations

There are two complementary paths:

- **What Should I Drink?** is deterministic and cellar-only. It produces ranked, structured, explainable results for a meal or occasion.
- **Your Sommelier** is conversational. It can combine cellar facts, the structured profiles, conversation preferences, images, and current information, and can ask one essential clarification.

Both paths must prefer confirmed owned bottles where appropriate and explicitly admit when the cellar contains no suitable match.

### Image upload and camera support

- Photo Library supports multiple image selection.
- Camera uses an `image/*` file input with `capture="environment"` for the device’s rear-camera flow.
- Up to six images may be attached to a new set.
- Images are client-compressed, previewed, removable, MIME/size validated on the server, and sent only as part of an intentional Sommelier request.

### Menu analysis

The Sommelier can interpret food-menu images, identify likely dishes, recommend compatible styles, and cross-reference owned bottles when the route requests cellar context. With a menu and list it is instructed to provide best overall, best value, and special-occasion choices when possible. Unclear text is treated as uncertain rather than confirmed.

### Wine-list analysis

It can inspect one or multiple wine-list images, reason across pages, compare visible producers/vintages/styles/prices, balance the group’s food and budget, and retain the list for follow-ups. Current market claims require Live Intelligence; visible list prices come from the image and should be qualified when unclear.

### Wine-shelf analysis

It can analyze a shop shelf or a group of bottle/price-tag images. Guidance prioritizes personal taste, useful gaps in the cellar, collection balance, and value—not merely ratings. This is a conversational analysis, not a structured shelf inventory import.

### Bottle analysis

For a single bottle or label it can discuss likely identity, style, drinking window, pairing, serving, buying value, and comparison to the cellar. Visual identity remains uncertain until confirmed; adding the wine uses the dedicated Scan Wine recognition/review workflow.

### Conversation memory

- Up to 100 messages are accepted.
- Prior questions, answers, named wines, recommendations, acceptances/rejections, and natural references such as “it” or “which one” remain in the prompt context.
- Text persists across reload/navigation in the same browser.
- Memory is explicitly session-scoped; New chat clears it, and no claim of cross-session knowledge is allowed.

### Image context

- Image sets persist in IndexedDB for the current conversation.
- The newest relevant set is intended to be reused automatically.
- If multiple unrelated sets are plausible, the prompt requires a short clarification instead of guessing.
- Limits bound cost and payload: 6 images/set, 6 sets, 18 total images, JPEG/PNG/WebP, and 8 MiB/file after client preparation.

### Recommendation engine

The deterministic engine filters zero quantity, “past peak,” wines outside stored drinking windows, explicit avoid pairings, and strong structural conflicts. It scores direct structured pairings, ingredient family, style, acidity/body/tannin/sweetness, maturity, serving personality, stated preferences, and bottle availability. It requires evidence and a quality threshold, caps the output at three, and exposes human-readable evidence rather than internal scoring details.

### Structured Sommelier Profiles

Every canonical Wine Profile contains:

- occasions;
- excellent, good, and avoid pairings;
- wine style;
- ageing potential;
- drinking stage;
- serving personality;
- structured sensory, serving, drinking-window, general style, pairing, summary, winery, and vintage guidance.

Old records are normalized to empty/null structures, so schema evolution does not fabricate facts.

### Retry handling

The client makes at most two attempts. Network failures and transient 408, 425, 429, and 5xx responses retry once; other 4xx errors do not. Each attempt has a 60-second timeout. New chat aborts in-flight work. Failure leaves the already-entered conversation visible and gives a friendly retry message.

### Context management

Context is layered and bounded:

1. canonical base prompt;
2. complete bounded text conversation;
3. classified specialist guidance;
4. selectively retrieved current wine/cellar JSON;
5. optionally remembered image sets;
6. optionally fresh Live Intelligence;
7. an explicit note describing whether current information is available.

This prevents the cellar from being sent for unrelated knowledge questions and keeps current web facts separate from durable application truth.

## 4. Architecture

### System overview

```mermaid
flowchart TD
    U[Mobile/Desktop user] --> HOME[Next.js App Router UI]
    HOME --> SCAN[Scan Wine]
    HOME --> REC[What Should I Drink?]
    HOME --> CHAT[Your Sommelier]
    HOME --> CELLAR[My Cellar / Insights]

    SCAN --> COMP[Shared image compression]
    COMP --> RECOG[/api/recognize-wine]
    RECOG --> AIP[AI service + OpenAI recognition/profile provider]
    AIP --> REVIEW[Review / Explore Profile]
    REVIEW --> WAPI[/api/wines]

    REC --> RAPI[/api/recommendations]
    RAPI --> STORE[NeonWineStorage]
    RAPI --> ENGINE[Deterministic RecommendationService]

    CHAT --> LOCAL[localStorage text + IndexedDB image sets]
    CHAT --> SAPI[/api/sommelier]
    SAPI --> ROUTER[OpenAI strict route classifier]
    ROUTER --> CTX[Context resolver]
    CTX --> STORE
    ROUTER --> LIVE[Optional Live Intelligence skill]
    CTX --> ANSWER[OpenAI answer model]
    LIVE --> ANSWER
    LOCAL --> ANSWER

    WAPI --> STORE
    CELLAR --> WAPI
    STORE --> DB[(Neon PostgreSQL)]
    STORE --> CANON[Canonical Wine + WineProfile]
    ENGINE --> CANON
    CTX --> CANON
```

### AI Sommelier

- **UI:** `src/app/sommelier/page.tsx` owns only interaction state, browser memory, attachments, cancellation, and rendering.
- **Transport:** `src/lib/sommelier-request.ts` owns timeout/retry/error behavior.
- **API boundary:** `src/app/api/sommelier/route.ts` parses JSON/multipart input, validates it, wires dependencies, and returns one reply.
- **Orchestration:** `src/server/sommelier/sommelier-service.ts` owns routing, specialist instructions, contextual retrieval, and optional live research.
- **Provider adapter:** `openai-sommelier-model.ts` owns Responses API details, strict route schema, image encoding, and answer extraction.
- **Policy/prompt:** `docs/SommelierPrompt.md` is both human-readable policy and the runtime base instruction source.

### Recommendation engine

`RecommendationService` is deliberately separate from generative chat. It accepts canonical `StoredWine[]` and a request, performs deterministic interpretation/filtering/scoring/presentation, and returns structured cards. `/api/recommendations` loads Neon data, filters available bottles, handles focused cellar-query intents, and supplies the no-match response. This makes cellar recommendations reproducible and testable without an AI call.

### Cellar retrieval

`NeonWineStorage` is the persistence boundary. It maps database rows into the canonical domain, normalizes profile and cellar JSON, and supports list/get/create/update/delete. Recommendation retrieval always lists current cellar records. Sommelier retrieval is conditional: `listCellar()` only for routes marked `needsCellar`; `getWine()` only when a relevant ID is supplied and the route marks `needsCurrentWine`.

### Image pipeline

There are two intentional image consumers:

1. **Scan Wine:** front label plus optional back label → client compression → recognition API → provider-independent AI service/OpenAI provider → editable canonical Wine draft → optional profile preview → explicit save.
2. **Sommelier:** up to six arbitrary contextual images → client compression/previews → named browser image set → multipart validation → byte-array context → grouped OpenAI multimodal content → conversational answer. Remembered sets are resent on follow-ups.

The pipelines share compression and domain principles but not recognition business logic: Scan creates an editable structured record; Sommelier provides non-persisting advice.

### Conversation context and AI prompt flow

```text
User text + remembered messages + remembered images
              │
              ├── validate and bound input
              ▼
Strict route classification
  intent + needsCurrentWine + needsCellar + needsCurrentInformation
              │
              ├── retrieve confirmed canonical Wine/cellar only if needed
              ├── request Live Intelligence only if facts must be current
              └── select intent-specific specialist guidance
              ▼
Canonical SommelierPrompt
  + specialist guidance
  + application context JSON
  + image sets
  + optional live facts / unavailable note
  + bounded conversation
              ▼
OpenAI answer → concise reply → browser-local session memory
```

## 5. User Experience

### What Should I Drink?

1. From Home, open **What Should I Drink?**.
2. Describe the meal or occasion in natural language.
3. The API loads only bottles with positive quantity and identifies the meal/cellar intent.
4. For a recognized meal, the engine ranks suitable owned bottles and displays up to three cards with match quality, pairing, maturity, style, and a concise explanation.
5. If no bottle is suitable, the user sees an honest cellar-specific message and ideal styles to seek; if the dish is not recognized, the user is asked to describe it more clearly.
6. Focused questions can also list ready wines, country inventory, or compare two named wines.

### Ask Your Sommelier

1. From Home, open **Your Sommelier**.
2. Type any wine-related question, optionally attach images, and send.
3. The request is routed invisibly to the appropriate wine specialty.
4. Relevant cellar records and current information are added automatically only when needed.
5. Continue with natural follow-ups; text and images remain usable in the current browser conversation.
6. On a temporary failure, the request retries once and the conversation remains visible.
7. Use **New chat** to cancel an active response and clear all session memory.

### Scan Wine

1. From Home, open **Scan Wine**.
2. Take or choose a front-label photo.
3. Optionally add a back label for more identifying detail, or continue with the front label only.
4. If front/back labels appear inconsistent, review the warning and retake the relevant image or continue deliberately.
5. Recognition returns an editable Wine Details review, preserving label images through the flow.
6. Correct fields before any data is saved.
7. Choose **Add to My Cellar**, or **Explore this Wine** to preview an AI profile before deciding to save.

### Add to Cellar

The canonical add path is Scan → recognize → review/edit → save. Duplicate normalization and the storage/service layer protect inventory consistency. Profile exploration does not silently persist a bottle; the user remains responsible for confirming and adding it. The Sommelier can advise about an image but cannot currently create a cellar record from the chat.

### Restaurant mode

There is no separate toggle. The user opens Your Sommelier, photographs or uploads the food menu and wine list (up to six images in one set), and asks for help. The Sommelier recognizes restaurant intent, evaluates pairings, group/budget/value context, and when possible returns best overall, best value, and special-occasion choices. Follow-ups reuse the remembered list. A dedicated structured restaurant session, OCR correction, shortlist UI, and direct budget controls do not yet exist.

### Wine shop mode

There is no separate toggle. The user photographs a shelf, bottles, and/or price tags and asks what to buy. The Sommelier can combine visible selection, stated taste, current conversation preferences, cellar inventory/gaps, and Live Intelligence for current claims. Follow-ups can compare remembered bottles. Results remain advice only; there is no basket, barcode lookup, structured shelf capture, or direct purchase/add transaction.

## 6. Outstanding Issues

### Known bugs and behavioral risks

- **Generic image-set naming.** Sets are stored as `Image Set N`, while the prompt expects useful visual descriptions during ambiguity resolution. This can make long conversations harder to disambiguate.
- **Context-contract gap.** The chat API reconstructs multipart context as `{ cellarEnabled: true }`; the page has no way to supply `currentWineId`, `currentScannedWineId`, recommendation ID, restaurant list ID, or shopping mode even though types reserve those fields.
- **Provider/network dependence.** Recognition, enrichment, chat, classification, and live research require configured external AI access. Core inventory remains available, but AI workflows cannot complete offline.
- **Browser-storage fragility.** Text and image memory can diverge if localStorage succeeds but IndexedDB fails or is evicted. IndexedDB load failure is silently converted to no image memory.
- **Current-year scoring.** Drinking-window suitability uses the server’s current UTC year and does not account for month, storage history, bottle condition, or user preference for youthful/mature wine.
- **No final app icon assets.** Metadata may reference future icon locations before final artwork is supplied.

### Technical debt

- Large cellar payloads are serialized into model context in full; there is no semantic retrieval, summarization, paging, or token-budget strategy for a growing collection.
- All remembered images are re-uploaded and re-encoded on each relevant chat request; no server-side ephemeral image reference/cache exists.
- Conversation persistence has no schema/version validation beyond a cast when loading JSON; malformed-but-valid JSON could create invalid client state until the server rejects it.
- The route classifier is itself an AI dependency and has no deterministic fallback for obvious intents if classification fails.
- Recommendation understanding relies on hand-maintained terms and aliases. Extending cuisines risks a large, brittle lexicon.
- Recommendation/API and Sommelier overlap in cellar-question functionality but return different response shapes and user experiences; their boundaries should be documented and deliberately maintained.
- Live research supplies text to the answer model but has no structured citations contract, freshness timestamp, caching policy, or observability beyond errors.
- Analytics fetch the whole cellar client-side and do not share filter/navigation state with My Cellar.
- Automated tests are strong at unit/service level but there is no committed browser end-to-end suite for camera, IndexedDB persistence, multipart images, mobile safe areas, database integration, or real provider contracts.
- Several UI flows are large client components, particularly Scan and Sommelier, and would benefit from smaller state-machine/hooks boundaries without duplicating logic.

### Areas to improve

- Add explicit data provenance/confidence presentation for recognized versus user-confirmed facts.
- Add accessible OCR review for menus/lists and let users correct names, vintages, and prices before advice.
- Provide semantic image-set names, thumbnails/history, deletion, and explicit selection of a prior set.
- Link recommendations and insights directly to filtered cellar/detail views while preserving navigation state.
- Make structured Sommelier context entry points available from Wine Details, a recommendation card, Scan review, and Cellar Insights.
- Add authentication/ownership boundaries and multi-device synchronization before storing personal conversations server-side.
- Add privacy controls explaining what cellar/image context will be sent for each intentional AI operation.
- Add cost, latency, retry, classifier, retrieval-size, and provider-failure telemetry without logging sensitive image or cellar contents.

### Future enhancement ideas

- Dedicated Restaurant and Wine Shop workspaces with an explicit budget, party/dishes, shortlist, saved comparison, and corrected OCR.
- “Add this bottle” handoff from Sommelier to a prefilled canonical Scan/Review draft—never a silent write.
- Preference learning from confirmed choices/tasting history with inspection, correction, and reset controls.
- Consumption history, occasions, ratings, and “why you liked it” learning.
- Cellar location guidance (“where is it?”), quantity decrement after opening, and drinking-window alerts.
- Hybrid cellar retrieval: deterministic filters first, compact profile summaries next, and only relevant canonical records sent to the model.
- Trend insights for purchases, consumption, regions, maturity, profile coverage, and collection value.
- Final PWA icons, installation validation, offline inventory shell, and graceful queued AI actions.

## 7. Recommended Next Sprints

### Priority 1 — Trust, provenance, and end-to-end reliability

**Why first:** AI breadth is already substantial; confidence now depends on making sources, failure states, and real-device behavior verifiable.

- Mark recognized, AI-enriched, and user-confirmed fields explicitly.
- Add Playwright/browser coverage for Scan, camera/library branching, review/save, Sommelier history, IndexedDB images, retries, and New chat cancellation.
- Add database integration and provider-contract tests with safe fixtures.
- Add structured observability for latency/failure/context size and redact personal content.
- Complete and validate final application icons/manifest install behavior.

### Priority 2 — Contextual handoffs and scalable cellar retrieval

**Why second:** Reserved context fields exist, but screens do not yet use them, and full-cellar prompting will not scale.

- Launch Sommelier from Wine Details, a recommendation, Scan review, and Insight cards with explicit typed context.
- Implement deterministic candidate retrieval and compact canonical summaries before generative reasoning.
- Establish token/image budgets, truncation summaries, and “context used” diagnostics for developers.
- Preserve the canonical Wine as authority; never create a parallel AI cellar index without rebuild/provenance rules.

### Priority 3 — Structured Restaurant and Wine Shop assistance

**Why third:** Multimodal capability is present; structured UX will make it dependable in the moments it targets.

- Add optional Restaurant/Shop entry cards or modes without fragmenting the core Sommelier.
- Extract menu/list/shelf items into a reviewable structure with confidence and corrections.
- Add party, dish, budget, currency, and special-occasion controls via progressive disclosure.
- Add shortlists and a safe handoff from a selected bottle to Scan/Review/Add.

### Priority 4 — Personal preferences and tasting history

**Why fourth:** Preference learning should be based on explicit, trustworthy history rather than inferred chat alone.

- Add canonical tasting events and consumption records.
- Learn inspectable preference signals from confirmed ratings, repeated selections, and explicit feedback.
- Allow correction/reset and explain which facts influenced a recommendation.

### Priority 5 — Actionable insights and workbook interoperability

**Why fifth:** Insights are useful but should become navigational, and the product vision still prioritizes lossless workbook interchange.

- Make insight groups filter/link to My Cellar.
- Add profile coverage and data-quality insights.
- Build the authoritative MCHRDV mapping, previewable duplicate-aware import, and lossless export.
- Add trends only after consumption/purchase history has a trustworthy canonical model.

## Validation Record for This Canonical Summary

The summary was checked against the full local Git graph through PR #64, current source files, and the current automated suite. The following commands were run after creating this document:

- `git log --all --reverse` and `git log --all --merges` — complete local commit/merge history reviewed.
- `npm test` — all automated tests passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — production build passed.

