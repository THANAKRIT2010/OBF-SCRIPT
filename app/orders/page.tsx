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

// Bug fix: every status badge previously rendered with the same neutral
// style, making it impossible to tell PAID/DELIVERED apart from
// CANCELLED/REFUNDED at a glance.
const statusStyle: Record<string, string> = {
  PENDING: "border-yellow-500/30 text-yellow-300 bg-yellow-500/10",
  PAID: "border-accent-500/40 text-accent-500 bg-accent-500/10",
  DELIVERED: "border-emerald-500/30 text-emerald-300 bg-emerald-500/10",
  CANCELLED: "border-red-500/30 text-red-300 bg-red-500/10",
  REFUNDED: "border-white/20 text-white/60 bg-white/5",
};

function hoursRemainingLabel(expiresAt: string | null) {
  if (!expiresAt) return "ตลอดชีพ";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "หมดอายุแล้ว";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const hoursOnly = hours % 24;
  return days > 0 ? `เหลือ ${days} วัน ${hoursOnly} ชม.` : `เหลือ ${hours} ชม.`;
}

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
      <div className="glass-card rounded-xl p-10 text-center">
        <p className="mb-4 text-white/70">กรุณาเข้าสู่ระบบเพื่อดูคำสั่งซื้อของคุณ</p>
        <button onClick={() => signIn("discord")} className="accent-btn px-6 py-3 rounded-xl">
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
        <div className="glass-card rounded-xl p-10 text-center text-white/50">ยังไม่มีคำสั่งซื้อ</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="glass-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold">{o.product.name}</p>
                <p className="text-xs text-white/40">{new Date(o.createdAt).toLocaleString("th-TH")}</p>
                {o.licenseKey && (
                  <code className="block mt-2 text-sm accent-text bg-black/30 rounded p-2 break-all">
                    {o.licenseKey.code}
                    <span className="flex flex-wrap items-center gap-2 mt-1">
                      {o.licenseKey.expiresAt && (
                        <span className="text-white/40 text-xs">
                          หมดอายุ {new Date(o.licenseKey.expiresAt).toLocaleDateString("th-TH")}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          !o.licenseKey.expiresAt
                            ? "border-accent-500/40 text-accent-500 bg-accent-500/10"
                            : new Date(o.licenseKey.expiresAt).getTime() - Date.now() <= 0
                            ? "border-red-500/30 text-red-300 bg-red-500/10"
                            : "border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
                        }`}
                      >
                        {hoursRemainingLabel(o.licenseKey.expiresAt)}
                      </span>
                    </span>
                  </code>
                )}
              </div>
              <span
                className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap h-fit font-medium ${
                  statusStyle[o.status] || "border-white/10 text-white/70"
                }`}
              >
                {statusLabel[o.status] || o.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
