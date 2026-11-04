import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";

// Intentionally restricted to the portable starter's loopback test identity.
const origin = process.env.FRAME_TEST_URL ?? "http://127.0.0.1:5180";
assert.equal(new URL(origin).hostname, "127.0.0.1");
const checks = [];
async function request(
  path,
  { authenticated = false, method = "GET", body, headers = {} } = {},
) {
  const response = await fetch(`${origin}/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authenticated ? { Cookie: "__sites_local_auth=1" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text };
  }
  return { status: response.status, data };
}
function record(name) {
  checks.push(name);
  console.log(`PASS ${name}`);
}
const template = await request("templates/kitchen", { authenticated: true });
assert.equal(template.status, 200);
const room = template.data.room;
const anonymous = await request("drafts");
assert.equal(anonymous.status, 401);
record("anonymous visitors cannot read creator drafts");
const forged = await request("drafts", {
  headers: {
    "oai-authenticated-user-id": "forged",
    "oai-authenticated-user-email": "forged@example.test",
  },
});
assert.equal(forged.status, 401);
record("local proxy strips forged identity headers");
const invalid = structuredClone(room);
invalid.objects[0].requires = ["tiroir"];
assert.equal(
  (
    await request("drafts", {
      authenticated: true,
      method: "POST",
      body: { room: invalid },
    })
  ).status,
  422,
);
record("cyclic model or manual input is rejected at the API boundary");
const created = await request("drafts", {
  authenticated: true,
  method: "POST",
  body: { room: { ...room, title: "API integration fixture" } },
});
assert.equal(created.status, 201);
const id = created.data.id;
assert.equal((await request(`drafts/${id}`)).status, 401);
record("private draft is not readable without an identity");
assert.equal(
  (
    await request(`drafts/${id}/publish`, {
      authenticated: true,
      method: "POST",
      body: { visibility: "public", rightsConfirmed: true },
    })
  ).status,
  422,
);
record("untested games cannot be published");
const started = await request("play", {
  authenticated: true,
  method: "POST",
  body: { draftId: id },
});
assert.equal(started.status, 201);
const session = started.data;
assert.deepEqual(session.journal, []);
assert.equal((await request(`play/${session.id}`)).status, 404);
record("play sessions require their separate capability token");
assert.ok(
  session.room.objects.every(
    (o) => !("code" in o) && !("requires" in o) && !("message" in o),
  ),
);
record("player payload omits answers and hidden dependencies");
let rev = 0;
for (const object of room.objects) {
  const result = await request(`play/${session.id}`, {
    method: "POST",
    headers: { "X-Play-Token": session.token },
    body: {
      objectId: object.id,
      code: object.code ?? undefined,
      revision: rev,
    },
  });
  assert.equal(result.status, 200);
  assert.deepEqual(
    result.data.journal,
    result.data.state.resolved.map(
      (id) => room.objects.find((o) => o.id === id).message,
    ),
  );
  if (rev === 0) {
    const midway = await request(`play/${session.id}`, {
      headers: { "X-Play-Token": session.token },
    });
    assert.deepEqual(midway.data.journal, [room.objects[0].message]);
    assert.ok(!midway.data.journal.includes(room.objects[1].message));
    record("reloading a partial game restores only discoveries already earned");
  }
  rev = result.data.revision;
}
const stale = await request(`play/${session.id}`, {
  method: "POST",
  headers: { "X-Play-Token": session.token },
  body: { objectId: "porte", revision: 0 },
});
assert.equal(stale.status, 409);
record("stale or concurrent actions cannot overwrite a newer state");
const restored = await request(`play/${session.id}`, {
  headers: { "X-Play-Token": session.token },
});
assert.equal(restored.data.state.complete, true);
assert.equal(
  restored.data.journal.at(-1),
  room.objects.find((o) => o.action === "exit").message,
);
record("completed game state survives a fresh request");
const pub = await request(`drafts/${id}/publish`, {
  authenticated: true,
  method: "POST",
  body: { visibility: "unlisted", rightsConfirmed: true },
});
assert.equal(pub.status, 201);
assert.equal((await request(`rooms/${pub.data.slug}`)).status, 200);
assert.ok(
  !(await request("gallery")).data.rooms.some((r) => r.slug === pub.data.slug),
);
record("unlisted games play by link and stay out of the public gallery");
const publicVersion = await request(`drafts/${id}/publish`, {
  authenticated: true,
  method: "POST",
  body: { visibility: "public", rightsConfirmed: true },
});
assert.equal(publicVersion.status, 201);
assert.ok(
  (await request("gallery")).data.rooms.some(
    (r) => r.slug === publicVersion.data.slug,
  ),
);
assert.equal(
  (
    await request("play", {
      method: "POST",
      body: { slug: publicVersion.data.slug },
    })
  ).status,
  201,
);
record(
  "published games appear in the shared gallery and support anonymous play",
);
const changed = await request(`drafts/${id}`, {
  authenticated: true,
  method: "PUT",
  body: { room: { ...room, title: "Modified after publication" }, revision: 1 },
});
assert.equal(changed.status, 200);
assert.equal(
  (await request(`rooms/${pub.data.slug}`)).data.room.title,
  "API integration fixture",
);
record("published snapshots do not change when a draft is edited");
assert.equal(
  (
    await request(`drafts/${id}/publish`, {
      authenticated: true,
      method: "POST",
      body: { visibility: "public", rightsConfirmed: true },
    })
  ).status,
  422,
);
record("a changed revision must be play-tested again");
assert.equal(
  (
    await request(`drafts/${id}`, {
      authenticated: true,
      method: "PUT",
      body: { room, revision: 1 },
    })
  ).status,
  409,
);
record("stale editor revisions are rejected");
const removed = await request(`publications/${pub.data.id}`, {
  authenticated: true,
  method: "DELETE",
});
assert.equal(removed.status, 200);
assert.equal((await request(`rooms/${pub.data.slug}`)).status, 404);
record("withdrawal also disables the direct public link");
assert.equal(
  (
    await request(`publications/${publicVersion.data.id}`, {
      authenticated: true,
      method: "DELETE",
    })
  ).status,
  200,
);
const csrf = await request("drafts", {
  authenticated: true,
  method: "POST",
  headers: { Origin: "https://unrelated.example" },
  body: { room },
});
assert.equal(csrf.status, 403);
record("cross-origin mutations are rejected");

const png = await readFile("public/scenes/kitchen.png");
const upload = await request("assets", {
  authenticated: true,
  method: "POST",
  body: { dataUrl: `data:image/png;base64,${png.toString("base64")}` },
});
assert.equal(upload.status, 201);
assert.equal((await fetch(origin + upload.data.image)).status, 404);
assert.equal(
  (
    await fetch(origin + upload.data.image, {
      headers: { Cookie: "__sites_local_auth=1" },
    })
  ).status,
  200,
);
record("uploaded R2 illustrations remain private before publication");
const uploadedRoom = {
  ...room,
  image: upload.data.image,
  title: "Uploaded image fixture",
};
const uploadedDraft = await request("drafts", {
  authenticated: true,
  method: "POST",
  body: { room: uploadedRoom },
});
assert.equal(uploadedDraft.status, 201);
const uploadedPlay = (
  await request("play", {
    authenticated: true,
    method: "POST",
    body: { draftId: uploadedDraft.data.id },
  })
).data;
let imageRevision = 0;
for (const object of room.objects) {
  const step = await request(`play/${uploadedPlay.id}`, {
    method: "POST",
    headers: { "X-Play-Token": uploadedPlay.token },
    body: {
      objectId: object.id,
      code: object.code ?? undefined,
      revision: imageRevision,
    },
  });
  assert.equal(step.status, 200);
  imageRevision = step.data.revision;
}
const imagePublication = await request(
  `drafts/${uploadedDraft.data.id}/publish`,
  {
    authenticated: true,
    method: "POST",
    body: { visibility: "unlisted", rightsConfirmed: true },
  },
);
assert.equal(imagePublication.status, 201);
assert.equal((await fetch(origin + upload.data.image)).status, 200);
await request(`publications/${imagePublication.data.id}`, {
  authenticated: true,
  method: "DELETE",
});
assert.equal((await fetch(origin + upload.data.image)).status, 404);
record("publication exposes its image and withdrawal restores private access");
assert.equal(
  (
    await request("assets", {
      authenticated: true,
      method: "POST",
      body: { dataUrl: "data:image/png;base64,SGVsbG8=" },
    })
  ).status,
  422,
);
record("non-image payloads cannot be uploaded as PNG illustrations");
await writeFile(
  "outputs/api-evidence.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      target: "loopback preview",
      passed: checks.length,
      checks,
    },
    null,
    2,
  ) + "\n",
);
