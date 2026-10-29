import { requireUser } from '@/server/auth/require-user';
import { addTurn } from '@/server/session-service';
import { readJson, errorResponse } from '@/server/http/errors';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return Response.json(await addTurn(id, await readJson(request), user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
