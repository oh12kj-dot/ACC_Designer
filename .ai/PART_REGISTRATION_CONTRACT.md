# Local catalog part registration contract

Date: 2026-10-05 JST. User scope: collect necessary published information and register it in the parts list. This extends CATALOG_CONTRACT.md only for durable local registration; existing calibrated Part, asset and cloud save invariants remain authoritative.

## Outcome and storage boundary

- Add `RegisteredPartDraft`, a durable local parts-list entry separate from a collected candidate and from domain `Part`. `/parts` must show these entries without Supabase credentials, with explicit `登録済み・未校正` status and unresolved requirements. It is useful registered inventory metadata, not a design-ready Part. Never present draft counts as calibrated/cloud Part counts.
- Register every observed product/variant identity once using provider + product ID + variant ID; preserve lossless identifiers. SKU/title cannot be a uniqueness key. Retain each sale option, including unavailable ones, rather than merging different prices/packs into one Part. Record source product/variant IDs and import time.
- Local entries contain selected source metadata/snapshot, published raw dimensions and purchase text, known structured observations, cached image reference or visible missing-image status, parser version, source timestamp/hash, readiness reasons and optional user corrections. Persist beneath a fixed `.local/parts/` path, schema-versioned and excluded from source artifacts.
- Use atomic replace and one serialized writer/lock. Interrupted registration retains the prior valid file. Invalid stored schemas fail visibly rather than resetting to an empty successful list. Bulk import is idempotent; retain user edits, archive flags and future promotion mappings. Import refresh may update source observations but must not overwrite corrections or calibrated cloud Parts.
- Source catalog registration can run from the already collected local snapshot without further network requests. Record input snapshot hash and product/variant counts. Image retrieval is lazy through existing validated catalog cache; uncalibrated images are valid metadata media. Do not claim every image was downloaded when only references exist.

## Published observations and missingness

- Preserve product name, source URL/name, tags/product type, description, variant SKU/title/options, availability, published sale-unit price, proven currency and image choice. Descriptions remain plain sanitized text. Keep raw published options alongside any parsed value.
- Parse explicit units and field labels conservatively with field-level evidence. Missing, ambiguous, conflicting and approximate values remain distinguishable. No zero/default substitutes, no guessed category-specific semantics, no material/color inference from an unrecognized product title.
- `0.6×3mm` does not establish width/height or inner/outer diameter; retain as dimensions text unless independent published labels establish meaning. `PP4`/`SS` remains a supplier size code unless a sourced conversion is retained. A single `6mm` observation alone does not establish both width and height.
- Exact `20ヶ` can yield pack quantity 20; `2g(約110ヶ)` retains sale weight 2g and approximate piece count 110 separately, without exact `packQuantity`, per-piece weight or price. Sale weight is not a part weight. Labeled sale length can yield sale length, not geometry length. Ambiguous mixed pack/length text stays unresolved. Existing PurchaseSpec is created only when all required sale semantics are resolved; local observation fields may be partial.
- Do not fabricate alpha masks, crop, mm/px, image dimensions, calibrated image assets, CP/Hole positions, clearances, path segments, mechanical compatibility or physical geometry. Published dimensions do not replace image calibration.

## UI and promotion

- `/parts` has visible local registered-entry counts/status, searchable name/SKU/options/tag/source and paginated results. Keep authenticated calibrated cloud Parts accessible in the same page with clearly separate counts/actions. Missing numeric values fail numeric filters; unclassified category remains unknown/other, visibly unresolved.
- Local detail shows retained information, source and fetch/import times, raw options, image state and unresolved fields. A `校正してデザイン用パーツに登録` action opens the existing form with the exact product+variant and verified observations. Unknown required fields stay blank; approximate values must not prefill exact purchase fields.
- Local drafts cannot enter editor pickers or Supabase Part persistence. Existing explicit calibration, geometry/CP/Hole definition, validation, AssetService and immutable Part save are the sole promotion path. Missing Supabase setup explains the unmet save requirement; it does not cause fake local calibration or cloud success. No migration or replacement of cloud persistence is included.
- Local mutation endpoints reuse the established loopback Host/Origin/session-token control boundary; browsers cannot select paths or arbitrary fetch URLs. Cloud authentication behavior and user ownership remain intact.

## Acceptance and verification

1. The actual current catalog input produces exactly one durable entry per distinct product/variant key; record scanned, inserted, existing, unresolved and failed counts plus input hash. Restart preserves entries, and repeated registration inserts zero duplicates.
2. Tests exercise duplicate SKU/different IDs, changed handle/options, user correction preservation, unavailable variants, missing images, exact and approximate quantities, ambiguous dimensions, conflicts and corrupt storage. Prove a draft cannot become a domain/editor Part through this import.
3. Targeted route/store tests reject cross-origin/non-loopback/tokenless mutations; concurrency and interrupted writes preserve a valid prior state. No registration-only action starts new remote requests.
4. Typecheck/build and browser checks show `/parts` with no `.env.local`, search/pagination/detail/unknowns and exact-variant promotion; verify cloud list behavior remains available when configured. Record actual local data separately from fixtures and never call missing cloud/editor readiness completed.

Model routing evidence: parent requested `gpt-6.1-sol` / Medium for this bounded design. No separate runtime model/effort confirmation is exposed to this agent; requested settings are not runtime confirmation.
