// ============================================================================
// useFontLoader — Dynamically loads Google Fonts via <link> injection
// Caches loaded fonts so they are not re-fetched on re-render.
// ============================================================================

import { useState, useEffect, useRef } from 'react';

/** Fonts supported in the Studio text editor. */
export const STUDIO_FONTS = [
  'Inter',
  'Montserrat',
  'Poppins',
  'Roboto',
  'Bebas Neue',
  'Oswald',
  'Playfair Display',
  'Space Grotesk',
] as const;

export type StudioFontFamily = (typeof STUDIO_FONTS)[number];

// Module-level cache — persists across hook instances & re-renders
const loadedFonts = new Set<string>();
const loadingFonts = new Set<string>();

function buildGoogleFontsUrl(fontFamily: string): string {
  const encoded = fontFamily.replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700;900&display=swap`;
}

function getLinkId(fontFamily: string): string {
  return `studio-font-${fontFamily.replace(/ /g, '-').toLowerCase()}`;
}

interface FontLoaderState {
  isLoaded: boolean;
  isLoading: boolean;
}

/**
 * Dynamically loads a Google Font and returns loading state.
 * Cached — calling with the same font twice will not re-fetch.
 */
export function useFontLoader(fontFamily: string): FontLoaderState {
  const [state, setState] = useState<FontLoaderState>(() => ({
    isLoaded: loadedFonts.has(fontFamily),
    isLoading: loadingFonts.has(fontFamily),
  }));

  const fontRef = useRef(fontFamily);
  fontRef.current = fontFamily;

  useEffect(() => {
    // Already loaded
    if (loadedFonts.has(fontFamily)) {
      setState({ isLoaded: true, isLoading: false });
      return;
    }

    // Already has a <link> in the DOM (e.g. from another instance)
    const existingLink = document.getElementById(getLinkId(fontFamily));
    if (existingLink) {
      if (loadingFonts.has(fontFamily)) {
        setState({ isLoaded: false, isLoading: true });
      }
      return;
    }

    // Inject <link>
    loadingFonts.add(fontFamily);
    setState({ isLoaded: false, isLoading: true });

    const link = document.createElement('link');
    link.id = getLinkId(fontFamily);
    link.rel = 'stylesheet';
    link.href = buildGoogleFontsUrl(fontFamily);

    link.onload = () => {
      loadedFonts.add(fontFamily);
      loadingFonts.delete(fontFamily);
      if (fontRef.current === fontFamily) {
        setState({ isLoaded: true, isLoading: false });
      }
    };

    link.onerror = () => {
      loadingFonts.delete(fontFamily);
      if (fontRef.current === fontFamily) {
        setState({ isLoaded: false, isLoading: false });
      }
    };

    document.head.appendChild(link);
  }, [fontFamily]);

  return state;
}

/**
 * Preloads multiple fonts (fire-and-forget).
 * Useful to warm up fonts for the font dropdown previews.
 */
export function preloadFonts(fonts: readonly string[]): void {
  for (const font of fonts) {
    if (loadedFonts.has(font) || loadingFonts.has(font)) continue;
    if (document.getElementById(getLinkId(font))) continue;

    loadingFonts.add(font);

    const link = document.createElement('link');
    link.id = getLinkId(font);
    link.rel = 'stylesheet';
    link.href = buildGoogleFontsUrl(font);

    link.onload = () => {
      loadedFonts.add(font);
      loadingFonts.delete(font);
    };
    link.onerror = () => {
      loadingFonts.delete(font);
    };

    document.head.appendChild(link);
  }
}
