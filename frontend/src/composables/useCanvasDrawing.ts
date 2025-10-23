import { ref, shallowRef, type Ref } from "vue";
import { useDrawingStore } from "@/stores/drawing";
import { generateShapeId, isPointInBounds } from "@/utils/shapeHelpers";
import { LineShape, RectangleShape, ArrowShape, DrawShape, TextShape, Shape } from "./shapes";
import { Point } from "@/types";

export function useCanvasDrawing(svgRef: Ref<SVGSVGElement | null>) {
  const store = useDrawingStore();

  const isDrawing = ref(false);
  const isDraggingShapes = ref(false);
  const startX = ref(0);
  const startY = ref(0);
  const lastX = ref(0);
  const lastY = ref(0);
  const currentDrawingPoints = ref<Point[]>([]);
  const previewShape = shallowRef<Shape | null>(null);

  function getSVGCoordinates(event: MouseEvent): Point {
    const svg = svgRef.value;
    if (!svg) return { x: 0, y: 0 };
    
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }

  function onPointerDown(x: number, y: number, event?: MouseEvent) {
    if (store.currentTool === "select") {
      handleSelectTool(x, y, event);
    } else {
      startDrawing(x, y);
    }
  }

  function handleSelectTool(x: number, y: number, event?: MouseEvent) {
    const clickPoint = { x, y };
    const isShiftPressed = event?.shiftKey || false;

    // Find shapes that contain the click point
    const shapesAtPoint = store.shapes.filter(shape =>
      isPointInBounds(clickPoint, shape.bounds)
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
      const clickedOnSelectedShape = shapesAtPoint.some(shape => 
        store.selectedShapeIds.includes(shape.id)
      );
      
      if (clickedOnSelectedShape) {
        isDraggingShapes.value = true;
        startX.value = x;
        startY.value = y;
        console.log('Starting to drag shapes');
      }
      return;
    } else {
      // Clicked on empty space - start drag selection
      if (!isShiftPressed) {
        store.clearSelection();
      }
      store.startDragSelection(x, y);
      return;
    }
  }

  function startDrawing(x: number, y: number) {
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
      const startPoint = { x, y }
      const endPoint = { x, y }
      switch (store.currentTool) {
        case 'line':
          previewShape.value = new LineShape('preview', store.currentColor, store.lineWidth, startPoint, endPoint)
          break
        case 'rectangle':
          previewShape.value = new RectangleShape('preview', store.currentColor, store.lineWidth, startPoint, endPoint)
          break
        case 'arrow':
          previewShape.value = new ArrowShape('preview', store.currentColor, store.lineWidth, startPoint, endPoint)
          break
      }
    } else if (store.currentTool === "draw") {
      previewShape.value = new DrawShape('preview', store.currentColor, store.lineWidth, [{ x, y }])
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
        shape.move(deltaX, deltaY);
      });

      console.log('Dragging shapes by', deltaX, deltaY);

      startX.value = x;
      startY.value = y;
      return;
    }

    if (!isDrawing.value) return;

    lastX.value = x;
    lastY.value = y;

    // Update preview shape
    if (previewShape.value) {
      if (previewShape.value instanceof DrawShape) {
        (previewShape.value as DrawShape).points.value.push({ x, y });
      } else {
        (previewShape.value as LineShape | RectangleShape | ArrowShape).endPoint.value = { x, y };
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
      console.log('Stopped dragging shapes');
      return null;
    }

    if (!isDrawing.value) return null;

    // Clear preview
    previewShape.value = null;

    // Create the final shape
    const newShape: Shape = (() => {
      const id = generateShapeId()
      const startPoint = { x: startX.value, y: startY.value }
      const endPoint = { x: lastX.value, y: lastY.value }
      switch (store.currentTool) {
        case 'draw':
          return new DrawShape(id, store.currentColor, store.lineWidth, [...currentDrawingPoints.value])
        case 'line':
          return new LineShape(id, store.currentColor, store.lineWidth, startPoint, endPoint)
        case 'rectangle':
          return new RectangleShape(id, store.currentColor, store.lineWidth, startPoint, endPoint)
        case 'arrow':
          return new ArrowShape(id, store.currentColor, store.lineWidth, startPoint, endPoint)
        default:
          throw new Error(`Unknown tool: ${store.currentTool}`)
      }
    })()

    // Only add shape if it has actual size
    if (
      newShape.bounds.width > 1 ||
      newShape.bounds.height > 1
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
    const newShape = new TextShape(
      generateShapeId(),
      store.currentColor,
      store.lineWidth,
      { x, y },
      text,
      store.fontSize,
      store.fontFamily
    )
    store.addShape(newShape);
    store.selectShape(newShape.id);
    return newShape;
  }

  function clearShapes() {
    store.clearShapes();
  }

  function deleteSelectedShapes() {
    store.deleteSelectedShapes();
  }

  return {
    onPointerDown,
    draw,
    stopDrawing,
    drawText,
    clearShapes,
    deleteSelectedShapes,
    getSVGCoordinates,
    previewShape,
  };
}
