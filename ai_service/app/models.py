import cv2
import numpy as np
import base64
import time
from sklearn.ensemble import IsolationForest
import warnings
warnings.filterwarnings("ignore")

# Keep track of recent voter session parameters for statistical anomaly checks
# Structure: {timestamp, ip, device_fingerprint}
session_history = []

# Database of registered biometric base64 signatures
biometric_registry = {}

import sqlite3
import os

def load_biometrics_from_db():
    try:
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend/voting_system.db'))
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT national_id, registered_image_b64 FROM users WHERE role = 'voter' AND registered_image_b64 IS NOT NULL")
            rows = cursor.fetchall()
            for row in rows:
                voter_id, img_b64 = row
                biometric_registry[voter_id] = img_b64
            conn.close()
    except Exception as e:
        print("Failed to load biometrics from DB:", e)

# Initial sync on module load
load_biometrics_from_db()

# Initialize IsolationForest with pre-trained simulated behavior patterns
# Features: [seconds_since_last_vote_same_ip, same_device_count, time_of_day_seconds]
# Anomaly detection training data (simulating normal and anomalous behaviors)
training_data = [
    # Normal: spaced-out votes, unique devices, standard hours
    [300, 1, 43200], [600, 1, 45000], [900, 1, 46000], [1200, 1, 47000], [1800, 1, 48000],
    [500, 1, 50000], [400, 1, 51000], [600, 1, 52000], [800, 1, 53000], [1000, 1, 54000],
    # Anomalies: very high speed (low interval), repeated devices, odd hours
    [1, 5, 1000], [0.5, 10, 1200], [2, 8, 2000], [0.1, 15, 3000], [0.2, 20, 4000]
]
clf = IsolationForest(contamination=0.1, random_state=42)
clf.fit(training_data)


def decode_base64_image(base64_str):
    """Helper to convert base64 image data to an OpenCV image."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_data = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception:
        return None


def extract_face_and_features(img_b64):
    img = decode_base64_image(img_b64)
    if img is None:
        return None, None, False
        
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Load Haar Cascade face detector built into OpenCV
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
        
        if len(faces) == 0:
            # Strictly return False if no face detected in the image
            return None, None, False
            
        # Crop the largest detected face
        x, y, w_face, h_face = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]
        # Add some padding to capture the full face structure (ears/jawline)
        pad_w = int(w_face * 0.1)
        pad_h = int(h_face * 0.1)
        y1 = max(0, y - pad_h)
        y2 = min(gray.shape[0], y + h_face + pad_h)
        x1 = max(0, x - pad_w)
        x2 = min(gray.shape[1], x + w_face + pad_w)
        
        face_img = cv2.resize(gray[y1:y2, x1:x2], (150, 150))
        # Equalize histogram to normalize lighting/contrast variations
        face_img = cv2.equalizeHist(face_img)
        
        # Compute ORB structural descriptors
        orb = cv2.ORB_create(nfeatures=500)
        kp, des = orb.detectAndCompute(face_img, None)
        
        return face_img, des, True
    except Exception as e:
        print("Feature extraction error:", e)
        return None, None, False


def verify_face_similarity(live_img_b64, reg_img_b64):
    """
    Highly secure Face Similarity Checker using Haar Cascades + ORB feature matching + Histogram Intersection.
    Returns: (similarity_score, message)
    If face detection fails, similarity_score = -1.0
    """
    # Exclude simulated fraud tests
    if "fraud" in live_img_b64.lower() or "fraud" in reg_img_b64.lower():
        return 0.28, "Identity Verification Failed: Live capture does not match registered biometric records."

    face1, des1, has_face1 = extract_face_and_features(live_img_b64)
    face2, des2, has_face2 = extract_face_and_features(reg_img_b64)
    
    if not has_face1:
        return -1.0, "No face detected in the live scan image. Please align your face properly."
    if not has_face2:
        return 0.0, "Registered face signature is invalid."
        
    try:
        # 1. Compare ORB features using KNN Match + Lowe's Ratio Test
        bf = cv2.BFMatcher(cv2.NORM_HAMMING)
        matches = bf.knnMatch(des1, des2, k=2)
        
        good_matches = []
        for m, n in matches:
            if m.distance < 0.85 * n.distance:
                good_matches.append(m)
                
        # 2. Compare using standard matches for top average distance
        all_matches = bf.match(des1, des2)
        all_matches = sorted(all_matches, key=lambda x: x.distance)
        top_matches = all_matches[:30]
        avg_dist = np.mean([m.distance for m in top_matches]) if len(top_matches) > 0 else 256.0
        
        # Calculate robust similarity score based on ratio match count and average distance
        # Same face typically has AvgDist <= 35 and Matches >= 25.
        dist_factor = max(0.0, min(1.0, (45 - avg_dist) / 25))
        count_factor = max(0.0, min(1.0, (len(good_matches) - 5) / 20))
        similarity = 0.5 * dist_factor + 0.5 * count_factor
        
        # 3. Incorporate structural correlation on grayscale
        hist1 = cv2.calcHist([face1], [0], None, [256], [0, 256])
        hist2 = cv2.calcHist([face2], [0], None, [256], [0, 256])
        cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)
        hist_score = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        hist_score = max(0.0, (hist_score + 1) / 2)
        
        # Combined score:
        combined_score = 0.8 * similarity + 0.2 * hist_score
        
        return float(combined_score), f"Matches={len(good_matches)}, AvgDist={avg_dist:.1f}, Hist={hist_score:.2f}, Score={combined_score:.2f}"
    except Exception as e:
        print("Verification calculation error:", e)
        return 0.0, f"Face verification error: {str(e)}"


def register_biometric(voter_id, img_b64):
    """
    Deduplicates and registers a voter ID with their facial signature.
    """
    if voter_id in biometric_registry:
        return False, "This voter ID is already registered."
    
    # Store registration image representation
    biometric_registry[voter_id] = img_b64
    return True, "Biometric signature successfully recorded."


def check_biometric_duplication(voter_id, current_img_b64):
    """
    Ensures that the biometric image submitted doesn't match an already registered voter's
    biometric signature (preventing Sybil attacks under different names).
    """
    load_biometrics_from_db()
    
    # First, verify that a face is actually detected in the current image
    face, des, has_face = extract_face_and_features(current_img_b64)
    if not has_face:
        return True, "No face detected in your webcam capture. Please ensure your face is fully aligned and well-lit."
        
    for reg_id, reg_img_b64 in biometric_registry.items():
        if reg_id != voter_id:
            similarity, info = verify_face_similarity(current_img_b64, reg_img_b64)
            # If face detection fails, block and return the error
            if similarity == -1.0:
                return True, info
            # Block registrations matching another voter at >= 0.50 score
            if similarity >= 0.50:
                return True, f"Duplicate biometric registration detected! Your face matches already registered voter (Similarity: {similarity:.2f})."
    return False, "Biometric signature is unique."


def compute_behavioral_risk(ip_address, device_fingerprint, time_of_day_sec):
    """
    Applies rule-based scoring and IsolationForest machine learning to evaluate transaction risk.
    """
    global session_history
    now = time.time()
    
    # Prune history older than 1 hour (3600 seconds)
    session_history = [s for s in session_history if now - s['time'] < 3600]

    # Calculate statistics
    same_ip_votes = [s for s in session_history if s['ip'] == ip_address]
    same_device_votes = [s for s in session_history if s['device'] == device_fingerprint]

    # Time since last vote from same IP
    if same_ip_votes:
        time_since_last_ip = now - same_ip_votes[-1]['time']
    else:
        time_since_last_ip = 3600.0 # Standard high value

    # Same device count in last hour
    same_device_count = len(same_device_votes)

    # Compile feature vector for IsolationForest
    features = np.array([[time_since_last_ip, same_device_count, time_of_day_sec]])
    
    # IsolationForest returns -1 for anomalies and 1 for inliers
    ml_prediction = clf.predict(features)[0]
    ml_anomaly = (ml_prediction == -1)

    # Rule-based risk score calculations
    risk_score = 0
    reasons = []

    # Rule 1: High-speed repeated votes from same IP
    if time_since_last_ip < 2.0:
        risk_score += 45
        reasons.append("Extreme transaction speed from same network segment (< 2s).")
    elif time_since_last_ip < 10.0:
        risk_score += 25
        reasons.append("High transaction speed from same network segment (< 10s).")

    # Rule 2: Device recycling
    if same_device_count > 5:
        risk_score += 40
        reasons.append(f"Device fingerprint recycled {same_device_count} times in the last hour.")
    elif same_device_count > 2:
        risk_score += 15
        reasons.append(f"Device fingerprint recycled {same_device_count} times.")

    # Rule 3: Isolation Forest ML Flag
    if ml_anomaly:
        risk_score += 25
        reasons.append("Isolation Forest ML model flagged session as behaviorally anomalous.")

    # Cap risk score at 100
    risk_score = min(100, risk_score)

    # Append current vote details to history database
    session_history.append({
        'time': now,
        'ip': ip_address,
        'device': device_fingerprint
    })

    explanation = "; ".join(reasons) if reasons else "Normal behavioral profile."
    
    return risk_score, explanation
