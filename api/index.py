from fastapi import FastAPI

from backend.app.main import app as backend_app


app = FastAPI(title="Bulk Certificate Generator Vercel Gateway")
app.mount("/api", backend_app)
