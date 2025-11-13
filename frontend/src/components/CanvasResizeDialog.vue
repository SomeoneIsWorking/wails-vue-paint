<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useDrawingStore } from "@/stores/drawing";
// @ts-ignore
import { EventsOn } from "../../wailsjs/runtime/runtime";

const store = useDrawingStore();

const isOpen = ref(false);
const width = ref(800);
const height = ref(600);
const anchorPoint = ref<"center" | "top-left" | "top-center" | "top-right" | "center-left" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right">("center");

const anchorOptions = [
  { value: "top-left", label: "↖ Top Left" },
  { value: "top-center", label: "↑ Top Center" },
  { value: "top-right", label: "↗ Top Right" },
  { value: "center-left", label: "← Center Left" },
  { value: "center", label: "⊙ Center" },
  { value: "center-right", label: "→ Center Right" },
  { value: "bottom-left", label: "↙ Bottom Left" },
  { value: "bottom-center", label: "↓ Bottom Center" },
  { value: "bottom-right", label: "↘ Bottom Right" },
];

const openDialog = () => {
  width.value = store.canvasBounds.width;
  height.value = store.canvasBounds.height;
  isOpen.value = true;
};

const closeDialog = () => {
  isOpen.value = false;
};

const applyCanvasResize = () => {
  store.setCanvasBounds({
    x: store.canvasBounds.x,
    y: store.canvasBounds.y,
    width: width.value,
    height: height.value,
  });
  closeDialog();
};

onMounted(() => {
  EventsOn("openCanvasResizeDialog", openDialog);
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-96">
      <h2 class="text-lg font-semibold mb-4 dark:text-white">Resize Canvas</h2>

      <!-- Size inputs -->
      <div class="space-y-4 mb-6">
        <div>
          <label class="block text-sm font-medium dark:text-gray-300 mb-2">Width</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="width"
              type="range"
              min="100"
              max="5000"
              step="10"
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <input
              v-model.number="width"
              type="number"
              min="100"
              max="5000"
              class="w-20 px-2 py-1 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium dark:text-gray-300 mb-2">Height</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="height"
              type="range"
              min="100"
              max="5000"
              step="10"
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <input
              v-model.number="height"
              type="number"
              min="100"
              max="5000"
              class="w-20 px-2 py-1 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      <!-- Anchor point selector -->
      <div class="mb-6">
        <label class="block text-sm font-medium dark:text-gray-300 mb-3">Resize Origin</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="option in anchorOptions"
            :key="option.value"
            :class="[
              'p-2 text-xs rounded border-2 transition-colors',
              anchorPoint === option.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 dark:text-gray-300'
            ]"
            @click="anchorPoint = option.value as any"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Preview -->
      <div class="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview</p>
        <div class="flex items-center justify-center h-32 bg-white dark:bg-gray-600 rounded border-2 border-dashed border-gray-300 dark:border-gray-500">
          <div
            class="bg-blue-200 dark:bg-blue-600 border border-blue-400 dark:border-blue-500"
            :style="{
              width: Math.min(width / 10, 100) + 'px',
              height: Math.min(height / 10, 100) + 'px',
            }"
          />
        </div>
        <p class="text-xs text-center text-gray-600 dark:text-gray-400 mt-2">{{ width }} × {{ height }}px</p>
      </div>

      <!-- Buttons -->
      <div class="flex gap-2 justify-end">
        <button
          @click="closeDialog"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          @click="applyCanvasResize"
          class="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Apply
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  border: none;
}
</style>
