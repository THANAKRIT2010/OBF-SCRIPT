import { createFileRoute } from "@tanstack/react-router";
import { Check, Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel, btnGhost, btnPrimary } from "@/components/ui-kit";
import { invoices, plans } from "@/lib/mock-data";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "แพ็กเกจ & ใบแจ้งหนี้ — Flexozy Bot Hosting" },
      { name: "description", content: "เลือกแพ็กเกจโฮสต์บอท Discord ดูใบแจ้งหนี้และประวัติการชำระเงินของคุณ" },
      { property: "og:title", content: "แพ็กเกจ & ใบแจ้งหนี้ — Flexozy Bot Hosting" },
      { property: "og:description", content: "แพ็กเกจโฮสต์บอท Discord เริ่มต้นฟรี พร้อมใบแจ้งหนี้ย้อนหลัง" },
    ],
  }),
  component: Billing,
});

function Billing() {
  return (
    <AppShell title="แพ็กเกจ & บิล" subtitle="จัดการแพ็กเกจและใบแจ้งหนี้ของคุณ">
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`panel relative p-6 ${p.highlighted ? "ring-2 ring-primary shadow-lift" : ""}`}
          >
            {p.highlighted ? (
              <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-primary-foreground">
                แนะนำ
              </span>
            ) : null}
            <h3 className="text-lg font-bold">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.tagline}</p>
            <p className="mt-4">
              <span className="text-4xl font-extrabold tracking-tight text-brand">฿{p.price}</span>
              <span className="text-sm text-muted-foreground"> / เดือน</span>
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            <button className={`${p.highlighted ? btnPrimary : btnGhost} mt-6 w-full`}>
              {p.name === "Pro" ? "แพ็กเกจปัจจุบัน" : "เลือกแพ็กเกจนี้"}
            </button>
          </div>
        ))}
      </div>

      <Panel className="mt-6 !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold">ใบแจ้งหนี้</h2>
          <button className={`${btnGhost} !py-2 !text-xs`}>
            <Download className="h-3.5 w-3.5" /> ดาวน์โหลดทั้งหมด
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-6 py-2.5 font-semibold">เลขที่</th>
                <th className="px-6 py-2.5 font-semibold">วันที่</th>
                <th className="px-6 py-2.5 font-semibold">แพ็กเกจ</th>
                <th className="px-6 py-2.5 font-semibold">ยอด</th>
                <th className="px-6 py-2.5 font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-6 py-3 font-mono text-xs font-semibold">{inv.id}</td>
                  <td className="px-6 py-3 text-muted-foreground">{inv.date}</td>
                  <td className="px-6 py-3">{inv.plan}</td>
                  <td className="px-6 py-3 font-semibold tabular-nums">{inv.amount}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        inv.status === "จ่ายแล้ว"
                          ? "bg-success/12 text-success"
                          : "bg-warning/15 text-warning"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
