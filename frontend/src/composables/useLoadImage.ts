import { Point } from "@/utils/Point";
import { ImageShape } from "./shapes";
import { generateShapeId } from "@/utils/shapeHelpers";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = src;
  });
}

export async function createImageShape(src: string) {
  const img = await loadImage(src);
  return new ImageShape(
    generateShapeId(),
    "#000000",
    new Point(0, 0),
    src,
    img.width,
    img.height
  );
}
