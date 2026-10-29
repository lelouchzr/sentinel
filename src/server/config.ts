import 'server-only';
import { HttpError } from './http/errors';
export function boundedNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : fallback;
  if (!Number.isFinite(n) || n < min || n > max)
    throw new HttpError(
      'INVALID_CONFIGURATION',
      `La limite ${name} doit être configurée correctement.`,
      503,
    );
  return n;
}
export function assertAiEnabled(provider: 'meta' | 'azure' = 'meta') {
  if (process.env.AI_ENABLED !== 'true')
    throw new HttpError(
      'AI_DISABLED',
      'Les appels IA sont désactivés. Configurez les services puis activez AI_ENABLED.',
      503,
    );
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    !process.env.SUPABASE_SECRET_KEY
  ) {
    throw new HttpError(
      'STORAGE_NOT_CONFIGURED',
      'Configurez Supabase et appliquez la migration avant de lancer une conversation.',
      503,
    );
  }
  if (provider === 'meta' && !process.env.META_API_KEY)
    throw new HttpError('META_NOT_CONFIGURED', 'La clé Meta n’est pas encore configurée.', 503);
  if (provider === 'azure' && (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION))
    throw new HttpError(
      'SPEECH_NOT_CONFIGURED',
      'La lecture audio nécessite la configuration Azure Speech.',
      503,
    );
}
