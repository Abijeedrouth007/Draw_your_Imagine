'use client';

import React from 'react';
import { CanvasSettings } from '@/lib/drawing-types';
import { ColorPaletteSelector } from './ColorPaletteSelector';
import {
  Undo2,
  Redo2,
  Trash2,
  Download,
  FlipHorizontal,
  Eye,
  EyeOff,
  HelpCircle,
  Sun,
  Moon,
  Video,
  VideoOff,
  Eraser,
} from 'lucide-react';

interface ToolbarProps {
  settings: CanvasSettings;
  onSettingsChange: (settings: CanvasSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onOpenGuide: () => void;
  onToggleOptions?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isCameraActive?: boolean;
  onToggleCamera?: () => void;
}

const SIZES = [
  { label: 'Fine', size: 3 },
  { label: 'Medium', size: 7 },
  { label: 'Bold', size: 14 },
  { label: 'Heavy', size: 24 },
];

const ERASER_SIZES = [
  { label: 'S', size: 24 },
  { label: 'M', size: 44 },
  { label: 'L', size: 70 },
];

export function Toolbar({
  settings,
  onSettingsChange,
  onUndo,
  onRedo,
  onClear,
  onExport,
  onOpenGuide,
  onToggleOptions,
  canUndo,
  canRedo,
  isCameraActive,
  onToggleCamera,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 pointer-events-auto">
      {/* Floating Paint Studio Tools Dock - Elegant Dark */}
      <div className="bg-[#0F0F0F]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 shadow-2xl shadow-black/80 flex flex-wrap items-center justify-between gap-3 text-[#E0E0E0] select-none">
        {/* Left Actions: Undo, Redo, Clear, Guide */}
        <div className="flex items-center gap-1.5">
          {/* Guide / Gestures */}
          <button
            id="guide-help-btn"
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium transition cursor-pointer border border-white/10"
            title="Gesture Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Gestures</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Undo */}
          <button
            id="canvas-undo-btn"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-xl border border-white/10 transition cursor-pointer ${
              canUndo
                ? 'bg-white/5 hover:bg-white/10 text-white'
                : 'bg-white/5 opacity-40 text-white/30 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* Redo */}
          <button
            id="canvas-redo-btn"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-xl border border-white/10 transition cursor-pointer ${
              canRedo
                ? 'bg-white/5 hover:bg-white/10 text-white'
                : 'bg-white/5 opacity-40 text-white/30 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Clear */}
          <button
            id="canvas-clear-btn"
            onClick={onClear}
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/70 border border-white/10 transition cursor-pointer"
            title="Clear Canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Color Palette Selector (Neon Green, Cyan, Gold & Custom) */}
        <ColorPaletteSelector
          currentColor={settings.color}
          onColorSelect={(newColor) => onSettingsChange({ ...settings, color: newColor })}
          brushStyle={settings.brushStyle}
        />

        {/* Brush Sizes */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {SIZES.map((s) => {
            const isSelected = settings.brushSize === s.size;
            return (
              <button
                key={s.size}
                id={`brush-size-${s.size}`}
                onClick={() => onSettingsChange({ ...settings, brushSize: s.size })}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/25'
                    : 'text-white/60 hover:text-white'
                }`}
                title={`${s.label} (${s.size}px)`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Brush Styles */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            id="style-neon-btn"
            onClick={() => onSettingsChange({ ...settings, brushStyle: 'neon' })}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
              settings.brushStyle === 'neon'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/25'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Neon
          </button>
          <button
            id="style-solid-btn"
            onClick={() => onSettingsChange({ ...settings, brushStyle: 'solid' })}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
              settings.brushStyle === 'solid'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/25'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Solid
          </button>
          <button
            id="style-rainbow-btn"
            onClick={() => onSettingsChange({ ...settings, brushStyle: 'rainbow' })}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
              settings.brushStyle === 'rainbow'
                ? 'bg-gradient-to-r from-pink-500 via-indigo-500 to-cyan-400 text-white font-bold shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Rainbow
          </button>
        </div>

        {/* Real Eraser Size Controls (for fist or precision erasing) */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10" title="Eraser Size for Fist Gesture">
          <div className="flex items-center gap-1 px-1.5 text-xs text-red-400 font-medium select-none">
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px] text-white/50">Eraser</span>
          </div>
          {ERASER_SIZES.map((es) => {
            const isSelected = (settings.eraserSize || 44) === es.size;
            return (
              <button
                key={es.size}
                id={`eraser-size-${es.size}`}
                onClick={() => onSettingsChange({ ...settings, eraserSize: es.size })}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-red-500/30 text-red-200 font-bold border border-red-500/40 shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
                title={`Eraser Size ${es.label} (${es.size}px)`}
              >
                {es.label}
              </button>
            );
          })}
        </div>

        {/* View Controls & Export */}
        <div className="flex items-center gap-1.5">
          {/* Camera Power On/Off Toggle */}
          <button
            id="toggle-camera-power-btn"
            onClick={() => {
              if (onToggleCamera) {
                onToggleCamera();
              } else {
                onSettingsChange({ ...settings, cameraEnabled: !settings.cameraEnabled });
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
              (isCameraActive ?? settings.cameraEnabled)
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
            }`}
            title={(isCameraActive ?? settings.cameraEnabled) ? 'Turn Off Camera (Press C)' : 'Turn On Camera (Press C)'}
          >
            {(isCameraActive ?? settings.cameraEnabled) ? (
              <Video className="w-4 h-4 text-emerald-400" />
            ) : (
              <VideoOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs font-bold whitespace-nowrap">
              {(isCameraActive ?? settings.cameraEnabled) ? 'Cam On' : 'Cam Off'}
            </span>
          </button>

          {/* Skeleton Overlay Toggle */}
          <button
            id="toggle-skeleton-overlay-btn"
            onClick={() => onSettingsChange({ ...settings, showSkeleton: !settings.showSkeleton })}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              settings.showSkeleton
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
            }`}
            title={settings.showSkeleton ? 'Hide Skeleton Mesh' : 'Show Skeleton Mesh'}
          >
            {settings.showSkeleton ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Mirror Camera Flip */}
          <button
            id="toggle-mirror-cam-btn"
            onClick={() => onSettingsChange({ ...settings, mirrorCamera: !settings.mirrorCamera })}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              settings.mirrorCamera
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
            }`}
            title="Mirror Video Stream"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          {/* Background Modes */}
          <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10">
            <button
              id="bg-mode-camera-btn"
              onClick={() => onSettingsChange({ ...settings, backgroundMode: 'camera' })}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                settings.backgroundMode === 'camera'
                  ? 'bg-indigo-600 text-white'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Full Camera Feed"
            >
              <Video className="w-3.5 h-3.5" />
            </button>
            <button
              id="bg-mode-dimmed-btn"
              onClick={() => onSettingsChange({ ...settings, backgroundMode: 'camera_dimmed' })}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                settings.backgroundMode === 'camera_dimmed'
                  ? 'bg-indigo-600 text-white'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Dimmed Camera Feed (Focus Drawing)"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              id="bg-mode-dark-btn"
              onClick={() => onSettingsChange({ ...settings, backgroundMode: 'dark' })}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                settings.backgroundMode === 'dark'
                  ? 'bg-indigo-600 text-white'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Studio Black Canvas"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Export PNG */}
          <button
            id="canvas-export-btn"
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/25 cursor-pointer border border-indigo-400/30"
            title="Export Artwork"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Hide Options / Full Screen Drawing */}
          {onToggleOptions && (
            <button
              id="toolbar-hide-options-btn"
              onClick={onToggleOptions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-semibold transition cursor-pointer border border-white/15"
              title="Hide Options for Unobstructed Full Screen Drawing (Press 'O' or Esc)"
            >
              <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Hide Options</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
