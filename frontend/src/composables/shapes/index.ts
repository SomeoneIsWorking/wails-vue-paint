import { ArrowShape } from "./ArrowShape";
import { CircleShape } from "./CircleShape";
import { DrawShape } from "./DrawShape";
import { ImageShape } from "./ImageShape";
import { LineShape } from "./LineShape";
import { RectangleShape } from "./RectangleShape";
import { TextShape } from "./TextShape";

export {
  ArrowShape,
  CircleShape,
  DrawShape,
  ImageShape,
  LineShape,
  RectangleShape,
  TextShape,
};

export type Shape =
  | ArrowShape
  | CircleShape
  | DrawShape
  | ImageShape
  | LineShape
  | RectangleShape
  | TextShape;
