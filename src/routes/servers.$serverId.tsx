import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  File as FileIcon,
  Folder,
  Play,
  RotateCw,
  Square,
  Terminal,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Field,
  Meter,
  Panel,
  StatusPill,
  btnGhost,
  btnPrimary,
  inputClass,
} from "@/components/ui-kit";
import { consoleLines, files, servers } from "@/lib/mock-data";

export const Route = createFileRoute("/servers/$serverId")({
  head: () => ({
    meta: [
      { title: "แผงจัดการบอท — Flexozy Bot Hosting" },
      { name: "description", content: "คอนโซล ไฟล์ และการตั้งค่าของเซิร์ฟเวอร์บอท Discord ของคุณ" },
      { property: "og:title", content: "แผงจัดการบอท — Flexozy Bot Hosting" },
      { property: "og:description", content: "คอนโซลเรียลไทม์ ตัวจัดการไฟล์ และการตั้งค่าบอท Discord" },
    ],
  }),
  component: ServerDetail,
});

const tabs = [
  { id: "console", label: "คอนโซล" },
  { id: "files", label: "ไฟล์" },
  { id: "settings", label: "ตั้งค่า" },
] as const;

function ServerDetail() {
  const { serverId } = Route.useParams();
  const server = servers.find((s) => s.id === serverId);
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("console");
  const [command, setCommand] = useState("");
  const [log, setLog] = useState<string[]>(consoleLines);

  if (!server) throw notFound();

  return (
    <AppShell
      title={server.name}
      subtitle={`${server.runtime} · ${server.region} · แพ็กเกจ ${server.plan}`}
      actions={
        <div className="hidden items-center gap-2 sm:flex">
          <button className={btnPrimary}>
            <Play className="h-4 w-4" /> เริ่ม
          </button>
          <button className={btnGhost}>
            <RotateCw className="h-4 w-4" /> รีสตาร์ท
          </button>
          <button className={btnGhost}>
            <Square className="h-4 w-4" /> หยุด
          </button>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="mb-5 flex gap-1 rounded-xl border border-border bg-card p-1">
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

          {tab === "console" ? (
            <Panel className="!p-0 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                <Terminal className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">คอนโซลเรียลไทม์</span>
                <span className="ml-auto">
                  <StatusPill status={server.status} />
                </span>
              </div>
              <div className="h-[420px] overflow-y-auto bg-secondary/40 px-5 py-4 font-mono text-xs leading-relaxed">
                {log.map((line, i) => (
                  <p key={`${line}-${i}`} className="whitespace-pre-wrap">
                    {line}
                  </p>
                ))}
              </div>
              <form
                className="flex gap-2 border-t border-border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!command.trim()) return;
                  setLog((l) => [...l, `[you] ${command}`]);
                  setCommand("");
                }}
              >
                <input
                  className={`${inputClass} font-mono`}
                  placeholder="พิมพ์คำสั่งแล้วกด Enter…"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                />
                <button className={btnPrimary} type="submit">
                  ส่ง
                </button>
              </form>
            </Panel>
          ) : null}

          {tab === "files" ? (
            <Panel className="!p-0 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                <span className="text-sm font-semibold">/home/container</span>
                <button className={`${btnGhost} ml-auto !py-2 !text-xs`}>
                  <Upload className="h-3.5 w-3.5" /> อัปโหลด
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">ชื่อ</th>
                    <th className="px-5 py-2.5 font-semibold">ขนาด</th>
                    <th className="px-5 py-2.5 font-semibold">แก้ไขล่าสุด</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.name} className="border-t border-border hover:bg-secondary/40">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2 font-medium">
                          {f.type === "folder" ? (
                            <Folder className="h-4 w-4 text-primary" />
                          ) : (
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                          {f.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{f.size}</td>
                      <td className="px-5 py-3 text-muted-foreground">{f.modified}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          ) : null}

          {tab === "settings" ? (
            <Panel>
              <h2 className="text-lg font-bold">ตั้งค่าเซิร์ฟเวอร์</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label="ชื่อบอท">
                  <input className={inputClass} defaultValue={server.name} />
                </Field>
                <Field label="คำสั่งเริ่มต้น">
                  <input className={inputClass} defaultValue="node index.js" />
                </Field>
                <Field label="Bot Token" hint="เก็บเข้ารหัส">
                  <input className={inputClass} type="password" defaultValue="tokentokentoken" />
                </Field>
                <Field label="Client ID">
                  <input className={inputClass} defaultValue="1284712994422915073" />
                </Field>
                <Field label="รันไทม์">
                  <select className={inputClass} defaultValue={server.runtime}>
                    <option>Node.js 20</option>
                    <option>Python 3.12</option>
                    <option>Java 21</option>
                  </select>
                </Field>
                <Field label="รีสตาร์ทอัตโนมัติเมื่อล่ม">
                  <select className={inputClass}>
                    <option>เปิด</option>
                    <option>ปิด</option>
                  </select>
                </Field>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button className={btnPrimary}>บันทึกการตั้งค่า</button>
                <button className={`${btnGhost} !text-destructive`}>ลบเซิร์ฟเวอร์นี้</button>
              </div>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-5">
          <Panel>
            <h2 className="font-bold">ทรัพยากร</h2>
            <div className="mt-4 space-y-4">
              <Meter label="CPU" value={server.cpu} max={100} unit="%" />
              <Meter label="RAM" value={server.ram} max={server.ramLimit} unit=" MB" />
              <Meter label="ดิสก์" value={server.disk} max={server.diskLimit} unit=" MB" />
            </div>
          </Panel>
          <Panel>
            <h2 className="font-bold">ข้อมูลเซิร์ฟเวอร์</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["สถานะ", null],
                ["อัปไทม์", server.uptime],
                ["โซน", server.region],
                ["เจ้าของ", `@${server.owner}`],
                ["Server ID", server.id],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-semibold">
                    {v === null ? <StatusPill status={server.status} /> : v}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
