from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import datetime

# Import models functions
try:
    from app.models import (
        verify_face_similarity,
        register_biometric,
        check_biometric_duplication,
        compute_behavioral_risk
    )
except ImportError:
    from .models import (
        verify_face_similarity,
        register_biometric,
        check_biometric_duplication,
        compute_behavioral_risk
    )

app = FastAPI(
    title="Blockchain-Based Voting System AI Microservice",
    description="Exposes endpoints for biometric duplicate check, face match validation, and behavioral threat detection.",
    version="1.0.0"
)

# CORS setup for dashboard calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class FaceVerifyRequest(BaseModel):
    live_image: str
    registered_image: str

class BiometricRegisterRequest(BaseModel):
    voter_id: str
    biometric_image: str

class DuplicateCheckRequest(BaseModel):
    voter_id: str
    biometric_image: str

class RiskAnalysisRequest(BaseModel):
    ip_address: str
    device_fingerprint: str
    time_of_day_sec: Optional[int] = None


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AI Fraud & Biometric Verification Engine",
        "timestamp": datetime.datetime.now().isoformat()
    }


@app.post("/api/verify-face")
def api_verify_face(request: FaceVerifyRequest):
    similarity, message = verify_face_similarity(request.live_image, request.registered_image)
    match_status = similarity >= 0.55
    return {
        "similarity": similarity,
        "match": match_status,
        "message": message
    }


@app.post("/api/register-biometric")
def api_register_biometric(request: BiometricRegisterRequest):
    success, message = register_biometric(request.voter_id, request.biometric_image)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {
        "success": True,
        "message": message
    }


@app.post("/api/check-duplicate")
def api_check_duplicate(request: DuplicateCheckRequest):
    is_duplicate, message = check_biometric_duplication(request.voter_id, request.biometric_image)
    return {
        "is_duplicate": is_duplicate,
        "message": message
    }


@app.post("/api/analyze-behavior")
def api_analyze_behavior(request: RiskAnalysisRequest):
    # Set default time of day in seconds if not provided
    time_sec = request.time_of_day_sec
    if time_sec is None:
        now = datetime.datetime.now()
        time_sec = now.hour * 3600 + now.minute * 60 + now.second

    risk_score, explanation = compute_behavioral_risk(
        request.ip_address,
        request.device_fingerprint,
        time_sec
    )

    # Determine if system should flag this attempt based on policy
    # Risk score > 40 initiates a fraud flag requiring human operator review
    flagged = risk_score >= 40

    return {
        "risk_score": risk_score,
        "explanation": explanation,
        "flagged": flagged
    }
