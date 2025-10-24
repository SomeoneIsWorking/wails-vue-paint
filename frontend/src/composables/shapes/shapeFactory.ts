import { PointData, ShapeData } from "@/types/shapeData";
import { ShapeClass } from "./Shape";
import {
  LineShape,
  RectangleShape,
  ArrowShape,
  TextShape,
  DrawShape,
  ImageShape,
  CircleShape,
} from "./index";
import { Point } from "@/utils/Point";

function toPoint(data: PointData): Point {
  return new Point(data.x, data.y);
}

export function createShapeFromData(data: ShapeData): ShapeClass<any> {
  switch (data.type) {
    case "line":
      return new LineShape(
        data.id,
        data.color,
        data.lineWidth,
        toPoint(data.startPoint),
        toPoint(data.endPoint)
      );
    case "rectangle":
      return new RectangleShape(
        data.id,
        data.color,
        data.lineWidth,
        toPoint(data.startPoint),
        toPoint(data.endPoint)
      );
    case "arrow":
      return new ArrowShape(
        data.id,
        data.color,
        data.lineWidth,
        toPoint(data.startPoint),
        toPoint(data.endPoint)
      );
    case "text":
      return new TextShape(
        data.id,
        data.color,
        toPoint(data.startPoint),
        data.text,
        data.fontSize,
        data.fontFamily
      );
    case "draw":
      return new DrawShape(
        data.id,
        data.color,
        data.lineWidth,
        data.points.map(toPoint)
      );
    case "image":
      return new ImageShape(
        data.id,
        data.color,
        toPoint(data.startPoint),
        toPoint(data.endPoint),
        data.imageData,
        data.imageWidth,
        data.imageHeight
      );
    case "circle":
      return new CircleShape(
        data.id,
        data.color,
        data.lineWidth,
        toPoint(data.startPoint),
        toPoint(data.endPoint)
      );
  }
}
