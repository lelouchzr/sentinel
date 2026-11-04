import translations from "./legacy-english.json" with { type: "json" };
import type { GameState, Room } from "./game.ts";

/** Stable lookup key for historical prose; never used for authentication. */
export function legacyTextKey(text: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${text.length.toString(36)}-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

const dictionary: Readonly<Record<string, string>> = translations;
export function englishText(text: string): string {
  return dictionary[legacyTextKey(text)] ?? text;
}

const proseFields = new Set([
  "title", "description", "story", "name", "prompt", "itemName", "message",
  "lockedMessage", "hint", "speaker", "subtitle", "objective", "unlockMessage",
  "label", "reply", "text", "license", "instruction",
]);

/** Translate known saved text without rewriting immutable snapshots or game rules. */
export function englishRoom<T extends Room>(room: T): T {
  function visit(value: unknown, field = ""): unknown {
    if (typeof value === "string")
      return proseFields.has(field) ? englishText(value) : value;
    if (Array.isArray(value)) return value.map((item) => visit(item, field));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          // Preserve original model inputs, timestamps, hashes and authorship evidence.
          key === "imageProvenance" || key === "provenance" || key === "mask"
            ? item
            : visit(item, key),
        ]),
      );
    return value;
  }
  return visit(room) as T;
}

/** Keep earned items and IDs when restoring sessions created before the language switch. */
export function englishState(state: GameState, room: Room): GameState {
  return {
    ...state,
    inventory: state.inventory.map((item) => ({
      ...item,
      name: room.objects.find((object) => object.id === item.id)?.itemName ??
        englishText(item.name),
    })),
  };
}
