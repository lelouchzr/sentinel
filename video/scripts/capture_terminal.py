"""Capture the actual macOS/Linux terminal application, without recording secret input.

The automation sends real terminal keys and clicks to Textual. It does not call
widget methods, substitute model results, or draw an invented application UI.
"""

from __future__ import annotations

import argparse
import codecs
import fcntl
import getpass
import json
import os
import pty
import select
import signal
import struct
import subprocess
import sys
import termios
import time
from pathlib import Path

import pyte

ROOT = Path(__file__).resolve().parents[2]
APP_PYTHON = ROOT / ".venv/bin/python"
WIDTH, HEIGHT = 140, 42
QUESTION = (
    "Trace this login and its session activity. Retrieve specific original events. "
    "Separate recorded facts from hypotheses and explain what would establish authorization. "
    "Use a small number of focused MCP searches and then conclude."
)


class TerminalCapture:
    def __init__(self, workspace: Path, output: Path, command: list[str], environment: dict):
        self.output = output
        self.workspace = workspace
        self.screen = pyte.Screen(WIDTH, HEIGHT)
        self.stream = pyte.Stream(self.screen)
        self.decoder = codecs.getincrementaldecoder("utf-8")("replace")
        self.started = time.monotonic()
        self.marks = []
        self.recording = output.open("x", encoding="utf-8")
        self.recording.write(
            json.dumps(
                {
                    "version": 2,
                    "width": WIDTH,
                    "height": HEIGHT,
                    "title": "SENTINEL actual terminal recording",
                    "env": {"TERM": "xterm-256color"},
                }
            )
            + "\n"
        )
        self.pid, self.master = pty.fork()
        if self.pid == 0:
            os.chdir(ROOT)
            fcntl.ioctl(1, termios.TIOCSWINSZ, struct.pack("HHHH", HEIGHT, WIDTH, 0, 0))
            os.execve(
                str(APP_PYTHON), [str(APP_PYTHON), "-m", "sentinel.cli", *command], environment
            )
        self.exited = False

    @property
    def text(self):
        return "\n".join(self.screen.display)

    def read(self, duration=0.1):
        until = time.monotonic() + duration
        while time.monotonic() < until and not self.exited:
            if not select.select([self.master], [], [], max(0, min(0.1, until - time.monotonic())))[
                0
            ]:
                continue
            try:
                data = os.read(self.master, 65536)
            except OSError:
                self.exited = True
                break
            if not data:
                self.exited = True
                break
            text = self.decoder.decode(data)
            self.stream.feed(text)
            self.recording.write(
                json.dumps([round(time.monotonic() - self.started, 4), "o", text]) + "\n"
            )
            self.recording.flush()

    def wait(self, predicate, description, timeout=20):
        until = time.monotonic() + timeout
        while time.monotonic() < until:
            self.read()
            if predicate():
                return
            if self.exited:
                break
        self.snapshot("failure")
        raise RuntimeError(f"The real terminal did not reach: {description}")

    def send(self, keys: str):
        os.write(self.master, keys.encode())
        self.read(0.3)

    def mark(self, name):
        self.marks.append({"name": name, "time": round(time.monotonic() - self.started, 4)})
        self.snapshot(name)
        print(f"Captured {name}", flush=True)

    def snapshot(self, name):
        self.output.with_name(self.output.stem + f"-{name}.txt").write_text(self.text)

    def click_text(self, text, *, left_only=False):
        for row, line in enumerate(self.screen.display):
            col = line.find(text)
            if col >= 0 and (not left_only or col < 32):
                self.send(f"\x1b[<0;{col + 2};{row + 1}M\x1b[<0;{col + 2};{row + 1}m")
                return
        raise RuntimeError(f"A visible terminal control was not found: {text}")

    def filter(self, value):
        self.send("\x1bOR")  # Allow Textual's focus change to finish before pasting.
        self.send("\x01")
        self.send("\x0b")
        self.send("\x1b[200~" + value + "\x1b[201~")  # The terminal's real bracketed paste.
        self.send("\r")
        self.wait(lambda: value in self.text and "Dataset search" in self.text, "search results")
        self.read(0.6)

    def finish(self):
        self.send("\x11")  # Ctrl+Q invokes the application's clean shutdown.
        self.wait(lambda: self.exited, "clean terminal shutdown", timeout=15)
        _, status = os.waitpid(self.pid, 0)
        self.recording.close()
        os.close(self.master)
        code = os.waitstatus_to_exitcode(status)
        if code:
            raise RuntimeError(f"The captured application exited with status {code}")
        self.output.with_suffix(".marks.json").write_text(json.dumps(self.marks, indent=2) + "\n")

    def abort(self):
        if not self.exited:
            try:
                self.send("\x11")
                self.read(2)
                if not self.exited:
                    os.kill(self.pid, signal.SIGTERM)
            except (OSError, ProcessLookupError):
                pass
        self.recording.close()
        self.output.with_suffix(".marks.json").write_text(json.dumps(self.marks, indent=2) + "\n")


def read_case(workspace):
    files = list((workspace / "cases").glob("C-*.json"))
    return json.loads(files[0].read_text()) if files else None


def capture(args):
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    workspace = ROOT / args.workspace
    if workspace.exists() and not args.saved_case:
        raise RuntimeError(
            "Use a new generated video workspace; existing state is never overwritten"
        )
    env = {k: v for k, v in os.environ.items() if k not in {"NO_COLOR", "MODEL_API_KEY"}}
    env.update(TERM="xterm-256color", COLORTERM="truecolor", PYTHONUTF8="1")
    if args.manual or args.saved_case:
        env.pop("META_API_KEY", None)
    else:
        env["META_API_KEY"] = getpass.getpass(
            "Meta key (hidden; memory only, outside the recording): "
        )
    env["SENTINEL_DEADLINE"] = "180"
    env["SENTINEL_MAX_MODEL_CALLS"] = "10"
    env["SENTINEL_MAX_TOOL_CALLS"] = "18"
    terminal = TerminalCapture(
        workspace,
        output / "workflow.cast",
        ["--workspace", args.workspace, "tui" if args.saved_case else "demo"],
        env,
    )
    try:
        terminal.wait(lambda: "15 signals" in terminal.text, "actual import and alert list", 45)
        terminal.mark("workspace")
        terminal.read(3)
        terminal.send("\r")
        terminal.wait(lambda: read_case(workspace), "alert opened as a persistent case")
        terminal.read(1)
        terminal.mark("case-open")
        terminal.read(4)
        if args.saved_case:
            case = read_case(workspace)
            if case["case_id"] != args.saved_case or case["status"] != "reviewed":
                raise RuntimeError("The selected saved live case must already be reviewed")
            terminal.click_text("Activity")
            terminal.read(1)
            terminal.send("\x1b[<64;100;20M" * 32)
            terminal.mark("agent-start")
            terminal.read(3)
            for _ in range(8):
                terminal.send("\x1b[<65;100;20M" * 2)
                terminal.read(1.5)
            terminal.click_text("Case review")
            terminal.read(1)
            terminal.mark("review")
            terminal.read(6)
        elif not args.manual:
            terminal.send("\x1bOQ")
            terminal.send("\x1b[200~" + QUESTION + "\x1b[201~")
            terminal.send("\r")
            terminal.mark("agent-start")
            terminal.wait(
                lambda: read_case(workspace)["status"] in {"reviewed", "interrupted"},
                "completed live investigation",
                200,
            )
            case = read_case(workspace)
            if case["status"] != "reviewed":
                raise RuntimeError(
                    "Live Meta investigation was interrupted; completed work is retained"
                )
            terminal.read(1)
            terminal.mark("review")
            terminal.read(6)
        else:
            case = read_case(workspace)
        terminal.send("\x1bOS")  # F4: attached chronological evidence.
        terminal.read(1)
        terminal.mark("timeline")
        terminal.read(4)
        terminal.filter("session=session-702")
        terminal.mark("session")
        terminal.read(3)
        terminal.send("\t")
        terminal.send("\x1b[B\x1b[B")
        terminal.send("\r")
        terminal.wait(lambda: "ORIGINAL EVIDENCE" in terminal.text, "selected download evidence")
        terminal.mark("event")
        terminal.read(4)
        terminal.send("\x1b[6~")  # PageDown exposes the original record and provenance.
        terminal.mark("provenance")
        terminal.read(5)
        terminal.send("\x1b")
        terminal.filter("account=svc-backup")
        terminal.mark("benign-search")
        terminal.read(3)
        terminal.send("\t")
        terminal.send("\r")
        terminal.wait(lambda: "ORIGINAL EVIDENCE" in terminal.text, "backup context record")
        terminal.send("\x1b[6~")
        terminal.mark("benign-record")
        terminal.read(6)
        terminal.send("\x1b")
        terminal.click_text("Case review")
        terminal.read(1)
        terminal.mark("case-review")
        terminal.read(5)
        terminal.send("\x1b[15~")  # F5 writes both report formats.
        terminal.wait(
            lambda: (workspace / "reports" / f"{case['case_id']}.md").exists(),
            "real report export",
        )
        terminal.mark("export")
        terminal.read(4)
        terminal.finish()
    except BaseException:
        terminal.abort()
        raise
    # A second actual process reopens the case from disk; this is not an in-memory replay.
    env.pop("META_API_KEY", None)
    reopened = TerminalCapture(
        workspace,
        output / "reopen.cast",
        ["--workspace", args.workspace, "cases", "open", case["case_id"]],
        env,
    )
    try:
        reopened.wait(lambda: case["case_id"] in reopened.text, "saved case reopened")
        reopened.read(1)
        reopened.mark("reopened")
        reopened.read(4)
        reopened.click_text("Case review")
        reopened.read(1)
        reopened.mark("saved-review")
        reopened.read(5)
        reopened.finish()
    except BaseException:
        reopened.abort()
        raise
    (output / "capture.json").write_text(
        json.dumps(
            {
                "workspace": args.workspace,
                "case_id": case["case_id"],
                "platform": sys.platform,
                "dimensions": [WIDTH, HEIGHT],
                "real_terminal": True,
                "model": None if args.manual else "Meta Model API",
                "manual_rehearsal": args.manual,
                "saved_live_case": bool(args.saved_case),
                "question": (
                    next(
                        a["details"]["question"]
                        for a in case["activity"]
                        if a["action"] == "Investigation started"
                    )
                    if args.saved_case
                    else QUESTION
                ),
                "recordings": ["workflow.cast", "reopen.cast"],
                "application_exit_codes": [0, 0],
            },
            indent=2,
        )
        + "\n"
    )
    subprocess.run(
        [
            str(APP_PYTHON),
            "-m",
            "sentinel.cli",
            "--workspace",
            args.workspace,
            "cases",
            "open",
            case["case_id"],
            "--json",
        ],
        stdout=(output / "case.json").open("w"),
        check=True,
        env=env,
    )
    print("Actual terminal capture and independent case reopening completed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", default=".sentinel-video")
    parser.add_argument("--output", default="video/assets/captures")
    parser.add_argument(
        "--manual", action="store_true", help="Rehearse controls without any model call"
    )
    parser.add_argument(
        "--saved-case", help="Record a previously completed live case; never replay model output"
    )
    capture(parser.parse_args())
