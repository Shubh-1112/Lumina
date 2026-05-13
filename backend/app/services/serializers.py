from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

def serialize_user(user: dict) -> Optional[dict]:
    if not user or not user.get("_id"):
        return {"id": "", "name": "Unknown", "email": "", "avatar": None, "createdAt": None}
    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "avatar": user.get("avatar"),
        "createdAt": user.get("createdAt"),
    }

def serialize_member_with_role(user: dict, role: str = "member") -> Optional[dict]:
    if not user:
        return None
    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "avatar": user.get("avatar"),
        "role": role,
    }

def serialize_project(project: dict, owner: dict, members_with_roles: list, task_count: int = 0, completed_count: int = 0, in_progress_count: int = 0) -> dict:
    return {
        "id": str(project["_id"]),
        "name": project.get("name", ""),
        "description": project.get("description"),
        "color": project.get("color", "#3B82F6"),
        "owner": serialize_user(owner),
        "members": members_with_roles,
        "taskCount": task_count,
        "completedTaskCount": completed_count,
        "inProgressTaskCount": in_progress_count,
        "createdAt": project.get("createdAt"),
        "updatedAt": project.get("updatedAt"),
    }

def compute_dynamic_priority(task: dict) -> str:
    """Auto-escalate priority based on how close the deadline is."""
    if not task.get("autoPriority", True):
        return task.get("priority", "medium")
    if task.get("status") == "done":
        return task.get("priority", "medium")
    due = task.get("dueDate")
    if not due:
        return task.get("priority", "medium")
    if isinstance(due, str):
        try:
            due = datetime.fromisoformat(due.replace('Z', '+00:00'))
        except Exception:
            return task.get("priority", "medium")
    
    # Ensure due is offset-aware for comparison
    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)
        
    now = datetime.now(timezone.utc)
    diff_days = (due - now).total_seconds() / 86400
    stored = task.get("priority", "medium")
    priority_rank = {"low": 0, "medium": 1, "high": 2, "urgent": 3}
    # Compute auto priority
    if diff_days < 0:
        auto = "urgent"
    elif diff_days < 1:
        auto = "urgent"
    elif diff_days < 3:
        auto = "high"
    elif diff_days < 7:
        auto = "medium"
    else:
        auto = stored  # keep user-set priority if far away
    # Only escalate, never de-escalate
    return auto if priority_rank.get(auto, 0) > priority_rank.get(stored, 0) else stored

def serialize_task(task: dict, assigned_user: Optional[dict], created_by: dict, include_note: bool = False) -> dict:
    priority = compute_dynamic_priority(task)
    return {
        "id": str(task["_id"]),
        "title": task.get("title", ""),
        "description": task.get("description"),
        "priority": priority,
        "status": task.get("status", "todo"),
        "dueDate": task.get("dueDate"),
        "assignedTo": serialize_user(assigned_user) if assigned_user else None,
        "project": str(task.get("project")),
        "createdBy": serialize_user(created_by),
        "autoPriority": task.get("autoPriority", True),
        "createdAt": task.get("createdAt"),
        "updatedAt": task.get("updatedAt"),
        "statusNote": task.get("statusNote") if include_note else None,
    }

def is_valid_object_id(id_str: str) -> bool:
    try:
        ObjectId(id_str)
        return True
    except Exception:
        return False

def get_member_role(project: dict, user_id) -> str:
    """Get the role of a user in a project."""
    owner_id = project.get("owner")
    if str(owner_id) == str(user_id):
        return "admin"
    roles = project.get("memberRoles", {})
    return roles.get(str(user_id), "member")

def can_manage_roles(project: dict, user_id) -> bool:
    """Admin or manager can manage roles."""
    role = get_member_role(project, user_id)
    return role in ("admin", "manager")

def is_member(project: dict, user_id) -> bool:
    owner_id = project.get("owner")
    if str(owner_id) == str(user_id):
        return True
    return any(str(m) == str(user_id) for m in project.get("members", []))
