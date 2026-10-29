import { z } from 'zod';
import { requireUser } from '@/server/auth/require-user';
import { assertCanAddTurn, loadSession } from '@/server/session-service';
import { assertSameOrigin, HttpError, readBoundedBody, route } from '@/server/http/errors';
import { transcribeAudio, validateWav } from '@/server/providers';
import { runOperation, fingerprint } from '@/server/usage/run-operation';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
    throw new HttpError('CONTENT_TYPE', 'Un fichier audio multipart est requis.', 415);
  const bytes = await readBoundedBody(request, 2_162_688);
  let form: FormData;
  try {
    form = await new Response(new Uint8Array(bytes).buffer, {
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
    }).formData();
  } catch {
    throw new HttpError('INVALID_MULTIPART', 'Le fichier audio n’a pas pu être lu.');
  }
  const sessionId = z.string().uuid().parse(form.get('sessionId'));
  const operationId = z.string().uuid().parse(form.get('operationId'));
  const audio = form.get('audio');
  if (!(audio instanceof File))
    throw new HttpError('AUDIO_REQUIRED', 'Un fichier audio est requis.');
  const data = new Uint8Array(await audio.arrayBuffer());
  validateWav(data);
  assertCanAddTurn(await loadSession(sessionId, user.id));
  const transcription = await runOperation(
    {
      id: operationId,
      userId: user.id,
      sessionId,
      kind: 'transcribe',
      fingerprint: fingerprint({ sessionId, audio: Buffer.from(data).toString('base64') }),
    },
    async (markDispatched) => {
      assertCanAddTurn(await loadSession(sessionId, user.id));
      markDispatched();
      const output = await transcribeAudio({ data, mimeType: 'audio/wav', fileName: 'turn.wav' });
      return { result: output.data, usage: output.usage };
    },
  );
  return Response.json({ ...transcription, operationId });
});
