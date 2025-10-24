import { ref, computed, type Ref } from "vue";
import { ShapeClass } from "./Shape";
import { ImageShapeData } from "@/types/shapeData";
import { Bounds } from "@/utils/Bounds";
import { Vector } from "@/utils/Vector";
import { Point } from "@/utils/Point";

export class ImageShape extends ShapeClass<ImageShapeData> {
  startPoint: Ref<Point>;
  imageData: Ref<string>;
  imageWidth: Ref<number>;
  imageHeight: Ref<number>;

  protected _bounds = computed(() => {
    return new Bounds([
      this.startPoint.value,
      this.startPoint.value.offset(
        new Vector(this.imageWidth.value, this.imageHeight.value)
      ),
    ]);
  });

  constructor(
    id: string,
    color: string,
    startPoint: Point,
    imageData: string,
    imageWidth: number,
    imageHeight: number,
    element?: SVGElement
  ) {
    super(id, "image", color, element);
    this.startPoint = ref(startPoint);
    this.imageData = ref(imageData);
    this.imageWidth = ref(imageWidth);
    this.imageHeight = ref(imageHeight);
  }

  move(delta: Vector): void {
    this.startPoint.value = this.startPoint.value.offset(delta);
  }

  getDraggablePoints(): Point[] {
    const x = this.startPoint.value.x;
    const y = this.startPoint.value.y;
    const w = this.imageWidth.value;
    const h = this.imageHeight.value;
    return [
      { x, y }, // top-left
      { x: x + w, y }, // top-right
      { x: x + w, y: y + h }, // bottom-right
      { x, y: y + h }, // bottom-left
    ].map((p) => new Point(p.x, p.y));
  }

  updateDraggablePoint(index: number, newPoint: Point): void {
    const currentX = this.startPoint.value.x;
    const currentY = this.startPoint.value.y;
    const currentW = this.imageWidth.value;
    const currentH = this.imageHeight.value;

    if (index === 0) {
      // top-left
      this.startPoint.value = newPoint;
      this.imageWidth.value = currentW + (currentX - newPoint.x);
      this.imageHeight.value = currentH + (currentY - newPoint.y);
    } else if (index === 1) {
      // top-right
      this.startPoint.value = new Point(currentX, newPoint.y);
      this.imageWidth.value = newPoint.x - currentX;
      this.imageHeight.value = currentH + (currentY - newPoint.y);
    } else if (index === 2) {
      // bottom-right
      this.imageWidth.value = newPoint.x - currentX;
      this.imageHeight.value = newPoint.y - currentY;
    } else if (index === 3) {
      // bottom-left
      this.startPoint.value = new Point(newPoint.x, currentY);
      this.imageHeight.value = newPoint.y - currentY;
      this.imageWidth.value = currentW + (currentX - newPoint.x);
    }
  }

  protected getSerializableProperties() {
    return {
      startPoint: this.startPoint.value,
      imageData: this.imageData.value,
      imageWidth: this.imageWidth.value,
      imageHeight: this.imageHeight.value,
    };
  }
}
