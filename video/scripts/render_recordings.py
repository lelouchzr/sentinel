"""Rasterize actual asciicast output with a VT emulator; encode the observed UI.

The source is the terminal's output stream. No application text, events, counters,
provider states or progress messages are manufactured by this renderer.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from pathlib import Path

import pyte
from PIL import Image, ImageDraw, ImageFont

PROJECT = Path(__file__).resolve().parents[1]
BACKGROUND = "0a1119"
FOREGROUND = "dbe8ed"
COLORS = {
    "black": "0a1119",
    "red": "cd3131",
    "green": "0dbc79",
    "brown": "e5c07b",
    "blue": "2472c8",
    "magenta": "bc3fbc",
    "cyan": "69d4cf",
    "white": "dbe8ed",
    "brightblack": "667480",
    "brightred": "f08383",
    "brightgreen": "6de0a7",
    "brightbrown": "e0b668",
    "brightblue": "75b9ff",
    "brightmagenta": "df98e8",
    "brightcyan": "8ceee8",
    "brightwhite": "ffffff",
}


def color(value, default):
    if value == "default":
        return "#" + default
    if value in COLORS:
        return "#" + COLORS[value]
    if len(value) == 6 and all(c in "0123456789abcdefABCDEF" for c in value):
        return "#" + value
    return "#" + default


class Raster:
    def __init__(self, columns, rows):
        self.columns, self.rows = columns, rows
        self.font = ImageFont.truetype(str(PROJECT / "assets/fonts/JetBrainsMono-Regular.ttf"), 20)
        self.advance = self.font.getlength("M")
        self.line = 24
        self.size = (math.ceil(self.advance * columns / 2) * 2, self.line * rows)
        self.image = Image.new("RGB", self.size, "#" + BACKGROUND)
        self.draw = ImageDraw.Draw(self.image)
        self.glyphs = {}

    def glyph(self, text, ink):
        key = (text, ink)
        if key in self.glyphs:
            return self.glyphs[key]
        tile = Image.new("RGBA", (round(self.advance), self.line), (0, 0, 0, 0))
        ImageDraw.Draw(tile).text((0, 19), text, font=self.font, fill=ink, anchor="ls")
        if len(self.glyphs) >= 4096:
            self.glyphs.clear()
        self.glyphs[key] = tile
        return tile

    def update(self, screen):
        changed = sorted(screen.dirty)
        for row in changed:
            if row >= self.rows:
                continue
            y = row * self.line
            self.draw.rectangle((0, y, self.size[0], y + self.line), fill="#" + BACKGROUND)
            cells = screen.buffer[row]
            for col in range(self.columns):
                cell = cells[col]
                fg, bg = color(cell.fg, FOREGROUND), color(cell.bg, BACKGROUND)
                if cell.reverse:
                    fg, bg = bg, fg
                x = round(col * self.advance)
                if bg != "#" + BACKGROUND:
                    self.draw.rectangle(
                        (x, y, round((col + 1) * self.advance), y + self.line), fill=bg
                    )
                if cell.data and cell.data != " ":
                    # A shared baseline preserves punctuation, descenders and box drawing.
                    tile = self.glyph(cell.data, fg)
                    self.image.paste(tile, (x, y), tile)
                    if cell.underscore:
                        self.draw.line(
                            (x, y + self.line - 3, x + self.advance, y + self.line - 3), fill=fg
                        )
        screen.dirty.clear()
        return bool(changed)


def render(cast: Path, fps: int):
    entries = [json.loads(line) for line in cast.read_text().splitlines()]
    header, events = entries[0], entries[1:]
    events = [e for e in events if e[1] == "o"]
    screen = pyte.Screen(header["width"], header["height"])
    stream = pyte.Stream(screen)
    raster = Raster(header["width"], header["height"])
    marks = json.loads(cast.with_suffix(".marks.json").read_text())
    output = cast.with_suffix(".mp4")
    duration = events[-1][0] + 0.2
    process = subprocess.Popen(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "-s",
            f"{raster.size[0]}x{raster.size[1]}",
            "-r",
            str(fps),
            "-i",
            "-",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "12",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(output),
        ],
        stdin=subprocess.PIPE,
    )
    event_index, mark_index = 0, 0
    frame = raster.image.tobytes()
    try:
        for index in range(math.ceil(duration * fps)):
            time = index / fps
            while event_index < len(events) and events[event_index][0] <= time:
                stream.feed(events[event_index][2])
                event_index += 1
            if raster.update(screen):
                frame = raster.image.tobytes()
            while mark_index < len(marks) and marks[mark_index]["time"] <= time:
                raster.image.save(cast.with_name(f"{cast.stem}-{marks[mark_index]['name']}.png"))
                mark_index += 1
            process.stdin.write(frame)
    finally:
        process.stdin.close()
    if process.wait():
        raise RuntimeError("FFmpeg failed to encode the captured terminal")
    print(
        json.dumps(
            {"file": str(output), "seconds": round(duration, 3), "size": raster.size, "fps": fps}
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("casts", nargs="+", type=Path)
    parser.add_argument("--fps", type=int, default=12)
    args = parser.parse_args()
    for cast in args.casts:
        render(cast, args.fps)
