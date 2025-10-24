import { ref, computed, type Ref } from "vue";
import { ShapeClass } from "./Shape";
import { RectangleShapeData } from "@/types/shapeData";
import { Bounds } from "@/utils/Bounds";
import { Point } from "@/utils/Point";
import { Vector } from "@/utils/Vector";

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

  move(delta: Vector): void {
    this.startPoint.value = this.startPoint.value.offset(delta);
    this.endPoint.value = this.endPoint.value.offset(delta);
  }

  getDraggablePoints(): Point[] {
    return [
      this.startPoint.value,
      new Point(this.startPoint.value.x, this.endPoint.value.y),
      this.endPoint.value,
      new Point(this.endPoint.value.x, this.startPoint.value.y),
    ];
  }

  updateDraggablePoint(index: number, newPoint: Point): void {
    switch (index) {
      case 0:
        // Start
        this.startPoint.value = newPoint;
        break;
      case 1:
        // Start X, End Y
        this.startPoint.value = new Point(newPoint.x, this.startPoint.value.y);
        this.endPoint.value = new Point(this.endPoint.value.x, newPoint.y);
        break;
      case 2:
        // End
        this.endPoint.value = newPoint;
        break;
      case 3:
        // End X, Start Y
        this.endPoint.value = new Point(newPoint.x, this.endPoint.value.y);
        this.startPoint.value = new Point(this.startPoint.value.x, newPoint.y);
        break;
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
