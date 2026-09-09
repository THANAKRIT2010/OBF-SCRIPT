import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/account.functions";

const title = "เข้าสู่ระบบด้วย Discord — Flexozy";
const description = "ล็อกอินด้วยบัญชี Discord เพื่อจัดการโทเคน เควส และการแจ้งเตือนของคุณ";

const errorMessages: Record<string, string> = {
  not_configured: "ระบบยังไม่ได้ตั้งค่ากุญแจแอป Discord กรุณาติดต่อผู้ดูแล",
  cancelled: "คุณยกเลิกการเข้าสู่ระบบ",
  bad_state: "ลิงก์เข้าสู่ระบบหมดอายุ กรุณาลองใหม่",
  token_exchange: "แลกเปลี่ยนข้อมูลกับ Discord ไม่สำเร็จ",
  profile: "ดึงข้อมูลโปรไฟล์จาก Discord ไม่สำเร็จ",
  storage: "บันทึกข้อมูลผู้ใช้ไม่สำเร็จ",
};

type Search = { error?: string | undefined };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    error: typeof search["error"] === "string" ? search["error"] : undefined,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { error } = Route.useSearch();
  const { data } = useQuery({ queryKey: ["session"], queryFn: () => getSessionUser() });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-gradient-soft px-4 py-16">
        <Card className="w-full max-w-md border-border/70 shadow-elevated">
          <CardHeader className="text-center">
            <span className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground">
              <ShieldCheck className="size-6" />
            </span>
            <CardTitle className="text-2xl">เข้าสู่ระบบ</CardTitle>
            <CardDescription>
              ใช้บัญชี Discord ของคุณ ไม่ต้องตั้งรหัสผ่านใหม่
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <p className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {errorMessages[error] ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่"}
              </p>
            ) : null}

            {data?.user ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  คุณเข้าสู่ระบบอยู่แล้วในชื่อ{" "}
                  <span className="font-semibold text-foreground">
                    {data.user.globalName ?? data.user.username}
                  </span>
                </p>
                <Button variant="hero" size="lg" className="w-full" asChild>
                  <Link to="/dashboard">ไปที่แดชบอร์ด</Link>
                </Button>
              </div>
            ) : (
              <Button variant="discord" size="xl" className="w-full" asChild>
                <a href="/api/public/auth/discord/login">เข้าสู่ระบบด้วย Discord</a>
              </Button>
            )}

            {data && !data.discordConfigured ? (
              <p className="rounded-xl bg-secondary p-3 text-center text-xs text-muted-foreground">
                ยังไม่ได้ใส่กุญแจแอป Discord ระบบล็อกอินจะยังใช้งานไม่ได้จนกว่าจะตั้งค่าเสร็จ
              </p>
            ) : null}

            <p className="text-center text-xs text-muted-foreground">
              เราขอเพียงชื่อผู้ใช้และรูปโปรไฟล์เท่านั้น ไม่เข้าถึงข้อความของคุณ
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
