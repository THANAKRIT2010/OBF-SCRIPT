import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Server as ServerIcon, Settings2, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Field,
  Meter,
  Panel,
  StatCard,
  StatusPill,
  btnGhost,
  btnPrimary,
  inputClass,
} from "@/components/ui-kit";
import { adminNodes, adminUsers, servers } from "@/lib/mock-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "หลังบ้านแอดมิน — Flexozy Bot Hosting" },
      { name: "description", content: "จัดการผู้ใช้ เซิร์ฟเวอร์ โหนด และการตั้งค่าระบบของแพลตฟอร์มโฮสต์บอท" },
      { property: "og:title", content: "หลังบ้านแอดมิน — Flexozy Bot Hosting" },
      { property: "og:description", content: "แผงแอดมินสำหรับจัดการผู้ใช้ โหนด และการตั้งค่าระบบ" },
    ],
  }),
  component: AdminPage,
});

const tabs = [
  { id: "users", label: "ผู้ใช้" },
  { id: "servers", label: "เซิร์ฟเวอร์" },
  { id: "nodes", label: "โหนด" },
  { id: "settings", label: "ตั้งค่าระบบ" },
] as const;

function AdminPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("users");

  return (
    <AppShell title="หลังบ้านแอดมิน" subtitle="จัดการทุกอย่างของแพลตฟอร์ม flexozy.online">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ผู้ใช้ทั้งหมด" value={`${adminUsers.length}`} hint="+2 สัปดาห์นี้" icon={<Users className="h-5 w-5" />} />
        <StatCard label="เซิร์ฟเวอร์บอท" value="376" hint="ทำงานอยู่ 341" icon={<ServerIcon className="h-5 w-5" />} />
        <StatCard label="โหลดเฉลี่ยโหนด" value="64%" hint="3 โหนดออนไลน์" icon={<Activity className="h-5 w-5" />} />
        <StatCard label="รายได้เดือนนี้" value="฿48,320" hint="+12% จากเดือนก่อน" icon={<Settings2 className="h-5 w-5" />} />
      </div>

      <div className="my-6 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-brand text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <Panel className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-6 py-2.5 font-semibold">ผู้ใช้</th>
                  <th className="px-6 py-2.5 font-semibold">Discord</th>
                  <th className="px-6 py-2.5 font-semibold">สิทธิ์</th>
                  <th className="px-6 py-2.5 font-semibold">บอท</th>
                  <th className="px-6 py-2.5 font-semibold">แพ็กเกจ</th>
                  <th className="px-6 py-2.5 font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u) => (
                  <tr key={u.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-primary-foreground">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold">{u.name}</span>
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{u.discord}</td>
                    <td className="px-6 py-3">
                      <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 tabular-nums">{u.servers}</td>
                    <td className="px-6 py-3">{u.plan}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button className={`${btnGhost} !px-3 !py-1.5 !text-xs`}>แก้ไข</button>
                        <button className={`${btnGhost} !px-3 !py-1.5 !text-xs !text-destructive`}>
                          ระงับ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {tab === "servers" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {servers.map((s) => (
            <Panel key={s.id}>
              <div className="flex items-center gap-3">
                <h3 className="font-bold">{s.name}</h3>
                <StatusPill status={s.status} />
                <span className="ml-auto text-xs text-muted-foreground">@{s.owner}</span>
              </div>
              <div className="mt-4 space-y-3">
                <Meter label="CPU" value={s.cpu} max={100} unit="%" />
                <Meter label="RAM" value={s.ram} max={s.ramLimit} unit=" MB" />
              </div>
              <div className="mt-4 flex gap-2">
                <button className={`${btnGhost} !px-3 !py-1.5 !text-xs`}>รีสตาร์ท</button>
                <button className={`${btnGhost} !px-3 !py-1.5 !text-xs`}>ย้ายโหนด</button>
                <button className={`${btnGhost} !px-3 !py-1.5 !text-xs !text-destructive`}>ระงับ</button>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}

      {tab === "nodes" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {adminNodes.map((n) => (
            <Panel key={n.name}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{n.name}</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    n.status === "online" ? "bg-success/12 text-success" : "bg-warning/15 text-warning"
                  }`}
                >
                  {n.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {n.region} · {n.servers} เซิร์ฟเวอร์
              </p>
              <div className="mt-4">
                <Meter label="โหลด" value={n.load} max={100} unit="%" />
              </div>
            </Panel>
          ))}
        </div>
      ) : null}

      {tab === "settings" ? (
        <Panel>
          <h2 className="text-lg font-bold">ตั้งค่าระบบ</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="ชื่อแพลตฟอร์ม">
              <input className={inputClass} defaultValue="Flexozy" />
            </Field>
            <Field label="โดเมนหลัก">
              <input className={inputClass} defaultValue="flexozy.online" />
            </Field>
            <Field label="Discord Client ID">
              <input className={inputClass} placeholder="1234567890" />
            </Field>
            <Field label="Discord Client Secret">
              <input className={inputClass} type="password" placeholder="••••••••" />
            </Field>
            <Field label="OAuth Redirect URI">
              <input className={inputClass} defaultValue="https://flexozy.online/api/auth/discord/callback" />
            </Field>
            <Field label="Discord Guild ซัพพอร์ต">
              <input className={inputClass} placeholder="รหัสเซิร์ฟเวอร์ Discord" />
            </Field>
            <Field label="เปิดรับสมัครผู้ใช้ใหม่">
              <select className={inputClass}>
                <option>เปิด</option>
                <option>ปิดชั่วคราว</option>
              </select>
            </Field>
            <Field label="โควตาฟรีต่อผู้ใช้">
              <input className={inputClass} defaultValue="1 บอท / 512 MB" />
            </Field>
          </div>
          <div className="mt-6 flex gap-2">
            <button className={btnPrimary}>บันทึก</button>
            <button className={btnGhost}>รีเซ็ต</button>
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}
