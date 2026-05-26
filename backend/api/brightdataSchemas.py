from fastapi import APIRouter

from backend.brightdata.schemas import get_schema_registry

router = APIRouter(prefix="/api/brightdata", tags=["brightdata"])


@router.get("/schemas")
async def brightdataSchemas():
    return get_schema_registry()
