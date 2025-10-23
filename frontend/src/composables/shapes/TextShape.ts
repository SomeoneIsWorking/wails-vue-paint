import { ref, computed, type Ref } from "vue";
import { Shape } from "./Shape";
import type { Point } from "@/types";
import { TextShapeData } from "@/types/shapeData";

export class TextShape extends Shape<TextShapeData> {
  startPoint: Ref<Point>;
  text: Ref<string>;
  fontSize: Ref<number>;
  fontFamily: Ref<string>;

  protected _bounds = computed(() => {
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

  constructor(
    id: string,
    color: string,
    lineWidth: number,
    startPoint: Point,
    text: string,
    fontSize: number,
    fontFamily: string
  ) {
    super(id, color, lineWidth);
    this.startPoint = ref(startPoint);
    this.text = ref(text);
    this.fontSize = ref(fontSize);
    this.fontFamily = ref(fontFamily);
  }

  move(deltaX: number, deltaY: number): void {
    this.startPoint.value.x += deltaX;
    this.startPoint.value.y += deltaY;
  }

  getDraggablePoints(): Point[] {
    return [this.startPoint.value];
  }

  updateDraggablePoint(index: number, newPoint: Point): void {
    if (index === 0) {
      this.startPoint.value = newPoint;
    }
  }

  protected getSerializableProperties() {
    return {
      type: "text" as const,
      startPoint: this.startPoint.value,
      text: this.text.value,
      fontSize: this.fontSize.value,
      fontFamily: this.fontFamily.value,
    };
  }
}
