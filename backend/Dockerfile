FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY job_worker.py .
COPY ffmpeg/ ./ffmpeg/

RUN mkdir -p /app/videos

EXPOSE 8000

# NO HEALTHCHECK - FFmpeg blocks event loop during processing
# Traefik will handle routing without health status

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
