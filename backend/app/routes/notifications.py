from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from app.database.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.services.serializers import is_valid_object_id

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

def serialize_notif(n: dict) -> dict:
    return {
        "id": str(n["_id"]),
        "type": n.get("type", "info"),
        "title": n.get("title", ""),
        "message": n.get("message", ""),
        "projectId": n.get("projectId"),
        "taskId": n.get("taskId"),
        "read": n.get("read", False),
        "createdAt": n.get("createdAt"),
    }

# ── GET ALL NOTIFICATIONS FOR CURRENT USER ──
@router.get("")
async def get_notifications(current_user=Depends(get_current_user), db=Depends(get_database)):
    notifs = await db.notifications.find(
        {"userId": current_user["_id"]}
    ).sort("createdAt", -1).to_list(50)
    return {
        "success": True,
        "message": "Notifications fetched",
        "data": [serialize_notif(n) for n in notifs],
        "unreadCount": sum(1 for n in notifs if not n.get("read", False)),
    }

# ── MARK ONE AS READ ──
@router.patch("/{notif_id}/read")
async def mark_read(notif_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    if not is_valid_object_id(notif_id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    await db.notifications.update_one(
        {"_id": ObjectId(notif_id), "userId": current_user["_id"]},
        {"$set": {"read": True}}
    )
    return {"success": True, "message": "Marked as read", "data": None}

# ── MARK ALL AS READ ──
@router.patch("/read-all")
async def mark_all_read(current_user=Depends(get_current_user), db=Depends(get_database)):
    await db.notifications.update_many(
        {"userId": current_user["_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"success": True, "message": "All notifications marked as read", "data": None}

# ── DELETE ALL ──
@router.delete("")
async def clear_notifications(current_user=Depends(get_current_user), db=Depends(get_database)):
    await db.notifications.delete_many({"userId": current_user["_id"]})
    return {"success": True, "message": "Notifications cleared", "data": None}
