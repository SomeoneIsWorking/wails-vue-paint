<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useDrawingStore } from "@/stores/drawing";
import { useCanvasDrawing } from "@/composables/useCanvasDrawing";
import {
  DrawShape,
  ImageShape,
  TextShape,
  LineShape,
  ArrowShape,
  RectangleShape,
} from "@/composables/shapes";
import type { Point } from "@/types";

const store = useDrawingStore();

const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const textInputVisible = ref(false);
const textInputPosition = ref({ x: 0, y: 0 } as Point); // Screen position for display
const textInputSVGPosition = ref({ x: 0, y: 0 } as Point); // SVG position for drawing
const textInputValue = ref("");
const textInputRef = ref<HTMLTextAreaElement | null>(null);
const panStartPoint = ref<Point | null>(null);

const {
  onPointerDown,
  draw,
  stopDrawing,
  drawText,
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

const handlePointEditMouseDown = (coords: Point) => {
  const selectedShape = store.pointEditSelectedShape;
  if (selectedShape) {
    // Check if clicking on a draggable point
    const points = selectedShape.getDraggablePoints();
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const distance = Math.sqrt((coords.x - point.x) ** 2 + (coords.y - point.y) ** 2);
      if (distance <= 10 / store.zoomLevel) { // 10px hit radius, adjusted for zoom
        store.setDraggedPointIndex(i);
        return;
      }
    }
    // Not on a point, deselect shape
    store.setPointEditSelectedShape(null);
  } else {
    // No shape selected, try to select one
    for (const shape of store.shapes) {
      if (coords.x >= shape.bounds.x && coords.x <= shape.bounds.x + shape.bounds.width &&
          coords.y >= shape.bounds.y && coords.y <= shape.bounds.y + shape.bounds.height) {
        store.setPointEditSelectedShape(shape.id);
        break;
      }
    }
  }
};

const handlePointDragging = (coords: Point) => {
  if (store.pointEditSelectedShape && store.draggedPointIndex !== null) {
    store.pointEditSelectedShape.updateDraggablePoint(store.draggedPointIndex, coords);
    store.saveStateToBackend();
  }
};

const isCurrentlyDrawing = ref(false);

const handleMouseDown = (event: MouseEvent) => {
  if (textInputVisible.value) {
    return;
  }

  const svg = svgRef.value;
  if (!svg) {
    return;
  }

  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    panStartPoint.value = { x: event.clientX, y: event.clientY };
    store.startPanning();
    event.preventDefault();
    return;
  }

  const coords = getSVGCoordinates(event);

  if (store.currentTool === "pointEdit") {
    handlePointEditMouseDown(coords);
    return;
  }

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
    onPointerDown(coords.x, coords.y, event);
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

  if (store.currentTool === "pointEdit" && store.draggedPointIndex !== null && store.pointEditSelectedShape) {
    const coords = getSVGCoordinates(event);
    handlePointDragging(coords);
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

  // Stop dragging point
  if (store.draggedPointIndex !== null) {
    store.setDraggedPointIndex(null);
    return;
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
  }
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
            v-if="shape instanceof LineShape"
            :x1="shape.startPoint.value.x"
            :y1="shape.startPoint.value.y"
            :x2="shape.endPoint.value.x"
            :y2="shape.endPoint.value.y"
            :stroke="shape.color.value"
            :stroke-width="shape.lineWidth.value"
            stroke-linecap="round"
          />

          <!-- Rectangles -->
          <rect
            v-else-if="shape instanceof RectangleShape"
            :x="Math.min(shape.startPoint.value.x, shape.endPoint.value.x)"
            :y="Math.min(shape.startPoint.value.y, shape.endPoint.value.y)"
            :width="Math.abs(shape.endPoint.value.x - shape.startPoint.value.x)"
            :height="
              Math.abs(shape.endPoint.value.y - shape.startPoint.value.y)
            "
            :stroke="shape.color.value"
            :stroke-width="shape.lineWidth.value"
            fill="none"
          />

          <!-- Freehand drawing -->
          <path
            v-else-if="shape instanceof DrawShape"
            :d="`M ${shape.points.value
              .map((p) => `${p.x},${p.y}`)
              .join(' L ')}`"
            :stroke="shape.color.value"
            :stroke-width="shape.lineWidth.value"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />

          <!-- Text -->
          <text
            v-else-if="shape instanceof TextShape"
            :x="shape.startPoint.value.x"
            :y="shape.startPoint.value.y"
            :fill="shape.color.value"
            :font-size="shape.fontSize?.value || 16"
            :font-family="shape.fontFamily?.value || 'Arial'"
          >
            <tspan
              v-for="(line, index) in shape.text.value.split('\n')"
              :key="index"
              :x="shape.startPoint.value.x"
              :dy="index === 0 ? 0 : (shape.fontSize?.value || 16) * 1.2"
            >
              {{ line }}
            </tspan>
          </text>

          <!-- Images -->
          <image
            v-else-if="shape instanceof ImageShape"
            :href="shape.imageData.value"
            :x="shape.startPoint.value.x"
            :y="shape.startPoint.value.y"
            :width="shape.imageWidth?.value || 100"
            :height="shape.imageHeight?.value || 100"
          />

          <!-- Arrows -->
          <g v-else-if="shape instanceof ArrowShape">
            <line
              :x1="shape.startPoint.value.x"
              :y1="shape.startPoint.value.y"
              :x2="shape.endPoint.value.x"
              :y2="shape.endPoint.value.y"
              :stroke="shape.color.value"
              :stroke-width="shape.lineWidth.value"
              stroke-linecap="round"
            />
            <!-- Arrow head - computed inline -->
            <polygon
              :points="shape.arrowHeadPoints.value"
              :fill="shape.color.value"
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

        <!-- Draggable points for point edit -->
        <g v-if="store.currentTool === 'pointEdit' && store.pointEditSelectedShape">
          <circle
            v-for="(point, index) in store.pointEditSelectedShape.getDraggablePoints()"
            :key="'point-' + index"
            :cx="point.x"
            :cy="point.y"
            r="5"
            fill="#3B82F6"
            stroke="#FFFFFF"
            stroke-width="2"
            style="cursor: move;"
          />
        </g>
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
