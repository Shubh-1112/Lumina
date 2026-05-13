# Lumina API Documentation

Welcome to the Lumina API documentation. Lumina is a collaborative project and task management platform. This document outlines the available REST endpoints and real-time event streams.

## Base URL
The API is typically hosted at: `https://<your-domain>/api` (or `http://localhost:8000/api` in development).

---

## 🔐 Authentication

### POST `/auth/register`
Register a new user account.
- **Body**:
  ```json
  {
    "name": "Full Name",
    "email": "user@example.com",
    "password": "password123",
    "inviteToken": "optional_token_for_auto_join"
  }
  ```
- **Response**: `APIResponse` with user data and access token.

### POST `/auth/login`
Login to an existing account.
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**: `APIResponse` with user data and access token.

### POST `/auth/google`
Login or register using Google OAuth.
- **Body**:
  ```json
  {
    "credential": "google_oauth_token",
    "inviteToken": "optional_token"
  }
  ```
- **Response**: `APIResponse` with user data and access token.

### GET `/auth/me`
Get the current authenticated user's profile.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `APIResponse` containing user details.

### GET `/auth/users/search?q={query}`
Search for users by name or email.
- **Query Params**: `q` (search string)
- **Response**: List of matching users.

---

## 📁 Projects

### GET `/projects`
Get all projects the user is a member of.
- **Response**: List of projects with metadata (task count, completion rate, etc.).

### POST `/projects`
Create a new project.
- **Body**:
  ```json
  {
    "name": "Project Name",
    "description": "Optional description",
    "color": "#HEXCODE"
  }
  ```

### GET `/projects/{project_id}`
Get detailed information about a specific project, including members and their roles.

### PUT `/projects/{project_id}`
Update project settings (Name, description, color).
- **Permissions**: Admin only.

### DELETE `/projects/{project_id}`
Delete a project and all its associated tasks.
- **Permissions**: Admin only.

### POST `/projects/{project_id}/members`
Add a member to the project by email.
- **Body**: `{ "email": "user@example.com" }`
- **Permissions**: Admin or Manager.

### DELETE `/projects/{project_id}/members/{member_id}`
Remove a member from the project.
- **Permissions**: Admin or Manager.

### PUT `/projects/{project_id}/members/{member_id}/role`
Assign a new role to a member.
- **Body**: `{ "role": "admin" | "manager" | "member" }`
- **Permissions**: Admin or Manager (Managers cannot promote/demote other managers).

### POST `/projects/{project_id}/invite`
Generate a public invite link.
- **Body**: `{ "expiresInDays": 7 }`
- **Permissions**: Admin or Manager.

---

## ✅ Tasks

### GET `/tasks/me`
Fetch all tasks assigned to the current user across **all** projects.
- **Response**: List of tasks with project context.

### GET `/projects/{project_id}/tasks`
Fetch tasks for a specific project.
- **Query Params**:
  - `status`: Filter by status (`todo`, `in_progress`, `done`)
  - `priority`: Filter by priority (`lowest`, `low`, `medium`, `high`, `urgent`)
  - `search`: Search task titles.

### POST `/projects/{project_id}/tasks`
Create a new task in a project.
- **Body**:
  ```json
  {
    "title": "Task Title",
    "description": "Details",
    "priority": "medium",
    "status": "todo",
    "dueDate": "ISO-8601-Date",
    "assignedTo": "user_id",
    "autoPriority": true
  }
  ```
- **Permissions**: Admin or Manager.

### PUT `/projects/{project_id}/tasks/{task_id}`
Full task update.
- **Permissions**: Admin or Manager.

### PATCH `/projects/{project_id}/tasks/{task_id}/status`
Update task status and add an optional note.
- **Body**:
  ```json
  {
    "status": "done",
    "statusNote": "Finished earlier than expected"
  }
  ```
- **Permissions**: Assignee, Admin, or Manager.

### DELETE `/projects/{project_id}/tasks/{task_id}`
Delete a task.
- **Permissions**: Admin or Manager.

---

## 📊 Analytics

### GET `/projects/{project_id}/analytics`
Get project-wide statistics and metrics.
- **Data returned**:
  - Task breakdown (Status & Priority)
  - Member workload (Tasks assigned vs completed)
  - Weekly creation & completion trends
  - Overdue task counts
  - Completion percentage

---

## 🔔 Notifications & Real-time

### GET `/notifications`
Get recent notifications for the current user.

### PATCH `/notifications/{id}/read`
Mark a single notification as read.

### PATCH `/notifications/read-all`
Mark all notifications as read.

### DELETE `/notifications`
Clear all notifications for the user.

### 📡 Server-Sent Events (SSE)
Lumina uses SSE for real-time updates:
- `/api/events/{project_id}`: Stream for project-wide updates (tasks created, status changes, member updates).
- `/api/events/user/{user_id}`: Personal stream for notifications and role changes.

---

## 🔗 Joins & Invites

### GET `/invite/{token}`
Public endpoint to check if an invite link is valid and get project metadata.

### POST `/invite/{token}/join`
Send a join request to a project via an invite link. Requires authentication.

### GET `/projects/{project_id}/requests`
Get pending join requests for a project.
- **Permissions**: Admin or Manager.

### POST `/projects/{project_id}/requests/{request_id}/approve`
Approve a member's request to join.
- **Permissions**: Admin or Manager.

### POST `/projects/{project_id}/requests/{request_id}/reject`
Reject a join request.
- **Permissions**: Admin or Manager.
