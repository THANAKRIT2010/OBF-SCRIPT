"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type KeyResult = {
  valid: boolean;
  reason?: string;
  product?: string;
  expiresAt?: string | null;
  createdAt?: string;
  hoursRemaining?: number | null;
  minutesRemaining?: number | null;
  remainingLabel?: string;
};

const reasonLabel: Record<string, string> = {
  missing_code: "ไม่พบรหัสคีย์",
  not_found: "ไม่พบคีย์นี้ในระบบ",
  revoked: "คีย์นี้ถูกระงับการใช้งาน",
  expired: "คีย์นี้หมดอายุแล้ว",
  hwid_mismatch: "คีย์นี้ถูกผูกกับเครื่องอื่นแล้ว",
};

export default function KeyStatusPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code || "");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<KeyResult | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError(false);
    fetch(`/api/v1/key/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((d) => setResult(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="glass-card rounded-xl p-8 md:p-10 text-center">
        <p className="text-xs uppercase tracking-wider text-white/40 mb-1">ระบบตรวจสอบคีย์</p>
        <code className="block text-sm accent-text bg-black/30 rounded-lg px-3 py-2 mb-6 break-all">{code}</code>

        {loading ? (
          <p className="text-white/50 py-8">กำลังตรวจสอบ...</p>
        ) : error ? (
          <p className="text-red-300 py-8">เกิดข้อผิดพลาด ลองใหม่อีกครั้ง</p>
        ) : result?.valid ? (
          <div>
            <div className="size-16 mx-auto rounded-full accent-btn flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 256 256" fill="currentColor">
                <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z" />
              </svg>
            </div>
            <p className="text-2xl font-bold accent-text mb-1">{result.remainingLabel}</p>
            {result.product && <p className="text-white/60 text-sm mb-6">สินค้า: {result.product}</p>}

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="glass-card-soft rounded-xl p-4">
                <p className="text-xs text-white/40 mb-1">สถานะ</p>
                <p className="font-semibold text-emerald-300">ใช้งานได้</p>
              </div>
              <div className="glass-card-soft rounded-xl p-4">
                <p className="text-xs text-white/40 mb-1">วันหมดอายุ</p>
                <p className="font-semibold">
                  {result.expiresAt ? new Date(result.expiresAt).toLocaleString("th-TH") : "ตลอดชีพ"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="size-16 mx-auto rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" className="text-red-300">
                <line x1="200" y1="56" x2="56" y2="200" />
                <line x1="200" y1="200" x2="56" y2="56" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-red-300 mb-1">
              {reasonLabel[result?.reason || ""] || "คีย์นี้ใช้งานไม่ได้"}
            </p>
            {result?.expiresAt && (
              <p className="text-white/40 text-sm">
                หมดอายุเมื่อ {new Date(result.expiresAt).toLocaleString("th-TH")}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="text-center">
        <Link href="/key" className="text-sm text-white/50 hover:text-white transition-colors">
          ← ตรวจสอบคีย์อื่น
        </Link>
      </div>
    </div>
  );
}
