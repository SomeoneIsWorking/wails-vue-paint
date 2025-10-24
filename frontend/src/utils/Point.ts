import { Vector } from "./Vector";

export class Point {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  minus(other: Point) {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  offset(delta: Vector) {
    return new Point(this.x + delta.x, this.y + delta.y);
  }

  scale(scale: number) {
    return new Point(this.x * scale, this.y * scale);
  }
  asVector() {
    return new Vector(this.x, this.y);
  }
}
