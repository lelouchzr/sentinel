import { z } from 'zod';
import { requireUser } from '@/server/auth/require-user';
import { loadSession } from '@/server/session-service';
import { HttpError, readJson, route } from '@/server/http/errors';
import { synthesizeSpeech } from '@/server/providers';
import { runOperation, fingerprint } from '@/server/usage/run-operation';
export const runtime = 'nodejs';
export const maxDuration = 60;
const inputSchema = z.object({
  operationId: z.string().uuid(),
  sessionId: z.string().uuid(),
  turnId: z.string().min(1).max(100),
});
export const POST = route(async (request) => {
  const user = await requireUser();
  const input = inputSchema.parse(await readJson(request));
  const session = await loadSession(input.sessionId, user.id);
  const turn = session.turns.find((item) => item.id === input.turnId && item.role === 'partner');
  if (!turn) throw new HttpError('TURN_NOT_FOUND', 'Cette réplique est introuvable.', 404);
  const audio = await runOperation(
    {
      id: input.operationId,
      userId: user.id,
      sessionId: session.id,
      kind: 'speech',
      provider: 'azure',
      fingerprint: fingerprint(input),
    },
    async (markDispatched) => {
      const currentSession = await loadSession(session.id, user.id);
      const currentTurn = currentSession.turns.find(
        (item) => item.id === input.turnId && item.role === 'partner',
      );
      if (!currentTurn)
        throw new HttpError('TURN_NOT_FOUND', 'Cette réplique est introuvable.', 404);
      markDispatched();
      const output = await synthesizeSpeech(currentTurn.text);
      return { result: output.data, usage: output.usage };
    },
    false,
  );
  return new Response(new Uint8Array(audio).buffer, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, no-store' },
  });
});
