# Cập nhật Alert Modal - Summary

## ✅ Đã hoàn thành

### 1. Booking Page (`web/src/app/booking/page.tsx`)
- ✅ Đã thay thế tất cả `alert()` bằng `useAlert` hook
- ✅ Đã thêm AlertModal component
- ✅ Đã fix lỗi variable shadowing

### 2. Components & Hooks đã tạo
- ✅ `web/src/components/AlertModal.tsx` - Modal component
- ✅ `web/src/hooks/useAlert.ts` - Hook quản lý alert state

---

## 📋 Cần cập nhật

### Customer Page (`web/src/app/customer/page.tsx`)
Có 13 `alert()` cần thay thế:

```typescript
// Thêm import
import AlertModal from '@/components/AlertModal';
import { useAlert } from '@/hooks/useAlert';

// Trong component
const { alert, success, error, hideAlert } = useAlert();

// Thay alert() bằng success() hoặc error()
alert('message') → success('message') hoặc error('message')

// Thêm AlertModal vào cuối return
<AlertModal
  show={alert.show}
  message={alert.message}
  type={alert.type}
  onClose={hideAlert}
/>
```

### Invoice Page (`web/src/app/invoice/page.tsx`)
Có 3 `alert()` cần thay thế (tương tự như trên)

---

## 🎯 Alert Types

- `success()` - Thành công (xanh lá)
- `error()` - Lỗi (đỏ)
- `warning()` - Cảnh báo (vàng)
- `info()` - Thông tin (xanh dương)

---

## 💡 Cách sử dụng

```typescript
const { success, error, warning, info, hideAlert } = useAlert();

// Success message
success('Đã lưu thành công!');

// Error message
error('Lỗi khi lưu dữ liệu');

// Warning message
warning('Vui lòng kiểm tra lại thông tin');

// Info message
info('Đang xử lý...');
```

Modal sẽ tự động đóng sau 3 giây hoặc khi click nút X.

