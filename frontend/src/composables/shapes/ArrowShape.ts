import { ref, computed, type Ref } from "vue";
import { ShapeClass } from "./Shape";
import type { Point } from "@/types";
import { ArrowShapeData } from "@/types/shapeData";
import { Bounds } from "@/utils/Bounds";

export class ArrowShape extends ShapeClass<ArrowShapeData> {
  startPoint: Ref<Point>;
  endPoint: Ref<Point>;
  lineWidth: Ref<number>;

  protected _bounds = computed(() => {
    return new Bounds(Object.values(this.arrowPoints.value)).extend(
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
    super(id, "arrow", color, element);
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
      this.startPoint.value = newPoint;
    } else if (index === 1) {
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

  arrowPoints = computed(() => {
    const start = this.startPoint.value;
    const end = this.endPoint.value;
    const arrowSize = 5 * this.lineWidth.value;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    const point1 = {
      x: end.x - arrowSize * Math.cos(angle - Math.PI / 6),
      y: end.y - arrowSize * Math.sin(angle - Math.PI / 6),
    };
    const point2 = {
      x: end.x - arrowSize * Math.cos(angle + Math.PI / 6),
      y: end.y - arrowSize * Math.sin(angle + Math.PI / 6),
    };
    const end2 = {
      x: end.x - arrowSize * 0.5 * Math.cos(angle),
      y: end.y - arrowSize * 0.5 * Math.sin(angle),
    };
    return { start, end, point1, point2, end2 };
  });

  path = computed(() => {
    const { start, end, point1, point2, end2 } = this.arrowPoints.value;

    return [
      `M ${[start, end2].map((p) => `${p.x},${p.y}`).join(" L ")}`,
      `M ${[point1, end, point2, end2]
        .map((p) => `${p.x},${p.y}`)
        .join(" L ")}`,
    ];
  });
}
