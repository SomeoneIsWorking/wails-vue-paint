import { computed, type Ref, ref } from "vue";
import { Shape } from "./Shape";
import type { Point } from "@/types";
import { DrawShapeData } from "@/types/shapeData";

export class DrawShape extends Shape<DrawShapeData> {
  points: Ref<Point[]>;

  constructor(id: string, color: string, lineWidth: number, points: Point[]) {
    super(id, color, lineWidth);
    this.points = ref(points);
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
    this.points.value = this.points.value.map((p) => ({
      x: p.x + deltaX,
      y: p.y + deltaY,
    }));
  }

  protected getSerializableProperties() {
    return {
      type: "draw" as const,
      points: this.points.value,
    };
  }
}
