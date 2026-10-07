# API

Base URL: `http://localhost:4000`

## Health

`GET /health`

```json
{
  "ok": true,
  "service": "bulk-certificate-generator"
}
```

## Create Job

`POST /jobs`

```json
{
  "event_name": "Backend Cohort",
  "course_name": "FastAPI Fundamentals",
  "issued_on": "2026-10-07",
  "recipients": [
    {
      "name": "Asha Rao",
      "email": "asha@example.com"
    },
    {
      "name": "Dev Patel",
      "email": "dev@example.com",
      "certificate_title": "Certificate of Excellence"
    }
  ]
}
```

Returns `201` with the completed job detail for the synchronous implementation.

## List Jobs

`GET /jobs`

Returns summaries for recent jobs.

## Get Job Status

`GET /jobs/{job_id}`

Returns status, progress, counts, recipient results, errors, and download URLs.

## Retrieve Certificate

`GET /jobs/{job_id}/certificates/{recipient_id}`

Returns a generated `image/png` certificate. Failed recipient records do not have downloadable files.
