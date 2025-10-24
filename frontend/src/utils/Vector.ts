export class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  add(other: Vector) {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  scale(scale: number) {
    return new Vector(this.x * scale, this.y * scale);
  }

  reverse() {
    return new Vector(-this.x, -this.y);
  }
}
