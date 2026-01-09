"""
Quick test script for FFmpeg modules.
Run from backend directory: python test_ffmpeg.py
"""

import sys
import subprocess

def test_ffmpeg_available():
    """Test FFmpeg is installed."""
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        if result.returncode == 0:
            version = result.stdout.split('\n')[0]
            print(f"✅ FFmpeg: {version}")
            return True
        else:
            print("❌ FFmpeg not working properly")
            return False
    except FileNotFoundError:
        print("❌ FFmpeg not found! Install with: winget install Gyan.FFmpeg")
        return False

def test_ffprobe_available():
    """Test FFprobe is installed."""
    try:
        result = subprocess.run(['ffprobe', '-version'], capture_output=True, text=True)
        if result.returncode == 0:
            version = result.stdout.split('\n')[0]
            print(f"✅ FFprobe: {version}")
            return True
        else:
            print("❌ FFprobe not working properly")
            return False
    except FileNotFoundError:
        print("❌ FFprobe not found!")
        return False

def test_ffmpeg_modules():
    """Test FFmpeg module imports."""
    try:
        from ffmpeg import VideoCombiner, CombineConfig, TransitionType
        from ffmpeg import SubtitleGenerator, SubtitleStyle
        from ffmpeg import TransitionEngine, TRANSITIONS
        
        print("✅ FFmpeg modules imported successfully")
        
        # Test transition types
        print(f"   - {len(TransitionType)} transition types available")
        print(f"   - {len(TRANSITIONS)} transition presets")
        
        # Test subtitle presets
        from ffmpeg.subtitles import SUBTITLE_PRESETS
        print(f"   - {len(SUBTITLE_PRESETS)} subtitle presets")
        
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_transition_engine():
    """Test TransitionEngine initialization."""
    try:
        from ffmpeg import TransitionEngine
        engine = TransitionEngine()
        print("✅ TransitionEngine initialized")
        
        # Test getting transition for segment
        trans = engine.get_transition_for_segment("HOOK", "curiosity")
        print(f"   - HOOK+curiosity → {trans.value}")
        
        trans = engine.get_transition_for_segment("CTA", "warmth")
        print(f"   - CTA+warmth → {trans.value}")
        
        return True
    except Exception as e:
        print(f"❌ TransitionEngine error: {e}")
        return False

def test_subtitle_generator():
    """Test SubtitleGenerator."""
    try:
        from ffmpeg import SubtitleGenerator, SubtitleStyle
        from ffmpeg.subtitles import SubtitleSegment, WordTimestamp
        
        # Create generator
        gen = SubtitleGenerator()
        print("✅ SubtitleGenerator initialized")
        
        # Create test segment
        segment = SubtitleSegment(
            segment_id="1",
            text="Hello World",
            start=0.0,
            end=2.0,
            words=[
                WordTimestamp(word="Hello", start=0.0, end=0.8),
                WordTimestamp(word="World", start=1.0, end=2.0)
            ]
        )
        
        # Generate ASS
        ass_content = gen.generate_ass([segment], word_by_word=True)
        print(f"   - Generated {len(ass_content)} chars of ASS content")
        
        return True
    except Exception as e:
        print(f"❌ SubtitleGenerator error: {e}")
        return False

def main():
    print("=" * 50)
    print("Sparkfluence FFmpeg Module Test")
    print("=" * 50)
    print()
    
    tests = [
        ("FFmpeg Binary", test_ffmpeg_available),
        ("FFprobe Binary", test_ffprobe_available),
        ("FFmpeg Modules", test_ffmpeg_modules),
        ("Transition Engine", test_transition_engine),
        ("Subtitle Generator", test_subtitle_generator),
    ]
    
    results = []
    for name, test_func in tests:
        print(f"\n[{name}]")
        results.append(test_func())
    
    print()
    print("=" * 50)
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ All {total} tests passed!")
        return 0
    else:
        print(f"⚠️  {passed}/{total} tests passed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
