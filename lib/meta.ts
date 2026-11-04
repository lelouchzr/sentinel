import { env } from "cloudflare:workers";
import {
  buildObjectPrompt,
  formats,
  recordsOfKind,
  decodeMaskToSVGPath,
} from "@meta-sam/parser";
import { validateRoom, type Room, type GameObject, type Scene } from "./game";
import { ApiError } from "./http";
import {
  generationSchema,
  narrativeInstructions,
  buildGeneratedRoom,
  type StoryFormat,
} from "./narrative-generation";

export function metaAvailable() {
  return Boolean(env.MODEL_API_KEY);
}
export async function metaRequest(path: string, payload: unknown) {
  if (!env.MODEL_API_KEY)
    throw new ApiError(
      503,
      "La clé Meta n’est pas encore configurée sur ce serveur.",
    );
  let response: Response;
  try {
    response = await fetch(`https://api.meta.ai/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MODEL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(
        path === "chat/completions" ? 300_000 : 120_000,
      ),
    });
  } catch {
    throw new ApiError(
      504,
      "Meta n’a pas répondu à temps. Votre brouillon est conservé ; vous pouvez réessayer.",
    );
  }
  if (!response.ok)
    throw new ApiError(
      response.status === 429 ? 429 : 502,
      response.status === 429
        ? "La limite Meta est atteinte. Réessayez dans quelques instants."
        : response.status === 401
          ? "La clé Meta a été refusée. Vérifiez la configuration du serveur."
          : "Meta n’a pas pu traiter cette demande. Votre brouillon n’a pas été modifié.",
    );
  return response.json() as Promise<Record<string, any>>;
}

const string = { type: "string" };
export async function generateIllustration(brief: string) {
  const response = await metaRequest("images/generations", {
    model: "muse-image-1.0",
    n: 1,
    size: "1536x1024",
    output_format: "png",
    response_format: "b64_json",
    reasoning_strength: "low",
    tool_enablement: {
      enable_image_search: false,
      enable_web_search: false,
      enable_shell: false,
    },
    prompt: `Create an original illustrated interior for a small point-and-click escape game. Wide landscape composition, clear silhouettes, inviting atmosphere, no people, no logos, no lettering or numbers. Show 4 to 6 distinct, well-spaced objects that can be clicked, one clearly visible exit door, and simple cabinets or containers. Do not depict clues as unreadable text. User's art direction: ${brief}`,
  });
  const encoded = response.data?.[0]?.b64_json;
  if (typeof encoded !== "string")
    throw new ApiError(
      502,
      "Muse Image n’a pas renvoyé d’illustration exploitable.",
    );
  try {
    return Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  } catch {
    throw new ApiError(502, "L’illustration reçue de Meta est invalide.");
  }
}
export async function generateRoom(
  base: Scene,
  image: string,
  brief: string,
  format: StoryFormat = "long",
): Promise<Room> {
  const response = await metaRequest("chat/completions", {
    model: "muse-spark-1.3",
    max_tokens: format === "long" ? 22000 : 7500,
    reasoning_effort: "low",
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "escape_room",
        strict: true,
        schema: generationSchema(format),
      },
    },
    messages: [
      {
        role: "system",
        content:
          narrativeInstructions +
          (format === "long"
            ? " Écris exactement 3 actes chronologiques dans CETTE illustration (même pièce dont l'état et l'histoire évoluent; ne prétends pas générer d'autres décors). 18 à 20 objets, durée estimée 35 à 50 minutes. Au moins 3 puzzles dont 1 move et 2 sequence, 5 animations, 1 utilisation d'inventaire, 1 décision finale et exactement 2 conclusions. Chaque chapitre comprend 4 à 8 objets; son récit contient 600..1000 caractères. Le récit initial pose les enjeux et les personnages en 600..1200 caractères. Les scènes sont des actes dans le même décor: titres narratifs, jamais de fausses pièces absentes de l'image. Finir un acte débloque le suivant et donne un nouvel objectif. Réutiliser un même endroit est possible avec de nouveaux indices, mais ne superpose pas les zones de plusieurs objets dans un même chapitre."
            : " Une aventure courte en une pièce, 4 à 8 objets, sans chapitres ni ending; au moins 1 manipulation et 2 animations. Pas de choix final pour ce format court."),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Brief : ${brief}\nTitre précédent : ${base.title}. Crée une nouvelle aventure cohérente avec les objets de cette image. Les codes et indices doivent être cohérents entre eux.`,
          },
          { type: "image_url", image_url: { url: image } },
        ],
      },
    ],
  });
  const text = response.choices?.[0]?.message?.content;
  if (response.choices?.[0]?.finish_reason === "length")
    throw new ApiError(
      422,
      "Meta a atteint la limite d’écriture avant de terminer. Le scénario précédent est conservé ; raccourcissez le brief ou choisissez le format court.",
    );
  if (typeof text !== "string")
    throw new ApiError(502, "Meta n’a pas renvoyé de scénario exploitable.");
  try {
    return buildGeneratedRoom(JSON.parse(text), base, format);
  } catch (error) {
    console.warn(
      "Storyscape rejected Meta plan",
      error instanceof Error ? error.message.slice(0, 1200) : "invalid",
    );
    throw new ApiError(
      422,
      "Le scénario proposé par Meta ne respecte pas les règles du jeu. Le brouillon précédent est conservé. Vous pouvez ajuster le brief et réessayer ; aucun brouillon n’a été remplacé.",
    );
  }
}

export async function segmentObject(
  image: string,
  width: number,
  height: number,
  object: GameObject,
) {
  const r = object.region;
  const prompt = buildObjectPrompt({
    size: { width, height },
    objects: [
      {
        id: 0,
        prompts: [
          {
            box: {
              left: Math.floor(r.x * width),
              top: Math.floor(r.y * height),
              right: Math.ceil((r.x + r.w) * width),
              bottom: Math.ceil((r.y + r.h) * height),
            },
          },
        ],
      },
    ],
  });
  const response = await metaRequest("responses", {
    model: "sam-3.1",
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: image },
        ],
      },
    ],
    metadata: { mask_encoding: "one_bit", include_confidence: "true" },
  });
  if (response.status && response.status !== "completed")
    throw new ApiError(
      502,
      "SAM a renvoyé un résultat incomplet. Ajustez la zone et réessayez.",
    );
  const text = (response.output ?? [])
    .flatMap((o: any) => o.content ?? [])
    .filter((c: any) => c.type === "output_text")
    .map((c: any) => c.text)
    .join("");
  if (!text.trim())
    throw new ApiError(
      422,
      "SAM n’a pas trouvé cet objet. Ajustez sa zone et réessayez.",
    );
  const parser = formats.segmentation.image().createParser();
  parser.push(text);
  const parsed = parser.finish({ status: "completed" }).result;
  const masks = recordsOfKind(parsed.records, "mask");
  if (!masks.length)
    throw new ApiError(
      502,
      "SAM n’a pas renvoyé de masque complet exploitable.",
    );
  const mask = masks[0];
  const b = mask.bounds;
  return {
    region: {
      x: b.left / width,
      y: b.top / height,
      w: (b.right - b.left) / width,
      h: (b.bottom - b.top) / height,
    },
    mask: {
      path: decodeMaskToSVGPath(mask.mask),
      width: mask.mask.width,
      height: mask.mask.height,
    },
    confidence: mask.confidence ?? null,
    model: "sam-3.1",
  };
}
