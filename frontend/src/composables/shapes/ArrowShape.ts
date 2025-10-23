import { ref, computed, type Ref } from "vue";
import { Shape } from "./Shape";
import type { Point } from "@/types";
import { ArrowShapeData } from "@/types/shapeData";

export class ArrowShape extends Shape<ArrowShapeData> {
  startPoint: Ref<Point>;
  endPoint: Ref<Point>;
  lineWidth: Ref<number>;

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
    super(id, color, element);
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
      type: "arrow" as const,
      lineWidth: this.lineWidth.value,
      startPoint: this.startPoint.value,
      endPoint: this.endPoint.value,
    };
  }

  arrowHeadPoints = computed((): string => {
    const start = this.startPoint.value;
    const end = this.endPoint.value;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowSize = 10 * this.lineWidth.value;

    const point1 = {
      x: end.x - arrowSize * Math.cos(angle - Math.PI / 6),
      y: end.y - arrowSize * Math.sin(angle - Math.PI / 6),
    };
    const point2 = {
      x: end.x - arrowSize * Math.cos(angle + Math.PI / 6),
      y: end.y - arrowSize * Math.sin(angle + Math.PI / 6),
    };

    return `${end.x},${end.y} ${point1.x},${point1.y} ${point2.x},${point2.y}`;
  });
}
