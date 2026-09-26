import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/adminGuard";

// POST multipart/form-data with a "file" field.
// Requires the Vercel Blob integration (BLOB_READ_WRITE_TOKEN env var) —
// see README "File uploads (Vercel Blob)".
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });

  const blob = await put(`products/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}
