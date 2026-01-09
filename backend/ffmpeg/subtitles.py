"""
FFmpeg Subtitles Module
Generates ASS subtitles with word-by-word animation from Whisper transcripts.
"""

import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import json

logger = logging.getLogger('FFmpeg.Subtitles')


class SubtitlePosition(Enum):
    """Subtitle position on screen."""
    BOTTOM_CENTER = 2   # Default
    TOP_CENTER = 8
    MIDDLE_CENTER = 5
    BOTTOM_LEFT = 1
    BOTTOM_RIGHT = 3


@dataclass
class SubtitleStyle:
    """ASS subtitle style configuration."""
    font_name: str = "Montserrat"
    font_size: int = 18
    primary_color: str = "&HFFFFFF"  # White (BGR format)
    secondary_color: str = "&H00FFFF"  # Yellow highlight
    outline_color: str = "&H000000"  # Black outline
    back_color: str = "&H80000000"  # Semi-transparent black
    bold: bool = True
    italic: bool = False
    outline: int = 2
    shadow: int = 1
    alignment: SubtitlePosition = SubtitlePosition.BOTTOM_CENTER
    margin_l: int = 20
    margin_r: int = 20
    margin_v: int = 30
    
    # Animation settings
    highlight_words: bool = True
    highlight_color: str = "&H00FFFF"  # Yellow for current word
    fade_in_ms: int = 100
    fade_out_ms: int = 100


@dataclass
class WordTimestamp:
    """Single word with timing information."""
    word: str
    start: float  # seconds
    end: float    # seconds
    confidence: float = 1.0


@dataclass
class SubtitleSegment:
    """A segment of subtitles (typically one sentence or phrase)."""
    segment_id: str
    text: str
    start: float
    end: float
    words: List[WordTimestamp] = field(default_factory=list)


class SubtitleGenerator:
    """Generates ASS subtitles from transcripts."""
    
    # ASS header template
    ASS_HEADER = """[Script Info]
Title: Sparkfluence Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_color},{secondary_color},{outline_color},{back_color},{bold},{italic},0,0,100,100,0,0,1,{outline},{shadow},{alignment},{margin_l},{margin_r},{margin_v},1
Style: Highlight,{font_name},{font_size},{highlight_color},{secondary_color},{outline_color},{back_color},{bold},{italic},0,0,100,100,0,0,1,{outline},{shadow},{alignment},{margin_l},{margin_r},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    def __init__(self, style: Optional[SubtitleStyle] = None):
        self.style = style or SubtitleStyle()
    
    def _format_time(self, seconds: float) -> str:
        """Format seconds to ASS time format: H:MM:SS.CC"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centisecs = int((seconds % 1) * 100)
        return f"{hours}:{minutes:02d}:{secs:02d}.{centisecs:02d}"
    
    def _generate_header(self) -> str:
        """Generate ASS header with style settings."""
        return self.ASS_HEADER.format(
            font_name=self.style.font_name,
            font_size=self.style.font_size,
            primary_color=self.style.primary_color,
            secondary_color=self.style.secondary_color,
            outline_color=self.style.outline_color,
            back_color=self.style.back_color,
            highlight_color=self.style.highlight_color,
            bold="-1" if self.style.bold else "0",
            italic="-1" if self.style.italic else "0",
            outline=self.style.outline,
            shadow=self.style.shadow,
            alignment=self.style.alignment.value,
            margin_l=self.style.margin_l,
            margin_r=self.style.margin_r,
            margin_v=self.style.margin_v
        )
    
    def _generate_word_by_word_line(self, segment: SubtitleSegment) -> List[str]:
        """
        Generate ASS dialogue lines for word-by-word highlight animation.
        Each word gets highlighted when it's being spoken.
        """
        lines = []
        
        if not segment.words:
            # No word timestamps - show full line
            start = self._format_time(segment.start)
            end = self._format_time(segment.end)
            lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{segment.text}")
            return lines
        
        # Build word-by-word animation
        for i, word in enumerate(segment.words):
            # Build line with current word highlighted
            text_parts = []
            
            for j, w in enumerate(segment.words):
                if j == i:
                    # Current word - highlighted
                    text_parts.append(f"{{\\c{self.style.highlight_color}}}{w.word}{{\\c{self.style.primary_color}}}")
                else:
                    text_parts.append(w.word)
            
            full_text = " ".join(text_parts)
            start = self._format_time(word.start)
            end = self._format_time(word.end)
            
            # Add fade effect
            fade = f"{{\\fad({self.style.fade_in_ms},{self.style.fade_out_ms})}}"
            
            lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{fade}{full_text}")
        
        return lines
    
    def _generate_simple_line(self, segment: SubtitleSegment) -> str:
        """Generate simple subtitle line without word animation."""
        start = self._format_time(segment.start)
        end = self._format_time(segment.end)
        fade = f"{{\\fad({self.style.fade_in_ms},{self.style.fade_out_ms})}}"
        return f"Dialogue: 0,{start},{end},Default,,0,0,0,,{fade}{segment.text}"
    
    def generate_ass(
        self, 
        segments: List[SubtitleSegment],
        word_by_word: bool = True
    ) -> str:
        """
        Generate complete ASS subtitle file content.
        
        Args:
            segments: List of subtitle segments with timing
            word_by_word: If True, generate word-by-word highlight animation
        
        Returns:
            ASS file content as string
        """
        lines = [self._generate_header()]
        
        for segment in segments:
            if word_by_word and segment.words:
                lines.extend(self._generate_word_by_word_line(segment))
            else:
                lines.append(self._generate_simple_line(segment))
        
        return "\n".join(lines)
    
    def save_ass(
        self,
        segments: List[SubtitleSegment],
        output_path: Path,
        word_by_word: bool = True
    ) -> Path:
        """Save ASS subtitle file."""
        content = self.generate_ass(segments, word_by_word)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        logger.info(f"Saved subtitles to: {output_path}")
        return output_path
    
    @staticmethod
    def parse_whisper_response(whisper_data: Dict[str, Any]) -> List[SubtitleSegment]:
        """
        Parse Whisper API verbose_json response into SubtitleSegments.
        
        Expected format from Groq Whisper:
        {
            "segments": [
                {
                    "id": 0,
                    "text": "Hello world",
                    "start": 0.0,
                    "end": 2.5,
                    "words": [
                        {"word": "Hello", "start": 0.0, "end": 1.0},
                        {"word": "world", "start": 1.2, "end": 2.5}
                    ]
                }
            ]
        }
        """
        segments = []
        
        for seg in whisper_data.get('segments', []):
            words = []
            for w in seg.get('words', []):
                words.append(WordTimestamp(
                    word=w.get('word', '').strip(),
                    start=w.get('start', 0),
                    end=w.get('end', 0),
                    confidence=w.get('confidence', 1.0)
                ))
            
            segments.append(SubtitleSegment(
                segment_id=str(seg.get('id', len(segments))),
                text=seg.get('text', '').strip(),
                start=seg.get('start', 0),
                end=seg.get('end', 0),
                words=words
            ))
        
        return segments
    
    @staticmethod
    def create_from_script(
        script_text: str,
        start_time: float,
        end_time: float,
        words_per_second: float = 2.5
    ) -> SubtitleSegment:
        """
        Create subtitle segment from script text without Whisper.
        Estimates word timings based on average speaking rate.
        
        Args:
            script_text: The script text
            start_time: Start time in seconds
            end_time: End time in seconds  
            words_per_second: Average speaking rate (default 2.5 = 150 WPM)
        
        Returns:
            SubtitleSegment with estimated word timings
        """
        words = script_text.split()
        if not words:
            return SubtitleSegment(
                segment_id="0",
                text=script_text,
                start=start_time,
                end=end_time,
                words=[]
            )
        
        duration = end_time - start_time
        time_per_word = duration / len(words)
        
        word_timestamps = []
        current_time = start_time
        
        for word in words:
            word_timestamps.append(WordTimestamp(
                word=word,
                start=current_time,
                end=current_time + time_per_word - 0.05,  # Small gap
                confidence=0.9  # Lower confidence for estimated
            ))
            current_time += time_per_word
        
        return SubtitleSegment(
            segment_id="0",
            text=script_text,
            start=start_time,
            end=end_time,
            words=word_timestamps
        )


# Preset styles for different content types
SUBTITLE_PRESETS = {
    'default': SubtitleStyle(),
    
    'tiktok': SubtitleStyle(
        font_name="Montserrat",
        font_size=20,
        bold=True,
        outline=3,
        shadow=2,
        highlight_color="&H00FFFF",  # Yellow
        alignment=SubtitlePosition.BOTTOM_CENTER,
        margin_v=60
    ),
    
    'reels': SubtitleStyle(
        font_name="Poppins",
        font_size=18,
        bold=True,
        outline=2,
        shadow=1,
        highlight_color="&H00FF00",  # Green
        alignment=SubtitlePosition.BOTTOM_CENTER,
        margin_v=50
    ),
    
    'shorts': SubtitleStyle(
        font_name="Roboto",
        font_size=18,
        bold=True,
        outline=2,
        shadow=1,
        highlight_color="&HFF00FF",  # Magenta
        alignment=SubtitlePosition.BOTTOM_CENTER,
        margin_v=40
    ),
    
    'minimal': SubtitleStyle(
        font_name="Inter",
        font_size=16,
        bold=False,
        outline=1,
        shadow=0,
        highlight_words=False,
        alignment=SubtitlePosition.BOTTOM_CENTER
    ),
    
    'dramatic': SubtitleStyle(
        font_name="Montserrat",
        font_size=24,
        bold=True,
        outline=4,
        shadow=3,
        primary_color="&HFFFFFF",
        highlight_color="&H0000FF",  # Red
        alignment=SubtitlePosition.MIDDLE_CENTER,
        margin_v=0
    )
}


def get_preset_style(preset_name: str) -> SubtitleStyle:
    """Get a preset subtitle style by name."""
    return SUBTITLE_PRESETS.get(preset_name, SUBTITLE_PRESETS['default'])
