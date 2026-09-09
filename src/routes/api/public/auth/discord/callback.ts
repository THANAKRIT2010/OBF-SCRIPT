import { createFileRoute } from "@tanstack/react-router";

import { signSession, SESSION_COOKIE } from "@/lib/session.server";

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

export const Route = createFileRoute("/api/public/auth/discord/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const fail = (reason: string) =>
          new Response(null, {
            status: 302,
            headers: { Location: `${url.origin}/login?error=${reason}` },
          });

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const cookieState = (request.headers.get("cookie") ?? "")
          .split(";")
          .map((part) => part.trim().split("="))
          .find(([name]) => name === "fx_oauth_state")?.[1];

        if (!code) return fail("cancelled");
        if (!state || state !== cookieState) return fail("bad_state");

        const clientId = process.env["DISCORD_CLIENT_ID"];
        const clientSecret = process.env["DISCORD_CLIENT_SECRET"];
        if (!clientId || !clientSecret) return fail("not_configured");

        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: `${url.origin}/api/public/auth/discord/callback`,
          }),
        });

        if (!tokenRes.ok) {
          console.error("Discord token exchange failed", await tokenRes.text());
          return fail("token_exchange");
        }

        const { access_token: accessToken } = (await tokenRes.json()) as {
          access_token?: string;
        };
        if (!accessToken) return fail("token_exchange");

        const userRes = await fetch("https://discord.com/api/users/@me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userRes.ok) return fail("profile");

        const profile = (await userRes.json()) as DiscordUser;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("discord_users")
          .upsert(
            {
              discord_id: profile.id,
              username: profile.username,
              global_name: profile.global_name ?? null,
              avatar: profile.avatar ?? null,
              last_login_at: new Date().toISOString(),
            },
            { onConflict: "discord_id" },
          )
          .select("id")
          .single();

        if (error || !data) {
          console.error("Failed to persist Discord user", error);
          return fail("storage");
        }

        await supabaseAdmin
          .from("bot_settings")
          .upsert({ user_id: data.id }, { onConflict: "user_id", ignoreDuplicates: true });

        const session = await signSession({
          uid: data.id,
          discordId: profile.id,
          username: profile.username,
          globalName: profile.global_name ?? null,
          avatar: profile.avatar ?? null,
        });

        const headers = new Headers({ Location: `${url.origin}/dashboard` });
        headers.append(
          "Set-Cookie",
          `${SESSION_COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}`,
        );
        headers.append("Set-Cookie", "fx_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");

        return new Response(null, { status: 302, headers });
      },
    },
  },
});
