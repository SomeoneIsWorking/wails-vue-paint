import { ref, computed, type Ref, ComputedRef } from "vue";
import { Shape } from "./Shape";
import type { Point, Bounds, LineShapeData } from "@/types";

export class LineShape extends Shape<LineShapeData> {
  startPoint: Ref<Point>;
  endPoint: Ref<Point>;

  protected _bounds: ComputedRef<Bounds>;

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

    this._bounds = computed(() => {
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
  }

  move(deltaX: number, deltaY: number): void {
    this.startPoint.value.x += deltaX;
    this.startPoint.value.y += deltaY;
    this.endPoint.value.x += deltaX;
    this.endPoint.value.y += deltaY;
  }

  protected getSerializableProperties(): Omit<LineShapeData, 'id' | 'color' | 'lineWidth'> {
    return {
      type: "line",
      startPoint: this.startPoint.value,
      endPoint: this.endPoint.value,
    };
  }
}
