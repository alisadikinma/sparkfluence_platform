import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Save, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';

interface VoiceRecorderProps {
  minDuration: number; // Required minimum duration in seconds (120s)
  maxDuration?: number; // Optional maximum duration (default: 180s)
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  existingAudioUrl?: string; // For playback of existing recording
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  minDuration,
  maxDuration = 180,
  onRecordingComplete,
  existingAudioUrl,
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      cleanupStream();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        cleanupStream();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;

          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }

          return newDuration;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to access microphone. Please check permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Resume timer
      timerIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newDuration;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioUrl && audioPlayerRef.current) {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSave = () => {
    if (audioBlob && duration >= minDuration) {
      onRecordingComplete(audioBlob, duration);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = Math.min((duration / minDuration) * 100, 100);
  const meetsMinimum = duration >= minDuration;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className={`text-5xl font-bold transition-colors duration-300 ${
          meetsMinimum ? 'text-green-500' : 'text-primary'
        }`}>
          {formatTime(duration)}
        </div>
        <div className="text-text-muted text-sm mt-2">
          {isRecording && !isPaused && 'Recording...'}
          {isRecording && isPaused && 'Paused'}
          {!isRecording && duration > 0 && (
            meetsMinimum
              ? '✓ Minimum duration met'
              : `Need ${formatTime(minDuration - duration)} more`
          )}
          {!isRecording && duration === 0 && `Minimum: ${formatTime(minDuration)}`}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-surface rounded-full h-3 mb-6 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            meetsMinimum ? 'bg-green-500' : 'bg-primary'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {!isRecording && duration === 0 && (
          <Button
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2 px-6 py-3"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </Button>
        )}

        {isRecording && (
          <>
            {!isPaused ? (
              <Button
                onClick={pauseRecording}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            ) : (
              <Button
                onClick={resumeRecording}
                className="flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Resume
              </Button>
            )}

            <Button
              onClick={stopRecording}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Stop
            </Button>
          </>
        )}

        {!isRecording && duration > 0 && (
          <>
            <Button
              onClick={startRecording}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Re-record
            </Button>

            {audioUrl && (
              <>
                {!isPlaying ? (
                  <Button
                    onClick={playAudio}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Play
                  </Button>
                ) : (
                  <Button
                    onClick={pauseAudio}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                )}
              </>
            )}

            <Button
              onClick={handleSave}
              disabled={!meetsMinimum}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
          </>
        )}
      </div>

      {/* Hidden audio player */}
      {audioUrl && (
        <audio
          ref={audioPlayerRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Info Text */}
      <div className="text-center text-text-muted text-xs">
        {duration === 0 && 'Speak naturally for at least 2 minutes for best voice cloning quality'}
        {duration > 0 && !meetsMinimum && `Recording must be at least ${formatTime(minDuration)} long`}
        {duration > 0 && meetsMinimum && 'Great! You can save this recording now'}
      </div>
    </div>
  );
};
