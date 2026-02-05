// ============================================================================
// Sparkfluence Studio — Properties Panel (Right Sidebar)
// Shows segment properties and layer inspector when something is selected.
// Also shows AI suggestions.
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { useStudio } from '../../contexts/StudioContext';
import { useAutoCompose } from '../../hooks/useAutoCompose';
import { framesToSeconds } from '../../lib/composition';
import type { LayoutType, AISuggestion, LayerItem } from '../../types/studio';

const LAYOUTS: { id: LayoutType; label: string }[] = [
  { id: 'full', label: 'Full Screen' },
  { id: 'split-60-40', label: 'Split 60/40' },
  { id: 'split-50-50', label: 'Split 50/50' },
  { id: 'pip', label: 'Picture-in-Picture' },
  { id: 'creator-center', label: 'Creator Center' },
];

export const PropertiesPanel: React.FC = () => {
  const { state, dispatch, selectedSegment, selectedLayer, pushHistory, undo, redo, canUndo, canRedo } = useStudio();
  const { generateSegmentSuggestions, applySuggestion, autoComposeAll } = useAutoCompose();
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);

  const suggestions = useMemo(() => {
    if (!selectedSegment) return [];
    return generateSegmentSuggestions(selectedSegment.id);
  }, [selectedSegment, generateSegmentSuggestions]);

  // --- No Selection ---
  if (!selectedSegment) {
    return (
      <div className="flex flex-col h-full bg-[#13131f] border-l border-[#2b2b38] p-3">
        <p className="text-xs text-gray-500 mb-4">Select a segment to edit properties</p>

        {/* Global Actions */}
        <div className="space-y-2">
          <button
            onClick={autoComposeAll}
            className="w-full text-xs bg-purple-600 hover:bg-purple-500 text-white py-2 rounded transition-colors"
          >
            AI Auto-Compose All
          </button>

          <div className="flex gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="flex-1 text-xs bg-[#1a1a28] text-gray-400 hover:text-white py-1.5 rounded disabled:opacity-30"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="flex-1 text-xs bg-[#1a1a28] text-gray-400 hover:text-white py-1.5 rounded disabled:opacity-30"
            >
              Redo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#13131f] border-l border-[#2b2b38] overflow-y-auto">
      {/* Segment Header */}
      <div className="p-3 border-b border-[#2b2b38]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
            {selectedSegment.segmentType}
          </span>
          <span className="text-[10px] text-gray-500">
            {framesToSeconds(selectedSegment.durationInFrames).toFixed(1)}s
          </span>
        </div>

        {/* Script preview */}
        <p className="text-[11px] text-gray-400 italic leading-relaxed">
          "{selectedSegment.script?.slice(0, 80)}{selectedSegment.script?.length > 80 ? '...' : ''}"
        </p>
      </div>

      {/* Layout Selector */}
      <div className="p-3 border-b border-[#2b2b38]">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Layout</p>
        <div className="grid grid-cols-2 gap-1">
          {LAYOUTS.map(layout => (
            <button
              key={layout.id}
              onClick={() => {
                pushHistory(`Change layout: ${layout.label}`);
                dispatch({
                  type: 'SET_SEGMENT_LAYOUT',
                  segmentId: selectedSegment.id,
                  layout: layout.id,
                });
              }}
              className={`text-[10px] py-1.5 px-2 rounded transition-colors ${
                selectedSegment.layout === layout.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#1a1a28] text-gray-400 hover:text-white'
              }`}
            >
              {layout.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layers List */}
      <div className="p-3 border-b border-[#2b2b38]">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">
          Layers ({selectedSegment.layers.length})
        </p>
        <div className="space-y-1">
          {[...selectedSegment.layers]
            .sort((a, b) => b.zIndex - a.zIndex)
            .map(layer => (
              <LayerRow
                key={layer.id}
                layer={layer}
                segmentId={selectedSegment.id}
                isSelected={selectedLayer?.id === layer.id}
              />
            ))}
        </div>
      </div>

      {/* Selected Layer Properties */}
      {selectedLayer && (
        <LayerProperties segmentId={selectedSegment.id} layer={selectedLayer} />
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="p-3">
          <button
            onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
            className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2 w-full"
          >
            <span>{suggestionsExpanded ? '▾' : '▸'}</span>
            AI Suggestions ({suggestions.length})
          </button>
          {suggestionsExpanded && (
            <div className="space-y-1">
              {suggestions.map(sug => (
                <button
                  key={sug.id}
                  onClick={() => applySuggestion(sug)}
                  className="w-full bg-purple-500/10 border border-purple-500/20 rounded p-2 text-left hover:bg-purple-500/20 transition-colors"
                >
                  <div className="text-[11px] text-purple-300">{sug.label}</div>
                  <div className="text-[9px] text-gray-500">{sug.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Layer Row ---
const LayerRow: React.FC<{
  layer: LayerItem;
  segmentId: string;
  isSelected: boolean;
}> = ({ layer, segmentId, isSelected }) => {
  const { dispatch, pushHistory } = useStudio();

  const typeIcon: Record<string, string> = {
    video: '🎥',
    image: '🖼️',
    text: '✏️',
    lottie: '🏷️',
    effect: '✨',
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer ${
        isSelected ? 'bg-purple-600/20 border border-purple-500/40' : 'hover:bg-[#1a1a28]'
      }`}
      onClick={() => dispatch({ type: 'SELECT_LAYER', segmentId, layerId: layer.id })}
    >
      <span className="text-xs">{typeIcon[layer.type] || '📎'}</span>
      <span className="text-[11px] text-gray-300 flex-1 truncate">
        {getLayerLabel(layer)}
      </span>

      {/* Visibility toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          pushHistory(`Toggle visibility: ${getLayerLabel(layer)}`);
          dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', segmentId, layerId: layer.id });
        }}
        className={`text-[10px] ${layer.visible ? 'text-gray-400' : 'text-gray-700'}`}
      >
        {layer.visible ? '👁️' : '🚫'}
      </button>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          pushHistory(`Remove layer: ${getLayerLabel(layer)}`);
          dispatch({ type: 'REMOVE_LAYER', segmentId, layerId: layer.id });
        }}
        className="text-[10px] text-gray-600 hover:text-red-400"
      >
        ✕
      </button>
    </div>
  );
};

// --- Layer Properties Inspector ---
const LayerProperties: React.FC<{
  segmentId: string;
  layer: LayerItem;
}> = ({ segmentId, layer }) => {
  const { dispatch, pushHistory } = useStudio();

  const updateLayer = useCallback((changes: Partial<LayerItem>) => {
    dispatch({ type: 'UPDATE_LAYER', segmentId, layerId: layer.id, changes });
  }, [segmentId, layer.id, dispatch]);

  return (
    <div className="p-3 border-t border-[#2b2b38]">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">
        Layer: {getLayerLabel(layer)}
      </p>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <NumberInput
          label="X"
          value={layer.position.x}
          onChange={(v) => {
            pushHistory('Move layer');
            updateLayer({ position: { ...layer.position, x: v } });
          }}
        />
        <NumberInput
          label="Y"
          value={layer.position.y}
          onChange={(v) => {
            pushHistory('Move layer');
            updateLayer({ position: { ...layer.position, y: v } });
          }}
        />
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <NumberInput
          label="W"
          value={layer.size.w}
          onChange={(v) => {
            pushHistory('Resize layer');
            updateLayer({ size: { ...layer.size, w: v } });
          }}
        />
        <NumberInput
          label="H"
          value={layer.size.h}
          onChange={(v) => {
            pushHistory('Resize layer');
            updateLayer({ size: { ...layer.size, h: v } });
          }}
        />
      </div>

      {/* Opacity */}
      <div className="mb-2">
        <label className="text-[10px] text-gray-500 block mb-0.5">Opacity</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={layer.opacity}
          onChange={(e) => {
            updateLayer({ opacity: parseFloat(e.target.value) });
          }}
          className="w-full h-1 accent-purple-500"
        />
        <span className="text-[10px] text-gray-500">{Math.round(layer.opacity * 100)}%</span>
      </div>

      {/* Text Properties */}
      {layer.type === 'text' && layer.text && (
        <div className="space-y-2 pt-2 border-t border-[#1a1a28]">
          <label className="text-[10px] text-gray-500 block">Content</label>
          <textarea
            value={layer.text.content}
            onChange={(e) => {
              pushHistory('Edit text');
              updateLayer({
                text: { ...layer.text!, content: e.target.value },
              });
            }}
            rows={2}
            className="w-full bg-[#1a1a28] border border-[#2b2b38] rounded px-2 py-1 text-xs text-white resize-none focus:outline-none focus:border-purple-500"
          />

          <NumberInput
            label="Font Size"
            value={layer.text.fontSize}
            onChange={(v) => {
              pushHistory('Change font size');
              updateLayer({ text: { ...layer.text!, fontSize: v } });
            }}
          />

          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Color</label>
            <input
              type="color"
              value={layer.text.color}
              onChange={(e) => {
                updateLayer({ text: { ...layer.text!, color: e.target.value } });
              }}
              className="w-8 h-6 cursor-pointer bg-transparent border-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// --- Number Input ---
const NumberInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}> = ({ label, value, onChange, step = 1 }) => (
  <div>
    <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
    <input
      type="number"
      value={Math.round(value)}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      step={step}
      className="w-full bg-[#1a1a28] border border-[#2b2b38] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
    />
  </div>
);

// --- Helpers ---
function getLayerLabel(layer: LayerItem): string {
  switch (layer.type) {
    case 'text':
      return layer.text?.content?.slice(0, 25) || 'Text';
    case 'video':
      return 'Video';
    case 'image':
      return 'Image';
    case 'lottie':
      return 'Sticker';
    case 'effect':
      return layer.effect?.preset || 'Effect';
    default:
      return layer.type;
  }
}
