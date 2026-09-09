import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bell, KeyRound, ListChecks, ShieldCheck, Zap } from "lucide-react";

import heroImage from "@/assets/hero-dashboard.jpg";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const title = "Flexozy — ศูนย์ควบคุมเควสบนเว็บ ล็อกอินด้วย Discord";
const description =
  "จัดการโทเคน ติดตามเควส และตั้งค่าการแจ้งเตือนทั้งหมดจากหน้าเว็บเดียว เข้าสู่ระบบด้วยบัญชี Discord ได้ทันที";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

const highlights = [
  {
    icon: KeyRound,
    title: "คลังโทเคน",
    body: "เก็บและสลับโทเคนหลายชุดได้ในคลิกเดียว พร้อมซ่อนค่าจริงเสมอ",
  },
  {
    icon: ListChecks,
    title: "ติดตามเควส",
    body: "ดูสถานะและความคืบหน้าของทุกเควสแบบเห็นภาพรวมทันที",
  },
  {
    icon: Bell,
    title: "แจ้งเตือนอัตโนมัติ",
    body: "เลือกรับแจ้งเตือนทาง DM หรือห้องที่กำหนดเอง",
  },
  {
    icon: ShieldCheck,
    title: "ปลอดภัยรายบุคคล",
    body: "ข้อมูลผูกกับบัญชี Discord ของคุณเท่านั้น",
  },
];

const steps = [
  { step: "1", title: "เข้าสู่ระบบด้วย Discord", body: "กดปุ่มเดียว ไม่ต้องสมัครใหม่ ไม่ต้องจำรหัสผ่าน" },
  { step: "2", title: "เพิ่มโทเคนและเควส", body: "ตั้งชื่อกำกับให้จำง่าย เปิด-ปิดการใช้งานได้ตลอด" },
  { step: "3", title: "ดูผลบนแดชบอร์ด", body: "ความคืบหน้า สถานะ และการแจ้งเตือน รวมอยู่ในหน้าเดียว" },
];

function Index() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(60%_60%_at_80%_10%,oklch(0.8_0.12_220/0.5),transparent)]" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1 text-xs font-medium">
                <Zap className="size-3.5" />
                ระบบเควสของคุณ ย้ายขึ้นเว็บแล้ว
              </span>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                ควบคุมทุกเควส
                <br />
                จากหน้าเว็บเดียว
              </h1>
              <p className="max-w-lg text-base opacity-90 sm:text-lg">
                Flexozy รวมโทเคน เควส และการแจ้งเตือนไว้ในแดชบอร์ดที่อ่านง่าย
                เข้าสู่ระบบด้วยบัญชี Discord ของคุณได้เลย
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="xl" variant="discord" asChild>
                  <Link to="/login">
                    เริ่มใช้งานฟรี
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  asChild
                  className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                >
                  <Link to="/features">ดูฟีเจอร์ทั้งหมด</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <img
                src={heroImage}
                alt="ตัวอย่างหน้าแดชบอร์ดติดตามเควสโทนสีน้ำเงิน"
                width={1600}
                height={1008}
                className="w-full rounded-3xl border border-white/15 shadow-glow"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <Card key={item.title} className="border-border/70 shadow-soft">
                <CardHeader>
                  <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <item.icon className="size-5" />
                  </span>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.body}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-gradient-soft py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold">เริ่มต้นใน 3 ขั้นตอน</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-gradient-brand font-display text-lg font-bold text-primary-foreground">
                    {item.step}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="rounded-3xl bg-gradient-hero px-8 py-14 text-center text-primary-foreground shadow-elevated">
            <h2 className="text-3xl font-bold">พร้อมเริ่มแล้วใช่ไหม</h2>
            <p className="mx-auto mt-3 max-w-xl opacity-90">
              เข้าสู่ระบบด้วย Discord แล้วเริ่มจัดการเควสของคุณได้ทันที ไม่มีค่าใช้จ่าย
            </p>
            <Button size="xl" variant="discord" className="mt-7" asChild>
              <Link to="/login">เข้าสู่ระบบด้วย Discord</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
