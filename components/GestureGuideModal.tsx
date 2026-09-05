'use client';

import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';

interface GestureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GestureGuideModal({ isOpen, onClose }: GestureGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gesture-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#0F0F0F] border border-white/10 rounded-2xl p-6 shadow-2xl text-[#E0E0E0] space-y-5">
        {/* Close Button */}
        <button
          id="close-guide-modal-btn"
          onClick={onClose}
          className="absolute top-5 right-5 text-white/40 hover:text-white p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rotate-45" />
          </div>
          <div>
            <h2 id="gesture-guide-title" className="text-base font-bold tracking-tight text-white uppercase">
              Spyder <span className="text-indigo-400">Gestures</span>
            </h2>
            <p className="text-xs text-white/40">
              Control your air canvas naturally with your hand in front of the camera
            </p>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="space-y-3">
          {/* Gesture 1: Pinch to Draw */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xl flex items-center justify-center shrink-0 text-indigo-400">
              🤏
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Pinch to Draw (Pen Mode)</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Draw
                </span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Bring your <b>thumb tip</b> and <b>index finger tip</b> together. An indigo laser reticle illuminates and renders continuous vector strokes in the air.
              </p>
            </div>
          </div>

          {/* Gesture 2: Fist to Erase */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 text-xl flex items-center justify-center shrink-0 text-red-400">
              ✊
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Make a Fist to Erase</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
                  Precision Eraser
                </span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Clench your fingers into a <b>fist</b>. A real precision eraser appears at your hand—sweep it across any stroke to erase only the specific parts or lines you touch. Release your fist to resume drawing. Full Undo is supported!
              </p>
            </div>
          </div>

          {/* Gesture 3: Open Hand to Hover */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-xl flex items-center justify-center shrink-0 text-white/60">
              ✋
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Open Hand (Hover)</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-white/60">
                  Hover
                </span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Keep fingers relaxed and open. Spyder tracks your 21 landmarks without drawing, allowing you to reposition your hand freely in 3D space.
              </p>
            </div>
          </div>
        </div>

        {/* Tips list */}
        <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 text-xs text-white/50 space-y-2">
          <div className="flex items-center gap-2 font-medium text-white/70">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Optimal Environmental Setup</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-white/40">
            <li>Position hand approximately 1.5 to 2.5 feet from the webcam.</li>
            <li>Ensure front-facing room lighting without excessive backlighting.</li>
            <li>Press <b>C</b> to turn your camera on or off at any moment.</li>
            <li>Use <b>Ctrl+Z</b> (Undo) and <b>Ctrl+Y</b> (Redo) for instant revision.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
