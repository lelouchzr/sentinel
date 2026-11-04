import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { englishRoom, englishState, englishText, legacyTextKey } from "../lib/language.ts";
import { canonicalStorySlug, savedStorySlug } from "../lib/story-links.ts";
import { act, initialState, moveChapter, solution, validateRoom, type Room } from "../lib/game.ts";

const recorded = JSON.parse(readFileSync("evidence/meta-long-interactive.json", "utf8")).room as Room;
function mechanics(room: Room) {
  return {
    image: room.image,
    provenance: room.provenance,
    imageProvenance: room.imageProvenance,
    objects: room.objects.map(({ id, chapterId, action, region, requires, code, animation, mask, useItem, puzzle, choices }) => ({
      id, chapterId, action, region, requires, code, animation, mask, useItem,
      puzzle: puzzle && { kind: puzzle.kind, pieces: puzzle.pieces.map((p) => p.id), solution: puzzle.solution },
      choices: choices?.map((choice) => choice.id),
    })),
    chapters: room.chapters?.map(({ id, image, requires }) => ({ id, image, requires })),
    ending: room.ending && { sourceObjectId: room.ending.sourceObjectId, choices: room.ending.variants.map((v) => v.choiceId) },
  };
}

test("English presentation preserves recorded Meta rules and original generation evidence", () => {
  const original = JSON.stringify(recorded);
  const translated = validateRoom(englishRoom(recorded));
  assert.notEqual(translated.title, recorded.title);
  assert.deepEqual(mechanics(translated), mechanics(recorded));
  assert.equal(JSON.stringify(recorded), original);
  assert.deepEqual(englishRoom(translated), translated);
  assert.equal(englishText("A new creator's own English text."), "A new creator's own English text.");
  assert.notEqual(legacyTextKey("a"), legacyTextKey("b"));
});

test("both translated Meta endings remain playable and saved inventories restore in English", () => {
  const room = validateRoom(englishRoom(recorded));
  for (const ending of room.ending!.variants) {
    let state = initialState(room);
    for (const id of solution(room)) {
      const object = room.objects.find((o) => o.id === id)!;
      if (object.chapterId !== state.chapterId) state = moveChapter(room, state, object.chapterId!).state;
      state = act(room, state, id, object.code ?? undefined, false, object.choices ? ending.choiceId : undefined, {
        itemId: object.useItem,
        ...(object.puzzle?.kind === "move" ? { moved: object.puzzle.pieces.map((p) => p.id) } : object.puzzle ? { order: object.puzzle.solution } : {}),
      }).state;
    }
    assert.equal(state.complete, true);
    const saved = { ...state, inventory: state.inventory.map((item) => ({ ...item, name: recorded.objects.find((o) => o.id === item.id)!.itemName! })) };
    assert.deepEqual(englishState(saved, room), state);
  }
});

test("English story links reuse legacy save keys without changing custom publication slugs", () => {
  assert.equal(canonicalStorySlug("le-dernier-service"), "the-last-service");
  assert.equal(savedStorySlug("the-last-service"), "le-dernier-service");
  assert.equal(canonicalStorySlug("custom-story-123"), "custom-story-123");
  assert.equal(savedStorySlug("custom-story-123"), "custom-story-123");
});
