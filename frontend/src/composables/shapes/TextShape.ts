import { ref, computed, type Ref, ComputedRef } from "vue";
import { Shape } from "./Shape";
import type { Point, Bounds, TextShapeData } from "@/types";

export class TextShape extends Shape<TextShapeData> {
  startPoint: Ref<Point>;
  text: Ref<string>;
  fontSize: Ref<number>;
  fontFamily: Ref<string>;

  protected _bounds: ComputedRef<Bounds>;

  constructor(
    id: string,
    color: string,
    lineWidth: number,
    startPoint: Point,
    text: string,
    fontSize: number,
    fontFamily: string,
    element?: SVGElement
  ) {
    super(id, color, lineWidth, element);
    this.startPoint = ref(startPoint);
    this.text = ref(text);
    this.fontSize = ref(fontSize);
    this.fontFamily = ref(fontFamily);

    this._bounds = computed(() => {
      const lines = this.text.value.split("\n");
      const lineHeight = this.fontSize.value * 1.2;
      const maxLineLength = Math.max(...lines.map((line) => line.length));

      return {
        x: this.startPoint.value.x,
        y: this.startPoint.value.y - this.fontSize.value,
        width: maxLineLength * this.fontSize.value * 0.6,
        height: lines.length * lineHeight,
      };
    });
  }

  move(deltaX: number, deltaY: number): void {
    this.startPoint.value.x += deltaX;
    this.startPoint.value.y += deltaY;
  }

  protected getSerializableProperties(): Omit<TextShapeData, 'id' | 'color' | 'lineWidth'> {
    return {
      type: "text",
      startPoint: this.startPoint.value,
      text: this.text.value,
      fontSize: this.fontSize.value,
      fontFamily: this.fontFamily.value,
    };
  }
}
