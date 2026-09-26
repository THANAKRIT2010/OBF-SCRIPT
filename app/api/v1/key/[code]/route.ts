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

  // Compute how much time is left on the key, in hours (what the calling
  // script/program is expected to display to the user).
  let hoursRemaining: number | null = null; // null = lifetime key, never expires
  let minutesRemaining: number | null = null;
  let remainingLabel = "ตลอดชีพ";

  if (key.expiresAt) {
    const msLeft = Math.max(0, key.expiresAt.getTime() - Date.now());
    hoursRemaining = Math.floor(msLeft / (1000 * 60 * 60));
    minutesRemaining = Math.floor(msLeft / (1000 * 60));

    const days = Math.floor(hoursRemaining / 24);
    const hoursOnly = hoursRemaining % 24;
    remainingLabel =
      days > 0 ? `เหลือ ${days} วัน ${hoursOnly} ชั่วโมง` : `เหลือ ${hoursRemaining} ชั่วโมง`;
  }

  return NextResponse.json({
    valid: true,
    product: key.order.product.name,
    expiresAt: key.expiresAt, // null = lifetime
    createdAt: key.createdAt,
    hoursRemaining, // null = lifetime, otherwise whole hours left until expiresAt
    minutesRemaining, // same, in minutes, for finer-grained display
    remainingLabel, // ready-to-display Thai string, e.g. "เหลือ 2 วัน 5 ชั่วโมง"
  });
}
