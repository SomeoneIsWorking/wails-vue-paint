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
    const bounds = this.drawBounds.value;
    return [
      bounds.topLeft,
      bounds.topRight,
      bounds.bottomRight,
      bounds.bottomLeft,
    ];
  }

  updateDraggablePoint(index: number, newPoint: Point): void {
    const currentMinX = Math.min(
      this.startPoint.value.x,
      this.endPoint.value.x
    );
    const currentMaxX = Math.max(
      this.startPoint.value.x,
      this.endPoint.value.x
    );
    const currentMinY = Math.min(
      this.startPoint.value.y,
      this.endPoint.value.y
    );
    const currentMaxY = Math.max(
      this.startPoint.value.y,
      this.endPoint.value.y
    );

    let newMinX = currentMinX;
    let newMaxX = currentMaxX;
    let newMinY = currentMinY;
    let newMaxY = currentMaxY;

    if (index === 0) {
      // top-left
      newMinX = newPoint.x;
      newMinY = newPoint.y;
    } else if (index === 1) {
      // top-right
      newMaxX = newPoint.x;
      newMinY = newPoint.y;
    } else if (index === 2) {
      // bottom-right
      newMaxX = newPoint.x;
      newMaxY = newPoint.y;
    } else if (index === 3) {
      // bottom-left
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
      lineWidth: this.lineWidth.value,
      startPoint: this.startPoint.value,
      endPoint: this.endPoint.value,
    };
  }
}
