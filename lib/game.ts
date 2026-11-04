import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);
const line = (max: number) => z.string().trim().min(1).max(max);
export const regionSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0.008).max(1),
    h: z.number().min(0.008).max(1),
  })
  .strict()
  .refine(
    (r) => r.x + r.w <= 1.001 && r.y + r.h <= 1.001,
    "La zone dépasse l’image.",
  );
export const objectSchema = z
  .object({
    id,
    name: line(80),
    prompt: line(100),
    action: z.enum(["inspect", "collect", "code", "unlock", "exit"]),
    region: regionSchema,
    requires: z.array(id).max(10),
    code: z.string().trim().min(1).max(16).nullable(),
    itemName: z.string().trim().min(1).max(80).nullable(),
    message: line(800),
    lockedMessage: line(300),
    hint: line(300),
    mask: z
      .object({
        path: z
          .string()
          .max(300_000)
          .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+\-]*$/),
        width: z.number().int().positive().max(6000),
        height: z.number().int().positive().max(6000),
        source: z
          .object({
            model: z.literal("sam-3.1"),
            runId: z.string().uuid(),
            generatedAt: z.string().datetime(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const roomSchema = z
  .object({
    title: line(80),
    description: line(400),
    story: line(1200),
    theme: z.enum(["mystere", "cosy", "aventure"]),
    difficulty: z.enum(["facile", "intermediaire", "difficile"]),
    duration: z.number().int().min(1).max(60),
    image: z
      .string()
      .regex(
        /^\/(?:scenes\/(?:kitchen|kitchen-empty|japanese)\.png|api\/assets\/[a-f0-9-]{36})$/,
      ),
    imageProvenance: z
      .object({
        model: z.literal("muse-image-1.0"),
        runId: z.string().uuid(),
        prompt: z.string().max(2000),
        generatedAt: z.string().datetime(),
      })
      .strict()
      .optional(),
    objects: z.array(objectSchema).min(2).max(12),
    credits: z
      .array(
        z.object({
          title: line(150),
          author: line(100),
          license: line(100),
          url: z
            .string()
            .url()
            .max(500)
            .refine((s) => s.startsWith("https://")),
        }),
      )
      .min(1)
      .max(5),
    provenance: z
      .object({
        method: z.enum(["manual", "meta"]),
        model: z.string().max(80).nullable(),
        generatedAt: z.string().max(40).nullable(),
        runId: z.string().uuid().optional(),
        promptVersion: z.string().max(60).optional(),
      })
      .strict(),
  })
  .strict();
export type Room = z.infer<typeof roomSchema>;
export type GameObject = Room["objects"][number];
export type GameState = {
  resolved: string[];
  inventory: { id: string; name: string }[];
  complete: boolean;
  moves: number;
  hints: number;
};
/** Select the asset fields explicitly; API metadata must not enter a room. */
export function replaceIllustration(
  room: Room,
  proposal: Pick<Room, "image" | "credits" | "imageProvenance">,
): Room {
  return validateRoom({
    ...room,
    image: proposal.image,
    credits: proposal.credits,
    imageProvenance: proposal.imageProvenance,
    objects: room.objects.map((object) => ({ ...object, mask: undefined })),
  });
}
export const initialState = (): GameState => ({
  resolved: [],
  inventory: [],
  complete: false,
  moves: 0,
  hints: 0,
});

/** Rules are data, never model-authored executable code. */
export function validateRoom(input: unknown): Room {
  const room = roomSchema.parse(input);
  const ids = new Set(room.objects.map((o) => o.id));
  if (ids.size !== room.objects.length)
    throw new Error("Chaque objet doit avoir un identifiant unique.");
  if (room.objects.filter((o) => o.action === "exit").length !== 1)
    throw new Error("Il faut exactement une sortie.");
  for (const object of room.objects) {
    if (object.requires.some((r) => !ids.has(r) || r === object.id))
      throw new Error(`Dépendance invalide pour ${object.name}.`);
    if (new Set(object.requires).size !== object.requires.length)
      throw new Error("Dépendance dupliquée.");
    if ((object.action === "code") !== (object.code !== null))
      throw new Error(`Code incohérent pour ${object.name}.`);
    if (object.action === "exit" && object.itemName)
      throw new Error("Une sortie ne peut pas être un objet d’inventaire.");
  }
  // Monotone rules never consume items. A fixed-point search proves reachability
  // for this bounded ruleset, without claiming human-readable clues are correct.
  const reachable = new Set<string>();
  for (let pass = 0; pass < room.objects.length; pass++) {
    for (const object of room.objects)
      if (object.requires.every((r) => reachable.has(r)))
        reachable.add(object.id);
  }
  if (reachable.size !== ids.size)
    throw new Error("Des dépendances circulaires bloquent la partie.");
  const exit = room.objects.find((o) => o.action === "exit")!;
  if (exit.requires.length === 0)
    throw new Error("La sortie doit dépendre d’au moins une énigme.");
  return room;
}

export function act(
  room: Room,
  previous: GameState,
  objectId: string,
  code?: string,
  hint = false,
) {
  const object = room.objects.find((o) => o.id === objectId);
  if (!object) throw new Error("Cet objet n’existe pas.");
  const state: GameState = structuredClone(previous);
  if (hint) {
    state.hints++;
    return { state, message: object.hint, outcome: "hint" as const };
  }
  if (state.complete)
    return {
      state,
      message:
        "Cette aventure est terminée. Vous pouvez recommencer une partie.",
      outcome: "complete" as const,
    };
  state.moves++;
  if (!object.requires.every((r) => state.resolved.includes(r)))
    return { state, message: object.lockedMessage, outcome: "locked" as const };
  if (
    object.action === "code" &&
    !state.resolved.includes(object.id) &&
    (code ?? "").trim().toLocaleUpperCase() !== object.code!.toLocaleUpperCase()
  ) {
    return {
      state,
      message:
        code === undefined
          ? object.lockedMessage
          : "Ce code ne fonctionne pas. Regardez les indices de la pièce.",
      outcome:
        code === undefined ? ("needs_code" as const) : ("wrong_code" as const),
    };
  }
  if (!state.resolved.includes(object.id)) {
    state.resolved.push(object.id);
    if (object.itemName)
      state.inventory.push({ id: object.id, name: object.itemName });
  }
  if (object.action === "exit") state.complete = true;
  return {
    state,
    message: object.message,
    outcome: state.complete ? ("complete" as const) : ("resolved" as const),
  };
}

/** Player payloads omit puzzle solutions and the hidden prerequisite graph. */
export function playerRoom(room: Room) {
  return {
    title: room.title,
    description: room.description,
    story: room.story,
    image: room.image,
    theme: room.theme,
    difficulty: room.difficulty,
    duration: room.duration,
    credits: room.credits,
    objects: room.objects.map(({ id, name, region, action, mask }) => ({
      id,
      name,
      region,
      action,
      mask,
    })),
  };
}

export function solution(room: Room) {
  const pending = [...room.objects];
  const resolved = new Set<string>();
  const steps: string[] = [];
  while (pending.length) {
    const index = pending.findIndex((o) =>
      o.requires.every((r) => resolved.has(r)),
    );
    if (index < 0) break;
    const [o] = pending.splice(index, 1);
    resolved.add(o.id);
    steps.push(o.id);
    if (o.action === "exit") break;
  }
  return steps;
}
