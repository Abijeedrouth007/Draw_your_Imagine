'use client';

import React from 'react';
import { FingerAnalysis, CanvasSettings } from '@/lib/drawing-types';
import { ChevronDown, ChevronUp, Sliders } from 'lucide-react';

interface FingerTelemetryProps {
  analysis: FingerAnalysis | null;
  fps: number;
  settings: CanvasSettings;
  onSettingsChange: (settings: CanvasSettings) => void;
}

export function FingerTelemetry({
  analysis,
  fps,
  settings,
  onSettingsChange,
}: FingerTelemetryProps) {
  const [isExpanded, setIsExpanded] = React.useState<boolean>(true);

  const fingers = [
    { key: 'thumb', label: 'Thumb', data: analysis?.fingerStates.thumb },
    { key: 'index', label: 'Index', data: analysis?.fingerStates.index },
    { key: 'middle', label: 'Middle', data: analysis?.fingerStates.middle },
    { key: 'ring', label: 'Ring', data: analysis?.fingerStates.ring },
    { key: 'pinky', label: 'Pinky', data: analysis?.fingerStates.pinky },
  ] as const;

  const isPinching = analysis?.isPinching ?? false;
  const isFist = analysis?.isFist ?? false;
  const confidencePercent = analysis ? Math.round(analysis.handConfidence * 100) : 0;

  return (
    <aside
      aria-label="Finger Tracking and Telemetry"
      className="bg-[#0F0F0F]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black text-[#E0E0E0] transition-all duration-300 w-80 select-none flex flex-col gap-3.5"
    >
      {/* Header with Title & Expand Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <h2 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Hand Analytics
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
            {fps} FPS
          </span>
          <button
            id="toggle-telemetry-expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white/40 hover:text-white transition p-0.5 rounded cursor-pointer"
            title="Expand / Collapse"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Confidence & Tracking Points Cards (Design HTML match) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] text-white/60">Confidence</span>
            <span className="text-[11px] font-mono text-indigo-400 font-bold">
              {confidencePercent > 0 ? `${confidencePercent}%` : '--'}
            </span>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-150"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col justify-between">
          <span className="text-[11px] text-white/60">Tracking Points</span>
          <span className="text-[11px] font-mono text-white/80 font-bold">
            {analysis ? '21 / 21' : '0 / 21'}
          </span>
        </div>
      </div>

      {/* Gesture Mapping Active State */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
          Gesture Mapping
        </h3>

        {/* Pinch gesture item */}
        <div
          className={`flex items-center gap-3 p-2.5 rounded-xl transition border ${
            isPinching
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
              : 'bg-white/5 border-white/5 text-white/60'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs shrink-0 ${
              isPinching
                ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/15'
                : 'border-white/10 text-white/40'
            }`}
          >
            🤏
          </div>
          <div className="flex flex-col flex-1">
            <span className={`text-xs font-bold ${isPinching ? 'text-indigo-300' : 'text-white'}`}>
              PINCH
            </span>
            <span className="text-[10px] text-white/40">
              {isPinching ? `Pen Mode Active (${analysis?.pinchDistancePx ?? 0}px)` : 'Activate Pen Mode'}
            </span>
          </div>
          {isPinching && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
          )}
        </div>

        {/* Fist gesture item */}
        <div
          className={`flex items-center gap-3 p-2.5 rounded-xl transition border ${
            isFist
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-white/5 border-white/5 text-white/60'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs shrink-0 ${
              isFist
                ? 'border-red-500/40 text-red-400 bg-red-500/15'
                : 'border-white/10 text-white/40'
            }`}
          >
            ✊
          </div>
          <div className="flex flex-col flex-1">
            <span className={`text-xs font-bold ${isFist ? 'text-red-300' : 'text-white/60'}`}>
              FIST
            </span>
            <span className="text-[10px] text-white/40">
              {isFist ? 'Clenched • Erasing Canvas' : 'Quick Erase All'}
            </span>
          </div>
          {isFist && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-1 border-t border-white/10">
          {/* Finger Curl Telemetry Bars */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-mono text-white/40 mb-1.5">
              <span className="uppercase tracking-widest">Fingers Curl</span>
              <span>{analysis?.handedness ? `${analysis.handedness} Hand` : ''}</span>
            </div>
            <div className="space-y-1 bg-white/5 p-2 rounded-xl border border-white/5">
              {fingers.map(({ key, label, data }) => {
                const isExtended = data?.extended ?? false;
                const curlPercent = Math.round((data?.curl ?? 0) * 100);

                return (
                  <div key={key} className="flex items-center justify-between text-xs py-0.5">
                    <span className="font-medium text-white/60 text-[11px] w-12">
                      {label}
                    </span>
                    <div className="flex-1 mx-2">
                      <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-100 ${
                            isExtended ? 'bg-indigo-400' : 'bg-white/40'
                          }`}
                          style={{ width: `${curlPercent}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                        isExtended
                          ? 'text-indigo-300 bg-indigo-500/15'
                          : 'text-white/40 bg-white/5'
                      }`}
                    >
                      {isExtended ? 'OPEN' : 'CURL'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pinch Sensitivity Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-white/50 mb-1">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-indigo-400" />
                <span>Pinch Sensitivity</span>
              </span>
              <span className="font-mono text-indigo-400 text-[10px]">
                {settings.pinchThreshold.toFixed(3)}
              </span>
            </div>
            <input
              id="pinch-sensitivity-slider"
              type="range"
              min="0.03"
              max="0.14"
              step="0.005"
              value={settings.pinchThreshold}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  pinchThreshold: parseFloat(e.target.value),
                })
              }
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Pro Tip Box (from Design HTML) */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">
              Pro Tip
            </span>
            <p className="text-[11px] leading-relaxed text-white/50">
              Hold fingers comfortably at 2 feet distance from the camera for sub-millimeter stroke precision.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
