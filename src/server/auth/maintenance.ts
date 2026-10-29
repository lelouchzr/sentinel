import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { HttpError } from '@/server/http/errors';

export function requireMaintenance(request: Request): void {
  const expected = process.env.MAINTENANCE_SECRET;
  if (!expected || expected.length < 32)
    throw new HttpError('MAINTENANCE_DISABLED', 'La maintenance n’est pas configurée.', 503);
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const digest = (value: string) => createHash('sha256').update(value).digest();
  if (!timingSafeEqual(digest(supplied), digest(expected)))
    throw new HttpError('UNAUTHORIZED', 'Accès administratif requis.', 401);
}
