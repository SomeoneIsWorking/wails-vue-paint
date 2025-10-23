import { ref, type Ref, type ComputedRef } from "vue";
import type { Bounds } from "@/types";
import { ShapeData } from "@/types/shapeData";

export abstract class Shape<T extends ShapeData = any> {
  id: string;
  color: Ref<string>;
  lineWidth: Ref<number>;
  element?: SVGElement;

  protected abstract _bounds: ComputedRef<Bounds>;

  constructor(
    id: string,
    color: string,
    lineWidth: number,
    element?: SVGElement
  ) {
    this.id = id;
    this.color = ref(color);
    this.lineWidth = ref(lineWidth);
    this.element = element;
  }

  get bounds(): Bounds {
    return this._bounds.value;
  }

  abstract move(deltaX: number, deltaY: number): void;

  serialize(): T {
    return {
      id: this.id,
      color: this.color.value,
      lineWidth: this.lineWidth.value,
      ...this.getSerializableProperties(),
    } as T;
  }

  protected abstract getSerializableProperties(): Omit<T, 'id' | 'color' | 'lineWidth'>;
}
