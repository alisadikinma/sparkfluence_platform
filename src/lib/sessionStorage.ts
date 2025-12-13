// Session storage utilities for video editor progress

const ACTIVE_SESSION_KEY = 'sparkfluence_active_session';
const PROGRESS_PREFIX = 'sparkfluence_video_progress_';

export interface VideoProgress {
  sessionId: string;
  topic: string;
  videoSettings: any;
  segments: any[];
  updatedAt: string;
}

// Save progress to localStorage
export const saveVideoProgress = (sessionId: string, data: Omit<VideoProgress, 'sessionId'>) => {
  if (!sessionId) return;
  
  const progressData: VideoProgress = {
    sessionId,
    ...data,
    updatedAt: new Date().toISOString()
  };
  
  localStorage.setItem(`${PROGRESS_PREFIX}${sessionId}`, JSON.stringify(progressData));
  localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
  console.log('Progress saved:', sessionId);
};

// Load progress from localStorage
export const loadVideoProgress = (sessionId: string): VideoProgress | null => {
  try {
    const saved = localStorage.getItem(`${PROGRESS_PREFIX}${sessionId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Error loading progress:', err);
  }
  return null;
};

// Get active session ID
export const getActiveSessionId = (): string | null => {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
};

// Clear session after video generation complete
export const clearVideoSession = (sessionId: string) => {
  localStorage.removeItem(`${PROGRESS_PREFIX}${sessionId}`);
  localStorage.removeItem(ACTIVE_SESSION_KEY);
  console.log('Session cleared:', sessionId);
};

// Clear all video sessions (cleanup)
export const clearAllVideoSessions = () => {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PROGRESS_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  localStorage.removeItem(ACTIVE_SESSION_KEY);
  console.log('All video sessions cleared');
};
