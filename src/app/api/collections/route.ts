import { requireUser } from '@/server/auth/require-user';
import { createCollection, listCollections } from '@/server/data/collections';
import { readJson, route } from '@/server/http/errors';
export const GET = route(async () => {
  const user = await requireUser();
  return Response.json(
    { collections: await listCollections(user.id) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
});
export const POST = route(async (request) => {
  const user = await requireUser();
  return Response.json(await createCollection(await readJson(request, 1_048_576), user.id), {
    status: 201,
  });
});
