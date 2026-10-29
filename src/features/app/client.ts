export { api as request } from '@/lib/client-api';

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}
