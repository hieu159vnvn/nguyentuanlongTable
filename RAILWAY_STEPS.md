# 🚂 Các bước Deploy Strapi lên Railway

## 📝 Tóm tắt

1. ✅ Cài PostgreSQL driver
2. ✅ Push code lên Git
3. ✅ Tạo Railway project
4. ✅ Cấu hình Environment Variables
5. ✅ Deploy và test

---

## Bước 1: Cài PostgreSQL Driver

```bash
cd cms
npm install pg
```

**File: `cms/package.json`** - Cần thêm dependency:
```json
"dependencies": {
  "pg": "^8.11.0"
}
```

---

## Bước 2: Push code lên Git

```bash
git add .
git commit -m "Add PostgreSQL support for Railway"
git push origin main
```

---

## Bước 3: Tạo Railway Project

1. Vào https://railway.app → Login
2. Click **"New Project"**
3. Chọn **"Deploy from GitHub repo"**
4. Chọn repository của bạn

---

## Bước 4: Cấu hình Service

1. Vào service settings
2. **Root Directory**: `cms`
3. **Build Command**: `npm run build`
4. **Start Command**: `npm start`

---

## Bước 5: Add PostgreSQL Database

1. Trong project, click **"+ New"**
2. Chọn **"Database"** → **"Add PostgreSQL"**
3. Railway tự động tạo database

---

## Bước 6: Environment Variables

Vào **Settings** → **Variables** → Add:

### Required Variables:

```env
# Database Config
DATABASE_CLIENT=postgres
DATABASE_URL=${DATABASE_URL}  # Railway tự động cung cấp

# JWT Secrets (Generate new keys)
ADMIN_JWT_SECRET=your-secret-key-here
API_TOKEN_SALT=your-salt-here
APP_KEYS=key1,key2,key3,key4

# App Config
NODE_ENV=production
```

### Generate Keys:

```bash
# Run this command 4 times, copy outputs
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Paste vào:
- `ADMIN_JWT_SECRET` (1 key)
- `API_TOKEN_SALT` (1 key)
- `APP_KEYS` (4 keys separated by comma)

---

## Bước 7: Deploy

1. Railway tự động deploy khi save changes
2. Check logs để đảm bảo không có lỗi
3. Đợi build hoàn thành (2-5 phút)

---

## Bước 8: Get Public URL

1. Service → **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy URL: `https://your-project.up.railway.app`

---

## Bước 9: Setup Admin User

1. Truy cập: `https://your-project.up.railway.app/admin`
2. Điền thông tin tạo admin user
3. Login với account vừa tạo

---

## Bước 10: Configure CORS

### Option 1: Environment Variable
Settings → Variables → Add:
```env
STRAPI_CORS_ORIGIN=https://your-vercel-app.vercel.app
```

### Option 2: Config File
Update `cms/config/middlewares.ts`:

```typescript
export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
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

## Bước 11: Test API

```bash
# Test API endpoint
curl https://your-project.up.railway.app/api/tables

# Should return JSON data
```

---

## ✅ Kết quả

Sau khi hoàn thành:
- ✅ Backend URL: `https://your-project.up.railway.app`
- ✅ Admin: `https://your-project.up.railway.app/admin`
- ✅ API: `https://your-project.up.railway.app/api`

**Sử dụng URL này cho Vercel!**

---

## 🔧 Troubleshooting

### Build Failed
- Check logs
- Ensure Node version 18+
- Check dependencies installed

### Database Error
- Verify `DATABASE_URL` format
- Check PostgreSQL service running
- Test connection string

### CORS Error
- Add frontend domain to `STRAPI_CORS_ORIGIN`
- Check middleware config

### Port Error
- Railway auto-manages PORT
- Don't set PORT manually

---

## 📞 Support

- Railway Docs: https://docs.railway.app
- Strapi Docs: https://docs.strapi.io
- Support Forum: https://forum.strapi.io

