import { computed, type Ref, ref } from "vue";
import { Shape } from "./Shape";
import type { Point } from "@/types";
import { DrawShapeData } from "@/types/shapeData";

export class DrawShape extends Shape<DrawShapeData> {
  points: Ref<Point[]>;
  lineWidth: Ref<number>;

  constructor(id: string, color: string, lineWidth: number, points: Point[]) {
    super(id, color);
    this.points = ref(points);
    this.lineWidth = ref(lineWidth);
  }

  protected _bounds = computed(() => {
    const points = this.points.value;
    if (points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
      x: minX - this.lineWidth.value / 2,
      y: minY - this.lineWidth.value / 2,
      width: maxX - minX + this.lineWidth.value,
      height: maxY - minY + this.lineWidth.value,
    };
  });

  push(point: Point): void {
    this.points!.value.push(point);
  }

  move(deltaX: number, deltaY: number): void {
    for (const point of this.points.value) {
      point.x += deltaX;
      point.y += deltaY;
    }
  }

  getDraggablePoints(): Point[] {
    return this.points.value;
  }

  updateDraggablePoint(index: number, newPoint: Point): void {
    if (index >= 0 && index < this.points.value.length) {
      this.points.value[index] = newPoint;
    }
  }

  removeDraggablePoint(index: number): void {
    if (index >= 0 && index < this.points.value.length) {
      this.points.value.splice(index, 1);
    }
  }

  protected getSerializableProperties() {
    return {
      type: "draw" as const,
      lineWidth: this.lineWidth.value,
      points: this.points.value,
    };
  }
}
