import type { Shape, Point, Bounds } from '@/types'
import { omit } from 'lodash-es'

export function generateShapeId(): string {
  return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function serializeShape(shape: Shape): Omit<Shape, 'element'> {
  return omit(shape, 'element')
}

export function serializeShapes(shapes: Shape[]): Omit<Shape, 'element'>[] {
  return shapes.map(serializeShape)
}

export function calculateBounds(shape: Shape): Bounds {
  if (shape.type === 'image' && shape.startPoint && shape.imageWidth && shape.imageHeight) {
    return {
      x: shape.startPoint.x,
      y: shape.startPoint.y,
      width: shape.imageWidth,
      height: shape.imageHeight
    }
  }
  
  if (shape.startPoint && shape.endPoint) {
    const minX = Math.min(shape.startPoint.x, shape.endPoint.x)
    const minY = Math.min(shape.startPoint.y, shape.endPoint.y)
    const maxX = Math.max(shape.startPoint.x, shape.endPoint.x)
    const maxY = Math.max(shape.startPoint.y, shape.endPoint.y)
    return {
      x: minX - shape.lineWidth / 2,
      y: minY - shape.lineWidth / 2,
      width: maxX - minX + shape.lineWidth,
      height: maxY - minY + shape.lineWidth
    }
  }
  
  if (shape.points && shape.points.length > 0) {
    const xs = shape.points.map(p => p.x)
    const ys = shape.points.map(p => p.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)
    return {
      x: minX - shape.lineWidth / 2,
      y: minY - shape.lineWidth / 2,
      width: maxX - minX + shape.lineWidth,
      height: maxY - minY + shape.lineWidth
    }
  }

  if (shape.text && shape.startPoint && shape.fontSize) {
    const lines = shape.text.split('\n')
    const lineHeight = shape.fontSize * 1.2
    const maxLineLength = Math.max(...lines.map(line => line.length))
    
    return {
      x: shape.startPoint.x,
      y: shape.startPoint.y - shape.fontSize,
      width: maxLineLength * shape.fontSize * 0.6,
      height: lines.length * lineHeight
    }
  }

  return { x: 0, y: 0, width: 0, height: 0 }
}

export function moveShape(shape: Shape, deltaX: number, deltaY: number): void {
  if (shape.type === 'image' && shape.startPoint) {
    shape.startPoint.x += deltaX
    shape.startPoint.y += deltaY
  } else if (shape.startPoint && shape.endPoint) {
    shape.startPoint.x += deltaX
    shape.startPoint.y += deltaY
    shape.endPoint.x += deltaX
    shape.endPoint.y += deltaY
  } else if (shape.points) {
    shape.points.forEach(p => {
      p.x += deltaX
      p.y += deltaY
    })
  }
  
  shape.bounds = calculateBounds(shape)
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
