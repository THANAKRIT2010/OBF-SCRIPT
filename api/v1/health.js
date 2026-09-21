export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "Flexozy API Gateway",
    version: "v1",
    timestamp: new Date().toISOString()
  });
}
