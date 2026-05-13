from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone
from app.database.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.services.serializers import is_valid_object_id, is_member, compute_dynamic_priority

router = APIRouter(prefix="/api/projects/{project_id}/analytics", tags=["Analytics"])

@router.get("")
async def get_analytics(project_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    if not is_valid_object_id(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not is_member(project, current_user["_id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    tasks = await db.tasks.find({"project": ObjectId(project_id)}).to_list(1000)
    now = datetime.now(timezone.utc)

    # ── STATUS BREAKDOWN ──
    status_counts = {"todo": 0, "in_progress": 0, "done": 0}
    for t in tasks:
        # Normalize status to lowercase and handle variations
        s = str(t.get("status", "todo")).lower().strip()
        if s in ("in progress", "active", "processing"):
            s = "in_progress"
        elif s in ("completed", "finished", "success"):
            s = "done"
        elif s not in status_counts:
            # Fallback for unknown statuses to avoid key errors
            s = "todo"
        
        status_counts[s] += 1

    # ── PRIORITY BREAKDOWN (dynamic) ──
    priority_counts = {"low": 0, "medium": 0, "high": 0, "urgent": 0}
    for t in tasks:
        p = compute_dynamic_priority(t)
        priority_counts[p] = priority_counts.get(p, 0) + 1

    # ── OVERDUE TASKS ──
    def is_overdue(t):
        due = t.get("dueDate")
        if not due:
            return False
        if str(t.get("status", "")).lower() == "done":
            return False
        # Ensure comparison between offset-aware datetimes
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        return due < now

    overdue = [t for t in tasks if is_overdue(t)]

    # ── COMPLETION RATE ──
    total = len(tasks)
    done_count = status_counts["done"]
    completion_rate = round((done_count / total * 100) if total else 0, 1)

    # ── MEMBER WORKLOAD ──
    member_workload = {}
    for t in tasks:
        aid = t.get("assignedTo")
        if aid:
            key = str(aid)
            if key not in member_workload:
                user = await db.users.find_one({"_id": ObjectId(key)})
                member_workload[key] = {"name": user["name"] if user else "Unknown", "total": 0, "done": 0, "overdue": 0}
            
            member_workload[key]["total"] += 1
            s = str(t.get("status", "")).lower().strip()
            if s in ("done", "completed", "finished"):
                member_workload[key]["done"] += 1
            if is_overdue(t):
                member_workload[key]["overdue"] += 1

    # ── TASKS CREATED OVER TIME (last 30 days by week) ──
    from collections import defaultdict
    weekly = defaultdict(int)
    for t in tasks:
        created = t.get("createdAt")
        if created:
            # Ensure created is datetime
            if isinstance(created, str):
                try: created = datetime.fromisoformat(created.replace('Z', '+00:00'))
                except: continue
            week = created.strftime("%Y-W%U")
            weekly[week] += 1
    weekly_sorted = dict(sorted(weekly.items())[-8:])  # last 8 weeks

    # ── TASKS COMPLETED OVER TIME ──
    weekly_done = defaultdict(int)
    for t in tasks:
        s = str(t.get("status", "")).lower().strip()
        if s in ("done", "completed", "finished"):
            updated = t.get("updatedAt")
            if updated:
                if isinstance(updated, str):
                    try: updated = datetime.fromisoformat(updated.replace('Z', '+00:00'))
                    except: continue
                week = updated.strftime("%Y-W%U")
                weekly_done[week] += 1
    weekly_done_sorted = dict(sorted(weekly_done.items())[-8:])

    return {
        "success": True,
        "message": "Analytics fetched",
        "data": {
            "summary": {
                "total": total,
                "done": done_count,
                "inProgress": status_counts["in_progress"],
                "todo": status_counts["todo"],
                "overdue": len(overdue),
                "completionRate": completion_rate,
                "memberCount": len(project.get("members", [])),
            },
            "statusBreakdown": status_counts,
            "priorityBreakdown": priority_counts,
            "memberWorkload": list(member_workload.values()),
            "weeklyCreated": weekly_sorted,
            "weeklyCompleted": weekly_done_sorted,
            "overdueCount": len(overdue),
        }
    }
