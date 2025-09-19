from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routes import routes_documents, routes_qa, routes_upload

app = FastAPI(title=settings.PROJECT_NAME)

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Routerlar
app.include_router(routes_documents.router, prefix="/api", tags=["Documents"])
app.include_router(routes_upload.router, prefix="/api", tags=["Upload"])
app.include_router(routes_qa.router, prefix="/api", tags=["QA"])
