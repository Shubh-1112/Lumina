from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"

class TaskPriority(str, Enum):
    LOWEST = "lowest"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class MemberRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"

# ──────────────────────────────────────────
# AUTH SCHEMAS
# ──────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    inviteToken: Optional[str] = None  # for auto-join via invite link

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    inviteToken: Optional[str] = None  # for auto-join via invite link

class GoogleLogin(BaseModel):
    credential: str
    inviteToken: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar: Optional[str] = None
    createdAt: Optional[datetime] = None

# ──────────────────────────────────────────
# PROJECT SCHEMAS
# ──────────────────────────────────────────
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    color: Optional[str] = "#3B82F6"

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    color: Optional[str] = None

class MemberAdd(BaseModel):
    email: EmailStr

class RoleAssign(BaseModel):
    userId: str
    role: MemberRole

class MemberWithRole(BaseModel):
    id: str
    name: str
    email: str
    avatar: Optional[str] = None
    role: MemberRole = MemberRole.MEMBER

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#3B82F6"
    owner: UserResponse
    members: List[MemberWithRole] = []
    taskCount: int = 0
    completedTaskCount: int = 0
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

# ──────────────────────────────────────────
# TASK SCHEMAS
# ──────────────────────────────────────────
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = Field(None, max_length=2000)
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    dueDate: Optional[datetime] = None
    assignedTo: Optional[str] = None
    autoPriority: bool = True  # auto-escalate priority near deadline

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = Field(None, max_length=2000)
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    dueDate: Optional[datetime] = None
    assignedTo: Optional[str] = None
    autoPriority: Optional[bool] = None

class TaskStatusUpdate(BaseModel):
    """Assignee-only status update with optional private note"""
    status: TaskStatus
    statusNote: Optional[str] = Field(None, max_length=1000)

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    priority: TaskPriority
    status: TaskStatus
    dueDate: Optional[datetime] = None
    assignedTo: Optional[UserResponse] = None
    project: str
    createdBy: UserResponse
    autoPriority: bool = True
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    # statusNote only included when caller is admin/manager
    statusNote: Optional[str] = None

# ──────────────────────────────────────────
# INVITE SCHEMAS
# ──────────────────────────────────────────
class InviteCreate(BaseModel):
    expiresInDays: int = Field(7, ge=1, le=30)

class InviteResponse(BaseModel):
    token: str
    projectId: str
    projectName: str
    inviteUrl: str
    expiresAt: datetime

# ──────────────────────────────────────────
# STANDARD RESPONSE
# ──────────────────────────────────────────
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
