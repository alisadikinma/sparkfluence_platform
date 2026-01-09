"""
FFmpeg Video Combiner Module
Combines video segments with transitions, subtitles, and audio processing.
"""

import subprocess
import logging
import asyncio
import tempfile
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
import httpx
import json

from .transitions import TransitionEngine, TransitionConfig, TransitionType, TRANSITIONS
from .subtitles import SubtitleGenerator, SubtitleStyle, SubtitleSegment, get_preset_style

logger = logging.getLogger('FFmpeg.Combiner')


@dataclass
class VideoSegmentInput:
    """Input configuration for a video segment."""
    video_url: str
    segment_type: str
    segment_number: int
    duration_seconds: float
    script_text: Optional[str] = None
    emotion: str = "neutral"
    transition_type: Optional[TransitionType] = None


@dataclass
class CombineConfig:
    """Configuration for video combination."""
    # Transitions
    enable_transitions: bool = True
    transition_duration: float = 0.5
    auto_select_transitions: bool = True
    
    # Subtitles
    enable_subtitles: bool = True
    subtitle_style: str = "tiktok"  # preset name
    word_by_word: bool = True
    
    # Audio
    enable_audio_ducking: bool = False  # Not implemented for MVP
    voice_volume: float = 1.0
    
    # Output
    output_format: str = "mp4"
    video_codec: str = "libx264"
    audio_codec: str = "aac"
    video_bitrate: str = "8M"
    audio_bitrate: str = "192k"
    preset: str = "fast"
    crf: int = 23


@dataclass
class CombineResult:
    """Result of video combination."""
    success: bool
    output_path: Optional[Path] = None
    duration_seconds: float = 0
    file_size_mb: float = 0
    resolution: str = ""
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class VideoCombiner:
    """
    Combines video segments into a final video with:
    - xfade transitions between segments
    - ASS subtitle burn-in
    - Audio normalization
    """
    
    def __init__(
        self,
        ffmpeg_path: str = "ffmpeg",
        ffprobe_path: str = "ffprobe",
        work_dir: Optional[Path] = None
    ):
        self.ffmpeg_path = ffmpeg_path
        self.ffprobe_path = ffprobe_path
        self.work_dir = work_dir or Path(tempfile.gettempdir()) / "sparkfluence_combine"
        self.work_dir.mkdir(parents=True, exist_ok=True)
        
        self.transition_engine = TransitionEngine(ffmpeg_path)
        self.subtitle_generator = SubtitleGenerator()
        
        self._verify_tools()
    
    def _verify_tools(self):
        """Verify FFmpeg tools are available."""
        for tool in [self.ffmpeg_path, self.ffprobe_path]:
            try:
                result = subprocess.run([tool, '-version'], capture_output=True)
                if result.returncode != 0:
                    raise RuntimeError(f"{tool} not available")
            except FileNotFoundError:
                raise RuntimeError(f"{tool} not found")
        logger.info("FFmpeg tools verified")
    
    async def download_video(self, url: str, output_path: Path) -> Path:
        """Download video from URL."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            logger.info(f"Downloading: {url[:80]}...")
            response = await client.get(url)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            logger.info(f"Downloaded: {output_path.name} ({len(response.content) / 1024:.1f} KB)")
            return output_path
    
    def get_video_info(self, video_path: Path) -> Dict[str, Any]:
        """Get video metadata using ffprobe."""
        cmd = [
            self.ffprobe_path, '-v', 'quiet',
            '-print_format', 'json',
            '-show_format', '-show_streams',
            str(video_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            return {}
        
        data = json.loads(result.stdout)
        
        # Extract useful info
        format_info = data.get('format', {})
        video_stream = next(
            (s for s in data.get('streams', []) if s['codec_type'] == 'video'),
            {}
        )
        audio_stream = next(
            (s for s in data.get('streams', []) if s['codec_type'] == 'audio'),
            {}
        )
        
        return {
            'duration': float(format_info.get('duration', 0)),
            'size': int(format_info.get('size', 0)),
            'width': video_stream.get('width', 0),
            'height': video_stream.get('height', 0),
            'fps': eval(video_stream.get('r_frame_rate', '24/1')),
            'video_codec': video_stream.get('codec_name', 'unknown'),
            'audio_codec': audio_stream.get('codec_name', 'unknown'),
            'audio_sample_rate': int(audio_stream.get('sample_rate', 44100))
        }
    
    def normalize_video(
        self,
        input_path: Path,
        output_path: Path,
        target_fps: int = 24,
        target_width: int = 1080,
        target_height: int = 1920
    ) -> Path:
        """Normalize video to consistent format."""
        cmd = [
            self.ffmpeg_path, '-y',
            '-i', str(input_path),
            '-vf', f'scale={target_width}:{target_height}:force_original_aspect_ratio=decrease,pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2,fps={target_fps}',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-ar', '44100', '-ac', '2',
            '-movflags', '+faststart',
            str(output_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"Normalize failed: {result.stderr}")
            raise RuntimeError(f"Video normalization failed: {result.stderr}")
        
        return output_path
    
    def concatenate_simple(self, videos: List[Path], output: Path) -> Path:
        """Simple concatenation without transitions (fallback)."""
        concat_file = self.work_dir / "concat_list.txt"
        
        with open(concat_file, 'w') as f:
            for video in videos:
                f.write(f"file '{video.absolute()}'\n")
        
        cmd = [
            self.ffmpeg_path, '-y',
            '-f', 'concat', '-safe', '0',
            '-i', str(concat_file),
            '-c', 'copy',
            str(output)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"Concatenation failed: {result.stderr}")
        
        return output
    
    def concatenate_with_transitions(
        self,
        videos: List[Path],
        output: Path,
        segments: List[VideoSegmentInput],
        config: CombineConfig
    ) -> Path:
        """Concatenate videos with xfade transitions."""
        if len(videos) < 2:
            return self.concatenate_simple(videos, output)
        
        # Build transition configs
        transitions = []
        for i, seg in enumerate(segments[:-1]):  # No transition after last
            if config.auto_select_transitions:
                trans_type = self.transition_engine.get_transition_for_segment(
                    seg.segment_type,
                    seg.emotion,
                    i
                )
            else:
                trans_type = seg.transition_type or TransitionType.DISSOLVE
            
            transitions.append(TransitionConfig(
                type=trans_type,
                duration=config.transition_duration
            ))
        
        # Apply transitions
        return self.transition_engine.apply_transitions_chain(
            videos,
            output,
            transitions,
            config.transition_duration
        )
    
    def burn_subtitles(
        self,
        video_path: Path,
        subtitle_path: Path,
        output_path: Path
    ) -> Path:
        """Burn ASS subtitles into video."""
        # Escape path for filtergraph (Windows needs special handling)
        sub_path_escaped = str(subtitle_path).replace('\\', '/').replace(':', '\\:')
        
        cmd = [
            self.ffmpeg_path, '-y',
            '-i', str(video_path),
            '-vf', f"ass='{sub_path_escaped}'",
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'copy',
            str(output_path)
        ]
        
        logger.info("Burning subtitles...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Subtitle burn failed: {result.stderr}")
            raise RuntimeError(f"Subtitle burn failed: {result.stderr}")
        
        return output_path
    
    def normalize_audio(self, video_path: Path, output_path: Path) -> Path:
        """Apply EBU R128 loudness normalization."""
        cmd = [
            self.ffmpeg_path, '-y',
            '-i', str(video_path),
            '-af', 'loudnorm=I=-14:TP=-1:LRA=11',
            '-c:v', 'copy',
            '-c:a', 'aac', '-b:a', '192k',
            str(output_path)
        ]
        
        logger.info("Normalizing audio...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.warning(f"Audio normalization failed, continuing: {result.stderr}")
            return video_path  # Return original if normalization fails
        
        return output_path
    
    async def combine(
        self,
        segments: List[VideoSegmentInput],
        output_path: Path,
        config: Optional[CombineConfig] = None,
        whisper_data: Optional[Dict[str, Any]] = None,
        progress_callback: Optional[callable] = None
    ) -> CombineResult:
        """
        Main combination workflow:
        1. Download all video segments
        2. Normalize to consistent format
        3. Apply transitions
        4. Generate and burn subtitles
        5. Normalize audio
        6. Final output
        """
        config = config or CombineConfig()
        job_dir = self.work_dir / f"job_{hash(str(output_path))}"
        job_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Step 1: Download segments
            if progress_callback:
                progress_callback(10, "Downloading video segments")
            
            downloaded = []
            for i, seg in enumerate(segments):
                local_path = job_dir / f"segment_{i:03d}.mp4"
                await self.download_video(seg.video_url, local_path)
                downloaded.append(local_path)
            
            # Step 2: Normalize videos
            if progress_callback:
                progress_callback(30, "Normalizing video format")
            
            normalized = []
            for i, video in enumerate(downloaded):
                norm_path = job_dir / f"norm_{i:03d}.mp4"
                self.normalize_video(video, norm_path)
                normalized.append(norm_path)
            
            # Step 3: Apply transitions
            if progress_callback:
                progress_callback(50, "Applying transitions")
            
            combined_path = job_dir / "combined.mp4"
            
            if config.enable_transitions and len(normalized) > 1:
                self.concatenate_with_transitions(
                    normalized,
                    combined_path,
                    segments,
                    config
                )
            else:
                self.concatenate_simple(normalized, combined_path)
            
            # Step 4: Generate and burn subtitles
            current_video = combined_path
            
            if config.enable_subtitles:
                if progress_callback:
                    progress_callback(70, "Adding subtitles")
                
                # Generate subtitle segments
                if whisper_data:
                    # Use Whisper transcription
                    sub_segments = SubtitleGenerator.parse_whisper_response(whisper_data)
                else:
                    # Generate from script text
                    sub_segments = []
                    current_time = 0.0
                    
                    for seg in segments:
                        if seg.script_text:
                            sub_seg = SubtitleGenerator.create_from_script(
                                seg.script_text,
                                current_time,
                                current_time + seg.duration_seconds
                            )
                            sub_segments.append(sub_seg)
                        current_time += seg.duration_seconds
                
                if sub_segments:
                    # Set subtitle style
                    style = get_preset_style(config.subtitle_style)
                    self.subtitle_generator.style = style
                    
                    # Generate ASS file
                    subtitle_path = job_dir / "subtitles.ass"
                    self.subtitle_generator.save_ass(
                        sub_segments,
                        subtitle_path,
                        word_by_word=config.word_by_word
                    )
                    
                    # Burn subtitles
                    subtitled_path = job_dir / "subtitled.mp4"
                    self.burn_subtitles(current_video, subtitle_path, subtitled_path)
                    current_video = subtitled_path
            
            # Step 5: Normalize audio
            if progress_callback:
                progress_callback(85, "Normalizing audio")
            
            final_normalized = job_dir / "final_norm.mp4"
            current_video = self.normalize_audio(current_video, final_normalized)
            
            # Step 6: Move to final output
            if progress_callback:
                progress_callback(95, "Finalizing")
            
            shutil.copy(current_video, output_path)
            
            # Get final video info
            info = self.get_video_info(output_path)
            
            if progress_callback:
                progress_callback(100, "Complete")
            
            return CombineResult(
                success=True,
                output_path=output_path,
                duration_seconds=info.get('duration', 0),
                file_size_mb=round(output_path.stat().st_size / (1024 * 1024), 2),
                resolution=f"{info.get('width', 0)}x{info.get('height', 0)}",
                metadata={
                    'segments': len(segments),
                    'transitions_enabled': config.enable_transitions,
                    'subtitles_enabled': config.enable_subtitles,
                    'video_codec': info.get('video_codec'),
                    'audio_codec': info.get('audio_codec')
                }
            )
        
        except Exception as e:
            logger.error(f"Combine failed: {e}")
            return CombineResult(
                success=False,
                error_message=str(e)
            )
        
        finally:
            # Cleanup work directory
            try:
                shutil.rmtree(job_dir)
            except Exception as e:
                logger.warning(f"Cleanup failed: {e}")
    
    def cleanup(self):
        """Clean up work directory."""
        try:
            shutil.rmtree(self.work_dir)
            logger.info("Work directory cleaned up")
        except Exception as e:
            logger.warning(f"Cleanup failed: {e}")


# Convenience function for simple usage
async def combine_videos(
    video_urls: List[str],
    output_path: str,
    scripts: Optional[List[str]] = None,
    enable_transitions: bool = True,
    enable_subtitles: bool = True,
    subtitle_style: str = "tiktok"
) -> CombineResult:
    """
    Simple interface to combine videos.
    
    Args:
        video_urls: List of video URLs to combine
        output_path: Output file path
        scripts: Optional list of script texts for subtitles
        enable_transitions: Enable xfade transitions
        enable_subtitles: Enable subtitle burn-in
        subtitle_style: Subtitle style preset
    
    Returns:
        CombineResult with success status and metadata
    """
    segments = []
    for i, url in enumerate(video_urls):
        segments.append(VideoSegmentInput(
            video_url=url,
            segment_type="BODY",
            segment_number=i,
            duration_seconds=8.0,  # Will be detected
            script_text=scripts[i] if scripts and i < len(scripts) else None
        ))
    
    config = CombineConfig(
        enable_transitions=enable_transitions,
        enable_subtitles=enable_subtitles,
        subtitle_style=subtitle_style
    )
    
    combiner = VideoCombiner()
    result = await combiner.combine(segments, Path(output_path), config)
    combiner.cleanup()
    
    return result
