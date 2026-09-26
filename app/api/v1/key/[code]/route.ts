import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/v1/key/FLEXOZY-XXXX-XXXX-XXXX-XXXX
// Optional query params:
//   ?hwid=SOME_HARDWARE_ID   -> locks the key to that hwid on first check
// This is the endpoint your script/program calls on startup to check the key.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode || "").trim();
  const hwid = req.nextUrl.searchParams.get("hwid");

  if (!code) {
    return NextResponse.json({ valid: false, reason: "missing_code" }, { status: 400 });
  }

  const key = await prisma.licenseKey.findUnique({
    where: { code },
    include: { order: { include: { product: true } } },
  });

  if (!key) {
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
  }

  if (key.status === "REVOKED") {
    return NextResponse.json({ valid: false, reason: "revoked" }, { status: 403 });
  }

  const isExpired = key.expiresAt ? new Date() > key.expiresAt : false;
  if (isExpired || key.status === "EXPIRED") {
    if (key.status !== "EXPIRED") {
      await prisma.licenseKey.update({ where: { id: key.id }, data: { status: "EXPIRED" } });
    }
    return NextResponse.json({ valid: false, reason: "expired", expiresAt: key.expiresAt }, { status: 403 });
  }

  // HWID lock: first request binds the key to that hwid, later requests must match.
  if (hwid) {
    if (!key.hwid) {
      await prisma.licenseKey.update({ where: { id: key.id }, data: { hwid, lastUsedAt: new Date() } });
    } else if (key.hwid !== hwid) {
      return NextResponse.json({ valid: false, reason: "hwid_mismatch" }, { status: 403 });
    } else {
      await prisma.licenseKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    }
  } else {
    await prisma.licenseKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  }

  return NextResponse.json({
    valid: true,
    product: key.order.product.name,
    expiresAt: key.expiresAt, // null = lifetime
    createdAt: key.createdAt,
  });
}
