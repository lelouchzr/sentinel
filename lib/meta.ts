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
      "The Meta key is not yet configured on this server.",
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
      "Meta did not respond in time. Your draft is kept; you can try again.",
    );
  }
  if (!response.ok)
    throw new ApiError(
      response.status === 429 ? 429 : 502,
      response.status === 429
        ? "The Meta limit has been reached. Try again in a few moments."
        : response.status === 401
          ? "The Meta key was rejected. Check the server configuration."
          : "Meta could not process this request. Your draft was not modified.",
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
      "Muse Image did not return a usable illustration.",
    );
  try {
    return Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  } catch {
    throw new ApiError(502, "The illustration received from Meta is invalid.");
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
            ? " Write exactly 3 chronological acts in THIS illustration (same room whose state and story evolve; do not claim to generate other settings). 18 to 20 objects, estimated duration 35 to 50 minutes. At least 3 puzzles including 1 move and 2 sequence, 5 animations, 1 inventory use, 1 final decision and exactly 2 endings. Each chapter includes 4 to 8 objects; its narrative contains 600..1000 characters. The initial narrative sets up the stakes and characters in 600..1200 characters. The scenes are acts in the same setting: narrative titles, never false rooms absent from the image. Finishing an act unlocks the next one and gives a new objective. Reusing the same spot is possible with new clues, but do not overlap the zones of several objects within the same chapter."
            : " A short adventure in one room, 4 to 8 objects, with no chapters or ending; at least 1 manipulation and 2 animations. No final choice for this short format."),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Brief: ${brief}\nPrevious title: ${base.title}. Create a new English-language adventure consistent with the objects in this image. The codes and clues must be consistent with each other.`,
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
      "Meta reached the writing limit before finishing. The previous scenario is kept; shorten the brief or choose the short format.",
    );
  if (typeof text !== "string")
    throw new ApiError(502, "Meta did not return a usable scenario.");
  try {
    return buildGeneratedRoom(JSON.parse(text), base, format);
  } catch (error) {
    console.warn(
      "Storyscape rejected Meta plan",
      error instanceof Error ? error.message.slice(0, 1200) : "invalid",
    );
    throw new ApiError(
      422,
      "The scenario suggested by Meta does not follow the game rules. The previous draft is kept. You can adjust the brief and try again; no draft was replaced.",
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
      "SAM returned an incomplete result. Adjust the zone and try again.",
    );
  const text = (response.output ?? [])
    .flatMap((o: any) => o.content ?? [])
    .filter((c: any) => c.type === "output_text")
    .map((c: any) => c.text)
    .join("");
  if (!text.trim())
    throw new ApiError(
      422,
      "SAM did not find this object. Adjust its zone and try again.",
    );
  const parser = formats.segmentation.image().createParser();
  parser.push(text);
  const parsed = parser.finish({ status: "completed" }).result;
  const masks = recordsOfKind(parsed.records, "mask");
  if (!masks.length)
    throw new ApiError(
      502,
      "SAM did not return a complete usable mask.",
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
