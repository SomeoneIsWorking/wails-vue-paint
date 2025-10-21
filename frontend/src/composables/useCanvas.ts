import { ref, type Ref } from 'vue'

export function useCanvas() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const ctx = ref<CanvasRenderingContext2D | null>(null)
  const baseImage = ref<HTMLImageElement | null>(null)

  const loadImage = async (dataUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.value
      const context = ctx.value
      
      if (!canvas || !context) {
        reject(new Error('Canvas not initialized'))
        return
      }

      const img = new Image()
      img.onload = () => {
        // Store the base image
        baseImage.value = img

        // Calculate scaling to fit canvas while maintaining aspect ratio
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        )

        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale

        // Center the image
        const x = (canvas.width - scaledWidth) / 2
        const y = (canvas.height - scaledHeight) / 2

        // Clear canvas and draw image
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(img, x, y, scaledWidth, scaledHeight)
        
        resolve()
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = dataUrl
    })
  }

  const clear = () => {
    const canvas = canvasRef.value
    const context = ctx.value
    
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      baseImage.value = null
    }
  }

  const getImageData = (): string => {
    const canvas = canvasRef.value
    if (!canvas) return ''
    
    return canvas.toDataURL('image/png')
  }

  const resize = (width: number, height: number) => {
    const canvas = canvasRef.value
    const context = ctx.value
    
    if (canvas && context) {
      // Save current canvas content
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      
      // Resize canvas
      canvas.width = width
      canvas.height = height
      
      // Restore content
      context.putImageData(imageData, 0, 0)
    }
  }

  return {
    canvasRef,
    ctx,
    loadImage,
    clear,
    getImageData,
    resize
  }
}
