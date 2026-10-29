import 'server-only';
import { ZodError } from 'zod';
import type { RetryAdvice } from '@/lib/contracts';

export class HttpError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public retry: RetryAdvice = 'none',
  ) {
    super(message);
  }
}
export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: 'Vérifiez les champs saisis et les limites de cette opération.',
        },
      },
      { status: 400 },
    );
  }
  const known = error as {
    code?: string;
    status?: number;
    message?: string;
    retry?: RetryAdvice;
  } | null;
  if (known && typeof known.code === 'string' && typeof known.status === 'number') {
    return Response.json(
      {
        error: {
          code: known.code,
          message: known.message || 'Opération indisponible.',
          retry: known.retry ?? 'none',
        },
      },
      { status: known.status },
    );
  }
  // Never expose database/provider details or private input in an HTTP error.
  return Response.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'L’opération a échoué. Aucun résultat ne peut être confirmé pour le moment.',
        retry: known?.retry ?? 'same-operation',
      },
    },
    { status: 500 },
  );
}
export function route(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const expected = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const fetchSite = request.headers.get('sec-fetch-site');
  if (
    (origin && origin !== new URL(expected).origin && origin !== new URL(request.url).origin) ||
    fetchSite === 'cross-site'
  ) {
    throw new HttpError('ORIGIN_REJECTED', 'Cette requête ne provient pas de l’application.', 403);
  }
}
export async function readJson(request: Request, maxBytes = 32_768): Promise<unknown> {
  assertSameOrigin(request);
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new HttpError('CONTENT_TYPE', 'Un corps JSON est requis.', 415);
  }
  const body = await readBoundedBody(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch {
    throw new HttpError('INVALID_JSON', 'Le contenu de la requête est invalide.');
  }
}
export async function readBoundedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes)
    throw new HttpError('BODY_TOO_LARGE', 'Le fichier dépasse la taille autorisée.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError('EMPTY_BODY', 'Le contenu est vide.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError('BODY_TOO_LARGE', 'Le fichier dépasse la taille autorisée.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
