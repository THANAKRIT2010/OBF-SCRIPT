import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const title = "แพ็กเกจการใช้งาน — Flexozy";
const description = "เริ่มใช้ฟรี อัปเกรดเมื่อต้องการโทเคนและเควสไม่จำกัด";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "เริ่มต้น",
    price: "ฟรี",
    note: "เหมาะกับผู้ใช้คนเดียว",
    perks: ["โทเคน 2 ชุด", "เควส 20 รายการ", "แจ้งเตือนทาง DM", "ล็อกอินด้วย Discord"],
    featured: false,
  },
  {
    name: "โปร",
    price: "129฿ / เดือน",
    note: "ยอดนิยมสำหรับสายเควสจริงจัง",
    perks: [
      "โทเคนไม่จำกัด",
      "เควสไม่จำกัด",
      "แจ้งเตือนเข้าห้องที่กำหนดเอง",
      "รับเควสอัตโนมัติ",
      "ประวัติย้อนหลังเต็มรูปแบบ",
    ],
    featured: true,
  },
  {
    name: "ทีม",
    price: "349฿ / เดือน",
    note: "สำหรับกลุ่มหรือคอมมูนิตี้",
    perks: ["ทุกอย่างในแพ็กโปร", "สมาชิกหลายคน", "สรุปสถิติรวมของทีม", "ซัพพอร์ตแบบเร่งด่วน"],
    featured: false,
  },
];

function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-gradient-hero py-20 text-primary-foreground">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h1 className="text-4xl font-bold sm:text-5xl">แพ็กเกจที่เลือกได้</h1>
            <p className="mt-4 opacity-90">เริ่มฟรีได้ทันที ไม่ต้องใส่บัตร</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.featured
                    ? "relative border-primary/40 shadow-elevated lg:-mt-4"
                    : "border-border/70 shadow-soft"
                }
              >
                {plan.featured ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground">
                    แนะนำ
                  </span>
                ) : null}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="font-display text-3xl font-bold text-gradient-brand">{plan.price}</p>
                  <CardDescription>{plan.note}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 text-success" />
                        <span className="text-muted-foreground">{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant={plan.featured ? "hero" : "soft"} className="w-full" asChild>
                    <Link to="/login">เริ่มใช้งาน</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
