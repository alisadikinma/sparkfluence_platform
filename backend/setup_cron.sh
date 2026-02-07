#!/bin/bash
# ============================================================================
# Sparkfluence Trending Data — Cron Setup (VPS)
# ============================================================================
#
# Run this script on the VPS to set up automated trending data fetching.
#
# Prerequisites:
#   1. Python 3.10+ with venv
#   2. backend/.env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
#   3. pip install feedparser rapidfuzz httpx python-dotenv
#
# Usage:
#   chmod +x setup_cron.sh
#   ./setup_cron.sh
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="${SCRIPT_DIR}/venv/bin/python"
FETCH_SCRIPT="${SCRIPT_DIR}/fetch_trending.py"
LOG_FILE="/var/log/sparkfluence_trending.log"

# Check Python exists
if [ ! -f "$PYTHON" ]; then
    echo "Error: Python venv not found at $PYTHON"
    echo "Create it with: python3 -m venv ${SCRIPT_DIR}/venv"
    echo "Then: ${SCRIPT_DIR}/venv/bin/pip install feedparser rapidfuzz httpx python-dotenv"
    exit 1
fi

# Check fetch script exists
if [ ! -f "$FETCH_SCRIPT" ]; then
    echo "Error: fetch_trending.py not found at $FETCH_SCRIPT"
    exit 1
fi

# Create log file
sudo touch "$LOG_FILE"
sudo chown "$(whoami)" "$LOG_FILE"

# Cron expression: every 8 hours (00:00, 08:00, 16:00 UTC)
CRON_EXPR="0 0,8,16 * * *"
CRON_CMD="cd ${SCRIPT_DIR} && ${PYTHON} ${FETCH_SCRIPT} >> ${LOG_FILE} 2>&1"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -q "fetch_trending.py"; then
    echo "Cron entry already exists. Updating..."
    # Remove old entry
    crontab -l 2>/dev/null | grep -v "fetch_trending.py" | crontab -
fi

# Add new cron entry
(crontab -l 2>/dev/null; echo "${CRON_EXPR} ${CRON_CMD}") | crontab -

echo "Cron job installed successfully!"
echo ""
echo "Schedule: Every 8 hours (00:00, 08:00, 16:00 UTC)"
echo "Command:  ${CRON_CMD}"
echo "Log file: ${LOG_FILE}"
echo ""
echo "Verify with: crontab -l"
echo "View logs:   tail -f ${LOG_FILE}"
echo ""
echo "To test immediately: ${PYTHON} ${FETCH_SCRIPT} --dry-run"
