"""
API Key Pool — Pool-based key rotation via Supabase api_keys_pool table.

Mirrors the TypeScript apiKeyRotation.ts logic for Python backend.
Supports automatic retry with key rotation on 429/402 errors.

Usage:
    from api_key_pool import ApiKeyPool

    pool = ApiKeyPool()  # Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env
    key_id, api_key = await pool.get_key('groq')
    # ... use api_key ...
    await pool.increment_usage(key_id)

    # Or use the high-level transcription helper:
    result = await pool.transcribe_with_groq(audio_path)
"""
import os
import logging
import httpx
from pathlib import Path
from typing import Tuple, Optional, Dict, Any

logger = logging.getLogger('ApiKeyPool')


class ApiKeyPool:
    """Pool-based API key rotation via Supabase RPC."""

    def __init__(self):
        self.url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
        self.key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')
        if not self.url or not self.key:
            logger.warning("Supabase not configured — pool-based key rotation unavailable")
        self.headers = {
            'apikey': self.key or '',
            'Authorization': f'Bearer {self.key or ""}',
            'Content-Type': 'application/json',
        }

    async def _rpc(self, fn_name: str, params: Dict[str, Any] = None) -> Any:
        """Call a Supabase RPC function (SECURITY DEFINER)."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.url}/rest/v1/rpc/{fn_name}",
                headers=self.headers,
                json=params or {},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_key(self, provider: str) -> Tuple[Optional[int], Optional[str]]:
        """
        Get the next available API key for a provider.
        Returns (key_id, api_key) or (None, None) if all exhausted.
        """
        try:
            result = await self._rpc('get_available_api_key', {'p_provider': provider})
            if result and isinstance(result, list) and len(result) > 0:
                row = result[0]
                return row['id'], row['api_key']
            elif result and isinstance(result, dict):
                return result.get('id'), result.get('api_key')
            return None, None
        except Exception as e:
            logger.error(f"[Pool] Failed to get key for {provider}: {e}")
            return None, None

    async def increment_usage(self, key_id: int, increment: int = 1) -> None:
        """Increment usage counter after successful API call."""
        try:
            await self._rpc('increment_api_key_usage', {
                'p_key_id': key_id,
                'p_increment': increment,
            })
        except Exception as e:
            logger.warning(f"[Pool] Failed to increment usage for key {key_id}: {e}")

    async def mark_exhausted(self, key_id: int) -> None:
        """Mark key as exhausted (429/402). Resets daily."""
        try:
            await self._rpc('mark_api_key_exhausted', {'p_key_id': key_id})
            logger.info(f"[Pool] Marked key {key_id} as exhausted")
        except Exception as e:
            logger.warning(f"[Pool] Failed to mark key {key_id} exhausted: {e}")

    async def transcribe_with_groq(
        self,
        audio_path: Path,
        model: str = 'whisper-large-v3-turbo',
        response_format: str = 'verbose_json',
        max_retries: int = 4,
    ) -> Dict[str, Any]:
        """
        Transcribe audio with Groq Whisper using pool-based key rotation.

        Tries up to max_retries keys. On 429/402, marks key exhausted and tries next.
        Falls back to GROQ_API_KEY env var if pool is empty.

        Returns the Whisper JSON response.
        Raises Exception if all keys fail.
        """
        last_error = None

        for attempt in range(max_retries):
            key_id, api_key = await self.get_key('groq')

            # Fallback to env var if pool returns nothing
            if not api_key:
                api_key = os.getenv('GROQ_API_KEY')
                key_id = None
                if not api_key:
                    raise Exception("No Groq API key available (pool empty + GROQ_API_KEY not set)")

            try:
                async with httpx.AsyncClient(timeout=180.0) as client:
                    with open(audio_path, 'rb') as f:
                        files = {'file': ('audio.mp3', f, 'audio/mpeg')}
                        data = {
                            'model': model,
                            'response_format': response_format,
                            'timestamp_granularities[]': 'word',
                        }
                        headers = {'Authorization': f'Bearer {api_key}'}

                        resp = await client.post(
                            "https://api.groq.com/openai/v1/audio/transcriptions",
                            headers=headers, files=files, data=data,
                        )

                if resp.status_code == 429 or resp.status_code == 402:
                    logger.warning(f"[Pool] Groq key {key_id} got {resp.status_code}, rotating...")
                    if key_id:
                        await self.mark_exhausted(key_id)
                    last_error = f"Groq {resp.status_code}: rate limited"
                    continue

                if resp.status_code == 401 or resp.status_code == 403:
                    logger.error(f"[Pool] Groq key {key_id} got {resp.status_code} (auth error)")
                    last_error = f"Groq {resp.status_code}: auth error"
                    continue

                resp.raise_for_status()

                # Success — track usage
                if key_id:
                    await self.increment_usage(key_id)

                result = resp.json()
                logger.info(f"[Pool] Groq transcription success (key={key_id}, attempt={attempt + 1})")
                return result

            except httpx.HTTPStatusError as e:
                last_error = f"Groq HTTP {e.response.status_code}: {str(e)[:200]}"
                logger.warning(f"[Pool] Attempt {attempt + 1} failed: {last_error}")
                if key_id and e.response.status_code in (429, 402):
                    await self.mark_exhausted(key_id)
            except Exception as e:
                last_error = str(e)[:200]
                logger.warning(f"[Pool] Attempt {attempt + 1} failed: {last_error}")

        raise Exception(f"All Groq keys exhausted after {max_retries} attempts. Last error: {last_error}")


# Global singleton (initialized lazily)
_pool: Optional[ApiKeyPool] = None


def get_pool() -> ApiKeyPool:
    """Get or create the global ApiKeyPool instance."""
    global _pool
    if _pool is None:
        _pool = ApiKeyPool()
    return _pool
