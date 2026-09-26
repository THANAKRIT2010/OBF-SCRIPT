"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

const statusLabel: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  PAID: "ชำระเงินแล้ว",
  DELIVERED: "ส่งมอบแล้ว",
  CANCELLED: "ยกเลิก",
  REFUNDED: "คืนเงินแล้ว",
};

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading") return <p className="text-white/50 text-center py-20">กำลังโหลด...</p>;

  if (!session) {
    return (
      <div className="glass-card rounded-lg p-10 text-center">
        <p className="mb-4 text-white/70">กรุณาเข้าสู่ระบบเพื่อดูคำสั่งซื้อของคุณ</p>
        <button onClick={() => signIn("discord")} className="accent-btn px-6 py-3 rounded-lg">
          เข้าสู่ระบบด้วย Discord
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">คำสั่งซื้อของฉัน</h1>
      {loading ? (
        <p className="text-white/50">กำลังโหลด...</p>
      ) : orders.length === 0 ? (
        <div className="glass-card rounded-lg p-10 text-center text-white/50">ยังไม่มีคำสั่งซื้อ</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="glass-card rounded-lg p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold">{o.product.name}</p>
                <p className="text-xs text-white/40">{new Date(o.createdAt).toLocaleString("th-TH")}</p>
                {o.licenseKey && (
                  <code className="block mt-2 text-sm accent-text bg-black/30 rounded p-2 break-all">
                    {o.licenseKey.code}
                    {o.licenseKey.expiresAt && (
                      <span className="block text-white/40 text-xs mt-1">
                        หมดอายุ {new Date(o.licenseKey.expiresAt).toLocaleDateString("th-TH")}
                      </span>
                    )}
                  </code>
                )}
              </div>
              <span className="text-xs px-3 py-1 rounded-full border border-white/10 whitespace-nowrap h-fit">
                {statusLabel[o.status] || o.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
