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

export function createShapeFromData(data: any): Shape<any> {
  const {
    id,
    type,
    color,
    lineWidth,
    startPoint,
    endPoint,
    points,
    pathData,
    text,
    fontSize,
    fontFamily,
    imageData,
    imageWidth,
    imageHeight,
    element,
  } = data;

  switch (type) {
    case "line":
      return new LineShape(id, color, lineWidth, startPoint, endPoint, element);
    case "rectangle":
      return new RectangleShape(
        id,
        color,
        lineWidth,
        startPoint,
        endPoint,
        element
      );
    case "arrow":
      return new ArrowShape(
        id,
        color,
        lineWidth,
        startPoint,
        endPoint,
        element
      );
    case "text":
      return new TextShape(
        id,
        color,
        lineWidth,
        startPoint,
        text,
        fontSize,
        fontFamily,
        element
      );
    case "draw":
      return new DrawShape(id, color, lineWidth, points, pathData, element);
    case "image":
      return new ImageShape(
        id,
        color,
        lineWidth,
        startPoint,
        imageData,
        imageWidth,
        imageHeight,
        element
      );
    case "circle":
      return new CircleShape(
        id,
        color,
        lineWidth,
        startPoint,
        endPoint,
        element
      );
    default:
      throw new Error(`Unknown shape type: ${type}`);
  }
}
