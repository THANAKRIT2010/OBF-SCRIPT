import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const orders = await prisma.order.findMany({
    where: { userId },
    include: { product: true, licenseKey: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}
