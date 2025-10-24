# 🚂 Hướng dẫn Deploy Strapi lên Railway

## 📋 Chuẩn bị

### 1. Tạo tài khoản Railway
- Truy cập: https://railway.app
- Sign up với GitHub/GitLab/Bitbucket (miễn phí)

### 2. Push code Strapi lên Git
```bash
# Đảm bảo đã commit tất cả changes
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

---

## 🚀 Các bước Deploy

### **Bước 1: Tạo Project mới trên Railway**

1. Đăng nhập Railway
2. Click **"New Project"**
3. Chọn **"Deploy from GitHub repo"**
4. Chọn repository của bạn
5. Railway sẽ tự động detect framework

### **Bước 2: Cấu hình Service**

Railway sẽ tự tạo service cho Strapi. Cần cấu hình:

#### **Root Directory**
- Settings → **Root Directory** → Chọn `cms`

#### **Build Command**
```
npm run build
```

#### **Start Command**
```
npm start
```

### **Bước 3: Cấu hình Database**

**Railway có PostgreSQL free tier:**

1. Trong project, click **"+ New"**
2. Chọn **"Database"** → **"Add PostgreSQL"**
3. Railway sẽ tự tạo PostgreSQL database
4. Copy **DATABASE_URL** từ Environment Variables

### **Bước 4: Cấu hình Environment Variables**

Vào **Settings** → **Variables** và thêm:

#### **Required Variables:**

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Admin JWT Secret (tạo mới)
ADMIN_JWT_SECRET=your-random-secret-key-here

# API Token Salt (tạo mới)
API_TOKEN_SALT=your-random-salt-here

# App Keys (tạo mới)
APP_KEYS=key1,key2,key3,key4

# NODE_ENV
NODE_ENV=production

# HOST (Railway tự set)
HOST=0.0.0.0

# PORT (Railway tự set)
PORT=1337
```

#### **Cách tạo Secret Keys:**

Sử dụng terminal hoặc online generator:

```bash
# Generate random keys
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Hoặc truy cập: https://randomkeygen.com

**Copy output và paste vào các biến:**
- `ADMIN_JWT_SECRET`
- `API_TOKEN_SALT`
- `APP_KEYS` (tạo 4 keys, phân cách bằng dấu phẩy)

### **Bước 5: Update Strapi Database Config**

Cần cập nhật file `cms/config/database.ts` để dùng PostgreSQL:

```typescript
export default ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      connectionString: env('DATABASE_URL'),
      ssl: env.bool('DATABASE_SSL', true),
    },
    pool: {
      min: 0,
      max: 10,
    },
  },
});
```

### **Bước 6: Deploy**

1. Railway sẽ tự động deploy khi bạn save changes
2. Đợi deployment hoàn thành (khoảng 2-5 phút)
3. Kiểm tra logs để đảm bảo không có lỗi

### **Bước 7: Lấy URL và Domain**

1. Sau khi deploy thành công
2. Click vào service → **Settings** → **Networking**
3. Generate **Public Domain**
4. Copy URL (ví dụ: `https://your-project.up.railway.app`)

---

## 🔧 Cấu hình CORS

Để frontend Vercel có thể gọi API:

1. Vào **Settings** → **Environment Variables**
2. Thêm:

```env
STRAPI_CORS_ORIGIN=https://your-vercel-domain.vercel.app
```

Hoặc trong file `cms/config/middlewares.ts`:

```typescript
export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:', 'https:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

---

## ✅ Kiểm tra Deployment

### 1. Truy cập Admin Panel
```
https://your-project.up.railway.app/admin
```

### 2. Đăng nhập tạo Admin User
- Email: your-email@example.com
- Password: secure-password
- Username: admin

### 3. Kiểm tra API
```
https://your-project.up.railway.app/api/tables
```

### 4. Test từ Frontend
Đảm bảo frontend có thể gọi API thành công

---

## 🔄 Migrate Data từ Local

Nếu đã có data local:

### Option 1: Export/Import qua Admin Panel
1. Local: Settings → Transfer Tokens → Export
2. Production: Settings → Transfer Tokens → Import

### Option 2: Database Migration
```bash
# Export local database
pg_dump your_local_db > backup.sql

# Import to Railway database
psql railway_db_url < backup.sql
```

---

## 💡 Tips

1. **Railway Free Tier**: 500 hours/month free
2. **Auto Deploy**: Tự động deploy khi push code mới
3. **Logs**: Real-time logs trong Railway dashboard
4. **Rollback**: Có thể rollback về version cũ
5. **Scaling**: Dễ dàng scale up/down

---

## ⚠️ Troubleshooting

### Lỗi: Cannot connect to database
- Kiểm tra `DATABASE_URL` đúng format
- Kiểm tra PostgreSQL service đã running

### Lỗi: Build failed
- Kiểm tra logs trong Railway
- Đảm bảo Node version đúng (18.x hoặc 20.x)
- Kiểm tra `package.json` dependencies

### Lỗi: Port already in use
- Railway tự manage PORT, không cần set manual

### Lỗi: CORS error từ frontend
- Thêm domain frontend vào `STRAPI_CORS_ORIGIN`
- Check middleware config

---

## 📝 Checklist

- [ ] Tạo Railway account
- [ ] Push code lên Git
- [ ] Create Railway project
- [ ] Set Root Directory = `cms`
- [ ] Add PostgreSQL database
- [ ] Configure Environment Variables
- [ ] Update database config (PostgreSQL)
- [ ] Deploy and check logs
- [ ] Generate public domain
- [ ] Test admin panel
- [ ] Configure CORS
- [ ] Test API từ frontend

---

## 🎯 Kết quả

Sau khi deploy thành công:
- ✅ Backend URL: `https://your-project.up.railway.app`
- ✅ Admin Panel: `https://your-project.up.railway.app/admin`
- ✅ API: `https://your-project.up.railway.app/api`

**Sử dụng URL này cho Vercel deployment!**

