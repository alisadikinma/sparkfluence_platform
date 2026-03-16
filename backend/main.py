from fastapi import FastAPI, HTTPException, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import subprocess
import os
import uuid
import httpx
from pathlib import Path
import asyncio
import logging
import tempfile
import shutil
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import threading

# Import FFmpeg modules
from ffmpeg import VideoCombiner, CombineConfig, VideoSegmentInput, TransitionType
from ffmpeg.subtitle_processor import SubtitleProcessor
from api_key_pool import get_pool

# Import webhook handler for GeminiGen auto-retry
from webhook_handler import router as webhook_router

# Load environment variables from root .env
load_dotenv(dotenv_path=Path(__file__).parent.parent / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import background worker
from job_worker import BackgroundWorker

# Global worker instance
background_worker: Optional[BackgroundWorker] = None
worker_task: Optional[asyncio.Task] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    global background_worker, worker_task
    
    # Startup
    logger.info("Starting Sparkfluence Video Backend...")
    
    # Start background worker if Supabase is configured
    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')
    if supabase_url and supabase_key:
        try:
            background_worker = BackgroundWorker()
            worker_task = asyncio.create_task(background_worker.start())
            logger.info("Background job worker started")
        except Exception as e:
            logger.error(f"Failed to start background worker: {e}")
    else:
        logger.warning("Supabase not configured - background worker disabled")
    
    yield
    
    # Shutdown
    if background_worker:
        background_worker.stop()
    if worker_task:
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass
    logger.info("Backend shutdown complete")


app = FastAPI(
    title="Sparkfluence Video Backend", 
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware - Whitelist specific origins for security
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    os.getenv("FRONTEND_URL", "https://sparkfluence.app"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include webhook router for GeminiGen callbacks
app.include_router(webhook_router)

# In-memory job storage (use Redis in production)
jobs: Dict[str, Dict[str, Any]] = {}

# Store completed video paths for serving
completed_videos: Dict[str, str] = {}

# Supabase client helper
class SupabaseHelper:
    def __init__(self):
        # Support both VITE_ prefixed and non-prefixed variable names
        self.url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
        self.key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    
    async def insert(self, table: str, data: List[Dict]) -> List[Dict]:
        """Insert records into table."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.url}/rest/v1/{table}",
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
    
    async def select(self, table: str, filters: Dict = None) -> List[Dict]:
        """Select records from table."""
        async with httpx.AsyncClient() as client:
            url = f"{self.url}/rest/v1/{table}"
            params = {k: f"eq.{v}" for k, v in (filters or {}).items()}
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
    
    async def update(self, table: str, filters: Dict, data: Dict) -> List[Dict]:
        """Update records in table matching filters."""
        async with httpx.AsyncClient() as client:
            url = f"{self.url}/rest/v1/{table}"
            params = {k: f"eq.{v}" for k, v in (filters or {}).items()}
            response = await client.patch(
                url,
                headers=self.headers,
                params=params,
                json=data
            )
            response.raise_for_status()
            return response.json()
    
    async def select_jsonb_contains(self, table: str, column: str, key: str, value: str) -> List[Dict]:
        """Select records where JSONB column contains key=value."""
        async with httpx.AsyncClient() as client:
            url = f"{self.url}/rest/v1/{table}"
            # Use PostgREST JSONB contains operator: column->>'key' = value
            params = {f"{column}->>'{key}'": f"eq.{value}"}
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()

supabase = SupabaseHelper()


# Models
class VideoSegment(BaseModel):
    type: str
    video_url: str
    duration_seconds: float

class CombineOptions(BaseModel):
    bgm_url: Optional[str] = None
    bgm_volume: float = 0.20
    preserve_native_audio: bool = True  # Keep VEO 3.1 native audio
    audio_duck_during_speech: bool = True  # Lower BGM when speech detected

class CombineVideoRequest(BaseModel):
    project_id: str
    segments: List[VideoSegment]
    options: CombineOptions

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress_percentage: int
    current_step: str
    final_video_url: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# New models for async job creation
class ImageSegment(BaseModel):
    segment_id: str
    segment_number: int
    segment_type: Optional[str] = None
    visual_prompt: str

class CreateImageJobsRequest(BaseModel):
    user_id: str
    session_id: str
    segments: List[ImageSegment]
    style: str = 'cinematic'
    aspect_ratio: str = '9:16'
    provider: str = 'z-image'
    topic: Optional[str] = None
    language: str = 'indonesian'

class VideoJobSegment(BaseModel):
    segment_id: str
    segment_number: int
    segment_type: Optional[str] = None
    shot_type: str = 'B-ROLL'
    emotion: Optional[str] = None
    script_text: Optional[str] = None
    image_url: str
    duration_seconds: int = 8
    visual_direction: Optional[str] = None

class CreateVideoJobsRequest(BaseModel):
    user_id: str
    session_id: str
    segments: List[VideoJobSegment]
    topic: Optional[str] = None
    language: str = 'indonesian'
    aspect_ratio: str = '9:16'
    resolution: str = '1080p'


# ==================== V2 Models (Enhanced FFmpeg) ====================

class TextOverlayV2(BaseModel):
    """Text overlay to burn into a video segment via FFmpeg drawtext."""
    content: str
    x: int = 0
    y: int = 0
    width: int = 1080
    height: int = 200
    font_size: int = 48
    font_family: str = "Arial"
    font_color: str = "#FFFFFF"
    bg_color: Optional[str] = None
    opacity: float = 1.0
    alignment: str = "center"  # left, center, right
    bold: bool = False
    italic: bool = False
    stroke_color: Optional[str] = None
    stroke_width: int = 0
    enter_animation: Optional[str] = None
    exit_animation: Optional[str] = None
    start_time: float = 0.0  # seconds from segment start
    end_time: float = 0.0    # seconds from segment start (0 = full duration)

class MediaOverlayV2(BaseModel):
    """Image/video overlay to composite onto the combined video via FFmpeg overlay filter."""
    type: str = "image"              # "image" or "video"
    src: str                         # URL to media file
    x: int = 0                       # position x in composition
    y: int = 0                       # position y in composition
    width: int = 324                 # scaled width
    height: int = 576                # scaled height
    opacity: float = 1.0             # 0-1
    start_time: float = 0.0          # absolute seconds in final video
    end_time: float = 0.0            # absolute seconds in final video

class VideoSegmentV2(BaseModel):
    """Enhanced video segment with all metadata."""
    segment_id: str
    segment_number: int
    segment_type: str  # HOOK, FORE, BODY, PEAK, CTA
    video_url: str
    duration_seconds: float
    script_text: Optional[str] = None
    emotion: str = "neutral"
    transition_type: Optional[str] = None       # FFmpeg xfade type for transition TO next segment
    transition_duration: Optional[float] = None  # seconds
    text_overlays: Optional[List[TextOverlayV2]] = None  # Text layers to burn in

class CombineOptionsV2(BaseModel):
    """Enhanced combine options."""
    # Transitions
    enable_transitions: bool = True
    transition_duration: float = 0.5
    auto_select_transitions: bool = True  # False = use per-segment transition_type

    # Subtitles (now supports at combine time)
    enable_subtitles: bool = False
    subtitle_style: str = "tiktok"  # tiktok, reels, shorts, viral, dramatic
    word_by_word: bool = True

    # BGM (new - supports at combine time)
    enable_bgm: bool = False
    music_url: Optional[str] = None  # Required if enable_bgm=True
    bgm_volume: float = 0.20
    duck_during_speech: bool = True

    # Audio
    normalize_audio: bool = True

class CombineVideoRequestV2(BaseModel):
    """Enhanced combine request."""
    project_id: str
    session_id: str
    segments: List[VideoSegmentV2]
    media_overlays: Optional[List[MediaOverlayV2]] = None  # Image/video overlays with absolute timing
    options: CombineOptionsV2 = CombineOptionsV2()
    whisper_data: Optional[Dict[str, Any]] = None  # Optional Whisper transcription


# API Key authentication
def verify_api_key(x_api_key: str = Header(...)):
    expected_key = os.getenv('BACKEND_API_KEY')
    if not expected_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    if x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


@app.get("/")
async def root():
    return {
        "message": "Sparkfluence Video Backend API", 
        "version": "2.1.0",
        "features": [
            "video_combining",
            "video_combining_v2",  # With transitions + subtitles
            "background_jobs",
            "image_generation",
            "video_generation"
        ],
        "ffmpeg_features": {
            "transitions": "xfade (58 types)",
            "subtitles": "ASS word-by-word animation",
            "audio": "EBU R128 normalization"
        }
    }


@app.get("/health")
async def health_check():
    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')
    supabase_configured = bool(supabase_url and supabase_key)
    worker_running = background_worker is not None and background_worker.running if background_worker else False
    
    return {
        "status": "healthy",
        "ffmpeg_available": check_ffmpeg_available(),
        "ffmpeg_modules": ["transitions", "subtitles", "combiner"],
        "supabase_configured": supabase_configured,
        "background_worker": "running" if worker_running else "stopped"
    }


@app.get("/api/worker/status")
async def worker_status(api_key: str = Header(..., alias="x-api-key")):
    """Get background worker status."""
    verify_api_key(api_key)
    
    return {
        "success": True,
        "data": {
            "running": background_worker.running if background_worker else False,
            "image_rate_limited": background_worker.image_worker.is_rate_limited if background_worker else False,
            "video_rate_limited": background_worker.video_worker.is_rate_limited if background_worker else False
        }
    }


# ==================== NEW: Async Job Creation Endpoints ====================

@app.post("/api/jobs/images")
async def create_image_jobs(
    request: CreateImageJobsRequest,
    api_key: str = Header(..., alias="x-api-key")
):
    """Create image generation jobs (async). Worker will process them."""
    verify_api_key(api_key)
    
    if not supabase.url or not supabase.key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    # Prepare job records
    jobs_data = []
    for seg in request.segments:
        jobs_data.append({
            'user_id': request.user_id,
            'session_id': request.session_id,
            'segment_id': seg.segment_id,
            'segment_number': seg.segment_number,
            'segment_type': seg.segment_type,
            'visual_prompt': seg.visual_prompt,
            'style': request.style,
            'aspect_ratio': request.aspect_ratio,
            'provider': request.provider,
            'topic': request.topic,
            'language': request.language,
            'status': 0  # PENDING
        })
    
    try:
        # Insert jobs into database
        created = await supabase.insert('image_generation_jobs', jobs_data)
        
        return {
            "success": True,
            "data": {
                "jobs_created": len(created),
                "session_id": request.session_id,
                "message": "Jobs queued for background processing"
            }
        }
    except Exception as e:
        logger.error(f"Failed to create image jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/jobs/videos")
async def create_video_jobs(
    request: CreateVideoJobsRequest,
    api_key: str = Header(..., alias="x-api-key")
):
    """Create video generation jobs (async). Worker will process them."""
    verify_api_key(api_key)
    
    if not supabase.url or not supabase.key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    # Prepare job records
    jobs_data = []
    for seg in request.segments:
        jobs_data.append({
            'user_id': request.user_id,
            'session_id': request.session_id,
            'segment_id': seg.segment_id,
            'segment_number': seg.segment_number,
            'segment_type': seg.segment_type,
            'shot_type': seg.shot_type,
            'emotion': seg.emotion,
            'script_text': seg.script_text,
            'image_url': seg.image_url,
            'duration_seconds': seg.duration_seconds,
            'topic': request.topic,
            'language': request.language,
            'aspect_ratio': request.aspect_ratio,
            'resolution': request.resolution,
            'status': 0  # PENDING
        })
    
    try:
        created = await supabase.insert('video_generation_jobs', jobs_data)
        
        return {
            "success": True,
            "data": {
                "jobs_created": len(created),
                "session_id": request.session_id,
                "message": "Jobs queued for background processing"
            }
        }
    except Exception as e:
        logger.error(f"Failed to create video jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/{job_type}/{session_id}")
async def get_session_jobs(
    job_type: str,
    session_id: str,
    api_key: str = Header(..., alias="x-api-key")
):
    """Get all jobs for a session."""
    verify_api_key(api_key)
    
    if job_type not in ['images', 'videos']:
        raise HTTPException(status_code=400, detail="job_type must be 'images' or 'videos'")
    
    table = 'image_generation_jobs' if job_type == 'images' else 'video_generation_jobs'
    
    try:
        jobs = await supabase.select(table, {'session_id': session_id})
        
        # Calculate summary
        total = len(jobs)
        pending = sum(1 for j in jobs if j['status'] == 0)
        processing = sum(1 for j in jobs if j['status'] == 1)
        completed = sum(1 for j in jobs if j['status'] == 2)
        failed = sum(1 for j in jobs if j['status'] == 3)
        
        return {
            "success": True,
            "data": {
                "jobs": jobs,
                "summary": {
                    "total": total,
                    "pending": pending,
                    "processing": processing,
                    "completed": completed,
                    "failed": failed
                },
                "all_complete": pending == 0 and processing == 0
            }
        }
    except Exception as e:
        logger.error(f"Failed to get jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Existing Video Combining Endpoints ====================

@app.post("/api/combine-final-video")
async def combine_final_video(
    request: CombineVideoRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Header(..., alias="x-api-key")
):
    verify_api_key(api_key)

    # Create job ID
    job_id = f"job_{uuid.uuid4().hex[:12]}"

    # Initialize job status
    jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "progress_percentage": 0,
        "current_step": "Initializing",
        "final_video_url": None,
        "error_message": None,
        "metadata": None
    }

    # Start background processing
    background_tasks.add_task(
        process_video_combination,
        job_id,
        request.project_id,
        request.segments,
        request.options
    )

    return {
        "success": True,
        "data": {
            "job_id": job_id,
            "status": "processing",
            "estimated_time_seconds": 30,
            "polling_endpoint": f"/api/job-status/{job_id}"
        }
    }


# ==================== V2: Enhanced Video Combining (Transitions + Subtitles) ====================

@app.post("/api/combine-final-video-v2")
async def combine_final_video_v2(
    request: CombineVideoRequestV2,
    background_tasks: BackgroundTasks,
    api_key: str = Header(..., alias="x-api-key")
):
    """
    Enhanced video combination with:
    - xfade transitions between segments
    - ASS subtitle burn-in (word-by-word animation)
    - Audio normalization (EBU R128)
    """
    verify_api_key(api_key)

    # Create job ID
    job_id = f"job_{uuid.uuid4().hex[:12]}"

    # Initialize job status
    jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "progress_percentage": 0,
        "current_step": "Initializing",
        "final_video_url": None,
        "error_message": None,
        "metadata": None
    }

    # Start background processing
    background_tasks.add_task(
        process_video_combination_v2,
        job_id,
        request.project_id,
        request.session_id,
        request.segments,
        request.options,
        request.whisper_data,
        request.media_overlays
    )

    return {
        "success": True,
        "data": {
            "job_id": job_id,
            "status": "processing",
            "estimated_time_seconds": 60,  # Longer due to transitions
            "polling_endpoint": f"/api/job-status/{job_id}",
            "features": {
                "transitions": request.options.enable_transitions,
                "subtitles": request.options.enable_subtitles,
                "audio_normalization": request.options.normalize_audio
            }
        }
    }


@app.get("/api/job-status/{job_id}")
async def get_job_status(
    job_id: str,
    api_key: str = Header(..., alias="x-api-key")
):
    verify_api_key(api_key)

    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]

    return {
        "success": True,
        "data": job
    }


@app.get("/api/video/{video_id}")
async def serve_video(video_id: str):
    """Serve local video file for development"""
    if video_id not in completed_videos:
        raise HTTPException(status_code=404, detail="Video not found")
    
    video_path = completed_videos[video_id]
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(
        video_path,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Disposition": f"inline; filename={video_id}.mp4"
        }
    )


# ==================== Background Tasks ====================

async def process_video_combination(
    job_id: str,
    project_id: str,
    segments: List[VideoSegment],
    options: CombineOptions
):
    work_dir = Path(tempfile.gettempdir()) / f"sparkfluence_{job_id}"
    work_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Step 1: Download video segments
        update_job_status(job_id, 10, "Downloading video segments")
        segment_files = await download_segments(segments, work_dir)

        # Step 2: Create concat file
        update_job_status(job_id, 30, "Creating concat file")
        concat_file = create_concat_file(segment_files, work_dir)

        # Step 3: Concatenate videos
        update_job_status(job_id, 50, "Concatenating video segments")
        final_video = concatenate_videos(concat_file, work_dir)

        # Step 4: Add BGM (optional) - with audio ducking for VEO 3.1 native audio
        if options.bgm_url:
            update_job_status(job_id, 70, "Adding background music")
            final_video = await add_background_music(
                final_video,
                options.bgm_url,
                options.bgm_volume,
                work_dir,
                duck_during_speech=options.audio_duck_during_speech
            )

        # Step 5: Upload to storage
        update_job_status(job_id, 90, "Uploading final video")
        final_url = await upload_to_storage(final_video, project_id)

        # Step 6: Get metadata
        metadata = get_video_metadata(final_video)

        # Mark as completed
        jobs[job_id].update({
            "status": "completed",
            "progress_percentage": 100,
            "current_step": "Upload complete",
            "final_video_url": final_url,
            "metadata": metadata
        })

        # Cleanup
        cleanup_directory(work_dir)

    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}")
        jobs[job_id].update({
            "status": "failed",
            "current_step": jobs[job_id].get("current_step", "Processing"),
            "error_message": str(e)
        })
        cleanup_directory(work_dir)


async def process_video_combination_v2(
    job_id: str,
    project_id: str,
    session_id: str,
    segments: List[VideoSegmentV2],
    options: CombineOptionsV2,
    whisper_data: Optional[Dict[str, Any]] = None,
    media_overlays: Optional[List[MediaOverlayV2]] = None
):
    """
    Enhanced video combination using FFmpeg modules.
    Supports transitions, subtitles, BGM with PARTIAL SUCCESS handling.

    If subtitle or BGM fails, video combining still continues.
    User can retry failed enhancements later.
    """
    import platform
    import traceback

    work_dir = Path(tempfile.gettempdir()) / f"sparkfluence_v2_{job_id}"
    work_dir.mkdir(parents=True, exist_ok=True)

    # Track results for each step
    results = {
        "combine": {"success": False, "error": None},
        "subtitle": {"success": False, "error": None, "skipped": not options.enable_subtitles},
        "bgm": {"success": False, "error": None, "skipped": not options.enable_bgm}
    }

    try:
        # Progress callback
        def progress_callback(progress: int, step: str):
            update_job_status(job_id, progress, step)

        # Convert segments to VideoSegmentInput (with per-segment transition types)
        segment_inputs = []
        for seg in segments:
            # Resolve transition type from string to enum
            trans_type = None
            if seg.transition_type:
                try:
                    trans_type = TransitionType(seg.transition_type)
                except ValueError:
                    logger.warning(f"Unknown transition type '{seg.transition_type}', using auto-select")

            segment_inputs.append(VideoSegmentInput(
                video_url=seg.video_url,
                segment_type=seg.segment_type,
                segment_number=seg.segment_number,
                duration_seconds=seg.duration_seconds,
                script_text=seg.script_text,
                emotion=seg.emotion,
                transition_type=trans_type,
                transition_duration=seg.transition_duration
            ))

        # Use per-segment transition duration if provided (take max from segments)
        effective_transition_duration = options.transition_duration
        seg_durations = [s.transition_duration for s in segments if s.transition_duration]
        if seg_durations:
            effective_transition_duration = max(seg_durations)

        # Build config (subtitles handled separately for partial success)
        has_per_segment_transitions = any(s.transition_type for s in segments)
        config = CombineConfig(
            enable_transitions=options.enable_transitions,
            transition_duration=effective_transition_duration,
            auto_select_transitions=options.auto_select_transitions and not has_per_segment_transitions,
            enable_subtitles=False,  # We handle subtitles separately
            subtitle_style=options.subtitle_style,
            word_by_word=options.word_by_word
        )

        # Create output path
        output_dir = Path(tempfile.gettempdir()) / "sparkfluence_outputs"
        output_dir.mkdir(parents=True, exist_ok=True)
        combined_path = output_dir / f"{project_id}_{session_id}_{uuid.uuid4().hex[:8]}.mp4"

        # =================================================================
        # Step 1: Combine video segments (REQUIRED - fails entire job)
        # =================================================================
        combiner = VideoCombiner()
        result = await combiner.combine(
            segments=segment_inputs,
            output_path=combined_path,
            config=config,
            whisper_data=whisper_data,
            progress_callback=progress_callback
        )

        if not result.success:
            raise Exception(result.error_message or "Combination failed")

        results["combine"]["success"] = True
        current_video = result.output_path
        logger.info(f"[V2] Video segments combined: {current_video}")

        # =================================================================
        # Step 1b: Burn text overlays (if any segments have text_overlays)
        # =================================================================
        has_text_overlays = any(seg.text_overlays for seg in segments)
        if has_text_overlays:
            try:
                update_job_status(job_id, 45, "Burning text overlays")
                text_overlay_video = work_dir / "with_text.mp4"

                # Calculate cumulative segment start times (accounting for transitions)
                seg_start_times: list[float] = []
                cumulative = 0.0
                for i, seg in enumerate(segments):
                    seg_start_times.append(cumulative)
                    trans_dur = seg.transition_duration or options.transition_duration
                    seg_dur = seg.duration_seconds
                    if i < len(segments) - 1 and options.enable_transitions:
                        cumulative += seg_dur - trans_dur
                    else:
                        cumulative += seg_dur

                # Build FFmpeg drawtext filter chain
                drawtext_filters = []
                for i, seg in enumerate(segments):
                    if not seg.text_overlays:
                        continue
                    seg_start = seg_start_times[i]
                    for overlay in seg.text_overlays:
                        # Convert hex color to FFmpeg format (0xRRGGBB with alpha)
                        color = overlay.font_color.lstrip('#')
                        alpha_hex = hex(int(overlay.opacity * 255))[2:].zfill(2)
                        ff_color = f"0x{color}{alpha_hex}"

                        # Calculate absolute start/end times
                        abs_start = seg_start + overlay.start_time
                        abs_end = seg_start + (overlay.end_time if overlay.end_time > 0 else seg.duration_seconds)

                        # Escape text for FFmpeg (single quotes, colons, backslashes)
                        escaped_text = overlay.content.replace("\\", "\\\\").replace("'", "'\\''").replace(":", "\\:")

                        # Determine x position from alignment
                        if overlay.alignment == 'center':
                            x_expr = f"(w-text_w)/2"
                        elif overlay.alignment == 'right':
                            x_expr = f"w-text_w-{overlay.x}"
                        else:
                            x_expr = str(overlay.x)

                        # Build drawtext filter with optional animation
                        fade_dur = 0.3  # seconds for enter/exit fade
                        has_enter_anim = overlay.enter_animation and overlay.enter_animation != 'none'
                        has_exit_anim = overlay.exit_animation and overlay.exit_animation != 'none'

                        # Build alpha expression for fade in/out animations
                        if has_enter_anim or has_exit_anim:
                            alpha_parts = []
                            if has_enter_anim:
                                # Fade in: alpha ramps 0→1 over fade_dur from abs_start
                                alpha_parts.append(f"if(lt(t-{abs_start:.3f},{fade_dur}),(t-{abs_start:.3f})/{fade_dur},1)")
                            if has_exit_anim:
                                fade_out_start = abs_end - fade_dur
                                # Fade out: alpha ramps 1→0 over fade_dur before abs_end
                                alpha_parts.append(f"if(gt(t,{fade_out_start:.3f}),({abs_end:.3f}-t)/{fade_dur},1)")
                            # Multiply all alpha parts together (enter * exit * base opacity)
                            if len(alpha_parts) == 2:
                                alpha_expr = f"'({alpha_parts[0]})*({alpha_parts[1]})'"
                            else:
                                alpha_expr = f"'{alpha_parts[0]}'"
                        else:
                            alpha_expr = None

                        dt = (
                            f"drawtext=text='{escaped_text}'"
                            f":fontsize={overlay.font_size}"
                            f":fontcolor={ff_color}"
                            f":x={x_expr}"
                            f":y={overlay.y}"
                            f":enable='between(t,{abs_start:.3f},{abs_end:.3f})'"
                        )

                        if alpha_expr:
                            dt += f":alpha={alpha_expr}"

                        # Add font if not default
                        if overlay.font_family and overlay.font_family != 'Arial':
                            dt += f":fontfile=/usr/share/fonts/truetype/{overlay.font_family.lower()}.ttf"

                        # Add stroke (border) if present
                        if overlay.stroke_color and overlay.stroke_width > 0:
                            stroke_color = overlay.stroke_color.lstrip('#')
                            dt += f":borderw={overlay.stroke_width}:bordercolor=0x{stroke_color}"

                        drawtext_filters.append(dt)

                if drawtext_filters:
                    vf = ",".join(drawtext_filters)
                    cmd = [
                        'ffmpeg', '-y',
                        '-i', str(current_video),
                        '-vf', vf,
                        '-c:a', 'copy',
                        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                        str(text_overlay_video)
                    ]

                    proc = await asyncio.create_subprocess_exec(
                        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                    )
                    stdout, stderr = await proc.communicate()

                    if proc.returncode != 0:
                        raise Exception(f"FFmpeg drawtext failed: {stderr.decode()[:500]}")

                    current_video = text_overlay_video
                    logger.info(f"[V2] Text overlays burned: {len(drawtext_filters)} overlays")

            except Exception as e:
                logger.error(f"[V2] Text overlay burn failed (continuing without): {e}")
                # Non-fatal — continue with video without text overlays

        # =================================================================
        # Step 1c: Composite media overlays (images/videos from overlay tracks)
        # =================================================================
        if media_overlays and len(media_overlays) > 0:
            try:
                update_job_status(job_id, 48, "Compositing media overlays")
                media_overlay_video = work_dir / "with_media_overlays.mp4"

                # Download all overlay media files
                overlay_inputs = []
                async with httpx.AsyncClient(timeout=60.0) as client:
                    for idx, mo in enumerate(media_overlays):
                        ext = '.mp4' if mo.type == 'video' else '.png'
                        dl_path = work_dir / f"overlay_{idx}{ext}"
                        try:
                            resp = await client.get(mo.src)
                            resp.raise_for_status()
                            with open(dl_path, 'wb') as f:
                                f.write(resp.content)
                            overlay_inputs.append((idx, mo, dl_path))
                            logger.info(f"[V2] Downloaded overlay {idx}: {dl_path.name} ({dl_path.stat().st_size / 1024:.1f} KB)")
                        except Exception as dl_err:
                            logger.warning(f"[V2] Failed to download overlay {idx} ({mo.src[:80]}): {dl_err}")

                if overlay_inputs:
                    # Build FFmpeg filter_complex for all overlays
                    # Input 0 = base video, Input 1..N = overlay media
                    input_args = ['-i', str(current_video)]
                    for _, _, dl_path in overlay_inputs:
                        input_args.extend(['-i', str(dl_path)])

                    # Chain overlay filters: base → overlay_0 → overlay_1 → ...
                    filter_parts = []
                    prev_label = "0:v"
                    for i, (idx, mo, dl_path) in enumerate(overlay_inputs):
                        input_idx = i + 1  # 0 is base video
                        out_label = f"ov{i}"

                        # Scale overlay to target size
                        scale_label = f"s{i}"
                        filter_parts.append(
                            f"[{input_idx}:v]scale={mo.width}:{mo.height}:force_original_aspect_ratio=decrease,"
                            f"pad={mo.width}:{mo.height}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,"
                            f"format=rgba,colorchannelmixer=aa={mo.opacity:.2f}[{scale_label}]"
                        )

                        # Overlay with timing (enable between start_time and end_time)
                        filter_parts.append(
                            f"[{prev_label}][{scale_label}]overlay=x={mo.x}:y={mo.y}"
                            f":enable='between(t,{mo.start_time:.3f},{mo.end_time:.3f})'"
                            f":format=auto[{out_label}]"
                        )
                        prev_label = out_label

                    filter_complex = ";".join(filter_parts)

                    cmd = [
                        'ffmpeg', '-y',
                        *input_args,
                        '-filter_complex', filter_complex,
                        '-map', f'[{prev_label}]',
                        '-map', '0:a?',
                        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                        '-c:a', 'copy',
                        str(media_overlay_video)
                    ]

                    proc = await asyncio.create_subprocess_exec(
                        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                    )
                    stdout, stderr = await proc.communicate()

                    if proc.returncode != 0:
                        raise Exception(f"FFmpeg overlay compositing failed: {stderr.decode()[:500]}")

                    current_video = media_overlay_video
                    logger.info(f"[V2] Media overlays composited: {len(overlay_inputs)} overlays")

            except Exception as e:
                logger.error(f"[V2] Media overlay compositing failed (continuing without): {e}")
                # Non-fatal — continue with video without media overlays

        # =================================================================
        # Step 2: Parallel preparation - Transcription + BGM Download
        # =================================================================
        ass_file = None
        music_file = None
        word_count = 0

        async def prepare_subtitles():
            """Transcribe and generate ASS file."""
            nonlocal ass_file, word_count

            try:
                update_job_status(job_id, 55, "Extracting audio for transcription")

                # Extract audio
                audio_file = work_dir / "audio.mp3"
                cmd = [
                    'ffmpeg', '-y', '-i', str(current_video),
                    '-vn', '-acodec', 'libmp3lame', '-q:a', '2',
                    str(audio_file)
                ]
                proc = await asyncio.create_subprocess_exec(
                    *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                )
                await proc.communicate()

                if proc.returncode != 0:
                    raise Exception("Audio extraction failed")

                update_job_status(job_id, 60, "Transcribing with Whisper")

                # Transcribe with Groq Whisper (pool-based key rotation)
                pool = get_pool()
                whisper_result = await pool.transcribe_with_groq(Path(audio_file))

                update_job_status(job_id, 65, "Generating subtitle file")

                # Generate ASS
                from ffmpeg.subtitles import SubtitleGenerator, get_preset_style, SubtitleSegment, WordTimestamp

                style = get_preset_style(options.subtitle_style)
                generator = SubtitleGenerator(style)

                sub_segments = []
                root_words = whisper_result.get("words") or []

                if root_words:
                    for i in range(0, len(root_words), 3):
                        group = root_words[i:i+3]
                        words = [
                            WordTimestamp(word=w.get("word", "").strip(), start=w.get("start", 0), end=w.get("end", 0))
                            for w in group if w.get("word", "").strip()
                        ]
                        if words:
                            sub_segments.append(SubtitleSegment(
                                segment_id=str(len(sub_segments)),
                                text=" ".join(x.word for x in words),
                                start=words[0].start,
                                end=words[-1].end,
                                words=words
                            ))
                    word_count = len(root_words)
                else:
                    for seg in (whisper_result.get('segments') or []):
                        words = [
                            WordTimestamp(word=w.get('word', '').strip(), start=w.get('start', 0), end=w.get('end', 0))
                            for w in (seg.get('words') or []) if w.get('word', '').strip()
                        ]
                        if words:
                            sub_segments.append(SubtitleSegment(
                                segment_id=str(seg.get('id', len(sub_segments))),
                                text=seg.get('text', '').strip(),
                                start=seg.get('start', 0),
                                end=seg.get('end', 0),
                                words=words
                            ))
                    word_count = sum(len(seg.get('words') or []) for seg in (whisper_result.get('segments') or []))

                ass_file = work_dir / "subtitles.ass"
                generator.save_ass(sub_segments, ass_file, word_by_word=True)
                results["subtitle"]["success"] = True
                logger.info(f"[V2] Subtitle prepared: {word_count} words")

            except Exception as e:
                results["subtitle"]["error"] = str(e)
                logger.error(f"[V2] Subtitle preparation failed: {e}")

        async def prepare_bgm():
            """Download BGM file."""
            nonlocal music_file

            try:
                if not options.music_url:
                    raise Exception("music_url is required for BGM")

                update_job_status(job_id, 55, "Downloading background music")
                music_file = work_dir / "bgm.mp3"

                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.get(options.music_url)
                    response.raise_for_status()
                    with open(music_file, 'wb') as f:
                        f.write(response.content)

                results["bgm"]["success"] = True
                logger.info(f"[V2] BGM downloaded: {music_file.stat().st_size / 1024:.1f} KB")

            except Exception as e:
                results["bgm"]["error"] = str(e)
                logger.error(f"[V2] BGM download failed: {e}")

        # Run preparation tasks in parallel
        tasks = []
        if options.enable_subtitles:
            tasks.append(prepare_subtitles())
        if options.enable_bgm:
            tasks.append(prepare_bgm())

        if tasks:
            await asyncio.gather(*tasks)

        # =================================================================
        # Step 3: Apply enhancements (only if preparation succeeded)
        # =================================================================
        final_video = current_video

        # Apply subtitle if ready
        if options.enable_subtitles and results["subtitle"]["success"] and ass_file:
            try:
                update_job_status(job_id, 70, "Burning subtitles")
                subtitled_video = work_dir / "with_subtitles.mp4"

                if platform.system() == 'Windows':
                    vf = f"subtitles={ass_file.name}"
                else:
                    vf = f"ass={ass_file.name}"

                cmd = [
                    'ffmpeg', '-y',
                    '-i', str(final_video),
                    '-vf', vf,
                    '-c:a', 'copy',
                    str(subtitled_video)
                ]

                proc = await asyncio.create_subprocess_exec(
                    *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                    cwd=str(work_dir)
                )
                stdout, stderr = await proc.communicate()

                if proc.returncode != 0:
                    raise Exception(f"FFmpeg subtitle burn failed: {stderr.decode()[:500]}")

                final_video = subtitled_video
                logger.info(f"[V2] Subtitles burned successfully")

            except Exception as e:
                results["subtitle"]["success"] = False
                results["subtitle"]["error"] = str(e)
                logger.error(f"[V2] Subtitle burn failed: {e}")

        # Apply BGM if ready
        if options.enable_bgm and results["bgm"]["success"] and music_file:
            try:
                update_job_status(job_id, 80, "Mixing background music")
                with_bgm_video = work_dir / "with_bgm.mp4"

                if options.duck_during_speech:
                    filter_complex = (
                        f"[1:a]volume={options.bgm_volume}[bgm];"
                        f"[bgm][0:a]sidechaincompress=threshold=0.02:ratio=4:attack=50:release=500[ducked_bgm];"
                        f"[0:a][ducked_bgm]amix=inputs=2:duration=first:normalize=0"
                    )
                else:
                    filter_complex = (
                        f"[1:a]volume={options.bgm_volume}[bgm];"
                        f"[0:a][bgm]amix=inputs=2:duration=first:normalize=0"
                    )

                cmd = [
                    'ffmpeg', '-y',
                    '-i', str(final_video),
                    '-i', str(music_file),
                    '-filter_complex', filter_complex,
                    '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '192k',
                    '-movflags', '+faststart',
                    str(with_bgm_video)
                ]

                bgm_result = subprocess.run(cmd, capture_output=True, text=True)

                if bgm_result.returncode != 0:
                    raise Exception(f"FFmpeg BGM mixing failed: {bgm_result.stderr[:500]}")

                final_video = with_bgm_video
                logger.info(f"[V2] BGM mixed successfully")

            except Exception as e:
                results["bgm"]["success"] = False
                results["bgm"]["error"] = str(e)
                logger.error(f"[V2] BGM mixing failed: {e}")

        # =================================================================
        # Step 4: Upload to storage
        # =================================================================
        update_job_status(job_id, 90, "Uploading final video")
        final_url = await upload_to_storage(final_video, project_id)

        # Update planned_content.final_video_url in database
        try:
            update_job_status(job_id, 95, "Updating database")
            planned_records = await supabase.select_jsonb_contains(
                'planned_content', 'video_data', 'sessionId', session_id
            )
            if planned_records and len(planned_records) > 0:
                planned_id = planned_records[0].get('id')
                if planned_id:
                    await supabase.update(
                        'planned_content',
                        {'id': planned_id},
                        {'final_video_url': final_url}
                    )
                    logger.info(f"Updated planned_content {planned_id} with final_video_url")
            else:
                logger.warning(f"No planned_content found for session_id: {session_id}")
        except Exception as db_err:
            logger.error(f"Failed to update planned_content: {db_err}")

        # =================================================================
        # Step 5: Return results with partial success info
        # =================================================================
        # Determine overall status
        has_failures = (
            (options.enable_subtitles and not results["subtitle"]["success"]) or
            (options.enable_bgm and not results["bgm"]["success"])
        )

        jobs[job_id].update({
            "status": "completed" if not has_failures else "partial",
            "progress_percentage": 100,
            "current_step": "Complete" if not has_failures else "Completed with warnings",
            "final_video_url": final_url,
            "metadata": {
                "duration_seconds": result.duration_seconds,
                "file_size_mb": result.file_size_mb,
                "resolution": result.resolution,
                "segments_count": len(segments),
                "results": results,  # Detailed success/failure for each step
                "word_count": word_count if results["subtitle"]["success"] else 0,
                **result.metadata
            }
        })

        # Cleanup
        combiner.cleanup()
        cleanup_directory(work_dir)
        if result.output_path and result.output_path.exists():
            result.output_path.unlink(missing_ok=True)

        logger.info(f"Job {job_id} completed (partial={has_failures})")

    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        jobs[job_id].update({
            "status": "failed",
            "current_step": jobs[job_id].get("current_step", "Processing"),
            "error_message": str(e),
            "metadata": {"results": results}
        })
        cleanup_directory(work_dir)


# ==================== Helper Functions ====================

def update_job_status(job_id: str, progress: int, step: str):
    if job_id in jobs:
        jobs[job_id]["progress_percentage"] = progress
        jobs[job_id]["current_step"] = step
        logger.info(f"Job {job_id}: {progress}% - {step}")


async def download_segments(segments: List[VideoSegment], work_dir: Path) -> List[Path]:
    segment_files = []

    async with httpx.AsyncClient(timeout=120.0) as client:
        for i, segment in enumerate(segments):
            segment_path = work_dir / f"segment_{i}.mp4"

            try:
                logger.info(f"Downloading segment {i}: {segment.video_url[:100]}...")
                response = await client.get(segment.video_url)
                response.raise_for_status()

                with open(segment_path, 'wb') as f:
                    f.write(response.content)

                segment_files.append(segment_path)
                logger.info(f"Downloaded segment {i}: {segment.type} ({len(response.content)} bytes)")

            except Exception as e:
                raise Exception(f"Failed to download segment {i} ({segment.type}): {str(e)}")

    return segment_files


def create_concat_file(segment_files: List[Path], work_dir: Path) -> Path:
    concat_file = work_dir / "concat.txt"

    with open(concat_file, 'w') as f:
        for segment_file in segment_files:
            f.write(f"file '{segment_file.absolute()}'\n")

    return concat_file


def concatenate_videos(concat_file: Path, work_dir: Path) -> Path:
    output_file = work_dir / "final_video.mp4"

    cmd = [
        'ffmpeg', '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', str(concat_file),
        '-c', 'copy',
        str(output_file)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"FFmpeg concat failed: {result.stderr}")

    logger.info("Video concatenation successful")
    return output_file


async def add_background_music(
    video_file: Path,
    bgm_url: str,
    volume: float,
    work_dir: Path,
    duck_during_speech: bool = True
) -> Path:
    """
    Mix background music with video's native audio (VEO 3.1).

    Args:
        video_file: Input video with native audio
        bgm_url: URL to background music
        volume: BGM base volume (0.0-1.0)
        work_dir: Working directory
        duck_during_speech: Lower BGM when speech detected (sidechaincompress)
    """
    bgm_file = work_dir / "bgm.mp3"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(bgm_url)
        response.raise_for_status()

        with open(bgm_file, 'wb') as f:
            f.write(response.content)

    output_file = work_dir / f"final_with_bgm_{uuid.uuid4().hex[:8]}.mp4"

    if duck_during_speech:
        # Audio ducking: BGM volume drops when native audio is loud (speech)
        # sidechaincompress: threshold=0.02 (sensitive), ratio=4 (moderate ducking)
        # attack=50ms (fast duck), release=500ms (smooth return)
        filter_complex = (
            f"[1:a]volume={volume}[bgm];"
            f"[bgm][0:a]sidechaincompress=threshold=0.02:ratio=4:attack=50:release=500[ducked_bgm];"
            f"[0:a][ducked_bgm]amix=inputs=2:duration=first:normalize=0"
        )
    else:
        # Simple mixing without ducking
        filter_complex = (
            f"[1:a]volume={volume}[bgm];"
            f"[0:a][bgm]amix=inputs=2:duration=first:normalize=0"
        )

    cmd = [
        'ffmpeg', '-y',
        '-i', str(video_file),
        '-i', str(bgm_file),
        '-filter_complex', filter_complex,
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        str(output_file)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"FFmpeg BGM mixing failed: {result.stderr}")

    logger.info(f"Background music added successfully (ducking={'enabled' if duck_during_speech else 'disabled'})")
    return output_file


async def upload_to_storage(video_file: Path, project_id: str) -> str:
    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')

    if not supabase_url or not supabase_key:
        logger.warning("Supabase not configured, using local storage fallback")
        video_id = f"{project_id}_{uuid.uuid4().hex[:8]}"
        
        persistent_dir = Path(tempfile.gettempdir()) / "sparkfluence_videos"
        persistent_dir.mkdir(parents=True, exist_ok=True)
        persistent_path = persistent_dir / f"{video_id}.mp4"
        
        shutil.copy(video_file, persistent_path)
        completed_videos[video_id] = str(persistent_path)
        logger.info(f"Video stored locally: {video_id} -> {persistent_path}")
        
        return f"http://localhost:8000/api/video/{video_id}"

    timestamp = int(asyncio.get_event_loop().time() * 1000)
    file_name = f"{project_id}_{timestamp}.mp4"
    
    logger.info(f"Uploading to Supabase Storage: final-videos/{file_name}")

    with open(video_file, 'rb') as f:
        video_data = f.read()

    async with httpx.AsyncClient(timeout=120.0) as client:
        upload_url = f"{supabase_url}/storage/v1/object/final-videos/{file_name}"
        
        response = await client.post(
            upload_url,
            headers={
                'Authorization': f'Bearer {supabase_key}',
                'Content-Type': 'video/mp4',
                'x-upsert': 'true'
            },
            content=video_data
        )

        if response.status_code not in [200, 201]:
            logger.error(f"Upload failed: {response.status_code} - {response.text}")
            raise Exception(f"Upload failed: {response.text}")

    public_url = f"{supabase_url}/storage/v1/object/public/final-videos/{file_name}"
    logger.info(f"Upload successful: {public_url}")
    
    return public_url


def get_video_metadata(video_file: Path) -> Dict[str, Any]:
    cmd = [
        'ffprobe',
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        str(video_file)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        return {
            "duration_seconds": 0,
            "file_size_mb": round(video_file.stat().st_size / (1024 * 1024), 2),
            "resolution": "unknown",
            "format": "mp4",
            "codec": "h264"
        }

    import json
    data = json.loads(result.stdout)

    duration = float(data.get('format', {}).get('duration', 0))
    file_size = round(video_file.stat().st_size / (1024 * 1024), 2)

    video_stream = next(
        (s for s in data.get('streams', []) if s['codec_type'] == 'video'),
        {}
    )

    width = video_stream.get('width', 0)
    height = video_stream.get('height', 0)
    codec = video_stream.get('codec_name', 'h264')

    return {
        "duration_seconds": round(duration, 2),
        "file_size_mb": file_size,
        "resolution": f"{width}x{height}",
        "format": "mp4",
        "codec": codec
    }


def cleanup_directory(directory: Path):
    try:
        shutil.rmtree(directory)
        logger.info(f"Cleaned up directory: {directory}")
    except Exception as e:
        logger.warning(f"Cleanup failed: {str(e)}")


def check_ffmpeg_available() -> bool:
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return True
    except Exception:
        return False


# ==================== Add Subtitles Endpoint ====================

class AddSubtitlesRequest(BaseModel):
    """Request to add subtitles to existing video."""
    video_url: str
    subtitle_style: str = "tiktok"  # tiktok, reels, shorts, viral, dramatic
    project_id: Optional[str] = None


class AddBGMRequest(BaseModel):
    """Request to add background music to existing video."""
    video_url: str
    music_url: str
    volume: float = 0.20  # BGM volume (0.0-1.0)
    duck_during_speech: bool = True  # Lower BGM when speech detected
    project_id: Optional[str] = None


@app.post("/api/add-subtitles")
async def add_subtitles(
    request: AddSubtitlesRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Header(..., alias="x-api-key")
):
    """
    Add subtitles to existing video using Groq Whisper transcription.
    
    Pipeline:
    1. Download video
    2. Extract audio
    3. Transcribe with Groq Whisper (word-level timestamps)
    4. Generate ASS subtitle file
    5. Burn subtitles into video
    6. Upload to storage
    """
    verify_api_key(api_key)
    
    # Groq key checked at transcription time via pool rotation
    job_id = f"sub_{uuid.uuid4().hex[:12]}"
    
    jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "progress_percentage": 0,
        "current_step": "Initializing",
        "final_video_url": None,
        "error_message": None
    }
    
    background_tasks.add_task(
        process_add_subtitles,
        job_id,
        request.video_url,
        request.subtitle_style,
        request.project_id
    )
    
    return {
        "success": True,
        "data": {
            "job_id": job_id,
            "status": "processing",
            "estimated_time_seconds": 60,
            "polling_endpoint": f"/api/job-status/{job_id}"
        }
    }


async def process_add_subtitles(
    job_id: str,
    video_url: str,
    style: str,
    project_id: Optional[str]
):
    """Background task: transcribe + generate + burn subtitles."""
    try:
        def progress_callback(percent: int, step: str):
            update_job_status(job_id, percent, step)
        
        processor = SubtitleProcessor()
        result = await processor.process(video_url, style, progress_callback)
        
        if not result.get("success"):
            raise Exception(result.get("error", "Subtitle processing failed"))
        
        # Upload to storage
        update_job_status(job_id, 90, "Uploading final video")
        final_url = await upload_to_storage(
            Path(result["video_path"]),
            project_id or "subtitled"
        )
        
        jobs[job_id].update({
            "status": "completed",
            "progress_percentage": 100,
            "current_step": "Complete",
            "final_video_url": final_url,
            "metadata": {
                "word_count": result.get("word_count", 0),
                "subtitle_style": style
            }
        })
        
        logger.info(f"Subtitle job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Subtitle job {job_id} failed: {e}")
        jobs[job_id].update({
            "status": "failed",
            "error_message": str(e)
        })


# ==================== Add BGM Endpoint ====================

@app.post("/api/add-bgm")
async def add_bgm(
    request: AddBGMRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Header(..., alias="x-api-key")
):
    """
    Add background music to existing video.

    Pipeline:
    1. Download video
    2. Download music from music_url
    3. Mix audio using FFmpeg (with optional ducking)
    4. Upload to storage
    """
    verify_api_key(api_key)

    # Validate volume
    if not (0.0 <= request.volume <= 1.0):
        raise HTTPException(status_code=400, detail="volume must be between 0.0 and 1.0")

    job_id = f"bgm_{uuid.uuid4().hex[:12]}"

    jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "progress_percentage": 0,
        "current_step": "Initializing",
        "final_video_url": None,
        "error_message": None
    }

    background_tasks.add_task(
        process_add_bgm,
        job_id,
        request.video_url,
        request.music_url,
        request.volume,
        request.duck_during_speech,
        request.project_id
    )

    return {
        "success": True,
        "data": {
            "job_id": job_id,
            "status": "processing",
            "estimated_time_seconds": 45,
            "polling_endpoint": f"/api/job-status/{job_id}"
        }
    }


async def process_add_bgm(
    job_id: str,
    video_url: str,
    music_url: str,
    volume: float,
    duck_during_speech: bool,
    project_id: Optional[str]
):
    """Background task: download video + music, mix audio, upload."""
    work_dir = Path(tempfile.gettempdir()) / f"sparkfluence_bgm_{job_id}"
    work_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Step 1: Download video
        update_job_status(job_id, 10, "Downloading video")
        video_file = work_dir / "input_video.mp4"

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(video_url)
            response.raise_for_status()
            with open(video_file, 'wb') as f:
                f.write(response.content)

        logger.info(f"Downloaded video: {len(response.content)} bytes")

        # Step 2: Download music
        update_job_status(job_id, 30, "Downloading music")
        music_file = work_dir / "bgm.mp3"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(music_url)
            response.raise_for_status()
            with open(music_file, 'wb') as f:
                f.write(response.content)

        logger.info(f"Downloaded music: {len(response.content)} bytes")

        # Step 3: Mix audio using FFmpeg
        update_job_status(job_id, 50, "Mixing background music")
        output_file = work_dir / f"video_with_bgm_{uuid.uuid4().hex[:8]}.mp4"

        if duck_during_speech:
            # Audio ducking: BGM volume drops when native audio is loud (speech)
            # sidechaincompress: threshold=0.02 (sensitive), ratio=4 (moderate ducking)
            filter_complex = (
                f"[1:a]volume={volume}[bgm];"
                f"[bgm][0:a]sidechaincompress=threshold=0.02:ratio=4:attack=50:release=500[ducked_bgm];"
                f"[0:a][ducked_bgm]amix=inputs=2:duration=first:normalize=0"
            )
        else:
            # Simple mixing without ducking
            filter_complex = (
                f"[1:a]volume={volume}[bgm];"
                f"[0:a][bgm]amix=inputs=2:duration=first:normalize=0"
            )

        cmd = [
            'ffmpeg', '-y',
            '-i', str(video_file),
            '-i', str(music_file),
            '-filter_complex', filter_complex,
            '-c:v', 'copy',
            '-c:a', 'aac', '-b:a', '192k',
            '-movflags', '+faststart',
            str(output_file)
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise Exception(f"FFmpeg BGM mixing failed: {result.stderr}")

        logger.info(f"BGM mixing successful (ducking={'enabled' if duck_during_speech else 'disabled'})")

        # Step 4: Upload to storage
        update_job_status(job_id, 80, "Uploading final video")
        final_url = await upload_to_storage(
            output_file,
            project_id or "bgm"
        )

        # Get metadata
        metadata = get_video_metadata(output_file)
        metadata["bgm_volume"] = volume
        metadata["duck_during_speech"] = duck_during_speech

        jobs[job_id].update({
            "status": "completed",
            "progress_percentage": 100,
            "current_step": "Complete",
            "final_video_url": final_url,
            "metadata": metadata
        })

        logger.info(f"BGM job {job_id} completed successfully")

        # Cleanup
        cleanup_directory(work_dir)

    except Exception as e:
        logger.error(f"BGM job {job_id} failed: {e}")
        jobs[job_id].update({
            "status": "failed",
            "error_message": str(e)
        })
        cleanup_directory(work_dir)


# ==================== Post-Process Endpoint (Subtitle + BGM Combined) ====================

class PostProcessRequest(BaseModel):
    """Request for combined subtitle + BGM processing."""
    video_url: str
    add_subtitles: bool = True
    add_bgm: bool = True
    subtitle_style: str = "tiktok"
    music_url: Optional[str] = None  # Required if add_bgm=True
    bgm_volume: float = 0.20
    duck_during_speech: bool = True
    project_id: Optional[str] = None


@app.post("/api/post-process")
async def post_process(
    request: PostProcessRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Header(..., alias="x-api-key")
):
    """
    Combined subtitle + BGM processing in one efficient pipeline.

    Pipeline:
    1. Download video once
    2. If add_subtitles: Extract audio → Transcribe → Generate ASS
    3. If add_bgm: Download music (parallel with transcription)
    4. Single FFmpeg pass: burn subtitles + mix BGM
    5. Upload to storage

    This is more efficient than calling /add-subtitles then /add-bgm separately.
    """
    verify_api_key(api_key)

    # Validate inputs
    if not request.add_subtitles and not request.add_bgm:
        raise HTTPException(status_code=400, detail="At least one of add_subtitles or add_bgm must be true")

    if request.add_bgm and not request.music_url:
        raise HTTPException(status_code=400, detail="music_url is required when add_bgm is true")

    # Groq key checked at transcription time via pool rotation

    if not (0.0 <= request.bgm_volume <= 1.0):
        raise HTTPException(status_code=400, detail="bgm_volume must be between 0.0 and 1.0")

    job_id = f"pp_{uuid.uuid4().hex[:12]}"

    jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "progress_percentage": 0,
        "current_step": "Initializing",
        "final_video_url": None,
        "error_message": None,
        "options": {
            "add_subtitles": request.add_subtitles,
            "add_bgm": request.add_bgm
        }
    }

    background_tasks.add_task(
        process_post_process,
        job_id,
        request
    )

    # Estimate time based on options
    estimated_time = 30  # base
    if request.add_subtitles:
        estimated_time += 45
    if request.add_bgm:
        estimated_time += 15

    return {
        "success": True,
        "data": {
            "job_id": job_id,
            "status": "processing",
            "estimated_time_seconds": estimated_time,
            "polling_endpoint": f"/api/job-status/{job_id}",
            "options": {
                "add_subtitles": request.add_subtitles,
                "add_bgm": request.add_bgm
            }
        }
    }


async def process_post_process(job_id: str, request: PostProcessRequest):
    """
    Background task: Combined subtitle + BGM processing.

    Optimized pipeline:
    - Downloads video once
    - Runs transcription and BGM download in parallel
    - Single FFmpeg pass for both operations when possible
    """
    work_dir = Path(tempfile.gettempdir()) / f"sparkfluence_pp_{job_id}"
    work_dir.mkdir(parents=True, exist_ok=True)

    try:
        # =====================================================================
        # Step 1: Download video (10%)
        # =====================================================================
        update_job_status(job_id, 5, "Downloading video")
        video_file = work_dir / "input.mp4"

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.get(request.video_url)
            response.raise_for_status()
            with open(video_file, 'wb') as f:
                f.write(response.content)

        logger.info(f"[PostProcess] Downloaded video: {video_file.stat().st_size / 1024 / 1024:.1f} MB")
        update_job_status(job_id, 10, "Video downloaded")

        # =====================================================================
        # Step 2: Parallel processing - Transcription + BGM Download (10-50%)
        # =====================================================================
        ass_file = None
        music_file = None
        word_count = 0

        async def do_transcription():
            """Extract audio, transcribe, generate ASS."""
            nonlocal ass_file, word_count

            update_job_status(job_id, 15, "Extracting audio")
            audio_file = work_dir / "audio.mp3"

            # Extract audio
            cmd = [
                'ffmpeg', '-y', '-i', str(video_file),
                '-vn', '-acodec', 'libmp3lame', '-q:a', '2',
                str(audio_file)
            ]
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()

            if proc.returncode != 0:
                raise Exception("Audio extraction failed")

            update_job_status(job_id, 25, "Transcribing audio")

            # Transcribe with Groq Whisper (pool-based key rotation)
            pool = get_pool()
            whisper_data = await pool.transcribe_with_groq(Path(audio_file))

            update_job_status(job_id, 40, "Generating subtitles")

            # Generate ASS file
            from ffmpeg.subtitles import SubtitleGenerator, get_preset_style, SubtitleSegment, WordTimestamp

            style = get_preset_style(request.subtitle_style)
            generator = SubtitleGenerator(style)

            # Parse whisper response
            segments = []
            root_words = whisper_data.get("words") or []

            if root_words:
                for i in range(0, len(root_words), 3):
                    group = root_words[i:i+3]
                    words = [
                        WordTimestamp(word=w.get("word", "").strip(), start=w.get("start", 0), end=w.get("end", 0))
                        for w in group if w.get("word", "").strip()
                    ]
                    if words:
                        segments.append(SubtitleSegment(
                            segment_id=str(len(segments)),
                            text=" ".join(x.word for x in words),
                            start=words[0].start,
                            end=words[-1].end,
                            words=words
                        ))
                word_count = len(root_words)
            else:
                for seg in (whisper_data.get('segments') or []):
                    words = [
                        WordTimestamp(word=w.get('word', '').strip(), start=w.get('start', 0), end=w.get('end', 0))
                        for w in (seg.get('words') or []) if w.get('word', '').strip()
                    ]
                    if words:
                        segments.append(SubtitleSegment(
                            segment_id=str(seg.get('id', len(segments))),
                            text=seg.get('text', '').strip(),
                            start=seg.get('start', 0),
                            end=seg.get('end', 0),
                            words=words
                        ))
                word_count = sum(len(seg.get('words') or []) for seg in (whisper_data.get('segments') or []))

            ass_file = work_dir / "subtitles.ass"
            generator.save_ass(segments, ass_file, word_by_word=True)
            logger.info(f"[PostProcess] Generated ASS with {word_count} words")

        async def do_download_bgm():
            """Download BGM file."""
            nonlocal music_file

            update_job_status(job_id, 20, "Downloading music")
            music_file = work_dir / "bgm.mp3"

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(request.music_url)
                response.raise_for_status()
                with open(music_file, 'wb') as f:
                    f.write(response.content)

            logger.info(f"[PostProcess] Downloaded BGM: {music_file.stat().st_size / 1024:.1f} KB")

        # Run tasks in parallel based on options
        tasks = []
        if request.add_subtitles:
            tasks.append(do_transcription())
        if request.add_bgm:
            tasks.append(do_download_bgm())

        if tasks:
            await asyncio.gather(*tasks)

        update_job_status(job_id, 50, "Processing complete, preparing FFmpeg")

        # =====================================================================
        # Step 3: FFmpeg - Burn subtitles + Mix BGM (50-90%)
        # =====================================================================
        import platform

        output_file = work_dir / f"final_{uuid.uuid4().hex[:8]}.mp4"
        update_job_status(job_id, 55, "Combining video with effects")

        if request.add_subtitles and request.add_bgm:
            # Both subtitle + BGM: need 2-pass (subtitle first, then BGM)
            # Because subtitle filter changes video stream, can't use -c:v copy with BGM

            # Pass 1: Burn subtitles
            temp_with_subs = work_dir / "temp_with_subs.mp4"

            if platform.system() == 'Windows':
                vf = f"subtitles={ass_file.name}"
            else:
                vf = f"ass={ass_file.name}"

            cmd1 = [
                'ffmpeg', '-y',
                '-i', str(video_file),
                '-vf', vf,
                '-c:a', 'copy',
                str(temp_with_subs)
            ]

            logger.info(f"[PostProcess] Pass 1: Burning subtitles")
            proc = await asyncio.create_subprocess_exec(
                *cmd1, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                cwd=str(work_dir)
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                logger.error(f"Subtitle burn failed: {stderr.decode()}")
                raise Exception("Subtitle burn failed")

            update_job_status(job_id, 70, "Adding background music")

            # Pass 2: Add BGM
            if request.duck_during_speech:
                filter_complex = (
                    f"[1:a]volume={request.bgm_volume}[bgm];"
                    f"[bgm][0:a]sidechaincompress=threshold=0.02:ratio=4:attack=50:release=500[ducked_bgm];"
                    f"[0:a][ducked_bgm]amix=inputs=2:duration=first:normalize=0"
                )
            else:
                filter_complex = (
                    f"[1:a]volume={request.bgm_volume}[bgm];"
                    f"[0:a][bgm]amix=inputs=2:duration=first:normalize=0"
                )

            cmd2 = [
                'ffmpeg', '-y',
                '-i', str(temp_with_subs),
                '-i', str(music_file),
                '-filter_complex', filter_complex,
                '-c:v', 'copy',
                '-c:a', 'aac', '-b:a', '192k',
                '-movflags', '+faststart',
                str(output_file)
            ]

            logger.info(f"[PostProcess] Pass 2: Mixing BGM")
            result = subprocess.run(cmd2, capture_output=True, text=True)

            if result.returncode != 0:
                raise Exception(f"BGM mixing failed: {result.stderr}")

        elif request.add_subtitles:
            # Subtitle only
            if platform.system() == 'Windows':
                vf = f"subtitles={ass_file.name}"
            else:
                vf = f"ass={ass_file.name}"

            cmd = [
                'ffmpeg', '-y',
                '-i', str(video_file),
                '-vf', vf,
                '-c:a', 'copy',
                str(output_file)
            ]

            logger.info(f"[PostProcess] Burning subtitles only")
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                cwd=str(work_dir)
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                logger.error(f"Subtitle burn failed: {stderr.decode()}")
                raise Exception("Subtitle burn failed")

        elif request.add_bgm:
            # BGM only
            if request.duck_during_speech:
                filter_complex = (
                    f"[1:a]volume={request.bgm_volume}[bgm];"
                    f"[bgm][0:a]sidechaincompress=threshold=0.02:ratio=4:attack=50:release=500[ducked_bgm];"
                    f"[0:a][ducked_bgm]amix=inputs=2:duration=first:normalize=0"
                )
            else:
                filter_complex = (
                    f"[1:a]volume={request.bgm_volume}[bgm];"
                    f"[0:a][bgm]amix=inputs=2:duration=first:normalize=0"
                )

            cmd = [
                'ffmpeg', '-y',
                '-i', str(video_file),
                '-i', str(music_file),
                '-filter_complex', filter_complex,
                '-c:v', 'copy',
                '-c:a', 'aac', '-b:a', '192k',
                '-movflags', '+faststart',
                str(output_file)
            ]

            logger.info(f"[PostProcess] Mixing BGM only")
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                raise Exception(f"BGM mixing failed: {result.stderr}")

        update_job_status(job_id, 85, "FFmpeg processing complete")

        # =====================================================================
        # Step 4: Upload to storage (90-100%)
        # =====================================================================
        update_job_status(job_id, 90, "Uploading final video")
        final_url = await upload_to_storage(output_file, request.project_id or "postprocess")

        # Get metadata
        metadata = get_video_metadata(output_file)
        metadata["add_subtitles"] = request.add_subtitles
        metadata["add_bgm"] = request.add_bgm
        if request.add_subtitles:
            metadata["subtitle_style"] = request.subtitle_style
            metadata["word_count"] = word_count
        if request.add_bgm:
            metadata["bgm_volume"] = request.bgm_volume
            metadata["duck_during_speech"] = request.duck_during_speech

        jobs[job_id].update({
            "status": "completed",
            "progress_percentage": 100,
            "current_step": "Complete",
            "final_video_url": final_url,
            "metadata": metadata
        })

        logger.info(f"[PostProcess] Job {job_id} completed successfully")

        # Cleanup
        cleanup_directory(work_dir)

    except Exception as e:
        logger.error(f"[PostProcess] Job {job_id} failed: {e}")
        import traceback
        logger.error(f"[PostProcess] Traceback: {traceback.format_exc()}")
        jobs[job_id].update({
            "status": "failed",
            "error_message": str(e)
        })
        cleanup_directory(work_dir)


# ==================== Instagram Media Scraper ====================

import re
import json
import random

_IG_BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Cache-Control": "max-age=0",
}


async def _scrape_via_playwright(shortcode: str) -> list[dict] | None:
    """
    Primary method: Playwright headless Chromium renders the full Instagram page.
    Extracts carousel images from the main post article ONLY — ignores recommended posts.

    Strategy:
    1. Navigate carousel arrows to load all slides
    2. Extract <img> src from the main article container only
    3. Filter to high-res CDN images (not thumbnails/profile pics)
    """
    try:
        from playwright.async_api import async_playwright  # type: ignore
    except ImportError:
        logger.warning("[IG Scraper] playwright not installed — run: pip install playwright && playwright install chromium")
        return None

    url = f"https://www.instagram.com/p/{shortcode}/"
    POST_IMAGE_PATHS = ("t51.82787-15", "t51.29350-15", "t51.2885-15")

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            ctx = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 900},
                locale="en-US",
            )
            page = await ctx.new_page()

            await page.goto(url, timeout=30000, wait_until="networkidle")
            await page.wait_for_timeout(2000)

            # Click through carousel "Next" arrows to load all slides
            for _ in range(20):  # max 20 slides safety limit
                try:
                    next_btn = page.locator('button[aria-label="Next"]')
                    if await next_btn.count() > 0 and await next_btn.is_visible():
                        await next_btn.click()
                        await page.wait_for_timeout(800)
                    else:
                        break
                except Exception:
                    break

            # Extract images from the MAIN post article only (first <article> element)
            # This avoids grabbing recommended/related post images
            image_urls = await page.evaluate("""
                () => {
                    const article = document.querySelector('article');
                    if (!article) return [];

                    const imgs = article.querySelectorAll('img');
                    const cdnPaths = ['t51.82787-15', 't51.29350-15', 't51.2885-15'];
                    const seen = new Set();
                    const result = [];

                    for (const img of imgs) {
                        const src = img.src || '';
                        // Only high-res CDN post images (not profile pics, not UI icons)
                        if (cdnPaths.some(p => src.includes(p)) && img.naturalWidth > 300) {
                            const base = src.split('?')[0];
                            if (!seen.has(base)) {
                                seen.add(base);
                                result.push(src);
                            }
                        }
                    }
                    return result;
                }
            """)

            await browser.close()

        if image_urls:
            result = [{"url": u, "mediaType": "IMAGE"} for u in image_urls]
            logger.info(f"[IG Scraper] Playwright succeeded: {len(result)} images (from article only)")
            return result

        logger.warning(f"[IG Scraper] Playwright: page loaded but no post images found in article")
        return None

    except Exception as e:
        logger.warning(f"[IG Scraper] Playwright failed: {e}")
        return None


async def _scrape_instagram_post(shortcode: str) -> list[dict] | None:
    """
    Scrape Instagram post media URLs using Playwright headless browser.
    Playwright renders the full page like a real browser, bypassing bot detection.
    """
    urls = await _scrape_via_playwright(shortcode)
    if urls:
        return urls

    logger.warning(f"[IG Scraper] All methods failed for shortcode: {shortcode}")
    return None


@app.get("/api/instagram/media")
async def fetch_instagram_media(
    url: str,
    api_key: str = Header(..., alias="x-api-key"),
):
    """
    Scrape media URLs from a public Instagram post.

    Query params:
      url — full Instagram post URL (e.g. https://www.instagram.com/p/ABC123/)

    Returns:
      { success: true, data: { media_urls: [...], total_items: N } }
    """
    verify_api_key(api_key)

    # Extract shortcode from URL
    match = re.search(r'instagram\.com/(?:p|reel)/([A-Za-z0-9_-]+)', url)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid Instagram URL. Expected format: https://instagram.com/p/SHORTCODE/")

    shortcode = match.group(1)
    logger.info(f"[IG Scraper] Fetching media for shortcode: {shortcode}")

    media_urls = await _scrape_instagram_post(shortcode)

    if not media_urls:
        raise HTTPException(
            status_code=404,
            detail="Could not fetch media. Post may be private, deleted, or Instagram is blocking requests."
        )

    return {
        "success": True,
        "data": {
            "shortcode": shortcode,
            "media_urls": media_urls,
            "total_items": len(media_urls),
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
