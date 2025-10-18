"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type CustomerRow = {
  id: number;
  name: string;
  customerCode: string;
  phone?: string;
  notes?: string;
  remainingHours: number;
};

type NewCustomer = {
  name: string;
  phone: string;
  notes: string;
};

export default function CustomerPage() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomer>({
    name: '',
    phone: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const filter = query ? `?filters[$or][0][name][$containsi]=${encodeURIComponent(query)}&filters[$or][1][customerCode][$containsi]=${encodeURIComponent(query)}&filters[$or][2][phone][$containsi]=${encodeURIComponent(query)}&pagination[pageSize]=200` : '?pagination[pageSize]=200';
      const json = await api.getCustomers(filter);
      const items = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      const mapped: CustomerRow[] = items.map((c:any)=> {
        const id = c.id ?? c.documentId ?? Math.random();
        const a = c.attributes ?? c;
        return {
          id,
          name: a?.name ?? '',
          customerCode: a?.customerCode ?? '',
          phone: a?.phone ?? '',
          notes: a?.notes ?? '',
          remainingHours: Number(a?.remainingHours ?? 0)
        };
      });
      setRows(mapped);
    } catch (error) {
      console.error('Error loading customers:', error);
      alert('Lỗi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }

  async function saveCustomer() {
    if (!newCustomer.name.trim()) {
      alert('Vui lòng nhập tên khách hàng');
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
      alert('Tạo khách hàng thành công!');
    } catch (error) {
      console.error('Error saving customer:', error);
      alert(`Lỗi: ${error instanceof Error ? error.message : 'Không thể tạo khách hàng'}`);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load().catch(console.error); }, []);

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-semibold">Quản lí khách hàng</h1>
        <button 
          className="px-3 sm:px-4 py-2 bg-[#316fab] text-white rounded hover:bg-[#00203FFF] text-sm sm:text-base"
          onClick={() => setShowAddModal(true)}
        >
          Thêm khách hàng
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input className="border rounded px-3 py-2 flex-1 text-sm sm:text-base" placeholder="Tìm tên/mã/điện thoại" value={query} onChange={e=>setQuery(e.target.value)} />
        <button className="px-3 sm:px-4 py-2 border rounded text-sm sm:text-base" onClick={load} disabled={loading}>{loading ? 'Đang tải...' : 'Tải'}</button>
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
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-2 sm:px-3 py-2">{r.id}</td>
                <td className="px-2 sm:px-3 py-2 font-medium">{r.name}</td>
                <td className="px-2 sm:px-3 py-2 hidden sm:table-cell">{r.phone}</td>
                <td className="px-2 sm:px-3 py-2">{r.remainingHours}h</td>
                <td className="px-2 sm:px-3 py-2 max-w-[200px] sm:max-w-[300px] truncate hidden md:table-cell" title={r.notes}>{r.notes}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-2 sm:px-3 py-6 text-gray-500 text-center" colSpan={5}>Không có khách hàng.</td>
              </tr>
            )}
          </tbody>
        </table>
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
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
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
    </div>
  );
}


