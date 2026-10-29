import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Inventory only: this never manufactures calibration/geometry or changes Parts.
const root = fileURLToPath(new URL('../', import.meta.url));
const registryBytes = await readFile(path.join(root, '.local/parts/parts.json'));
const catalogBytes = await readFile(path.join(root, '.local/catalog/catalog.json'));
const registry = JSON.parse(registryBytes);
const catalog = JSON.parse(catalogBytes);
if (registry.version !== 1 || !Array.isArray(registry.parts) || catalog.version !== 1 || !Array.isArray(catalog.products)) {
  throw new Error('Unsupported or invalid local inventory schema.');
}
const products = new Map(catalog.products.map(product => [product.id, product]));
const identities = new Set();
const meanings = {};
const descriptionPattern = /(穴径|内径|外径|厚み|厚さ|線径|ピン径|幅|高さ|長さ)[^\n]{0,40}\d+(?:\.\d+)?\s*(mm|cm)/;
const entries = registry.parts.map(part => {
  if (typeof part.id !== 'string' || part.id !== `kiwa:${part.productId}:${part.variantId}` || identities.has(part.id) ||
      part.readiness !== 'needs_calibration' || !Array.isArray(part.measurements) || !Array.isArray(part.imageUrls) || !part.purchase) {
    throw new Error(`Invalid or unsupported draft: ${part.id}`);
  }
  identities.add(part.id);
  const product = products.get(part.productId);
  const variant = product?.variants.find(value => value.id === part.variantId);
  for (const measure of part.measurements) meanings[measure.meaning] = (meanings[measure.meaning] ?? 0) + 1;
  const exactDimensions = part.measurements.filter(measure => measure.meaning !== 'unassigned' && !measure.approximate);
  const purchase = part.purchase;
  const purchaseResolved = !purchase.approximate && (purchase.unit === 'piece' && purchase.quantity > 0 || purchase.unit === 'length' && purchase.lengthMm > 0);
  return {
    id: part.id, productId: part.productId, variantId: part.variantId,
    name: part.name, sku: part.sku, sourceUrl: part.sourceUrl,
    category: part.category, categoryBasis: part.categoryBasis,
    sourceFetchedAt: part.sourceFetchedAt,
    publishedSizeText: part.sizeText,
    publishedDimensions: part.measurements,
    exactLabeledDimensionCount: exactDimensions.length,
    publishedPurchase: purchase,
    imageReferences: part.imageUrls,
    descriptionHasDimensionClue: !!product && descriptionPattern.test(product.description),
    blockers: [
      'verified-image-calibration-points-and-distance-required',
      'variant-image-match-and-normalization-unverified',
      'geometry-kind-and-connection-hole-definitions-unverified',
      ...(!product || !variant ? ['source-variant-no-longer-present'] : []),
      ...(!part.imageUrls.length ? ['image-required'] : []),
      ...(!purchaseResolved ? ['purchase-semantics-require-confirmation'] : []),
    ],
    status: 'blocked',
    certificate: null,
    evidenceScope: 'official-catalog-snapshot; no certified measurement-to-image mapping',
    readyForEditor: false,
  };
});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const summary = {
  version: 1, checkedAt: new Date().toISOString(),
  registrySha256: hash(registryBytes), catalogSha256: hash(catalogBytes),
  products: catalog.products.length, registered: entries.length, uniqueIdentities: identities.size,
  withImageReferences: entries.filter(entry => entry.imageReferences.length).length,
  withSizeObservations: entries.filter(entry => entry.publishedDimensions.length).length,
  withExactLabeledDimensions: entries.filter(entry => entry.exactLabeledDimensionCount).length,
  dimensionObservationMeanings: meanings,
  productsWithDescriptionDimensionClues: catalog.products.filter(product => descriptionPattern.test(product.description)).length,
  purchaseRequiresConfirmation: entries.filter(entry => entry.blockers.includes('purchase-semantics-require-confirmation')).length,
  missingSourceVariant: entries.filter(entry => entry.blockers.includes('source-variant-no-longer-present')).length,
  statuses: {ready: 0, blocked: entries.length, failed: 0, pending: 0, processing: 0},
  readyForEditor: 0, calibratedOrPromotedByThisAudit: 0,
  scope: 'Read-only inventory audit; references and published dimensions do not certify image scale or mechanical geometry.',
};
const output = path.join(root, '.local/calibration');
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'audit.json'), JSON.stringify({ ...summary, entries }));
await writeFile(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
console.log(`Per-variant blockers: ${path.join(output, 'audit.json')}`);
