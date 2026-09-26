"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

const emptyForm = {
  id: "",
  slug: "",
  name: "",
  description: "",
  priceCents: "",
  currency: "THB",
  imageUrl: "",
  deliveryType: "key",
  fileUrl: "",
  keyDurationDays: "",
  stock: "-1",
  active: true,
};

export default function AdminProductsPage() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/products");
    const data = await res.json();
    setProducts(data.products || []);
  }

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user?.isAdmin]);

  function startEdit(p?: any) {
    if (p) {
      setForm({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        priceCents: String(p.priceCents),
        currency: p.currency,
        imageUrl: p.imageUrl || "",
        deliveryType: p.deliveryType,
        fileUrl: p.fileUrl || "",
        keyDurationDays: p.keyDurationDays != null ? String(p.keyDurationDays) : "",
        stock: String(p.stock),
        active: p.active,
      });
    } else {
      setForm(emptyForm);
    }
    setEditing(true);
    setMsg("");
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      setForm((f: any) => ({ ...f, fileUrl: data.url }));
    } else {
      setMsg(data.error || "อัปโหลดล้มเหลว");
    }
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    const payload = {
      slug: form.slug,
      name: form.name,
      description: form.description,
      priceCents: Number(form.priceCents),
      currency: form.currency,
      imageUrl: form.imageUrl || null,
      deliveryType: form.deliveryType,
      fileUrl: form.fileUrl || null,
      keyDurationDays: form.keyDurationDays ? Number(form.keyDurationDays) : null,
      stock: Number(form.stock),
      active: form.active,
    };

    const res = form.id
      ? await fetch(`/api/admin/products/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || "บันทึกไม่สำเร็จ");
      return;
    }
    setEditing(false);
    setForm(emptyForm);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบสินค้านี้?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    load();
  }

  if (status === "loading") return <p className="text-white/50 text-center py-20">กำลังโหลด...</p>;
  if (!session) {
    return (
      <div className="glass-card rounded-xl p-10 text-center">
        <button onClick={() => signIn("discord")} className="accent-btn px-6 py-3 rounded-xl">
          เข้าสู่ระบบด้วย Discord
        </button>
      </div>
    );
  }
  if (!user.isAdmin) return <div className="glass-card rounded-xl p-10 text-center text-white/70">ไม่มีสิทธิ์เข้าถึง</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">จัดการสินค้า</h1>
        <button onClick={() => startEdit()} className="accent-btn px-4 py-2 rounded-xl text-sm">
          + เพิ่มสินค้า
        </button>
      </div>

      {editing && (
        <div className="glass-card rounded-xl p-6 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Slug (เช่น aimbot-pro)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2" />
            <input placeholder="ชื่อสินค้า" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2" />
          </div>
          <textarea placeholder="คำอธิบายสินค้า" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-full min-h-[100px]" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="ราคา (สตางค์ เช่น 9900 = 99.00)" type="number" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2" />
            <input placeholder="สกุลเงิน (THB)" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2" />
            <input placeholder="สต็อก (-1 = ไม่จำกัด)" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2" />
          </div>
          <input placeholder="URL รูปภาพสินค้า" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-full" />

          <div>
            <label className="text-sm text-white/60 block mb-1">รูปแบบการส่งมอบ</label>
            <select value={form.deliveryType} onChange={(e) => setForm({ ...form, deliveryType: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-full">
              <option value="key">คีย์ลิขสิทธิ์ (ออกอัตโนมัติ + ตรวจสอบผ่าน API)</option>
              <option value="file">ไฟล์ดาวน์โหลด (อัปโหลด)</option>
              <option value="link">ลิงก์ภายนอก</option>
            </select>
          </div>

          {form.deliveryType === "key" && (
            <input placeholder="อายุคีย์ (วัน) — เว้นว่าง = ตลอดชีพ" type="number" value={form.keyDurationDays} onChange={(e) => setForm({ ...form, keyDurationDays: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-full" />
          )}

          {(form.deliveryType === "file" || form.deliveryType === "link") && (
            <div className="space-y-2">
              <input placeholder={form.deliveryType === "link" ? "วางลิงก์ที่นี่" : "URL ไฟล์ (หรืออัปโหลดด้านล่าง)"} value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-full" />
              {form.deliveryType === "file" && (
                <div>
                  <input type="file" onChange={handleUpload} className="text-sm text-white/60" />
                  {uploading && <p className="text-xs text-white/40 mt-1">กำลังอัปโหลด...</p>}
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            แสดงสินค้านี้ในหน้าร้าน
          </label>

          {msg && <p className="text-red-400 text-sm">{msg}</p>}

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="accent-btn px-5 py-2 rounded-xl text-sm disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button onClick={() => { setEditing(false); setForm(emptyForm); }} className="px-5 py-2 rounded-xl text-sm border border-white/10 text-white/70">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{p.name} {!p.active && <span className="text-xs text-white/30">(ซ่อนอยู่)</span>}</p>
              <p className="text-xs text-white/40">/{p.slug} · {p.deliveryType} · {(p.priceCents / 100).toFixed(2)} {p.currency}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => startEdit(p)} className="px-3 py-1.5 rounded-xl text-xs border border-white/10 text-white/70">แก้ไข</button>
              <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 rounded-xl text-xs border border-red-500/30 text-red-400">ลบ</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
