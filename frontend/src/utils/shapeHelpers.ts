import { Shape } from '@/composables/shapes'
import type { Point, Bounds } from '@/types'

export function generateShapeId(): string {
  return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function serializeShapes(shapes: Shape[]) {
  return shapes.map(shape => shape.serialize())
}

export function isPointInBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  )
}

export function boundsIntersect(bounds1: Bounds, bounds2: Bounds): boolean {
  return !(
    bounds1.x + bounds1.width < bounds2.x ||
    bounds1.x > bounds2.x + bounds2.width ||
    bounds1.y + bounds1.height < bounds2.y ||
    bounds1.y > bounds2.y + bounds2.height
  )
}

export function boundsContainsBounds(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

export function calculateBoundsOverlapPercentage(bounds1: Bounds, bounds2: Bounds): number {
  const overlapX = Math.max(0,
    Math.min(bounds1.x + bounds1.width, bounds2.x + bounds2.width) -
    Math.max(bounds1.x, bounds2.x)
  )
  const overlapY = Math.max(0,
    Math.min(bounds1.y + bounds1.height, bounds2.y + bounds2.height) -
    Math.max(bounds1.y, bounds2.y)
  )
  
  const overlapArea = overlapX * overlapY
  const bounds1Area = bounds1.width * bounds1.height
  
  return bounds1Area > 0 ? overlapArea / bounds1Area : 0
}
