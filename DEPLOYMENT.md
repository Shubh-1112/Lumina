# Deployment Guide: Project Management System

This guide provides instructions for deploying **both** the backend and frontend using **Render**. 

Render is recommended for this project because it supports persistent connections, which are required for the **Real-time SSE** features (notifications and live task updates).

## 1. Backend Deployment (Render Web Service)

1. **Create a New Web Service**:
   - In Render, click **"New +"** > **"Web Service"**.
   - Connect your GitHub repository.
   - **Name**: `taskflow-backend` (or your choice).
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app`

2. **Environment Variables**:
   Click **"Advanced"** and add:
   - `MONGODB_URL`: Your MongoDB Atlas connection string.
   - `DATABASE_NAME`: `taskflow`
   - `SECRET_KEY`: A long random string (for JWT security).
   - `FRONTEND_URL`: Your Render **Frontend** URL (e.g., `https://taskflow.onrender.com`).
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.

## 2. Frontend Deployment (Render Static Site)

1. **Create a New Static Site**:
   - In Render, click **"New +"** > **"Static Site"**.
   - Connect your GitHub repository.
   - **Name**: `taskflow-frontend` (or your choice).
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`

2. **Environment Variables**:
   Add these in the **Environment** tab:
   - `VITE_API_URL`: Your Render **Backend** URL + `/api` (e.g., `https://taskflow-backend.onrender.com/api`).
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.

3. **Redirects/Rewrites**:
   - Go to **"Redirects/Rewrites"** in the Render sidebar.
   - Add a rule:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite`
   - *This ensures React Router works correctly on page refreshes.*

## 3. Google OAuth Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services > Credentials**.
3. Edit your OAuth 2.0 Client ID.
4. **Authorized JavaScript Origins**:
   - Add `http://localhost:5173` (for development).
   - Add your Render **Frontend** URL.
5. **Authorized Redirect URIs**:
   - Add your Render **Frontend** URL.

## 4. Database Setup (MongoDB Atlas)
1. In your Atlas Dashboard, go to **Network Access**.
2. **IP Access List**: Add `0.0.0.0/0` (Allow Access from Anywhere) or find Render's outbound IP ranges (advanced).
3. Ensure your connection string in `MONGODB_URL` is correct.

## 5. Verification
1. Open your Frontend URL.
2. Login using Google or email.
3. Verify that task updates appear instantly across tabs (SSE test).
