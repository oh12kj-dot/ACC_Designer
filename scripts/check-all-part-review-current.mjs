import { readFile, writeFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { registrationApi } from './lib/local-registration-api.mjs';
import { sha256, stable } from './minimum-sale-units.mjs';
import {supplierPurchaseBlocked,supplierListingNotice} from '../src/domain/supplierListingReview.ts';

// Read-only reconciliation of the two finite corrections against the global baseline.
const dir = '.local/setup/all-parts-review-20261106';
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const before = await json(dir + '/before.json');
const inventory = await json(dir + '/inventory.json');
const wire = await json('.local/setup/wire-path-review-20261106/first.json');
const clamp = await json('.local/setup/clamp-body-meaning-20261106/first.json');
const clampPlan = await json('.local/setup/clamp-body-meaning-20261106/plan.json');
const wireRerun = await json('.local/setup/wire-path-review-20261106/rerun.json');
const clampRerun = await json('.local/setup/clamp-body-meaning-20261106/rerun.json');
const manufacturer = await json('.local/setup/manufacturer-dimensions-20261106/miyuki-db/first.json');
const manufacturerRerun = await json('.local/setup/manufacturer-dimensions-20261106/miyuki-db/rerun.json');
const toho = await json('.local/setup/manufacturer-dimensions-20261106/toho/first.json');
const tohoRerun = await json('.local/setup/manufacturer-dimensions-20261106/toho/rerun.json');
const shindo = await json('.local/setup/manufacturer-dimensions-20261106/shindo-sic109/first.json');
const shindoRerun = await json('.local/setup/manufacturer-dimensions-20261106/shindo-sic109/rerun.json');
const chain=await json('.local/setup/supplier-dimensions-20261106/chain-width/first.json');
const chainRerun=await json('.local/setup/supplier-dimensions-20261106/chain-width/rerun.json');
const component=await json('.local/setup/supplier-dimensions-20261106/component/first.json');
const componentRerun=await json('.local/setup/supplier-dimensions-20261106/component/rerun.json');
const legacyManufacturer=await json('.local/setup/manufacturer-dimensions-20261106/miyuki-legacy/first.json');
const legacyManufacturerRerun=await json('.local/setup/manufacturer-dimensions-20261106/miyuki-legacy/rerun.json');
const guidance=await json('.local/setup/supplier-dimensions-20261106/connector-guidance/first.json');
const guidanceRerun=await json('.local/setup/supplier-dimensions-20261106/connector-guidance/rerun.json');
const dpDbc=await json('.local/setup/manufacturer-dimensions-20261106/miyuki-dp-dbc/first.json');
const dpDbcRerun=await json('.local/setup/manufacturer-dimensions-20261106/miyuki-dp-dbc/rerun.json');
const sizeLabel=await json('.local/setup/supplier-dimensions-20261106/chain-size-label/first.json');
const sizeLabelRerun=await json('.local/setup/supplier-dimensions-20261106/chain-size-label/rerun.json');
const interruptedWireMeaning=await json('.local/setup/supplier-dimensions-20261106/chain-gauge/interrupted.json');
const pipe=await json('.local/setup/supplier-dimensions-20261106/pipe-inner-width/first.json');
const pipeRerun=await json('.local/setup/supplier-dimensions-20261106/pipe-inner-width/rerun.json');
const opening=await json('.local/setup/supplier-dimensions-20261106/opening-size/first.json');
const openingRerun=await json('.local/setup/supplier-dimensions-20261106/opening-size/rerun.json');
const variantHole=await json('.local/setup/supplier-dimensions-20261106/variant-hole-table/first.json');
const variantHoleRerun=await json('.local/setup/supplier-dimensions-20261106/variant-hole-table/rerun.json');assert.equal(variantHoleRerun.changedThisRun,0);
const toolCategory=await json('.local/setup/supplier-dimensions-20261107/tool-category/first.json');const toolCategoryRerun=await json('.local/setup/supplier-dimensions-20261107/tool-category/rerun.json');assert.equal(toolCategoryRerun.changedThisRun,0);
assert.equal(pipeRerun.changedThisRun,0);assert.equal(openingRerun.changedThisRun,0);
assert.equal(sizeLabelRerun.changedThisRun,0);
assert.equal(dpDbcRerun.changedThisRun,0);
assert.equal(guidanceRerun.changedThisRun,0);
assert.equal(legacyManufacturerRerun.changedThisRun,0);
assert.equal(componentRerun.changedThisRun,0);
assert.equal(chainRerun.changedThisRun,0);
assert.equal(shindoRerun.changedThisRun,0);
assert.equal(wireRerun.changedThisRun, 0);
assert.equal(clampRerun.changedThisRun, 0);
assert.equal(manufacturerRerun.changedThisRun,0);
assert.equal(tohoRerun.changedThisRun,0);
const targets = new Set([...wire.verified, ...clamp.verified, ...manufacturer.verified, ...toho.verified, ...shindo.verified, ...chain.verified,...component.verified,...legacyManufacturer.verified,...guidance.verified,...dpDbc.verified,...sizeLabel.verified,...pipe.verified,...opening.verified,...variantHole.verified,...toolCategory.verified].map(r => r.partId));
const clampIds = new Set([...clamp.verified.map(r => r.partId), ...shindo.purchaseIdChanges.map(r=>r.partId), ...chain.purchaseIdChanges.map(r=>r.partId),...guidance.purchaseIdChanges.map(r=>r.partId),...sizeLabel.purchaseIdChanges.map(r=>r.partId),...pipe.purchaseIdChanges.map(r=>r.partId),...opening.purchaseIdChanges.map(r=>r.partId),...variantHole.purchaseIdChanges.map(r=>r.partId),...toolCategory.purchaseIdChanges.map(r=>r.partId)]);
assert.equal(targets.size, 1753);
const api = await registrationApi();
const after = await api.snapshot();
assert.equal(after.workspaceId, before.workspaceId);
const preserved = {};
for (const [table, rows] of Object.entries(before.tables)) {
  const now = new Map(after.tables[table].map(r => [r.id ?? r.part_id, r]));
  let count = 0;
  for (const row of rows) {
    if (table === 'parts' && targets.has(row.id)) continue;
    if (table === 'part_purchase_specs' && clampIds.has(row.part_id)) {
      const current = after.tables[table].filter(r => r.part_id === row.part_id);
      assert.equal(current.length, 1);
      const business = value => { const copy = { ...value }; delete copy.id; return copy; };
      assert.deepEqual(business(current[0]), business(row));
      continue;
    }
    const stored = value => { if(table !== 'parts') return value; const {supplier_listing_review, ...native} = value; return native; };
    assert.deepEqual(stored(now.get(row.id ?? row.part_id)), stored(row), table + ':' + (row.id ?? row.part_id));
    count++;
  }
  preserved[table] = count;
}
assert.deepEqual(after.designs, before.designs);
for (const [path, hash] of [
  ['.local/parts/parts.json', inventory.registrySha256],
  ['.local/catalog/catalog.json', inventory.catalogSha256],
  ['src/data/kiwa-minimum-sale-units.json', inventory.policySha256],
]) assert.equal(sha256(await readFile(path)), hash, path);
for (const e of clampPlan.semanticEvidence) assert.equal(sha256(await readFile(e.path)), e.sha256);
for (const table of ['parts', 'part_purchase_specs', 'part_user_state', 'designs', 'part_through_holes', 'part_connection_points'])
  assert.equal(after.tables[table].length, before.tables[table].length, table);
assert.equal(after.tables.part_path_specs.length, 60);
assert.equal(after.tables.part_image_assets.length, before.tables.part_image_assets.length + 3);
assert.equal(after.tables.part_source_snapshots.length, before.tables.part_source_snapshots.length + targets.size + interruptedWireMeaning.changedParts + 2);

const receiptRows = (await readFile(dir + '/asset-integrity-effective.jsonl', 'utf8')).trim().split('\n').map(JSON.parse);
const receipts = new Map(receiptRows.map(r => [r.assetId, r]));
const oldAssets = new Map(before.tables.part_image_assets.map(r => [r.id, r]));
const assets = new Map(after.tables.part_image_assets.map(r => [r.id, r]));
const newAssets = after.tables.part_image_assets.filter(a => !oldAssets.has(a.id));
for (const a of newAssets) {
  const prior = receipts.get(a.source_transform.priorAssetId);
  assert.ok(prior);
  assert.equal(a.source_transform.originalAndProcessedPixelsUnchanged, true);
  assert.deepEqual(a.source_transform.copiedImageHashes, Object.fromEntries(Object.entries(prior.images).map(([k, v]) => [k, v.sha256])));
  receipts.set(a.id, { ...prior, assetId: a.id, reusedByteIdenticalReceiptFrom: prior.assetId });
}
const originalReview = await json(dir + '/source-evidence-review.json');
const ledgerRows = new Map(originalReview.rows.map(r => [r.partId, structuredClone(r)]));
const balls = await json(dir + '/ball-photo-inputs.json');
const legacy = await json(dir + '/legacy-photo-comparison-inputs.json');
const visual = new Map();
for (const g of balls) for (const r of g.sources) visual.set(r.partId, { kind: 'multi-object-size-region-unresolved', evidence: 'ball-photo-inputs.json', productId: g.productId });
for (const r of wire.verified) visual.set(r.partId, { kind: 'spool-photo-reference-only', evidence: 'wire-photo-inputs.json' });
for (const r of clamp.verified) visual.set(r.partId, { kind: 'retained-cutout-shape-reference-body-meaning-unresolved', evidence: 'clamp-photo-bindings.json' });
for (const g of legacy) for (const partId of g.partIds) visual.set(partId, { kind: 'original-and-high-contact-comparison-no-gross-crop-defect-observed', evidence: 'legacy-photo-comparison-inputs.json', comparison: g.number, resolutionLimit: 'contact-sheet; variant scale and physical axes not established' });
const visualRoot='.local/setup/all-part-visual-review-20261107';
const visualQueueBytes=await readFile(visualRoot+'/queue.json'),visualQueue=JSON.parse(visualQueueBytes);const visualGroups=new Map(visualQueue.groups.map(g=>[g.number,g])),checkedVisualSheets=new Map(),visualLiveParts=new Map(after.tables.parts.map(p=>[p.id,p]));
for(const file of (await readdir(visualRoot)).filter(f=>/^review-(?:tools-)?\d{4}-\d{4}\.json$/.test(f)).sort()){
 const review=await json(visualRoot+'/'+file);assert.equal(review.queueSha256,sha256(visualQueueBytes));assert.equal(review.domainWrites,0);
 for(const finding of review.rows){const group=visualGroups.get(finding.group);assert.ok(group);assert.equal(finding.key,group.key);assert.deepEqual(finding.partIds,group.parts.map(p=>p.id));assert.equal(finding.status,'reviewed-partial');assert.equal(finding.fullReviewComplete,false);assert.ok(finding.reviewedBy&&finding.reviewedAt);assert.ok(finding.sheetPrefix===undefined||finding.sheetPrefix==='tool-role-');const sheet=visualRoot+'/sheets/'+(finding.sheetPrefix??'')+String(finding.sheet).padStart(4,'0')+'.png';if(!checkedVisualSheets.has(sheet))checkedVisualSheets.set(sheet,sha256(await readFile(sheet)));assert.equal(checkedVisualSheets.get(sheet),finding.sheetSha256);
  for(const partId of finding.partIds){assert.ok(!visual.has(partId),'DUPLICATE_VISUAL_JUDGMENT');const p=visualLiveParts.get(partId),a=assets.get(p.image_asset_id),receipt=receipts.get(a.id);assert.equal(receipt.images.original.sha256,finding.originalSha256);assert.equal(receipt.images.high.sha256,finding.highSha256);assert.equal(p.image_asset_id,group.parts.find(p=>p.id===partId).assetId);visual.set(partId,{...finding,evidence:'../all-part-visual-review-20261107/'+file});}
 }
}
let provisional = 0, nominal = 0, covered = 0;
const active = after.tables.parts.filter(p => !p.is_archived);
for (const p of active) {
  const row = ledgerRows.get(p.id);
  assert.ok(row);
  const asset = assets.get(p.image_asset_id), receipt = receipts.get(p.image_asset_id);
  assert.ok(receipt);
  assert.deepEqual(receipt.issues, []);
  assert.equal(receipt.images.high.sha256, asset.content_hash);
  covered++;
  provisional += !!p.metadata?.provisionalRegistration;
  nominal += !!p.metadata?.nominalPlacement;
  row.historicalRestrictionReference = row.held;
  delete row.held;
  row.image.evidence.assetId = p.image_asset_id;
  row.image.evidence.currentHighSha256 = asset.content_hash;
  row.image.evidence.machineImageReceipt = receipt.reusedByteIdenticalReceiptFrom ?? receipt.assetId;
  row.image.evidence.visualReviewThisRun = visual.get(p.id) ?? { kind: 'not-performed' };
  const visualFinding=visual.get(p.id);if(visualFinding?.status==='reviewed-partial'){row.image.status='partial';row.image.reasons=[...new Set([...row.image.reasons.filter(r=>r!=='CURRENT_OUTPUT_VISUAL_REVIEW_OR_BOUND_PRIOR_REVIEW_REQUIRED'),'CONTACT_COMPARISON_PERFORMED_INDIVIDUAL_APPEARANCE_SCALE_AND_CONNECTION_UNVERIFIED',...(visualFinding.kind.startsWith('multi-object')?['MULTI_OBJECT_PHOTO_NO_SINGLE_COMPONENT_REGION']:['single-tray-tool-category-review-required','tool-storage-packaging-product-photo'].includes(visualFinding.kind)?['NON_COMPONENT_TOOL_PRODUCT_ROLE_REQUIRES_REVIEW']:['PROCESSED_COMPONENT_CROP_EDGE_AND_SOURCE_REGION_REQUIRE_DETAIL_REVIEW'])])];}
  row.currentGeometryKind = p.geometry_kind;
  row.currentDomainCategory=p.category;if(p.metadata?.supplierCategoryReview){row.categoryCorrection={status:'supplier-taxonomy-role-corrected',review:p.metadata.supplierCategoryReview,proof:'../supplier-dimensions-20261107/tool-category/first.json'};assert.equal(p.category,'other');}
  row.dimensions.evidence.displayWidthMm = p.width_mm;
  row.dimensions.evidence.displayHeightMm = p.height_mm;
  if (p.metadata?.wirePathReview) {
    row.correction = { recipe: p.metadata.wirePathReview.recipe, proof: '../wire-path-review-20261106/first.json' };
    row.dimensions = { status: 'partial', reasons: ['SUPPLIER_APPROXIMATE_GAUGE_FOR_SCHEMATIC_ONLY', 'PHYSICAL_GAUGE_FIT_BENDING_AND_SALE_LENGTH_UNVERIFIED'], evidence: { review: p.metadata.wirePathReview, pathSpecId: after.tables.part_path_specs.find(s => s.part_id === p.id)?.id } };
    row.purchase.reasons = ['SOURCE_OFFER_RETAINED_PATH_LENGTH_PURCHASE_CONVERSION_UNVERIFIED'];
    row.image.reasons = ['SPOOL_PHOTO_IS_REFERENCE_NOT_INDIVIDUAL_WIRE_APPEARANCE'];
  }
  if(p.metadata?.supplierOpeningSizeReview){row.publishedOpeningSize={status:'supplier-reference-only',review:p.metadata.supplierOpeningSizeReview,nativeGeometryGenerated:false};}
  if(p.metadata?.supplierChainSizeLabelReview){assert.ok(!p.metadata.supplierChainGaugeReview);row.chainSizeLabel={status:'literal-label-bound-physical-meaning-unresolved',review:p.metadata.supplierChainSizeLabelReview,legacyNativeWireDiameterSuspended:true};row.dimensions.reasons.push('SUPPLIER_WIRE_LABEL_MEANING_UNRESOLVED_LEGACY_NATIVE_WIRE_SUSPENDED');row.connection.reasons.push('PUBLISHED_CHAIN_SIZE_LABEL_NOT_USED_FOR_MATERIAL_DIAMETER');}
  if(p.metadata?.supplierConnectionGuidance){row.connectionGuidance={status:'supplier-reference-only',review:p.metadata.supplierConnectionGuidance,holeDiameterInferred:false,fitVerified:false};}
  if(p.metadata?.supplierDimensionReview){row.dimensions={status:'partial',reasons:[p.metadata.supplierDimensionReview.recipe==='supplier-chain-width-reference-v1'?'SUPPLIER_PUBLISHED_CHAIN_WIDTH_RECORDED':'SUPPLIER_PUBLISHED_COMPONENT_DIMENSIONS_RECORDED','WHOLE_BODY_HOLE_AND_CONNECTION_NOT_INFERRED'],evidence:{supplierReview:p.metadata.supplierDimensionReview}};}
  if (p.metadata?.dimensionMeaningReview) {
    row.correction = { recipe: p.metadata.dimensionMeaningReview.recipe, proof: '../clamp-body-meaning-20261106/first.json' };
    row.dimensions = { status: 'unknown', reasons: ['PUBLISHED_SCALAR_BODY_VERSUS_FIT_WIDTH_UNRESOLVED', 'UNSUPPORTED_BODY_FRAME_WITHDRAWN'], evidence: { review: p.metadata.dimensionMeaningReview, displayBoxIsPhysical: false } };
    row.image.reasons = ['REVIEWED_CUTOUT_REFERENCE_NOT_VARIANT_OR_PHYSICAL_SCALE_PROOF'];
    row.purchase.evidence.nativeSpecId = after.tables.part_purchase_specs.find(s => s.part_id === p.id)?.id ?? null;
  }
  if(p.metadata?.manufacturerDimensionReview){row.dimensions={status:'partial',reasons:['MANUFACTURER_FAMILY_REFERENCE_DIMENSIONS_RECORDED','PHOTO_SCALE_AND_VARIANT_APPEARANCE_REMAIN_UNVERIFIED'],evidence:{manufacturerReview:p.metadata.manufacturerDimensionReview,nativeOutsideDiameterMm:p.outer_diameter_mm,nativeHoleDiameterMm:p.hole_diameter_mm}};row.manufacturerDimensionRegistration={proof:'../manufacturer-dimensions-20261106/'+(p.metadata.manufacturerDimensionReview.recipe==='miyuki-dp-dbc-family-reference-v1'?'miyuki-dp-dbc':p.metadata.manufacturerDimensionReview.legacyIdentity?'miyuki-legacy':p.metadata.manufacturerDimensionReview.recipe.startsWith('shindo-')?'shindo-sic109':p.metadata.manufacturerDimensionReview.recipe.startsWith('toho-')?'toho':'miyuki-db')+'/first.json'};}
  if (['8710797525284', '8710797918500'].includes(row.sourceDraftId?.split(':')[1])) {
    row.purchase.reasons.push('ASSORTMENT_TWO_COLOURS_FIVE_EACH_NOT_SINGLE_COLOUR_FULFILMENT');
    row.purchase.evidence.assortmentStatement = '2色各5個ずつ入っています。';
    row.image.reasons.push('SINGLE_REPRESENTATIVE_COLOUR_NOT_ENTIRE_ASSORTMENT');
  }
  row.deskAndVisualReviewComplete = false;
  row.fullReviewComplete = false;
}
assert.equal(covered, 19611);
const priorPhotos=await json(dir+'/prior-photo-review-bindings.json');const priorByPart=new Map(priorPhotos.rows.map(r=>[r.partId,r]));const sourceConflicts=await json('.local/setup/manufacturer-dimensions-20261106/toho/source-dimension-conflicts.json');for(const row of ledgerRows.values()){row.image.evidence.priorReviewBinding=priorByPart.get(row.partId)??{status:'no-bound-prior-processed-review-in-current-audit'};const conflict=sourceConflicts.find(c=>c.partId===row.partId);if(conflict){row.dimensions.status='conflicting-source';row.dimensions.reasons.push('SUPPLIER_LABEL_AND_DESCRIPTION_OUTSIDE_DIAMETER_CONFLICT');row.dimensions.evidence.sourceConflict=conflict;}}
const conflictRecheck=await json('.local/setup/toho-conflicts-20261107/review.json');assert.equal(conflictRecheck.rows.length,3);assert.equal(conflictRecheck.domainWrites,0);
for(const check of conflictRecheck.rows){const prior=sourceConflicts.find(c=>c.partId===check.partId);assert.ok(prior);assert.equal(prior.draftId,check.draftId);assert.equal(prior.size,check.currentLabel);assert.ok(check.currentDiameterStatements.includes(prior.body));assert.match(check.receipt.file,/^\d+\.json$/);const bytes=await readFile('.local/setup/toho-conflicts-20261107/'+check.receipt.file);assert.equal(sha256(bytes),check.receipt.sha256);assert.equal(check.receipt.status,200);assert.equal(new URL(check.receipt.url).hostname,'kiwaseisakujo.jp');assert.equal(check.receipt.finalUrl,check.receipt.url);const product=JSON.parse(bytes),draftProduct=check.draftId.split(':')[1],variantId=check.draftId.split(':')[2];assert.equal(String(product.id),draftProduct);assert.equal(product.variants.find(v=>String(v.id)===variantId).sku,check.sku);ledgerRows.get(check.partId).dimensions.evidence.sourceConflictRecheck={evidence:'../toho-conflicts-20261107/review.json',fetchedAt:check.receipt.fetchedAt,receiptSha256:check.receipt.sha256,resolution:check.resolution};}
const at = new Date().toISOString();
const summary = {
  at, activeParts: active.length, totalParts: after.tables.parts.length, totalAssets: after.tables.part_image_assets.length,
  activeNodes: active.filter(p => p.geometry_kind === 'node').length, activePaths: active.filter(p => p.geometry_kind === 'path').length,
  activeProvisional: provisional, activeNominal: nominal, machineImageCoverage: covered,
  distinctActiveAssets: new Set(active.map(p => p.image_asset_id)).size,
  baselineDistinctAssetsRead: receiptRows.length, baselineImageReads: 69476, byteIdenticalNewAssets: newAssets.length,
  changedParts: targets.size, correctedParts: wire.verified.length+clamp.verified.length, manufacturerDimensionRegistrations: manufacturer.verified.length+toho.verified.length+shindo.verified.length+legacyManufacturer.verified.length+dpDbc.verified.length, supplierDimensionRegistrations:chain.verified.length+component.verified.length+pipe.verified.length, supplierOpeningSizeReferences:opening.verified.length+variantHole.verified.length, supplierCategoryCorrections:toolCategory.verified.length, supplierConnectionGuidanceRegistrations:guidance.verified.length, supplierSizeLabelMeaningUnresolved:sizeLabel.verified.length, withdrawnChainStockWireInterpretations:interruptedWireMeaning.changedParts, schematicWireCorrections: wire.verified.length, unsupportedBodyCorrections: clamp.verified.length,
  sourcePhotoComparisonsThisRun: visual.size, remainingWithoutCurrentVisualComparison: active.length - visual.size,
  deskAndVisualReviewComplete: 0, fullReviewComplete: 0, physicalCalibrations: 0,
  historicalRestrictionReferences: originalReview.summary.heldSources, priorPhotoReviewBindings:priorPhotos.summary, knownSupplierDimensionConflicts:sourceConflicts.length,
  preservedRows: preserved, designsPreserved: true, sourceRegistryCatalogPolicyPreserved: true,
  targetPurchaseBusinessRowsPreserved: clampIds.size, targetPurchaseTechnicalIdsChanged: clampIds.size,
  firstAndFormalRerunVerified: true, domainWritesThisCheck: 0,
};
const listingParts=active.map(p=>({id:p.id,metadata:p.metadata,importSource:p.import_source,selectionReference:p.selection_reference,supplierListingReview:p.supplier_listing_review}));
assert.ok(listingParts.every(p=>p.supplierListingReview?.binding==='verified'),'ALL_LIVE_REVIEW_BINDINGS');
summary.supplierListingProjection={verifiedParts:listingParts.length,ownFlaggedParts:listingParts.filter(p=>p.supplierListingReview.status==='needs-review').length,warningPartsIncludingOffers:listingParts.filter(p=>!!supplierListingNotice(p)).length,purchaseBlockedPartsIncludingOffers:listingParts.filter(supplierPurchaseBlocked).length,domainWrites:0};
const listingById=new Map(listingParts.map(p=>[p.id,p]));
for(const row of ledgerRows.values()){const p=listingById.get(row.partId);row.currentSupplierListing=p.supplierListingReview;row.source.evidence.currentListingStatus=p.supplierListingReview.status;row.purchase.evidence.currentPurchaseEstimateBlocked=supplierPurchaseBlocked(p);}
await writeFile(dir + '/current-snapshot.json', JSON.stringify(after));
await writeFile(dir + '/review-ledger.json', JSON.stringify({ summary, rows: [...ledgerRows.values()] }));
await writeFile(dir + '/current-verification.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
