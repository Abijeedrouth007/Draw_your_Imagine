'use client';

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Stroke, Point, CanvasSettings } from '@/lib/drawing-types';

export interface DrawingCanvasHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  exportImage: (withWebcam?: boolean, videoEl?: HTMLVideoElement | null) => string | null;
  getHistoryCount: () => { undoCount: number; redoCount: number };
}

interface DrawingCanvasProps {
  settings: CanvasSettings;
  currentPinchPoint: Point | null; // normalized 0..1
  isPinching: boolean;
  isFist: boolean;
  fistPoint?: Point | null;
  canvasWidth: number;
  canvasHeight: number;
  onEraseTriggered?: () => void;
}

// Distance from point to line segment (capsule distance for swept eraser)
function distToSegment(pt: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) {
    return Math.hypot(pt.x - a.x, pt.y - a.y);
  }
  const apx = pt.x - a.x;
  const apy = pt.y - a.y;
  let t = (apx * abx + apy * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * abx;
  const projY = a.y + t * aby;
  return Math.hypot(pt.x - projX, pt.y - projY);
}

// Granular stroke eraser: cuts & splits strokes into sub-strokes where intersected
function eraseStrokes(
  currentStrokes: Stroke[],
  p1: Point,
  p2: Point,
  radius: number
): { updatedStrokes: Stroke[]; wasModified: boolean } {
  let wasModified = false;
  const updatedStrokes: Stroke[] = [];

  for (const stroke of currentStrokes) {
    if (stroke.points.length === 0) continue;

    // Fast bounding box rejection
    let minX = stroke.points[0].x;
    let maxX = stroke.points[0].x;
    let minY = stroke.points[0].y;
    let maxY = stroke.points[0].y;
    for (let i = 1; i < stroke.points.length; i++) {
      const pt = stroke.points[i];
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    const effectivePad = radius + stroke.size + 10;
    const eraserMinX = Math.min(p1.x, p2.x) - effectivePad;
    const eraserMaxX = Math.max(p1.x, p2.x) + effectivePad;
    const eraserMinY = Math.min(p1.y, p2.y) - effectivePad;
    const eraserMaxY = Math.max(p1.y, p2.y) + effectivePad;

    if (maxX < eraserMinX || minX > eraserMaxX || maxY < eraserMinY || minY > eraserMaxY) {
      updatedStrokes.push(stroke);
      continue;
    }

    // Densify points along any segments longer than maxGap so lines don't skip the eraser
    const densePoints: Point[] = [];
    const maxGap = Math.max(4, radius * 0.35);
    for (let i = 0; i < stroke.points.length; i++) {
      densePoints.push(stroke.points[i]);
      if (i < stroke.points.length - 1) {
        const a = stroke.points[i];
        const b = stroke.points[i + 1];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d > maxGap) {
          const steps = Math.ceil(d / maxGap);
          for (let s = 1; s < steps; s++) {
            const t = s / steps;
            densePoints.push({
              x: a.x + t * (b.x - a.x),
              y: a.y + t * (b.y - a.y),
            });
          }
        }
      }
    }

    // Determine surviving segments outside the eraser volume
    const hitRadius = radius + stroke.size / 2;
    let subStrokePoints: Point[] = [];
    let strokeChanged = false;
    let subIdx = 0;

    for (const pt of densePoints) {
      const dist = distToSegment(pt, p1, p2);
      if (dist <= hitRadius) {
        // Point is inside the real eraser zone: erase it!
        strokeChanged = true;
        if (subStrokePoints.length > 0) {
          // Keep sub-strokes that have at least 2 points (or single point if original stroke was 1 point)
          if (subStrokePoints.length >= 2 || (stroke.points.length === 1 && subStrokePoints.length === 1)) {
            updatedStrokes.push({
              id: `${stroke.id}-p${subIdx++}`,
              points: subStrokePoints,
              color: stroke.color,
              size: stroke.size,
              style: stroke.style,
            });
          }
          subStrokePoints = [];
        }
      } else {
        subStrokePoints.push(pt);
      }
    }

    if (subStrokePoints.length > 0) {
      if (subStrokePoints.length >= 2 || (stroke.points.length === 1 && subStrokePoints.length === 1 && !strokeChanged)) {
        updatedStrokes.push({
          id: strokeChanged ? `${stroke.id}-p${subIdx++}` : stroke.id,
          points: subStrokePoints,
          color: stroke.color,
          size: stroke.size,
          style: stroke.style,
        });
      }
    }

    if (strokeChanged) {
      wasModified = true;
    }
  }

  return { updatedStrokes, wasModified };
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(function DrawingCanvas(
  {
    settings,
    currentPinchPoint,
    isPinching,
    isFist,
    fistPoint,
    canvasWidth,
    canvasHeight,
    onEraseTriggered,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  strokesRef.current = strokes;

  // History stacks for state-level Undo & Redo
  const [historyStack, setHistoryStack] = useState<Stroke[][]>([]);
  const [futureStack, setFutureStack] = useState<Stroke[][]>([]);

  // Granular fist eraser tracking
  const preEraseSnapshotRef = useRef<Stroke[] | null>(null);
  const hasErasedInFistRef = useRef<boolean>(false);
  const prevEraserPointRef = useRef<Point | null>(null);

  const currentStrokeRef = useRef<Point[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const smoothedPointRef = useRef<Point | null>(null);

  // Expose undo, redo, clear, export methods
  useImperativeHandle(ref, () => ({
    undo: () => {
      setHistoryStack((hStack) => {
        if (hStack.length === 0) return hStack;
        const previousState = hStack[hStack.length - 1];
        const newHStack = hStack.slice(0, hStack.length - 1);
        setFutureStack((fStack) => [...fStack, strokesRef.current]);
        setStrokes(previousState);
        return newHStack;
      });
    },
    redo: () => {
      setFutureStack((fStack) => {
        if (fStack.length === 0) return fStack;
        const nextState = fStack[fStack.length - 1];
        const newFStack = fStack.slice(0, fStack.length - 1);
        setHistoryStack((hStack) => [...hStack, strokesRef.current]);
        setStrokes(nextState);
        return newFStack;
      });
    },
    clear: () => {
      if (strokesRef.current.length === 0) return;
      setHistoryStack((h) => [...h, strokesRef.current]);
      setFutureStack([]);
      setStrokes([]);
    },
    exportImage: (withWebcam = false, videoEl = null) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return null;

      if (withWebcam && videoEl && videoEl.readyState >= 2) {
        if (settings.mirrorCamera) {
          ctx.save();
          ctx.translate(exportCanvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoEl, 0, 0, exportCanvas.width, exportCanvas.height);
          ctx.restore();
        } else {
          ctx.drawImage(videoEl, 0, 0, exportCanvas.width, exportCanvas.height);
        }
      } else {
        if (settings.backgroundMode === 'dark') {
          ctx.fillStyle = '#0A0A0A';
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        } else if (settings.backgroundMode === 'light') {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }
      }

      ctx.drawImage(canvas, 0, 0);
      return exportCanvas.toDataURL('image/png');
    },
    getHistoryCount: () => ({
      undoCount: historyStack.length,
      redoCount: futureStack.length,
    }),
  }));

  // Handle Real Granular Fist Eraser
  useEffect(() => {
    if (isFist && fistPoint && canvasWidth > 0 && canvasHeight > 0) {
      // If this is the start of the fist gesture, take snapshot for Undo history
      if (!preEraseSnapshotRef.current) {
        preEraseSnapshotRef.current = strokesRef.current;
        hasErasedInFistRef.current = false;
      }

      const curX = settings.mirrorCamera ? (1 - fistPoint.x) * canvasWidth : fistPoint.x * canvasWidth;
      const curY = fistPoint.y * canvasHeight;
      const p2: Point = { x: curX, y: curY };
      const p1: Point = prevEraserPointRef.current ?? p2;
      prevEraserPointRef.current = p2;

      const eraserRadius = settings.eraserSize || 44;

      if (strokesRef.current.length > 0) {
        const { updatedStrokes, wasModified } = eraseStrokes(
          strokesRef.current,
          p1,
          p2,
          eraserRadius
        );

        if (wasModified) {
          hasErasedInFistRef.current = true;
          setStrokes(updatedStrokes);
        }
      }
    } else {
      // Fist gesture ended
      prevEraserPointRef.current = null;
      if (hasErasedInFistRef.current && preEraseSnapshotRef.current) {
        // Push the pre-erase snapshot to undo stack so user can undo this erase action!
        const snapshot = preEraseSnapshotRef.current;
        setHistoryStack((h) => [...h, snapshot]);
        setFutureStack([]);
        onEraseTriggered?.();
      }
      preEraseSnapshotRef.current = null;
      hasErasedInFistRef.current = false;
    }
  }, [isFist, fistPoint, settings.mirrorCamera, settings.eraserSize, canvasWidth, canvasHeight, onEraseTriggered]);

  // Redraw canvas whenever strokes or current active stroke changes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = [...strokes];
    if (isDrawingRef.current && currentStrokeRef.current.length > 0) {
      allStrokes.push({
        id: 'current-live-stroke',
        points: currentStrokeRef.current,
        color: settings.color,
        size: settings.brushSize,
        style: settings.brushStyle,
      });
    }

    for (const stroke of allStrokes) {
      if (stroke.points.length === 0) continue;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.size;

      if (stroke.style === 'neon') {
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = stroke.size * 2.2;
        ctx.strokeStyle = stroke.color;
      } else if (stroke.style === 'rainbow') {
        ctx.shadowBlur = 0;
      } else {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = stroke.color;
      }

      if (stroke.points.length === 1) {
        ctx.fillStyle = stroke.color;
        ctx.beginPath();
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (stroke.style === 'rainbow') {
        for (let i = 0; i < stroke.points.length - 1; i++) {
          const p1 = stroke.points[i];
          const p2 = stroke.points[i + 1];
          const hue = (i * 7) % 360;
          ctx.strokeStyle = `hsl(${hue}, 100%, 55%)`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length - 1; i++) {
          const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
          const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
        }

        if (stroke.points.length > 1) {
          const last = stroke.points[stroke.points.length - 1];
          ctx.lineTo(last.x, last.y);
        }

        ctx.stroke();
      }

      ctx.restore();
    }
  }, [strokes, settings]);

  // Handle Drawing input from Pinch
  useEffect(() => {
    if (canvasWidth === 0 || canvasHeight === 0) return;

    if (isPinching && currentPinchPoint && !isFist) {
      const rawX = settings.mirrorCamera
        ? (1 - currentPinchPoint.x) * canvasWidth
        : currentPinchPoint.x * canvasWidth;
      const rawY = currentPinchPoint.y * canvasHeight;

      let curX = rawX;
      let curY = rawY;
      if (smoothedPointRef.current) {
        const alpha = 0.65;
        curX = smoothedPointRef.current.x * (1 - alpha) + rawX * alpha;
        curY = smoothedPointRef.current.y * (1 - alpha) + rawY * alpha;
      }
      smoothedPointRef.current = { x: curX, y: curY };

      if (!isDrawingRef.current) {
        isDrawingRef.current = true;
        currentStrokeRef.current = [{ x: curX, y: curY, timestamp: Date.now() }];
      } else {
        const last = currentStrokeRef.current[currentStrokeRef.current.length - 1];
        if (last) {
          const dx = curX - last.x;
          const dy = curY - last.y;
          if (Math.sqrt(dx * dx + dy * dy) > 2) {
            currentStrokeRef.current.push({ x: curX, y: curY, timestamp: Date.now() });
          }
        }
      }
      redrawCanvas();
    } else {
      if (isDrawingRef.current && currentStrokeRef.current.length > 0) {
        const newStroke: Stroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          points: [...currentStrokeRef.current],
          color: settings.color,
          size: settings.brushSize,
          style: settings.brushStyle,
        };
        setHistoryStack((prev) => [...prev, strokesRef.current]);
        setFutureStack([]);
        setStrokes((prev) => [...prev, newStroke]);
      }
      isDrawingRef.current = false;
      currentStrokeRef.current = [];
      smoothedPointRef.current = null;
    }
  }, [isPinching, currentPinchPoint, isFist, settings, canvasWidth, canvasHeight, redrawCanvas]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasWidth === 0 || canvasHeight === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    redrawCanvas();
  }, [canvasWidth, canvasHeight, redrawCanvas]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      {/* Precision Real Eraser Cursor & Ring following Fist */}
      {isFist && fistPoint && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 transition-all duration-75"
          style={{
            left: `${(settings.mirrorCamera ? (1 - fistPoint.x) : fistPoint.x) * 100}%`,
            top: `${fistPoint.y * 100}%`,
          }}
        >
          <div
            className="rounded-full border-2 border-red-500/85 bg-red-500/15 shadow-xl shadow-red-500/30 flex items-center justify-center transition-all duration-100"
            style={{
              width: `${(settings.eraserSize || 44) * 2}px`,
              height: `${(settings.eraserSize || 44) * 2}px`,
            }}
          >
            {/* Center target crosshair */}
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-sm" />
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1.5 px-2.5 py-0.5 rounded-full bg-[#0F0F0F]/90 border border-red-500/40 text-[9px] font-mono font-bold text-red-300 uppercase tracking-wider whitespace-nowrap shadow-xl flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span>Eraser ({(settings.eraserSize || 44) * 2}px)</span>
          </div>
        </div>
      )}
    </div>
  );
});
