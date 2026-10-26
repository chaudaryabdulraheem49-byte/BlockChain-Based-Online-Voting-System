import os
import sys
import uvicorn

# Ensure the ai_service root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5000"))
    print(f"Starting AI Fraud Detection Microservice on http://{host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
