import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    slug, name, description, priceCents, currency,
    imageUrl, deliveryType, fileUrl, keyDurationDays, stock, active,
  } = body;

  if (!slug || !name || priceCents == null) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      slug, name, description: description || "", priceCents: Number(priceCents),
      currency: currency || "THB",
      imageUrl: imageUrl || null,
      deliveryType: deliveryType || "key",
      fileUrl: fileUrl || null,
      keyDurationDays: keyDurationDays != null ? Number(keyDurationDays) : null,
      stock: stock != null ? Number(stock) : -1,
      active: active != null ? Boolean(active) : true,
    },
  });

  return NextResponse.json({ product });
}
