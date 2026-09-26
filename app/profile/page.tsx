"use client";

import { useSession, signIn } from "next-auth/react";
import Image from "next/image";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p className="text-white/50 text-center py-20">กำลังโหลด...</p>;

  if (!session) {
    return (
      <div className="glass-card rounded-lg p-10 text-center">
        <p className="mb-4 text-white/70">กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์ของคุณ</p>
        <button onClick={() => signIn("discord")} className="accent-btn px-6 py-3 rounded-lg">
          เข้าสู่ระบบด้วย Discord
        </button>
      </div>
    );
  }

  const user = session.user as any;

  return (
    <div className="glass-card rounded-lg overflow-hidden max-w-xl mx-auto">
      <div className="relative h-40 bg-black/40">
        {user.banner ? (
          <Image src={user.banner} alt="" fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent-500/30 to-transparent" />
        )}
      </div>
      <div className="px-6 pb-6">
        <div className="-mt-12 flex items-end gap-4">
          <Image
            src={user.avatar}
            alt={user.username}
            width={96}
            height={96}
            className="rounded-full border-4 border-[rgb(20,27,46)]"
          />
        </div>
        <h1 className="text-2xl font-bold mt-4">{user.username}</h1>
        <p className="text-white/40 text-sm">Discord ID: {user.discordId}</p>
        {user.isAdmin && (
          <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full accent-btn">ผู้ดูแลระบบ</span>
        )}
      </div>
    </div>
  );
}
