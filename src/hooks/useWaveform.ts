// ============================================================================
// useWaveform — Decode audio and extract amplitude peaks for waveform display
// ============================================================================

import { useState, useEffect, useRef } from 'react';

interface WaveformResult {
  peaks: number[];
  duration: number;
  isLoading: boolean;
  error: string | null;
}

const TARGET_PEAKS = 200;

// Module-level cache: audioUrl → { peaks, duration }
const waveformCache = new Map<string, { peaks: number[]; duration: number }>();

export function useWaveform(audioUrl: string | null): WaveformResult {
  const [peaks, setPeaks] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the current URL to avoid stale updates
  const currentUrlRef = useRef<string | null>(null);
  // Track if component is still mounted
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Reset if no URL
    if (!audioUrl) {
      setPeaks([]);
      setDuration(0);
      setIsLoading(false);
      setError(null);
      currentUrlRef.current = null;
      return;
    }

    // Check cache first
    const cached = waveformCache.get(audioUrl);
    if (cached) {
      setPeaks(cached.peaks);
      setDuration(cached.duration);
      setIsLoading(false);
      setError(null);
      currentUrlRef.current = audioUrl;
      return;
    }

    currentUrlRef.current = audioUrl;
    setIsLoading(true);
    setError(null);

    let aborted = false;

    async function decode() {
      try {
        // Fetch the audio file as ArrayBuffer
        const response = await fetch(audioUrl!);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        if (aborted || !mountedRef.current || currentUrlRef.current !== audioUrl) return;

        // Create an AudioContext for decoding
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) {
          throw new Error('AudioContext is not supported in this browser');
        }

        const audioContext = new AudioCtx();

        try {
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          if (aborted || !mountedRef.current || currentUrlRef.current !== audioUrl) {
            audioContext.close();
            return;
          }

          const audioDuration = audioBuffer.duration;

          // Extract left channel data
          const channelData = audioBuffer.getChannelData(0);
          const totalSamples = channelData.length;

          // Downsample to TARGET_PEAKS chunks, take max absolute value per chunk
          const chunkSize = Math.floor(totalSamples / TARGET_PEAKS);
          const rawPeaks: number[] = [];

          if (chunkSize === 0) {
            // Very short audio — just take all samples
            for (let i = 0; i < totalSamples; i++) {
              rawPeaks.push(Math.abs(channelData[i]));
            }
          } else {
            for (let i = 0; i < TARGET_PEAKS; i++) {
              const start = i * chunkSize;
              const end = Math.min(start + chunkSize, totalSamples);
              let maxVal = 0;
              for (let j = start; j < end; j++) {
                const absVal = Math.abs(channelData[j]);
                if (absVal > maxVal) maxVal = absVal;
              }
              rawPeaks.push(maxVal);
            }
          }

          // Normalize to 0-1 range
          const maxPeak = Math.max(...rawPeaks, 0.001); // avoid division by zero
          const normalizedPeaks = rawPeaks.map(p => p / maxPeak);

          // Cache the result
          waveformCache.set(audioUrl!, { peaks: normalizedPeaks, duration: audioDuration });

          if (mountedRef.current && currentUrlRef.current === audioUrl) {
            setPeaks(normalizedPeaks);
            setDuration(audioDuration);
            setIsLoading(false);
          }

          audioContext.close();
        } catch (decodeErr) {
          audioContext.close();
          throw decodeErr;
        }
      } catch (err) {
        if (!aborted && mountedRef.current && currentUrlRef.current === audioUrl) {
          const message = err instanceof Error ? err.message : 'Failed to decode audio';
          setError(message);
          setPeaks([]);
          setDuration(0);
          setIsLoading(false);
        }
      }
    }

    decode();

    return () => {
      aborted = true;
    };
  }, [audioUrl]);

  return { peaks, duration, isLoading, error };
}
