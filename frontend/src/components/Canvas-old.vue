<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import type { ToolType } from '@/types'
import { useDrawing } from '@/composables/useDrawingSVG'
import { useHistory } from '@/composables/useHistory'

const props = defineProps<{
  tool: ToolType
  color: string
  lineWidth: number
  fontSize: number
  fontFamily: string
}>()

const emit = defineEmits<{
  'draw-complete': []
  'image-loaded': []
  'update:selectedShape': [shape: any | null]
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const backgroundImageRef = ref<SVGImageElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null) // For history
const textInputVisible = ref(false)
const textInputPosition = ref({ x: 0, y: 0 })
const textInputValue = ref('')
const textInputRef = ref<HTMLInputElement | null>(null)

const drawingOptions = computed(() => ({
  color: props.color,
  lineWidth: props.lineWidth,
  fontSize: props.fontSize,
  fontFamily: props.fontFamily
}))

const { 
  startDrawing, 
  draw, 
  stopDrawing, 
  drawText, 
  currentTool, 
  selectedShapeId, 
  getSelectedShape, 
  updateShapeProperty,
  clearShapes,
  deleteSelectedShape
} = useDrawing(svgRef, drawingOptions)

const { saveState, undo, redo, canUndo, canRedo } = useHistory(canvasRef)

const isCurrentlyDrawing = ref(false)

// Sync tool with parent
watch(() => props.tool, (newTool, oldTool) => {
  currentTool.value = newTool
  // Deselect shapes when switching away from select tool
  if (oldTool === 'select' && newTool !== 'select' && selectedShapeId.value) {
    selectedShapeId.value = null
  }
})

// Watch for shape selection changes
watch(selectedShapeId, () => {
  const shape = getSelectedShape()
  emit('update:selectedShape', shape)
})

const loadImage = async (dataUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const svg = svgRef.value
    
    if (!svg) {
      reject(new Error('SVG not initialized'))
      return
    }

    const img = new Image()
    img.onload = () => {
      // Remove existing background image if any
      const existingBg = svg.querySelector('.background-image')
      if (existingBg) {
        existingBg.remove()
      }

      // Create SVG image element
      const svgImage = document.createElementNS('http://www.w3.org/2000/svg', 'image')
      svgImage.setAttribute('class', 'background-image')
      svgImage.setAttribute('href', dataUrl)
      
      // Calculate scaling to fit SVG while maintaining aspect ratio
      const svgRect = svg.getBoundingClientRect()
      const scale = Math.min(
        svgRect.width / img.width,
        svgRect.height / img.height
      )

      const scaledWidth = img.width * scale
      const scaledHeight = img.height * scale

      // Center the image
      const x = (svgRect.width - scaledWidth) / 2
      const y = (svgRect.height - scaledHeight) / 2

      svgImage.setAttribute('x', x.toString())
      svgImage.setAttribute('y', y.toString())
      svgImage.setAttribute('width', scaledWidth.toString())
      svgImage.setAttribute('height', scaledHeight.toString())
      svgImage.style.pointerEvents = 'none'
      
      // Insert at the beginning so shapes render on top
      svg.insertBefore(svgImage, svg.firstChild)
      backgroundImageRef.value = svgImage
      
      saveState()
      emit('image-loaded')
      resolve()
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

const clear = () => {
  const svg = svgRef.value
  
  if (svg) {
    // Clear background image
    const existingBg = svg.querySelector('.background-image')
    if (existingBg) {
      existingBg.remove()
    }
    backgroundImageRef.value = null
    
    // Clear all shapes
    clearShapes()
    saveState()
  }
}

const getImageData = (): string => {
  const svg = svgRef.value
  if (!svg) return ''
  
  // Convert SVG to data URL
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svg)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  
  // For now, return SVG as data URL
  // In production, you might want to convert to PNG using canvas
  return URL.createObjectURL(svgBlob)
}

const handleMouseDown = (event: MouseEvent) => {
  const svg = svgRef.value
  if (!svg) return
  
  const pt = svg.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())
  const x = svgP.x
  const y = svgP.y
  
  if (props.tool === 'text') {
    // Show text input at click position
    textInputPosition.value = { x: event.clientX, y: event.clientY }
    textInputValue.value = ''
    textInputVisible.value = true
    // Focus input after render
    setTimeout(() => {
      textInputRef.value?.focus()
    }, 0)
  } else if (props.tool !== 'select' || event.target === svgRef.value) {
    isCurrentlyDrawing.value = true
    startDrawing(x, y, event)
  } else if (props.tool === 'select') {
    // Pass event to startDrawing for shape dragging
    startDrawing(x, y, event)
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isCurrentlyDrawing.value) return
  const svg = svgRef.value
  if (!svg) return
  
  const pt = svg.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())
  draw(svgP.x, svgP.y)
}

const handleMouseUp = () => {
  if (isCurrentlyDrawing.value) {
    stopDrawing()
    saveState()
    emit('draw-complete')
    isCurrentlyDrawing.value = false
  }
}

const handleMouseLeave = () => {
  if (isCurrentlyDrawing.value) {
    stopDrawing()
    isCurrentlyDrawing.value = false
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
    emit('draw-complete')
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
    svg.setAttribute('viewBox', `0 0 ${container.clientWidth} ${container.clientHeight}`)
  }
})

// Expose methods to parent
defineExpose({
  loadImage,
  clear,
  getImageData,
  undo,
  redo,
  canUndo,
  canRedo,
  updateShapeProperty,
  deleteSelectedShape
})
</script>

<template>
  <div ref="containerRef" class="flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden relative">
    <svg
      ref="svgRef"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
      class="bg-white dark:bg-gray-800 shadow-xl cursor-crosshair"
      style="width: 100%; height: 100%;"
    />
    
    <!-- Text Input Overlay -->
    <input
      v-if="textInputVisible"
      ref="textInputRef"
      v-model="textInputValue"
      type="text"
      :style="{
        position: 'absolute',
        left: textInputPosition.x + 'px',
        top: textInputPosition.y + 'px',
        fontSize: fontSize + 'px',
        fontFamily: fontFamily,
        color: color,
        border: '2px solid #3B82F6',
        outline: 'none',
        padding: '2px 4px',
        background: 'white',
        minWidth: '100px',
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
