<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useDrawingStore } from '@/stores/drawing'
import { useCanvasDrawing } from '@/composables/useCanvasDrawing'
import { useHistory } from '@/composables/useHistory'

const store = useDrawingStore()

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const backgroundImageRef = ref<SVGImageElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null) // For history
const textInputVisible = ref(false)
const textInputPosition = ref({ x: 0, y: 0 })
const textInputValue = ref('')
const textInputRef = ref<HTMLInputElement | null>(null)
const panStartPoint = ref<{ x: number; y: number } | null>(null)

const { 
  startDrawing, 
  draw, 
  stopDrawing, 
  drawText,
  updateShapeProperty,
  clearShapes,
  deleteSelectedShapes,
  renderAllShapes,
  getSVGCoordinates: getBaseSVGCoordinates
} = useCanvasDrawing(svgRef)

// Adjusted SVG coordinates accounting for pan and zoom
const getSVGCoordinates = (event: MouseEvent) => {
  const coords = getBaseSVGCoordinates(event)
  // Apply inverse transform
  const adjustedX = (coords.x - store.panOffset.x) / store.zoomLevel
  const adjustedY = (coords.y - store.panOffset.y) / store.zoomLevel
  return { x: adjustedX, y: adjustedY }
}

const { saveState, undo, redo, canUndo, canRedo } = useHistory(canvasRef)

const isCurrentlyDrawing = ref(false)

const loadImage = async (dataUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Create an image shape that can be moved
      const imageShape = {
        id: 'img_' + Date.now(),
        type: 'image' as const,
        color: '#000000',
        lineWidth: 0,
        imageData: dataUrl,
        imageWidth: img.width,
        imageHeight: img.height,
        startPoint: { x: 50, y: 50 },
        bounds: { x: 50, y: 50, width: img.width, height: img.height }
      }
      
      store.addShape(imageShape)
      renderAllShapes()
      saveState()
      resolve()
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }
    
    img.src = dataUrl
  })
}

const clear = () => {
  clearShapes()
  
  // Clear background image
  if (backgroundImageRef.value) {
    backgroundImageRef.value.remove()
    backgroundImageRef.value = null
  }
  
  saveState()
}

const getImageData = (): string | null => {
  const svg = svgRef.value
  if (!svg) return null

  // Serialize SVG to string
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svg)
  
  // Create blob and data URL
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  
  // For now, return SVG as data URL
  // In production, you might want to convert to PNG using canvas
  return URL.createObjectURL(svgBlob)
}

const handleMouseDown = (event: MouseEvent) => {
  const svg = svgRef.value
  if (!svg) return
  
  // Space bar for panning
  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    panStartPoint.value = { x: event.clientX, y: event.clientY }
    store.startPanning()
    event.preventDefault()
    return
  }
  
  const coords = getSVGCoordinates(event)
  
  if (store.currentTool === 'text') {
    // Show text input at click position
    textInputPosition.value = { x: event.clientX, y: event.clientY }
    textInputValue.value = ''
    textInputVisible.value = true
    // Focus input after render
    setTimeout(() => {
      textInputRef.value?.focus()
    }, 0)
  } else {
    isCurrentlyDrawing.value = true
    startDrawing(coords.x, coords.y, event)
  }
}

const handleMouseMove = (event: MouseEvent) => {
  // Handle panning
  if (store.isPanning && panStartPoint.value) {
    const deltaX = event.clientX - panStartPoint.value.x
    const deltaY = event.clientY - panStartPoint.value.y
    
    const newX = store.panOffset.x + deltaX
    const newY = store.panOffset.y + deltaY
    store.setPanOffset(newX, newY)
    
    panStartPoint.value = { x: event.clientX, y: event.clientY }
    updateViewTransform()
    return
  }
  
  if (!isCurrentlyDrawing.value && !store.isDraggingShapes && !store.isDragSelecting) return
  const coords = getSVGCoordinates(event)
  draw(coords.x, coords.y)
}

const handleMouseUp = () => {
  // Stop panning
  if (store.isPanning) {
    store.stopPanning()
    panStartPoint.value = null
    return
  }
  
  if (isCurrentlyDrawing.value || store.isDraggingShapes || store.isDragSelecting) {
    stopDrawing()
    if (isCurrentlyDrawing.value) {
      saveState()
    }
    isCurrentlyDrawing.value = false
  }
}

const handleMouseLeave = () => {
  // Stop panning
  if (store.isPanning) {
    store.stopPanning()
    panStartPoint.value = null
  }
  
  if (isCurrentlyDrawing.value || store.isDraggingShapes || store.isDragSelecting) {
    stopDrawing()
    isCurrentlyDrawing.value = false
  }
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  
  // Zoom with ctrl/cmd + wheel
  if (event.ctrlKey || event.metaKey) {
    const delta = -event.deltaY * 0.001
    const newZoom = store.zoomLevel + delta
    store.setZoomLevel(newZoom)
    updateViewTransform()
  } else {
    // Pan with wheel
    store.setPanOffset(
      store.panOffset.x - event.deltaX,
      store.panOffset.y - event.deltaY
    )
    updateViewTransform()
  }
}

const updateViewTransform = () => {
  const svg = svgRef.value
  if (!svg) return
  
  const container = containerRef.value
  if (!container) return
  
  const zoom = store.zoomLevel
  const offsetX = store.panOffset.x
  const offsetY = store.panOffset.y
  
  // Apply transform to SVG content group
  const contentGroup = svg.querySelector('.svg-content')
  if (contentGroup) {
    contentGroup.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${zoom})`)
  }
}

const handleTextInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitTextInput()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelTextInput()
  }
}

const commitTextInput = () => {
  if (textInputValue.value.trim()) {
    const svg = svgRef.value
    if (!svg) return
    
    const pt = svg.createSVGPoint()
    pt.x = textInputPosition.value.x
    pt.y = textInputPosition.value.y
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())
    
    drawText(svgP.x, svgP.y, textInputValue.value)
    saveState()
  }
  cancelTextInput()
}

const cancelTextInput = () => {
  textInputVisible.value = false
  textInputValue.value = ''
}

onMounted(() => {
  const svg = svgRef.value
  const container = containerRef.value
  
  if (svg && container) {
    // Set SVG size to container size
    svg.setAttribute('width', container.clientWidth.toString())
    svg.setAttribute('height', container.clientHeight.toString())
    
    // Create content group for transforms
    const existingGroup = svg.querySelector('.svg-content')
    if (!existingGroup) {
      const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      contentGroup.setAttribute('class', 'svg-content')
      // Move all children into the group
      while (svg.firstChild) {
        contentGroup.appendChild(svg.firstChild)
      }
      svg.appendChild(contentGroup)
    }
    
    // Initial save state
    saveState()
    updateViewTransform()
  }
})

// Watch for tool changes to trigger re-render (for cursor changes)
watch(() => store.currentTool, () => {
  renderAllShapes()
})

// Watch for shapes changes (including after state load)
watch(() => store.shapes, () => {
  renderAllShapes()
}, { deep: true })

defineExpose({
  loadImage,
  clear,
  getImageData,
  undo,
  redo,
  canUndo,
  canRedo,
  updateShapeProperty,
  deleteSelectedShapes
})
</script>

<template>
  <div ref="containerRef" class="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-900">
    <svg
      ref="svgRef"
      class="absolute top-0 left-0 w-full h-full"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
      @wheel="handleWheel"
      :style="{ cursor: store.isPanning ? 'grabbing' : 'crosshair', touchAction: 'none' }"
    >
      <!-- SVG content is dynamically added via JavaScript -->
    </svg>
    
    <!-- Hidden canvas for undo/redo history -->
    <canvas ref="canvasRef" class="hidden"></canvas>

    <!-- Text input overlay -->
    <input
      v-if="textInputVisible"
      ref="textInputRef"
      v-model="textInputValue"
      type="text"
      :style="{
        position: 'fixed',
        left: `${textInputPosition.x}px`,
        top: `${textInputPosition.y}px`,
        fontSize: `${store.fontSize}px`,
        fontFamily: store.fontFamily,
        color: store.currentColor,
        border: '2px solid #3B82F6',
        outline: 'none',
        background: 'white',
        padding: '2px 4px',
        minWidth: '200px',
        zIndex: 1000
      }"
      @keydown="handleTextInputKeydown"
      @blur="commitTextInput"
    />
  </div>
</template>

<style scoped>
/* No custom styles needed */
</style>
