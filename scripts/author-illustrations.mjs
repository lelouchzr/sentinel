import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
if (!process.stdin.isTTY)
  throw new Error("A TTY is required for hidden authorization input.");
process.stdin.setRawMode(true);
process.stdin.resume();
console.log("Ready for Meta authorization on stdin (hidden).");
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
const entries = JSON.parse(await readFile(process.argv[2], "utf8"));
await mkdir("public/stories", { recursive: true });
let manifest;
try {
  manifest = JSON.parse(await readFile("public/stories/manifest.json", "utf8"));
} catch {
  manifest = { assets: [] };
}
let cursor = 0,
  queue = Promise.resolve();
async function worker() {
  while (cursor < entries.length) {
    const entry = entries[cursor++];
    if (manifest.assets.some((a) => a.id === entry.id)) {
      console.log(`REUSE ${entry.id}`);
      continue;
    }
    console.log(`GENERATE ${entry.id}`);
    const runId = randomUUID();
    const response = await fetch("https://api.meta.ai/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "muse-image-1.0",
        n: 1,
        size: "1536x1024",
        output_format: "png",
        response_format: "b64_json",
        reasoning_strength: "low",
        tool_enablement: {
          enable_image_search: false,
          enable_web_search: false,
          enable_shell: false,
        },
        prompt: entry.prompt,
      }),
      signal: AbortSignal.timeout(180000),
    });
    if (!response.ok)
      throw new Error(
        `Meta ${entry.id}: HTTP ${response.status}; completed assets are retained, no automatic retry.`,
      );
    const result = await response.json();
    const encoded = result.data?.[0]?.b64_json;
    if (typeof encoded !== "string")
      throw new Error(`Meta ${entry.id}: missing PNG output`);
    const bytes = Buffer.from(encoded, "base64");
    if (
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      throw new Error("Provider returned a non-PNG");
    await writeFile(`public/stories/${entry.id}.png`, bytes);
    const generatedAt = new Date().toISOString();
    manifest.assets.push({
      id: entry.id,
      path: `/stories/${entry.id}.png`,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      provider: "Meta Model API",
      providerResponseId: result.id ?? null,
      imageProvenance: {
        model: "muse-image-1.0",
        runId,
        prompt: entry.prompt,
        generatedAt,
      },
      credits: [
        {
          title: entry.title,
          author: "Muse Image · Meta",
          license: "Image générée pour cette aventure",
          url: "https://dev.meta.ai/models/muse-image",
        },
      ],
    });
    queue = queue.then(() =>
      writeFile(
        "public/stories/manifest.json",
        JSON.stringify(manifest, null, 2),
      ),
    );
    await queue;
    console.log(`SAVED ${entry.id} (${bytes.length} bytes)`);
  }
}
const results = await Promise.allSettled([worker(), worker()]);
for (const result of results)
  if (result.status === "rejected") {
    console.error(result.reason.message);
    process.exitCode = 1;
  }
console.log(`Complete: ${manifest.assets.length} illustrations recorded.`);
