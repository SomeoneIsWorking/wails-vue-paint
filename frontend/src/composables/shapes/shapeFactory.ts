import { ShapeData } from "@/types/shapeData";
import { Shape } from "./Shape";
import {
  LineShape,
  RectangleShape,
  ArrowShape,
  TextShape,
  DrawShape,
  ImageShape,
  CircleShape,
} from "./index";

export function createShapeFromData(data: ShapeData): Shape<any> {
  switch (data.type) {
    case "line":
      return new LineShape(
        data.id,
        data.color,
        data.lineWidth,
        data.startPoint,
        data.endPoint
      );
    case "rectangle":
      return new RectangleShape(
        data.id,
        data.color,
        data.lineWidth,
        data.startPoint,
        data.endPoint
      );
    case "arrow":
      return new ArrowShape(
        data.id,
        data.color,
        data.lineWidth,
        data.startPoint,
        data.endPoint
      );
    case "text":
      return new TextShape(
        data.id,
        data.color,
        data.lineWidth,
        data.startPoint,
        data.text,
        data.fontSize,
        data.fontFamily
      );
    case "draw":
      return new DrawShape(
        data.id,
        data.color,
        data.lineWidth,
        data.points
      );
    case "image":
      return new ImageShape(
        data.id,
        data.color,
        data.lineWidth,
        data.startPoint,
        data.imageData,
        data.imageWidth,
        data.imageHeight
      );
    case "circle":
      return new CircleShape(
        data.id,
        data.color,
        data.lineWidth,
        data.startPoint,
        data.endPoint
      );
  }
}
