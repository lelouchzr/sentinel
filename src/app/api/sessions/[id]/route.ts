import { requireUser } from '@/server/auth/require-user';
import { loadSession } from '@/server/session-service';
import { deleteSession } from '@/server/data/sessions';
import { assertSameOrigin, errorResponse } from '@/server/http/errors';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return Response.json(await loadSession(id, user.id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    await loadSession(id, user.id);
    await deleteSession(id, user.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
