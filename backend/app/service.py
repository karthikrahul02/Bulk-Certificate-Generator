from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from .certificate import generate_certificate_png
from .config import OUTPUT_DIR
from .models import CertificateJob, CertificateRecipient, JobStatus, RecipientStatus
from .schemas import JobCreate


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def create_job(db: Session, payload: JobCreate) -> CertificateJob:
    job = CertificateJob(
        id=str(uuid4()),
        event_name=payload.event_name,
        course_name=payload.course_name,
        issued_on=payload.issued_on,
        status=JobStatus.PENDING.value,
        total_count=len(payload.recipients),
    )
    db.add(job)
    for index, recipient in enumerate(payload.recipients, start=1):
        db.add(
            CertificateRecipient(
                id=str(uuid4()),
                job=job,
                position=index,
                name=recipient.name,
                email=recipient.email,
                certificate_title=recipient.certificate_title,
            )
        )
    db.commit()
    db.refresh(job)
    process_job(db, job.id)
    return get_job(db, job.id)


def get_job(db: Session, job_id: str) -> CertificateJob:
    job = db.get(CertificateJob, job_id)
    if not job:
        raise KeyError(job_id)
    return job


def list_jobs(db: Session) -> list[CertificateJob]:
    return list(db.scalars(select(CertificateJob).order_by(CertificateJob.created_at.desc())).all())


def process_job(db: Session, job_id: str) -> None:
    job = get_job(db, job_id)
    job.status = JobStatus.PROCESSING.value
    db.commit()

    for recipient in job.recipients:
        error = validate_recipient(recipient.name, recipient.email)
        if error:
            mark_failed(recipient, error)
            continue

        try:
            output_path = OUTPUT_DIR / job.id / f"{recipient.position:04d}-{safe_name(recipient.name or 'certificate')}.png"
            generate_certificate_png(
                recipient_name=recipient.name or "",
                event_name=job.event_name,
                course_name=job.course_name,
                issued_on=job.issued_on,
                certificate_title=recipient.certificate_title,
                output_path=output_path,
            )
            recipient.status = RecipientStatus.GENERATED.value
            recipient.file_path = str(output_path)
            recipient.error_message = None
        except Exception as exc:
            mark_failed(recipient, str(exc))

    success_count = sum(1 for item in job.recipients if item.status == RecipientStatus.GENERATED.value)
    failed_count = sum(1 for item in job.recipients if item.status == RecipientStatus.FAILED.value)
    job.success_count = success_count
    job.failed_count = failed_count
    if success_count == job.total_count:
        job.status = JobStatus.COMPLETED.value
    elif success_count > 0:
        job.status = JobStatus.COMPLETED_WITH_ERRORS.value
    else:
        job.status = JobStatus.FAILED.value
    db.commit()


def validate_recipient(name: str | None, email: str | None) -> str | None:
    if not name or not name.strip():
        return "Recipient name is required"
    if not email or not EMAIL_RE.match(email.strip()):
        return "A valid recipient email is required"
    return None


def mark_failed(recipient: CertificateRecipient, message: str) -> None:
    recipient.status = RecipientStatus.FAILED.value
    recipient.error_message = message
    recipient.file_path = None


def safe_name(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip()).strip("-").lower()
    return cleaned[:48] or "certificate"


def progress_for(job: CertificateJob) -> int:
    if job.total_count == 0:
        return 0
    completed = job.success_count + job.failed_count
    return round(completed / job.total_count * 100)


def download_url(recipient: CertificateRecipient) -> str | None:
    if recipient.status != RecipientStatus.GENERATED.value:
        return None
    return f"/jobs/{recipient.job_id}/certificates/{recipient.id}"


def certificate_path(recipient: CertificateRecipient) -> Path | None:
    if not recipient.file_path:
        return None
    path = Path(recipient.file_path)
    return path if path.exists() else None
