import crypto from "node:crypto";

export function getApiKey(req) {
  const auth = req.headers.authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.headers["x-api-key"] || "";
}

export function requireApiKey(req, res) {
  const key = getApiKey(req);
  const admin = process.env.API_ADMIN_KEY || "";
  if (!admin || !key || !safeEqual(key, admin)) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

export function safeEqual(a, b) {
  if (!a || !b) return false;
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function signPayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}