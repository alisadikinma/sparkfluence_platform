import { useState, useEffect, useRef, useCallback } from 'react';

const REFRESH_RATE_LIMIT_KEY = 'sparkfluence_scriptlab_refresh_rate';
const MAX_REFRESHES_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const COOLDOWN_MS = 30 * 1000;

interface RateLimitData {
  timestamps: number[];
  cooldownUntil: number | null;
}

export function useRateLimit() {
  const [rateLimited, setRateLimited] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  // Check rate limit status on mount
  useEffect(() => {
    checkRateLimit();
  }, []);

  const getRateLimitData = (): RateLimitData => {
    try {
      const data = localStorage.getItem(REFRESH_RATE_LIMIT_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading rate limit data:', e);
    }
    return { timestamps: [], cooldownUntil: null };
  };

  const setRateLimitData = (data: RateLimitData) => {
    try {
      localStorage.setItem(REFRESH_RATE_LIMIT_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving rate limit data:', e);
    }
  };

  const startCooldownTimer = useCallback((cooldownUntil: number) => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }

    cooldownIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((cooldownUntil - now) / 1000);

      if (remaining <= 0) {
        setRateLimited(false);
        setCooldownRemaining(0);
        const data = getRateLimitData();
        setRateLimitData({ timestamps: data.timestamps, cooldownUntil: null });
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
        }
      } else {
        setCooldownRemaining(remaining);
      }
    }, 1000);
  }, []);

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const data = getRateLimitData();

    if (data.cooldownUntil && now < data.cooldownUntil) {
      const remaining = Math.ceil((data.cooldownUntil - now) / 1000);
      setRateLimited(true);
      setCooldownRemaining(remaining);
      startCooldownTimer(data.cooldownUntil);
      return false;
    }

    const recentTimestamps = data.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

    if (recentTimestamps.length >= MAX_REFRESHES_PER_WINDOW) {
      const cooldownUntil = now + COOLDOWN_MS;
      setRateLimitData({ timestamps: recentTimestamps, cooldownUntil });
      setRateLimited(true);
      setCooldownRemaining(Math.ceil(COOLDOWN_MS / 1000));
      startCooldownTimer(cooldownUntil);
      return false;
    }

    setRateLimitData({ timestamps: recentTimestamps, cooldownUntil: null });
    setRateLimited(false);
    return true;
  }, [startCooldownTimer]);

  const recordRefresh = useCallback(() => {
    const now = Date.now();
    const data = getRateLimitData();
    const recentTimestamps = data.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    recentTimestamps.push(now);
    setRateLimitData({ timestamps: recentTimestamps, cooldownUntil: data.cooldownUntil });
  }, []);

  return {
    rateLimited,
    cooldownRemaining,
    checkRateLimit,
    recordRefresh,
  };
}
