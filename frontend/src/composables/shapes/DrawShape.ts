import { computed, type Ref, ref } from "vue";
import { ShapeClass } from "./Shape";
import type { Point } from "@/types";
import { DrawShapeData } from "@/types/shapeData";
import { Bounds } from "@/utils/Bounds";

export class DrawShape extends ShapeClass<DrawShapeData> {
  points: Ref<Point[]>;
  lineWidth: Ref<number>;

  constructor(id: string, color: string, lineWidth: number, points: Point[]) {
    super(id, "draw", color);
    this.points = ref(points);
    this.lineWidth = ref(lineWidth);
  }

  protected _bounds = computed(() => {
    const points = this.points.value;
    return new Bounds(points).extend(this.lineWidth.value);
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
      lineWidth: this.lineWidth.value,
      points: this.points.value,
    };
  }
}
