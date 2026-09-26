"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const user = session?.user as any;

  return (
    <header className="glass-card rounded-lg mb-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-stretch">
        <Link href="/" className="flex items-center gap-3 p-4 md:p-6">
          <span className="text-2xl font-bold">
            Flex<span className="accent-text">ozy</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3 px-4 pb-4 md:pb-0 md:pr-6 overflow-x-auto scrollbar-hide">
          <Link href="/" className="px-4 py-2 rounded-lg border border-white/5 text-sm font-medium bg-accent-500/10 accent-text whitespace-nowrap">
            หน้าแรก
          </Link>
          <Link href="/orders" className="px-4 py-2 rounded-lg border border-white/5 text-sm font-medium text-white/80 hover:bg-white/5 whitespace-nowrap">
            คำสั่งซื้อของฉัน
          </Link>
          {user?.isAdmin && (
            <Link href="/admin" className="px-4 py-2 rounded-lg border border-white/5 text-sm font-medium text-white/80 hover:bg-white/5 whitespace-nowrap">
              จัดการระบบ
            </Link>
          )}

          {!session ? (
            <button
              onClick={() => signIn("discord")}
              className="accent-btn px-4 py-2 rounded-lg text-sm whitespace-nowrap flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
              </svg>
              เข้าสู่ระบบด้วย Discord
            </button>
          ) : (
            <div className="relative">
              <button onClick={() => setOpen(!open)} className="flex items-center gap-2 pr-3">
                <Image src={user.avatar} alt={user.username} width={32} height={32} className="rounded-full" />
                <span className="text-sm font-medium hidden sm:block">{user.username}</span>
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-64 glass-card rounded-lg overflow-hidden z-50">
                  <div className="relative h-16 bg-black/40">
                    {user.banner && (
                      <Image src={user.banner} alt="" fill className="object-cover" />
                    )}
                  </div>
                  <div className="px-4 pb-4 -mt-8">
                    <Image src={user.avatar} alt={user.username} width={56} height={56} className="rounded-full border-4 border-[rgb(20,27,46)]" />
                    <p className="mt-2 font-semibold">{user.username}</p>
                    <div className="flex flex-col gap-1 mt-3">
                      <Link href="/profile" className="text-sm text-white/80 hover:text-white" onClick={() => setOpen(false)}>
                        ดูโปรไฟล์
                      </Link>
                      <button onClick={() => signOut()} className="text-sm text-left text-red-400 hover:text-red-300 mt-1">
                        ออกจากระบบ
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
