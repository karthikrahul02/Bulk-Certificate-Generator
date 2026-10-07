# Bulk Certificate Generator

Backend-focused assignment implementation for bulk certificate generation. The API accepts one job containing many recipients, validates each recipient, generates certificate PNGs from a single predefined template, tracks progress, records per-recipient failures, and exposes generated files for retrieval.

The project also includes a polished React UI for manually submitting jobs and demonstrating the workflow.

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy, SQLite, Pillow
- Frontend: React, TypeScript, Vite, CSS 3D visuals
- Tests: Python `unittest` with FastAPI `TestClient`

## Requirements Covered

- Bulk job submission through `POST /jobs`
- Recipient-level validation with isolated failures
- Predefined certificate template rendered with Pillow
- Relational storage for jobs and recipient results
- Progress/status endpoint through `GET /jobs/{job_id}`
- Generated certificate retrieval through `GET /jobs/{job_id}/certificates/{recipient_id}`
- Tests for job creation, input validation, generation, progress, individual failures, and retrieval

## Local Setup

Python dependencies are listed in `backend/requirements.txt`.

```bash
cd backend
python -m pip install -r requirements.txt
```

Install frontend dependencies from the repository root if needed:

```bash
npm install
```

## Run The Application

From the repository root:

```bash
npm run dev
```

Backend: `http://localhost:4000`  
Frontend: `http://localhost:5173`

You can also run only the backend:

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 4000
```

## Run Tests

```bash
npm test
```

or:

```bash
cd backend
python -m unittest discover -s tests -p "test_*.py"
```

## Submit A Certificate Generation Request

PowerShell example:

```powershell
$body = @{
  event_name = "Backend Cohort"
  course_name = "FastAPI Fundamentals"
  issued_on = "2026-10-07"
  recipients = @(
    @{ name = "Asha Rao"; email = "asha@example.com" },
    @{ name = "Dev Patel"; email = "dev@example.com"; certificate_title = "Certificate of Excellence" }
  )
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Method Post -Uri "http://localhost:4000/jobs" -ContentType "application/json" -Body $body
```

Response includes the job id, status, counts, progress, per-recipient result records, and `download_url` values for generated certificates.

## Retrieve Status And Certificates

```bash
curl http://localhost:4000/jobs/{job_id}
curl -L http://localhost:4000/jobs/{job_id}/certificates/{recipient_id} --output certificate.png
```

Generated files are stored under `backend/generated_certificates` by default. Set `CERTIFICATE_OUTPUT_DIR` to change that location.

## Design Decisions

- Generation is synchronous for this assignment. It keeps the implementation easy to run and explain while still modeling a durable job/result workflow. The service boundary in `backend/app/service.py` can be moved to a queue worker later without changing the API contract.
- SQLite is used as the relational database for frictionless local setup. SQLAlchemy keeps the persistence layer portable if PostgreSQL is required later.
- Recipient validation is performed per recipient during processing, so a bad row does not reject the whole bulk job.
- Certificate generation uses one predefined Pillow template, matching the assignment requirement to avoid a template editor or multiple designs.
- A deterministic `FAIL_CERTIFICATE` recipient name is supported only to test individual certificate generation failure behavior.
