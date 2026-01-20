FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    fonts-noto-core \
    fonts-noto-extra \
    fonts-noto-ui-core \
    fontconfig \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -fv

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY job_worker.py .
COPY webhook_handler.py .
COPY ffmpeg/ ./ffmpeg/

RUN mkdir -p /app/videos

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
