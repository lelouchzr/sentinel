import { requireUser } from '@/server/auth/require-user';
import { amendTranscript } from '@/server/session-service';
import { readJson, errorResponse } from '@/server/http/errors';
export const runtime = 'nodejs';
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; turnId: string }> },
) {
  try {
    const user = await requireUser();
    const { id, turnId } = await context.params;
    return Response.json(await amendTranscript(id, turnId, await readJson(request), user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
