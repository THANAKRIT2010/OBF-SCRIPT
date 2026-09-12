const MESSAGES = {
  not_in_server:
    "You authenticated successfully, but you need to join the Discord server first before verifying.",
  missing_code: "No authorization code was returned by Discord. Please try again.",
  token_exchange: "Could not exchange the code for a token. Please try again.",
  user_fetch: "Could not fetch your Discord profile. Please try again.",
  role_grant:
    "We verified your account but couldn't assign the role. Please contact a server admin.",
  unexpected: "Something went wrong. Please try again.",
};

export default function ErrorPage({ searchParams }) {
  const reason = searchParams?.reason;
  const message = MESSAGES[reason] || "Verification failed. Please try again.";

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
      <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Verification failed</h1>
      <p style={{ fontSize: 14, color: "#b5bac1" }}>{message}</p>
      <a
        href="/"
        style={{
          display: "inline-block",
          marginTop: 20,
          color: "#5865f2",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Try again
      </a>
    </main>
  );
}
