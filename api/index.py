import sys
import os

# Add backend directory to module search path for FastAPI imports
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.core.database import init_db
import asyncio

# Ensure DB tables & Super Admin user are created/updated on Vercel startup
try:
    loop = asyncio.get_event_loop()
    if loop.is_running():
        loop.create_task(init_db())
    else:
        loop.run_until_complete(init_db())
except Exception as e:
    print(f"Startup DB init log: {e}")

# Export app for Vercel Serverless Function engine
__all__ = ['app']
