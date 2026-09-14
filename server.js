// server.js — จุดเริ่มโปรแกรมจริงๆ แค่ import app.js แล้ว listen เท่านั้น
const app = require("./app");
const { PORT } = require("./config/env");
const presenceService = require("./services/presenceService");

presenceService.start(); // ต่อ Discord Gateway แบบ non-blocking (ไม่ตั้งค่าไว้ก็ข้ามไปเฉยๆ)

app.listen(PORT, () => {
  console.log(`Flexozy backend running on http://localhost:${PORT}`);
});
