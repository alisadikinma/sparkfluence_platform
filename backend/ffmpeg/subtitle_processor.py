"""
Subtitle Processor - Groq Whisper Integration
Extracts audio → Transcribes → Generates ASS → Burns subtitle
"""
import os
import logging
import tempfile
import asyncio
import httpx
from pathlib import Path
from typing import Dict, Any, Optional
import uuid
import traceback

logger = logging.getLogger('SubtitleProcessor')


class SubtitleProcessor:
    """Process video to add word-by-word subtitles using Groq Whisper."""
    
    def __init__(self):
        self.groq_key = os.getenv('GROQ_API_KEY')
        if not self.groq_key:
            logger.warning("GROQ_API_KEY not set - transcription will fail")
    
    async def download_video(self, url: str, output_path: Path) -> Path:
        """Download video from URL."""
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            with open(output_path, 'wb') as f:
                f.write(resp.content)
        logger.info(f"Downloaded video: {output_path} ({output_path.stat().st_size / 1024 / 1024:.1f} MB)")
        return output_path
    
    async def extract_audio(self, video_path: Path, output_path: Path) -> Path:
        """Extract audio from video as MP3."""
        cmd = [
            'ffmpeg', '-y', '-i', str(video_path),
            '-vn', '-acodec', 'libmp3lame', '-q:a', '2',
            str(output_path)
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        
        if proc.returncode != 0:
            logger.error(f"Audio extraction failed: {stderr.decode()}")
            raise Exception("Audio extraction failed")
        
        logger.info(f"Extracted audio: {output_path}")
        return output_path
    
    async def transcribe_groq(self, audio_path: Path) -> Dict[str, Any]:
        """
        Transcribe audio with Groq Whisper.
        Returns word-level timestamps for subtitle sync.
        """
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        
        async with httpx.AsyncClient(timeout=180) as client:
            with open(audio_path, 'rb') as f:
                files = {'file': ('audio.mp3', f, 'audio/mpeg')}
                data = {
                    'model': 'whisper-large-v3-turbo',
                    'response_format': 'verbose_json',
                    'timestamp_granularities[]': 'word'
                }
                headers = {'Authorization': f'Bearer {self.groq_key}'}
                
                resp = await client.post(url, headers=headers, files=files, data=data)
                resp.raise_for_status()
                result = resp.json()
        
        logger.info(f"Whisper response keys: {result.keys() if result else None}")
        segments = result.get('segments') or []
        word_count = sum(len(seg.get('words') or []) for seg in segments)
        logger.info(f"Transcription complete: {len(segments)} segments, {word_count} words")
        
        # Debug: Log if segments or words are null
        if result.get('segments') is None:
            logger.warning("Whisper returned null segments")
        for i, seg in enumerate(segments):
            if seg.get('words') is None:
                logger.warning(f"Segment {i} has null words field")
        
        return result
    
    def generate_ass(self, whisper_data: Dict[str, Any], output_path: Path, style: str = 'tiktok') -> Path:
        """Generate ASS subtitle file from Whisper word timestamps."""
        from ffmpeg.subtitles import (
            SubtitleGenerator, get_preset_style, 
            SubtitleSegment, WordTimestamp
        )
        
        # Get style preset
        subtitle_style = get_preset_style(style)
        generator = SubtitleGenerator(subtitle_style)
        
        # Convert Whisper data to SubtitleSegments
        segments = []
        for seg in (whisper_data.get('segments') or []):
            words = []
            for w in (seg.get('words') or []):
                word_text = w.get('word', '').strip()
                if word_text:
                    words.append(WordTimestamp(
                        word=word_text,
                        start=w.get('start', 0),
                        end=w.get('end', 0)
                    ))
            
            if words:
                segments.append(SubtitleSegment(
                    segment_id=str(seg.get('id', len(segments))),
                    text=seg.get('text', '').strip(),
                    start=seg.get('start', 0),
                    end=seg.get('end', 0),
                    words=words
                ))
        
        # Generate ASS file
        generator.save_ass(segments, output_path, word_by_word=True)
        logger.info(f"Generated ASS subtitle: {output_path}")
        return output_path
    
    async def burn_subtitles(self, video_path: Path, ass_path: Path, output_path: Path) -> Path:
        """Burn ASS subtitles into video using FFmpeg."""
        # Escape path for FFmpeg filter
        ass_escaped = str(ass_path).replace('\\', '/').replace(':', '\\:')
        
        cmd = [
            'ffmpeg', '-y',
            '-i', str(video_path),
            '-vf', f"ass={ass_escaped}",
            '-c:a', 'copy',
            str(output_path)
        ]
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        
        if proc.returncode != 0:
            logger.error(f"Subtitle burn failed: {stderr.decode()}")
            raise Exception("Subtitle burn failed")
        
        logger.info(f"Burned subtitles: {output_path}")
        return output_path
    
    async def process(
        self, 
        video_url: str, 
        style: str = 'tiktok',
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Full subtitle pipeline:
        1. Download video
        2. Extract audio
        3. Transcribe with Groq Whisper
        4. Generate ASS subtitle
        5. Burn subtitle into video
        
        Args:
            video_url: URL of video to process
            style: Subtitle style preset (tiktok, reels, shorts, viral)
            progress_callback: Optional callback(percent, step_name)
        
        Returns:
            Dict with success status, video_path, and transcript
        """
        work_dir = Path(tempfile.gettempdir()) / f"subtitle_{uuid.uuid4().hex[:8]}"
        work_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Step 1: Download video
            if progress_callback:
                progress_callback(10, "Downloading video")
            video_path = await self.download_video(video_url, work_dir / "input.mp4")
            
            # Step 2: Extract audio
            if progress_callback:
                progress_callback(25, "Extracting audio")
            audio_path = await self.extract_audio(video_path, work_dir / "audio.mp3")
            
            # Step 3: Transcribe
            if progress_callback:
                progress_callback(40, "Transcribing with Whisper")
            whisper_data = await self.transcribe_groq(audio_path)
            
            # Step 4: Generate ASS
            if progress_callback:
                progress_callback(60, "Generating subtitles")
            ass_path = self.generate_ass(whisper_data, work_dir / "subtitles.ass", style)
            
            # Step 5: Burn subtitles
            if progress_callback:
                progress_callback(80, "Burning subtitles")
            final_path = await self.burn_subtitles(video_path, ass_path, work_dir / "final.mp4")
            
            return {
                "success": True,
                "video_path": str(final_path),
                "transcript": whisper_data,
                "word_count": sum(len(seg.get('words') or []) for seg in (whisper_data.get('segments') or []))
            }
            
        except Exception as e:
            logger.error(f"Subtitle processing error: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e)
            }
