import { createUserSupabase } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    try {
      const client = await createUserSupabase();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return Response.redirect(new URL('/', url.origin), 303);
    } catch {
      /* A fixed destination avoids forwarding auth errors or arbitrary redirects. */
    }
  }
  return Response.redirect(new URL('/settings?auth=error', url.origin), 303);
}
