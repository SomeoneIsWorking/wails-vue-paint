import type { Point } from "@/types";
import { drop } from "lodash-es";

export class Bounds {
  extend(amount: number): Bounds {
    return new Bounds([
      { x: this.left - amount / 2, y: this.top - amount / 2 },
      { x: this.right + amount / 2, y: this.bottom + amount / 2 },
    ]);
  }
  public top: number;
  public left: number;
  public right: number;
  public bottom: number;

  get width() {
    return this.right - this.left;
  }
  get height() {
    return this.bottom - this.top;
  }

  get topLeft(): Point {
    return { x: this.left, y: this.top };
  }

  get topRight(): Point {
    return { x: this.right, y: this.top };
  }

  get bottomLeft(): Point {
    return { x: this.left, y: this.bottom };
  }

  get bottomRight(): Point {
    return { x: this.right, y: this.bottom };
  }

  constructor(points: Point[]) {
    const firstPoint = points[0];
    this.top = firstPoint.y;
    this.left = firstPoint.x;
    this.right = firstPoint.x;
    this.bottom = firstPoint.y;

    for (const point of drop(points, 1)) {
      this.left = Math.min(this.left, point.x);
      this.top = Math.min(this.top, point.y);
      this.right = Math.max(this.right, point.x);
      this.bottom = Math.max(this.bottom, point.y);
    }
  }

  /**
   * Calculates the overlap percentage with another bounds.
   * Returns the percentage of this bounds that overlaps with the other bounds.
   */
  overlapPercentage(other: Bounds): number {
    const overlapX = Math.max(
      0,
      Math.min(this.right, other.right) - Math.max(this.left, other.left)
    );
    const overlapY = Math.max(
      0,
      Math.min(this.bottom, other.bottom) - Math.max(this.top, other.top)
    );

    const overlapArea = overlapX * overlapY;
    const thisArea = this.width * this.height;

    return thisArea > 0 ? overlapArea / thisArea : 0;
  }

  /**
   * Checks if a point is inside this bounds.
   */
  containsPoint(point: Point): boolean {
    return (
      point.x >= this.left &&
      point.x <= this.right &&
      point.y >= this.top &&
      point.y <= this.bottom
    );
  }
}
