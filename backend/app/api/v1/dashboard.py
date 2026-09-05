from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select

from app.api.deps import DbSession, require_roles
from app.models.catalog import Product
from app.models.review import ProductCanada
from app.models.shopify import ShopifyMapping
from app.schemas.common import SuccessResponse
from app.schemas.dashboard import DashboardStatsResponse


router = APIRouter()


@router.get("/dashboard/stats", response_model=SuccessResponse[DashboardStatsResponse])
async def dashboard_stats(db: DbSession, _: object = Depends(require_roles("admin", "editor", "reviewer"))):
    status_rows = await db.execute(select(Product.status, func.count(Product.id)).group_by(Product.status))
    products_by_status = {status: count for status, count in status_rows.all()}
    compliance_review = await db.scalar(
        select(func.count(Product.id))
        .outerjoin(ProductCanada, ProductCanada.product_id == Product.id)
        .where(or_(ProductCanada.id.is_(None), ProductCanada.compliance_status.in_(["pending", "reviewing"])))
    )
    shopify_rows = await db.execute(select(ShopifyMapping.sync_status, func.count(ShopifyMapping.id)).group_by(ShopifyMapping.sync_status))
    shopify_counts = {status: count for status, count in shopify_rows.all()}
    return SuccessResponse(
        data=DashboardStatsResponse(
            products_total=sum(products_by_status.values()),
            products_by_status=products_by_status,
            needs_review=products_by_status.get("review", 0),
            compliance_review=compliance_review or 0,
            shopify_pending=shopify_counts.get("pending", 0),
            shopify_failed=shopify_counts.get("failed", 0),
            shopify_succeeded=shopify_counts.get("success", 0),
        )
    )
