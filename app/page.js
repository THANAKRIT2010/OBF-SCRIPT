function buildAuthUrl() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

  const params = new URLSearchParams({
    client_id: clientId || "",
    redirect_uri: redirectUri || "",
    response_type: "code",
    scope: "identify",
    prompt: "consent",
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export default function Home() {
  const authUrl = buildAuthUrl();

  return (
    <main
      style={{
        background: "#2b2d31",
        borderRadius: 12,
        padding: "40px 32px",
        width: 360,
        textAlign: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Verify your account</h1>
      <p style={{ fontSize: 14, color: "#b5bac1", marginBottom: 24 }}>
        Log in with Discord to confirm you're a real member and get instant
        access to the server.
      </p>
      <a
        href={authUrl}
        style={{
          display: "inline-block",
          background: "#5865f2",
          color: "#fff",
          textDecoration: "none",
          padding: "10px 20px",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Verify with Discord
      </a>
      <p style={{ fontSize: 12, color: "#80848e", marginTop: 20 }}>
        This uses Discord's official login. We only read your Discord user
        ID — never your password.
      </p>
    </main>
  );
}
