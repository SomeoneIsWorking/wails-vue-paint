import { ref } from "vue";
import type { Point } from "@/types";

interface MouseInteractionOptions {
  onClick: (coords: Point, event: MouseEvent) => void;
  onDragStart: (coords: Point, event: MouseEvent) => void;
  onDragUpdate: (coords: Point) => void;
  onDragEnd: (coords: Point) => void;
  getSVGCoordinates: (event: MouseEvent) => Point;
}

export function useMouseInteraction(options: MouseInteractionOptions) {
  const dragThreshold = 5; // pixels
  const isPotentialDrag = ref(false);
  const isDragging = ref(false);
  const dragStartPoint = ref<Point | null>(null);
  const lastMouseCoords = ref<Point>({ x: 0, y: 0 });

  const handleMouseDown = (event: MouseEvent) => {
    const coords = options.getSVGCoordinates(event);
    dragStartPoint.value = coords;
    isPotentialDrag.value = true;
    isDragging.value = false;
  };

  const handleMouseMove = (event: MouseEvent) => {
    const coords = options.getSVGCoordinates(event);
    lastMouseCoords.value = coords;

    if (isPotentialDrag.value && dragStartPoint.value) {
      const distance = Math.sqrt(
        (coords.x - dragStartPoint.value.x) ** 2 +
          (coords.y - dragStartPoint.value.y) ** 2
      );
      if (distance > dragThreshold) {
        // Start drag
        options.onDragStart(dragStartPoint.value, event);
        isPotentialDrag.value = false;
        isDragging.value = true;
        // Then update
        options.onDragUpdate(coords);
      }
    } else if (isDragging.value) {
      options.onDragUpdate(coords);
    }
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (isPotentialDrag.value && dragStartPoint.value) {
      // It was a click
      options.onClick(dragStartPoint.value, event);
    } else if (isDragging.value) {
      // It was a drag, end it
      options.onDragEnd(lastMouseCoords.value);
    }

    isPotentialDrag.value = false;
    isDragging.value = false;
    dragStartPoint.value = null;
  };

  const handleMouseLeave = () => {
    if (isDragging.value) {
      options.onDragEnd(lastMouseCoords.value);
    }
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  };
}
