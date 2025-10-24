import { ref, computed, type Ref } from "vue";
import { ShapeClass } from "./Shape";
import type { Point } from "@/types";
import { RectangleShapeData } from "@/types/shapeData";
import { Bounds } from "@/utils/Bounds";

export class RectangleShape extends ShapeClass<RectangleShapeData> {
  startPoint: Ref<Point>;
  endPoint: Ref<Point>;
  lineWidth: Ref<number>;

  drawBounds = computed((): Bounds => {
    return new Bounds([this.startPoint.value, this.endPoint.value]);
  });

  protected _bounds = computed(() => {
    return this.drawBounds.value.extend(this.lineWidth.value);
  });

  constructor(
    id: string,
    color: string,
    lineWidth: number,
    startPoint: Point,
    endPoint: Point,
    element?: SVGElement
  ) {
    super(id, "rectangle", color, element);
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
    return [
      this.startPoint.value,
      { x: this.startPoint.value.x, y: this.endPoint.value.y },
      this.endPoint.value,
      { x: this.endPoint.value.x, y: this.startPoint.value.y },
    ];
  }

  updateDraggablePoint(index: number, newPoint: Point): void {
    switch (index) {
      case 0:
        // Start
        this.startPoint.value = newPoint;
        break;
      case 1:
        // Start X, End Y
        this.startPoint.value.x = newPoint.x;
        this.endPoint.value.y = newPoint.y;
        break;
      case 2:
        // End
        this.endPoint.value = newPoint;
        break;
      case 3:
        // End X, Start Y
        this.endPoint.value.x = newPoint.x;
        this.startPoint.value.y = newPoint.y;
        break;
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
