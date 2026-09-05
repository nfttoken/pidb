import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ImportErrorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    row_number: int
    field_name: str | None
    error_code: str
    message: str
    raw_value: str | None


class ImportBatchResponse(BaseModel):
    id: uuid.UUID
    filename: str
    status: str
    total_rows: int
    valid_rows: int
    error_rows: int


class ImportPreviewResponse(ImportBatchResponse):
    rows: list[dict]
    errors: list[ImportErrorResponse]


class ConfirmImportRequest(BaseModel):
    mode: Literal["upsert", "create_only", "update_only"] = "upsert"


class ImportResultResponse(ImportBatchResponse):
    created: int
    updated: int
    skipped: int

