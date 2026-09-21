export default function handler(req, res) {
  res.status(200).json({
    success: true,
    api: "Flexozy API",
    version: "v1",
    status: "online",
    timestamp: new Date().toISOString()
  });
}
