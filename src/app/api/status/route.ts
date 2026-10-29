import { requireUser } from '@/server/auth/require-user';
import type { ProviderStatus } from '@/lib/contracts';
export const dynamic = 'force-dynamic';
export async function GET() {
  let authenticated = false;
  const storage = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SECRET_KEY,
  );
  if (storage) {
    try {
      await requireUser();
      authenticated = true;
    } catch {
      /* Unconfigured or signed out. */
    }
  }
  const status: ProviderStatus = {
    aiEnabled: process.env.AI_ENABLED === 'true',
    meta: Boolean(process.env.META_API_KEY),
    speech: Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION),
    storage,
    authenticated,
  };
  return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
}
