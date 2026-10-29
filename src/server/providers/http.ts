import 'server-only';
import { ProviderError } from './types';

export function assertAIEnabled(): void {
  if (process.env.AI_ENABLED !== 'true') {
    throw new ProviderError(
      'AI_DISABLED',
      'Les fonctions IA sont désactivées. Activez-les dans la configuration serveur.',
      503,
    );
  }
}

export function requiredSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new ProviderError(
      'PROVIDER_NOT_CONFIGURED',
      `Configuration serveur manquante : ${name}.`,
      503,
    );
  return value;
}

export function metaConfiguration(): { url: string; key: string } {
  assertAIEnabled();
  const url = new URL(process.env.META_API_BASE_URL || 'https://api.meta.ai/v1');
  // Never forward a provider credential to a URL supplied in an import or request.
  if (
    url.origin !== 'https://api.meta.ai' ||
    url.pathname.replace(/\/$/, '') !== '/v1' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new ProviderError(
      'INVALID_PROVIDER_URL',
      'L’URL Meta doit être https://api.meta.ai/v1.',
      503,
    );
  }
  return { url: url.toString().replace(/\/$/, ''), key: requiredSetting('META_API_KEY') };
}

export async function providerRequest(
  url: string,
  init: RequestInit,
  timeoutMs = 40_000,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ProviderError(
      'PROVIDER_OUTCOME_UNKNOWN',
      'La réponse du service n’a pas été reçue. Ne relancez pas automatiquement cette opération.',
      504,
      true,
    );
  }
  if (!response.ok) {
    // Provider error bodies may contain private input; never expose or log them.
    await response.body?.cancel();
    const ambiguous = response.status >= 500 || response.status === 408;
    if (response.status === 401 || response.status === 403) {
      throw new ProviderError(
        'PROVIDER_ACCESS_DENIED',
        'Le service a refusé l’accès. Vérifiez la clé et les droits du modèle.',
        503,
      );
    }
    if (response.status === 429) {
      throw new ProviderError(
        'PROVIDER_RATE_LIMIT',
        'Le service a atteint sa limite. Attendez avant une nouvelle tentative.',
        429,
      );
    }
    throw new ProviderError(
      'PROVIDER_REQUEST_FAILED',
      'Le service n’a pas pu traiter cette opération.',
      502,
      ambiguous,
    );
  }
  return response;
}

export async function readBoundedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader)
    throw new ProviderError(
      'EMPTY_PROVIDER_RESPONSE',
      'Le service a renvoyé une réponse vide.',
      502,
      true,
    );
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ProviderError(
          'PROVIDER_RESPONSE_TOO_LARGE',
          'La réponse du service dépasse la taille autorisée.',
          502,
          true,
        );
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(
      'PROVIDER_OUTCOME_UNKNOWN',
      'La réponse du service a été interrompue.',
      504,
      true,
    );
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
