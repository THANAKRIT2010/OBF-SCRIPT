import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/account.functions";

const links = [
  { to: "/", label: "หน้าแรก" },
  { to: "/features", label: "ฟีเจอร์" },
  { to: "/pricing", label: "แพ็กเกจ" },
  { to: "/dashboard", label: "แดชบอร์ด" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["session"],
    queryFn: () => getSessionUser(),
    staleTime: 30_000,
  });

  const user = data?.user ?? null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 glass-panel">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-soft">
            <Sparkles className="size-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Flexozy</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="outline" size="sm" asChild>
              <a href="/api/public/auth/logout">ออกจากระบบ</a>
            </Button>
          ) : (
            <Button variant="hero" size="sm" asChild className="hidden md:inline-flex">
              <Link to="/login">เข้าสู่ระบบ</Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="เมนู"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-border/70 bg-card px-4 py-3 md:hidden">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {!user ? (
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-lg bg-gradient-brand px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              เข้าสู่ระบบด้วย Discord
            </Link>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
