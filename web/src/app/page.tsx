"use client";
import { useEffect, useState } from 'react';
import { apiFallback } from '@/lib/api';

type Stats = {
  revenueToday: number;
  revenueMonth: number;
  totalHours: number;
  byDay: { day: string; revenue: number }[];
};

export default function Home() {
  const [stats, setStats] = useState<Stats>({ revenueToday: 0, revenueMonth: 0, totalHours: 0, byDay: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        console.log('Loading dashboard stats...');
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
        const token = typeof document !== 'undefined' ? (document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1] || '') : '';
        const authHeaders = token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {};
        
        // invoices for current month
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        
        console.log('Fetching invoices from:', startMonth);
        const inv = await apiFallback.getInvoices(`?filters[status][$ne]=cancelled&filters[createdAt][$gte]=${encodeURIComponent(startMonth)}&pagination[pageSize]=200`);
        console.log('Invoices response:', inv);
        
        // Fallback: try direct API call if fallback fails
        if (!inv || (!inv.data && !Array.isArray(inv))) {
          console.log('Fallback failed, trying direct API call...');
          try {
            const directInv = await fetch(`${base}/api/invoices?filters[status][$ne]=cancelled&filters[createdAt][$gte]=${encodeURIComponent(startMonth)}&pagination[pageSize]=200`, {
              headers: {
                'Content-Type': 'application/json',
                ...authHeaders
              }
            });
            if (directInv.ok) {
              const directData = await directInv.json();
              console.log('Direct API response:', directData);
              inv = directData;
            }
          } catch (directError) {
            console.error('Direct API call also failed:', directError);
          }
        }
        
        const invItemsRaw = Array.isArray(inv?.data) ? inv.data : [];
        const invItems = invItemsRaw.map((item:any)=> item?.attributes ? { id: item.id, ...item.attributes } : item);
        console.log('Processed invoices:', invItems);
        
        let revenueMonth = 0;
        let revenueToday = 0;
        const byDayMap = new Map<string, number>();
        
        // Process invoices
        invItems.forEach((i:any)=>{
          const total = Number(i?.total || 0);
          const created = new Date(i?.createdAt);
          revenueMonth += total;
          if (created >= new Date(startToday)) revenueToday += total;
          const key = created.toISOString().slice(0,10);
          byDayMap.set(key, (byDayMap.get(key)||0) + total);
        });
        
        // Generate all days in current month for complete chart
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Fill missing days with 0 revenue
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (!byDayMap.has(dateStr)) {
            byDayMap.set(dateStr, 0);
          }
        }
        
        console.log('Revenue calculation:', { revenueToday, revenueMonth, byDayMap });
        
        // rentals total hours (all time simple sum; adjust as needed)
        console.log('Fetching rentals...');
        const rent = await apiFallback.getRentals(`?fields=hours&pagination[pageSize]=200`);
        console.log('Rentals response:', rent);
        
        // Fallback: try direct API call if fallback fails
        if (!rent || (!rent.data && !Array.isArray(rent))) {
          console.log('Rentals fallback failed, trying direct API call...');
          try {
            const directRent = await fetch(`${base}/api/rentals?fields=hours&pagination[pageSize]=200`, {
              headers: {
                'Content-Type': 'application/json',
                ...authHeaders
              }
            });
            if (directRent.ok) {
              const directData = await directRent.json();
              console.log('Direct rentals API response:', directData);
              rent = directData;
            }
          } catch (directError) {
            console.error('Direct rentals API call also failed:', directError);
          }
        }
        
        const rentItemsRaw = Array.isArray(rent?.data) ? rent.data : [];
        const rentItems = rentItemsRaw.map((item:any)=> item?.attributes ? { id: item.id, ...item.attributes } : item);
        const totalHours = rentItems.reduce((s:number, r:any)=> s + Number(r?.hours || 0), 0);
        
        const byDay = Array.from(byDayMap.entries()).sort((a,b)=> a[0].localeCompare(b[0])).map(([day, revenue])=> ({ day, revenue }));
        console.log('Final stats:', { revenueToday, revenueMonth, totalHours, byDay });
        console.log('Days in month:', daysInMonth, 'Current month:', currentMonth + 1, 'Current year:', currentYear);
        console.log('Today:', new Date().toISOString().slice(0, 10));
        
        setStats({ revenueToday, revenueMonth, totalHours, byDay });
        setError(null);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        setError('Không thể tải dữ liệu thống kê');
      } finally {
        setLoading(false);
      }
    }
    load().catch(console.error);
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold">Tổng quan</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="border rounded p-3 sm:p-4 bg-white">
          <div className="text-xs sm:text-sm text-gray-600">Doanh thu hôm nay</div>
          <div className="text-lg sm:text-2xl font-semibold">
            {loading ? '...' : `${stats.revenueToday.toLocaleString()} đ`}
          </div>
        </div>
        <div className="border rounded p-3 sm:p-4 bg-white">
          <div className="text-xs sm:text-sm text-gray-600">Doanh thu tháng</div>
          <div className="text-lg sm:text-2xl font-semibold">
            {loading ? '...' : `${stats.revenueMonth.toLocaleString()} đ`}
          </div>
        </div>
        <div className="border rounded p-3 sm:p-4 bg-white">
          <div className="text-xs sm:text-sm text-gray-600">Tổng giờ thuê</div>
          <div className="text-lg sm:text-2xl font-semibold">
            {loading ? '...' : `${stats.totalHours} h`}
          </div>
        </div>
      </div>

      <section className="border rounded p-3 sm:p-4 bg-white">
        <div className="mb-2 font-medium text-sm sm:text-base">Doanh thu theo ngày (tháng hiện tại)</div>
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-500">
            Đang tải dữ liệu...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <div className="flex items-end gap-1 sm:gap-2 h-32 sm:h-40 overflow-x-auto">
              {stats.byDay.map((d)=> {
                const max = Math.max(1, ...stats.byDay.map(b=>b.revenue));
                const height = Math.round((d.revenue / max) * 100);
                const isToday = d.day === new Date().toISOString().slice(0, 10);
                return (
                  <div key={d.day} className="flex flex-col items-center justify-end min-w-[24px] sm:min-w-[32px] group">
                    <div 
                      className={`w-full rounded-t min-h-[4px] transition-all duration-200 ${
                        isToday ? 'bg-green-500' : 'bg-blue-500'
                      } group-hover:opacity-80`}
                      style={{height: `${Math.max(height, 4)}%`}} 
                      title={`${d.day}: ${d.revenue.toLocaleString()} đ`} 
                    />
                    <div className={`text-[8px] sm:text-[10px] mt-1 text-center ${
                      isToday ? 'font-bold text-green-600' : 'text-gray-600'
                    }`}>
                      {d.day.slice(8)}
                    </div>
                  </div>
                );
              })}
              {stats.byDay.length === 0 && !loading && (
                <div className="text-gray-500 text-sm sm:text-base">Chưa có dữ liệu doanh thu.</div>
              )}
            </div>
            
            {/* Revenue Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {stats.byDay.filter(d => d.revenue > 0).map((d) => {
                const isToday = d.day === new Date().toISOString().slice(0, 10);
                return (
                  <div 
                    key={d.day} 
                    className={`p-2 sm:p-3 rounded border text-center ${
                      isToday 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className={`text-xs sm:text-sm font-medium ${
                      isToday ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {new Date(d.day).toLocaleDateString('vi-VN', { 
                        day: '2-digit', 
                        month: '2-digit' 
                      })}
                      {isToday && ' (Hôm nay)'}
                    </div>
                    <div className={`text-sm sm:text-base font-semibold ${
                      isToday ? 'text-green-800' : 'text-gray-800'
                    }`}>
                      {d.revenue.toLocaleString()} đ
                    </div>
                  </div>
                );
              })}
            </div>
            
            {stats.byDay.filter(d => d.revenue > 0).length === 0 && (
              <div className="text-center text-gray-500 text-sm sm:text-base py-4">
                Chưa có doanh thu trong tháng này
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
