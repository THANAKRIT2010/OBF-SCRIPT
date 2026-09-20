import { getQuest } from "../../lib/quest/provider.js";
import { requireApiKey } from "../../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!requireApiKey(req, res)) return;

  try {
    const quest = await getQuest(req.query.id);
    if (!quest) return res.status(404).json({ error: "quest_not_found" });
    res.status(200).json({ ok: true, quest });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "provider_error", message: error.message });
  }
}