export type ToolType = 
  | 'select'
  | 'text'
  | 'draw'
  | 'line'
  | 'rectangle'
  | 'arrow'
  | 'eraser'
  | 'pointEdit'

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp'
  quality: number  // 0-1 for jpeg/webp
}
