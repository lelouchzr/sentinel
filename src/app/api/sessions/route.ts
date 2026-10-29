import { requireUser } from '@/server/auth/require-user';
import { startSession } from '@/server/session-service';
import { readJson, route } from '@/server/http/errors';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = route(async (request) => {
  const { id } = await requireUser();
  return Response.json(await startSession(await readJson(request), id));
});

export const GET = route(async (request) => {
  const user = await requireUser();
  const { listSessions } = await import('@/server/data/sessions');
  const url = new URL(request.url);
  return Response.json(
    await listSessions(user.id, { before: url.searchParams.get('before') || undefined }),
    { headers: { 'Cache-Control': 'no-store' } },
  );
});
