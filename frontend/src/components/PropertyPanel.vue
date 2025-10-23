<script setup lang="ts">
import { computed } from "vue";
import { useDrawingStore } from "@/stores/drawing";

const store = useDrawingStore();

const commonProperties = computed(() => {
  if (!store.hasSelection || store.selectedShapes.length === 0)
    return new Set<string>();
  const first = store.selectedShapes[0];
  const props = new Set(Object.keys(first));
  for (const shape of store.selectedShapes.slice(1)) {
    for (const prop of [...props]) {
      if (!(prop in shape)) props.delete(prop);
    }
  }
  return props;
});

const showLineWidth = computed(
  () =>
    ["draw", "line", "rectangle", "arrow"].includes(store.currentTool) ||
    commonProperties.value.has("lineWidth")
);

const showSmoothing = computed(() => store.currentTool === "draw");

const showFontOptions = computed(
  () => store.currentTool === "text" || commonProperties.value.has("fontSize")
);

const showShapeProperties = computed(() => store.hasSelection);

const updateSmoothing = (value: number) => {
  store.setSmoothing(value);
};

const fontFamilies = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Verdana",
];
</script>

<template>
  <div class="flex items-center gap-4 h-12">
    <!-- Line Width for Drawing/Shapes -->
    <div v-if="showLineWidth" class="flex items-center gap-2">
      <label
        class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
      >
        Width:
      </label>
      <input
        type="range"
        min="1"
        max="20"
        :value="store.lineWidth ?? 2"
        @input="
          store.setLineWidth(Number(($event.target as HTMLInputElement).value))
        "
        class="input-range w-32"
      />
      <span class="text-xs text-gray-600 dark:text-gray-400 w-7">
        {{ store.lineWidth === undefined ? "?px" : `${store.lineWidth}px` }}
      </span>
    </div>

    <!-- Smoothing for Draw tool -->
    <div v-if="showSmoothing" class="flex items-center gap-2">
      <label
        class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
      >
        Smoothing:
      </label>
      <input
        type="range"
        min="0"
        max="10"
        step="0.1"
        :value="store.smoothing ?? 2"
        @input="
          updateSmoothing(Number(($event.target as HTMLInputElement).value))
        "
        class="input-range w-32"
      />
      <span class="text-xs text-gray-600 dark:text-gray-400 w-7">
        {{ store.smoothing === undefined ? "?" : store.smoothing?.toFixed(1) }}
      </span>
    </div>

    <!-- Font Options for Text -->
    <template v-if="showFontOptions">
      <div class="flex items-center gap-2">
        <label
          class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
        >
          Size:
        </label>
        <input
          type="range"
          min="12"
          max="72"
          :value="store.fontSize ?? 16"
          @input="
            store.setFontSize(Number(($event.target as HTMLInputElement).value))
          "
          class="input-range w-32"
        />
        <span class="text-xs text-gray-600 dark:text-gray-400 w-7">{{
          store.fontSize === undefined ? "?px" : `${store.fontSize}px`
        }}</span>
      </div>

      <select
        :value="store.fontFamily ?? 'Arial'"
        @change="
          store.setFontFamily(($event.target as HTMLSelectElement).value)
        "
        class="input-select text-xs h-7"
      >
        <option v-for="font in fontFamilies" :key="font" :value="font">
          {{ font }}
        </option>
      </select>
    </template>

    <!-- Default message when Select tool is active and nothing is selected -->
    <p
      v-if="store.currentTool === 'select' && !showShapeProperties"
      class="text-xs text-gray-500 dark:text-gray-400 m-0"
    >
      Click on a shape to select and edit it
    </p>

    <!-- Info about selected shapes -->
    <p
      v-if="showShapeProperties && !showLineWidth && !showFontOptions"
      class="text-xs text-gray-600 dark:text-gray-400 m-0"
    >
      {{
        store.selectedShapeIds.length === 1
          ? "1 shape selected"
          : `${store.selectedShapeIds.length} shapes selected`
      }}
    </p>
  </div>
</template>

<style scoped>
/* No custom styles needed */
</style>
