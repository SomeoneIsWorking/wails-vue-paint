export type ToolType = 
  | 'select'
  | 'text'
  | 'draw'
  | 'line'
  | 'rectangle'
  | 'arrow'
  | 'eraser'

export type SelectionMode = 'intersect' | 'cover' | 'half'

export interface DrawingState {
  tool: ToolType
  color: string
  lineWidth: number
  fontSize: number
  fontFamily: string
  isDrawing: boolean
  startX: number
  startY: number
}

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Annotation {
  id: string
  type: ToolType
  points: Point[]
  color: string
  lineWidth?: number
  text?: string
  fontSize?: number
  fontFamily?: string
}

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp'
  quality: number  // 0-1 for jpeg/webp
}

export interface ImageShapeData {
  type: 'image';
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  imageData: string;
  imageWidth: number;
  imageHeight: number;
}

export interface TextShapeData {
  type: 'text';
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface RectangleShapeData {
  type: 'rectangle';
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  endPoint: Point;
}

export interface CircleShapeData {
  type: 'circle';
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  endPoint: Point;
}

export interface LineShapeData {
  type: 'line';
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  endPoint: Point;
}

export interface ArrowShapeData {
  type: 'arrow';
  id: string;
  color: string;
  lineWidth: number;
  startPoint: Point;
  endPoint: Point;
}

export interface DrawShapeData {
  type: 'draw';
  id: string;
  color: string;
  lineWidth: number;
  points: Point[];
  pathData?: string;
}

export type ShapeData = ImageShapeData | TextShapeData | RectangleShapeData | CircleShapeData | LineShapeData | ArrowShapeData | DrawShapeData;
