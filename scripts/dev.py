"""Own both development processes and terminate their process groups on exit."""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
processes = []
try:
    for command, cwd in [([sys.executable, "-m", "slim.cli", "serve"], ROOT), (["npm", "run", "dev"], ROOT / "web")]:
        processes.append(subprocess.Popen(command, cwd=cwd, start_new_session=True))
    while all(process.poll() is None for process in processes):
        time.sleep(0.5)
except KeyboardInterrupt:
    pass
finally:
    for process in processes:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
    for process in processes:
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
