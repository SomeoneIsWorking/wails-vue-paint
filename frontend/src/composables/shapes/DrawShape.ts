import { computed, type Ref, ref } from "vue";
import { ShapeClass } from "./Shape";
import { DrawShapeData } from "@/types/shapeData";
import { Bounds } from "@/utils/Bounds";
import { Vector } from "@/utils/Vector";
import { Point } from "@/utils/Point";

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

  move(delta: Vector): void {
    this.points.value = this.points.value.map((point) => point.offset(delta));
  }

  getDraggablePoints(): Point[] {
    return this.points.value;
  }

  updateDraggablePoint(index: number, newPoint: Point): void {
    if (index >= 0 && index < this.points.value.length) {
      this.points.value[index] = newPoint;
    }
  }

  removeDraggablePoints(indices: number[]): void {
    this.points.value = this.points.value.filter((_, i) => !indices.includes(i));
  }

  protected getSerializableProperties() {
    return {
      lineWidth: this.lineWidth.value,
      points: this.points.value,
    };
  }
}
