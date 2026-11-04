import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  act,
  initialState,
  moveChapter,
  solution,
  validateRoom,
  playerRoom,
  attemptSchema,
  type GameObject,
} from "../lib/game.ts";
import { kitchenStory } from "../lib/stories/kitchen.ts";
import {
  generationSchema,
  buildGeneratedRoom,
} from "../lib/narrative-generation.ts";
function attempt(o: GameObject) {
  return {
    itemId: o.useItem,
    ...(o.puzzle?.kind === "move"
      ? { moved: o.puzzle.pieces.map((p) => p.id) }
      : o.puzzle
        ? { order: o.puzzle.solution }
        : {}),
  };
}
function until(target: string) {
  let state = initialState(kitchenStory);
  for (const id of solution(kitchenStory)) {
    if (id === target) return state;
    const o = kitchenStory.objects.find((o) => o.id === id)!;
    if (o.chapterId !== state.chapterId)
      state = moveChapter(kitchenStory, state, o.chapterId!).state;
    state = act(
      kitchenStory,
      state,
      id,
      o.code ?? undefined,
      false,
      o.choices?.[0]?.id,
      attempt(o),
    ).state;
  }
  throw Error("Missing target");
}

test("fruits require three distinct moves; clicking or forged duplicates do not award the clue", () => {
  const state = until("k-fruits"),
    o = kitchenStory.objects.find((o) => o.id === "k-fruits")!;
  assert.equal(act(kitchenStory, state, o.id).outcome, "needs_manipulation");
  for (const moved of [
    ["pomme"],
    ["pomme", "pomme", "poire"],
    ["pomme", "poire", "forged"],
  ]) {
    const result = act(kitchenStory, state, o.id, undefined, false, undefined, {
      moved,
    });
    assert.equal(result.outcome, "wrong_manipulation");
    assert.equal(result.state.resolved.includes(o.id), false);
  }
  const done = act(
    kitchenStory,
    state,
    o.id,
    undefined,
    false,
    undefined,
    attempt(o),
  );
  assert.equal(done.outcome, "resolved");
  assert.equal(state.resolved.includes(o.id), false);
  const restored = JSON.parse(JSON.stringify(done.state));
  assert.equal(act(kitchenStory, restored, o.id).outcome, "resolved");
  assert.equal(
    restored.inventory.filter((item: any) => item.id === o.id).length,
    1,
  );
});
test("recipe order is checked by the server and hidden from the player payload", () => {
  const state = until("k-pate"),
    o = kitchenStory.objects.find((o) => o.id === "k-pate")!;
  const visible = playerRoom(kitchenStory, state).objects.find(
    (a) => a.id === o.id,
  )!;
  assert.ok(visible.puzzle);
  assert.equal("solution" in visible.puzzle, false);
  const wrong = act(kitchenStory, state, o.id, undefined, false, undefined, {
    order: [...o.puzzle!.solution!].reverse(),
  });
  assert.equal(wrong.outcome, "wrong_manipulation");
  assert.equal(wrong.state.resolved.includes(o.id), false);
  assert.equal(
    act(kitchenStory, state, o.id, undefined, false, undefined, attempt(o))
      .outcome,
    "resolved",
  );
  assert.equal(
    act(kitchenStory, state, o.id, undefined, true).state.resolved.includes(
      o.id,
    ),
    false,
  );
});
test("a key in the inventory must explicitly be chosen for its own lock", () => {
  const state = until("k-porte-reserve"),
    o = kitchenStory.objects.find((o) => o.id === "k-porte-reserve")!;
  assert.equal(act(kitchenStory, state, o.id).outcome, "needs_item");
  assert.equal(
    act(kitchenStory, state, o.id, undefined, false, undefined, {
      itemId: "k-fruits",
    }).outcome,
    "needs_item",
  );
  assert.equal(
    act(kitchenStory, state, o.id, undefined, false, undefined, attempt(o))
      .outcome,
    "resolved",
  );
});
test("unexecutable interaction combinations and invalid manipulation definitions are rejected", () => {
  const bad = structuredClone(kitchenStory);
  const o = bad.objects.find((o) => o.id === "k-fruits")!;
  o.puzzle!.pieces[1].id = o.puzzle!.pieces[0].id;
  assert.throws(() => validateRoom(bad), /uniques/);
  const other = structuredClone(kitchenStory);
  other.objects.find((o) => o.id === "k-pate")!.puzzle!.solution = ["peser"];
  assert.throws(() => validateRoom(other), /solution/);
  assert.throws(() =>
    attemptSchema.parse({ moved: ["pomme"], execute: "script" }),
  );
  const impossible = structuredClone(kitchenStory);
  impossible.objects.find((o) => o.id === "k-porte-reserve")!.puzzle = {
    kind: "move",
    instruction: "x",
    pieces: [
      { id: "a", label: "a" },
      { id: "b", label: "b" },
      { id: "c", label: "c" },
    ],
  };
  assert.throws(() => validateRoom(impossible), /Séparez/);
});
test("long generation validates rich output through the same rules and ignores model asset URLs", () => {
  const fixture = structuredClone(kitchenStory) as any;
  delete fixture.image;
  delete fixture.credits;
  delete fixture.imageProvenance;
  delete fixture.provenance;
  fixture.chapters = fixture.chapters.map(
    ({ image, credits, imageProvenance, ...c }: any) => c,
  );
  const base = {
    title: kitchenStory.title,
    image: kitchenStory.image,
    credits: kitchenStory.credits,
  };
  const room = buildGeneratedRoom(fixture, base, "long");
  assert.equal(room.objects.length, 28);
  assert.ok(room.chapters!.every((c) => c.image === base.image));
  const schema = generationSchema("long");
  assert.ok(schema.required.includes("chapters"));
  assert.ok(schema.required.includes("ending"));
  fixture.objects = fixture.objects.map(({ puzzle, ...o }: any) => o);
  assert.throws(
    () => buildGeneratedRoom(fixture, base, "long"),
    /manipulations/,
  );
});

test("the captured real Muse Spark long story completes both endings with its generated manipulations", () => {
  const evidence = JSON.parse(
    readFileSync("evidence/meta-long-interactive.json", "utf8"),
  );
  const room = validateRoom(evidence.room);
  assert.equal(room.provenance.model, "muse-spark-1.3");
  assert.ok(room.objects.length >= 18);
  for (const variant of room.ending!.variants) {
    let state = initialState(room);
    for (const id of solution(room)) {
      const o = room.objects.find((o) => o.id === id)!;
      if (o.chapterId !== state.chapterId)
        state = moveChapter(room, state, o.chapterId!).state;
      const result = act(
        room,
        state,
        id,
        o.code ?? undefined,
        false,
        o.action === "choose" ? variant.choiceId : undefined,
        attempt(o),
      );
      assert.ok(["resolved", "complete"].includes(result.outcome), id);
      state = result.state;
    }
    assert.equal(state.complete, true);
    assert.equal(playerRoom(room, state).ending?.title, variant.title);
  }
});
