from fastapi import APIRouter, Depends

from app.api.deps import DbSession, require_roles
from app.core.config import settings
from app.schemas.common import SuccessResponse
from app.schemas.settings import SettingsResponse


router = APIRouter()


@router.get("/settings", response_model=SuccessResponse[SettingsResponse])
async def read_settings(db: DbSession, _: object = Depends(require_roles("admin", "editor", "reviewer"))):
    del db
    return SuccessResponse(
        data=SettingsResponse(
            app_name=settings.app_name,
            app_env=settings.app_env,
            api_prefix=settings.api_prefix,
            public_base_url=settings.public_base_url,
            shopify_configured=bool(settings.shopify_store_domain and settings.shopify_admin_access_token),
            shopify_api_version=settings.shopify_api_version,
            refresh_token_expire_days=settings.refresh_token_expire_days,
        )
    )
