<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useDrawingStore } from "@/stores/drawing";
import { useCanvasDrawing } from "@/composables/useCanvasDrawing";
import { useHistory } from "@/composables/useHistory";
import type { Point } from "@/types";

const store = useDrawingStore();

const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const backgroundImageRef = ref<SVGImageElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null); // For history
const textInputVisible = ref(false);
const textInputPosition = ref({ x: 0, y: 0 }); // Screen position for display
const textInputSVGPosition = ref({ x: 0, y: 0 }); // SVG position for drawing
const textInputValue = ref("");
const textInputRef = ref<HTMLTextAreaElement | null>(null);
const panStartPoint = ref<{ x: number; y: number } | null>(null);

const {
  startDrawing,
  draw,
  stopDrawing,
  drawText,
  updateShapeProperty,
  clearShapes,
  deleteSelectedShapes,
  getSVGCoordinates: getBaseSVGCoordinates,
  previewShape,
} = useCanvasDrawing(svgRef);

// Computed bounds for rendering
const selectionBounds = computed(() => {
  if (store.selectedShapeIds.length === 0) return [];
  return store.selectedShapes.map((s) => s.bounds);
});

const previewBounds = computed(() => {
  if (!store.isDragSelecting || store.dragSelectPreviewShapeIds.length === 0)
    return [];
  return store.shapes
    .filter((s) => store.dragSelectPreviewShapeIds.includes(s.id))
    .map((s) => s.bounds);
});

// Helper for arrow heads
const getArrowHeadPoints = (start: Point, end: Point): string => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const arrowSize = 10;

  const point1 = {
    x: end.x - arrowSize * Math.cos(angle - Math.PI / 6),
    y: end.y - arrowSize * Math.sin(angle - Math.PI / 6),
  };
  const point2 = {
    x: end.x - arrowSize * Math.cos(angle + Math.PI / 6),
    y: end.y - arrowSize * Math.sin(angle + Math.PI / 6),
  };

  return `${end.x},${end.y} ${point1.x},${point1.y} ${point2.x},${point2.y}`;
};

// Computed transform string for SVG content
const contentTransform = computed(() => {
  return `translate(${store.panOffset.x}, ${store.panOffset.y}) scale(${store.zoomLevel})`;
});

// All shapes including preview
const allShapes = computed(() => {
  return previewShape.value
    ? [...store.shapes, previewShape.value]
    : store.shapes;
});

// Adjusted SVG coordinates accounting for pan and zoom
const getSVGCoordinates = (event: MouseEvent) => {
  const coords = getBaseSVGCoordinates(event);
  // Apply inverse transform
  const adjustedX = (coords.x - store.panOffset.x) / store.zoomLevel;
  const adjustedY = (coords.y - store.panOffset.y) / store.zoomLevel;
  return { x: adjustedX, y: adjustedY };
};

const { saveState, undo, redo, canUndo, canRedo } = useHistory(canvasRef);

const isCurrentlyDrawing = ref(false);

const loadImage = async (dataUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Create an image shape that can be moved
      const imageShape = {
        id: "img_" + Date.now(),
        type: "image" as const,
        color: "#000000",
        lineWidth: 0,
        imageData: dataUrl,
        imageWidth: img.width,
        imageHeight: img.height,
        startPoint: { x: 50, y: 50 },
        bounds: { x: 50, y: 50, width: img.width, height: img.height },
      };

      store.addShape(imageShape);
      saveState();
      resolve();
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = dataUrl;
  });
};

const clear = () => {
  clearShapes();

  // Clear background image
  if (backgroundImageRef.value) {
    backgroundImageRef.value.remove();
    backgroundImageRef.value = null;
  }

  saveState();
};

const getImageData = (): string | null => {
  const svg = svgRef.value;
  if (!svg) return null;

  // Serialize SVG to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);

  // Create blob and data URL
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });

  // For now, return SVG as data URL
  // In production, you might want to convert to PNG using canvas
  return URL.createObjectURL(svgBlob);
};

const handleMouseDown = (event: MouseEvent) => {
  if (textInputVisible.value) {
    return;
  } // Ignore if text input is active
  const svg = svgRef.value;
  if (!svg) {
    return;
  }

  // Space bar for panning
  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    panStartPoint.value = { x: event.clientX, y: event.clientY };
    store.startPanning();
    event.preventDefault();
    return;
  }

  const coords = getSVGCoordinates(event);

  if (store.currentTool === "text") {
    // Show text input at click position
    textInputPosition.value = { x: event.clientX, y: event.clientY };
    textInputSVGPosition.value = { x: coords.x, y: coords.y };
    textInputValue.value = "";
    textInputVisible.value = true;
    // Focus input after render
    setTimeout(() => {
      textInputRef.value?.focus();
    }, 0);
  } else {
    isCurrentlyDrawing.value = true;
    startDrawing(coords.x, coords.y, event);
  }
};

const handleMouseMove = (event: MouseEvent) => {
  // Handle panning
  if (store.isPanning && panStartPoint.value) {
    const deltaX = event.clientX - panStartPoint.value.x;
    const deltaY = event.clientY - panStartPoint.value.y;

    const newX = store.panOffset.x + deltaX;
    const newY = store.panOffset.y + deltaY;
    store.setPanOffset(newX, newY);

    panStartPoint.value = { x: event.clientX, y: event.clientY };
    return;
  }

  if (
    !isCurrentlyDrawing.value &&
    !store.isDraggingShapes &&
    !store.isDragSelecting
  )
    return;
  const coords = getSVGCoordinates(event);
  draw(coords.x, coords.y);
};

const handleMouseUp = () => {
  // Stop panning
  if (store.isPanning) {
    store.stopPanning();
    panStartPoint.value = null;
    return;
  }

  if (
    isCurrentlyDrawing.value ||
    store.isDraggingShapes ||
    store.isDragSelecting
  ) {
    stopDrawing();
    if (isCurrentlyDrawing.value) {
      saveState();
    }
    isCurrentlyDrawing.value = false;
  }
};

const handleMouseLeave = () => {
  // Stop panning
  if (store.isPanning) {
    store.stopPanning();
    panStartPoint.value = null;
  }

  if (
    isCurrentlyDrawing.value ||
    store.isDraggingShapes ||
    store.isDragSelecting
  ) {
    stopDrawing();
    isCurrentlyDrawing.value = false;
  }
};

const handleWheel = (event: WheelEvent) => {
  event.preventDefault();

  // Zoom with ctrl/cmd + wheel
  if (event.ctrlKey || event.metaKey) {
    const delta = -event.deltaY * 0.001;
    const newZoom = store.zoomLevel + delta;
    store.setZoomLevel(newZoom);
  } else {
    // Pan with wheel
    store.setPanOffset(
      store.panOffset.x - event.deltaX,
      store.panOffset.y - event.deltaY
    );
  }
};

const handleTextInputKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    // CMD+Enter or Ctrl+Enter to commit
    event.preventDefault();
    commitTextInput();
    // Blur the textarea to remove focus
    textInputRef.value?.blur();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancelTextInput();
  }
  // Regular Enter will add newline (default behavior)
};

const handleTextInputBlur = () => {
  commitTextInput();
};

const commitTextInput = () => {
  // Read directly from the textarea element
  const textValue = textInputValue.value || "";
  console.log("commitTextInput called, value from element:", textValue);
  console.log("value from ref:", textInputValue.value);
  console.log("trimmed:", textValue.trim());
  console.log("svg position:", textInputSVGPosition.value);

  const trimmedText = textValue.trim();
  if (trimmedText) {
    console.log(
      "Creating text at:",
      textInputSVGPosition.value.x,
      textInputSVGPosition.value.y
    );
    drawText(
      textInputSVGPosition.value.x,
      textInputSVGPosition.value.y,
      trimmedText
    );
    saveState();
  } else {
    console.log("Text is empty, not creating");
  }
  cancelTextInput();
};

const cancelTextInput = () => {
  textInputVisible.value = false;
  textInputValue.value = "";
};

onMounted(() => {
  const svg = svgRef.value;
  const container = containerRef.value;

  if (svg && container) {
    // Set SVG size to container size
    svg.setAttribute("width", container.clientWidth.toString());
    svg.setAttribute("height", container.clientHeight.toString());

    // Initial save state
    saveState();
  }
});

defineExpose({
  loadImage,
  clear,
  getImageData,
  undo,
  redo,
  canUndo,
  canRedo,
  updateShapeProperty,
  deleteSelectedShapes,
});
</script>

<template>
  <div
    ref="containerRef"
    class="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-900"
  >
    <svg
      ref="svgRef"
      class="absolute top-0 left-0 w-full h-full"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
      @wheel="handleWheel"
      :style="{
        cursor: store.isPanning ? 'grabbing' : 'crosshair',
        touchAction: 'none',
      }"
    >
      <g class="svg-content" :transform="contentTransform">
        <!-- Render all shapes including preview -->
        <g
          v-for="shape in allShapes"
          :key="shape.id"
          :data-shape-id="shape.id"
          :style="shape.id === 'preview' ? { opacity: 0.7 } : {}"
        >
          <!-- Lines -->
          <line
            v-if="shape.type === 'line' && shape.startPoint && shape.endPoint"
            :x1="shape.startPoint.x"
            :y1="shape.startPoint.y"
            :x2="shape.endPoint.x"
            :y2="shape.endPoint.y"
            :stroke="shape.color"
            :stroke-width="shape.lineWidth"
            stroke-linecap="round"
          />

          <!-- Rectangles -->
          <rect
            v-else-if="
              shape.type === 'rectangle' && shape.startPoint && shape.endPoint
            "
            :x="Math.min(shape.startPoint.x, shape.endPoint.x)"
            :y="Math.min(shape.startPoint.y, shape.endPoint.y)"
            :width="Math.abs(shape.endPoint.x - shape.startPoint.x)"
            :height="Math.abs(shape.endPoint.y - shape.startPoint.y)"
            :stroke="shape.color"
            :stroke-width="shape.lineWidth"
            fill="none"
          />

          <!-- Freehand drawing -->
          <path
            v-else-if="shape.type === 'draw' && shape.points"
            :d="`M ${shape.points.map((p) => `${p.x},${p.y}`).join(' L ')}`"
            :stroke="shape.color"
            :stroke-width="shape.lineWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />

          <!-- Text -->
          <text
            v-else-if="shape.type === 'text' && shape.startPoint && shape.text"
            :x="shape.startPoint.x"
            :y="shape.startPoint.y"
            :fill="shape.color"
            :font-size="shape.fontSize || 16"
            :font-family="shape.fontFamily || 'Arial'"
          >
            <tspan
              v-for="(line, index) in shape.text.split('\n')"
              :key="index"
              :x="shape.startPoint.x"
              :dy="index === 0 ? 0 : (shape.fontSize || 16) * 1.2"
            >
              {{ line }}
            </tspan>
          </text>

          <!-- Images -->
          <image
            v-else-if="
              shape.type === 'image' && shape.startPoint && shape.imageData
            "
            :href="shape.imageData"
            :x="shape.startPoint.x"
            :y="shape.startPoint.y"
            :width="shape.imageWidth || 100"
            :height="shape.imageHeight || 100"
          />

          <!-- Arrows -->
          <g
            v-else-if="
              shape.type === 'arrow' && shape.startPoint && shape.endPoint
            "
          >
            <line
              :x1="shape.startPoint.x"
              :y1="shape.startPoint.y"
              :x2="shape.endPoint.x"
              :y2="shape.endPoint.y"
              :stroke="shape.color"
              :stroke-width="shape.lineWidth"
              stroke-linecap="round"
            />
            <!-- Arrow head - computed inline -->
            <polygon
              :points="getArrowHeadPoints(shape.startPoint, shape.endPoint)"
              :fill="shape.color"
            />
          </g>
        </g>

        <!-- Selection boxes -->
        <rect
          v-for="(bounds, index) in selectionBounds"
          :key="'selection-' + index"
          class="selection-box"
          :x="bounds.x - 3"
          :y="bounds.y - 3"
          :width="bounds.width + 6"
          :height="bounds.height + 6"
          stroke="#3B82F6"
          stroke-width="2"
          fill="none"
          pointer-events="none"
        />

        <!-- Drag selection box -->
        <rect
          v-if="store.isDragSelecting && store.dragSelectBounds"
          class="drag-selection-box"
          :x="store.dragSelectBounds.x"
          :y="store.dragSelectBounds.y"
          :width="store.dragSelectBounds.width"
          :height="store.dragSelectBounds.height"
          stroke="#3B82F6"
          stroke-width="1"
          stroke-dasharray="4,4"
          fill="rgba(59, 130, 246, 0.1)"
          pointer-events="none"
        />

        <!-- Preview boxes for drag selection -->
        <rect
          v-for="(bounds, index) in previewBounds"
          :key="'preview-' + index"
          class="preview-box"
          :x="bounds.x - 3"
          :y="bounds.y - 3"
          :width="bounds.width + 6"
          :height="bounds.height + 6"
          stroke="#FF8800"
          stroke-width="2"
          stroke-dasharray="4,4"
          fill="none"
          pointer-events="none"
        />
      </g>
    </svg>

    <!-- Hidden canvas for undo/redo history -->
    <canvas ref="canvasRef" class="hidden"></canvas>

    <!-- Text input overlay -->
    <textarea
      v-if="textInputVisible"
      ref="textInputRef"
      v-model="textInputValue"
      :style="{
        position: 'fixed',
        left: `${textInputPosition.x}px`,
        top: `${textInputPosition.y}px`,
        fontSize: `${store.fontSize}px`,
        fontFamily: store.fontFamily,
        color: '#000000',
        border: '2px solid #3B82F6',
        outline: 'none',
        background: 'white',
        padding: '4px 8px',
        minWidth: '200px',
        minHeight: '30px',
        resize: 'both',
        zIndex: 1000,
      }"
      @keydown="handleTextInputKeydown"
      @blur="handleTextInputBlur"
    />
  </div>
</template>

<style scoped>
/* No custom styles needed */
</style>
