"""
Sparkfluence Trending Data Fetcher
===================================
Fetches trending topics from 5 sources, deduplicates, and upserts into Supabase.

Sources:
  1. Google Trends (RSS feed)       — daily trending searches per country
  2. TikTok Creative Center         — viral hashtags
  3. YouTube Trending (Piped API)   — trending video topics
  4. Google News RSS                — breaking news headlines
  5. AI Creative Angles (Gemini)    — unique content spins from raw trends

Usage:
  python fetch_trending.py                          # Fetch ALL sources, ALL countries
  python fetch_trending.py --country ID             # Indonesia only
  python fetch_trending.py --source google          # Google Trends only
  python fetch_trending.py --dry-run                # Preview without writing to DB
  python fetch_trending.py --country ID --source tiktok --dry-run

Schedule:
  TTL = 8 hours, so run every 8 hours (3× daily).

  VPS (Linux cron):
    crontab -e
    0 0,8,16 * * * cd /root/sparkfluence_platform/backend && /root/sparkfluence_platform/backend/venv/bin/python fetch_trending.py >> /var/log/sparkfluence_trending.log 2>&1

  Windows Task Scheduler:
    schtasks /create /tn "SparkfluenceTrending" /tr "python D:\\Projects\\sparkfluence_platform\\backend\\fetch_trending.py" /sc daily /st 00:00 /ri 480 /du 24:00
"""

import os
import sys
import json
import re
import time
import logging
import argparse
from datetime import datetime, timedelta, timezone
from typing import Optional
from dataclasses import dataclass, field

import httpx
import feedparser
from rapidfuzz import fuzz
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

COUNTRIES = {
    "ID": {
        "name": "Indonesia",
        "lang": "id",
        "hl": "id-ID",
        "pytrends_geo": "indonesia",
        "news_hl": "id",
        "news_gl": "ID",
        "news_ceid": "ID:id",
    },
    "US": {
        "name": "USA",
        "lang": "en",
        "hl": "en-US",
        "pytrends_geo": "united_states",
        "news_hl": "en-US",
        "news_gl": "US",
        "news_ceid": "US:en",
    },
    "IN": {
        "name": "India",
        "lang": "hi",
        "hl": "hi-IN",
        "pytrends_geo": "india",
        "news_hl": "en-IN",
        "news_gl": "IN",
        "news_ceid": "IN:en",
    },
    "FR": {
        "name": "France",
        "lang": "fr",
        "hl": "fr-FR",
        "pytrends_geo": "france",
        "news_hl": "fr",
        "news_gl": "FR",
        "news_ceid": "FR:fr",
    },
}

# TikTok banned in India -> proxy via US geo
TIKTOK_GEO_MAP = {"ID": "ID", "US": "US", "IN": "US", "FR": "FR"}

TTL_HOURS = 8
DEDUP_THRESHOLD = 65  # Fuzzy match threshold (0-100)

# YouTube trending API instances (Piped)
# Note: Piped instances are unreliable — works best for US/IN.
# ID and FR may fail; data from other sources covers these regions.
YOUTUBE_API_INSTANCES = [
    {"url": "https://pipedapi.kavin.rocks", "type": "piped"},
    {"url": "https://pipedapi-libre.kavin.rocks", "type": "piped"},
    {"url": "https://pipedapi.nosebs.ru", "type": "piped"},
    {"url": "https://pipedapi.reallyaweso.me", "type": "piped"},
]

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("trending")


# ---------------------------------------------------------------------------
# API Key Pool (fetch from api_keys_pool table via Supabase RPC)
# ---------------------------------------------------------------------------

def _supabase_rpc(fn_name: str, params: dict) -> list | None:
    """Call a Supabase RPC function and return the result."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(
                f"{SUPABASE_URL}/rest/v1/rpc/{fn_name}",
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json",
                },
                json=params,
            )
            if resp.status_code in (200, 201):
                return resp.json()
    except Exception as e:
        log.warning(f"  RPC {fn_name} failed: {e}")
    return None


def get_api_key_from_pool(provider: str) -> tuple[str | None, str | None]:
    """
    Get an available API key from api_keys_pool table.
    Returns (api_key, key_id) or (None, None).
    """
    result = _supabase_rpc("get_available_api_key", {"p_provider": provider})
    if result and len(result) > 0:
        key = result[0]
        log.info(
            f"  API key [{provider}]: using {key.get('key_name', '?')} "
            f"({key.get('usage_count', 0)}/{key.get('usage_limit', 0)})"
        )
        return key.get("api_key"), key.get("key_id")
    log.warning(f"  API key [{provider}]: no keys available in pool")
    return None, None


def increment_api_key_usage(key_id: str | None) -> None:
    """Increment usage counter for an API key."""
    if key_id:
        _supabase_rpc("increment_api_key_usage", {
            "p_key_id": key_id,
            "p_increment": 1,
        })


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class TrendingItem:
    keyword: str
    source: str  # google, tiktok, youtube, news, ai_creative
    country: str
    volume_score: int = 50
    category: Optional[str] = None
    raw_data: Optional[dict] = None


# ============================================================================
# SOURCE 1: Google Trends (RSS feed — more reliable than pytrends)
# ============================================================================

# Multiple RSS URL patterns (Google changes these occasionally)
_GTRENDS_RSS_URLS = [
    "https://trends.google.com/trending/rss?geo={geo}",
    "https://trends.google.com/trends/trendingsearches/daily/rss?geo={geo}",
]


def fetch_google_trends(country: str) -> list[TrendingItem]:
    """Fetch daily trending searches from Google Trends RSS feed."""
    items = []

    for url_template in _GTRENDS_RSS_URLS:
        try:
            url = url_template.format(geo=country)
            feed = feedparser.parse(url)

            if not feed.entries:
                continue

            seen: set[str] = set()
            for i, entry in enumerate(feed.entries[:30]):
                keyword = (entry.get("title") or "").strip()
                if not keyword or len(keyword) < 3 or keyword.lower() in seen:
                    continue
                seen.add(keyword.lower())

                # Extract traffic volume if available
                traffic = entry.get("ht_approx_traffic", "")
                score = 50
                if traffic:
                    # Parse "500,000+" format
                    num_str = traffic.replace(",", "").replace("+", "")
                    try:
                        num = int(num_str)
                        if num >= 1_000_000:
                            score = 95
                        elif num >= 500_000:
                            score = 85
                        elif num >= 200_000:
                            score = 75
                        elif num >= 100_000:
                            score = 65
                        else:
                            score = 55
                    except ValueError:
                        score = max(90 - (i * 3), 30)
                else:
                    score = max(90 - (i * 3), 30)

                items.append(TrendingItem(
                    keyword=keyword,
                    source="google",
                    country=country,
                    volume_score=score,
                    category="trending_search",
                    raw_data={"traffic": traffic} if traffic else None,
                ))

            log.info(f"  Google Trends [{country}]: {len(items)} items")
            break  # success — stop trying URLs

        except Exception as e:
            log.warning(f"  Google Trends [{country}] via {url_template.split('/')[2]} failed: {e}")
            continue

    if not items:
        log.error(f"  Google Trends [{country}]: all RSS URLs failed")

    return items[:20]


# ============================================================================
# SOURCE 2: TikTok Creative Center (multi-strategy)
# ============================================================================

_TIKTOK_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

# Cache: TikTok CC page returns global data (countryCode param is ignored).
# Fetch once and reuse for all countries.
_tiktok_global_cache: list[dict] | None = None

_TIKTOK_BROWSER_HEADERS = {
    "User-Agent": _TIKTOK_UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}


def _tiktok_parse_api_response(
    data: dict, country: str, tiktok_geo: str
) -> list[TrendingItem]:
    """Parse TikTok Creative Center API JSON response into TrendingItems."""
    items = []
    for i, item in enumerate((data.get("data") or {}).get("list") or []):
        kw = (item.get("hashtag_name") or "").strip().lstrip("#")
        if not kw or len(kw) < 3:
            continue
        views = item.get("publish_cnt") or item.get("video_views") or 0
        score = min(95, max(30, 50 + int(views / 1_000_000)))
        items.append(TrendingItem(
            keyword=kw,
            source="tiktok",
            country=country,
            volume_score=score,
            category="hashtag",
            raw_data={"views": views, "tiktok_geo": tiktok_geo},
        ))
    return items


def _tiktok_strategy_session_api(
    country: str, tiktok_geo: str
) -> list[TrendingItem]:
    """Strategy A: Visit Creative Center page first to get cookies, then call API."""
    try:
        with httpx.Client(
            timeout=20,
            follow_redirects=True,
            headers={"User-Agent": _TIKTOK_UA},
        ) as client:
            # Step 1 — visit page to establish session cookies
            page_url = (
                "https://ads.tiktok.com/business/creativecenter"
                "/inspiration/popular/hashtag/pc/en"
            )
            page_resp = client.get(page_url, headers=_TIKTOK_BROWSER_HEADERS)
            if page_resp.status_code != 200:
                log.warning(
                    f"  TikTok CC [{country}] strategy-A: page returned "
                    f"HTTP {page_resp.status_code}"
                )
                return []

            # Step 2 — call API using the same client (cookies auto-forwarded)
            api_resp = client.get(
                "https://ads.tiktok.com/creative_radar_api/v1"
                "/popular_trend/hashtag/list",
                params={
                    "page": 1,
                    "limit": 50,
                    "period": 7,
                    "country_code": tiktok_geo,
                    "sort_by": "popular",
                },
                headers={
                    "User-Agent": _TIKTOK_UA,
                    "Accept": "application/json, text/plain, */*",
                    "Referer": page_url,
                    "Origin": "https://ads.tiktok.com",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                },
            )

            ct = api_resp.headers.get("content-type", "")
            if "json" not in ct:
                log.warning(f"  TikTok CC [{country}] strategy-A: non-JSON ({ct})")
                return []

            data = api_resp.json()
            if data.get("code") == 0:
                items = _tiktok_parse_api_response(data, country, tiktok_geo)
                if items:
                    log.info(
                        f"  TikTok CC [{country}] strategy-A (session API): "
                        f"{len(items)} items"
                    )
                return items
            else:
                log.warning(
                    f"  TikTok CC [{country}] strategy-A: "
                    f"code={data.get('code')} msg={data.get('msg', '')}"
                )
                return []
    except Exception as e:
        log.warning(f"  TikTok CC [{country}] strategy-A failed: {e}")
        return []


def _tiktok_fetch_global_hashtags() -> list[dict]:
    """Fetch global hashtag data from Creative Center page (cached)."""
    global _tiktok_global_cache
    if _tiktok_global_cache is not None:
        return _tiktok_global_cache

    page_url = (
        "https://ads.tiktok.com/business/creativecenter"
        "/inspiration/popular/hashtag/pc/en"
    )

    try:
        with httpx.Client(timeout=20, follow_redirects=True) as client:
            resp = client.get(page_url, headers=_TIKTOK_BROWSER_HEADERS)
            if resp.status_code != 200:
                log.warning(
                    f"  TikTok CC page: HTTP {resp.status_code}"
                )
                return []

            html = resp.text
            scripts = re.findall(
                r"<script[^>]*>(.*?)</script>", html, re.DOTALL
            )

            for script_body in scripts:
                if '"dehydratedState"' not in script_body or '"pageProps"' not in script_body:
                    continue

                try:
                    page_data = json.loads(script_body)
                except (json.JSONDecodeError, ValueError):
                    continue

                queries = (
                    page_data
                    .get("props", {})
                    .get("pageProps", {})
                    .get("dehydratedState", {})
                    .get("queries", [])
                )

                for query in queries:
                    state_data = query.get("state", {}).get("data", {})
                    pages = state_data.get("pages") if isinstance(state_data, dict) else None
                    if not pages:
                        continue

                    raw_items = []
                    for page in pages:
                        for ht in page.get("list", []):
                            name = (ht.get("hashtagName") or "").strip().lstrip("#")
                            if name and len(name) >= 3:
                                raw_items.append(ht)

                    if raw_items:
                        _tiktok_global_cache = raw_items
                        log.info(
                            f"  TikTok CC page: fetched {len(raw_items)} "
                            f"global hashtags (cached)"
                        )
                        return raw_items

            log.warning(
                f"  TikTok CC page: no hashtag data in dehydratedState "
                f"(page length={len(html)})"
            )

    except Exception as e:
        log.warning(f"  TikTok CC page fetch failed: {e}")

    _tiktok_global_cache = []
    return []


def _tiktok_strategy_page_scrape(
    country: str, tiktok_geo: str
) -> list[TrendingItem]:
    """Strategy B: Parse dehydratedState from Creative Center page (global data)."""
    raw_hashtags = _tiktok_fetch_global_hashtags()
    if not raw_hashtags:
        return []

    items = []
    seen: set[str] = set()

    for i, ht in enumerate(raw_hashtags):
        kw = (ht.get("hashtagName") or "").strip().lstrip("#")
        if not kw or len(kw) < 3 or kw.lower() in seen:
            continue
        seen.add(kw.lower())

        views = ht.get("videoViews") or 0
        publish_cnt = ht.get("publishCnt") or 0
        rank = ht.get("rank") or (i + 1)
        industry = (ht.get("industryInfo") or {}).get("value", "")

        if views >= 1_000_000_000:
            score = 95
        elif views >= 500_000_000:
            score = 90
        elif views >= 100_000_000:
            score = 80
        elif views >= 10_000_000:
            score = 70
        else:
            score = max(90 - (rank * 3), 30)

        items.append(TrendingItem(
            keyword=kw,
            source="tiktok",
            country=country,
            volume_score=score,
            category=industry.lower() if industry else "hashtag",
            raw_data={
                "views": views,
                "publish_cnt": publish_cnt,
                "rank": rank,
                "tiktok_geo": tiktok_geo,
                "scope": "global",
            },
        ))

    if items:
        log.info(
            f"  TikTok CC [{country}] strategy-B (page scrape): "
            f"{len(items)} items"
        )
    return items


def _tiktok_strategy_direct_api(
    country: str, tiktok_geo: str
) -> list[TrendingItem]:
    """Strategy C: Direct API call (original approach, may fail with 40101)."""
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(
                "https://ads.tiktok.com/creative_radar_api/v1"
                "/popular_trend/hashtag/list",
                params={
                    "page": 1,
                    "limit": 20,
                    "period": 7,
                    "country_code": tiktok_geo,
                    "sort_by": "popular",
                },
                headers={
                    "User-Agent": _TIKTOK_UA,
                    "Accept": "application/json",
                },
            )

            ct = resp.headers.get("content-type", "")
            if "json" not in ct:
                return []

            data = resp.json()
            if data.get("code") == 0:
                items = _tiktok_parse_api_response(data, country, tiktok_geo)
                if items:
                    log.info(
                        f"  TikTok CC [{country}] strategy-C (direct API): "
                        f"{len(items)} items"
                    )
                return items
    except Exception:
        pass
    return []


def fetch_tiktok_creative_center(country: str) -> list[TrendingItem]:
    """
    Fetch trending hashtags from TikTok Creative Center.

    Tries 3 strategies in order:
      A) Visit page to get session cookies → call API with cookies
      B) Scrape embedded JSON from the Creative Center HTML page
      C) Direct API call (legacy, may return 40101)
    """
    tiktok_geo = TIKTOK_GEO_MAP.get(country, "US")

    # Strategy B — page scrape (primary — most reliable, uses cache)
    items = _tiktok_strategy_page_scrape(country, tiktok_geo)
    if items:
        return items[:25]

    # Strategy A — session-based API (fallback if page scrape fails)
    items = _tiktok_strategy_session_api(country, tiktok_geo)
    if items:
        return items[:25]

    # Strategy C — direct API (last resort)
    items = _tiktok_strategy_direct_api(country, tiktok_geo)
    if items:
        return items[:25]

    log.error(f"  TikTok CC [{country}]: all 3 strategies failed")
    return []


# ============================================================================
# SOURCE 3: YouTube Trending (Invidious API)
# ============================================================================

# Patterns to clean YouTube titles
_YT_SUFFIX = re.compile(
    r"\s*[\|\-–—\(\[].{0,80}$"
)
_YT_NOISE = re.compile(
    r"\s*(Official|Full|HD|4K|Lyrics|Music Video|MV|Trailer|Video Clip"
    r"|Reaction|Review|Breakdown|Explained|Sub Indo).*$",
    re.IGNORECASE,
)


def _parse_piped_response(videos: list, country: str) -> list[TrendingItem]:
    """Parse Piped API response format."""
    items = []
    seen: set[str] = set()
    for i, video in enumerate(videos[:30]):
        title = (video.get("title") or "").strip()
        if not title or len(title) < 5:
            continue
        clean = _YT_SUFFIX.sub("", title).strip()
        clean = _YT_NOISE.sub("", clean).strip()
        if not clean or len(clean) < 4 or clean.lower() in seen:
            continue
        seen.add(clean.lower())
        score = max(90 - (i * 2), 30)
        items.append(TrendingItem(
            keyword=clean,
            source="youtube",
            country=country,
            volume_score=score,
            category="video",
            raw_data={
                "original_title": title,
                "views": video.get("views", 0),
                "channel": video.get("uploaderName") or video.get("author", ""),
            },
        ))
    return items


def _parse_invidious_response(videos: list, country: str) -> list[TrendingItem]:
    """Parse Invidious API response format."""
    items = []
    seen: set[str] = set()
    for i, video in enumerate(videos[:30]):
        title = (video.get("title") or "").strip()
        if not title or len(title) < 5:
            continue
        clean = _YT_SUFFIX.sub("", title).strip()
        clean = _YT_NOISE.sub("", clean).strip()
        if not clean or len(clean) < 4 or clean.lower() in seen:
            continue
        seen.add(clean.lower())
        score = max(90 - (i * 2), 30)
        items.append(TrendingItem(
            keyword=clean,
            source="youtube",
            country=country,
            volume_score=score,
            category="video",
            raw_data={
                "original_title": title,
                "views": video.get("viewCount", 0),
                "channel": video.get("author", ""),
            },
        ))
    return items


def fetch_youtube_trending(country: str) -> list[TrendingItem]:
    """Fetch trending YouTube video topics via Piped/Invidious APIs."""
    for inst in YOUTUBE_API_INSTANCES:
        base_url = inst["url"]
        api_type = inst["type"]
        short_name = base_url.split("//")[1]

        try:
            with httpx.Client(timeout=15) as client:
                if api_type == "piped":
                    resp = client.get(
                        f"{base_url}/trending",
                        params={"region": country},
                    )
                else:  # invidious
                    resp = client.get(
                        f"{base_url}/api/v1/trending",
                        params={"region": country, "type": "Default"},
                    )

                if resp.status_code != 200:
                    log.warning(f"  YouTube [{country}] via {short_name}: HTTP {resp.status_code}")
                    continue

                videos = resp.json()
                if not isinstance(videos, list) or len(videos) == 0:
                    continue

            # Parse based on API type
            if api_type == "piped":
                items = _parse_piped_response(videos, country)
            else:
                items = _parse_invidious_response(videos, country)

            if items:
                log.info(f"  YouTube [{country}] via {short_name}: {len(items)} items")
                return items[:20]

        except Exception as e:
            log.warning(f"  YouTube [{country}] via {short_name} failed: {e}")
            continue

    log.error(f"  YouTube [{country}]: all API instances failed")
    return []


# ============================================================================
# SOURCE 4: Google News RSS
# ============================================================================

# Remove " - SourceName" suffix from Google News titles
_NEWS_SOURCE = re.compile(r"\s*-\s*[^-]{2,40}$")


def fetch_google_news(country: str) -> list[TrendingItem]:
    """Fetch top headlines from Google News RSS feed."""
    items = []
    cfg = COUNTRIES[country]

    try:
        rss_url = (
            f"https://news.google.com/rss"
            f"?hl={cfg['news_hl']}&gl={cfg['news_gl']}&ceid={cfg['news_ceid']}"
        )
        feed = feedparser.parse(rss_url)

        seen: set[str] = set()
        for i, entry in enumerate(feed.entries[:25]):
            title = (entry.get("title") or "").strip()
            title = _NEWS_SOURCE.sub("", title).strip()

            if not title or len(title) < 5 or title.lower() in seen:
                continue
            seen.add(title.lower())

            score = max(85 - (i * 2), 30)
            items.append(TrendingItem(
                keyword=title,
                source="news",
                country=country,
                volume_score=score,
                category="headline",
                raw_data={
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                },
            ))

        log.info(f"  Google News [{country}]: {len(items)} items")

    except Exception as e:
        log.error(f"  Google News [{country}] FAILED: {e}")

    return items[:20]


# ============================================================================
# SOURCE 5: AI Creative Angles (OpenRouter → Gemini fallback)
# ============================================================================

def _build_ai_creative_prompt(top_keywords: list[str], country: str) -> str:
    """Build prompt for AI creative angle generation."""
    lang_map = {"ID": "Indonesian", "US": "English", "IN": "English", "FR": "French"}
    lang_name = lang_map.get(country, "English")
    slang_note = (
        " Use casual Jakarta slang (gue/lo, sih, tuh, dong, literally)."
        if country == "ID"
        else ""
    )
    return (
        f"You are a viral content strategist. Given these trending topics "
        f"in {COUNTRIES[country]['name']}, generate 5 unique creative content "
        f"angles that would go viral on TikTok/Reels/Shorts.\n\n"
        f"TRENDING NOW:\n"
        + "\n".join(f"- {kw}" for kw in top_keywords)
        + f"\n\nRULES:\n"
        f"- Each angle MUST reference one or more trending topics above\n"
        f"- Write in {lang_name}.{slang_note}\n"
        f"- Titles must be attention-grabbing (curiosity gap, controversy, shock)\n"
        f"- Each title = different angle/perspective\n"
        f"- Include the trending keyword naturally\n\n"
        f'Return ONLY valid JSON array:\n'
        f'[\n'
        f'  {{"title": "...", "based_on": "original_keyword", '
        f'"angle": "curiosity_gap|controversial|educational|comparison|personal_story"}}\n'
        f']'
    )


def _parse_ai_creative_result(text: str, country: str) -> list[TrendingItem]:
    """Parse JSON response from LLM into TrendingItems."""
    items = []
    # Strip markdown code fences (OpenRouter wraps in ```json ... ```)
    clean = text.strip()
    if clean.startswith("```"):
        clean = re.sub(r"^```(?:json)?\s*", "", clean)
        clean = re.sub(r"\s*```$", "", clean)
    try:
        angles = json.loads(clean)
        # Handle {"angles": [...]} wrapper or direct [...]
        if isinstance(angles, dict):
            angles = angles.get("angles") or angles.get("results") or []
        for i, angle in enumerate(angles[:5]):
            title = (angle.get("title") or "").strip()
            if title and len(title) > 10:
                items.append(TrendingItem(
                    keyword=title,
                    source="ai_creative",
                    country=country,
                    volume_score=75 - (i * 3),
                    category=angle.get("angle", "creative"),
                    raw_data={
                        "based_on": angle.get("based_on", ""),
                        "angle_type": angle.get("angle", ""),
                    },
                ))
    except (json.JSONDecodeError, TypeError):
        pass
    return items


def _call_openrouter(prompt: str, api_key: str) -> tuple[str, int]:
    """Call OpenRouter chat completions API. Returns (text, status_code)."""
    with httpx.Client(timeout=30) as client:
        resp = client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://sparkfluence.com",
                "X-Title": "Sparkfluence",
            },
            json={
                "model": "google/gemini-2.0-flash-001",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.9,
                "max_tokens": 1500,
            },
        )
        data = resp.json()
        text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
        return text, resp.status_code


def _call_gemini_direct(prompt: str, api_key: str) -> tuple[str, int]:
    """Call Gemini REST API directly. Returns (text, status_code)."""
    with httpx.Client(timeout=30) as client:
        resp = client.post(
            "https://generativelanguage.googleapis.com/v1beta"
            f"/models/gemini-2.0-flash:generateContent?key={api_key}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.9,
                    "maxOutputTokens": 1500,
                    "responseMimeType": "application/json",
                },
            },
        )
        data = resp.json()
        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        return text, resp.status_code


def generate_ai_creative_angles(
    all_items: list[TrendingItem],
    country: str,
) -> list[TrendingItem]:
    """
    Generate creative content angles from trending data.
    Priority: OpenRouter (1st) → Gemini direct (fallback).
    Keys from api_keys_pool with rotation on 429/402.
    """
    country_items = [i for i in all_items if i.country == country]
    country_items.sort(key=lambda x: x.volume_score, reverse=True)
    top_keywords = [i.keyword for i in country_items[:15]]

    if not top_keywords:
        return []

    prompt = _build_ai_creative_prompt(top_keywords, country)

    # --- Priority 1: OpenRouter ---
    or_key, or_key_id = get_api_key_from_pool("openrouter")
    if or_key:
        try:
            text, status = _call_openrouter(prompt, or_key)
            if status in (429, 402):
                log.warning(
                    f"  AI Creative [{country}] OpenRouter {status}, "
                    f"trying Gemini..."
                )
                _supabase_rpc("mark_api_key_exhausted", {"p_key_id": or_key_id})
            elif status == 200 and text:
                items = _parse_ai_creative_result(text, country)
                if items:
                    increment_api_key_usage(or_key_id)
                    log.info(
                        f"  AI Creative [{country}]: {len(items)} angles "
                        f"(via OpenRouter)"
                    )
                    return items
            else:
                log.warning(
                    f"  AI Creative [{country}] OpenRouter HTTP {status}, "
                    f"trying Gemini..."
                )
        except Exception as e:
            log.warning(f"  AI Creative [{country}] OpenRouter failed: {e}")

    # --- Priority 2: Gemini direct (rotate through keys) ---
    for attempt in range(5):
        gemini_key, gemini_key_id = get_api_key_from_pool("gemini")
        if not gemini_key:
            break

        try:
            text, status = _call_gemini_direct(prompt, gemini_key)
            if status in (429, 402):
                log.warning(
                    f"  AI Creative [{country}] Gemini key exhausted "
                    f"(HTTP {status}), rotating..."
                )
                _supabase_rpc("mark_api_key_exhausted", {"p_key_id": gemini_key_id})
                continue
            elif status == 200 and text:
                items = _parse_ai_creative_result(text, country)
                if items:
                    increment_api_key_usage(gemini_key_id)
                    log.info(
                        f"  AI Creative [{country}]: {len(items)} angles "
                        f"(via Gemini)"
                    )
                    return items
            else:
                log.warning(f"  AI Creative [{country}] Gemini HTTP {status}")
                break
        except Exception as e:
            log.error(f"  AI Creative [{country}] Gemini FAILED: {e}")
            break

    log.warning(f"  AI Creative [{country}]: all providers exhausted")
    return []


# ============================================================================
# 3-LAYER DEDUPLICATION ENGINE
# ============================================================================

STOP_WORDS = frozenset({
    # English
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "for", "and", "nor", "but",
    "or", "yet", "so", "at", "by", "from", "in", "into", "of", "on",
    "to", "with", "that", "this", "these", "those", "its", "it", "not",
    "how", "what", "why", "when", "who", "which", "new", "top",
    # Indonesian
    "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "ini", "itu",
    "akan", "pada", "sudah", "juga", "bisa", "ada", "tidak", "lebih",
    "cara", "tips", "trik", "sih", "tuh", "dong", "deh", "gue", "gw",
    "lo", "lu",
    # Hindi
    "ka", "ki", "ke", "hai", "ko", "se", "ne", "par", "mein",
    # French
    "le", "la", "les", "de", "du", "des", "un", "une", "et", "est",
    "en", "au", "aux", "pour", "avec", "sur", "dans", "par", "pas",
})


def _normalize(text: str) -> str:
    """Layer 1: Normalize keyword for comparison."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", " ", text)
    tokens = [
        t for t in text.split()
        if t not in STOP_WORDS and not t.isdigit() and len(t) > 1
    ]
    return " ".join(sorted(tokens))


def deduplicate_items(
    items: list[TrendingItem],
    threshold: int = DEDUP_THRESHOLD,
) -> list[TrendingItem]:
    """
    3-layer deduplication:
      1. Normalize keywords (lowercase, remove stop words, sort tokens)
      2. Fuzzy-match similar items (token_sort_ratio >= threshold)
      3. Merge duplicates: keep highest score, boost for multi-source items
    """
    if not items:
        return []

    # Group by country
    by_country: dict[str, list[TrendingItem]] = {}
    for item in items:
        by_country.setdefault(item.country, []).append(item)

    result: list[TrendingItem] = []

    for country, c_items in by_country.items():
        before = len(c_items)

        # Build normalized representations
        normed = [(_normalize(it.keyword), it) for it in c_items]

        # Layer 2: fuzzy-match grouping
        used: set[int] = set()
        groups: list[list[TrendingItem]] = []

        for i, (ni, item_i) in enumerate(normed):
            if i in used:
                continue
            group = [item_i]
            used.add(i)

            for j, (nj, item_j) in enumerate(normed):
                if j in used:
                    continue
                if fuzz.token_sort_ratio(ni, nj) >= threshold:
                    group.append(item_j)
                    used.add(j)

            groups.append(group)

        # Layer 3: merge & boost
        for group in groups:
            group.sort(key=lambda x: x.volume_score, reverse=True)
            best = group[0]

            sources = list({it.source for it in group})

            # Multi-source bonus
            if len(sources) >= 3:
                best.volume_score = min(100, best.volume_score + 25)
            elif len(sources) >= 2:
                best.volume_score = min(100, best.volume_score + 15)

            # Record merge metadata
            if best.raw_data is None:
                best.raw_data = {}
            best.raw_data["all_sources"] = sources
            best.raw_data["source_count"] = len(sources)
            if len(group) > 1:
                best.raw_data["merged_keywords"] = [
                    it.keyword for it in group[1:]
                ]

            result.append(best)

        after = len([g for g in groups])
        removed = before - after
        if removed > 0:
            log.info(f"  Dedup [{country}]: {before} -> {after} ({removed} merged)")

    result.sort(key=lambda x: (x.country, -x.volume_score))
    return result


# ============================================================================
# SUPABASE WRITER
# ============================================================================

def _supabase_headers() -> dict:
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }


def write_to_supabase(items: list[TrendingItem], dry_run: bool = False):
    """Upsert deduplicated items into Supabase trending_topics table."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        log.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set!")
        return

    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    expires = (now + timedelta(hours=TTL_HOURS)).isoformat()

    rows = []
    for item in items:
        rows.append({
            "source": item.source,
            "keyword": item.keyword,
            "country": item.country,
            "category": item.category,
            "volume_score": item.volume_score,
            "raw_data": item.raw_data,
            "fetch_date": today,
            "fetched_at": now.isoformat(),
            "expires_at": expires,
        })

    if dry_run:
        log.info(f"\n  DRY RUN — would write {len(rows)} items:")
        for r in rows[:15]:
            log.info(
                f"    [{r['source']:12s}] [{r['country']}] "
                f"score={r['volume_score']:3d}  {r['keyword'][:60]}"
            )
        if len(rows) > 15:
            log.info(f"    ... and {len(rows) - 15} more")
        return

    headers = _supabase_headers()
    batch_size = 50
    total_ok = 0

    with httpx.Client(timeout=30) as client:
        # Upsert in batches
        for i in range(0, len(rows), batch_size):
            batch = rows[i : i + batch_size]
            resp = client.post(
                f"{SUPABASE_URL}/rest/v1/trending_topics",
                headers=headers,
                json=batch,
            )
            if resp.status_code in (200, 201):
                total_ok += len(batch)
            else:
                log.error(
                    f"  Supabase write batch {i // batch_size} failed: "
                    f"{resp.status_code} — {resp.text[:200]}"
                )

        # Cleanup expired records
        resp = client.delete(
            f"{SUPABASE_URL}/rest/v1/trending_topics"
            f"?expires_at=lt.{now.isoformat()}",
            headers={**headers, "Prefer": ""},
        )
        if resp.status_code in (200, 204):
            log.info("  Expired records cleaned up")

    log.info(f"  Supabase: {total_ok}/{len(rows)} items written")


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Sparkfluence Trending Data Fetcher"
    )
    parser.add_argument(
        "--country",
        choices=["ID", "US", "IN", "FR", "ALL"],
        default="ALL",
        help="Country to fetch (default: ALL)",
    )
    parser.add_argument(
        "--source",
        choices=["google", "tiktok", "youtube", "news", "ai", "ALL"],
        default="ALL",
        help="Source to fetch (default: ALL)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview results without writing to Supabase",
    )
    args = parser.parse_args()

    countries = (
        list(COUNTRIES.keys()) if args.country == "ALL" else [args.country]
    )

    log.info("=" * 60)
    log.info(
        f"Sparkfluence Trending Fetcher — "
        f"{datetime.now().strftime('%Y-%m-%d %H:%M')}"
    )
    log.info(f"Countries: {', '.join(countries)}")
    log.info(f"Source:    {args.source}")
    log.info(f"Dry run:   {args.dry_run}")
    log.info("=" * 60)

    all_items: list[TrendingItem] = []

    for country in countries:
        log.info(f"\n--- {COUNTRIES[country]['name']} ({country}) ---")

        # Source 1: Google Trends
        if args.source in ("google", "ALL"):
            all_items.extend(fetch_google_trends(country))
            time.sleep(2)  # pytrends rate-limit buffer

        # Source 2: TikTok Creative Center
        if args.source in ("tiktok", "ALL"):
            all_items.extend(fetch_tiktok_creative_center(country))

        # Source 3: YouTube Trending
        if args.source in ("youtube", "ALL"):
            all_items.extend(fetch_youtube_trending(country))

        # Source 4: Google News RSS
        if args.source in ("news", "ALL"):
            all_items.extend(fetch_google_news(country))

    log.info(f"\n{'=' * 60}")
    log.info(f"Total raw items: {len(all_items)}")

    # --- Deduplication ---
    deduped = deduplicate_items(all_items)
    log.info(f"After dedup:     {len(deduped)}")

    # Source 5: AI Creative (runs AFTER dedup, uses merged data)
    if args.source in ("ai", "ALL"):
        for country in countries:
            ai_items = generate_ai_creative_angles(deduped, country)
            deduped.extend(ai_items)

    log.info(f"Final total:     {len(deduped)}")

    # --- Summary ---
    log.info("\n--- Summary by source/country ---")
    counts: dict[str, int] = {}
    for item in deduped:
        key = f"{item.source:12s} / {item.country}"
        counts[key] = counts.get(key, 0) + 1
    for key in sorted(counts):
        log.info(f"  {key}: {counts[key]}")

    # Show multi-source boosted items
    boosted = [
        i for i in deduped
        if (i.raw_data or {}).get("source_count", 1) >= 2
    ]
    if boosted:
        log.info(f"\n--- Multi-source items (boosted) ---")
        for item in boosted[:10]:
            sources = (item.raw_data or {}).get("all_sources", [])
            log.info(
                f"  score={item.volume_score:3d}  "
                f"[{'+'.join(sources)}]  {item.keyword[:55]}"
            )

    # --- Write to Supabase ---
    write_to_supabase(deduped, dry_run=args.dry_run)

    log.info("\nDone!")


if __name__ == "__main__":
    main()
