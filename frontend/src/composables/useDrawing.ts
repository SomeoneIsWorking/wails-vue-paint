import { ref, type Ref } from 'vue'
import type { ToolType, Shape, Point, Bounds } from '@/types'

interface DrawingOptions {
  color: string
  lineWidth: number
  fontSize: number
  fontFamily: string
}

export function useDrawing(
  ctx: Ref<CanvasRenderingContext2D | null>,
  options: Ref<DrawingOptions>
) {
  const currentTool = ref<ToolType>('select')
  const isDrawing = ref(false)
  const startX = ref(0)
  const startY = ref(0)
  const snapshot = ref<ImageData | null>(null)
  const shapes = ref<Shape[]>([])
  const selectedShapeId = ref<string | null>(null)
  const currentDrawingPoints = ref<Point[]>([])

  const generateId = () => `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const calculateBounds = (shape: Shape): Bounds => {
    if (shape.startPoint && shape.endPoint) {
      const minX = Math.min(shape.startPoint.x, shape.endPoint.x)
      const minY = Math.min(shape.startPoint.y, shape.endPoint.y)
      const maxX = Math.max(shape.startPoint.x, shape.endPoint.x)
      const maxY = Math.max(shape.startPoint.y, shape.endPoint.y)
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
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
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }
    }

    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const isPointInBounds = (point: Point, bounds: Bounds, padding: number = 5): boolean => {
    return (
      point.x >= bounds.x - padding &&
      point.x <= bounds.x + bounds.width + padding &&
      point.y >= bounds.y - padding &&
      point.y <= bounds.y + bounds.height + padding
    )
  }

  const findShapeAtPoint = (x: number, y: number): Shape | null => {
    // Search in reverse order (top to bottom)
    for (let i = shapes.value.length - 1; i >= 0; i--) {
      const shape = shapes.value[i]
      if (isPointInBounds({ x, y }, shape.bounds, 10)) {
        return shape
      }
    }
    return null
  }

  const redrawCanvas = () => {
    const context = ctx.value
    if (!context) return

    const canvas = context.canvas
    context.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all shapes
    shapes.value.forEach(shape => {
      context.strokeStyle = shape.color
      context.fillStyle = shape.color
      context.lineWidth = shape.lineWidth
      context.lineCap = 'round'
      context.lineJoin = 'round'

      if (shape.type === 'line' && shape.startPoint && shape.endPoint) {
        drawLine(shape.startPoint.x, shape.startPoint.y, shape.endPoint.x, shape.endPoint.y)
      } else if (shape.type === 'rectangle' && shape.startPoint && shape.endPoint) {
        const width = shape.endPoint.x - shape.startPoint.x
        const height = shape.endPoint.y - shape.startPoint.y
        drawRectangle(shape.startPoint.x, shape.startPoint.y, width, height, false)
      } else if (shape.type === 'arrow' && shape.startPoint && shape.endPoint) {
        drawArrow(shape.startPoint.x, shape.startPoint.y, shape.endPoint.x, shape.endPoint.y)
      } else if (shape.type === 'draw' && shape.points && shape.points.length > 0) {
        context.beginPath()
        context.moveTo(shape.points[0].x, shape.points[0].y)
        for (let i = 1; i < shape.points.length; i++) {
          context.lineTo(shape.points[i].x, shape.points[i].y)
        }
        context.stroke()
      } else if (shape.type === 'text' && shape.text && shape.startPoint) {
        context.font = `${shape.fontSize || 16}px ${shape.fontFamily || 'Arial'}`
        context.fillText(shape.text, shape.startPoint.x, shape.startPoint.y)
      }
    })

    // Draw selection indicator
    if (selectedShapeId.value) {
      const selectedShape = shapes.value.find(s => s.id === selectedShapeId.value)
      if (selectedShape) {
        drawSelectionBox(selectedShape.bounds)
      }
    }
  }

  const drawSelectionBox = (bounds: Bounds) => {
    const context = ctx.value
    if (!context) return

    const padding = 5
    context.strokeStyle = '#3B82F6'
    context.lineWidth = 2
    context.setLineDash([5, 5])
    context.strokeRect(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    )
    context.setLineDash([])
  }

  const startDrawing = (x: number, y: number) => {
    const context = ctx.value
    if (!context) return

    if (currentTool.value === 'select') {
      // Handle selection
      const shape = findShapeAtPoint(x, y)
      if (shape) {
        selectedShapeId.value = shape.id
        redrawCanvas()
      } else {
        selectedShapeId.value = null
        redrawCanvas()
      }
      return
    }

    // Deselect when starting a new drawing
    selectedShapeId.value = null

    isDrawing.value = true
    startX.value = x
    startY.value = y

    // Save canvas state for tools that need to redraw
    if (['line', 'rectangle', 'arrow'].includes(currentTool.value)) {
      const canvas = context.canvas
      snapshot.value = context.getImageData(0, 0, canvas.width, canvas.height)
    }

    // Handle specific tool start
    if (currentTool.value === 'draw') {
      currentDrawingPoints.value = [{ x, y }]
      context.beginPath()
      context.moveTo(x, y)
      context.strokeStyle = options.value.color
      context.lineWidth = options.value.lineWidth
      context.lineCap = 'round'
      context.lineJoin = 'round'
    }
  }

  const stopDrawing = () => {
    const context = ctx.value
    if (!context) return

    if (isDrawing.value && currentTool.value !== 'select') {
      // Create shape object
      const newShape: Shape = {
        id: generateId(),
        type: currentTool.value as any,
        color: options.value.color,
        lineWidth: options.value.lineWidth,
        bounds: { x: 0, y: 0, width: 0, height: 0 }
      }

      if (currentTool.value === 'draw') {
        newShape.points = [...currentDrawingPoints.value]
        context.closePath()
      } else if (['line', 'rectangle', 'arrow'].includes(currentTool.value)) {
        newShape.startPoint = { x: startX.value, y: startY.value }
        newShape.endPoint = { x: lastDrawPos.value.x, y: lastDrawPos.value.y }
      }

      // Calculate bounds
      newShape.bounds = calculateBounds(newShape)
      
      // Only add shape if it has actual size
      if (newShape.bounds.width > 0 || newShape.bounds.height > 0 || (newShape.points && newShape.points.length > 1)) {
        shapes.value.push(newShape)
        redrawCanvas()
      }
    }

    isDrawing.value = false
    snapshot.value = null
    currentDrawingPoints.value = []
  }

  // Track last draw position
  const lastDrawPos = ref({ x: 0, y: 0 })

  const draw = (x: number, y: number) => {
    const context = ctx.value
    if (!context || !isDrawing.value) return

    lastDrawPos.value = { x, y }

    if (currentTool.value === 'draw') {
      currentDrawingPoints.value.push({ x, y })
      context.lineTo(x, y)
      context.stroke()
    } else if (['line', 'rectangle', 'arrow'].includes(currentTool.value)) {
      // Restore canvas to saved state
      if (snapshot.value) {
        context.putImageData(snapshot.value, 0, 0)
      }

      // Redraw all existing shapes
      shapes.value.forEach(shape => {
        const savedColor = context.strokeStyle
        const savedLineWidth = context.lineWidth
        
        context.strokeStyle = shape.color
        context.fillStyle = shape.color
        context.lineWidth = shape.lineWidth
        context.lineCap = 'round'
        context.lineJoin = 'round'

        if (shape.type === 'line' && shape.startPoint && shape.endPoint) {
          drawLine(shape.startPoint.x, shape.startPoint.y, shape.endPoint.x, shape.endPoint.y)
        } else if (shape.type === 'rectangle' && shape.startPoint && shape.endPoint) {
          const width = shape.endPoint.x - shape.startPoint.x
          const height = shape.endPoint.y - shape.startPoint.y
          drawRectangle(shape.startPoint.x, shape.startPoint.y, width, height, false)
        } else if (shape.type === 'arrow' && shape.startPoint && shape.endPoint) {
          drawArrow(shape.startPoint.x, shape.startPoint.y, shape.endPoint.x, shape.endPoint.y)
        } else if (shape.type === 'draw' && shape.points && shape.points.length > 0) {
          context.beginPath()
          context.moveTo(shape.points[0].x, shape.points[0].y)
          for (let i = 1; i < shape.points.length; i++) {
            context.lineTo(shape.points[i].x, shape.points[i].y)
          }
          context.stroke()
        }

        context.strokeStyle = savedColor
        context.lineWidth = savedLineWidth
      })

      // Draw preview
      context.strokeStyle = options.value.color
      context.lineWidth = options.value.lineWidth
      context.lineCap = 'round'
      context.lineJoin = 'round'

      if (currentTool.value === 'line') {
        drawLine(startX.value, startY.value, x, y)
      } else if (currentTool.value === 'rectangle') {
        drawRectangle(startX.value, startY.value, x - startX.value, y - startY.value, false)
      } else if (currentTool.value === 'arrow') {
        drawArrow(startX.value, startY.value, x, y)
      }
    }
  }

  const updateShapeProperty = (shapeId: string, property: keyof Shape, value: any) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (shape) {
      (shape as any)[property] = value
      redrawCanvas()
    }
  }

  const getSelectedShape = (): Shape | null => {
    if (!selectedShapeId.value) return null
    return shapes.value.find(s => s.id === selectedShapeId.value) || null
  }

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    const context = ctx.value
    if (!context) return

    context.beginPath()
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
    context.stroke()
  }

  const drawRectangle = (x: number, y: number, width: number, height: number, filled: boolean) => {
    const context = ctx.value
    if (!context) return

    if (filled) {
      context.fillStyle = options.value.color
      context.fillRect(x, y, width, height)
    } else {
      context.strokeRect(x, y, width, height)
    }
  }

  const drawArrow = (x1: number, y1: number, x2: number, y2: number) => {
    const context = ctx.value
    if (!context) return

    // Draw line
    drawLine(x1, y1, x2, y2)

    // Calculate arrow head
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const headLength = 20

    // Draw arrow head
    context.beginPath()
    context.moveTo(x2, y2)
    context.lineTo(
      x2 - headLength * Math.cos(angle - Math.PI / 6),
      y2 - headLength * Math.sin(angle - Math.PI / 6)
    )
    context.moveTo(x2, y2)
    context.lineTo(
      x2 - headLength * Math.cos(angle + Math.PI / 6),
      y2 - headLength * Math.sin(angle + Math.PI / 6)
    )
    context.stroke()
  }

  const drawText = (x: number, y: number, text: string) => {
    const context = ctx.value
    if (!context) return

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
    redrawCanvas()
  }

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
    redrawCanvas
  }
}
