import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const data: any = {};
  for (const field of [
    "slug", "name", "description", "imageUrl", "deliveryType",
    "fileUrl", "active",
  ]) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  for (const numField of ["priceCents", "keyDurationDays", "stock"]) {
    if (body[numField] !== undefined) data[numField] = body[numField] === null ? null : Number(body[numField]);
  }

  const product = await prisma.product.update({ where: { id }, data });
  return NextResponse.json({ product });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
