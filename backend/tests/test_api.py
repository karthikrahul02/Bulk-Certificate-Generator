from __future__ import annotations

import shutil
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import service
from app.database import Base, get_db
from app.main import app


class CertificateApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.output_root = Path(__file__).resolve().parent / ".tmp-certificates"
        shutil.rmtree(self.output_root, ignore_errors=True)
        service.OUTPUT_DIR = self.output_root
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
        Base.metadata.create_all(bind=engine)

        def override_db():
            db = TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        shutil.rmtree(self.output_root, ignore_errors=True)

    def valid_payload(self):
        return {
            "event_name": "Backend Cohort",
            "course_name": "FastAPI Fundamentals",
            "issued_on": "2026-10-07",
            "recipients": [
                {"name": "Asha Rao", "email": "asha@example.com"},
                {"name": "Dev Patel", "email": "dev@example.com", "certificate_title": "Certificate of Excellence"},
            ],
        }

    def test_creating_generation_job_generates_certificates(self) -> None:
        response = self.client.post("/jobs", json=self.valid_payload())
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], "COMPLETED")
        self.assertEqual(body["success_count"], 2)
        self.assertEqual(body["failed_count"], 0)
        self.assertEqual(body["progress_percent"], 100)

    def test_input_validation_rejects_empty_bulk_request(self) -> None:
        payload = self.valid_payload()
        payload["recipients"] = []
        response = self.client.post("/jobs", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_invalid_recipient_fails_without_blocking_valid_recipient(self) -> None:
        payload = self.valid_payload()
        payload["recipients"].append({"name": "", "email": "not-an-email"})
        response = self.client.post("/jobs", json=payload)
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], "COMPLETED_WITH_ERRORS")
        self.assertEqual(body["success_count"], 2)
        self.assertEqual(body["failed_count"], 1)
        failed = [item for item in body["recipients"] if item["status"] == "FAILED"]
        self.assertIn("name is required", failed[0]["error_message"])

    def test_generation_failure_is_recorded_per_certificate(self) -> None:
        payload = self.valid_payload()
        payload["recipients"] = [
            {"name": "FAIL_CERTIFICATE", "email": "fail@example.com"},
            {"name": "Nia Shah", "email": "nia@example.com"},
        ]
        response = self.client.post("/jobs", json=payload)
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], "COMPLETED_WITH_ERRORS")
        self.assertEqual(body["success_count"], 1)
        self.assertEqual(body["failed_count"], 1)

    def test_job_status_and_certificate_retrieval(self) -> None:
        created = self.client.post("/jobs", json=self.valid_payload()).json()
        status = self.client.get(f"/jobs/{created['id']}")
        self.assertEqual(status.status_code, 200)
        generated = [item for item in status.json()["recipients"] if item["download_url"]][0]

        certificate = self.client.get(generated["download_url"])
        self.assertEqual(certificate.status_code, 200)
        self.assertEqual(certificate.headers["content-type"], "image/png")
        self.assertGreater(len(certificate.content), 1000)


if __name__ == "__main__":
    unittest.main()
