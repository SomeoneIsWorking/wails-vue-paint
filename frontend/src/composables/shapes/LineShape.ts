import { ref, computed, type Ref } from "vue";
import { ShapeClass } from "./Shape";
import { LineShapeData } from "@/types/shapeData";
import { Bounds } from "@/utils/Bounds";
import { Vector } from "@/utils/Vector";
import { Point } from "@/utils/Point";

export class LineShape extends ShapeClass<LineShapeData> {
  startPoint: Ref<Point>;
  endPoint: Ref<Point>;
  lineWidth: Ref<number>;

  protected _bounds = computed(() => {
    return new Bounds([this.startPoint.value, this.endPoint.value]).extend(
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
    super(id, "line", color, element);
    this.startPoint = ref(startPoint);
    this.endPoint = ref(endPoint);
    this.lineWidth = ref(lineWidth);
  }

  move(delta: Vector): void {
    this.startPoint.value = this.startPoint.value.offset(delta);
    this.endPoint.value = this.endPoint.value.offset(delta);
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
}
