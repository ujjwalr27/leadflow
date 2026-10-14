from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.v1 import auth, discussions, health, leads
from app.schemas.common import UNAUTHORIZED

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)

# Everything below requires a signed-in user.
for protected_router in (leads.router, discussions.router):
    api_router.include_router(
        protected_router, dependencies=[Depends(get_current_user)], responses=UNAUTHORIZED
    )
