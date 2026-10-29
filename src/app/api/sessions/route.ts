import { requireUser } from '@/server/auth/require-user';
import { startSession } from '@/server/session-service';
import { readJson, route } from '@/server/http/errors';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = route(async (request) => {
  const { id } = await requireUser();
  return Response.json(await startSession(await readJson(request), id));
});
