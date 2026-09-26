import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateKeyCode, calculateExpiry } from "@/lib/keygen";

// POST { productId }
//
// ⚠️ PAYMENT NOTE: this does not charge a real card / wallet — there is no
// payment gateway wired in (no Stripe/Omise/PromptPay keys were provided).
// It creates the order and marks it PAID immediately so you can see the full
// delivery flow end-to-end. Before going live, swap the "mark PAID" step for
// a real payment webhook (see README "Adding real payments").
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { productId } = await req.json();
  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product || !product.active) {
    return NextResponse.json({ error: "product_unavailable" }, { status: 404 });
  }

  if (product.stock === 0) {
    return NextResponse.json({ error: "out_of_stock" }, { status: 409 });
  }

  const userId = (session.user as any).id as string;

  const order = await prisma.order.create({
    data: {
      userId,
      productId: product.id,
      priceCents: product.priceCents,
      currency: product.currency,
      status: "PAID", // TODO: set to PENDING and flip to PAID from a real payment webhook
    },
  });

  if (product.deliveryType === "key") {
    const licenseKey = await prisma.licenseKey.create({
      data: {
        code: generateKeyCode(),
        orderId: order.id,
        expiresAt: calculateExpiry(product.keyDurationDays),
      },
    });
    await prisma.order.update({ where: { id: order.id }, data: { status: "DELIVERED" } });
    if (product.stock > 0) {
      await prisma.product.update({ where: { id: product.id }, data: { stock: { decrement: 1 } } });
    }
    return NextResponse.json({ orderId: order.id, type: "key", key: licenseKey.code, expiresAt: licenseKey.expiresAt });
  }

  // file / link delivery — the URL was set by the admin on the product.
  await prisma.order.update({ where: { id: order.id }, data: { status: "DELIVERED" } });
  if (product.stock > 0) {
    await prisma.product.update({ where: { id: product.id }, data: { stock: { decrement: 1 } } });
  }
  return NextResponse.json({ orderId: order.id, type: product.deliveryType, url: product.fileUrl });
}
