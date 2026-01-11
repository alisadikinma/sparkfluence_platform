"""
FFmpeg Subtitles Module - TikTok/Reels Style
Generates ASS subtitles with word-by-word karaoke animation.
Shows 2-3 words at a time with highlight on current word.
"""

import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import re

logger = logging.getLogger('FFmpeg.Subtitles')


class SubtitlePosition(Enum):
    """Subtitle position on screen (ASS alignment)."""
    BOTTOM_LEFT = 1
    BOTTOM_CENTER = 2
    BOTTOM_RIGHT = 3
    MIDDLE_LEFT = 4
    MIDDLE_CENTER = 5
    MIDDLE_RIGHT = 6
    TOP_LEFT = 7
    TOP_CENTER = 8
    TOP_RIGHT = 9


def detect_script(text: str) -> str:
    """
    Detect the script/writing system of text.
    Returns: 'devanagari', 'latin', or 'mixed'
    """
    if not text:
        return 'latin'
    
    # Unicode ranges for Devanagari (Hindi)
    devanagari_count = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    latin_count = sum(1 for c in text if 'A' <= c.upper() <= 'Z')
    
    total = devanagari_count + latin_count
    if total == 0:
        return 'latin'
    
    if devanagari_count / total > 0.3:  # 30%+ Devanagari = use Hindi font
        return 'devanagari'
    return 'latin'


def get_font_for_script(script: str) -> str:
    """Get appropriate font for detected script."""
    fonts = {
        'devanagari': 'Noto Sans Devanagari',
        'latin': 'Montserrat',
        'mixed': 'Noto Sans'  # Fallback that supports both
    }
    return fonts.get(script, 'Noto Sans')


@dataclass
class SubtitleStyle:
    """ASS subtitle style configuration."""
    font_name: str = "Montserrat"
    font_size: int = 54  # Large for mobile
    primary_color: str = "&HFFFFFF"  # White (BGR format)
    highlight_color: str = "&H00FFFF"  # Yellow/Cyan for current word
    outline_color: str = "&H000000"  # Black outline
    back_color: str = "&H80000000"  # Semi-transparent black
    bold: bool = True
    italic: bool = False
    outline: int = 4  # Thick outline for readability
    shadow: int = 2
    alignment: SubtitlePosition = SubtitlePosition.MIDDLE_CENTER
    margin_l: int = 40
    margin_r: int = 40
    margin_v: int = 200  # Push down from center
    
    # Word display settings
    words_per_group: int = 3  # Show 2-3 words at a time
    word_gap_ms: int = 50  # Gap between word groups


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
    """Generates ASS subtitles with TikTok-style word-by-word animation."""
    
    # ASS header template - 9:16 vertical video (1080x1920)
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
Style: Default,{font_name},{font_size},{primary_color},{primary_color},{outline_color},{back_color},{bold},{italic},0,0,100,100,0,0,1,{outline},{shadow},{alignment},{margin_l},{margin_r},{margin_v},1
Style: Highlight,{font_name},{font_size},{highlight_color},{highlight_color},{outline_color},{back_color},{bold},{italic},0,0,100,100,0,0,1,{outline},{shadow},{alignment},{margin_l},{margin_r},{margin_v},1

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
            highlight_color=self.style.highlight_color,
            outline_color=self.style.outline_color,
            back_color=self.style.back_color,
            bold="-1" if self.style.bold else "0",
            italic="-1" if self.style.italic else "0",
            outline=self.style.outline,
            shadow=self.style.shadow,
            alignment=self.style.alignment.value,
            margin_l=self.style.margin_l,
            margin_r=self.style.margin_r,
            margin_v=self.style.margin_v
        )
    
    def _group_words(self, words: List[WordTimestamp]) -> List[List[WordTimestamp]]:
        """
        Group words into chunks of 2-3 words for display.
        This creates the karaoke effect where only a few words show at once.
        """
        groups = []
        n = self.style.words_per_group
        
        for i in range(0, len(words), n):
            group = words[i:i+n]
            groups.append(group)
        
        return groups
    
    def _generate_karaoke_lines(self, segment: SubtitleSegment) -> List[str]:
        """
        Generate TikTok-style karaoke subtitles.
        Shows 2-3 words at a time with current word highlighted.
        """
        lines = []
        
        if not segment.words:
            # No word timestamps - show full line at center
            start = self._format_time(segment.start)
            end = self._format_time(segment.end)
            lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{segment.text}")
            return lines
        
        # Group words into chunks
        word_groups = self._group_words(segment.words)
        
        for group_idx, group in enumerate(word_groups):
            # Each word in the group gets its own dialogue line with highlight
            for word_idx, current_word in enumerate(group):
                # Build the display text with current word highlighted
                text_parts = []
                
                for i, w in enumerate(group):
                    if i == word_idx:
                        # Current word - HIGHLIGHTED (yellow/cyan)
                        text_parts.append(f"{{\\c{self.style.highlight_color}\\b1}}{w.word.upper()}{{\\c{self.style.primary_color}\\b1}}")
                    else:
                        # Other words - normal white
                        text_parts.append(w.word.upper())
                
                # Join with space for horizontal single line
                # Only use newline if text is too long (>40 chars)
                full_text = " ".join(text_parts)
                if len(full_text.replace('{', '').replace('}', '').replace('\\', '')) > 50:
                    # Too long - split into 2 lines at middle
                    mid = len(text_parts) // 2
                    display_text = " ".join(text_parts[:mid]) + "\\N" + " ".join(text_parts[mid:])
                else:
                    display_text = full_text  # Single line horizontal
                
                start = self._format_time(current_word.start)
                end = self._format_time(current_word.end)
                
                lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{display_text}")
        
        return lines
    
    def _generate_word_popup_lines(self, segment: SubtitleSegment) -> List[str]:
        """
        Alternative style: Words pop up one at a time.
        Current word appears, then stays while next word appears highlighted.
        """
        lines = []
        
        if not segment.words:
            start = self._format_time(segment.start)
            end = self._format_time(segment.end)
            lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{segment.text.upper()}")
            return lines
        
        # Group words
        word_groups = self._group_words(segment.words)
        
        for group in word_groups:
            if not group:
                continue
                
            group_start = group[0].start
            group_end = group[-1].end
            
            # For each word position in the group
            for word_idx in range(len(group)):
                # Build text showing words up to current, with current highlighted
                text_parts = []
                
                for i in range(word_idx + 1):
                    word = group[i]
                    if i == word_idx:
                        # Current word - highlighted
                        text_parts.append(f"{{\\c{self.style.highlight_color}}}{word.word.upper()}{{\\c{self.style.primary_color}}}")
                    else:
                        # Previous words - white
                        text_parts.append(word.word.upper())
                
                # Single line horizontal (split only if too long)
                full_text = " ".join(text_parts)
                if len(full_text.replace('{', '').replace('}', '').replace('\\', '')) > 50:
                    mid = len(text_parts) // 2
                    display_text = " ".join(text_parts[:mid]) + "\\N" + " ".join(text_parts[mid:])
                else:
                    display_text = full_text
                
                start = self._format_time(group[word_idx].start)
                # End when next word starts, or at group end
                if word_idx < len(group) - 1:
                    end = self._format_time(group[word_idx + 1].start - 0.01)
                else:
                    end = self._format_time(group_end)
                
                lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{display_text}")
        
        return lines
    
    def generate_ass(
        self, 
        segments: List[SubtitleSegment],
        word_by_word: bool = True
    ) -> str:
        """
        Generate complete ASS subtitle file content.
        
        Args:
            segments: List of subtitle segments with timing
            word_by_word: If True, generate word-by-word karaoke animation
        
        Returns:
            ASS file content as string
        """
        # Auto-detect script from content and update font if needed
        all_text = ' '.join(seg.text for seg in segments if seg.text)
        detected_script = detect_script(all_text)
        
        if detected_script == 'devanagari':
            logger.info(f"[Subtitles] Detected Hindi/Devanagari script - using Noto Sans Devanagari font")
            self.style.font_name = get_font_for_script('devanagari')
        
        lines = [self._generate_header()]
        
        for segment in segments:
            if word_by_word and segment.words:
                # Use popup style (words accumulate)
                lines.extend(self._generate_word_popup_lines(segment))
            else:
                # Simple full line
                start = self._format_time(segment.start)
                end = self._format_time(segment.end)
                lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{segment.text.upper()}")
        
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
        
        for seg in (whisper_data.get('segments') or []):
            words = []
            for w in (seg.get('words') or []):
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
        words_per_minute: float = 150.0
    ) -> SubtitleSegment:
        """
        Create subtitle segment from script text without Whisper.
        Estimates word timings based on average speaking rate.
        
        Args:
            script_text: The script text
            start_time: Start time in seconds
            end_time: End time in seconds  
            words_per_minute: Average speaking rate (default 150 WPM)
        
        Returns:
            SubtitleSegment with estimated word timings
        """
        # Clean script text
        script_text = script_text.strip()
        if not script_text:
            return SubtitleSegment(
                segment_id="0",
                text="",
                start=start_time,
                end=end_time,
                words=[]
            )
        
        # Split into words
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
        
        # Minimum time per word (to avoid too fast)
        min_time = 0.2  # 200ms minimum per word
        time_per_word = max(time_per_word, min_time)
        
        word_timestamps = []
        current_time = start_time
        
        for word in words:
            word_end = min(current_time + time_per_word - 0.02, end_time)
            word_timestamps.append(WordTimestamp(
                word=word,
                start=round(current_time, 2),
                end=round(word_end, 2),
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


# ============================================================================
# PRESET STYLES - Optimized for TikTok/Reels/Shorts
# ============================================================================

SUBTITLE_PRESETS = {
    'default': SubtitleStyle(
        font_name="Montserrat",
        font_size=54,
        bold=True,
        outline=4,
        shadow=2,
        alignment=SubtitlePosition.MIDDLE_CENTER,
        margin_v=200,
        words_per_group=3
    ),
    
    'tiktok': SubtitleStyle(
        font_name="Montserrat",
        font_size=140,  # Extra large for mobile readability
        bold=True,
        outline=8,
        shadow=4,
        primary_color="&HFFFFFF",  # White
        highlight_color="&H00FFFF",  # Yellow/Cyan
        outline_color="&H000000",  # Black
        alignment=SubtitlePosition.BOTTOM_CENTER,
        margin_v=450,  # Lower center area
        words_per_group=3  # 3 words at a time (single line)
    ),
    
    'reels': SubtitleStyle(
        font_name="Poppins",
        font_size=76,
        bold=True,
        outline=4,
        shadow=2,
        primary_color="&HFFFFFF",
        highlight_color="&H00FF00",  # Green highlight
        alignment=SubtitlePosition.BOTTOM_CENTER,
        margin_v=420,
        words_per_group=3
    ),
    
    'shorts': SubtitleStyle(
        font_name="Roboto",
        font_size=72,
        bold=True,
        outline=4,
        shadow=2,
        primary_color="&HFFFFFF",
        highlight_color="&HFF00FF",  # Magenta
        alignment=SubtitlePosition.BOTTOM_CENTER,
        margin_v=400,
        words_per_group=3
    ),
    
    'minimal': SubtitleStyle(
        font_name="Inter",
        font_size=48,
        bold=True,
        outline=2,
        shadow=1,
        primary_color="&HFFFFFF",
        highlight_color="&HFFFFFF",  # No highlight
        alignment=SubtitlePosition.BOTTOM_CENTER,
        margin_v=100,
        words_per_group=4
    ),
    
    'dramatic': SubtitleStyle(
        font_name="Montserrat",
        font_size=88,  # Extra large
        bold=True,
        outline=6,
        shadow=3,
        primary_color="&HFFFFFF",
        highlight_color="&H0000FF",  # Red highlight (BGR)
        alignment=SubtitlePosition.BOTTOM_CENTER,
        margin_v=400,
        words_per_group=2
    ),
    
    'viral': SubtitleStyle(
        font_name="Montserrat",
        font_size=140,  # Same as tiktok for consistency
        bold=True,
        outline=8,
        shadow=4,
        primary_color="&HFFFFFF",  # White
        highlight_color="&H00D7FF",  # Orange-Yellow (BGR)
        outline_color="&H000000",
        alignment=SubtitlePosition.BOTTOM_CENTER,
        margin_v=480,
        words_per_group=3  # Single line horizontal
    )
}


def get_preset_style(preset_name: str) -> SubtitleStyle:
    """Get a preset subtitle style by name."""
    return SUBTITLE_PRESETS.get(preset_name, SUBTITLE_PRESETS['tiktok'])
