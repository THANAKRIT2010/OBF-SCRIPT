export default function Success() {
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
      <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>You're verified!</h1>
      <p style={{ fontSize: 14, color: "#b5bac1" }}>
        Your role has been added. You can close this tab and go back to
        Discord.
      </p>
    </main>
  );
}
