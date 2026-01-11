"""
FFmpeg Transitions Module
Provides xfade transition effects between video segments.
"""

import subprocess
import logging
from pathlib import Path
from typing import List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger('FFmpeg.Transitions')


class TransitionType(Enum):
    """Supported xfade transition types."""
    # Basic
    FADE = "fade"
    FADEBLACK = "fadeblack"
    FADEWHITE = "fadewhite"
    DISSOLVE = "dissolve"
    
    # Directional Wipes
    WIPELEFT = "wipeleft"
    WIPERIGHT = "wiperight"
    WIPEUP = "wipeup"
    WIPEDOWN = "wipedown"
    
    # Slide
    SLIDELEFT = "slideleft"
    SLIDERIGHT = "slideright"
    SLIDEUP = "slideup"
    SLIDEDOWN = "slidedown"
    
    # Smooth
    SMOOTHLEFT = "smoothleft"
    SMOOTHRIGHT = "smoothright"
    SMOOTHUP = "smoothup"
    SMOOTHDOWN = "smoothdown"
    
    # Circle
    CIRCLEOPEN = "circleopen"
    CIRCLECLOSE = "circleclose"
    
    # Rect
    RECTCROP = "rectcrop"
    
    # Diagonal
    DIAGTL = "diagtl"
    DIAGTR = "diagtr"
    DIAGBL = "diagbl"
    DIAGBR = "diagbr"
    
    # Horizontal/Vertical
    HLSLICE = "hlslice"
    HRSLICE = "hrslice"
    VUSLICE = "vuslice"
    VDSLICE = "vdslice"
    
    # Radial
    RADIAL = "radial"
    
    # Distance/Fade variants
    DISTANCE = "distance"
    PIXELIZE = "pixelize"
    
    # Zoom
    ZOOMIN = "zoomin"
    
    # Reveal
    REVEALLEFT = "revealleft"
    REVEALRIGHT = "revealright"
    REVEALUP = "revealup"
    REVEALDOWN = "revealdown"
    
    # Cover
    COVERLEFT = "coverleft"
    COVERRIGHT = "coverright"
    COVERUP = "coverup"
    COVERDOWN = "coverdown"


# Transition presets by emotion/mood
TRANSITIONS = {
    # Default/Safe transitions
    'default': [TransitionType.FADE, TransitionType.DISSOLVE],
    
    # Energy levels
    'calm': [TransitionType.FADE, TransitionType.DISSOLVE, TransitionType.FADEBLACK],
    'moderate': [TransitionType.WIPELEFT, TransitionType.SLIDERIGHT, TransitionType.SMOOTHLEFT],
    'energetic': [TransitionType.CIRCLEOPEN, TransitionType.RADIAL, TransitionType.ZOOMIN],
    
    # Content type
    'hook': [TransitionType.FADE],  # Clean start
    'body': [TransitionType.DISSOLVE, TransitionType.SMOOTHLEFT, TransitionType.SMOOTHRIGHT],
    'peak': [TransitionType.ZOOMIN, TransitionType.CIRCLEOPEN, TransitionType.RADIAL],
    'cta': [TransitionType.FADE, TransitionType.DISSOLVE],  # Clean end
    
    # Emotions
    'authority': [TransitionType.FADE, TransitionType.DISSOLVE],
    'curiosity': [TransitionType.CIRCLEOPEN, TransitionType.REVEALLEFT],
    'excitement': [TransitionType.ZOOMIN, TransitionType.RADIAL, TransitionType.CIRCLEOPEN],
    'shock': [TransitionType.FADEWHITE, TransitionType.PIXELIZE],
    'warmth': [TransitionType.FADE, TransitionType.DISSOLVE, TransitionType.SMOOTHRIGHT],
    'tension': [TransitionType.FADEBLACK, TransitionType.DIAGTL],
    'urgency': [TransitionType.WIPELEFT, TransitionType.SLIDELEFT],
    'contemplation': [TransitionType.FADE, TransitionType.DISSOLVE, TransitionType.FADEBLACK],
    'determination': [TransitionType.WIPERIGHT, TransitionType.SLIDERIGHT],
    'hope': [TransitionType.CIRCLEOPEN, TransitionType.FADEWHITE, TransitionType.ZOOMIN],
}


@dataclass
class TransitionConfig:
    """Configuration for a single transition."""
    type: TransitionType
    duration: float = 0.5  # seconds
    offset: float = 0.0    # offset from default position


class TransitionEngine:
    """Handles video transitions using FFmpeg xfade filter."""
    
    def __init__(self, ffmpeg_path: str = 'ffmpeg'):
        self.ffmpeg_path = ffmpeg_path
        self._verify_ffmpeg()
    
    def _verify_ffmpeg(self):
        """Verify FFmpeg is available."""
        try:
            result = subprocess.run(
                [self.ffmpeg_path, '-version'],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise RuntimeError("FFmpeg not available")
            logger.info("FFmpeg verified successfully")
        except FileNotFoundError:
            raise RuntimeError(f"FFmpeg not found at: {self.ffmpeg_path}")
    
    def get_transition_for_segment(
        self, 
        segment_type: str, 
        emotion: str = 'neutral',
        index: int = 0
    ) -> TransitionType:
        """Get appropriate transition type based on segment and emotion."""
        # First check segment type
        segment_key = segment_type.lower().split('-')[0]  # BODY-1 -> body
        if segment_key in TRANSITIONS:
            options = TRANSITIONS[segment_key]
        # Then check emotion
        elif emotion.lower() in TRANSITIONS:
            options = TRANSITIONS[emotion.lower()]
        else:
            options = TRANSITIONS['default']
        
        # Rotate through options based on index for variety
        return options[index % len(options)]
    
    def get_video_duration(self, video_path: Path) -> float:
        """Get video duration using ffprobe."""
        cmd = [
            'ffprobe', '-v', 'quiet',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            str(video_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"Failed to get duration: {result.stderr}")
        return float(result.stdout.strip())
    
    def apply_transition_two_videos(
        self,
        video1: Path,
        video2: Path,
        output: Path,
        transition: TransitionType = TransitionType.FADE,
        duration: float = 0.5
    ) -> Path:
        """Apply xfade transition between two videos."""
        # Get duration of first video
        vid1_duration = self.get_video_duration(video1)
        
        # Calculate offset (transition starts at end of vid1 - duration)
        offset = max(0, vid1_duration - duration)
        
        # Build xfade filter
        filter_complex = f"[0:v][1:v]xfade=transition={transition.value}:duration={duration}:offset={offset}[outv]"
        
        # Audio crossfade
        audio_filter = f"[0:a][1:a]acrossfade=d={duration}[outa]"
        
        cmd = [
            self.ffmpeg_path, '-y',
            '-i', str(video1),
            '-i', str(video2),
            '-filter_complex', f"{filter_complex};{audio_filter}",
            '-map', '[outv]',
            '-map', '[outa]',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '192k',
            str(output)
        ]
        
        logger.info(f"Applying {transition.value} transition ({duration}s)")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Transition failed: {result.stderr}")
            raise RuntimeError(f"Transition failed: {result.stderr}")
        
        return output
    
    def apply_transitions_chain(
        self,
        videos: List[Path],
        output: Path,
        transitions: Optional[List[TransitionConfig]] = None,
        default_duration: float = 0.5
    ) -> Path:
        """Apply transitions to a chain of videos."""
        import shutil
        import os
        
        if len(videos) < 2:
            if len(videos) == 1:
                # Just copy single video (cross-platform)
                shutil.copy(str(videos[0]), str(output))
                return output
            raise ValueError("Need at least 1 video")
        
        # Default transitions if not provided
        if transitions is None:
            transitions = [
                TransitionConfig(TransitionType.DISSOLVE, default_duration)
                for _ in range(len(videos) - 1)
            ]
        
        if len(transitions) != len(videos) - 1:
            raise ValueError(f"Need {len(videos) - 1} transitions for {len(videos)} videos")
        
        # Process pairs of videos
        work_dir = output.parent
        
        # Ensure work directory exists
        if not work_dir.exists():
            logger.warning(f"Work dir doesn't exist, creating: {work_dir}")
            os.makedirs(str(work_dir), exist_ok=True)
        
        current = videos[0]
        
        for i, (next_video, trans_config) in enumerate(zip(videos[1:], transitions)):
            temp_output = work_dir / f"trans_temp_{i}.mp4"
            
            self.apply_transition_two_videos(
                current,
                next_video,
                temp_output,
                trans_config.type,
                trans_config.duration
            )
            
            # Clean up previous temp file (not original)
            if i > 0 and current.name.startswith('trans_temp_'):
                current.unlink(missing_ok=True)
            
            current = temp_output
        
        # Move final result
        current.rename(output)
        
        return output
    
    def build_complex_filter(
        self,
        video_count: int,
        durations: List[float],
        transitions: List[TransitionConfig]
    ) -> Tuple[str, str]:
        """
        Build complex filter for chaining multiple xfade transitions.
        More efficient than sequential processing for many videos.
        
        Returns: (video_filter, audio_filter)
        """
        if video_count < 2:
            return "", ""
        
        video_parts = []
        audio_parts = []
        
        # Calculate cumulative offsets
        cumulative = 0
        
        for i in range(video_count - 1):
            trans = transitions[i] if i < len(transitions) else TransitionConfig(TransitionType.DISSOLVE, 0.5)
            
            if i == 0:
                # First transition
                video_parts.append(
                    f"[0:v][1:v]xfade=transition={trans.type.value}:duration={trans.duration}:offset={durations[0] - trans.duration}[v{i}]"
                )
                audio_parts.append(
                    f"[0:a][1:a]acrossfade=d={trans.duration}[a{i}]"
                )
            else:
                # Chain from previous output
                prev_duration = sum(durations[:i+1]) - (i * trans.duration)
                video_parts.append(
                    f"[v{i-1}][{i+1}:v]xfade=transition={trans.type.value}:duration={trans.duration}:offset={prev_duration - trans.duration}[v{i}]"
                )
                audio_parts.append(
                    f"[a{i-1}][{i+1}:a]acrossfade=d={trans.duration}[a{i}]"
                )
        
        # Final output labels
        final_idx = video_count - 2
        video_filter = ";".join(video_parts)
        audio_filter = ";".join(audio_parts)
        
        return video_filter, audio_filter, f"[v{final_idx}]", f"[a{final_idx}]"


def get_transition_for_emotion(emotion: str) -> TransitionType:
    """Get a transition type appropriate for the given emotion."""
    options = TRANSITIONS.get(emotion.lower(), TRANSITIONS['default'])
    return options[0]


def get_random_transition(category: str = 'moderate') -> TransitionType:
    """Get a random transition from a category."""
    import random
    options = TRANSITIONS.get(category, TRANSITIONS['default'])
    return random.choice(options)
