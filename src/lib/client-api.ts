export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body && typeof init.body === 'string'
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('Réponse du serveur illisible. Réessayez plus tard.');
  }
  if (!response.ok) {
    const error = data as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Cette opération n’a pas pu aboutir.');
  }
  return data as T;
}
