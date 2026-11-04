"""Author a continuous product film with real evidence, recordings and architecture."""

from __future__ import annotations

import html
import json
import re
from datetime import datetime
from pathlib import Path

P = Path(__file__).resolve().parents[1]
DURATION = 144.0
F = json.loads((P / "data/evidence.json").read_text())
CAP = json.loads((P / "source-captures/capture.json").read_text())
CASE = json.loads((P / "data/case-report.json").read_text())["case"]
MAP = json.loads((P / "data/event-map.json").read_text())
M = {
    m["name"]: m["time"]
    for m in json.loads((P / "source-captures/workflow.marks.json").read_text())
}
R = {
    m["name"]: m["time"] for m in json.loads((P / "source-captures/reopen.marks.json").read_text())
}
assert F["case_id"] == CAP["case_id"] == CASE["case_id"] and not CAP["saved_live_case"]
assert len(MAP["points"]) == F["dataset"]["event_count"]
E = F["session"]["events"]
LOGIN, ACCESS, DOWNLOAD = E
SOURCE = DOWNLOAD["source"]
FAILS = F["account_activity"]["receipt"]["action_outcome_counts"]["login/failure"]
MB = f"{DOWNLOAD['bytes'] / 1_000_000:g}"
BACKUP = F["backup"]["events"][0]
CONTEXT = BACKUP["source"]["original"]["context"]
TICKET = re.search(r"CHG-\d+", CONTEXT).group()
assert F["backup"]["receipt"]["total_bytes"] == F["session"]["receipt"]["total_bytes"]


def esc(value):
    return html.escape(str(value), quote=True)


def words(text, prefix):
    return " ".join(
        f'<span id="{prefix}-{i}" class="word" data-layout-allow-occlusion>{esc(w)}</span>'
        for i, w in enumerate(text.split())
    )


def vid(identity, mark, duration, *, rate=1, at=0, source="workflow"):
    return f'<video id="{identity}" class="clip film" data-start="{at}" data-duration="{duration}" data-media-start="{mark:.4f}" data-hf-media-start-basis="local" data-playback-rate="{rate:.7f}" data-track-index="0" src="assets/captures/{source}.mp4" muted playsinline data-motion-blur="off"></video>'


COMMON = """
@font-face{font-family:Manrope;src:url('assets/fonts/Manrope.ttf') format('truetype');font-weight:200 800}
@font-face{font-family:JetBrains;src:url('assets/fonts/JetBrainsMono-Regular.ttf') format('truetype')}
#root{position:absolute;inset:0;overflow:hidden;background:#f6faf9;color:#0e1724;font-family:Manrope,sans-serif}
*{box-sizing:border-box}h1,h2,p,pre{margin:0}b,strong{font-weight:760}.mono{font-family:JetBrains,monospace}
.clip{position:absolute}.film{position:absolute;inset:0;width:1680px;height:1008px;object-fit:contain}
.camera{position:absolute;width:1680px;height:1008px;transform-origin:0 0}.window{position:absolute;overflow:hidden;background:#0a1119;border-radius:22px;box-shadow:0 34px 80px #00152840}
.title{position:absolute;font-size:104px;line-height:1.05;font-weight:760;letter-spacing:-5px}.copy{position:absolute;font-size:36px;line-height:1.4;letter-spacing:-.7px}
.label{position:absolute;font:30px/1.45 JetBrains,monospace}.foot{position:absolute;left:120px;bottom:53px;font-size:29px;line-height:1.4;color:#526976}
.word{display:inline-block}.mask-text{overflow:hidden}.teal{color:#41ead1}.blue{color:#164ae9}.orange{color:#ff8a50}
.stage{position:absolute;inset:0;background:radial-gradient(ellipse at 12% 100%,#15efd0 0%,transparent 56%),radial-gradient(ellipse at 88% 0%,#1674ff 0%,transparent 65%),#1545d8}
.plate{position:absolute;border:1px solid #ffffff65;border-radius:24px;background:linear-gradient(145deg,#ffffffeb,#ffffffd6);box-shadow:0 22px 0 #041c7540,0 45px 85px #061b6340}
.route{fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
.packet{position:absolute;width:24px;height:24px;border-radius:6px;background:#41ead1;box-shadow:0 0 0 6px #41ead122}
.tag{display:inline-block;padding:12px 23px;border:1px solid #789ba6;border-radius:12px;font:30px JetBrains;background:#fff}
"""
BUILT = []


def scene(name, duration, markup, css, code, extra=""):
    BUILT.append(name)
    (P / "compositions" / f"{name}.html").write_text(f'''<template><style>{COMMON}\n{css}</style>
<div id="root" data-composition-id="{name}" data-width="1920" data-height="1080" data-motion-blur="on" data-motion-blur-shutter="180">{markup}</div>
<script>const tl=gsap.timeline({{paused:true}});{extra}\n{code}
window.__timelines=window.__timelines||{{}};window.__timelines['{name}']=tl;</script></template>\n''')


scene(
    "hook",
    9.6,
    f"""
<div id="h-stage" class="stage" data-layout-allow-occlusion></div>
<div id="h-login" class="h-line mask-text" data-layout-allow-overflow data-layout-allow-occlusion data-layout-allow-overlap><h1>{words("A login.", "hl")}</h1></div>
<div id="h-download" class="h-line mask-text" data-layout-allow-overflow data-layout-allow-occlusion data-layout-allow-overlap><h1>{words("A download.", "hd")}</h1></div>
<div id="h-story" class="h-line mask-text" data-layout-allow-overflow data-layout-allow-occlusion data-layout-allow-overlap><h1>{words("What connects them?", "hs")}</h1></div>
<div id="h-record1" class="h-record" data-layout-allow-overflow><span class="mono">{esc(LOGIN["timestamp"][11:19])} UTC</span><b>login · success</b><small>{esc(LOGIN["account"])} · {esc(LOGIN["source_ip"])}</small></div>
<div id="h-record2" class="h-record" data-layout-allow-overflow><span class="mono">{esc(DOWNLOAD["timestamp"][11:19])} UTC</span><b>download · {MB} MB</b><small>{esc(DOWNLOAD["session_id"])}</small></div>
<div id="h-carrier" data-layout-allow-overflow data-layout-allow-occlusion><span class="mono">{esc(LOGIN["session_id"])}</span></div>
<p id="h-foot" class="foot">Fictional logs. Real evidence. Actual Meta investigation.</p>
""",
    """
#h-stage{opacity:0} .h-line{position:absolute;left:120px;top:180px;width:1680px;height:275px}.h-line h1{font-size:188px;line-height:1.22;letter-spacing:-10px;font-weight:800}
#h-story h1{font-size:130px;letter-spacing:-7px;line-height:1.6}#h-download h1{color:#1548df}
.h-record{position:absolute;left:290px;top:540px;width:1340px;height:200px;border:1px solid #bad0d4;border-radius:20px;padding:30px 44px;background:#fff;box-shadow:0 24px 0 #dcebe7,0 46px 60px #173c5620}
.h-record span{font-size:32px;display:block;color:#42616d}.h-record b{display:block;font-size:56px;letter-spacing:-2px;line-height:1.4}.h-record small{position:absolute;right:44px;top:88px;font:31px JetBrains;color:#42616d}
#h-record2{background:#122e82;border-color:#4067d0;color:#fff;box-shadow:0 24px 0 #0c2263}#h-record2 span,#h-record2 small{color:#b3dbff}
#h-carrier{position:absolute;left:700px;top:550px;width:520px;height:160px;background:#41ead1;border-radius:24px;display:grid;place-items:center;color:#073737;box-shadow:0 22px 0 #0d48b0}#h-carrier span{font-size:43px}
""",
    """
tl.fromTo('#h-login h1',{x:45},{x:0,duration:.65,ease:'expo.out'},0);
tl.fromTo('#h-record1',{x:180,rotationZ:3,opacity:0},{x:0,rotationZ:0,opacity:1,duration:.7,ease:'back.out(1.1)'},.4);
tl.to('#h-login .word',{y:-245,stagger:.04,duration:.35,ease:'power3.in'},2.55);
tl.fromTo('#h-download .word',{y:260},{y:0,stagger:.08,duration:.65,ease:'expo.out'},2.65);
tl.to('#h-record1',{opacity:0,duration:.15},2.75);
tl.to('#h-record1',{x:-1750,duration:.5,ease:'power3.inOut'},2.8);
tl.fromTo('#h-record2',{x:1750,rotationZ:-4,opacity:0},{x:0,rotationZ:0,opacity:1,duration:.7,ease:'back.out(1.1)'},2.95);
tl.to('#h-download .word',{y:-260,stagger:.04,duration:.35,ease:'power3.in'},5.3);
tl.fromTo('#h-story .word',{y:270},{y:0,stagger:.07,duration:.7,ease:'expo.out'},5.4);
tl.to('#h-record2 > *',{opacity:0,duration:.15},5.65);
tl.to('#h-record2',{scaleX:.388,scaleY:.8,x:410,opacity:0,duration:.55,ease:'power3.inOut'},5.7);
tl.fromTo('#h-carrier',{scale:.65,opacity:0,rotationZ:8},{scale:1,opacity:1,rotationZ:0,duration:.7,ease:'elastic.out(1,.65)'},5.9);
tl.to('#h-foot',{opacity:0,duration:.25},8.35);
tl.to('#h-story .word',{y:-280,stagger:.04,duration:.35,ease:'power3.in'},8.5);
tl.to('#h-carrier span',{opacity:0,duration:.18},8.65);
tl.to('#h-stage',{opacity:1,duration:.35},8.7);
tl.to('#h-carrier',{x:0,y:-10,scaleX:3.7,scaleY:6.8,borderRadius:0,backgroundColor:'#1545d8',duration:.65,ease:'power3.inOut'},8.9);
""",
)

case_at = max(M["workspace"], M["case-open"] - 2.5)
scene(
    "workspace",
    12.8,
    f"""
<div class="stage"></div>
<div id="w-title" class="title mask-text" data-layout-allow-overflow data-layout-allow-occlusion><span>{words("SENTINEL", "wn")}</span></div>
<p id="w-sub" class="copy">Rules surface signals. Meta investigates.</p>
<div id="w-window" class="window" data-layout-allow-overflow><div id="w-camera" class="camera">{vid("w-film", case_at, 12.8, rate=0.65)}</div></div>
<div id="w-total"><strong>{F["dataset"]["event_count"]:,}</strong><span>imported events</span></div>
<div id="w-alerts"><strong>{F["alerts"]}</strong><span>signals · {len(F["rules"])} rules</span></div>
<div id="w-signal" class="plate"><span class="mono">AUTH-002</span><b>Failures → successful login</b><p>Open the signal as a case</p></div>
<p id="w-foot" class="foot">Actual terminal capture · Alert severity is not certainty</p>
""",
    """
#root{color:#fff}#w-title{left:120px;top:60px;width:1200px;height:150px;font-size:128px;letter-spacing:-6px}#w-sub{left:125px;top:222px;font-size:39px;color:#d1f9ff}
#w-window{left:120px;top:320px;width:1680px;height:645px}#w-camera{left:0;top:0}
#w-total,#w-alerts{position:absolute;top:375px;left:1120px;width:590px;color:#fff;z-index:3;background:#0a1119ed;padding:28px 36px;border-left:4px solid #41ead1}
#w-total strong,#w-alerts strong{font-size:90px;letter-spacing:-5px;display:block;line-height:1.1}#w-total span,#w-alerts span{font-size:32px;display:block;margin-top:12px}
#w-alerts{top:660px}#w-alerts strong{font-size:74px}#w-signal{left:980px;top:575px;width:750px;padding:34px 40px;color:#102352}
#w-signal span{font-size:31px;color:#2d56c8}#w-signal b{font-size:42px;letter-spacing:-1.8px;display:block;margin-top:16px}#w-signal p{font-size:32px;margin-top:20px}.foot{color:#d3f6ff}
""",
    """
tl.fromTo('#w-title .word',{y:180},{y:0,duration:.7,ease:'expo.out'},0);
tl.fromTo('#w-sub',{opacity:0},{opacity:1,duration:.3},.65);
tl.fromTo('#w-window',{scale:.28,y:200,opacity:0},{scale:1,y:0,opacity:1,duration:.9,ease:'power4.out'},.15);
tl.set('#w-camera',{scale:1},0);
tl.fromTo('#w-total',{x:100,opacity:0},{x:0,opacity:1,duration:.6,ease:'expo.out'},1.5);
tl.fromTo('#w-alerts',{x:100,opacity:0},{x:0,opacity:1,duration:.6,ease:'expo.out'},2.4);
tl.to('#w-total,#w-alerts',{x:180,opacity:0,duration:.35,ease:'power2.in'},4.7);
tl.to('#w-camera',{scale:1.65,x:-14,y:-190,duration:.65,ease:'power3.inOut'},4.8);
tl.fromTo('#w-signal',{y:120,opacity:0},{y:0,opacity:1,duration:.7,ease:'back.out(1.2)'},5.5);
tl.to('#w-signal',{y:-75,opacity:0,duration:.35,ease:'power2.in'},9.4);
tl.to('#w-camera',{scale:1.08,x:-260,y:-80,duration:.65,ease:'power3.inOut'},9.5);
tl.to('#w-title,#w-sub,#w-foot',{opacity:0,duration:.3},11.7);
tl.to('#w-window',{scale:.3,x:-590,y:-65,opacity:0,duration:.7,ease:'power3.inOut'},12.0);
""",
)

points = json.dumps(MAP["points"], separators=(",", ":"))
cloud_js = f"""
const cloudPoints={points};
const canvas=document.getElementById('d-cloud');const ctx=canvas.getContext('2d');
const clock={{t:0}};
const t0=cloudPoints[0][1],t1=cloudPoints[cloudPoints.length-1][1];
function paintCloud(t){{
 ctx.clearRect(0,0,1920,1080);
 const turn=.38-Math.min(t,6)*.055;
 const collapse=Math.max(0,Math.min(1,(t-6.5)/2));
 const scatter=Math.max(0,1-t/1.5);
 for(let i=0;i<cloudPoints.length;i++){{
  const p=cloudPoints[i];
  let x=((p[1]-t0)/(t1-t0)-.5)*1120;
  let y=(p[2]-1)*130+(i%13-6)*7;
  let z=(p[3]-4)*48;
  const xr=x*Math.cos(turn)+z*Math.sin(turn);
  const zr=-x*Math.sin(turn)+z*Math.cos(turn);
  const zoom=1200/(1200+zr);
  const px=1070+(xr*zoom)*(1-collapse*.82)+Math.sin(i*2.1)*scatter*200;
  const py=545+(y*zoom)*(1-collapse*.82)+Math.cos(i*1.7)*scatter*120;
  const size=(p[4]?4.8:2.4)*zoom*(1-collapse*.3);
  ctx.globalAlpha=p[4]?1:.62;
  ctx.fillStyle=p[4]?'#ffbc72':'#b6f7ff';
  ctx.fillRect(px,py,size,size);
 }}ctx.globalAlpha=1;
}}
paintCloud(0);
tl.to(clock,{{t:12.8,duration:12.8,ease:'none',onUpdate:()=>paintCloud(clock.t)}},0);
"""
scene(
    "ingestion",
    12.8,
    f"""
<div class="stage"></div><canvas id="d-cloud" width="1920" height="1080" data-motion-blur="off"></canvas>
<h2 id="d-title" class="title">Scattered logs.<br><span>Searchable evidence.</span></h2>
<div id="d-count"><b>{F["dataset"]["event_count"]:,}</b><span>points = actual imported records</span></div>
<div id="d-inputs"><span class="tag">CSV</span><span class="tag">JSONL</span></div>
<div id="d-record" class="plate"><span class="mono">NORMALIZED UTC EVENT</span><b>{esc(LOGIN["timestamp"][11:19])} UTC · login</b><p>{esc(LOGIN["account"])} · {esc(LOGIN["source_ip"])}</p><small class="mono">Stable ID + source position + SHA-256</small></div>
<div id="d-store"><div class="store-lid"></div><div class="store-body"><strong>DuckDB</strong><span>Local event store</span></div></div>
<p id="d-note" class="copy">Sources stay read-only.</p><p id="d-foot" class="foot">One point per imported record · Amber points belong to this case</p>
""",
    """
#root{color:#fff}#d-cloud{position:absolute;inset:0;width:1920px;height:1080px}#d-title{left:120px;top:90px;font-size:90px;letter-spacing:-4.5px}#d-title span{color:#bcfff0}
#d-count{position:absolute;left:120px;top:700px}#d-count b{font-size:126px;letter-spacing:-7px;line-height:1.15}#d-count span{display:block;font-size:31px;margin-top:8px}
#d-inputs{position:absolute;left:122px;top:440px;display:flex;gap:25px}.tag{font-size:34px;border-color:#fff6;background:#fff2;color:#fff;box-shadow:0 15px 0 #052d8333}
#d-record{left:555px;top:400px;width:1140px;height:310px;padding:35px 48px;color:#0d2943}#d-record>span{font-size:29px;color:#32648c}#d-record b{font-size:52px;letter-spacing:-2px;display:block;margin-top:15px}#d-record p{font-size:32px;margin-top:12px}#d-record small{display:block;font-size:28px;color:#32648c;margin-top:19px}
#d-store{position:absolute;left:1250px;top:425px;width:440px;height:265px;color:#143c56}.store-body{position:absolute;inset:26px 0 0;background:#e9ffff;border:2px solid #7ed7dd;border-radius:0 0 45% 45% / 0 0 18% 18%;box-shadow:0 32px 0 #06448b50;display:flex;flex-direction:column;align-items:center;justify-content:center}.store-lid{position:absolute;top:0;width:440px;height:76px;border:2px solid #7ed7dd;border-radius:50%;background:#f8ffff;z-index:2}.store-body strong{font-size:64px;letter-spacing:-3px;margin-top:22px}.store-body span{font-size:30px;margin-top:9px}
#d-note{left:670px;top:790px;font-size:40px;color:#d3fff5}.foot{color:#f2ffff;background:#08275ef2;padding:9px 16px;border-radius:8px;font-size:28px}
""",
    """
tl.fromTo('#d-title',{x:120,opacity:0},{x:0,opacity:1,duration:.6,ease:'expo.out'},0);
tl.fromTo('#d-count',{y:90,opacity:0},{y:0,opacity:1,duration:.7,ease:'back.out(1.2)'},.5);
tl.fromTo('#d-inputs .tag',{y:60,opacity:0},{y:0,opacity:1,stagger:.12,duration:.65,ease:'back.out(1.4)'},1.1);
tl.to('#d-inputs',{x:480,opacity:0,duration:.65,ease:'power3.inOut'},2.5);
tl.fromTo('#d-record',{scale:.65,rotationY:-12,opacity:0},{scale:1,rotationY:0,opacity:1,duration:.8,ease:'back.out(1.2)'},3.1);
tl.to('#d-count',{opacity:0,duration:.3},6.6);
tl.to('#d-record > *',{opacity:0,duration:.18},8.85);
tl.to('#d-record',{scale:.38,x:345,y:10,opacity:0,duration:.7,ease:'power3.inOut'},9.1);
tl.fromTo('#d-store',{scale:.6,opacity:0},{scale:1,opacity:1,duration:.75,ease:'back.out(1.3)'},9.5);
tl.fromTo('#d-note',{x:-120,opacity:0},{x:0,opacity:1,duration:.6,ease:'expo.out'},10.0);
tl.to('#d-cloud',{opacity:0,duration:.5},9.7);
tl.to('#d-title,#d-note,#d-foot',{opacity:0,duration:.3},11.8);
tl.to('#d-store',{scale:.55,x:-145,y:305,duration:.7,ease:'power3.inOut'},12.0);
""",
    cloud_js,
)

scene(
    "architecture",
    16.0,
    """
<div class="stage"></div>
<h2 id="ar-title" class="title">Local evidence.<br><span>Meta directs the search.</span></h2>
<div id="ar-boundary"><span class="mono">YOUR MAC · SENTINEL WORKSPACE</span></div>
<div id="ar-agent" class="ar-node plate"><small>PYTHON PROCESS</small><b>Investigation runtime</b><p>Three sequential roles</p></div>
<div id="ar-mcp" class="ar-node plate"><small>CHILD PROCESS</small><b>MCP server</b><p>Typed tools · Bound workspace</p></div>
<div id="ar-db" class="ar-node plate"><b>DuckDB + JSON cases</b><p>Events · Notes · Findings · Activity</p></div>
<div id="ar-meta" class="ar-node"><small>CONFIGURED META API</small><b>Muse Spark</b><p>Selects the next tool</p></div>
<svg id="ar-routes" viewBox="0 0 1920 1080"><path id="ar-stdio" class="route" d="M765 600 H1020"/><path id="ar-storage" class="route" d="M1280 715 V800"/><path id="ar-https" class="route" d="M490 480 V340 H1330 V290"/></svg>
<div id="ar-out" class="packet"></div><div id="ar-back" class="packet"></div><div id="ar-cloud" class="packet"></div>
<span id="ar-stdio-label" class="label">stdio</span><span id="ar-https-label" class="label">HTTPS · selected excerpts</span>
<div id="ar-tool" class="mono">search_events(filters)</div>
<p id="ar-bottom" class="foot">Actual MCP discovery and calls · No shell tool · No arbitrary database paths</p>
""",
    """
#root{color:#fff}#ar-title{left:120px;top:65px;font-size:83px;letter-spacing:-4px}#ar-title span{color:#baffef}
#ar-boundary{position:absolute;left:115px;top:390px;width:1690px;height:565px;border:2px dashed #adfff5a0;border-radius:26px}#ar-boundary>span{position:absolute;left:25px;bottom:22px;font-size:28px;color:#f2ffff;background:#08275ef2;padding:7px 12px;border-radius:8px}
.ar-node{position:absolute;color:#17324a;padding:28px 32px}.ar-node small{font:28px JetBrains;color:#3a6d8e}.ar-node b{display:block;font-size:44px;line-height:1.3;letter-spacing:-1.7px;margin-top:12px}.ar-node p{font-size:29px;line-height:1.4;margin-top:14px}
#ar-agent{left:205px;top:480px;width:560px;height:235px}#ar-mcp{left:1020px;top:480px;width:560px;height:235px}#ar-db{left:1010px;top:800px;width:630px;height:125px;padding:18px 30px}#ar-db b{font-size:35px;margin:0}#ar-db p{font-size:28px;margin-top:6px}
#ar-meta{left:1320px;top:70px;width:470px;height:235px;color:#fff;border:1px solid #7cb7ff;border-radius:22px;background:#082c88;box-shadow:0 24px 0 #07247150}#ar-meta small{color:#a5d8ff;font-size:28px}#ar-meta b{font-size:57px}#ar-meta p{font-size:29px;line-height:1.3}
#ar-routes{position:absolute;inset:0;width:1920px;height:1080px;color:#c9fff5;pointer-events:none}.route{stroke-dasharray:1400;stroke-dashoffset:0}
#ar-out{left:780px;top:587px}#ar-back{left:990px;top:587px;background:#fff}#ar-cloud{left:478px;top:432px;background:#fff}
#ar-stdio-label{left:815px;top:535px;font-size:30px}#ar-https-label{left:630px;top:290px;font-size:28px;color:#d8fffa}#ar-tool{position:absolute;left:670px;top:740px;font-size:30px;color:#fff;background:#0e3da7;padding:16px 24px;border:1px solid #54a6ef;border-radius:12px}.foot{color:#f2ffff;background:#08275ef2;padding:9px 16px;border-radius:8px;font-size:28px}
""",
    """
tl.fromTo('#ar-title',{y:70,opacity:0},{y:0,opacity:1,duration:.7,ease:'expo.out'},0);
tl.fromTo('#ar-boundary',{scaleX:.8,opacity:0},{scaleX:1,opacity:1,duration:.6,ease:'power3.out'},.4);
tl.fromTo('#ar-agent',{scale:.7,opacity:0},{scale:1,opacity:1,duration:.75,ease:'back.out(1.2)'},.6);
tl.fromTo('#ar-mcp',{scale:.7,opacity:0},{scale:1,opacity:1,duration:.75,ease:'back.out(1.2)'},1.3);
tl.set('#ar-db > *',{opacity:0},0);
tl.fromTo('#ar-db',{scaleX:.38,scaleY:1.16,opacity:1},{scaleX:1,scaleY:1,opacity:1,duration:.65,ease:'back.out(1.2)'},2.3);
tl.to('#ar-db > *',{opacity:1,duration:.3},2.8);
tl.fromTo('#ar-stdio',{strokeDasharray:255,strokeDashoffset:255},{strokeDashoffset:0,duration:.7,ease:'power2.inOut'},2.6);
tl.fromTo('#ar-storage',{strokeDasharray:85,strokeDashoffset:85},{strokeDashoffset:0,duration:.6,ease:'power2.inOut'},3.0);
tl.fromTo('#ar-stdio-label',{opacity:0},{opacity:1,duration:.3},3.1);
tl.fromTo('#ar-out',{opacity:0},{opacity:1,duration:.15},3.3);
tl.to('#ar-out',{x:210,duration:.7,ease:'power2.inOut'},3.5);tl.to('#ar-out',{opacity:0,duration:.15},4.2);
tl.fromTo('#ar-back',{opacity:0},{opacity:1,duration:.15},4.3);tl.to('#ar-back',{x:-210,duration:.7,ease:'power2.inOut'},4.5);tl.to('#ar-back',{opacity:0,duration:.15},5.2);
tl.fromTo('#ar-meta',{x:110,opacity:0},{x:0,opacity:1,duration:.7,ease:'back.out(1.2)'},5.5);
tl.fromTo('#ar-https',{strokeDashoffset:1400},{strokeDashoffset:0,duration:1.0,ease:'power2.inOut'},6.4);
tl.fromTo('#ar-https-label',{opacity:0},{opacity:1,duration:.35},6.9);
tl.fromTo('#ar-cloud',{opacity:0},{opacity:1,duration:.15},7.3);tl.to('#ar-cloud',{y:-104,duration:.3,ease:'power2.inOut'},7.5);tl.to('#ar-cloud',{x:840,duration:1.0,ease:'power2.inOut'},7.8);tl.to('#ar-cloud',{y:-155,duration:.3,ease:'power2.inOut'},8.8);tl.to('#ar-cloud',{opacity:0,duration:.15},9.1);
tl.to('#ar-cloud',{opacity:1,duration:.15},9.4);tl.to('#ar-cloud',{y:-104,duration:.25,ease:'power2.inOut'},9.6);tl.to('#ar-cloud',{x:0,duration:.9,ease:'power2.inOut'},9.85);tl.to('#ar-cloud',{y:0,duration:.25,ease:'power2.inOut'},10.75);tl.to('#ar-cloud',{opacity:0,duration:.15},11.0);
tl.fromTo('#ar-tool',{scale:.7,opacity:0},{scale:1,opacity:1,duration:.6,ease:'back.out(1.6)'},11.1);
tl.to('#ar-mcp p',{opacity:0,duration:.25},12.7);
tl.to('#ar-tool',{x:330,y:-120,duration:.65,ease:'power3.inOut'},13.0);
tl.to('#ar-title,#ar-https-label,#ar-bottom',{opacity:0,duration:.25},14.8);
tl.to('#ar-agent,#ar-mcp,#ar-db,#ar-meta,#ar-routes,#ar-boundary,#ar-stdio-label,#ar-tool',{opacity:0,duration:.4},15.3);
""",
)

scene(
    "question",
    6.4,
    f"""
<div class="stage"></div><h2 id="q-title" class="title">Ask about <span>this session.</span></h2>
<div id="q-window" class="window" data-layout-allow-overflow><div id="q-camera" class="camera">{vid("q-film", M["case-open"] + 3.2, 6.4, rate=1)}</div></div>
<div id="q-brief"><span>Trace the login.</span><span>Inspect the evidence.</span><span>What remains uncertain?</span></div>
<p id="q-foot" class="foot">Focused question → Actual Meta-selected MCP searches</p>
""",
    """
#root{color:#fff}#q-title{left:120px;top:90px;font-size:105px}#q-title span{color:#bcfff0}#q-window{left:120px;top:600px;width:1680px;height:260px}#q-camera{left:0;top:0}
#q-brief{position:absolute;left:125px;top:275px;width:1480px;font-size:52px;letter-spacing:-2px;line-height:1.6;color:#fff}#q-brief span{display:block;background:#09245ef0;padding:5px 24px;width:max-content}.foot{color:#f2ffff;background:#08275ef2;padding:9px 16px;border-radius:8px;font-size:28px}
""",
    """
tl.fromTo('#q-title',{y:65},{y:0,duration:.6,ease:'expo.out'},0);
tl.fromTo('#q-window',{scale:.8,y:130,opacity:0},{scale:1,y:0,opacity:1,duration:.7,ease:'power4.out'},0);
tl.set('#q-camera',{scale:1.7,x:-20,y:-1490},0);
tl.fromTo('#q-brief span',{x:-100,opacity:0},{x:0,opacity:1,stagger:.65,duration:.5,ease:'expo.out'},.4);
tl.to('#q-brief',{x:220,opacity:0,duration:.35,ease:'power2.in'},3.8);
tl.to('#q-camera',{x:-780,duration:.6,ease:'power3.inOut'},3.9);
tl.to('#q-title,#q-foot',{opacity:0,duration:.25},5.8);
""",
)

live_span = M["review"] - M["agent-start"]
live_rate = live_span / 25.6
started = next(a for a in CASE["activity"] if a["action"] == "Investigation started")


def handoff(role, action):
    a = next(a for a in CASE["activity"] if a["role"] == role and a["action"] == action)
    return (
        (
            datetime.fromisoformat(a["timestamp"]) - datetime.fromisoformat(started["timestamp"])
        ).total_seconds()
        / live_span
        * 25.6
    )


review_at = handoff("Evidence reviewer", "Checking support, gaps, and alternative explanations")
report_at = handoff("Reporter", "Producing structured findings with source references")
live_actions = [
    ("get_event", "Inspect a login."),
    ("get_entity_activity", "Follow " + LOGIN["session_id"]),
    ("search_events", "Search account + IP"),
]
action_starts = [handoff("MCP", "Calling " + name) for name, _ in live_actions]
action_html = "".join(
    f'<div id="l-action{i}" class="l-action"><b>{esc(label)}</b><small class="mono">{name}</small></div>'
    for i, (name, label) in enumerate(live_actions)
)
action_motion = ""
for i, start_time in enumerate(action_starts):
    stop_time = action_starts[i + 1] if i + 1 < len(action_starts) else review_at
    action_motion += (
        f"tl.fromTo('#l-action{i}',{{opacity:0,y:15}},{{opacity:1,y:0,duration:.25,ease:'power3.out'}},{start_time:.4f});"
        f"tl.to('#l-action{i}',{{opacity:0,duration:.15}},{stop_time - 0.15:.4f});"
    )
scene(
    "live",
    25.6,
    f"""
<div id="l-rail"></div><h2 id="l-big" class="title" data-layout-allow-overflow>INVESTIGATE</h2>
<div id="l-window" class="window" data-layout-allow-overflow><div id="l-camera" class="camera">{vid("l-film", M["agent-start"], 25.6, rate=live_rate)}</div></div>
<div id="l-role1" class="l-role"><small>INVESTIGATOR</small><strong>Chooses the<br>next search.</strong><p>Model-selected MCP calls</p></div>
<div id="l-role2" class="l-role"><small>EVIDENCE REVIEWER</small><strong>Checks support.<br>Challenges claims.</strong><p>Gaps and benign alternatives</p></div>
<div id="l-role3" class="l-role"><small>REPORTER</small><strong>Creates structured<br>findings.</strong><p>Strict JSON schema + source IDs</p></div>
{action_html}<p id="l-speed" class="label">Recorded live · {live_rate:.2f}× playback</p>
<div id="l-totals"><b>{F["mcp_calls"]} MCP calls</b><span>{F["evidence_count"]} attached events · {len(F["findings"])} findings</span></div>
<p id="l-foot" class="foot">Meta Model API · muse-spark-1.3 · Actual run: {F["live_elapsed_seconds"]:.2f}s</p>
""",
    """
#root{background:#080d17;color:#f5f7f5}#l-rail{position:absolute;left:0;top:0;width:16px;height:1080px;background:#ff803e}
#l-big{left:110px;top:150px;font-size:192px;letter-spacing:-10px;width:1700px;color:#f2f0e9;transform-origin:0 0}
#l-window{left:560px;top:260px;width:1260px;height:670px;border-radius:16px;box-shadow:0 0 0 1px #34526b}#l-camera{left:-525px;top:-570px}
.l-role{position:absolute;left:120px;top:340px;width:400px}.l-role small{font:29px JetBrains;color:#ff9c67}.l-role strong{display:block;font-size:44px;line-height:1.2;letter-spacing:-2px;margin-top:24px}.l-role p{font-size:31px;color:#a4bdc8;line-height:1.5;margin-top:26px}
.l-action{position:absolute;left:125px;top:660px;width:400px}.l-action b{display:block;font-size:37px;line-height:1.3;color:#41ead1;letter-spacing:-1px}.l-action small{display:block;font-size:28px;color:#9db9c7;margin-top:12px}#l-speed{left:123px;top:205px;color:#a4bdc8;font-size:30px}#l-totals{position:absolute;left:125px;top:780px;width:400px}#l-totals b{display:block;font-size:44px;color:#41ead1;letter-spacing:-1.5px}#l-totals span{display:block;font-size:29px;line-height:1.5;margin-top:15px}.foot{color:#9db9c7}
""",
    f"""
tl.fromTo('#l-big',{{x:750,scaleX:1.3}},{{x:0,scaleX:1,duration:.55,ease:'expo.out'}},0);
tl.to('#l-big',{{scale:.43,y:-100,duration:.65,ease:'power3.inOut'}},1.2);
tl.fromTo('#l-window',{{x:300,opacity:0}},{{x:0,opacity:1,duration:.75,ease:'power4.out'}},1.4);
tl.set('#l-camera',{{scale:1.4}},0);
{action_motion}
tl.fromTo('#l-speed',{{opacity:0}},{{opacity:1,duration:.3}},1.9);
tl.fromTo('#l-role1',{{x:-80,opacity:0}},{{x:0,opacity:1,duration:.6,ease:'expo.out'}},2.0);
tl.to('#l-role1',{{y:-40,opacity:0,duration:.25}},{review_at - 0.25:.4f});
tl.fromTo('#l-role2',{{y:65,opacity:0}},{{y:0,opacity:1,duration:.6,ease:'back.out(1.1)'}},{review_at:.4f});
tl.to('#l-role2',{{y:-40,opacity:0,duration:.25}},{report_at - 0.25:.4f});
tl.fromTo('#l-role3',{{y:65,opacity:0}},{{y:0,opacity:1,duration:.6,ease:'back.out(1.1)'}},{report_at:.4f});
tl.fromTo('#l-totals',{{scale:.8,opacity:0}},{{scale:1,opacity:1,duration:.6,ease:'back.out(1.2)'}},21.9);
tl.to('#l-big,#l-speed,#l-role3,#l-totals,#l-foot',{{opacity:0,duration:.25}},25.1);
""",
)

nodes = "".join(
    f'<div id="s-node{i}" class="s-node" data-layout-allow-overflow><span class="mono">{e["timestamp"][11:19]} UTC</span><strong>{esc(e["action"]).title()}</strong><p>{esc(e["host"])}</p></div>'
    for i, e in enumerate(E)
)
nodes = nodes.replace(
    esc(DOWNLOAD["host"]) + "</p>", MB + " MB · " + esc(DOWNLOAD["host"]) + "</p>"
)
scene(
    "session",
    12.8,
    f"""
<div id="s-stage" class="stage"></div><h2 id="s-title" class="title">The session is the <span>link.</span></h2>
<div id="s-window" class="window" data-layout-allow-overflow><div id="s-camera" class="camera">{vid("s-film", M["session"], 5.0, rate=0.5)}</div></div>
<div id="s-track">{nodes}<div id="s-bar1"></div><div id="s-bar2"></div><div id="s-bracket"></div></div><span id="s-session" class="mono">{esc(LOGIN["session_id"])}</span>
<div id="s-account" class="label">{esc(LOGIN["account"])} · {esc(LOGIN["source_ip"])}</div>
<p id="s-before" class="copy">{FAILS} earlier failures · Same account and source IP</p>
<p id="s-foot" class="foot">Explicit identifiers connect records. Time adjacency alone does not.</p>
""",
    """
#root{color:#fff}#s-title{left:120px;top:85px;font-size:105px}#s-title span{color:#bcfff0}#s-window{left:120px;top:335px;width:1680px;height:620px}#s-camera{left:0;top:0}
#s-track{position:absolute;left:120px;top:355px;width:1680px;height:520px;perspective:1600px}.s-node{position:absolute;width:410px;height:260px;top:0;padding:36px;background:#f4ffff;color:#14344a;border:1px solid #a9e3e5;border-radius:22px;box-shadow:0 22px 0 #00285e55;z-index:2}
.s-node>span{font-size:29px;color:#42728c}.s-node strong{font-size:63px;line-height:1.3;letter-spacing:-3px;display:block;margin-top:20px}.s-node p{font-size:32px;margin-top:8px}#s-node0{left:10px}#s-node1{left:635px}#s-node2{left:1260px}
#s-bar1,#s-bar2{position:absolute;top:122px;left:415px;width:225px;height:6px;background:#baffef;transform-origin:0 0}#s-bar2{left:1040px}#s-bracket{position:absolute;left:210px;top:270px;width:1260px;height:95px;border:3px solid #baffef;border-top:0;border-radius:0 0 20px 20px}#s-session{position:absolute;left:1200px;top:220px;font-size:38px;color:#123b55;background:#baffef;border-radius:12px;padding:15px 28px}
#s-account{left:125px;top:235px;font-size:32px;color:#d6fffa}#s-before{left:125px;top:855px;font-size:33px}.foot{color:#f2ffff;background:#08275ef2;padding:9px 16px;border-radius:8px;font-size:28px}
""",
    """
tl.fromTo('#s-title',{x:-100,opacity:0},{x:0,opacity:1,duration:.65,ease:'expo.out'},0);
tl.fromTo('#s-window',{scale:.9,opacity:0},{scale:1,opacity:1,duration:.7,ease:'power4.out'},0);tl.set('#s-camera',{scale:1.2,x:-60,y:-120},0);
tl.to('#s-window',{scale:.5,y:190,opacity:0,duration:.65,ease:'power3.inOut'},3.5);
tl.fromTo('#s-account',{opacity:0},{opacity:1,duration:.3},3.8);
tl.fromTo('#s-node0',{x:-300,opacity:0},{x:0,opacity:1,duration:.65,ease:'back.out(1.3)'},4.0);
tl.fromTo('#s-node1',{y:100,opacity:0},{y:0,opacity:1,duration:.65,ease:'back.out(1.3)'},4.65);
tl.fromTo('#s-bar1',{scaleX:0},{scaleX:1,duration:.5,ease:'power2.inOut'},5.25);
tl.fromTo('#s-node2',{y:100,opacity:0},{y:0,opacity:1,duration:.65,ease:'back.out(1.3)'},5.3);
tl.fromTo('#s-bar2',{scaleX:0},{scaleX:1,duration:.5,ease:'power2.inOut'},5.95);
tl.fromTo('#s-bracket',{scaleX:.2,opacity:0},{scaleX:1,opacity:1,duration:.7,ease:'power3.out'},6.5);
tl.fromTo('#s-session',{scale:.6,opacity:0},{scale:1,opacity:1,duration:.7,ease:'elastic.out(1,.65)'},.5);
tl.fromTo('#s-before',{opacity:0},{opacity:1,duration:.3},8.7);
tl.to('#s-account',{opacity:0,duration:.25},11.4);
tl.to('#s-node2',{x:-625,y:55,scaleX:4.7,scaleY:4.2,borderRadius:0,duration:.7,ease:'power3.inOut'},12.0);
tl.to('#s-title,#s-account,#s-before,#s-foot,#s-session,#s-bracket,#s-node0,#s-node1,#s-bar1,#s-bar2',{opacity:0,duration:.25},12.0);
tl.to('#s-node2>*',{opacity:0,duration:.2},12.0);
""",
)

scene(
    "evidence-carrier",
    3.6,
    f'<div id="carry-label" class="label">Download · {MB} MB · {esc(LOGIN["session_id"])}</div>',
    "#root{background:transparent;pointer-events:none}#carry-label{left:120px;top:235px;padding:12px 24px;background:#eafffa;border:1px solid #8bb8b6;border-radius:12px;color:#163c53;font-size:30px}",
    "tl.fromTo('#carry-label',{opacity:0},{opacity:1,duration:.25},0);tl.to('#carry-label',{opacity:0,duration:.25},3.3);",
)

scene(
    "source",
    12.8,
    f"""
<h2 id="e-title" class="title">Back to the <span class="blue">source.</span></h2>
<div id="e-window" class="window" data-layout-allow-overflow><div id="e-camera" class="camera">{vid("e-film", M["provenance"], 12.8, rate=0.16)}</div></div>
<div id="e-number"><span>RECORDED DOWNLOAD</span><strong>{MB}<small>MB</small></strong><p>{DOWNLOAD["bytes"]:,} recorded bytes</p></div>
<div id="e-reference"><span class="mono">{esc(SOURCE["filename"])}</span><b>Line {SOURCE["line"]}</b><small class="mono">SHA-256<br>{SOURCE["sha256"][:24]}…</small></div>
<div id="e-id" class="mono">{esc(DOWNLOAD["event_id"])}</div>
<p id="e-foot" class="foot">Original record + source position + file hash. A download does not prove exfiltration.</p>
""",
    """
#root{background:#f3faf9}#e-title{left:120px;top:85px;font-size:113px}#e-window{left:120px;top:300px;width:1100px;height:620px;border-radius:18px}#e-camera{left:-154px;top:-246px}
#e-number{position:absolute;left:1300px;top:320px;width:500px;color:#12385b}#e-number>span{font:29px JetBrains;color:#3b6e84}#e-number strong{display:block;font-size:146px;letter-spacing:-9px;line-height:1.3}#e-number strong small{font-size:58px;letter-spacing:-3px;margin-left:15px}#e-number p{font-size:30px;color:#3b6e84;margin-top:12px}
#e-reference{position:absolute;left:1303px;top:650px;width:500px}#e-reference>span{font-size:32px;color:#3b6e84}#e-reference>b{font-size:54px;display:block;letter-spacing:-2px;margin-top:10px}#e-reference small{font-size:28px;line-height:1.7;display:block;color:#3b6e84;margin-top:28px}#e-id{position:absolute;left:145px;top:935px;font-size:28px;color:#457085}.foot{bottom:30px;font-size:29px}
""",
    """
tl.fromTo('#e-title',{y:110,opacity:0},{y:0,opacity:1,duration:.7,ease:'expo.out'},0);
tl.fromTo('#e-window',{scale:.88,opacity:0},{scale:1,opacity:1,duration:.7,ease:'power4.out'},.2);tl.set('#e-camera',{scale:1.06},0);
tl.fromTo('#e-number',{x:180,opacity:0},{x:0,opacity:1,duration:.7,ease:'back.out(1.2)'},1.2);
tl.fromTo('#e-number strong',{scale:.7},{scale:1,duration:.6,ease:'back.out(1.4)'},1.7);
tl.fromTo('#e-reference',{y:80,opacity:0},{y:0,opacity:1,duration:.6,ease:'expo.out'},4.3);
tl.fromTo('#e-id',{opacity:0},{opacity:1,duration:.35},5.2);
tl.to('#e-camera',{scale:1.25,x:-45,y:-95,duration:.6,ease:'power3.inOut'},8.6);
tl.to('#e-number',{y:-15,duration:.6,ease:'power3.inOut'},8.6);
tl.to('#e-title,#e-foot,#e-id,#e-reference',{opacity:0,duration:.3},12.1);
""",
)

scene(
    "alternative",
    9.6,
    f"""
<div id="b-wash"></div><h2 id="b-title" class="title">Same volume.<br><span>Different context.</span></h2>
<div id="b-equal"><b>{MB} MB</b><span>svc-backup · recorded export total</span></div>
<div id="b-context"><small class="b-says">The log says:</small><strong>“{esc(CONTEXT.split(";")[0])}”</strong><p class="b-warning">Approval remains unverified.</p><span class="tag">{esc(TICKET)}</span><p class="b-ops">Operations · 13:00–13:30 UTC</p></div>
<div id="b-window" class="window" data-layout-allow-overflow><div id="b-camera" class="camera">{vid("b-film", M["benign-record"], 9.6, rate=0.3)}</div></div>
<p id="b-foot" class="foot">A plausible benign explanation. Logged approval still needs independent verification.</p>
""",
    """
#root{background:#fff1d8;color:#4f351d}#b-wash{position:absolute;inset:0;background:#ffdb9b}#b-title{left:120px;top:95px;font-size:105px;letter-spacing:-5px}#b-title span{color:#a76a2b}
#b-equal{position:absolute;left:125px;top:400px}#b-equal b{font-size:125px;letter-spacing:-7px;line-height:1.2}#b-equal span{font-size:29px;display:block;margin-top:10px;color:#80613b}
#b-context{position:absolute;left:125px;top:600px;width:740px}#b-context .b-says{display:block;font-size:30px;line-height:1.3;margin-bottom:12px}#b-context .b-warning{font-size:34px;line-height:1.3;margin-top:18px;font-weight:700;color:#69441f}#b-context strong{font-size:43px;letter-spacing:-1.5px;display:block;line-height:1.3}#b-context .tag{font-size:33px;background:#fff6e6;border-color:#cca264;box-shadow:0 12px 0 #e9c68b;margin-top:26px}#b-context p{font-size:29px;margin-top:30px;color:#80613b}
#b-window{left:950px;top:340px;width:850px;height:570px}#b-camera{left:-120px;top:-140px}.foot{color:#80613b}
""",
    """
tl.fromTo('#b-wash',{scaleX:0},{scaleX:1,duration:.6,ease:'power3.inOut'},0);
tl.fromTo('#b-title',{x:180,opacity:0},{x:0,opacity:1,duration:.7,ease:'expo.out'},.1);
tl.fromTo('#b-equal',{y:60,opacity:0},{y:0,opacity:1,duration:.65,ease:'back.out(1.2)'},.5);
tl.fromTo('#b-window',{x:260,opacity:0},{x:0,opacity:1,duration:.7,ease:'power4.out'},1.4);tl.set('#b-camera',{scale:.98},0);
tl.fromTo('#b-context strong,#b-context .b-says',{y:40,opacity:0},{y:0,opacity:1,duration:.55,ease:'expo.out'},2.5);
tl.fromTo('#b-context .tag',{rotationZ:-7,scale:.65,opacity:0},{rotationZ:0,scale:1,opacity:1,duration:.75,ease:'elastic.out(1,.65)'},3.7);
tl.fromTo('#b-context .b-warning',{opacity:0},{opacity:1,duration:.3},3.2);
tl.fromTo('#b-context .b-ops',{opacity:0},{opacity:1,duration:.35},5.2);
tl.to('#b-title,#b-equal,#b-context,#b-foot',{opacity:0,duration:.3},9.1);
""",
)

scene(
    "verification",
    12.8,
    f"""
<div id="v-paper"></div><h2 id="v-title" class="title">A report has to <span>hold up.</span></h2>
<div id="v-json"><span class="mono">CAPTURED FIELDS</span><pre class="mono">{{\n  "category": "observed_fact",\n  "event_ids": [\n    "{esc(CASE["findings"][0]["event_ids"][0])}"\n  ]\n}}</pre><small>json_schema · strict: true</small></div>
<div id="v-gates"><span id="v-gate1">Schema checked</span><span id="v-gate2">Retrieved IDs checked</span><span id="v-gate3">Computed receipts</span></div>
<div id="v-results" data-hold><div id="v-observed"><span>OBSERVED</span><strong>{FAILS} failures → login → download</strong></div><div id="v-hypothesis"><span>HYPOTHESIS · UNPROVEN</span><strong>Was the account compromised?</strong></div><div id="v-question"><span>OPEN QUESTION</span><strong>Who authorized the session?</strong></div></div>
<div id="v-seal"><strong>{len(F["findings"])}</strong><span>validated findings</span></div>
<p id="v-foot" class="foot">Reference validity is checked in code. Interpretation remains open to challenge.</p>
""",
    """
#root{background:#090f19;color:#f4f6f2}#v-title{left:120px;top:90px;font-size:108px}#v-title span{color:#41ead1}#v-json{position:absolute;left:125px;top:340px;width:850px;height:460px;padding:35px;border:1px solid #3a586b;background:#111f2b;border-radius:20px}#v-json>span{font-size:28px;color:#77b5bf}#v-json pre{font-size:30px;line-height:1.5;margin-top:25px;color:#dbf4ec}#v-json small{display:block;font:29px JetBrains;color:#41ead1;margin-top:20px}
#v-gates{position:absolute;left:1100px;top:360px;width:690px}#v-gates span{display:block;border-bottom:1px solid #3a586b;padding:22px 0;font-size:38px;color:#b6e8de}
#v-results{position:absolute;left:125px;top:330px;width:1500px}#v-results>div{margin-bottom:54px;border-left:5px solid #41ead1;padding-left:35px}#v-results span{display:block;font:29px JetBrains;color:#41ead1}#v-results strong{display:block;max-width:1220px;font-size:54px;line-height:1.3;letter-spacing:-1.5px;margin-top:17px}#v-hypothesis{border-color:#ffb56d!important}#v-hypothesis span{color:#ffb56d}#v-question{border-color:#a2b9ff!important}#v-question span{color:#a2b9ff}
#v-seal{position:absolute;left:1440px;top:420px;width:350px;height:270px;border:2px solid #356b65;border-radius:24px;background:#102e2d;text-align:center;padding-top:25px;box-shadow:0 20px 0 #061a19}#v-seal strong{display:block;font-size:106px;line-height:1.2;color:#41ead1}#v-seal span{font-size:29px;line-height:1.5}.foot{color:#9db9c7}
""",
    """
tl.fromTo('#v-title',{x:-140,opacity:0},{x:0,opacity:1,duration:.65,ease:'expo.out'},0);
tl.fromTo('#v-json',{rotationY:-10,x:-200,opacity:0},{rotationY:0,x:0,opacity:1,duration:.75,ease:'power4.out'},.4);
tl.fromTo('#v-gates span',{x:120,opacity:0},{x:0,opacity:1,stagger:.6,duration:.55,ease:'expo.out'},.8);
tl.to('#v-json',{scale:.3,x:400,opacity:0,duration:.65,ease:'power3.inOut'},4.0);tl.to('#v-gates',{y:-80,opacity:0,duration:.4},4.0);
tl.fromTo('#v-observed',{x:-160,opacity:0},{x:0,opacity:1,duration:.6,ease:'expo.out'},4.4);
tl.fromTo('#v-hypothesis',{x:-160,opacity:0},{x:0,opacity:1,duration:.6,ease:'expo.out'},5.0);
tl.fromTo('#v-question',{x:-160,opacity:0},{x:0,opacity:1,duration:.6,ease:'expo.out'},5.6);
tl.fromTo('#v-seal',{scale:1.5,rotationZ:-12,opacity:0},{scale:1,rotationZ:0,opacity:1,duration:.75,ease:'back.out(1.5)'},9.5);
tl.to('#v-title,#v-results,#v-seal,#v-foot',{opacity:0,duration:.25},12.4);
""",
)

scene(
    "persistence",
    6.4,
    f"""
<div class="stage"></div><h2 id="p-title" class="title"><span id="p-export">Export.</span><span id="p-reopen">Reopen.</span><span id="p-continue">Continue.</span></h2>
<div id="p-window" class="window" data-layout-allow-overflow><div id="p-camera1" class="camera">{vid("p-export-film", M["export"] - 0.6, 3.2, rate=1)}</div><div id="p-camera2" class="camera">{vid("p-reopen-film", R["reopened"], 3.2, at=3.2, rate=1, source="reopen")}</div></div>
<div id="p-case" class="mono">{esc(F["case_id"])}</div><p id="p-foot" class="foot">Markdown + JSON · Same case reopened in a second process</p>
""",
    """
#root{color:#fff}#p-title{left:120px;top:88px;font-size:110px;display:flex;gap:28px;letter-spacing:-5px}#p-window{left:120px;top:300px;width:1680px;height:620px}#p-camera1,#p-camera2{left:0;top:0}#p-case{position:absolute;left:120px;top:930px;font-size:29px;background:#fff;color:#173d64;padding:12px 24px;border-radius:10px;transform-origin:0 0}.foot{left:750px;bottom:55px;color:#d1f9ff;font-size:28px}
""",
    """
tl.fromTo('#p-title span',{y:120,opacity:0},{y:0,opacity:1,stagger:.15,duration:.65,ease:'expo.out'},0);
tl.fromTo('#p-window',{scale:.85,opacity:0},{scale:1,opacity:1,duration:.7,ease:'power4.out'},.1);tl.set('#p-camera1',{scale:1},0);tl.set('#p-camera2',{scale:1},3.2);
tl.fromTo('#p-case',{x:100,opacity:0},{x:0,opacity:1,duration:.55,ease:'back.out(1.2)'},.8);
tl.to('#p-export',{color:'#baffef',duration:.2},.6);tl.to('#p-reopen',{color:'#baffef',duration:.2},3.3);
tl.to('#p-window',{scale:.15,x:0,y:-170,opacity:0,duration:.6,ease:'power3.inOut'},5.7);tl.to('#p-case',{x:690,y:-730,scale:1.15,duration:.6,ease:'power3.inOut'},5.7);
tl.to('#p-title,#p-foot',{opacity:0,duration:.25},6.0);
""",
)

scene(
    "end",
    6.4,
    f"""
<div id="z-stage" class="stage"></div><div id="z-case"><span></span><span></span><span></span></div>
<div id="z-id" class="mono">{esc(F["case_id"])}</div><h1 id="z-brand">SENTINEL</h1><p id="z-tagline">From scattered events to defensible investigations.</p>
<div id="z-command" class="mono">uv run sentinel demo</div>
<p id="z-credits">“Cipher” · Kevin MacLeod · incompetech.com<br>CC BY 4.0 · creativecommons.org/licenses/by/4.0 · Edited for this film</p>
""",
    """
#root{color:#fff}#z-brand{position:absolute;left:120px;top:280px;width:1680px;text-align:center;font-size:196px;letter-spacing:-7px;font-weight:800;line-height:1.3}#z-tagline{position:absolute;left:120px;top:560px;width:1680px;text-align:center;font-size:40px;letter-spacing:-.7px;color:#d2fff4}#z-command{position:absolute;left:510px;top:700px;width:900px;padding:27px;text-align:center;font-size:48px;border:1px solid #c4fff1;border-radius:18px;background:#062a8330;box-shadow:0 18px 0 #00287635}
#z-id{position:absolute;left:810px;top:200px;font-size:33px;padding:14px 28px;border-radius:10px;background:#fff;color:#173d64;z-index:4}#z-case{position:absolute;left:770px;top:130px;width:380px;height:190px}#z-case span{position:absolute;inset:0;border:2px solid #c4fff1;border-radius:15px;background:#e9ffff}#z-case span:nth-child(2){top:15px;left:15px}#z-case span:nth-child(3){top:30px;left:30px;background:#41ead1}
#z-credits{position:absolute;left:120px;bottom:50px;width:1680px;text-align:center;font-size:28px;line-height:1.5;color:#d0faff}
""",
    """
tl.fromTo('#z-case',{scale:.9,opacity:1},{scale:1,opacity:1,duration:.65,ease:'back.out(1.3)'},0);
tl.to('#z-id',{opacity:0,duration:.25},1.0);
tl.to('#z-case',{scaleX:4.8,scaleY:.05,y:175,opacity:0,duration:.55,ease:'power3.inOut'},.8);
tl.fromTo('#z-brand',{scaleX:.7,opacity:0},{scaleX:1,opacity:1,duration:.75,ease:'expo.out'},1.0);
tl.fromTo('#z-tagline',{y:30,opacity:0},{y:0,opacity:1,duration:.55,ease:'power3.out'},1.5);
tl.fromTo('#z-command',{scale:.7,opacity:0},{scale:1,opacity:1,duration:.75,ease:'back.out(1.5)'},1.8);
tl.fromTo('#z-credits',{opacity:0},{opacity:1,duration:.3},.4);
""",
)

SCENES = [
    ("hook", 0, 9.6),
    ("workspace", 9.6, 12.8),
    ("ingestion", 22.4, 12.8),
    ("architecture", 35.2, 16),
    ("question", 51.2, 6.4),
    ("live", 57.6, 25.6),
    ("session", 83.2, 12.8),
    ("source", 96, 12.8),
    ("alternative", 108.8, 9.6),
    ("verification", 118.4, 12.8),
    ("persistence", 131.2, 6.4),
    ("end", 137.6, 6.4),
]
for file in (P / "compositions").glob("*.html"):
    if file.stem not in BUILT:
        file.unlink()
hosts = "\n".join(
    f'<div id="{name}" class="clip" data-composition-id="{name}" data-composition-src="compositions/{name}.html" data-start="{start}" data-duration="{duration}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>'
    for name, start, duration in SCENES
)
hosts += '<div id="evidence-carrier" class="clip" data-composition-id="evidence-carrier" data-composition-src="compositions/evidence-carrier.html" data-start="95.0" data-duration="3.6" data-track-index="3" data-track-kind="graphics" data-width="1920" data-height="1080" style="z-index:3"></div>'
(P / "index.html").write_text(
    f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SENTINEL — Follow one event</title><script src="assets/vendor/gsap.min.js"></script><style>html,body{{margin:0;background:#f6faf9}}#root{{position:absolute;width:1920px;height:1080px;overflow:hidden}}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="{DURATION}" data-width="1920" data-height="1080">{hosts}<audio id="soundtrack" class="clip" data-start="0" data-duration="{DURATION}" data-track-index="2" data-volume="1" src="assets/audio/master.wav"></audio></div><script>window.__timelines=window.__timelines||{{}};window.__timelines.main=gsap.timeline({{paused:true}});</script></body></html>\n'''
)
(P / "storyboard.json").write_text(
    json.dumps(
        {
            "duration": DURATION,
            "fps": 30,
            "frames": round(DURATION * 30),
            "scenes": [{"id": n, "start": s, "duration": d} for n, s, d in SCENES],
            "case_id": F["case_id"],
            "agent_playback_rate": round(live_rate, 7),
            "review_handoff_seconds": round(review_at, 4),
            "report_handoff_seconds": round(report_at, 4),
            "actual_event_points": len(MAP["points"]),
            "overlays": [{"id": "evidence-carrier", "start": 95.0, "duration": 3.6}],
            "new_model_calls_for_edit": 0,
        },
        indent=2,
    )
    + "\n"
)
print("Built twelve continuous product scenes, 144 seconds, using existing real evidence.")
