import { ref, computed, type Ref } from "vue";
import { Shape } from "./Shape";
import type { Point } from "@/types";
import { CircleShapeData } from "@/types/shapeData";

export class CircleShape extends Shape<CircleShapeData> {
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
    return [this.startPoint.value, this.endPoint.value];
  }

  updateDraggablePoint(index: number, newPoint: Point): void {
    if (index === 0) {
      // Move center
      const deltaX = newPoint.x - this.startPoint.value.x;
      const deltaY = newPoint.y - this.startPoint.value.y;
      this.startPoint.value = newPoint;
      this.endPoint.value.x += deltaX;
      this.endPoint.value.y += deltaY;
    } else if (index === 1) {
      // Resize by moving circumference point
      this.endPoint.value = newPoint;
    }
  }

  protected getSerializableProperties() {
    return {
      type: "circle" as const,
      startPoint: this.startPoint.value,
      endPoint: this.endPoint.value,
    };
  }
}
