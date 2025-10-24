import { ref, type Ref, type ComputedRef } from "vue";
import { ShapeData } from "@/types/shapeData";
import { Bounds } from "@/utils/Bounds";
import { Vector } from "@/utils/Vector";
import { Point } from "@/utils/Point";

export abstract class ShapeClass<T extends ShapeData> {
  id: string;
  color: Ref<string>;
  element?: SVGElement;
  type: T["type"];
  protected abstract _bounds: ComputedRef<Bounds>;

  constructor(id: string, type: T["type"], color: string, element?: SVGElement) {
    this.id = id;
    this.type = type;
    this.color = ref(color);
    this.element = element;
  }

  get bounds(): Bounds {
    return this._bounds.value;
  }

  abstract move(delta: Vector): void;

  abstract getDraggablePoints(): Point[];

  abstract updateDraggablePoint(index: number, newPoint: Point): void;

  serialize(): T {
    return {
      id: this.id,
      color: this.color.value,
      type: this.type,
      ...this.getSerializableProperties(),
    } as T;
  }

  protected abstract getSerializableProperties(): Omit<
    T,
    "id" | "color" | "type"
  >;
}