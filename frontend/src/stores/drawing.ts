import { defineStore } from "pinia";
import { ref, computed, shallowRef } from "vue";
import type { ToolType, SelectionMode } from "../types";
import {
  boundsIntersect,
  boundsContainsBounds,
  calculateBoundsOverlapPercentage,
  serializeShapes,
} from "../utils/shapeHelpers";
import { createShapeFromData, Shape } from "../composables/shapes";

// @ts-ignore
import { SaveState, LoadState } from "../../wailsjs/go/main/App";

export const useDrawingStore = defineStore("drawing", () => {
  // Tool state
  const currentTool = ref<ToolType>("select");
  const selectionMode = ref<SelectionMode>("half");

  // Drawing properties
  const currentColor = ref<string | undefined>("#000000");
  const lineWidth = ref<number | undefined>(2);
  const fontSize = ref<number | undefined>(16);
  const fontFamily = ref<string | undefined>("Arial");
  const smoothing = ref<number | undefined>(2);

  // Shapes and selection
  const shapes = shallowRef<Shape[]>([]);
  const selectedShapeIds = ref<string[]>([]);

  // Drawing state
  const isDrawing = ref(false);
  const isDraggingShapes = ref(false);
  const isDragSelecting = ref(false);
  const dragSelectStart = ref<{ x: number; y: number } | null>(null);
  const dragSelectEnd = ref<{ x: number; y: number } | null>(null);

  // Point editing state
  const draggedPointIndex = ref<number | null>(null);

  // Pan and zoom state
  const panOffset = ref({ x: 0, y: 0 });
  const zoomLevel = ref(1);
  const isPanning = ref(false);

  // Debounce timeout for backend saves
  const saveTimeout = ref<number | null>(null);

  // Helper function to get common value or undefined
  function getCommonValue<T>(shapes: Shape[], property: string): T | undefined {
    if (shapes.length === 0) return undefined;
    const values = shapes
      .filter((s) => property in s)
      .map((s) => (s as any)[property].value);
    const first = values[0];
    if (values.every((v) => v === first)) return first;
    return undefined;
  }

  // Function to sync current properties from selection
  function syncCurrentProperties() {
    const selected = selectedShapes.value;
    if (selected.length === 0) {
      // Set to defaults when no selection
      currentColor.value = "#000000";
      lineWidth.value = 2;
      fontSize.value = 16;
      fontFamily.value = "Arial";
      smoothing.value = 2;
      return;
    }
    currentColor.value = getCommonValue(selected, "color");
    lineWidth.value = getCommonValue(selected, "lineWidth");
    fontSize.value = getCommonValue(selected, "fontSize");
    fontFamily.value = getCommonValue(selected, "fontFamily");
    smoothing.value = getCommonValue(selected, "smoothing");
  }

  // Computed
  const selectedShapes = computed(() =>
    shapes.value.filter((shape) => selectedShapeIds.value.includes(shape.id))
  );

  const hasSelection = computed(() => selectedShapeIds.value.length > 0);

  const pointEditSelectedShape = computed(() => {
    const firstId = selectedShapeIds.value[0];
    if (!firstId) return null;
    return shapes.value.find((s) => s.id === firstId) || null;
  });

  const dragSelectBounds = computed(() => {
    if (!dragSelectStart.value || !dragSelectEnd.value) return null;

    const x = Math.min(dragSelectStart.value.x, dragSelectEnd.value.x);
    const y = Math.min(dragSelectStart.value.y, dragSelectEnd.value.y);
    const width = Math.abs(dragSelectEnd.value.x - dragSelectStart.value.x);
    const height = Math.abs(dragSelectEnd.value.y - dragSelectStart.value.y);

    return { x, y, width, height };
  });

  // Preview shapes that would be selected during drag selection
  const dragSelectPreviewShapeIds = computed(() => {
    if (!isDragSelecting.value || !dragSelectBounds.value) return [];

    const bounds = dragSelectBounds.value;
    const previewIds: string[] = [];

    for (const shape of shapes.value) {
      if (isShapeInSelection(shape, bounds)) {
        previewIds.push(shape.id);
      }
    }

    return previewIds;
  });

  function isShapeInSelection(
    shape: Shape,
    selectionBounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    const shapeBounds = shape.bounds;

    switch (selectionMode.value) {
      case "intersect":
        return boundsIntersect(shapeBounds, selectionBounds);

      case "cover":
        return boundsContainsBounds(selectionBounds, shapeBounds);

      case "half":
        return (
          calculateBoundsOverlapPercentage(shapeBounds, selectionBounds) >= 0.5
        );

      default:
        return false;
    }
  }

  // Actions
  function setTool(tool: ToolType) {
    currentTool.value = tool;
    switch (tool) {
      case "select":
        // Keep selection
        break;
      case "pointEdit":
        // Keep selection
        break;
      default:
        clearSelection();
        draggedPointIndex.value = null;
        break;
    }
  }

  function setSelectionMode(mode: SelectionMode) {
    selectionMode.value = mode;
  }

  function updateSelectedShapes(property: string, value: any) {
    if (hasSelection.value) {
      let hasUpdates = false;
      selectedShapeIds.value.forEach((id) => {
        const shape = shapes.value.find((s) => s.id === id);
        if (shape && (shape as any)[property]) {
          (shape as any)[property].value = value;
          hasUpdates = true;
        }
      });
      if (hasUpdates) {
        // Debounce the save
        if (saveTimeout.value) clearTimeout(saveTimeout.value);
        saveTimeout.value = setTimeout(() => {
          saveStateToBackend();
          saveTimeout.value = null;
        }, 300) as any as number;
      }
    }
  }

  function setColor(color: string) {
    currentColor.value = color;
    updateSelectedShapes("color", color);
  }

  function setLineWidth(width: number) {
    lineWidth.value = width;
    updateSelectedShapes("lineWidth", width);
  }

  function setFontSize(size: number) {
    fontSize.value = size;
    updateSelectedShapes("fontSize", size);
  }

  function setFontFamily(family: string) {
    fontFamily.value = family;
    updateSelectedShapes("fontFamily", family);
  }

  function setSmoothing(value: number) {
    smoothing.value = value;
    updateSelectedShapes("smoothing", value);
  }

  function addShape(shape: Shape) {
    shapes.value.push(shape);
    saveStateToBackend();
  }

  function deleteShape(shapeId: string) {
    const index = shapes.value.findIndex((s) => s.id === shapeId);
    if (index !== -1) {
      shapes.value.splice(index, 1);
      saveStateToBackend();
    }
  }

  function deleteSelectedShapes() {
    shapes.value = shapes.value.filter(
      (shape) => !selectedShapeIds.value.includes(shape.id)
    );
    selectedShapeIds.value = [];
    syncCurrentProperties();
    saveStateToBackend();
  }

  function selectShape(shapeId: string, addToSelection = false) {
    if (addToSelection) {
      if (!selectedShapeIds.value.includes(shapeId)) {
        selectedShapeIds.value.push(shapeId);
      }
    } else {
      selectedShapeIds.value = [shapeId];
    }

    // Auto-switch to select tool when selection becomes non-empty
    if (
      selectedShapeIds.value.length > 0 &&
      currentTool.value !== "select" &&
      currentTool.value !== "pointEdit"
    ) {
      currentTool.value = "select";
    }

    syncCurrentProperties();
  }

  function toggleShapeSelection(shapeId: string) {
    const index = selectedShapeIds.value.indexOf(shapeId);
    if (index !== -1) {
      selectedShapeIds.value.splice(index, 1);
    } else {
      selectedShapeIds.value.push(shapeId);
    }
    syncCurrentProperties();
  }

  function selectMultipleShapes(shapeIds: string[]) {
    selectedShapeIds.value = [...shapeIds];

    // Auto-switch to select tool when selection becomes non-empty
    if (
      selectedShapeIds.value.length > 0 &&
      currentTool.value !== "select" &&
      currentTool.value !== "pointEdit"
    ) {
      currentTool.value = "select";
    }

    syncCurrentProperties();
  }

  function clearSelection() {
    selectedShapeIds.value = [];
    syncCurrentProperties();
  }

  function clearShapes() {
    shapes.value = [];
    selectedShapeIds.value = [];
    saveStateToBackend();
  }

  function startDragSelection(x: number, y: number) {
    // Deselect everything first
    selectedShapeIds.value = [];

    isDragSelecting.value = true;
    dragSelectStart.value = { x, y };
    dragSelectEnd.value = { x, y };
  }

  function updateDragSelection(x: number, y: number) {
    if (isDragSelecting.value) {
      dragSelectEnd.value = { x, y };
    }
  }

  function finishDragSelection() {
    if (isDragSelecting.value && dragSelectBounds.value) {
      const bounds = dragSelectBounds.value;
      const selected: string[] = [];

      for (const shape of shapes.value) {
        if (isShapeInSelection(shape, bounds)) {
          selected.push(shape.id);
        }
      }

      selectMultipleShapes(selected);
    }

    isDragSelecting.value = false;
    dragSelectStart.value = null;
    dragSelectEnd.value = null;
  }

  function cancelDragSelection() {
    isDragSelecting.value = false;
    dragSelectStart.value = null;
    dragSelectEnd.value = null;
  }

  function setPanOffset(x: number, y: number) {
    panOffset.value = { x, y };
  }

  function setZoomLevel(zoom: number) {
    zoomLevel.value = Math.max(0.1, Math.min(5, zoom));
  }

  function startPanning() {
    isPanning.value = true;
  }

  function stopPanning() {
    isPanning.value = false;
  }

  function setPointEditSelectedShape(shapeId: string | null) {
    selectedShapeIds.value = shapeId ? [shapeId] : [];
    draggedPointIndex.value = null;
    syncCurrentProperties();
  }

  function setDraggedPointIndex(index: number | null) {
    draggedPointIndex.value = index;
  }

  function fitView(viewportWidth: number, viewportHeight: number) {
    if (shapes.value.length === 0) {
      zoomLevel.value = 1;
      panOffset.value = { x: 0, y: 0 };
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const shape of shapes.value) {
      const bounds = shape.bounds;
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;

    if (boundsWidth === 0 || boundsHeight === 0) {
      zoomLevel.value = 1;
      panOffset.value = { x: 0, y: 0 };
      return;
    }

    const scaleX = viewportWidth / boundsWidth;
    const scaleY = viewportHeight / boundsHeight;
    const zoom = Math.min(scaleX, scaleY) * 0.9; // Add some padding

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const panX = viewportWidth / 2 - centerX * zoom;
    const panY = viewportHeight / 2 - centerY * zoom;

    zoomLevel.value = zoom || 1;
    panOffset.value = { x: panX || 0, y: panY || 0 };
  }

  // Save state to backend
  async function saveStateToBackend() {
    try {
      const state = {
        shapes: serializeShapes(shapes.value),
        currentTool: currentTool.value,
        currentColor: currentColor.value,
        lineWidth: lineWidth.value,
        fontSize: fontSize.value,
        fontFamily: fontFamily.value,
        smoothing: smoothing.value,
        selectionMode: selectionMode.value,
        selectedShapeIds: selectedShapeIds.value,
        panOffset: panOffset.value,
        zoomLevel: zoomLevel.value,
        draggedPointIndex: draggedPointIndex.value,
      };
      await SaveState(JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  }

  // Load state from backend
  async function loadStateFromBackend() {
    try {
      const stateJSON = await LoadState();
      if (stateJSON) {
        const state = JSON.parse(stateJSON);
        shapes.value = state.shapes
          ? state.shapes.map(createShapeFromData)
          : [];
        console.log("State loaded successfully");
      }
    } catch (error) {
      console.error("Failed to load state:", error);
    }
  }

  return {
    // State
    currentTool,
    selectionMode,
    currentColor,
    lineWidth,
    fontSize,
    fontFamily,
    smoothing,
    shapes,
    selectedShapeIds,
    isDrawing,
    isDraggingShapes,
    isDragSelecting,
    dragSelectStart,
    dragSelectEnd,
    panOffset,
    zoomLevel,
    isPanning,
    draggedPointIndex,

    // Computed
    selectedShapes,
    hasSelection,
    dragSelectBounds,
    dragSelectPreviewShapeIds,
    pointEditSelectedShape,

    // Actions
    setTool,
    setSelectionMode,
    setColor,
    setLineWidth,
    setFontSize,
    setFontFamily,
    setSmoothing,
    addShape,
    deleteShape,
    deleteSelectedShapes,
    selectShape,
    toggleShapeSelection,
    selectMultipleShapes,
    clearSelection,
    clearShapes,
    startDragSelection,
    updateDragSelection,
    finishDragSelection,
    cancelDragSelection,
    setPanOffset,
    setZoomLevel,
    startPanning,
    stopPanning,
    isShapeInSelection,
    loadStateFromBackend,
    setPointEditSelectedShape,
    setDraggedPointIndex,
    fitView,
    saveStateToBackend,
  };
});
