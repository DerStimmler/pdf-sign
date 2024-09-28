import type { Point } from '$lib/point';

export function getAngle(p1: Point, p2: Point) {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}
