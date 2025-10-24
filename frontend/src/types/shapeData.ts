export interface PointData {
  x: number;
  y: number;
}

export interface ImageShapeData {
  type: "image";
  id: string;
  color: string;
  startPoint: PointData;
  endPoint: PointData;
  imageData: string;
  imageWidth: number;
  imageHeight: number;
}

export interface TextShapeData {
  type: "text";
  id: string;
  color: string;
  startPoint: PointData;
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface RectangleShapeData {
  type: "rectangle";
  id: string;
  color: string;
  lineWidth: number;
  startPoint: PointData;
  endPoint: PointData;
}

export interface CircleShapeData {
  type: "circle";
  id: string;
  color: string;
  lineWidth: number;
  startPoint: PointData;
  endPoint: PointData;
}

export interface LineShapeData {
  type: "line";
  id: string;
  color: string;
  lineWidth: number;
  startPoint: PointData;
  endPoint: PointData;
}

export interface ArrowShapeData {
  type: "arrow";
  id: string;
  color: string;
  lineWidth: number;
  startPoint: PointData;
  endPoint: PointData;
}

export interface DrawShapeData {
  type: "draw";
  id: string;
  color: string;
  lineWidth: number;
  points: PointData[];
}

export type ShapeData =
  | ImageShapeData
  | TextShapeData
  | RectangleShapeData
  | CircleShapeData
  | LineShapeData
  | ArrowShapeData
  | DrawShapeData;

export type ShapeType = ShapeData["type"];