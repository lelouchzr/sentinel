import 'server-only';
import { createUserSupabase } from '@/lib/supabase/server';
import { DataError } from '@/server/data/errors';

export class AuthError extends DataError {}

export async function requireUser(
  _request?: Request,
  options: { allowDeleting?: boolean } = {},
): Promise<{ id: string; email?: string | null }> {
  const client = await createUserSupabase();
  // getUser verifies the token with Auth; never trust a client-supplied user id or getSession alone.
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    throw new AuthError('UNAUTHORIZED', 'Connecte-toi pour utiliser les fonctions IA.', 401);
  if (!options.allowDeleting) {
    const { data: deletion, error: deletionError } = await client
      .from('account_deletion_requests')
      .select('owner_id')
      .eq('owner_id', data.user.id)
      .maybeSingle();
    if (deletionError)
      throw new AuthError(
        'SCHEMA_NOT_READY',
        'Appliquez les migrations du projet avant de continuer.',
        503,
      );
    if (deletion)
      throw new AuthError(
        'ACCOUNT_DELETING',
        'La suppression du compte est en cours. Terminez-la dans les paramètres.',
        409,
      );
  }
  return { id: data.user.id, email: data.user.email ?? null };
}
