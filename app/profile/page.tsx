"use client";

import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import Avatar from "@/components/Avatar";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p className="text-white/50 text-center py-20">กำลังโหลด...</p>;

  if (!session) {
    return (
      <div className="glass-card rounded-xl p-10 text-center">
        <p className="mb-4 text-white/70">กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์ของคุณ</p>
        <button onClick={() => signIn("discord")} className="accent-btn px-6 py-3 rounded-xl">
          เข้าสู่ระบบด้วย Discord
        </button>
      </div>
    );
  }

  const user = session.user as any;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="relative h-40 bg-black/40 overflow-hidden">
          {user.banner ? (
            <Image src={user.banner} alt="" fill className="object-cover" sizes="640px" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent-500/30 to-transparent" />
          )}
        </div>

        {/*
          Bug fix: the avatar previously lived inside the same flex row as
          the negative top-margin ("-mt-12"), so it was pulled up on top of
          the banner's own box. On narrower widths / long usernames that let
          the avatar, the letter-fallback circle, and the frame effect all
          paint in the same spot at once ("ภาพซ้อนกัน"). Giving the avatar
          its own row, sized only by the Avatar component itself, keeps
          exactly one avatar layer + one frame layer stacked, always in the
          same place.
        */}
        <div className="px-6 pb-6">
          <div className="-mt-12">
            <Avatar
              src={user.avatar}
              decorationUrl={user.avatarDecoration}
              username={user.username}
              size={96}
              ringClassName="border-4 border-[rgb(var(--card))]"
            />
          </div>

          <h1 className="text-2xl font-bold mt-4">{user.username}</h1>
          <p className="text-white/40 text-sm">Discord ID: {user.discordId}</p>
          {user.isAdmin && (
            <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full accent-btn">ผู้ดูแลระบบ</span>
          )}

          <div className="mt-6 pt-4 border-t border-white/5">
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Shortcut into the (separate) key-checking system */}
      <div className="glass-card-soft rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-semibold">ต้องการเช็คว่าคีย์เหลือกี่ชั่วโมง?</p>
          <p className="text-sm text-white/50">
            ระบบตรวจสอบคีย์แยกต่างหากจากหน้าคำสั่งซื้อ ใช้ลิงก์คีย์วางแล้วเช็คได้ทันที
          </p>
        </div>
        <Link href="/key" className="accent-btn px-4 py-2 rounded-xl text-sm whitespace-nowrap text-center">
          ไปหน้าตรวจสอบคีย์
        </Link>
      </div>
    </div>
  );
}
