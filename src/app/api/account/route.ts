import { z } from 'zod';
import { requireUser } from '@/server/auth/require-user';
import { accountDeletionPending, deleteAccount } from '@/server/data/account';
import { readJson, route } from '@/server/http/errors';
export const maxDuration = 60;
export const GET = route(async () => {
  const user = await requireUser(undefined, { allowDeleting: true });
  return Response.json(
    {
      id: user.id,
      email: user.email ?? null,
      deletionPending: await accountDeletionPending(user.id),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
});
export const DELETE = route(async (request) => {
  const user = await requireUser(undefined, { allowDeleting: true });
  z.object({ confirmation: z.literal('DELETE') }).parse(await readJson(request));
  await deleteAccount(user.id);
  return new Response(null, { status: 204 });
});
