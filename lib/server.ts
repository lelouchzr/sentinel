import { env } from "cloudflare:workers";
import { ZodError } from "zod";
import {
  act,
  initialState,
  playerRoom,
  validateRoom,
  solution,
  sceneSchema,
  type Room,
  type GameState,
} from "./game";
import { kitchen, japanese, seedCard } from "./rooms";
import { ApiError, json, body, user, assertSameOrigin, hash } from "./http";
import {
  generateRoom,
  segmentObject,
  generateIllustration,
  metaAvailable,
} from "./meta";

function db() {
  if (!env.DB) throw new ApiError(503, "Le stockage n’est pas disponible.");
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
    throw new ApiError(422, "PNG invalide ou supérieur à 5 Mo.");
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
    throw new ApiError(422, "Dimensions de l’image non prises en charge.");
  if (!env.BUCKET)
    throw new ApiError(
      503,
      "Le stockage des illustrations n’est pas configuré.",
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
  if (!row) throw new ApiError(404, "Ce brouillon est introuvable.");
  return row;
}
async function checkImage(room: Pick<Room, "image">, ownerId: string) {
  if (!room.image.startsWith("/api/assets/")) return;
  const asset = await db()
    .prepare("SELECT id FROM assets WHERE id=? AND owner_id=?")
    .bind(room.image.split("/").at(-1), ownerId)
    .first();
  if (!asset)
    throw new ApiError(
      403,
      "Cette illustration n’appartient pas à votre atelier.",
    );
}
async function publicRoom(slug: string) {
  if (slug === seedCard.slug)
    return { definition: kitchen, id: "builtin-kitchen" };
  const row = await db()
    .prepare(
      "SELECT id, definition FROM publications WHERE slug=? AND active=1",
    )
    .bind(slug)
    .first<any>();
  if (!row)
    throw new ApiError(
      404,
      "Ce jeu n’est plus publié ou son lien est incorrect.",
    );
  return { definition: JSON.parse(row.definition) as Room, id: row.id };
}
function card(row: any) {
  const room = JSON.parse(row.definition) as Room;
  return {
    id: row.id,
    slug: row.slug,
    title: room.title,
    description: room.description,
    image: room.image,
    theme: room.theme,
    difficulty: room.difficulty,
    duration: room.duration,
    author: row.author,
    createdAt: row.created_at,
    builtin: false,
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
    if (!object) throw new ApiError(404, "Illustration introuvable.");
    data = await object.arrayBuffer();
  } else {
    const url = new URL(room.image, request.url);
    const response = env.ASSETS
      ? await env.ASSETS.fetch(new Request(url))
      : await fetch(url, {
          headers: { cookie: request.headers.get("cookie") ?? "" },
        });
    if (!response.ok)
      throw new ApiError(502, "L’illustration n’a pas pu être chargée.");
    data = await response.arrayBuffer();
  }
  const bytes = new Uint8Array(data);
  if (bytes.length > 5_000_000 || bytes.length < 24)
    throw new ApiError(422, "L’image est trop volumineuse ou invalide.");
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
        rooms: [seedCard, ...rows.results.map(card)].filter(
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
      return json({ room: playerRoom(room.definition) });
    }
    if (method === "GET" && path[0] === "templates") {
      user(request);
      return json({ room: path[1] === "japanese" ? japanese : kitchen });
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
            room: JSON.parse(r.definition),
          })),
          publications: pubs.results,
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
            room: JSON.parse(row.definition),
            tested: !!tested,
          });
        }
        if (method === "PUT") {
          const data = await body(request);
          if (data.revision !== row.revision)
            throw new ApiError(
              409,
              "Ce brouillon a changé dans un autre onglet. Rechargez-le avant de modifier.",
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
              "Ce brouillon vient de changer. Rechargez la page.",
            );
          return json({ id: row.id, revision: row.revision + 1, room });
        }
        if (method === "POST" && path[2] === "publish") {
          const data = await body(request);
          if (data.rightsConfirmed !== true)
            throw new ApiError(
              422,
              "Confirmez les droits de publication de l’illustration.",
            );
          const visibility = data.visibility;
          if (visibility !== "public" && visibility !== "unlisted")
            throw new ApiError(400, "Visibilité invalide.");
          const room = validateRoom(JSON.parse(row.definition));
          const tested = await db()
            .prepare(
              "SELECT id FROM play_sessions WHERE room_id=? AND completed_at IS NOT NULL LIMIT 1",
            )
            .bind(`draft:${row.id}:${row.revision}`)
            .first();
          if (!tested)
            throw new ApiError(
              422,
              "Terminez une partie de test de cette version avant de la publier.",
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
          return json({ id, slug, visibility, url: `/jouer/${slug}` }, 201);
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
        throw new ApiError(404, "Publication introuvable.");
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
          definition = JSON.parse(row.definition);
          roomId = `draft:${row.id}:${row.revision}`;
        } else {
          if (typeof data.slug !== "string")
            throw new ApiError(400, "Choisissez un jeu.");
          const room = await publicRoom(data.slug);
          definition = room.definition;
          roomId = room.id;
        }
        const id = crypto.randomUUID();
        const token = crypto.randomUUID() + crypto.randomUUID();
        const state = initialState();
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
          { id, token, state, revision: 0, room: playerRoom(definition) },
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
            "Partie introuvable. Lancez une nouvelle partie.",
          );
        const definition = JSON.parse(row.definition) as Room;
        if (method === "GET")
          return json({
            id: row.id,
            state: JSON.parse(row.state),
            revision: row.revision,
            room: playerRoom(definition),
          });
        if (method === "POST") {
          const data = await body(request);
          if (data.revision !== row.revision)
            throw new ApiError(
              409,
              "La partie a changé. Rechargez-la pour continuer.",
            );
          if (
            typeof data.objectId !== "string" ||
            (data.code !== undefined && typeof data.code !== "string")
          )
            throw new ApiError(400, "Action invalide.");
          const result = act(
            definition,
            JSON.parse(row.state) as GameState,
            data.objectId,
            data.code as string | undefined,
            data.hint === true,
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
              "Une autre action a été reçue. Rechargez la partie.",
            );
          return json({ ...result, revision: row.revision + 1 });
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
          throw new ApiError(400, "Importez une image PNG.");
        let bytes: Uint8Array;
        try {
          bytes = Uint8Array.from(atob(data.dataUrl.split(",")[1]), (c) =>
            c.charCodeAt(0),
          );
        } catch {
          throw new ApiError(400, "L’image est invalide.");
        }
        return json(await persistImage(bytes, u.id), 201);
      }
      if (method === "GET" && path[1]) {
        const asset = await db()
          .prepare("SELECT owner_id FROM assets WHERE id=?")
          .bind(path[1])
          .first<any>();
        if (!asset) throw new ApiError(404, "Image introuvable.");
        if (user(request, false)?.id !== asset.owner_id) {
          const pub = await db()
            .prepare(
              "SELECT id FROM publications WHERE image=? AND active=1 LIMIT 1",
            )
            .bind(`/api/assets/${path[1]}`)
            .first();
          if (!pub) throw new ApiError(404, "Image introuvable.");
        }
        const object = await env.BUCKET?.get(path[1]);
        if (!object) throw new ApiError(404, "Image introuvable.");
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
          "La clé Meta n’est pas configurée sur ce serveur.",
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
          "Vous avez atteint les 30 appels Meta par heure pour cet atelier.",
        );
      const data = await body(request);
      const room = path[1] === "segment" ? validateRoom(data.room) : null;
      const scene =
        path[1] === "generate"
          ? data.scene !== undefined
            ? sceneSchema.parse(data.scene)
            : validateRoom(data.room)
          : room;
      const source = scene ? await imageInput(request, scene, u.id) : null;
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
              "Décrivez votre aventure en 10 à 2 000 caractères.",
            );
          const generated = await generateRoom(
            scene!,
            source!.image,
            data.brief,
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
            throw new ApiError(400, "Choisissez un objet à détourer.");
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
              "Décrivez le décor en 10 à 2 000 caractères.",
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
                title: "Illustration créée avec Muse Image",
                author: "Muse Image · Meta",
                license: "Image générée pour ce jeu",
                url: "https://dev.meta.ai/models/muse-image",
              },
            ],
          };
        } else throw new ApiError(404, "Outil Meta inconnu.");
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
        note: "La solution est atteignable dans les règles. La cohérence visuelle et les indices sont à tester en jouant.",
      });
    }
    throw new ApiError(404, "Cette ressource est introuvable.");
  } catch (error) {
    if (error instanceof ApiError)
      return json({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return json(
        {
          error: "Le scénario contient des données invalides.",
          details: error.issues
            .slice(0, 5)
            .map((i) => `${i.path.join(".")} : ${i.message}`),
        },
        422,
      );
    if (
      error instanceof Error &&
      /objet|Dépendance|sortie|circulaires|Code|zone|unique/.test(error.message)
    )
      return json({ error: error.message }, 422);
    console.error(
      "FRAME request failed",
      error instanceof Error ? error.name : "unknown",
    );
    return json(
      {
        error:
          "Une erreur est survenue. Vos données déjà enregistrées sont conservées.",
      },
      500,
    );
  }
}
