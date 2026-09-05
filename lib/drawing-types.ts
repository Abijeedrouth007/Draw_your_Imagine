export interface Point {
  x: number;
  y: number;
  timestamp?: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
  style: 'solid' | 'neon' | 'rainbow';
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type GestureType = 'PINCH' | 'FIST' | 'OPEN_PALM' | 'POINT' | 'NONE';

export interface FingerAnalysis {
  gesture: GestureType;
  isPinching: boolean;
  pinchDistance: number; // 0 to 1 normalized
  pinchDistancePx: number;
  pinchMidpoint: Point;
  isFist: boolean;
  fistConfidence: number; // 0 to 1
  fingerStates: {
    thumb: { extended: boolean; curl: number };
    index: { extended: boolean; curl: number };
    middle: { extended: boolean; curl: number };
    ring: { extended: boolean; curl: number };
    pinky: { extended: boolean; curl: number };
  };
  handSpread: number;
  handedness: 'Left' | 'Right' | 'Unknown';
  handConfidence: number;
}

export interface CanvasSettings {
  color: string;
  brushSize: number;
  brushStyle: 'solid' | 'neon' | 'rainbow';
  pinchThreshold: number; // default ~0.065
  fistThreshold: number; // default ~0.75
  eraseMode: 'wipe_all' | 'eraser_brush';
  eraserSize: number; // radius in px, default ~44
  showSkeleton: boolean;
  showTelemetry: boolean;
  mirrorCamera: boolean;
  backgroundMode: 'camera' | 'camera_dimmed' | 'dark' | 'light';
}
