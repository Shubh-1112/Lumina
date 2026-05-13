from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskStatusUpdate
from app.database.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.services.serializers import serialize_task, is_valid_object_id, get_member_role, is_member, compute_dynamic_priority
from app.services import events
from app.services.notifier import create_notification

router = APIRouter(prefix="/api/projects/{project_id}/tasks", tags=["Tasks"])
me_router = APIRouter(prefix="/api/tasks/me", tags=["My Tasks"])

@me_router.get("")
async def get_my_tasks(current_user=Depends(get_current_user), db=Depends(get_database)):
    """Fetch all tasks assigned to the current user across all projects."""
    user_id = current_user["_id"]
    tasks = await db.tasks.find({
        "$or": [
            {"assignedTo": user_id},
            {"assignedTo": str(user_id)}
        ]
    }).sort("dueDate", 1).to_list(100)
    
    # We need to build responses with project names for the dashboard
    result = []
    for t in tasks:
        project = await db.projects.find_one({"_id": t["project"]})
        prio = compute_dynamic_priority(t)
        task_data = {
            "id": str(t["_id"]),
            "title": t.get("title", ""),
            "description": t.get("description", ""),
            "status": t.get("status", "todo"),
            "priority": prio,
            "dueDate": t.get("dueDate"),
            "projectName": project.get("name", "Unknown Project") if project else "Deleted Project",
            "projectId": str(t["project"])
        }
        result.append(task_data)
    
    return {"success": True, "message": "My tasks fetched", "data": result}

async def check_project_access(project_id: str, user, db):
    if not is_valid_object_id(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not is_member(project, user["_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    return project

async def build_task_response(task: dict, db, caller_role: str = "member") -> dict:
    assigned_user = None
    if task.get("assignedTo"):
        try:
            assigned_user = await db.users.find_one({"_id": ObjectId(str(task["assignedTo"]))})
        except Exception:
            pass
    created_by = {}
    if task.get("createdBy"):
        try:
            created_by = await db.users.find_one({"_id": ObjectId(str(task["createdBy"]))}) or {}
        except Exception:
            pass
    include_note = caller_role in ("admin", "manager")
    return serialize_task(task, assigned_user, created_by, include_note=include_note)


# ── GET ALL TASKS ──
@router.get("")
async def get_tasks(
    project_id: str,
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    project = await check_project_access(project_id, current_user, db)
    caller_role = get_member_role(project, current_user["_id"])
    query = {"project": ObjectId(project_id)}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    tasks = await db.tasks.find(query).sort("createdAt", -1).to_list(500)
    result = [await build_task_response(t, db, caller_role) for t in tasks]
    return {"success": True, "message": "Tasks fetched", "data": result}

# ── CREATE TASK (admin/manager only) ──
@router.post("")
async def create_task(project_id: str, task_data: TaskCreate, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await check_project_access(project_id, current_user, db)
    caller_role = get_member_role(project, current_user["_id"])
    if caller_role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Only admin or manager can create tasks")
    assigned_to_oid = None
    if task_data.assignedTo and is_valid_object_id(task_data.assignedTo):
        assigned_to_oid = ObjectId(task_data.assignedTo)
    now = datetime.now(timezone.utc)
    # Ensure assignee is a member of the project
    if assigned_to_oid:
        # Check if already a member
        is_member = any(str(m) == str(assigned_to_oid) for m in project.get("members", []))
        if not is_member:
            await db.projects.update_one(
                {"_id": ObjectId(project_id)},
                {
                    "$push": {"members": assigned_to_oid},
                    "$set": {f"memberRoles.{str(assigned_to_oid)}": "member", "updatedAt": now}
                }
            )
            # Notify user they were added
            await events.broadcast(f"user-{assigned_to_oid}", "project_refresh", {"projectId": project_id})

    task_doc = {
        "title": task_data.title,
        "description": task_data.description,
        "priority": task_data.priority.value,
        "status": task_data.status.value,
        "dueDate": task_data.dueDate,
        "assignedTo": assigned_to_oid,
        "project": ObjectId(project_id),
        "createdBy": current_user["_id"],
        "autoPriority": task_data.autoPriority,
        "statusNote": None,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.tasks.insert_one(task_doc)
    task_doc["_id"] = result.inserted_id
    serialized = await build_task_response(task_doc, db, caller_role)
    await events.broadcast(project_id, "task_created", serialized)

    # Notify assignee
    if assigned_to_oid:
        project_doc = await db.projects.find_one({"_id": ObjectId(project_id)})
        await create_notification(
            db, assigned_to_oid,
            "task_assigned",
            "Task Assigned to You",
            f'"{task_data.title}" was assigned to you in {project_doc.get("name", "a project")}.',
            project_id=project_id, task_id=str(result.inserted_id)
        )

    return {"success": True, "message": "Task created", "data": serialized}

# ── GET SINGLE TASK ──
@router.get("/{task_id}")
async def get_task(project_id: str, task_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await check_project_access(project_id, current_user, db)
    caller_role = get_member_role(project, current_user["_id"])
    if not is_valid_object_id(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "project": ObjectId(project_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "message": "Task fetched", "data": await build_task_response(task, db, caller_role)}

# ── UPDATE TASK (admin/manager only) ──
@router.put("/{task_id}")
async def update_task(project_id: str, task_id: str, task_data: TaskUpdate, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await check_project_access(project_id, current_user, db)
    caller_role = get_member_role(project, current_user["_id"])
    if caller_role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Only admin or manager can edit tasks. Use /status to update your task status.")
    if not is_valid_object_id(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "project": ObjectId(project_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    raw = task_data.dict(exclude_unset=True)
    update_fields = {}
    priority_explicitly_set = "priority" in raw

    for k, v in raw.items():
        if k == "assignedTo":
            # Empty string means unassign
            if v and is_valid_object_id(str(v)):
                update_fields[k] = ObjectId(str(v))
            else:
                update_fields[k] = None
        elif k in ("priority", "status"):
            # Handle both Pydantic v1 (enum obj) and v2 (string)
            update_fields[k] = v.value if hasattr(v, "value") else str(v)
        elif k == "dueDate":
            update_fields[k] = v  # datetime or None
        elif v is not None:
            update_fields[k] = v

    # If user explicitly picked a priority, disable auto-escalation
    if priority_explicitly_set:
        update_fields["autoPriority"] = False

    update_fields["updatedAt"] = datetime.now(timezone.utc)
    await db.tasks.update_one({"_id": task["_id"]}, {"$set": update_fields})
    updated = await db.tasks.find_one({"_id": task["_id"]})
    serialized = await build_task_response(updated, db, caller_role)
    await events.broadcast(project_id, "task_updated", serialized)
    
    # Notify all project members to refresh their project list
    for m in project.get("members", []):
        await events.broadcast(f"user-{str(m)}", "project_refresh", {"projectId": project_id})

    # Notify on new assignment and ensure they are added to project
    new_assignee = update_fields.get("assignedTo")
    if new_assignee:
        is_member = any(str(m) == str(new_assignee) for m in project.get("members", []))
        if not is_member:
            now = datetime.now(timezone.utc)
            await db.projects.update_one(
                {"_id": ObjectId(project_id)},
                {
                    "$push": {"members": new_assignee},
                    "$set": {f"memberRoles.{str(new_assignee)}": "member", "updatedAt": now}
                }
            )
            await events.broadcast(f"user-{new_assignee}", "project_refresh", {"projectId": project_id})
    old_assignee = task.get("assignedTo")
    if new_assignee and new_assignee != old_assignee and str(new_assignee) != str(current_user["_id"]):
        project_doc = await db.projects.find_one({"_id": ObjectId(project_id)})
        await create_notification(
            db, new_assignee,
            "task_assigned",
            "Task Assigned to You",
            f'"{task.get("title", "A task")}" was assigned to you in {project_doc.get("name", "a project")}.',
            project_id=project_id, task_id=task_id
        )

    return {"success": True, "message": "Task updated", "data": serialized}


# ── UPDATE STATUS (assignee only) ──
@router.patch("/{task_id}/status")
async def update_task_status(project_id: str, task_id: str, status_data: TaskStatusUpdate, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await check_project_access(project_id, current_user, db)
    caller_role = get_member_role(project, current_user["_id"])
    if not is_valid_object_id(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "project": ObjectId(project_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Only assignee or admin/manager can update status
    assigned_to = task.get("assignedTo")
    is_assignee = assigned_to and str(assigned_to) == str(current_user["_id"])
    if not is_assignee and caller_role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Only the assigned person can update this task's status")
    update_fields = {"status": status_data.status.value, "updatedAt": datetime.now(timezone.utc)}
    if status_data.statusNote is not None:
        update_fields["statusNote"] = status_data.statusNote
    await db.tasks.update_one({"_id": task["_id"]}, {"$set": update_fields})
    updated = await db.tasks.find_one({"_id": task["_id"]})
    serialized = await build_task_response(updated, db, caller_role)
    await events.broadcast(project_id, "task_updated", serialized)
    
    # Notify all project members to refresh their project list
    for member_id in project.get("members", []):
        await events.broadcast(f"user-{member_id}", "project_refresh", {"projectId": project_id})

    # Notify admin/managers when task is marked done
    if status_data.status.value == "done" and task.get("status") != "done":
        project_doc = await db.projects.find_one({"_id": ObjectId(project_id)})
        roles = project_doc.get("memberRoles", {})
        notify_ids = [project_doc["owner"]] + [
            ObjectId(uid) for uid, role in roles.items() if role == "manager"
        ]
        for mgr_id in notify_ids:
            if str(mgr_id) != str(current_user["_id"]):
                await create_notification(
                    db, mgr_id,
                    "task_done",
                    "Task Completed ✅",
                    f'"{task.get("title", "A task")}" was marked as done in {project_doc.get("name", "a project")}.',
                    project_id=project_id, task_id=task_id
                )

    return {"success": True, "message": "Status updated", "data": serialized}

# ── DELETE TASK (admin/manager) ──
@router.delete("/{task_id}")
async def delete_task(project_id: str, task_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    project = await check_project_access(project_id, current_user, db)
    caller_role = get_member_role(project, current_user["_id"])
    if caller_role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Only admin or manager can delete tasks")
    if not is_valid_object_id(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "project": ObjectId(project_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.tasks.delete_one({"_id": task["_id"]})
    await events.broadcast(project_id, "task_deleted", {"taskId": task_id})
    return {"success": True, "message": "Task deleted", "data": None}
