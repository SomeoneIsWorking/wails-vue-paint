import { drop } from "lodash-es";
import { Point } from "./Point";

export class Bounds {
  extend(amount: number): Bounds {
    return new Bounds([
      new Point(this.left - amount / 2, this.top - amount / 2),
      new Point(this.right + amount / 2, this.bottom + amount / 2),
    ]);
  }
  readonly top: number;
  readonly left: number;
  readonly right: number;
  readonly bottom: number;

  get width() {
    return this.right - this.left;
  }
  get height() {
    return this.bottom - this.top;
  }

  get topLeft(): Point {
    return new Point(this.left, this.top);
  }

  get topRight(): Point {
    return new Point(this.right, this.top);
  }

  get bottomLeft(): Point {
    return new Point(this.left, this.bottom);
  }

  get bottomRight(): Point {
    return new Point(this.right, this.bottom);
  }

  constructor(points: Point[]) {
    const firstPoint = points[0];
    let top = firstPoint.y;
    let left = firstPoint.x;
    let right = firstPoint.x;
    let bottom = firstPoint.y;

    for (const point of drop(points, 1)) {
      left = Math.min(left, point.x);
      top = Math.min(top, point.y);
      right = Math.max(right, point.x);
      bottom = Math.max(bottom, point.y);
    }
    this.top = top;
    this.left = left;
    this.right = right;
    this.bottom = bottom;
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
