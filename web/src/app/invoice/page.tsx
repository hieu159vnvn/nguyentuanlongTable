"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Image from 'next/image';
import html2canvas from "html2canvas";
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

type InvoiceRow = {
  id: number;
  documentId: string;
  code: string;
  customer: {
    id: number;
    name: string;
    phone?: string;
    remainingMinutes?: number;
  };
  customerName?: string;
  customerPhone?: string;
  customerCode?: string;
  remainingMinutes?: number;
  rental: {
    id: number;
    type: string;
    hours: number;
    subtotal: number;
    accessories?: Array<{
    attributes?: {
      accessory?: {
        data?: {
          attributes?: {
            name?: string;
            price?: number;
          };
        };
      };
      quantity?: number;
      total?: number;
    };
    accessory?: {
      name?: string;
      price?: number;
    };
    quantity?: number;
    total?: number;
  }>;
  };
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  createdAt: string;
};

type InvoiceDetail = {
  id: number;
  code: string;
  customer: {
    id: number;
    name: string;
    phone?: string;
    customerCode: string;
    remainingMinutes?: number;
  };
  customerName?: string;
  customerPhone?: string;
  customerCode?: string;
  remainingMinutes?: number;
  paymentMethod?: string;
  rental: {
    id: number;
    type: string;
    hours: number;
    minutes?: number;
    subtotal: number;
    accessories?: Array<{
    attributes?: {
      accessory?: {
        data?: {
          attributes?: {
            name?: string;
            price?: number;
          };
        };
      };
      quantity?: number;
      total?: number;
    };
    accessory?: {
      name?: string;
      price?: number;
    };
    quantity?: number;
    total?: number;
  }>;
    startAt?: string;
    endAt?: string;
  };
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  createdAt: string;
  serviceDetails?: {
    rental: {
      type: string;
      minutes: number;
      hours: number;
      startAt: string;
      endAt: string;
      cost: number;
    };
    accessories: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    package?: {
      name: string;
      totalHours: number;
      bonusHours: number;
      price: number;
    };
    pricing: {
      rentalCost: number;
      accessoriesTotal: number;
      subtotal: number;
      discount: number;
      total: number;
    };
  };
  rentalStartAt?: string;
  rentalEndAt?: string;
  rentalMinutes?: number;
  rentalType?: string;
  tableName?: string;
};

export default function InvoicePage() {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [bankInfo, setBankInfo] = useState<{
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    qrImage?: {
      url?: string;
    };
  } | null>(null);

  async function load(page: number = 1) {
    setLoading(true);
    try {
      const pageSize = 10;
      const json = await api.getInvoices(`?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort[0]=createdAt:desc`);
      const items = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      
      // Update pagination info
      const pagination = json?.meta?.pagination;
      if (pagination) {
        setTotalPages(pagination.pageCount || 1);
        setTotalInvoices(pagination.total || 0);
      }
      const mapped: InvoiceRow[] = items.map((inv: any) => {
        const id = inv.id ?? inv.documentId ?? Math.random();
        const a = inv?.attributes ?? inv;
        
        // Handle customer data - use stored customer info
        let customerData = { id: 0, name: 'Khách vãng lai', phone: '', remainingMinutes: 0 };
        if (a?.customerName) {
          // Use stored customer data
          customerData = {
            id: a?.customer || 0,
            name: a.customerName || 'Khách vãng lai',
            phone: a.customerPhone || '', 
            remainingMinutes: a.remainingMinutes || 0
          };
        } else if (a?.customer?.data) {
          // Fallback to populated data if available
          const customer = a.customer.data;
          customerData = {
            id: customer.id,
            name: customer.attributes?.name ?? customer.name ?? 'Khách vãng lai',
            phone: customer.attributes?.phone ?? customer.phone ?? '',
            remainingMinutes: customer.attributes?.remainingMinutes ?? customer.remainingMinutes ?? 0
          };
        } else if (a?.customer) {
          // If customer is just an ID, we'll need to fetch it separately
          customerData = { id: a.customer, name: 'Đang tải...', phone: '', remainingMinutes: 0 };
        }
        
        // Handle rental data
        let rentalData = { id: 0, type: '', hours: 0, subtotal: 0, accessories: [] };
        if (a?.rental?.data) {
          const rental = a.rental.data;
          rentalData = {
            id: rental.id,
            type: rental.attributes?.type ?? rental.type ?? '',
            hours: rental.attributes?.hours ?? rental.hours ?? 0,
            subtotal: rental.attributes?.totalAmount ?? rental.totalAmount ?? 0,
            accessories: rental.attributes?.rentalAccessories?.data ?? []
          };
        } else if (a?.rental) {
          rentalData = { id: a.rental, type: '', hours: 0, subtotal: 0, accessories: [] };
        }
        
        return {
          id,
          documentId: inv.documentId ?? '',
          code: a?.code ?? '',
          customer: customerData,
          customerName: a?.customerName ?? '',
          customerPhone: a?.customerPhone ?? '',
          customerCode: a?.customerCode ?? '',
          remainingMinutes: a?.remainingMinutes ?? 0,
          rental: rentalData,
          subtotal: Number(a?.subtotal ?? 0),
          discount: Number(a?.discount ?? 0),
          total: Number(a?.total ?? 0),
          status: a?.status ?? 'unpaid',
          createdAt: a?.createdAt ?? ''
        };
      });
      
      // Fetch customer data for invoices that don't have stored customer info
      const invoicesNeedingCustomerData = mapped.filter(inv => inv.customer.name === 'Đang tải...' && inv.customer.id > 0);
      if (invoicesNeedingCustomerData.length > 0) {
        try {
          const customerPromises = invoicesNeedingCustomerData.map(async (invoice) => {
            try {
              const customerJson = await api.getCustomers(`/${invoice.customer.id}`);
              const customer = customerJson?.data ?? customerJson;
              const customerAttrs = customer?.attributes ?? customer;
              return {
                invoiceId: invoice.id,
                customer: {
                  id: customer.id,
                  name: customerAttrs?.name ?? 'Khách vãng lai',
                  phone: customerAttrs?.phone ?? '',
                  remainingMinutes: customerAttrs?.remainingMinutes ?? 0
                }
              };
            } catch (error) {
              console.error(`Error fetching customer ${invoice.customer.id}:`, error);
              return {
                invoiceId: invoice.id,
                customer: {
                  id: invoice.customer.id,
                  name: 'Khách vãng lai',
                  phone: '',
                  remainingMinutes: 0
                }
              };
            }
          });
          
          const customerResults = await Promise.all(customerPromises);
          
          // Update invoices with customer data
          const updatedMapped = mapped.map(invoice => {
            const customerResult = customerResults.find(cr => cr.invoiceId === invoice.id);
            if (customerResult) {
              return { ...invoice, customer: customerResult.customer };
            }
            return invoice;
          });
          
          setInvoices(updatedMapped);
        } catch (error) {
          console.error('Error fetching customer data:', error);
          setInvoices(mapped);
        }
      } else {
        setInvoices(mapped);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      alert('Lỗi tải danh sách hóa đơn');
    } finally {
      setLoading(false);
    }
  }

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

  // Filter invoices based on search query and date
  const filteredInvoices = invoices.filter(invoice => {
    // Text search filter
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      const matchesText = invoice.customer.name.toLowerCase().includes(searchLower) ||
                         (invoice.customer.phone && invoice.customer.phone.includes(searchLower)) ||
                         invoice.code.toLowerCase().includes(searchLower);
      if (!matchesText) return false;
    }

    // Date filter
    if (dateFilter) {
      const invoiceDate = new Date(invoice.createdAt).toISOString().split('T')[0];
      if (invoiceDate !== dateFilter) return false;
    }

    return true;
  });

  async function viewInvoice(id: number, documentId: string) {
    console.log(selectedInvoice);
    try {
      // Try to get invoice with populate first
      let json;
      try {
        json = await api.getInvoiceByDocumentId(`${documentId}?populate[customer][fields][0]=name&populate[customer][fields][1]=phone&populate[customer][fields][2]=customerCode&populate[rental][fields][0]=type&populate[rental][fields][1]=hours&populate[rental][fields][2]=totalAmount&populate[rental][fields][3]=startAt&populate[rental][fields][4]=endAt&populate[rental][fields][5]=minutes`);
      } catch {
        // Fallback to basic invoice data
        json = await api.getInvoiceByDocumentId(documentId);
      }
      
      const inv = json?.data ?? json;
      const a = inv?.attributes ?? inv;
      
      
      const invoiceDetail: InvoiceDetail = {
        id: inv.id,
        code: a?.code ?? '',
        customer: a?.customer?.data ? {
          id: a.customer.data.id,
          name: a.customer.data.attributes?.name ?? a.customer.data.name ?? '',
          phone: a.customer.data.attributes?.phone ?? a.customer.data.phone ?? '',
          customerCode: a.customer.data.attributes?.customerCode ?? a.customer.data.customerCode ?? '',
          remainingMinutes: a.customer.data.attributes?.remainingMinutes ?? a.customer.data.remainingMinutes ?? 0
        } : { id: 0, name: 'Khách vãng lai', customerCode: 'N/A', remainingMinutes: 0 },
        customerName: a?.customerName ?? '',
        customerPhone: a?.customerPhone ?? '',
        customerCode: a?.customerCode ?? '',
        paymentMethod: a?.paymentMethod ?? '',
        remainingMinutes: a?.remainingMinutes ?? a?.customer?.data?.attributes?.remainingMinutes ?? a?.customer?.data?.remainingMinutes ?? 0,
        rental: a?.rental?.data ? {
          id: a.rental.data.id,
          type: a.rental.data.attributes?.type ?? a.rental.data.type ?? '',
          hours: a.rental.data.attributes?.hours ?? a.rental.data.hours ?? 0,
          minutes: a.rental.data.attributes?.minutes ?? a.rental.data.minutes ?? 0,
          subtotal: a.rental.data.attributes?.totalAmount ?? a.rental.data.totalAmount ?? 0,
          accessories: a.rental.data.attributes?.rentalAccessories?.data ?? [],
          startAt: a.rental.data.attributes?.startAt ?? a.rental.data.startAt,
          endAt: a.rental.data.attributes?.endAt ?? a.rental.data.endAt
        } : { id: 0, type: 'short', hours: 0, minutes: 0, subtotal: 0 },
        subtotal: Number(a?.subtotal ?? 0),
        discount: Number(a?.discount ?? 0),
        total: Number(a?.total ?? 0),
        status: a?.status ?? 'unpaid',
        createdAt: a?.createdAt ?? '',
        serviceDetails: a?.serviceDetails,
        rentalStartAt: a?.rentalStartAt,
        rentalEndAt: a?.rentalEndAt,
        rentalMinutes: a?.rentalMinutes,
        rentalType: a?.rentalType,
        tableName: a?.tableName
      };
      
      setSelectedInvoice(invoiceDetail);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error loading invoice detail:', error);
      alert('Lỗi tải chi tiết hóa đơn');
    }
  }

  async function loadBankInfo() {
    try {
      const info = await api.getBankInfo();
      setBankInfo(info);
    } catch (error) {
      console.error('Error loading bank info:', error);
    }
  }


  useEffect(() => {
    load(currentPage);
    loadBankInfo();
  }, [currentPage]);

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold">Quản lý hóa đơn</h1>
        <button 
          className="px-4 py-2 bg-[#00203FFF] text-white rounded hover:bg-[#001a33] text-sm sm:text-base"
          onClick={() => load(currentPage)}
          disabled={loading}
        >
          {loading ? 'Đang tải...' : 'Tải lại'}
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
              placeholder="Tìm kiếm theo tên khách hàng, số điện thoại hoặc mã hóa đơn..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="sm:w-48">
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
              placeholder="Lọc theo ngày..."
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          {(query || dateFilter) && (
            <div className="flex items-center">
              <button
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => {
                  setQuery('');
                  setDateFilter('');
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="bg-amber-50 border border-amber-500 rounded-lg p-3">
        <p className="text-sm text-black-800">
          {query || dateFilter ? (
            <>
              Tìm thấy <strong>{filteredInvoices.length}</strong> hóa đơn
              {query && ` cho từ khóa "${query}"`}
              {dateFilter && ` trong ngày ${new Date(dateFilter).toLocaleDateString('vi-VN')}`}
            </>
          ) : (
            <>
              Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong> - 
              Tổng <strong>{totalInvoices}</strong> hóa đơn
            </>
          )}
        </p>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Mã HĐ
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Tên khách hàng
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Số điện thoại
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Tổng tiền
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 sm:px-6 text-center text-sm text-gray-500">
                    {loading ? 'Đang tải...' : 'Không có hóa đơn nào'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                      {invoice.code}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      <div className="font-medium">{invoice.customer.name}</div>
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {invoice.customer.phone || '-'}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {invoice.total.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})}đ
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {new Date(invoice.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                      <button
                        className="text-[#00203FFF] hover:text-[#001a33] mr-2"
                        onClick={() => viewInvoice(invoice.id, invoice.documentId)}
                      >
                                        <Image className="w-4 h-4" src="/images/search.png" alt="Tìm kiếm" width={16} height={16} unoptimized/>

                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
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
                  <span className="font-medium">{Math.min(currentPage * 10, totalInvoices)}</span> trong{' '}
                  <span className="font-medium">{totalInvoices}</span> hóa đơn
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

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">Hóa đơn {selectedInvoice.code}</h2>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                    onClick={() => setShowViewModal(false)}
                  >
                    Đóng
                  </button>
                </div>
              </div>

              {/* Invoice Content */}
              <div id="invoice-content" className="space-y-4" style={{ backgroundColor: 'white', color: 'black', fontFamily: 'Arial, sans-serif', padding: '24px' }}>
                {/* Header */}
                <div className="text-center border-b pb-4" style={{ borderBottom: '2px solid #000' }}>
                  <h1 className="text-2xl font-bold" style={{ fontSize: '24px', fontWeight: 'bold', color: '#000' }}>HÓA ĐƠN THUÊ BÀN</h1>
                  <p className="text-sm text-gray-600" style={{ fontSize: '12px', color: '#666' }}>Mã hóa đơn: {selectedInvoice.code}</p>
                  <p className="text-sm text-gray-600" style={{ fontSize: '12px', color: '#666' }}>Ngày: {new Date(selectedInvoice.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>

                {/* Customer Info */}
                <div className="grid gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Thông tin khách hàng:</h3>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Tên:</span> {selectedInvoice.customerName || selectedInvoice.customer.name}</div>
                      <div><span className="font-medium">Mã KH:</span> {selectedInvoice.customerCode || 'N/A'}</div>
                      <div><span className="font-medium">SĐT:</span> {selectedInvoice.customerPhone || selectedInvoice.customer.phone || 'Chưa có'}</div>
                      {/* <div><span className="font-medium">Giờ còn lại:</span> {formatMinutesToHoursMinutes( selectedInvoice.remainingMinutes || selectedInvoice.customer.remainingMinutes || 0)}</div> */}
                    </div>
                  </div>
                  {/* <div>
                    <h3 className="font-semibold mb-2">Thông tin hóa đơn:</h3>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Trạng thái:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          selectedInvoice.status === 'unpaid' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {selectedInvoice.status === 'paid' ? 'Đã thanh toán' :
                           selectedInvoice.status === 'unpaid' ? 'Chưa thanh toán' : 'Đã hủy'}
                        </span>
                      </div>
                      <div><span className="font-medium">Phương thức:</span> {selectedInvoice.paymentMethod || 'Chưa chọn'}</div>
                    </div>
                  </div> */}
                </div>

                {/* Rental Info */}
                <div>
                  <h3 className="font-semibold mb-2">Thông tin thuê:</h3>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Bàn:</span> {selectedInvoice.tableName || 'Chưa có thông tin'}</div>
                    <div><span className="font-medium">Thời gian bắt đầu:</span> {selectedInvoice.rentalStartAt ? new Date(selectedInvoice.rentalStartAt).toLocaleString('vi-VN') : 'Chưa có thông tin'}</div>
                    <div><span className="font-medium">Thời gian kết thúc:</span> {selectedInvoice.rentalEndAt ? new Date(selectedInvoice.rentalEndAt).toLocaleString('vi-VN') : 'Chưa có thông tin'}</div>
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
                    
                    {/* Rental service */}
                    <div className="grid grid-cols-4 gap-2 p-2 text-sm border-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', padding: '8px', fontSize: '12px', borderBottom: '1px solid #ccc' }}>
                      <div>Thuê bàn</div>
                      <div className="text-center">{formatMinutesToHoursMinutes(selectedInvoice.rentalMinutes || 0)}</div>
                      <div className="text-right">
                        {/* {selectedInvoice.serviceDetails?.pricing?.rentalCost && selectedInvoice.serviceDetails.pricing.rentalCost > 0 ? 
                          `${Math.round(selectedInvoice.serviceDetails.pricing.rentalCost / (selectedInvoice.rentalMinutes || 1)).toLocaleString('en-US', {
                              minimumFractionDigits: 0, // không hiển thị phần thập phân
                              maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
                            })}đ/phút` : 
                          '0đ/phút'
                        } */}
                      {selectedInvoice.serviceDetails?.pricing?.rentalCost &&
                        selectedInvoice.serviceDetails.pricing.rentalCost > 0
                          ? `${
                              (
                                Math.round(
                                  selectedInvoice.serviceDetails.pricing.rentalCost /
                                    (selectedInvoice.rentalMinutes || 1)
                                ) === 833
                                  ? 50000
                                  : 45000
                              ).toLocaleString('vi-VN')
                            }đ/giờ`
                          : '0đ/giờ'}
                        </div>
                      <div className="text-right">{selectedInvoice.serviceDetails?.pricing?.rentalCost?.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
}) || '0'}đ</div>
                    </div>
                    
                    {/* Accessories from serviceDetails */}
                    {selectedInvoice.serviceDetails?.accessories?.map((accessory, idx: number) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 p-2 text-sm border-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', padding: '8px', fontSize: '12px', borderBottom: '1px solid #ccc' }}>
                        <div>{accessory.name}</div>
                        <div className="text-center">{accessory.quantity}</div>
                        <div className="text-right">{accessory.unitPrice.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})}đ</div>
                        <div className="text-right">{accessory.total.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})}đ</div>
                      </div>
                    ))}
                    
                    {/* Package from serviceDetails */}
                    {selectedInvoice.serviceDetails?.package && (
                      <div className="grid grid-cols-4 gap-2 p-2 text-sm border-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', padding: '8px', fontSize: '12px', borderBottom: '1px solid #ccc' }}>
                        <div>{selectedInvoice.serviceDetails.package.name}</div>
                        <div className="text-center">1</div>
                        <div className="text-right">{selectedInvoice.serviceDetails.package.price.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})}đ</div>
                        <div className="text-right">{selectedInvoice.serviceDetails.package.price.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})}đ</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2" style={{ marginTop: '16px' }}>
                  <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tạm tính:</span>
                    <span>{selectedInvoice.subtotal.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})}đ</span>
                  </div>
                  <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Giảm giá:</span>
                    <span>{selectedInvoice.discount.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})}đ</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', borderTop: '2px solid #000', paddingTop: '8px' }}>
                    <span>TỔNG CỘNG:</span>
                    <span>{selectedInvoice.total.toLocaleString('en-US', {
  minimumFractionDigits: 0, // không hiển thị phần thập phân
  maximumFractionDigits: 0, // làm tròn đến số nguyên gần nhất
})}đ</span>
                  </div>
                </div>

                {/* Bank Info */}
                {bankInfo && (
                  <div className="bg-gray-50 p-4 rounded" style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
                    <h3 className="font-semibold mb-2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>Thông tin chuyển khoản:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 place-items-center" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      <div className="text-sm space-y-1" style={{ fontSize: '12px' }}>
                         {bankInfo.accountName && (
                          <div><span className="font-medium" style={{ fontWeight: 'bold' }}>Chủ tài khoản:</span> {bankInfo.accountName}</div>
                        )}
                        {bankInfo.bankName && (
                          <div><span className="font-medium" style={{ fontWeight: 'bold' }}>Ngân hàng:</span> {bankInfo.bankName}</div>
                        )}
                        {bankInfo.accountNumber && (
                          <div><span className="font-medium" style={{ fontWeight: 'bold' }}>Số tài khoản:</span> {bankInfo.accountNumber}</div>
                        )}
                      <div className="text-center">
                        {bankInfo.qrImage?.url ? (
                          <Image 
                            src={`${process.env.NEXT_PUBLIC_API_URL || 'images/QR-code.png' || 'http://localhost:1337'}${bankInfo.qrImage.url }`}
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
                    setShowViewModal(false);
                    setSelectedInvoice(null);
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
