import { ref, type Ref, watch } from 'vue'
import type { ToolType, Shape, Point, Bounds } from '@/types'

interface DrawingOptions {
  color: string
  lineWidth: number
  fontSize: number
  fontFamily: string
}

export function useDrawing(
  svgRef: Ref<SVGSVGElement | null>,
  options: Ref<DrawingOptions>
) {
  const currentTool = ref<ToolType>('select')
  const isDrawing = ref(false)
  const isDragging = ref(false)
  const dragOffsetX = ref(0)
  const dragOffsetY = ref(0)
  const startX = ref(0)
  const startY = ref(0)
  const lastX = ref(0)
  const lastY = ref(0)
  const shapes = ref<Shape[]>([])
  const selectedShapeId = ref<string | null>(null)
  const currentDrawingPoints = ref<Point[]>([])
  const tempElement = ref<SVGElement | null>(null)

  const generateId = () => `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const calculateBounds = (shape: Shape): Bounds => {
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

    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const createSVGElement = (shape: Shape): SVGElement | null => {
    const svg = svgRef.value
    if (!svg) return null

    let element: SVGElement | null = null

    if (shape.type === 'line' && shape.startPoint && shape.endPoint) {
      element = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      element.setAttribute('x1', shape.startPoint.x.toString())
      element.setAttribute('y1', shape.startPoint.y.toString())
      element.setAttribute('x2', shape.endPoint.x.toString())
      element.setAttribute('y2', shape.endPoint.y.toString())
      element.setAttribute('stroke', shape.color)
      element.setAttribute('stroke-width', shape.lineWidth.toString())
      element.setAttribute('stroke-linecap', 'round')
    } else if (shape.type === 'rectangle' && shape.startPoint && shape.endPoint) {
      element = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      const x = Math.min(shape.startPoint.x, shape.endPoint.x)
      const y = Math.min(shape.startPoint.y, shape.endPoint.y)
      const width = Math.abs(shape.endPoint.x - shape.startPoint.x)
      const height = Math.abs(shape.endPoint.y - shape.startPoint.y)
      element.setAttribute('x', x.toString())
      element.setAttribute('y', y.toString())
      element.setAttribute('width', width.toString())
      element.setAttribute('height', height.toString())
      element.setAttribute('stroke', shape.color)
      element.setAttribute('stroke-width', shape.lineWidth.toString())
      element.setAttribute('fill', 'none')
    } else if (shape.type === 'arrow' && shape.startPoint && shape.endPoint) {
      element = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      
      // Line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', shape.startPoint.x.toString())
      line.setAttribute('y1', shape.startPoint.y.toString())
      line.setAttribute('x2', shape.endPoint.x.toString())
      line.setAttribute('y2', shape.endPoint.y.toString())
      line.setAttribute('stroke', shape.color)
      line.setAttribute('stroke-width', shape.lineWidth.toString())
      line.setAttribute('stroke-linecap', 'round')
      element.appendChild(line)
      
      // Arrow head
      const angle = Math.atan2(shape.endPoint.y - shape.startPoint.y, shape.endPoint.x - shape.startPoint.x)
      const headLength = 20
      
      const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const d = `M ${shape.endPoint.x} ${shape.endPoint.y} L ${shape.endPoint.x - headLength * Math.cos(angle - Math.PI / 6)} ${shape.endPoint.y - headLength * Math.sin(angle - Math.PI / 6)} M ${shape.endPoint.x} ${shape.endPoint.y} L ${shape.endPoint.x - headLength * Math.cos(angle + Math.PI / 6)} ${shape.endPoint.y - headLength * Math.sin(angle + Math.PI / 6)}`
      arrowHead.setAttribute('d', d)
      arrowHead.setAttribute('stroke', shape.color)
      arrowHead.setAttribute('stroke-width', shape.lineWidth.toString())
      arrowHead.setAttribute('stroke-linecap', 'round')
      arrowHead.setAttribute('fill', 'none')
      element.appendChild(arrowHead)
    } else if (shape.type === 'draw' && shape.points && shape.points.length > 1) {
      element = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const pathData = `M ${shape.points.map(p => `${p.x},${p.y}`).join(' L ')}`
      element.setAttribute('d', pathData)
      element.setAttribute('stroke', shape.color)
      element.setAttribute('stroke-width', shape.lineWidth.toString())
      element.setAttribute('stroke-linecap', 'round')
      element.setAttribute('stroke-linejoin', 'round')
      element.setAttribute('fill', 'none')
    } else if (shape.type === 'text' && shape.text && shape.startPoint) {
      element = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      element.setAttribute('x', shape.startPoint.x.toString())
      element.setAttribute('y', shape.startPoint.y.toString())
      element.setAttribute('fill', shape.color)
      element.setAttribute('font-size', (shape.fontSize || 16).toString())
      element.setAttribute('font-family', shape.fontFamily || 'Arial')
      element.textContent = shape.text
    }

    if (element) {
      element.setAttribute('data-shape-id', shape.id)
      element.style.cursor = 'pointer'
      element.style.pointerEvents = 'all'
    }

    return element
  }

  const renderShape = (shape: Shape) => {
    const svg = svgRef.value
    if (!svg) return

    // Remove old element if exists
    if (shape.element && shape.element.parentNode) {
      shape.element.parentNode.removeChild(shape.element)
    }

    // Create and add new element
    const element = createSVGElement(shape)
    if (element) {
      shape.element = element
      
      // Add click handler for selection
      element.addEventListener('click', (e) => {
        e.stopPropagation()
        if (currentTool.value === 'select') {
          selectedShapeId.value = shape.id
          renderAllShapes()
        }
      })
      
      svg.appendChild(element)
    }
  }

  const renderSelectionBox = (bounds: Bounds) => {
    const svg = svgRef.value
    if (!svg) return

    // Remove existing selection box
    const existingBox = svg.querySelector('.selection-box')
    if (existingBox) {
      existingBox.remove()
    }

    // Create selection rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    const padding = 5
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
    
    svg.appendChild(rect)
  }

  const renderAllShapes = () => {
    const svg = svgRef.value
    if (!svg) return

    // Clear all shape elements (but keep background image)
    const elementsToRemove = Array.from(svg.children).filter(
      child => child.hasAttribute('data-shape-id') || child.classList.contains('selection-box')
    )
    elementsToRemove.forEach(el => el.remove())

    // Render all shapes
    shapes.value.forEach(shape => {
      renderShape(shape)
    })

    // Render selection box if shape is selected
    if (selectedShapeId.value) {
      const selectedShape = shapes.value.find(s => s.id === selectedShapeId.value)
      if (selectedShape) {
        renderSelectionBox(selectedShape.bounds)
      }
    }
  }

  const getSVGCoordinates = (event: MouseEvent) => {
    const svg = svgRef.value
    if (!svg) return { x: 0, y: 0 }
    
    const pt = svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())
    return { x: svgP.x, y: svgP.y }
  }

  const startDrawing = (x: number, y: number, event?: MouseEvent) => {
    if (currentTool.value === 'select') {
      // Check if clicking on a shape to start dragging
      const target = event?.target as SVGElement
      const shapeId = target?.getAttribute('data-shape-id')
      
      if (shapeId && selectedShapeId.value === shapeId) {
        // Start dragging the selected shape
        isDragging.value = true
        startX.value = x
        startY.value = y
        const shape = shapes.value.find(s => s.id === shapeId)
        if (shape) {
          dragOffsetX.value = x - shape.bounds.x
          dragOffsetY.value = y - shape.bounds.y
        }
        return
      } else if (target === svgRef.value || target.tagName === 'svg') {
        // Clicking on empty space to deselect
        selectedShapeId.value = null
        renderAllShapes()
      }
      return
    }

    // Deselect when starting a new drawing
    selectedShapeId.value = null

    isDrawing.value = true
    startX.value = x
    startY.value = y
    lastX.value = x
    lastY.value = y
    currentDrawingPoints.value = [{ x, y }]

    // Create temporary element for preview
    if (currentTool.value === 'draw') {
      const svg = svgRef.value
      if (svg) {
        tempElement.value = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        tempElement.value.setAttribute('stroke', options.value.color)
        tempElement.value.setAttribute('stroke-width', options.value.lineWidth.toString())
        tempElement.value.setAttribute('stroke-linecap', 'round')
        tempElement.value.setAttribute('stroke-linejoin', 'round')
        tempElement.value.setAttribute('fill', 'none')
        tempElement.value.style.pointerEvents = 'none'
        svg.appendChild(tempElement.value)
      }
    }
  }

  const draw = (x: number, y: number) => {
    if (isDragging.value && selectedShapeId.value) {
      // Move the selected shape
      const shape = shapes.value.find(s => s.id === selectedShapeId.value)
      if (shape) {
        const deltaX = x - startX.value
        const deltaY = y - startY.value
        
        // Update shape position based on type
        if (shape.startPoint && shape.endPoint) {
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
        
        // Update bounds
        shape.bounds = calculateBounds(shape)
        
        // Update start position for next delta calculation
        startX.value = x
        startY.value = y
        
        renderAllShapes()
      }
      return
    }
    
    if (!isDrawing.value) return

    lastX.value = x
    lastY.value = y

    if (currentTool.value === 'draw') {
      currentDrawingPoints.value.push({ x, y })
      if (tempElement.value) {
        const pathData = `M ${currentDrawingPoints.value.map(p => `${p.x},${p.y}`).join(' L ')}`
        tempElement.value.setAttribute('d', pathData)
      }
    } else if (['line', 'rectangle', 'arrow'].includes(currentTool.value)) {
      // Remove temporary preview element
      if (tempElement.value && tempElement.value.parentNode) {
        tempElement.value.parentNode.removeChild(tempElement.value)
      }

      // Create preview shape
      const previewShape: Shape = {
        id: 'preview',
        type: currentTool.value as any,
        color: options.value.color,
        lineWidth: options.value.lineWidth,
        startPoint: { x: startX.value, y: startY.value },
        endPoint: { x, y },
        bounds: { x: 0, y: 0, width: 0, height: 0 }
      }
      previewShape.bounds = calculateBounds(previewShape)

      tempElement.value = createSVGElement(previewShape)
      if (tempElement.value && svgRef.value) {
        tempElement.value.style.pointerEvents = 'none'
        svgRef.value.appendChild(tempElement.value)
      }
    }
  }

  const stopDrawing = (): Shape | null => {
    if (isDragging.value) {
      isDragging.value = false
      return null
    }
    
    if (!isDrawing.value) return null

    // Remove temporary element
    if (tempElement.value && tempElement.value.parentNode) {
      tempElement.value.parentNode.removeChild(tempElement.value)
    }
    tempElement.value = null

    // Create the final shape
    const newShape: Shape = {
      id: generateId(),
      type: currentTool.value as any,
      color: options.value.color,
      lineWidth: options.value.lineWidth,
      bounds: { x: 0, y: 0, width: 0, height: 0 }
    }

    if (currentTool.value === 'draw') {
      newShape.points = [...currentDrawingPoints.value]
    } else if (['line', 'rectangle', 'arrow'].includes(currentTool.value)) {
      newShape.startPoint = { x: startX.value, y: startY.value }
      newShape.endPoint = { x: lastX.value, y: lastY.value }
    }

    newShape.bounds = calculateBounds(newShape)

    // Only add shape if it has actual size
    if (newShape.bounds.width > 1 || newShape.bounds.height > 1 || (newShape.points && newShape.points.length > 1)) {
      shapes.value.push(newShape)
      selectedShapeId.value = newShape.id
      renderAllShapes()
      
      isDrawing.value = false
      currentDrawingPoints.value = []
      return newShape
    }

    isDrawing.value = false
    currentDrawingPoints.value = []
    return null
  }

  const updateShapeProperty = (shapeId: string, property: keyof Shape, value: any) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (shape) {
      (shape as any)[property] = value
      // Recalculate bounds if changing position/size properties
      if (property === 'startPoint' || property === 'endPoint' || property === 'points') {
        shape.bounds = calculateBounds(shape)
      }
      renderAllShapes()
    }
  }

  const getSelectedShape = (): Shape | null => {
    if (!selectedShapeId.value) return null
    return shapes.value.find(s => s.id === selectedShapeId.value) || null
  }

  const drawText = (x: number, y: number, text: string): Shape => {
    const newShape: Shape = {
      id: generateId(),
      type: 'text',
      color: options.value.color,
      lineWidth: options.value.lineWidth,
      startPoint: { x, y },
      text,
      fontSize: options.value.fontSize,
      fontFamily: options.value.fontFamily,
      bounds: { x, y, width: text.length * options.value.fontSize * 0.6, height: options.value.fontSize }
    }

    shapes.value.push(newShape)
    selectedShapeId.value = newShape.id
    renderAllShapes()
    return newShape
  }

  const clearShapes = () => {
    shapes.value = []
    selectedShapeId.value = null
    renderAllShapes()
  }

  const redrawCanvas = () => {
    renderAllShapes()
  }

  const deleteSelectedShape = () => {
    if (selectedShapeId.value) {
      const index = shapes.value.findIndex(s => s.id === selectedShapeId.value)
      if (index !== -1) {
        shapes.value.splice(index, 1)
        selectedShapeId.value = null
        renderAllShapes()
      }
    }
  }

  // Watch for changes in shapes to re-render
  watch(shapes, () => {
    renderAllShapes()
  }, { deep: true })

  return {
    currentTool,
    shapes,
    selectedShapeId,
    startDrawing,
    draw,
    stopDrawing,
    drawText,
    updateShapeProperty,
    getSelectedShape,
    redrawCanvas,
    clearShapes,
    getSVGCoordinates,
    deleteSelectedShape
  }
}
