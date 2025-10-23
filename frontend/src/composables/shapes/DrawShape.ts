import { ref, computed, type Ref, ComputedRef } from "vue";
import { Shape } from "./Shape";
import type { Point, Bounds, DrawShapeData } from "@/types";

export class DrawShape extends Shape<DrawShapeData> {
  points: Ref<Point[]>;
  pathData?: Ref<string>;

  protected _bounds: ComputedRef<Bounds>;

  constructor(
    id: string,
    color: string,
    lineWidth: number,
    points: Point[],
    pathData?: string,
    element?: SVGElement
  ) {
    super(id, color, lineWidth, element);
    this.points = ref(points);
    this.pathData = pathData ? ref(pathData) : undefined;

    this._bounds = computed(() => {
      if (this.points.value.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }

      const xs = this.points.value.map((p) => p.x);
      const ys = this.points.value.map((p) => p.y);
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
  }

  move(deltaX: number, deltaY: number): void {
    this.points.value.forEach((p) => {
      p.x += deltaX;
      p.y += deltaY;
    });
  }

  protected getSerializableProperties(): Omit<DrawShapeData, 'id' | 'color' | 'lineWidth'> {
    return {
      type: "draw",
      points: this.points.value,
      pathData: this.pathData?.value,
    };
  }
}
