import { ref, computed, type Ref } from "vue";
import { Shape } from "./Shape";
import type { Point } from "@/types";
import { ImageShapeData } from "@/types/shapeData";

export class ImageShape extends Shape<ImageShapeData> {
  startPoint: Ref<Point>;
  imageData: Ref<string>;
  imageWidth: Ref<number>;
  imageHeight: Ref<number>;

  protected _bounds = computed(() => {
    return {
      x: this.startPoint.value.x,
      y: this.startPoint.value.y,
      width: this.imageWidth.value,
      height: this.imageHeight.value,
    };
  });

  constructor(
    id: string,
    color: string,
    lineWidth: number,
    startPoint: Point,
    imageData: string,
    imageWidth: number,
    imageHeight: number,
    element?: SVGElement
  ) {
    super(id, color, lineWidth, element);
    this.startPoint = ref(startPoint);
    this.imageData = ref(imageData);
    this.imageWidth = ref(imageWidth);
    this.imageHeight = ref(imageHeight);
  }

  move(deltaX: number, deltaY: number): void {
    this.startPoint.value.x += deltaX;
    this.startPoint.value.y += deltaY;
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
    ];
  }

  updateDraggablePoint(index: number, newPoint: Point): void {
    const currentX = this.startPoint.value.x;
    const currentY = this.startPoint.value.y;
    const currentW = this.imageWidth.value;
    const currentH = this.imageHeight.value;

    if (index === 0) { // top-left
      this.startPoint.value = newPoint;
      this.imageWidth.value = currentW + (currentX - newPoint.x);
      this.imageHeight.value = currentH + (currentY - newPoint.y);
    } else if (index === 1) { // top-right
      this.startPoint.value.y = newPoint.y;
      this.imageWidth.value = newPoint.x - currentX;
      this.imageHeight.value = currentH + (currentY - newPoint.y);
    } else if (index === 2) { // bottom-right
      this.imageWidth.value = newPoint.x - currentX;
      this.imageHeight.value = newPoint.y - currentY;
    } else if (index === 3) { // bottom-left
      this.startPoint.value.x = newPoint.x;
      this.imageHeight.value = newPoint.y - currentY;
      this.imageWidth.value = currentW + (currentX - newPoint.x);
    }
  }

  protected getSerializableProperties() {
    return {
      type: "image" as const,
      startPoint: this.startPoint.value,
      imageData: this.imageData.value,
      imageWidth: this.imageWidth.value,
      imageHeight: this.imageHeight.value,
    };
  }
}
