import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  act,
  initialState,
  playerRoom,
  solution,
  validateRoom,
  replaceIllustration,
  objectSchema,
} from "../lib/game.ts";
import { kitchen, japanese } from "../lib/rooms.ts";

test("the kitchen can be completed, with wrong actions and codes rejected", () => {
  const room = validateRoom(kitchen);
  const initial = initialState();
  assert.equal(act(room, initial, "porte").outcome, "locked");
  assert.equal(act(room, initial, "tiroir", "23").outcome, "locked");
  const seen = act(room, initial, "assiettes").state;
  assert.equal(act(room, seen, "tiroir", "00").outcome, "wrong_code");
  const opened = act(room, seen, "tiroir", "23").state;
  assert.equal(opened.inventory[0].name, "Clé en laiton");
  assert.equal(act(room, opened, "porte").outcome, "locked");
  const found = act(room, opened, "fruits").state;
  const won = act(room, found, "porte");
  assert.equal(won.outcome, "complete");
  assert.equal(won.state.inventory.length, 2);
  assert.equal(initial.moves, 0);
  assert.equal(act(room, found, "fruits").state.inventory.length, 2);
});
test("both templates have a reachable solution and don't leak it to players", () => {
  for (const room of [kitchen, japanese]) {
    validateRoom(room);
    let state = initialState();
    for (const id of solution(room)) {
      const object = room.objects.find((o) => o.id === id)!;
      state = act(room, state, id, object.code ?? undefined).state;
    }
    assert.equal(state.complete, true);
    for (const object of playerRoom(room).objects) {
      assert.equal("code" in object, false);
      assert.equal("requires" in object, false);
      assert.equal("message" in object, false);
    }
  }
});
test("untrusted definitions reject cycles, bad regions and duplicate IDs", () => {
  const cycle = structuredClone(kitchen);
  cycle.objects[0].requires = ["tiroir"];
  assert.throws(() => validateRoom(cycle), /circulaires/);
  const duplicate = structuredClone(kitchen);
  duplicate.objects[1].id = "assiettes";
  assert.throws(() => validateRoom(duplicate), /unique/);
  const region = structuredClone(kitchen);
  region.objects[0].region.x = 0.99;
  assert.throws(() => validateRoom(region));
  const missing = structuredClone(kitchen);
  missing.objects[0].requires = ["absent"];
  assert.throws(() => validateRoom(missing), /Dépendance/);
  const injection = structuredClone(kitchen);
  injection.objects[0].mask = {
    path: "<script>alert(1)</script>",
    width: 100,
    height: 100,
  };
  assert.throws(() => validateRoom(injection));
});
test("hints increment a separate counter and never unlock an object", () => {
  const state = act(kitchen, initialState(), "tiroir", undefined, true).state;
  assert.equal(state.hints, 1);
  assert.equal(state.moves, 0);
  assert.deepEqual(state.resolved, []);
});

test("the captured real Muse Spark scenario passes the same deterministic contract", () => {
  const evidence = JSON.parse(
    readFileSync(
      new URL("../evidence/meta-kitchen.json", import.meta.url),
      "utf8",
    ),
  );
  const room = validateRoom(evidence.definition);
  let state = initialState();
  for (const id of solution(room)) {
    const object = room.objects.find((o) => o.id === id)!;
    state = act(room, state, id, object.code ?? undefined).state;
  }
  assert.equal(state.complete, true);
  assert.equal(room.provenance.method, "meta");
  assert.equal(room.provenance.model, "muse-spark-1.3");
});

test("an accessible code prompt retains the author's puzzle context", () => {
  const seen = act(kitchen, initialState(), "assiettes").state;
  assert.equal(
    act(kitchen, seen, "tiroir").message,
    kitchen.objects[1].lockedMessage,
  );
});

test("image replacement discards transport metadata and contours from the previous image", () => {
  const previous = structuredClone(kitchen);
  previous.objects[0].mask = { path: "M0 0H10V10Z", width: 10, height: 10 };
  const payload = {
    image: "/scenes/japanese.png",
    credits: previous.credits,
    width: 1280,
    height: 905,
    runId: crypto.randomUUID(),
    model: "muse-image-1.0",
  };
  const room = replaceIllustration(previous, payload);
  assert.equal(room.image, "/scenes/japanese.png");
  assert.equal("width" in room, false);
  assert.equal("runId" in room, false);
  assert.equal(room.objects[0].mask, undefined);
});

test("the captured real SAM mask satisfies the saved-object contract", () => {
  const evidence = JSON.parse(
    readFileSync(
      new URL("../evidence/sam-fruits.json", import.meta.url),
      "utf8",
    ),
  );
  const object = objectSchema.parse({
    ...kitchen.objects[2],
    region: evidence.region,
    mask: evidence.mask,
  });
  assert.equal(object.mask?.source?.model, "sam-3.1");
  assert.ok(object.mask!.path.length > 0);
});
