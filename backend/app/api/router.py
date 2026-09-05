from fastapi import APIRouter

from app.api.v1 import auth, catalog, claims, dashboard, health, imports, products, public, qr, quiz, settings, shopify, users


api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(catalog.router, tags=["Catalog"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(claims.router, tags=["Claims"])
api_router.include_router(dashboard.router, tags=["Dashboard"])
api_router.include_router(users.router, tags=["Users"])
api_router.include_router(settings.router, tags=["Settings"])
api_router.include_router(public.router, prefix="/public", tags=["Public"])
api_router.include_router(imports.router, tags=["Imports"])
api_router.include_router(qr.router, tags=["QR"])
api_router.include_router(quiz.router, tags=["Quiz"])
api_router.include_router(shopify.router, prefix="/shopify", tags=["Shopify"])
