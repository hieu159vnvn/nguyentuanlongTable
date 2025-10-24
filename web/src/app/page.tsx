"use client";
import { useEffect, useState } from 'react';
import { apiFallback } from '@/lib/api';

// Helper function to format minutes to hours and minutes
function formatMinutesToHoursMinutes(minutes: number | undefined | null): string {
  if (minutes === undefined || minutes === null || isNaN(minutes)) {
    return '0 phút';
  }
  
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  
  if (h === 0) {
    return `${m} phút`;
  } else if (m === 0) {
    return `${h}h`;
  } else {
    return `${h}h ${m} phút`;
  }
}

type Stats = {
  revenueToday: number;
  revenueMonth: number;
  totalMinutes: number;
  byDay: { day: string; revenue: number }[];
};

type InvoiceItem = {
  id: number;
  total?: number;
  createdAt?: string;
  attributes?: Record<string, unknown>;
};

type RentalItem = {
  id: number;
  minutes?: number;
  attributes?: Record<string, unknown>;
};

export default function Home() {
  const [stats, setStats] = useState<Stats>({ revenueToday: 0, revenueMonth: 0, totalMinutes: 0, byDay: [] });
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
        let inv = await apiFallback.getInvoices(`?filters[status][$ne]=cancelled&filters[createdAt][$gte]=${encodeURIComponent(startMonth)}&pagination[pageSize]=200`);
        console.log('Invoices response:', inv);
        
        // Fallback: try direct API call if fallback fails
        if (!inv || (!inv.data && !Array.isArray(inv))) {
          console.log('Fallback failed, trying direct API call...');
          try {
            const directInv = await fetch(`${base}/api/invoices?filters[status][$ne]=cancelled&filters[createdAt][$gte]=${encodeURIComponent(startMonth)}&pagination[pageSize]=200`, {
              headers: {
                'Content-Type': 'application/json',
                ...(authHeaders as Record<string, string>)
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
        const invItems = invItemsRaw.map((item: InvoiceItem)=> item?.attributes ? { id: item.id, ...item.attributes } : item);
        console.log('Processed invoices:', invItems);
        
        let revenueMonth = 0;
        let revenueToday = 0;
        const byDayMap = new Map<string, number>();
        
        // Process invoices
        invItems.forEach((i: InvoiceItem)=>{
          const total = Number(i?.total || 0);
          const created = new Date(i?.createdAt || '');
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
        
        // rentals total minutes (all time simple sum; adjust as needed)
        console.log('Fetching rentals...');
        let rent = await apiFallback.getRentals(`?fields=minutes&pagination[pageSize]=200`);
        console.log('Rentals response:', rent);
        
        // Fallback: try direct API call if fallback fails
        if (!rent || (!rent.data && !Array.isArray(rent))) {
          console.log('Rentals fallback failed, trying direct API call...');
          try {
            const directRent = await fetch(`${base}/api/rentals?fields=minutes&pagination[pageSize]=200`, {
              headers: {
                'Content-Type': 'application/json',
                ...(authHeaders as Record<string, string>)
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
        const rentItems = rentItemsRaw.map((item: RentalItem)=> item?.attributes ? { id: item.id, ...item.attributes } : item);
        const totalMinutes = rentItems.reduce((s: number, r: RentalItem)=> s + Number(r?.minutes || 0), 0);
        
        const byDay = Array.from(byDayMap.entries()).sort((a,b)=> a[0].localeCompare(b[0])).map(([day, revenue])=> ({ day, revenue }));
        console.log('Final stats:', { revenueToday, revenueMonth, totalMinutes, byDay });
        console.log('Days in month:', daysInMonth, 'Current month:', currentMonth + 1, 'Current year:', currentYear);
        console.log('Today:', new Date().toISOString().slice(0, 10));
        console.log('Revenue by day details:', byDay.map(d => ({ day: d.day, revenue: d.revenue })));
        console.log('Max revenue:', Math.max(...byDay.map(d => d.revenue)));
        
        setStats({ revenueToday, revenueMonth, totalMinutes, byDay });
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
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="border rounded p-3 sm:p-4 bg-white border shadow-[3px_6px] rounded-lg">
          <div className="text-xs sm:text-sm text-gray-600">Doanh thu hôm nay</div>
          <div className="text-lg sm:text-2xl font-semibold">
            {loading ? '...' : `${stats.revenueToday.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})} đ`}
          </div>
        </div>
        <div className="border rounded p-3 sm:p-4 bg-white border shadow-[3px_6px] rounded-lg">
          <div className="text-xs sm:text-sm text-gray-600">Doanh thu tháng</div>
          <div className="text-lg sm:text-2xl font-semibold">
            {loading ? '...' : `${stats.revenueMonth.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})} đ`}
          </div>
        </div>
        <div className="border rounded p-3 sm:p-4 bg-white border shadow-[3px_6px] rounded-lg">
          <div className="text-xs sm:text-sm text-gray-600">Tổng giờ thuê</div>
          <div className="text-lg sm:text-2xl font-semibold">
            {loading ? '...' : formatMinutesToHoursMinutes(stats.totalMinutes)}
          </div>
        </div>
      </div>

      <section className="border rounded p-3 sm:p-4 bg-white border shadow-[3px_6px] rounded-lg">
        <div className="mb-2 font-medium text-sm sm:text-base">Doanh thu theo ngày (tháng hiện tại)</div>
        
        {/* Chart Legend */}
        <div className="flex items-center gap-4 mb-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Ngày có doanh thu</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Hôm nay</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>Chưa có doanh thu</span>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-500">
            Đang tải dữ liệu...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <div className="space-y-2">
              {/* Max Revenue Info */}
              {stats.byDay.length > 0 && (
                <div className="text-xs text-gray-500 text-center">
                  Giá trị cao nhất: {Math.max(...stats.byDay.map(d => d.revenue)).toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})} đ
                </div>
              )}
              
              <div className="flex items-end gap-1 sm:gap-2 h-32 sm:h-40 overflow-x-auto border-b border-gray-200 pb-2">
                {stats.byDay.map((d)=> {
                  // Calculate max revenue for scaling
                  const maxRevenue = Math.max(...stats.byDay.map(b => b.revenue));
                  const minHeight = 4; // Minimum height in pixels for visibility
                  const maxHeight = 120; // Maximum height in pixels (h-32 = 128px, h-40 = 160px)
                  
                  // Calculate height percentage based on revenue
                  const heightPercentage = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                  const heightPixels = Math.max(minHeight, (heightPercentage / 100) * maxHeight);
                  
                  const isToday = d.day === new Date().toISOString().slice(0, 10);
                  const dateObj = new Date(d.day);
                  const dayName = dateObj.toLocaleDateString('vi-VN', { weekday: 'short' });
                  
                  return (
                    <div key={d.day} className="flex flex-col items-center justify-end min-w-[24px] sm:min-w-[32px] group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        <div className="font-medium">{d.day}</div>
                        <div>{d.revenue.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})} đ</div>
                        {isToday && <div className="text-green-300">Hôm nay</div>}
                      </div>
                      
                      <div 
                        className={`w-full rounded-t transition-all duration-200 ${
                          isToday ? 'bg-green-500' : d.revenue > 0 ? 'bg-blue-500' : 'bg-gray-300'
                        } group-hover:opacity-80`}
                        style={{height: `${heightPixels}px`}} 
                      />
                      <div className={`text-[8px] sm:text-[10px] mt-1 text-center ${
                        isToday ? 'font-bold text-green-600' : 'text-gray-600'
                      }`}>
                        {d.day.slice(8)}
                      </div>
                      <div className="text-[6px] sm:text-[8px] text-gray-400 text-center">
                        {dayName}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {stats.byDay.length === 0 && !loading && (
                <div className="text-gray-500 text-sm sm:text-base text-center py-4">Chưa có dữ liệu doanh thu.</div>
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
                      {d.revenue.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})} đ
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
