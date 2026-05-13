from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from bson import ObjectId
from app.schemas.schemas import ProjectCreate, ProjectUpdate, MemberAdd, RoleAssign, InviteCreate
from app.database.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.services.serializers import (
    serialize_project, serialize_user, serialize_member_with_role,
    is_valid_object_id, get_member_role, can_manage_roles, is_member
)
from app.services import events
from app.services.notifier import create_notification
from app.config.config import settings
import secrets

router = APIRouter(prefix="/api/projects", tags=["Projects"])

async def get_project_or_404(project_id: str, db):
    if not is_valid_object_id(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

async def build_project_response(project: dict, db) -> dict:
    owner = await db.users.find_one({"_id": ObjectId(str(project["owner"]))})
    roles = project.get("memberRoles", {})
    members_with_roles = []
    for member_id in project.get("members", []):
        m = await db.users.find_one({"_id": ObjectId(str(member_id))})
        if m:
            role = "admin" if str(member_id) == str(project["owner"]) else roles.get(str(member_id), "member")
            members_with_roles.append(serialize_member_with_role(m, role))
    task_count = await db.tasks.count_documents({"project": project["_id"]})
    in_progress_count = await db.tasks.count_documents({"project": project["_id"], "status": "in_progress"})
    completed = await db.tasks.count_documents({"project": project["_id"], "status": "done"})
    return serialize_project(project, owner, members_with_roles, task_count, completed, in_progress_count)

# ── GET ALL PROJECTS ──
@router.get("")
async def get_projects(current_user=Depends(get_current_user), db=Depends(get_database)):
    user_id = current_user["_id"]
    projects = await db.projects.find({
        "$or": [{"owner": user_id}, {"members": user_id}]
    }).sort("updatedAt", -1).to_list(100)
    result = [await build_project_response(p, db) for p in projects]
    return {"success": True, "message": "Projects fetched", "data": result}

# ── CREATE PROJECT ──
@router.post("")
async def create_project(project_data: ProjectCreate, current_user=Depends(get_current_user), db=Depends(get_database)):
    now = datetime.now(timezone.utc)
    doc = {
        "name": project_data.name,
        "description": project_data.description,
        "color": project_data.color or "#3B82F6",
        "owner": current_user["_id"],
        "members": [current_user["_id"]],
        "memberRoles": {str(current_user["_id"]): "admin"},
        "inviteTokens": [],
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.projects.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"success": True, "message": "Project created", "data": await build_project_response(doc, db)}

# ── GET PROJECT ──
@router.get("/{project_id}")
async def get_project(project_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await get_project_or_404(project_id, db)
    if not is_member(project, current_user["_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    return {"success": True, "message": "Project fetched", "data": await build_project_response(project, db)}

# ── UPDATE PROJECT (admin only) ──
@router.put("/{project_id}")
async def update_project(project_id: str, project_data: ProjectUpdate, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await get_project_or_404(project_id, db)
    if str(project["owner"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only project admin can edit")
    update_fields = {k: v for k, v in project_data.dict().items() if v is not None}
    update_fields["updatedAt"] = datetime.now(timezone.utc)
    await db.projects.update_one({"_id": project["_id"]}, {"$set": update_fields})
    updated = await db.projects.find_one({"_id": project["_id"]})
    return {"success": True, "message": "Project updated", "data": await build_project_response(updated, db)}

# ── DELETE PROJECT (admin only) ──
@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await get_project_or_404(project_id, db)
    if str(project["owner"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only project admin can delete")
    await db.tasks.delete_many({"project": project["_id"]})
    await db.projects.delete_one({"_id": project["_id"]})
    return {"success": True, "message": "Project deleted", "data": None}

# ── ADD MEMBER BY EMAIL ──
@router.post("/{project_id}/members")
async def add_member(project_id: str, member_data: MemberAdd, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await get_project_or_404(project_id, db)
    if not can_manage_roles(project, current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only admin or manager can add members")
    member = await db.users.find_one({"email": member_data.email.lower()})
    if not member:
        raise HTTPException(status_code=404, detail="No user found with this email. Share the invite link instead.")
    if is_member(project, member["_id"]):
        raise HTTPException(status_code=400, detail="User is already a member")
    await db.projects.update_one({"_id": project["_id"]}, {
        "$push": {"members": member["_id"]},
        "$set": {f"memberRoles.{str(member['_id'])}": "member", "updatedAt": datetime.now(timezone.utc)}
    })
    await events.broadcast(project_id, "member_added", {"member": serialize_user(member)})
    # Notify the new member
    await create_notification(
        db, member["_id"],
        "member_added",
        "Added to a Project",
        f'You were added to the project "{project["name"]}".',
        project_id=project_id
    )
    return {"success": True, "message": f"{member['name']} added", "data": serialize_user(member)}

# ── REMOVE MEMBER ──
@router.delete("/{project_id}/members/{member_id}")
async def remove_member(project_id: str, member_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await get_project_or_404(project_id, db)
    
    caller_role = get_member_role(project, current_user["_id"])
    if caller_role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Only admin or manager can remove members")
    
    if not is_valid_object_id(member_id):
        raise HTTPException(status_code=400, detail="Invalid member ID")
    
    member_oid = ObjectId(member_id)
    target_role = get_member_role(project, member_oid)
    
    # Manager can only remove members, not other managers or admin
    if caller_role == "manager" and target_role in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Managers can only remove standard members")
    
    if member_oid == project["owner"]:
        raise HTTPException(status_code=400, detail="Cannot remove project owner")

    await db.projects.update_one({"_id": project["_id"]}, {
        "$pull": {"members": member_oid},
        "$unset": {f"memberRoles.{member_id}": ""},
        "$set": {"updatedAt": datetime.now(timezone.utc)}
    })
    await events.broadcast(project_id, "member_removed", {"memberId": member_id})
    
    # Also notify the specific user on their personal channel
    await events.broadcast(f"user-{member_id}", "REMOVED_FROM_PROJECT", {
        "projectId": project_id,
        "projectName": project["name"]
    })
    
    return {"success": True, "message": "Member removed", "data": None}

# ── ASSIGN ROLE (admin or manager) ──
@router.put("/{project_id}/members/{member_id}/role")
async def assign_role(project_id: str, member_id: str, role_data: RoleAssign, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await get_project_or_404(project_id, db)
    caller_role = get_member_role(project, current_user["_id"])
    
    if caller_role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Only admin or manager can assign roles")
    
    target_role_value = role_data.role.value if hasattr(role_data.role, "value") else str(role_data.role)
    
    # Only admin can grant/revoke manager role
    if target_role_value == "admin":
        raise HTTPException(status_code=403, detail="Cannot transfer admin role")
        
    if (target_role_value == "manager" or get_member_role(project, member_id) == "manager") and caller_role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can promote/demote managers")
        
    if not is_valid_object_id(member_id):
        raise HTTPException(status_code=400, detail="Invalid member ID")
    
    if not is_member(project, ObjectId(member_id)):
        raise HTTPException(status_code=404, detail="User is not a member of this project")
    await db.projects.update_one({"_id": project["_id"]}, {
        "$set": {f"memberRoles.{member_id}": role_data.role.value, "updatedAt": datetime.now(timezone.utc)}
    })
    await events.broadcast(project_id, "role_updated", {"memberId": member_id, "role": role_data.role.value})
    
    # Also notify the specific user on their personal channel for instant UI sync
    await events.broadcast(f"user-{member_id}", "ROLE_UPDATED", {
        "projectId": project_id,
        "projectName": project["name"],
        "role": role_data.role.value
    })
    
    # Notify the member whose role changed
    await create_notification(
        db, ObjectId(member_id),
        "role_changed",
        "Your Role Was Updated",
        f'Your role in "{project["name"]}" was changed to {role_data.role.value}.',
        project_id=project_id
    )
    return {"success": True, "message": f"Role updated to {role_data.role.value}", "data": None}

# ── GENERATE INVITE LINK ──
@router.post("/{project_id}/invite")
async def create_invite(project_id: str, invite_data: InviteCreate, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await get_project_or_404(project_id, db)
    if not can_manage_roles(project, current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only admin or manager can create invite links")
    token = secrets.token_urlsafe(24)
    expires_at = datetime.now(timezone.utc)
    from datetime import timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(days=invite_data.expiresInDays)
    invite_doc = {"token": token, "projectId": str(project["_id"]), "createdBy": str(current_user["_id"]), "expiresAt": expires_at, "used": False}
    await db.inviteTokens.insert_one(invite_doc)
    invite_url = f"{settings.FRONTEND_URL}/join?token={token}"
    return {"success": True, "message": "Invite link created", "data": {
        "token": token, "projectId": project_id, "projectName": project["name"],
        "inviteUrl": invite_url, "expiresAt": expires_at
    }}

# ── GET MEMBER TASKS (admin/manager only) ──
@router.get("/{project_id}/members/{member_id}/tasks")
async def get_member_tasks(project_id: str, member_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await get_project_or_404(project_id, db)
    if not is_member(project, current_user["_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    caller_role = get_member_role(project, current_user["_id"])
    if caller_role not in ("admin", "manager") and str(current_user["_id"]) != member_id:
        raise HTTPException(status_code=403, detail="Only admin or manager can view member tasks")
    if not is_valid_object_id(member_id):
        raise HTTPException(status_code=400, detail="Invalid member ID")

    member_oid = ObjectId(member_id)
    assigned_user = await db.users.find_one({"_id": member_oid})

    # Query tasks assigned to this member
    tasks = await db.tasks.find({
        "project": ObjectId(project_id),
        "assignedTo": member_oid
    }).to_list(100)

    from app.services.serializers import serialize_task
    result = []
    for t in tasks:
        # Safely fetch createdBy — may be missing on old tasks
        created_by = None
        if t.get("createdBy"):
            try:
                created_by = await db.users.find_one({"_id": ObjectId(str(t["createdBy"]))})
            except Exception:
                pass
        include_note = caller_role in ("admin", "manager")
        result.append(serialize_task(t, assigned_user, created_by or {}, include_note=include_note))


# ── GET JOIN REQUESTS (admin or manager) ──
@router.get("/{project_id}/requests")
async def get_join_requests(project_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await get_project_or_404(project_id, db)
    
    user_id_str = str(current_user["_id"])
    owner_id_str = str(project.get("owner"))
    role = project.get("memberRoles", {}).get(user_id_str, "member")
    
    if user_id_str == owner_id_str or role in ("admin", "manager"):
        requests = await db.joinRequests.find({
            "projectId": project_id,
            "status": "pending"
        }).to_list(100)
        return {"success": True, "message": "Requests fetched", "data": [{**r, "_id": str(r["_id"])} for r in requests]}
    
    raise HTTPException(status_code=403, detail="Only project admin or manager can view requests")

# ── APPROVE JOIN REQUEST (admin only) ──
@router.post("/{project_id}/requests/{request_id}/approve")
async def approve_join_request(project_id: str, request_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await get_project_or_404(project_id, db)
    caller_role = get_member_role(project, current_user["_id"])
    if caller_role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Only project admin or manager can approve requests")
    
    req = await db.joinRequests.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    user_id = ObjectId(req["userId"])
    
    # Add to project
    await db.projects.update_one({"_id": project["_id"]}, {
        "$push": {"members": user_id},
        "$set": {f"memberRoles.{str(user_id)}": "member", "updatedAt": datetime.now(timezone.utc)}
    })
    
    # Update request status
    await db.joinRequests.update_one({"_id": ObjectId(request_id)}, {"$set": {"status": "approved"}})
    
    # Notify user
    await create_notification(
        db, user_id,
        "request_approved",
        "Join Request Approved",
        f'Your request to join "{project["name"]}" has been approved!',
        project_id=project_id
    )
    
    # Notify user in real-time
    await events.broadcast(f"user-{str(user_id)}", "JOIN_REQUEST_ACCEPTED", {
        "projectId": project_id,
        "projectName": project["name"]
    })
    
    return {"success": True, "message": "Request approved and member added"}

# ── REJECT JOIN REQUEST (admin only) ──
@router.post("/{project_id}/requests/{request_id}/reject")
async def reject_join_request(project_id: str, request_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await get_project_or_404(project_id, db)
    caller_role = get_member_role(project, current_user["_id"])
    if caller_role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Only project admin or manager can reject requests")
    
    await db.joinRequests.update_one({"_id": ObjectId(request_id)}, {"$set": {"status": "rejected"}})
    return {"success": True, "message": "Request rejected"}

# ── GET ALL JOIN REQUESTS (for admin/manager) ──
@router.get("/requests/all")
async def get_all_join_requests(current_user=Depends(get_current_user), db=Depends(get_database)):
    # Find all projects where user is admin or manager
    user_id = current_user["_id"]
    managed_projects = await db.projects.find({
        "$or": [
            {"owner": user_id},
            {f"memberRoles.{str(user_id)}": {"$in": ["admin", "manager"]}}
        ]
    }).to_list(100)
    
    project_ids = [str(p["_id"]) for p in managed_projects]
    
    requests = await db.joinRequests.find({
        "projectId": {"$in": project_ids},
        "status": "pending"
    }).to_list(100)
    
    return {"success": True, "message": "All requests fetched", "data": [{**r, "_id": str(r["_id"])} for r in requests]}

