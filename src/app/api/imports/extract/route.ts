import sharp from 'sharp';
import { z } from 'zod';
import { requireUser } from '@/server/auth/require-user';
import { createUserSupabase } from '@/lib/supabase/server';
import { assertAiEnabled } from '@/server/config';
import { extractVocabulary } from '@/server/providers';
import { HttpError, readJson, route } from '@/server/http/errors';
import { runOperation, fingerprint } from '@/server/usage/run-operation';
export const runtime = 'nodejs';
export const maxDuration = 60;
const inputSchema = z.object({ operationId: z.string().uuid(), objectPath: z.string().max(150) });
export const POST = route(async (request) => {
  const user = await requireUser();
  const input = inputSchema.parse(await readJson(request));
  const prefix = `${user.id}/`;
  if (
    !input.objectPath.startsWith(prefix) ||
    !/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(input.objectPath.slice(prefix.length))
  ) {
    throw new HttpError('INVALID_OBJECT', 'Cette image ne vous appartient pas.', 403);
  }
  assertAiEnabled();
  const storage = (await createUserSupabase()).storage.from('vocabulary-pages');
  const result = await runOperation(
    {
      id: input.operationId,
      userId: user.id,
      kind: 'extract',
      fingerprint: fingerprint(input.objectPath),
    },
    async (markDispatched) => {
      const { data: image, error } = await storage.download(input.objectPath);
      if (error || !image)
        throw new HttpError('IMAGE_NOT_FOUND', 'Cette page est introuvable.', 404);
      try {
        if (image.size > 5_242_880 || image.size === 0)
          throw new HttpError('INVALID_IMAGE', 'La page doit faire moins de 5 Mo.');
        const data = Buffer.from(await image.arrayBuffer());
        let prepared: Buffer;
        try {
          const decoder = sharp(data, { limitInputPixels: 20_000_000, failOn: 'warning' });
          const metadata = await decoder.metadata();
          if (
            !['jpeg', 'png', 'webp'].includes(metadata.format || '') ||
            (metadata.pages || 1) !== 1
          )
            throw new Error('Unsupported image');
          prepared = await decoder
            .rotate()
            .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 88 })
            .toBuffer();
        } catch {
          throw new HttpError(
            'INVALID_IMAGE',
            'Utilisez une seule page JPEG, PNG ou WebP lisible, de 20 mégapixels maximum.',
          );
        }
        markDispatched();
        const output = await extractVocabulary({ data: prepared, mimeType: 'image/jpeg' });
        return { result: output.data, usage: output.usage };
      } finally {
        await storage.remove([input.objectPath]);
      }
    },
  );
  return Response.json(result);
});
