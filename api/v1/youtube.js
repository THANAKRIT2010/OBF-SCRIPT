// api/v1/youtube.js  -->  deployed by Vercel as: POST https://flexozy.online/api/v1/youtube
//
// multipart/form-data:
//   image          -> the screenshot file (required)
//   channelHandle  -> expected @handle, e.g. "Bafucknakubbro" (optional but recommended)
//
// Response:
//   { ok: true, following: boolean, channelMatch: boolean|null, reused: boolean, rawTextPreview: string }
//
// ENV VARS required:
//   GOOGLE_VISION_API_KEY                -> Google Cloud Vision API key (Vision API enabled on the project)
//   KV_REST_API_URL / KV_REST_API_TOKEN  -> already present if this Vercel project has KV attached

import formidable from "formidable";
import fs from "fs";
import crypto from "crypto";
import { kv } from "@vercel/kv";

export const config = {
  api: { bodyParser: false },
};

// "ติดตามแล้ว" = already following. Plain "ติดตาม" (without แล้ว) = not yet followed.
const FOLLOWING_PATTERN = /ติดตามแล้ว/;

async function fileToBuffer(filepath) {
  return fs.promises.readFile(filepath);
}

async function ocrImage(base64) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_VISION_API_KEY is not set");

  const resp = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "TEXT_DETECTION" }],
            imageContext: { languageHints: ["th", "en"] },
          },
        ],
      }),
    }
  );

  if (!resp.ok) {
    throw new Error(`Vision API error: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json();
  return data.responses?.[0]?.textAnnotations?.[0]?.description || "";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const form = formidable({ multiples: false, maxFileSize: 8 * 1024 * 1024 });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const imageFile = files.image?.[0] || files.image;
    if (!imageFile) {
      return res.status(400).json({ ok: false, error: "Missing 'image' file" });
    }

    const channelHandle = (fields.channelHandle?.[0] || fields.channelHandle || "")
      .toString()
      .replace(/^@/, "")
      .trim();

    const buf = await fileToBuffer(imageFile.filepath);
    const base64 = buf.toString("base64");

    // anti-reuse: hash the image bytes, reject if seen before
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    let reused = false;
    try {
      const seen = await kv.get(`verify-follow:hash:${hash}`);
      if (seen) reused = true;
      else await kv.set(`verify-follow:hash:${hash}`, true, { ex: 60 * 60 * 24 * 30 });
    } catch (kvErr) {
      console.warn("KV check skipped:", kvErr.message);
    }

    const rawText = await ocrImage(base64);
    const normalized = rawText.replace(/\s+/g, "");
    const following = FOLLOWING_PATTERN.test(normalized);

    let channelMatch = null;
    if (channelHandle) {
      const pattern = new RegExp(channelHandle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      channelMatch = pattern.test(normalized);
    }

    return res.status(200).json({
      ok: true,
      following,
      channelMatch,
      reused,
      rawTextPreview: rawText.slice(0, 300),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
