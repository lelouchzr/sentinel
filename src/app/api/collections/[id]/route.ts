import { z } from 'zod';
import { requireUser } from '@/server/auth/require-user';
import { deleteCollection, updateCollection } from '@/server/data/collections';
import { errorResponse, readJson } from '@/server/http/errors';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return Response.json(await updateCollection(id, await readJson(request, 1_048_576), user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const input = z
      .object({ revision: z.number().int().nonnegative() })
      .parse(await readJson(request));
    await deleteCollection(id, input.revision, user.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
