"""
Notification helper — call these from any route to persist
a notification in MongoDB and push it live via SSE.
"""
from datetime import datetime, timezone
from bson import ObjectId
from app.services import events


async def create_notification(db, user_id, notif_type: str, title: str, message: str,
                               project_id: str = None, task_id: str = None):
    """Persist a notification and broadcast it via SSE."""
    if not user_id:
        return
    doc = {
        "userId": ObjectId(str(user_id)),
        "type": notif_type,          # task_assigned | member_added | task_done | task_overdue | role_changed
        "title": title,
        "message": message,
        "projectId": project_id,
        "taskId": task_id,
        "read": False,
        "createdAt": datetime.now(timezone.utc),
    }
    result = await db.notifications.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Push live to user's personal SSE channel (user-{id})
    channel = f"user-{str(user_id)}"
    await events.broadcast(channel, "notification", {
        "id": str(doc["_id"]),
        "type": notif_type,
        "title": title,
        "message": message,
        "projectId": project_id,
        "taskId": task_id,
        "read": False,
        "createdAt": str(doc["createdAt"]),
    })
