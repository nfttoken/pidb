from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    products_total: int
    products_by_status: dict[str, int]
    needs_review: int
    compliance_review: int
    shopify_pending: int
    shopify_failed: int
    shopify_succeeded: int
