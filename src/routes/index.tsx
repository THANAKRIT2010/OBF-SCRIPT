import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, Cpu, Gauge, Rocket, ShieldCheck, Terminal } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Panel, btnPrimary, btnGhost } from "@/components/ui-kit";
import { plans } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flexozy — โฮสต์บอท Discord 24/7 ล็อกอินด้วย Discord" },
      {
        name: "description",
        content:
          "แผงควบคุมโฮสต์บอท Discord ของ Flexozy: เปิด-ปิดบอท ดูคอนโซลสด จัดการไฟล์ และแพ็กเกจ เริ่มต้นฟรี",
      },
      { property: "og:title", content: "Flexozy — โฮสต์บอท Discord 24/7" },
      {
        property: "og:description",
        content: "รันบอท Discord ตลอด 24 ชม. ล็อกอินด้วยบัญชี Discord จัดการทุกอย่างในที่เดียว",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Rocket, title: "ดีพลอยใน 30 วินาที", desc: "อัปโหลดโค้ดหรือเชื่อม GitHub แล้วบอทออนไลน์ทันที" },
  { icon: Terminal, title: "คอนโซลสด", desc: "ดู log แบบเรียลไทม์ พร้อมสั่งรีสตาร์ทได้ทันที" },
  { icon: Gauge, title: "อัปไทม์ 99.9%", desc: "โหนดในสิงคโปร์และแฟรงก์เฟิร์ต เลือกโซนใกล้ผู้ใช้" },
  { icon: Cpu, title: "ทรัพยากรยืดหยุ่น", desc: "ปรับ RAM และพื้นที่เก็บข้อมูลได้ทุกเมื่อ" },
  { icon: ShieldCheck, title: "ปลอดภัย", desc: "เก็บโทเคนแบบเข้ารหัส และแบ็กอัพอัตโนมัติรายวัน" },
  { icon: Activity, title: "มอนิเตอร์", desc: "กราฟ CPU/RAM และแจ้งเตือนเมื่อบอทล่ม" },
];

function Landing() {
  const { user, ready, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && user) navigate({ to: "/dashboard" });
  }, [ready, user, navigate]);

  const login = () => {
    signIn();
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <BrandMark />
          <div className="flex items-center gap-2">
            <a href="#plans" className={btnGhost}>
              แพ็กเกจ
            </a>
            <button onClick={login} className={btnPrimary}>
              เข้าสู่ระบบด้วย Discord
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-brand opacity-10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary">
              flexozy.online • โฮสต์บอทสำหรับคนไทย
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              รันบอท Discord ของคุณ
              <span className="block bg-brand bg-clip-text text-transparent">ตลอด 24 ชั่วโมง</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted-foreground">
              อัปโหลดโค้ด ตั้งค่าโทเคน แล้วกดเริ่ม — พร้อมคอนโซลสด จัดการไฟล์
              และระบบแพ็กเกจในแผงเดียว ล็อกอินด้วยบัญชี Discord ของคุณได้เลย
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={login} className={btnPrimary}>
                เริ่มใช้งานฟรี
              </button>
              <a href="#features" className={btnGhost}>
                ดูฟีเจอร์ทั้งหมด
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div>
                <p className="text-2xl font-bold text-foreground">1,284</p>
                <p>บอทที่ออนไลน์</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">99.9%</p>
                <p>อัปไทม์เฉลี่ย</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">38ms</p>
                <p>เวลาตอบสนอง</p>
              </div>
            </div>
          </div>

          <Panel className="p-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <p className="ml-2 text-xs font-medium text-muted-foreground">console — flexozy-music</p>
            </div>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-foreground/95 p-4 text-[11.5px] leading-relaxed text-emerald-200">
{`[06:12:01] Booting flexozy-runtime v2.4.1
[06:12:09] Dependencies installed in 7.1s
[06:12:10] Starting process: node index.js
[06:12:12] Logged in as Flexozy Music#4821
[06:12:13] Connected to 1,284 guilds
[06:20:30] Heartbeat OK — 38ms`}
            </pre>
          </Panel>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">ทุกอย่างที่บอทของคุณต้องใช้</h2>
        <p className="mt-2 text-muted-foreground">จัดการง่ายในหน้าเดียว ไม่ต้องยุ่งกับเซิร์ฟเวอร์เอง</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Panel key={f.title} className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-primary-foreground shadow-soft">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">แพ็กเกจราคาไทย</h2>
        <p className="mt-2 text-muted-foreground">เปลี่ยนหรือยกเลิกได้ทุกเมื่อ</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <Panel
              key={p.name}
              className={`p-6 ${p.highlighted ? "ring-2 ring-primary" : ""}`}
            >
              <p className="text-sm font-semibold text-primary">{p.name}</p>
              <p className="mt-2 text-3xl font-extrabold">
                ฿{p.price}
                <span className="text-sm font-medium text-muted-foreground"> /เดือน</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={login} className={`${p.highlighted ? btnPrimary : btnGhost} mt-6 w-full`}>
                เลือกแพ็กเกจนี้
              </button>
            </Panel>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <div className="flex flex-wrap gap-4">
            <Link to="/dashboard">แดชบอร์ด</Link>
            <Link to="/billing">แพ็กเกจ</Link>
            <Link to="/admin">แอดมิน</Link>
          </div>
          <p>© 2026 flexozy.online</p>
        </div>
      </footer>
    </div>
  );
}
