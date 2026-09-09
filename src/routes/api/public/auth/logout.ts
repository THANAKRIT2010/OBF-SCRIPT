import { createFileRoute } from "@tanstack/react-router";

import { SESSION_COOKIE } from "@/lib/session.server";

function clear(origin: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${origin}/`,
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}

export const Route = createFileRoute("/api/public/auth/logout")({
  server: {
    handlers: {
      GET: async ({ request }) => clear(new URL(request.url).origin),
      POST: async ({ request }) => clear(new URL(request.url).origin),
    },
  },
});
