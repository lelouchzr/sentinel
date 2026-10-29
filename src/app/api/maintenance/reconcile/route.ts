import { requireMaintenance } from '@/server/auth/maintenance';
import { reconcileOperation } from '@/server/data/maintenance';
import { readJson, route } from '@/server/http/errors';
export const POST = route(async (request) => {
  requireMaintenance(request);
  return Response.json(await reconcileOperation(await readJson(request)), {
    headers: { 'Cache-Control': 'no-store' },
  });
});
