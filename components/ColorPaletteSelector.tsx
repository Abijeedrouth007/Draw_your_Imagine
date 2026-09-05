'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Palette, Check, Pipette, ChevronDown, Sparkles, X } from 'lucide-react';

export interface ColorOption {
  name: string;
  value: string;
  description?: string;
}

export const CYBER_NEON_COLORS: ColorOption[] = [
  { name: 'Neon Green', value: '#39ff14', description: 'High-voltage electric green' },
  { name: 'Laser Cyan', value: '#00f0ff', description: 'Vibrant Tron cyan' },
  { name: 'Cyber Gold', value: '#ffd700', description: 'Rich metallic gold' },
  { name: 'Electric Indigo', value: '#6366f1', description: 'Signature Spyder indigo' },
  { name: 'Neon Magenta', value: '#ff007f', description: 'Hyper-vibrant hot pink' },
  { name: 'Plasma Orange', value: '#ff5500', description: 'Intense radiant orange' },
  { name: 'Acid Lime', value: '#a3e635', description: 'Fluorescent chartreuse' },
  { name: 'Aqua Pulse', value: '#06b6d4', description: 'Deep luminous turquoise' },
];

export const STUDIO_ESSENTIALS_COLORS: ColorOption[] = [
  { name: 'Pure White', value: '#ffffff', description: 'Clean chalk white' },
  { name: 'Solar Amber', value: '#f59e0b', description: 'Warm golden amber' },
  { name: 'Emerald Green', value: '#10b981', description: 'Rich natural emerald' },
  { name: 'Sky Blue', value: '#38bdf8', description: 'Crisp atmospheric blue' },
  { name: 'Crimson Rose', value: '#f43f5e', description: 'Vivid ruby crimson' },
  { name: 'Sunset Coral', value: '#fb923c', description: 'Warm energetic coral' },
  { name: 'Deep Violet', value: '#8b5cf6', description: 'Electric ultraviolet' },
  { name: 'Titanium Slate', value: '#64748b', description: 'Subtle technical slate' },
];

export const QUICK_SWATCHES: ColorOption[] = [
  { name: 'Neon Green', value: '#39ff14' },
  { name: 'Laser Cyan', value: '#00f0ff' },
  { name: 'Cyber Gold', value: '#ffd700' },
  { name: 'Electric Indigo', value: '#6366f1' },
  { name: 'Neon Magenta', value: '#ff007f' },
  { name: 'Pure White', value: '#ffffff' },
];

interface ColorPaletteSelectorProps {
  currentColor: string;
  onColorSelect: (color: string) => void;
  brushStyle?: 'neon' | 'solid' | 'rainbow';
}

export function ColorPaletteSelector({
  currentColor,
  onColorSelect,
  brushStyle = 'neon',
}: ColorPaletteSelectorProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [prevPropColor, setPrevPropColor] = useState<string>(currentColor);
  const [customHexInput, setCustomHexInput] = useState<string>(currentColor.toUpperCase());
  const [hexError, setHexError] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  // Sync custom hex input whenever currentColor changes externally (official React pattern)
  if (prevPropColor !== currentColor) {
    setPrevPropColor(currentColor);
    setCustomHexInput(currentColor.toUpperCase());
    setHexError(false);
  }

  // Find human-readable name of current color
  const activeColorMeta = useMemo(() => {
    const all = [...CYBER_NEON_COLORS, ...STUDIO_ESSENTIALS_COLORS];
    const match = all.find(
      (c) => c.value.toLowerCase() === currentColor.toLowerCase()
    );
    if (match) return match;
    return { name: 'Custom Color', value: currentColor, description: 'User-selected custom shade' };
  }, [currentColor]);

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleHexSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let val = customHexInput.trim();
    if (!val.startsWith('#')) {
      val = `#${val}`;
    }
    const isValidHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val);
    if (isValidHex) {
      setHexError(false);
      onColorSelect(val.toLowerCase());
    } else {
      setHexError(true);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={popoverRef}>
      {/* Quick Access Swatches (Visible on PC, Laptop & Mobile) */}
      <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
        <span className="text-[10px] font-mono text-white/40 mr-1 uppercase tracking-widest hidden lg:inline pl-1">
          Color
        </span>

        {/* Swatch list */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          {QUICK_SWATCHES.map((color) => {
            const isSelected = currentColor.toLowerCase() === color.value.toLowerCase();
            return (
              <button
                key={color.value}
                id={`color-swatch-${color.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onColorSelect(color.value)}
                type="button"
                className={`relative w-7 h-7 sm:w-6 sm:h-6 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'scale-110 ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#0F0F0F] z-10 shadow-lg'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: color.value,
                  boxShadow: isSelected ? `0 0 10px ${color.value}80` : undefined,
                }}
                title={`${color.name} (${color.value})`}
                aria-label={`Select ${color.name}`}
              >
                {isSelected && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        color.value === '#ffffff' || color.value === '#39ff14' || color.value === '#00f0ff' || color.value === '#ffd700'
                          ? '#000000'
                          : '#ffffff',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-white/10 mx-0.5" />

        {/* Palette Popover Trigger Button */}
        <button
          id="color-palette-picker-btn"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
            isOpen
              ? 'bg-indigo-600/30 border-indigo-400/50 text-indigo-300'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white'
          }`}
          title="Open Full Color Palette Selector"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          {/* Active color dot with glow */}
          <span
            className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0 shadow-sm transition-transform"
            style={{
              backgroundColor: currentColor,
              boxShadow: `0 0 8px ${currentColor}90`,
            }}
          />
          <Palette className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline font-mono text-[11px]">Palette</span>
          <ChevronDown
            className={`w-3 h-3 text-white/40 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-indigo-400' : ''
            }`}
          />
        </button>
      </div>

      {/* Expanded Palette Popover Flyout (Mobile, Tablet, Laptop, PC Friendly) */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Color Palette Selector"
          className="fixed sm:absolute bottom-20 left-4 right-4 sm:bottom-auto sm:top-full sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:mt-2 z-50 w-auto sm:w-84 max-w-[calc(100vw-2rem)] bg-[#0F0F0F]/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl shadow-black text-[#E0E0E0] select-none animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Color Studio
              </h3>
            </div>

            <button
              id="close-palette-popover-btn"
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer"
              title="Close Palette"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Color Preview Card */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 mb-3.5">
            <div
              className="w-10 h-10 rounded-xl border border-white/20 shrink-0 flex items-center justify-center transition-all duration-200 shadow-md"
              style={{
                backgroundColor: currentColor,
                boxShadow: `0 0 16px ${currentColor}80`,
              }}
            >
              <span
                className="text-xs font-bold"
                style={{
                  color:
                    currentColor === '#ffffff' || currentColor.toLowerCase() === '#39ff14' || currentColor.toLowerCase() === '#00f0ff' || currentColor.toLowerCase() === '#ffd700'
                      ? '#000000'
                      : '#ffffff',
                }}
              >
                ●
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate">
                  {activeColorMeta.name}
                </span>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                  {currentColor.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] text-white/50 truncate mt-0.5">
                {activeColorMeta.description || 'Active brush color'}
              </p>
            </div>
          </div>

          {/* Category 1: Cyber Neon (Featuring Neon Green, Cyan, Gold, etc.) */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase tracking-wider">
              <span className="flex items-center gap-1 text-indigo-300">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Cyber Neon
              </span>
              <span>Vibrant Glow</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
              {CYBER_NEON_COLORS.map((col) => {
                const isSelected = currentColor.toLowerCase() === col.value.toLowerCase();
                return (
                  <button
                    key={col.value}
                    id={`palette-color-${col.name.toLowerCase().replace(/\s+/g, '-')}`}
                    type="button"
                    onClick={() => {
                      onColorSelect(col.value);
                    }}
                    className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/15 border-indigo-400 ring-1 ring-indigo-400/50 shadow-md'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                    }`}
                    title={`${col.name} (${col.value})`}
                  >
                    <span
                      className="w-6 h-6 rounded-full border border-white/20 shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center"
                      style={{
                        backgroundColor: col.value,
                        boxShadow: isSelected ? `0 0 12px ${col.value}` : `0 0 6px ${col.value}40`,
                      }}
                    >
                      {isSelected && (
                        <Check
                          className="w-3.5 h-3.5 stroke-[3]"
                          style={{
                            color:
                              col.value === '#ffffff' || col.value === '#39ff14' || col.value === '#00f0ff' || col.value === '#ffd700'
                                ? '#000000'
                                : '#ffffff',
                          }}
                        />
                      )}
                    </span>
                    <span className="text-[10px] font-medium text-white/80 group-hover:text-white truncate max-w-full">
                      {col.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category 2: Studio Essentials */}
          <div className="space-y-1.5 mb-3.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase tracking-wider">
              <span>Studio Essentials</span>
              <span>Classic Tones</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
              {STUDIO_ESSENTIALS_COLORS.map((col) => {
                const isSelected = currentColor.toLowerCase() === col.value.toLowerCase();
                return (
                  <button
                    key={col.value}
                    id={`palette-color-${col.name.toLowerCase().replace(/\s+/g, '-')}`}
                    type="button"
                    onClick={() => {
                      onColorSelect(col.value);
                    }}
                    className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/15 border-indigo-400 ring-1 ring-indigo-400/50 shadow-md'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                    }`}
                    title={`${col.name} (${col.value})`}
                  >
                    <span
                      className="w-6 h-6 rounded-full border border-white/20 shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center"
                      style={{
                        backgroundColor: col.value,
                        boxShadow: isSelected ? `0 0 12px ${col.value}` : `0 0 4px ${col.value}30`,
                      }}
                    >
                      {isSelected && (
                        <Check
                          className="w-3.5 h-3.5 stroke-[3]"
                          style={{
                            color:
                              col.value === '#ffffff' || col.value === '#fb923c'
                                ? '#000000'
                                : '#ffffff',
                          }}
                        />
                      )}
                    </span>
                    <span className="text-[10px] font-medium text-white/80 group-hover:text-white truncate max-w-full">
                      {col.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Picker Bar (PC, Mobile, Laptop) */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Pipette className="w-3 h-3 text-indigo-400" />
                Custom Color
              </span>
              <span>Any Hex / Picker</span>
            </div>

            <form
              onSubmit={handleHexSubmit}
              className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10"
            >
              {/* Native Color Picker button wrapper */}
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/20 shrink-0 cursor-pointer group shadow-sm">
                <input
                  ref={colorInputRef}
                  id="native-color-picker-input"
                  type="color"
                  value={currentColor.startsWith('#') && currentColor.length === 7 ? currentColor : '#6366f1'}
                  onChange={(e) => {
                    const newCol = e.target.value.toLowerCase();
                    setCustomHexInput(newCol.toUpperCase());
                    onColorSelect(newCol);
                  }}
                  className="absolute -top-2 -left-2 w-12 h-12 opacity-0 cursor-pointer"
                  title="Open OS Color Wheel"
                />
                <div
                  className="w-full h-full flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ backgroundColor: currentColor }}
                >
                  <Pipette className="w-3.5 h-3.5 text-white/90 drop-shadow" />
                </div>
              </div>

              {/* Text Input for exact Hex */}
              <input
                id="custom-hex-code-input"
                type="text"
                value={customHexInput}
                onChange={(e) => {
                  setCustomHexInput(e.target.value);
                  setHexError(false);
                }}
                placeholder="#00F0FF"
                maxLength={7}
                className={`flex-1 bg-black/40 border rounded-lg px-2.5 py-1 text-xs font-mono tracking-wider text-white uppercase focus:outline-none transition ${
                  hexError
                    ? 'border-red-500/80 focus:border-red-500 text-red-300'
                    : 'border-white/10 focus:border-indigo-400'
                }`}
              />

              <button
                id="apply-custom-hex-btn"
                type="submit"
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold tracking-wide transition shadow-sm cursor-pointer"
              >
                Apply
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
