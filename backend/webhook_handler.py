"""
GeminiGen Webhook Handler with Auto Retry Mechanism

Handles VIDEO_GENERATION_COMPLETED and VIDEO_GENERATION_FAILED events
from GeminiGen.ai webhook system.

Auto retry logic:
- Max 3 automatic retries
- 1 minute delay between retries
- After 3 failures, user must manually retry
"""

import os
import asyncio
import logging
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, Request, HTTPException
from typing import Optional

logger = logging.getLogger(__name__)

# Constants
MAX_RETRIES = 3
RETRY_DELAY_MINUTES = 1

# Create router for webhook endpoints
router = APIRouter(prefix="/webhook", tags=["webhook"])


def get_supabase_client():
    """Get Supabase client for database operations."""
    from supabase import create_client

    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')

    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    return create_client(supabase_url, supabase_key)


@router.post("")
async def geminigen_webhook(request: Request):
    """
    Handle GeminiGen webhook events for video generation status updates.

    Webhook payload structure:
    {
        "event": "VIDEO_GENERATION_COMPLETED" | "VIDEO_GENERATION_FAILED",
        "uuid": "c558a44c-c91c-11f0-98b4-0242ac120004",
        "data": {
            "uuid": "...",
            "model_name": "veo-3.1",
            "media_url": "https://storage.geminigen.ai/...",
            "status": "completed" | "failed",
            "error_message": "..." (if failed)
        }
    }
    """
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"[WEBHOOK] Failed to parse payload: {e}")
        return {"status": "error", "message": "Invalid JSON payload"}

    event = payload.get("event")
    veo_uuid = payload.get("uuid")
    data = payload.get("data", {})

    if not event or not veo_uuid:
        logger.warning(f"[WEBHOOK] Missing event or uuid in payload")
        return {"status": "error", "message": "Missing event or uuid"}

    logger.info(f"[WEBHOOK] Received event: {event} for uuid: {veo_uuid}")

    try:
        supabase = get_supabase_client()

        # Find job by veo_uuid
        job_result = supabase.table("video_generation_jobs") \
            .select("*") \
            .eq("veo_uuid", veo_uuid) \
            .execute()

        if not job_result.data:
            logger.warning(f"[WEBHOOK] No job found for uuid: {veo_uuid}")
            return {"status": "error", "message": "Job not found"}

        job = job_result.data[0]
        job_id = job["id"]

        # Log webhook event
        try:
            supabase.table("webhook_events").insert({
                "job_id": job_id,
                "event_type": event,
                "payload": payload,
                "received_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            # Table might not exist, continue anyway
            logger.debug(f"[WEBHOOK] Could not log event: {e}")

        if event == "VIDEO_GENERATION_COMPLETED":
            return await handle_completion(supabase, job, data)
        elif event == "VIDEO_GENERATION_FAILED":
            return await handle_failure(supabase, job, data)
        else:
            logger.warning(f"[WEBHOOK] Unknown event type: {event}")
            return {"status": "ok", "message": f"Ignored event: {event}"}

    except Exception as e:
        logger.error(f"[WEBHOOK] Error processing webhook: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}


async def handle_completion(supabase, job: dict, data: dict):
    """Handle successful video generation."""
    job_id = job["id"]
    video_url = data.get("media_url")

    if not video_url:
        logger.error(f"[WEBHOOK] Completed but no media_url for job {job_id}")
        return {"status": "error", "message": "No video URL"}

    # SUCCESS - Reset retry count, update status
    supabase.table("video_generation_jobs").update({
        "status": 2,  # COMPLETED
        "video_url": video_url,
        "webhook_received_at": datetime.utcnow().isoformat(),
        "retry_count": 0,  # Reset on success
        "next_retry_at": None,
        "error_message": None,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", job_id).execute()

    logger.info(f"[WEBHOOK] ✅ Job {job_id} completed: {video_url}")

    # Check if all jobs in session are done
    await check_and_notify_completion(supabase, job)

    return {"status": "ok", "job_id": job_id, "video_url": video_url}


async def handle_failure(supabase, job: dict, data: dict):
    """Handle failed video generation with auto retry logic."""
    job_id = job["id"]
    error_msg = data.get("error_message", "Video generation failed")
    retry_count = job.get("retry_count", 0) or 0

    if retry_count < MAX_RETRIES:
        # Schedule auto retry after 1 minute
        next_retry = datetime.utcnow() + timedelta(minutes=RETRY_DELAY_MINUTES)

        supabase.table("video_generation_jobs").update({
            "status": 0,  # PENDING (ready for retry)
            "retry_count": retry_count + 1,
            "last_retry_at": datetime.utcnow().isoformat(),
            "next_retry_at": next_retry.isoformat(),
            "error_message": f"Retry {retry_count + 1}/{MAX_RETRIES}: {error_msg}",
            "veo_uuid": None,  # Clear old UUID for new submission
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()

        logger.warning(
            f"[WEBHOOK] ⚠️ Job {job_id} failed, scheduled retry "
            f"{retry_count + 1}/{MAX_RETRIES} at {next_retry}"
        )

        # Schedule the retry task (fire and forget)
        asyncio.create_task(schedule_retry(job_id, RETRY_DELAY_MINUTES * 60))

        return {
            "status": "retry_scheduled",
            "job_id": job_id,
            "retry_count": retry_count + 1,
            "next_retry_at": next_retry.isoformat()
        }
    else:
        # MAX RETRIES REACHED - Mark as permanently failed
        supabase.table("video_generation_jobs").update({
            "status": 3,  # FAILED (permanent)
            "error_message": f"Failed after {MAX_RETRIES} retries: {error_msg}",
            "next_retry_at": None,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()

        logger.error(f"[WEBHOOK] ❌ Job {job_id} failed permanently after {MAX_RETRIES} retries")

        # Notify user about permanent failure
        await notify_permanent_failure(supabase, job)

        return {
            "status": "permanently_failed",
            "job_id": job_id,
            "message": f"Failed after {MAX_RETRIES} retries"
        }


async def schedule_retry(job_id: str, delay_seconds: int):
    """
    Wait and then trigger retry for a failed job.
    """
    await asyncio.sleep(delay_seconds)

    try:
        supabase = get_supabase_client()

        # Check if job is still pending retry (user might have manually retried)
        job_result = supabase.table("video_generation_jobs") \
            .select("status, retry_count, next_retry_at") \
            .eq("id", job_id) \
            .execute()

        if not job_result.data:
            return

        job = job_result.data[0]

        # Only retry if still in PENDING status and has next_retry_at set
        if job["status"] == 0 and job.get("next_retry_at"):
            logger.info(f"[RETRY] 🔄 Auto-retrying job {job_id} (attempt {job['retry_count']})")

            # Trigger resubmission via Edge Function
            await trigger_video_resubmission(job_id)

    except Exception as e:
        logger.error(f"[RETRY] Error scheduling retry for job {job_id}: {e}")


async def trigger_video_resubmission(job_id: str):
    """
    Call Supabase Edge Function to resubmit the job.
    """
    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')

    if not supabase_url or not service_key:
        logger.error(f"[RETRY] Cannot resubmit job {job_id}: Supabase not configured")
        return

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{supabase_url}/functions/v1/generate-videos",
                json={
                    "action": "process_single",
                    "job_id": job_id,
                    "is_retry": True
                },
                headers={
                    "Authorization": f"Bearer {service_key}",
                    "Content-Type": "application/json"
                }
            )

            if response.status_code != 200:
                logger.error(f"[RETRY] Failed to resubmit job {job_id}: {response.text}")
            else:
                logger.info(f"[RETRY] ✅ Job {job_id} resubmission triggered")

        except Exception as e:
            logger.error(f"[RETRY] Error triggering resubmission for job {job_id}: {e}")


async def notify_permanent_failure(supabase, job: dict):
    """
    Send notification when job fails permanently after max retries.
    """
    user_id = job.get("user_id")
    session_id = job.get("session_id")
    segment_number = job.get("segment_number", 0)

    if not user_id:
        return

    try:
        supabase.table("notifications").insert({
            "user_id": user_id,
            "type": "video_generation_failed",
            "title": "⚠️ Video Generation Failed",
            "message": f"Segment {segment_number} gagal setelah 3x retry. Silakan coba manual retry.",
            "data": {
                "session_id": session_id,
                "job_id": job["id"],
                "segment_number": segment_number,
                "action": "manual_retry"
            },
            "is_read": False
        }).execute()

        logger.info(f"[NOTIFY] Sent failure notification to user {user_id}")

    except Exception as e:
        logger.debug(f"[NOTIFY] Could not send notification: {e}")


async def check_and_notify_completion(supabase, job: dict):
    """
    Check if all jobs in a session are complete and notify user.
    """
    session_id = job.get("session_id")
    user_id = job.get("user_id")

    if not session_id or not user_id:
        return

    try:
        # Check if any jobs are still pending/processing
        pending_result = supabase.table("video_generation_jobs") \
            .select("id") \
            .eq("session_id", session_id) \
            .in_("status", [0, 1]) \
            .execute()

        if not pending_result.data:
            # All jobs done - send notification
            supabase.table("notifications").insert({
                "user_id": user_id,
                "type": "video_generation_complete",
                "title": "✅ Video Generation Complete",
                "message": "Semua video segment sudah selesai di-generate!",
                "data": {
                    "session_id": session_id,
                    "action": "view_videos"
                },
                "is_read": False
            }).execute()

            logger.info(f"[NOTIFY] All jobs complete for session {session_id}")

    except Exception as e:
        logger.debug(f"[NOTIFY] Could not check completion: {e}")


# Endpoint for manual retry (force bypass retry count)
@router.post("/manual-retry/{job_id}")
async def manual_retry(job_id: str):
    """
    Manually retry a failed job, bypassing the retry count limit.
    """
    try:
        supabase = get_supabase_client()

        # Reset retry count and status
        supabase.table("video_generation_jobs").update({
            "retry_count": 0,
            "next_retry_at": None,
            "error_message": None,
            "status": 0  # PENDING
        }).eq("id", job_id).execute()

        # Trigger resubmission
        await trigger_video_resubmission(job_id)

        logger.info(f"[MANUAL_RETRY] ✅ Job {job_id} manual retry initiated")

        return {"status": "ok", "job_id": job_id, "message": "Manual retry triggered"}

    except Exception as e:
        logger.error(f"[MANUAL_RETRY] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
