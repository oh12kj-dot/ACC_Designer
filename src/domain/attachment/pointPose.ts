import type { ConnectionPoint, DesignNode, Part, PointOrientationMode } from '../../types/domain';
import { connectionPointWorld, normalizeDeg } from '../geometry/transforms';

/** Calculates a candidate pose only. Graph constraints and compatibility are checked before committing. */
export function pointSnapPose(host: DesignNode, hostPart: Part, hostPoint: ConnectionPoint, moving: DesignNode, movingPart: Part, movingPoint: ConnectionPoint, mode: PointOrientationMode, relativeRotationDeg = 0): DesignNode {
  if (!Number.isFinite(relativeRotationDeg)) throw new Error('回転差は有限値である必要があります');
  const target = connectionPointWorld(host, hostPart, hostPoint);
  const posed = { ...moving, rotationDeg: mode === 'align_opposite' ? normalizeDeg(target.directionDeg + 180 - movingPoint.directionDeg + relativeRotationDeg) : moving.rotationDeg };
  const source = connectionPointWorld(posed, movingPart, movingPoint);
  return { ...posed, xMm: posed.xMm + target.position.x - source.position.x, yMm: posed.yMm + target.position.y - source.position.y };
}
