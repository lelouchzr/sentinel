"""POSIX asciicast v2 recorder. Records output only, never key input or environment secrets."""

import argparse
import codecs
import fcntl
import json
import os
import pty
import select
import struct
import sys
import termios
import time
import tty
from pathlib import Path

from sentinel.security import no_symlinks

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--workspace", default=".sentinel-record")
parser.add_argument("--output", default="recordings/sentinel.cast")
parser.add_argument("--columns", type=int, default=140)
parser.add_argument("--rows", type=int, default=42)
args = parser.parse_args()
if not sys.stdin.isatty():
    parser.error("Run the recorder in an interactive terminal")
if args.columns < 80 or args.rows < 24:
    parser.error("Use at least 80 columns and 24 rows")
output = no_symlinks(Path(args.output))
output.parent.mkdir(parents=True, exist_ok=True)
# Exclusive creation prevents accidental overwriting of a prior recording.
recording = output.open("x", encoding="utf-8")
recording.write(
    json.dumps(
        {
            "version": 2,
            "width": args.columns,
            "height": args.rows,
            "timestamp": int(time.time()),
            "title": "SENTINEL investigation workspace",
            "env": {"TERM": "xterm-256color"},
        }
    )
    + "\n"
)
recording.flush()
pid, master = pty.fork()
if pid == 0:
    os.environ["TERM"] = "xterm-256color"
    fcntl.ioctl(
        sys.stdout.fileno(), termios.TIOCSWINSZ, struct.pack("HHHH", args.rows, args.columns, 0, 0)
    )
    os.execv(
        sys.executable,
        [sys.executable, "-m", "sentinel.cli", "--workspace", args.workspace, "demo"],
    )
original = termios.tcgetattr(sys.stdin)
started = time.monotonic()
decoder = codecs.getincrementaldecoder("utf-8")("replace")
try:
    tty.setraw(sys.stdin.fileno())
    while True:
        ready, _, _ = select.select([master, sys.stdin], [], [], 0.2)
        if master in ready:
            try:
                data = os.read(master, 65536)
            except OSError:
                break
            if not data:
                break
            os.write(sys.stdout.fileno(), data)
            text = decoder.decode(data)
            if text:
                recording.write(
                    json.dumps([round(time.monotonic() - started, 4), "o", text], ensure_ascii=True)
                    + "\n"
                )
                recording.flush()
        if sys.stdin in ready:
            data = os.read(sys.stdin.fileno(), 1024)
            if data:
                os.write(master, data)
            else:
                break
finally:
    termios.tcsetattr(sys.stdin, termios.TCSADRAIN, original)
    os.close(master)
    recording.close()
    _, status = os.waitpid(pid, 0)
print(f"\nRecording saved to {output}")
raise SystemExit(os.waitstatus_to_exitcode(status))
