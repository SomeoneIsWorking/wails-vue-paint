import { Point } from ".";

export interface ImageShapeData {
  type: "image";
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  imageData: string;
  imageWidth: number;
  imageHeight: number;
}

export interface TextShapeData {
  type: "text";
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface RectangleShapeData {
  type: "rectangle";
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  endPoint: Point;
}

export interface CircleShapeData {
  type: "circle";
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  endPoint: Point;
}

export interface LineShapeData {
  type: "line";
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  endPoint: Point;
}

export interface ArrowShapeData {
  type: "arrow";
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  endPoint: Point;
}

export interface DrawShapeData {
  type: "draw";
  id: string;
  color: string;
  lineWidth: number;
  points: Point[];
}

export type ShapeData =
  | ImageShapeData
  | TextShapeData
  | RectangleShapeData
  | CircleShapeData
  | LineShapeData
  | ArrowShapeData
  | DrawShapeData;
