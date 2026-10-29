import { requireMaintenance } from '@/server/auth/maintenance';
import { cleanupUploads } from '@/server/data/maintenance';
import { readJson, route } from '@/server/http/errors';
export const maxDuration = 60;
export const POST = route(async (request) => {
  requireMaintenance(request);
  return Response.json(await cleanupUploads(await readJson(request)), {
    headers: { 'Cache-Control': 'no-store' },
  });
});
