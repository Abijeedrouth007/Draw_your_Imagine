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
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const currentStrokeRef = useRef<Point[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const smoothedPointRef = useRef<Point | null>(null);

  // Fist erase hold timer tracking
  const fistHoldStartRef = useRef<number | null>(null);
  const [fistProgress, setFistProgress] = useState<number>(0);
  const [lastErasedTime, setLastErasedTime] = useState<number | null>(null);

  // Expose undo, redo, clear, export methods
  useImperativeHandle(ref, () => ({
    undo: () => {
      setStrokes((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        setRedoStack((r) => [...r, [last]]);
        return prev.slice(0, prev.length - 1);
      });
    },
    redo: () => {
      setRedoStack((prev) => {
        if (prev.length === 0) return prev;
        const nextStroke = prev[prev.length - 1];
        setStrokes((s) => [...s, ...nextStroke]);
        return prev.slice(0, prev.length - 1);
      });
    },
    clear: () => {
      setStrokes((prev) => {
        if (prev.length > 0) {
          setRedoStack((r) => [...r, prev]);
        }
        return [];
      });
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
      undoCount: strokes.length,
      redoCount: redoStack.length,
    }),
  }));

  // Handle Fist Erase logic
  useEffect(() => {
    let animFrame: number;

    if (isFist && strokes.length > 0) {
      if (!fistHoldStartRef.current) {
        fistHoldStartRef.current = performance.now();
      }

      const checkFistHold = () => {
        if (!fistHoldStartRef.current) return;
        const elapsed = performance.now() - fistHoldStartRef.current;
        const requiredHold = 350;
        const progress = Math.min(1, elapsed / requiredHold);
        setFistProgress(progress);

        if (progress >= 1) {
          setStrokes((prev) => {
            if (prev.length > 0) {
              setRedoStack((r) => [...r, prev]);
            }
            return [];
          });
          setFistProgress(0);
          fistHoldStartRef.current = null;
          setLastErasedTime(Date.now());
          onEraseTriggered?.();
          return;
        }

        animFrame = requestAnimationFrame(checkFistHold);
      };

      animFrame = requestAnimationFrame(checkFistHold);
    } else {
      fistHoldStartRef.current = null;
      setFistProgress(0);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [isFist, strokes.length, onEraseTriggered]);

  // Handle Fist Brush Erase (if eraseMode === 'eraser_brush' and fist is active)
  useEffect(() => {
    if (settings.eraseMode === 'eraser_brush' && isFist && fistPoint && canvasWidth > 0 && canvasHeight > 0) {
      const fx = settings.mirrorCamera ? (1 - fistPoint.x) * canvasWidth : fistPoint.x * canvasWidth;
      const fy = fistPoint.y * canvasHeight;
      const eraseRadius = 60;

      setStrokes((prevStrokes) => {
        let changed = false;
        const updated = prevStrokes.filter((stroke) => {
          const isNear = stroke.points.some((p) => {
            const dx = p.x - fx;
            const dy = p.y - fy;
            return Math.sqrt(dx * dx + dy * dy) < eraseRadius;
          });
          if (isNear) changed = true;
          return !isNear;
        });
        return changed ? updated : prevStrokes;
      });
    }
  }, [isFist, fistPoint, settings.eraseMode, settings.mirrorCamera, canvasWidth, canvasHeight]);

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
        setStrokes((prev) => [...prev, newStroke]);
        setRedoStack([]);
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

      {/* Fist Erase Hold Indicator Ripple */}
      {fistProgress > 0 && fistPoint && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center transition-all duration-75"
          style={{
            left: `${(settings.mirrorCamera ? (1 - fistPoint.x) : fistPoint.x) * 100}%`,
            top: `${fistPoint.y * 100}%`,
          }}
        >
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"
              style={{ animationDuration: '0.8s' }}
            />
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="rgba(239, 68, 68, 0.3)"
                strokeWidth="6"
                fill="rgba(15, 15, 15, 0.9)"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#ef4444"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - fistProgress)}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-75 ease-linear"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl">✊</span>
              <span className="text-[10px] font-bold text-red-400 tracking-wider uppercase mt-0.5">
                Erasing
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Instant Erase notification banner */}
      {lastErasedTime && Date.now() - lastErasedTime < 3500 && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-[#0F0F0F]/95 border border-red-500/40 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 text-xs text-red-200 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold uppercase tracking-tight">Canvas Erased (Fist Gesture)</span>
          {redoStack.length > 0 && (
            <button
              id="fist-undo-action-btn"
              onClick={() => {
                const last = redoStack[redoStack.length - 1];
                setStrokes((s) => [...s, ...last]);
                setRedoStack((r) => r.slice(0, r.length - 1));
                setLastErasedTime(null);
              }}
              className="ml-2 px-2.5 py-0.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 font-medium text-xs transition cursor-pointer"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
});
