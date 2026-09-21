export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    ok: true,
    service: "Flexozy API Gateway",
    version: "v1",
    endpoints: {
      health: "/api/v1/health",
      quests: "/api/v1/quests",
      quest: "/api/v1/quests/:id"
    }
  });
}
