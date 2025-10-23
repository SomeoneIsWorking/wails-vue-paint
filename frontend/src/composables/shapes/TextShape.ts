import { ref, computed, type Ref } from "vue";
import { ShapeClass } from "./Shape";
import type { Point } from "@/types";
import { TextShapeData } from "@/types/shapeData";
import { Bounds } from "@/utils/Bounds";

export class TextShape extends ShapeClass<TextShapeData> {
  startPoint: Ref<Point>;
  text: Ref<string>;
  fontSize: Ref<number>;
  fontFamily: Ref<string>;

  protected _bounds = computed(() => {
    const lines = this.text.value.split("\n");
    const lineHeight = this.fontSize.value;
    const maxLineLength = Math.max(...lines.map((line) => line.length));
    return new Bounds([
      {
        x: this.startPoint.value.x,
        y: this.startPoint.value.y - this.fontSize.value,
      },
      {
        x: this.startPoint.value.x + maxLineLength * this.fontSize.value * 0.6,
        y: this.startPoint.value.y + lines.length * lineHeight - 10,
      },
    ]);
  });

  constructor(
    id: string,
    color: string,
    startPoint: Point,
    text: string,
    fontSize: number,
    fontFamily: string
  ) {
    super(id, "text", color);
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
      startPoint: this.startPoint.value,
      text: this.text.value,
      fontSize: this.fontSize.value,
      fontFamily: this.fontFamily.value,
    };
  }
}
