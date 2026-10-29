import { describe, expect, it } from 'vitest';
import type { ConnectionPoint, DesignNode, Part } from '../types/domain';
import { connectionPointWorld, normalizeDeg, rotate, screenToWorld, throughHoleWorld, worldToScreen } from './geometry/transforms';
import { pointSnapPose } from './attachment/pointPose';
import { calculatePurchase, summarizePrices } from './purchase/calculator';

const part: Part = { id: 'part', name: 'test', category: 'charm', geometryKind: 'node', widthMm: 10, heightMm: 20, mirrorPolicy: 'mirror_image', tags: [], isArchived: false, imageAssetId: 'asset', connectionPoints: [], throughHoles: [] };
const node: DesignNode = { id: 'node', partId: part.id, xMm: 30, yMm: 40, rotationDeg: 90, scaleX: 1, scaleY: 1, zIndex: 0, locked: false };
const point: ConnectionPoint = { id: 'point', name: 'top', type: 'loop', xNorm: 0.5, yNorm: 0, directionDeg: 270, maxConnections: 1 };

describe('mm geometry', () => {
  it('round trips viewport coordinates', () => {
    const viewport = { zoom: 2.5, pan: { x: 100, y: -50 } };
    expect(screenToWorld(worldToScreen({ x: -12, y: 17 }, viewport), viewport)).toEqual({ x: -12, y: 17 });
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid zoom %s', zoom => expect(() => screenToWorld({ x: 0, y: 0 }, { zoom, pan: { x: 0, y: 0 } })).toThrow());
  it('rotates clockwise in a downward Y coordinate system', () => {
    expect(rotate({ x: 10, y: 0 }, 90).y).toBeCloseTo(10);
    expect(normalizeDeg(-90)).toBe(270);
  });
  it('transforms a connection point from its center and dimensions', () => {
    const result = connectionPointWorld(node, part, point);
    expect(result.position.x).toBeCloseTo(40);
    expect(result.position.y).toBeCloseTo(40);
    expect(result.directionDeg).toBe(0);
  });
  it('transforms both hole endpoints and axis', () => {
    const hole = throughHoleWorld(node, part, { id: 'hole', name: 'hole', entryXNorm: 0, entryYNorm: 0.5, exitXNorm: 1, exitYNorm: 0.5, axisDeg: 0 });
    expect(hole.entry.y).toBeCloseTo(35);
    expect(hole.exit.y).toBeCloseTo(45);
    expect(hole.axisDeg).toBe(90);
  });
  it('does not invent dimensions for path parts', () => expect(() => connectionPointWorld(node, { ...part, geometryKind: 'path', widthMm: undefined }, point)).toThrow());
});

describe('point candidate pose', () => {
  it('aligns opposite directions and coincident points without mutating input', () => {
    const moved = pointSnapPose(node, part, point, { ...node, id: 'moving', rotationDeg: 15 }, part, point, 'align_opposite');
    expect(moved.rotationDeg).toBe(270);
    expect(connectionPointWorld(moved, part, point).position.x).toBeCloseTo(40);
    expect(connectionPointWorld(moved, part, point).position.y).toBeCloseTo(40);
    expect(node.rotationDeg).toBe(90);
  });
  it.each(['keep_rotation', 'manual'] as const)('preserves initial rotation for %s', mode => {
    expect(pointSnapPose(node, part, point, { ...node, rotationDeg: 15 }, part, point, mode).rotationDeg).toBe(15);
  });
});

describe('purchase quantities and missing prices', () => {
  it.each([
    ['piece', undefined, undefined, 3, 0, 3],
    ['pack', 20, undefined, 21, 0, 2],
    ['length', undefined, 1000, 0, 1001, 2],
  ] as const)('calculates %s sales', (saleMode, packQuantity, saleLengthMm, count, lengthMm, expected) => {
    expect(calculatePurchase({ saleMode, packQuantity, saleLengthMm, minimumUnits: 1, unitPrice: 220, currency: 'JPY' }, { count, lengthMm })).toEqual({ purchaseUnits: expected, purchasePrice: expected * 220 });
  });
  it('separates unknown price from explicitly free items', () => {
    const unknown = calculatePurchase({ saleMode: 'piece', minimumUnits: 1, currency: 'JPY' }, { count: 1, lengthMm: 0 });
    expect(unknown.purchasePrice).toBeNull();
    expect(summarizePrices([unknown, { purchasePrice: 0 }, { purchasePrice: 220 }])).toEqual({ knownPriceTotal: 220, unknownPriceItemCount: 1 });
  });
  it('rejects zero pack size', () => expect(() => calculatePurchase({ saleMode: 'pack', packQuantity: 0, minimumUnits: 1, currency: 'JPY' }, { count: 3, lengthMm: 0 })).toThrow());
});
