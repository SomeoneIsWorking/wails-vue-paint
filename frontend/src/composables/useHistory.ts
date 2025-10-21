import { ref, type Ref } from 'vue'

const MAX_HISTORY = 50

export function useHistory(canvas: Ref<HTMLCanvasElement | null>) {
  const undoStack = ref<ImageData[]>([])
  const redoStack = ref<ImageData[]>([])
  const canUndo = ref(false)
  const canRedo = ref(false)

  const updateFlags = () => {
    canUndo.value = undoStack.value.length > 0
    canRedo.value = redoStack.value.length > 0
  }

  const saveState = () => {
    const canvasElement = canvas.value
    if (!canvasElement) return

    const ctx = canvasElement.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height)
    undoStack.value.push(imageData)

    // Limit history size
    if (undoStack.value.length > MAX_HISTORY) {
      undoStack.value.shift()
    }

    // Clear redo stack
    redoStack.value = []
    updateFlags()
  }

  const undo = () => {
    const canvasElement = canvas.value
    if (!canvasElement || undoStack.value.length === 0) return

    const ctx = canvasElement.getContext('2d')
    if (!ctx) return

    // Save current state to redo stack
    const currentState = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height)
    redoStack.value.push(currentState)

    // Restore previous state
    const previousState = undoStack.value.pop()
    if (previousState) {
      ctx.putImageData(previousState, 0, 0)
    }

    updateFlags()
  }

  const redo = () => {
    const canvasElement = canvas.value
    if (!canvasElement || redoStack.value.length === 0) return

    const ctx = canvasElement.getContext('2d')
    if (!ctx) return

    // Save current state to undo stack
    const currentState = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height)
    undoStack.value.push(currentState)

    // Restore next state
    const nextState = redoStack.value.pop()
    if (nextState) {
      ctx.putImageData(nextState, 0, 0)
    }

    updateFlags()
  }

  const clear = () => {
    undoStack.value = []
    redoStack.value = []
    updateFlags()
  }

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    clear
  }
}
