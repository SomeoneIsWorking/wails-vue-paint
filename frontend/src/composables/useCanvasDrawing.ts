import { ref, type Ref } from "vue";
import type { Shape, Point } from "@/types";
import { useDrawingStore } from "@/stores/drawing";
import { generateShapeId, calculateBounds, moveShape } from "@/utils/shapeHelpers";

export function useCanvasDrawing(svgRef: Ref<SVGSVGElement | null>) {
  const store = useDrawingStore();

  const isDrawing = ref(false);
  const isDraggingShapes = ref(false);
  const startX = ref(0);
  const startY = ref(0);
  const lastX = ref(0);
  const lastY = ref(0);
  const currentDrawingPoints = ref<Point[]>([]);
  const previewShape = ref<Shape | null>(null);

  function getSVGCoordinates(event: MouseEvent): Point {
    const svg = svgRef.value;
    if (!svg) return { x: 0, y: 0 };
    
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }

  function startDrawing(x: number, y: number, event?: MouseEvent) {
    if (store.currentTool === "select") {
      const target = event?.target as SVGElement;
      const shapeId = target?.getAttribute("data-shape-id");

      if (shapeId && store.selectedShapeIds.includes(shapeId)) {
        // Start dragging selected shapes
        isDraggingShapes.value = true;
        startX.value = x;
        startY.value = y;
        return;
      } else if (target === svgRef.value || target.tagName === "svg" || target.tagName === "g") {
        // Start drag selection on empty space
        store.startDragSelection(x, y);
        return;
      }
      return;
    }

    // Clear selection when starting new drawing
    store.clearSelection();

    isDrawing.value = true;
    startX.value = x;
    startY.value = y;
    lastX.value = x;
    lastY.value = y;
    currentDrawingPoints.value = [{ x, y }];

    // Create preview shape for all drawing tools
    if (["line", "rectangle", "arrow"].includes(store.currentTool)) {
      previewShape.value = {
        id: "preview",
        type: store.currentTool as any,
        color: store.currentColor,
        lineWidth: store.lineWidth,
        startPoint: { x, y },
        endPoint: { x, y },
        bounds: { x: 0, y: 0, width: 0, height: 0 },
      };
    } else if (store.currentTool === "draw") {
      previewShape.value = {
        id: "preview",
        type: "draw",
        color: store.currentColor,
        lineWidth: store.lineWidth,
        points: [{ x, y }],
        bounds: { x: 0, y: 0, width: 0, height: 0 },
      };
    }
  }

  function draw(x: number, y: number) {
    // Handle drag selection
    if (store.isDragSelecting) {
      store.updateDragSelection(x, y);
      return;
    }

    // Handle shape dragging
    if (isDraggingShapes.value && store.selectedShapeIds.length > 0) {
      const deltaX = x - startX.value;
      const deltaY = y - startY.value;

      store.selectedShapes.forEach((shape) => {
        moveShape(shape, deltaX, deltaY);
      });

      startX.value = x;
      startY.value = y;
      return;
    }

    if (!isDrawing.value) return;

    lastX.value = x;
    lastY.value = y;

    // Update preview shape
    if (previewShape.value) {
      if (previewShape.value.type === "draw") {
        currentDrawingPoints.value.push({ x, y });
        previewShape.value.points = [...currentDrawingPoints.value];
      } else {
        previewShape.value.endPoint = { x, y };
      }
    }
  }

  function stopDrawing(): Shape | null {
    // Finish drag selection
    if (store.isDragSelecting) {
      store.finishDragSelection();
      return null;
    }

    // Finish shape dragging
    if (isDraggingShapes.value) {
      isDraggingShapes.value = false;
      return null;
    }

    if (!isDrawing.value) return null;

    // Clear preview
    previewShape.value = null;

    // Create the final shape
    const newShape: Shape = {
      id: generateShapeId(),
      type: store.currentTool as any,
      color: store.currentColor,
      lineWidth: store.lineWidth,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    };

    if (store.currentTool === "draw") {
      newShape.points = [...currentDrawingPoints.value];
    } else if (["line", "rectangle", "arrow"].includes(store.currentTool)) {
      newShape.startPoint = { x: startX.value, y: startY.value };
      newShape.endPoint = { x: lastX.value, y: lastY.value };
    }

    newShape.bounds = calculateBounds(newShape);

    // Only add shape if it has actual size
    if (
      newShape.bounds.width > 1 ||
      newShape.bounds.height > 1 ||
      (newShape.points && newShape.points.length > 1)
    ) {
      store.addShape(newShape);
      store.selectShape(newShape.id);

      isDrawing.value = false;
      currentDrawingPoints.value = [];
      return newShape;
    }

    isDrawing.value = false;
    currentDrawingPoints.value = [];
    return null;
  }

  function drawText(x: number, y: number, text: string): Shape {
    const newShape: Shape = {
      id: generateShapeId(),
      type: "text",
      color: store.currentColor,
      lineWidth: store.lineWidth,
      startPoint: { x, y },
      text,
      fontSize: store.fontSize,
      fontFamily: store.fontFamily,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    };

    newShape.bounds = calculateBounds(newShape);
    store.addShape(newShape);
    store.selectShape(newShape.id);
    return newShape;
  }

  function updateShapeProperty(
    shapeId: string,
    property: keyof Shape,
    value: any
  ) {
    const shape = store.shapes.find((s) => s.id === shapeId);
    if (shape) {
      const updates: Partial<Shape> = { [property]: value };
      if (
        property === "startPoint" ||
        property === "endPoint" ||
        property === "points"
      ) {
        updates.bounds = calculateBounds({ ...shape, ...updates });
      }
      store.updateShape(shapeId, updates);
    }
  }

  function clearShapes() {
    store.clearShapes();
  }

  function deleteSelectedShapes() {
    store.deleteSelectedShapes();
  }

  return {
    startDrawing,
    draw,
    stopDrawing,
    drawText,
    updateShapeProperty,
    clearShapes,
    deleteSelectedShapes,
    getSVGCoordinates,
    previewShape,
  };
}
