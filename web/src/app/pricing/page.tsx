import { api } from '@/lib/api';

export default async function PricingPage() {
  const [shortTerms, packages] = await Promise.all([
    api.getShortTerms(),
    api.getLongTermPackages()
  ]);

  const normalize = (res: any) => {
    const arr = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    return arr.map((item: any) => ({ id: item.id ?? item.documentId ?? Math.random(), ...(item.attributes ?? item) }));
  };

  const shortItems = normalize(shortTerms);
  const packageItems = normalize(packages);

  return (
    <div className="max-w-3xl mx-auto p-2 sm:p-4 lg:p-6 space-y-6 sm:space-y-8">
      <h1 className="text-xl sm:text-2xl font-semibold">Bảng giá</h1>

      <section>
        <h2 className="text-lg sm:text-xl font-medium mb-2 sm:mb-3">Thuê ngắn hạn</h2>
        <div className="grid gap-2 sm:gap-3">
          {shortItems.length === 0 ? (
            <div className="text-gray-500 text-sm sm:text-base">Chưa có cấu hình giá.</div>
          ) : shortItems.map((t: any) => (
            <div key={t.id} className="border rounded p-3 flex flex-col sm:flex-row sm:justify-between gap-2">
              <div>
                <div className="font-medium text-sm sm:text-base">{t.minHours} - {t.maxHours ?? '∞'} giờ</div>
              </div>
              <div className="font-semibold text-sm sm:text-base">{Number(t.pricePerHour).toLocaleString()} đ/giờ</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-medium mb-2 sm:mb-3">Gói dài hạn</h2>
        <div className="grid gap-2 sm:gap-3">
          {packageItems.length === 0 ? (
            <div className="text-gray-500 text-sm sm:text-base">Chưa có gói dài hạn.</div>
          ) : packageItems.map((p: any) => (
            <div key={p.id} className="border rounded p-3">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <div className="font-medium text-sm sm:text-base">{p.name}</div>
                <div className="font-semibold text-sm sm:text-base">{Number(p.price).toLocaleString()} đ</div>
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Tổng giờ: {p.totalHours}h, Tặng: {p.bonusHours}h</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


