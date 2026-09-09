import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Clock,
  Gauge,
  KeyRound,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const title = "ฟีเจอร์ทั้งหมด — Flexozy";
const description =
  "จัดการโทเคน ติดตามเควส ตั้งเวลาแจ้งเตือน และดูสถานะระบบทั้งหมดจากหน้าเว็บเดียว";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: FeaturesPage,
});

const features = [
  {
    icon: KeyRound,
    title: "คลังโทเคนส่วนตัว",
    body: "เก็บโทเคนหลายชุด ตั้งชื่อกำกับ เปิด-ปิดการใช้งานได้ทันที และแสดงผลแบบซ่อนบางส่วนเสมอ",
  },
  {
    icon: ListChecks,
    title: "ตารางเควสแบบเรียลไทม์",
    body: "เพิ่มเควส อัปเดตความคืบหน้าเป็นเปอร์เซ็นต์ และดูสถานะรอ/กำลังทำ/สำเร็จได้ในที่เดียว",
  },
  {
    icon: Bell,
    title: "แจ้งเตือนที่ปรับได้",
    body: "เลือกแจ้งเตือนทาง DM หรือระบุห้องแจ้งเตือนเอง พร้อมเปิด-ปิดการรับเควสอัตโนมัติ",
  },
  {
    icon: Clock,
    title: "โซนเวลาไทย",
    body: "ตั้งค่าโซนเวลาเป็น Asia/Bangkok เป็นค่าเริ่มต้น เวลาหมดอายุเควสจึงตรงกับเวลาจริง",
  },
  {
    icon: ShieldCheck,
    title: "ล็อกอินด้วย Discord",
    body: "ยืนยันตัวตนผ่าน Discord โดยตรง ข้อมูลทุกชิ้นผูกกับบัญชีของคุณเท่านั้น",
  },
  {
    icon: Gauge,
    title: "ภาพรวมสรุป",
    body: "การ์ดสรุปจำนวนโทเคนที่เปิดใช้ เควสที่กำลังทำ และเควสที่สำเร็จแล้ว",
  },
  {
    icon: RefreshCw,
    title: "อัปเดตทันที",
    body: "ทุกการแก้ไขบันทึกลงระบบหลังบ้านและรีเฟรชหน้าจอให้อัตโนมัติ",
  },
  {
    icon: Users,
    title: "ใช้ได้หลายบัญชี",
    body: "แต่ละคนที่ล็อกอินจะเห็นเฉพาะข้อมูลของตัวเอง แยกขาดจากผู้ใช้คนอื่น",
  },
];

function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-gradient-hero py-20 text-primary-foreground">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h1 className="text-4xl font-bold sm:text-5xl">ฟีเจอร์ทั้งหมด</h1>
            <p className="mt-4 text-base opacity-90">
              ย้ายทุกอย่างจากหน้าจอคำสั่งมาไว้บนเว็บที่ดูง่ายและสวยงาม
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="h-full border-border/70 shadow-soft">
                <CardHeader>
                  <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <feature.icon className="size-5" />
                  </span>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.body}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
