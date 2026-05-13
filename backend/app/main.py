from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from app.database.database import connect_to_mongo, close_mongo_connection
from app.routes import auth, projects, tasks, analytics, invite, notifications
from app.services import events
from app.config.config import settings
import asyncio
import json

app = FastAPI(
    title="TaskFlow API",
    description="Collaborative Project & Task Management Platform",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

origins = [
    settings.FRONTEND_URL,
    "https://lumina-task-manager.onrender.com",
    "https://lumina-task-manager.onrender.com/",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
# Ensure no None values
origins = [o for o in origins if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

# ── ROUTES ──
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(tasks.me_router)
app.include_router(analytics.router)
app.include_router(invite.router)
app.include_router(notifications.router)

# ── REAL-TIME SSE ──
@app.get("/api/events/{project_id}")
async def project_events(project_id: str, request: Request):
    """Server-Sent Events stream for a project"""
    queue = events.subscribe(project_id)

    async def event_generator():
        try:
            # Send a heartbeat immediately
            yield f"data: {json.dumps({'type': 'connected', 'projectId': project_id})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {json.dumps(message, default=str)}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat to keep connection alive
                    yield f"data: {json.dumps({'type': 'ping'})}\n\n"
        finally:
            events.unsubscribe(project_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

# ── PERSONAL SSE (notifications) ──
@app.get("/api/events/user/{user_id}")
async def user_events(user_id: str, request: Request):
    """Personal SSE stream for live notifications"""
    channel = f"user-{user_id}"
    queue = events.subscribe(channel)

    async def event_generator():
        try:
            yield f"data: {json.dumps({'type': 'connected', 'userId': user_id})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {json.dumps(message, default=str)}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'ping'})}\n\n"
        finally:
            events.unsubscribe(channel, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

# ── HEALTH ──
@app.get("/")
async def root():
    return {"message": "TaskFlow API v2 🚀", "docs": "/api/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(status_code=500, content={"success": False, "message": str(exc), "data": None})
