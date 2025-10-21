# Wails Vue Paint App

A desktop application built with Wails (Go + Vue 3 + TypeScript) that allows you to quickly paste images from clipboard, annotate them with text, lines, arrows, and shapes, then export the result.

## Features

### Core Functionality
- **Clipboard Image Paste**: Press `Command + V` (macOS) to paste images directly from clipboard
- **Image Display**: Automatically loads and displays pasted images on canvas
- **Multiple Annotation Tools**:
  - Text labels with customizable font, size, and color
  - Freehand drawing with adjustable brush size
  - Straight lines
  - Rectangles (filled or outlined)
  - Arrows
- **Color Picker**: Choose colors for all annotation types
- **Undo/Redo**: Full history management for all operations
- **Export**: Save annotated images as PNG, JPEG, or other formats
- **Clear Canvas**: Reset to start fresh

### User Interface
- Clean, modern UI with Vue 3 Composition API
- Tool palette with icon buttons
- Color picker
- Property controls (size, thickness, font)
- Keyboard shortcuts
- Responsive canvas that scales to window size

## Tech Stack

- **Frontend**: Vue 3 with TypeScript (`<script setup>` syntax)
- **Backend**: Go 1.21+
- **Framework**: Wails v2
- **Styling**: CSS3 with custom properties
- **Canvas API**: HTML5 Canvas for rendering

## Project Structure

```
wails-vue-paint/
├── frontend/               # Vue 3 frontend
│   ├── src/
│   │   ├── App.vue        # Main application component
│   │   ├── components/
│   │   │   ├── Canvas.vue          # Main canvas component
│   │   │   ├── Toolbar.vue         # Tool selection toolbar
│   │   │   ├── ColorPicker.vue     # Color selection
│   │   │   └── PropertyPanel.vue   # Tool properties
│   │   ├── composables/
│   │   │   ├── useCanvas.ts        # Canvas management logic
│   │   │   ├── useClipboard.ts     # Clipboard operations
│   │   │   ├── useDrawing.ts       # Drawing tools logic
│   │   │   └── useHistory.ts       # Undo/redo functionality
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript type definitions
│   │   └── main.ts                 # Entry point
│   ├── package.json
│   └── tsconfig.json
├── backend/               # Go backend
│   ├── app.go            # Main app struct and methods
│   └── file.go           # File operations
├── main.go               # Wails entry point
├── wails.json            # Wails configuration
├── README.md             # This file
└── ARCHITECTURE.md       # Detailed architecture documentation
```

## Installation

### Prerequisites
- Go 1.21 or later
- Node.js 16+ and npm
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

### Setup
```bash
# Clone or navigate to the project directory
cd wails-vue-paint

# Install dependencies and build
wails build

# Or run in development mode
wails dev
```

## Usage

1. **Launch the app**: Run the built executable or use `wails dev`
2. **Paste an image**: Press `Command + V` to paste an image from your clipboard
3. **Select a tool**: Click on the toolbar to choose a drawing tool
   - Text: Click to add text at that position
   - Draw: Click and drag to draw freehand
   - Line: Click start point, drag, release at end point
   - Rectangle: Click corner, drag to opposite corner
   - Arrow: Click start, drag to end (arrowhead appears at end)
4. **Customize**: Use color picker and property controls to adjust appearance
5. **Undo/Redo**: Use toolbar buttons or keyboard shortcuts (`Cmd+Z`, `Cmd+Shift+Z`)
6. **Export**: Click export button to save your annotated image

## Keyboard Shortcuts

- `Command + V`: Paste image from clipboard
- `Command + Z`: Undo last action
- `Command + Shift + Z`: Redo
- `Command + S`: Export image
- `Escape`: Deselect current tool

## Development

### Running in Dev Mode
```bash
wails dev
```
This starts the app with hot-reload enabled for the frontend.

### Building for Production
```bash
# Build for current platform
wails build

# Build for specific platform
wails build -platform darwin/arm64
```

### Adding New Tools
1. Define tool type in `frontend/src/types/index.ts`
2. Add tool logic in `frontend/src/composables/useDrawing.ts`
3. Add toolbar button in `frontend/src/components/Toolbar.vue`
4. Implement rendering in `frontend/src/components/Canvas.vue`

## API Documentation

### Go Backend Methods

#### `app.SaveImage(base64Data string, format string) string`
Saves the canvas as an image file.
- **Parameters**: 
  - `base64Data`: Base64 encoded image data
  - `format`: File format (png, jpg, etc.)
- **Returns**: File path of saved image

#### `app.GetClipboardImage() string`
Retrieves image from system clipboard (if needed for advanced features).
- **Returns**: Base64 encoded image data or error message

### Frontend Composables

See `ARCHITECTURE.md` for detailed API documentation of Vue composables.

## License

MIT License - Feel free to use and modify as needed.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Roadmap

- [ ] Multiple layer support
- [ ] Shape transformations (move, resize, rotate)
- [ ] More shapes (circles, polygons)
- [ ] Text formatting (bold, italic)
- [ ] Image filters and effects
- [ ] Cloud save integration
- [ ] Collaboration features
