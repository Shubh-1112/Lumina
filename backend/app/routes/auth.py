from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from bson import ObjectId
from app.schemas.schemas import UserRegister, UserLogin, UserResponse, TokenResponse, GoogleLogin
from app.database.database import get_database
from app.utils.helpers import hash_password, verify_password, create_access_token, generate_avatar_url
from app.middleware.auth_middleware import get_current_user
from app.services.serializers import serialize_user
from app.config.config import settings
from google.oauth2 import id_token
from google.auth.transport import requests

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register")
async def register(user_data: UserRegister, db=Depends(get_database)):
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered. Please login instead."
        )

    hashed_pw = hash_password(user_data.password)
    avatar = generate_avatar_url(user_data.name)

    user_doc = {
        "name": user_data.name,
        "email": user_data.email.lower(),
        "password": hashed_pw,
        "avatar": avatar,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token({"sub": str(result.inserted_id)})

    return {
        "success": True,
        "message": "Account created successfully",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": serialize_user(user_doc)
        }
    }

@router.post("/login")
async def login(user_data: UserLogin, db=Depends(get_database)):
    user = await db.users.find_one({"email": user_data.email.lower()})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. Please sign up first."
        )

    if not verify_password(user_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again."
        )

    token = create_access_token({"sub": str(user["_id"])})

    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": serialize_user(user)
        }
    }

@router.post("/google")
async def google_auth(login_data: GoogleLogin, db=Depends(get_database)):
    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            login_data.credential, 
            requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        
        email = idinfo['email']
        name = idinfo.get('name', 'Google User')
        picture = idinfo.get('picture')

        # Check if user exists
        user = await db.users.find_one({"email": email.lower()})
        
        if not user:
            # Create new user
            user_doc = {
                "name": name,
                "email": email.lower(),
                "password": hash_password("OAUTH_USER_RANDOM_PW_" + str(ObjectId())), # Secure dummy password
                "avatar": picture or generate_avatar_url(name),
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
            }
            result = await db.users.insert_one(user_doc)
            user = await db.users.find_one({"_id": result.inserted_id})
        else:
            # Update avatar if it's from Google and changed
            if picture and user.get("avatar") != picture:
                await db.users.update_one({"_id": user["_id"]}, {"$set": {"avatar": picture, "updatedAt": datetime.now(timezone.utc)}})
                user["avatar"] = picture

        token = create_access_token({"sub": str(user["_id"])})

        return {
            "success": True,
            "message": "Login successful via Google",
            "data": {
                "access_token": token,
                "token_type": "bearer",
                "user": serialize_user(user)
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auth error: {str(e)}"
        )

@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return {
        "success": True,
        "message": "User fetched",
        "data": serialize_user(current_user)
    }

@router.get("/users/search")
async def search_users(q: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    """Search users by email or name"""
    users = await db.users.find({
        "$or": [
            {"email": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}}
        ],
        "_id": {"$ne": current_user["_id"]}
    }).limit(10).to_list(10)

    return {
        "success": True,
        "message": "Users found",
        "data": [serialize_user(u) for u in users]
    }
