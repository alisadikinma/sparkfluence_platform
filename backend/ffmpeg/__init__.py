"""
Sparkfluence FFmpeg Module
Video processing utilities for final video combination.
"""

from .transitions import TransitionEngine, TransitionType, TransitionConfig, TRANSITIONS
from .subtitles import SubtitleGenerator, SubtitleStyle
from .combiner import VideoCombiner, CombineConfig, VideoSegmentInput

__all__ = [
    'TransitionEngine',
    'TransitionType',
    'TransitionConfig',
    'TRANSITIONS',
    'SubtitleGenerator', 
    'SubtitleStyle',
    'VideoCombiner',
    'CombineConfig',
    'VideoSegmentInput'
]
