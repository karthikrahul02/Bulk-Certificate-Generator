from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .config import FRONTEND_ORIGIN
from .database import get_db, init_db
from .models import CertificateRecipient
from .schemas import JobCreate, JobDetail, JobSummary, RecipientResult
from .service import certificate_path, create_job, download_url, get_job, list_jobs, progress_for


app = FastAPI(title="Bulk Certificate Generator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in FRONTEND_ORIGIN.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {"ok": True, "service": "bulk-certificate-generator"}


@app.post("/jobs", response_model=JobDetail, status_code=201)
def submit_job(payload: JobCreate, db: Session = Depends(get_db)) -> JobDetail:
    return serialize_job(create_job(db, payload))


@app.get("/jobs", response_model=list[JobSummary])
def jobs(db: Session = Depends(get_db)) -> list[JobSummary]:
    return [JobSummary.model_validate(job) for job in list_jobs(db)]


@app.get("/jobs/{job_id}", response_model=JobDetail)
def job_status(job_id: str, db: Session = Depends(get_db)) -> JobDetail:
    try:
        job = get_job(db, job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc
    return serialize_job(job)


@app.get("/jobs/{job_id}/certificates/{recipient_id}")
def retrieve_certificate(job_id: str, recipient_id: str, db: Session = Depends(get_db)) -> FileResponse:
    recipient = db.get(CertificateRecipient, recipient_id)
    if not recipient or recipient.job_id != job_id:
        raise HTTPException(status_code=404, detail="Certificate not found")
    path = certificate_path(recipient)
    if not path:
        raise HTTPException(status_code=404, detail="Generated certificate file is not available")
    return FileResponse(path, media_type="image/png", filename=path.name)


def serialize_job(job) -> JobDetail:
    recipients = []
    for recipient in job.recipients:
        item = RecipientResult.model_validate(recipient)
        item.download_url = download_url(recipient)
        recipients.append(item)

    return JobDetail(
        id=job.id,
        event_name=job.event_name,
        course_name=job.course_name,
        issued_on=job.issued_on,
        status=job.status,
        total_count=job.total_count,
        success_count=job.success_count,
        failed_count=job.failed_count,
        progress_percent=progress_for(job),
        recipients=recipients,
    )
