// ============================================================================
// useGenerateCaptions — Hook to call generate-captions edge function
// Returns caption tracks with word-level timestamps for each segment.
// ============================================================================

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CaptionTrack } from '../types/studio';

interface UseGenerateCaptionsOptions {
  orderId: string | undefined;
  language?: string;
  onSuccess?: (captions: CaptionTrack[]) => void;
  onError?: (error: string) => void;
}

interface UseGenerateCaptionsReturn {
  generate: () => Promise<void>;
  captions: CaptionTrack[];
  isGenerating: boolean;
  error: string | null;
}

export function useGenerateCaptions({
  orderId,
  language,
  onSuccess,
  onError,
}: UseGenerateCaptionsOptions): UseGenerateCaptionsReturn {
  const [captions, setCaptions] = useState<CaptionTrack[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!orderId) {
      const msg = 'No orderId provided for caption generation';
      setError(msg);
      onError?.(msg);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-captions', {
        body: { orderId, language },
      });

      if (fnError) {
        const msg = fnError.message || 'Caption generation failed';
        setError(msg);
        onError?.(msg);
        return;
      }

      if (!data?.success) {
        const msg = data?.error?.message || 'Caption generation returned an error';
        setError(msg);
        onError?.(msg);
        return;
      }

      // Map edge function response to CaptionTrack[] (add default style)
      const rawCaptions: Array<{ segmentId: string; chunks: Array<{ text: string; startMs: number; endMs: number }> }> =
        data.data?.captions || [];

      const tracks: CaptionTrack[] = rawCaptions.map((seg) => ({
        segmentId: seg.segmentId,
        chunks: seg.chunks,
        style: 'classic' as const,
      }));

      setCaptions(tracks);
      onSuccess?.(tracks);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error during caption generation';
      setError(msg);
      onError?.(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [orderId, language, onSuccess, onError]);

  return { generate, captions, isGenerating, error };
}
