# Architecture Documentation

## Overview

This Wails application follows a clean architecture pattern with clear separation between frontend (Vue 3 + TypeScript) and backend (Go) layers. The frontend handles all UI interactions and canvas rendering, while the backend provides system-level operations like file I/O.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
│                    (Vue 3 Components)                        │
├─────────────────────────────────────────────────────────────┤
│  Toolbar  │  Canvas  │  Color Picker  │  Property Panel    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Vue Composables Layer                     │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ useClipboard │  useCanvas   │  useDrawing  │  useHistory    │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Wails Runtime                           │
│               (Go ↔ JavaScript Bridge)                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Go Backend                             │
├──────────────┬──────────────────────────────────────────────┤
│   App Struct │  File Operations  │  System Integration      │
└──────────────┴──────────────────────────────────────────────┘
```

## Frontend Architecture

### Component Structure

#### `App.vue`
Main application container that coordinates all child components.

**Responsibilities:**
- Global keyboard event handling (Command+V, Command+Z, etc.)
- Layout management
- State coordination between components

**Key Features:**
```typescript
- Clipboard paste listener (Command+V)
- Global keyboard shortcuts
- Component composition
```

#### `Canvas.vue`
Core drawing surface where images and annotations are rendered.

**Props:**
```typescript
interface Props {
  width: number
  height: number
  tool: ToolType
  color: string
  lineWidth: number
}
```

**Responsibilities:**
- HTML5 Canvas rendering
- Mouse event handling (mousedown, mousemove, mouseup)
- Drawing operations execution
- Image loading and display

**Events Emitted:**
```typescript
- 'draw-complete': When a drawing operation finishes
- 'image-loaded': When image is successfully pasted
```

#### `Toolbar.vue`
Tool selection interface with icon buttons.

**Tools Available:**
- Select (pointer)
- Text
- Draw (freehand)
- Line
- Rectangle
- Arrow
- Eraser

**Props:**
```typescript
interface Props {
  selectedTool: ToolType
}
```

**Events:**
```typescript
- 'tool-selected': (tool: ToolType) => void
```

#### `ColorPicker.vue`
Color selection component with preset colors and custom picker.

**Props:**
```typescript
interface Props {
  modelValue: string  // Current color (hex format)
}
```

**Features:**
- Preset color palette
- Custom color input
- Recent colors history

#### `PropertyPanel.vue`
Dynamic properties panel that changes based on selected tool.

**Props:**
```typescript
interface Props {
  tool: ToolType
  lineWidth: number
  fontSize: number
  fontFamily: string
}
```

**Displays:**
- Line width slider (for drawing, lines, shapes)
- Font size and family (for text tool)
- Fill/stroke options (for shapes)

### Composables (Business Logic)

#### `useClipboard.ts`
Handles clipboard operations for pasting images.

**API:**
```typescript
interface UseClipboard {
  pasteImage: () => Promise<string | null>
  hasClipboardImage: () => Promise<boolean>
}

const useClipboard = (): UseClipboard
```

**Implementation Details:**
- Uses Clipboard API (`navigator.clipboard.read()`)
- Supports image/png and image/jpeg MIME types
- Converts blob to base64 for canvas rendering
- Handles permissions and errors gracefully

**Usage:**
```typescript
const { pasteImage } = useClipboard()

const handlePaste = async () => {
  const imageData = await pasteImage()
  if (imageData) {
    // Load image to canvas
  }
}
```

#### `useCanvas.ts`
Manages canvas state and operations.

**API:**
```typescript
interface UseCanvas {
  canvasRef: Ref<HTMLCanvasElement | null>
  ctx: Ref<CanvasRenderingContext2D | null>
  loadImage: (dataUrl: string) => Promise<void>
  clear: () => void
  getImageData: () => string
  resize: (width: number, height: number) => void
}

const useCanvas = (): UseCanvas
```

**Responsibilities:**
- Canvas initialization and context management
- Image loading and scaling
- Canvas clearing
- Export to base64/blob
- Resize handling

**Image Loading:**
```typescript
const loadImage = async (dataUrl: string) => {
  const img = new Image()
  img.onload = () => {
    // Calculate scaling to fit canvas
    const scale = Math.min(
      canvas.width / img.width,
      canvas.height / img.height
    )
    // Draw centered and scaled
    ctx.drawImage(img, x, y, width, height)
  }
  img.src = dataUrl
}
```

#### `useDrawing.ts`
Implements all drawing tools and operations.

**API:**
```typescript
interface UseDrawing {
  currentTool: Ref<ToolType>
  startDrawing: (x: number, y: number) => void
  draw: (x: number, y: number) => void
  stopDrawing: () => void
  drawText: (x: number, y: number, text: string) => void
  drawLine: (x1: number, y1: number, x2: number, y2: number) => void
  drawRectangle: (x: number, y: number, width: number, height: number, filled: boolean) => void
  drawArrow: (x1: number, y1: number, x2: number, y2: number) => void
}

const useDrawing = (
  ctx: Ref<CanvasRenderingContext2D | null>,
  options: DrawingOptions
): UseDrawing
```

**Drawing Options:**
```typescript
interface DrawingOptions {
  color: string
  lineWidth: number
  fontSize: number
  fontFamily: string
}
```

**Tool Implementations:**

**Freehand Drawing:**
```typescript
// On mouse down: start path
ctx.beginPath()
ctx.moveTo(x, y)

// On mouse move: continue path
ctx.lineTo(x, y)
ctx.stroke()

// On mouse up: end path
ctx.closePath()
```

**Line Tool:**
```typescript
// Store start point on mouse down
// On mouse move: redraw from saved snapshot
// On mouse up: finalize line
ctx.beginPath()
ctx.moveTo(x1, y1)
ctx.lineTo(x2, y2)
ctx.stroke()
```

**Arrow Tool:**
```typescript
// Draw line
drawLine(x1, y1, x2, y2)

// Calculate arrow head
const angle = Math.atan2(y2 - y1, x2 - x1)
const headLength = 20

// Draw arrow head
ctx.beginPath()
ctx.moveTo(x2, y2)
ctx.lineTo(
  x2 - headLength * Math.cos(angle - Math.PI / 6),
  y2 - headLength * Math.sin(angle - Math.PI / 6)
)
ctx.moveTo(x2, y2)
ctx.lineTo(
  x2 - headLength * Math.cos(angle + Math.PI / 6),
  y2 - headLength * Math.sin(angle + Math.PI / 6)
)
ctx.stroke()
```

**Text Tool:**
```typescript
// On click: show input dialog or inline text entry
const text = prompt('Enter text:')
if (text) {
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}
```

#### `useHistory.ts`
Implements undo/redo functionality.

**API:**
```typescript
interface UseHistory {
  saveState: () => void
  undo: () => void
  redo: () => void
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  clear: () => void
}

const useHistory = (
  canvas: Ref<HTMLCanvasElement | null>
): UseHistory
```

**Implementation:**
- Maintains two stacks: `undoStack` and `redoStack`
- Each state is a canvas snapshot (ImageData)
- Limited history size (default: 50 states)

**State Management:**
```typescript
const saveState = () => {
  const imageData = ctx.getImageData(0, 0, width, height)
  undoStack.push(imageData)
  if (undoStack.length > maxHistory) {
    undoStack.shift() // Remove oldest
  }
  redoStack.length = 0 // Clear redo stack
}

const undo = () => {
  if (canUndo) {
    const currentState = ctx.getImageData(0, 0, width, height)
    redoStack.push(currentState)
    const previousState = undoStack.pop()
    ctx.putImageData(previousState, 0, 0)
  }
}
```

### Type Definitions

**`types/index.ts`:**
```typescript
export type ToolType = 
  | 'select'
  | 'text'
  | 'draw'
  | 'line'
  | 'rectangle'
  | 'arrow'
  | 'eraser'

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
```

## Backend Architecture

### Go Application Structure

#### `main.go`
Wails application entry point.

```go
package main

import (
    "embed"
    "github.com/wailsapp/wails/v2"
    "github.com/wailsapp/wails/v2/pkg/options"
    "github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
    app := NewApp()

    err := wails.Run(&options.App{
        Title:  "Paint App",
        Width:  1024,
        Height: 768,
        AssetServer: &assetserver.Options{
            Assets: assets,
        },
        BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
        OnStartup:        app.startup,
        Bind: []interface{}{
            app,
        },
    })

    if err != nil {
        println("Error:", err.Error())
    }
}
```

#### `app.go`
Main application struct with exported methods.

```go
package main

import (
    "context"
    "encoding/base64"
    "fmt"
    "os"
    "path/filepath"
    "time"
)

type App struct {
    ctx context.Context
}

func NewApp() *App {
    return &App{}
}

func (a *App) startup(ctx context.Context) {
    a.ctx = ctx
}

// SaveImage saves base64 encoded image to file
func (a *App) SaveImage(base64Data string, format string) (string, error) {
    // Decode base64
    data, err := base64.StdEncoding.DecodeString(base64Data)
    if err != nil {
        return "", fmt.Errorf("failed to decode image: %w", err)
    }

    // Generate filename with timestamp
    timestamp := time.Now().Format("20060102_150405")
    filename := fmt.Sprintf("paint_%s.%s", timestamp, format)
    
    // Get user's Pictures directory
    homeDir, _ := os.UserHomeDir()
    picturesDir := filepath.Join(homeDir, "Pictures", "PaintApp")
    
    // Create directory if it doesn't exist
    os.MkdirAll(picturesDir, 0755)
    
    filepath := filepath.Join(picturesDir, filename)
    
    // Write file
    err = os.WriteFile(filepath, data, 0644)
    if err != nil {
        return "", fmt.Errorf("failed to write file: %w", err)
    }

    return filepath, nil
}

// GetAppVersion returns the application version
func (a *App) GetAppVersion() string {
    return "1.0.0"
}
```

#### `file.go`
File operation utilities.

```go
package main

import (
    "os"
    "path/filepath"
)

// EnsureDir creates directory if it doesn't exist
func EnsureDir(path string) error {
    return os.MkdirAll(path, 0755)
}

// GetDefaultSavePath returns default save location
func GetDefaultSavePath() (string, error) {
    homeDir, err := os.UserHomeDir()
    if err != nil {
        return "", err
    }
    return filepath.Join(homeDir, "Pictures", "PaintApp"), nil
}
```

## Data Flow

### Image Paste Flow
```
User presses Cmd+V
    ↓
App.vue catches keydown event
    ↓
Calls useClipboard.pasteImage()
    ↓
Clipboard API reads image blob
    ↓
Convert blob to base64 data URL
    ↓
Pass to Canvas.vue via loadImage()
    ↓
Canvas draws image and saves to history
    ↓
UI updates to show image
```

### Drawing Flow
```
User clicks toolbar to select tool
    ↓
Toolbar emits 'tool-selected' event
    ↓
App.vue updates currentTool state
    ↓
Canvas.vue receives tool prop update
    ↓
User clicks/drags on canvas
    ↓
Canvas mousedown → useDrawing.startDrawing()
    ↓
Canvas mousemove → useDrawing.draw()
    ↓
Canvas mouseup → useDrawing.stopDrawing()
    ↓
Drawing complete → save to history
    ↓
Canvas emits 'draw-complete' event
```

### Export Flow
```
User clicks Export button
    ↓
Canvas.vue.getImageData() called
    ↓
canvas.toDataURL('image/png')
    ↓
Remove data URL prefix
    ↓
Call backend: app.SaveImage(base64, 'png')
    ↓
Go decodes base64 and writes file
    ↓
Returns file path
    ↓
Display success message to user
```

## State Management

### Application State
- **Current Tool**: Reactive ref, shared via props
- **Drawing Options**: Reactive refs (color, lineWidth, etc.)
- **Canvas State**: Managed in useCanvas composable
- **History State**: Managed in useHistory composable

### State Flow
```
App.vue (Root State)
    ↓
Props → Canvas, Toolbar, ColorPicker, PropertyPanel
    ↓
Events ← Components emit changes back
    ↓
App.vue updates state
    ↓
Props flow down again (reactive updates)
```

## Performance Considerations

### Canvas Optimization
- Use `requestAnimationFrame` for smooth drawing
- Implement debouncing for resize events
- Cache canvas snapshots instead of redrawing all elements
- Use `ctx.save()` and `ctx.restore()` for context state

### History Management
- Limit history stack size (default: 50)
- Use `ImageData` instead of serializing to base64
- Clear redo stack on new operations

### Memory Management
- Clear large image data when not needed
- Implement canvas pooling for multiple operations
- Use `URL.revokeObjectURL()` for temporary URLs

## Security Considerations

### Clipboard Access
- Request permissions appropriately
- Handle permission denial gracefully
- Validate image types before processing

### File Operations
- Sanitize filenames
- Validate file paths
- Implement file size limits
- Use secure default directories

### Data Handling
- Validate base64 data before decoding
- Implement size limits for images
- Handle corrupted image data

## Testing Strategy

### Unit Tests
- Test each composable independently
- Mock canvas context for drawing tests
- Test undo/redo logic
- Test clipboard operations

### Integration Tests
- Test component interactions
- Test Wails bridge communication
- Test file save operations

### E2E Tests
- Test complete user workflows
- Test keyboard shortcuts
- Test image paste and export

## Future Enhancements

### Planned Features
1. **Layers**: Multiple annotation layers with z-index control
2. **Transforms**: Move, resize, rotate existing annotations
3. **Advanced Shapes**: Circles, polygons, curved arrows
4. **Text Formatting**: Bold, italic, underline, alignment
5. **Filters**: Blur, brightness, contrast adjustments
6. **Templates**: Predefined annotation templates
7. **Hotkeys**: Customizable keyboard shortcuts
8. **Plugins**: Extension system for custom tools

### Architecture Changes
- Introduce Pinia for complex state management
- Implement annotation layer as separate canvas overlays
- Add WebWorker for heavy image processing
- Implement virtual scrolling for large canvases
