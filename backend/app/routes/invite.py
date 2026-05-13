from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId
from app.database.database import get_database
from app.middleware.auth_middleware import get_current_user, get_current_user_silent
from app.services.serializers import serialize_user
from app.services import events

router = APIRouter(prefix="/api/invite", tags=["Invite"])

@router.get("/{token}")
async def get_invite_info(token: str, current_user=Depends(get_current_user_silent), db=Depends(get_database)):
    """Public endpoint — get info about an invite (no auth required)"""
    print(f"🔍 DEBUG: Fetching invite info for token: {token}")
    invite = await db.inviteTokens.find_one({"token": token})
    if not invite:
        print(f"❌ DEBUG: Invite not found for token: {token}")
        raise HTTPException(status_code=404, detail="Invite link is invalid or expired")
    if invite.get("expiresAt"):
        expires_at = invite["expiresAt"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Invite link has expired")
    project = await db.projects.find_one({"_id": ObjectId(invite["projectId"])})
    if not project:
        raise HTTPException(status_code=404, detail="Project no longer exists")
    
    # Check membership status if logged in
    status = "none"
    if current_user:
        user_id = str(current_user["_id"])
        members = project.get("members") or []
        # Already a member?
        if any(str(m) == user_id for m in members):
            status = "member"
        else:
            # Pending request?
            existing_request = await db.joinRequests.find_one({
                "projectId": str(invite["projectId"]),
                "userId": user_id,
                "status": "pending"
            })
            if existing_request:
                status = "pending"
    
    return {"success": True, "message": "Invite valid", "data": {
        "token": token,
        "projectId": invite["projectId"],
        "projectName": project["name"],
        "projectColor": project.get("color", "#3B82F6"),
        "expiresAt": invite.get("expiresAt"),
        "status": status
    }}

@router.post("/{token}/join")
async def request_to_join(token: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    """Authenticated user sends a join request via invite token"""
    invite = await db.inviteTokens.find_one({"token": token})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite link is invalid")
    
    project_oid = ObjectId(invite["projectId"])
    project = await db.projects.find_one({"_id": project_oid})
    if not project:
        raise HTTPException(status_code=404, detail="Project no longer exists")

    user_id = current_user["_id"]
    # Check if already a member
    if any(str(m) == str(user_id) for m in project.get("members", [])):
        return {"success": True, "message": "You are already a member of this project", "data": {"projectId": str(project_oid), "status": "member"}}

    # Check if already has a pending request
    existing_request = await db.joinRequests.find_one({
        "projectId": str(project_oid),
        "userId": str(user_id),
        "status": "pending"
    })
    if existing_request:
        return {"success": True, "message": "Your join request is already pending approval.", "data": {"status": "pending"}}

    # Create join request
    new_request = {
        "projectId": str(project_oid),
        "projectName": project["name"],
        "userId": str(user_id),
        "userName": current_user["name"],
        "userEmail": current_user["email"],
        "userAvatar": current_user.get("avatar"),
        "status": "pending",
        "createdAt": datetime.now(timezone.utc)
    }
    await db.joinRequests.insert_one(new_request)
    
    # Notify owner in real-time
    owner_id = str(project.get("owner"))
    await events.broadcast(f"user-{owner_id}", "NEW_JOIN_REQUEST", {
        "projectId": str(project_oid),
        "projectName": project["name"],
        "userName": current_user["name"]
    })

    return {"success": True, "message": "Request sent! Wait for the admin to approve you.", "data": {"status": "pending"}}
