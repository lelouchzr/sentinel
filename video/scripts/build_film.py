"""Build a seekable explanatory film from real captured investigation evidence."""

from __future__ import annotations

import html
import json
import re
from datetime import datetime
from pathlib import Path

P = Path(__file__).resolve().parents[1]
DURATION = 115.2
F = json.loads((P / "data/evidence.json").read_text())
CAPTURE = json.loads((P / "assets/captures/capture.json").read_text())
CASE = json.loads((P / "data/case-report.json").read_text())["case"]
assert F["case_id"] == CAPTURE["case_id"] and not CAPTURE["manual_rehearsal"]
assert not CAPTURE["saved_live_case"], "This revision requires a newly recorded live investigation"
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
#root{position:absolute;inset:0;overflow:hidden;background:#0b1320;color:#eff5f5;font-family:Manrope,sans-serif}
*{box-sizing:border-box}h1,h2,p{margin:0}.teal{color:#56e1ca}.violet{color:#b3a5f6}.amber{color:#ffcd73}
.title{position:absolute;left:112px;top:90px;font-size:86px;line-height:1.08;font-weight:750;letter-spacing:-4px}
.body{position:absolute;font-size:34px;line-height:1.4;font-weight:500;letter-spacing:-.5px}
.mono{font-family:'JetBrains Mono',monospace}.label{position:absolute;font:28px/1.4 'JetBrains Mono',monospace}
.foot{position:absolute;left:114px;bottom:54px;font-size:28px;line-height:1.4;color:#a8becb}
.camera{position:absolute;width:1680px;height:1008px;transform-origin:0 0}.terminal{position:absolute;inset:0;width:1680px;height:1008px;object-fit:contain}
.mask{position:absolute;overflow:hidden;background:#0a1119;border-radius:18px;box-shadow:0 30px 65px #0004}
.clip{position:absolute}.wire{fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
"""


def video(identity, start, length, *, at=0, rate=1, source="workflow"):
    return f'<video id="{identity}" class="clip terminal" data-start="{at}" data-duration="{length}" data-media-start="{start:.4f}" data-hf-media-start-basis="local" data-playback-rate="{rate:.6f}" data-track-index="0" src="assets/captures/{source}.mp4" muted playsinline></video>'


def scene(name, duration, markup, css, animation):
    (P / "compositions" / f"{name}.html").write_text(f'''<template>
<style>{SHARED}\n{css}</style>
<div id="root" data-composition-id="{name}" data-width="1920" data-height="1080">{markup}</div>
<script>const tl=gsap.timeline({{paused:true}});{animation}
window.__timelines=window.__timelines||{{}};window.__timelines['{name}']=tl;</script>
</template>\n''')


E = F["session"]["events"]
account, ip = E[0]["account"], E[0]["source_ip"]
download = next(e for e in E if e["action"] == "download")
source = download["source"]
fails = F["account_activity"]["receipt"]["action_outcome_counts"]["login/failure"]
mb = f"{download['bytes'] / 1_000_000:g}"
backup = F["backup"]["events"][0]
context = backup["source"]["original"]["context"]
ticket = re.search(r"CHG-\d+", context).group()

# The opening sheets contain actual fields, not fabricated application panels.
scene(
    "question",
    6.4,
    f"""
<h1 id="hook" class="title">One account.<br>Scattered <span>logs.</span></h1>
<div id="sheets" data-layout-allow-overflow>
 <div id="sheet-a" class="sheet"><small>IDENTITY.CSV</small><b>{esc(E[0]["timestamp"][11:19])}</b><p>{esc(account)}<br>login · success</p><i>{esc(ip)}</i></div>
 <div id="sheet-b" class="sheet"><small>SERVICES.JSONL</small><b>{esc(E[1]["timestamp"][11:19])}</b><p>access · success<br>restricted export</p><i>{esc(E[1]["session_id"])}</i></div>
 <div id="sheet-c" class="sheet"><small>SERVICES.JSONL</small><b>{mb} MB</b><p>download · success<br>storage-01</p><i>{esc(E[2]["session_id"])}</i></div>
</div><p id="hook-question" class="body">What actually happened?</p>
<p class="foot">Fictional records. Real software. Real Meta investigation.</p>
""",
    """
#root{background:#e8e4fa;color:#20213a}#hook{top:120px;font-size:109px;letter-spacing:-6px;z-index:4}#hook span{color:#6250ae}
#sheets{position:absolute;left:930px;top:270px;width:800px;height:680px;perspective:1600px;transform-style:preserve-3d}
.sheet{position:absolute;width:650px;height:210px;padding:24px 30px;border:1px solid #bab1e2;border-radius:16px;background:#faf9ff;box-shadow:0 35px 65px #493d7b30;transform-origin:50% 50%;font-size:29px;line-height:1.5}
.sheet small{position:absolute;left:30px;top:20px;font:32px 'JetBrains Mono';color:#73679c}.sheet b{position:absolute;left:30px;top:68px;font-size:43px;letter-spacing:-2px}.sheet p{position:absolute;left:265px;top:74px;font-size:32px;line-height:1.1}.sheet i{position:absolute;left:30px;bottom:10px;font:30px 'JetBrains Mono';color:#6250ae}
#sheet-b{left:65px;top:235px;background:#d3f7ef;border-color:#82bdb0}#sheet-c{left:130px;top:470px;background:#fff0c9;border-color:#d5bd80}
#hook-question{left:118px;top:570px;font-size:53px;width:770px;font-weight:650} .foot{color:#605c7e}
""",
    """
tl.fromTo('#hook',{x:-75},{x:0,duration:.75,ease:'expo.out'},0);
tl.fromTo('#sheet-a',{rotationY:-20,rotationZ:-8,x:90,y:60},{rotationY:-12,rotationZ:-2,x:0,y:0,duration:.9,ease:'back.out(1.3)'},0);
tl.fromTo('#sheet-b',{x:330,y:180,rotationZ:12,opacity:0},{x:0,y:0,rotationZ:2,opacity:1,duration:.75,ease:'back.out(1.5)'},.5);
tl.fromTo('#sheet-c',{x:450,y:250,rotationZ:-12,opacity:0},{x:0,y:0,rotationZ:-2,opacity:1,duration:.8,ease:'back.out(1.5)'},1.1);
tl.fromTo('#hook-question',{scale:.88,opacity:0},{scale:1,opacity:1,duration:.7,ease:'back.out(1.1)'},2.6);
tl.to('#sheets',{x:-190,y:-90,scale:.9,duration:.5,ease:'power3.in'},5.9);
""",
)

scene(
    "normalize",
    6.4,
    f"""
<h2 class="title" id="n-title">Bring the sources <span>together.</span></h2>
<div id="n-world"><div id="n-csv" class="n-source mono">CSV</div><div id="n-json" class="n-source mono">JSONL</div>
<svg id="n-wires" viewBox="0 0 1696 560"><path id="n-wire1" class="wire" d="M280 110 H480 Q540 110 540 170 V270 H670"/><path id="n-wire2" class="wire" d="M280 430 H480 Q540 430 540 370 V270 H670"/></svg>
<div id="n-stack"><div id="n-layer3"></div><div id="n-layer2"></div><div id="n-layer1"><strong>{F["dataset"]["event_count"]:,}</strong><span>normalized events</span></div></div>
<p id="n-meta" class="mono">UTC timestamps<br>Stable event IDs<br>Original source + SHA-256</p></div>
<p class="foot" id="n-foot">Local DuckDB workspace · Source files remain read-only</p>
""",
    """
#root{background:#d3f7ef;color:#123c39}#n-title{font-size:84px}#n-title span{color:#207b6a}#n-world{position:absolute;left:112px;top:310px;width:1696px;height:560px;perspective:1400px}
.n-source{position:absolute;left:30px;width:250px;height:126px;border:2px solid #69ac9c;border-radius:12px;background:#ecfffa;display:grid;place-items:center;font-size:48px;box-shadow:0 16px 0 #97d2c3}#n-csv{top:45px}#n-json{top:365px}
#n-wires{position:absolute;inset:0;width:1696px;height:560px;color:#338d7b}.wire{stroke-dasharray:800;stroke-dashoffset:0}
#n-stack{position:absolute;left:650px;top:100px;width:440px;height:300px;perspective:1200px}#n-stack>div{position:absolute;width:440px;height:270px;border-radius:14px;border:2px solid #317867;box-shadow:0 28px 40px #19493e20}
#n-layer3{top:50px;left:30px;background:#64af9b}#n-layer2{top:25px;left:15px;background:#8ccdbb}#n-layer1{background:#f3fffb;padding:34px 45px}#n-layer1 strong{font-size:107px;letter-spacing:-7px;line-height:1.1}#n-layer1 span{font-size:32px;display:block;margin-top:12px}
#n-meta{position:absolute;left:1190px;top:145px;font-size:28px;line-height:2.4;color:#24594f}#n-foot{color:#24594f}
""",
    """
tl.fromTo('#n-title',{x:100,opacity:0},{x:0,opacity:1,duration:.55,ease:'expo.out'},0);
tl.fromTo('.n-source',{scale:.6,rotationZ:-8,opacity:0},{scale:1,rotationZ:0,opacity:1,stagger:.15,duration:.65,ease:'back.out(1.5)'},.3);
tl.fromTo('.wire',{strokeDashoffset:800},{strokeDashoffset:0,stagger:.18,duration:.8,ease:'power2.inOut'},1.8);
tl.fromTo('#n-stack',{rotationY:-25,rotationX:12,scale:.75,opacity:0},{rotationY:-8,rotationX:7,scale:1,opacity:1,duration:.9,ease:'back.out(1.2)'},.8);
tl.fromTo('#n-layer1',{z:100},{z:0,duration:1,ease:'elastic.out(1,.65)'},1.7);
tl.fromTo('#n-meta',{x:65,opacity:0},{x:0,opacity:1,duration:.5,ease:'expo.out'},2.5);
tl.to('#n-wires',{opacity:0,duration:.15},5.5);
tl.to('#n-stack',{rotationY:0,rotationX:0,scale:1.16,x:130,duration:.6,ease:'power3.inOut'},5.7);
""",
)

case_start = max(MARKS["workspace"], MARKS["case-open"] - 2)
scene(
    "case",
    9.6,
    f"""
<h2 id="c-title" class="title">Start with a <span class="teal">signal.</span></h2>
<p id="c-count" class="label">{F["alerts"]} alerts · {len(F["rules"])} deterministic rules</p>
<div id="c-window" class="mask" data-layout-allow-overflow><div id="c-camera" class="camera">{video("c-video", case_start, 9.6, rate=0.8)}</div></div>
<p id="c-note" class="body">Repeated failures.<br>A successful login follows.</p>
<p class="foot">Open the alert as a persistent case. Severity is not certainty.</p>
""",
    """
#c-title{font-size:88px;top:75px}#c-count{left:118px;top:200px;color:#a8becb}#c-window{left:112px;top:285px;width:1696px;height:650px}#c-camera{left:0;top:0}
#c-note{left:1125px;top:530px;width:620px;background:#0b1320f5;padding:30px;font-size:42px;border-left:4px solid #56e1ca}
""",
    """
tl.fromTo('#c-title',{y:40,opacity:0},{y:0,opacity:1,duration:.6,ease:'expo.out'},0);
tl.fromTo('#c-window',{y:100,rotationX:6,opacity:0},{y:0,rotationX:0,opacity:1,duration:.8,ease:'power4.out'},.2);
tl.fromTo('#c-camera',{scale:1},{scale:1.2,x:-10,y:-60,duration:.7,ease:'power2.inOut'},1);
tl.fromTo('#c-note',{x:60,opacity:0},{x:0,opacity:1,duration:.5,ease:'power3.out'},2.5);
tl.to('#c-note',{opacity:0,duration:.25},6.4);
tl.to('#c-camera',{scale:1.12,x:-310,y:-110,duration:.7,ease:'power2.inOut'},6.4);
""",
)

scene(
    "protocol",
    12.8,
    """
<h2 id="p-title" class="title">The model chooses.<br>The tools retrieve.</h2>
<div id="p-model" class="p-block"><span>META MODEL API</span><strong>Muse Spark</strong><small>Chooses the next focused search</small></div>
<div id="p-mcp" class="p-block"><span>LOCAL MCP SERVER</span><strong>Bounded tools</strong><small>Searches this workspace only</small></div>
<svg id="p-paths" viewBox="0 0 1920 1080"><path id="p-request" class="wire" d="M720 500 H1160 l-20 -16 M1140 516 L1160 500"/><path id="p-response" class="wire" d="M1160 650 H720 l20 -16 M740 666 L720 650"/></svg>
<div id="p-call" class="label">search_events(filters)</div><div id="p-reply" class="label">Event IDs + source references</div>
<div id="p-store" class="mono">DuckDB · Imported events</div>
<p id="p-discover" class="body">Discover → Search → Inspect → Review</p>
<p class="foot">Real stdio protocol · Selected log excerpts are sent to Meta</p>
""",
    """
#root{background:#eeeafb;color:#27233f}#p-title{font-size:88px}#p-title:first-line{color:#6650b2}
.p-block{position:absolute;top:415px;width:550px;height:300px;padding:42px;border-radius:20px;border:2px solid #b2a1dc;background:#fcfaff;box-shadow:0 25px 0 #c5b7e4,0 46px 60px #4b327c21;transform-origin:50% 50%}
#p-model{left:150px}#p-mcp{left:1180px;background:#ddfaf2;border-color:#73ac9d;box-shadow:0 25px 0 #9ed4c4,0 46px 60px #4b327c21}
.p-block span{font:28px 'JetBrains Mono';color:#635380}.p-block strong{font-size:61px;line-height:1.5;display:block;font-weight:750;letter-spacing:-3px}.p-block small{font-size:28px;line-height:1.4}
#p-paths{position:absolute;inset:0;width:1920px;height:1080px;color:#6d55b8}.wire{stroke-dasharray:500;stroke-dashoffset:0}
#p-call{left:750px;top:440px;font-size:28px}#p-reply{left:725px;top:680px;font-size:28px;width:430px;text-align:center}
#p-store{position:absolute;left:1225px;top:790px;font-size:29px;border-top:3px solid #509b85;padding-top:25px}
#p-discover{left:153px;top:855px;font-size:38px;color:#6650b2}.foot{color:#645d78}
""",
    """
tl.fromTo('#p-title',{x:-65,opacity:0},{x:0,opacity:1,duration:.6,ease:'expo.out'},0);
tl.fromTo('#p-model',{rotationY:12,y:90,opacity:0},{rotationY:0,y:0,opacity:1,duration:.8,ease:'back.out(1.3)'},.5);
tl.fromTo('#p-mcp',{rotationY:-12,y:90,opacity:0},{rotationY:0,y:0,opacity:1,duration:.8,ease:'back.out(1.3)'},1.5);
tl.fromTo('#p-request',{strokeDashoffset:500},{strokeDashoffset:0,duration:.9,ease:'power2.inOut'},2.5);
tl.fromTo('#p-call',{opacity:0,y:15},{opacity:1,y:0,duration:.4,ease:'power3.out'},2.7);
tl.fromTo('#p-store',{scaleX:.6,opacity:0},{scaleX:1,opacity:1,duration:.6,ease:'back.out(1.2)'},4.2);
tl.fromTo('#p-response',{strokeDashoffset:-500},{strokeDashoffset:0,duration:.9,ease:'power2.inOut'},5.2);
tl.fromTo('#p-reply',{opacity:0},{opacity:1,duration:.4},5.6);
tl.fromTo('#p-discover',{x:80,opacity:0},{x:0,opacity:1,duration:.7,ease:'expo.out'},7.2);
tl.to('#p-model',{scale:.96,duration:.25,ease:'power2.in'},10.7);
tl.to('#p-model',{scale:1,duration:.45,ease:'back.out(2)'},10.95);
""",
)

agent_length = MARKS["review"] - MARKS["agent-start"]
agent_rate = agent_length / 22.4
start = next(a for a in CASE["activity"] if a["action"] == "Investigation started")


def phase(role, action):
    item = next(a for a in CASE["activity"] if a["role"] == role and a["action"] == action)
    return min(
        21,
        max(
            0.5,
            (
                datetime.fromisoformat(item["timestamp"])
                - datetime.fromisoformat(start["timestamp"])
            ).total_seconds()
            / agent_length
            * 22.4,
        ),
    )


review_at = phase("Evidence reviewer", "Checking support, gaps, and alternative explanations")
report_at = phase("Reporter", "Producing structured findings with source references")
scene(
    "agent",
    22.4,
    f"""
<h2 id="a-title" class="title">A real <span class="teal">investigation.</span></h2>
<p id="a-disclosure" class="label">Recorded live · {agent_rate:.2f}× playback · Meta Model API</p>
<div id="a-window" class="mask" data-layout-allow-overflow><div id="a-camera" class="camera">{video("a-video", MARKS["agent-start"], 22.4, rate=agent_rate)}</div></div>
<div id="a-step1" class="a-step"><span>01 / INVESTIGATOR</span><strong>Chooses searches<br>from tool results</strong></div>
<div id="a-step2" class="a-step"><span>02 / EVIDENCE REVIEWER</span><strong>Checks support<br>and alternatives</strong></div>
<div id="a-step3" class="a-step"><span>03 / REPORTER</span><strong>Creates a report<br>with verified IDs</strong></div>
<p id="a-metrics" class="body">{F["mcp_calls"]} MCP calls<br>{F["evidence_count"]} attached events</p>
<p class="foot">Actual terminal output · {F["live_elapsed_seconds"]:.1f}s investigation, time-compressed</p>
""",
    """
#a-title{font-size:85px;top:76px}#a-disclosure{left:118px;top:202px;color:#a8becb;font-size:28px}#a-window{left:730px;top:300px;width:1078px;height:623px}#a-camera{left:-390px;top:-110px}
.a-step{position:absolute;left:118px;top:366px;width:580px}.a-step span{font:28px 'JetBrains Mono';color:#56e1ca}.a-step strong{display:block;font-size:43px;line-height:1.3;font-weight:650;letter-spacing:-1.6px;margin-top:25px}
#a-metrics{left:120px;top:735px;font-size:33px;line-height:1.6;color:#a8becb}
""",
    f"""
tl.fromTo('#a-title',{{x:-50,opacity:0}},{{x:0,opacity:1,duration:.6,ease:'expo.out'}},0);
tl.set('#a-camera',{{scale:1.06}},0);
tl.fromTo('#a-window',{{x:160,opacity:0}},{{x:0,opacity:1,duration:.8,ease:'power4.out'}},0);
tl.fromTo('#a-step1',{{opacity:0}},{{opacity:1,duration:.3}},.2);
tl.to('#a-step1',{{y:-25,opacity:0,duration:.2}},{max(0.3, review_at - 0.2):.4f});
tl.fromTo('#a-step2',{{y:35,opacity:0}},{{y:0,opacity:1,duration:.4,ease:'back.out(1.1)'}},{review_at:.4f});
tl.to('#a-step2',{{y:-25,opacity:0,duration:.2}},{max(review_at + 0.4, report_at - 0.2):.4f});
tl.fromTo('#a-step3',{{y:35,opacity:0}},{{y:0,opacity:1,duration:.4,ease:'back.out(1.1)'}},{report_at:.4f});
tl.fromTo('#a-metrics',{{opacity:0}},{{opacity:1,duration:.35}},19.2);
""",
)

node_markup = "".join(
    f'<div id="t-node{i}" class="t-node"><span class="mono">{e["timestamp"][11:19]} UTC</span><strong>{esc(e["action"]).title()}</strong><p>{esc(e["host"])}</p><small>{esc(e["event_id"][:14])}…</small></div>'
    for i, e in enumerate(E)
)
scene(
    "relations",
    12.8,
    f"""
<h2 id="t-title" class="title">Connect events with <span>evidence.</span></h2>
<p id="t-account" class="label">{esc(account)} · {esc(ip)}</p>
<div id="t-scene"><svg id="t-line" viewBox="0 0 1696 560"><path class="wire" id="t-spine" d="M420 200 H655"/><path class="wire" id="t-spine2" d="M1045 200 H1280"/><path class="wire" id="t-branch" d="M230 200 V410 H1480 V200"/></svg>{node_markup}
<div id="t-session" class="mono">{esc(E[0]["session_id"])}</div></div>
<p id="t-context" class="body">{fails} earlier failed logins · Same account and source IP</p>
<p class="foot">The session identifier links the three successful events.</p>
""",
    """
#root{background:#d6f2ef;color:#153e3b}#t-title{font-size:85px}#t-title span{color:#247d6b}#t-account{left:118px;top:220px;font-size:30px;color:#376d65}
#t-scene{position:absolute;left:112px;top:335px;width:1696px;height:560px;perspective:1600px}#t-line{position:absolute;inset:0;width:1696px;height:560px;color:#418b7a}.wire{stroke-dasharray:1600;stroke-dashoffset:0}#t-branch{stroke-width:3;stroke:#6f9d92}
.t-node{position:absolute;top:50px;width:390px;height:280px;padding:32px;background:#f4fffb;border:2px solid #7ab6a5;border-radius:15px;box-shadow:0 20px 0 #9bcfbe,0 40px 50px #205f4d1c}.t-node span{font-size:28px;color:#3e766a}.t-node strong{display:block;font-size:55px;letter-spacing:-2px;margin-top:14px}.t-node p{font-size:29px;margin-top:10px}.t-node small{font:28px 'JetBrains Mono';display:block;margin-top:20px;color:#46796d}
#t-node0{left:30px}#t-node1{left:655px}#t-node2{left:1280px}#t-session{position:absolute;left:620px;top:382px;background:#d6f2ef;padding:7px 32px;font-size:31px;color:#256d5d}
#t-context{left:118px;top:875px;font-size:32px}.foot{color:#396d63}
""",
    """
tl.fromTo('#t-title',{scaleX:1.06,opacity:0},{scaleX:1,opacity:1,duration:.55,ease:'expo.out'},0);
tl.fromTo('#t-node0',{scale:.7,rotationY:-18,opacity:0},{scale:1,rotationY:0,opacity:1,duration:.8,ease:'back.out(1.5)'},.7);
tl.fromTo('#t-spine',{strokeDasharray:235,strokeDashoffset:235},{strokeDashoffset:0,duration:.7,ease:'power2.inOut'},3.25);
tl.fromTo('#t-spine2',{strokeDasharray:235,strokeDashoffset:235},{strokeDashoffset:0,duration:.7,ease:'power2.inOut'},4.65);
tl.fromTo('#t-node1',{y:85,rotationY:-18,opacity:0},{y:0,rotationY:0,opacity:1,duration:.8,ease:'back.out(1.5)'},2.4);
tl.fromTo('#t-node2',{y:85,rotationY:-18,opacity:0},{y:0,rotationY:0,opacity:1,duration:.8,ease:'back.out(1.5)'},3.8);
tl.fromTo('#t-branch',{strokeDashoffset:1600},{strokeDashoffset:0,duration:1.2,ease:'power2.inOut'},5.2);
tl.fromTo('#t-session',{scale:.7,opacity:0},{scale:1,opacity:1,duration:.6,ease:'back.out(1.8)'},6.1);
tl.fromTo('#t-context',{opacity:0},{opacity:1,duration:.4},8.1);
tl.to('#t-node2',{scale:1.08,z:60,duration:.7,ease:'power2.inOut'},11.8);
""",
)

original = json.dumps(source["original"], indent=2)
scene(
    "source",
    9.6,
    f"""
<h2 id="s-title" class="title">Open the <span class="teal">original record.</span></h2>
<div id="s-window" class="mask" data-layout-allow-overflow><div id="s-camera" class="camera">{video("s-video", MARKS["provenance"], 9.6, rate=0.22)}</div></div>
<div id="s-source"><span class="mono">RECORDED DOWNLOAD</span><strong>{mb} MB</strong><p>{esc(source["filename"])} · line {source["line"]}</p><small class="mono">SHA-256<br>{source["sha256"][:24]}…</small><div id="s-id" class="mono">{esc(download["event_id"])}</div></div>
<p class="foot">Source position + file hash + original fields. A download does not prove exfiltration.</p>
""",
    """
#s-title{font-size:85px;top:85px}#s-window{left:112px;top:290px;width:1115px;height:627px}#s-camera{left:-157px;top:-245px}#s-source{position:absolute;left:1300px;top:332px;width:510px}#s-source>span{font-size:28px;color:#56e1ca}#s-source strong{display:block;font-size:98px;letter-spacing:-5px;line-height:1.5}#s-source p{font-size:32px;line-height:1.5}#s-source small{display:block;font-size:28px;line-height:1.6;color:#a8becb;margin-top:36px}#s-id{font-size:28px;margin-top:55px;color:#8ba4b6}
""",
    """
tl.fromTo('#s-title',{x:-55,opacity:0},{x:0,opacity:1,duration:.55,ease:'expo.out'},0);
tl.set('#s-camera',{scale:1.05},0);
tl.fromTo('#s-window',{scale:.92,opacity:0},{scale:1,opacity:1,duration:.7,ease:'power4.out'},0);
tl.fromTo('#s-source',{x:100,opacity:0},{x:0,opacity:1,duration:.65,ease:'back.out(1.1)'},.7);
tl.fromTo('#s-source strong',{scale:.85},{scale:1,duration:.6,ease:'back.out(1.3)'},1.6);
""",
)

scene(
    "context",
    9.6,
    f"""
<h2 id="b-title" class="title">High volume.<br><span>Different context.</span></h2>
<div id="b-evidence"><span class="mono">{esc(backup["account"])}</span><strong>{esc(context.split(";")[0])}</strong><div id="b-ticket" class="mono">{esc(ticket)}</div><p>Operations · Scheduled window<br>13:00–13:30 UTC</p></div>
<div id="b-window" class="mask" data-layout-allow-overflow><div id="b-camera" class="camera">{video("b-video", MARKS["benign-record"], 9.6, rate=0.3)}</div></div>
<p class="foot">A benign explanation in the logs. Independent approval still needs checking.</p>
""",
    """
#root{background:#ffe4ad;color:#51381a}#b-title{font-size:100px;letter-spacing:-5px}#b-title span{color:#96702e}#b-evidence{position:absolute;left:118px;top:440px;width:730px}#b-evidence>span{font-size:28px}#b-evidence strong{display:block;font-size:43px;line-height:1.3;letter-spacing:-1.2px;margin-top:26px;width:700px}#b-ticket{display:inline-block;margin-top:26px;padding:16px 26px;background:#fff5da;border:2px solid #c3a064;border-radius:12px;font-size:36px;box-shadow:0 10px 0 #d8b77e}#b-evidence p{font-size:29px;line-height:1.5;margin-top:36px}#b-window{left:915px;top:290px;width:890px;height:625px}#b-camera{left:-120px;top:-140px}.foot{color:#806134}
""",
    """
tl.fromTo('#b-title',{x:-70},{x:0,duration:.6,ease:'expo.out'},0);
tl.fromTo('#b-window',{x:180,rotationY:-8,opacity:0},{x:0,rotationY:0,opacity:1,duration:.8,ease:'power4.out'},.2);
tl.set('#b-camera',{scale:1},0);
tl.fromTo('#b-evidence>span',{opacity:0},{opacity:1,duration:.3},.8);
tl.fromTo('#b-evidence strong',{y:25,opacity:0},{y:0,opacity:1,duration:.5,ease:'power3.out'},1.6);
tl.fromTo('#b-ticket',{rotationZ:-6,scale:.6,opacity:0},{rotationZ:0,scale:1,opacity:1,duration:.8,ease:'elastic.out(1,.65)'},3.2);
tl.fromTo('#b-evidence p',{opacity:0},{opacity:1,duration:.4},5.2);
""",
)

categories = {
    c: sum(f["category"] == c for f in F["findings"])
    for c in ["observed_fact", "hypothesis", "open_question"]
}
scene(
    "review",
    12.8,
    f"""
<h2 id="r-title" class="title">Know what the evidence <span class="teal">supports.</span></h2>
<div id="r-fact" class="r-row"><span>OBSERVED FACTS</span><strong>{fails} failures → login → download</strong><small>Canonical records + computed query receipts</small></div>
<div id="r-hypothesis" class="r-row"><span>HYPOTHESIS · UNPROVEN</span><strong>Was the account compromised?</strong><small>The recorded sequence does not establish intent</small></div>
<div id="r-question" class="r-row"><span>OPEN QUESTION</span><strong>Who authorized this session?</strong><small>Check with the owner and independent audit records</small></div>
<div id="r-stamp"><b>REVIEWED</b><span>{len(F["findings"])} findings<br>Event IDs checked in code</span></div>
<p class="foot">A valid reference is necessary. It does not prove an interpretation.</p>
""",
    """
#r-title{font-size:78px;max-width:1640px}.r-row{position:absolute;left:118px;width:1210px;border-left:5px solid #56e1ca;padding-left:32px}#r-fact{top:300px}#r-hypothesis{top:510px;border-color:#ffcd73}#r-question{top:720px;border-color:#b3a5f6}.r-row span{font:28px 'JetBrains Mono';color:#56e1ca}.r-row strong{display:block;font-size:46px;font-weight:650;letter-spacing:-1.5px;margin-top:16px}.r-row small{display:block;font-size:28px;color:#a8becb;margin-top:13px}#r-hypothesis span{color:#ffcd73}#r-question span{color:#b3a5f6}
#r-stamp{position:absolute;left:1410px;top:400px;width:390px;height:300px;border:2px solid #487b72;border-radius:50%;display:flex;flex-direction:column;justify-content:center;text-align:center;background:#142f30;box-shadow:0 18px 0 #102325}#r-stamp b{font:34px 'JetBrains Mono';color:#56e1ca}#r-stamp span{font-size:28px;line-height:1.6;margin-top:24px;color:#bed8d0}
""",
    """
tl.fromTo('#r-title',{opacity:0},{opacity:1,duration:.4},0);
tl.fromTo('#r-fact',{x:-80,opacity:0},{x:0,opacity:1,duration:.6,ease:'expo.out'},.5);
tl.fromTo('#r-hypothesis',{x:-80,opacity:0},{x:0,opacity:1,duration:.6,ease:'expo.out'},3.2);
tl.fromTo('#r-question',{x:-80,opacity:0},{x:0,opacity:1,duration:.6,ease:'expo.out'},6.4);
tl.fromTo('#r-stamp',{scale:1.4,rotationZ:-12,opacity:0},{scale:1,rotationZ:0,opacity:1,duration:.8,ease:'back.out(1.8)'},8.2);
""",
)

scene(
    "continue",
    12.8,
    f"""
<h2 id="e-title" class="title">Export. Reopen. Continue.</h2>
<div id="e-window" class="mask" data-layout-allow-overflow><div id="e-export" class="camera">{video("e-export-video", MARKS["export"] - 0.6, 4, rate=0.9)}</div><div id="e-reopen" class="camera">{video("e-reopen-video", REOPEN["reopened"], 4, at=4, source="reopen")}</div></div>
<p id="e-formats" class="body">Markdown + JSON · Saved evidence, notes and activity</p>
<div id="e-close" data-layout-allow-overflow data-layout-allow-occlusion><div id="e-line"></div><h1 id="e-brand">SENTINEL</h1><p id="e-tagline">From scattered events to defensible investigations.</p><strong id="e-command" class="mono">uv run sentinel demo</strong><p id="e-credits">“Cipher” · Kevin MacLeod · incompetech.com<br>CC BY 4.0 · creativecommons.org/licenses/by/4.0 · Edited</p></div>
""",
    """
#e-title{font-size:85px;top:78px}#e-window{left:112px;top:255px;width:1696px;height:630px}#e-export,#e-reopen{left:0;top:0}#e-formats{left:118px;top:924px;font-size:31px;color:#a8becb}
#e-close{position:absolute;inset:0;background:#d3f7ef;color:#143d36;text-align:center}#e-line{position:absolute;left:170px;top:220px;width:1580px;height:4px;background:#3c9f87;transform-origin:0 0}#e-brand{position:absolute;top:288px;left:100px;width:1720px;font-size:168px;font-weight:800;letter-spacing:13px;line-height:1.3}#e-tagline{position:absolute;top:535px;width:1920px;font-size:37px;line-height:1.5;color:#3d7064}#e-command{position:absolute;left:520px;top:685px;width:880px;font-size:45px;font-weight:400;line-height:1.7;border:2px solid #77bca8;border-radius:12px;background:#edfff8;box-shadow:0 13px 0 #a1d3c2}#e-credits{position:absolute;left:120px;bottom:52px;width:1680px;font-size:28px;line-height:1.5;color:#4a7569}
""",
    """
tl.set('#e-export',{scale:1},0);tl.set('#e-reopen',{scale:1},4);
tl.fromTo('#e-title',{opacity:0},{opacity:1,duration:.35},0);
tl.fromTo('#e-formats',{opacity:0},{opacity:1,duration:.35},.7);
tl.to('#e-title,#e-formats',{opacity:0,duration:.2},7.15);
tl.fromTo('#e-close',{y:1080},{y:0,duration:.6,ease:'power3.inOut'},7.4);
tl.fromTo('#e-line',{scaleX:0},{scaleX:1,duration:.6,ease:'expo.out'},7.85);
tl.fromTo('#e-brand',{scale:.87,opacity:0},{scale:1,opacity:1,duration:.7,ease:'back.out(1.3)'},7.95);
tl.fromTo('#e-tagline',{opacity:0},{opacity:1,duration:.4},8.5);
tl.fromTo('#e-command',{y:25,opacity:0},{y:0,opacity:1,duration:.6,ease:'back.out(1.2)'},8.8);
tl.fromTo('#e-credits',{opacity:0},{opacity:1,duration:.3},7.8);
""",
)

scenes = [
    ("question", 0, 6.4),
    ("normalize", 6.4, 6.4),
    ("case", 12.8, 9.6),
    ("protocol", 22.4, 12.8),
    ("agent", 35.2, 22.4),
    ("relations", 57.6, 12.8),
    ("source", 70.4, 9.6),
    ("context", 80, 9.6),
    ("review", 89.6, 12.8),
    ("continue", 102.4, 12.8),
]
hosts = "\n".join(
    f'<div id="{n}" class="clip" data-composition-id="{n}" data-composition-src="compositions/{n}.html" data-start="{s}" data-duration="{d}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>'
    for n, s, d in scenes
)
(P / "index.html").write_text(
    f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SENTINEL — Follow the evidence</title><script src="assets/vendor/gsap.min.js"></script><style>html,body{{margin:0;background:#0b1320}}#root{{position:absolute;width:1920px;height:1080px;overflow:hidden}}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="{DURATION}" data-width="1920" data-height="1080">{hosts}<audio id="soundtrack" class="clip" data-start="0" data-duration="{DURATION}" data-track-index="2" data-volume="1" src="assets/audio/master.wav"></audio></div><script>window.__timelines=window.__timelines||{{}};window.__timelines.main=gsap.timeline({{paused:true}});</script></body></html>\n'''
)
(P / "storyboard.json").write_text(
    json.dumps(
        {
            "duration": DURATION,
            "fps": 30,
            "frames": 3456,
            "scenes": [{"id": n, "start": s, "duration": d} for n, s, d in scenes],
            "case_id": F["case_id"],
            "agent_playback_rate": round(agent_rate, 6),
            "review_handoff_seconds": round(review_at, 4),
            "report_handoff_seconds": round(report_at, 4),
        },
        indent=2,
    )
    + "\n"
)
print("Built ten editable explanatory scenes from the new live capture.")
