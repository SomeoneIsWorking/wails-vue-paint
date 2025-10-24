import { ref, computed, type Ref } from "vue";
import { ShapeClass } from "./Shape";
import { ImageShapeData } from "@/types/shapeData";
import { Bounds } from "@/utils/Bounds";
import { Vector } from "@/utils/Vector";
import { Point } from "@/utils/Point";

export class ImageShape extends ShapeClass<ImageShapeData> {
  startPoint: Ref<Point>;
  endPoint: Ref<Point>;
  imageData: Ref<string>;
  readonly imageSize: Vector;

  protected _bounds = computed(() => {
    return new Bounds([this.startPoint.value, this.endPoint.value]);
  });

  constructor(
    id: string,
    color: string,
    startPoint: Point,
    endPoint: Point,
    imageData: string,
    imageWidth: number,
    imageHeight: number,
    element?: SVGElement
  ) {
    super(id, "image", color, element);
    this.startPoint = ref(startPoint);
    this.imageSize = new Vector(imageWidth, imageHeight);
    this.endPoint = ref(endPoint);
    this.imageData = ref(imageData);
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

    this.preserveAspectRatio(index);
  }

  preserveAspectRatio(index: number) {
    const aspectRatio = this.imageSize.x / this.imageSize.y;

    let minX = this.startPoint.value.x;
    let maxX = this.endPoint.value.x;
    let minY = this.startPoint.value.y;
    let maxY = this.endPoint.value.y;

    let width = maxX - minX;
    let height = maxY - minY;

    const adjustments = [
      { adjustMinX: true, adjustMinY: true, adjustMaxX: false, adjustMaxY: false }, // 0
      { adjustMinX: true, adjustMinY: false, adjustMaxX: false, adjustMaxY: true }, // 1
      { adjustMinX: false, adjustMinY: false, adjustMaxX: true, adjustMaxY: true }, // 2
      { adjustMinX: false, adjustMinY: true, adjustMaxX: true, adjustMaxY: false }, // 3
    ];

    const adj = adjustments[index];

    if (width / height > aspectRatio) {
      width = height * aspectRatio;
      if (adj.adjustMinX) minX = maxX - width;
      if (adj.adjustMaxX) maxX = minX + width;
    } else {
      height = width / aspectRatio;
      if (adj.adjustMinY) minY = maxY - height;
      if (adj.adjustMaxY) maxY = minY + height;
    }

    this.startPoint.value = new Point(minX, minY);
    this.endPoint.value = new Point(maxX, maxY);
  }

  protected getSerializableProperties() {
    return {
      startPoint: this.startPoint.value,
      endPoint: this.endPoint.value,
      imageData: this.imageData.value,
      imageWidth: this.imageSize.x,
      imageHeight: this.imageSize.y,
    };
  }
}
