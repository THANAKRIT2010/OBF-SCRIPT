import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <section className="glass-card rounded-lg p-8 md:p-12 mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Flex<span className="accent-text">ozy</span>
        </h1>
        <p className="text-white/60 max-w-xl mx-auto">
          สคริปต์ โปรแกรม และคีย์ลิขสิทธิ์คุณภาพ ส่งไวอัตโนมัติ ใช้งานได้จริงผ่านระบบตรวจสอบคีย์ของเรา
        </p>
      </section>

      {products.length === 0 ? (
        <div className="glass-card rounded-lg p-12 text-center text-white/50">
          ยังไม่มีสินค้าในขณะนี้
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
