"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Image from 'next/image';
import AlertModal from '@/components/AlertModal';
import { useAlert } from '@/hooks/useAlert';
import html2canvas from "html2canvas";

type Accessory = { id: number; name: string; price: number };
type Customer = { id: number; name: string; customerCode: string; phone?: string; remainingMinutes: number };

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

export default function BookingPage() {
  const { alert, success, error, hideAlert } = useAlert();
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<{accessoryId:number; quantity:number}[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [tables, setTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showTableInfoModal, setShowTableInfoModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [pricingResult, setPricingResult] = useState<any>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [purchasedPackage, setPurchasedPackage] = useState<any>(null);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    const searchLower = customerSearchTerm.toLowerCase();
    return customer.name.toLowerCase().includes(searchLower) || 
           (customer.phone && customer.phone.includes(searchLower));
  });

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearchTerm(`${customer.name} ${customer.phone ? `(${customer.phone})` : ''}`);
    setShowCustomerDropdown(false);
  };

  // Handle search input change
  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearchTerm(value);
    setShowCustomerDropdown(true);
    if (!value) {
      setSelectedCustomerId('');
    }
  };

  useEffect(() => {
    async function load() {
      // load table statuses
      try {
        setLoadingTables(true);
        const status = await api.getTablesStatus();
        setTables(Array.isArray(status) ? status : status?.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTables(false);
      }
      
      // load customers
      try {
        const customerData = await api.getCustomers('?pagination[pageSize]=200');
        const customerItems = Array.isArray(customerData?.data) ? customerData.data : [];
        const normalizedCustomers: Customer[] = customerItems.map((c: any) => ({
          id: c.id ?? c.documentId ?? Math.random(),
          name: c.attributes?.name ?? c.name ?? '',
          customerCode: c.attributes?.customerCode ?? c.customerCode ?? '',
          phone: c.attributes?.phone ?? c.phone ?? '',
          remainingMinutes: Number(c.attributes?.remainingMinutes ?? c.remainingMinutes ?? 0)
        }));
        setCustomers(normalizedCustomers);
      } catch (e) {
        console.error('Error loading customers:', e);
      }
      
      const data = await api.getLongTermPackages();
      const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      const normalizedPackages = items.map((it: any) => ({
        id: it.id ?? it.documentId ?? Math.random(),
        name: it.attributes?.name ?? it.name,
        price: Number((it.attributes?.price ?? it.price) || 0),
        totalHours: Number((it.attributes?.totalHours ?? it.totalHours) || 0),
        bonusHours: Number((it.attributes?.bonusHours ?? it.bonusHours) || 0)
      }));
      setPackages(normalizedPackages);
      // accessories via REST: /api/accessories
      const accRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}/api/accessories`, { cache: 'no-store' });
      const acc = await accRes.json();
      const accItems = Array.isArray(acc?.data) ? acc.data : [];
      const normalized: Accessory[] = accItems.map((it: any) => ({
        id: it.id,
        name: it.attributes?.name || it.name || 'N/A',
        price: Number(it.attributes?.price || it.price || 0)
      }));
      setAccessories(normalized);
    }
    load().catch(console.error);
  }, []);

  function toggleAccessory(id: number) {
    const exists = selectedAccessories.find(a => a.accessoryId === id);
    if (exists) {
      setSelectedAccessories(prev => prev.filter(a => a.accessoryId !== id));
    } else {
      setSelectedAccessories(prev => [...prev, { accessoryId: id, quantity: 1 }]);
    }
  }

  function setAccessoryQty(id: number, qty: number) {
    setSelectedAccessories(prev => prev.map(a => a.accessoryId === id ? { ...a, quantity: qty } : a));
  }

  function resetRentalForm() {
    setSelectedCustomerId('');
    setCustomerSearchTerm('');
    setShowCustomerDropdown(false);
    setSelectedPackage(null);
    setSelectedAccessories([]);
    setDiscount(0);
    setPricingResult(null);
  }

  function closeRentalModal() {
    setShowRentalModal(false);
    setSelectedTable(null);
    resetRentalForm();
  }

  return (
    <div className="max-w-5xl mx-auto p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* <h1 className="text-xl sm:text-2xl font-semibold">Quản lý bàn</h1> */}

      <section className="space-y-2 sm:space-y-3">
        <div className="text-xl sm:text-xl font-bold">Danh sách bàn</div>
        {loadingTables ? (
          <div className="text-sm sm:text-base">Đang tải...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {tables.map((t:any)=> (
              <button key={t.id} className={`rounded flex flex-col items-center justify-center p-3  border shadow-[3px_6px_rgb(35,157,20)] rounded-lg text-left ${t.status==='free' ? 'bg-green-100 border-green-300 hover:bg-green-200' : 'bg-yellow-100 shadow-[3px_6px_rgb(175,155,17)] border-yellow-300 hover:bg-yellow-200'}`} onClick={()=>{
                setSelectedTable(t);
                if (t.status === 'free') {
                  setShowRentalModal(true);
                } else {
                  setShowTableInfoModal(true);
                }
              }}>
                <Image src="/images/table.png" alt="Bàn" className="w-10 h-10" width={40} height={40} unoptimized />
                <div className="font-bold text-lg">{t.name || t.code}</div>
                <div className="text-sm">{t.status==='free' ? 'Trống' : 'Đang cho thuê'}</div>
              </button>
            ))}
          </div>
        )}
      </section>


      {/* Rental Modal */}
      {showRentalModal && selectedTable && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Thuê bàn: {selectedTable.name || selectedTable.code}</h2>
                <button 
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={closeRentalModal}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="grid gap-3 sm:gap-4">
                  <div className="block">
                    <span className="text-sm font-medium">Chọn khách hàng *</span>
                    <div className="relative">
                      <input
                        type="text"
                        className="border rounded px-3 py-2 w-full text-sm sm:text-base"
                        placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
                        value={customerSearchTerm}
                        onChange={(e) => handleCustomerSearchChange(e.target.value)}
                        onFocus={() => setShowCustomerDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                      />
                      
                      {/* Dropdown results */}
                      {showCustomerDropdown && customerSearchTerm && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(customer => (
                              <div
                                key={customer.id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-gray-600 text-xs">
                                  {customer.phone && `${customer.phone} • `}
                                  Còn {formatMinutesToHoursMinutes(customer.remainingMinutes)}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-gray-500 text-sm">
                              Không tìm thấy khách hàng
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {selectedCustomerId && (
                      <div className="text-xs text-gray-600 mt-1">
                        Khách hàng: {customers.find(c => c.id === selectedCustomerId)?.name} - 
                        Giờ còn lại: {formatMinutesToHoursMinutes(customers.find(c => c.id === selectedCustomerId)?.remainingMinutes || 0)}
                      </div>
                    )}
                  </div>
                  
                  
                  <div>
                    <span className="text-sm font-bold block mb-2">Mua thêm gói (tùy chọn)</span>
                    <div className="grid grid-cols-2 gap-2">
                      {packages.map((p:any)=> (
                        <button
                          key={p.id}
                          className={`px-3 py-2 border rounded text-sm ${selectedPackage === p.id ? 'bg-[#00203FFF] text-white border-[#00203FFF]' : 'hover:bg-gray-50'}`}
                          onClick={() => setSelectedPackage(selectedPackage === p.id ? null : p.id)}
                        >
                          {p.name} - {p.price.toLocaleString()}đ
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm mb-2 sm:mb-3 font-bold">Phụ kiện (tùy chọn)</div>
                    <div className="space-y-2 max-h-60 sm:max-h-60 overflow-y-auto">
                      {accessories.map(a => {
                        const checked = selectedAccessories.find(s => s.accessoryId === a.id);
                        return (
                          <div key={a.id} className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50">
                            <input 
                              type="checkbox" 
                              id={`accessory-${a.id}`}
                              checked={!!checked} 
                              onChange={()=>toggleAccessory(a.id)}
                              className="w-4 h-4"
                            />
                            <label htmlFor={`accessory-${a.id}`} className="flex-1 cursor-pointer">
                              <div className="font-medium text-sm">{a.name}</div>
                              <div className="text-xs text-gray-600">{a.price.toLocaleString()}đ</div>
                            </label>
                            {checked && (
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600">Số lượng:</label>
                                <input 
                                  type="number" 
                                  min={1} 
                                  max={99}
                                  className="border rounded px-2 py-1 w-16 text-sm" 
                                  value={checked.quantity} 
                                  onChange={e=>setAccessoryQty(a.id, Number(e.target.value))}
                                />
                                <div className="text-xs text-blue-600 min-w-0">
                                  = {(a.price * checked.quantity).toLocaleString()}đ
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {selectedAccessories.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <div className="font-medium mb-2">Tổng phụ kiện đã chọn:</div>
                        {selectedAccessories.map(acc => {
                          const accessory = accessories.find(a => a.id === acc.accessoryId);
                          return (
                            <div key={acc.accessoryId} className="flex justify-between text-xs mb-1">
                              <span>{accessory?.name} x {acc.quantity}</span>
                              <span>{(accessory?.price || 0) * acc.quantity}đ</span>
                            </div>
                          );
                        })}
                        <div className="border-t pt-2 mt-2 font-medium">
                          Tổng: {selectedAccessories.reduce((sum, acc) => {
                            const accessory = accessories.find(a => a.id === acc.accessoryId);
                            return sum + ((accessory?.price || 0) * acc.quantity);
                          }, 0).toLocaleString()}đ
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button className="px-4 py-2 bg-[#00203FFF] text-white rounded hover:bg-[#001a33] text-sm sm:text-base" onClick={async ()=>{
                    if (!selectedCustomerId) return error('Vui lòng chọn khách hàng');
                    
                    try {
                      // Bắt đầu thuê bàn - sẽ tính tiền theo thời gian thực
                      const payload: any = { 
                        customerId: selectedCustomerId, 
                        accessories: selectedAccessories
                      };
                      const res = await api.startShortOnTable(selectedTable.id, payload);
                      success(`Đã bắt đầu thuê tại bàn ${selectedTable.name || selectedTable.code}. Hệ thống sẽ tự động tính tiền theo thời gian sử dụng.`);
                      
                      // Nếu có mua gói thêm
                      if (selectedPackage) {
                        const selectedPkg = packages.find(p => p.id === selectedPackage);
                        const packagePayload: any = { 
                          customerId: selectedCustomerId, 
                          packageId: selectedPackage
                        };
                        await api.purchasePackageOnly(packagePayload);
                        setPurchasedPackage(selectedPkg); // Lưu thông tin gói
                        success('Đã mua thêm gói cho khách hàng. Hóa đơn sẽ được tạo khi settle table.');
                      }
                      
                      // Refresh table status
                      try {
                        const status = await api.getTablesStatus();
                        setTables(Array.isArray(status) ? status : status?.data || []);
                      } catch {}
                      closeRentalModal();
                    } catch (err) {
                      console.error('Error starting rental:', err);
                      error('Lỗi khi bắt đầu thuê bàn');
                    }
                  }}>Bắt đầu thuê</button>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Info Modal */}
      {showTableInfoModal && selectedTable && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Thông tin bàn: {selectedTable.name || selectedTable.code}</h2>
                <button
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={() => {
                    setShowTableInfoModal(false);
                    setSelectedTable(null);
                  }}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Thông tin khách hàng */}
                <div className="bg-blue-50 p-3 rounded">
                  <div className="font-medium text-blue-800 mb-2">Thông tin khách hàng</div>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Tên:</span> {selectedTable?.rental?.customer?.name || 'N/A'}</div>
                    <div><span className="font-medium">Mã KH:</span> {selectedTable?.rental?.customer?.customerCode || 'N/A'}</div>
                    <div><span className="font-medium">SĐT:</span> {selectedTable?.rental?.customer?.phone || 'Chưa có'}</div>
                    <div><span className="font-medium">Giờ còn lại:</span> {formatMinutesToHoursMinutes(selectedTable?.rental?.customer?.remainingMinutes || 0)}</div>
                  </div>
                </div>

                {/* Thông tin thời gian thuê */}
                <div className="bg-green-50 p-3 rounded">
                  <div className="font-medium text-green-800 mb-2">Thông tin thuê</div>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Bắt đầu:</span> {new Date(selectedTable?.rental?.startAt).toLocaleString()}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Thời gian đã thuê:</span> 
                      <ElapsedTime startIso={selectedTable?.rental?.startAt} />
                    </div>
                    <div><span className="font-medium">Loại thuê:</span> {selectedTable?.rental?.type === 'short' ? 'Theo giờ' : 'Gói dài hạn'}</div>
                  </div>
                </div>

                {/* Phụ kiện đang thuê */}
                {selectedTable?.rental?.rentalAccessories && selectedTable.rental.rentalAccessories.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded">
                    <div className="font-medium text-yellow-800 mb-2">Phụ kiện đang thuê</div>
                    <div className="text-sm space-y-1">
                      {selectedTable.rental.rentalAccessories.map((ra: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>{ra.accessory?.name || 'N/A'}</span>
                          <span>{ra.quantity}x {ra.unitPrice?.toLocaleString()}đ = {ra.totalPrice?.toLocaleString()}đ</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  💡 Hệ thống sẽ tự động tính tiền theo thời gian sử dụng thực tế
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                  <button 
                    className="px-4 py-2 bg-[#00203FFF] text-white rounded hover:bg-[#001a33] text-sm sm:text-base" 
                    onClick={async ()=>{
                      try {
                        if (!selectedTable?.rental?.customer?.id) {
                          error('Không tìm thấy thông tin khách hàng');
                          return;
                        }
                        
                        if (!selectedTable?.rental?.id) {
                          error('Không tìm thấy thông tin rental');
                          return;
                        }
                        
                        // Tính tiền trước khi settle
                        const pricingData = await api.calculateRentalPricing({
                          customerId: selectedTable.rental.customer.id,
                          rentalId: selectedTable.rental.id
                        });
                        
                        setPricingResult(pricingData);
                        setShowTableInfoModal(false);
                        setShowPricingModal(true);
                      } catch (err) {
                        console.error('Error calculating pricing:', err);
                        error('Lỗi tính tiền: ' + (err as Error).message);
                      }
                    }}
                  >
                    Tính tiền
                  </button>
                  <button 
                    className="px-4 py-1 border rounded hover:bg-gray-100"
                    onClick={() => {
                      setShowTableInfoModal(false);
                      setSelectedTable(null);
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricingModal && pricingResult && (
              <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                <div className="bg-white rounded-lg max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Tạm tính tiền</h2>
                      <button
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                        onClick={() => {
                          setShowPricingModal(false);
                          setPricingResult(null);
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="font-bold mb-2">Thông tin khách hàng</div>
                        <div className="text-sm">
                          <div><span className="font-medium">Tên:</span> {selectedTable?.rental?.customer?.name}</div>
                          <div><span className="font-medium">Mã KH:</span> {selectedTable?.rental?.customer?.customerCode}</div>
                          <div><span className="font-medium">SĐT:</span> {selectedTable?.rental?.customer?.phone || 'Chưa có'}</div>
                          <div><span className="font-medium">Giờ còn lại:</span> {formatMinutesToHoursMinutes(selectedTable?.rental?.customer?.remainingMinutes || 0)}</div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded">
                        <div className="font-bold mb-2">Thông tin thuê</div>
                        <div className="text-sm">
                          <div><span className="font-medium">Bàn:</span> {selectedTable?.name || selectedTable?.code}</div>
                          <div><span className="font-medium">Bắt đầu:</span> {new Date(selectedTable?.rental?.startAt).toLocaleString()}</div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Thời gian đã thuê:</span> 
                            <ElapsedTime startIso={selectedTable?.rental?.startAt} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Thời gian thuê thực tế:</span>
                          <span>{formatMinutesToHoursMinutes(pricingResult?.minutes || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thời gian còn lại trong gói:</span>
                          <span>{formatMinutesToHoursMinutes(pricingResult?.remainingMinutes || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thời gian sử dụng từ gói:</span>
                          <span>{formatMinutesToHoursMinutes(pricingResult?.usedPackageMinutes || 0)}</span>
                        </div>
                        {pricingResult?.paidMinutes > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span>Thời gian phải trả tiền:</span>
                              <span>{formatMinutesToHoursMinutes(pricingResult.paidMinutes)} ({pricingResult.minuteRate?.toFixed(0) == 833 ? "50,000" : "45,000"}đ/giờ)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tiền thuê:</span>
                              <span>{pricingResult.rentalCost?.toLocaleString('en-US', {
        minimumFractionDigits: 0, // không hiển thị phần thập phân
        maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
      })}đ</span>
                            </div>
                          </>
                        )}
                        {pricingResult?.paidMinutes === 0 && (
                          <div className="text-green-600 text-sm">✓ Sử dụng hoàn toàn từ gói (miễn phí)</div>
                        )}
                        
                        {pricingResult?.accessories?.length > 0 && (
                          <div>
                            <div className="font-medium mb-1">Phụ kiện:</div>
                            {pricingResult.accessories.map((acc: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm ml-2">
                                <span>{acc.name}: {acc.quantity} x {acc.unitPrice.toLocaleString()}</span>
                                <span>{acc.total.toLocaleString()}đ</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-medium">
                              <span>Tổng phụ kiện:</span>
                              <span>{pricingResult.accessoriesTotal?.toLocaleString()}đ</span>
                            </div>
                          </div>
                        )}
                        {
                          purchasedPackage?.name && (
                            <div className="flex justify-between">
                              <span>Gói:</span>
                              <span>{purchasedPackage.name}</span>
                              <span>{purchasedPackage.price.toLocaleString()}đ</span>
                            </div>
                          )
                        }
                        <div className="flex justify-between">
                          <span>Tạm tính:</span>
                          <span>{pricingResult?.subtotal?.toLocaleString('en-US', {
        minimumFractionDigits: 0, // không hiển thị phần thập phân
        maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
      })}đ</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-sm">Giảm giá:</label>
                          <input
                            type="number"
                            min="0"
                            className="border rounded px-3 py-2 w-24 text-sm"
                            value={discount}
                            onChange={(e) => setDiscount(Number(e.target.value))}
                          />
                          <span className="text-sm">đ</span>
                        </div>
                        
                        <div className="flex justify-between font-semibold text-lg border-t pt-2">
                          <span>Tổng cộng:</span>
                          <span>{((pricingResult?.subtotal || 0) - discount).toLocaleString('en-US', {
        minimumFractionDigits: 0, // không hiển thị phần thập phân
        maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
      })}đ</span>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button 
                          className="px-4 py-2 bg-[#00203FFF] text-white rounded hover:bg-[#001a33]"
                          onClick={async () => {
                            try {
                              // Tính tiền và cập nhật trạng thái bàn
                              const settleResult = await api.settleTable(selectedTable.id, discount);
                              
                              // Tạo hóa đơn với dữ liệu từ settle
                              const invoiceData = {
                                code: settleResult?.invoice?.code || `INV-${Date.now()}`,
                                customer: selectedTable?.rental?.customer,
                                rental: {
                                  hours: settleResult?.breakdown?.hours || 0,
                                  minutes: settleResult?.breakdown?.minutes || 0,
                                  accessories: settleResult?.breakdown?.accessories || [],
                                  rentalCost: settleResult?.breakdown?.rentalCost || 0,
                                  subtotal: settleResult?.breakdown?.subtotal || 0,
                                  discount: discount,
                                  total: (settleResult?.breakdown?.total || 0)
                                },
                                package: settleResult?.breakdown?.package ? {
                                  name: settleResult.breakdown.package.name,
                                  price: settleResult.breakdown.packageTotal || 0,
                                  totalHours: settleResult.breakdown.package.totalHours,
                                  bonusHours: settleResult.breakdown.package.bonusHours
                                } : null,
                                serviceDetails: {
                                  rental: {
                                    type: 'short',
                                    minutes: settleResult?.breakdown?.minutes || 0,
                                    hours: settleResult?.breakdown?.hours || 0,
                                    startAt: selectedTable?.rental?.startAt,
                                    endAt: new Date().toISOString(),
                                    cost: settleResult?.breakdown?.rentalCost || 0
                                  },
                                  accessories: settleResult?.breakdown?.accessories || [],
                                  package: settleResult?.breakdown?.package ? {
                                    name: settleResult.breakdown.package.name,
                                    totalHours: settleResult.breakdown.package.totalHours,
                                    bonusHours: settleResult.breakdown.package.bonusHours,
                                    price: settleResult.breakdown.packageTotal || 0
                                  } : null,
                                  pricing: {
                                    rentalCost: settleResult?.breakdown?.rentalCost || 0,
                                    accessoriesTotal: settleResult?.breakdown?.accessoriesTotal || 0,
                                    packageTotal: settleResult?.breakdown?.packageTotal || 0,
                                    subtotal: settleResult?.breakdown?.subtotal || 0,
                                    discount: discount,
                                    total: settleResult?.breakdown?.total || 0
                                  }
                                },
                                bankInfo: settleResult?.bank || await api.getBankInfo()
                              };
                              
                              setInvoiceData(invoiceData);
                              setShowPricingModal(false);
                              setShowInvoiceModal(true);
                              
                              // Refresh table status
                              try {
                                const status = await api.getTablesStatus();
                                setTables(Array.isArray(status) ? status : status?.data || []);
                              } catch {}
                              
                              success(`Đã tính tiền thành công! Tổng: ${settleResult?.breakdown?.total?.toLocaleString()}đ`);
                            } catch (err) {
                              console.error('Error creating invoice:', err);
                              error('Lỗi khi tạo hóa đơn: ' + (err as Error).message);
      
                            }
                          }}
                        >
                          Tạo hóa đơn
                        </button>
                        <button 
                          className="px-4 py-2 border rounded hover:bg-gray-100"
                          onClick={() => {
                            setShowPricingModal(false);
                            setPricingResult(null);
                            setShowTableInfoModal(true);
                          }}
                        >
                          Quay lại
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
      )}
      {/* Invoice Modal */}
      {showInvoiceModal && invoiceData && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setInvoiceData(null);
                    setShowRentalModal(false);
                    setSelectedTable(null);
                    resetRentalForm();
                  }}
                >
                  ×
                </button>
              </div>

              <div id="invoice-content" className="space-y-4" style={{ backgroundColor: 'white', color: 'black', fontFamily: 'Arial, sans-serif', padding: '24px' }}>
                {/* Header */}
                <div className="text-center border-b pb-4" style={{ borderBottom: '2px solid #000' }}>
                  <h1 className="text-2xl font-bold" style={{ fontSize: '24px', fontWeight: 'bold', color: '#000' }}>HÓA ĐƠN THUÊ BÀN</h1>
                  <p className="text-sm text-gray-600" style={{ fontSize: '12px', color: '#666' }}>Mã hóa đơn: {invoiceData?.code || `INV-${Date.now()}`}</p>
                  <p className="text-sm text-gray-600" style={{ fontSize: '12px', color: '#666' }}>Ngày: {new Date().toLocaleDateString('vi-VN')}</p>
                </div>

                {/* Customer Info */}
                  <div>
                    <h3 className="font-semibold mb-2">Thông tin khách hàng:</h3>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Tên:</span> {invoiceData.customer?.name}</div>
                      <div><span className="font-medium">Mã KH:</span> {invoiceData.customer?.customerCode}</div>
                      <div><span className="font-medium">SĐT:</span> {invoiceData.customer?.phone || 'Chưa có'}</div>
                      <div><span className="font-medium">Giờ còn lại:</span> {formatMinutesToHoursMinutes(selectedTable?.rental?.customer?.remainingMinutes || 0)}</div>

                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Thông tin thuê:</h3>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Bàn:</span> {selectedTable?.name || selectedTable?.code}</div>
                    <div><span className="font-medium">Thời gian bắt đầu:</span> {selectedTable?.rental?.startAt ? new Date(selectedTable.rental.startAt).toLocaleString('vi-VN') : 'N/A'}</div>
                    {/* <div><span className="font-medium">Thời gian kết thúc:</span> {formatVNDateTime(new Date())}</div> */}
                    </div>
                  </div>

                {/* Services */}
                <div>
                  <h3 className="font-semibold mb-2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>Chi tiết dịch vụ:</h3>
                  <div className="border rounded" style={{ border: '1px solid #000', borderRadius: '4px' }}>
                    <div className="grid grid-cols-4 gap-2 p-2 bg-gray-50 font-medium text-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', padding: '8px', backgroundColor: '#f5f5f5', fontWeight: 'bold', fontSize: '12px' }}>
                      <div>Dịch vụ</div>
                      <div className="text-center">Số lượng</div>
                      <div className="text-right">Đơn giá</div>
                      <div className="text-right">Thành tiền</div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 p-2 text-sm border-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', padding: '8px', fontSize: '12px', borderBottom: '1px solid #ccc' }}>
                      <div>Thuê bàn</div>
                      <div className="text-center">{formatMinutesToHoursMinutes(invoiceData.rental.minutes)}</div>
                      <div className="text-right">
                      {invoiceData.rental.rentalCost > 0
                          ? `${
                              (
                                Math.round(
                                  invoiceData.rental.rentalCost / (invoiceData.rental.minutes || 1)
                                ) === 833
                                  ? 50000
                                  : 45000
                              ).toLocaleString('vi-VN')
                            }đ/giờ`
                          : '0đ/giờ'}
                      </div>
                      <div className="text-right">
                      {invoiceData.rental.rentalCost.toLocaleString('en-US', {
                          minimumFractionDigits: 0, // không hiển thị phần thập phân
                          maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
                        })}đ
                      </div>
                    </div>
                    
                    {invoiceData.rental.accessories?.map((acc: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 p-2 text-sm border-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', padding: '8px', fontSize: '12px', borderBottom: '1px solid #ccc' }}>
                        <div>{acc.name}</div>
                        <div className="text-center">{acc.quantity}</div>
                        <div className="text-right">{acc.unitPrice.toLocaleString()}đ</div>
                        <div className="text-right">{acc.total.toLocaleString()}đ</div>
                      </div>
                    ))}
                    
                    {/* Package purchase */}
                    {invoiceData.package && (
                      <div className="grid grid-cols-4 gap-2 p-2 text-sm border-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', padding: '8px', fontSize: '12px', borderBottom: '1px solid #ccc' }}>
                        <div>{invoiceData.package.name}</div>
                        <div className="text-center">1</div>
                        <div className="text-right">{invoiceData.package.price.toLocaleString()}đ</div>
                        <div className="text-right">{invoiceData.package.price.toLocaleString()}đ</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2" style={{ marginTop: '16px' }}>
                  <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tạm tính:</span>
                    <span>{invoiceData.serviceDetails?.pricing?.subtotal?.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
}) || '0'}đ</span>
                  </div>
                  <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Giảm giá:</span>
                    <span>{invoiceData.serviceDetails?.pricing?.discount?.toLocaleString() || '0'}đ</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', borderTop: '2px solid #000', paddingTop: '8px' }}>
                    <span>TỔNG CỘNG:</span>
                    <span>{invoiceData.serviceDetails?.pricing?.total?.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
}) || '0'}đ</span>
                  </div>
                </div>

                {/* Bank Info */}
                {invoiceData.bankInfo && (
                  <div className="bg-gray-50 p-4 rounded" style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
                    <h3 className="font-semibold mb-2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>Thông tin chuyển khoản:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 place-items-center" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      <div className="text-sm space-y-1" style={{ fontSize: '12px' }}>
                        {invoiceData.bankInfo.accountName && (
                          <div><span className="font-medium" style={{ fontWeight: 'bold' }}>Chủ tài khoản:</span> {invoiceData.bankInfo.accountName}</div>
                        )}
                        {invoiceData.bankInfo.bankName && (
                          <div><span className="font-medium" style={{ fontWeight: 'bold' }}>Ngân hàng:</span> {invoiceData.bankInfo.bankName}</div>
                        )}
                        {invoiceData.bankInfo.accountNumber && (
                          <div><span className="font-medium" style={{ fontWeight: 'bold' }}>Số tài khoản:</span> {invoiceData.bankInfo.accountNumber}</div>
                        )}
                      <div className="text-center">
                        {invoiceData.bankInfo.qrImage ? (
                          <Image 
                            src={`${process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:1337'}${  '/images/QR-code.png'  }`}
                            alt="QR Code"
                            style={{ 
                              maxWidth: '200px', 
                              maxHeight: '200px',
                              border: '1px solid #ccc',
                              borderRadius: '4px'
                            }}
                            width={200}
                            height={200}
                            className="w-full h-full"
                          />
                        ) : (
                          <div style={{ 
                            width: '200px', 
                            height: '200px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#f9f9f9',
                            fontSize: '10px',
                            color: '#666'
                          }}>
                            Chưa có QR
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center text-sm text-gray-600" style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '16px' }}>
                  Cảm ơn quý khách đã sử dụng dịch vụ!
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                <button 
                  className="px-4 py-2 bg-[#00203FFF] text-white rounded hover:bg-[#001a33]"
                  onClick={() => {
                    const element = document.getElementById('invoice-content');
                    if (!element) return;
                  
                    html2canvas(element, {
                      backgroundColor: '#ffffff',
                      scale: 2,
                      useCORS: true,
                      allowTaint: true,
                      ignoreElements: (element) => {
                        return element.classList.contains('ignore-export');
                      }
                    })
                      .then(canvas => {
                        const link = document.createElement('a');
                        link.download = `hoa-don-${Date.now()}.png`;
                        link.href = canvas.toDataURL('image/png', 1.0);
                        link.click();
                      })
                      .catch(e => {
                        console.log("Lỗi tạo ảnh:", e);
                      });
                  }}
                >
                  Lưu ảnh
                </button>
                <button 
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setInvoiceData(null);
                    setShowRentalModal(false);
                    setSelectedTable(null);
                    resetRentalForm();
                  }}
                >
                  Đóng
                </button>
              </div>
              </div>
            </div>
          </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        show={alert.show}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
      />
    </div>
  );
}

function ElapsedTime({ startIso }: { startIso: string }) {
  const [elapsed, setElapsed] = useState<string>('');
  
  useEffect(() => {
    if (!startIso) return;
    
    const update = () => {
      const start = new Date(startIso);
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      
      if (diff < 0) {
        setElapsed('Chưa bắt đầu');
        return;
      }
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setElapsed(`Đã thuê: ${h}h ${m}m ${s}s`);
    };
    
    update();
    const interval = setInterval(update, 1000); // update every second
    return () => clearInterval(interval);
  }, [startIso]);
  
  return <span className="text-blue-600 font-medium">{elapsed}</span>;
}