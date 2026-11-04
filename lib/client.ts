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
      "Connexion interrompue. Vérifiez votre réseau et réessayez.",
      0,
    );
  }
  const data: any = await response
    .json()
    .catch(() => ({ error: "Le serveur a renvoyé une réponse inattendue." }));
  if (!response.ok)
    throw new RequestError(
      data.error ?? "Une erreur est survenue.",
      response.status,
    );
  return data;
}
export const post = <T = any>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
export const themeName: Record<string, string> = {
  cosy: "Cosy",
  mystere: "Mystère",
  aventure: "Aventure",
};
export const difficultyName: Record<string, string> = {
  facile: "Découverte",
  intermediaire: "Intermédiaire",
  difficile: "Expert",
};
export function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}
