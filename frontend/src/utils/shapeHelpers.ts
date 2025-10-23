import { Shape } from '@/composables/shapes'
import type { Point } from '@/types'
import { uniqueId } from 'lodash-es'

export function generateShapeId(): string {
  return uniqueId('shape-')
}

export function serializeShapes(shapes: Shape[]) {
  return shapes.map(shape => shape.serialize())
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / mag;
}

function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > epsilon) {
    const left = rdpSimplify(points.slice(0, index + 1), epsilon);
    const right = rdpSimplify(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

export function simplifyPoints(points: Point[], epsilon: number = 2): Point[] {
  if (points.length <= 2) return points;
  return rdpSimplify(points, epsilon);
}

export function generateSmoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  
  // Use Catmull-Rom spline approximated with cubic Bézier
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

// Calculate distance from point to line segment
export function distanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0) {
    // Line segment is a point
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  }
  
  // Project point onto line
  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared));
  
  const projectionX = lineStart.x + t * dx;
  const projectionY = lineStart.y + t * dy;
  
  return Math.sqrt((point.x - projectionX) ** 2 + (point.y - projectionY) ** 2);
}

// Get projection point of point onto line segment
export function projectPointOntoLineSegment(point: Point, lineStart: Point, lineEnd: Point): Point {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0) {
    return { x: lineStart.x, y: lineStart.y };
  }
  
  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared));
  
  return {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy
  };
}

// Find the closest segment in a DrawShape and return the index to insert and the projection point
export function findClosestSegment(points: Point[], clickPoint: Point): { insertIndex: number, projectionPoint: Point } {
  let minDistance = Infinity;
  let insertIndex = 1; // Default to after first point
  let projectionPoint: Point = { x: 0, y: 0 };
  
  for (let i = 0; i < points.length - 1; i++) {
    const distance = distanceToLineSegment(clickPoint, points[i], points[i + 1]);
    if (distance < minDistance) {
      minDistance = distance;
      insertIndex = i + 1;
      projectionPoint = projectPointOntoLineSegment(clickPoint, points[i], points[i + 1]);
    }
  }
  
  return { insertIndex, projectionPoint };
}
