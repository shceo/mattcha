from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.discover import router as discover_router
from app.api.matches import router as matches_router
from app.api.profile import router as profile_router
from app.config import settings

app = FastAPI(title="mattcha API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.app_env}


app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(discover_router)
app.include_router(matches_router)
app.include_router(admin_router)

uploads_dir = Path(settings.uploads_dir)
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
