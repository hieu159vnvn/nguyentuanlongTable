"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Image from 'next/image';
import AlertModal from '@/components/AlertModal';
import { useAlert } from '@/hooks/useAlert';

type CustomerRow = {
  id: number;
  name: string;
  customerCode: string;
  phone?: string;
  notes?: string;
  remainingMinutes: number;
};

type NewCustomer = {
  name: string;
  phone: string;
  notes: string;
};

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

export default function CustomerPage() {
  const { alert, success, error, hideAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomer>({
    name: '',
    phone: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingTimeCustomer, setUpdatingTimeCustomer] = useState<CustomerRow | null>(null);
  const [showUpdateTimeModal, setShowUpdateTimeModal] = useState(false);
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [updatingTime, setUpdatingTime] = useState(false);

  // Load all customers and filter locally for real-time search
  const [allCustomers, setAllCustomers] = useState<CustomerRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);

  async function load(page: number = 1) {
    setLoading(true);
    try {
      const pageSize = 10;
      const json = await api.getCustomers(`?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort[0]=createdAt:desc`);
      const items = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      
      // Update pagination info
      const pagination = json?.meta?.pagination;
      if (pagination) {
        setTotalPages(pagination.pageCount || 1);
        setTotalCustomers(pagination.total || 0);
      }
      const mapped: CustomerRow[] = items.map((c:any)=> {
        const id = c.id ?? c.documentId ?? Math.random();
        const a = c.attributes ?? c;
        // Check both attributes and root level for remainingMinutes
        const remainingMinutes = Number(a?.remainingMinutes ?? c.remainingMinutes ?? 0);
        
        console.log('Customer data:', {
          id,
          name: a?.name,
          remainingMinutes,
          fromAttributes: a?.remainingMinutes,
          fromRoot: c.remainingMinutes,
          rawData: c
        });
        
        return {
          id,
          name: a?.name ?? '',
          customerCode: a?.customerCode ?? '',
          phone: a?.phone ?? '',
          notes: a?.notes ?? '',
          remainingMinutes: remainingMinutes
        };
      });
      setAllCustomers(mapped);
    } catch (err) {
      console.error('Error loading customers:', err);
      error('Lỗi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }

  // Filter customers based on search query (only for display, not for pagination)
  const filteredCustomers = allCustomers.filter(customer => {
    if (!query.trim()) return true;
    const searchLower = query.toLowerCase();
    return customer.name.toLowerCase().includes(searchLower) ||
           customer.customerCode.toLowerCase().includes(searchLower) ||
           (customer.phone && customer.phone.includes(searchLower));
  });

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  async function saveCustomer() {
    if (!newCustomer.name.trim()) {
      error('Vui lòng nhập tên khách hàng');
      return;
    }
    
    setSaving(true);
    try {
      await api.createCustomer({
        data: {
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          notes: newCustomer.notes.trim()
        }
      });
      
      // Reset form and reload data
      setNewCustomer({ name: '', phone: '', notes: '' });
      setShowAddModal(false);
      await load();
      success('Tạo khách hàng thành công!');
    } catch (e) {
      console.error('Error saving customer:', e);
      const msg = e instanceof Error ? e.message : 'Không thể tạo khách hàng';
      error(`Lỗi: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateCustomer() {
    if (!editingCustomer || !editingCustomer.name.trim()) {
      error('Vui lòng nhập tên khách hàng');
      return;
    }
    
    setSaving(true);
    try {
      await api.updateCustomer(editingCustomer.id, {
        data: {
          name: editingCustomer.name.trim(),
          phone: editingCustomer.phone?.trim() || '',
          notes: editingCustomer.notes?.trim() || '',
          remainingMinutes: editingCustomer.remainingMinutes || 0
        }
      });
      
      setShowEditModal(false);
      setEditingCustomer(null);
      await load();
      success('Cập nhật khách hàng thành công!');
    } catch (e) {
      console.error('Error updating customer:', e);
      const msg = e instanceof Error ? e.message : 'Không thể cập nhật khách hàng';
      error(`Lỗi: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(id: number) {
    if (!confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
      return;
    }
    
    setDeletingId(id);
    try {
      await api.deleteCustomer(id);
      await load();
      success('Xóa khách hàng thành công!');
    } catch (e) {
      console.error('Error deleting customer:', e);
      const raw = e instanceof Error ? e.message : String(e);
      if (raw.includes('Cannot delete customer with existing rentals or invoices')) {
        error('Không thể xóa khách hàng vì đang có lịch sử thuê bàn hoặc hóa đơn liên quan. Vui lòng xóa các bản ghi liên quan trước.');
      } else {
        error(`Lỗi: ${raw || 'Không thể xóa khách hàng'}`);
      }
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(customer: CustomerRow) {
    setEditingCustomer({ ...customer });
    setShowEditModal(true);
  }

  function startUpdateTime(customer: CustomerRow) {
    setUpdatingTimeCustomer({ ...customer });
    setTimeIn('');
    setTimeOut('');
    setShowUpdateTimeModal(true);
  }

  async function updateCustomerTime() {
    if (!timeIn || !timeOut) {
      error('Vui lòng nhập đầy đủ thời gian vào và thời gian ra');
      return;
    }

    if (!updatingTimeCustomer) return;

    setUpdatingTime(true);
    try {
      const timeInDate = new Date(timeIn);
      const timeOutDate = new Date(timeOut);
      
      if (timeOutDate <= timeInDate) {
        error('Thời gian ra phải lớn hơn thời gian vào');
        setUpdatingTime(false);
        return;
      }

      // Calculate minutes difference
      const diffMs = timeOutDate.getTime() - timeInDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      // Subtract minutes from customer's remaining time
      const currentRemainingMinutes = updatingTimeCustomer.remainingMinutes || 0;
      const newRemainingMinutes = Math.max(0, currentRemainingMinutes - diffMinutes);

      // Update customer in database
      await api.updateCustomer(updatingTimeCustomer.id, {
        data: {
          remainingMinutes: newRemainingMinutes
        }
      });

      success(`Đã cập nhật thành công! Đã trừ ${diffMinutes} phút từ thời gian còn lại của khách hàng.`);
      
      // Refresh the list
      await load(currentPage);
      
      // Close modal
      setShowUpdateTimeModal(false);
      setUpdatingTimeCustomer(null);
      setTimeIn('');
      setTimeOut('');
    } catch (e) {
      console.error('Error updating customer time:', e);
      error('Lỗi cập nhật thời gian khách hàng');
    } finally {
      setUpdatingTime(false);
    }
  }

  useEffect(() => { 
    load(currentPage).catch(console.error); 
  }, [currentPage]);

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-semibold">Quản lí khách hàng</h1>
        <button 
          className="px-3 sm:px-4 py-2 bg-[#00203FFF] text-white rounded hover:bg-blue-600 text-sm sm:text-base"
          onClick={() => setShowAddModal(true)}
        >
          Thêm khách hàng
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input 
          className="border rounded px-3 py-2 flex-1 text-sm sm:text-base" 
          placeholder="Tìm kiếm theo tên, mã khách hàng hoặc số điện thoại..." 
          value={query} 
          onChange={e=>setQuery(e.target.value)} 
        />
        {loading && (
          <div className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-500">
            Đang tải...
          </div>
        )}
      </div>

      {/* Pagination Info */}
      <div className="bg-amber-50 border border-amber-500 rounded-lg p-3">
        <p className="text-sm text-black-800">
          {query ? (
            <>
              Tìm thấy <strong>{filteredCustomers.length}</strong> khách hàng cho từ khóa &quot;<strong>{query}</strong>&quot;
            </>
          ) : (
            <>
              Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong> - 
              Tổng <strong>{totalCustomers}</strong> khách hàng
            </>
          )}
        </p>
      </div>
      
      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-xs sm:text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 sm:px-3 py-2 text-left">ID</th>
              <th className="px-2 sm:px-3 py-2 text-left">Tên</th>
              <th className="px-2 sm:px-3 py-2 text-left hidden sm:table-cell">Điện thoại</th>
              <th className="px-2 sm:px-3 py-2 text-left">Giờ còn lại</th>
              <th className="px-2 sm:px-3 py-2 text-left hidden md:table-cell">Ghi chú</th>
              <th className="px-2 sm:px-3 py-2 text-left">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-2 sm:px-3 py-2">{r.id}</td>
                <td className="px-2 sm:px-3 py-2 font-medium" title={r.name}>
                  {r.name.length > 18 ? `${r.name.substring(0, 18)}...` : r.name}
                </td>
                <td className="px-2 sm:px-3 py-2 hidden sm:table-cell">{r.phone}</td>
                <td className="px-2 sm:px-3 py-2">{formatMinutesToHoursMinutes(r.remainingMinutes)}</td>
                <td className="px-2 sm:px-3 py-2 max-w-[200px] sm:max-w-[300px] truncate hidden md:table-cell" title={r.notes}>{r.notes}</td>
                <td className="px-2 sm:px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                    <button
                      className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-green-600 shadow-[3px_3px_black]"
                      onClick={() => startUpdateTime(r)}
                      title="Cập nhật giờ còn lại"
                    >
                      <Image src="/images/wall-clock.png" alt="Đồng hồ" className="w-4 h-4" width={16} height={16} unoptimized />
                    </button>
                      <button
                        className="px-2 py-1 text-xs bg-[#00203FFF] text-white rounded hover:bg-blue-600 shadow-[3px_3px_black]"
                        onClick={() => startEdit(r)}
                        title="Sửa"
                      >
                        Sửa
                      </button>
                      <button
                        className="px-2 py-1 text-xs bg-red-400 text-white rounded hover:bg-red-600 disabled:opacity-50 shadow-[3px_3px_black]"
                        onClick={() => deleteCustomer(r.id)}
                        disabled={deletingId === r.id}
                        title="Xóa"
                      >
                        {deletingId === r.id ? '...' : 'Xóa'}
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filteredCustomers.length === 0 && (
              <tr>
                <td className="px-2 sm:px-3 py-6 text-gray-500 text-center" colSpan={6}>
                  {query ? 'Không tìm thấy khách hàng phù hợp.' : 'Không có khách hàng.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Hiển thị <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> đến{' '}
                  <span className="font-medium">{Math.min(currentPage * 10, totalCustomers)}</span> trong{' '}
                  <span className="font-medium">{totalCustomers}</span> khách hàng
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Trước</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === currentPage
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Sau</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Thêm khách hàng mới</h2>
                <button 
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewCustomer({ name: '', phone: '', notes: '' });
                  }}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tên khách hàng *</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={newCustomer.name}
                      onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                      placeholder="Nhập tên khách hàng"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={newCustomer.phone}
                      onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ghi chú</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={newCustomer.notes}
                      onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
                      placeholder="Ghi chú thêm"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <button 
                    className="px-4 py-2 bg-[#00203FFF] text-white rounded hover:bg-green-600 disabled:opacity-50"
                    onClick={saveCustomer}
                    disabled={saving}
                  >
                    {saving ? 'Đang lưu...' : 'Lưu khách hàng'}
                  </button>
                  <button 
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewCustomer({ name: '', phone: '', notes: '' });
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Sửa khách hàng</h2>
                <button 
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCustomer(null);
                  }}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tên khách hàng *</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={editingCustomer.name}
                      onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}
                      placeholder="Nhập tên khách hàng"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={editingCustomer.phone || ''}
                      onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ghi chú</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={editingCustomer.notes || ''}
                      onChange={e => setEditingCustomer({...editingCustomer, notes: e.target.value})}
                      placeholder="Ghi chú thêm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Giờ còn lại</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-24 border rounded px-3 py-2"
                        value={Math.floor((editingCustomer.remainingMinutes || 0) / 60)}
                        onChange={e => {
                          const otherMinutes = (editingCustomer.remainingMinutes || 0) % 60;
                          const hours = Math.max(0, parseInt(e.target.value || '0', 10));
                          const total = hours * 60 + otherMinutes;
                          setEditingCustomer({ ...editingCustomer, remainingMinutes: total });
                        }}
                        placeholder="Giờ"
                        min="0"
                      />
                      <span className="text-sm">giờ</span>
                      <input
                        type="number"
                        className="w-24 border rounded px-3 py-2"
                        value={(editingCustomer.remainingMinutes || 0) % 60}
                        onChange={e => {
                          const hours = Math.floor((editingCustomer.remainingMinutes || 0) / 60);
                          let minutes = Math.max(0, parseInt(e.target.value || '0', 10));
                          if (isNaN(minutes)) minutes = 0;
                          if (minutes > 59) minutes = 59;
                          const total = hours * 60 + minutes;
                          setEditingCustomer({ ...editingCustomer, remainingMinutes: total });
                        }}
                        placeholder="Phút"
                        min="0"
                        max="59"
                      />
                      <span className="text-sm">phút</span>
                    </div>
                    {/* <div className="text-xs text-gray-600 mt-1">
                      Tổng: {(editingCustomer.remainingMinutes || 0)} phút
                    </div> */}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <button 
                    className="px-4 py-2 bg-[#00203FFF] text-white rounded hover:bg-[#001a33] disabled:opacity-50"
                    onClick={updateCustomer}
                    disabled={saving}
                  >
                    {saving ? 'Đang lưu...' : 'Cập nhật khách hàng'}
                  </button>
                  <button 
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingCustomer(null);
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Time Modal */}
      {showUpdateTimeModal && updatingTimeCustomer && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Cập nhật giờ còn lại</h2>
                <button
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={() => {
                    setShowUpdateTimeModal(false);
                    setUpdatingTimeCustomer(null);
                    setTimeIn('');
                    setTimeOut('');
                  }}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Khách hàng: <strong>{updatingTimeCustomer.name}</strong>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Giờ còn lại hiện tại: <strong>{formatMinutesToHoursMinutes(updatingTimeCustomer.remainingMinutes)}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Thời gian vào</label>
                  <input
                    type="datetime-local"
                    className="w-full border rounded px-3 py-2"
                    value={timeIn}
                    onChange={e => setTimeIn(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Thời gian ra</label>
                  <input
                    type="datetime-local"
                    className="w-full border rounded px-3 py-2"
                    value={timeOut}
                    onChange={e => setTimeOut(e.target.value)}
                  />
                </div>

                {timeIn && timeOut && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-blue-800">
                      Sẽ trừ khỏi giờ còn lại: <strong>
                        {(() => {
                          try {
                            const timeInDate = new Date(timeIn);
                            const timeOutDate = new Date(timeOut);
                            if (timeOutDate > timeInDate) {
                              const diffMs = timeOutDate.getTime() - timeInDate.getTime();
                              const diffMinutes = Math.floor(diffMs / (1000 * 60));
                              return formatMinutesToHoursMinutes(diffMinutes);
                            }
                            return '0 phút';
                          } catch {
                            return '0 phút';
                          }
                        })()}
                      </strong>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Giờ còn lại sau khi trừ: <strong>
                        {(() => {
                          try {
                            const timeInDate = new Date(timeIn);
                            const timeOutDate = new Date(timeOut);
                            if (timeOutDate > timeInDate) {
                              const diffMs = timeOutDate.getTime() - timeInDate.getTime();
                              const diffMinutes = Math.floor(diffMs / (1000 * 60));
                              const currentRemainingMinutes = updatingTimeCustomer.remainingMinutes || 0;
                              const newRemainingMinutes = Math.max(0, currentRemainingMinutes - diffMinutes);
                              return formatMinutesToHoursMinutes(newRemainingMinutes);
                            }
                            return formatMinutesToHoursMinutes(updatingTimeCustomer.remainingMinutes);
                          } catch {
                            return formatMinutesToHoursMinutes(updatingTimeCustomer.remainingMinutes);
                          }
                        })()}
                      </strong>
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    className="flex-1 px-4 py-2 bg-[#00203FFF] text-white rounded hover:bg-[#001a33] disabled:opacity-50"
                    onClick={updateCustomerTime}
                    disabled={updatingTime || !timeIn || !timeOut}
                  >
                    {updatingTime ? 'Đang cập nhật...' : 'Cập nhật'}
                  </button>
                  <button
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    onClick={() => {
                      setShowUpdateTimeModal(false);
                      setUpdatingTimeCustomer(null);
                      setTimeIn('');
                      setTimeOut('');
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        show={alert.show}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
      />
    </div>
  );
}


