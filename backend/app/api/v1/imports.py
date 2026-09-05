import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.api.deps import DbSession, require_roles
from app.schemas.common import SuccessResponse
from app.schemas.imports import (
    ConfirmImportRequest,
    ImportBatchResponse,
    ImportErrorResponse,
    ImportPreviewResponse,
    ImportResultResponse,
)
from app.services.imports import (
    confirm_batch,
    create_batch,
    get_batch,
    parse_csv,
    validate_batch,
    EXPORT_FIELDS,
    export_product_rows,
)
from app.models.imports import ImportErrorRecord


router = APIRouter()


def _csv_response(filename: str, fields: list[str], rows: list[dict[str, str]]) -> StreamingResponse:
    import csv
    import io

    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _batch_response(batch: object) -> ImportBatchResponse:
    return ImportBatchResponse(
        id=batch.id,
        filename=batch.filename,
        status=batch.status,
        total_rows=batch.total_rows,
        valid_rows=batch.valid_rows,
        error_rows=batch.error_rows,
    )


def _preview_response(batch: object) -> ImportPreviewResponse:
    errors = [ImportErrorResponse.model_validate(error) for error in batch.errors]
    return ImportPreviewResponse(
        **_batch_response(batch).model_dump(), rows=batch.rows, errors=errors
    )


@router.post(
    "/imports/upload",
    response_model=SuccessResponse[ImportPreviewResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_csv(
    db: DbSession,
    file: UploadFile = File(...),
    _: object = Depends(require_roles("admin", "editor")),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Only CSV files are supported")
    rows = parse_csv(await file.read())
    batch = await create_batch(db, file.filename, rows)
    return SuccessResponse(data=_preview_response(batch))


@router.get("/imports/{batch_id}", response_model=SuccessResponse[ImportPreviewResponse])
async def preview_csv(
    batch_id: uuid.UUID,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor", "reviewer")),
):
    batch = await get_batch(db, batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Import batch not found")
    return SuccessResponse(data=_preview_response(batch))


@router.get("/imports/export/products.csv")
async def export_products(
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor", "reviewer")),
):
    return _csv_response("pidb-products.csv", EXPORT_FIELDS, await export_product_rows(db))


@router.get("/imports/{batch_id}/errors.csv")
async def export_import_errors(
    batch_id: uuid.UUID,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor", "reviewer")),
):
    batch = await get_batch(db, batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Import batch not found")
    errors = [
        {"row_number": str(error.row_number), "field_name": error.field_name or "", "error_code": error.error_code, "message": error.message, "raw_value": error.raw_value or ""}
        for error in batch.errors
    ]
    return _csv_response("pidb-import-errors.csv", ["row_number", "field_name", "error_code", "message", "raw_value"], errors)


@router.post("/imports/{batch_id}/validate", response_model=SuccessResponse[ImportBatchResponse])
async def validate_csv(
    batch_id: uuid.UUID,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    batch = await get_batch(db, batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Import batch not found")
    return SuccessResponse(data=_batch_response(await validate_batch(db, batch)))


@router.get(
    "/imports/{batch_id}/errors",
    response_model=SuccessResponse[list[ImportErrorResponse]],
)
async def import_errors(
    batch_id: uuid.UUID,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor", "reviewer")),
):
    batch = await get_batch(db, batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Import batch not found")
    return SuccessResponse(data=[ImportErrorResponse.model_validate(error) for error in batch.errors])


@router.post(
    "/imports/{batch_id}/confirm",
    response_model=SuccessResponse[ImportResultResponse],
)
async def confirm_csv(
    batch_id: uuid.UUID,
    payload: ConfirmImportRequest,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    batch = await get_batch(db, batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Import batch not found")
    created, updated, skipped = await confirm_batch(db, batch, payload.mode)
    return SuccessResponse(
        data=ImportResultResponse(
            **_batch_response(batch).model_dump(),
            created=created,
            updated=updated,
            skipped=skipped,
        )
    )
