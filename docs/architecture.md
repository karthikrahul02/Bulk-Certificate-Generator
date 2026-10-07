# Architecture

Request flow:

`FastAPI route -> Pydantic request validation -> Certificate service -> SQLAlchemy models -> SQLite -> Pillow certificate renderer`

The API creates a durable job and recipient rows before processing. Processing then validates each recipient independently. Valid recipients are rendered to PNG files and marked `GENERATED`; invalid rows or rendering failures are marked `FAILED` with an error message.

Status is derived from recipient outcomes:

- `COMPLETED`: every recipient generated successfully
- `COMPLETED_WITH_ERRORS`: at least one generated and at least one failed
- `FAILED`: every recipient failed
- `PROCESSING`: reserved for active processing

The service is synchronous by design for the assignment. The same `process_job` boundary can later be called from a background worker or queue without changing the public API.
