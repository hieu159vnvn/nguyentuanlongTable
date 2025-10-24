# Quick Guide: Deploy to Vercel

## 🎯 Tóm tắt các bước

### 1. Push code lên GitHub
```bash
git add .
git commit -m "Ready for Vercel"
git push origin main
```

### 2. Deploy Strapi Backend (chọn 1):
- **Railway** (Khuyên dùng): https://railway.app
- **Render**: https://render.com  
- **Fly.io**: https://fly.io

**Lấy URL backend**: `https://your-backend.railway.app`

### 3. Deploy Frontend lên Vercel:

**Cách 1: Via Website**
1. Vào https://vercel.com → Login
2. "Add New Project" → Import GitHub repo
3. Cấu hình:
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Thêm Environment Variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```
5. Click "Deploy"

**Cách 2: Via CLI**
```bash
npm i -g vercel
cd web
vercel
```

### 4. Done! 🎉

Truy cập URL Vercel để test.

---

## ⚠️ Lưu ý quan trọng

1. **Root Directory phải là `web`** (vì code ở thư mục web)
2. **Backend phải deploy trước** và lấy URL
3. **Environment Variable**: `NEXT_PUBLIC_API_URL` phải được set đúng
4. **CORS**: Cấu hình trong Strapi để cho phép domain Vercel

---

## 📄 File đã được tạo

- ✅ `web/vercel.json` - Cấu hình Vercel
- ✅ `DEPLOY.md` - Hướng dẫn chi tiết
- ✅ `VERCEL_SETUP.md` - Hướng dẫn nhanh

