import { z } from "zod";

/** A rejected game rule is a validation response, never a server failure. */
export class GameRuleError extends Error {}

const id = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);
const line = (max: number) => z.string().trim().min(1).max(max);
export const imageSchema = z
  .string()
  .regex(
    /^\/(?:scenes\/(?:kitchen|kitchen-empty|japanese)\.png|stories\/[a-z0-9-]+\.png|api\/assets\/[a-f0-9-]{36})$/,
  );
const creditsSchema = z
  .array(
    z
      .object({
        title: line(150),
        author: line(100),
        license: line(100),
        url: z
          .string()
          .url()
          .max(500)
          .refine((s) => s.startsWith("https://")),
      })
      .strict(),
  )
  .min(1)
  .max(5);
const imageProvenanceSchema = z
  .object({
    model: z.literal("muse-image-1.0"),
    runId: z.string().uuid(),
    prompt: z.string().max(2000),
    generatedAt: z.string().datetime(),
  })
  .strict();
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
export const manipulationSchema = z
  .object({
    kind: z.enum(["move", "sequence"]),
    instruction: line(300),
    pieces: z
      .array(z.object({ id, label: line(80) }).strict())
      .min(3)
      .max(6),
    solution: z.array(id).min(3).max(6).optional(),
  })
  .strict();
export const attemptSchema = z
  .object({
    moved: z.array(id).max(6).optional(),
    order: z.array(id).max(6).optional(),
    itemId: id.optional(),
  })
  .strict();
export type ManipulationAttempt = z.infer<typeof attemptSchema>;
export const objectSchema = z
  .object({
    id,
    name: line(80),
    prompt: line(100),
    action: z.enum(["inspect", "collect", "code", "unlock", "choose", "exit"]),
    region: regionSchema,
    requires: z.array(id).max(24),
    code: z.string().trim().min(1).max(16).nullable(),
    itemName: z.string().trim().min(1).max(80).nullable(),
    message: line(1800),
    lockedMessage: line(300),
    hint: line(300),
    chapterId: id.optional(),
    speaker: line(60).optional(),
    animation: z
      .enum(["drawer", "fruits", "door", "lid", "page", "lever", "light"])
      .optional(),
    puzzle: manipulationSchema.optional(),
    useItem: id.optional(),
    choices: z
      .array(z.object({ id, label: line(120), reply: line(1800) }).strict())
      .min(2)
      .max(3)
      .optional(),
    mask: z
      .object({
        path: z
          .string()
          .max(300000)
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
export const chapterSchema = z
  .object({
    id,
    title: line(100),
    subtitle: line(160),
    objective: line(300),
    story: line(2400),
    image: imageSchema,
    credits: creditsSchema,
    imageProvenance: imageProvenanceSchema.optional(),
    requires: z.array(id).max(24),
    unlockMessage: line(300),
    ambience: z.enum(["leaves", "rain", "dust", "stars", "steam", "petals"]),
  })
  .strict();
export const roomSchema = z
  .object({
    title: line(80),
    description: line(400),
    story: line(2400),
    theme: z.enum(["mystere", "cosy", "aventure"]),
    difficulty: z.enum(["facile", "intermediaire", "difficile"]),
    duration: z.number().int().min(1).max(90),
    image: imageSchema,
    imageProvenance: imageProvenanceSchema.optional(),
    objects: z.array(objectSchema).min(2).max(32),
    credits: creditsSchema,
    chapters: z.array(chapterSchema).min(2).max(6).optional(),
    ending: z
      .object({
        sourceObjectId: id,
        variants: z
          .array(
            z
              .object({ choiceId: id, title: line(120), text: line(3000) })
              .strict(),
          )
          .min(2)
          .max(3),
      })
      .strict()
      .optional(),
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
export const sceneSchema = roomSchema
  .pick({ title: true, image: true, credits: true, imageProvenance: true })
  .extend({ title: line(80).default("Nouvelle aventure") });
export type Scene = z.infer<typeof sceneSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
/** An editable manual starting point; its two zones must be placed by the author. */
export function manualRoom(scene: Scene): Room {
  return validateRoom({
    ...sceneSchema.parse(scene),
    description: "Une aventure à imaginer dans cette illustration.",
    story: "Explorez cette pièce et découvrez comment en sortir.",
    theme: "aventure",
    difficulty: "facile",
    duration: 5,
    provenance: { method: "manual", model: null, generatedAt: null },
    objects: [
      {
        id: "premier-indice",
        name: "Premier indice",
        prompt: "Objet à choisir",
        action: "inspect",
        region: { x: 0.15, y: 0.3, w: 0.15, h: 0.15 },
        requires: [],
        code: null,
        itemName: null,
        message:
          "Vous découvrez un indice qui vous permet de trouver la sortie.",
        lockedMessage: "Observez cet objet.",
        hint: "Explorez la pièce.",
      },
      {
        id: "sortie",
        name: "Sortie",
        prompt: "Sortie à placer",
        action: "exit",
        region: { x: 0.7, y: 0.25, w: 0.15, h: 0.5 },
        requires: ["premier-indice"],
        code: null,
        itemName: null,
        message: "Vous avez trouvé la sortie !",
        lockedMessage: "Cherchez d’abord un indice.",
        hint: "Observez les autres objets de la pièce.",
      },
    ],
  });
}
export type GameObject = Room["objects"][number];
export type GameState = {
  resolved: string[];
  inventory: { id: string; name: string }[];
  complete: boolean;
  moves: number;
  hints: number;
  chapterId?: string;
  visited?: string[];
  choices?: Record<string, string>;
};
export function initialState(room?: Room): GameState {
  return {
    resolved: [],
    inventory: [],
    complete: false,
    moves: 0,
    hints: 0,
    ...(room?.chapters?.length
      ? {
          chapterId: room.chapters[0].id,
          visited: [room.chapters[0].id],
          choices: {},
        }
      : {}),
  };
}
export function currentChapter(room: Room, state: GameState) {
  return room.chapters?.find(
    (c) => c.id === (state.chapterId ?? room.chapters?.[0].id),
  );
}
export function chapterUnlocked(
  chapter: Chapter,
  state: Pick<GameState, "resolved">,
) {
  return chapter.requires.every((id) => state.resolved.includes(id));
}
export function endingFor(room: Room, state: GameState) {
  if (!state.complete || !room.ending) return undefined;
  const choice = state.choices?.[room.ending.sourceObjectId];
  const variant = room.ending.variants.find((v) => v.choiceId === choice);
  return variant ? { title: variant.title, text: variant.text } : undefined;
}
function discoveryFor(room: Room, state: GameState, object: GameObject) {
  if (object.action === "exit")
    return endingFor(room, state)?.text ?? object.message;
  if (object.action === "choose")
    return (
      object.choices?.find((c) => c.id === state.choices?.[object.id])?.reply ??
      object.message
    );
  return object.message;
}
/** The journal contains only discoveries earned by this session, including its chosen ending. */
export function discoveredMessages(room: Room, state: GameState): string[] {
  return state.resolved.flatMap((id) => {
    const o = room.objects.find((o) => o.id === id);
    return o ? [discoveryFor(room, state, o)] : [];
  });
}
export function illustrationPaths(
  room: Pick<Room, "image"> & Partial<Pick<Room, "chapters">>,
) {
  return [
    ...new Set([room.image, ...(room.chapters ?? []).map((c) => c.image)]),
  ];
}
/** Changing a chapter invalidates only contours tied to that illustration. */
export function replaceIllustration(
  room: Room,
  proposal: Pick<Room, "image" | "credits" | "imageProvenance">,
  chapterId?: string,
): Room {
  if (room.chapters && chapterId) {
    const first = room.chapters[0].id === chapterId;
    return validateRoom({
      ...room,
      ...(first
        ? {
            image: proposal.image,
            credits: proposal.credits,
            imageProvenance: proposal.imageProvenance,
          }
        : {}),
      chapters: room.chapters.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              image: proposal.image,
              credits: proposal.credits,
              imageProvenance: proposal.imageProvenance,
            }
          : c,
      ),
      objects: room.objects.map((o) =>
        o.chapterId === chapterId ? { ...o, mask: undefined } : o,
      ),
    });
  }
  return validateRoom({
    ...room,
    image: proposal.image,
    credits: proposal.credits,
    imageProvenance: proposal.imageProvenance,
    objects: room.objects.map((o) => ({ ...o, mask: undefined })),
  });
}
function readyObject(room: Room, object: GameObject, resolved: Set<string>) {
  const chapter = room.chapters?.find((c) => c.id === object.chapterId);
  return (
    object.requires.every((id) => resolved.has(id)) &&
    (!chapter || chapter.requires.every((id) => resolved.has(id)))
  );
}
/** Deterministic contracts apply equally to authored and model-proposed narratives. */
export function validateRoom(input: unknown): Room {
  const room = roomSchema.parse(input),
    ids = new Set(room.objects.map((o) => o.id));
  if (ids.size !== room.objects.length)
    throw new GameRuleError("Chaque objet doit avoir un identifiant unique.");
  const exits = room.objects.filter((o) => o.action === "exit");
  if (exits.length !== 1)
    throw new GameRuleError("Il faut exactement une sortie.");
  const chapterIds = new Set(room.chapters?.map((c) => c.id) ?? []);
  if (room.chapters) {
    if (chapterIds.size !== room.chapters.length)
      throw new GameRuleError(
        "Chaque chapitre doit avoir un identifiant unique.",
      );
    if (room.chapters[0].requires.length)
      throw new GameRuleError(
        "Le premier chapitre doit être accessible sans prérequis.",
      );
    if (room.image !== room.chapters[0].image)
      throw new GameRuleError(
        "La couverture doit correspondre au premier chapitre.",
      );
    for (const chapter of room.chapters) {
      if (chapter.requires.some((id) => !ids.has(id) || id === exits[0].id))
        throw new GameRuleError(
          `Prérequis de chapitre invalide : ${chapter.title}.`,
        );
      if (new Set(chapter.requires).size !== chapter.requires.length)
        throw new GameRuleError("Prérequis de chapitre dupliqué.");
      if (!room.objects.some((o) => o.chapterId === chapter.id))
        throw new GameRuleError(
          `Le chapitre ${chapter.title} ne contient aucun objet.`,
        );
    }
  }
  for (const object of room.objects) {
    if (
      object.requires.some(
        (r) => !ids.has(r) || r === object.id || r === exits[0].id,
      )
    )
      throw new GameRuleError(`Dépendance invalide pour ${object.name}.`);
    if (new Set(object.requires).size !== object.requires.length)
      throw new GameRuleError("Dépendance dupliquée.");
    if ((object.action === "code") !== (object.code !== null))
      throw new GameRuleError(`Code incohérent pour ${object.name}.`);
    if (
      object.useItem &&
      (!object.requires.includes(object.useItem) ||
        !room.objects.find((o) => o.id === object.useItem)?.itemName)
    )
      throw new GameRuleError(
        `L’objet à utiliser doit être un objet d’inventaire préalable : ${object.name}.`,
      );
    if (object.useItem && (object.puzzle || object.action === "code"))
      throw new GameRuleError(
        "Séparez l’utilisation d’un objet, le cadenas et la manipulation en étapes distinctes.",
      );
    if (object.puzzle) {
      const pieces = object.puzzle.pieces.map((p) => p.id);
      if (new Set(pieces).size !== pieces.length)
        throw new GameRuleError(
          "Les éléments à manipuler doivent être uniques.",
        );
      if (["choose", "exit", "code"].includes(object.action))
        throw new GameRuleError(
          "Une manipulation doit précéder le choix ou la sortie.",
        );
      const answer = object.puzzle.solution;
      if (
        object.puzzle.kind === "sequence"
          ? !answer ||
            answer.length !== pieces.length ||
            new Set(answer).size !== pieces.length ||
            answer.some((id) => !pieces.includes(id))
          : answer !== undefined
      )
        throw new GameRuleError(
          "La solution de manipulation doit correspondre exactement à ses éléments.",
        );
    }
    if (object.action === "exit" && object.itemName)
      throw new GameRuleError(
        "Une sortie ne peut pas être un objet d’inventaire.",
      );
    if (
      room.chapters
        ? !object.chapterId || !chapterIds.has(object.chapterId)
        : !!object.chapterId
    )
      throw new GameRuleError(`Chapitre invalide pour ${object.name}.`);
    if ((object.action === "choose") !== !!object.choices)
      throw new GameRuleError(`Choix incohérents pour ${object.name}.`);
    if (
      object.choices &&
      new Set(object.choices.map((c) => c.id)).size !== object.choices.length
    )
      throw new GameRuleError("Les réponses d’un choix doivent être uniques.");
  }
  const reachable = new Set<string>();
  for (let pass = 0; pass < room.objects.length; pass++)
    for (const object of room.objects)
      if (readyObject(room, object, reachable)) reachable.add(object.id);
  if (reachable.size !== ids.size)
    throw new GameRuleError(
      "Des dépendances circulaires ou des chapitres inaccessibles bloquent la partie.",
    );
  if (!exits[0].requires.length)
    throw new GameRuleError("La sortie doit dépendre d’au moins une énigme.");
  if (room.ending) {
    const source = room.objects.find(
      (o) => o.id === room.ending!.sourceObjectId,
    );
    if (source?.action !== "choose" || !source.choices)
      throw new GameRuleError(
        "La conclusion doit être liée à un choix existant.",
      );
    const variants = new Set(room.ending.variants.map((v) => v.choiceId));
    if (
      variants.size !== room.ending.variants.length ||
      source.choices.some((c) => !variants.has(c.id)) ||
      variants.size !== source.choices.length
    )
      throw new GameRuleError(
        "Chaque réponse doit posséder une conclusion unique.",
      );
    const ancestors = new Set<string>();
    const pending = [...exits[0].requires];
    while (pending.length) {
      const id = pending.pop()!;
      if (ancestors.has(id)) continue;
      ancestors.add(id);
      pending.push(...room.objects.find((o) => o.id === id)!.requires);
    }
    if (!ancestors.has(source.id))
      throw new GameRuleError(
        "La sortie doit attendre le choix qui détermine la conclusion.",
      );
  }
  return room;
}
export function moveChapter(
  room: Room,
  previous: GameState,
  chapterId: string,
) {
  const chapter = room.chapters?.find((c) => c.id === chapterId);
  if (!chapter) throw new GameRuleError("Ce lieu n’existe pas.");
  if (previous.complete)
    throw new GameRuleError("Cette histoire est terminée.");
  if (!chapterUnlocked(chapter, previous))
    throw new GameRuleError(chapter.unlockMessage);
  const state: GameState = structuredClone(previous);
  if (state.chapterId !== chapterId) state.moves++;
  state.chapterId = chapterId;
  state.visited = [...new Set([...(state.visited ?? []), chapterId])];
  return { state, message: chapter.story, outcome: "travel" as const };
}
export function act(
  room: Room,
  previous: GameState,
  objectId: string,
  code?: string,
  hint = false,
  choiceId?: string,
  attempt?: ManipulationAttempt,
) {
  const object = room.objects.find((o) => o.id === objectId);
  if (!object) throw new GameRuleError("Cet objet n’existe pas.");
  const state: GameState = structuredClone(previous);
  if (state.complete)
    return {
      state,
      message:
        "Cette aventure est terminée. Vous pouvez recommencer une partie.",
      outcome: "complete" as const,
    };
  const chapter = currentChapter(room, state);
  if (room.chapters && object.chapterId !== chapter?.id)
    throw new GameRuleError(
      "Cet objet se trouve dans un autre lieu. Déplacez-vous avant de l’explorer.",
    );
  if (chapter && !chapterUnlocked(chapter, state))
    throw new GameRuleError("Ce lieu n’est pas encore accessible.");
  if (hint) {
    state.hints++;
    return { state, message: object.hint, outcome: "hint" as const };
  }
  state.moves++;
  if (!object.requires.every((r) => state.resolved.includes(r)))
    return { state, message: object.lockedMessage, outcome: "locked" as const };
  if (
    !state.resolved.includes(object.id) &&
    object.useItem &&
    attempt?.itemId !== object.useItem
  )
    return {
      state,
      message: "Choisissez dans votre inventaire l’objet à utiliser ici.",
      outcome: "needs_item" as const,
    };
  if (!state.resolved.includes(object.id) && object.puzzle) {
    const puzzle = object.puzzle;
    const proposed = puzzle.kind === "move" ? attempt?.moved : attempt?.order;
    if (!proposed)
      return {
        state,
        message: puzzle.instruction,
        outcome: "needs_manipulation" as const,
      };
    const ids = puzzle.pieces.map((p) => p.id);
    const valid =
      proposed.length === ids.length &&
      new Set(proposed).size === ids.length &&
      proposed.every((id) => ids.includes(id));
    const solved =
      valid &&
      (puzzle.kind === "move" ||
        proposed.every((id, i) => id === puzzle.solution![i]));
    if (!solved)
      return {
        state,
        message:
          "Ce n’est pas encore la bonne disposition. Relisez les indices et essayez une autre combinaison.",
        outcome: "wrong_manipulation" as const,
      };
  }
  if (
    object.action === "code" &&
    !state.resolved.includes(object.id) &&
    (code ?? "").trim().toLocaleUpperCase() !== object.code!.toLocaleUpperCase()
  )
    return {
      state,
      message:
        code === undefined
          ? object.lockedMessage
          : "Ce code ne fonctionne pas. Relisez les découvertes de votre carnet.",
      outcome:
        code === undefined ? ("needs_code" as const) : ("wrong_code" as const),
    };
  if (object.action === "choose" && !state.resolved.includes(object.id)) {
    if (!choiceId)
      return {
        state,
        message: object.message,
        outcome: "needs_choice" as const,
      };
    if (!object.choices?.some((c) => c.id === choiceId))
      throw new GameRuleError("Choisissez une des réponses proposées.");
    state.choices = { ...state.choices, [object.id]: choiceId };
  }
  if (!state.resolved.includes(object.id)) {
    state.resolved.push(object.id);
    if (object.itemName)
      state.inventory.push({ id: object.id, name: object.itemName });
  }
  if (object.action === "exit") state.complete = true;
  return {
    state,
    message: discoveryFor(room, state, object),
    outcome: state.complete ? ("complete" as const) : ("resolved" as const),
  };
}
/** Only the current scene and earned chapter introductions enter player payloads. */
export function playerRoom(room: Room, state: GameState = initialState(room)) {
  const chapter = currentChapter(room, state);
  return {
    title: room.title,
    description: room.description,
    story: chapter?.story ?? room.story,
    introduction: room.story,
    image: chapter?.image ?? room.image,
    theme: room.theme,
    difficulty: room.difficulty,
    duration: room.duration,
    credits: chapter?.credits ?? room.credits,
    objects: room.objects
      .filter((o) => !room.chapters || o.chapterId === chapter?.id)
      .map(
        ({
          id,
          name,
          region,
          action,
          mask,
          speaker,
          choices,
          animation,
          puzzle,
          useItem,
          code,
        }) => ({
          id,
          name,
          region,
          action,
          mask,
          speaker,
          animation,
          numericCodeLength:
            code && /^\d{3,6}$/.test(code) ? code.length : undefined,
          ...(puzzle
            ? {
                puzzle: {
                  kind: puzzle.kind,
                  instruction: puzzle.instruction,
                  pieces: puzzle.pieces,
                },
              }
            : {}),
          ...(useItem ? { needsItem: true } : {}),
          ...(choices
            ? { choices: choices.map(({ id, label }) => ({ id, label })) }
            : {}),
        }),
      ),
    totalObjects: room.objects.length,
    interactive: room.objects.some((o) => o.animation || o.puzzle || o.useItem),
    chapterId: chapter?.id,
    ambience: chapter?.ambience,
    objective: chapter?.objective,
    chapters: room.chapters?.map((c) => {
      const unlocked = chapterUnlocked(c, state);
      return {
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        unlocked,
        visited: state.visited?.includes(c.id) ?? false,
        unlockMessage: c.unlockMessage,
        ...(unlocked
          ? { objective: c.objective, story: c.story, image: c.image }
          : {}),
      };
    }),
    ending: endingFor(room, state),
  };
}
export function solution(room: Room) {
  const pending = [...room.objects],
    resolved = new Set<string>(),
    steps: string[] = [];
  while (pending.length) {
    let index = pending.findIndex(
      (o) => o.action !== "exit" && readyObject(room, o, resolved),
    );
    if (index < 0)
      index = pending.findIndex((o) => readyObject(room, o, resolved));
    if (index < 0) break;
    const [o] = pending.splice(index, 1);
    resolved.add(o.id);
    steps.push(o.id);
    if (o.action === "exit") break;
  }
  return steps;
}
