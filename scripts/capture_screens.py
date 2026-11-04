"""Capture actual Textual screens using a persisted case; no model call is made."""

import argparse
import asyncio
from pathlib import Path

from textual.widgets import Input, TabbedContent

from sentinel.cases import Cases
from sentinel.tui import SentinelApp
from sentinel.workspace import Workspace

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--workspace", default=".sentinel-live")
parser.add_argument("--output", default="docs/screenshots")
args = parser.parse_args()
workspace = Workspace(args.workspace, create=False)
cases = Cases(workspace).list()
case = next(c for c in cases if c.status == "reviewed")
output = Path(args.output)
output.mkdir(parents=True, exist_ok=True)


async def capture():
    for width, height in [(140, 42), (100, 30)]:
        app = SentinelApp(workspace, case.case_id)
        async with app.run_test(size=(width, height)) as pilot:
            await app.workers.wait_for_complete()
            await pilot.pause()
            app.save_screenshot(f"workspace-{width}.svg", path=str(output))
            app.query_one("#main-tabs", TabbedContent).active = "case-tab"
            await pilot.pause()
            app.save_screenshot(f"case-review-{width}.svg", path=str(output))
            if width == 140:
                app.query_one("#main-tabs", TabbedContent).active = "activity-tab"
                await pilot.pause()
                app.save_screenshot("activity.svg", path=str(output))
                await pilot.press("f3")
                app.query_one("#filters", Input).value = "session=session-702"
                await pilot.press("enter")
                await app.workers.wait_for_complete()
                app.query_one("#events").focus()
                await pilot.press("enter")
                await pilot.pause()
                app.save_screenshot("source-evidence.svg", path=str(output))


asyncio.run(capture())
print(f"Saved actual screens to {output}")
