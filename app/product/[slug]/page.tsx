import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BuyButton from "@/components/BuyButton";

export const dynamic = "force-dynamic";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency }).format(cents / 100);
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product || !product.active) notFound();

  return (
    <div>
      <Link href="/" className="group inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition-colors duration-200">
        <svg
          width="14"
          height="14"
          viewBox="0 0 256 256"
          fill="currentColor"
          className="transition-transform duration-200 group-hover:-translate-x-1"
        >
          <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
        </svg>
        กลับไปหน้าสินค้าทั้งหมด
      </Link>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="relative aspect-video">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center accent-text bg-white/[0.02]">
              <svg width="72" height="72" viewBox="0 0 256 256" fill="currentColor">
                <path d="M128,24A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm0-152a12,12,0,1,0,12,12A12,12,0,0,0,128,64Zm16,128a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,192Z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
        <p className="text-2xl font-bold accent-text mb-4">{formatPrice(product.priceCents, product.currency)}</p>
        <p className="text-white/70 whitespace-pre-line mb-6">{product.description}</p>

        <div className="flex flex-wrap gap-2 mb-6 text-xs text-white/50">
          <span className="px-3 py-1 rounded-full border border-white/10">
            {product.deliveryType === "key"
              ? product.keyDurationDays
                ? `คีย์อายุ ${product.keyDurationDays} วัน`
                : "คีย์ตลอดชีพ"
              : product.deliveryType === "file"
              ? "ส่งมอบเป็นไฟล์"
              : "ส่งมอบเป็นลิงก์"}
          </span>
          <span className="px-3 py-1 rounded-full border border-white/10">
            {product.stock < 0 ? "สต็อกไม่จำกัด" : `เหลือ ${product.stock} ชิ้น`}
          </span>
        </div>

        <BuyButton productId={product.id} outOfStock={product.stock === 0} />
      </div>
    </div>
    </div>
  );
}
