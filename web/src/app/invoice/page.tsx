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
  const [invoiceImageUrl, setInvoiceImageUrl] = useState<string | null>(null);
  const [showInvoiceImageModal, setShowInvoiceImageModal] = useState(false);

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

  async function loadInvoiceDetail(id: number, documentId: string): Promise<InvoiceDetail> {
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
      
      return invoiceDetail;
    } catch (error) {
      console.error('Error loading invoice detail:', error);
      throw error;
    }
  }

  async function viewInvoice(id: number, documentId: string) {
    try {
      const invoiceDetail = await loadInvoiceDetail(id, documentId);
      setSelectedInvoice(invoiceDetail);
      setShowViewModal(true);
    } catch (error) {
      alert('Lỗi tải chi tiết hóa đơn');
    }
  }

  async function exportInvoiceAsImage(id: number, documentId: string) {
    try {
      const invoiceDetail = await loadInvoiceDetail(id, documentId);
      const imageUrl = await generateInvoiceImage(invoiceDetail);
      setInvoiceImageUrl(imageUrl);
      setShowInvoiceImageModal(true);
    } catch (error) {
      console.error('Error exporting invoice:', error);
      alert('Lỗi khi xuất hóa đơn');
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

  // Function to generate invoice as image
  async function generateInvoiceImage(invoice: InvoiceDetail): Promise<string> {
    // Get full URL for QR image
    const qrImageUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/images/QR_bank.png`
      : '/images/QR_bank.png';
    
    // Create a hidden div to render invoice
    const invoiceDiv = document.createElement('div');
    invoiceDiv.id = 'temp-invoice-export';
    invoiceDiv.style.position = 'absolute';
    invoiceDiv.style.left = '-9999px';
    invoiceDiv.style.width = '600px';
    invoiceDiv.style.backgroundColor = 'white';
    invoiceDiv.style.color = 'black';
    invoiceDiv.style.fontFamily = 'Arial, sans-serif';
    invoiceDiv.style.padding = '24px';
    invoiceDiv.innerHTML = `
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 16px;">
        <h1 style="font-size: 24px; font-weight: bold; color: #000; margin: 0 0 8px 0;">HÓA ĐƠN THUÊ BÀN</h1>
        <p style="font-size: 12px; color: #666; margin: 4px 0;">Mã hóa đơn: ${invoice.code}</p>
        <p style="font-size: 12px; color: #666; margin: 4px 0;">Ngày: ${new Date(invoice.createdAt).toLocaleDateString('vi-VN')}</p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Thông tin khách hàng:</h3>
        <div style="font-size: 12px; line-height: 1.6;">
          <div><span style="font-weight: bold;">Tên:</span> ${invoice.customerName || invoice.customer?.name || 'N/A'}</div>
          <div><span style="font-weight: bold;">Mã KH:</span> ${invoice.customerCode || invoice.customer?.customerCode || 'N/A'}</div>
          <div><span style="font-weight: bold;">SĐT:</span> ${invoice.customerPhone || invoice.customer?.phone || 'Chưa có'}</div>
          <div><span style="font-weight: bold;">Giờ còn lại:</span> ${formatMinutesToHoursMinutes(invoice.remainingMinutes ?? 0)}</div>
        </div>
      </div>
      
      <div style="margin-bottom: 16px;">
        <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Thông tin thuê:</h3>
        <div style="font-size: 12px; line-height: 1.6;">
          <div><span style="font-weight: bold;">Bàn:</span> ${invoice.tableName || 'Chưa có thông tin'}</div>
          <div><span style="font-weight: bold;">Thời gian bắt đầu:</span> ${invoice.rentalStartAt ? new Date(invoice.rentalStartAt).toLocaleString('vi-VN') : 'Chưa có thông tin'}</div>
          <div><span style="font-weight: bold;">Thời gian kết thúc:</span> ${invoice.rentalEndAt ? new Date(invoice.rentalEndAt).toLocaleString('vi-VN') : 'Chưa có thông tin'}</div>
        </div>
      </div>
      
      <div style="margin-bottom: 16px;">
        <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Chi tiết dịch vụ:</h3>
        <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; padding: 8px; background-color: #f5f5f5; font-weight: bold; font-size: 12px;">
            <div>Dịch vụ</div>
            <div style="text-align: center;">Số lượng</div>
            <div style="text-align: right;">Đơn giá</div>
            <div style="text-align: right;">Thành tiền</div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; padding: 8px; font-size: 12px; border-bottom: 1px solid #ccc;">
            <div>Thuê bàn</div>
            <div style="text-align: center;">${formatMinutesToHoursMinutes(invoice.rentalMinutes || 0)}</div>
            <div style="text-align: right;">
              ${invoice.serviceDetails?.pricing?.rentalCost && invoice.serviceDetails.pricing.rentalCost > 0
                ? `${(Math.round(invoice.serviceDetails.pricing.rentalCost / (invoice.rentalMinutes || 1)) === 833 ? 50000 : 45000).toLocaleString('vi-VN')}đ/giờ`
                : '0đ/giờ'}
            </div>
            <div style="text-align: right;">
              ${invoice.serviceDetails?.pricing?.rentalCost?.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }) || '0'}đ
            </div>
          </div>
          
          ${invoice.serviceDetails?.accessories?.map((acc: any) => `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; padding: 8px; font-size: 12px; border-bottom: 1px solid #ccc;">
              <div>${acc.name}</div>
              <div style="text-align: center;">${acc.quantity}</div>
              <div style="text-align: right;">${acc.unitPrice.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}đ</div>
              <div style="text-align: right;">${acc.total.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}đ</div>
            </div>
          `).join('') || ''}
          
          ${invoice.serviceDetails?.package ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; padding: 8px; font-size: 12px; border-bottom: 1px solid #ccc;">
              <div>${invoice.serviceDetails.package.name}</div>
              <div style="text-align: center;">1</div>
              <div style="text-align: right;">${invoice.serviceDetails.package.price.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}đ</div>
              <div style="text-align: right;">${invoice.serviceDetails.package.price.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}đ</div>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div style="margin-top: 16px; line-height: 1.8;">
        <div style="display: flex; justify-content: space-between; font-size: 12px;">
          <span>Tạm tính:</span>
          <span>${invoice.subtotal.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}đ</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px;">
          <span>Giảm giá:</span>
          <span>${invoice.discount.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}đ</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px;">
          <span>TỔNG CỘNG:</span>
          <span>${invoice.total.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}đ</span>
        </div>
      </div>
      
      ${bankInfo ? `
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 4px; margin-top: 16px;">
          <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Thông tin chuyển khoản:</h3>
          <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
            <div style="font-size: 12px; line-height: 1.6;">
              ${bankInfo.accountName ? `<div><span style="font-weight: bold;">Chủ tài khoản:</span> ${bankInfo.accountName}</div>` : ''}
              ${bankInfo.bankName ? `<div><span style="font-weight: bold;">Ngân hàng:</span> ${bankInfo.bankName}</div>` : ''}
              ${bankInfo.accountNumber ? `<div><span style="font-weight: bold;">Số tài khoản:</span> ${bankInfo.accountNumber}</div>` : ''}
            </div>
            <div style="text-align: center;">
              <img 
                src="${qrImageUrl}" 
                alt="QR Code" 
                style="max-width: 200px; max-height: 200px; border: 1px solid #ccc; border-radius: 4px; display: block; margin: 0 auto;"
                crossorigin="anonymous"
              />
            </div>
          </div>
        </div>
      ` : ''}
      
      <div style="text-align: center; font-size: 12px; color: #666; margin-top: 16px;">
        Cảm ơn quý khách đã sử dụng dịch vụ!
      </div>
    `;
    
    document.body.appendChild(invoiceDiv);
    
    try {
      // Wait for images to load
      const images = invoiceDiv.getElementsByTagName('img');
      const imagePromises = Array.from(images).map((img) => {
        return new Promise<void>((resolve, reject) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load image: ${img.src}`));
            // Timeout after 5 seconds
            setTimeout(() => reject(new Error('Image load timeout')), 5000);
          }
        });
      });
      
      await Promise.all(imagePromises);
      
      // Small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(invoiceDiv, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        width: 600,
        logging: false,
        imageTimeout: 10000,
        onclone: (clonedDoc) => {
          // Ensure images are visible in cloned document
          const clonedImages = clonedDoc.querySelectorAll('img');
          clonedImages.forEach((img) => {
            (img as HTMLImageElement).style.display = 'block';
            (img as HTMLImageElement).style.visibility = 'visible';
          });
        }
      });
      
      const imageUrl = canvas.toDataURL('image/png', 1.0);
      document.body.removeChild(invoiceDiv);
      return imageUrl;
    } catch (err) {
      console.error('Error generating invoice image:', err);
      document.body.removeChild(invoiceDiv);
      throw err;
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
                        onClick={() => exportInvoiceAsImage(invoice.id, invoice.documentId)}
                      >
                        <Image className="w-4 h-4" src="/images/search.png" alt="Xuất hóa đơn" width={16} height={16} unoptimized/>
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



      {/* Invoice Image Modal */}
      {showInvoiceImageModal && invoiceImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={() => {
                    setShowInvoiceImageModal(false);
                    setInvoiceImageUrl(null);
                  }}
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col gap-2 items-center justify-center mb-4">
                <img 
                  src={invoiceImageUrl} 
                  alt="Hóa đơn" 
                  className="max-w-full h-auto border border-gray-300 rounded"
                  style={{ maxHeight: '70vh' }}
                />
                <button 
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  onClick={() => {
                    setShowInvoiceImageModal(false);
                    setInvoiceImageUrl(null);
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
