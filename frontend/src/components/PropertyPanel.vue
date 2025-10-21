<script setup lang="ts">
import { computed } from 'vue'
import { useDrawingStore } from '@/stores/drawing'

const store = useDrawingStore()

const showLineWidth = computed(() => 
  ['draw', 'line', 'rectangle', 'arrow'].includes(store.currentTool) || 
  (store.hasSelection && store.selectedShapes.some(s => ['draw', 'line', 'rectangle', 'arrow'].includes(s.type)))
)

const showFontOptions = computed(() => 
  store.currentTool === 'text' || 
  (store.hasSelection && store.selectedShapes.some(s => s.type === 'text'))
)

const showShapeProperties = computed(() => store.hasSelection)

// Use first selected shape's properties or default tool properties
const currentLineWidth = computed(() => 
  store.selectedShapes.length > 0 ? store.selectedShapes[0].lineWidth : store.lineWidth
)
const currentFontSize = computed(() => 
  store.selectedShapes.length > 0 ? (store.selectedShapes[0].fontSize ?? store.fontSize) : store.fontSize
)
const currentFontFamily = computed(() => 
  store.selectedShapes.length > 0 ? (store.selectedShapes[0].fontFamily ?? store.fontFamily) : store.fontFamily
)

const updateLineWidth = (width: number) => {
  if (store.hasSelection) {
    // Update all selected shapes
    store.selectedShapeIds.forEach(id => {
      store.updateShape(id, { lineWidth: width })
    })
  } else {
    store.setLineWidth(width)
  }
}

const updateFontSize = (size: number) => {
  if (store.hasSelection) {
    store.selectedShapeIds.forEach(id => {
      store.updateShape(id, { fontSize: size })
    })
  } else {
    store.setFontSize(size)
  }
}

const updateFontFamily = (family: string) => {
  if (store.hasSelection) {
    store.selectedShapeIds.forEach(id => {
      store.updateShape(id, { fontFamily: family })
    })
  } else {
    store.setFontFamily(family)
  }
}

const fontFamilies = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana']
</script>

<template>
  <div class="flex items-center gap-4 h-[48px]">
    <!-- Line Width for Drawing/Shapes -->
    <div v-if="showLineWidth" class="flex items-center gap-2">
      <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
        Width:
      </label>
      <input
        type="range"
        min="1"
        max="20"
        :value="currentLineWidth"
        @input="updateLineWidth(Number(($event.target as HTMLInputElement).value))"
        class="input-range w-32"
      />
      <span class="text-xs text-gray-600 dark:text-gray-400 w-7">{{ currentLineWidth }}px</span>
    </div>

    <!-- Font Options for Text -->
    <template v-if="showFontOptions">
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          Size:
        </label>
        <input
          type="range"
          min="12"
          max="72"
          :value="currentFontSize"
          @input="updateFontSize(Number(($event.target as HTMLInputElement).value))"
          class="input-range w-32"
        />
        <span class="text-xs text-gray-600 dark:text-gray-400 w-7">{{ currentFontSize }}px</span>
      </div>
      
      <select
        :value="currentFontFamily"
        @change="updateFontFamily(($event.target as HTMLSelectElement).value)"
        class="input-select text-xs h-7"
      >
        <option v-for="font in fontFamilies" :key="font" :value="font">
          {{ font }}
        </option>
      </select>
    </template>

    <!-- Default message when Select tool is active and nothing is selected -->
    <p v-if="store.currentTool === 'select' && !showShapeProperties" class="text-xs text-gray-500 dark:text-gray-400 m-0">
      Click on a shape to select and edit it
    </p>
    
    <!-- Info about selected shapes -->
    <p v-if="showShapeProperties && !showLineWidth && !showFontOptions" class="text-xs text-gray-600 dark:text-gray-400 m-0">
      {{ store.selectedShapeIds.length === 1 ? '1 shape selected' : `${store.selectedShapeIds.length} shapes selected` }}
    </p>
  </div>
</template>

<style scoped>
/* No custom styles needed */
</style>
