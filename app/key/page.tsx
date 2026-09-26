"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Public key-checking system. Deliberately separate from /orders:
 * - /orders shows what a *logged-in user bought* (purchase history).
 * - /key checks a *key code itself* — anyone with the key link can check
 *   how many hours it has left, logged in or not, same as the script/program
 *   that calls GET /api/v1/key/{code} on startup.
 */

// Accepts either a bare code (FLEXOZY-XXXX-XXXX-XXXX-XXXX) or a full
// check-link (e.g. https://flexozy.online/key/FLEXOZY-XXXX-...) and pulls
// just the code out of it.
function extractCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const parts = trimmed.split("/").filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1]);
}

export default function KeyCheckPage() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = extractCode(value);
    if (!code) return;
    router.push(`/key/${encodeURIComponent(code)}`);
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="glass-card rounded-xl p-8 md:p-10 text-center">
        <h1 className="text-2xl font-bold mb-2">ตรวจสอบคีย์</h1>
        <p className="text-white/60 text-sm mb-6">
          วางคีย์ หรือลิงก์ตรวจสอบคีย์ที่ได้รับ เพื่อดูว่าคีย์เหลืออายุใช้งานอีกกี่ชั่วโมง
          <br />
          ระบบนี้แยกจากระบบคำสั่งซื้อ — ไม่ต้องเข้าสู่ระบบก็ตรวจสอบได้
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="FLEXOZY-XXXX-XXXX-XXXX-XXXX"
            className="flex-1 glass-card-soft rounded-xl px-4 py-3 text-sm placeholder:text-white/30"
            autoFocus
          />
          <button type="submit" className="accent-btn px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap">
            ตรวจสอบ
          </button>
        </form>
      </div>
    </div>
  );
}
