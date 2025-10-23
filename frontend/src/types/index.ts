export type ToolType = 
  | 'select'
  | 'text'
  | 'draw'
  | 'line'
  | 'rectangle'
  | 'arrow'
  | 'eraser'
  | 'pointEdit'

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
