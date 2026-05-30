// ============================================================================
// Sparkfluence Studio — Toolbar
// Tool selection (Select/Split/Delete), Undo/Redo, and Zoom controls.
// Sits between the main editor area and the timeline.
// ============================================================================

import React from 'react';
import {
  MousePointer2,
  Scissors,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export type ToolType = 'select' | 'split' | 'delete';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const TOOLS: { id: ToolType; label: string; shortcut: string; icon: React.FC<{ className?: string }>; danger?: boolean }[] = [
  { id: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2 },
  { id: 'split', label: 'Split', shortcut: 'S', icon: Scissors },
  { id: 'delete', label: 'Delete', shortcut: 'Del', icon: Trash2, danger: true },
];

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomChange,
}) => {
  const handleZoomIn = () => {
    onZoomChange(Math.min(MAX_ZOOM, zoom + ZOOM_STEP));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(MIN_ZOOM, zoom - ZOOM_STEP));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(parseFloat(e.target.value));
  };

  return (
    <div className="flex items-center h-9 px-3 bg-[#1E1E1E] border-t border-[#262626] flex-shrink-0 gap-1">
      {/* Tool Buttons */}
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        const activeClass = tool.danger
          ? 'bg-red-500/20 text-red-400'
          : 'bg-emerald-500/20 text-emerald-400';
        const inactiveClass = 'text-neutral-400 hover:text-white hover:bg-[#262626]';

        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              isActive ? activeClass : inactiveClass
            }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tool.label}</span>
          </button>
        );
      })}

      <div className="h-4 w-px bg-[#262626] mx-1" />

      {/* Undo/Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#262626] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#262626] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="w-3.5 h-3.5" />
      </button>

      <div className="flex-1" />

      {/* Zoom Controls */}
      <button
        onClick={handleZoomOut}
        disabled={zoom <= MIN_ZOOM}
        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#262626] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Zoom Out (-)"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={ZOOM_STEP}
        value={zoom}
        onChange={handleSliderChange}
        className="w-20 h-1 mx-1 appearance-none bg-[#262626] rounded-full cursor-pointer accent-emerald-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500
          [&::-webkit-slider-thumb]:hover:bg-emerald-400 [&::-webkit-slider-thumb]:transition-colors"
        title={`Zoom: ${Math.round(zoom * 100)}%`}
      />

      <span className="text-xs text-neutral-400 font-mono tabular-nums w-10 text-center">
        {Math.round(zoom * 100)}%
      </span>

      <button
        onClick={handleZoomIn}
        disabled={zoom >= MAX_ZOOM}
        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#262626] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Zoom In (+)"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default Toolbar;
