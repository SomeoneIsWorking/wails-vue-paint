import { ref, shallowRef, type Ref } from "vue";
import { useDrawingStore } from "@/stores/drawing";
import {
  LineShape,
  RectangleShape,
  ArrowShape,
  DrawShape,
  TextShape,
  Shape,
} from "./shapes";
import {
  generateShapeId,
  simplifyPoints,
} from "@/utils/shapeHelpers";
import { Point } from "@/utils/Point";

export function useCanvasDrawing(svgRef: Ref<SVGSVGElement | null>) {
  const store = useDrawingStore();

  const isDrawing = ref(false);
  const isDraggingShapes = ref(false);
  const start = ref<Point | null>(null);
  const last = ref<Point | null>(null);
  const previewShape = shallowRef<Shape | null>(null);

  function getBaseSVGCoordinates(event: MouseEvent): Point {
    const svg = svgRef.value;
    if (!svg) return new Point(0, 0);

    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return new Point(svgP.x, svgP.y);
  }

  function onPointerDown(point: Point, event?: MouseEvent) {
    if (store.currentTool === "select") {
      handleSelectTool(point, event);
    } else {
      startDrawing(point);
    }
  }

  function handleSelectTool(point: Point, event?: MouseEvent) {
    const clickPoint = point;
    const isShiftPressed = event?.shiftKey || false;

    // Find shapes that contain the click point
    const shapesAtPoint = store.shapes.filter((shape) =>
      shape.bounds.containsPoint(clickPoint)
    );

    if (shapesAtPoint.length > 0) {
      // Clicked on one or more shapes
      const topShape = shapesAtPoint[shapesAtPoint.length - 1]; // Last drawn shape (topmost)

      if (isShiftPressed) {
        // Toggle selection
        if (store.selectedShapeIds.includes(topShape.id)) {
          store.toggleShapeSelection(topShape.id);
        } else {
          store.selectShape(topShape.id, true); // Add to selection
        }
      } else {
        // Single selection
        if (!store.selectedShapeIds.includes(topShape.id)) {
          store.selectShape(topShape.id);
        }
      }

      // If there are selected shapes and we clicked within their bounds, start dragging
      const clickedOnSelectedShape = shapesAtPoint.some((shape) =>
        store.selectedShapeIds.includes(shape.id)
      );

      if (clickedOnSelectedShape) {
        isDraggingShapes.value = true;
        start.value = point;
      }
      return;
    } else {
      // Clicked on empty space - start drag selection
      if (!isShiftPressed) {
        store.clearSelection();
      }
      store.startDragSelection(point);
      return;
    }
  }

  function startDrawing(point: Point) {
    // Clear selection when starting new drawing
    store.clearSelection();

    isDrawing.value = true;
    start.value = point;
    last.value = point;

    switch (store.currentTool) {
      case "line":
        previewShape.value = new LineShape(
          "preview",
          store.currentColor!,
          store.lineWidth!,
          point,
          point
        );
        break;
      case "rectangle":
        previewShape.value = new RectangleShape(
          "preview",
          store.currentColor!,
          store.lineWidth!,
          point,
          point
        );
        break;
      case "arrow":
        previewShape.value = new ArrowShape(
          "preview",
          store.currentColor!,
          store.lineWidth!,
          point,
          point
        );
        break;
      case "draw":
        previewShape.value = new DrawShape(
          "preview",
          store.currentColor!,
          store.lineWidth!,
          [point]
        );
        break;
    }
  }

  function draw(point: Point) {
    // Handle drag selection
    if (store.isDragSelecting) {
      store.updateDragSelection(point);
      return;
    }

    // Handle shape dragging
    if (isDraggingShapes.value && store.selectedShapeIds.length > 0) {
      const delta = point.minus(start.value!);

      store.selectedShapes.forEach((shape) => {
        shape.move(delta);
      });

      start.value = point;
      return;
    }

    if (!isDrawing.value) {
      return;
    }

    last.value = point;

    // Update preview shape
    if (previewShape.value) {
      if (previewShape.value.type === "draw") {
        previewShape.value.push(point);
      } else {
        const otherShape = previewShape.value as
          | LineShape
          | RectangleShape
          | ArrowShape;
        otherShape.endPoint.value = point;
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

    // Create the final shape
    const newShape: Shape = (() => {
      const id = generateShapeId();
      const startPoint = start.value!;
      const endPoint = last.value!;
      switch (store.currentTool) {
        case "draw":
          const preview = previewShape.value as DrawShape;
          return new DrawShape(id, store.currentColor!, store.lineWidth!, [
            ...simplifyPoints(preview.points.value, store.smoothing),
          ]);
        case "line":
          return new LineShape(
            id,
            store.currentColor!,
            store.lineWidth!,
            startPoint,
            endPoint
          );
        case "rectangle":
          return new RectangleShape(
            id,
            store.currentColor!,
            store.lineWidth!,
            startPoint,
            endPoint
          );
        case "arrow":
          return new ArrowShape(
            id,
            store.currentColor!,
            store.lineWidth!,
            startPoint,
            endPoint
          );
        default:
          throw new Error(`Unknown tool: ${store.currentTool}`);
      }
    })();

    // Clear preview
    previewShape.value = null;
    // Only add shape if it has actual size
    if (newShape.bounds.width > 5 || newShape.bounds.height > 5) {
      store.addShape(newShape);
      store.selectShape(newShape.id);

      isDrawing.value = false;
      return newShape;
    }

    isDrawing.value = false;
    return null;
  }

  function drawText(point: Point, text: string): Shape {
    const newShape = new TextShape(
      generateShapeId(),
      store.currentColor!,
      point,
      text,
      store.fontSize!,
      store.fontFamily!
    );
    store.addShape(newShape);
    store.selectShape(newShape.id);
    return newShape;
  }

  return {
    onPointerDown,
    draw,
    stopDrawing,
    drawText,
    getBaseSVGCoordinates,
    previewShape,
    startDrawing,
  };
}
