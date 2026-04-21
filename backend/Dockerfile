
# Stage 1: Builder
FROM python:3.11-slim as builder
WORKDIR /app
RUN apt-get update && apt-get install -y build-essential libpq-dev
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libpq-dev exiftool && rm -rf /var/lib/apt/lists/*
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
COPY . .
RUN chmod +x start.sh start-worker.sh
CMD ["./start.sh"]

