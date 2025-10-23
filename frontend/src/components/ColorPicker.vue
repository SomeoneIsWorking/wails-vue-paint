<script setup lang="ts">
import { computed } from 'vue'
import { useDrawingStore } from '@/stores/drawing'

const store = useDrawingStore()

const presetColors = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'
]

// Show unselected state if multiple shapes with different colors selected
const displayColor = computed(() => {
  if (store.currentColor === undefined) {
    return '#808080' // Gray for indeterminate state
  }
  return store.currentColor
})

const isIndeterminate = computed(() => store.currentColor === undefined)

const selectColor = (color: string) => {
  store.setColor(color)
}

const onCustomColorChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  store.setColor(target.value)
}
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="flex gap-1.5">
      <button
        v-for="color in presetColors"
        :key="color"
        :style="{ backgroundColor: color }"
        :class="['w-8 h-8 border-2 rounded cursor-pointer transition-all hover:scale-110', 
                 !isIndeterminate && displayColor === color ? 'border-blue-600 dark:border-blue-400 scale-[1.15]' : 'border-gray-300 dark:border-gray-600']"
        @click="selectColor(color)"
      />
    </div>
    <div class="relative">
      <input
        type="color"
        :value="displayColor"
        @input="onCustomColorChange"
        :class="['w-12 h-8 border-2 rounded cursor-pointer',
                 isIndeterminate ? 'border-orange-500' : 'border-gray-300 dark:border-gray-600']"
      />
      <div 
        v-if="isIndeterminate"
        class="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-white font-bold bg-black bg-opacity-30 rounded"
      >
        ?
      </div>
    </div>
  </div>
</template>

<style scoped>
/* No custom styles needed */
</style>
