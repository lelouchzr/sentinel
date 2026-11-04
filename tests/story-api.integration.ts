import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { englishRoom } from "../lib/language.ts";
import { storyCatalog } from "../lib/stories/index.ts";
import { solution, discoveredMessages, validateRoom } from "../lib/game.ts";
const origin = process.env.FRAME_TEST_URL ?? "http://127.0.0.1:5180";
assert.equal(new URL(origin).hostname, "127.0.0.1");
const checks: string[] = [];
async function request(
  path: string,
  body?: unknown,
  token?: string,
  auth = false,
  method = body ? "POST" : "GET",
) {
  const response = await fetch(`${origin}/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Play-Token": token } : {}),
      ...(auth ? { Cookie: "__sites_local_auth=1" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: (await response.json()) as any };
}
const recorded = JSON.parse(
  await readFile("evidence/meta-long-interactive.json", "utf8"),
).room;
const generated = validateRoom(englishRoom(recorded));
// Persist the historical French definition, then exercise its English presentation.
const generatedDraft = await request(
  "drafts",
  { room: recorded },
  undefined,
  true,
);
assert.equal(generatedDraft.status, 201);
const restoredDraft = await request(`drafts/${generatedDraft.data.id}`, undefined, undefined, true);
assert.equal(restoredDraft.data.room.title, generated.title);
assert.deepEqual(restoredDraft.data.room.provenance, recorded.provenance);
for (const [legacy, english] of [
  ["le-dernier-service", "the-last-service"],
  ["le-secret-de-la-serre", "the-greenhouse-secret"],
  ["le-phare-des-marees", "the-tidal-lighthouse"],
  ["la-vigie-de-la-lune", "moonwatch"],
]) {
  const oldLink = await request(`rooms/${legacy}`);
  const current = await request(`rooms/${english}`);
  assert.equal(oldLink.status, 200);
  assert.deepEqual(oldLink.data.room, current.data.room);
}
const candidates = [
  ...storyCatalog.map((s) => ({
    ...s,
    draftId: undefined as string | undefined,
  })),
  {
    slug: "captured-meta-long",
    definition: generated,
    draftId: generatedDraft.data.id,
  },
];
for (const { slug, definition: room, draftId } of candidates) {
  const advertised = draftId
    ? (await request("play", { draftId }, undefined, true)).data.room
    : (await request(`rooms/${slug}`)).data.room;
  assert.equal(advertised.chapters.length, room.chapters!.length);
  assert.equal(advertised.totalObjects, room.objects.length);
  assert.ok(
    advertised.chapters
      .slice(1)
      .every((c: any) => !("image" in c) && !("story" in c)),
  );
  if (!draftId) assert.equal((await request(`templates/${slug}`)).status, 401);
  for (const variant of room.ending!.variants) {
    let session = (
      await request(
        "play",
        draftId ? { draftId } : { slug },
        undefined,
        !!draftId,
      )
    ).data;
    const mutate = (body: unknown) =>
      request(
        `play/${session.id}`,
        { ...(body as object), revision: session.revision },
        session.token,
      );
    const hidden = room.objects.find(
      (o) => o.chapterId !== session.state.chapterId,
    )!;
    assert.equal(
      (await mutate({ chapterId: room.chapters![1].id })).status,
      422,
    );
    assert.equal(
      (await mutate({ objectId: hidden.id, hint: true })).status,
      422,
    );
    assert.equal(
      (
        await mutate({
          chapterId: room.chapters![0].id,
          objectId: room.objects[0].id,
        })
      ).status,
      400,
    );
    for (const id of solution(room)) {
      const object = room.objects.find((o) => o.id === id)!;
      if (session.state.chapterId !== object.chapterId) {
        const moved = await mutate({ chapterId: object.chapterId });
        assert.equal(moved.status, 200, `${slug}:${id}`);
        session = { ...session, ...moved.data };
        assert.equal(session.room.chapterId, object.chapterId);
      }
      if (object.action === "choose") {
        const bad = await mutate({ objectId: id, choiceId: "forged-choice" });
        assert.equal(bad.status, 422);
      }
      if (object.puzzle) {
        const prompt = await mutate({ objectId: id });
        assert.equal(prompt.data.outcome, "needs_manipulation");
        session = { ...session, ...prompt.data };
        const invalid = await mutate({
          objectId: id,
          attempt:
            object.puzzle.kind === "move" ? { moved: [] } : { order: [] },
        });
        assert.equal(invalid.data.outcome, "wrong_manipulation");
        assert.ok(!invalid.data.state.resolved.includes(id));
        session = { ...session, ...invalid.data };
        const redacted = session.room.objects.find((o: any) => o.id === id);
        assert.equal("solution" in redacted.puzzle, false);
      }
      if (object.useItem) {
        const prompt = await mutate({
          objectId: id,
          attempt: { itemId: "forged-key" },
        });
        assert.equal(prompt.data.outcome, "needs_item");
        session = { ...session, ...prompt.data };
      }
      const previous = session.revision;
      const step = await mutate({
        objectId: id,
        code: object.code ?? undefined,
        choiceId: object.action === "choose" ? variant.choiceId : undefined,
        attempt: {
          itemId: object.useItem,
          ...(object.puzzle?.kind === "move"
            ? { moved: object.puzzle.pieces.map((p) => p.id) }
            : object.puzzle
              ? { order: object.puzzle.solution }
              : {}),
        },
      });
      assert.equal(step.status, 200);
      assert.ok(["resolved", "complete"].includes(step.data.outcome));
      session = { ...session, ...step.data };
      assert.equal(
        (
          await request(
            `play/${session.id}`,
            { objectId: id, revision: previous },
            session.token,
          )
        ).status,
        409,
      );
    }
    const restored = (
      await request(`play/${session.id}`, undefined, session.token)
    ).data;
    assert.equal(restored.state.complete, true);
    assert.equal(restored.state.visited.length, room.chapters!.length);
    assert.equal(
      restored.state.choices[room.ending!.sourceObjectId],
      variant.choiceId,
    );
    assert.equal(restored.room.ending.title, variant.title);
    assert.deepEqual(
      restored.journal,
      discoveredMessages(room, restored.state),
    );
    checks.push(
      `${slug}: ${variant.choiceId}, travel/backtracking, concurrency, saved ending/journal`,
    );
    console.log(`PASS ${checks.at(-1)}`);
  }
}
// A later chapter's R2 image obeys the same ownership/publication rules as a cover.
const png = await readFile("public/scenes/kitchen.png");
const uploaded = await request(
  "assets",
  { dataUrl: `data:image/png;base64,${png.toString("base64")}` },
  undefined,
  true,
);
assert.equal(uploaded.status, 201);
const fixture = structuredClone(storyCatalog[0].definition);
fixture.title = "Chapter asset fixture";
fixture.chapters![1].image = uploaded.data.image;
assert.equal((await fetch(origin + uploaded.data.image)).status, 404);
const draft = await request("drafts", { room: fixture }, undefined, true);
assert.equal(draft.status, 201);
let session = (
  await request("play", { draftId: draft.data.id }, undefined, true)
).data;
for (const id of solution(fixture)) {
  const o = fixture.objects.find((v) => v.id === id)!;
  if (session.state.chapterId !== o.chapterId)
    session = {
      ...session,
      ...(
        await request(
          `play/${session.id}`,
          { chapterId: o.chapterId, revision: session.revision },
          session.token,
        )
      ).data,
    };
  session = {
    ...session,
    ...(
      await request(
        `play/${session.id}`,
        {
          objectId: id,
          code: o.code ?? undefined,
          choiceId: o.choices?.[0]?.id,
          attempt: {
            itemId: o.useItem,
            ...(o.puzzle?.kind === "move"
              ? { moved: o.puzzle.pieces.map((p) => p.id) }
              : o.puzzle
                ? { order: o.puzzle.solution }
                : {}),
          },
          revision: session.revision,
        },
        session.token,
      )
    ).data,
  };
}
assert.equal(session.state.complete, true);
const publication = await request(
  `drafts/${draft.data.id}/publish`,
  { visibility: "unlisted", rightsConfirmed: true },
  undefined,
  true,
);
assert.equal(publication.status, 201);
assert.equal((await fetch(origin + uploaded.data.image)).status, 200);
assert.equal(
  (
    await request(
      `publications/${publication.data.id}`,
      undefined,
      undefined,
      true,
      "DELETE",
    )
  ).status,
  200,
);
assert.equal((await fetch(origin + uploaded.data.image)).status, 404);
checks.push(
  "A secondary chapter asset stays private before publication and after withdrawal",
);
console.log(`PASS ${checks.at(-1)}`);
await writeFile(
  "outputs/story-api-evidence.json",
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
