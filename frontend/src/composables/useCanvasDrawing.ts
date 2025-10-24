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
import { generateShapeId, simplifyPoints } from "@/utils/shapeHelpers";
import { Point } from "@/utils/Point";

export function useCanvasDrawing(svgRef: Ref<SVGSVGElement | null>) {
  const store = useDrawingStore();

  const isDrawing = ref(false);
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

  function stopDrawing() {
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
    }

    isDrawing.value = false;
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
    isDrawing,
    draw,
    stopDrawing,
    drawText,
    getBaseSVGCoordinates,
    previewShape,
    startDrawing,
  };
}
