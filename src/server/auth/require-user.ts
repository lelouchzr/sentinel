import 'server-only';
import { createUserSupabase } from '@/lib/supabase/server';
import { DataError } from '@/server/data/errors';

export class AuthError extends DataError {}

export async function requireUser(_request?: Request): Promise<{ id: string }> {
  const client = await createUserSupabase();
  // getUser verifies the token with Auth; never trust a client-supplied user id or getSession alone.
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    throw new AuthError('UNAUTHORIZED', 'Connecte-toi pour utiliser les fonctions IA.', 401);
  return { id: data.user.id };
}
