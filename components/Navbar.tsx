"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "./LogoutButton";

const links = [
  { href: "/", label: "หน้าแรก" },
  { href: "/orders", label: "คำสั่งซื้อของฉัน" },
];

export default function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const user = session?.user as any;

  // Bug fix: the dropdown previously never closed on outside click,
  // and could stay open while navigating between pages.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const avatarSrc = user?.avatar || null;

  return (
    <header className="mb-4">
      {/* Top identity bar */}
      <div className="glass-card rounded-xl">
        <div className="flex items-center justify-between p-4 md:p-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl font-bold">
              Flex<span className="accent-text">ozy</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Secondary nav row — kept outside any overflow-clipping container
          so the account dropdown is never cut off (previous bug). */}
      <nav className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`nav-pill ${active ? "nav-pill-active" : "nav-pill-inactive"}`}
                >
                  {l.label}
                </Link>
              );
            })}
            {user?.isAdmin && (
              <Link
                href="/admin"
                className={`nav-pill ${pathname?.startsWith("/admin") ? "nav-pill-active" : "nav-pill-inactive"}`}
              >
                จัดการระบบ
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!session ? (
              <button
                onClick={() => signIn("discord")}
                className="accent-btn px-4 py-2 rounded-xl text-sm whitespace-nowrap flex items-center gap-2"
              >
                <svg className="hover-bounce" width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                </svg>
                <span className="hidden sm:inline">เข้าสู่ระบบด้วย Discord</span>
                <span className="sm:hidden">เข้าสู่ระบบ</span>
              </button>
            ) : (
              <div className="relative" ref={menuRef}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpen((v) => !v)}
                    className="flex items-center gap-2 glass-card-soft rounded-xl pl-2 pr-3 py-1.5 hover:bg-white/5 hover:-translate-y-0.5 hover:border-accent-500/30 transition-all duration-200"
                  >
                    {avatarSrc ? (
                      <Image src={avatarSrc} alt={user.username} width={28} height={28} className="rounded-full" />
                    ) : (
                      <div className="size-7 rounded-full accent-btn flex items-center justify-center text-xs font-bold">
                        {user.username?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <span className="text-sm font-medium hidden sm:block max-w-[8rem] truncate">
                      {user.username}
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 256 256"
                      fill="currentColor"
                      className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
                    >
                      <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
                    </svg>
                  </button>

                  {/* Always-visible red door logout button, as requested */}
                  <LogoutButton variant="icon" />
                </div>

                {open && (
                  <div className="absolute right-0 mt-2 w-64 glass-card rounded-xl overflow-hidden z-50 shadow-xl shadow-black/40 animate-[dropdown-in_0.18s_cubic-bezier(0.22,1,0.36,1)]">
                    <div className="relative h-16 bg-black/40">
                      {user.banner && <Image src={user.banner} alt="" fill className="object-cover" />}
                    </div>
                    <div className="px-4 pb-4 -mt-8">
                      {avatarSrc ? (
                        <Image
                          src={avatarSrc}
                          alt={user.username}
                          width={56}
                          height={56}
                          className="rounded-full border-4 border-[rgb(20,27,46)]"
                        />
                      ) : (
                        <div className="size-14 rounded-full border-4 border-[rgb(20,27,46)] accent-btn flex items-center justify-center font-bold">
                          {user.username?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <p className="mt-2 font-semibold truncate">{user.username}</p>
                      <div className="flex flex-col gap-1.5 mt-3">
                        <Link
                          href="/profile"
                          className="text-sm text-white/80 hover:text-white"
                          onClick={() => setOpen(false)}
                        >
                          ดูโปรไฟล์
                        </Link>
                        <div className="pt-2 mt-1 border-t border-white/5">
                          <LogoutButton variant="full" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
