import type { Ref } from 'vue'
import type { Shape, Bounds } from '@/types'
import { createShapeElement, createSelectionBox, createDragSelectionBox } from './svgHelpers'

export class SVGRenderer {
  constructor(private svgRef: Ref<SVGSVGElement | null>) {}

  private getContentGroup(): SVGGElement | null {
    const svg = this.svgRef.value
    if (!svg) return null
    
    let group = svg.querySelector('.svg-content') as SVGGElement
    if (!group) {
      group = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement
      group.setAttribute('class', 'svg-content')
      svg.appendChild(group)
    }
    return group
  }

  clearShapes(): void {
    const group = this.getContentGroup()
    if (!group) return

    const elementsToRemove = Array.from(group.children).filter(
      child => 
        child.hasAttribute('data-shape-id') || 
        child.classList.contains('selection-box') ||
        child.classList.contains('drag-selection-box') ||
        child.classList.contains('preview-box')
    )
    elementsToRemove.forEach(el => el.remove())
  }

  renderShape(shape: Shape, isSelectable: boolean, onClick?: (shapeId: string) => void): void {
    const group = this.getContentGroup()
    if (!group) return

    // Remove old element if exists
    if (shape.element && shape.element.parentNode) {
      shape.element.parentNode.removeChild(shape.element)
    }

    // Create and add new element
    const element = createShapeElement(shape, isSelectable)
    if (element) {
      shape.element = element
      
      // Add click handler for selection
      if (onClick) {
        element.addEventListener('click', (e) => {
          e.stopPropagation()
          onClick(shape.id)
        })
      }
      
      group.appendChild(element)
    }
  }

  renderSelectionBox(bounds: Bounds): void {
    const group = this.getContentGroup()
    if (!group) return

    // Remove existing selection box
    const existingBox = group.querySelector('.selection-box')
    if (existingBox) {
      existingBox.remove()
    }

    const rect = createSelectionBox(bounds)
    group.appendChild(rect)
  }

  renderMultipleSelectionBoxes(boundsArray: Bounds[]): void {
    const group = this.getContentGroup()
    if (!group) return

    // Remove existing selection boxes
    const existingBoxes = group.querySelectorAll('.selection-box')
    existingBoxes.forEach(box => box.remove())

    boundsArray.forEach(bounds => {
      const rect = createSelectionBox(bounds)
      group.appendChild(rect)
    })
  }

  renderDragSelectionBox(bounds: Bounds): void {
    const group = this.getContentGroup()
    if (!group) return

    // Remove existing drag selection box
    const existingBox = group.querySelector('.drag-selection-box')
    if (existingBox) {
      existingBox.remove()
    }

    const rect = createDragSelectionBox(bounds)
    group.appendChild(rect)
  }

  removeDragSelectionBox(): void {
    const group = this.getContentGroup()
    if (!group) return

    const existingBox = group.querySelector('.drag-selection-box')
    if (existingBox) {
      existingBox.remove()
    }
  }

  renderPreviewBoxes(boundsArray: Bounds[]): void {
    const group = this.getContentGroup()
    if (!group) return

    // Remove existing preview boxes
    const existingBoxes = group.querySelectorAll('.preview-box')
    existingBoxes.forEach(box => box.remove())

    boundsArray.forEach(bounds => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      const padding = 3
      rect.setAttribute('class', 'preview-box')
      rect.setAttribute('x', (bounds.x - padding).toString())
      rect.setAttribute('y', (bounds.y - padding).toString())
      rect.setAttribute('width', (bounds.width + padding * 2).toString())
      rect.setAttribute('height', (bounds.height + padding * 2).toString())
      rect.setAttribute('stroke', '#FF8800')
      rect.setAttribute('stroke-width', '2')
      rect.setAttribute('stroke-dasharray', '4,4')
      rect.setAttribute('fill', 'none')
      rect.style.pointerEvents = 'none'
      group.appendChild(rect)
    })
  }

  addTemporaryElement(element: SVGElement): void {
    const group = this.getContentGroup()
    if (group) {
      group.appendChild(element)
    }
  }

  removeTemporaryElement(element: SVGElement): void {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element)
    }
  }
}
