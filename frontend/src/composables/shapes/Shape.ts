import { ref, type Ref, type ComputedRef } from "vue";
import type { Bounds, Point } from "@/types";
import { ShapeData } from "@/types/shapeData";

export abstract class Shape<T extends ShapeData = any> {
  id: string;
  color: Ref<string>;
  element?: SVGElement;

  protected abstract _bounds: ComputedRef<Bounds>;

  constructor(
    id: string,
    color: string,
    element?: SVGElement
  ) {
    this.id = id;
    this.color = ref(color);
    this.element = element;
  }

  get bounds(): Bounds {
    return this._bounds.value;
  }

  abstract move(deltaX: number, deltaY: number): void;

  abstract getDraggablePoints(): Point[];

  abstract updateDraggablePoint(index: number, newPoint: Point): void;

  serialize(): T {
    return {
      id: this.id,
      color: this.color.value,
      ...this.getSerializableProperties(),
    } as T;
  }

  protected abstract getSerializableProperties(): Omit<T, 'id' | 'color'>;
}
