export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success:false, error:"method_not_allowed" });
  }
  res.status(200).json({ success:true, version:"v1", data:[] });
}
