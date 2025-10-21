import { ref, watch, type Ref } from 'vue'
import type { Shape, Point } from '@/types'
import { useDrawingStore } from '@/stores/drawing'
import { SVGRenderer } from '@/utils/svgRenderer'
import { generateShapeId, calculateBounds, moveShape } from '@/utils/shapeHelpers'
import { getSVGCoordinates, createShapeElement, SVG_NS } from '@/utils/svgHelpers'

export function useCanvasDrawing(svgRef: Ref<SVGSVGElement | null>) {
  const store = useDrawingStore()
  const renderer = new SVGRenderer(svgRef)
  
  const isDrawing = ref(false)
  const isDraggingShapes = ref(false)
  const startX = ref(0)
  const startY = ref(0)
  const lastX = ref(0)
  const lastY = ref(0)
  const currentDrawingPoints = ref<Point[]>([])
  const tempElement = ref<SVGElement | null>(null)

  function renderAllShapes() {
    renderer.clearShapes()
    
    // Render all shapes
    const isSelectTool = store.currentTool === 'select'
    store.shapes.forEach(shape => {
      renderer.renderShape(shape, isSelectTool, (shapeId) => {
        if (isSelectTool) {
          store.selectShape(shapeId)
        }
      })
    })

    // Render selection boxes
    if (store.selectedShapeIds.length > 0) {
      const bounds = store.selectedShapes.map(s => s.bounds)
      renderer.renderMultipleSelectionBoxes(bounds)
    }

    // Render drag selection box if active
    if (store.isDragSelecting && store.dragSelectBounds) {
      renderer.renderDragSelectionBox(store.dragSelectBounds)
      
      // Render preview boxes around shapes that would be selected
      if (store.dragSelectPreviewShapeIds.length > 0) {
        const previewShapes = store.shapes.filter(s => store.dragSelectPreviewShapeIds.includes(s.id))
        const previewBounds = previewShapes.map(s => s.bounds)
        renderer.renderPreviewBoxes(previewBounds)
      }
    }
  }

  function startDrawing(x: number, y: number, event?: MouseEvent) {
    if (store.currentTool === 'select') {
      const target = event?.target as SVGElement
      const shapeId = target?.getAttribute('data-shape-id')
      
      if (shapeId && store.selectedShapeIds.includes(shapeId)) {
        // Start dragging selected shapes
        isDraggingShapes.value = true
        startX.value = x
        startY.value = y
        return
      } else if (target === svgRef.value || target.tagName === 'svg') {
        // Start drag selection on empty space
        store.startDragSelection(x, y)
        return
      }
      return
    }

    // Clear selection when starting new drawing
    store.clearSelection()

    isDrawing.value = true
    startX.value = x
    startY.value = y
    lastX.value = x
    lastY.value = y
    currentDrawingPoints.value = [{ x, y }]

    // Create temporary preview element
    if (store.currentTool === 'draw') {
      const svg = svgRef.value
      if (svg) {
        tempElement.value = document.createElementNS(SVG_NS, 'path')
        tempElement.value.setAttribute('stroke', store.currentColor)
        tempElement.value.setAttribute('stroke-width', store.lineWidth.toString())
        tempElement.value.setAttribute('stroke-linecap', 'round')
        tempElement.value.setAttribute('stroke-linejoin', 'round')
        tempElement.value.setAttribute('fill', 'none')
        tempElement.value.style.pointerEvents = 'none'
        svg.appendChild(tempElement.value)
      }
    }
  }

  function draw(x: number, y: number) {
    // Handle drag selection
    if (store.isDragSelecting) {
      store.updateDragSelection(x, y)
      renderAllShapes()
      return
    }

    // Handle shape dragging
    if (isDraggingShapes.value && store.selectedShapeIds.length > 0) {
      const deltaX = x - startX.value
      const deltaY = y - startY.value
      
      store.selectedShapes.forEach(shape => {
        moveShape(shape, deltaX, deltaY)
      })
      
      startX.value = x
      startY.value = y
      renderAllShapes()
      return
    }
    
    if (!isDrawing.value) return

    lastX.value = x
    lastY.value = y

    if (store.currentTool === 'draw') {
      currentDrawingPoints.value.push({ x, y })
      if (tempElement.value) {
        const pathData = `M ${currentDrawingPoints.value.map(p => `${p.x},${p.y}`).join(' L ')}`
        tempElement.value.setAttribute('d', pathData)
      }
    } else if (['line', 'rectangle', 'arrow'].includes(store.currentTool)) {
      // Remove old preview
      if (tempElement.value) {
        renderer.removeTemporaryElement(tempElement.value)
      }

      // Create preview shape
      const previewShape: Shape = {
        id: 'preview',
        type: store.currentTool as any,
        color: store.currentColor,
        lineWidth: store.lineWidth,
        startPoint: { x: startX.value, y: startY.value },
        endPoint: { x, y },
        bounds: { x: 0, y: 0, width: 0, height: 0 }
      }
      previewShape.bounds = calculateBounds(previewShape)

      tempElement.value = createShapeElement(previewShape, false)
      if (tempElement.value) {
        tempElement.value.style.pointerEvents = 'none'
        renderer.addTemporaryElement(tempElement.value)
      }
    }
  }

  function stopDrawing(): Shape | null {
    // Finish drag selection
    if (store.isDragSelecting) {
      store.finishDragSelection()
      renderAllShapes()
      return null
    }

    // Finish shape dragging
    if (isDraggingShapes.value) {
      isDraggingShapes.value = false
      return null
    }
    
    if (!isDrawing.value) return null

    // Remove temporary element
    if (tempElement.value) {
      renderer.removeTemporaryElement(tempElement.value)
      tempElement.value = null
    }

    // Create the final shape
    const newShape: Shape = {
      id: generateShapeId(),
      type: store.currentTool as any,
      color: store.currentColor,
      lineWidth: store.lineWidth,
      bounds: { x: 0, y: 0, width: 0, height: 0 }
    }

    if (store.currentTool === 'draw') {
      newShape.points = [...currentDrawingPoints.value]
    } else if (['line', 'rectangle', 'arrow'].includes(store.currentTool)) {
      newShape.startPoint = { x: startX.value, y: startY.value }
      newShape.endPoint = { x: lastX.value, y: lastY.value }
    }

    newShape.bounds = calculateBounds(newShape)

    // Only add shape if it has actual size
    if (newShape.bounds.width > 1 || newShape.bounds.height > 1 || (newShape.points && newShape.points.length > 1)) {
      store.addShape(newShape)
      store.selectShape(newShape.id)
      renderAllShapes()
      
      isDrawing.value = false
      currentDrawingPoints.value = []
      return newShape
    }

    isDrawing.value = false
    currentDrawingPoints.value = []
    return null
  }

  function drawText(x: number, y: number, text: string): Shape {
    const newShape: Shape = {
      id: generateShapeId(),
      type: 'text',
      color: store.currentColor,
      lineWidth: store.lineWidth,
      startPoint: { x, y },
      text,
      fontSize: store.fontSize,
      fontFamily: store.fontFamily,
      bounds: { x, y, width: text.length * store.fontSize * 0.6, height: store.fontSize }
    }

    store.addShape(newShape)
    store.selectShape(newShape.id)
    renderAllShapes()
    return newShape
  }

  function updateShapeProperty(shapeId: string, property: keyof Shape, value: any) {
    const shape = store.shapes.find(s => s.id === shapeId)
    if (shape) {
      (shape as any)[property] = value
      if (property === 'startPoint' || property === 'endPoint' || property === 'points') {
        shape.bounds = calculateBounds(shape)
      }
      renderAllShapes()
    }
  }

  function clearShapes() {
    store.clearShapes()
    renderAllShapes()
  }

  function deleteSelectedShapes() {
    store.deleteSelectedShapes()
    renderAllShapes()
  }

  // Watch for store changes
  watch(() => store.shapes, renderAllShapes, { deep: true })
  watch(() => store.selectedShapeIds, renderAllShapes)
  watch(() => store.currentTool, renderAllShapes)

  return {
    startDrawing,
    draw,
    stopDrawing,
    drawText,
    updateShapeProperty,
    clearShapes,
    deleteSelectedShapes,
    renderAllShapes,
    getSVGCoordinates: (event: MouseEvent) => {
      const svg = svgRef.value
      return svg ? getSVGCoordinates(event, svg) : { x: 0, y: 0 }
    }
  }
}
