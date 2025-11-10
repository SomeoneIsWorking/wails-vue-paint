# Wails Vue Paint

A simple painting application built with [Wails](https://wails.io/), [Vue 3](https://vuejs.org/), and [TypeScript](https://www.typescriptlang.org/).

## Features

- Draw shapes (rectangles, circles, lines, arrows)
- Text tool for adding text to canvas
- Image insertion
- Color picker for brush and fill colors
- Property panel for adjusting shape properties
- Undo/redo support
- Export canvas as image

## Prerequisites

- Go 1.18 or higher
- Node.js 14.0 or higher
- Wails CLI

## Installation

1. Clone the repository:
```bash
git clone https://github.com/SomeoneIsWorking/wails-vue-paint.git
cd wails-vue-paint
```

2. Install dependencies:
```bash
npm install
go mod download
```

## Development

Run the application in development mode:
```bash
wails dev
```

This will start the development server with hot reload enabled.

## Building

Create a production build:
```bash
wails build
```

The built application will be available in the `build/bin/` directory.

## Project Structure

- `frontend/` - Vue 3 + TypeScript frontend
  - `src/components/` - Vue components
  - `src/composables/` - Vue composables for logic
  - `src/stores/` - Pinia stores for state management
  - `src/types/` - TypeScript type definitions
  - `src/utils/` - Utility functions and classes
- `app.go` - Main Wails application backend
- `main.go` - Application entry point

## Technologies

- **Frontend**: Vue 3, TypeScript, Vite
- **Backend**: Go, Wails
- **Build Tool**: Wails CLI

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
