import { requireApiKey } from "../../../lib/auth.js";

export default function handler(req, res) {
  const auth = requireApiKey(req);
  if (!auth.ok) return res.status(auth.status).json(auth.body);

  res.status(200).json({
    ok: true,
    events: []
  });
}
