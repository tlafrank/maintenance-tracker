import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
)

app = FastAPI(title='Maintenance Tracker API')
app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(',')],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

uploads_root = Path('/tmp/maintenance-tracker/uploads')
uploads_root.mkdir(parents=True, exist_ok=True)
app.mount('/uploads', StaticFiles(directory=uploads_root), name='uploads')


@app.get('/health')
def healthcheck():
    return {'status': 'ok'}
