import { ref, computed, type Ref } from "vue";
import { ShapeClass } from "./Shape";
import type { Point } from "@/types";
import { CircleShapeData } from "@/types/shapeData";
import { Bounds } from "@/utils/Bounds";

export class CircleShape extends ShapeClass<CircleShapeData> {
  startPoint: Ref<Point>;
  endPoint: Ref<Point>;
  lineWidth: Ref<number>;

  protected _bounds = computed(() => {
    return new Bounds([this.startPoint.value, this.endPoint.value]).extend(
      this.lineWidth.value
    );
  });

  constructor(
    id: string,
    color: string,
    lineWidth: number,
    startPoint: Point,
    endPoint: Point,
    element?: SVGElement
  ) {
    super(id, "circle", color, element);
    this.startPoint = ref(startPoint);
    this.endPoint = ref(endPoint);
    this.lineWidth = ref(lineWidth);
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
      lineWidth: this.lineWidth.value,
      startPoint: this.startPoint.value,
      endPoint: this.endPoint.value,
    };
  }
}
