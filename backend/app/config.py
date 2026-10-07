from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'certificate_jobs.db'}")
OUTPUT_DIR = Path(os.getenv("CERTIFICATE_OUTPUT_DIR", BASE_DIR / "generated_certificates"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
