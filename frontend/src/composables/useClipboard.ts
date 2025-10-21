export function useClipboard() {
  const pasteImage = async (): Promise<string | null> => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.read) {
        console.error('Clipboard API not available')
        return null
      }

      const clipboardItems = await navigator.clipboard.read()
      
      for (const item of clipboardItems) {
        // Look for image types
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type)
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to read clipboard:', error)
      return null
    }
  }

  const hasClipboardImage = async (): Promise<boolean> => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        return false
      }

      const clipboardItems = await navigator.clipboard.read()
      
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            return true
          }
        }
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  return {
    pasteImage,
    hasClipboardImage
  }
}
