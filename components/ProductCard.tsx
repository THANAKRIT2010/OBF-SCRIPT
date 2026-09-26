import Link from "next/link";
import Image from "next/image";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency }).format(cents / 100);
}

export default function ProductCard({ product }: { product: any }) {
  const outOfStock = product.stock === 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="block glass-card rounded-lg overflow-hidden hover:bg-white/[0.03] transition-colors group"
    >
      <div className="relative aspect-video border-b border-white/5">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center accent-text bg-white/[0.02]">
            <svg width="56" height="56" viewBox="0 0 256 256" fill="currentColor">
              <path d="M128,24A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm0-152a12,12,0,1,0,12,12A12,12,0,0,0,128,64Zm16,128a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,192Z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold mb-1 truncate">{product.name}</h3>
        <p className="text-sm text-white/50 mb-2">
          {outOfStock ? "สินค้าหมด" : product.stock > 0 ? `เหลือ ${product.stock} ชิ้น` : "มีสินค้าพร้อมส่ง"}
        </p>
        <p className="text-base font-semibold accent-text">
          {formatPrice(product.priceCents, product.currency)}
        </p>
      </div>
    </Link>
  );
}
