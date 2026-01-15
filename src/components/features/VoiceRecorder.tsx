import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Mic, Square, Play, Pause, Trash2, Loader2, Upload, Check, AlertCircle, FileAudio } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface VoiceRecorderProps {
  userId: string;
  currentVoiceUrl: string | null;
  currentDuration: number;
  onVoiceSaved: (url: string, duration: number) => void;
  language: 'id' | 'en';
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  userId,
  currentVoiceUrl,
  currentDuration,
  onVoiceSaved,
  language
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // File upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedDuration, setUploadedDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);

  const MIN_DURATION = 5;
  const MAX_DURATION = 60; // Longer is better for voice cloning quality

  const uiText = {
    title: language === 'id' ? 'Referensi Suara' : 'Voice Reference',
    description: language === 'id'
      ? 'Rekam suara minimal 5 detik untuk clone suara AI kamu'
      : 'Record at least 5 seconds for AI voice cloning',
    startRecording: language === 'id' ? 'Mulai Rekam' : 'Start Recording',
    stopRecording: language === 'id' ? 'Stop' : 'Stop',
    play: language === 'id' ? 'Putar' : 'Play',
    pause: language === 'id' ? 'Pause' : 'Pause',
    delete: language === 'id' ? 'Hapus' : 'Delete',
    save: language === 'id' ? 'Simpan' : 'Save',
    saving: language === 'id' ? 'Menyimpan...' : 'Saving...',
    saved: language === 'id' ? 'Tersimpan!' : 'Saved!',
    tooShort: language === 'id'
      ? `Minimal ${MIN_DURATION} detik`
      : `Minimum ${MIN_DURATION} seconds`,
    tooLong: language === 'id'
      ? `Maksimal ${MAX_DURATION} detik`
      : `Maximum ${MAX_DURATION} seconds`,
    currentVoice: language === 'id' ? 'Suara saat ini' : 'Current voice',
    newRecording: language === 'id' ? 'Rekaman baru' : 'New recording',
    micPermissionDenied: language === 'id'
      ? 'Akses mikrofon ditolak. Mohon izinkan akses mikrofon di browser.'
      : 'Microphone access denied. Please allow microphone access in your browser.',
    recordingTip: language === 'id'
      ? 'Tips: Baca sebuah paragraf dengan suara natural kamu'
      : 'Tip: Read a paragraph in your natural voice',
    presetVoiceNote: language === 'id'
      ? 'Jika tidak ada rekaman, sistem akan menggunakan suara preset "Lucy"'
      : 'If no recording, system will use preset voice "Lucy"',
    uploadAudio: language === 'id' ? 'Upload Audio' : 'Upload Audio',
    uploadedFile: language === 'id' ? 'File diupload' : 'Uploaded file',
    invalidFileType: language === 'id'
      ? 'Upload file audio (mp3, wav, webm, m4a)'
      : 'Please upload an audio file (mp3, wav, webm, m4a)',
    fileTooLarge: language === 'id'
      ? 'File terlalu besar. Maksimal 15MB'
      : 'File too large. Max 15MB',
    invalidDuration: language === 'id'
      ? `Durasi audio harus ${MIN_DURATION}-${MAX_DURATION} detik`
      : `Audio duration must be ${MIN_DURATION}-${MAX_DURATION} seconds`,
    orDivider: language === 'id' ? 'atau' : 'or',
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setSuccessMessage(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;

      // Determine best supported format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      // Timer using timestamp-based calculation for accuracy
      startTimeRef.current = Date.now();

      const updateDuration = () => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingDuration(elapsed);
        timerRef.current = window.requestAnimationFrame(updateDuration);
      };

      timerRef.current = window.requestAnimationFrame(updateDuration);

    } catch (err: any) {
      console.error('Recording error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(uiText.micPermissionDenied);
      } else {
        setError(err.message || 'Recording failed');
      }
    }
  }, [uiText.micPermissionDenied]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        window.cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMessage(null);

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/ogg'];
    if (!validTypes.some(type => file.type.includes(type.split('/')[1])) && !file.name.match(/\.(mp3|wav|webm|m4a|ogg)$/i)) {
      setError(uiText.invalidFileType);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setError(uiText.fileTooLarge);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Get duration using Audio element
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio(objectUrl);

    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      URL.revokeObjectURL(objectUrl);

      if (duration < MIN_DURATION || duration > MAX_DURATION) {
        setError(uiText.invalidDuration);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Clear any previous recording
      setRecordedBlob(null);
      setRecordingDuration(0);

      setUploadedFile(file);
      setUploadedDuration(duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError(uiText.invalidFileType);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
  }, [uiText.invalidFileType, uiText.fileTooLarge, uiText.invalidDuration]);

  const playRecording = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      audioRef.current.src = url;
      audioRef.current.play();
      setIsPlaying(true);
    } else if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      audioRef.current.src = url;
      audioRef.current.play();
      setIsPlaying(true);
    } else if (currentVoiceUrl) {
      audioRef.current.src = currentVoiceUrl;
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [recordedBlob, uploadedFile, currentVoiceUrl, isPlaying]);

  const deleteRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordingDuration(0);
    setUploadedFile(null);
    setUploadedDuration(0);
    setError(null);
    setSuccessMessage(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsPlaying(false);
  }, []);

  const saveRecording = useCallback(async () => {
    // Handle both recorded blob and uploaded file
    const audioData = recordedBlob || uploadedFile;
    const duration = recordedBlob ? recordingDuration : uploadedDuration;

    if (!audioData) return;

    if (duration < MIN_DURATION) {
      setError(uiText.tooShort);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const timestamp = Date.now();
      let extension = 'webm';
      let contentType = 'audio/webm';

      if (uploadedFile) {
        // Determine extension from uploaded file
        const fileName = uploadedFile.name.toLowerCase();
        if (fileName.endsWith('.mp3')) {
          extension = 'mp3';
          contentType = 'audio/mpeg';
        } else if (fileName.endsWith('.wav')) {
          extension = 'wav';
          contentType = 'audio/wav';
        } else if (fileName.endsWith('.m4a')) {
          extension = 'm4a';
          contentType = 'audio/mp4';
        } else if (fileName.endsWith('.ogg')) {
          extension = 'ogg';
          contentType = 'audio/ogg';
        }
      } else if (recordedBlob) {
        if (recordedBlob.type.includes('mp4')) {
          extension = 'mp4';
          contentType = 'audio/mp4';
        }
      }

      // Upload to user's folder (required by RLS policy)
      const storageFileName = `${userId}/voice_${timestamp}.${extension}`;

      // Upload to storage
      console.log('[VoiceRecorder] Uploading to storage:', storageFileName);
      const { error: uploadError } = await supabase.storage
        .from('voice-references')
        .upload(storageFileName, audioData, {
          contentType: contentType,
          upsert: true
        });

      if (uploadError) {
        console.error('[VoiceRecorder] Storage upload error:', uploadError);
        throw new Error(`Storage: ${uploadError.message}`);
      }
      console.log('[VoiceRecorder] Storage upload success');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-references')
        .getPublicUrl(storageFileName);

      // Update profile using upsert (handles case where row doesn't exist)
      console.log('[VoiceRecorder] Updating profile for user:', userId);
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          voice_reference_url: publicUrl,
          voice_reference_duration_seconds: Math.round(duration),
          voice_recorded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) {
        console.error('[VoiceRecorder] Profile update error:', updateError);
        throw new Error(`Profile: ${updateError.message}`);
      }
      console.log('[VoiceRecorder] Profile update success');

      // Notify parent
      onVoiceSaved(publicUrl, Math.round(duration));
      setRecordedBlob(null);
      setRecordingDuration(0);
      setUploadedFile(null);
      setUploadedDuration(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSuccessMessage(uiText.saved);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save recording');
    } finally {
      setIsSaving(false);
    }
  }, [recordedBlob, uploadedFile, recordingDuration, uploadedDuration, userId, onVoiceSaved, uiText.tooShort, uiText.saved]);

  // Compute display values for both recorded and uploaded audio
  // When recording, use recordingDuration directly (recordedBlob is null during recording)
  const activeDuration = isRecording ? recordingDuration : (recordedBlob ? recordingDuration : uploadedDuration);
  const durationDisplay = activeDuration.toFixed(1);
  const isValidDuration = activeDuration >= MIN_DURATION && activeDuration <= MAX_DURATION;
  const hasNewAudio = recordedBlob || uploadedFile;
  const hasRecording = hasNewAudio || currentVoiceUrl;

  return (
    <div className="bg-[#1a1a24] border border-[#2b2b38] rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-white font-semibold text-lg mb-1">{uiText.title}</h3>
          <p className="text-[#9ca3af] text-sm">{uiText.description}</p>
        </div>
        {currentVoiceUrl && !hasNewAudio && (
          <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 px-3 py-1.5 rounded-lg">
            <Check className="w-4 h-4" />
            {uiText.currentVoice} ({currentDuration}s)
          </div>
        )}
      </div>

      {/* Recording Tip */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-4 py-3">
        <p className="text-purple-300 text-sm">{uiText.recordingTip}</p>
      </div>

      {/* Recording UI */}
      <div className="bg-[#0a0a12] rounded-xl p-4">
        {/* Waveform placeholder / Duration indicator */}
        {isRecording && (
          <div className="flex items-center justify-center gap-4 mb-4 py-6">
            <div className="flex items-center gap-1">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 24 + 8}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <div className="text-white font-mono text-2xl">
              {durationDisplay}s
              <span className="text-[#9ca3af] text-lg ml-2">/ {MAX_DURATION}s</span>
            </div>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
        )}

        {/* Duration indicator for recorded audio */}
        {recordedBlob && !isRecording && (
          <div className="flex flex-col items-center gap-2 mb-4 py-4">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium">{uiText.newRecording}</span>
              <span className={`font-mono text-lg ${isValidDuration ? 'text-green-400' : 'text-red-400'}`}>
                {durationDisplay}s
              </span>
            </div>
            {!isValidDuration && recordingDuration < MIN_DURATION && (
              <span className="text-amber-400 text-sm">({uiText.tooShort})</span>
            )}
            {!isValidDuration && recordingDuration > MAX_DURATION && (
              <span className="text-red-400 text-sm">
                {language === 'id' ? `Terlalu panjang! Maksimal ${MAX_DURATION} detik` : `Too long! Max ${MAX_DURATION} seconds`}
              </span>
            )}
          </div>
        )}

        {/* Duration indicator for uploaded file */}
        {uploadedFile && !recordedBlob && !isRecording && (
          <div className="flex items-center justify-center gap-3 mb-4 py-4">
            <FileAudio className="w-5 h-5 text-blue-400" />
            <span className="text-white font-medium">{uiText.uploadedFile}</span>
            <span className="text-white/60 text-sm truncate max-w-[150px]">
              {uploadedFile.name}
            </span>
            <span className={`font-mono text-lg ${isValidDuration ? 'text-green-400' : 'text-amber-400'}`}>
              {durationDisplay}s
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Start Recording / Upload Buttons */}
          {!isRecording && !hasNewAudio && (
            <>
              <Button
                onClick={startRecording}
                className="bg-[#7c3aed] hover:bg-[#6d28d9] px-6"
              >
                <Mic className="w-4 h-4 mr-2" />
                {uiText.startRecording}
              </Button>

              <span className="text-[#6b7280] text-sm">{uiText.orDivider}</span>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/webm,audio/mp4,audio/m4a,.mp3,.wav,.webm,.m4a,.ogg"
                onChange={handleFileUpload}
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="border-[#3b3b4f] text-white hover:bg-[#2a2a38] px-6"
              >
                <FileAudio className="w-4 h-4 mr-2" />
                {uiText.uploadAudio}
              </Button>
            </>
          )}

          {/* Stop Recording Button */}
          {isRecording && (
            <Button
              onClick={stopRecording}
              className="bg-red-600 hover:bg-red-700 px-6"
            >
              <Square className="w-4 h-4 mr-2" />
              {uiText.stopRecording}
            </Button>
          )}

          {/* Playback & Actions for recorded audio or uploaded file */}
          {hasNewAudio && !isRecording && (
            <>
              <Button
                onClick={playRecording}
                variant="outline"
                className="border-[#3b3b4f] text-white hover:bg-[#2a2a38]"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    {uiText.pause}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    {uiText.play}
                  </>
                )}
              </Button>

              <Button
                onClick={deleteRecording}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {uiText.delete}
              </Button>

              <Button
                onClick={saveRecording}
                disabled={isSaving || !isValidDuration}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-6"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uiText.saving}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {uiText.save}
                  </>
                )}
              </Button>
            </>
          )}

          {/* Play existing voice if no new recording/upload */}
          {currentVoiceUrl && !hasNewAudio && !isRecording && (
            <Button
              onClick={playRecording}
              variant="outline"
              className="border-[#3b3b4f] text-white hover:bg-[#2a2a38]"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  {uiText.pause}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {uiText.play} ({currentDuration}s)
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 px-4 py-3 rounded-lg">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Preset Voice Note */}
      <p className="text-[#6b7280] text-xs text-center">
        {uiText.presetVoiceNote}
      </p>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
};
