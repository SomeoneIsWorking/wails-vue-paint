<script setup lang="ts">
import type { ToolType } from '@/types'
import { useDrawingStore } from '@/stores/drawing'

const store = useDrawingStore()

const tools = [
  { 
    id: 'select' as ToolType, 
    label: 'Select', 
    icon: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z',
    tooltip: 'Select (V)'
  },
  { 
    id: 'text' as ToolType, 
    label: 'Text', 
    icon: 'M4 7V4h16v3M9 20h6M12 4v16',
    tooltip: 'Text (T)'
  },
  { 
    id: 'draw' as ToolType, 
    label: 'Draw', 
    icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
    tooltip: 'Draw (D)'
  },
  { 
    id: 'line' as ToolType, 
    label: 'Line', 
    icon: 'M5 19l14-14',
    tooltip: 'Line (L)'
  },
  { 
    id: 'rectangle' as ToolType, 
    label: 'Rectangle', 
    icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z',
    tooltip: 'Rectangle (R)'
  },
  { 
    id: 'arrow' as ToolType, 
    label: 'Arrow', 
    icon: 'M14 5l7 7m0 0l-7 7m7-7H3',
    tooltip: 'Arrow (A)'
  },
  { 
    id: 'eraser' as ToolType, 
    label: 'Eraser', 
    icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    tooltip: 'Eraser (E)'
  },
  { 
    id: 'pointEdit' as ToolType, 
    label: 'Point Edit', 
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    tooltip: 'Point Edit (P)'
  }
]

const selectTool = (tool: ToolType) => {
  store.setTool(tool)
}
</script>

<template>
  <div class="flex flex-col gap-2 p-3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
    <button
      v-for="tool in tools"
      :key="tool.id"
      :class="['tool-btn', { active: store.currentTool === tool.id }]"
      :title="tool.tooltip"
      @click="selectTool(tool.id)"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tool.icon" />
      </svg>
    </button>
  </div>
</template>