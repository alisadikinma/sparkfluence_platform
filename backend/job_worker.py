"""
Sparkfluence Background Job Worker
Processes image and video generation jobs from the database queue.
Runs as a separate process alongside the FastAPI server.
"""

import asyncio
import logging
import os
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('JobWorker')

# Job status constants
JOB_STATUS = {
    'PENDING': 0,
    'PROCESSING': 1,
    'COMPLETED': 2,
    'FAILED': 3
}

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Worker settings
POLL_INTERVAL = 15  # seconds between polling
MAX_RETRIES = 3
RATE_LIMIT_DELAY = 60  # seconds to wait after rate limit
IMAGE_PROCESS_DELAY = 5  # seconds between image jobs
VIDEO_PROCESS_DELAY = 10  # seconds between video jobs


class SupabaseClient:
    """Simple Supabase client for database operations."""
    
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    
    async def select(self, table: str, filters: Dict = None, order: str = None, limit: int = None) -> List[Dict]:
        """Select records from table."""
        async with httpx.AsyncClient() as client:
            url = f"{self.url}/rest/v1/{table}"
            params = {}
            
            if filters:
                for key, value in filters.items():
                    params[key] = f"eq.{value}"
            
            if order:
                params['order'] = order
            
            if limit:
                params['limit'] = str(limit)
            
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
    
    async def select_pending(self, table: str, limit: int = 1) -> List[Dict]:
        """Select pending jobs (status=0) ordered by segment_number.
        Prioritizes completing one session before moving to another."""
        async with httpx.AsyncClient() as client:
            url = f"{self.url}/rest/v1/{table}"
            
            # First, check if there's an active session (has processing jobs)
            # to continue that session first
            processing_url = f"{self.url}/rest/v1/{table}"
            processing_params = {
                'status': 'eq.1',  # PROCESSING
                'limit': '1',
                'select': 'session_id'
            }
            proc_response = await client.get(processing_url, headers=self.headers, params=processing_params)
            proc_jobs = proc_response.json() if proc_response.status_code == 200 else []
            
            params = {
                'status': 'eq.0',
                'order': 'segment_number.asc',  # CRITICAL: Process in segment order (HOOK→FORE→BODY→etc)
                'limit': str(limit)
            }
            
            # If there's an active session, prioritize jobs from that session
            if proc_jobs and proc_jobs[0].get('session_id'):
                active_session = proc_jobs[0]['session_id']
                params['session_id'] = f'eq.{active_session}'
            
            response = await client.get(url, headers=self.headers, params=params)
            
            # If no jobs in active session, get any pending job
            jobs = response.json() if response.status_code == 200 else []
            if not jobs and proc_jobs:
                # Remove session filter and try again
                del params['session_id']
                response = await client.get(url, headers=self.headers, params=params)
                jobs = response.json() if response.status_code == 200 else []
            
            return jobs
    
    async def update(self, table: str, id: str, data: Dict) -> Dict:
        """Update a record by ID."""
        async with httpx.AsyncClient() as client:
            url = f"{self.url}/rest/v1/{table}"
            params = {'id': f'eq.{id}'}
            
            response = await client.patch(
                url, 
                headers=self.headers, 
                params=params, 
                json=data
            )
            response.raise_for_status()
            result = response.json()
            return result[0] if result else {}
    
    async def invoke_function(self, function_name: str, body: Dict) -> Dict:
        """Invoke a Supabase Edge Function."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            url = f"{self.url}/functions/v1/{function_name}"
            headers = {
                'Authorization': f'Bearer {self.key}',
                'Content-Type': 'application/json'
            }
            
            response = await client.post(url, headers=headers, json=body)
            response.raise_for_status()
            return response.json()


class ImageJobWorker:
    """Processes image generation jobs."""
    
    def __init__(self, db: SupabaseClient):
        self.db = db
        self.is_rate_limited = False
        self.rate_limit_until: Optional[datetime] = None
    
    async def process_pending_job(self) -> bool:
        """Process one pending image job. Returns True if job was processed."""
        
        # Check rate limit
        if self.is_rate_limited and self.rate_limit_until:
            if datetime.now(timezone.utc) < self.rate_limit_until:
                return False
            self.is_rate_limited = False
        
        # Get next pending job
        jobs = await self.db.select_pending('image_generation_jobs', limit=1)
        
        if not jobs:
            return False
        
        job = jobs[0]
        job_id = job['id']
        logger.info(f"[IMAGE] Processing job {job_id} - Segment {job['segment_number']}")
        
        try:
            # Mark as processing
            await self.db.update('image_generation_jobs', job_id, {
                'status': JOB_STATUS['PROCESSING'],
                'started_at': datetime.now(timezone.utc).isoformat()
            })
            
            # Call generate-images Edge Function
            result = await self.db.invoke_function('generate-images', {
                'segments': [{
                    'segment_id': job['segment_id'],
                    'segment_number': job['segment_number'],
                    'visual_prompt': job['visual_prompt'],
                    'segment_type': job['segment_type']
                }],
                'style': job.get('style', 'cinematic'),
                'aspect_ratio': job.get('aspect_ratio', '9:16'),
                'provider': job.get('provider', 'z-image'),
                'user_id': job['user_id'],
                'session_id': job['session_id'],
                'background_mode': True  # Tell function we're in background mode
            })
            
            if result.get('success') and result.get('data', {}).get('images'):
                image_data = result['data']['images'][0]
                image_url = image_data.get('image_url') or image_data.get('url')
                
                if image_url:
                    # Success!
                    await self.db.update('image_generation_jobs', job_id, {
                        'status': JOB_STATUS['COMPLETED'],
                        'image_url': image_url,
                        'completed_at': datetime.now(timezone.utc).isoformat(),
                        'metadata': json.dumps(image_data) if isinstance(image_data, dict) else None
                    })
                    logger.info(f"[IMAGE] ✅ Job {job_id} completed: {image_url[:50]}...")
                    return True
            
            # Check for rate limit error
            error_msg = result.get('error', {}).get('message', '') or str(result)
            if 'RATE_LIMIT' in error_msg.upper() or 'rate limit' in error_msg.lower():
                await self._handle_rate_limit(job_id, job)
                return False
            
            # Other failure
            await self._handle_failure(job_id, job, error_msg)
            return True
            
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
            if e.response.status_code == 429:
                await self._handle_rate_limit(job_id, job)
            else:
                await self._handle_failure(job_id, job, error_msg)
            return False
            
        except Exception as e:
            logger.error(f"[IMAGE] Error processing job {job_id}: {e}")
            await self._handle_failure(job_id, job, str(e))
            return False
    
    async def _handle_rate_limit(self, job_id: str, job: Dict):
        """Handle rate limit - put job back to pending, set cooldown."""
        logger.warning(f"[IMAGE] Rate limited on job {job_id}, waiting {RATE_LIMIT_DELAY}s")
        
        self.is_rate_limited = True
        self.rate_limit_until = datetime.now(timezone.utc).replace(
            second=datetime.now(timezone.utc).second + RATE_LIMIT_DELAY
        )
        
        # Put back to pending with incremented retry
        await self.db.update('image_generation_jobs', job_id, {
            'status': JOB_STATUS['PENDING'],
            'retry_count': job.get('retry_count', 0) + 1,
            'error_message': 'RATE_LIMIT: Will retry automatically'
        })
    
    async def _handle_failure(self, job_id: str, job: Dict, error_msg: str):
        """Handle job failure."""
        retry_count = job.get('retry_count', 0) + 1
        
        if retry_count < MAX_RETRIES:
            # Put back to pending for retry
            logger.warning(f"[IMAGE] Job {job_id} failed (attempt {retry_count}/{MAX_RETRIES}): {error_msg[:100]}")
            await self.db.update('image_generation_jobs', job_id, {
                'status': JOB_STATUS['PENDING'],
                'retry_count': retry_count,
                'error_message': f"Retry {retry_count}: {error_msg[:500]}"
            })
        else:
            # Max retries exceeded
            logger.error(f"[IMAGE] Job {job_id} failed permanently: {error_msg[:200]}")
            await self.db.update('image_generation_jobs', job_id, {
                'status': JOB_STATUS['FAILED'],
                'retry_count': retry_count,
                'error_message': error_msg[:1000],
                'completed_at': datetime.now(timezone.utc).isoformat()
            })


class VideoJobWorker:
    """Processes video generation jobs."""
    
    def __init__(self, db: SupabaseClient):
        self.db = db
        self.is_rate_limited = False
        self.rate_limit_until: Optional[datetime] = None
    
    async def process_pending_job(self) -> bool:
        """Process one pending video job. Returns True if job was processed."""
        
        # Check rate limit
        if self.is_rate_limited and self.rate_limit_until:
            if datetime.now(timezone.utc) < self.rate_limit_until:
                return False
            self.is_rate_limited = False
        
        # Get next pending job
        jobs = await self.db.select_pending('video_generation_jobs', limit=1)
        
        if not jobs:
            return False
        
        job = jobs[0]
        job_id = job['id']
        logger.info(f"[VIDEO] Processing job {job_id} - Segment {job['segment_number']}")
        
        # Check if image is ready (required for video)
        if not job.get('image_url'):
            logger.warning(f"[VIDEO] Job {job_id} waiting for image")
            return False
        
        try:
            # Mark as processing
            await self.db.update('video_generation_jobs', job_id, {
                'status': JOB_STATUS['PROCESSING'],
                'started_at': datetime.now(timezone.utc).isoformat()
            })
            
            # Call generate-videos Edge Function with process_single mode
            result = await self.db.invoke_function('generate-videos', {
                'mode': 'process_single',
                'session_id': job['session_id'],
                'user_id': job['user_id'],
                'job_id': job_id  # Specific job to process
            })
            
            if result.get('success'):
                job_data = result.get('data', {}).get('job', {})
                veo_uuid = job_data.get('veo_uuid')
                
                if veo_uuid:
                    logger.info(f"[VIDEO] Job {job_id} submitted to VEO: {veo_uuid}")
                    # Job is now processing in VEO, will be polled by check_processing_jobs
                    return True
                
                # Check if already completed
                if job_data.get('video_url'):
                    logger.info(f"[VIDEO] ✅ Job {job_id} already completed")
                    return True
            
            # Check for rate limit error
            error_msg = result.get('error', {}).get('message', '') or str(result)
            if 'RATE_LIMIT' in error_msg.upper() or 'rate limit' in error_msg.lower():
                await self._handle_rate_limit(job_id, job)
                return False
            
            # Other failure
            await self._handle_failure(job_id, job, error_msg)
            return True
            
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
            if e.response.status_code == 429:
                await self._handle_rate_limit(job_id, job)
            else:
                await self._handle_failure(job_id, job, error_msg)
            return False
            
        except Exception as e:
            logger.error(f"[VIDEO] Error processing job {job_id}: {e}")
            await self._handle_failure(job_id, job, str(e))
            return False
    
    async def check_processing_jobs(self) -> int:
        """Check status of jobs currently being processed by VEO. Returns count checked."""
        async with httpx.AsyncClient() as client:
            # Get processing jobs with VEO UUID
            url = f"{self.db.url}/rest/v1/video_generation_jobs"
            params = {
                'status': 'eq.1',  # PROCESSING
                'veo_uuid': 'not.is.null',
                'limit': '10'
            }
            
            response = await client.get(url, headers=self.db.headers, params=params)
            response.raise_for_status()
            jobs = response.json()
        
        if not jobs:
            return 0
        
        # Get unique UUIDs
        uuids = [j['veo_uuid'] for j in jobs if j.get('veo_uuid')]
        
        if not uuids:
            return 0
        
        try:
            # Call check-video-status Edge Function
            result = await self.db.invoke_function('check-video-status', {
                'video_uuids': uuids,
                'update_db': True
            })
            
            if result.get('success'):
                videos = result.get('data', {}).get('videos', [])
                for video in videos:
                    if video.get('status') == 2 and video.get('video_url'):
                        logger.info(f"[VIDEO] ✅ UUID {video['uuid'][:8]}... completed")
                    elif video.get('status') == 3:
                        logger.warning(f"[VIDEO] ❌ UUID {video['uuid'][:8]}... failed")
            
            return len(uuids)
            
        except Exception as e:
            logger.error(f"[VIDEO] Error checking status: {e}")
            return 0
    
    async def _handle_rate_limit(self, job_id: str, job: Dict):
        """Handle rate limit - put job back to pending, set cooldown."""
        logger.warning(f"[VIDEO] Rate limited on job {job_id}, waiting {RATE_LIMIT_DELAY}s")
        
        self.is_rate_limited = True
        self.rate_limit_until = datetime.now(timezone.utc).replace(
            second=datetime.now(timezone.utc).second + RATE_LIMIT_DELAY
        )
        
        await self.db.update('video_generation_jobs', job_id, {
            'status': JOB_STATUS['PENDING'],
            'retry_count': job.get('retry_count', 0) + 1,
            'error_message': 'RATE_LIMIT: Will retry automatically',
            'veo_uuid': None
        })
    
    async def _handle_failure(self, job_id: str, job: Dict, error_msg: str):
        """Handle job failure."""
        retry_count = job.get('retry_count', 0) + 1
        
        if retry_count < MAX_RETRIES:
            logger.warning(f"[VIDEO] Job {job_id} failed (attempt {retry_count}/{MAX_RETRIES}): {error_msg[:100]}")
            await self.db.update('video_generation_jobs', job_id, {
                'status': JOB_STATUS['PENDING'],
                'retry_count': retry_count,
                'error_message': f"Retry {retry_count}: {error_msg[:500]}",
                'veo_uuid': None
            })
        else:
            logger.error(f"[VIDEO] Job {job_id} failed permanently: {error_msg[:200]}")
            await self.db.update('video_generation_jobs', job_id, {
                'status': JOB_STATUS['FAILED'],
                'retry_count': retry_count,
                'error_message': error_msg[:1000],
                'completed_at': datetime.now(timezone.utc).isoformat()
            })


class NotificationService:
    """Sends notifications when jobs complete."""
    
    def __init__(self, db: SupabaseClient):
        self.db = db
    
    async def check_and_notify(self, user_id: str, session_id: str, job_type: str):
        """Check if all jobs in session are complete and send notification."""
        
        table = 'image_generation_jobs' if job_type == 'image' else 'video_generation_jobs'
        
        async with httpx.AsyncClient() as client:
            url = f"{self.db.url}/rest/v1/{table}"
            params = {
                'user_id': f'eq.{user_id}',
                'session_id': f'eq.{session_id}',
                'select': 'status'
            }
            
            response = await client.get(url, headers=self.db.headers, params=params)
            jobs = response.json()
        
        if not jobs:
            return
        
        total = len(jobs)
        completed = sum(1 for j in jobs if j['status'] == JOB_STATUS['COMPLETED'])
        failed = sum(1 for j in jobs if j['status'] == JOB_STATUS['FAILED'])
        pending_or_processing = total - completed - failed
        
        # All done?
        if pending_or_processing == 0:
            await self._send_notification(
                user_id=user_id,
                title=f"{'Image' if job_type == 'image' else 'Video'} Generation Complete",
                message=f"{completed}/{total} {'images' if job_type == 'image' else 'videos'} ready" + 
                        (f" ({failed} failed)" if failed > 0 else ""),
                notification_type='generation_complete',
                data={
                    'session_id': session_id,
                    'job_type': job_type,
                    'total': total,
                    'completed': completed,
                    'failed': failed
                }
            )
    
    async def _send_notification(self, user_id: str, title: str, message: str, 
                                  notification_type: str, data: Dict = None):
        """Insert notification into database."""
        async with httpx.AsyncClient() as client:
            url = f"{self.db.url}/rest/v1/notifications"
            
            response = await client.post(
                url,
                headers=self.db.headers,
                json={
                    'user_id': user_id,
                    'title': title,
                    'message': message,
                    'type': notification_type,
                    'data': data,
                    'read': False
                }
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"[NOTIFY] Sent to {user_id[:8]}...: {title}")


class BackgroundWorker:
    """Main worker that coordinates image and video processing."""
    
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        
        self.db = SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.image_worker = ImageJobWorker(self.db)
        self.video_worker = VideoJobWorker(self.db)
        self.notifier = NotificationService(self.db)
        self.running = False
    
    async def start(self):
        """Start the background worker loop."""
        self.running = True
        logger.info("=" * 50)
        logger.info("🚀 Sparkfluence Background Worker Started")
        logger.info(f"   Poll interval: {POLL_INTERVAL}s")
        logger.info(f"   Max retries: {MAX_RETRIES}")
        logger.info("=" * 50)
        
        while self.running:
            try:
                await self._process_cycle()
            except Exception as e:
                logger.error(f"Worker cycle error: {e}")
            
            await asyncio.sleep(POLL_INTERVAL)
    
    async def _process_cycle(self):
        """One processing cycle."""
        
        # 1. Process pending IMAGE jobs (priority 1)
        image_processed = await self.image_worker.process_pending_job()
        if image_processed:
            await asyncio.sleep(IMAGE_PROCESS_DELAY)
        
        # 2. Check processing VIDEO jobs (poll VEO status)
        await self.video_worker.check_processing_jobs()
        
        # 3. Process pending VIDEO jobs (priority 2)
        video_processed = await self.video_worker.process_pending_job()
        if video_processed:
            await asyncio.sleep(VIDEO_PROCESS_DELAY)
        
        # Log status periodically
        if image_processed or video_processed:
            logger.debug(f"Cycle complete: image={image_processed}, video={video_processed}")
    
    def stop(self):
        """Stop the worker."""
        self.running = False
        logger.info("Background worker stopping...")


async def main():
    """Entry point for background worker."""
    worker = BackgroundWorker()
    
    try:
        await worker.start()
    except KeyboardInterrupt:
        worker.stop()
        logger.info("Worker stopped by user")


if __name__ == "__main__":
    asyncio.run(main())
