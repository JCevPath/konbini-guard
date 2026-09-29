FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

# Starts worker.py in background, then runs Uvicorn on port 8001
CMD python -u worker.py & uvicorn main:app --host 0.0.0.0 --port 8001