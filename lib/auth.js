export function requireApiKey(req) {
  const expected = process.env.FLEXOZY_API_KEY;
  if (!expected) {
    return {
      ok: false,
      status: 503,
      body: { ok: false, error: "API key is not configured" }
    };
  }

  const provided = req.headers["x-api-key"] || "";
  if (provided !== expected) {
    return {
      ok: false,
      status: 401,
      body: { ok: false, error: "Invalid API key" }
    };
  }

  return { ok: true };
}
