export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function body(
  request: Request,
  max = 1_500_000,
): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Le corps de la requête est vide.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new ApiError(413, "Le fichier ou le jeu est trop volumineux.");
    }
    chunks.push(value);
  }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
      throw new Error();
    return parsed;
  } catch {
    throw new ApiError(400, "Le contenu JSON est invalide.");
  }
}
export function user(request: Request, required = true) {
  const id = request.headers.get("oai-authenticated-user-id");
  if (!id) {
    if (required)
      throw new ApiError(401, "Connectez-vous pour créer ou publier un jeu.");
    return null;
  }
  const name = request.headers.get("oai-authenticated-user-full-name");
  let displayName = "Créateur FRAME";
  if (name) {
    try {
      displayName = decodeURIComponent(name).slice(0, 60);
    } catch {
      displayName = name.slice(0, 60);
    }
  }
  return { id, displayName };
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new ApiError(403, "Cette requête vient d’une autre origine.");
}
export async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
