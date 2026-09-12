import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Field, Meter, Panel, StatusPill, btnGhost, btnPrimary, inputClass } from "@/components/ui-kit";
import { servers } from "@/lib/mock-data";

export const Route = createFileRoute("/servers/")({
  head: () => ({
    meta: [
      { title: "เซิร์ฟเวอร์บอท — Flexozy Bot Hosting" },
      { name: "description", content: "จัดการเซิร์ฟเวอร์บอท Discord ของคุณ สร้างใหม่ ดูสถานะ และทรัพยากรที่ใช้งาน" },
      { property: "og:title", content: "เซิร์ฟเวอร์บอท — Flexozy Bot Hosting" },
      { property: "og:description", content: "จัดการและสร้างเซิร์ฟเวอร์บอท Discord ของคุณบน Flexozy" },
    ],
  }),
  component: ServersPage,
});

function ServersPage() {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const list = servers.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <AppShell
      title="เซิร์ฟเวอร์บอท"
      subtitle={`ทั้งหมด ${servers.length} เซิร์ฟเวอร์`}
      actions={
        <button className={btnPrimary} onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" /> สร้างบอทใหม่
        </button>
      }
    >
      {creating ? (
        <Panel className="mb-6">
          <h2 className="text-lg font-bold">สร้างเซิร์ฟเวอร์บอทใหม่</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            เลือกรันไทม์และทรัพยากร ระบบจะเตรียมคอนเทนเนอร์ให้อัตโนมัติ
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="ชื่อบอท">
              <input className={inputClass} placeholder="เช่น Flexozy Music" />
            </Field>
            <Field label="รันไทม์">
              <select className={inputClass}>
                <option>Node.js 20</option>
                <option>Python 3.12</option>
                <option>Java 21</option>
              </select>
            </Field>
            <Field label="แพ็กเกจ">
              <select className={inputClass}>
                <option>Free — RAM 512 MB</option>
                <option>Starter — RAM 1 GB</option>
                <option>Pro — RAM 2 GB</option>
              </select>
            </Field>
            <Field label="โซนเซิร์ฟเวอร์">
              <select className={inputClass}>
                <option>Singapore</option>
                <option>Frankfurt</option>
              </select>
            </Field>
            <Field label="Bot Token" hint="เก็บเข้ารหัสไว้เสมอ">
              <input className={inputClass} type="password" placeholder="••••••••••••••••" />
            </Field>
            <Field label="คำสั่งเริ่มต้น">
              <input className={inputClass} defaultValue="node index.js" />
            </Field>
          </div>
          <div className="mt-6 flex gap-2">
            <button className={btnPrimary}>ยืนยันสร้าง</button>
            <button className={btnGhost} onClick={() => setCreating(false)}>
              ยกเลิก
            </button>
          </div>
        </Panel>
      ) : null}

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={`${inputClass} pl-10`}
          placeholder="ค้นหาบอท…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {list.map((s) => (
          <Panel key={s.id}>
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-base font-bold text-primary-foreground">
                {s.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-bold">{s.name}</h3>
                  <StatusPill status={s.status} />
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{s.description}</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Meter label="RAM" value={s.ram} max={s.ramLimit} unit=" MB" />
              <Meter label="ดิสก์" value={s.disk} max={s.diskLimit} unit=" MB" />
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-secondary/60 p-3 text-center text-xs">
              <div>
                <dt className="text-muted-foreground">รันไทม์</dt>
                <dd className="mt-0.5 font-semibold">{s.runtime}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">อัปไทม์</dt>
                <dd className="mt-0.5 font-semibold">{s.uptime}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">แพ็กเกจ</dt>
                <dd className="mt-0.5 font-semibold">{s.plan}</dd>
              </div>
            </dl>

            <Link
              to="/servers/$serverId"
              params={{ serverId: s.id }}
              className={`${btnPrimary} mt-5 w-full`}
            >
              เปิดแผงจัดการ
            </Link>
          </Panel>
        ))}
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่พบบอทที่ค้นหา</p>
        ) : null}
      </div>
    </AppShell>
  );
}
