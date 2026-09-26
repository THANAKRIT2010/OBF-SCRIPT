"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";

const statuses = ["PENDING", "PAID", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/orders");
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  }

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user?.isAdmin]);

  async function updateStatus(id: string, newStatus: string) {
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  async function revokeKey(id: string) {
    if (!confirm("เพิกถอนคีย์นี้?")) return;
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revokeKey: true }),
    });
    load();
  }

  if (status === "loading") return <p className="text-white/50 text-center py-20">กำลังโหลด...</p>;
  if (!session) {
    return (
      <div className="glass-card rounded-xl p-10 text-center">
        <button onClick={() => signIn("discord")} className="accent-btn px-6 py-3 rounded-xl">เข้าสู่ระบบด้วย Discord</button>
      </div>
    );
  }
  if (!user.isAdmin) return <div className="glass-card rounded-xl p-10 text-center text-white/70">ไม่มีสิทธิ์เข้าถึง</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">คำสั่งซื้อทั้งหมด</h1>
      {loading ? (
        <p className="text-white/50">กำลังโหลด...</p>
      ) : orders.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center text-white/50">ยังไม่มีคำสั่งซื้อ</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="glass-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Image src={o.user.avatar} alt={o.user.username} width={36} height={36} className="rounded-full" />
                <div>
                  <p className="font-semibold text-sm">{o.user.username} → {o.product.name}</p>
                  <p className="text-xs text-white/40">{new Date(o.createdAt).toLocaleString("th-TH")} · {(o.priceCents / 100).toFixed(2)} {o.currency}</p>
                  {o.licenseKey && (
                    <code className="text-xs accent-text break-all">{o.licenseKey.code} ({o.licenseKey.status})</code>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs"
                >
                  {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {o.licenseKey && o.licenseKey.status === "ACTIVE" && (
                  <button onClick={() => revokeKey(o.id)} className="px-3 py-1.5 rounded-xl text-xs border border-red-500/30 text-red-400">
                    เพิกถอนคีย์
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
