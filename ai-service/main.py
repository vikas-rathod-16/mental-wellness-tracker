from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import openai
from dotenv import load_dotenv
import os
import re
import json
import numpy as np
import cv2

try:
    import librosa
except ImportError:
    librosa = None

# Load environment variables
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = OPENAI_API_KEY

app = FastAPI(
    title="AI Service - Mental Wellness",
    description="AI microservice for stress detection: text, voice, and face.",
    version="1.0.0",
)

# # Load once at startup — these XML files ship in this project folder
# (ai-service/haarcascade_*.xml) rather than relying on opencv-python's
# bundled data path, which isn't reliable across all opencv builds.
_here = os.path.dirname(os.path.abspath(__file__))
face_cascade = cv2.CascadeClassifier(
    os.path.join(_here, "haarcascade_frontalface_default.xml")
)
smile_cascade = cv2.CascadeClassifier(
    os.path.join(_here, "haarcascade_smile.xml")
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


# ---------------------- MODELS ----------------------

class TextRequest(BaseModel):
    text: str


# ---------------------- HELPERS ----------------------

def calculate_stress_from_emotion(emotion: str) -> int:
    """Simple mapping emotion → stress %"""
    mapping = {
        "angry": 85,
        "fear": 75,
        "sad": 65,
        "neutral": 40,
        "happy": 20,
    }
    return mapping.get(emotion.lower(), 50)


# ---------------------- TEXT ANALYSIS ----------------------

POSITIVE_WORDS = {
    "happy", "good", "great", "calm", "relaxed", "fine", "excited",
    "joyful", "peaceful", "content", "grateful", "confident", "hopeful",
}
NEGATIVE_WORDS = {
    "stressed", "anxious", "sad", "angry", "tired", "worried",
    "overwhelmed", "depressed", "scared", "nervous", "frustrated",
    "exhausted", "panicked", "hopeless",
}


def heuristic_stress(text: str):
    """Simple keyword-based fallback used when no OpenAI key is configured
    or the OpenAI call fails, so the demo keeps working either way."""
    words = re.findall(r"[a-zA-Z']+", text.lower())
    neg = sum(1 for w in words if w in NEGATIVE_WORDS)
    pos = sum(1 for w in words if w in POSITIVE_WORDS)
    score = 50 + neg * 15 - pos * 15
    score = max(0, min(100, score))
    emotion = "stressed" if score > 60 else "calm" if score < 40 else "neutral"
    return emotion, score


@app.post("/analyze-text")
async def analyze_text(payload: TextRequest):
    """
    Returns { emotion, stress, sentimentScore, source }.
    Uses OpenAI if OPENAI_API_KEY is set; otherwise falls back to a
    lightweight keyword heuristic so the endpoint always works.
    """
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    if OPENAI_API_KEY:
        try:
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Analyze the emotional stress level (0-100) of this text: {text}. "
                            'Respond with ONLY compact JSON like {"emotion": "...", "stress_score": 0}, '
                            "no other text."
                        ),
                    }
                ],
            )
            content = response.choices[0].message.content.strip()
            content = re.sub(r"^```(json)?|```$", "", content, flags=re.IGNORECASE).strip()
            data = json.loads(content)
            score = int(data.get("stress_score", 50))
            return {
                "emotion": data.get("emotion", "unknown"),
                "stress": score,
                "sentimentScore": score,
                "source": "openai",
            }
        except Exception as e:
            print(f"OpenAI text analysis failed, using heuristic fallback: {e}")

    emotion, score = heuristic_stress(text)
    return {"emotion": emotion, "stress": score, "sentimentScore": score, "source": "heuristic"}


# ---------------------- VOICE ANALYSIS ----------------------

@app.post("/analyze-voice")
async def analyze_voice(file: UploadFile = File(...)):
    """
    Basic pitch + energy based stress detection from voice.
    """
    try:
        audio_data = await file.read()

        filename = "temp_voice.wav"
        with open(filename, "wb") as f:
            f.write(audio_data)

        signal, sr = librosa.load(filename)

        pitch = librosa.yin(signal, fmin=80, fmax=450)
        energy = np.mean(signal ** 2)

        stress_score = min(100, int((np.mean(pitch) / 300) * 100 + energy * 50))

        return {
            "pitch_avg": float(np.mean(pitch)),
            "energy": float(energy),
            "stress_score": stress_score
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------- FACE ANALYSIS ----------------------

@app.post("/analyze-face")
async def analyze_face(file: UploadFile = File(...)):
    """
    Lightweight face-based mood check using OpenCV's built-in face and
    smile detectors (Haar cascades) — no TensorFlow/deep model needed.

    This is a simple heuristic, not true deep-learning emotion recognition:
    smiling -> "happy", face but no smile -> "neutral".
    """
    try:
        image_bytes = await file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5)

        if len(faces) == 0:
            raise HTTPException(status_code=422, detail="No face detected")

        # Use the largest detected face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        face_roi = gray[y:y + h, x:x + w]

        smiles = smile_cascade.detectMultiScale(
            face_roi, scaleFactor=1.7, minNeighbors=22
        )

        if len(smiles) > 0:
            emotion, confidence = "happy", 0.75
        else:
            emotion, confidence = "neutral", 0.55

        stress_score = calculate_stress_from_emotion(emotion)

        return {
            "emotion": emotion,
            "confidence": confidence,
            "stress_score": stress_score,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------- SERVER ----------------------

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)