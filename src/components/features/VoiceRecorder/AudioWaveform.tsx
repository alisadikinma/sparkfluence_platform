import React, { useEffect, useState } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  isPaused: boolean;
  barCount?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isRecording,
  isPaused,
  barCount = 50
}) => {
  const [heights, setHeights] = useState<number[]>(
    Array(barCount).fill(0).map(() => Math.random() * 20 + 10)
  );

  useEffect(() => {
    if (!isRecording || isPaused) {
      // Reset to base heights when not recording
      setHeights(Array(barCount).fill(0).map(() => Math.random() * 20 + 10));
      return;
    }

    // Animate bars while recording
    const interval = setInterval(() => {
      setHeights(prev =>
        prev.map(() => Math.random() * 60 + 20) // Random heights between 20-80
      );
    }, 150); // Update every 150ms for smooth animation

    return () => clearInterval(interval);
  }, [isRecording, isPaused, barCount]);

  return (
    <div className="flex items-center justify-center gap-1 h-24 w-full max-w-md mx-auto mb-6">
      {heights.map((height, index) => (
        <div
          key={index}
          className={`flex-1 rounded-full transition-all duration-150 ${
            isRecording && !isPaused ? 'bg-primary' : 'bg-surface'
          }`}
          style={{
            height: `${height}%`,
            minWidth: '2px',
            maxWidth: '8px'
          }}
        />
      ))}
    </div>
  );
};
