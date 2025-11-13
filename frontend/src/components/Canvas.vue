<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useDrawingStore } from "@/stores/drawing";
import { useCanvasDrawing } from "@/composables/useCanvasDrawing";
import { useMouseInteraction } from "@/composables/useMouseInteraction";
import { generateSmoothPath, findClosestSegment } from "@/utils/shapeHelpers";
import { Point } from "@/utils/Point";
import { Vector } from "@/utils/Vector";

const store = useDrawingStore();

const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const textInputVisible = ref(false);
const textInputPosition = ref(new Point(0, 0)); // Screen position for display
const textInputSVGPosition = ref(new Point(0, 0)); // SVG position for drawing
const textInputValue = ref("");
const textInputRef = ref<HTMLTextAreaElement | null>(null);
const panStartPoint = ref<Point | null>(null);
const start = ref<Point | null>(null);

const { draw, stopDrawing, drawText, previewShape, startDrawing, isDrawing } =
  useCanvasDrawing();

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
const getSVGCoordinates = (event: { clientX: number; clientY: number }) => {
  const svg = svgRef.value;
  if (!svg) return new Point(0, 0);

  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
  const coords = new Point(svgP.x, svgP.y);
  // Apply inverse transform
  return coords.offset(store.panOffset.scale(-1)).scale(1 / store.zoomLevel);
};

const findClickedPointIndex = (coords: Point): number => {
  if (!store.pointEditSelectedShape) {
    return -1;
  }
  const points = store.pointEditSelectedShape.getDraggablePoints();
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const delta = point.minus(coords);
    if (delta.length <= 5) {
      // Within radius of 5
      return i;
    }
  }
  return -1;
};

const onPointEditClick = (coords: Point, event: MouseEvent) => {
  if (!store.pointEditSelectedShape) {
    const shapesAtPoint = store.shapes.find((shape) =>
      shape.bounds.containsPoint(coords)
    );
    if (shapesAtPoint) {
      store.setPointEditSelectedShape(shapesAtPoint.id);
    }
    return;
  }

  const modifySelection =
    (event.metaKey || event.ctrlKey) &&
    store.pointEditSelectedShape.type === "draw";
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
      store.toggleShapeSelection(topShape.id);
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

  if (!shapesAtPoint.length) {
    store.startDragSelection(coords);
    return;
  }
  start.value = coords;
  store.isDragMoving = true;

  if (!store.selectedShapeIds.length) {
    store.selectedShapeIds = [shapesAtPoint[0].id];
    return;
  }

  const clickedOnSelectedShape = shapesAtPoint.some((shape) =>
    store.selectedShapeIds.includes(shape.id)
  );

  if (!clickedOnSelectedShape) {
    store.selectedShapeIds = [shapesAtPoint[0].id];
  }
};

const onPointEditDragStart = (coords: Point) => {
  const selectedShape = store.pointEditSelectedShape;
  if (!selectedShape) {
    return;
  }
  const clickedPointIndex = findClickedPointIndex(coords);

  if (clickedPointIndex === -1 && selectedShape.type === "draw") {
    store.startDragSelection(coords);
    return;
  }
  if (clickedPointIndex === -1) {
    return;
  }
  if (!store.selectedPointIndices.includes(clickedPointIndex)) {
    store.setSelectedPointIndices([clickedPointIndex]);
  }
  start.value = coords;
  store.isDragMoving = true;
};

const onClick = (coords: Point, event: MouseEvent) => {
  if (store.currentTool === "pointEdit") {
    onPointEditClick(coords, event);
  } else if (store.currentTool === "select") {
    onSelectClick(coords, event);
  } else if (store.currentTool === "text") {
    // Show text input at click position
    textInputPosition.value = new Point(event.clientX, event.clientY);
    textInputSVGPosition.value = coords;
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
    startDrawing(coords);
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
    start.value = coords;

    return;
  }
  if (store.isDragSelecting) {
    store.updateDragSelection(coords);
  } else if (isDrawing.value) {
    draw(coords);
  }
};

const onShapeMove = (coords: Point) => {
  const delta = coords.minus(start.value!);
  store.selectedShapes.forEach((shape) => {
    shape.move(delta);
  });
};

const onDragEnd = (_coords: Point) => {
  if (store.isDragSelecting) {
    store.finishDragSelection();
  } else if (store.isDragMoving) {
    store.isDragMoving = false;
  } else if (isDrawing.value) {
    stopDrawing();
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
  const delta = coords.minus(start.value!);
  if (!store.pointEditSelectedShape || !store.selectedPointIndices.length) {
    return;
  }
  if (store.pointEditSelectedShape.type === "draw") {
    const draggablePoints = store.pointEditSelectedShape.getDraggablePoints();
    for (const index of store.selectedPointIndices) {
      store.pointEditSelectedShape.updateDraggablePoint(
        index,
        draggablePoints[index].offset(delta)
      );
    }
  } else {
    store.pointEditSelectedShape.updateDraggablePoint(
      store.selectedPointIndices[0],
      coords
    );
  }
};

const handleMouseDown = (event: MouseEvent) => {
  if (textInputVisible.value) {
    return;
  }

  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    panStartPoint.value = new Point(event.clientX, event.clientY);
    store.startPanning();
    event.preventDefault();
    return;
  }

  mouseInteraction.handleMouseDown(event);
};

const handleMouseMove = (event: MouseEvent) => {
  // Handle panning
  const clientPoint = new Point(event.clientX, event.clientY);
  if (store.isPanning && panStartPoint.value) {
    const delta = clientPoint.minus(panStartPoint.value);
    const newPan = store.panOffset.add(delta);
    store.setPanOffset(newPan);

    panStartPoint.value = clientPoint;
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

  // Detect pinch zoom (ctrlKey is set on macOS for pinch gestures)
  if (event.ctrlKey) {
    // Pinch zoom
    const focus = getSVGCoordinates(event);
    const delta = -event.deltaY * 0.01;
    const newZoom = store.zoomLevel * (1 + delta);

    // Adjust pan to zoom towards the cursor position
    const zoomDelta = store.zoomLevel - newZoom;
    const newPan = store.panOffset.add(focus.asVector().scale(zoomDelta));
    store.setPanOffset(newPan);
    store.setZoomLevel(newZoom);
  } else {
    // Two-finger pan (deltaX and deltaY are present)
    // Standard mouse wheel will only have deltaY typically
    const panDelta = new Vector(-event.deltaX, -event.deltaY);
    const newPan = store.panOffset.add(panDelta);
    store.setPanOffset(newPan);
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
    drawText(textInputSVGPosition.value, trimmedText);
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
        <!-- Canvas bounds background -->
        <defs>
          <pattern
            id="transparency-grid"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <rect x="0" y="0" width="10" height="10" fill="#E5E7EB" />
            <rect x="10" y="0" width="10" height="10" fill="#F3F4F6" />
            <rect x="0" y="10" width="10" height="10" fill="#F3F4F6" />
            <rect x="10" y="10" width="10" height="10" fill="#E5E7EB" />
          </pattern>
        </defs>
        <rect
          :x="store.canvasBounds.x"
          :y="store.canvasBounds.y"
          :width="store.canvasBounds.width"
          :height="store.canvasBounds.height"
          fill="url(#transparency-grid)"
          stroke="#CBD5E1"
          stroke-width="2"
          stroke-dasharray="8,4"
        />

        <!-- Clipping group for shapes -->
        <defs v-if="store.cropViewport">
          <clipPath id="canvas-clip">
            <rect
              :x="store.canvasBounds.x"
              :y="store.canvasBounds.y"
              :width="store.canvasBounds.width"
              :height="store.canvasBounds.height"
            />
          </clipPath>
        </defs>

        <!-- Render all shapes including preview -->
        <g :clip-path="store.cropViewport ? 'url(#canvas-clip)' : undefined">
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
              :x="shape.bounds.left"
              :y="shape.bounds.top"
              :width="shape.bounds.width"
              :height="shape.bounds.height"
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
        </g>

        <!-- Selection boxes (outside clipping) -->
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

        <!-- Drag selection box (outside clipping) -->
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

        <!-- Preview boxes for drag selection (outside clipping) -->
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

        <!-- Draggable points for point edit (outside clipping) -->
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
