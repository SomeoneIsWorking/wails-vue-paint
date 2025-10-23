import { ref, computed, type Ref } from "vue";
import { Shape } from "./Shape";
import type { Point } from "@/types";
import { RectangleShapeData } from "@/types/shapeData";

export class RectangleShape extends Shape<RectangleShapeData> {
  startPoint: Ref<Point>;
  endPoint: Ref<Point>;

  protected _bounds = computed(() => {
    const minX = Math.min(this.startPoint.value.x, this.endPoint.value.x);
    const minY = Math.min(this.startPoint.value.y, this.endPoint.value.y);
    const maxX = Math.max(this.startPoint.value.x, this.endPoint.value.x);
    const maxY = Math.max(this.startPoint.value.y, this.endPoint.value.y);
    return {
      x: minX - this.lineWidth.value / 2,
      y: minY - this.lineWidth.value / 2,
      width: maxX - minX + this.lineWidth.value,
      height: maxY - minY + this.lineWidth.value,
    };
  });

  constructor(
    id: string,
    color: string,
    lineWidth: number,
    startPoint: Point,
    endPoint: Point,
    element?: SVGElement
  ) {
    super(id, color, lineWidth, element);
    this.startPoint = ref(startPoint);
    this.endPoint = ref(endPoint);
  }

  move(deltaX: number, deltaY: number): void {
    this.startPoint.value.x += deltaX;
    this.startPoint.value.y += deltaY;
    this.endPoint.value.x += deltaX;
    this.endPoint.value.y += deltaY;
  }

  getDraggablePoints(): Point[] {
    const minX = Math.min(this.startPoint.value.x, this.endPoint.value.x);
    const maxX = Math.max(this.startPoint.value.x, this.endPoint.value.x);
    const minY = Math.min(this.startPoint.value.y, this.endPoint.value.y);
    const maxY = Math.max(this.startPoint.value.y, this.endPoint.value.y);
    return [
      { x: minX, y: minY }, // top-left
      { x: maxX, y: minY }, // top-right
      { x: maxX, y: maxY }, // bottom-right
      { x: minX, y: maxY }, // bottom-left
    ];
  }

  updateDraggablePoint(index: number, newPoint: Point): void {
    const currentMinX = Math.min(this.startPoint.value.x, this.endPoint.value.x);
    const currentMaxX = Math.max(this.startPoint.value.x, this.endPoint.value.x);
    const currentMinY = Math.min(this.startPoint.value.y, this.endPoint.value.y);
    const currentMaxY = Math.max(this.startPoint.value.y, this.endPoint.value.y);

    let newMinX = currentMinX;
    let newMaxX = currentMaxX;
    let newMinY = currentMinY;
    let newMaxY = currentMaxY;

    if (index === 0) { // top-left
      newMinX = newPoint.x;
      newMinY = newPoint.y;
    } else if (index === 1) { // top-right
      newMaxX = newPoint.x;
      newMinY = newPoint.y;
    } else if (index === 2) { // bottom-right
      newMaxX = newPoint.x;
      newMaxY = newPoint.y;
    } else if (index === 3) { // bottom-left
      newMinX = newPoint.x;
      newMaxY = newPoint.y;
    }

    // Update startPoint and endPoint to reflect new bounds
    // Keep the original orientation if possible
    if (this.startPoint.value.x <= this.endPoint.value.x) {
      this.startPoint.value.x = newMinX;
      this.endPoint.value.x = newMaxX;
    } else {
      this.startPoint.value.x = newMaxX;
      this.endPoint.value.x = newMinX;
    }
    if (this.startPoint.value.y <= this.endPoint.value.y) {
      this.startPoint.value.y = newMinY;
      this.endPoint.value.y = newMaxY;
    } else {
      this.startPoint.value.y = newMaxY;
      this.endPoint.value.y = newMinY;
    }
  }

  protected getSerializableProperties() {
    return {
      type: "rectangle" as const,
      startPoint: this.startPoint.value,
      endPoint: this.endPoint.value,
    };
  }
}
