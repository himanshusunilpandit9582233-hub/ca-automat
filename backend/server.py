from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import secrets

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Create the main app
app = FastAPI(title="CA Automation System", version="1.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
onboarding_router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

# ==========================================
# 32-BIT STATUS BITMASK SYSTEM
# ==========================================
# 
# status_code is a combination of multiple flags stored in a single integer
# using bitwise operations. Each verification step is a POWER OF 2:
#
# Bit Position | Value | Binary    | Meaning
# -------------|-------|-----------|------------------
# Bit 0        | 1     | 0b0000001 | PAN Verified
# Bit 1        | 2     | 0b0000010 | GST Verified
# Bit 2        | 4     | 0b0000100 | CIN Verified
# Bit 3        | 8     | 0b0001000 | Consent Given
# Bit 4        | 16    | 0b0010000 | AIS Access Approved
# Bit 5        | 32    | 0b0100000 | ITR Data Fetched
# Bit 6        | 64    | 0b1000000 | Account Created
#
# BITMASK OPERATIONS:
# ------------------
# SET a flag:    status = status | BIT_VALUE     (bitwise OR)
# CHECK a flag:  (status & BIT_VALUE) != 0       (bitwise AND)
# REMOVE a flag: status = status & ~BIT_VALUE    (bitwise AND NOT)
#
# EXAMPLE:
# --------
# User completes PAN (1) and GST (2) verification:
# Initial:  status = 0           (0b0000000)
# After PAN: status = 0 | 1 = 1  (0b0000001) - PAN flag is ON
# After GST: status = 1 | 2 = 3  (0b0000011) - PAN + GST flags are ON
#
# To check if PAN is verified: (3 & 1) = 1 != 0 → TRUE
# To check if CIN is verified: (3 & 4) = 0 == 0 → FALSE
#
class StatusBit:
    # Each value is a power of 2 (2^n) representing a single bit
    PAN_VERIFIED = 1        # 2^0 = 0b0000001
    GST_VERIFIED = 2        # 2^1 = 0b0000010
    CIN_VERIFIED = 4        # 2^2 = 0b0000100
    CONSENT_GIVEN = 8       # 2^3 = 0b0001000
    AIS_ACCESS = 16         # 2^4 = 0b0010000
    ITR_FETCHED = 32        # 2^5 = 0b0100000
    ACCOUNT_CREATED = 64    # 2^6 = 0b1000000

    @staticmethod
    def set_bit(status: int, bit_value: int) -> int:
        """
        Set a specific bit in the status code using bitwise OR.
        This ADDS the flag without affecting other flags.
        
        Example: set_bit(1, 2) = 1 | 2 = 3 (both PAN and GST flags ON)
        """
        return status | bit_value

    @staticmethod
    def check_bit(status: int, bit_value: int) -> bool:
        """
        Check if a specific bit is set using bitwise AND.
        
        Example: check_bit(3, 1) = (3 & 1) = 1 != 0 → True (PAN is verified)
        Example: check_bit(3, 4) = (3 & 4) = 0 == 0 → False (CIN not verified)
        """
        return (status & bit_value) != 0

    @staticmethod
    def remove_bit(status: int, bit_value: int) -> int:
        """
        Remove a specific bit from the status code using bitwise AND NOT.
        This REMOVES the flag without affecting other flags.
        
        Example: remove_bit(3, 1) = 3 & ~1 = 3 & -2 = 2 (only GST flag ON)
        """
        return status & ~bit_value

    @staticmethod
    def get_status_breakdown(status: int) -> Dict[str, bool]:
        """Get a breakdown of all status bits"""
        return {
            "pan_verified": StatusBit.check_bit(status, StatusBit.PAN_VERIFIED),
            "gst_verified": StatusBit.check_bit(status, StatusBit.GST_VERIFIED),
            "cin_verified": StatusBit.check_bit(status, StatusBit.CIN_VERIFIED),
            "consent_given": StatusBit.check_bit(status, StatusBit.CONSENT_GIVEN),
            "ais_access": StatusBit.check_bit(status, StatusBit.AIS_ACCESS),
            "itr_fetched": StatusBit.check_bit(status, StatusBit.ITR_FETCHED),
            "account_created": StatusBit.check_bit(status, StatusBit.ACCOUNT_CREATED),
        }

    @staticmethod
    def get_binary_string(status: int) -> str:
        """Get binary representation of status (7 bits)"""
        return format(status, '07b')

# Onboarding flow configuration
ONBOARDING_FLOWS = {
    "individual": ["pan", "consent"],
    "sole_proprietor": ["pan", "gst", "consent"],
    "opc": ["pan", "cin", "consent"],
    "pvt_ltd": ["cin", "gst", "director_pan", "consent"]
}

STEP_TO_BIT = {
    "pan": StatusBit.PAN_VERIFIED,
    "director_pan": StatusBit.PAN_VERIFIED,
    "gst": StatusBit.GST_VERIFIED,
    "cin": StatusBit.CIN_VERIFIED,
    "consent": StatusBit.CONSENT_GIVEN,
    "ais": StatusBit.AIS_ACCESS,
    "itr": StatusBit.ITR_FETCHED,
    "account": StatusBit.ACCOUNT_CREATED
}

# ==========================================
# PYDANTIC MODELS
# ==========================================
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class RoleSelection(BaseModel):
    role: str = Field(..., pattern="^(individual|sole_proprietor|opc|pvt_ltd)$")

class PANVerification(BaseModel):
    pan: str = Field(..., min_length=10, max_length=10)

class GSTVerification(BaseModel):
    gstin: str = Field(..., min_length=15, max_length=15)

class CINVerification(BaseModel):
    cin: str = Field(..., min_length=21, max_length=21)

class ConsentRequest(BaseModel):
    ais_consent: bool = False
    itr_consent: bool = False
    general_consent: bool = True

class UserDetails(BaseModel):
    pan: Optional[str] = None
    gstin: Optional[str] = None
    cin: Optional[str] = None
    business_name: Optional[str] = None
    director_name: Optional[str] = None

# ==========================================
# VERIFICATION KEY GENERATOR
# ==========================================
# Each verification step generates a unique key that can be used
# to verify the user's status anywhere in the system.
# Format: {step}_{user_id}_{timestamp_hash}
#
import hashlib

def generate_verification_key(user_id: str, step: str, value: str) -> str:
    """
    Generate a unique verification key for each step.
    This key is proof that the user completed this verification.
    
    Example keys:
    - PAN_KEY:  pan_abc123_x7f9k2m1
    - GST_KEY:  gst_abc123_p3n8q5w2
    - CIN_KEY:  cin_abc123_r4t6y8u9
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    raw_string = f"{user_id}:{step}:{value}:{timestamp}"
    hash_value = hashlib.sha256(raw_string.encode()).hexdigest()[:8]
    return f"{step}_{user_id[:8]}_{hash_value}"

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: Optional[str] = None
    created_at: str

class OnboardingStatusResponse(BaseModel):
    user_id: str
    status_code: int
    status_binary: str
    status_breakdown: Dict[str, bool]
    role: Optional[str]
    required_steps: List[str]
    completed_steps: List[str]
    pending_steps: List[str]
    progress_percentage: float
    user_details: Optional[Dict[str, Any]]

# ==========================================
# PASSWORD HASHING
# ==========================================
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# ==========================================
# JWT TOKEN MANAGEMENT
# ==========================================
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==========================================
# AUTH ENDPOINTS
# ==========================================
@auth_router.post("/register")
async def register(user_data: UserRegister, response: Response):
    email = user_data.email.lower()
    
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = hash_password(user_data.password)
    
    user_doc = {
        "email": email,
        "password_hash": password_hash,
        "name": user_data.name,
        "phone": user_data.phone,
        "role": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create onboarding status
    await db.onboarding_status.insert_one({
        "user_id": user_id,
        "status_code": 0,
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create tokens
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": email,
        "name": user_data.name,
        "phone": user_data.phone,
        "role": None,
        "created_at": user_doc["created_at"],
        "access_token": access_token
    }

@auth_router.post("/login")
async def login(user_data: UserLogin, response: Response):
    email = user_data.email.lower()
    
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "phone": user.get("phone"),
        "role": user.get("role"),
        "created_at": user["created_at"],
        "access_token": access_token
    }

@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@auth_router.get("/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {
        "id": user["_id"],
        "email": user["email"],
        "name": user["name"],
        "phone": user.get("phone"),
        "role": user.get("role"),
        "created_at": user["created_at"]
    }

@auth_router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        new_access_token = create_access_token(user_id, user["email"])
        
        response.set_cookie(key="access_token", value=new_access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        
        return {"message": "Token refreshed", "access_token": new_access_token}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ==========================================
# ONBOARDING ENDPOINTS
# ==========================================
@onboarding_router.post("/select-role")
async def select_role(role_data: RoleSelection, request: Request):
    user = await get_current_user(request)
    user_id = user["_id"]
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role_data.role}}
    )
    
    # Initialize user details
    existing_details = await db.user_details.find_one({"user_id": user_id})
    if not existing_details:
        await db.user_details.insert_one({
            "user_id": user_id,
            "pan": None,
            "gstin": None,
            "cin": None,
            "business_name": None,
            "director_name": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Role selected successfully", "role": role_data.role}

@onboarding_router.get("/status")
async def get_onboarding_status(request: Request):
    user = await get_current_user(request)
    user_id = user["_id"]
    role = user.get("role")
    
    onboarding = await db.onboarding_status.find_one({"user_id": user_id})
    if not onboarding:
        onboarding = {"user_id": user_id, "status_code": 0}
        await db.onboarding_status.insert_one({
            **onboarding,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    status_code = onboarding.get("status_code", 0)
    
    # Get required steps for role
    required_steps = ONBOARDING_FLOWS.get(role, []) if role else []
    
    # Calculate completed and pending steps
    completed_steps = []
    pending_steps = []
    
    for step in required_steps:
        bit_value = STEP_TO_BIT.get(step, 0)
        if StatusBit.check_bit(status_code, bit_value):
            completed_steps.append(step)
        else:
            pending_steps.append(step)
    
    # Calculate progress
    progress = (len(completed_steps) / len(required_steps) * 100) if required_steps else 0
    
    # Get user details
    user_details = await db.user_details.find_one({"user_id": user_id}, {"_id": 0, "user_id": 0})
    
    return {
        "user_id": user_id,
        "status_code": status_code,
        "status_binary": StatusBit.get_binary_string(status_code),
        "status_breakdown": StatusBit.get_status_breakdown(status_code),
        "role": role,
        "required_steps": required_steps,
        "completed_steps": completed_steps,
        "pending_steps": pending_steps,
        "progress_percentage": round(progress, 2),
        "user_details": user_details
    }

@onboarding_router.post("/pan-verify")
async def verify_pan(pan_data: PANVerification, request: Request):
    """
    Verify PAN and generate a unique PAN verification key.
    
    Bitmask Update: status_code = status_code | 1 (sets bit 0)
    
    Returns:
    - pan_key: Unique verification key for PAN (can be used anywhere)
    - status_code: Updated bitmask with PAN bit set
    """
    user = await get_current_user(request)
    user_id = user["_id"]
    
    # Mock PAN verification (placeholder for actual API)
    pan = pan_data.pan.upper()
    if not pan.startswith(("A", "B", "C", "F", "G", "H", "L", "J", "P", "T", "K")):
        raise HTTPException(status_code=400, detail="Invalid PAN format")
    
    # Generate unique PAN verification key
    pan_key = generate_verification_key(user_id, "pan", pan)
    
    # Update user details with PAN and verification key
    await db.user_details.update_one(
        {"user_id": user_id},
        {"$set": {
            "pan": pan,
            "pan_key": pan_key,
            "pan_verified_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Update status bitmask: status_code = status_code | PAN_VERIFIED (bit 0 = 1)
    onboarding = await db.onboarding_status.find_one({"user_id": user_id})
    current_status = onboarding.get("status_code", 0) if onboarding else 0
    new_status = StatusBit.set_bit(current_status, StatusBit.PAN_VERIFIED)  # new_status = current_status | 1
    
    await db.onboarding_status.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "status_code": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    logger.info(f"PAN verified for user {user_id}. Key: {pan_key}. Status: {current_status} | 1 = {new_status}")
    
    return {
        "message": "PAN verified successfully",
        "pan": pan,
        "pan_key": pan_key,  # Unique verification key for PAN
        "status_code": new_status,
        "bit_value": StatusBit.PAN_VERIFIED,  # 1 (2^0)
        "status_binary": StatusBit.get_binary_string(new_status)
    }

@onboarding_router.post("/gstin-verify")
async def verify_gstin(gst_data: GSTVerification, request: Request):
    """
    Verify GSTIN and generate a unique GST verification key.
    
    Bitmask Update: status_code = status_code | 2 (sets bit 1)
    
    Returns:
    - gst_key: Unique verification key for GST (can be used anywhere)
    - status_code: Updated bitmask with GST bit set
    """
    user = await get_current_user(request)
    user_id = user["_id"]
    
    # Mock GSTIN verification
    gstin = gst_data.gstin.upper()
    
    # Generate unique GST verification key
    gst_key = generate_verification_key(user_id, "gst", gstin)
    
    # Update user details with GSTIN and verification key
    await db.user_details.update_one(
        {"user_id": user_id},
        {"$set": {
            "gstin": gstin,
            "gst_key": gst_key,
            "gst_verified_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Update status bitmask: status_code = status_code | GST_VERIFIED (bit 1 = 2)
    onboarding = await db.onboarding_status.find_one({"user_id": user_id})
    current_status = onboarding.get("status_code", 0) if onboarding else 0
    new_status = StatusBit.set_bit(current_status, StatusBit.GST_VERIFIED)  # new_status = current_status | 2
    
    await db.onboarding_status.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "status_code": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    logger.info(f"GSTIN verified for user {user_id}. Key: {gst_key}. Status: {current_status} | 2 = {new_status}")
    
    return {
        "message": "GSTIN verified successfully",
        "gstin": gstin,
        "gst_key": gst_key,  # Unique verification key for GST
        "status_code": new_status,
        "bit_value": StatusBit.GST_VERIFIED,  # 2 (2^1)
        "status_binary": StatusBit.get_binary_string(new_status)
    }

@onboarding_router.post("/cin-verify")
async def verify_cin(cin_data: CINVerification, request: Request):
    """
    Verify CIN and generate a unique CIN verification key.
    
    Bitmask Update: status_code = status_code | 4 (sets bit 2)
    
    Returns:
    - cin_key: Unique verification key for CIN (can be used anywhere)
    - status_code: Updated bitmask with CIN bit set
    """
    user = await get_current_user(request)
    user_id = user["_id"]
    
    # Mock CIN verification
    cin = cin_data.cin.upper()
    
    # Generate unique CIN verification key
    cin_key = generate_verification_key(user_id, "cin", cin)
    
    # Update user details with CIN and verification key
    await db.user_details.update_one(
        {"user_id": user_id},
        {"$set": {
            "cin": cin,
            "cin_key": cin_key,
            "cin_verified_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Update status bitmask: status_code = status_code | CIN_VERIFIED (bit 2 = 4)
    onboarding = await db.onboarding_status.find_one({"user_id": user_id})
    current_status = onboarding.get("status_code", 0) if onboarding else 0
    new_status = StatusBit.set_bit(current_status, StatusBit.CIN_VERIFIED)  # new_status = current_status | 4
    
    await db.onboarding_status.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "status_code": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    logger.info(f"CIN verified for user {user_id}. Key: {cin_key}. Status: {current_status} | 4 = {new_status}")
    
    return {
        "message": "CIN verified successfully",
        "cin": cin,
        "cin_key": cin_key,  # Unique verification key for CIN
        "status_code": new_status,
        "bit_value": StatusBit.CIN_VERIFIED,  # 4 (2^2)
        "status_binary": StatusBit.get_binary_string(new_status)
    }

@onboarding_router.post("/consent")
async def submit_consent(consent_data: ConsentRequest, request: Request):
    """
    Submit consent and generate a unique consent verification key.
    
    Bitmask Updates:
    - General Consent: status_code = status_code | 8  (bit 3)
    - AIS Consent:     status_code = status_code | 16 (bit 4)
    - ITR Consent:     status_code = status_code | 32 (bit 5)
    - Account Created: status_code = status_code | 64 (bit 6) - auto when all steps done
    
    Returns:
    - consent_key: Unique verification key for consent
    - status_code: Updated bitmask with consent bits set
    """
    user = await get_current_user(request)
    user_id = user["_id"]
    
    onboarding = await db.onboarding_status.find_one({"user_id": user_id})
    current_status = onboarding.get("status_code", 0) if onboarding else 0
    new_status = current_status
    
    # Set consent bit: status_code = status_code | 8 (bit 3)
    if consent_data.general_consent:
        new_status = StatusBit.set_bit(new_status, StatusBit.CONSENT_GIVEN)
    
    # Set AIS access bit: status_code = status_code | 16 (bit 4)
    if consent_data.ais_consent:
        new_status = StatusBit.set_bit(new_status, StatusBit.AIS_ACCESS)
    
    # Set ITR fetched bit: status_code = status_code | 32 (bit 5)
    if consent_data.itr_consent:
        new_status = StatusBit.set_bit(new_status, StatusBit.ITR_FETCHED)
    
    # Auto-create account if all required steps are done: status_code = status_code | 64 (bit 6)
    role = user.get("role")
    if role:
        required_steps = ONBOARDING_FLOWS.get(role, [])
        all_done = True
        for step in required_steps:
            bit_value = STEP_TO_BIT.get(step, 0)
            if not StatusBit.check_bit(new_status, bit_value):
                all_done = False
                break
        
        if all_done:
            new_status = StatusBit.set_bit(new_status, StatusBit.ACCOUNT_CREATED)
    
    # Generate unique consent verification key
    consent_key = generate_verification_key(user_id, "consent", str(consent_data.general_consent))
    
    # Store consent key
    await db.user_details.update_one(
        {"user_id": user_id},
        {"$set": {
            "consent_key": consent_key,
            "consent_given_at": datetime.now(timezone.utc).isoformat(),
            "ais_consent": consent_data.ais_consent,
            "itr_consent": consent_data.itr_consent
        }},
        upsert=True
    )
    
    await db.onboarding_status.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "status_code": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    logger.info(f"Consent submitted for user {user_id}. Key: {consent_key}. Status: {current_status} -> {new_status}")
    
    return {
        "message": "Consent submitted successfully",
        "consent_key": consent_key,  # Unique verification key for consent
        "status_code": new_status,
        "bit_values": {
            "consent": StatusBit.CONSENT_GIVEN if consent_data.general_consent else 0,
            "ais": StatusBit.AIS_ACCESS if consent_data.ais_consent else 0,
            "itr": StatusBit.ITR_FETCHED if consent_data.itr_consent else 0,
            "account": StatusBit.ACCOUNT_CREATED if StatusBit.check_bit(new_status, StatusBit.ACCOUNT_CREATED) else 0
        },
        "status_binary": StatusBit.get_binary_string(new_status),
        "account_created": StatusBit.check_bit(new_status, StatusBit.ACCOUNT_CREATED)
    }

# ==========================================
# ADMIN/UTILITY ENDPOINTS
# ==========================================
@api_router.get("/")
async def root():
    return {"message": "CA Automation API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/onboarding-flows")
async def get_onboarding_flows():
    return {
        "flows": ONBOARDING_FLOWS,
        "bit_mapping": {
            "pan_verified": StatusBit.PAN_VERIFIED,
            "gst_verified": StatusBit.GST_VERIFIED,
            "cin_verified": StatusBit.CIN_VERIFIED,
            "consent_given": StatusBit.CONSENT_GIVEN,
            "ais_access": StatusBit.AIS_ACCESS,
            "itr_fetched": StatusBit.ITR_FETCHED,
            "account_created": StatusBit.ACCOUNT_CREATED
        }
    }

# ==========================================
# VERIFICATION KEY ENDPOINTS
# ==========================================
@onboarding_router.get("/verification-keys")
async def get_verification_keys(request: Request):
    """
    Get all verification keys for the current user.
    These unique keys can be used anywhere to verify the user's status.
    """
    user = await get_current_user(request)
    user_id = user["_id"]
    
    user_details = await db.user_details.find_one({"user_id": user_id}, {"_id": 0})
    
    if not user_details:
        return {"verification_keys": {}}
    
    keys = {}
    if user_details.get("pan_key"):
        keys["pan_key"] = user_details["pan_key"]
    if user_details.get("gst_key"):
        keys["gst_key"] = user_details["gst_key"]
    if user_details.get("cin_key"):
        keys["cin_key"] = user_details["cin_key"]
    if user_details.get("consent_key"):
        keys["consent_key"] = user_details["consent_key"]
    
    return {
        "user_id": user_id,
        "verification_keys": keys,
        "details": {
            "pan": user_details.get("pan"),
            "gstin": user_details.get("gstin"),
            "cin": user_details.get("cin")
        }
    }

@api_router.get("/verify-key/{key}")
async def verify_key(key: str):
    """
    Verify a verification key and get the associated user details.
    This endpoint can be used anywhere to verify a user's status.
    
    Example: /api/verify-key/pan_abc12345_x7f9k2m1
    """
    # Determine key type from prefix
    key_type = key.split("_")[0] if "_" in key else None
    
    if key_type not in ["pan", "gst", "cin", "consent"]:
        raise HTTPException(status_code=400, detail="Invalid key format")
    
    # Search for the key in user_details
    key_field = f"{key_type}_key"
    user_details = await db.user_details.find_one({key_field: key}, {"_id": 0})
    
    if not user_details:
        raise HTTPException(status_code=404, detail="Verification key not found")
    
    user_id = user_details.get("user_id")
    onboarding = await db.onboarding_status.find_one({"user_id": user_id})
    
    return {
        "valid": True,
        "key_type": key_type,
        "user_id": user_id,
        "status_code": onboarding.get("status_code", 0) if onboarding else 0,
        "verified_value": user_details.get(key_type) or user_details.get("gstin") if key_type == "gst" else user_details.get(key_type),
        "verified_at": user_details.get(f"{key_type}_verified_at") or user_details.get(f"{key_type}_given_at")
    }

# Include routers
api_router.include_router(auth_router)
api_router.include_router(onboarding_router)
app.include_router(api_router)

# CORS Configuration
frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
cors_origins = os.environ.get('CORS_ORIGINS', '*').split(',')
if frontend_url not in cors_origins:
    cors_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.onboarding_status.create_index("user_id")
    await db.user_details.create_index("user_id")
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
