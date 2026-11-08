// Shared by the evidence producer and server reader. Never normalize business fields away.
export function listingBusiness(aggregate) {
  const omit = (row, keys) => Object.fromEntries(Object.entries(row ?? {}).filter(([k]) => !keys.includes(k)));
  return {
    part: omit(aggregate.part, ['id','user_id','created_at','updated_at','is_archived','supersedes_part_id','selection_reference','supplier_listing_review']),
    purchase: aggregate.purchase_spec ? omit(aggregate.purchase_spec, ['id','part_id']) : null,
    path: aggregate.path_spec ? omit(aggregate.path_spec, ['id','part_id']) : null,
    points: (aggregate.connection_points ?? []).map(r => omit(r, ['id','part_id'])),
    holes: (aggregate.through_holes ?? []).map(r => omit(r, ['id','part_id'])),
  };
}
export function listingStable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(listingStable).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + listingStable(value[k])).join(',') + '}';
}
export function listingHttpCode(status, variantFound = true) {
  return status === 404 ? 'CURRENT_PRODUCT_ENDPOINT_404' : status !== 200 ? 'CURRENT_FETCH_UNRESOLVED' : !variantFound ? 'CURRENT_VARIANT_NOT_LISTED' : undefined;
}
export function listingBodyReview(semantic, productId, semanticHash, groupsHash) {
  const rows = semantic?.rows?.filter(r => r.productIds.includes(productId)) ?? [];
  if (!rows.length) return {status:'unreviewed',effects:['unresolved']};
  const effects = [...new Set(rows.flatMap(r => r.review.impact.some(v => ['identity','dimensions','fit','material'].includes(v)) ? ['physical-form-fit'] : r.review.impact.includes('consumption') ? ['composition-consumption'] : ['descriptive']))];
  return {status:'reviewed',groups:rows.map(r=>r.group),effects,reasons:rows.map(r=>r.review.judgment),evidenceHashes:[semanticHash,groupsHash],reviewedAt:rows[0].reviewedAt,reviewer:rows[0].reviewer};
}
