import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-gradient-soft">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-display text-base font-bold">Flexozy</span>
          </div>
          <p className="text-sm text-muted-foreground">
            ศูนย์ควบคุมเควสและระบบแจ้งเตือนบนเว็บ ใช้งานง่าย เข้าสู่ระบบด้วย Discord
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold">เมนู</p>
          <Link to="/" className="block text-muted-foreground hover:text-foreground">
            หน้าแรก
          </Link>
          <Link to="/features" className="block text-muted-foreground hover:text-foreground">
            ฟีเจอร์
          </Link>
          <Link to="/pricing" className="block text-muted-foreground hover:text-foreground">
            แพ็กเกจ
          </Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold">บัญชี</p>
          <Link to="/login" className="block text-muted-foreground hover:text-foreground">
            เข้าสู่ระบบ
          </Link>
          <Link to="/dashboard" className="block text-muted-foreground hover:text-foreground">
            แดชบอร์ด
          </Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold">ความปลอดภัย</p>
          <p className="text-muted-foreground">
            โทเคนถูกเก็บในฐานข้อมูลส่วนตัวของคุณ และแสดงผลแบบซ่อนบางส่วนเสมอ
          </p>
        </div>
      </div>

      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Flexozy. สร้างด้วยใจสำหรับสายเควส
      </div>
    </footer>
  );
}
