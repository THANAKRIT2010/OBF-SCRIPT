export const metadata = {
  title: "Server Verification",
  description: "Verify your Discord account to get access.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e1f22",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: "#f2f3f5",
        }}
      >
        {children}
      </body>
    </html>
  );
}
