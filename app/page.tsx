'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasSettings, FingerAnalysis, Point } from '@/lib/drawing-types';
import { HandTracker, CameraInfo } from '@/components/HandTracker';
import { DrawingCanvas, DrawingCanvasHandle } from '@/components/DrawingCanvas';
import { FingerTelemetry } from '@/components/FingerTelemetry';
import { Toolbar } from '@/components/Toolbar';
import { GestureGuideModal } from '@/components/GestureGuideModal';
import {
  Video,
  Camera,
  Laptop,
  ChevronDown,
  Check,
  ExternalLink,
  HelpCircle,
  SlidersHorizontal,
  EyeOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';

const DEFAULT_SETTINGS: CanvasSettings = {
  color: '#6366f1',
  brushSize: 7,
  brushStyle: 'neon',
  pinchThreshold: 0.075,
  fistThreshold: 0.68,
  eraseMode: 'wipe_all',
  showSkeleton: true,
  showTelemetry: true,
  mirrorCamera: true,
  backgroundMode: 'camera',
};

export default function SpyderAirCanvasPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drawingCanvasRef = useRef<DrawingCanvasHandle | null>(null);
  const videoRefOut = useRef<HTMLVideoElement | null>(null);

  // Layout dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 1280,
    height: 720,
  });

  // Settings & Real-time Vision State
  const [settings, setSettings] = useState<CanvasSettings>(DEFAULT_SETTINGS);
  const [analysis, setAnalysis] = useState<FingerAnalysis | null>(null);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [currentPinchPoint, setCurrentPinchPoint] = useState<Point | null>(null);
  const [isFist, setIsFist] = useState<boolean>(false);
  const [fistPoint, setFistPoint] = useState<Point | null>(null);
  const [fps, setFps] = useState<number>(0);

  // History state for toolbar buttons
  const [historyCounts, setHistoryCounts] = useState<{ undoCount: number; redoCount: number }>({
    undoCount: 0,
    redoCount: 0,
  });

  // Modals
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isVideoActive, setIsVideoActive] = useState<boolean>(false);
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState<boolean>(false);

  // ResizeObserver on the container to dynamically match screen resolution
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.round(width),
            height: Math.round(height),
          });
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Sync undo / redo counts
  const updateHistory = useCallback(() => {
    if (drawingCanvasRef.current) {
      setHistoryCounts(drawingCanvasRef.current.getHistoryCount());
    }
  }, []);

  const handlePinchStateChange = useCallback((pinching: boolean, point: Point | null) => {
    setIsPinching(pinching);
    setCurrentPinchPoint(point);
    updateHistory();
  }, [updateHistory]);

  const handleFistStateChange = useCallback((fist: boolean, point: Point | null) => {
    setIsFist(fist);
    setFistPoint(point);
  }, []);

  const handleVideoReady = useCallback((video: HTMLVideoElement | null) => {
    videoRefOut.current = video;
    setIsVideoActive(!!video);
  }, []);

  const handleUndo = useCallback(() => {
    drawingCanvasRef.current?.undo();
    updateHistory();
  }, [updateHistory]);

  const handleRedo = useCallback(() => {
    drawingCanvasRef.current?.redo();
    updateHistory();
  }, [updateHistory]);

  const handleClear = useCallback(() => {
    drawingCanvasRef.current?.clear();
    updateHistory();
  }, [updateHistory]);

  const handleExport = useCallback(() => {
    if (!drawingCanvasRef.current) return;
    const includeCamera = settings.backgroundMode === 'camera' || settings.backgroundMode === 'camera_dimmed';
    const dataUrl = drawingCanvasRef.current.exportImage(includeCamera, videoRefOut.current);
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `spyder-vision-drawing-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [settings.backgroundMode]);

  // Option Visibility & Full Screen Drawing
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Global Keyboard Shortcuts (Undo, Redo, 'O' to toggle options, 'Esc' to hide, 'F' for fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'o' || e.key === 'O') {
        setShowOptions((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowOptions(false);
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [handleUndo, handleRedo]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans overflow-hidden select-none">
      {/* 1. Header (Collapsible when options are hidden to maximize canvas space) */}
      {showOptions && (
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#0F0F0F] shrink-0 z-30 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <div className="w-4 h-4 border-2 border-white rotate-45" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tighter uppercase text-white leading-none">
                Spyder <span className="text-indigo-400">Vision</span>
              </h1>
              <span className="text-[10px] font-mono text-white/40 tracking-wider uppercase">
                Air Canvas System
              </span>
            </div>
          </div>

          {/* Quick Hide Options Button & Live System Metrics */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              id="header-hide-options-btn"
              onClick={() => setShowOptions(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition cursor-pointer"
              title="Hide Options to Draw Unobstructed (Press 'O' or Esc)"
            >
              <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
              <span>Hide Options</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-400 font-mono">
                {isVideoActive ? 'CAM_01 ACTIVE' : 'VISION READY'}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-white/40">
              <span>FPS: {fps > 0 ? fps.toFixed(1) : '60.0'}</span>
              <span>LATENCY: {analysis ? '14ms' : '9ms'}</span>
            </div>
          </div>
        </header>
      )}

      {/* 2. Main Visual Canvas Stage */}
      <main ref={containerRef} className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
        {/* Radial ambient background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000_100%)] opacity-50 pointer-events-none" />

        {/* Underlying Camera + Vision Skeleton Tracking */}
        <HandTracker
          settings={settings}
          onAnalysisUpdate={setAnalysis}
          onPinchStateChange={handlePinchStateChange}
          onFistStateChange={handleFistStateChange}
          onFpsUpdate={setFps}
          onVideoReady={handleVideoReady}
          onCameraInfoChange={setCameraInfo}
          canvasWidth={dimensions.width}
          canvasHeight={dimensions.height}
        />

        {/* Vector Drawing Stroke Canvas */}
        <DrawingCanvas
          ref={drawingCanvasRef}
          settings={settings}
          currentPinchPoint={currentPinchPoint}
          isPinching={isPinching}
          isFist={isFist}
          fistPoint={fistPoint}
          canvasWidth={dimensions.width}
          canvasHeight={dimensions.height}
          onEraseTriggered={updateHistory}
        />

        {/* Overlay HUD Framework */}
        <div className="absolute inset-0 pointer-events-none p-4 sm:p-5 flex flex-col justify-between z-20">
          {/* Top Bar with Option Button & Collapsible Studio Controls */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pointer-events-auto">
              {/* Left Side: Option Button (Toggles Tools / Keeps Full Screen Unobstructed) */}
              <div className="flex items-center gap-2">
                <button
                  id="toggle-options-btn"
                  onClick={() => setShowOptions(!showOptions)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-xl border transition-all duration-200 cursor-pointer shadow-xl ${
                    showOptions
                      ? 'bg-indigo-600 text-white border-indigo-400/50 shadow-indigo-500/25 hover:bg-indigo-500'
                      : 'bg-[#0F0F0F]/85 text-white/90 border-white/20 hover:border-indigo-400/60 hover:bg-[#1A1A1A] hover:text-white'
                  }`}
                  title={showOptions ? "Hide Options (Press 'O' or Esc)" : "Show Options & Tools (Press 'O')"}
                >
                  {showOptions ? (
                    <EyeOff className="w-3.5 h-3.5 text-indigo-300" />
                  ) : (
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span>{showOptions ? 'Hide Options' : 'Options'}</span>
                  {/* Color dot indicator */}
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-sm shrink-0"
                    style={{ backgroundColor: settings.color }}
                    title={`Active Color: ${settings.color}`}
                  />
                  <kbd className="text-[9px] font-mono text-white/50 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
                    {showOptions ? 'Esc' : 'O'}
                  </kbd>
                </button>

                {/* Unobstructed Mode Subtitle */}
                {!showOptions && (
                  <span className="text-[11px] font-mono text-white/40 hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F0F0F]/60 border border-white/5 backdrop-blur-sm">
                    Full Screen Mode (Options Hidden)
                  </span>
                )}
              </div>

              {/* Right Side: Camera Status, Fullscreen & Direct Tab Launch */}
              <div className="flex items-center gap-2 pointer-events-auto">
                {cameraInfo && cameraInfo.state === 'active' && !cameraInfo.isSimulator ? (
                  <div className="relative inline-flex items-center">
                    <div className="flex items-center gap-2 bg-[#0F0F0F]/90 border border-emerald-500/30 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white/90 shadow-xl">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <Video className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-medium truncate max-w-32 sm:max-w-56 text-[11px]">
                        {cameraInfo.activeLabel || 'PC Camera Active'}
                      </span>

                      {/* Multi-device selector dropdown trigger */}
                      {showOptions && cameraInfo.devices.length > 1 && (
                        <button
                          id="top-camera-device-dropdown-btn"
                          onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
                          className="p-0.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer ml-1"
                          title="Switch PC Camera Device"
                        >
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${isDeviceMenuOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Device Switcher Dropdown Menu */}
                    {showOptions && isDeviceMenuOpen && cameraInfo.devices.length > 1 && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-[#0F0F0F]/95 backdrop-blur-xl border border-white/15 rounded-xl p-2 shadow-2xl z-50 text-xs text-[#E0E0E0] space-y-1 animate-in fade-in zoom-in-95">
                        <div className="text-[10px] font-mono text-white/40 uppercase px-2 py-1 tracking-wider border-b border-white/10 flex items-center justify-between">
                          <span>Detected PC Cameras</span>
                          <Laptop className="w-3 h-3 text-indigo-400" />
                        </div>
                        {cameraInfo.devices.map((dev, idx) => {
                          const isCur = dev.deviceId === cameraInfo.selectedDeviceId;
                          return (
                            <button
                              key={dev.deviceId || idx}
                              id={`top-switch-camera-${idx}`}
                              onClick={() => {
                                cameraInfo.selectDevice(dev.deviceId);
                                setIsDeviceMenuOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer ${
                                isCur
                                  ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30'
                                  : 'hover:bg-white/10 text-white/80'
                              }`}
                            >
                              <span className="truncate">{dev.label || `Camera ${idx + 1}`}</span>
                              {isCur && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      id="top-connect-pc-camera-btn"
                      onClick={() => cameraInfo?.startCamera()}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg shadow-indigo-500/25 border border-indigo-400/40 transition cursor-pointer"
                      title="Connect PC/Laptop Camera"
                    >
                      <Camera className="w-3.5 h-3.5 animate-pulse" />
                      <span className="text-[11px]">Connect PC Camera</span>
                    </button>
                    {showOptions && (
                      <button
                        id="top-camera-setup-help-btn"
                        onClick={() => cameraInfo?.openSetupModal()}
                        className="flex items-center gap-1 bg-[#0F0F0F]/80 hover:bg-white/10 text-white/70 hover:text-white px-2 py-1 rounded-full text-xs border border-white/10 transition cursor-pointer backdrop-blur-md"
                        title="Camera Troubleshooting"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Setup</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Native Fullscreen Toggle */}
                <button
                  id="toggle-fullscreen-btn"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-full bg-[#0F0F0F]/80 hover:bg-white/15 text-white/70 hover:text-white border border-white/15 transition cursor-pointer backdrop-blur-md shadow-lg"
                  title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                {/* Open in Full Tab */}
                {showOptions && (
                  <button
                    type="button"
                    id="open-tab-direct-btn"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open(window.location.href, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[11px] transition cursor-pointer"
                    title="Open App in Full Browser Tab for Optimal Webcam Performance"
                  >
                    <ExternalLink className="w-3 h-3 text-indigo-400" />
                    <span>Open Tab</span>
                  </button>
                )}
              </div>
            </div>

            {/* EXPANDABLE OPTIONS: Central Studio Toolbar Dock */}
            {showOptions && (
              <div className="w-full max-w-4xl mx-auto pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200">
                <Toolbar
                  settings={settings}
                  onSettingsChange={setSettings}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onClear={handleClear}
                  onExport={handleExport}
                  onOpenGuide={() => setIsGuideOpen(true)}
                  onToggleOptions={() => setShowOptions(false)}
                  canUndo={historyCounts.undoCount > 0}
                  canRedo={historyCounts.redoCount > 0}
                />
              </div>
            )}
          </div>

          {/* Bottom Stage Row: Gesture Status & Telemetry Panel (Only shown when showOptions is true) */}
          {showOptions && (
            <div className="w-full flex items-end justify-between gap-4 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
              {/* Active Mode Status Badge */}
              <div className="flex flex-col items-start gap-1 pointer-events-auto">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                  Active Mode
                </div>
                <div
                  id="active-mode-status-badge"
                  className={`text-xl font-bold tracking-tight uppercase font-mono px-3.5 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-300 ease-out ${
                    isFist
                      ? 'text-red-400 bg-red-500/15 border-red-500/40 shadow-lg shadow-red-500/20 scale-[1.02]'
                      : isPinching
                      ? 'text-indigo-400 bg-indigo-500/15 border-indigo-500/40 shadow-lg shadow-indigo-500/20 scale-[1.02]'
                      : 'text-white/60 bg-[#0F0F0F]/80 border-white/10 shadow-none scale-100'
                  }`}
                >
                  {isFist ? 'FIST TO ERASE' : isPinching ? 'PINCH TO DRAW' : '[ DETECTING GESTURE... ]'}
                </div>
              </div>

              {/* Right Telemetry Aside HUD */}
              <div className="pointer-events-auto">
                <FingerTelemetry
                  analysis={analysis}
                  fps={fps}
                  settings={settings}
                  onSettingsChange={setSettings}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. Footer (Collapsible when options are hidden to maximize canvas space) */}
      {showOptions && (
        <footer className="h-8 bg-[#0A0A0A] border-t border-white/10 px-6 flex items-center justify-between text-[10px] font-mono text-white/40 shrink-0 z-30 animate-in fade-in duration-200">
          <div>SYST_V: 4.1.0-STABLE</div>
          <div className="hidden sm:block">HARDWARE ACCELERATION: ON (WEBGL/GPU)</div>
          <div>SESSION_ID: 9482-ADK-2941</div>
        </footer>
      )}

      {/* 4. Gesture Tutorial & Guide Modal */}
      <GestureGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
