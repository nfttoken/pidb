from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shopify import Job
from app.services.shopify import SHOPIFY_JOB_TYPE, process_sync_job


async def process_pending_shopify_jobs(db: AsyncSession, *, limit: int = 10) -> list[Job]:
    """Process due Shopify jobs once; a scheduler can invoke this command repeatedly."""
    now = datetime.now(UTC)
    jobs = list(
        (
            await db.execute(
                select(Job)
                .where(
                    Job.job_type == SHOPIFY_JOB_TYPE,
                    Job.status == "pending",
                    Job.available_at <= now,
                )
                .order_by(Job.available_at, Job.created_at)
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    results: list[Job] = []
    for job in jobs:
        results.append(await process_sync_job(db, job.id))
    return results
