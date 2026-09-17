import "./globals.css";

export const metadata = {
  title: "PromptPay QR Generator",
  description: "สร้าง QR PromptPay พร้อมกำหนดยอดเงิน",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
