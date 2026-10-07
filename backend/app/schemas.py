from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RecipientIn(BaseModel):
    name: str | None = None
    email: str | None = None
    certificate_title: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class JobCreate(BaseModel):
    event_name: str = Field(min_length=2, max_length=160)
    course_name: str | None = Field(default=None, max_length=160)
    issued_on: str = Field(min_length=4, max_length=32)
    recipients: list[RecipientIn] = Field(min_length=1, max_length=500)

    @field_validator("event_name", "issued_on")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class RecipientResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    position: int
    name: str | None
    email: str | None
    certificate_title: str | None
    status: str
    error_message: str | None = None
    download_url: str | None = None


class JobSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_name: str
    course_name: str | None
    issued_on: str
    status: str
    total_count: int
    success_count: int
    failed_count: int


class JobDetail(JobSummary):
    progress_percent: int
    recipients: list[RecipientResult]
