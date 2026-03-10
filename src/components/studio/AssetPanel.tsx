// ============================================================================
// Sparkfluence Studio — Asset Panel (Left Sidebar)
// Browse media, stickers, effects, text presets, and audio.
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useStudio } from '../../contexts/StudioContext';
import {
  searchStickers,
  getStickersByCategory,
  STICKER_CATEGORIES,
} from '../../lib/stickerLibrary';
import { getAllEffects } from '../../lib/effectLibrary';
import {
  createStickerLayer,
  createTextLayer,
  createEffectLayer,
} from '../../lib/composition';
import type { StickerCategory, StickerMeta, EffectDefinition } from '../../types/studio';

type PanelTab = 'media' | 'stickers' | 'effects' | 'text' | 'audio';

const TABS: { id: PanelTab; label: string; icon: string }[] = [
  { id: 'media', label: 'Media', icon: '🎬' },
  { id: 'stickers', label: 'Stickers', icon: '🏷️' },
  { id: 'effects', label: 'Effects', icon: '✨' },
  { id: 'text', label: 'Text', icon: '✏️' },
  { id: 'audio', label: 'Audio', icon: '🎵' },
];

export const AssetPanel: React.FC = () => {
  const { state, dispatch } = useStudio();
  const activeTab = state.activePanel;

  const setTab = useCallback((tab: PanelTab) => {
    dispatch({ type: 'SET_ACTIVE_PANEL', panel: tab });
  }, [dispatch]);

  return (
    <div className="flex flex-col h-full bg-[#13131f] border-r border-[#2b2b38]">
      {/* Tab Bar */}
      <div className="flex border-b border-[#2b2b38]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex-1 py-2 text-center text-[10px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-purple-400 border-b-2 border-purple-400 bg-[#1a1a28]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className="text-sm">{tab.icon}</div>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'media' && <MediaPanel />}
        {activeTab === 'stickers' && <StickerPanel />}
        {activeTab === 'effects' && <EffectsPanel />}
        {activeTab === 'text' && <TextPanel />}
        {activeTab === 'audio' && <AudioPanel />}
      </div>
    </div>
  );
};

// --- Media Panel ---
const MediaPanel: React.FC = () => {
  const { state, dispatch, pushHistory } = useStudio();
  const { project, selection } = state;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteFromMedia = useCallback((segId: string) => {
    pushHistory('Delete segment from media');
    dispatch({ type: 'DELETE_SEGMENT', segmentId: segId });
    setConfirmDeleteId(null);
  }, [dispatch, pushHistory]);

  return (
    <div className="space-y-2">
      {/* Import Button */}
      <button
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-xs font-medium transition-colors"
        onClick={() => {
          // Dispatch custom event to open import modal (handled by StudioEditor)
          window.dispatchEvent(new CustomEvent('studio:open-import-video'));
        }}
      >
        <Upload className="w-3.5 h-3.5" />
        Import
      </button>

      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium px-1">
        Generated ({project.segments.length})
      </p>
      {project.segments.map(seg => (
        <div
          key={seg.id}
          className={`relative rounded transition-colors ${
            selection.segmentId === seg.id
              ? 'bg-emerald-600/20 border border-emerald-500/40'
              : 'bg-[#1a1a28] border border-transparent hover:border-[#2b2b38]'
          }`}
        >
          <button
            onClick={() => dispatch({ type: 'SELECT_SEGMENT', segmentId: seg.id })}
            className="w-full p-2 text-left"
          >
            <div className="flex items-center gap-2">
              {/* Thumbnail */}
              <div className="w-10 h-14 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                {seg.layers.find(l => l.type === 'image' || l.type === 'video') && (
                  <img
                    src={seg.layers.find(l => l.type === 'image' || l.type === 'video')?.src || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white font-medium">{seg.segmentType}</div>
                <div className="text-[10px] text-gray-500 truncate">
                  {seg.script?.slice(0, 40)}
                </div>
                <div className="text-[10px] text-gray-600">
                  {(seg.durationInFrames / 30).toFixed(0)}s
                </div>
              </div>
            </div>
          </button>

          {/* Delete button — shows on hover */}
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(seg.id); }}
            className="absolute top-1.5 right-1.5 p-1 rounded bg-neutral-800/80 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            style={{ opacity: selection.segmentId === seg.id || confirmDeleteId === seg.id ? 1 : undefined }}
            title="Delete from media + timeline"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>

          {/* Inline confirmation */}
          {confirmDeleteId === seg.id && (
            <div className="px-2 pb-2 flex items-center gap-1.5">
              <span className="text-[9px] text-red-400 flex-1">Hapus media + timeline?</span>
              <button
                onClick={() => handleDeleteFromMedia(seg.id)}
                className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-medium hover:bg-red-500/30"
              >
                Ya
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-2 py-0.5 rounded bg-neutral-700 text-neutral-400 text-[9px] font-medium hover:bg-neutral-600"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// --- Sticker Panel ---
const StickerPanel: React.FC = () => {
  const { state, dispatch, pushHistory } = useStudio();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<StickerCategory | null>(null);

  const stickers = useMemo(() => {
    if (search) return searchStickers(search);
    if (activeCategory) return getStickersByCategory(activeCategory);
    return searchStickers('');
  }, [search, activeCategory]);

  const handleAddSticker = useCallback((sticker: StickerMeta) => {
    const segId = state.selection.segmentId;
    if (!segId) return;
    const seg = state.project.segments.find(s => s.id === segId);
    if (!seg) return;

    pushHistory(`Add sticker: ${sticker.name}`);

    const layer = createStickerLayer(sticker.src, seg.durationInFrames);
    dispatch({ type: 'ADD_LAYER', segmentId: segId, layer });
  }, [state.selection.segmentId, state.project.segments, dispatch, pushHistory]);

  return (
    <div className="space-y-2">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setActiveCategory(null); }}
        placeholder="Search stickers..."
        className="w-full bg-[#1a1a28] border border-[#2b2b38] rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
      />

      {/* Categories */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => { setActiveCategory(null); setSearch(''); }}
          className={`text-[10px] px-2 py-0.5 rounded ${
            !activeCategory ? 'bg-purple-600 text-white' : 'bg-[#1a1a28] text-gray-400 hover:text-white'
          }`}
        >
          All
        </button>
        {STICKER_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setSearch(''); }}
            className={`text-[10px] px-2 py-0.5 rounded ${
              activeCategory === cat.id ? 'bg-purple-600 text-white' : 'bg-[#1a1a28] text-gray-400 hover:text-white'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {!state.selection.segmentId && (
        <p className="text-[10px] text-yellow-500/70 px-1">Select a segment first</p>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        {stickers.map(sticker => (
          <button
            key={sticker.id}
            onClick={() => handleAddSticker(sticker)}
            disabled={!state.selection.segmentId}
            className="aspect-square bg-[#1a1a28] rounded border border-transparent hover:border-purple-500/50 p-2 flex flex-col items-center justify-center gap-1 disabled:opacity-40"
            title={sticker.name}
          >
            <div className="w-8 h-8 flex items-center justify-center text-2xl">
              {getCategoryEmoji(sticker.category)}
            </div>
            <span className="text-[9px] text-gray-400 truncate w-full text-center">
              {sticker.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Effects Panel ---
const EffectsPanel: React.FC = () => {
  const { state, dispatch, pushHistory } = useStudio();
  const effects = getAllEffects();

  const handleAddEffect = useCallback((effect: EffectDefinition) => {
    const segId = state.selection.segmentId;
    if (!segId) return;
    const seg = state.project.segments.find(s => s.id === segId);
    if (!seg) return;

    pushHistory(`Add effect: ${effect.label}`);

    const layer = createEffectLayer(
      { preset: effect.id },
      Math.min(effect.defaultDurationFrames, seg.durationInFrames),
    );
    dispatch({ type: 'ADD_LAYER', segmentId: segId, layer });
  }, [state.selection.segmentId, state.project.segments, dispatch, pushHistory]);

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium px-1">Effects</p>
      {!state.selection.segmentId && (
        <p className="text-[10px] text-yellow-500/70 px-1">Select a segment first</p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {effects.map(effect => (
          <button
            key={effect.id}
            onClick={() => handleAddEffect(effect)}
            disabled={!state.selection.segmentId}
            className="bg-[#1a1a28] rounded border border-transparent hover:border-purple-500/50 p-2 text-left disabled:opacity-40"
          >
            <div className="text-xs text-white font-medium">{effect.label}</div>
            <div className="text-[9px] text-gray-500 mt-0.5">{effect.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Text Panel ---
const TextPanel: React.FC = () => {
  const { state, dispatch, pushHistory } = useStudio();
  const [customText, setCustomText] = useState('');

  const presets = [
    { label: 'Headline', fontSize: 64, fontFamily: 'Inter', color: '#FFFFFF', strokeWidth: 3 },
    { label: 'Subtitle', fontSize: 42, fontFamily: 'Inter', color: '#FFFFFF', strokeWidth: 2 },
    { label: 'Caption', fontSize: 32, fontFamily: 'Inter', color: '#FFFF00', strokeWidth: 1 },
    { label: 'Bold Red', fontSize: 56, fontFamily: 'Inter', color: '#FF3333', strokeWidth: 3 },
  ];

  const handleAddText = useCallback((text: string, fontSize = 48) => {
    const segId = state.selection.segmentId;
    if (!segId || !text.trim()) return;
    const seg = state.project.segments.find(s => s.id === segId);
    if (!seg) return;

    pushHistory(`Add text: ${text.slice(0, 20)}`);

    const layer = createTextLayer(text, seg.durationInFrames);
    if (layer.text) {
      layer.text.fontSize = fontSize;
    }
    dispatch({ type: 'ADD_LAYER', segmentId: segId, layer });
  }, [state.selection.segmentId, state.project.segments, dispatch, pushHistory]);

  return (
    <div className="space-y-3">
      {/* Custom Text Input */}
      <div>
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Type text..."
          className="w-full bg-[#1a1a28] border border-[#2b2b38] rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddText(customText);
              setCustomText('');
            }
          }}
        />
        <button
          onClick={() => { handleAddText(customText); setCustomText(''); }}
          disabled={!customText.trim() || !state.selection.segmentId}
          className="w-full mt-1 text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white py-1.5 rounded transition-colors"
        >
          Add Text
        </button>
      </div>

      {/* Presets */}
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium px-1">Presets</p>
      {!state.selection.segmentId && (
        <p className="text-[10px] text-yellow-500/70 px-1">Select a segment first</p>
      )}
      <div className="space-y-1.5">
        {presets.map(preset => (
          <button
            key={preset.label}
            onClick={() => handleAddText(preset.label, preset.fontSize)}
            disabled={!state.selection.segmentId}
            className="w-full bg-[#1a1a28] rounded border border-transparent hover:border-purple-500/50 p-2 text-left disabled:opacity-40"
          >
            <span style={{
              fontFamily: preset.fontFamily,
              fontSize: Math.min(preset.fontSize * 0.35, 20),
              fontWeight: 800,
              color: preset.color,
              WebkitTextStroke: `${Math.max(preset.strokeWidth * 0.3, 0.5)}px #000`,
              paintOrder: 'stroke fill',
            }}>
              {preset.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Audio Panel ---
const AudioPanel: React.FC = () => {
  const { state } = useStudio();
  const { audio } = state.project;

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium px-1">Audio Tracks</p>

      {/* TTS Tracks */}
      {audio.tts.length > 0 && (
        <div>
          <p className="text-[10px] text-green-400 font-medium px-1 mb-1">TTS ({audio.tts.length})</p>
          {audio.tts.map(track => (
            <div key={track.id} className="bg-[#1a1a28] rounded p-2 mb-1 text-[10px] text-gray-400">
              {track.label} — Vol: {Math.round(track.volume * 100)}%
            </div>
          ))}
        </div>
      )}

      {/* BGM Tracks */}
      {audio.bgm.length > 0 && (
        <div>
          <p className="text-[10px] text-pink-400 font-medium px-1 mb-1">BGM ({audio.bgm.length})</p>
          {audio.bgm.map(track => (
            <div key={track.id} className="bg-[#1a1a28] rounded p-2 mb-1 text-[10px] text-gray-400">
              {track.label} — Vol: {Math.round(track.volume * 100)}%
            </div>
          ))}
        </div>
      )}

      {audio.tts.length === 0 && audio.bgm.length === 0 && audio.sfx.length === 0 && (
        <p className="text-[10px] text-gray-600 px-1">No audio tracks yet</p>
      )}
    </div>
  );
};

// --- Helpers ---
function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    finance: '💰',
    tech: '💻',
    food: '🍽️',
    health: '❤️',
    education: '📚',
    emoji: '😃',
    badges: '🏅',
    effects: '✨',
    social: '👍',
  };
  return map[category] || '📎';
}
