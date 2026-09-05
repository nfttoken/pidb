from pydantic import BaseModel


class SettingsResponse(BaseModel):
    app_name: str
    app_env: str
    api_prefix: str
    public_base_url: str
    shopify_configured: bool
    shopify_api_version: str
    refresh_token_expire_days: int
