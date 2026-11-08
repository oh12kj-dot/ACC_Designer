import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { sha256 } from './minimum-sale-units.mjs';

const base = '.local/setup/all-parts-review-20261106';
const dir = base + '/current-supplier';
await mkdir(dir, { recursive: true });
const snapshot = JSON.parse(await readFile(base + '/current-snapshot.json'));
const rb = await readFile('.local/parts/parts.json');
const drafts = new Map(JSON.parse(rb).parts.map(d => [d.id, d]));
const targets = snapshot.tables.parts.filter(p => !p.is_archived).map(p => ({ part: p, draft: drafts.get(p.metadata.sourceDraftId) }));
const products = new Map(), receipts = [], duplicates = [];
const startedAt = new Date().toISOString();
async function capture(url, filename) {
  const path = dir + '/' + filename;
  let bytes, receipt;
  try {
    bytes = await readFile(path);
    receipt = JSON.parse(await readFile(path + '.receipt.json'));
    assert.equal(sha256(bytes), receipt.sha256);
    assert.equal(receipt.url, url);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json' } });
    bytes = Buffer.from(await response.arrayBuffer());
    receipt = { url, finalUrl: response.url, fetchedAt: new Date().toISOString(), status: response.status, sha256: sha256(bytes), bytes: bytes.length };
    await writeFile(path, bytes, { flag: 'wx' });
    await writeFile(path + '.receipt.json', JSON.stringify(receipt), { flag: 'wx' });
  }
  receipts.push({ file: filename, ...receipt });
  return { receipt, body: receipt.status === 200 ? JSON.parse(bytes) : null };
}
let ended = false;
for (let start = 1; start <= 160 && !ended; start += 4) {
  const pages = await Promise.allSettled(Array.from({ length: 4 }, (_, i) => {
    const page = start + i;
    return capture('https://kiwaseisakujo.jp/products.json?limit=250&page=' + page, 'page-' + page + '.json').then(r => ({ page, ...r }));
  }));
  for (const result of pages) {
    if (result.status !== 'fulfilled') throw result.reason;
    const { page, receipt, body } = result.value;
    assert.equal(receipt.status, 200, 'CATALOG_HTTP_' + page);
    assert.ok(Array.isArray(body.products));
    if (body.products.length < 250) ended = true;
    for (const product of body.products) {
      const key = String(product.id);
      if (products.has(key)) duplicates.push({ productId: key, page });
      else products.set(key, { product, capture: { file: 'page-' + page + '.json', ...receipt } });
    }
  }
  console.log(JSON.stringify({ pagesThrough: start + 3, products: products.size, ended }));
}
assert.ok(ended, 'CATALOG_PAGE_BOUND_EXCEEDED');
// Offset pagination may move while the supplier edits the catalog. Resolve each missing
// retained product directly, rather than interpreting a missing catalog row as deletion.
const missing = [...new Map(targets.filter(r => !products.has(r.draft.productId)).map(r => [r.draft.productId, r.draft])).values()];
const missingReceipts = [];
for (const d of missing) {
    const u = new URL(d.sourceUrl); u.search = ''; u.pathname += '.json';
    let c = await capture(u.href, 'product-' + d.productId + '.json');
    if (c.receipt.status === 429 && process.env.ACC_RETRY_SUPPLIER_RATE_LIMITS === '1') {
      await new Promise(resolve => setTimeout(resolve, 1250));
      c = await capture(u.href, 'product-' + d.productId + '.retry-1.json');
    }
    missingReceipts.push({ productId: d.productId, ...c.receipt });
    if (c.body?.product) {
      assert.equal(String(c.body.product.id), d.productId);
      products.set(d.productId, { product: c.body.product, capture: { file: c.receipt.status === 200 && receipts.at(-1).file, ...c.receipt } });
    }
}
const oldProducts = new Map();
for (const f of (await readdir('.local/catalog/evidence')).filter(f => /^page-\d+\.json$/u.test(f))) {
  const b = await readFile('.local/catalog/evidence/' + f);
  for (const p of JSON.parse(b).products) oldProducts.set(String(p.id), p);
}
const pathKey = text => { try { const u = new URL(text); return u.hostname + u.pathname; } catch { return text; } };
const rows = targets.map(({ part: p, draft: d }) => {
  const current = products.get(d.productId), issues = [], changes = [], checks = [];
  const v = current?.product.variants.find(v => String(v.id) === d.variantId);
  const missingReceipt = missingReceipts.find(r => r.productId === d.productId);
  if (!current) issues.push(missingReceipt?.status === 404 ? 'CURRENT_PRODUCT_ENDPOINT_NOT_FOUND' : missingReceipt?.status === 429 ? 'CURRENT_PRODUCT_READ_RATE_LIMITED' : 'CURRENT_PRODUCT_READ_UNVERIFIED');
  else if (!v) issues.push('CURRENT_VARIANT_UNAVAILABLE');
  else {
    if (v.sku !== d.sku) changes.push('SKU_CHANGED'); else checks.push('VARIANT_ID_AND_SKU_MATCH');
    if (Number(v.price) !== d.price) changes.push('PRICE_CHANGED'); else checks.push('PUBLISHED_PRICE_MATCH');
    if ((v.option1 ?? '') !== (d.sizeText ?? '')) changes.push('SIZE_LABEL_CHANGED'); else checks.push('SIZE_LABEL_MATCH');
    if ((v.option2 ?? '') !== (d.purchase?.sourceText ?? '')) changes.push('PURCHASE_LABEL_CHANGED'); else checks.push('PURCHASE_LABEL_MATCH');
    const photo = p.metadata.provisionalRegistration?.photoReference?.url ?? p.metadata.nominalPlacement?.photoUrl ?? p.metadata.calibrationEvidence?.diagramUrl;
    if (current.product.images.some(i => pathKey(i.src) === pathKey(photo))) checks.push('REFERENCE_IMAGE_PATH_STILL_LISTED');
    else changes.push('REFERENCE_IMAGE_NO_LONGER_IN_PRODUCT_GALLERY');
    const old = oldProducts.get(d.productId);
    if (!old) changes.push('OLD_PRODUCT_BODY_CAPTURE_NOT_BOUND');
    else if ((old.body_html ?? '') !== (current.product.body_html ?? '')) changes.push('PRODUCT_BODY_HTML_CHANGED');
    else checks.push('PRODUCT_BODY_HTML_UNCHANGED');
  }
  return { partId: p.id, sourceDraftId: d.id, productId: d.productId, sourceObjectSha256: sha256(JSON.stringify(d)),
    sourceUrl: d.sourceUrl, capture: current?.capture ?? missingReceipt ?? null, currentVariant: v ? { id: String(v.id), sku: v.sku, option1: v.option1, option2: v.option2, price: v.price, available: v.available ?? null } : null,
    checks, changes, issues, currentImageBytesVerified: false, domainUpdated: false };
});
const countReasons = key => Object.fromEntries([...new Set(rows.flatMap(r => r[key]))].map(reason => [reason, rows.filter(r => r[key].includes(reason)).length]));
const summary = { startedAt, finishedAt: new Date().toISOString(), registrySha256: sha256(rb), activeParts: rows.length, currentProductsCaptured: products.size,
  directMissingProductChecks: missing.length, productEndpointNotFound: missingReceipts.filter(r => r.status === 404).length,
  unresolvedProductReads: missingReceipts.filter(r => ![200,404].includes(r.status)).length,
  paginationDuplicates: duplicates.length, captureCount: receipts.length,
  currentIdentityAndPublishedTermsUnchanged: rows.filter(r => r.issues.length === 0 && r.changes.length === 0).length,
  partsWithChangedPublishedEvidence: rows.filter(r => r.changes.length > 0).length,
  partsWithProductOrVariantReadIssues: rows.filter(r => r.issues.length > 0).length,
  changes: countReasons('changes'), issues: countReasons('issues'), domainWrites: 0,
  note: 'Per-page capture window, not a simultaneous supplier snapshot. Gallery URL presence does not verify current image bytes.' };
await writeFile(dir + '/review.json', JSON.stringify({ summary, receipts, missingReceipts, duplicates, rows }));
console.log(JSON.stringify(summary));
