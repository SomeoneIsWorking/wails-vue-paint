<script setup lang="ts">
import { useDrawingStore } from '@/stores/drawing'

const store = useDrawingStore()

const handleZoomChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const zoom = parseFloat(target.value)
  store.setZoomLevel(zoom)
}

const resetZoom = () => {
  store.setZoomLevel(1)
}

const resetPan = () => {
  store.setPanOffset(0, 0)
}

const zoomPercentage = () => Math.round(store.zoomLevel * 100)
</script>

<template>
  <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <button
          @click="resetPan"
          class="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Reset Pan"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          Pan: Shift+Drag or Middle Mouse
        </span>
      </div>
    </div>
    
    <div class="flex items-center gap-3">
      <button
        @click="store.setZoomLevel(store.zoomLevel - 0.1)"
        class="icon-btn"
        title="Zoom Out"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
      </button>
      
      <div class="flex items-center gap-2">
        <input
          type="range"
          :value="store.zoomLevel"
          @input="handleZoomChange"
          min="0.1"
          max="5"
          step="0.1"
          class="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
        />
        <button
          @click="resetZoom"
          class="text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 min-w-12 text-center"
          title="Reset Zoom"
        >
          {{ zoomPercentage() }}%
        </button>
      </div>
      
      <button
        @click="store.setZoomLevel(store.zoomLevel + 0.1)"
        class="icon-btn"
        title="Zoom In"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </button>
    </div>
  </footer>
</template>

<style scoped>
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  border: none;
}

.slider::-webkit-slider-thumb:hover {
  background: #2563EB;
}

.slider::-moz-range-thumb:hover {
  background: #2563EB;
}
</style>
