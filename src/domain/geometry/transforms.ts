import type { ConnectionPoint, DesignNode, Part, ThroughHole, Vec2 } from '../../types/domain';

export function normalizeDeg(degrees: number): number {
  if (!Number.isFinite(degrees)) throw new Error('角度は有限値である必要があります');
  return ((degrees % 360) + 360) % 360;
}

export function rotate(point: Vec2, degrees: number): Vec2 {
  const radians = normalizeDeg(degrees) * Math.PI / 180;
  return { x: point.x * Math.cos(radians) - point.y * Math.sin(radians), y: point.x * Math.sin(radians) + point.y * Math.cos(radians) };
}

export interface Viewport { zoom: number; pan: Vec2 }
function validateZoom(zoom: number) {
  if (!Number.isFinite(zoom) || zoom <= 0) throw new Error('zoomは正の有限値である必要があります');
}
export function worldToScreen(point: Vec2, viewport: Viewport): Vec2 {
  validateZoom(viewport.zoom);
  return { x: point.x * viewport.zoom + viewport.pan.x, y: point.y * viewport.zoom + viewport.pan.y };
}
export function screenToWorld(point: Vec2, viewport: Viewport): Vec2 {
  validateZoom(viewport.zoom);
  return { x: (point.x - viewport.pan.x) / viewport.zoom, y: (point.y - viewport.pan.y) / viewport.zoom };
}

export function normalizedPointToWorld(node: DesignNode, part: Part, xNorm: number, yNorm: number): Vec2 {
  if (part.geometryKind !== 'node' || !Number.isFinite(part.widthMm) || !Number.isFinite(part.heightMm) || part.widthMm! <= 0 || part.heightMm! <= 0) {
    throw new Error('Node Partの正の実寸が必要です');
  }
  if (![xNorm, yNorm].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) throw new Error('正規化座標が範囲外です');
  const offset = rotate({ x: (xNorm - 0.5) * part.widthMm! * node.scaleX, y: (yNorm - 0.5) * part.heightMm! * node.scaleY }, node.rotationDeg);
  return { x: node.xMm + offset.x, y: node.yMm + offset.y };
}

export function connectionPointWorld(node: DesignNode, part: Part, point: ConnectionPoint) {
  return { position: normalizedPointToWorld(node, part, point.xNorm, point.yNorm), directionDeg: normalizeDeg(node.rotationDeg + point.directionDeg) };
}

export function throughHoleWorld(node: DesignNode, part: Part, hole: ThroughHole) {
  return {
    entry: normalizedPointToWorld(node, part, hole.entryXNorm, hole.entryYNorm),
    exit: normalizedPointToWorld(node, part, hole.exitXNorm, hole.exitYNorm),
    axisDeg: normalizeDeg(node.rotationDeg + hole.axisDeg),
  };
}
