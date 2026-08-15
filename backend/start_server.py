import subprocess
import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
python_exe = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")

subprocess.Popen(
    [python_exe, "-m", "uvicorn", "app.main:app", "--port", "8000", "--reload"],
    cwd=backend_dir,
    creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
)
print("FastAPI server launched in background detached process on port 8000.")
