# VINOCASTELLO — Product Vision

## Product vision

VINOCASTELLO is a dependable, personal record of a real wine collection. It should make adding, finding, understanding, and enjoying a bottle easier without turning cellar management into administration. The application database is the single source of truth. The existing MCHRDV Wine Cellar Excel workbook remains an important interchange format: imports must retain its information and future exports should reproduce its structure without loss.

The product should evolve from a useful catalogue into a trusted cellar companion. It may help identify labels, explain a wine, surface bottles at the right moment, and suggest pairings, while always leaving ownership and final judgment with the user.

## Target user

The primary user is a wine enthusiast maintaining a personal cellar across phone and desktop. They know their collection, use the cellar in practical moments, and value accuracy more than novelty. Typical needs include:

- adding a bottle quickly, often while holding it;
- locating a known bottle or browsing a long collection;
- checking quantity, origin, maturity, serving advice, or notes;
- keeping the application and an established workbook compatible;
- receiving useful assistance without surrendering control of the data.

## Design philosophy

Preserve the calm, focused MVP rather than redesigning it sprint by sprint. Add capability through clear flows and progressive disclosure. The default view should show what is needed for the immediate task; specialist and workbook fields can remain stored until a workflow needs them.

Mobile is a first-class environment, not a reduced desktop experience. Controls must be readable, reachable, and resilient to camera and browser navigation behavior. Desktop should use the same concepts and terminology. Visual polish supports comprehension, but never at the cost of speed or predictability.

## AI philosophy

AI is an assistant around the canonical cellar record, never an alternative source of truth. It may extract label facts, summarize known information, recommend bottles, or propose enrichment. Generated and recognized information must be distinguishable from user-confirmed information where that distinction matters.

AI must not invent missing cellar facts. Unknown data remains `null`; uncertainty is represented explicitly. User edits override suggestions. AI features should degrade gracefully when a provider is unavailable and should not be required for core inventory tasks. Images and personal cellar data should be sent only when necessary for an intentional feature, with server-side credentials and minimal retention.

## UX principles

1. **Keep context.** Returning from a bottle must preserve search results, list position, and scroll position.
2. **Prefer one obvious next action.** Avoid unnecessary choices, screens, and confirmation steps.
3. **Make state visible.** Loading, saving, errors, duplicates, and quantity changes need immediate feedback.
4. **Protect user work.** Navigation and temporary failures should not silently discard useful context.
5. **Use consistent language.** My Cellar, Wine Details, editing, import, and export use the same field names and meanings.
6. **Design for touch and interruption.** Flows work with one hand, browser Back, mobile photo selection, and task switching.
7. **Preserve accessibility.** Semantic controls, labels, focus behavior, contrast, and status announcements are baseline requirements.

## Data principles

- The application database is the single source of truth; screens and future exports read the same canonical wine entity.
- Define each concept once. Identity, inventory, tasting, and AI enrichment must not carry competing copies of the same value.
- Preserve source fidelity. Canonical workbook fields are typed, while additional source columns can be retained losslessly for round-trip export.
- Never infer data merely to fill a field. Unknown scalar values are `null`; empty collections mean no known entries.
- Migrations are additive and backward compatible. Existing wines receive empty/null structures, not fabricated defaults.
- Quantities and identifiers are inventory concerns; recognized label facts are wine identity concerns; serving and drinking guidance are enrichment concerns.
- Imports should be repeatable, auditable, and duplicate-aware. Exports should preserve workbook column names, ordering, and representations once the workbook mapping is implemented.
- The API, storage layer, list, detail view, and edit forms share domain types and normalization rules.

## Long-term roadmap

### Foundation

Maintain reliable scanning, editing, search, quantity management, contextual navigation, and a workbook-compatible canonical model. Add explicit schema migrations and automated coverage for navigation and data round trips.

### Workbook interoperability

Document the authoritative Excel column mapping, import existing rows without loss, validate duplicates and dates/currencies, and export a workbook matching the MCHRDV structure. Provide a preview and error report before committing an import.

### Cellar intelligence

Use confirmed data to surface drinking windows, serving guidance, food pairings, and bottles that deserve attention. Recommendations should explain which stored facts informed them and allow the user to correct them.

### Personal companion

Add optional tasting history, preference learning, location-aware bottle retrieval, and conversational cellar questions. Keep these capabilities inspectable, reversible, and useful without requiring the user to curate an AI-specific dataset.

Across all phases, prioritize data trust, quick mobile use, compatibility, and incremental improvement over feature volume.
