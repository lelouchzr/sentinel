import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const origin = "https://frame-escape-atelier.lelouchrz.chatgpt.site";
if (!process.stdin.isTTY)
  throw new Error("A TTY is required for hidden Site authorization.");
process.stdin.setRawMode(true);
process.stdin.resume();
console.log("Ready for private Site authorization on stdin (hidden).");
const credentials = await new Promise((resolve, reject) => {
  let value = "";
  function receive(chunk) {
    value += chunk.toString("utf8");
    if (value.includes("\n")) {
      process.stdin.off("data", receive);
      try {
        resolve(JSON.parse(value.trim()));
      } catch {
        reject(new Error("Invalid authorization input"));
      }
    }
  }
  process.stdin.on("data", receive);
});
process.stdin.setRawMode(false);
process.stdin.pause();
async function get(path) {
  const r = await fetch(`${origin}${path}`, {
    headers: { "OAI-Sites-Authorization": `Bearer ${credentials.token}` },
    signal: AbortSignal.timeout(90000),
  });
  if (!r.ok)
    throw new Error(
      `HTTP ${r.status} while collecting an existing published illustration.`,
    );
  return r;
}
const assets = [];
await mkdir("public/stories", { recursive: true });
for (const [id, slug] of [
  ["serre-base", "le-secret-de-la-serre-00e47d55"],
  ["phare-base", "le-phare-des-marees-6c1b1fe6"],
  ["vigie-base", "la-vigie-de-la-lune-3fd3194c"],
]) {
  const { room } = await (await get(`/api/rooms/${slug}`)).json();
  const bytes = Buffer.from(await (await get(room.image)).arrayBuffer());
  if (
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error("Expected an existing PNG illustration.");
  await writeFile(`public/stories/${id}.png`, bytes);
  assets.push({
    id,
    path: `/stories/${id}.png`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    source: `${origin}${room.image}`,
    sourcePublication: `${origin}/jouer/${slug}`,
    adaptation:
      "Copied byte-for-byte from the published illustration; no pixel changes.",
    credits: room.credits,
  });
  console.log(`COPIED ${id} (${bytes.length} bytes)`);
}
await writeFile(
  "public/stories/base-manifest.json",
  JSON.stringify({ assets }, null, 2),
);
