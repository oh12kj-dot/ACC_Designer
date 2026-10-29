import type { PurchaseSpec } from '../../types/domain';

export interface Usage { count: number; lengthMm: number }
export function calculatePurchase(spec: PurchaseSpec, usage: Usage) {
  if (![usage.count, usage.lengthMm].every(n => Number.isFinite(n) && n >= 0) || !Number.isInteger(usage.count)) throw new Error('使用量が不正です');
  if (!Number.isInteger(spec.minimumUnits) || spec.minimumUnits < 1) throw new Error('最小購入単位が不正です');
  if (spec.unitPrice != null && (!Number.isFinite(spec.unitPrice) || spec.unitPrice < 0)) throw new Error('価格が不正です');
  let required: number;
  switch (spec.saleMode) {
    case 'piece': required = usage.count; break;
    case 'pack':
      if (!Number.isFinite(spec.packQuantity) || spec.packQuantity! <= 0) throw new Error('パック入数が必要です');
      required = Math.ceil(usage.count / spec.packQuantity!); break;
    case 'length':
      if (!Number.isFinite(spec.saleLengthMm) || spec.saleLengthMm! <= 0) throw new Error('販売長が必要です');
      required = Math.ceil(usage.lengthMm / spec.saleLengthMm!); break;
    default: throw new Error('販売方式が不正です');
  }
  const purchaseUnits = Math.max(spec.minimumUnits, required);
  return { purchaseUnits, purchasePrice: spec.unitPrice == null ? null : purchaseUnits * spec.unitPrice };
}

export function summarizePrices(items: { purchasePrice: number | null }[]) {
  return items.reduce((total, item) => ({
    knownPriceTotal: total.knownPriceTotal + (item.purchasePrice ?? 0),
    unknownPriceItemCount: total.unknownPriceItemCount + (item.purchasePrice == null ? 1 : 0),
  }), { knownPriceTotal: 0, unknownPriceItemCount: 0 });
}
