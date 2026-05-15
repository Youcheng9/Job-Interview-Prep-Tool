# syntax=docker/dockerfile:1.7
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip pip install -r /tmp/requirements.txt

COPY backend /app/backend
COPY alembic.ini /app/alembic.ini

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
