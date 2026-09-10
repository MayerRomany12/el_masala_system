import sys
import os

# Add backend directory to module search path for FastAPI imports
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

try:
    from app.main import app
except Exception as e:
    import traceback
    print(f"CRITICAL: Failed to import FastAPI app on Vercel: {e}")
    traceback.print_exc()
    raise e

# Export app for Vercel Serverless Function engine
__all__ = ['app']
