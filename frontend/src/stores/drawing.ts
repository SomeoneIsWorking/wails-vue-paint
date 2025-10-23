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
  const currentColor = ref("#000000");
  const lineWidth = ref(2);
  const fontSize = ref(16);
  const fontFamily = ref("Arial");

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
  const pointEditSelectedShapeId = ref<string | null>(null);
  const draggedPointIndex = ref<number | null>(null);

  // Pan and zoom state
  const panOffset = ref({ x: 0, y: 0 });
  const zoomLevel = ref(1);
  const isPanning = ref(false);

  // Computed
  const selectedShapes = computed(() =>
    shapes.value.filter((shape) => selectedShapeIds.value.includes(shape.id))
  );

  const hasSelection = computed(() => selectedShapeIds.value.length > 0);

  const pointEditSelectedShape = computed(() => {
    if (!pointEditSelectedShapeId.value) return null;
    return (
      shapes.value.find((s) => s.id === pointEditSelectedShapeId.value) || null
    );
  });

  const selectionHasMultipleColors = computed(() => {
    if (selectedShapes.value.length <= 1) return false;
    const colors = new Set(selectedShapes.value.map((s) => s.color));
    return colors.size > 1;
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

  // Actions
  function setTool(tool: ToolType) {
    currentTool.value = tool;
    if (tool !== "select") {
      clearSelection();
    }
    if (tool !== "pointEdit") {
      pointEditSelectedShapeId.value = null;
      draggedPointIndex.value = null;
    }
  }

  function setSelectionMode(mode: SelectionMode) {
    selectionMode.value = mode;
  }

  function setColor(color: string) {
    currentColor.value = color;
    // Update all selected shapes
    if (hasSelection.value) {
      let hasUpdates = false;
      selectedShapeIds.value.forEach((id) => {
        const shape = shapes.value.find((s) => s.id === id);
        if (shape) {
          shape.color.value = color;
          hasUpdates = true;
        }
      });
      if (hasUpdates) {
        saveStateToBackend();
      }
    }
  }

  function setLineWidth(width: number) {
    lineWidth.value = width;
  }

  function setFontSize(size: number) {
    fontSize.value = size;
  }

  function setFontFamily(family: string) {
    fontFamily.value = family;
  }

  function addShape(shape: Shape) {
    shapes.value.push(shape);
    saveStateToBackend();
  }

  function updateShape(shapeId: string, updates: any) {
    const shape = shapes.value.find((s) => s.id === shapeId);
    if (shape) {
      Object.keys(updates).forEach((key) => {
        if (key in shape) {
          // @ts-ignore
          shape[key] = updates[key];
        }
      });
      saveStateToBackend();
    }
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
    if (selectedShapeIds.value.length > 0 && currentTool.value !== "select") {
      currentTool.value = "select";
    }

    // Sync color to first selected shape if single selection
    if (selectedShapeIds.value.length === 1) {
      const shape = shapes.value.find((s) => s.id === shapeId);
      if (shape) {
        currentColor.value = shape.color.value;
      }
    }
  }

  function toggleShapeSelection(shapeId: string) {
    const index = selectedShapeIds.value.indexOf(shapeId);
    if (index !== -1) {
      selectedShapeIds.value.splice(index, 1);
    } else {
      selectedShapeIds.value.push(shapeId);
    }
  }

  function selectMultipleShapes(shapeIds: string[]) {
    selectedShapeIds.value = [...shapeIds];

    // Auto-switch to select tool when selection becomes non-empty
    if (selectedShapeIds.value.length > 0 && currentTool.value !== "select") {
      currentTool.value = "select";
    }
  }

  function clearSelection() {
    selectedShapeIds.value = [];
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
    pointEditSelectedShapeId.value = shapeId;
    draggedPointIndex.value = null;
  }

  function setDraggedPointIndex(index: number | null) {
    draggedPointIndex.value = index;
  }

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

  // Save state to backend
  async function saveStateToBackend() {
    try {
      const state = {
        shapes: serializeShapes(shapes.value), // Serialize to remove element references
        currentTool: currentTool.value,
        currentColor: currentColor.value,
        lineWidth: lineWidth.value,
        fontSize: fontSize.value,
        fontFamily: fontFamily.value,
        selectionMode: selectionMode.value,
        panOffset: panOffset.value,
        zoomLevel: zoomLevel.value,
        pointEditSelectedShapeId: pointEditSelectedShapeId.value,
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
        currentTool.value = state.currentTool || "select";
        currentColor.value = state.currentColor || "#000000";
        lineWidth.value = state.lineWidth || 2;
        fontSize.value = state.fontSize || 16;
        fontFamily.value = state.fontFamily || "Arial";
        selectionMode.value = state.selectionMode || "half";
        panOffset.value = state.panOffset || { x: 0, y: 0 };
        zoomLevel.value = state.zoomLevel || 1;
        pointEditSelectedShapeId.value = state.pointEditSelectedShapeId || null;
        draggedPointIndex.value = state.draggedPointIndex || null;
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
    pointEditSelectedShapeId,
    draggedPointIndex,

    // Computed
    selectedShapes,
    hasSelection,
    selectionHasMultipleColors,
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
    addShape,
    updateShape,
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
    saveStateToBackend,
  };
});
