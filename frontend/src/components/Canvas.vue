<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useDrawingStore } from "@/stores/drawing";
import { useCanvasDrawing } from "@/composables/useCanvasDrawing";
import { useMouseInteraction } from "@/composables/useMouseInteraction";
import type { Point } from "@/types";
import { generateSmoothPath, findClosestSegment } from "@/utils/shapeHelpers";

const store = useDrawingStore();

const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const textInputVisible = ref(false);
const textInputPosition = ref({ x: 0, y: 0 } as Point); // Screen position for display
const textInputSVGPosition = ref({ x: 0, y: 0 } as Point); // SVG position for drawing
const textInputValue = ref("");
const textInputRef = ref<HTMLTextAreaElement | null>(null);
const panStartPoint = ref<Point | null>(null);
const start = ref<Point | null>(null);

const {
  draw,
  stopDrawing,
  drawText,
  getBaseSVGCoordinates,
  previewShape,
  startDrawing,
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

const findClickedPointIndex = (coords: Point): number => {
  if (!store.pointEditSelectedShape) {
    return -1;
  }
  const points = store.pointEditSelectedShape.getDraggablePoints();
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const dx = point.x - coords.x;
    const dy = point.y - coords.y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared <= 25) {
      // Within radius of 5
      return i;
    }
  }
  return -1;
};

const onPointEditClick = (coords: Point, event: MouseEvent) => {
  const modifySelection = event.metaKey || event.ctrlKey;

  if (!store.pointEditSelectedShape) {
    const shapesAtPoint = store.shapes.find((shape) =>
      shape.bounds.containsPoint(coords)
    );
    if (shapesAtPoint) {
      store.setPointEditSelectedShape(shapesAtPoint.id);
    }
    return;
  }

  const clickedPointIndex = findClickedPointIndex(coords);
  if (modifySelection) {
    const index = store.selectedPointIndices.indexOf(clickedPointIndex);
    if (index !== -1) {
      store.selectedPointIndices.splice(index, 1);
    } else {
      store.selectedPointIndices.push(clickedPointIndex);
    }
    return;
  }

  if (clickedPointIndex === -1) {
    const insideSelectedShape = store.shapes.find(
      (shape) =>
        shape.bounds.containsPoint(coords) &&
        shape.id === store.pointEditSelectedShape?.id
    );
    if (insideSelectedShape) {
      store.setSelectedPointIndices([]);
    } else {
      store.setPointEditSelectedShape(null);
    }
  } else {
    store.setSelectedPointIndices([clickedPointIndex]);
  }
};

const onSelectClick = (coords: Point, event: MouseEvent) => {
  const modifySelection = event.metaKey || event.ctrlKey;
  const shapesAtPoint = store.shapes.filter((shape) =>
    shape.bounds.containsPoint(coords)
  );

  if (shapesAtPoint.length > 0) {
    const topShape = shapesAtPoint[shapesAtPoint.length - 1];

    if (modifySelection) {
      if (store.selectedShapeIds.includes(topShape.id)) {
        store.toggleShapeSelection(topShape.id);
      } else {
        store.selectShape(topShape.id, true);
      }
    } else {
      store.selectShape(topShape.id);
    }
  } else {
    if (!modifySelection) {
      store.clearSelection();
    }
  }
};

const onSelectDragStart = (coords: Point) => {
  const shapesAtPoint = store.shapes.filter((shape) =>
    shape.bounds.containsPoint(coords)
  );

  if (store.selectedShapeIds.length === 0 && shapesAtPoint.length > 0) {
    store.selectedShapeIds.push(shapesAtPoint[0].id);
    store.isDragMoving = true;
    start.value = { ...coords };
    return;
  }
  if (shapesAtPoint.length > 0) {
    const clickedOnSelectedShape = shapesAtPoint.some((shape) =>
      store.selectedShapeIds.includes(shape.id)
    );

    if (clickedOnSelectedShape) {
      // Start dragging shapes
      store.isDragMoving = true;
      start.value = { ...coords };
      return;
    }
  }

  store.startDragSelection(coords.x, coords.y);
};

const onPointEditDragStart = (coords: Point) => {
  const selectedShape = store.pointEditSelectedShape;
  if (!selectedShape) {
    return;
  }
  const clickedPointIndex = findClickedPointIndex(coords);

  if (clickedPointIndex === -1) {
    store.startDragSelection(coords.x, coords.y);
    return;
  }
  if (!store.selectedPointIndices.includes(clickedPointIndex)) {
    store.setSelectedPointIndices([clickedPointIndex]);
  }
  start.value = { ...coords };
  store.isDragMoving = true;
};

const onClick = (coords: Point, event: MouseEvent) => {
  if (store.currentTool === "pointEdit") {
    onPointEditClick(coords, event);
  } else if (store.currentTool === "select") {
    onSelectClick(coords, event);
  } else if (store.currentTool === "text") {
    // Show text input at click position
    textInputPosition.value = { x: event.clientX, y: event.clientY };
    textInputSVGPosition.value = { x: coords.x, y: coords.y };
    textInputValue.value = "";
    textInputVisible.value = true;
    // Focus input after render
    setTimeout(() => {
      textInputRef.value?.focus();
    }, 0);
  }
  // For drawing tools, do nothing on click
};

const onDragStart = (coords: Point) => {
  if (store.currentTool === "pointEdit") {
    onPointEditDragStart(coords);
  } else if (store.currentTool === "select") {
    onSelectDragStart(coords);
  } else {
    // Start drawing
    startDrawing(coords.x, coords.y);
  }
};

const onDragUpdate = (coords: Point) => {
  if (store.isDragMoving) {
    if (store.currentTool === "select") {
      onShapeMove(coords);
    }
    if (store.currentTool === "pointEdit") {
      onPointEditMove(coords);
    }
    start.value = { ...coords };

    return;
  }
  if (store.isDragSelecting) {
    store.updateDragSelection(coords.x, coords.y);
  } else if (isCurrentlyDrawing.value) {
    draw(coords.x, coords.y);
  }
};

const onShapeMove = (coords: Point) => {
  const deltaX = coords.x - start.value!.x;
  const deltaY = coords.y - start.value!.y;
  store.selectedShapes.forEach((shape) => {
    shape.move(deltaX, deltaY);
  });
};

const onDragEnd = (_coords: Point) => {
  if (store.isDragSelecting) {
    store.finishDragSelection();
  } else if (store.isDragMoving) {
    store.isDragMoving = false;
  } else if (isCurrentlyDrawing.value) {
    stopDrawing();
    isCurrentlyDrawing.value = false;
  }
};

const mouseInteraction = useMouseInteraction({
  onClick,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  getSVGCoordinates,
});

const onPointEditMove = (coords: Point) => {
  const deltaX = coords.x - start.value!.x;
  const deltaY = coords.y - start.value!.y;
  if (store.pointEditSelectedShape && store.selectedPointIndices.length > 0) {
    const draggablePoints = store.pointEditSelectedShape.getDraggablePoints();
    for (const index of store.selectedPointIndices) {
      store.pointEditSelectedShape.updateDraggablePoint(index, {
        x: draggablePoints[index].x + deltaX,
        y: draggablePoints[index].y + deltaY,
      });
    }
  }
};

const isCurrentlyDrawing = ref(false);

const handleMouseDown = (event: MouseEvent) => {
  if (textInputVisible.value) {
    return;
  }

  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    panStartPoint.value = { x: event.clientX, y: event.clientY };
    store.startPanning();
    event.preventDefault();
    return;
  }

  mouseInteraction.handleMouseDown(event);
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

  mouseInteraction.handleMouseMove(event);
};

const handleMouseUp = (event: MouseEvent) => {
  // Stop panning
  if (store.isPanning) {
    store.stopPanning();
    panStartPoint.value = null;
    return;
  }

  mouseInteraction.handleMouseUp(event);
};

const handleMouseLeave = () => {
  // Stop panning
  if (store.isPanning) {
    store.stopPanning();
    panStartPoint.value = null;
  }

  mouseInteraction.handleMouseLeave();
};

const handleDoubleClick = (event: MouseEvent) => {
  if (
    store.currentTool === "pointEdit" &&
    store.pointEditSelectedShape?.type === "draw"
  ) {
    const coords = getSVGCoordinates(event);
    const points = store.pointEditSelectedShape.points.value;

    if (points.length >= 2) {
      const { insertIndex } = findClosestSegment(points, coords);

      // Insert the new point at cursor position
      points.splice(insertIndex, 0, coords);

      // Update the shape
      store.pointEditSelectedShape.points.value = [...points];

      // Save state
      store.saveStateToBackend();
    }
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

onMounted(async () => {
  const svg = svgRef.value;
  const container = containerRef.value;

  if (svg && container) {
    // Set SVG size to container size
    svg.setAttribute("width", container.clientWidth.toString());
    svg.setAttribute("height", container.clientHeight.toString());

    // Load saved state
    await store.loadStateFromBackend();

    // Fit view to cover all shapes
    store.fitView(container.clientWidth, container.clientHeight);
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
      @dblclick="handleDoubleClick"
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
            v-if="shape.type === 'line'"
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
            v-else-if="shape.type === 'rectangle'"
            :x="shape.drawBounds.value.left"
            :y="shape.drawBounds.value.top"
            :width="shape.drawBounds.value.width"
            :height="shape.drawBounds.value.height"
            :stroke="shape.color.value"
            :stroke-width="shape.lineWidth.value"
            fill="none"
          />

          <!-- Freehand drawing -->
          <path
            v-else-if="shape.type === 'draw'"
            :d="generateSmoothPath(shape.points.value)"
            :stroke="shape.color.value"
            :stroke-width="shape.lineWidth.value"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />

          <!-- Text -->
          <text
            v-else-if="shape.type === 'text'"
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
            v-else-if="shape.type === 'image'"
            :href="shape.imageData.value"
            :x="shape.startPoint.value.x"
            :y="shape.startPoint.value.y"
            :width="shape.imageWidth?.value || 100"
            :height="shape.imageHeight?.value || 100"
          />

          <!-- Arrows -->
          <g v-else-if="shape.type === 'arrow'">
            <path
              :d="shape.path.value[0]"
              :stroke="shape.color.value"
              :stroke-width="shape.lineWidth.value"
              stroke-linecap="round"
              stroke-linejoin="bevel"
            />
            <path
              :d="shape.path.value[1]"
              :fill="shape.color.value"
              stroke-linecap="round"
              stroke-linejoin="bevel"
            />
          </g>
        </g>

        <!-- Selection boxes -->
        <rect
          v-for="(bounds, index) in selectionBounds"
          v-if="store.currentTool === 'select'"
          :key="'selection-' + index"
          class="selection-box"
          :x="bounds.left - 3"
          :y="bounds.top - 3"
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
          :x="store.dragSelectBounds.left"
          :y="store.dragSelectBounds.top"
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
          :x="bounds.left - 3"
          :y="bounds.top - 3"
          :width="bounds.width + 6"
          :height="bounds.height + 6"
          stroke="#FF8800"
          stroke-width="2"
          stroke-dasharray="4,4"
          fill="none"
          pointer-events="none"
        />

        <!-- Draggable points for point edit -->
        <g
          v-if="
            store.currentTool === 'pointEdit' && store.pointEditSelectedShape
          "
        >
          <circle
            v-for="(
              point, index
            ) in store.pointEditSelectedShape.getDraggablePoints()"
            :key="'point-' + index"
            :cx="point.x"
            :cy="point.y"
            r="5"
            :fill="
              store.selectedPointIndices.includes(index)
                ? '#FF0000'
                : store.dragSelectPreviewPointIndices.includes(index)
                ? '#FF8800'
                : '#3B82F6'
            "
            stroke="#FFFFFF"
            stroke-width="2"
            style="cursor: move"
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
