import { englishRoom, englishState, englishText } from "./language";
import { env } from "cloudflare:workers";
import { ZodError } from "zod";
import {
  act,
  initialState,
  playerRoom,
  validateRoom,
  attemptSchema,
  GameRuleError,
  solution,
  sceneSchema,
  discoveredMessages,
  moveChapter,
  illustrationPaths,
  type Room,
  type GameState,
} from "./game";
import { kitchen, japanese } from "./rooms";
import {
  catalogueStory,
  storyCatalog,
  storyCard,
  legacyEditions,
} from "./stories";
import { ApiError, json, body, user, assertSameOrigin, hash } from "./http";
import {
  generateRoom,
  segmentObject,
  generateIllustration,
  metaAvailable,
} from "./meta";

function db() {
  if (!env.DB) throw new ApiError(503, "Storage is not available.");
  return env.DB;
}
const now = () => new Date().toISOString();
async function persistImage(bytes: Uint8Array, ownerId: string) {
  if (
    bytes.length > 5_000_000 ||
    bytes.length < 24 ||
    !bytes
      .subarray(0, 8)
      .every((b, i) => b === [137, 80, 78, 71, 13, 10, 26, 10][i])
  )
    throw new ApiError(422, "Invalid PNG or larger than 5 MB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16),
    height = view.getUint32(20);
  if (
    width < 100 ||
    height < 100 ||
    width > 6000 ||
    height > 6000 ||
    width * height > 20_000_000
  )
    throw new ApiError(422, "Unsupported image dimensions.");
  if (!env.BUCKET)
    throw new ApiError(
      503,
      "Illustration storage is not configured.",
    );
  const id = crypto.randomUUID();
  await env.BUCKET.put(id, bytes, {
    httpMetadata: { contentType: "image/png" },
  });
  await db()
    .prepare(
      "INSERT INTO assets (id,owner_id,width,height,created_at) VALUES (?,?,?,?,?)",
    )
    .bind(id, ownerId, width, height, now())
    .run();
  return { image: `/api/assets/${id}`, width, height };
}
async function ownedDraft(id: string, ownerId: string) {
  const row = await db()
    .prepare("SELECT * FROM drafts WHERE id=? AND owner_id=?")
    .bind(id, ownerId)
    .first<any>();
  if (!row) throw new ApiError(404, "This draft cannot be found.");
  return row;
}
async function checkImage(
  room: Pick<Room, "image"> & Partial<Pick<Room, "chapters">>,
  ownerId: string,
) {
  for (const image of illustrationPaths(room)) {
    if (!image.startsWith("/api/assets/")) continue;
    const asset = await db()
      .prepare("SELECT id FROM assets WHERE id=? AND owner_id=?")
      .bind(image.split("/").at(-1), ownerId)
      .first();
    if (!asset)
      throw new ApiError(
        403,
        "An illustration in this story does not belong to your studio.",
      );
  }
}
async function publicRoom(slug: string) {
  const story = catalogueStory(slug);
  if (story)
    return { definition: story.definition, id: `story:${slug}:narrative-v1` };
  if (slug === "the-last-service-classic" || slug === "le-dernier-service-classique")
    return { definition: kitchen, id: "builtin-kitchen-classic" };
  const row = await db()
    .prepare(
      "SELECT id, definition FROM publications WHERE slug=? AND active=1",
    )
    .bind(slug)
    .first<any>();
  if (!row)
    throw new ApiError(
      404,
      "This game is no longer published or its link is incorrect.",
    );
  return { definition: englishRoom(JSON.parse(row.definition)) as Room, id: row.id };
}
function card(row: any) {
  const room = englishRoom(JSON.parse(row.definition)) as Room;
  return {
    id: row.id,
    slug: row.slug,
    title: room.title,
    description: room.description,
    image: room.image,
    theme: room.theme,
    difficulty: room.difficulty,
    duration: room.duration,
    author: englishText(row.author),
    createdAt: row.created_at,
    builtin: false,
    chapterCount: room.chapters?.length ?? 1,
    interactionCount: room.objects.length,
  };
}
async function imageInput(
  request: Request,
  room: Pick<Room, "image">,
  ownerId: string,
) {
  await checkImage(room, ownerId);
  let data: ArrayBuffer;
  if (room.image.startsWith("/api/assets/")) {
    const object = await env.BUCKET?.get(room.image.slice(12));
    if (!object) throw new ApiError(404, "Illustration not found.");
    data = await object.arrayBuffer();
  } else {
    const url = new URL(room.image, request.url);
    const response = env.ASSETS
      ? await env.ASSETS.fetch(new Request(url))
      : await fetch(url, {
          headers: { cookie: request.headers.get("cookie") ?? "" },
        });
    if (!response.ok)
      throw new ApiError(502, "The illustration could not be loaded.");
    data = await response.arrayBuffer();
  }
  const bytes = new Uint8Array(data);
  if (bytes.length > 5_000_000 || bytes.length < 24)
    throw new ApiError(422, "The image is too large or invalid.");
  const view = new DataView(data);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { image: `data:image/png;base64,${btoa(binary)}`, width, height };
}

export async function handle(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.slice(5).split("/").filter(Boolean);
    const method = request.method;
    if (method !== "GET") assertSameOrigin(request);
    if (method === "GET" && path[0] === "health")
      return json({
        ready: true,
        metaConfigured: metaAvailable(),
        models: ["muse-spark-1.3", "sam-3.1", "muse-image-1.0"],
      });
    if (method === "GET" && path[0] === "me") {
      const u = user(request, false);
      return json({ user: u ? { displayName: u.displayName } : null });
    }
    if (method === "GET" && path[0] === "gallery") {
      const rows = await db()
        .prepare(
          "SELECT * FROM publications WHERE visibility='public' AND active=1 ORDER BY created_at DESC LIMIT 100",
        )
        .all();
      const q = (url.searchParams.get("q") ?? "").toLocaleLowerCase();
      const theme = url.searchParams.get("theme");
      return json({
        rooms: [
          ...storyCatalog.map(storyCard),
          ...rows.results.filter((r: any) => !legacyEditions[r.slug]).map(card),
        ].filter(
          (c) =>
            (!q ||
              `${c.title} ${c.description} ${c.author}`
                .toLocaleLowerCase()
                .includes(q)) &&
            (!theme || c.theme === theme),
        ),
      });
    }
    if (method === "GET" && path[0] === "rooms" && path[1]) {
      const room = await publicRoom(path[1]);
      return json({
        room: playerRoom(room.definition),
        ...(legacyEditions[path[1]]
          ? {
              longEdition: {
                slug: legacyEditions[path[1]],
                title: room.definition.title,
              },
            }
          : {}),
      });
    }
    if (method === "GET" && path[0] === "templates") {
      user(request);
      return json({
        room:
          catalogueStory(path[1])?.definition ??
          (path[1] === "japanese" ? japanese : kitchen),
      });
    }
    if (path[0] === "drafts") {
      const u = user(request)!;
      if (method === "GET" && !path[1]) {
        const rows = await db()
          .prepare(
            "SELECT * FROM drafts WHERE owner_id=? ORDER BY updated_at DESC",
          )
          .bind(u.id)
          .all<any>();
        const pubs = await db()
          .prepare(
            "SELECT id,slug,draft_id,visibility,active,created_at FROM publications WHERE owner_id=? ORDER BY created_at DESC",
          )
          .bind(u.id)
          .all();
        return json({
          drafts: rows.results.map((r: any) => ({
            id: r.id,
            revision: r.revision,
            updatedAt: r.updated_at,
            room: englishRoom(JSON.parse(r.definition)),
          })),
          publications: pubs.results.map((p: any) => ({
            ...p,
            longEdition: legacyEditions[p.slug],
          })),
        });
      }
      if (method === "POST" && !path[1]) {
        const data = await body(request);
        const room = validateRoom(data.room);
        await checkImage(room, u.id);
        const id = crypto.randomUUID();
        const date = now();
        await db()
          .prepare(
            "INSERT INTO drafts (id,owner_id,definition,revision,created_at,updated_at) VALUES (?,?,?,1,?,?)",
          )
          .bind(id, u.id, JSON.stringify(room), date, date)
          .run();
        return json({ id, revision: 1, room }, 201);
      }
      if (path[1]) {
        const row = await ownedDraft(path[1], u.id);
        if (method === "GET") {
          const tested = await db()
            .prepare(
              "SELECT id FROM play_sessions WHERE room_id=? AND completed_at IS NOT NULL LIMIT 1",
            )
            .bind(`draft:${row.id}:${row.revision}`)
            .first();
          return json({
            id: row.id,
            revision: row.revision,
            room: englishRoom(JSON.parse(row.definition)),
            tested: !!tested,
          });
        }
        if (method === "PUT") {
          const data = await body(request);
          if (data.revision !== row.revision)
            throw new ApiError(
              409,
              "This draft changed in another tab. Reload it before editing.",
            );
          const room = validateRoom(data.room);
          await checkImage(room, u.id);
          const result = await db()
            .prepare(
              "UPDATE drafts SET definition=?, revision=revision+1, updated_at=? WHERE id=? AND owner_id=? AND revision=?",
            )
            .bind(JSON.stringify(room), now(), row.id, u.id, row.revision)
            .run();
          if (!result.meta.changes)
            throw new ApiError(
              409,
              "This draft has just changed. Reload the page.",
            );
          return json({ id: row.id, revision: row.revision + 1, room });
        }
        if (method === "POST" && path[2] === "publish") {
          const data = await body(request);
          if (data.rightsConfirmed !== true)
            throw new ApiError(
              422,
              "Confirm the illustration publishing rights.",
            );
          const visibility = data.visibility;
          if (visibility !== "public" && visibility !== "unlisted")
            throw new ApiError(400, "Invalid visibility.");
          const room = validateRoom(englishRoom(JSON.parse(row.definition)));
          const tested = await db()
            .prepare(
              "SELECT id FROM play_sessions WHERE room_id=? AND completed_at IS NOT NULL LIMIT 1",
            )
            .bind(`draft:${row.id}:${row.revision}`)
            .first();
          if (!tested)
            throw new ApiError(
              422,
              "Finish a test playthrough of this version before publishing it.",
            );
          const id = crypto.randomUUID();
          const slug =
            room.title
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 45) +
            "-" +
            id.slice(0, 8);
          // The immutable snapshot isolates published games from subsequent draft edits.
          await db()
            .prepare(
              "INSERT INTO publications (id,slug,draft_id,owner_id,author,definition,image,visibility,active,created_at) VALUES (?,?,?,?,?,?,?,?,1,?)",
            )
            .bind(
              id,
              slug,
              row.id,
              u.id,
              u.displayName,
              JSON.stringify(room),
              room.image,
              visibility,
              now(),
            )
            .run();
          return json({ id, slug, visibility, url: `/play/${slug}` }, 201);
        }
      }
    }
    if (method === "DELETE" && path[0] === "publications" && path[1]) {
      const u = user(request)!;
      const result = await db()
        .prepare("UPDATE publications SET active=0 WHERE id=? AND owner_id=?")
        .bind(path[1], u.id)
        .run();
      if (!result.meta.changes)
        throw new ApiError(404, "Publication not found.");
      return json({ ok: true });
    }
    if (path[0] === "play") {
      if (method === "POST" && !path[1]) {
        const data = await body(request);
        let definition: Room;
        let roomId: string;
        if (typeof data.draftId === "string") {
          const u = user(request)!;
          const row = await ownedDraft(data.draftId, u.id);
          definition = englishRoom(JSON.parse(row.definition));
          roomId = `draft:${row.id}:${row.revision}`;
        } else {
          if (typeof data.slug !== "string")
            throw new ApiError(400, "Choose a game.");
          const room = await publicRoom(data.slug);
          definition = room.definition;
          roomId = room.id;
        }
        const id = crypto.randomUUID();
        const token = crypto.randomUUID() + crypto.randomUUID();
        const state = initialState(definition);
        await db()
          .prepare(
            "INSERT INTO play_sessions (id,token_hash,room_id,definition,state,revision,started_at) VALUES (?,?,?,?,?,0,?)",
          )
          .bind(
            id,
            await hash(token),
            roomId,
            JSON.stringify(definition),
            JSON.stringify(state),
            now(),
          )
          .run();
        return json(
          {
            id,
            token,
            state,
            journal: [],
            revision: 0,
            room: playerRoom(definition, state),
          },
          201,
        );
      }
      if (path[1]) {
        const row = await db()
          .prepare("SELECT * FROM play_sessions WHERE id=?")
          .bind(path[1])
          .first<any>();
        if (
          !row ||
          (await hash(request.headers.get("X-Play-Token") ?? "")) !==
            row.token_hash
        )
          throw new ApiError(
            404,
            "Playthrough not found. Start a new game.",
          );
        const definition = englishRoom(JSON.parse(row.definition)) as Room;
        if (method === "GET")
          return json({
            id: row.id,
            state: englishState(JSON.parse(row.state), definition),
            journal: discoveredMessages(definition, englishState(JSON.parse(row.state), definition)),
            revision: row.revision,
            room: playerRoom(definition, englishState(JSON.parse(row.state), definition)),
          });
        if (method === "POST") {
          const data = await body(request);
          if (data.revision !== row.revision)
            throw new ApiError(
              409,
              "The game has changed. Reload it to continue.",
            );
          if (
            (data.chapterId !== undefined &&
              typeof data.chapterId !== "string") ||
            (data.code !== undefined && typeof data.code !== "string") ||
            (data.choiceId !== undefined && typeof data.choiceId !== "string")
          )
            throw new ApiError(400, "Invalid action.");
          if (
            data.chapterId !== undefined &&
            (data.objectId !== undefined ||
              data.hint !== undefined ||
              data.choiceId !== undefined ||
              data.code !== undefined ||
              data.attempt !== undefined)
          )
            throw new ApiError(
              400,
              "Choose a move or an interaction.",
            );
          if (data.chapterId === undefined && typeof data.objectId !== "string")
            throw new ApiError(400, "Choose an object or a place.");
          const previous = englishState(JSON.parse(row.state), definition) as GameState;
          const result =
            typeof data.chapterId === "string"
              ? moveChapter(definition, previous, data.chapterId)
              : act(
                  definition,
                  previous,
                  data.objectId as string,
                  data.code as string | undefined,
                  data.hint === true,
                  data.choiceId as string | undefined,
                  data.attempt === undefined
                    ? undefined
                    : attemptSchema.parse(data.attempt),
                );
          const updated = await db()
            .prepare(
              "UPDATE play_sessions SET state=?,revision=revision+1,completed_at=COALESCE(completed_at,?) WHERE id=? AND revision=?",
            )
            .bind(
              JSON.stringify(result.state),
              result.state.complete ? now() : null,
              row.id,
              row.revision,
            )
            .run();
          if (!updated.meta.changes)
            throw new ApiError(
              409,
              "Another action was received. Reload the game.",
            );
          return json({
            ...result,
            room: playerRoom(definition, result.state),
            journal: discoveredMessages(definition, result.state),
            revision: row.revision + 1,
          });
        }
      }
    }
    if (path[0] === "assets") {
      if (method === "POST") {
        const u = user(request)!;
        const data = await body(request, 7_000_000);
        if (
          typeof data.dataUrl !== "string" ||
          !data.dataUrl.startsWith("data:image/png;base64,")
        )
          throw new ApiError(400, "Import a PNG image.");
        let bytes: Uint8Array;
        try {
          bytes = Uint8Array.from(atob(data.dataUrl.split(",")[1]), (c) =>
            c.charCodeAt(0),
          );
        } catch {
          throw new ApiError(400, "The image is invalid.");
        }
        return json(await persistImage(bytes, u.id), 201);
      }
      if (method === "GET" && path[1]) {
        const asset = await db()
          .prepare("SELECT owner_id FROM assets WHERE id=?")
          .bind(path[1])
          .first<any>();
        if (!asset) throw new ApiError(404, "Image not found.");
        if (user(request, false)?.id !== asset.owner_id) {
          const pub = await db()
            .prepare(
              "SELECT id FROM publications WHERE active=1 AND (image=? OR EXISTS (SELECT 1 FROM json_each(publications.definition, '$.chapters') chapter WHERE json_extract(chapter.value, '$.image')=?)) LIMIT 1",
            )
            .bind(`/api/assets/${path[1]}`, `/api/assets/${path[1]}`)
            .first();
          if (!pub) throw new ApiError(404, "Image not found.");
        }
        const object = await env.BUCKET?.get(path[1]);
        if (!object) throw new ApiError(404, "Image not found.");
        return new Response(object.body, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }
    if (method === "POST" && path[0] === "meta") {
      const u = user(request)!;
      if (!metaAvailable())
        throw new ApiError(
          503,
          "The Meta key is not configured on this server.",
        );
      const recent = await db()
        .prepare(
          "SELECT COUNT(*) AS count FROM model_runs WHERE owner_id=? AND created_at>?",
        )
        .bind(u.id, new Date(Date.now() - 3_600_000).toISOString())
        .first<any>();
      if (recent.count >= 30)
        throw new ApiError(
          429,
          "You have reached the 30 Meta calls per hour for this studio.",
        );
      const data = await body(request);
      const room = path[1] === "segment" ? validateRoom(data.room) : null;
      const scene =
        path[1] === "generate"
          ? data.scene !== undefined
            ? sceneSchema.parse(data.scene)
            : validateRoom(data.room)
          : room;
      // SAM must see the illustration that belongs to the selected object.
      const targetObject = room?.objects.find((o) => o.id === data.objectId);
      const targetChapter = room?.chapters?.find(
        (c) => c.id === targetObject?.chapterId,
      );
      const source = scene
        ? await imageInput(request, targetChapter ?? scene, u.id)
        : null;
      const runId = crypto.randomUUID();
      const model =
        path[1] === "segment"
          ? "sam-3.1"
          : path[1] === "image"
            ? "muse-image-1.0"
            : "muse-spark-1.3";
      const start = Date.now();
      await db()
        .prepare(
          "INSERT INTO model_runs (id,owner_id,model,status,duration_ms,created_at) VALUES (?,?,?,'pending',0,?)",
        )
        .bind(runId, u.id, model, now())
        .run();
      try {
        let result: unknown;
        if (path[1] === "generate") {
          if (
            typeof data.brief !== "string" ||
            data.brief.trim().length < 10 ||
            data.brief.length > 2000
          )
            throw new ApiError(
              400,
              "Describe your adventure in 10 to 2,000 characters.",
            );
          if (
            data.format !== undefined &&
            (typeof data.format !== "string" ||
              !["long", "short"].includes(data.format))
          )
            throw new ApiError(400, "Invalid story format.");
          const generated = await generateRoom(
            scene!,
            source!.image,
            data.brief,
            data.format === "short" ? "short" : "long",
          );
          result = {
            room: {
              ...generated,
              provenance: { ...generated.provenance, runId },
            },
          };
        } else if (path[1] === "segment") {
          const object = room!.objects.find((o) => o.id === data.objectId);
          if (!object)
            throw new ApiError(400, "Choose an object to cut out.");
          const segmented = await segmentObject(
            source!.image,
            source!.width,
            source!.height,
            object,
          );
          result = {
            ...segmented,
            mask: {
              ...segmented.mask,
              source: { model: "sam-3.1", runId, generatedAt: now() },
            },
          };
        } else if (path[1] === "image") {
          if (
            typeof data.brief !== "string" ||
            data.brief.trim().length < 10 ||
            data.brief.length > 2000
          )
            throw new ApiError(
              400,
              "Describe the scenery in 10 to 2,000 characters.",
            );
          const bytes = await generateIllustration(data.brief);
          const asset = await persistImage(bytes, u.id);
          result = {
            ...asset,
            imageProvenance: {
              model: "muse-image-1.0",
              runId,
              prompt: data.brief,
              generatedAt: now(),
            },
            credits: [
              {
                title: "Illustration created with Muse Image",
                author: "Muse Image · Meta",
                license: "Image generated for this game",
                url: "https://dev.meta.ai/models/muse-image",
              },
            ],
          };
        } else throw new ApiError(404, "Unknown Meta tool.");
        await db()
          .prepare(
            "UPDATE model_runs SET status='succeeded',duration_ms=? WHERE id=?",
          )
          .bind(Date.now() - start, runId)
          .run();
        return json({ ...(result as object), runId, model });
      } catch (error) {
        await db()
          .prepare(
            "UPDATE model_runs SET status='failed',duration_ms=? WHERE id=?",
          )
          .bind(Date.now() - start, runId)
          .run();
        throw error;
      }
    }
    if (method === "POST" && path[0] === "validate") {
      user(request);
      const data = await body(request);
      const room = validateRoom(data.room);
      return json({
        valid: true,
        steps: solution(room),
        note: "The solution is reachable within the rules. Visual consistency and clues should be tested by playing.",
      });
    }
    throw new ApiError(404, "This resource cannot be found.");
  } catch (error) {
    if (error instanceof ApiError)
      return json({ error: error.message }, error.status);
    if (error instanceof GameRuleError)
      return json({ error: error.message }, 422);
    if (error instanceof ZodError)
      return json(
        {
          error: "The scenario contains invalid data.",
          details: error.issues
            .slice(0, 5)
            .map((i) => `${i.path.join(".")} : ${i.message}`),
        },
        422,
      );
    console.error(
      "Storyscape request failed",
      error instanceof Error ? error.name : "unknown",
    );
    return json(
      {
        error:
          "An error occurred. Your already saved data is preserved.",
      },
      500,
    );
  }
}
