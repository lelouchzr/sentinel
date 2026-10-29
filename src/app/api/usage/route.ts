import { requireUser } from '@/server/auth/require-user';
import { getUsage } from '@/server/data/account';
import { route } from '@/server/http/errors';
export const GET = route(async () => {
  const user = await requireUser();
  return Response.json(await getUsage(user.id), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});
