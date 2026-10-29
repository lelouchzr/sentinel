import { requireUser } from '@/server/auth/require-user';
import { exportAccount } from '@/server/data/account';
import { route } from '@/server/http/errors';
export const maxDuration = 60;
export const GET = route(async () => {
  const user = await requireUser(undefined, { allowDeleting: true });
  return Response.json(await exportAccount(user.id, user.email ?? null), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="language-speaking-account.json"',
    },
  });
});
