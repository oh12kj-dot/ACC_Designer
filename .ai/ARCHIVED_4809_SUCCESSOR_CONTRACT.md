# #4809 archived Part successor contract (exact 20)

Status: user approved option A, new versions for the 20 rows below, on 2026-10-26. This contract specifies the bounded change; it is not evidence that new images or Parts have been created. The quality-held three remain held. The old Part rows, their referenced image Assets, and all Designs remain intact and archived as they are. No source is removed from the original 27,046-source baseline.

## Fixed scope and identity

The authoritative source and image hashes, names, and proposed dimensions are in `.local/setup/archived4809-successor-proposal.json`. Its 20 source IDs and old Part IDs must be matched exactly against the current workspace and frozen official-dimension source mapping before preparation and again before each commit. The old Part recipe for every row, confirmed in `.local/setup/4809-archived-live-readback.json`, is `kiwa-frontal-axes-nominal-v1`. Each new active Part must use `kiwa-official-dimension-own-photo-finite-v1` and have a newly reviewed, single-object processed photo. The two size classes use the official diagram's width × height axes: 13×12mm label → 12×13mm; 8×7.5mm label → 7.5×8mm. These are provisional layout bounds, not photo scale, hole geometry, or connection certification.

| Source ID | Preserved archived Part ID |
|---|---|
| `kiwa:8709502533924:46965860466980` | `24501a86-623d-42ee-8761-af26629c1d41` |
| `kiwa:8709502533924:50303298699556` | `ac7229ae-99c6-4ed7-9e51-ac01a53198ea` |
| `kiwa:9137836261668:50303298830628` | `49cecff8-8c22-4d1e-a58f-7b0684de281f` |
| `kiwa:8975028977956:47697984356644` | `0a6b171c-1a9e-47d9-b87f-862e5da63cd4` |
| `kiwa:8975028977956:50303298765092` | `2bcb7221-dd0a-42c5-9c55-37a874e54e98` |
| `kiwa:8975029010724:47697984389412` | `866e0fe8-078e-4c75-bb74-e754ecc25b7f` |
| `kiwa:8975029010724:50303298797860` | `5416857e-77c2-4b0b-a821-ffe22a1d77a5` |
| `kiwa:8709503811876:46965860794660` | `6ce3301e-dec6-4120-b91f-4e2a9207607b` |
| `kiwa:8709503811876:50303298961700` | `ecc244a8-f7f6-4ec9-bf39-689693d081e9` |
| `kiwa:9137836196132:50303298732324` | `7531c5a8-4d0b-436f-81f3-354a9ff29762` |
| `kiwa:9137836294436:50303298863396` | `76b631e7-a3c9-4157-bcf7-3116c53b023e` |
| `kiwa:9137836327204:50303298928932` | `3e033307-d113-482d-8558-df4482359d87` |
| `kiwa:9984616399140:50303268258084` | `4b5e9ba0-9e5a-4a83-8a85-7aefdfcead78` |
| `kiwa:9984616431908:50303268290852` | `659c9469-6c63-4790-bcc7-e8f7ab3d241b` |
| `kiwa:8709542445348:50303298994468` | `6b1759f1-84d6-4575-90d8-0f5fcfa3205b` |
| `kiwa:8709503189284:46965860663588` | `3a4fa1c0-57fa-45ca-8545-faa2dbc9df81` |
| `kiwa:8709503189284:50303299027236` | `41ac438e-8055-4c3b-af27-aff01735ed58` |
| `kiwa:9984616530212:50303268389156` | `8b6670fc-e69f-48bb-9536-6d5a89f0a780` |
| `kiwa:9984616464676:50303268323620` | `1a4bbe33-2cf7-40fc-b796-5a64c3229833` |
| `kiwa:9984616497444:50303268356388` | `235533e3-6d03-4ac1-a9e3-23b87cfe267a` |

## Allowed row predicate

For one listed source, partition **all** current rows into: (1) exactly one protected legacy row with the exact listed `id`, `is_archived=true`, matching `metadata.sourceDraftId`, and `metadata.nominalPlacement.recipe='kiwa-frontal-axes-nominal-v1'`; (2) zero or one active recovery row with a **different** ID, `is_archived=false`, matching source ID, and `metadata.nominalPlacement.recipe='kiwa-official-dimension-own-photo-finite-v1'`; (3) no other rows. Check row ownership/workspace, source URL and immutable source binding too. A matching archive flag or old recipe alone does not identify the protected row. An altered, missing, restored, or duplicate legacy row, an archived new recipe row, a second active row, or any other recipe fails closed. No exception applies to the other 21 official-photo candidates or the quality-held three.

When there is no recovery row, prepare and save exactly one new Part using `part_id:null` after the full official-photo review/approval chain. Never update, unarchive, replace, or pass the old ID as a successor target. When a recovery row exists, verify its aggregate, approved image bytes, and Part ID, then skip creation. A retry after an interrupted save must re-query and apply this partition before any upload or save. Reuse only a matching verified image asset; never mutate the legacy asset. Keep the existing deterministic save key, and verify whether the local RPC honors it across interrupted retries; the row predicate and unique active-source enforcement must still prevent duplicate creation if that key is insufficient.

## Required implementation changes

- In `scripts/prepare-official-dimension-finite.mjs`, replace the generic `rows.length>1 || archived` rejection only for the exact table above with the partition predicate. Keep the existing strict rule for every other source. Bind source ID, old Part ID, old recipe, archived state, and workspace to immutable scope evidence; compare the current proposal/source hashes and the reviewed original/diagram hashes. Do not treat the proposal's old `userDecision:'pending'` field as current authorization; record the 2026-10-26 approval explicitly in the new bounded manifest.
- In `scripts/register-nominal-parts.mjs`, apply the same predicate to the startup row map, preparation gate, pre-commit re-read, and recovery. `officialPhotoKnownParts`, `registeredNominalRecipes`, `registeredNominalEvidence`, `skipPreparedDrafts`, and `priorByDraft` must select the active new row only for these sources. Do not let the old archived row mark the source as already registered, force its old recipe into the recovery check, or enter `promotions.json` as the new Part. Existing source/registry and minimum-sale rules remain in force; never add a source-exclusion entry for an old row.
- Immediately before each save, re-read all rows for the source and the protected old Part by ID. Abort if the predicate or held/restriction/workspace/manifest/hash checks changed. Preserve the existing post-run protected-Part and Design hash checks, and verify the old Part/asset identity, archived state, and all old Design references in readback. New rows must have no invented holes or connection points and retain the existing unverified flags.

## Acceptance checks

Use focused tests that fail before the code change and pass afterward: exact old archived + no new row allows preparation; exact old + one valid active new row recovers the same new ID on rerun; old row alone never counts as a promoted active Part; changed old ID/recipe/archive state, extra archived row, duplicate active row, wrong new recipe, or a source outside the exact 20 fails; all three quality-held sources remain blocked. Interrupt once after new Part save and before checkpoint, then rerun and assert one active new row, the same new Part/asset IDs, preserved old Part/Asset/Design hashes, and unchanged 27,046-source baseline. Validate photo crops and final asset bytes per source before registration; no acceptance claim based only on dimensions or generated images.
