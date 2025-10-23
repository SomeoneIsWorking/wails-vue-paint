import { ref, computed, type Ref, ComputedRef } from "vue";
import { Shape } from "./Shape";
import type { Point, Bounds, ImageShapeData } from "@/types";

export class ImageShape extends Shape<ImageShapeData> {
  startPoint: Ref<Point>;
  imageData: Ref<string>;
  imageWidth: Ref<number>;
  imageHeight: Ref<number>;

  protected _bounds: ComputedRef<Bounds>;

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

    this._bounds = computed(() => {
      return {
        x: this.startPoint.value.x,
        y: this.startPoint.value.y,
        width: this.imageWidth.value,
        height: this.imageHeight.value,
      };
    });
  }

  move(deltaX: number, deltaY: number): void {
    this.startPoint.value.x += deltaX;
    this.startPoint.value.y += deltaY;
  }

  protected getSerializableProperties(): Omit<ImageShapeData, 'id' | 'color' | 'lineWidth'> {
    return {
      type: "image",
      startPoint: this.startPoint.value,
      imageData: this.imageData.value,
      imageWidth: this.imageWidth.value,
      imageHeight: this.imageHeight.value,
    };
  }
}
