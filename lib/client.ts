export class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new RequestError(
      "Connection lost. Check your network and try again.",
      0,
    );
  }
  const data: any = await response
    .json()
    .catch(() => ({ error: "The server returned an unexpected response." }));
  if (!response.ok)
    throw new RequestError(
      data.error ?? "An error occurred.",
      response.status,
    );
  return data;
}
export const post = <T = any>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
export const themeName: Record<string, string> = {
  cosy: "Cozy",
  mystere: "Mystery",
  aventure: "Adventure",
};
export const difficultyName: Record<string, string> = {
  facile: "Beginner",
  intermediaire: "Intermediate",
  difficile: "Expert",
};
export function errorText(error: unknown) {
  return error instanceof Error ? error.message : "An error occurred.";
}
