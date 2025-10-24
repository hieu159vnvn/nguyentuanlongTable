# Hướng dẫn Deploy lên Vercel

## 📋 Yêu cầu trước khi deploy

1. **Backend Strapi đã được deploy** (Railway, Render, VPS, etc.)
2. **Git repository** đã được tạo (GitHub, GitLab, Bitbucket)
3. **Tài khoản Vercel** (miễn phí)

---

## 🚀 Các bước deploy

### **Bước 1: Push code lên Git Repository**

```bash
# Kiểm tra git status
git status

# Add tất cả các file
git add .

# Commit
git commit -m "Setup for Vercel deployment"

# Push lên remote
git push origin main
```

### **Bước 2: Deploy Strapi Backend trước**

**Các lựa chọn deploy Strapi:**
- **Railway**: https://railway.app (Dễ nhất, miễn phí)
- **Render**: https://render.com (Miễn phí)
- **Fly.io**: https://fly.io (Miễn phí)
- **VPS**: DigitalOcean, AWS, etc.

**Sau khi deploy Strapi, lấy URL Backend:**
- Ví dụ: `https://your-project.railway.app`
- Hoặc: `https://strapi-backend.onrender.com`

### **Bước 3: Deploy Frontend lên Vercel**

**Cách 1: Deploy qua Vercel Dashboard (Khuyên dùng)**

1. Truy cập: https://vercel.com
2. Đăng nhập bằng GitHub/GitLab/Bitbucket
3. Click **"Add New Project"**
4. Import repository của bạn
5. Cấu hình project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `web` (vì code ở thư mục web)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

6. **Environment Variables** - Thêm biến môi trường:
   ```
   NEXT_PUBLIC_API_URL=https://your-strapi-backend.com
   ```
   (Thay `your-strapi-backend.com` bằng URL Strapi backend thực tế)

7. Click **"Deploy"**

**Cách 2: Deploy qua Vercel CLI**

```bash
# Cài đặt Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (từ thư mục web)
cd web
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? [Your name]
# - Link to existing project? No
# - Project name? table-rent-web
# - Directory? ./
# - Override settings? No
```

### **Bước 4: Cấu hình Domain và Environment Variables**

1. Vào project trên Vercel Dashboard
2. **Settings** → **Environment Variables**
3. Thêm/Sửa `NEXT_PUBLIC_API_URL` với URL backend thực tế
4. Redeploy để áp dụng thay đổi

### **Bước 5: Kiểm tra Deployment**

1. Truy cập URL Vercel của bạn
2. Kiểm tra console browser (F12) xem có lỗi API không
3. Test các chức năng:
   - Login
   - Booking
   - Customer management
   - Invoice

---

## 🔧 Troubleshooting

### **Lỗi: Cannot connect to backend**

**Giải pháp:**
1. Kiểm tra `NEXT_PUBLIC_API_URL` trong Environment Variables
2. Đảm bảo backend Strapi đã được deploy và chạy
3. Kiểm tra CORS settings trong Strapi

### **Lỗi: Build failed**

**Giải pháp:**
1. Kiểm tra log build trên Vercel Dashboard
2. Thử build local: `cd web && npm run build`
3. Fix các lỗi TypeScript/Lint

### **Lỗi: 404 Not Found**

**Giải pháp:**
1. Kiểm tra Root Directory là `web`
2. Kiểm tra Output Directory là `.next`
3. Redeploy project

---

## 📝 Checklist trước khi deploy

- [ ] Code đã được commit và push lên Git
- [ ] Strapi backend đã được deploy
- [ ] File `vercel.json` đã được tạo
- [ ] Environment variable `NEXT_PUBLIC_API_URL` đã được set
- [ ] Build local thành công (`npm run build`)
- [ ] Test các chức năng trên local

---

## 🎯 Sau khi deploy thành công

1. **Update CORS** trong Strapi để cho phép domain Vercel
2. **Test tất cả chức năng** trên production
3. **Monitor logs** trên Vercel Dashboard
4. **Setup custom domain** (nếu cần)

---

## 💡 Tips

- Vercel tự động rebuild khi push code mới
- Preview deployments cho mỗi pull request
- Hỗ trợ analytics và monitoring
- Miễn phí cho personal projects

