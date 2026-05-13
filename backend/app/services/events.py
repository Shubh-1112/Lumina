import asyncio
from typing import Dict, List
from collections import defaultdict

# In-memory event bus: projectId -> list of subscriber queues
_subscribers: Dict[str, List[asyncio.Queue]] = defaultdict(list)

def subscribe(project_id: str) -> asyncio.Queue:
    q = asyncio.Queue(maxsize=50)
    _subscribers[project_id].append(q)
    return q

def unsubscribe(project_id: str, q: asyncio.Queue):
    try:
        _subscribers[project_id].remove(q)
    except ValueError:
        pass
    if not _subscribers[project_id]:
        del _subscribers[project_id]

async def broadcast(project_id: str, event_type: str, data: dict):
    """Broadcast an event to all subscribers of a project."""
    message = {"type": event_type, "data": data}
    dead = []
    for q in _subscribers.get(project_id, []):
        try:
            q.put_nowait(message)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        unsubscribe(project_id, q)
