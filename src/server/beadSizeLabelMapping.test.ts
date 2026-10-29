import { it, expect } from 'vitest';
import { beadSizeLabel } from './beadSizeLabelMapping';
const recipe = { productIds: ['p'], sha256: 'h', sizesMm: [3, 4, 5, 6, 8, 10, 12] };
const input = { productId: 'p', variantId: 'v', sku: 's', sizeText: '６mm', variant: { id: 'v', sku: 's', sizeText: '6mm' }, galleryUrls: ['url'], captures: [{ url: 'url', sha256: 'h', productIds: ['p'], fetchedAt: 'today', finalUrl: 'url' }] };
it('matches a size label without assigning a physical diameter or scale', () => {
  expect(beadSizeLabel(input, recipe)).toMatchObject({ publishedSizeMm: 6 });
  expect(beadSizeLabel(input, recipe)).not.toHaveProperty('publishedDiameterMm');
});
it('rejects unsupported, approximate, accessory and foreign evidence', () => {
  for (const patch of [{ sizeText: '7mm' }, { sizeText: '約6mm' }, { sizeText: '丸玉6mm' }, { sku: 'other' }, { variantId: 'other' }, { galleryUrls: [] }, { captures: [] }, { productId: 'other' }]) expect(beadSizeLabel({ ...input, ...patch }, recipe)).toBeUndefined();
});
