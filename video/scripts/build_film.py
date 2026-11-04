"""Build editable Hyperframes compositions from recorded UI and computed evidence."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

P = Path(__file__).resolve().parents[1]
DURATION = 115.2
F = json.loads((P / "data/evidence.json").read_text())
CAPTURE = json.loads((P / "assets/captures/capture.json").read_text())
assert F["case_id"] == CAPTURE["case_id"] and not CAPTURE["manual_rehearsal"]
MARKS = {
    m["name"]: m["time"]
    for m in json.loads((P / "assets/captures/workflow.marks.json").read_text())
}
REOPEN = {
    m["name"]: m["time"] for m in json.loads((P / "assets/captures/reopen.marks.json").read_text())
}


def esc(value):
    return html.escape(str(value), quote=True)


SHARED = """
@font-face{font-family:Manrope;src:url('assets/fonts/Manrope.ttf') format('truetype');font-weight:200 800}
@font-face{font-family:'JetBrains Mono';src:url('assets/fonts/JetBrainsMono-Regular.ttf') format('truetype')}
#root{position:absolute;inset:0;overflow:hidden;background:#0a1119;color:#e8f2ee;font-family:Manrope,sans-serif}
*{box-sizing:border-box} h1,h2,p{margin:0} .mint{color:#79e4cb}.amber{color:#e7bc74}
.headline{position:absolute;font-size:88px;line-height:1.06;font-weight:750;letter-spacing:-4px}
.body{position:absolute;font-size:34px;line-height:1.35;font-weight:500;letter-spacing:-.6px}
.mono{font-family:'JetBrains Mono',monospace}.label{position:absolute;font-size:28px;line-height:1.4;font-weight:500}
.foot{position:absolute;bottom:56px;left:112px;font-size:28px;line-height:1.4;color:#acc4cc}
.camera{position:absolute;width:1680px;height:1008px;transform-origin:0 0}
.terminal{position:absolute;inset:0;width:1680px;height:1008px;object-fit:contain}
.picture{position:absolute;inset:0;width:1680px;height:1008px;object-fit:contain}
.mask{position:absolute;overflow:hidden}.line{position:absolute;background:currentColor}
.clip{position:absolute}
"""


def video(identity, *, start, length, at=0, rate=1, source="workflow"):
    return (
        f'<video id="{identity}" class="clip terminal" data-start="{at}" '
        f'data-duration="{length}" data-media-start="{start:.4f}" '
        f'data-hf-media-start-basis="local" '
        f'data-playback-rate="{rate:.6f}" data-track-index="0" '
        f'src="assets/captures/{source}.mp4" muted playsinline></video>'
    )


def scene(name, duration, markup, css, animation):
    content = f"""<template>
<style>{SHARED}\n{css}</style>
<div id="root" data-composition-id="{name}" data-width="1920" data-height="1080">
{markup}
</div>
<script>
const tl = gsap.timeline({{paused:true}});
{animation}
window.__timelines = window.__timelines || {{}};
window.__timelines['{name}'] = tl;
</script>
</template>\n"""
    (P / "compositions" / f"{name}.html").write_text(content)


account = F["session"]["events"][0]["account"]
events = F["session"]["events"]
download = next(e for e in events if e["action"] == "download")
failure = next(e for e in F["account_activity"]["events"] if e["outcome"] == "failure")
fails = F["account_activity"]["receipt"]["action_outcome_counts"]["login/failure"]
total = F["dataset"]["event_count"]
source = download["source"]
backup_context = F["backup"]["events"][0]["source"]["original"]["context"]
megabytes = f"{download['bytes'] / 1_000_000:g}"
session_id = events[0]["session_id"]
backup_ticket = re.search(r"CHG-\d+", backup_context).group()

scene(
    "question",
    6.4,
    f"""
<div id="q-rule" class="line"></div>
<h1 id="q-title" class="headline">What<br><span class="mint">happened?</span></h1>
<p id="q-account" class="body mono">{esc(account)} · {esc(events[0]["source_ip"])}</p>
<div id="q-records">
  <div class="q-record" id="q-r1"><span>{esc(failure["timestamp"][11:19])}</span><strong>LOGIN</strong><b class="amber">FAILURE</b></div>
  <div class="q-record" id="q-r2"><span>{esc(events[0]["timestamp"][11:19])}</span><strong>LOGIN</strong><b class="mint">SUCCESS</b></div>
  <div class="q-record" id="q-r3"><span>{esc(download["timestamp"][11:19])}</span><strong>DOWNLOAD</strong><b>{megabytes} MB</b></div>
</div>
<p id="q-footer" class="foot">Fictional logs. A real investigation workspace.</p>
""",
    """
#q-rule{left:112px;top:116px;width:10px;height:470px;color:#79e4cb}
#q-title{left:156px;top:106px;font-size:152px;letter-spacing:-8px}
#q-account{left:156px;top:488px;font-size:30px;color:#acc4cc}
#q-records{position:absolute;left:974px;top:278px;width:818px}
.q-record{display:flex;align-items:center;gap:32px;padding:36px 0;border-bottom:1px solid #284450;font-size:32px;font-family:'JetBrains Mono';white-space:nowrap}
.q-record strong{font-size:28px;width:180px;font-weight:400}.q-record b{font-size:29px;font-weight:400}
""",
    """
tl.fromTo('#q-rule',{scaleY:.05},{scaleY:1,duration:.6,ease:'power3.out'},0);
tl.fromTo('#q-title',{x:-32,opacity:1},{x:0,opacity:1,duration:.55,ease:'power3.out'},0);
tl.fromTo('#q-account',{opacity:0},{opacity:1,duration:.3},.7);
tl.fromTo('.q-record',{x:200,opacity:0},{x:0,opacity:1,stagger:.55,duration:.6,ease:'power3.out'},.5);
tl.fromTo('#q-r3',{backgroundColor:'rgba(121,228,203,0)'},{backgroundColor:'rgba(121,228,203,.08)',duration:.4},3.1);
tl.fromTo('#q-records',{x:0},{x:-26,duration:.5,ease:'power2.inOut'},4.7);
tl.to('#q-title',{x:-120,opacity:0,duration:.35,ease:'power2.in'},5.95);
""",
)

scene(
    "ingest",
    12.8,
    f"""
<h2 id="i-title" class="headline">SENTINEL brings logs together.</h2>
<p id="i-input" class="label mono">CSV + JSONL <span>→</span> Normalized UTC events</p>
<div id="i-number">{total:,}</div><p id="i-event-label" class="body">real imported events</p>
<div id="i-rule" class="line"></div>
<p id="i-alerts" class="body"><strong>{F["alerts"]} signals</strong><br>from {len(F["rules"])} transparent rules</p>
<div id="i-window" class="mask" data-layout-allow-overflow>
 <div id="i-camera" class="camera">{video("i-video", start=MARKS["workspace"], length=12.8, rate=0.15)}</div>
</div>
<p id="i-footer" class="foot">Every event keeps its source reference.</p>
""",
    """
#root{background:#d9eee4;color:#102d2d} #i-title{left:112px;top:100px;font-size:94px}
#i-input{left:116px;top:252px;font-size:28px;color:#345a54}#i-input span{margin:0 24px}
#i-number{position:absolute;left:105px;top:355px;font-size:210px;font-weight:800;letter-spacing:-14px;line-height:1}
#i-event-label{left:118px;top:586px;font-size:38px}
#i-rule{left:118px;top:702px;width:100px;height:5px;background:#215e50}
#i-alerts{left:118px;top:758px;font-size:34px;line-height:1.4}#i-alerts strong{font-size:54px;font-weight:750}
#i-window{left:830px;top:325px;width:990px;height:600px;background:#0a1119}
#i-camera{left:-56px;top:0;transform-origin:0 0}#i-footer{color:#345a54;bottom:55px}
""",
    """
tl.fromTo('#i-title',{y:45,opacity:0},{y:0,opacity:1,duration:.5,ease:'power3.out'},0);
tl.fromTo('#i-input',{opacity:0},{opacity:1,duration:.35},.7);
tl.fromTo('#i-number',{scale:.8,opacity:0},{scale:1,opacity:1,duration:.55,ease:'power3.out'},1.6);
tl.fromTo('#i-event-label',{opacity:0},{opacity:1,duration:.4},2.3);
tl.fromTo('#i-window',{x:300},{x:0,duration:.65,ease:'power3.out'},2.5);
tl.fromTo('#i-camera',{scale:.61},{scale:.7,x:-90,y:-10,duration:1,ease:'power2.inOut'},5.0);
tl.fromTo('#i-rule',{scaleX:0},{scaleX:1,duration:.4,ease:'power3.out'},6.4);
tl.fromTo('#i-alerts',{opacity:0,x:-40},{opacity:1,x:0,duration:.5,ease:'power3.out'},7.2);
tl.fromTo('#i-footer',{opacity:0},{opacity:1,duration:.4},8.8);
""",
)

case_start = max(MARKS["workspace"] + 1.4, MARKS["case-open"] - 1.0)
scene(
    "case",
    12.8,
    f"""
<h2 id="c-title" class="headline">Start with a <span class="mint">signal.</span></h2>
<div id="c-window" class="mask" data-layout-allow-overflow>
 <div id="c-camera" class="camera">{video("c-video", start=case_start, length=12.8, rate=0.65)}</div>
</div>
<p id="c-context" class="body">Repeated failures.<br>A successful login follows.</p>
<p id="c-footer" class="foot">Alert severity is not certainty.</p>
""",
    """
#c-title{left:112px;top:78px;font-size:88px}#c-window{left:112px;top:225px;width:1696px;height:720px}
#c-camera{left:0;top:0}#c-context{left:1105px;top:552px;font-size:43px;line-height:1.3;background:#0a1119;padding:30px 0;width:650px}
""",
    """
tl.fromTo('#c-title',{x:150,opacity:0},{x:0,opacity:1,duration:.5,ease:'power3.out'},0);
tl.fromTo('#c-camera',{scale:1},{scale:1.36,x:-40,y:-148,duration:.7,ease:'power2.inOut'},1.1);
tl.fromTo('#c-context',{opacity:0},{opacity:1,duration:.35},2.4);
tl.to('#c-context',{opacity:0,duration:.25},6.5);
tl.to('#c-camera',{scale:1.12,x:-370,y:-130,duration:.8,ease:'power2.inOut'},6.5);
tl.fromTo('#c-footer',{opacity:0},{opacity:1,duration:.4},8.2);
""",
)

agent_source_length = MARKS["review"] - MARKS["agent-start"]
agent_rate = agent_source_length / 25.6
agent_disclosure = (
    "Previously completed live investigation"
    if CAPTURE["saved_live_case"]
    else f"Recorded live · {agent_rate:.2f}× playback"
)
scene(
    "agent",
    25.6,
    f"""
<div id="a-camera" class="camera" data-layout-allow-overflow>
 {video("a-video", start=MARKS["agent-start"], length=25.6, rate=agent_rate)}
</div>
<div id="a-cover"></div>
<h2 id="a-title" class="headline">Meta investigates<br>through <span class="mint">MCP.</span></h2>
<p id="a-disclosure" class="label">{agent_disclosure}</p>
<div id="a-roles">
 <div id="a-role1"><span>INVESTIGATOR</span><strong>Chooses the next search.</strong></div>
 <div id="a-role2"><span>EVIDENCE REVIEWER</span><strong>Checks gaps and alternatives.</strong></div>
 <div id="a-role3"><span>REPORTER</span><strong>Saves structured findings.</strong></div>
</div>
<p id="a-proof" class="body">{F["mcp_calls"]} actual MCP tool calls<br>{F["evidence_count"]} attached events</p>
<p id="a-footer" class="foot">Actual stdio tool discovery. Bounded evidence access.</p>
""",
    """
#a-camera{left:260px;top:-110px}#a-cover{position:absolute;inset:0;background:linear-gradient(90deg,#0a1119 0%,#0a1119 31%,rgba(10,17,25,.94) 39%,rgba(10,17,25,0) 61%)}
#a-title{left:112px;top:112px;font-size:75px;letter-spacing:-3px;line-height:1.12}
#a-disclosure{left:115px;top:332px;color:#acc4cc;font-size:28px;max-width:650px}
#a-roles{position:absolute;left:115px;top:462px;width:700px}#a-roles div{position:absolute;width:700px}
#a-roles span{display:block;font-family:'JetBrains Mono';font-size:28px;color:#79e4cb;margin-bottom:25px}
#a-roles strong{display:block;font-size:39px;line-height:1.3;font-weight:600;max-width:600px}
#a-proof{left:115px;top:730px;font-size:34px;line-height:1.6;color:#acc4cc}
""",
    """
tl.fromTo('#a-camera',{scale:1.3},{scale:1.3,duration:25.5},0);
tl.fromTo('#a-title',{opacity:0,x:-70},{opacity:1,x:0,duration:.55,ease:'power3.out'},0);
tl.fromTo('#a-role1',{x:0,opacity:0},{x:0,opacity:1,duration:.4},1.6);
tl.to('#a-role1',{opacity:0,y:-20,duration:.35},10.6);
tl.fromTo('#a-role2',{x:0,y:25,opacity:0},{x:0,y:0,opacity:1,duration:.4},11.0);
tl.to('#a-role2',{opacity:0,y:-20,duration:.35},18.8);
tl.fromTo('#a-role3',{x:0,y:25,opacity:0},{x:0,y:0,opacity:1,duration:.4},19.2);
tl.fromTo('#a-proof',{opacity:0},{opacity:1,duration:.4},5.6);
tl.fromTo('#a-footer',{opacity:0},{opacity:1,duration:.4},3.2);
""",
)

scene(
    "source",
    19.2,
    f"""
<h2 id="s-title" class="headline">Follow the <span class="mint">source.</span></h2>
<div id="s-path"><span>{events[0]["timestamp"][11:19]}<br><b>{events[0]["action"].upper()}</b></span><i>→</i><span>{events[1]["timestamp"][11:19]}<br><b>{events[1]["action"].upper()}</b></span><i>→</i><span>{events[2]["timestamp"][11:19]}<br><b>{events[2]["action"].upper()}</b></span></div>
<div id="s-window" class="mask" data-layout-allow-overflow>
 <div id="s-camera" class="camera">{video("s-video", start=MARKS["session"], length=19.2, rate=0.8)}</div>
</div>
<div id="s-details"><p class="mono">{esc(session_id)}</p><strong>{megabytes} MB</strong><p>recorded download</p><hr><p>{esc(source["filename"])}<br>line {source["line"]}</p><p class="s-hash mono">SHA-256<br>{esc(source["sha256"][:16])}…</p></div>
<p id="s-footer" class="foot">Original fields, source position and file hash.</p>
""",
    """
#s-title{left:112px;top:76px;font-size:88px}#s-path{position:absolute;left:117px;top:239px;display:flex;align-items:center;gap:38px;font:28px 'JetBrains Mono';color:#acc4cc}
#s-path span{line-height:1.6}#s-path b{font-size:30px;color:#e8f2ee;font-weight:400}#s-path i{font-style:normal;color:#79e4cb}
#s-window{left:112px;top:407px;width:1190px;height:525px;background:#101e2b}#s-camera{left:-165px;top:-78px}
#s-details{position:absolute;left:1380px;top:413px;font-size:31px;line-height:1.5;width:420px}#s-details>p:first-child{font-size:28px;color:#79e4cb}
#s-details strong{font-size:86px;line-height:1.5;font-weight:750;letter-spacing:-4px}#s-details hr{border:0;border-top:2px solid #284450;margin:25px 0}.s-hash{font-size:28px;color:#acc4cc;margin-top:25px}
""",
    """
tl.fromTo('#s-title',{y:40,opacity:0},{y:0,opacity:1,duration:.5,ease:'power3.out'},0);
tl.fromTo('#s-path span',{opacity:0},{opacity:1,stagger:.65,duration:.4},.7);
tl.fromTo('#s-path i',{scaleX:0},{scaleX:1,stagger:.65,duration:.4},1.1);
tl.fromTo('#s-camera',{scale:1},{scale:1.05,duration:.7,ease:'power2.inOut'},0);
tl.to('#s-camera',{x:-20,y:-236,scale:1.18,duration:.8,ease:'power2.inOut'},8.4);
tl.fromTo('#s-details',{x:120,opacity:0},{x:0,opacity:1,duration:.6,ease:'power3.out'},3.2);
tl.fromTo('#s-footer',{opacity:0},{opacity:1,duration:.4},6.4);
""",
)

scene(
    "context",
    12.8,
    f"""
<h2 id="b-title" class="headline">Volume alone<br>is not <span>intent.</span></h2>
<div id="b-window" class="mask" data-layout-allow-overflow>
 <div id="b-camera" class="camera">{video("b-video", start=MARKS["benign-search"], length=12.8, rate=0.7)}</div>
</div>
<div id="b-context"><span class="mono">{esc(F["backup"]["events"][0]["account"])}</span><p>“{esc(backup_context.split(";")[0])}”</p><strong>{esc(backup_ticket)}</strong><small>Logged context.<br>Independent approval still needs checking.</small></div>
""",
    """
#root{background:#efd49c;color:#3b2914}#b-title{left:112px;top:100px;font-size:111px;letter-spacing:-5px}#b-title span{color:#765016}
#b-window{left:865px;top:128px;width:944px;height:790px;background:#101e2b}#b-camera{left:-100px;top:-50px}
#b-context{position:absolute;left:118px;top:465px;width:690px}#b-context span{font-size:29px}#b-context p{font-size:43px;line-height:1.3;font-weight:650;margin-top:32px}
#b-context strong{display:block;font-size:58px;font-weight:750;letter-spacing:-2px;margin-top:16px}#b-context small{display:block;font-size:29px;line-height:1.45;margin-top:36px;max-width:630px}
""",
    """
tl.fromTo('#b-title',{x:-100},{x:0,duration:.6,ease:'power3.out'},0);
tl.fromTo('#b-camera',{scale:.95},{scale:1.0,duration:.6,ease:'power2.inOut'},0);
tl.fromTo('#b-context span',{opacity:0},{opacity:1,duration:.3},1.6);
tl.fromTo('#b-context p',{opacity:0},{opacity:1,duration:.4},3.2);
tl.fromTo('#b-context strong',{x:-40,opacity:0},{x:0,opacity:1,duration:.4,ease:'power3.out'},5.6);
tl.fromTo('#b-context small',{opacity:0},{opacity:1,duration:.5},8.0);
""",
)

scene(
    "review",
    12.8,
    f"""
<h2 id="r-title" class="headline">A case you can <span class="mint">defend.</span></h2>
<div id="r-fact"><span>OBSERVED</span><strong>{fails} failures → login → download</strong></div>
<div id="r-hypothesis"><span>HYPOTHESIS · UNPROVEN</span><strong>Compromised account</strong></div>
<div id="r-question"><span>OPEN QUESTION</span><strong>Who authorized this session?</strong></div>
<div id="r-window" class="mask" data-layout-allow-overflow>
 <div id="r-camera" class="camera">{video("r-video", start=MARKS["case-review"], length=12.8, rate=0.3)}</div>
</div>
<p id="r-footer" class="foot">Valid references do not prove an interpretation.</p>
""",
    """
#r-title{left:112px;top:86px;font-size:84px}
#r-fact,#r-hypothesis,#r-question{position:absolute;left:118px;width:1120px;border-left:5px solid #79e4cb;padding-left:34px}
#r-fact{top:310px}#r-hypothesis{top:500px;border-color:#e7bc74}#r-question{top:690px;border-color:#6f91aa}
#r-fact span,#r-hypothesis span,#r-question span{display:block;font:28px 'JetBrains Mono';margin-bottom:23px;color:#79e4cb}
#r-hypothesis span{color:#e7bc74}#r-question span{color:#acc4cc}
#r-fact strong,#r-hypothesis strong,#r-question strong{display:block;font-size:47px;line-height:1.2;font-weight:600;letter-spacing:-1.4px}
#r-window{left:1320px;top:298px;width:488px;height:594px;opacity:.65}#r-camera{left:-455px;top:-68px}
""",
    """
tl.fromTo('#r-title',{opacity:0},{opacity:1,duration:.4},0);
tl.fromTo('#r-camera',{scale:.95},{scale:.95,duration:12.7},0);
tl.fromTo('#r-fact',{x:-60,opacity:0},{x:0,opacity:1,duration:.5,ease:'power3.out'},.6);
tl.fromTo('#r-hypothesis',{x:-60,opacity:0},{x:0,opacity:1,duration:.5,ease:'power3.out'},3.2);
tl.fromTo('#r-question',{x:-60,opacity:0},{x:0,opacity:1,duration:.5,ease:'power3.out'},6.4);
tl.fromTo('#r-footer',{opacity:0},{opacity:1,duration:.4},8.0);
""",
)

scene(
    "continue",
    12.8,
    f"""
<div id="e-window" class="mask" data-layout-allow-overflow>
 <div id="e-export" class="camera">{video("e-vexport", start=MARKS["export"] - 0.6, length=4, at=0, rate=0.9)}</div>
 <div id="e-reopen" class="camera">{video("e-vreopen", start=REOPEN["reopened"], length=4.8, at=4, rate=1, source="reopen")}</div>
</div>
<h2 id="e-title" class="headline">Export. Reopen. Continue.</h2>
<p id="e-state" class="body">Markdown + JSON · Saved evidence and notes</p>
<div id="e-close" data-layout-allow-overflow><div id="e-mark"><span></span><span></span><span></span></div><h1>SENTINEL</h1><p>From scattered events to defensible investigations.</p><strong class="mono">uv run sentinel demo</strong></div>
<p id="e-credit">Music: “Cipher” — Kevin MacLeod · CC BY 4.0<br>incompetech.com · Edited for this film</p>
""",
    """
#e-window{left:112px;top:237px;width:1696px;height:637px}#e-export,#e-reopen{left:0;top:0}
#e-title{left:112px;top:79px;font-size:84px}#e-state{left:118px;top:906px;font-size:31px}
#e-close{position:absolute;inset:0;background:#0a1119;text-align:center;padding-top:190px}#e-close h1{font-size:154px;font-weight:800;letter-spacing:9px;line-height:1.4}
#e-close p{font-size:37px;line-height:1.5;color:#acc4cc;margin-top:25px}#e-close strong{display:inline-block;font-size:41px;font-weight:400;color:#79e4cb;margin-top:70px;border-bottom:2px solid #356158;padding-bottom:20px}
#e-mark{display:flex;gap:14px;justify-content:center;height:74px;margin-bottom:30px}#e-mark span{width:16px;background:#79e4cb;height:62px}#e-mark span:nth-child(2){height:38px}#e-mark span:nth-child(3){height:18px}
#e-credit{position:absolute;left:112px;bottom:36px;font-size:28px;line-height:1.4;color:#acc4cc}
""",
    """
tl.fromTo('#e-export',{scale:1},{scale:1,duration:4},0);
tl.fromTo('#e-reopen',{scale:1},{scale:1,duration:4.8},4);
tl.fromTo('#e-title',{opacity:0},{opacity:1,duration:.4},0);
tl.fromTo('#e-state',{opacity:0},{opacity:1,duration:.4},1.6);
tl.fromTo('#e-close',{y:1080},{y:0,duration:.6,ease:'power3.inOut'},7.4);
tl.fromTo('#e-mark span',{scaleY:0},{scaleY:1,stagger:.12,duration:.4,ease:'power3.out'},7.9);
tl.fromTo('#e-close h1',{scaleX:1.12,opacity:0},{scaleX:1,opacity:1,duration:.6,ease:'power3.out'},8.0);
tl.fromTo('#e-close p',{opacity:0},{opacity:1,duration:.4},8.65);
tl.fromTo('#e-close strong',{opacity:0},{opacity:1,duration:.4},9.2);
tl.fromTo('#e-credit',{opacity:0},{opacity:1,duration:.4},8.7);
""",
)

scenes = [
    ("question", 0, 6.4),
    ("ingest", 6.4, 12.8),
    ("case", 19.2, 12.8),
    ("agent", 32, 25.6),
    ("source", 57.6, 19.2),
    ("context", 76.8, 12.8),
    ("review", 89.6, 12.8),
    ("continue", 102.4, 12.8),
]
hosts = "\n".join(
    f'<div id="{name}" class="clip" data-composition-id="{name}" data-composition-src="compositions/{name}.html" data-start="{start}" data-duration="{duration}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>'
    for name, start, duration in scenes
)
(P / "index.html").write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>SENTINEL — Follow the evidence</title>
<script src="assets/vendor/gsap.min.js"></script>
<style>html,body{{margin:0;background:#0a1119}}#root{{position:absolute;width:1920px;height:1080px;overflow:hidden}}</style>
</head><body><div id="root" data-composition-id="main" data-start="0" data-duration="{DURATION}" data-width="1920" data-height="1080">
{hosts}
<audio id="soundtrack" class="clip" data-start="0" data-duration="{DURATION}" data-track-index="2" data-volume="1" src="assets/audio/master.wav"></audio>
</div><script>window.__timelines=window.__timelines||{{}};window.__timelines.main=gsap.timeline({{paused:true}});</script></body></html>\n''')
(P / "storyboard.json").write_text(
    json.dumps(
        {
            "duration": DURATION,
            "fps": 30,
            "frames": 3456,
            "scenes": [{"id": n, "start": s, "duration": d} for n, s, d in scenes],
            "case_id": F["case_id"],
            "agent_playback_rate": round(agent_rate, 6),
        },
        indent=2,
    )
    + "\n"
)
print("Built eight editable Hyperframes scenes from the actual captured case.")
