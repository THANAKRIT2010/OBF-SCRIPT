import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bot,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Server,
  Shield,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BrandMark } from "@/components/BrandMark";

const nav = [
  { to: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { to: "/servers", label: "เซิร์ฟเวอร์บอท", icon: Server },
  { to: "/billing", label: "แพ็กเกจ & บิล", icon: CreditCard },
  { to: "/admin", label: "หลังบ้านแอดมิน", icon: Shield },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, ready, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/" });
  }, [ready, user, navigate]);

  useEffect(() => setOpen(false), [pathname]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 border-r border-sidebar-border bg-sidebar px-4 py-6 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <BrandMark />
            <button
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="ปิดเมนู"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-8 space-y-1">
            {nav.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand text-primary-foreground shadow-soft"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="h-4.5 w-4.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-sidebar-border bg-secondary/60 p-4">
            <p className="text-xs font-semibold text-secondary-foreground">แพ็กเกจปัจจุบัน</p>
            <p className="mt-1 text-lg font-bold text-brand">Pro</p>
            <p className="mt-1 text-xs text-muted-foreground">ต่ออายุ 1 ต.ค. 2026</p>
            <Link
              to="/billing"
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              จัดการแพ็กเกจ
            </Link>
          </div>

          <div className="absolute inset-x-4 bottom-6">
            <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border bg-card p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-primary-foreground">
                {user.globalName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.globalName}</p>
                <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
              </div>
              <button
                onClick={() => {
                  signOut();
                  navigate({ to: "/" });
                }}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                aria-label="ออกจากระบบ"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {open ? (
          <div
            className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        ) : null}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
            <div className="flex items-center gap-3 px-5 py-4 sm:px-8">
              <button
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="เปิดเมนู"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
                {subtitle ? (
                  <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">{actions}</div>
            </div>
          </header>

          <div className="px-5 py-6 sm:px-8 sm:py-8">{children}</div>

          <footer className="border-t border-border px-5 py-6 text-xs text-muted-foreground sm:px-8">
            <span className="inline-flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              flexozy.online — แผงควบคุมโฮสต์บอท Discord
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
