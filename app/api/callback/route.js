import { NextResponse } from "next/server";

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_ROLE_ID,
} = process.env;

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/error?reason=missing_code`);
  }

  try {
    // 1. Exchange the authorization code for an access token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${origin}/error?reason=token_exchange`);
    }

    const tokenData = await tokenRes.json();

    // 2. Use the access token to fetch the user's own Discord profile
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${origin}/error?reason=user_fetch`);
    }

    const user = await userRes.json();

    // 3. Grant the role using the bot token against the official Discord API
    const roleRes = await fetch(
      `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${user.id}/roles/${DISCORD_ROLE_ID}`,
      {
        method: "PUT",
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      }
    );

    if (roleRes.status === 404) {
      // User authenticated but isn't a member of the server yet
      return NextResponse.redirect(`${origin}/error?reason=not_in_server`);
    }

    if (!roleRes.ok) {
      return NextResponse.redirect(`${origin}/error?reason=role_grant`);
    }

    return NextResponse.redirect(`${origin}/success`);
  } catch (err) {
    return NextResponse.redirect(`${origin}/error?reason=unexpected`);
  }
}
