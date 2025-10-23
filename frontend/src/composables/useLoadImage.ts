import { ImageShape } from "./shapes";

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
    "img_" + Date.now(),
    "#000000",
    0,
    { x: 50, y: 50 },
    src,
    img.width,
    img.height
  );
}
