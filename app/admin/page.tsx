"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function AdminHome() {
  const { data: session, status } = useSession();
  const user = session?.user as any;

  if (status === "loading") return <p className="text-white/50 text-center py-20">กำลังโหลด...</p>;

  if (!session) {
    return (
      <div className="glass-card rounded-xl p-10 text-center">
        <p className="mb-4 text-white/70">กรุณาเข้าสู่ระบบ</p>
        <button onClick={() => signIn("discord")} className="accent-btn px-6 py-3 rounded-xl">
          เข้าสู่ระบบด้วย Discord
        </button>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="glass-card rounded-xl p-10 text-center text-white/70">
        บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้าจัดการระบบ
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">จัดการระบบ Flexozy</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/products" className="lift-card glass-card rounded-xl p-6 hover:bg-white/[0.03]">
          <h2 className="text-lg font-semibold mb-1">จัดการสินค้า</h2>
          <p className="text-sm text-white/50">เพิ่ม แก้ไข ลบสินค้า อัปโหลดไฟล์ ใส่ลิงก์ ตั้งอายุคีย์</p>
        </Link>
        <Link href="/admin/orders" className="lift-card glass-card rounded-xl p-6 hover:bg-white/[0.03]">
          <h2 className="text-lg font-semibold mb-1">จัดการคำสั่งซื้อ</h2>
          <p className="text-sm text-white/50">ดูประวัติการสั่งซื้อทั้งหมด เปลี่ยนสถานะ เพิกถอนคีย์</p>
        </Link>
      </div>
    </div>
  );
}
