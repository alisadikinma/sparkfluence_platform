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

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sparkfluence Video Backend", version="1.1.0")

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
    return {"message": "Sparkfluence Video Backend API", "version": "1.1.0"}

@app.get("/health")
async def health_check():
    supabase_configured = bool(os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
    return {
        "status": "healthy",
        "ffmpeg_available": check_ffmpeg_available(),
        "supabase_configured": supabase_configured
    }

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

# Background task: Process video combination
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

# Helper: Update job status
def update_job_status(job_id: str, progress: int, step: str):
    if job_id in jobs:
        jobs[job_id]["progress_percentage"] = progress
        jobs[job_id]["current_step"] = step
        logger.info(f"Job {job_id}: {progress}% - {step}")

# Helper: Download video segments
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

# Helper: Create concat file for FFmpeg
def create_concat_file(segment_files: List[Path], work_dir: Path) -> Path:
    concat_file = work_dir / "concat.txt"

    with open(concat_file, 'w') as f:
        for segment_file in segment_files:
            f.write(f"file '{segment_file.absolute()}'\n")

    return concat_file

# Helper: Concatenate videos with FFmpeg
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

# Helper: Add background music
async def add_background_music(
    video_file: Path,
    bgm_url: str,
    volume: float,
    work_dir: Path
) -> Path:
    # Download BGM
    bgm_file = work_dir / "bgm.mp3"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(bgm_url)
        response.raise_for_status()

        with open(bgm_file, 'wb') as f:
            f.write(response.content)

    # Mix audio with FFmpeg
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

# Helper: Upload to Supabase Storage bucket "final-videos"
async def upload_to_storage(video_file: Path, project_id: str) -> str:
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_key:
        # Fallback: serve via backend API for development
        logger.warning("Supabase not configured, using local storage fallback")
        video_id = f"{project_id}_{uuid.uuid4().hex[:8]}"
        
        # Copy file to a persistent location
        persistent_dir = Path(tempfile.gettempdir()) / "sparkfluence_videos"
        persistent_dir.mkdir(parents=True, exist_ok=True)
        persistent_path = persistent_dir / f"{video_id}.mp4"
        
        shutil.copy(video_file, persistent_path)
        
        # Store path for serving
        completed_videos[video_id] = str(persistent_path)
        logger.info(f"Video stored locally: {video_id} -> {persistent_path}")
        
        return f"http://localhost:8000/api/video/{video_id}"

    # Generate unique filename
    timestamp = int(asyncio.get_event_loop().time() * 1000)
    file_name = f"{project_id}_{timestamp}.mp4"
    
    logger.info(f"Uploading to Supabase Storage: final-videos/{file_name}")

    # Read video file
    with open(video_file, 'rb') as f:
        video_data = f.read()

    # Upload to Supabase Storage bucket "final-videos"
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

    # Return public URL
    public_url = f"{supabase_url}/storage/v1/object/public/final-videos/{file_name}"
    logger.info(f"Upload successful: {public_url}")
    
    return public_url

# Helper: Get video metadata
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

# Helper: Cleanup directory
def cleanup_directory(directory: Path):
    try:
        import shutil
        shutil.rmtree(directory)
        logger.info(f"Cleaned up directory: {directory}")
    except Exception as e:
        logger.warning(f"Cleanup failed: {str(e)}")

# Helper: Check FFmpeg availability
def check_ffmpeg_available() -> bool:
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return True
    except Exception:
        return False

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
