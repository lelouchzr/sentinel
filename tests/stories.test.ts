import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { storyCatalog } from "../lib/stories/index.ts";
import {
  act,
  initialState,
  moveChapter,
  solution,
  endingFor,
  playerRoom,
  discoveredMessages,
  validateRoom,
  replaceIllustration,
} from "../lib/game.ts";

for (const { slug, definition: room } of storyCatalog) {
  test(`${slug}: four illustrated chapters, valid narrative contracts and real artwork`, () => {
    assert.equal(room.chapters?.length, 4);
    assert.ok(room.objects.length >= 20);
    assert.equal(room.ending?.variants.length, 2);
    assert.equal(new Set(room.chapters!.map((c) => c.image)).size, 4);
    assert.doesNotThrow(() => validateRoom(room));
    for (const chapter of room.chapters!) {
      const bytes = readFileSync(`public${chapter.image}`);
      assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    }
  });
  for (const variant of room.ending!.variants) {
    test(`${slug}: complete route, backtracking and ending ${variant.choiceId}`, () => {
      let state = initialState(room);
      let travelCount = 0;
      for (const id of solution(room)) {
        const object = room.objects.find((o) => o.id === id)!;
        if (state.chapterId !== object.chapterId) {
          state = moveChapter(room, state, object.chapterId!).state;
          travelCount++;
        }
        const result = act(
          room,
          state,
          id,
          object.code ?? undefined,
          false,
          object.action === "choose" ? variant.choiceId : undefined,
          {
            itemId: object.useItem,
            ...(object.puzzle?.kind === "move"
              ? { moved: object.puzzle.pieces.map((p) => p.id) }
              : object.puzzle
                ? { order: object.puzzle.solution }
                : {}),
          },
        );
        assert.ok(
          ["resolved", "complete"].includes(result.outcome),
          `${id}: ${result.outcome}`,
        );
        state = JSON.parse(JSON.stringify(result.state));
      }
      assert.equal(state.complete, true);
      assert.equal(state.resolved.length, room.objects.length);
      assert.equal(state.visited?.length, 4);
      assert.ok(travelCount > 3, "story requires a return to an earlier place");
      assert.equal(
        state.choices?.[room.ending!.sourceObjectId],
        variant.choiceId,
      );
      assert.deepEqual(endingFor(room, state), {
        title: variant.title,
        text: variant.text,
      });
      assert.equal(discoveredMessages(room, state).at(-1), variant.text);
      assert.equal(playerRoom(room, state).ending?.title, variant.title);
      assert.throws(
        () => moveChapter(room, state, room.chapters![0].id),
        /terminée/,
      );
    });
  }
  test(`${slug}: hidden scenes, cross-scene hints and premature travel are protected`, () => {
    const state = initialState(room);
    const visible = playerRoom(room, state);
    assert.equal(
      visible.objects.length,
      room.objects.filter((o) => o.chapterId === state.chapterId).length,
    );
    assert.equal(visible.ending, undefined);
    for (const c of visible.chapters!.slice(1)) {
      assert.equal(c.unlocked, false);
      assert.equal("image" in c, false);
      assert.equal("story" in c, false);
      assert.throws(() => moveChapter(room, state, c.id));
    }
    for (const o of visible.objects) {
      for (const field of ["code", "message", "requires"])
        assert.equal(field in o, false);
      for (const choice of o.choices ?? [])
        assert.equal("reply" in choice, false);
    }
    const hidden = room.objects.find((o) => o.chapterId !== state.chapterId)!;
    assert.throws(
      () => act(room, state, hidden.id, undefined, true),
      /autre lieu/,
    );
    assert.equal(state.hints, 0);
  });
}

test("narrative validator rejects chapter deadlocks and mismatched endings", () => {
  const room = structuredClone(storyCatalog[0].definition);
  room.chapters![1].requires = [
    room.objects.find((o) => o.chapterId === room.chapters![1].id)!.id,
  ];
  assert.throws(() => validateRoom(room), /inaccessibles/);
  const other = structuredClone(storyCatalog[0].definition);
  other.ending!.variants[0].choiceId = "unknown";
  assert.throws(() => validateRoom(other), /conclusion unique/);
});

test("chapter artwork replacement preserves other scenes and their contours", () => {
  const room = structuredClone(storyCatalog[0].definition);
  const chapter = room.chapters![1];
  const result = replaceIllustration(
    room,
    { image: room.chapters![2].image, credits: chapter.credits },
    chapter.id,
  );
  assert.equal(result.image, room.image);
  assert.equal(result.chapters![1].image, room.chapters![2].image);
  assert.equal(result.chapters![0].image, room.chapters![0].image);
});

test("recorded Meta illustrations match the exact generated files", () => {
  for (const manifest of ["manifest", "base-manifest"]) {
    const data = JSON.parse(
      readFileSync(`public/stories/${manifest}.json`, "utf8"),
    );
    for (const asset of data.assets) {
      assert.equal(
        createHash("sha256")
          .update(readFileSync(`public${asset.path}`))
          .digest("hex"),
        asset.sha256,
        asset.id,
      );
      if (manifest === "manifest")
        assert.equal(asset.imageProvenance.model, "muse-image-1.0");
    }
  }
});

// A clickable object's centre must not be intercepted by a later painted target.
test("curated scene targets remain individually clickable", () => {
  for (const { slug, definition: room } of storyCatalog)
    for (let i = 0; i < room.objects.length; i++) {
      const o = room.objects[i],
        x = o.region.x + o.region.w / 2,
        y = o.region.y + o.region.h / 2;
      const covering = room.objects
        .slice(i + 1)
        .filter(
          (a) =>
            a.chapterId === o.chapterId &&
            x > a.region.x &&
            x < a.region.x + a.region.w &&
            y > a.region.y &&
            y < a.region.y + a.region.h,
        );
      assert.deepEqual(
        covering.map((a) => a.id),
        [],
        `${slug}: ${o.id} is covered`,
      );
    }
});
