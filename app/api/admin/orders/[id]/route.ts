import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

// PATCH { status?, revokeKey? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const order = await prisma.order.findUnique({ where: { id }, include: { licenseKey: true } });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body.status) {
    await prisma.order.update({ where: { id: order.id }, data: { status: body.status } });
  }

  if (body.revokeKey && order.licenseKey) {
    await prisma.licenseKey.update({ where: { id: order.licenseKey.id }, data: { status: "REVOKED" } });
  }

  return NextResponse.json({ ok: true });
}
