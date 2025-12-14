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

# Load environment variables
load_dotenv()

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
    if os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_SERVICE_ROLE_KEY'):
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job storage (use Redis in production)
jobs: Dict[str, Dict[str, Any]] = {}

# Store completed video paths for serving
completed_videos: Dict[str, str] = {}

# Supabase client helper
class SupabaseHelper:
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
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

supabase = SupabaseHelper()


# Models
class VideoSegment(BaseModel):
    type: str
    video_url: str
    duration_seconds: float

class CombineOptions(BaseModel):
    bgm_url: Optional[str] = None
    bgm_volume: float = 0.15

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
        "version": "2.0.0",
        "features": ["video_combining", "background_jobs", "image_generation", "video_generation"]
    }


@app.get("/health")
async def health_check():
    supabase_configured = bool(os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
    worker_running = background_worker is not None and background_worker.running if background_worker else False
    
    return {
        "status": "healthy",
        "ffmpeg_available": check_ffmpeg_available(),
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

        # Step 4: Add BGM (optional)
        if options.bgm_url:
            update_job_status(job_id, 70, "Adding background music")
            final_video = await add_background_music(
                final_video,
                options.bgm_url,
                options.bgm_volume,
                work_dir
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
            "current_step": jobs[job_id]["current_step"],
            "error_message": str(e)
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
    work_dir: Path
) -> Path:
    bgm_file = work_dir / "bgm.mp3"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(bgm_url)
        response.raise_for_status()

        with open(bgm_file, 'wb') as f:
            f.write(response.content)

    output_file = work_dir / "final_with_bgm.mp4"

    cmd = [
        'ffmpeg', '-y',
        '-i', str(video_file),
        '-i', str(bgm_file),
        '-filter_complex', f'[1:a]volume={volume}[a1];[0:a][a1]amix=inputs=2:normalize=1',
        '-c:v', 'copy',
        '-shortest',
        str(output_file)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"FFmpeg BGM mixing failed: {result.stderr}")

    logger.info("Background music added successfully")
    return output_file


async def upload_to_storage(video_file: Path, project_id: str) -> str:
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
