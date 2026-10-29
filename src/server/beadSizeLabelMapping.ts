import type { SharedImageCapture } from './sharedDiagramMapping';

export function beadSizeLabel(input: { productId: string; variantId: string; sku?: string; sizeText: string; variant: { id: string; sku?: string; sizeText: string }; galleryUrls: string[]; captures: SharedImageCapture[] }, recipe: { productIds: string[]; sha256: string; sizesMm: number[] }) {
  const parse = (s: string) => /^(\d+(?:\.\d+)?)mm$/.exec(s.normalize('NFKC').replace(/\s/g, ''));
  const label = parse(input.sizeText), raw = parse(input.variant.sizeText);
  if (!label || !raw || label[1] !== raw[1] || input.variantId !== input.variant.id || input.sku !== input.variant.sku || !recipe.productIds.includes(input.productId) || !recipe.sizesMm.includes(Number(label[1]))) return;
  const capture = input.captures.find(c => c.sha256 === recipe.sha256 && c.productIds.includes(input.productId) && input.galleryUrls.includes(c.url));
  return capture ? { capture, publishedSizeMm: Number(label[1]) } : undefined;
}
