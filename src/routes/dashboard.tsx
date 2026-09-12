import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Cpu, HardDrive, Server as ServerIcon, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Meter, Panel, StatCard, StatusPill, btnPrimary } from "@/components/ui-kit";
import { servers, consoleLines } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "แดชบอร์ด — Flexozy Bot Hosting" },
      { name: "description", content: "ภาพรวมเซิร์ฟเวอร์บอท Discord ทั้งหมดของคุณ ทรัพยากร สถานะ และกิจกรรมล่าสุด" },
      { property: "og:title", content: "แดชบอร์ด — Flexozy Bot Hosting" },
      { property: "og:description", content: "ภาพรวมเซิร์ฟเวอร์บอท Discord ทั้งหมดของคุณบน Flexozy" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const running = servers.filter((s) => s.status === "running").length;
  const totalRam = servers.reduce((a, s) => a + s.ram, 0);
  const totalDisk = servers.reduce((a, s) => a + s.disk, 0);

  return (
    <AppShell
      title="แดชบอร์ด"
      subtitle="ภาพรวมบอททั้งหมดของคุณบน flexozy.online"
      actions={
        <Link to="/servers" className={btnPrimary}>
          <Plus className="h-4 w-4" /> สร้างบอทใหม่
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="บอททั้งหมด" value={`${servers.length}`} hint={`ทำงานอยู่ ${running} ตัว`} icon={<ServerIcon className="h-5 w-5" />} />
        <StatCard label="CPU เฉลี่ย" value={`${Math.round(servers.reduce((a, s) => a + s.cpu, 0) / servers.length)}%`} hint="24 ชม. ล่าสุด" icon={<Cpu className="h-5 w-5" />} />
        <StatCard label="RAM ที่ใช้" value={`${(totalRam / 1024).toFixed(2)} GB`} hint="จากโควตา 5 GB" icon={<Activity className="h-5 w-5" />} />
        <StatCard label="พื้นที่ดิสก์" value={`${(totalDisk / 1024).toFixed(2)} GB`} hint="จากโควตา 26 GB" icon={<HardDrive className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">เซิร์ฟเวอร์ล่าสุด</h2>
            <Link to="/servers" className="text-sm font-semibold text-primary hover:underline">
              ดูทั้งหมด
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {servers.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                to="/servers/$serverId"
                params={{ serverId: s.id }}
                className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-secondary/60"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-sm font-bold text-primary-foreground">
                  {s.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.runtime} · {s.region}
                  </p>
                </div>
                <StatusPill status={s.status} />
              </Link>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-bold">ทรัพยากรรวม</h2>
          <div className="mt-5 space-y-5">
            <Meter label="RAM" value={Math.round(totalRam)} max={5120} unit=" MB" />
            <Meter label="ดิสก์" value={Math.round(totalDisk)} max={26624} unit=" MB" />
            <Meter label="CPU" value={49} max={400} unit="%" />
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <h2 className="text-lg font-bold">กิจกรรมล่าสุด</h2>
        <div className="mt-4 space-y-2 font-mono text-xs text-muted-foreground">
          {consoleLines.slice(0, 6).map((line) => (
            <p key={line} className="truncate">
              {line}
            </p>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
