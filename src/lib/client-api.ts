import type { ApiError, RetryAdvice } from './contracts';

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public retry: RetryAdvice = 'none',
    public status = 0,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body && typeof init.body === 'string'
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError(
      'NETWORK_OUTCOME_UNKNOWN',
      'La réponse n’a pas été reçue. Réessayez la même action pour retrouver son résultat, sans créer un nouvel envoi.',
      'same-operation',
    );
  }
  if (response.status === 204 && response.ok) return undefined as T;
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiClientError(
      'INVALID_SERVER_RESPONSE',
      'La réponse est illisible. Rechargez votre conversation avant un nouvel envoi.',
      'same-operation',
      response.status,
    );
  }
  if (!response.ok) {
    const error = (data as Partial<ApiError>)?.error;
    const retry =
      error?.retry && ['new-operation', 'same-operation', 'reconcile', 'none'].includes(error.retry)
        ? error.retry
        : 'none';
    throw new ApiClientError(
      error?.code || 'REQUEST_FAILED',
      error?.message || 'Cette opération n’a pas pu aboutir.',
      retry,
      response.status,
    );
  }
  return data as T;
}
