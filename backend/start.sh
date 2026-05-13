#!/bin/bash
# TaskFlow - Start Backend Server
echo "🚀 Starting TaskFlow Backend..."
pip install -r requirements.txt -q
echo "✅ Dependencies installed"
echo "📡 Starting FastAPI server on http://127.0.0.1:8000"
echo "📚 API Docs: http://127.0.0.1:8000/api/docs"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
