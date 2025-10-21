import type { Shape, Point, Bounds } from '@/types'

export const SVG_NS = 'http://www.w3.org/2000/svg'

export function createSelectionBox(bounds: Bounds, padding = 5): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect') as SVGRectElement
  rect.setAttribute('class', 'selection-box')
  rect.setAttribute('x', (bounds.x - padding).toString())
  rect.setAttribute('y', (bounds.y - padding).toString())
  rect.setAttribute('width', (bounds.width + padding * 2).toString())
  rect.setAttribute('height', (bounds.height + padding * 2).toString())
  rect.setAttribute('stroke', '#3B82F6')
  rect.setAttribute('stroke-width', '2')
  rect.setAttribute('stroke-dasharray', '5,5')
  rect.setAttribute('fill', 'none')
  rect.style.pointerEvents = 'none'
  return rect
}

export function createDragSelectionBox(bounds: Bounds): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect') as SVGRectElement
  rect.setAttribute('class', 'drag-selection-box')
  rect.setAttribute('x', bounds.x.toString())
  rect.setAttribute('y', bounds.y.toString())
  rect.setAttribute('width', bounds.width.toString())
  rect.setAttribute('height', bounds.height.toString())
  rect.setAttribute('stroke', '#3B82F6')
  rect.setAttribute('stroke-width', '1')
  rect.setAttribute('stroke-dasharray', '3,3')
  rect.setAttribute('fill', 'rgba(59, 130, 246, 0.1)')
  rect.style.pointerEvents = 'none'
  return rect
}

export function createLineElement(shape: Shape): SVGLineElement | null {
  if (!shape.startPoint || !shape.endPoint) return null
  
  const line = document.createElementNS(SVG_NS, 'line') as SVGLineElement
  line.setAttribute('x1', shape.startPoint.x.toString())
  line.setAttribute('y1', shape.startPoint.y.toString())
  line.setAttribute('x2', shape.endPoint.x.toString())
  line.setAttribute('y2', shape.endPoint.y.toString())
  line.setAttribute('stroke', shape.color)
  line.setAttribute('stroke-width', shape.lineWidth.toString())
  line.setAttribute('stroke-linecap', 'round')
  return line
}

export function createRectElement(shape: Shape): SVGRectElement | null {
  if (!shape.startPoint || !shape.endPoint) return null
  
  const rect = document.createElementNS(SVG_NS, 'rect') as SVGRectElement
  const x = Math.min(shape.startPoint.x, shape.endPoint.x)
  const y = Math.min(shape.startPoint.y, shape.endPoint.y)
  const width = Math.abs(shape.endPoint.x - shape.startPoint.x)
  const height = Math.abs(shape.endPoint.y - shape.startPoint.y)
  
  rect.setAttribute('x', x.toString())
  rect.setAttribute('y', y.toString())
  rect.setAttribute('width', width.toString())
  rect.setAttribute('height', height.toString())
  rect.setAttribute('stroke', shape.color)
  rect.setAttribute('stroke-width', shape.lineWidth.toString())
  rect.setAttribute('fill', 'none')
  return rect
}

export function createArrowElement(shape: Shape): SVGGElement | null {
  if (!shape.startPoint || !shape.endPoint) return null
  
  const group = document.createElementNS(SVG_NS, 'g') as SVGGElement
  
  // Line
  const line = createLineElement(shape)
  if (line) {
    group.appendChild(line)
  }
  
  // Arrow head
  const angle = Math.atan2(
    shape.endPoint.y - shape.startPoint.y,
    shape.endPoint.x - shape.startPoint.x
  )
  const headLength = 20
  
  const arrowHead = document.createElementNS(SVG_NS, 'path')
  const d = `M ${shape.endPoint.x} ${shape.endPoint.y} L ${
    shape.endPoint.x - headLength * Math.cos(angle - Math.PI / 6)
  } ${shape.endPoint.y - headLength * Math.sin(angle - Math.PI / 6)} M ${
    shape.endPoint.x
  } ${shape.endPoint.y} L ${
    shape.endPoint.x - headLength * Math.cos(angle + Math.PI / 6)
  } ${shape.endPoint.y - headLength * Math.sin(angle + Math.PI / 6)}`
  
  arrowHead.setAttribute('d', d)
  arrowHead.setAttribute('stroke', shape.color)
  arrowHead.setAttribute('stroke-width', shape.lineWidth.toString())
  arrowHead.setAttribute('stroke-linecap', 'round')
  arrowHead.setAttribute('fill', 'none')
  group.appendChild(arrowHead)
  
  return group
}

export function createPathElement(shape: Shape): SVGPathElement | null {
  if (!shape.points || shape.points.length < 2) return null
  
  const path = document.createElementNS(SVG_NS, 'path') as SVGPathElement
  const pathData = `M ${shape.points.map(p => `${p.x},${p.y}`).join(' L ')}`
  
  path.setAttribute('d', pathData)
  path.setAttribute('stroke', shape.color)
  path.setAttribute('stroke-width', shape.lineWidth.toString())
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  path.setAttribute('fill', 'none')
  return path
}

export function createTextElement(shape: Shape): SVGTextElement | null {
  if (!shape.text || !shape.startPoint) return null
  
  const text = document.createElementNS(SVG_NS, 'text') as SVGTextElement
  text.setAttribute('x', shape.startPoint.x.toString())
  text.setAttribute('y', shape.startPoint.y.toString())
  text.setAttribute('fill', shape.color)
  text.setAttribute('font-size', (shape.fontSize || 16).toString())
  text.setAttribute('font-family', shape.fontFamily || 'Arial')
  text.textContent = shape.text
  return text
}

export function createImageElement(shape: Shape): SVGImageElement | null {
  if (!shape.imageData || !shape.startPoint) return null
  
  const image = document.createElementNS(SVG_NS, 'image') as SVGImageElement
  image.setAttribute('href', shape.imageData)
  image.setAttribute('x', shape.startPoint.x.toString())
  image.setAttribute('y', shape.startPoint.y.toString())
  image.setAttribute('width', (shape.imageWidth || 100).toString())
  image.setAttribute('height', (shape.imageHeight || 100).toString())
  return image
}

export function createShapeElement(shape: Shape, isSelectable: boolean): SVGElement | null {
  let element: SVGElement | null = null
  
  switch (shape.type) {
    case 'line':
      element = createLineElement(shape)
      break
    case 'rectangle':
      element = createRectElement(shape)
      break
    case 'arrow':
      element = createArrowElement(shape)
      break
    case 'draw':
      element = createPathElement(shape)
      break
    case 'text':
      element = createTextElement(shape)
      break
    case 'image':
      element = createImageElement(shape)
      break
  }
  
  if (element) {
    element.setAttribute('data-shape-id', shape.id)
    element.style.cursor = isSelectable ? 'pointer' : 'default'
    element.style.pointerEvents = 'all'
  }
  
  return element
}

export function getSVGCoordinates(event: MouseEvent, svg: SVGSVGElement): Point {
  const pt = svg.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())
  return { x: svgP.x, y: svgP.y }
}
