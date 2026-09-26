"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function BuyButton({ productId, outOfStock }: { productId: string; outOfStock: boolean }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleBuy() {
    if (!session) {
      signIn("discord");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
      } else {
        setResult(data);
        router.refresh();
      }
    } catch (e) {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="glass-card-soft rounded-xl p-4 mt-4">
        <p className="text-sm text-white/70 mb-2">สั่งซื้อสำเร็จ! นี่คือสินค้าของคุณ:</p>
        {result.type === "key" ? (
          <code className="block accent-text font-mono text-sm break-all bg-black/30 rounded p-3">
            {result.key}
          </code>
        ) : (
          <a href={result.url} target="_blank" rel="noreferrer" className="accent-text underline break-all">
            {result.url}
          </a>
        )}
        <p className="text-xs text-white/40 mt-2">ดูรายการนี้ได้อีกครั้งที่หน้า &quot;คำสั่งซื้อของฉัน&quot;</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleBuy}
        disabled={loading || outOfStock}
        className="accent-btn px-6 py-3 rounded-xl w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {outOfStock ? "สินค้าหมด" : loading ? "กำลังดำเนินการ..." : session ? "ซื้อทันที" : "เข้าสู่ระบบเพื่อซื้อ"}
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      <p className="text-xs text-white/30 mt-2">
        * เดโมนี้ยังไม่ได้ผูกระบบชำระเงินจริง คำสั่งซื้อจะถูกส่งมอบทันที
      </p>
    </div>
  );
}
